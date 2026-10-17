import assert from 'node:assert/strict';
import {countryGate} from './gate.js';
import worker from './index.js';
const ctx={waitUntil:()=>{throw new Error('Gate must not schedule tracking');}};
const env={GATE_SECRET:'local-test-secret',get DB(){throw new Error('Gate must not access a database');}};
function req(path='/',country='IL',options={},ip='203.0.113.10'){
 const r=new Request('https://theshrimpblimp.com'+path,{...options,headers:{'CF-Connecting-IP':ip,...options.headers}});
 Object.defineProperty(r,'cf',{value:country?{country}:{}});return r;
}
const call=(p,c,o,ip)=>countryGate(req(p,c,o,ip),env,ctx);
const post=body=>({method:'POST',headers:{Origin:'https://theshrimpblimp.com'},body});
for(const country of ['IL','HK']){
 let r=await call('/pigeon/?song=1',country);assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/acknowledge?returnTo=%2Fpigeon%2F%3Fsong%3D1');
 r=await call('/acknowledge?returnTo=%2Fpigeon%2F',country);const html=await r.text();assert(html.length>0);assert(html.includes('>acknowledge</button>'));assert.equal(r.headers.get('Referrer-Policy'),'same-origin');
 r=await call('/acknowledge',country,post('returnTo=%2Fpigeon%2F'));assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/pigeon/');
 const raw=r.headers.get('Set-Cookie'),cookie=raw.split(';')[0];for(const flag of ['Secure','HttpOnly','SameSite=Lax'])assert(raw.includes(flag));
 assert.equal(await call('/pigeon/',country,{headers:{Cookie:cookie}}),null);
 assert.equal((await call('/pigeon/',country,{headers:{Cookie:cookie+'bad'}})).status,303);
 assert.equal((await call('/pigeon/',country,{headers:{Cookie:'shrimp_ack=1000000000.invalid'}})).status,303);
 assert.equal((await call('/acknowledge',country,post('returnTo=//evil.example/'))).headers.get('Location'),'/');
 assert.equal((await call('/acknowledge',country,{...post(''),headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal(await call('/pigeon/webapp/pigeon/fonts/LittleCharacterRegular.ttf',country),null);
 await call('/',country,{},'203.0.113.20');
}
assert.equal(await countryGate(req('/','CA'),{},ctx),null);
assert.equal(await call('/',null,{headers:{'CF-IPCountry':'HK'}}),null);
assert.equal((await countryGate(req('/'),{},ctx)).status,503);
let forwards=0;const old=globalThis.fetch;globalThis.fetch=async()=>{forwards++;return new Response('content');};
try{assert.equal((await worker.fetch(req('/pigeon/','HK'),env,ctx)).status,303);assert.equal(forwards,0);assert.equal((await worker.fetch(req('/','CA'),env,ctx)).status,200);assert.equal(forwards,1);}finally{globalThis.fetch=old;}
console.log('Country routing, signed acknowledgement, return paths and database-free proxy gating passed.');
