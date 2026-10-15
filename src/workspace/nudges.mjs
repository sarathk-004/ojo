// Scheduling helpers for repeating reminders (water, walking, stretching and so on).
export const PRESETS=[
 {name:'Drink water',emoji:'water',every:60,from:'08:00',to:'22:00',goal:8,unit:'Glasses'},
 {name:'Take a walk',emoji:'walk',every:120,from:'09:00',to:'19:00',goal:4,unit:'Walks'},
 {name:'Stretch',emoji:'stretch',every:90,from:'09:00',to:'18:00',goal:5,unit:'Stretches'},
 {name:'Rest your eyes (20-20-20)',emoji:'eyes',every:20,from:'09:00',to:'18:00',goal:0,unit:''},
 {name:'Fix your posture',emoji:'stretch',every:45,from:'09:00',to:'18:00',goal:0,unit:''},
 {name:'Take medicine',emoji:'pill',every:480,from:'08:00',to:'22:00',goal:3,unit:'Doses'}
];
// The emoji field now holds an icon name (see icons.jsx); the old name is kept so saved repeaters keep working.
export const EMOJIS=['water','walk','stretch','eyes','pill','coffee','food','gym','sleep','tooth','health','brain','book','plant','alarm','sport'];
export const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const ALL_DAYS=[0,1,2,3,4,5,6];
export const newReminder=(fields={},id=crypto.randomUUID())=>({id,name:'',emoji:'water',every:60,from:'08:00',to:'22:00',days:ALL_DAYS,goal:0,unit:'',sound:true,enabled:true,created:Date.now(),...fields});

const minutes=hhmm=>{const [h,m]=String(hhmm).split(':').map(Number);return (h||0)*60+(m||0);};
export const dayKey=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

// The next time the reminder should fire, strictly after `fromMs`, or null if it never will.
export function nextSlot(r,fromMs){
 const every=Math.max(1,Number(r.every)||60)*60000;
 const days=Array.isArray(r.days)&&r.days.length?r.days:ALL_DAYS;
 const a=minutes(r.from),b=minutes(r.to);
 if(b<a)return null;
 const base=new Date(fromMs);base.setHours(0,0,0,0);
 for(let i=0;i<8;i++){
  const day=new Date(base);day.setDate(day.getDate()+i);
  if(!days.includes(day.getDay()))continue;
  const start=new Date(day);start.setHours(0,a,0,0);
  const end=new Date(day);end.setHours(0,b,0,0);
  let slot=start.getTime();
  if(fromMs>=slot)slot+=Math.ceil((fromMs+1-slot)/every)*every;
  if(slot<=end.getTime())return slot;
 }
 return null;
}
export function fmtEvery(min){
 const m=Number(min)||0;
 if(m<60)return `${m} min`;
 if(m%60===0)return m===60?'hour':`${m/60} hours`;
 return `${Math.floor(m/60)} h ${m%60} min`;
}
export const fmtClock=hhmm=>{
 const [h,m]=String(hhmm).split(':').map(Number);
 const d=new Date(2000,0,1,h||0,m||0);
 return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(':00','').toLowerCase();
};
export function scheduleText(r){
 const days=r.days&&r.days.length&&r.days.length<7?(r.days.length===5&&![0,6].some(d=>r.days.includes(d))?'Weekdays':r.days.map(d=>DAY_NAMES[d]).join(', ')):'Every day';
 return `Every ${fmtEvery(r.every)} · ${fmtClock(r.from)}–${fmtClock(r.to)} · ${days}`;
}
// One decision for the scheduler: should this reminder fire now, and what state follows?
// `state` is {nextAt}; `count` is how many were logged today.
export function tick(r,state,now,count=0){
 if(!r.enabled)return {fire:false,state};
 let nextAt=state?.nextAt;
 const every=(Number(r.every)||60)*60000;
 // After a long gap (laptop asleep, app closed) do not fire a backlog; start again from now.
 if(!Number.isFinite(nextAt)||nextAt<now-every)nextAt=nextSlot(r,now-1);
 if(nextAt==null)return {fire:false,state:{nextAt:null}};
 if(now<nextAt)return {fire:false,state:{...state,nextAt}};
 const done=r.goal>0&&count>=r.goal;
 return {fire:!done,state:{...state,nextAt:nextSlot(r,now)}};
}
