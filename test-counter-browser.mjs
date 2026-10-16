const {chromium}=await import(process.env.PIGEON_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
const root=path.resolve('build/pages');
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const p=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));if(!p.startsWith(root+'/'))throw Error();const data=await fs.readFile(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':p.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 for(const [h,m,s,base,label] of [[12,34,56,2,'binary'],[1,3,0,3,'trinary'],[0,4,0,4,'base 4'],[11,55,11,5,'base 5'],[11,16,19,10,'']]) {
  const context=await browser.newContext();const page=await context.newPage();const failures=[];page.on('pageerror',e=>failures.push(e.message));
  await page.addInitScript(({h,m,s})=>{Object.defineProperty(performance,'timeOrigin',{value:new Date(2026,0,1,h,m,s).getTime(),configurable:true});},{h,m,s});
  await page.route('**/api/installs',r=>r.fulfill({json:{total:1234}}));await page.route('**/api/trials',r=>r.fulfill({json:{total:567}}));
  for(const [url,selector,total,width] of [['/','#install-total',1234,6],['/webapp/emu/','#trial-total',567,7]]){
   await page.goto(origin+url);await page.waitForFunction(({selector,total})=>document.querySelector(selector)?.getAttribute('aria-label')?.includes(total.toLocaleString()),{selector,total});
   assert.equal(await page.locator(selector+' .nixie-active').allTextContents().then(a=>a.join('')),total.toString(base).padStart(width,'0'));
   assert.equal(await page.locator(selector+' .nixie-unlit').first().locator('b').count(),10);
   const note=page.locator('.counter-note');assert.equal(await note.isVisible(),base!==10);
   if(base!==10){assert((await note.textContent()).includes(label));assert((await note.textContent()).includes('In the decimal system, the count is: '+total.toLocaleString('en-US')));}
   // Advancing the clock must not change the base chosen at load.
   if(url.includes('emu')){await page.evaluate(()=>{Object.defineProperty(performance,'timeOrigin',{value:new Date(2026,0,1,11,16,19).getTime()});window.dispatchEvent(new Event('online'));});assert.equal(await page.locator(selector+' .nixie-active').allTextContents().then(a=>a.join('')),total.toString(base).padStart(width,'0'));}
   await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.deepEqual(failures,[]);await context.close();
 }
 console.log('Browser counters passed: both pages, bases 2–5, hidden decimal fallback, decimal totals, frozen load-time base, unlit digits and mobile layout.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
