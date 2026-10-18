const encoder=new TextEncoder();
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const json=(value,status=200)=>Response.json(value,{status,headers});
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function equal(a,b){return await sign(a,'compare')===await sign(b,'compare');}
async function authenticated(request,secret){if(!secret)return false;const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)captain_admin=([^;]+)/)?.[1]||'';const [expires,signature]=token.split('.');return /^\d+$/.test(expires)&&Number(expires)>Date.now()&&Number(expires)<Date.now()+86400001&&await equal(signature||'',await sign(expires,secret));}
export async function blogAdmin(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/log/'))return null;
 if(path==='/api/log/posts'&&request.method==='GET'){
  const rows=await env.DB.prepare('SELECT id,title,body,published FROM captain_posts ORDER BY published DESC,id DESC').all();return json({posts:rows.results});
 }
 if(!env.BLOG_ADMIN_PASSWORD)return json({error:'Admin access has not been configured.'},503);
 if(!['GET','POST','DELETE'].includes(request.method))return json({error:'Method not allowed'},405);
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
 if(path==='/api/log/login'&&request.method==='POST'){
  // Durable per-hour attempt limit. Applies before password verification.
  const hour=Math.floor(Date.now()/3600000);const ip=request.headers.get('CF-Connecting-IP')||'local';const bucket=await sign(ip+'|'+hour,env.BLOG_ADMIN_PASSWORD);
  const attempt=await env.DB.prepare('INSERT INTO captain_login_limit(bucket,n,hour) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET n=n+1 RETURNING n').bind(bucket,hour).first();
  if(attempt.n>20)return json({error:'Too many attempts. Try again later.'},429);
  await env.DB.prepare('DELETE FROM captain_login_limit WHERE hour<?').bind(hour-2).run();
  let input;try{input=await request.json();}catch{return json({error:'Invalid request'},400);}
  if(typeof input.password!=='string'||input.password.length>1024||!await equal(input.password,env.BLOG_ADMIN_PASSWORD))return json({error:'Incorrect password'},401);
  const expires=String(Date.now()+86400000);const response=json({ok:true});response.headers.set('Set-Cookie','captain_admin='+expires+'.'+await sign(expires,env.BLOG_ADMIN_PASSWORD)+'; HttpOnly; Secure; SameSite=Strict; Path=/api/log/; Max-Age=86400');return response;
 }
 if(!await authenticated(request,env.BLOG_ADMIN_PASSWORD))return json({error:'Please sign in'},401);
 if(path==='/api/log/session'&&request.method==='GET')return json({ok:true});
 if(path==='/api/log/logout'&&request.method==='POST'){const response=json({ok:true});response.headers.set('Set-Cookie','captain_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/log/; Max-Age=0');return response;}
 if(path==='/api/log/posts'&&request.method==='POST'){
  if(Number(request.headers.get('Content-Length')||0)>220000)return json({error:'Post is too large'},413);
  const raw=await request.text();if(raw.length>220000)return json({error:'Post is too large'},413);
  let p;try{p=JSON.parse(raw);}catch{return json({error:'Invalid post'},400);}
  if(typeof p.title!=='string'||!p.title.trim()||p.title.length>200||typeof p.body!=='string'||!p.body.trim()||p.body.length>200000||!Number.isFinite(Date.parse(p.published)))return json({error:'Enter a title, post text and valid date'},400);
  const id=p.id||crypto.randomUUID();if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return json({error:'Invalid post ID'},400);
  await env.DB.prepare('INSERT INTO captain_posts(id,title,body,published) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,published=excluded.published').bind(id,p.title.trim(),p.body,new Date(p.published).toISOString()).run();return json({ok:true,id});
 }
 const id=path.match(/^\/api\/log\/posts\/([a-zA-Z0-9_-]{1,80})$/)?.[1];
 if(id&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM captain_posts WHERE id=?').bind(id).run();return json({ok:true});}
 return json({error:'Not found'},404);
}
