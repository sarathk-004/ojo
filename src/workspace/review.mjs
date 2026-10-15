// The weekly review: what happened between Monday and Sunday, from what ojo already knows.
// Only real records are counted. Tasks finished before ojo began recording completion times are not guessed.
const pad=n=>String(n).padStart(2,'0');
export const dayStr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12);};
export function weekRange(day){
 const d=parse(day),back=(d.getDay()+6)%7;
 const start=new Date(d);start.setDate(d.getDate()-back);
 const end=new Date(start);end.setDate(start.getDate()+6);
 const days=Array.from({length:7},(_,i)=>{const x=new Date(start);x.setDate(start.getDate()+i);return dayStr(x);});
 return {start:dayStr(start),end:dayStr(end),days,startMs:new Date(start.getFullYear(),start.getMonth(),start.getDate()).getTime(),endMs:new Date(end.getFullYear(),end.getMonth(),end.getDate()+1).getTime()};
}
export const shiftWeek=(day,n)=>{const d=parse(day);d.setDate(d.getDate()+7*n);return dayStr(d);};
const inMs=(t,r)=>Number.isFinite(t)&&t>=r.startMs&&t<r.endMs;
const inDay=(s,r)=>typeof s==='string'&&s>=r.start&&s<=r.end;
const round=n=>Math.round(n*100)/100;

export function weeklyStats(data,anyDay){
 const r=weekRange(anyDay),prev=weekRange(shiftWeek(anyDay,-1));
 const tasks=data.tasks||[],fin=(data.finance||[]).filter(t=>!t.deleted);
 // tasks
 const finished=tasks.filter(t=>!t.repeat&&t.done&&inMs(t.doneAt,r)).sort((a,b)=>a.doneAt-b.doneAt).map(t=>({id:t.id,title:t.title,at:t.doneAt}));
 const habits=tasks.filter(t=>t.repeat).map(t=>{
  const done=r.days.map(d=>(t.completions||[]).includes(d));
  return {id:t.id,title:t.title,days:done,count:done.filter(Boolean).length};
 });
 const habitTotal=habits.reduce((n,h)=>n+h.count,0),habitPossible=habits.length*7;
 // money
 const spend=list=>list.filter(t=>t.type==='expense').reduce((n,t)=>n+t.amount,0);
 const earn=list=>list.filter(t=>t.type==='income').reduce((n,t)=>n+t.amount,0);
 const wk=fin.filter(t=>inDay(t.date,r)),pw=fin.filter(t=>inDay(t.date,prev));
 const cats=new Map();for(const t of wk)if(t.type==='expense')cats.set(t.category,(cats.get(t.category)||0)+t.amount);
 const topCats=[...cats].map(([category,amount])=>({category,amount:round(amount)})).sort((a,b)=>b.amount-a.amount).slice(0,4);
 const biggest=wk.filter(t=>t.type==='expense').sort((a,b)=>b.amount-a.amount)[0]||null;
 const expense=round(spend(wk)),income=round(earn(wk)),prevExpense=round(spend(pw));
 // bills
 const billsPaid=wk.filter(t=>t.billId);
 // focus
 const sessions=(data.focus||[]).filter(s=>inMs(s.start,r));
 const focusSeconds=sessions.reduce((n,s)=>n+s.seconds,0);
 const byTask=new Map();for(const s of sessions){const k=s.taskId||s.title||'';const c=byTask.get(k)||{title:s.title||'Focus',seconds:0};c.seconds+=s.seconds;byTask.set(k,c);}
 // the rest of ojo
 const notesMade=(data.notes||[]).filter(n=>!n.deleted&&inMs(n.created,r)).length;
 const notesEdited=(data.notes||[]).filter(n=>!n.deleted&&inMs(n.updated,r)&&!inMs(n.created,r)).length;
 const savedAdded=(data.saved||[]).filter(s=>!s.deleted&&inMs(s.created,r)).length;
 const jobsApplied=(data.jobs||[]).filter(j=>inDay(j.appliedDate,r)).length;
 const jobMoves=(data.jobs||[]).reduce((n,j)=>n+(j.history||[]).filter(h=>inMs(h.at,r)&&h.status!=='Wishlist').length,0);
 const events=(data.events||[]).filter(e=>inDay(e.date,r)).length;
 const wins=(data.wins||[]).filter(w=>inDay(w.day,r)).sort((a,b)=>a.day.localeCompare(b.day)||a.at-b.at).map(w=>({id:w.id,day:w.day,text:w.text}));
 return {
  range:r,
  tasks:{finished,habits,habitTotal,habitPossible,habitRate:habitPossible?Math.round(habitTotal/habitPossible*100):null},
  money:{income,expense,saved:round(income-expense),prevExpense,change:prevExpense?Math.round((expense-prevExpense)/prevExpense*100):null,topCats,biggest,count:wk.length},
  bills:{paidCount:billsPaid.length,paidTotal:round(billsPaid.reduce((n,t)=>n+t.amount,0))},
  focus:{seconds:focusSeconds,sessions:sessions.length,top:[...byTask.values()].sort((a,b)=>b.seconds-a.seconds).slice(0,4)},
  wins,
  other:{notesMade,notesEdited,savedAdded,jobsApplied,jobMoves,events}
 };
}
