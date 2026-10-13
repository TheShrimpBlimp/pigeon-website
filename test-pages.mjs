// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../build/gui-deps/testing/node_modules/playwright/index.mjs';
const root=path.resolve('web/site/build/pages');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try {let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname.replace(/^\/pigeon-website/, '')));if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch {res.writeHead(404);res.end('Missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}/pigeon-website`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('16px Little') && [...document.fonts].some(f=>f.family==='Little' && f.status==='loaded')));
 assert.equal(await page.title(),'PIGEON — Sampler firmware for the FM1');
 const wrongFonts=await page.locator('body *').evaluateAll(elements=>elements.filter(e=>e.getClientRects().length && !['SCRIPT','STYLE'].includes(e.tagName) && getComputedStyle(e).fontFamily.split(',')[0].trim()!=='Little').map(e=>({tag:e.tagName,class:e.className,font:getComputedStyle(e).fontFamily})));
 assert.deepEqual(wrongFonts,[], 'All visible landing-page text must use Little Character');
 assert.equal(await page.locator('.steps li').first().evaluate(e=>getComputedStyle(e,'::before').fontFamily.split(',')[0].trim()),'Little');

 assert.equal(await page.locator('h1').textContent(),'Your FM1.A sampler.');
 assert(await page.locator('footer a[href="https://github.com/Quixotic7/ChoralRootFM1"]').first().isVisible());
 await page.locator('footer .project-credits summary').click();
 const installer=page.frameLocator('iframe[title="PIGEON USB MIDI firmware installer"]');
 await installer.locator('#connect:not([disabled])').waitFor();
 assert(await installer.locator('#go').isDisabled());
 assert((await installer.locator('#package-status').textContent()).includes('0.1-beta-candidate'));
 assert((await installer.locator('#package-status').textContent()).includes('checksum verified'));
 assert.equal(await installer.locator('#release-status').textContent(),'Beta candidate: hardware verification pending.');
 assert.equal(await installer.locator('#firmware-download').getAttribute('href'),'../../firmware/pigeon-0.1-beta-candidate.fwsc');
 assert(!await page.locator('#faq').textContent().then(t=>t.includes('It has been installed on an FM1')));
 await installer.locator('#backup').check();assert(await installer.locator('#go').isDisabled());
 assert.equal(await installer.locator('h1').textContent(),'PIGEON');
 assert.equal(await page.locator('.ui-gallery img').count(),3);
 for(const image of await page.locator('main img').all())assert(await image.evaluate(i=>i.complete && i.naturalWidth===960));
 assert(!await page.locator('body').textContent().then(t=>t.includes('{{')));
 const links=await page.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')).filter(h=>h&&!h.startsWith('http')&&!h.startsWith('#')));
 for(const link of new Set(links)){const response=await page.request.get(origin+'/'+link);assert.equal(response.status(),200,link);}
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`build/pigeon-site-${width}.png`,fullPage:true});}
 await page.goto(origin+'/webapp/installer/');assert.equal(await page.title(),'PIGEON USB installer');await page.locator('#connect:not([disabled])').waitFor();assert(await page.locator('#go').isDisabled());

 await page.evaluate(()=>{
  window.updateCommands=[];
  const input={id:'unsafe-in',name:'FM-1',state:'connected',onmidimessage:null,open:async()=>{}};
  const pack=data=>{const out=[];let acc=0,n=0;for(const b of data){acc|=b<<n;n+=8;while(n>=7){out.push(acc&127);acc>>>=7;n-=7;}}if(n)out.push(acc&127);return out;};
  const output={id:'unsafe-out',name:'FM-1',state:'connected',open:async()=>{},send(d){window.updateCommands.push(Array.from(d));let reply;if(d[1]===0){const text=Array.from(new TextEncoder().encode('FM-1_920'));reply=[240,...pack([0,89,17,0,0,0,...text,...Array(28-text.length).fill(0)]),247];}else if(d[1]===125){reply=[240,125,70,76,1,...Array.from('FELUCCA SLOOP 2.2'.padEnd(24,'\0'),c=>c.charCodeAt(0)),247];}if(reply)setTimeout(()=>input.onmidimessage?.({data:Uint8Array.from(reply)}),0);}};
  navigator.requestMIDIAccess=async()=>({inputs:new Map([[input.id,input]]),outputs:new Map([[output.id,output]])});
 });
 await page.locator('#backup').check();await page.locator('#connect').click();
 await page.getByText(/Installing over Sloop is not supported/).first().waitFor();
 assert(await page.locator('#go').isDisabled());
 assert(!(await page.evaluate(()=>window.updateCommands)).some(p=>p[1]===34));
 await page.evaluate(()=>{navigator.requestMIDIAccess=async()=>({inputs:new Map(),outputs:new Map()});});await page.locator('#connect').click();await page.getByText('FM1 not found. Check the USB cable and close other MIDI apps.',{exact:true}).waitFor();assert(await page.locator('#go').isDisabled());
 await page.route('**/firmware/*.fwsc',route=>route.fulfill({body:Buffer.from('damaged')}));await page.reload();await page.getByText('Firmware verification failed. Installation blocked.',{exact:true}).waitFor();assert(await page.locator('#connect').isDisabled());assert(await page.locator('#go').isDisabled());await page.unroute('**/firmware/*.fwsc');assert.equal(errors.length,0,errors.join('\n')); 
 await page.goto(origin+'/webapp/pigeon/');await page.waitForTimeout(1000);assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.locator('.home-link').getAttribute('href'),'../../');
 await page.locator('#open').setInputFiles('build/gui-deps/dual-kit.kob');
 await page.waitForFunction(()=>document.getElementById('used').textContent!=='No bank loaded');
 await page.evaluate(()=>{
  window.testMidiCommands=[];
  const input={id:'test-in',name:'PIGEON FM1',state:'connected',onmidimessage:null};
  const u21=n=>[n&127,(n>>>7)&127,(n>>>14)&127];
  const output={id:'test-out',name:'PIGEON FM1',state:'connected',send(bytes){const cmd=bytes[4];window.testMidiCommands.push(cmd);const response=cmd===90?[75,3,...u21(0x67000),...u21(4096),1,3]:cmd===1?[...new TextEncoder().encode('PIGEON'),0]:[0];setTimeout(()=>input.onmidimessage?.({data:Uint8Array.from([240,125,70,76,cmd,...response,247])}),0);}};
  navigator.requestMIDIAccess=async()=>({inputs:new Map([[input.id,input]]),outputs:new Map([[output.id,output]])});
 });
 await page.locator('#connect').click();await page.locator('#upload:not([disabled])').waitFor();
 await page.locator('#backup').click();await page.getByText('Unsupported archive protocol',{exact:true}).first().waitFor();
 await page.locator('#upload:not([disabled])').waitFor();
 assert((await page.evaluate(()=>window.testMidiCommands)).includes(65));
 await page.evaluate(()=>window.testMidiCommands=[]);
 await page.locator('#upload').click();assert(await page.locator('#send-review').isVisible());
 await page.locator('#send-cancel').click();assert(await page.locator('#send-review').isHidden());assert(!(await page.evaluate(()=>window.testMidiCommands)).includes(91));
 await page.locator('#upload').click();await page.locator('#send-confirm').click();
 await page.waitForFunction(()=>window.testMidiCommands.includes(91));
 assert(!(await page.evaluate(()=>window.testMidiCommands)).includes(65));
await page.locator('.home-link').click();assert.equal(new URL(page.url()).pathname,'/pigeon-website/');
 console.log('PIGEON site: links, downloads, firmware installer, sample tool, desktop/mobile layout passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
