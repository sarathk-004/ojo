// Recurring bills, subscriptions and EMIs: when each is next due, what it costs per month, and which
// repeating payments are hiding in your spending. Pure and dependency-free so it can run in the main process too.
export const CYCLES=[
 {id:'weekly',label:'Weekly',perMonth:52/12},
 {id:'biweekly',label:'Every 2 weeks',perMonth:26/12},
 {id:'monthly',label:'Monthly',perMonth:1},
 {id:'quarterly',label:'Every 3 months',perMonth:1/3},
 {id:'yearly',label:'Yearly',perMonth:1/12}
];
// What "skip this one" means in words: the next due date for this kind of bill.
export const skipLabel=cycle=>({weekly:'Move to next week',biweekly:'Move to next fortnight',monthly:'Move to next month',quarterly:'Move to next quarter',yearly:'Move to next year'}[cycle]||'Move to next due date');
export const KINDS=[
 {id:'subscription',label:'Subscription'},{id:'bill',label:'Bill'},{id:'rent',label:'Rent'},{id:'emi',label:'EMI / loan'}
];
export const PRESETS=[
 {name:'Rent',kind:'rent',category:'rent',cycle:'monthly'},
 {name:'Electricity',kind:'bill',category:'bills',cycle:'monthly'},
 {name:'Internet',kind:'bill',category:'bills',cycle:'monthly'},
 {name:'Mobile recharge',kind:'bill',category:'bills',cycle:'monthly'},
 {name:'Insurance',kind:'bill',category:'bills',cycle:'yearly'},
 {name:'Gym',kind:'subscription',category:'health',cycle:'monthly'},
 {name:'Loan EMI',kind:'emi',category:'bills',cycle:'monthly'}
];
const pad=n=>String(n).padStart(2,'0');
export const dayStr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1,12);};
export const daysBetween=(a,b)=>Math.round((parse(b)-parse(a))/86400000);
const lastOfMonth=(y,m)=>new Date(y,m+1,0).getDate();

// The date one cycle after `due`. Monthly-style cycles keep the original day of the month
// (the 31st becomes the 28th in February, then the 31st again), so dates never drift.
export function advance(due,cycle,anchorDay){
 const d=parse(due);
 if(cycle==='weekly'){d.setDate(d.getDate()+7);return dayStr(d);}
 if(cycle==='biweekly'){d.setDate(d.getDate()+14);return dayStr(d);}
 const months=cycle==='yearly'?12:cycle==='quarterly'?3:1;
 const day=anchorDay||d.getDate();
 const y=d.getFullYear(),m=d.getMonth()+months;
 const target=new Date(y,m,1,12);
 target.setDate(Math.min(day,lastOfMonth(target.getFullYear(),target.getMonth())));
 return dayStr(target);
}
export const anchorOf=bill=>bill.anchorDay||parse(bill.due).getDate();

