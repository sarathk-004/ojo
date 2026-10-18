import {vendorName} from './vendor.mjs';
// Reads bank, PhonePe and Google Pay statements into transactions. Everything happens on this computer:
// a statement is parsed in memory and only the rows the user keeps are saved.
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
const MON='jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>{
 if(y<100)y+=2000;
 if(y<2000||y>2100||m<1||m>12||d<1||d>31)return '';
 return `${y}-${pad(m)}-${pad(d)}`;
};
// Day-first numeric dates (31/12/2026) as banks in India print them, plus named months and ISO.
export function parseDate(text){
 const s=String(text||'').trim();
 let m=s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
 if(m)return iso(+m[1],+m[2],+m[3]);
 m=s.match(/(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4}|\d{2})(?!\d)/);
 if(m)return iso(+m[3],+m[2],+m[1]);
 m=s.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?[ -]+(${MON})\\.?,?[ -]+(\\d{4}|\\d{2})(?!\\d)`,'i'));
 if(m)return iso(+m[3],MONTHS[m[2].slice(0,3).toLowerCase()],+m[1]);
 m=s.match(new RegExp(`(${MON})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`,'i'));
 if(m)return iso(+m[3],MONTHS[m[1].slice(0,3).toLowerCase()],+m[2]);
 return '';
}
export function toNumber(text){
 let s=String(text||'').trim();
 if(!s)return NaN;
 const neg=/^\(.*\)$/.test(s)||/^-/.test(s)||/\bdr\b/i.test(s);
 s=s.replace(/(?:₹|rs\.?|inr)/ig,'').replace(/[^0-9.]/g,'');
 const n=parseFloat(s);
 return Number.isFinite(n)?(neg?-n:n):NaN;
}

// ---- categories ----
const CAT_RULES=[
 ['food',/swiggy|zomato|restaurant|cafe|coffee|food|pizza|domino|kfc|mcdonald|burger|bakery|biryani|dining|eats|starbucks|haldiram/i],
 ['transport',/uber|ola\b|rapido|metro|fuel|petrol|diesel|parking|fastag|redbus|cab\b|taxi|bpcl|hpcl|indianoil|irctc/i],
 ['shopping',/amazon|flipkart|myntra|ajio|meesho|nykaa|mart\b|store|decathlon|croma|reliance|dmart|bigbasket|blinkit|zepto|instamart|grocer/i],
 ['bills',/electric|bescom|tneb|jio\b|airtel|vodafone|\bvi\b|recharge|broadband|gas\b|water|bill\b|insurance|dth|tata ?play|postpaid|emi\b|loan/i],
 ['rent',/\brent\b|landlord|maintenance|society/i],
 ['health',/pharmacy|apollo|hospital|medplus|1mg|clinic|doctor|diagnostic|lab\b|netmeds|pharmeasy/i],
 ['fun',/netflix|spotify|bookmyshow|prime|hotstar|movie|cinema|pvr|inox|gaming|steam|youtube/i],
 ['travel',/makemytrip|goibibo|hotel|flight|airlines|indigo|air india|booking\.com|airbnb|oyo|cleartrip|yatra/i],
 ['learning',/udemy|coursera|school|college|tuition|course|byju|unacademy|book/i]
];
const INCOME_RULES=[
 ['salary',/salary|payroll|wages/i],
 ['freelance',/freelance|invoice|consult/i],
 ['investments',/interest|dividend|mutual fund|redemption|\bsip\b|zerodha|groww/i]
];
export function guessCategory(note,type){
 const s=String(note||'');
 for(const [id,re] of type==='income'?INCOME_RULES:CAT_RULES)if(re.test(s))return id;
 return type==='income'?'other-in':'other';
}
const OUT_WORDS=/\b(paid to|paid|sent to|sent|debit(?:ed)?|purchase|withdrawal|withdrawn|payment|upi\/p2[pm]|pos|atm|dr)\b/i;
const IN_WORDS=/\b(received from|received|credit(?:ed)?|refund|cashback|salary|deposit|interest|reversal|cr)\b/i;
const guessType=t=>IN_WORDS.test(t)&&!OUT_WORDS.test(t)?'income':OUT_WORDS.test(t)&&!IN_WORDS.test(t)?'expense':/\b(paid to|sent to|debit)/i.test(t)?'expense':/\b(received|credit)/i.test(t)?'income':'expense';

const finish=(rows,format)=>{
 const out=[];
 for(const r of rows){
  const amount=Math.round(Math.abs(r.amount)*100)/100;
  if(!r.date||!(amount>0))continue;
  const note=String(r.note||'').replace(/\s+/g,' ').trim().slice(0,120);
  // `note` is the vendor's name ("Zomato"); `detail` keeps the bank's full text for reference and for spotting duplicates.
  out.push({date:r.date,type:r.type,amount,note:vendorName(note)||note,detail:note,category:guessCategory(note,r.type),ref:r.ref||''});
 }
 return {rows:out,format};
};

// ---- CSV ----
export function parseCSV(text){
 const src=String(text||'').replace(/^﻿/,'');
 const first=src.split(/\r?\n/).slice(0,10).join('\n');
 const delim=[',',';','\t','|'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(q){if(c==='"'){if(src[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
  else if(c==='"')q=true;
  else if(c===delim){row.push(cell);cell='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&src[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
export function fromCSV(text){
 const rows=parseCSV(text);
 const find=(cells,re)=>cells.findIndex(c=>re.test(c.trim()));
 let head=-1,cols=null;
 for(let i=0;i<Math.min(rows.length,40)&&head<0;i++){
  const c=rows[i].map(x=>x.trim().toLowerCase());
  const date=find(c,/^(txn |transaction |value |posting )?date|^date\b/),amt=find(c,/debit|withdraw|credit|deposit|amount|paid out|paid in|dr\b|cr\b/);
  if(date>=0&&amt>=0)head=i,cols={
   date,
   desc:find(c,/description|narration|details|particulars|remarks|merchant|payee|transaction$/),
   debit:find(c,/debit|withdraw|paid out|^dr\b/),
   credit:find(c,/credit|deposit|paid in|^cr\b/),
   amount:find(c,/^amount|transaction amount|^amt/),
   kind:find(c,/^type|dr\/cr|cr\/dr|debit\/credit|^status$/),
   ref:find(c,/ref|utr|txn id|transaction id|cheque|chq/)
  };
 }
 if(head<0)return {rows:[],format:'csv'};
 const out=[];
 for(const r of rows.slice(head+1)){
  const date=parseDate(r[cols.date]);if(!date)continue;
  let amount=NaN,type='expense';
  const dv=cols.debit>=0?toNumber(r[cols.debit]):NaN,cv=cols.credit>=0?toNumber(r[cols.credit]):NaN;
  if(Number.isFinite(dv)&&Math.abs(dv)>0){amount=Math.abs(dv);type='expense';}
  else if(Number.isFinite(cv)&&Math.abs(cv)>0){amount=Math.abs(cv);type='income';}
  else if(cols.amount>=0){
   const a=toNumber(r[cols.amount]);
   if(Number.isFinite(a)){
    amount=Math.abs(a);
    const k=cols.kind>=0?String(r[cols.kind]):'';
    type=/cr|credit|received|deposit/i.test(k)?'income':/dr|debit|paid|sent|withdraw/i.test(k)?'expense':a<0||/\bdr\b/i.test(r[cols.amount])?'expense':guessType(String(r[cols.desc]||''));
   }
  }
  if(!(amount>0))continue;
  out.push({date,type,amount,note:cols.desc>=0?r[cols.desc]:'',ref:cols.ref>=0?String(r[cols.ref]).trim():''});
 }
 return finish(out,'csv');
}

// ---- Text lines (PDF statements: PhonePe, banks) ----
const DATE_START=new RegExp(`^(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/. ]\\d{1,2}[-/. ]\\d{2,4}|\\d{1,2}(?:st|nd|rd|th)?[ -]+(?:${MON})\\.?,?[ -]+\\d{2,4}|(?:${MON})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})`,'i');
const MONEY=/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/ig;
const BANK_NUM=/(?<![\w.,])\d{1,3}(?:,\d{2,3})*\.\d{2}(?!\d)/g;
const REF=/(?:transaction id|txn id|utr(?: no\.?)?|ref(?:erence)?(?: no\.?)?)[:\s#]*([A-Za-z0-9]{8,})/i;
const clean=t=>t
 .replace(DATE_START,' ')
 .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/ig,' ')
 .replace(/(?:transaction id|txn id|utr(?: no\.?)?|ref(?:erence)?(?: no\.?)?)[:\s#]*[A-Za-z0-9]+/ig,' ')
 .replace(/(?:paid by|debited from|credited to|bank account)[^\n]*/ig,' ')
 .replace(/(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?/ig,' ')
 .replace(BANK_NUM,' ')
 .replace(/\b(debit|credit|dr|cr)\b/ig,' ')
 .replace(/^\W+/,'').replace(/\s+/g,' ').trim();
const merchant=t=>{
 const m=t.match(/(?:paid to|sent to|payment to|received from|transfer to|transfer from|refund from|mobile recharged?|bill paid)\s*(.*)/i);
 return (m&&m[1]?m[1]:t).trim();
};
export function fromLines(lines){
 const blocks=[];
 for(const raw of lines){
  const line=String(raw).replace(/\s+/g,' ').trim();if(!line)continue;
  if(DATE_START.test(line))blocks.push([line]);
  else if(blocks.length)blocks[blocks.length-1].push(line);
 }
 const out=[];let prevBal=null;
 for(const b of blocks){
  const text=b.join(' \n ').replace(/ \n /g,'\n'),flat=b.join(' ');
  const date=parseDate(b[0]);if(!date)continue;
  const ref=(flat.match(REF)||[])[1]||'';
  let amount=NaN,type='',bal=null;
  const money=[...flat.matchAll(MONEY)];
  if(money.length){
   amount=toNumber(money[0][1]);
   const w=flat.match(/\b(DEBIT|CREDIT)\b/i);
   type=w?(/credit/i.test(w[1])?'income':'expense'):guessType(flat);
  }else{
   const nums=[...flat.matchAll(BANK_NUM)].map(m=>toNumber(m[0]));
   const dc=flat.match(/(\d[\d,]*\.\d{2})\s*(Dr|Cr)\b/i);
   if(nums.length>=2){
    bal=nums[nums.length-1];
    const cand=nums.slice(0,-1).filter(n=>n>0);
    amount=cand.length?cand[0]:NaN;
    if(prevBal!==null){const diff=bal-prevBal;if(Math.abs(Math.abs(diff)-amount)<0.011||!Number.isFinite(amount)){amount=Math.abs(diff);}type=diff<0?'expense':'income';}
    else type=guessType(flat);
   }else if(nums.length===1){amount=nums[0];type=dc?(/cr/i.test(dc[2])?'income':'expense'):guessType(flat);}
   if(bal!==null)prevBal=bal;
  }
  if(!(amount>0))continue;
  let note=merchant(clean(text.replace(/\n/g,' ')));
  if(type==='income'&&note&&!/^(from|salary|refund)/i.test(note)&&/received from|credited/i.test(flat))note='From '+note;
  out.push({date,type,amount,note,ref});
 }
 return finish(out,'statement');
}

// ---- Google Takeout "My Activity" (Google Pay) ----
export function htmlToLines(html){
 return String(html||'')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ')
  .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d|td|th)>/gi,'\n')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"')
  .split(/\n+/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
}
export function fromGooglePay(lines){
 const out=[];
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/\b(Paid|Sent|Received|Refunded)\s+(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?)(?:\s+(to|from)\s+(.+))?/i);
  if(!m)continue;
  let date='';
  for(let j=i;j<Math.min(lines.length,i+4)&&!date;j++)date=parseDate(lines[j]);
  const type=/received|refunded/i.test(m[1])?'income':'expense';
  out.push({date,type,amount:toNumber(m[2]),note:(m[4]||'').replace(/\s+using.*$/i,'').trim(),ref:''});
 }
 return finish(out,'gpay');
}

// ---- entry point ----
// `text` is the file's text (CSV, HTML, plain) and `lines` the text lines of a PDF.
export function parseStatement({name='',text='',lines=null}={}){
 const lower=String(name).toLowerCase();
 if(lines){
  const joined=lines.join('\n');
  if(/\b(Paid|Received|Sent)\s+(?:₹|Rs\.?|INR)/.test(joined)&&/google/i.test(joined))return fromGooglePay(lines);
  return fromLines(lines);
 }
 if(/\.html?$/.test(lower)||/<html|<body|<div/i.test(String(text).slice(0,2000))){
  const l=htmlToLines(text);
  const g=fromGooglePay(l);
  return g.rows.length?g:fromLines(l);
 }
 const csv=fromCSV(text);
 if(csv.rows.length)return csv;
 return fromLines(String(text).split(/\r?\n/));
}

// Marks rows that already exist so importing the same statement twice adds nothing.
export const rowKey=r=>[r.date,r.type,r.amount.toFixed(2),String(r.detail||r.note||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12)].join('|');
export function markDuplicates(rows,existing,account=''){
 // Only entries from the same account can be duplicates: two accounts may share a date, amount and shop.
 existing=existing.filter(t=>String(t.account||'')===String(account||''));
 const seen=new Set(existing.map(t=>t.ref?'ref|'+t.ref:rowKey({...t,amount:Number(t.amount)||0}))),
  seenLoose=new Set(existing.map(t=>[t.date,t.type,Number(t.amount).toFixed(2)].join('|')));
 return rows.map(r=>{
  const dup=(r.ref&&seen.has('ref|'+r.ref))||seen.has(rowKey(r))||(!r.ref&&seenLoose.has([r.date,r.type,r.amount.toFixed(2)].join('|')));
  if(r.ref)seen.add('ref|'+r.ref);
  return {...r,duplicate:!!dup};
 });
}

// Guesses which account a statement belongs to from its text (masked number, "A/c No") or its file name.
export function detectAccount(text='',name=''){
 const t=String(text).slice(0,6000);
 const m=t.match(/(?:a\/c|account)\s*(?:no\.?|number|#)?\s*[:\-]?\s*[xX*\d]{0,12}?(\d{4})\b/i)||t.match(/[xX*]{3,}\s*(\d{4})\b/);
 if(m)return 'Account ending '+m[1];
 const base=String(name).replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').trim();
 return base.slice(0,40);
}
