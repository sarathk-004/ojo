import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,Stop,Coffee,Timer,Trash,Target} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import {useCollection} from './hooks.js';
import {api} from './api.js';
import {Select} from './Select.jsx';
import {fmtClock,fmtDur,sumSeconds,totalsByTask,perDay,startOfDay,dayOf} from './focus.mjs';
import {completedToday,belongs} from '../tasks.mjs';

const bridge=typeof window!=='undefined'?window.taskit:null;
const FOCUS_MINS=[15,25,45,60],BREAK_MINS=[5,10,15];
const clock=n=>new Date(n).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});

// The running timer, shared by this page and the sidebar badge.
export function useFocus(){
 const [f,setF]=useState(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{api.focusState().then(setF);return api.onFocus(setF);},[]);
 useEffect(()=>{if(!f||f.paused)return;const t=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(t);},[f]);
 const left=f?(f.paused?f.left:Math.max(0,(f.endsAt||0)-now)):0;
 return {focus:f,left};
}

function Ring({fraction,children,tone}){
 const C=2*Math.PI*104;
 return (
  <div className={'fx-ring is-'+tone}>
   <svg viewBox="0 0 240 240" width="240" height="240"><circle cx="120" cy="120" r="104" fill="none" stroke="#e4e0d2" strokeWidth="12"/><circle className="fx-arc" cx="120" cy="120" r="104" fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-Math.min(1,Math.max(0,fraction)))} transform="rotate(-90 120 120)"/></svg>
   <div className="fx-mid">{children}</div>
  </div>
 );
}

// The timer's digits are the control. Click them and type minutes (25) or minutes:seconds (1:30); what you type is what you see.
const parseClock=t=>{
 const [a,b]=String(t).split(':');
 const m=parseInt(a||'0',10)||0,s=b===undefined?0:Math.min(59,parseInt(b||'0',10)||0);
 const total=m*60+s;
 return total>0?Math.min(240*60,total):0;
};
function MinuteDigits({seconds,onChange}){
 const [draft,setDraft]=useState(null);
 const commit=()=>{if(draft!==null){const n=parseClock(draft);if(n>0)onChange(n);setDraft(null);}};
 if(draft===null)return <button type="button" className="fx-digits" aria-label={fmtClock(seconds*1000)+', click to change'} onClick={()=>setDraft('')}>{fmtClock(seconds*1000)}</button>;
 return (
  <span className="fx-digits-edit">
   <input autoFocus inputMode="numeric" aria-label="Minutes, or minutes and seconds" value={draft} placeholder={fmtClock(seconds*1000)}
    onChange={e=>setDraft(e.target.value.replace(/[^0-9:]/g,'').replace(/^(\d*:\d*).*:.*$/,'$1').slice(0,6))} onBlur={commit}
    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();setDraft(null);}}}/>
   <em>min : sec</em>
  </span>
 );
}

