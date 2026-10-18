// Verify the original file bytes locally against the site's pinned public key.
export const PUBLIC_KEY='MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQGICQP/lUgDw28cJrUm+K9lPk+fUR18pB9dP14zWzyl7YYPShPlXumXXcdXBXsgQX9P86gbCsNmyXNVwGfXYhQ==';
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false,closed=false,start=true;
 const add=()=>{row.push(cell);cell='';closed=false;start=true;};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(!start)throw Error('Unexpected quote in CSV.');quoted=true;start=false;continue;}
  if(c===','){add();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;add();rows.push(row);row=[];continue;}
  if(closed)throw Error('Unexpected text after a quoted CSV field.');
  cell+=c;start=false;
 }
 if(quoted)throw Error('Unclosed quote in CSV.');
 if(cell!==''||row.length||closed){add();rows.push(row);}
 return rows;
}
function decode64(text){if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text)||text.length%4!==0)throw Error('Invalid signature encoding.');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function signatureOffset(bytes){
 const marker=new TextEncoder().encode('\r\n"signature",');
 for(let i=bytes.length-marker.length;i>=0;i--){if(marker.every((v,j)=>bytes[i+j]===v))return i+2;}
 return -1;
}
export async function verifyFeedback(bytes){
 if(bytes.byteLength>1024*1024)throw Error('This file is too large. Choose a feedback CSV smaller than 1 MiB.');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),rows=parseCSV(text);
 if(!rows.length||rows[0].length!==2||rows[0][0]!=='field'||rows[0][1]!=='answer')throw Error('This is not a Bit Feedback CSV (expected field,answer columns).');
 const fields=new Map();for(const row of rows.slice(1)){if(row.length!==2)throw Error('Every feedback record must have two columns.');if(fields.has(row[0]))throw Error('Duplicate CSV field: '+row[0]);fields.set(row[0],row[1]);}
 if(fields.get('format')!=='shrimp-bit-feedback-v1')throw Error('Unrecognized feedback file format.');
 for(let i=0;i<=6;i++)if(!fields.has('q'+i))throw Error('Missing answer Q'+i+'.');
 const result={fields,status:'unsigned',message:'No signature. Authenticity cannot be verified.'};
 if(!fields.has('signature'))return result;
 result.status='invalid';result.message='Signature failed. This file was altered or was signed with a different key.';
 const offset=signatureOffset(bytes),signature=fields.get('signature');
 if(offset<0||rows.at(-1)[0]!=='signature'||!signature.startsWith('p256:')||fields.get('signature_algorithm')!=='ECDSA-P256-SHA256-P1363'){result.message='The signature record is malformed or unsupported.';return result;}
 try{
  const raw=decode64(signature.slice(5));if(raw.length!==64)throw Error();
  const key=await crypto.subtle.importKey('spki',decode64(PUBLIC_KEY),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,raw,bytes.slice(0,offset));
  if(valid){result.status='valid';result.message='Verified. These answers are unchanged since this site signed them.';}
 }catch{result.message='The signature could not be verified.';}
 return result;
}
