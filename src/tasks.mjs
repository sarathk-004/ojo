export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
// ---- Repeating tasks ----
// A task with repeat:true and no `recur` repeats every day (the original behaviour).
// recur: {type:'weekly',days:[1,3]} | {type:'interval',every:3} | {type:'monthly'} | {type:'daily'}
export const RECUR_TYPES=[{id:'daily',label:'Every day'},{id:'weekly',label:'Weekly on chosen days'},{id:'interval',label:'Every few days'},{id:'monthly',label:'Monthly'}];
const DAY_ABBR=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const parseKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(y,(m||1)-1,d||1,12);};
const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
export const isDailyTask=t=>!!t.repeat&&(!t.recur||t.recur.type==='daily');
export function recurLabel(t){
 const r=t.recur;
 if(!t.repeat)return '';
 if(!r||r.type==='daily')return 'Every day';
 if(r.type==='weekly'){const d=(r.days&&r.days.length?[...r.days]:[]).sort((a,b)=>((a+6)%7)-((b+6)%7));return d.length===7?'Every day':d.length?d.map(x=>DAY_ABBR[x]).join(' · '):'Weekly';}
 if(r.type==='interval')return (r.every||1)===1?'Every day':'Every '+(r.every||1)+' days';
 if(r.type==='monthly'){const dom=r.dom||(t.date?parseKey(t.date).getDate():0);return dom?'Monthly on the '+ordinal(dom):'Monthly';}
 return 'Repeats';
}
// The first day strictly after `today` that the task is due again (`task.date` is the day it was last due).
export function nextDate(task,today){
 const r=task.recur||{type:'daily'},last=task.date||today;
 const d=parseKey(today);
 if(r.type==='weekly'){
  const days=r.days&&r.days.length?r.days:[parseKey(last).getDay()];
  for(let i=0;i<8;i++){d.setDate(d.getDate()+1);if(days.includes(d.getDay()))return dayKey(d);}
 }
 if(r.type==='interval'){
  const n=Math.max(1,Math.round(r.every)||1),x=parseKey(last);
  do{x.setDate(x.getDate()+n);}while(dayKey(x)<=today);
  return dayKey(x);
 }
 if(r.type==='monthly'){
  const dom=r.dom||parseKey(last).getDate(),x=parseKey(last);
  do{
   x.setDate(1);x.setMonth(x.getMonth()+1);
   x.setDate(Math.min(dom,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));
  }while(dayKey(x)<=today);
  return dayKey(x);
 }
 const x=parseKey(last);do{x.setDate(x.getDate()+1);}while(dayKey(x)<=today);
 return dayKey(x);
}
// The day a newly repeating task should start on: today if it is due today, otherwise its next day.
export function firstDate(recur,from=dayKey()){
 const probe={recur,date:dayKey((()=>{const x=parseKey(from);x.setDate(x.getDate()-1);return x;})())};
 if(recur&&recur.type==='weekly'){const days=recur.days&&recur.days.length?recur.days:[parseKey(from).getDay()];for(let i=0;i<7;i++){const x=parseKey(from);x.setDate(x.getDate()+i);if(days.includes(x.getDay()))return dayKey(x);}}
 if(recur&&recur.type==='monthly'||recur&&recur.type==='interval')return from;
 return nextDate(probe,dayKey((()=>{const x=parseKey(from);x.setDate(x.getDate()-1);return x;})()));
}

// ---- Subtasks ----
export const newSubtask=(title,id=crypto.randomUUID())=>({id,title:String(title).trim(),done:false});
export const subtaskProgress=t=>{const s=t.subtasks||[];return {done:s.filter(x=>x.done).length,total:s.length};};
export const toggleSubtask=(task,id)=>({...task,subtasks:(task.subtasks||[]).map(s=>s.id===id?{...s,done:!s.done}:s)});

