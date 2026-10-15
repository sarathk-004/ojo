import React,{useEffect,useMemo,useRef,useState} from 'react';
import {DateField} from './Pickers.jsx';
import {MagnifyingGlass,Plus,Receipt,ArrowsClockwise,Check,SkipForward,PencilSimple,Trash,Lightbulb,X,House,MonitorPlay,Lightning,CreditCard,CalendarBlank,Wallet} from '@phosphor-icons/react';
import {useCollection,uid} from './hooks.js';
import {Modal} from './Modal.jsx';
import {Select} from './Select.jsx';
import {EXPENSE_CATS,catOf,fmtMoney,parseAmount} from './finance.mjs';
import {useUndo} from './Undo.jsx';
import {BrandBadge,CustomLogo,FEATURED,searchBrands,matchBrand,useBrandLogoCache,setBrandLogoCache} from './brands.jsx';
import {api} from './api.js';
import {useFileUrl} from './hooks.js';
import {skipLabel,CYCLES,KINDS,PRESETS,newBill,markPaid,skip,status,dueLabel,monthlyCost,totals,detectRecurring,billTxn,advance} from './bills.mjs';
import {dayKey} from '../tasks.mjs';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';

const KIND_ICON={rent:House,subscription:MonitorPlay,bill:Lightning,emi:CreditCard};
const cycleLabel=id=>CYCLES.find(c=>c.id===id)?.label||id;

// A logo the person uploaded for this bill.
function BillLogo({fileId}){const url=useFileUrl(fileId,'image/*');return <CustomLogo url={url} size={40} className="bill-logo"/>;}

