// SPDX-License-Identifier: GPL-3.0-only
// Anonymous browser trials: a random ID and day, never samples or device identity.
export async function trialApi(request,env,headers={},allowedOrigin=false){
 const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
 if(request.method==='OPTIONS')return allowedOrigin?new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}):json({error:'Origin not allowed'},403);
 if(!env.DB)return json({error:'Trial counter unavailable'},503);
 try{
  if(request.method==='POST'){
   if(!allowedOrigin)return json({error:'Origin not allowed'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   if(Number(request.headers.get('Content-Length')||0)>128)return json({error:'Body too large'},413);
   const body=await request.text();if(body.length>128)return json({error:'Body too large'},413);
   let data;try{data=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data?.id||''))return json({error:'Invalid browser trial'},400);
   await env.DB.prepare('INSERT OR IGNORE INTO trials (id, day) VALUES (?, ?)').bind(data.id,new Date().toISOString().slice(0,10)).run();
  }else if(request.method!=='GET')return json({error:'Method not allowed'},405);
  const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM trials').first();
  return json({total:count.total,definition:'Anonymous browser trials. One per stored browser ID, not unique people.'});
 }catch{return json({error:'Trial counter unavailable'},503);}
}
