// SPDX-License-Identifier: GPL-3.0-only
// Novelty count of client-reported successful installs, including repeats.
import {trialApi} from '../trial-api.js';
import {hubInstalls} from '../hub-count.js';
const origins = new Set(['https://theshrimpblimp.github.io', 'https://theshrimpblimp.com', 'https://www.theshrimpblimp.com']);
export default {
 async fetch(request, env) {
  const origin = request.headers.get('Origin');
  const headers = {'Cache-Control':'no-store', 'Vary':'Origin'};
  if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const json = (value, status=200) => Response.json(value, {status, headers});
  if(new URL(request.url).pathname==='/api/trials')return trialApi(request,env,headers,origins.has(origin));
  if (new URL(request.url).pathname !== '/api/installs') return json({error:'Not found'},404);
  if (request.method === 'OPTIONS') {
   if (!origins.has(origin)) return json({error:'Origin not allowed'},403);
   return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  }
  try {
   if (request.method === 'POST') {
    if (!origins.has(origin)) return json({error:'Origin not allowed'},403);
    await env.DB.prepare('UPDATE counter SET total = total + 1 WHERE id = 1').run();
   } else if (request.method !== 'GET') return json({error:'Method not allowed'},405);
   const local=await env.DB.prepare('SELECT total FROM counter WHERE id = 1').first();
   return json({total:local.total+await hubInstalls(env.DB)});
  } catch { return json({error:'Counter unavailable'},503); }
 }
};