export function Focus({focusId}){
 const [sessions]=useCollection('focus');
 const {focus,left}=useFocus();
 const [tasks,setTasks]=useState([]),[taskId,setTaskId]=useState(focusId||''),[kind,setKind]=useState('focus'),[mins,setMins]=useState(25),[secs,setSecs]=useState(0);
 const done=useRef(null);
 useEffect(()=>{if(!bridge)return;bridge.load().then(d=>setTasks(d.tasks||[]));return bridge.onState(d=>setTasks(d.tasks||[]));},[]);
 useEffect(()=>{if(focusId)setTaskId(focusId);},[focusId]);
 const open=useMemo(()=>tasks.filter(t=>!completedToday(t)&&(belongs(t,'Today')||belongs(t,'Upcoming')||belongs(t,'Anytime')||belongs(t,'Daily'))),[tasks]);
 const picked=tasks.find(t=>t.id===taskId);
 const sessionSecs=secs||mins*60,total=focus?focus.minutes*60000:sessionSecs*1000;
 const fraction=focus?1-left/total:0;

 const today=dayOf(Date.now()),dayStart=startOfDay(today),weekStart=dayStart-6*86400000;
 const todaySecs=sumSeconds(sessions,dayStart);
 const weekTasks=useMemo(()=>totalsByTask(sessions,weekStart),[sessions,weekStart]);
 const days=useMemo(()=>perDay(sessions,today,7),[sessions,today]);
 const maxDay=Math.max(1,...days.map(d=>d.seconds));
 const todays=sessions.filter(s=>s.start>=dayStart).sort((a,b)=>b.start-a.start);

 const start=()=>api.focusStart({taskId:kind==='focus'?taskId:'',title:kind==='focus'?(picked?.title||'Focus'):'Break',seconds:sessionSecs,kind});
 // After a focus session, offer the break; after a break, offer the next focus.
 const wasRunning=useRef(null);
 useEffect(()=>{
  if(focus)wasRunning.current=focus.kind;
  else if(wasRunning.current){setKind(wasRunning.current==='focus'?'break':'focus');setMins(wasRunning.current==='focus'?5:25);setSecs(0);wasRunning.current=null;}
 },[focus]);
 useEffect(()=>{if(focus&&done.current)gsap.fromTo(done.current,{scale:.96},{scale:1,duration:.3,ease:'back.out(2)'});},[focus?.startedAt]);
 const choices=kind==='focus'?FOCUS_MINS:BREAK_MINS;

 return (
  <div className="focus">
   <div className="fx-grid">
    <section className="fx-card fx-timer" ref={done}>
     {!focus&&<div className="seg-toggle fx-kind">
      <button className={kind==='focus'?'on':''} onClick={()=>{setKind('focus');setMins(25);setSecs(0);}}><Target size={15}/>Focus</button>
      <button className={kind==='break'?'on':''} onClick={()=>{setKind('break');setMins(5);setSecs(0);}}><Coffee size={15}/>Break</button>
     </div>}
     <Ring fraction={fraction} tone={(focus?focus.kind:kind)}>
      {focus
       ?<b>{fmtClock(left)}</b>
       :<MinuteDigits seconds={sessionSecs} onChange={setSecs}/>}
      <span>{focus?(focus.paused?'Paused':focus.kind==='focus'?(focus.title||'Focusing'):'Break'):kind==='focus'?(picked?picked.title:'No task chosen'):'Rest your eyes'}</span>
     </Ring>
     {!focus&&<>
      <div className="fx-chips">{choices.map(m=><button key={m} className={!secs&&mins===m?'on':''} onClick={()=>{setMins(m);setSecs(0);}}>{m} min</button>)}
      </div>
      {kind==='focus'&&<label className="fx-task">Working on<Select block value={taskId} onChange={setTaskId} options={[{value:'',label:'No particular task'},...open.map(t=>({value:t.id,label:t.title}))]}/></label>}
      <button className="primary fx-go" onClick={start}><Play size={16} weight="fill"/>Start {kind==='focus'?'focus':'break'}</button>
     </>}
     {focus&&<div className="fx-controls">
      {focus.paused?<button className="primary" onClick={()=>api.focusResume()}><Play size={15} weight="fill"/>Resume</button>:<button className="ghost" onClick={()=>api.focusPause()}><Pause size={15} weight="fill"/>Pause</button>}
      <button className="ghost danger" onClick={()=>api.focusStop()}><Stop size={15} weight="fill"/>{focus.kind==='focus'?'Stop and save':'Skip break'}</button>
     </div>}
    </section>

    <section className="fx-card fx-stats">
     <div className="fx-today"><span>Today</span><b>{fmtDur(todaySecs)}</b><em>{todays.length} {todays.length===1?'session':'sessions'}</em></div>
     <div className="fx-week">{days.map(d=>(
      <div key={d.day} className={d.day===today?'now':''} title=""><i style={{height:Math.max(3,d.seconds/maxDay*64)+'px'}}/><span>{d.label[0]}</span></div>
     ))}</div>
     <h5>By task this week</h5>
     {weekTasks.slice(0,6).map(t=><div className="fx-task-row" key={t.taskId||'none'}><span>{t.title}</span><div className="fx-bar"><i style={{width:Math.round(t.seconds/weekTasks[0].seconds*100)+'%'}}/></div><b>{fmtDur(t.seconds)}</b></div>)}
     {!weekTasks.length&&<p className="muted">Nothing logged yet. A session is saved when it finishes, or when you stop it after at least half a minute.</p>}
    </section>

    <section className="fx-card fx-log">
     <h5>Today's sessions</h5>
     {todays.map(s=>(
      <div className="fx-log-row" key={s.id}>
       <Timer size={16} weight="duotone"/>
       <div><b>{s.title||'Focus'}</b><span className="muted">{clock(s.start)} – {clock(s.end)}</span></div>
       <span className="spacer"/>
       <b>{fmtDur(s.seconds)}</b>
       <button className="icon-btn danger" aria-label="Delete session" onClick={()=>api.focusDelete(s.id)}><Trash size={14}/></button>
      </div>
     ))}
     {!todays.length&&<p className="muted">No sessions yet today.</p>}
    </section>
   </div>
  </div>
 );
}
