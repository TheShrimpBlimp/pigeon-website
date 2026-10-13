// SPDX-License-Identifier: GPL-3.0-only
// Anonymous, client-reported completed installs. No device/user identity stored.
import {trialApi} from '../trial-api.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/trials')return trialApi(request,env,{},request.headers.get('Origin')===url.origin);
  if(url.pathname==='/api/installs'){
   if(!env.DB)return json({error:'Install counter unavailable'},503);
   try{
    if(request.method==='GET'){
     const total=await env.DB.prepare('SELECT COUNT(*) AS total FROM installs').first();
     const releases=await env.DB.prepare('SELECT release, COUNT(*) AS installs FROM installs GROUP BY release ORDER BY installs DESC').all();
     return json({total:total.total,releases:releases.results,definition:'Client-reported successful installations, including reinstalls. Not unique devices.'});
    }
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin requests required'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
    if(Number(request.headers.get('Content-Length')||0)>512)return json({error:'Body too large'},413);
    const text=await request.text();if(text.length>512)return json({error:'Body too large'},413);
    let data;try{data=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
    if(!data || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id||'') || !/^[0-9a-f]{64}$/.test(data.release||'') || !['installer','sample-tool'].includes(data.source))return json({error:'Invalid install event'},400);
    await env.DB.prepare('INSERT OR IGNORE INTO installs (id, release, source, day) VALUES (?, ?, ?, ?)').bind(data.id,data.release,data.source,new Date().toISOString().slice(0,10)).run();
    return json({recorded:true});
   }catch{return json({error:'Install counter temporarily unavailable'},503);}
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 }
};
