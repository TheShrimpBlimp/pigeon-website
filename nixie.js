export function counterDigits(total){return total.toString(3).padStart(6,"0");}
// SPDX-License-Identifier: GPL-3.0-only
export function renderNixie(container,value){
 const tubes=String(value).split('').map(digit=>{
  const tube=document.createElement('span');tube.className='nixie-tube';
  const unlit=document.createElement('span');unlit.className='nixie-unlit';unlit.setAttribute('aria-hidden','true');
  for(let n=0;n<10;n++){const layer=document.createElement('b');layer.textContent=n;layer.style.setProperty('--depth',n);unlit.append(layer);}
  const lit=document.createElement('span');lit.className='nixie-active';lit.textContent=digit;lit.setAttribute('aria-hidden','true');tube.append(unlit,lit);return tube;
 });
 container.replaceChildren(...tubes);container.setAttribute('aria-label',String(Number(value)).replace(/\B(?=(\d{3})+(?!\d))/g,','));
}
