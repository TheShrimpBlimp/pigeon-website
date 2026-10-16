// SPDX-License-Identifier: GPL-3.0-only
export function counterBase(random=Math.random) { return 2+Math.floor(random()*6); }
// Choose once per page load, before asynchronous counter requests finish.
export const pageCounterBase=counterBase();
export function counterDigits(total,base=pageCounterBase,width=6){return total.toString(base).padStart(width,'0');}
export function counterNote(total,base=pageCounterBase){
 if(base===10)return '';
 const label=base===2?'binary':base===3?'trinary':`base ${base}`;
 return `Impressive count isn't it? It's actually in ${label} so it looks more impressive. HA! In the decimal system, the count is: ${total.toLocaleString('en-US')}`;
}
export function renderNixie(container,value){
 const tubes=String(value).split('').map(digit=>{
  const tube=document.createElement('span');tube.className='nixie-tube';
  const unlit=document.createElement('span');unlit.className='nixie-unlit';unlit.setAttribute('aria-hidden','true');
  for(let n=0;n<10;n++){const layer=document.createElement('b');layer.textContent=n;layer.style.setProperty('--depth',n);unlit.append(layer);}
  const lit=document.createElement('span');lit.className='nixie-active';lit.textContent=digit;lit.setAttribute('aria-hidden','true');tube.append(unlit,lit);return tube;
 });
 container.replaceChildren(...tubes);
}
