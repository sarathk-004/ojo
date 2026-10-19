import React,{useEffect,useMemo,useRef,useState} from 'react';
import {dateLocale} from './prefs.js';
import {DateField} from './Pickers.jsx';
import {Plus,CaretLeft,CaretRight,Trash,PencilSimple,DownloadSimple,MagnifyingGlass,ArrowDownLeft,ArrowUpRight,PiggyBank,Wallet,X,UploadSimple} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import {useCollection,uid} from './hooks.js';
import {Modal} from './Modal.jsx';
import {Select} from './Select.jsx';
import {EXPENSE_CATS,INCOME_CATS,CURRENCIES,catOf,fmtMoney,parseAmount,summarize,monthlySeries,budgetUsage,shiftMonth,monthLabel,toCSV,monthOf} from './finance.mjs';
import {dayKey} from '../tasks.mjs';
import {StatementImport} from './StatementImport.jsx';
import {vendorName,vendorStats} from './vendor.mjs';
import {useUndo} from './Undo.jsx';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';

const blank=type=>({id:null,type,amount:'',category:type==='income'?'salary':'food',date:dayKey(),note:''});

function Donut({data,total,sym}){
 const ref=useRef(null),C=2*Math.PI*58;
 useEffect(()=>{
  if(!ref.current)return;
  const arcs=ref.current.querySelectorAll('circle.seg');
  gsap.fromTo(arcs,{attr:{'stroke-dasharray':i=>'0 '+C}},{attr:{'stroke-dasharray':(i,el)=>el.dataset.dash},duration:.9,ease:'power3.out',stagger:.06});
 },[data.map(d=>d.id+d.amount).join('|')]);
 let acc=0;
 return (
  <div className="donut">
   <svg ref={ref} viewBox="0 0 160 160" width="168" height="168">
    <circle cx="80" cy="80" r="58" fill="none" stroke="#e8e4d8" strokeWidth="22"/>
    {data.map(d=>{
     const len=total?d.amount/total*C:0,off=-acc;acc+=len;
     return <circle key={d.id} className="seg" cx="80" cy="80" r="58" fill="none" stroke={d.color} strokeWidth="22" strokeDasharray={`${len} ${C-len}`} data-dash={`${len} ${C-len}`} strokeDashoffset={off} transform="rotate(-90 80 80)"/>;
    })}
   </svg>
   <div className="donut-mid"><span>Spent</span><b>{fmtMoney(total,sym)}</b></div>
  </div>
 );
}

function Bars({series,sym}){
 const ref=useRef(null),max=Math.max(1,...series.flatMap(s=>[s.income,s.expense]));
 useEffect(()=>{
  if(!ref.current)return;
  // Grow each bar up from the baseline by tweening its height and top edge.
  ref.current.querySelectorAll('rect.bar').forEach((el,i)=>{
   const h=+el.dataset.h,y=+el.dataset.y;
   gsap.fromTo(el,{attr:{height:0,y:y+h}},{attr:{height:h,y},duration:.7,ease:'power3.out',delay:i*.03});
  });
 },[series.map(s=>s.income+':'+s.expense).join('|')]);
 const W=360,H=190,base=H-22,bw=14,gap=(W-series.length*bw*2-24)/series.length;
 return (
  <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img" aria-label="Income and spending by month">
   {[.25,.5,.75,1].map(f=><line key={f} x1="8" x2={W-8} y1={base-(base-10)*f} y2={base-(base-10)*f} stroke="#ebe7da" strokeWidth="1"/>)}
   {series.map((s,i)=>{
    const x=12+i*(bw*2+gap)+gap/2,hi=(base-10)*s.income/max,he=(base-10)*s.expense/max;
    return (
     <g key={s.key}>
      <rect className="bar" x={x} y={base-hi} width={bw} height={Math.max(hi,s.income?2:0)} data-h={Math.max(hi,s.income?2:0)} data-y={base-hi} rx="4" fill="#567458"/>
      <rect className="bar" x={x+bw+2} y={base-he} width={bw} height={Math.max(he,s.expense?2:0)} data-h={Math.max(he,s.expense?2:0)} data-y={base-he} rx="4" fill="#c9803f"/>
      <text x={x+bw} y={H-5} textAnchor="middle" fontSize="10.5" fill="#7b8176">{s.label}</text>
     </g>
    );
   })}
  </svg>
 );
}

