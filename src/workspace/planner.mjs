// Helpers for the daily planner: times, snapping, and laying overlapping blocks side by side.
export const timeToMin=t=>{const [h,m]=String(t||'0:0').split(':').map(Number);return (h||0)*60+(m||0);};
export const minToTime=m=>{const x=Math.max(0,Math.min(24*60,Math.round(m)));return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');};
export const snap=(m,step=15)=>Math.round(m/step)*step;
export const clampMin=(m,lo=0,hi=24*60)=>Math.max(lo,Math.min(hi,m));

// Items: [{id,start,end}] in minutes. Overlapping items get their own column so nothing hides behind anything.
export function layoutColumns(items){
 const list=[...items].sort((a,b)=>a.start-b.start||b.end-a.end);
 const out=[];let cluster=[],clusterEnd=-1;
 const flush=()=>{
  const cols=Math.max(1,...cluster.map(i=>i.col+1));
  for(const i of cluster)out.push({...i,cols});
  cluster=[];clusterEnd=-1;
 };
 for(const it of list){
  if(cluster.length&&it.start>=clusterEnd)flush();
  const used=new Set(cluster.filter(c=>c.end>it.start).map(c=>c.col));
  let col=0;while(used.has(col))col++;
  cluster.push({...it,col});
  clusterEnd=Math.max(clusterEnd,it.end);
 }
 flush();
 return out;
}
// A task's time block for one day, or null.
export const blockFor=(task,day)=>task.block&&task.block.date===day&&task.block.start&&task.block.end?{start:timeToMin(task.block.start),end:timeToMin(task.block.end)}:null;
// Repeaters that run on this weekday, as {name,emoji,start,end,every}.
export function repeaterWindows(reminders,day){
 const [y,m,d]=day.split('-').map(Number),dow=new Date(y,m-1,d).getDay();
 return reminders.filter(r=>r.enabled!==false&&(!Array.isArray(r.days)||!r.days.length||r.days.includes(dow))&&r.from&&r.to)
  .map(r=>({id:r.id,name:r.name,emoji:r.emoji||'alarm',start:timeToMin(r.from),end:timeToMin(r.to),every:r.every}));
}
export const MIN_BLOCK=15;
