// SPDX-License-Identifier: GPL-3.0-only
// Keep the GitHub Pages release as the single source of site assets.
import {blogFeed} from './blog-feed.js';
import {feedbackSubmission} from './bitfeedback.js';
async function notFound(request){
  const response=await fetch('https://theshrimpblimp.github.io/pigeon-website/404.html',{method:request.method==='HEAD'?'HEAD':'GET',cf:{cacheTtl:0,cacheEverything:false}});
  const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'});
  const fallback='<!doctype html><title>page not found</title><h1>page not found</h1><img src="/errors/gnome.gif" alt="">';
  return new Response(request.method==='HEAD'?null:response.ok?response.body:fallback,{status:404,headers});
}
export default {
 async fetch(request, env) {
  if (new URL(request.url).pathname === '/api/blog') return blogFeed(request);
  const submission = await feedbackSubmission(request,env);
  if (submission) return submission;
  const url = new URL(request.url);
  if (url.pathname === '/favicon.ico') url.pathname = '/home/favicon.ico';
  if (url.pathname === '/pigeon') {
   url.pathname = '/pigeon/';
   return Response.redirect(url.toString(), 308);
  }
  const blog = ['/blog','/blog/'].includes(url.pathname);
  const blogAsset = ['/blog/blog.css','/blog/blog.js'].includes(url.pathname);
  const home = url.pathname === '/' || url.pathname === '/index.html';
  const viewer = ['/bitfeedback/viewer','/bitfeedback/viewer/'].includes(url.pathname);
  const feedback = url.pathname === '/bitfeedback' || url.pathname === '/bitfeedback/';
  const feedbackAsset = /^\/bitfeedback\/(?:feedback\.(?:css|js)|viewer\.(?:css|js)|verification\.js|flow\.js|images\.json|credits\.html|assets\/[a-z0-9-]+\.jpg)$/.test(url.pathname);
  const errorAsset = url.pathname === '/errors/gnome.gif';
  const homeAsset = ['/home/home.css', '/home/marwan.jpg', '/home/face-icon.png', '/home/favicon.ico'].includes(url.pathname);
  if (!blog && !blogAsset && !home && !homeAsset && !feedback && !viewer && !feedbackAsset && !errorAsset && !url.pathname.startsWith('/pigeon/')) return notFound(request);
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
  const upstream = new URL('https://theshrimpblimp.github.io');
  upstream.pathname = '/pigeon-website/' + (blog ? 'blog/index.html' : blogAsset ? url.pathname.slice(1) : viewer ? 'bitfeedback/viewer.html' : errorAsset ? 'errors/gnome.gif' : feedback ? 'bitfeedback/index.html' : feedbackAsset ? url.pathname.slice(1) : home ? 'home/index.html' : homeAsset ? url.pathname.slice(1) : url.pathname.slice('/pigeon/'.length));
  upstream.search = url.search;
  // GitHub's CDN can retain old assets even after a Pages deployment.
  upstream.searchParams.set('_pigeon_refresh', String(Math.floor(Date.now() / 60000)));
  const response = await fetch(upstream, {method:request.method, redirect:'manual', headers:{'Cache-Control':'no-cache'}, cf:{cacheTtl:0, cacheEverything:false}});
  if (response.status === 404) return notFound(request);
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
