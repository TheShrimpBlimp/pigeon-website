// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from './worker/index.js';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('web/site/drizzle/0000_installs.sql','utf8'));
const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},async run(){return sqlite.prepare(sql).run(...values);},async first(){return sqlite.prepare(sql).get(...values);},async all(){return {results:sqlite.prepare(sql).all(...values)};}};}};
const env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const url='https://pigeon.test/api/installs';
const event={id:'5d197fa7-f47d-4f96-a8f5-7926c66af429',release:'a'.repeat(64),source:'installer'};
function request(data,origin='https://pigeon.test'){return new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});}
assert.equal((await worker.fetch(request(event),env)).status,200);
assert.equal((await worker.fetch(request(event),env)).status,200);
let stats=await (await worker.fetch(new Request(url),env)).json();assert.equal(stats.total,1);
assert.equal((await worker.fetch(request({...event,id:crypto.randomUUID(),source:'sample-tool'}),env)).status,200);
stats=await (await worker.fetch(new Request(url),env)).json();assert.equal(stats.total,2);
assert.equal((await worker.fetch(request(event,'https://elsewhere.test'),env)).status,403);
assert.equal((await worker.fetch(request({...event,id:'bad'}),env)).status,400);
assert.equal((await worker.fetch(request({...event,release:'bad'}),env)).status,400);
assert.equal((await worker.fetch(new Request(url),{})).status,503);
assert.equal(await (await worker.fetch(new Request('https://pigeon.test/'),env)).text(),'asset');
assert.deepEqual(sqlite.prepare('PRAGMA table_info(installs)').all().map(c=>c.name),['id','release','source','day']);
console.log('Install counter: persistence, retry deduplication, reinstalls, validation, origin protection, unavailable DB, and asset routing passed.');
