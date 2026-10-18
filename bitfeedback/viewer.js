import {verifyFeedback} from './verification.js';
const input=document.querySelector('#csv-files'),zone=document.querySelector('#drop-zone'),results=document.querySelector('#results'),filter=document.querySelector('#filter'),toolbar=document.querySelector('#viewer-toolbar'),status=document.querySelector('#file-status');
const cards=[];let generation=0;
const titles={q0:'Who are you?',q1:'The bit',q2:'How it made them feel',q3:'Parts they enjoyed',q4:'Parts they disliked',q5:'Suggestions, ideas, or improvements',q6:'Final rating',initial_rating:'Initial rating',rating_attempts:'Rating selections',activity_idea:'Suggested activity'};
const labels={valid:'Verified',invalid:'Invalid signature',unsigned:'Unsigned',error:'Unreadable',pending:'Checking…'};
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
function update(){
 const done=cards.filter(x=>x.state!=='pending'),valid=done.filter(x=>x.state==='valid').length;toolbar.hidden=!cards.length;
 document.querySelector('#summary').textContent=`${cards.length} file${cards.length===1?'':'s'} · ${valid} verified · ${done.length-valid} need attention${done.length<cards.length?` · ${cards.length-done.length} checking`:''}`;
 let visible=0;for(const card of cards){card.node.hidden=filter.value==='valid'?card.state!=='valid':filter.value==='attention'?card.state==='valid'||card.state==='pending':false;if(!card.node.hidden)visible++;}
 document.querySelector('#no-matches').hidden=!cards.length||visible!==0;
}
function row(dl,label,value){dl.append(el('dt',label),el('dd',value));}
function display(card,result){
 const fields=result.fields;card.state=result.status;card.node.replaceChildren();const top=el('div',undefined,'card-top'),identity=el('div');identity.append(el('h2',fields?.get('q0')||card.filename),el('p',card.filename,'filename'));top.append(identity,el('span',labels[card.state],'verification-badge '+card.state));card.node.append(top,el('p',result.message,'verification-message'));
 if(!fields)return;
 const details=el('details');details.open=card.state==='valid';details.append(el('summary',card.state==='valid'?'Read feedback':'Read unverified contents'));const dl=el('dl');
 for(const [key,label]of Object.entries(titles)){if(fields.has(key))row(dl,label,key==='q6'||key==='initial_rating'?`${fields.get(key)} / 10`:fields.get(key));}
 for(const [key,value]of fields){const match=key.match(/^date_(\d+)$/);if(match){const response=fields.get('response_'+match[1]);row(dl,`Date offer ${match[1]}`,`${value} — ${{A:'Not much, why? Did you have something in mind?',B:'Busy.',C:'I’m very attracted to you and can’t wait till Friday please come to me now.'}[response]||response||'No response'}`);}}
 details.append(dl);card.node.append(details);
 const meta=el('details');meta.append(el('summary','File details'));const md=el('dl',undefined,'metadata');for(const [key,label]of [['issued_at','Signed at'],['submission_id','Submission ID'],['format','Format'],['signature_algorithm','Signature algorithm'],['signature','Signature']])if(fields.has(key))row(md,label,fields.get(key));meta.append(md);card.node.append(meta);
}
async function openFiles(files){
 const current=generation;let added=0;
 for(const file of files){
  if(current!==generation)return;
  if(cards.length>=100){status.textContent='Open up to 100 files at once. Clear these files to open more.';break;}
  const node=el('article',undefined,'feedback-card'),card={node,filename:file.name,state:'pending'};cards.push(card);results.append(node);node.append(el('p',file.name+' — checking…'));added++;update();
  try{if(file.size>1024*1024)throw Error('File exceeds 1 MiB.');const result=await verifyFeedback(new Uint8Array(await file.arrayBuffer()));if(current!==generation)return;display(card,result);}catch(e){if(current!==generation)return;display(card,{status:'error',message:e.message||'This file could not be read.'});}update();
 }
 if(current===generation&&added)status.textContent=`Opened ${added} file${added===1?'':'s'}. Nothing was uploaded.`;
 input.value='';
}
input.onchange=()=>openFiles([...input.files]);filter.onchange=update;
zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging');});zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('dragging');});zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');openFiles([...e.dataTransfer.files]);});
document.querySelector('#clear-files').onclick=()=>{generation++;cards.length=0;results.replaceChildren();input.value='';status.textContent='Files cleared.';filter.value='all';update();input.focus();};
