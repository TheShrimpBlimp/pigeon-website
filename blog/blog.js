const status=document.querySelector('#feed-status'),posts=document.querySelector('#posts');
const allowed=new Set(['P','BR','A','STRONG','EM','B','I','UL','OL','LI','BLOCKQUOTE','PRE','CODE','H1','H2','H3','H4','HR','IMG','TABLE','THEAD','TBODY','TR','TD','TH','DEL']);
function safeURL(value){try{const u=new URL(value,'https://www.reddit.com');return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function clean(node){
 if(node.nodeType===3)return document.createTextNode(node.textContent);
 const out=document.createDocumentFragment();
 if(node.nodeType!==1)return out;
 if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','FORM'].includes(node.tagName))return out;
 const el=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):out;
 if(node.tagName==='A'){const href=safeURL(node.getAttribute('href'));if(href){el.href=href;el.rel='noopener noreferrer';}}
 if(node.tagName==='IMG'){const src=safeURL(node.getAttribute('src'));if(!src)return out;el.src=src;el.alt=node.getAttribute('alt')||'';el.loading='lazy';el.referrerPolicy='no-referrer';}
 for(const child of node.childNodes)el.append(clean(child));return el;
}
async function refresh(){
 try{
  const r=await fetch('/api/blog');if(!r.ok)throw Error('unavailable');
  const feed=new DOMParser().parseFromString(await r.text(),'application/xml');if(feed.querySelector('parsererror'))throw Error('invalid');
  const entries=[...feed.getElementsByTagName('entry')].sort((a,b)=>Date.parse(b.querySelector('published,updated')?.textContent)-Date.parse(a.querySelector('published,updated')?.textContent));
  const rendered=document.createDocumentFragment();
  for(const entry of entries){
   const article=document.createElement('article');article.className='blog-post';
   const id=entry.querySelector('id')?.textContent||'';article.id=id.replace(/[^a-z0-9_-]/gi,'');
   const title=document.createElement('h2');title.textContent=entry.querySelector('title')?.textContent||'Untitled';article.append(title);
   const link=safeURL(entry.querySelector('link[rel="alternate"],link')?.getAttribute('href'));
   const meta=document.createElement('p');meta.className='post-meta';
   const date=new Date(entry.querySelector('published,updated')?.textContent);
   if(!isNaN(date)){const time=document.createElement('time');time.dateTime=date.toISOString();time.textContent=date.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});meta.append(time,' · ');}
   if(link){const a=document.createElement('a');a.href=link;a.textContent='Original post on Reddit ↗';a.rel='noopener noreferrer';meta.append(a);}article.append(meta);
   const body=document.createElement('div');body.className='post-body';
   const content=entry.querySelector('content')?.textContent||'';
   const parsed=new DOMParser().parseFromString(content,'text/html');for(const n of parsed.body.childNodes)body.append(clean(n));
   article.append(body);rendered.append(article);
  }
  posts.replaceChildren(rendered);
  status.textContent=r.headers.get('X-Feed-Stale')?'Showing the last available posts. Reddit is temporarily unavailable.':entries.length?'Latest posts · refreshes automatically every 15 minutes.':'No public posts found yet.';
 }catch{status.textContent=posts.children.length?'Couldn’t refresh right now. Showing the posts already loaded.':'Reddit is temporarily unavailable. You can read my posts using the profile link above.';}
}
refresh();setInterval(()=>{if(!document.hidden)refresh();},900000);