function BillForm({initial,sym,onSave,onDelete,onClose,onLogo}){
 const [f,setF]=useState({...initial,amount:initial.amount?String(initial.amount):''}),[err,setErr]=useState(''),[confirm,setConfirm]=useState(false),[appQuery,setAppQuery]=useState('');
 const shownBrands=searchBrands(appQuery),logoUrl=useFileUrl(f.logoFile||null,'image/*'),pickLogo=useRef(null);
 const uploadLogo=async file=>{if(!file||!file.type.startsWith('image/'))return;const id=await api.putFile(await file.arrayBuffer());if(id)setF(s=>({...s,logoFile:id}));};
 const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
 // Picking a service fills in its name, kind and category; typing a different name drops the logo again.
 const cache=useBrandLogoCache(),[fetching,setFetching]=useState('');
 // Choosing a service fills in its name, kind and category. Services without a drawn mark get the icon from their own website, once.
 const choose=async b=>{
  setErr('');
  setF(s=>({...s,name:b.name,brand:b.id,category:b.category,kind:['airtel','jio'].includes(b.id)?'bill':'subscription',cycle:s.cycle||'monthly',logoFile:b.domain?(cache[b.id]||undefined):undefined}));
  if(b.domain&&!b.logoUrl&&!cache[b.id]){
   setFetching(b.id);
   try{
    const got=await api.fetchIcon(b.domain);
    if(got&&got.bytes){const id=await api.putFile(got.bytes);if(id){onLogo&&onLogo(b.id,id);setF(s=>s.brand===b.id?{...s,logoFile:id}:s);}}
   }catch{}
   setFetching('');
  }
 };
 const typed=guess=>f.logoFile?<CustomLogo url={logoUrl} size={22}/>:guess?<BrandBadge brand={guess} size={22}/>:null;
 const submit=e=>{
  e.preventDefault();
  const amount=parseAmount(f.amount);
  if(!f.name.trim()){setErr('Give it a name.');return;}
  if(Number.isNaN(amount)){setErr('Enter the amount.');return;}
  if(!f.due){setErr('Choose the next due date.');return;}
  onSave({...f,name:f.name.trim(),amount});
 };
 return (
  <form className="bill-form" onSubmit={submit}>
   <div className="brand-pick">
    <label className="brand-search"><MagnifyingGlass size={14}/><input placeholder="Search apps: Netflix, Prime, ChatGPT, Notion…" value={appQuery} onChange={e=>setAppQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(shownBrands[0])choose(shownBrands[0]);}}}/></label>
    <div className="brand-grid">{shownBrands.map(b=><button type="button" key={b.id} className={'brand-chip-btn'+(f.brand===b.id?' on':'')} onClick={()=>choose(b)}><BrandBadge brand={b} size={20}/>{b.name}{fetching===b.id&&<i className="chip-spin" aria-label="Getting logo"/>}</button>)}{!shownBrands.length&&<span className="muted">No app by that name. Type it below, and add its logo with Upload logo.</span>}</div>
   </div>
   <label>Name<span className="name-with-logo">{typed(matchBrand({brand:f.brand,name:f.name}))}<input autoFocus placeholder="Rent, Netflix, car EMI…" value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value,brand:undefined}))}/><button type="button" className="ghost small" onClick={()=>pickLogo.current?.click()}>{f.logoFile?'Change logo':'Upload logo'}</button>{f.logoFile&&<button type="button" className="ghost small" onClick={()=>setF(s=>({...s,logoFile:undefined}))}>Remove</button>}<input ref={pickLogo} type="file" accept="image/*" hidden onChange={e=>{uploadLogo(e.target.files[0]);e.target.value='';}}/></span></label>
   <div className="two">
    <label>Amount<span className="bill-amount"><span>{sym}</span><input inputMode="decimal" placeholder="0" value={f.amount} onChange={e=>{setErr('');set('amount')(e);}}/></span></label>
    <label>Repeats<Select block value={f.cycle} onChange={v=>setF(s=>({...s,cycle:v}))} options={CYCLES.map(c=>({value:c.id,label:c.label}))}/></label>
   </div>
   <div className="two">
    <label>Next due<DateField value={f.due} onChange={set('due')}/></label>
    <label>Type<Select block value={f.kind} onChange={v=>setF(s=>({...s,kind:v}))} options={KINDS.map(k=>({value:k.id,label:k.label}))}/></label>
   </div>
   <div className="two">
    <label>Category<Select block value={f.category} onChange={v=>setF(s=>({...s,category:v}))} options={EXPENSE_CATS.map(c=>({value:c.id,label:c.name}))}/></label>
    <label>Remind me<Select block value={String(f.remind)} onChange={v=>setF(s=>({...s,remind:Number(v)}))} options={[['0','On the day'],['1','1 day before'],['2','2 days before'],['3','3 days before'],['5','5 days before'],['7','A week before']].map(([value,label])=>({value,label}))}/></label>
   </div>
   <label><span>Last payment date <em className="muted">(optional, for an EMI that ends)</em></span><DateField value={f.endDate||''} onChange={set('endDate')}/></label>
   <label className="auto-copy"><input type="checkbox" checked={!!f.auto} onChange={e=>setF(s=>({...s,auto:e.target.checked}))}/><span>Add it to Finance automatically on the due date</span></label>
   {f.auto&&<p className="muted auto-note">{f.due&&f.due<=dayKey()?'The due date has arrived, so it is added as soon as you save.':'It will be added on the due date'+(f.due?' ('+f.due+')':'')+', then again each time it comes round. ojo adds anything it missed the next time it is open.'}</p>}
   {err&&<p className="error">{err}</p>}
   <div className="form-actions">
    <button className="primary" type="submit">{initial.id&&initial.created?'Save changes':'Add'}</button>
    <button type="button" className="ghost" onClick={onClose}>Cancel</button>
    {onDelete&&<button type="button" className={'ghost danger'+(confirm?' armed':'')} onClick={()=>{if(!confirm){setConfirm(true);setTimeout(()=>setConfirm(false),2500);}else onDelete();}}><Trash size={15}/>{confirm?'Click to confirm':'Delete'}</button>}
   </div>
  </form>
 );
}

