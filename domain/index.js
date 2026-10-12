// SPDX-License-Identifier: GPL-3.0-only
// Keep the GitHub Pages release as the single source of site assets.
export default {
 async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === '/pigeon') {
   url.pathname = '/pigeon/';
   return Response.redirect(url.toString(), 308);
  }
  if (!url.pathname.startsWith('/pigeon/')) return new Response('Not found', {status:404});
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
  const upstream = new URL('https://theshrimpblimp.github.io');
  upstream.pathname = '/pigeon-website/' + url.pathname.slice('/pigeon/'.length);
  upstream.search = url.search;
  const response = await fetch(upstream, {method:request.method, redirect:'manual'});
  const headers = new Headers(response.headers);
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
