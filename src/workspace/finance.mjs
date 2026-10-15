// Pure money helpers for the Finance tracker. Amounts are plain numbers in the chosen currency.
export const EXPENSE_CATS=[
 {id:'food',name:'Food & dining',color:'#c9803f'},{id:'transport',name:'Transport',color:'#4f7ea8'},
 {id:'shopping',name:'Shopping',color:'#a85a7a'},{id:'bills',name:'Bills & utilities',color:'#7a6aa8'},
 {id:'rent',name:'Rent & home',color:'#567458'},{id:'health',name:'Health',color:'#c4594c'},
 {id:'fun',name:'Entertainment',color:'#d6a43a'},{id:'travel',name:'Travel',color:'#3d8f8f'},
 {id:'learning',name:'Learning',color:'#6b7fb8'},{id:'other',name:'Other',color:'#8a9081'}
];
export const INCOME_CATS=[
 {id:'salary',name:'Salary',color:'#567458'},{id:'freelance',name:'Freelance',color:'#4f7ea8'},
 {id:'investments',name:'Investments',color:'#7a6aa8'},{id:'gift',name:'Gift',color:'#a85a7a'},{id:'other-in',name:'Other income',color:'#8a9081'}
];
export const ALL_CATS=[...EXPENSE_CATS,...INCOME_CATS];
export const CURRENCIES=[{sym:'₹',locale:'en-IN'},{sym:'$',locale:'en-US'},{sym:'€',locale:'de-DE'},{sym:'£',locale:'en-GB'}];
export const catOf=id=>ALL_CATS.find(c=>c.id===id)||{id,name:id||'Other',color:'#8a9081'};

export function fmtMoney(n,sym='₹'){
 const c=CURRENCIES.find(x=>x.sym===sym)||CURRENCIES[0],v=Math.abs(n);
 const s=new Intl.NumberFormat(c.locale,{minimumFractionDigits:Math.round(v*100)%100?2:0,maximumFractionDigits:2}).format(v);
 return (n<0?'−':'')+sym+s;
}
export function parseAmount(text){
 const n=parseFloat(String(text).replace(/[^0-9.]/g,''));
 return Number.isFinite(n)&&n>0?Math.round(n*100)/100:NaN;
}
export const monthOf=date=>String(date).slice(0,7);
export function shiftMonth(key,delta){
 const [y,m]=key.split('-').map(Number),d=new Date(y,m-1+delta,1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
export function monthLabel(key){
 const [y,m]=key.split('-').map(Number);
 return new Date(y,m-1,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}
// Totals for one month: income, expense, net, spending by category (largest first) and the daily spend.
export function summarize(txns,key){
 const list=txns.filter(t=>monthOf(t.date)===key);
 let income=0,expense=0;const cats=new Map(),days=new Map();
 for(const t of list){
  if(t.type==='income')income+=t.amount;
  else{expense+=t.amount;cats.set(t.category,(cats.get(t.category)||0)+t.amount);days.set(t.date,(days.get(t.date)||0)+t.amount);}
 }
 const round=n=>Math.round(n*100)/100;
 return {
  income:round(income),expense:round(expense),net:round(income-expense),count:list.length,
  byCategory:[...cats].map(([category,amount])=>({category,amount:round(amount)})).sort((a,b)=>b.amount-a.amount),
  byDay:Object.fromEntries([...days].map(([d,v])=>[d,round(v)])),
  savingsRate:income>0?Math.max(0,Math.round((income-expense)/income*100)):null
 };
}
// Income and spending for the last n months ending at endKey, oldest first.
export function monthlySeries(txns,endKey,n=6){
 return Array.from({length:n},(_,i)=>{
  const key=shiftMonth(endKey,i-(n-1)),s=summarize(txns,key);
  return {key,label:new Date(...key.split('-').map((v,j)=>j?v-1:+v),1).toLocaleDateString('en-GB',{month:'short'}),income:s.income,expense:s.expense};
 });
}
export function budgetUsage(budgets,summary){
 return budgets.map(b=>{
  const spent=summary.byCategory.find(c=>c.category===b.category)?.amount||0;
  return {...b,spent,pct:b.limit>0?Math.round(spent/b.limit*100):0,over:spent>b.limit};
 }).sort((a,b)=>b.pct-a.pct);
}
const csvCell=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
export function toCSV(txns){
 const rows=[...txns].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.type,catOf(t.category).name,t.amount,t.note||'']);
 return [['Date','Type','Category','Amount','Note'],...rows].map(r=>r.map(csvCell).join(',')).join('\n');
}

// Which budgets have newly crossed 80% or 100% since the last alert. `alerted` maps category to the level already announced.
export function alertLevels(usage,alerted={}){
 const alerts=[],next={...alerted};
 for(const u of usage){
  const level=u.pct>=100?100:u.pct>=80?80:0,seen=alerted[u.category]||0;
  if(level>seen){alerts.push({category:u.category,level,pct:u.pct,spent:u.spent,limit:u.limit});next[u.category]=level;}
  else if(level<seen)next[u.category]=level;   // the limit was raised or spending removed: it can warn again
 }
 return {alerts,next};
}