export function Bills(){
 const [bills,setBills]=useCollection('bills'),[txns,setTxns]=useCollection('finance'),[settings,setSettings]=useCollection('settings');
 const undo=useUndo();
 const [modal,setModal]=useState(null),[toast,setToast]=useState('');
 const sym=settings[0]?.currency||'₹',today=dayKey();
 const dismissed=settings[0]?.billsDismissed||[];
 const live=useMemo(()=>bills.filter(b=>b.active).sort((a,b)=>a.due.localeCompare(b.due)||a.name.localeCompare(b.name)),[bills]);
 const ended=bills.filter(b=>!b.active);
 const sum=useMemo(()=>totals(bills,today),[bills,today]);
 const groups=useMemo(()=>{
  const g={overdue:[],soon:[],later:[]};
  for(const b of live){const s=status(b,today).state;(s==='overdue'?g.overdue:s==='today'||s==='soon'?g.soon:g.later).push(b);}
  return g;
 },[live,today]);
 const suggestions=useMemo(()=>detectRecurring(txns,bills,{dismissed,today}).slice(0,5),[txns,bills,dismissed,today]);

 const flash=m=>{setToast(m);setTimeout(()=>setToast(''),2400);};
 const save=b=>{
  if(bills.some(x=>x.id===b.id))setBills(l=>l.map(x=>x.id===b.id?{...x,...b}:x));
  else setBills(l=>[newBill(b,b.id||uid()),...l]);
  setModal(null);
 };
 const pay=b=>{
  const t=billTxn(b,today,uid());
  setTxns(l=>[t,...l]);
  setBills(l=>l.map(x=>x.id===b.id?markPaid(x,today,t.id):x));
  undo.show(b.name+' paid and added to Finance',()=>{setTxns(l=>l.filter(x=>x.id!==t.id));setBills(l=>l.map(x=>x.id===b.id?b:x));});
 };
 const doSkip=b=>setBills(l=>l.map(x=>x.id===b.id?skip(x):x));
 const bulk=useBulk();
 const bulkDelete=ids=>{
  const gone=bills.map((b,i)=>ids.includes(b.id)?{b,i}:null).filter(Boolean);
  setBills(l=>l.filter(x=>!ids.includes(x.id)));bulk.stop();
  undo.show(gone.length+(gone.length===1?' bill':' bills')+' deleted',()=>setBills(l=>{const cur=l.filter(x=>!gone.some(g=>g.b.id===x.id));gone.forEach(({b,i})=>cur.splice(Math.min(i,cur.length),0,b));return cur;}));
 };
 // Remember which file holds a service's own icon, so it is fetched once and shown everywhere.
 useEffect(()=>{setBrandLogoCache(settings[0]?.brandLogos||{});},[settings]);
 const saveLogo=(brandId,fileId)=>setSettings(l=>[{...(l[0]||{}),id:'settings',brandLogos:{...((l[0]&&l[0].brandLogos)||{}),[brandId]:fileId}},...l.slice(1)]);
 const remove=b=>{setBills(l=>l.filter(x=>x.id!==b.id));setModal(null);};
 const adopt=s=>{
  setBills(l=>[newBill({name:s.name,amount:s.amount,cycle:s.cycle,category:s.category,kind:/rent/i.test(s.name)?'rent':'subscription',due:s.due},uid()),...l]);
  flash(s.name+' added');
 };
 const dismiss=s=>setSettings([{...settings[0],id:'settings',billsDismissed:[...dismissed,s.key]}]);
 const blank=(preset={})=>({...newBill({due:today,...preset},uid()),id:uid()});

 const Row=({b})=>{
  const Icon=KIND_ICON[b.kind]||Receipt,st=status(b,today),brand=matchBrand(b);
  return (
   <div className={'bill-row '+st.state+(bulk.on?' sel-host':'')}>
    <SelectMark bulk={bulk} id={b.id}/>
    {b.logoFile?<BillLogo fileId={b.logoFile}/>:brand?<BrandBadge brand={brand} size={40} className="bill-logo"/>:<span className="bill-ic"><Icon size={20} weight="duotone"/></span>}
    <div className="bill-main">
     <b>{b.name}</b>
     <span className="muted">{cycleLabel(b.cycle)} · {catOf(b.category).name}{b.auto?' · auto-added':''}</span>
    </div>
    <span className={'bill-due '+st.state}>{dueLabel(b,today)}</span>
    <b className="bill-amt">{fmtMoney(Number(b.amount)||0,sym)}</b>
    <button className="primary small" onClick={()=>pay(b)}><Check size={14} weight="bold"/>Paid</button>
    <span className="bill-acts">
     <button className="ghost small skip-btn" onClick={()=>doSkip(b)}><SkipForward size={13}/>{skipLabel(b.cycle)}</button>
     <button className="icon-btn" aria-label="Edit" onClick={()=>setModal(b)}><PencilSimple size={15}/></button>
    </span>
   </div>
  );
 };
 const Group=({title,list,tone})=>list.length?(<section className={'bill-group '+tone}><h5>{title}<em>{list.length}</em></h5>{list.map(b=><React.Fragment key={b.id}>{Row({b})}</React.Fragment>)}</section>):null;

 return (
  <div className="bills">
   <header className="bills-head">
    <div><h2>Bills & subscriptions</h2></div>
    <span className="spacer"/>
    <SelectToggle bulk={bulk} disabled={!bills.length}/>
    <button className="primary" onClick={()=>setModal(blank())}><Plus size={15} weight="bold"/>Add</button>
   </header>
   {bulk.on&&<BulkBar bulk={bulk} ids={bills.map(b=>b.id)} noun="bill" onDelete={bulkDelete}/>}
   <div className="bill-stats">
    <div><span>Due in 7 days</span><b>{fmtMoney(sum.dueSoonAmount,sym)}</b><em>{sum.dueSoon} {sum.dueSoon===1?'payment':'payments'}</em></div>
    <div><span>Every month</span><b>{fmtMoney(sum.monthly,sym)}</b><em>{sum.count} active</em></div>
    <div><span>Every year</span><b>{fmtMoney(sum.yearly,sym)}</b><em>{sum.subscriptions} {sum.subscriptions===1?'subscription':'subscriptions'}</em></div>
   </div>

   {suggestions.length>0&&<section className="bill-suggest">
    <h5><Lightbulb size={15} weight="fill"/>Found in your spending</h5>
    {suggestions.map(s=>(
     <div className="sg-row" key={s.key}>
      <ArrowsClockwise size={17}/>
      <div className="bill-main"><b>{s.name}</b><span className="muted">{fmtMoney(s.amount,sym)} · {cycleLabel(s.cycle).toLowerCase()} · seen {s.count} times, next around {new Date(s.due+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></div>
      <button className="ghost small" onClick={()=>adopt(s)}><Plus size={13} weight="bold"/>Track it</button>
      <button className="icon-btn" aria-label="Not a bill" onClick={()=>dismiss(s)}><X size={14}/></button>
     </div>
    ))}
   </section>}

   {!live.length&&<div className="bill-empty">
    <Receipt size={34} weight="light"/>
    <h3>Nothing to keep track of yet</h3>
    <p className="muted">Add the payments that repeat, and ojo will remind you before they are due and keep your Finance up to date.</p>
    <div className="chips-row">{FEATURED.slice(0,8).map(b=><button key={b.id} className="filter brand-chip-btn" onClick={()=>setModal(blank({name:b.name,brand:b.id,category:b.category,kind:['airtel','jio'].includes(b.id)?'bill':'subscription',cycle:'monthly'}))}><BrandBadge brand={b} size={18}/>{b.name}</button>)}{PRESETS.map(p=><button key={p.name} className="filter" onClick={()=>setModal(blank(p))}><Plus size={12} weight="bold"/>{p.name}</button>)}</div>
   </div>}

   {Group({title:"Overdue",list:groups.overdue,tone:"overdue"})}
   {Group({title:"Due this week",list:groups.soon,tone:"soon"})}
   {Group({title:"Later",list:groups.later,tone:"later"})}
   {ended.length>0&&<details className="bill-ended"><summary>Finished ({ended.length})</summary>{ended.map(b=><div className="bill-row ended" key={b.id}><span className="bill-ic"><Receipt size={18}/></span><div className="bill-main"><b>{b.name}</b><span className="muted">Last payment {b.paid?.[b.paid.length-1]?.date||b.endDate}</span></div><button className="icon-btn" aria-label="Delete" onClick={()=>remove(b)}><Trash size={15}/></button></div>)}</details>}
   {undo.node}
   {toast&&<div className="bill-toast"><Wallet size={15}/>{toast}</div>}
   {modal&&<Modal title={bills.some(b=>b.id===modal.id)?'Edit bill':'Add a bill'} onClose={()=>setModal(null)}>
    <BillForm initial={modal} sym={sym} onLogo={saveLogo} onSave={save} onClose={()=>setModal(null)} onDelete={bills.some(b=>b.id===modal.id)?()=>remove(modal):null}/>
   </Modal>}
  </div>
 );
}
