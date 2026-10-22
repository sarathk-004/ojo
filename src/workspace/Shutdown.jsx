import React,{useEffect,useMemo,useRef,useState} from 'react';
import {dateLocale} from './prefs.js';
import {gsap} from 'gsap';
import {MoonStars,X,Check,Trash,Trophy,Plus,ArrowBendDownRight,CalendarBlank,Receipt,Repeat,SkipForward,Sun} from '@phosphor-icons/react';
import {useCollection,uid} from './hooks.js';
import {Select} from './Select.jsx';
import {dayKey,completedToday,toggleTask,moveTask,snoozeDate,nextDate,syncMasterDaily,addDays} from '../tasks.mjs';
import {occurrences} from './bills.mjs';
import {fmtDur,sumSeconds,startOfDay} from './focus.mjs';
import {fmtMoney} from './finance.mjs';
import {CountNum} from './Motion.jsx';

const bridge=typeof window!=='undefined'?window.taskit:null;
const longDay=d=>new Date(d+'T12:00').toLocaleDateString(dateLocale(),{weekday:'long',day:'numeric',month:'long'});
const TIMES=['','17:00','18:00','19:00','20:00','21:00','22:00'];

// A calm end-of-day routine: see what you did, deal with what is left, glance at tomorrow, and close the day.
export function Shutdown({go,onClose}){
 const [data,setData]=useState(null),[wins,setWins]=useCollection('wins'),[settings,setSettings]=useCollection('settings'),[events]=useCollection('events'),[bills]=useCollection('bills'),[focus]=useCollection('focus'),[finance]=useCollection('finance');
 const [draft,setDraft]=useState(''),[closing,setClosing]=useState(false);
 const dataRef=useRef(null),card=useRef(null);
 const today=dayKey(),tomorrow=addDays(today,1),sym=settings[0]?.currency||'₹';
 const closed=settings[0]?.lastShutdown===today;

 useEffect(()=>{
  if(!bridge)return;
  bridge.load().then(d=>{dataRef.current=d;setData(d);});
  return bridge.onState(d=>{dataRef.current=d;setData(d);});
 },[]);
 const commit=tasks=>{
  const next=syncMasterDaily({...dataRef.current,tasks});
  dataRef.current=next;setData(next);
  bridge.save({tasks:next.tasks,listOrder:next.listOrder,theme:next.theme,covers:next.covers});
 };
 const patch=(id,fn)=>commit(dataRef.current.tasks.map(t=>t.id===id?fn(t):t));
 const tasks=data?.tasks||[];

 const dayStart=startOfDay(today);
 const doneToday=tasks.filter(t=>!t.repeat&&t.done&&t.doneAt>=dayStart);
 const habitsDone=tasks.filter(t=>t.repeat&&completedToday(t));
 const open=useMemo(()=>tasks.filter(t=>!t.repeat&&!t.done&&t.date&&t.date<=today),[tasks,today]);
 const habitsOpen=useMemo(()=>tasks.filter(t=>t.repeat&&t.date&&t.date<=today&&!completedToday(t)),[tasks,today]);
 const tmrTasks=tasks.filter(t=>!t.done&&t.date===tomorrow);
 const tmrEvents=events.filter(e=>e.date===tomorrow).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const tmrBills=bills.filter(b=>b.active&&occurrences(b,tomorrow,tomorrow).length);
 const todayWins=wins.filter(w=>w.day===today);
 const spentToday=finance.filter(t=>t.date===today&&t.type==='expense').reduce((n,t)=>n+t.amount,0);

 const addWin=text=>{const t=String(text||'').trim();if(!t)return;setWins(l=>[{id:uid(),day:today,text:t,at:Date.now()},...l]);};
 const bulk=date=>commit(tasks.map(t=>open.some(o=>o.id===t.id)?moveTask(t,date):t));
 const close=()=>{
  setSettings([{...settings[0],id:'settings',lastShutdown:today}]);
  setClosing(true);
  requestAnimationFrame(()=>gsap.fromTo('.sd-closed-tick',{scale:.3,rotate:-40,opacity:0},{scale:1,rotate:0,opacity:1,duration:.6,ease:'power3.out'}));
 };
 useEffect(()=>{if(card.current)gsap.fromTo(card.current.children,{y:14,opacity:0},{y:0,opacity:1,duration:.4,stagger:.07,ease:'power2.out'});},[!!data]);

 if(!bridge)return <div className="empty-state"><h3>Needs the desktop app</h3></div>;
 if(!data)return <div className="empty-state"><p className="muted">Loading…</p></div>;

 return (
  <div className="shutdown">
   <header className="sd-head">
    <div><h2>Close the day</h2><p className="muted">{longDay(today)}</p></div>
    <span className="spacer"/>
    <label className="sd-remind">Remind me at<Select compact value={settings[0]?.shutdownAt||''} onChange={v=>setSettings([{...settings[0],id:'settings',shutdownAt:v}])} options={TIMES.map(t=>({value:t,label:t?(Number(t.slice(0,2))>12?Number(t.slice(0,2))-12:Number(t.slice(0,2)))+':00 pm':'Off'}))}/></label>
    {onClose&&<button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>}
   </header>

   {closed&&<div className="sd-closed"><span className="sd-closed-tick"><Check size={24} weight="bold"/></span><div><b>Day closed</b><span className="muted">Nice work. Tomorrow starts clean.</span></div><span className="spacer"/><button className="ghost" onClick={()=>setSettings([{...settings[0],id:'settings',lastShutdown:''}])}>Reopen</button></div>}

   <div className="sd-grid" ref={card}>
    <section className="sd-card">
     <h4><Trophy size={16} weight="duotone"/>Today</h4>
     <div className="sd-nums">
      <div><b><CountNum value={doneToday.length}/></b><span>tasks done</span></div>
      <div><b><CountNum value={habitsDone.length}/></b><span>habits kept</span></div>
      <div><b>{fmtDur(sumSeconds(focus,dayStart))}</b><span>focused</span></div>
      <div><b>{fmtMoney(spentToday,sym)}</b><span>spent</span></div>
     </div>
     {doneToday.length>0&&<div className="sd-done">{doneToday.map(t=><span key={t.id} className="sd-chip"><Check size={12} weight="bold"/>{t.title}<button aria-label="Add as a win" title="" onClick={()=>addWin(t.title)}><Plus size={11} weight="bold"/></button></span>)}</div>}
     <h5>Wins</h5>
     {todayWins.map(w=><div className="sd-win" key={w.id}><Trophy size={14} weight="fill"/><span>{w.text}</span><button className="icon-btn danger" aria-label="Remove win" onClick={()=>setWins(l=>l.filter(x=>x.id!==w.id))}><Trash size={13}/></button></div>)}
     <form className="sd-add" onSubmit={e=>{e.preventDefault();addWin(draft);setDraft('');}}><input placeholder="Something that went well today…" value={draft} onChange={e=>setDraft(e.target.value)}/><button className="ghost small" disabled={!draft.trim()}>Add</button></form>
    </section>

    <section className="sd-card">
     <h4><ArrowBendDownRight size={16} weight="duotone"/>Still open<em>{open.length+habitsOpen.length}</em></h4>
     {open.length>1&&<div className="sd-bulk"><span>All {open.length} tasks:</span><button onClick={()=>bulk(tomorrow)}>Tomorrow</button><button onClick={()=>bulk(snoozeDate('nextweek'))}>Next week</button></div>}
     {open.map(t=>(
      <div className="sd-row" key={t.id}>
       <span className="sd-title">{t.title}{t.date<today&&<em className="late">overdue</em>}</span>
       <span className="sd-acts">
        <button className="ok" onClick={()=>patch(t.id,x=>toggleTask(x))}><Check size={12} weight="bold"/>Done</button>
        <button onClick={()=>patch(t.id,x=>moveTask(x,tomorrow))}>Tomorrow</button>
        <button onClick={()=>patch(t.id,x=>moveTask(x,snoozeDate('nextweek')))}>Next week</button>
        <button onClick={()=>patch(t.id,x=>moveTask(x,''))}>Anytime</button>
        <button className="danger" aria-label="Delete" onClick={()=>commit(tasks.filter(x=>x.id!==t.id))}><Trash size={12}/></button>
       </span>
      </div>
     ))}
     {habitsOpen.map(t=>(
      <div className="sd-row" key={t.id}>
       <span className="sd-title"><Repeat size={13}/>{t.title}</span>
       <span className="sd-acts"><button className="ok" onClick={()=>patch(t.id,x=>toggleTask(x))}><Check size={12} weight="bold"/>Done</button><button onClick={()=>patch(t.id,x=>({...x,date:nextDate(x,today),reminder:''}))}><SkipForward size={12}/>Skip today</button></span>
      </div>
     ))}
     {!open.length&&!habitsOpen.length&&<p className="sd-clear"><Sun size={16}/>Nothing left over. Lovely.</p>}
    </section>

    <section className="sd-card">
     <h4><CalendarBlank size={16} weight="duotone"/>Tomorrow</h4>
     {tmrEvents.map(e=><div className="sd-line" key={e.id}><span>{e.time||'All day'}</span><b>{e.title}</b></div>)}
     {tmrTasks.map(t=><div className="sd-line" key={t.id}><span>Task</span><b>{t.title}</b></div>)}
     {tmrBills.map(b=><div className="sd-line bill" key={b.id}><span><Receipt size={12}/>Due</span><b>{b.name} · {fmtMoney(Number(b.amount)||0,sym)}</b></div>)}
     {!tmrEvents.length&&!tmrTasks.length&&!tmrBills.length&&<p className="muted">Nothing planned yet. <button className="link-btn" onClick={()=>{onClose&&onClose();go('planner');}}>Open the planner</button></p>}
    </section>
   </div>

   {!closed&&<div className="sd-foot"><button className="primary sd-close" onClick={close}><MoonStars size={17} weight="fill"/>Close the day</button></div>}
   {closing&&closed&&<p className="muted sd-note">Saved. See you tomorrow.</p>}
  </div>
 );
}
