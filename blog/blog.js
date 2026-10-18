const status=document.querySelector('#feed-status'),posts=document.querySelector('#posts');
try{
 const response=await fetch('/api/log/posts');if(!response.ok)throw Error();const data=await response.json();
 for(const post of data.posts){
  const article=document.createElement('article');article.className='blog-post';article.id=post.id;
  const heading=document.createElement('h2');heading.textContent=post.title;
  const time=document.createElement('time');time.className='post-meta';time.dateTime=post.published;time.textContent=new Date(post.published).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});
  const body=document.createElement('div');body.className='post-body';body.style.whiteSpace='pre-wrap';
  for(const part of post.body.split(/(https?:\/\/[^\s<>]+)/g)){if(/^https?:\/\//.test(part)){const a=document.createElement('a');a.href=part;a.textContent=part;a.rel='noopener noreferrer';body.append(a);}else body.append(document.createTextNode(part));}
  article.append(heading,time,body);posts.append(article);
 }
 status.textContent=data.posts.length?'':'No entries yet. Check back soon.';
}catch{status.textContent='The log is temporarily unavailable. Please try again later.';}