function TxnForm({initial,sym,onSave,onDelete}){
 const [f,setF]=useState(initial),[err,setErr]=useState(''),[confirm,setConfirm]=useState(false);
 const cats=f.type==='income'?INCOME_CATS:EXPENSE_CATS;
 const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
 const submit=e=>{
  e.preventDefault();
  const amount=parseAmount(f.amount);
  if(Number.isNaN(amount)){setErr('Enter an amount greater than zero.');return;}
  onSave({...f,amount,note:f.note.trim()});
 };
 return (
  <form className="txn-form" onSubmit={submit}>
   <div className="seg-toggle">
    {['expense','income'].map(t=><button type="button" key={t} className={f.type===t?'on '+t:''} onClick={()=>setF(s=>({...s,type:t,category:t==='income'?'salary':'food'}))}>{t==='expense'?<ArrowUpRight size={15}/>:<ArrowDownLeft size={15}/>}{t==='expense'?'Expense':'Income'}</button>)}
   </div>
   <label className="amount-field"><span>{sym}</span><input autoFocus inputMode="decimal" placeholder="0" value={f.amount} onChange={e=>{setErr('');set('amount')(e);}}/></label>
   {err&&<p className="error">{err}</p>}
   <div className="cat-grid">{cats.map(c=><button type="button" key={c.id} className={f.category===c.id?'on':''} style={{'--c':c.color}} onClick={()=>setF(s=>({...s,category:c.id}))}><i/>{c.name}</button>)}</div>
   <div className="two"><label>Date<DateField value={f.date} onChange={set('date')}/></label><label>Note<input placeholder="What was it for?" value={f.note} onChange={set('note')}/></label></div>
   <div className="form-actions">
    <button className="primary" type="submit">{f.id?'Save changes':'Add'}</button>
    {f.id&&<button type="button" className={'ghost danger'+(confirm?' armed':'')} onClick={()=>{if(!confirm){setConfirm(true);setTimeout(()=>setConfirm(false),2500);}else onDelete(f.id);}}><Trash size={15}/>{confirm?'Click to confirm':'Delete'}</button>}
   </div>
  </form>
 );
}

