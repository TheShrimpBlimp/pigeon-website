import {questions,nextFriday,advanceDate,dateQuestion,ratingOutcome} from './flow.js';
const form=document.querySelector('#survey'),box=document.querySelector('#question'),next=document.querySelector('#next'),back=document.querySelector('#back'),status=document.querySelector('#status');
const headings=['WHO GOES THERE?','THE BIT','THE FEELINGS','THE GOOD','THE BAD','THE NOTES','THE VERDICT'];
let answers={},step=0,rating=null,initialRating=null,fizzled=false,removed=new Set(),attempts=[],choice=null,date=nextFriday(),dateAnswers=[],selected=new Set(),tiles=[],downloadURL=null,submitting=false;
const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==null)node.textContent=text;for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
function heading(text){box.append(el('h1',text,{id:'question-title',tabindex:'-1'}));}
function render(){
 box.replaceChildren();status.textContent='';next.hidden=false;next.disabled=false;next.textContent='Next ↗';back.hidden=!(Number.isInteger(step)&&step>0&&step<=6);form.setAttribute('aria-labelledby','question-title');
 document.querySelector('#step-label').textContent=Number.isInteger(step)?`Q${step} / ${headings[step]||'A FOLLOW-UP'}`:step==='captcha'?'FARTCHA / FINAL CHECK':'A VERY NORMAL FOLLOW-UP';
 document.querySelector('#progress-fill').style.width=(typeof step==='number'?Math.min(90,(step+1)/9*100):step==='done'?100:95)+'%';
 if(Number.isInteger(step)&&step<6){
  heading(questions[step]);const input=el(step===0?'input':'textarea',null,{id:'answer',name:'answer','aria-labelledby':'question-title',maxlength:step===0?'200':'4000',autocomplete:step===0?'name':'off'});input.value=answers['q'+step]||'';box.append(input);
 }else if(step===6){
  heading(questions[6]);const grid=el('div',null,{class:'ratings',role:'group','aria-labelledby':'question-title'});
  for(let n=1;n<=10;n++){const b=el('button',String(n),{type:'button','aria-pressed':String(rating===n),'aria-label':`${n} out of 10`,'data-rating':String(n)});if(removed.has(n)){b.classList.add('gone');b.disabled=true;b.setAttribute('aria-hidden','true');}b.onclick=()=>{rating=n;grid.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent='';};grid.append(b);}box.append(grid);const labels=el('div',null,{class:'rating-labels'});labels.append(el('span','A tough crowd'),el('span','Standing ovation'));box.append(labels);
 }else if(step==='date'){
  heading(dateAnswers.length?dateQuestion(date):'A 10, huh? Say, uh, what are you doing next Friday night?');
  const list=el('div',null,{class:'choices',role:'group','aria-labelledby':'question-title'});
  for(const [key,text] of [['A','Not much, why? Did you have something in mind?'],['B','Busy.'],['C','I’m very attracted to you and can’t wait till Friday please come to me now.']]){const b=el('button',null,{type:'button',class:'choice','aria-pressed':String(choice===key)});b.append(el('b',key),document.createTextNode(text));b.onclick=()=>{choice=key;list.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent='';};list.append(b);}box.append(list);
 }else if(step==='idea'){
  heading('Maybe. Did you have anything you wanted to do in mind?');box.append(el('textarea',null,{id:'idea',maxlength:'4000','aria-labelledby':'question-title'}));
 }else if(step==='rejected'){
  heading(`I think ${answers.idea} is a terrible idea. I don’t know what I saw in you. Goodbye.`);next.textContent='Submit';
 }else if(step==='eager'){
  heading('oh uhhhh ok I guess? I’ll let you know.');next.textContent='Submit';
 }else if(step==='thanks'){
  heading('Thank you for your feedback.');next.textContent='Submit';
 }else if(step==='captcha'){
  const panel=el('div',null,{class:'fartcha-heading'});panel.append(el('p','FARTCHA'),el('h1','Please select all images with a funny person in them.',{id:'question-title',tabindex:'-1'}));box.append(panel);const grid=el('div',null,{class:'fartcha-grid',role:'group','aria-labelledby':'question-title'});
  for(const tile of tiles){const b=el('button',null,{type:'button',class:'fartcha-tile','aria-label':tile.name,'aria-pressed':String(selected.has(tile.id))});b.append(el('img',null,{src:tile.src,alt:tile.name,width:'240',height:'240'}));b.onclick=()=>{selected.has(tile.id)?selected.delete(tile.id):selected.add(tile.id);b.setAttribute('aria-pressed',String(selected.has(tile.id)));status.textContent='';};grid.append(b);}box.append(grid);next.textContent='Verify & submit';
 }else if(step==='done'){
  heading('So you really want me to know your opinion huh?');box.append(el('p','Prove it. Take this csv file and send it to me via DMs. Show me you’re not too lazy. If you can’t dm me then I don’t really care about your opinion anyway. Tuff'));
  box.append(el('a','Download your CSV again',{href:downloadURL,download:'bit-feedback.csv',class:'download-again'}));next.textContent='Submit feedback on another bit';
 }
 box.querySelector('h1')?.focus({preventScroll:true});
}
function error(text){status.textContent=text;}
async function openCaptcha(){
 if(!tiles.length){next.disabled=true;try{const r=await fetch('/bitfeedback/images.json');if(!r.ok)throw Error();const images=await r.json();const me=images.find(x=>x.id==='marwan'),others=images.filter(x=>x.id!=='marwan');if(!me||others.length<8)throw Error();for(let i=others.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[others[i],others[j]]=[others[j],others[i]];}tiles=[me,...others.slice(0,8)];for(let i=tiles.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}}catch{error('The Fartcha photos couldn’t load. Please try again.');next.disabled=false;return;}}
 step='captcha';render();
}
async function submit(){
 if(selected.size!==1||!selected.has('marwan')){selected.clear();render();error('Not funny. Try again.');return;}
 if(submitting)return;submitting=true;next.disabled=true;next.textContent='Preparing your CSV…';
 try{
  const r=await fetch('/api/bitfeedback/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers,initialRating,ratingAttempts:attempts,dateAnswers,selected:[...selected]})});
  if(!r.ok)throw Error(r.status===503?'The CSV signing service isn’t ready yet. Your answers are still here. Please try again later.':'Your CSV couldn’t be prepared. Please try again.');
  const blob=await r.blob();if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);const a=el('a','',{href:downloadURL,download:'bit-feedback.csv'});document.body.append(a);a.click();a.remove();step='done';render();
 }catch(e){error(e.message);next.disabled=false;next.textContent='Verify & submit';}finally{submitting=false;}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 if(Number.isInteger(step)&&step<6){const value=document.querySelector('#answer').value.trim();if(!value){error('Give me something to work with.');document.querySelector('#answer').focus();return;}answers['q'+step]=value;step++;render();}
 else if(step===6){if(rating===null){error('Pick a number first.');return;}if(initialRating===null)initialRating=rating;attempts.push(rating);const outcome=ratingOutcome(rating,fizzled);if(outcome==='fizzle'){fizzled=true;removed.add(rating);const b=box.querySelector(`[data-rating="${rating}"]`);b.classList.add('fizzle');b.disabled=true;b.setAttribute('aria-pressed','false');setTimeout(()=>{b.classList.add('gone');b.setAttribute('aria-hidden','true');},550);rating=null;error('That one seems to have fizzled away. Another number?');next.focus();return;}answers.q6=String(rating);step=outcome==='date'?'date':'thanks';render();}
 else if(step==='date'){if(!choice){error('Don’t leave me hanging.');return;}dateAnswers.push({date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,answer:choice});if(choice==='B'){date=advanceDate(date);choice=null;render();}else{step=choice==='A'?'idea':'eager';render();}}
 else if(step==='idea'){const value=document.querySelector('#idea').value.trim();if(!value){error('What did you have in mind?');return;}answers.idea=value;step='rejected';render();}
 else if(['thanks','eager','rejected'].includes(step))await openCaptcha();
 else if(step==='captcha')await submit();
 else if(step==='done'){if(downloadURL)URL.revokeObjectURL(downloadURL);answers={};step=0;rating=null;initialRating=null;fizzled=false;removed=new Set();attempts=[];choice=null;date=nextFriday();dateAnswers=[];selected=new Set();tiles=[];downloadURL=null;render();}
});
back.onclick=()=>{if(Number.isInteger(step)&&step>0&&step<=6){if(step<6)answers['q'+step]=document.querySelector('#answer').value;step--;render();}};
render();
