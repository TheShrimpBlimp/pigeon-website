// Public posts only. Keep the last successful feed through temporary Reddit failures.
const SOURCE='https://www.reddit.com/user/theshrimpblimp/submitted/.rss';
export async function blogFeed(request){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const key=new Request(new URL('/__blog_feed_cache',request.url));
 const cache=globalThis.caches?.default;
 let saved;try{saved=await cache?.match(key);}catch{}
 const age=saved?Date.now()-Number(saved.headers.get('X-Feed-Fetched')):Infinity;
 const reply=r=>{const headers=new Headers(r.headers);headers.set('Cache-Control','public, max-age=300');return new Response(request.method==='HEAD'?null:r.body,{status:r.status,headers});};
 if(age<900000)return reply(saved);
 try{
  const upstream=await fetch(SOURCE,{headers:{'User-Agent':'theshrimpblimp-blog/1.0 (+https://theshrimpblimp.com/blog/)'},signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)throw Error('Feed unavailable');
  const body=await upstream.text();
  if(!body.includes('<feed')||!body.includes('http://www.w3.org/2005/Atom'))throw Error('Invalid feed');
  const response=new Response(body,{headers:{'Content-Type':'application/atom+xml; charset=utf-8','Cache-Control':'public, max-age=604800','X-Feed-Fetched':String(Date.now()),'X-Content-Type-Options':'nosniff'}});
  await cache?.put(key,response.clone());
  const result=reply(response);result.headers.set('Cache-Control','public, max-age=300');return result;
 }catch{
  if(saved){const result=reply(saved);result.headers.set('X-Feed-Stale','1');result.headers.set('Cache-Control','no-cache');return result;}
  return new Response('Reddit is temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'900'}});
 }
}
