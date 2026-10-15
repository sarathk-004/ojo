// Helpers for the focus timer's log: durations, totals per task and per day.
const pad=n=>String(n).padStart(2,'0');
export const dayOf=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
export const startOfDay=(day)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d).getTime();};
export function fmtClock(ms){
 const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;
 return (h?h+':'+pad(m):pad(m))+':'+pad(r);
}
export function fmtDur(seconds){
 const s=Math.round(seconds);
 if(s<60)return s+'s';
 const h=Math.floor(s/3600),m=Math.round(s%3600/60);
 return h?(m?h+'h '+m+'m':h+'h'):m+'m';
}
export const sumSeconds=(sessions,fromMs=0,toMs=Infinity)=>sessions.reduce((n,s)=>s.start>=fromMs&&s.start<toMs?n+s.seconds:n,0);
export function totalsByTask(sessions,fromMs=0,toMs=Infinity){
 const m=new Map();
 for(const s of sessions){
  if(s.start<fromMs||s.start>=toMs)continue;
  const k=s.taskId||'',cur=m.get(k)||{taskId:k,title:s.title||'No task',seconds:0,count:0};
  cur.seconds+=s.seconds;cur.count++;if(s.title)cur.title=s.title;m.set(k,cur);
 }
 return [...m.values()].sort((a,b)=>b.seconds-a.seconds);
}
// Focus seconds for each of the last n days ending at endDay, oldest first.
export function perDay(sessions,endDay,n=7){
 const out=[];
 for(let i=n-1;i>=0;i--){
  const t=new Date(startOfDay(endDay));t.setDate(t.getDate()-i);
  const key=dayOf(t.getTime()),from=t.getTime(),to=from+86400000;
  out.push({day:key,label:t.toLocaleDateString('en-GB',{weekday:'short'}),seconds:sumSeconds(sessions,from,to)});
 }
 return out;
}