export function newBill(fields={},id=crypto.randomUUID(),now=Date.now()){
 const due=fields.due||dayStr(new Date(now));
 return {name:'',amount:0,category:'bills',kind:'bill',cycle:'monthly',remind:3,auto:false,endDate:'',active:true,paid:[],notified:'',
  ...fields,id,due,anchorDay:parse(due).getDate(),created:now};
}
// Due dates from the bill's next due date up to `to` (inclusive), for the calendar and the planner.
export function occurrences(bill,from,to,limit=60){
 if(!bill.active)return [];
 const out=[];let d=bill.due,guard=0;
 while(d<=to&&guard++<400&&out.length<limit){
  if(bill.endDate&&d>bill.endDate)break;
  if(d>=from)out.push(d);
  d=advance(d,bill.cycle,anchorOf(bill));
 }
 return out;
}
export function status(bill,today){
 const days=daysBetween(today,bill.due);
 const state=days<0?'overdue':days===0?'today':days<=7?'soon':'later';
 return {days,state};
}
export function dueLabel(bill,today){
 const {days}=status(bill,today);
 if(days<0)return Math.abs(days)===1?'1 day overdue':Math.abs(days)+' days overdue';
 if(days===0)return 'Due today';
 if(days===1)return 'Due tomorrow';
 if(days<=14)return 'Due in '+days+' days';
 return 'Due '+parse(bill.due).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
// After paying: remember it and move to the next date. An EMI past its last date stops.
export function markPaid(bill,paidOn,txnId){
 const next=advance(bill.due,bill.cycle,anchorOf(bill));
 const ended=!!bill.endDate&&next>bill.endDate;
 return {...bill,due:ended?bill.due:next,active:!ended,notified:'',paid:[...(bill.paid||[]),{date:paidOn,due:bill.due,txn:txnId||''}].slice(-36)};
}
export function skip(bill){
 const next=advance(bill.due,bill.cycle,anchorOf(bill));
 const ended=!!bill.endDate&&next>bill.endDate;
 return {...bill,due:ended?bill.due:next,active:!ended,notified:''};
}
export const monthlyCost=bill=>(Number(bill.amount)||0)*(CYCLES.find(c=>c.id===bill.cycle)?.perMonth||1);
export function totals(bills,today){
 const live=bills.filter(b=>b.active);
 const month=live.reduce((n,b)=>n+monthlyCost(b),0);
 const week=live.filter(b=>{const d=daysBetween(today,b.due);return d<=7;});
 return {
  monthly:Math.round(month*100)/100,yearly:Math.round(month*12*100)/100,count:live.length,
  subscriptions:live.filter(b=>b.kind==='subscription').length,
  dueSoon:week.length,dueSoonAmount:Math.round(week.reduce((n,b)=>n+(Number(b.amount)||0),0)*100)/100
 };
}
// True when a reminder should go out now: within the reminder window, not yet announced for this due date.
export function needsNotify(bill,today){
 if(!bill.active||bill.auto)return false;
 const {days}=status(bill,today);
 return days<=(Number(bill.remind)||0)&&bill.notified!==bill.due;
}
export const billTxn=(bill,date,id=crypto.randomUUID(),now=Date.now())=>({id,type:'expense',amount:Number(bill.amount)||0,category:bill.category||'bills',date,note:bill.name,billId:bill.id,created:now});

// ---- Finding repeating payments in spending ----
const keyOf=note=>String(note||'').toLowerCase().replace(/[0-9]+/g,' ').replace(/[^a-zÀ-ɏ ]+/g,' ').replace(/\s+/g,' ').trim().slice(0,16);
const median=a=>{const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const CYCLE_GAPS=[['weekly',5,9],['biweekly',12,16],['monthly',26,35],['quarterly',80,100],['yearly',350,380]];
export function detectRecurring(txns,bills=[],{dismissed=[],today=dayStr(new Date())}={}){
 const groups=new Map();
 for(const t of txns){
  if(t.type!=='expense'||!t.date||t.billId)continue;
  const k=keyOf(t.note);
  if(k.length<3)continue;
  (groups.get(k)||groups.set(k,[]).get(k)).push(t);
 }
 const known=bills.map(b=>keyOf(b.name)).filter(Boolean);
 const out=[];
 for(const [k,list] of groups){
  if(list.length<3||dismissed.includes(k))continue;
  if(known.some(n=>n&&(k.startsWith(n)||n.startsWith(k))))continue;
  const sorted=[...list].sort((a,b)=>a.date.localeCompare(b.date));
  const med=median(sorted.map(t=>t.amount));
  const sameAmount=sorted.filter(t=>Math.abs(t.amount-med)<=Math.max(1,med*0.1));
  if(sameAmount.length<3)continue;
  const gaps=[];for(let i=1;i<sameAmount.length;i++)gaps.push(daysBetween(sameAmount[i-1].date,sameAmount[i].date));
  const g=median(gaps);
  const cycle=CYCLE_GAPS.find(([,lo,hi])=>g>=lo&&g<=hi);
  if(!cycle)continue;
  const fit=gaps.filter(x=>x>=cycle[1]&&x<=cycle[2]).length/gaps.length;
  if(fit<0.6)continue;
  const last=sameAmount[sameAmount.length-1];
  let due=last.date;
  for(let i=0;i<60&&due<today;i++)due=advance(due,cycle[0],parse(last.date).getDate());
  out.push({key:k,name:(last.note||k).trim(),amount:Math.round(med*100)/100,cycle:cycle[0],category:last.category||'bills',last:last.date,due,count:sameAmount.length});
 }
 return out.sort((a,b)=>b.count-a.count||b.amount-a.amount);
}
