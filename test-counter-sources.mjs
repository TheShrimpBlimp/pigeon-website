import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {hubInstalls} from './hub-count.js';
import worker from './counter/index.js';
import {counterBase,counterDigits,counterNote} from './nixie.js';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('./counter/schema.sql',import.meta.url),'utf8'));
const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},async run(){return sqlite.prepare(sql).run(...values);},async first(){return sqlite.prepare(sql).get(...values);}};}};
let calls=0;let remote=10;const now=20000000;
const fetcher=async()=>{calls++;return Response.json({firmwares:[{id:'pigeon',installs:remote}]});};
assert.equal(await hubInstalls(DB,{fetcher,now}),10);assert.equal(calls,1);
remote=12;assert.equal(await hubInstalls(DB,{fetcher,now:now+1000}),10);assert.equal(calls,1);
assert.equal(await hubInstalls(DB,{fetcher,now:now+3600000}),12);assert.equal(calls,2);
assert.equal(await hubInstalls(DB,{fetcher:async()=>{throw Error('offline');},now:now+7200000}),12);
assert.equal(await hubInstalls(DB,{fetcher:async()=>Response.json({firmwares:[{id:'pigeon',installs:-1}]}),now:now+10800000}),12);
assert.equal(await hubInstalls(DB,{fetcher:async()=>Response.json({firmwares:[]}),now:now+14400000}),12);
assert.equal(sqlite.prepare('SELECT total FROM counter').get().total,0,'Hub snapshots must not increment local installs');
sqlite.exec('UPDATE counter SET total=5; DELETE FROM external_install_counts;');
globalThis.fetch=fetcher;remote=20;
const url='https://counter.test/api/installs';
let stats=await (await worker.fetch(new Request(url),{DB})).json();assert.equal(stats.total,25);
stats=await (await worker.fetch(new Request(url,{method:'POST',headers:{Origin:'https://theshrimpblimp.com'}}),{DB})).json();assert.equal(stats.total,26);
assert.equal(sqlite.prepare('SELECT total FROM counter').get().total,6);
assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{Origin:'https://evil.test'}}),{DB})).status,403);
assert.equal((await (await worker.fetch(new Request('https://counter.test/api/trials'),{DB})).json()).total,0);
for(let base=2;base<=7;base++) {
 assert.equal(counterBase(()=>(base-2+.5)/6),base);
 assert.equal(counterBase(()=>(base-2)/6),base);
}
assert.equal(counterBase(()=>0),2);assert.equal(counterBase(()=>1-Number.EPSILON),7);
assert.equal(counterNote(100,10),'');
for(const [base,label] of [[2,'binary'],[3,'trinary'],[4,'base 4'],[5,'base 5'],[6,'base 6'],[7,'base 7']]){
 assert(counterNote(1234,base).includes(label));assert(counterNote(1234,base).includes('In the decimal system, the count is: 1,234'));
 assert.equal(parseInt(counterDigits(1234,base),base),1234);
}
assert.equal(counterDigits(2**7,2,7).length,8);assert.equal(counterDigits(0,5,7),'0000000');
console.log('Counter tests passed: all six random-base buckets and boundaries, base labels, automatic digit growth, combined totals, hourly caching, invalid/offline retention, CORS and independent trial totals.');
