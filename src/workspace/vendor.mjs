// Turns the long text a bank or UPI app prints into a vendor's name, and spots vendors you pay again and again.
// Pure functions, no network: everything is worked out from the words in the statement.
const BRANDS=[
 [/swiggy/i,'Swiggy'],[/zomato/i,'Zomato'],[/amazon|amzn/i,'Amazon'],[/flipkart/i,'Flipkart'],[/myntra/i,'Myntra'],[/blinkit|grofers/i,'Blinkit'],
 [/zepto/i,'Zepto'],[/bigbasket/i,'BigBasket'],[/dmart|avenue supermarts/i,'DMart'],[/uber/i,'Uber'],[/\bola\b|olacabs|ani technologies/i,'Ola'],
 [/rapido/i,'Rapido'],[/irctc/i,'IRCTC'],[/redbus/i,'redBus'],[/makemytrip/i,'MakeMyTrip'],[/netflix/i,'Netflix'],[/spotify/i,'Spotify'],
 [/youtube/i,'YouTube'],[/hotstar/i,'Hotstar'],[/bookmyshow/i,'BookMyShow'],[/starbucks/i,'Starbucks'],[/domino/i,"Domino's"],[/mcdonald/i,"McDonald's"],
 [/\bkfc\b/i,'KFC'],[/airtel/i,'Airtel'],[/\bjio\b|reliance jio/i,'Jio'],[/bescom/i,'BESCOM'],[/paytm/i,'Paytm'],[/phonepe/i,'PhonePe'],
 [/apollo/i,'Apollo'],[/medplus/i,'MedPlus'],[/pharmeasy/i,'PharmEasy'],[/nykaa/i,'Nykaa'],[/decathlon/i,'Decathlon'],[/cred\b/i,'CRED']
];
const NOISE=new Set(['upi','imps','neft','rtgs','ach','nach','ecs','pos','ecom','atm','dr','cr','debit','credit','payment','paid','pay','to','from','via','transfer','trf','ref','txn','tran','trans','bank','by','mob','mobile','p2p','p2m','p2a','collect','mandate','autopay','si','vpa','upiint','upiintl','oth','other','nbin','inb','ibkl']);
const BANKS=new Set(['hdfc','hdfcbank','icici','icicibank','sbi','axis','axisbank','kotak','yes','yesbank','paytm','ybl','ibl','axl','okhdfcbank','oksbi','okicici','okaxis','apl','upi','pnb','boi','idfc','idfcfirst','federal','indus','indusind','airtel','jupiter','fi','slice','postbank','ptyes','pthdfc','ptsbi','ptaxis','yapl']);
const SUFFIX=/\b(pvt\.?|private|ltd\.?|limited|llp|inc\.?|opc)\b/ig;
const title=s=>s.toLowerCase().replace(/\b([a-z])([a-z']*)/g,(m,a,b)=>a.toUpperCase()+b);
const IFSC=/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
const isId=t=>/^\d{5,}$/.test(t)||/^[A-Za-z]*\d{6,}[A-Za-z0-9]*$/.test(t)||/^\d+x+\d+$/i.test(t)||/^[A-Za-z]\d{8,}$/.test(t);
// A note that is already short and readable is kept as the person wrote it.
const messy=s=>/@|\bupi\b|\bimps\b|\bneft\b|\brtgs\b|\bach\b|\bnach\b|\bpos\b|\d{6,}|\//i.test(s)||(s.match(/-/g)||[]).length>=3;

export function vendorName(raw){
 const s=String(raw||'').replace(/\s+/g,' ').replace(/^(paid to|sent to|payment to|received from|transfer to|transfer from|refund from)\s+/i,'').trim();
 if(!s)return '';
 if(!messy(s))return s;
 // Brand names are looked for in the text without the UPI handle, so "@paytm" does not make everything Paytm.
 const body=s.replace(/\S+@\S+/g,' ');
 for(const [re,name] of BRANDS)if(re.test(body))return name;
 // Split on the separators banks use, then throw away codes, banks and bookkeeping words.
 const parts=s.split(/[\/|*]+|(?:\s-\s)|-(?=[A-Za-z0-9@])/).map(p=>p.trim()).filter(Boolean);
 let vpa='';
 const keep=[];
 for(const p of parts){
  if(p.includes('@')){if(!vpa)vpa=p.match(/[^\s@]+@[A-Za-z0-9.]+/)?.[0]||p;continue;}
  const words=p.split(/\s+/).filter(w=>w.replace(/[^A-Za-z0-9]/g,'').length>1&&!isId(w)&&!IFSC.test(w)&&!NOISE.has(w.toLowerCase())&&!BANKS.has(w.toLowerCase()));
  const text=words.join(' ').replace(/[^A-Za-z .&'’]/g,' ').replace(/\s+/g,' ').trim();
  if(text.replace(/[^A-Za-z]/g,'').length>=3)keep.push(text);
 }
 if(keep.length){
  const first=keep[0].replace(SUFFIX,' ').replace(/\s+/g,' ').trim()||keep[0];
  return title(first).slice(0,34);
 }
 if(vpa){
  const local=vpa.split('@')[0];
  if(/^\+?\d{8,}$/.test(local))return 'Phone ••'+local.slice(-4);
  const name=local.replace(/\d+/g,' ').replace(/[._-]+/g,' ').replace(/\s+/g,' ').trim();
  if(name.length>=3)return title(name).slice(0,34);
 }
 return s.slice(0,34);
}

// ---- vendors you pay again and again ----
const dayNum=d=>Math.round(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))/864e5);
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
// How often a list of dates repeats: daily, twice a week, weekly, monthly, or null when there is no steady rhythm.
export function cycleOf(dates){
 const days=[...new Set(dates)].sort();
 if(days.length<3)return null;
 const gaps=[];for(let i=1;i<days.length;i++)gaps.push(dayNum(days[i])-dayNum(days[i-1]));
 const med=median(gaps),n=days.length;
 if(n>=5&&med<=1.5)return {id:'daily',label:'Daily'};
 if(n>=4&&med>=2&&med<=4.5){
  // two or more payments in most weeks
  const weeks=new Map();for(const d of days){const k=Math.floor(dayNum(d)/7);weeks.set(k,(weeks.get(k)||0)+1);}
  const twice=[...weeks.values()].filter(v=>v>=2).length/weeks.size;
  return twice>=0.5?{id:'twice',label:'Twice a week'}:{id:'weekly',label:'Weekly'};
 }
 if(med>=5&&med<=9)return {id:'weekly',label:'Weekly'};
 if(med>=25&&med<=35)return {id:'monthly',label:'Monthly'};
 return null;
}
// Vendors with a steady rhythm, most paid first. `month` ("2026-05") limits the totals shown to that month.
export function vendorStats(txns,{month=''}={}){
 const groups=new Map();
 for(const t of txns){
  if(t.type!=='expense'||!t.date)continue;
  const name=vendorName(t.note);
  if(!name)continue;
  const key=name.toLowerCase();
  (groups.get(key)||groups.set(key,{name,list:[]}).get(key)).list.push(t);
 }
 const out=[];
 for(const [key,{name,list}] of groups){
  const cycle=cycleOf(list.map(t=>t.date));
  if(!cycle)continue;
  const inMonth=month?list.filter(t=>t.date.slice(0,7)===month):list;
  const sum=a=>Math.round(a.reduce((s,t)=>s+t.amount,0)*100)/100;
  out.push({key,name,cycle:cycle.id,label:cycle.label,count:list.length,total:sum(list),monthCount:inMonth.length,monthTotal:sum(inMonth),avg:Math.round(sum(list)/list.length*100)/100,last:list.map(t=>t.date).sort().pop(),category:list[list.length-1].category});
 }
 return out.sort((a,b)=>(b.monthTotal-a.monthTotal)||(b.count-a.count));
}
