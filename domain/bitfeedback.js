// SPDX-License-Identifier: GPL-3.0-only
// Store only an aggregate completion count; never store answers or visitor identities.
const MAX_BYTES=65536;
const csvCell=value=>'"'+String(/^[\s]*[=+@\-\t\r]/.test(String(value))?"'"+value:value).replaceAll('"','""')+'"';
const line=(key,value)=>[key,value].map(csvCell).join(',')+'\r\n';
function reply(message,status){return new Response(message,{status,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});}
async function readLimited(request){
 if(Number(request.headers.get('Content-Length'))>MAX_BYTES)throw Error('large');
 const reader=request.body?.getReader();if(!reader)throw Error('empty');
 let length=0,chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){await reader.cancel();throw Error('large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export async function feedbackSubmission(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/bitfeedback/count'){
  if(!['GET','HEAD'].includes(request.method))return reply('Method not allowed',405);
  try{const row=await env.DB.prepare('SELECT total FROM bit_feedback_count WHERE id=1').first();if(!row)throw Error();return new Response(request.method==='HEAD'?null:JSON.stringify({total:row.total}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}catch{return reply('Counter unavailable',503);}
 }
 if(url.pathname!=='/api/bitfeedback/submit')return null;
 if(request.method!=='POST')return reply('Method not allowed',405);
 if(request.headers.get('Origin')!==url.origin)return reply('Invalid origin',403);
 if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply('Expected JSON',415);
 let data;
 try{data=await readLimited(request);}catch(e){return reply('Invalid submission',e.message==='large'?413:400);}
 const a=data?.answers;
 if(!a||typeof a!=='object'||Array.isArray(a))return reply('Invalid answers',400);
 for(let n=0;n<6;n++)if(typeof a['q'+n]!=='string'||!a['q'+n].trim()||a['q'+n].length>(n===0?200:4000))return reply('Invalid answer',400);
 if(!Array.isArray(data.selected)||data.selected.length!==1||data.selected[0]!=='marwan')return reply('Fartcha failed',422);
 const ratings=data.ratingAttempts;
 if(!Array.isArray(ratings)||!ratings.length||ratings.length>10||ratings.some(n=>!Number.isInteger(n)||n<1||n>10)||ratings[0]!==data.initialRating)return reply('Invalid rating',400);
 const initial=ratings[0],final=ratings.at(-1);
 if((initial>=7&&initial<=9&&(ratings.length!==1||String(final)!==a.q6))||((initial<7||initial===10)&&final!==10))return reply('Invalid rating path',400);
 if(String(final)!==a.q6||new Set(ratings).size!==ratings.length||ratings.slice(0,-1).some(n=>n===10))return reply('Invalid rating history',400);
 const dates=data.dateAnswers;
 if(!Array.isArray(dates))return reply('Invalid dates',400);
 if(final===10){
  if(!dates.length||!['A','C'].includes(dates.at(-1)?.answer))return reply('Incomplete follow-up',400);
  let previous=null;
  for(let i=0;i<dates.length;i++){
   const d=dates[i];if(!d||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!['A','B','C'].includes(d.answer)||(i<dates.length-1&&d.answer!=='B'))return reply('Invalid follow-up',400);
   const timestamp=Date.parse(d.date+'T12:00:00Z');if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==d.date||(previous!==null&&timestamp-previous!==86400000))return reply('Invalid date order',400);previous=timestamp;
  }
  if(dates.at(-1).answer==='A'&&(typeof a.idea!=='string'||!a.idea.trim()||a.idea.length>4000))return reply('Missing idea',400);
 }else if(dates.length)return reply('Unexpected follow-up',400);
 if(!env?.FEEDBACK_SIGNING_KEY)return reply('CSV signing is not configured',503);
 let csv=line('field','answer')+line('format','shrimp-bit-feedback-v1')+line('issued_at',new Date().toISOString())+line('submission_id',crypto.randomUUID());
 for(let i=0;i<=6;i++)csv+=line('q'+i,a['q'+i]);
 csv+=line('initial_rating',initial)+line('rating_attempts',ratings.join(' → '));
 dates.forEach((d,i)=>{csv+=line('date_'+(i+1),d.date)+line('response_'+(i+1),d.answer);});
 if(final===10&&dates.at(-1).answer==='A')csv+=line('activity_idea',a.idea);
 csv+=line('signature_algorithm','ECDSA-P256-SHA256-P1363');
 try{
  const bytes=Uint8Array.from(atob(env.FEEDBACK_SIGNING_KEY),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(csv)));
  csv+=line('signature','p256:'+btoa(String.fromCharCode(...signature)));
 }catch{return reply('CSV signing unavailable',503);}
 let total;
 try{const row=await env.DB.prepare('UPDATE bit_feedback_count SET total=total+1 WHERE id=1 RETURNING total').first();if(!row)throw Error();total=row.total;}catch{return reply('Counter unavailable; please retry',503);}
 return new Response(csv,{headers:{'X-Bits-Fedback':String(total),'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bit-feedback.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