// ---- Moving a task to another day (snooze, "do it tomorrow") ----
export const addDays=(date,n)=>{const x=parseKey(date);x.setDate(x.getDate()+n);return dayKey(x);};
export function moveTask(task,newDate){
 const reminder=task.reminder&&newDate?`${newDate}T${task.reminder.slice(11)}`:'';
 return {...task,date:newDate,reminder,notified:false};
}
// "This weekend" is the coming Saturday, "next week" the coming Monday.
export function snoozeDate(kind,from=dayKey()){
 const d=parseKey(from),dow=d.getDay();
 if(kind==='tomorrow')return addDays(from,1);
 if(kind==='weekend')return addDays(from,(6-dow+7)%7||7);
 if(kind==='nextweek')return addDays(from,(8-dow)%7||7);
 return from;
}
export const initialState = () => ({tasks: [], theme: 'river', covers: [], top: false, startup: false, mutedUntil: 0});
export const defaultListOrder=['Today','Upcoming','Anytime','Daily'];
export function normalizeListOrder(order){return [...new Set([...(Array.isArray(order)?order:[]),...defaultListOrder])].filter(n=>defaultListOrder.includes(n));}
export function syncMasterDaily(state,now=new Date()){
 const today=dayKey(now),required=state.tasks.filter(t=>t.repeat&&((t.date&&t.date<=today)||completedToday(t,now))).map(t=>t.id).sort();
 const completed=required.filter(id=>completedToday(state.tasks.find(t=>t.id===id),now));
 const entry={required,completed},previous=state.masterDaily?.[today];
 if(!required.length&&!previous)return state;
 if(previous&&JSON.stringify(previous)===JSON.stringify(entry))return state;
 return {...state,masterDaily:{...(state.masterDaily||{}),[today]:entry}};
}
export function masterDailyTask(ledger={}){return {id:'__master_daily__',title:'All daily tasks',master:true,completions:Object.entries(ledger).filter(([,entry])=>Array.isArray(entry.required)&&entry.required.length>0&&entry.required.every(id=>entry.completed?.includes(id))).map(([date])=>date).sort()};}
export function newTask(title, view, now = new Date(), id = crypto.randomUUID()) {
  const date = new Date(now);
  if (view === 'Upcoming') date.setDate(date.getDate()+1);
  return {id,title:title.trim(),date:view==='Anytime'?'':dayKey(date),reminder:'',repeat:view==='Daily',done:false,notes:''};
}
export function reorderTask(tasks, id, targetId, after = false) {
  if(id===targetId||!tasks.some(t=>t.id===id)||!tasks.some(t=>t.id===targetId))return tasks;
  const item=tasks.find(t=>t.id===id),rest=tasks.filter(t=>t.id!==id);
  rest.splice(rest.findIndex(t=>t.id===targetId)+(after?1:0),0,item);
  return rest;
}
export function snoozeTask(task, minutes = 10, now = Date.now()) {
  const date=new Date(now+minutes*60000);
  return {...task,reminder:`${dayKey(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`,notified:false};
}
export function belongs(task, view, now = new Date()) {
  if(view==='Daily')return !!task.repeat;
  if(task.repeat)return false;
  if (view === 'Anytime') return !task.date;
  if (view === 'Upcoming') return !!task.date && task.date > dayKey(now);
  return !!task.date && task.date <= dayKey(now);
}
export const completedToday=(task,now=new Date())=>task.repeat?!!task.completions?.includes(dayKey(now)):!!task.done;
export function collectReminders(state, now = Date.now()) {
  if(state.mutedUntil>now)return {due:[],state};
  const due = state.tasks.filter(t => !t.done && t.reminder && !t.notified && Number.isFinite(Date.parse(t.reminder)) && Date.parse(t.reminder) <= now);
  return {due, state: {...state, tasks: state.tasks.map(t => due.some(d => d.id === t.id) ? {...t, notified: true} : t)}};
}
export function toggleTask(task, now = new Date()) {
  if (!task.done && task.repeat && task.date) {
    const today=dayKey(now),history=[...new Set(task.completions||[])];
    if(history.includes(today)){const reminder=task.reminder?`${today}T${task.reminder.slice(11)}`:'';return {...task,date:today,done:false,completions:history.filter(d=>d!==today),reminder,notified:!!reminder&&Date.parse(reminder)<=now.getTime()};}
    history.push(today);history.sort();
    const date = nextDate(task,today);
    return {...task, date, completions:history,trackingSince:task.trackingSince||today, reminder: task.reminder ? `${date}T${task.reminder.slice(11)}` : '', notified: false, ...(task.subtasks?.length?{subtasks:task.subtasks.map(x=>({...x,done:false}))}:{})};
  }
  // The moment a one-off task is finished is recorded from now on, so the weekly review never has to guess.
  return {...task, done: !task.done, doneAt: task.done ? undefined : now.getTime()};
}
export function completeTask(task,now=new Date()){return completedToday(task,now)?task:toggleTask(task,now);}
export function habitMonth(task,year,month,now=new Date()){
 const first=new Date(year,month,1,12),count=new Date(year,month+1,0,12).getDate(),done=new Set(task.completions||[]),today=dayKey(now);
 const days=Array.from({length:count},(_,i)=>{const date=dayKey(new Date(year,month,i+1,12));return {date,day:i+1,done:done.has(date),future:date>today};});
 return {offset:(first.getDay()+6)%7,days,total:days.filter(d=>d.done).length};
}
export function habitStats(task,now=new Date()){
 const today=dayKey(now),history=[...new Set(task.completions||[])].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today).sort(),done=new Set(history);
 const shift=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return dayKey(x);};
 let current=0,cursor=done.has(today)?today:shift(today,-1);while(done.has(cursor)){current++;cursor=shift(cursor,-1);}
 let best=0,run=0,previous;for(const d of history){run=previous&&shift(previous,1)===d?run+1:1;best=Math.max(best,run);previous=d;}
 const days=Array.from({length:84},(_,i)=>{const date=shift(today,i-83);return {date,done:done.has(date)};});
 const weeks=Array.from({length:12},(_,i)=>days.slice(i*7,i*7+7).filter(d=>d.done).length);
 return {days,weeks,current,best,total:history.length,recent:days.filter(d=>d.done).length};
}
