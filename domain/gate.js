import {gatePage} from './gate-page.js';
// SPDX-License-Identifier: GPL-3.0-only
// Neutral acknowledgement gate. Country comes from Cloudflare, never a client header.
const COUNTRIES=new Set(['IL','HK']);
const PATH='/acknowledge', COOKIE='shrimp_ack', YEAR=365*24*60*60;
const FONT='/pigeon/webapp/pigeon/fonts/LittleCharacterRegular.ttf';
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
async function sign(secret,message){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));
}
function equal(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function returnPath(value){
 if(typeof value!=='string' || !value.startsWith('/') || [...value].some(c=>c.charCodeAt(0)<=32 || c.charCodeAt(0)===92 || c.charCodeAt(0)===127))return '/';
 const u=new URL(value,'https://gate.invalid');
 return u.origin==='https://gate.invalid' && !u.pathname.startsWith(PATH)?u.pathname+u.search+u.hash:'/';
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
function response(body,status=200,extra={}){return new Response(body,{status,headers:{...headers,...extra}});}
async function accepted(request,secret){
 const cookie=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 const [expiry,mac]=cookie.split('.');const now=Math.floor(Date.now()/1000);
 return /^\d{10}$/.test(expiry||'') && Number(expiry)>now && Number(expiry)<=now+YEAR+60 && equal(mac||'',await sign(secret,'ack:'+expiry));
}
export async function countryGate(request,env){
 const url=new URL(request.url);
 if(!COUNTRIES.has(request.cf?.country)){
  if(url.pathname===PATH)return response(null,303,{Location:'/'});
  return null;
 }
 if(url.pathname===FONT && ['GET','HEAD'].includes(request.method))return null;
 // Missing deployment configuration must not silently bypass the requested gate.
 if(!env?.GATE_SECRET)return response('Temporarily unavailable',503,{'Retry-After':'60'});
 if(url.pathname===PATH && request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin)return response('Invalid request',403);
  if(Number(request.headers.get('Content-Length'))>2048)return response('Request too large',413);
  const text=await request.text();if(text.length>2048)return response('Request too large',413);
  const form=new URLSearchParams(text),next=returnPath(form.get('returnTo'));
  const expiry=Math.floor(Date.now()/1000)+YEAR,mac=await sign(env.GATE_SECRET,'ack:'+expiry);
  return response(null,303,{Location:next,'Set-Cookie':`${COOKIE}=${expiry}.${mac}; Path=/; Max-Age=${YEAR}; Secure; HttpOnly; SameSite=Lax`});
 }
 if(await accepted(request,env.GATE_SECRET)){
  if(url.pathname===PATH)return response(null,303,{Location:returnPath(url.searchParams.get('returnTo'))});
  return null;
 }
 if(url.pathname!==PATH){
  const next=returnPath(url.pathname+url.search);
  return response(null,303,{Location:PATH+'?returnTo='+encodeURIComponent(next)});
 }
 if(!['GET','HEAD'].includes(request.method))return response('Method not allowed',405,{'Allow':'GET, HEAD, POST'});
 const next=escape(returnPath(url.searchParams.get('returnTo')));
 const html=gatePage(next,FONT,PATH);
 return response(request.method==='HEAD'?null:html,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
}
