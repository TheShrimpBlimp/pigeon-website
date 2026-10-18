export const questions=[
 'Who are you?',
 'Please briefly describe the bit you’re providing feedback for:',
 'Please briefly describe how the bit made you feel:',
 'Any parts of the bit you particularly enjoyed?',
 'Any parts of the bit you particularly disliked?',
 'Any suggestions, ideas, or improvements?',
 'Please rate the bit out of 10'
];
export function nextFriday(now=new Date()){
 const date=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
 date.setDate(date.getDate()+((5-date.getDay()+7)%7||7));return date;
}
export function advanceDate(date){const next=new Date(date);next.setDate(next.getDate()+1);return next;}
export function dateQuestion(date){
 const n=date.getDate(),suffix=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');
 return `What about ${date.toLocaleDateString('en-US',{weekday:'long'})}, the ${n}${suffix} of ${date.toLocaleDateString('en-US',{month:'long'})}, ${date.getFullYear()}?`;
}
export function ratingOutcome(value,hasFizzled){return value===10?'date':hasFizzled||value<7?'fizzle':'thanks';}
