const {chromium}=await import(process.env.PIGEON_PLAYWRIGHT_MODULE||'playwright');
import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {feedbackSubmission} from '../domain/bitfeedback.js';import {spawnSync} from 'node:child_process';
const root=path.resolve('.');const vars=await readFile('domain/.dev.vars','utf8');let total=0;const env={DB:{prepare:sql=>({first:async()=>({total:sql.startsWith('UPDATE')?++total:total})})},FEEDBACK_SIGNING_KEY:vars.match(/FEEDBACK_SIGNING_KEY="([^"]+)"/)[1]};
const server=createServer(async(req,res)=>{
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  if(req.url.startsWith('/api/bitfeedback/')){
   const chunks=[];for await(const c of req)chunks.push(c);
   const response=await feedbackSubmission(new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const u=new URL(req.url,origin);let rel=u.pathname==='/bitfeedback'?'bitfeedback/index.html':u.pathname.startsWith('/pigeon/')?'dist/client/'+u.pathname.slice(8):u.pathname.slice(1);if(rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+'/')||rel.includes('.dev.vars'))throw Error();
  const data=await readFile(file);const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.jpg')?'image/jpeg':'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});const failures=[];
try{
 const page=await browser.newPage({acceptDownloads:true});page.on('pageerror',e=>failures.push(e.message));
 async function start(){await page.goto(origin+'/bitfeedback');for(let i=0;i<6;i++){await page.locator('#answer').fill(i===0?'Browser tester':i===1?'A very funny bit':'A thoughtful answer');await page.locator('#next').click();}}
 async function rate(n){await page.getByRole('button',{name:n+' out of 10',exact:true}).click();await page.locator('#next').click();}
 async function captcha(){await page.locator('#next').click();await page.locator('.fartcha-tile').first().waitFor();assert.equal(await page.locator('.fartcha-tile').count(),9);assert(await page.locator('.fartcha-tile img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));}
 await start();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'build/bitfeedback-rating-mobile.png',fullPage:true});
 await rate(3);await page.waitForTimeout(600);assert(await page.locator('[data-rating="3"]').evaluate(e=>e.classList.contains('gone')));await rate(8);await page.waitForTimeout(600);assert(await page.locator('[data-rating="8"]').evaluate(e=>e.classList.contains('gone')));await rate(10);
 const first=await page.locator('h1').first().textContent();assert(first.includes('next Friday'));
 for(let i=0;i<40;i++){await page.getByRole('button',{name:'B Busy.',exact:true}).click();await page.locator('#next').click();}assert((await page.locator('h1').first().textContent()).includes('2026'));
 await page.getByRole('button',{name:'A Not much, why? Did you have something in mind?',exact:true}).click();await page.locator('#next').click();await page.locator('#idea').fill('<img src=x onerror=alert(1)> picnic');await page.locator('#next').click();assert.equal(await page.locator('#question img').count(),0);assert((await page.locator('h1').textContent()).includes('terrible idea'));
 await captcha();await page.getByRole('button',{name:'Matt Rife',exact:true}).click().catch(async()=>{await page.locator('.fartcha-tile').filter({hasNot:page.locator('img[alt="Marwan Al Kharrat"]')}).first().click();});await page.locator('#next').click();await page.getByText('Not funny. Try again.',{exact:true}).waitFor();
 await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:'build/bitfeedback-fartcha.png',fullPage:true});await page.getByRole('button',{name:'Marwan Al Kharrat',exact:true}).click();const downloaded=page.waitForEvent('download');await page.locator('#next').click();const dl=await downloaded;await dl.saveAs('build/bitfeedback-browser.csv');assert((await page.locator('#question').textContent()).includes('Tuff'));assert.equal(spawnSync('python3',['scripts/verify-bit-feedback.py','build/bitfeedback-browser.csv']).status,0);
 const csv=await readFile('build/bitfeedback-browser.csv');await writeFile('build/bitfeedback-tampered.csv',Buffer.from(csv.toString().replace('Browser tester','Another person')));assert.equal(spawnSync('python3',['scripts/verify-bit-feedback.py','build/bitfeedback-tampered.csv']).status,1);
 await page.locator('#next').click();assert(await page.locator('#answer').isVisible());assert.equal(await page.locator('#answer').inputValue(),'');
 await start();await rate(7);assert.equal(await page.locator('h1').textContent(),'Thank you for your feedback.');await captcha();
 await start();await rate(10);await page.getByRole('button',{name:/^C /}).click();await page.locator('#next').click();assert((await page.locator('h1').textContent()).includes('I’ll let you know'));await captcha();
 assert.deepEqual(failures,[]);console.log('Browser survey passed: low/high/10 ratings, advancing dates, A/C endings, Fartcha failure/success, signed download, tamper detection, restart and mobile layout.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
