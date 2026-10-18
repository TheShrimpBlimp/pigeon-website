const $=s=>document.querySelector(s),status=$('#admin-status');let posts=[];
async function api(path,method='GET',data){const r=await fetch('/api/log/'+path,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const result=await r.json();if(!r.ok)throw Error(result.error||'Request failed');return result;}
function edit(p={}){$('#post-id').value=p.id||'';$('#post-title').value=p.title||'';$('#post-body').value=p.body||'';const d=p.published?new Date(p.published):new Date();$('#post-date').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);$('#delete-post').hidden=!p.id;}
async function load(){posts=(await api('posts')).posts;$('#post-list').replaceChildren();for(const p of posts){const b=document.createElement('button');b.type='button';b.textContent=p.title;b.onclick=()=>edit(p);$('#post-list').append(b);}}
async function open(){await api('session');$('#login').hidden=true;$('#desk').hidden=false;await load();edit();}
$('#login').onsubmit=async e=>{e.preventDefault();try{await api('login','POST',{password:$('#password').value});$('#password').value='';await open();status.textContent='Signed in.';}catch(e){status.textContent=e.message;}};
$('#new-post').onclick=()=>edit();
$('#editor').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const p={id:$('#post-id').value||undefined,title:$('#post-title').value,body:$('#post-body').value,published:new Date($('#post-date').value).toISOString()};const r=await api('posts','POST',p);await load();edit(posts.find(p=>p.id===r.id));status.textContent='Published. Your entry is now in Captain’s Log.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
$('#delete-post').onclick=async()=>{if(!confirm('Delete this post?'))return;try{await api('posts/'+encodeURIComponent($('#post-id').value),'DELETE');await load();edit();status.textContent='Post deleted.';}catch(e){status.textContent=e.message;}};
$('#logout').onclick=async()=>{try{await api('logout','POST');location.reload();}catch(e){status.textContent=e.message;}};
open().catch(()=>{});
