// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../build/gui-deps/testing/node_modules/playwright/index.mjs';
const root=path.resolve('web/site/dist/client');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try {let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch {res.writeHead(404);res.end('Missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.title(),'Pigeon — Sampler firmware for the FM1');
 assert.equal(await page.locator('h1').textContent(),'Your FM1.A sampler.');
 const installer=page.frameLocator('iframe[title="Pigeon USB MIDI firmware installer"]');
 await installer.locator('#connect:not([disabled])').waitFor();
 assert(await installer.locator('#go').isDisabled());
 assert((await installer.locator('#package-status').textContent()).includes('checksum verified'));
 await installer.locator('#backup').check();assert(await installer.locator('#go').isDisabled());
 assert.equal(await installer.locator('h1').textContent(),'Pigeon');
 assert.equal(await page.locator('.ui-gallery img').count(),3);
 for(const image of await page.locator('main img').all())assert(await image.evaluate(i=>i.complete && i.naturalWidth===960));
 assert(!await page.locator('body').textContent().then(t=>t.includes('{{')));
 const links=await page.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')).filter(h=>h&&!h.startsWith('http')&&!h.startsWith('#')));
 for(const link of new Set(links)){const response=await page.request.get(origin+'/'+link);assert.equal(response.status(),200,link);}
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`build/pigeon-site-${width}.png`,fullPage:true});}
 await page.goto(origin+'/webapp/installer/');assert.equal(await page.title(),'Pigeon USB installer');await page.locator('#connect:not([disabled])').waitFor();assert(await page.locator('#go').isDisabled());
 await page.evaluate(()=>{navigator.requestMIDIAccess=async()=>({inputs:new Map(),outputs:new Map()});});await page.locator('#connect').click();await page.getByText('FM1 not found. Check the USB cable and close other MIDI apps.',{exact:true}).waitFor();assert(await page.locator('#go').isDisabled());
 await page.route('**/firmware/*.fwsc',route=>route.fulfill({body:Buffer.from('damaged')}));await page.reload();await page.getByText('Firmware verification failed. Installation blocked.',{exact:true}).waitFor();assert(await page.locator('#connect').isDisabled());assert(await page.locator('#go').isDisabled());await page.unroute('**/firmware/*.fwsc');assert.equal(errors.length,0,errors.join('\n')); 
 await page.goto(origin+'/webapp/pigeon/');await page.waitForTimeout(1000);assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.locator('.home-link').getAttribute('href'),'../../');await page.locator('.home-link').click();assert.equal(new URL(page.url()).pathname,'/');
 console.log('Pigeon site: links, downloads, firmware installer, sample tool, desktop/mobile layout passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
