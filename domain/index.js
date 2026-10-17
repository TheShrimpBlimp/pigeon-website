// SPDX-License-Identifier: GPL-3.0-only
// Keep the GitHub Pages release as the single source of site assets.
import {countryGate} from './gate.js';
export default {
 async fetch(request, env, ctx) {
  const gate=await countryGate(request,env,ctx);
  if(gate)return gate;
  const url = new URL(request.url);
  if (url.pathname === '/pigeon') {
   url.pathname = '/pigeon/';
   return Response.redirect(url.toString(), 308);
  }
  const home = url.pathname === '/' || url.pathname === '/index.html';
  const homeAsset = ['/home/home.css', '/home/marwan.jpg'].includes(url.pathname);
  if (!home && !homeAsset && !url.pathname.startsWith('/pigeon/')) return new Response('Not found', {status:404});
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
  const upstream = new URL('https://theshrimpblimp.github.io');
  upstream.pathname = '/pigeon-website/' + (home ? 'home/index.html' : homeAsset ? url.pathname.slice(1) : url.pathname.slice('/pigeon/'.length));
  upstream.search = url.search;
  // GitHub's CDN can retain old assets even after a Pages deployment.
  upstream.searchParams.set('_pigeon_refresh', String(Math.floor(Date.now() / 60000)));
  const response = await fetch(upstream, {method:request.method, redirect:'manual', headers:{'Cache-Control':'no-cache'}, cf:{cacheTtl:0, cacheEverything:false}});
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  const location = headers.get('Location');
  if (location) {
   const next = new URL(location, upstream);
   if (next.origin === upstream.origin && next.pathname.startsWith('/pigeon-website/')) {
    next.hostname = url.hostname;
    next.pathname = '/pigeon/' + next.pathname.slice('/pigeon-website/'.length);
    headers.set('Location', next.toString());
   }
  }
  return new Response(response.body, {status:response.status, headers});
 }
};