export function Finance({focusId}){
 const [txns,setTxns]=useCollection('finance'),[budgets,setBudgets]=useCollection('budgets'),[settings,setSettings]=useCollection('settings');
 const [month,setMonth]=useState(()=>dayKey().slice(0,7)),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[modal,setModal]=useState(null);
 const [budgetDraft,setBudgetDraft]=useState({category:'',limit:''}),[importing,setImporting]=useState(false);
 const sym=settings[0]?.currency||'₹';
 useEffect(()=>{const t=focusId&&txns.find(x=>x.id===focusId);if(t){setMonth(monthOf(t.date));setFilter('all');setQuery(t.note||'');}},[focusId,txns.length]);
 const summary=useMemo(()=>summarize(txns,month),[txns,month]);
 const series=useMemo(()=>monthlySeries(txns,month,6),[txns,month]);
 const usage=useMemo(()=>budgetUsage(budgets,summary),[budgets,summary]);
 // Vendors paid again and again (daily, twice a week, weekly, monthly), worked out from every month so far.
 const regulars=useMemo(()=>vendorStats(txns,{month}),[txns,month]),cycleOfVendor=useMemo(()=>new Map(regulars.map(v=>[v.key,v])),[regulars]);
 const donut=summary.byCategory.map(c=>({...catOf(c.category),amount:c.amount}));
 const list=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return txns.filter(t=>monthOf(t.date)===month&&(filter==='all'||t.type===filter)&&(!q||(t.note||'').toLowerCase().includes(q)||vendorName(t.note).toLowerCase().includes(q)||(t.detail||'').toLowerCase().includes(q)||(t.account||'').toLowerCase().includes(q)||catOf(t.category).name.toLowerCase().includes(q)||String(t.amount).includes(q)))
   .sort((a,b)=>b.date.localeCompare(a.date)||(b.created||0)-(a.created||0));
 },[txns,month,filter,query]);
 const groups=useMemo(()=>{
  const m=new Map();for(const t of list){if(!m.has(t.date))m.set(t.date,[]);m.get(t.date).push(t);}return [...m];
 },[list]);

 const save=t=>{
  const next={...t,created:t.created||Date.now()};
  if(t.id)setTxns(l=>l.map(x=>x.id===t.id?{...x,...next}:x));
  else setTxns(l=>[{...next,id:uid()},...l]);
  if(monthOf(t.date)!==month)setMonth(monthOf(t.date));
  setModal(null);
 };
 const importRows=list=>{
  const now=Date.now();
  setTxns(l=>[...list.map((r,i)=>({...r,id:uid(),created:now+i})),...l]);
  const latest=list.map(r=>r.date).sort().pop();
  if(latest)setMonth(monthOf(latest));
  setImporting(false);
 };
 const undo=useUndo(),bulk=useBulk();
 useEffect(()=>{bulk.clear();},[month,filter,query]);
 const bulkDelete=ids=>{
  const gone=txns.map((t,i)=>ids.includes(t.id)?{t,i}:null).filter(Boolean);
  setTxns(l=>l.filter(x=>!ids.includes(x.id)));bulk.stop();
  undo.show(gone.length+(gone.length===1?' entry':' entries')+' deleted',()=>setTxns(l=>{const cur=l.filter(x=>!gone.some(g=>g.t.id===x.id));gone.forEach(({t,i})=>cur.splice(Math.min(i,cur.length),0,t));return cur;}));
 };
 const remove=id=>{setTxns(l=>l.filter(x=>x.id!==id));setModal(null);};
 const exportCsv=()=>{
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([toCSV(txns)],{type:'text/csv'}));a.download='ojo-finance.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 };
 const addBudget=e=>{
  e.preventDefault();
  const limit=parseAmount(budgetDraft.limit);
  if(!budgetDraft.category||Number.isNaN(limit))return;
  setBudgets(l=>[...l.filter(b=>b.category!==budgetDraft.category),{id:uid(),category:budgetDraft.category,limit}]);
  setBudgetDraft({category:'',limit:''});
 };
 const free=EXPENSE_CATS.filter(c=>!budgets.some(b=>b.category===c.id));
 const thisMonth=dayKey().slice(0,7);

 return (
  <div className="fin">
   <section className="fin-main">
    <header className="fin-head">
     <div className="month-nav">
      <button className="icon-btn" aria-label="Previous month" onClick={()=>setMonth(m=>shiftMonth(m,-1))}><CaretLeft size={16}/></button>
      <b>{monthLabel(month)}</b>
      <button className="icon-btn" aria-label="Next month" onClick={()=>setMonth(m=>shiftMonth(m,1))}><CaretRight size={16}/></button>
      {month!==thisMonth&&<button className="ghost" onClick={()=>setMonth(thisMonth)}>This month</button>}
     </div>
     <span className="spacer"/>
     <Select compact label="Currency" value={sym} onChange={v=>setSettings([{...settings[0],id:'settings',currency:v}])} options={CURRENCIES.map(c=>({value:c.sym,label:c.sym}))}/>
     <button className="ghost" data-tip="Bring in a bank, PhonePe or Google Pay statement." data-tip-title="Import statement" onClick={()=>setImporting(true)}><DownloadSimple size={15}/>Import statement</button>
     <button className="ghost" data-tip="Save this month as a CSV file." data-tip-title="Export" onClick={exportCsv} disabled={!txns.length}><UploadSimple size={15}/>Export</button>
     <button className="primary" data-tip="Record money spent or received." data-tip-title="Add transaction" onClick={()=>setModal(blank('expense'))}><Plus size={15} weight="bold"/>Add</button>
    </header>

    <div className="stat-cards">
     <div className="stat income"><span><ArrowDownLeft size={14}/>Income</span><b>{fmtMoney(summary.income,sym)}</b></div>
     <div className="stat expense"><span><ArrowUpRight size={14}/>Spent</span><b>{fmtMoney(summary.expense,sym)}</b></div>
     <div className={'stat net'+(summary.net<0?' neg':'')}><span><Wallet size={14}/>Balance</span><b>{fmtMoney(summary.net,sym)}</b></div>
     <div className="stat"><span><PiggyBank size={14}/>Saved</span><b>{summary.savingsRate===null?'—':summary.savingsRate+'%'}</b></div>
    </div>

    <div className="chart-row">
     <div className="card-box">
      <h3>Where it went</h3>
      {donut.length?<div className="donut-wrap">
       <Donut data={donut} total={summary.expense} sym={sym}/>
       <ul className="legend">{donut.slice(0,6).map(d=><li key={d.id}><i style={{background:d.color}}/><span className="ln"><span>{d.name}</span><em>{Math.round(d.amount/summary.expense*100)}%</em></span><b>{fmtMoney(d.amount,sym)}</b></li>)}</ul>
      </div>:<p className="muted pad">No spending recorded this month.</p>}
     </div>
     <div className="card-box">
      <h3>Last 6 months <span className="key"><i className="g"/>Income<i className="o"/>Spent</span></h3>
      <Bars series={series} sym={sym}/>
     </div>
    </div>

    <div className="card-box txn-box">
     <div className="txn-bar">
      <h3>Transactions</h3>
      <div className="chips-row">{['all','expense','income'].map(f=><button key={f} className={'filter'+(filter===f?' on':'')} onClick={()=>setFilter(f)}>{f==='all'?'All':f==='expense'?'Spent':'Income'}</button>)}</div>
      <label className="search"><MagnifyingGlass size={14}/><input placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <SelectToggle bulk={bulk} disabled={!list.length}/>
     </div>
     {bulk.on&&<BulkBar bulk={bulk} ids={list.map(t=>t.id)} noun="entry" onDelete={bulkDelete}/>}
     {groups.map(([date,items])=>{
      const net=items.reduce((n,t)=>n+(t.type==='income'?t.amount:-t.amount),0);
      return (
       <div className="day-group" key={date}>
        <div className="day-head"><span>{new Date(date+'T00:00').toLocaleDateString(dateLocale(),{weekday:'short',day:'numeric',month:'short'})}</span><em>{fmtMoney(net,sym)}</em></div>
        {items.map(t=>{const c=catOf(t.category);return (
         <div className={'txn-row'+(bulk.on?' sel-host pad-left':'')} key={t.id}>
          <SelectMark bulk={bulk} id={t.id}/>
          <i className="cat-dot" style={{background:c.color}}/>
          <div className="txn-main"><b>{vendorName(t.note)||c.name}</b>{t.note&&<span className="muted">{c.name}{t.type==='expense'&&cycleOfVendor.get(vendorName(t.note).toLowerCase())?' · '+cycleOfVendor.get(vendorName(t.note).toLowerCase()).label:''}{t.account?' · '+t.account:''}</span>}</div>
          <span className={'amt '+t.type}>{t.type==='income'?'+':'−'}{fmtMoney(t.amount,sym).replace('−','')}</span>
          <button className="icon-btn" aria-label="Edit" onClick={()=>setModal({...t,amount:String(t.amount)})}><PencilSimple size={14}/></button>
         </div>
        );})}
       </div>
      );
     })}
     {!groups.length&&<div className="empty-state small"><Wallet size={30} weight="light"/><h3>{txns.length?'Nothing here':'Start tracking'}</h3><p className="muted">{txns.length?'No transactions match this month and filter.':'Add your first income or expense to see the month take shape.'}</p>{!txns.length&&<button className="primary" onClick={()=>setModal(blank('expense'))}><Plus size={15} weight="bold"/>Add transaction</button>}</div>}
    </div>
   </section>

   <aside className="fin-side">
    {regulars.length>0&&<div className="side-card regulars">
     <h3>Regular vendors</h3>
     <p className="muted">People and shops you pay on a steady rhythm.</p>
     {regulars.slice(0,6).map(v=>(
      <button key={v.key} className="reg-row" onClick={()=>setQuery(v.name)}>
       <span className="reg-name"><b>{v.name}</b><em>{v.label}</em></span>
       <span className="reg-meta muted">{v.monthCount?v.monthCount+' this month · '+fmtMoney(v.monthTotal,sym):v.count+' payments · about '+fmtMoney(v.avg,sym)+' each'}</span>
      </button>
     ))}
    </div>}
    <div className="side-card">
     <h3>Budgets</h3>
     {usage.map(u=>{const c=catOf(u.category);return (
      <div className="budget" key={u.id}>
       <div className="b-top"><span><i style={{background:c.color}}/>{c.name}</span><button className="icon-btn" aria-label="Remove budget" onClick={()=>setBudgets(l=>l.filter(b=>b.id!==u.id))}><X size={12}/></button></div>
       <div className={'b-bar'+(u.over?' over':'')}><i style={{width:Math.min(100,u.pct)+'%',background:u.over?'#b4533f':u.pct>=80?'#d6a43a':c.color}}/></div>
       <div className="b-foot"><span>{fmtMoney(u.spent,sym)} of {fmtMoney(u.limit,sym)}</span><em className={u.over?'over':''}>{u.over?fmtMoney(u.spent-u.limit,sym)+' over':fmtMoney(u.limit-u.spent,sym)+' left'}</em></div>
      </div>
     );})}
     {!usage.length&&<p className="muted">Set a monthly limit per category and watch it fill.</p>}
     {free.length>0&&<form className="budget-add" onSubmit={addBudget}>
      <Select compact block placeholder="Category" value={budgetDraft.category} onChange={v=>setBudgetDraft(d=>({...d,category:v}))} options={free.map(c=>({value:c.id,label:c.name}))}/>
      <input inputMode="decimal" placeholder="Limit" value={budgetDraft.limit} onChange={e=>setBudgetDraft(d=>({...d,limit:e.target.value}))}/>
      <button className="primary small" disabled={!budgetDraft.category||Number.isNaN(parseAmount(budgetDraft.limit))}>Set</button>
     </form>}
    </div>
   </aside>

   {modal&&<Modal title={modal.id?'Edit transaction':'Add transaction'} onClose={()=>setModal(null)}>
    <TxnForm initial={modal} sym={sym} onSave={save} onDelete={remove}/>
   </Modal>}
    {undo.node}
    {importing&&<StatementImport existing={txns} sym={sym} onImport={importRows} onClose={()=>setImporting(false)}/>}
</div>
 );
}
