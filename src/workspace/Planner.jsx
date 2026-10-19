import React,{useEffect,useMemo,useRef,useState} from 'react';
import {dateLocale} from './prefs.js';
import {CaretLeft,CaretRight,Check,X,CalendarBlank,Receipt,Timer,Plus,Flame,ArrowUUpLeft,Repeat,Trash} from '@phosphor-icons/react';
import {useUndo} from './Undo.jsx';
import {Glyph} from './icons.jsx';
import {useCollection} from './hooks.js';
import {timeToMin,minToTime,snap,clampMin,layoutColumns,blockFor,repeaterWindows,MIN_BLOCK} from './planner.mjs';
import {occurrences} from './bills.mjs';
import {fmtDur} from './focus.mjs';
import {dayKey,newTask,completedToday,toggleTask,syncMasterDaily,habitStats,isDailyTask,recurLabel,addDays} from '../tasks.mjs';

const bridge=typeof window!=='undefined'?window.taskit:null;
const HOUR=56,SNAP=15;
const labelOf=m=>{const h=Math.floor(m/60)%24,x=m%60;return (h%12||12)+(x?':'+String(x).padStart(2,'0'):'')+' '+(h<12?'am':'pm');};
const shiftDay=(day,n)=>{const [y,m,d]=day.split('-').map(Number),x=new Date(y,m-1,d+n,12);return dayKey(x);};
const longDay=day=>new Date(day+'T12:00').toLocaleDateString(dateLocale(),{weekday:'long',day:'numeric',month:'long'});

// A day on a timeline: time-blocked tasks, events, bills due, focus sessions and the windows your repeaters run in.
// Drag a task from the list onto the timeline to give it time; drag its block to move it, pull the bottom edge to resize.
export function Planner({go}){
 const undo=useUndo();
 const [draft,setDraft]=useState('');
 const [day,setDay]=useState(dayKey()),[data,setData]=useState(null),[drag,setDrag]=useState(null),[qa,setQa]=useState(null),[now,setNow]=useState(Date.now());
 const [events]=useCollection('events'),[reminders]=useCollection('reminders'),[bills]=useCollection('bills'),[sessions]=useCollection('focus');
 const dataRef=useRef(null),scroller=useRef(null),lane=useRef(null);
 const today=dayKey();

 useEffect(()=>{
  if(!bridge)return;
  bridge.load().then(d=>{dataRef.current=d;setData(d);});
  return bridge.onState(d=>{dataRef.current=d;setData(d);});
 },[]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  const el=scroller.current;if(!el)return;
  const d=new Date(),mins=day===today?d.getHours()*60+d.getMinutes()-60:7*60;
  el.scrollTop=Math.max(0,mins/60*HOUR);
 },[day,!!data]);

 const commit=tasks=>{
  const next=syncMasterDaily({...dataRef.current,tasks});
  dataRef.current=next;setData(next);
  bridge.save({tasks:next.tasks,listOrder:next.listOrder,theme:next.theme,covers:next.covers});
 };
 const patchTask=(id,change)=>commit(dataRef.current.tasks.map(t=>t.id===id?{...t,...change}:t));
 // A planned block also rings at its start, unless the task already had its own reminder.
 const setBlock=(id,start,end)=>{
  const t=dataRef.current.tasks.find(x=>x.id===id),at=day+'T'+minToTime(start),own=t&&t.reminder&&!t.reminderFromBlock;
  patchTask(id,{block:{date:day,start:minToTime(start),end:minToTime(end)},...(own?{}:{reminder:at,reminderFromBlock:true,notified:false})});
 };
 const unplan=t=>patchTask(t.id,{block:undefined,...(t.reminderFromBlock?{reminder:undefined,reminderFromBlock:undefined}:{})});
 const tasks=data?.tasks||[];
 // Ticking something done shows an Undo for a few seconds; the same tick unticks it later.
 const toggleDone=t=>{
  const wasDone=completedToday(t);
  patchTask(t.id,toggleTask(t));
  if(!wasDone)undo.show('“'+t.title+'” done',()=>commitTask(t.id,x=>toggleTask(x)));
 };
 // Deleting really removes the task, with an Undo that puts it back where it was.
 const removeTask=t=>{
  const list=dataRef.current.tasks,at=list.findIndex(x=>x.id===t.id);
  commit(list.filter(x=>x.id!==t.id));
  undo.show('“'+t.title+'” deleted',()=>{const cur=dataRef.current.tasks;if(cur.some(x=>x.id===t.id))return;const n=[...cur];n.splice(Math.min(at,n.length),0,t);commit(n);});
 };
 const commitTask=(id,fn)=>commit(dataRef.current.tasks.map(t=>t.id===id?fn(t):t));
 const addTask=e=>{
  e.preventDefault();
  const title=draft.trim();
  if(!title)return;
  commit([...dataRef.current.tasks,{...newTask(title,'Today'),date:day}]);
  setDraft('');
 };

 // ---- what is on this day ----
 const blocked=useMemo(()=>tasks.map(t=>({t,b:blockFor(t,day)})).filter(x=>x.b),[tasks,day]);
 const waiting=useMemo(()=>tasks.filter(t=>!t.repeat&&!completedToday(t)&&!(t.block&&t.block.date===day)&&(t.date===day||(!t.date&&day===today)||(day===today&&t.date&&t.date<today))),[tasks,day,today]);
 const habits=useMemo(()=>tasks.filter(t=>t.repeat),[tasks]);
 const weekDays=useMemo(()=>Array.from({length:7},(_,i)=>addDays(day,i-6)),[day]);
 const doneList=useMemo(()=>tasks.filter(t=>!t.repeat&&t.done&&((t.doneAt&&dayKey(new Date(t.doneAt))===day)||(t.block&&t.block.date===day))),[tasks,day]);
 const habitsDoneToday=habits.filter(h=>(h.completions||[]).includes(day)).length;
 const dayEvents=events.filter(e=>e.date===day);
 const timedEvents=dayEvents.filter(e=>e.time);
 const allDay=dayEvents.filter(e=>!e.time);
 const dueBills=bills.filter(b=>b.active&&occurrences(b,day,day).length>0);
 const winds=useMemo(()=>repeaterWindows(reminders,day),[reminders,day]);
 const done=sessions.filter(s=>dayKey(new Date(s.start))===day);

 const items=layoutColumns([
  ...blocked.map(({t,b})=>{const d=drag&&drag.id===t.id?drag:null;return {id:'t:'+t.id,kind:'task',task:t,start:d?d.start:b.start,end:d?d.end:b.end};}),
  ...timedEvents.map(e=>{const s=timeToMin(e.time),en=e.end?timeToMin(e.end):s+60;return {id:'e:'+e.id,kind:'event',event:e,start:s,end:Math.max(en,s+MIN_BLOCK)};})
 ]);
 const plannedMin=items.reduce((n,i)=>n+(i.end-i.start),0);
 const nowMin=new Date(now).getHours()*60+new Date(now).getMinutes();

 // ---- drag a block (or its bottom edge) ----
 const minutesAt=clientY=>{const r=lane.current.getBoundingClientRect();return clampMin(snap((clientY-r.top)/HOUR*60,SNAP),0,24*60);};
 const startDrag=(e,item,mode)=>{
  if(e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  const target=e.currentTarget;target.setPointerCapture?.(e.pointerId);
  const y0=e.clientY,s0=item.start,e0=item.end,id=item.task.id;
  let cur={id,start:s0,end:e0},moved=false;
  const move=ev=>{
   const dm=snap((ev.clientY-y0)/HOUR*60,SNAP);
   if(Math.abs(ev.clientY-y0)>3)moved=true;
   if(mode==='move'){const len=e0-s0,st=clampMin(s0+dm,0,24*60-len);cur={id,start:st,end:st+len};}
   else cur={id,start:s0,end:clampMin(e0+dm,s0+MIN_BLOCK,24*60)};
   setDrag(cur);
  };
  const up=()=>{
   window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);
   setDrag(null);
   if(moved&&(cur.start!==s0||cur.end!==e0))setBlock(id,cur.start,cur.end);
  };
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 };
 const dropTask=e=>{
  e.preventDefault();
  const id=e.dataTransfer.getData('text/tnkr-task');if(!id)return;
  const st=clampMin(snap(minutesAt(e.clientY)-15,SNAP),0,24*60-60);
  setBlock(id,st,st+60);
 };
 const addAt=e=>{
  if(e.target!==e.currentTarget)return;
  setQa({start:clampMin(snap(minutesAt(e.clientY)-15,SNAP),0,24*60-60),title:''});
 };
 const submitQa=e=>{
  e.preventDefault();
  if(!qa||!qa.title.trim()){setQa(null);return;}
  const t={...newTask(qa.title,'Today'),date:day,block:{date:day,start:minToTime(qa.start),end:minToTime(qa.start+60)}};
  commit([...dataRef.current.tasks,t]);setQa(null);
 };

 return (
  <div className="planner">
   <header className="pl-head">
    <div/>
    <span className="spacer"/>
    <div className="pl-nav">
     <button className="icon-btn" aria-label="Previous day" onClick={()=>setDay(d=>shiftDay(d,-1))}><CaretLeft size={16}/></button>
     <b>{day===today?'Today · ':''}{longDay(day)}</b>
     <button className="icon-btn" aria-label="Next day" onClick={()=>setDay(d=>shiftDay(d,1))}><CaretRight size={16}/></button>
     {day!==today&&<button className="ghost" onClick={()=>setDay(today)}>Today</button>}
    </div>
   </header>
   {(allDay.length>0||dueBills.length>0)&&<div className="pl-allday">
    <span className="pl-allday-l">All day</span>
    {allDay.map(e=><button key={e.id} className="pl-chip" style={{'--c':e.color||'#567458'}} onClick={()=>go('calendar',e.id)}><CalendarBlank size={13}/>{e.title}</button>)}
    {dueBills.map(b=><button key={b.id} className="pl-chip bill" onClick={()=>go('bills')}><Receipt size={13}/>{b.name} due</button>)}
   </div>}
   <div className="pl-body">
    <div className="pl-scroll" ref={scroller}>
     <div className="pl-grid" style={{height:24*HOUR}}>
      {Array.from({length:24},(_,h)=><div key={h} className="pl-hour" style={{top:h*HOUR,height:HOUR}}><span>{labelOf(h*60)}</span></div>)}
      <div className="pl-lane" ref={lane} onDragOver={e=>e.preventDefault()} onDrop={dropTask} onDoubleClick={addAt}>
       {items.map(i=>{
        const style={top:i.start/60*HOUR,height:Math.max(18,(i.end-i.start)/60*HOUR-2),left:(i.col/i.cols*100)+'%',width:'calc('+(100/i.cols)+'% - 4px)'};
        if(i.kind==='event')return (
         <button key={i.id} className="pl-block event" style={{...style,'--c':i.event.color||'#567458'}} onClick={()=>go('calendar',i.event.id)}>
          <b>{i.event.title}</b><span>{labelOf(i.start)} – {labelOf(i.end)}</span>
         </button>
        );
        const t=i.task,fin=completedToday(t),live=drag&&drag.id===t.id;
        return (
         <div key={i.id} className={'pl-block task'+(fin?' done':'')+(live?' live':'')} style={style} onPointerDown={e=>{if(!e.target.closest('button,.pl-resize'))startDrag(e,i,'move');}}>
          <button className={'pl-tick'+(fin?' on':'')} aria-label={fin?'Mark not done':'Mark done'} onClick={()=>toggleDone(t)}>{fin&&<Check size={11} weight="bold"/>}</button>
          <div className="pl-text"><b>{t.title}</b><span>{labelOf(i.start)} – {labelOf(i.end)} · {fmtDur((i.end-i.start)*60)}</span></div>
          <button className="pl-x" aria-label="Take off the timeline" onClick={()=>unplan(t)}><X size={12}/></button>
          <button className="pl-x pl-del" aria-label="Delete task" onClick={()=>removeTask(t)}><Trash size={12}/></button>
          <span className="pl-resize" onPointerDown={e=>startDrag(e,i,'resize')}/>
         </div>
        );
       })}
       {qa&&<form className="pl-quick" style={{top:qa.start/60*HOUR}} onSubmit={submitQa}>
        <input autoFocus placeholder={'New task at '+labelOf(qa.start)} value={qa.title} onChange={e=>setQa({...qa,title:e.target.value})} onBlur={()=>setQa(null)} onKeyDown={e=>{if(e.key==='Escape')setQa(null);}}/>
       </form>}
      </div>
      <div className="pl-rails">
       {winds.map(w=><div key={w.id} className="pl-rep" style={{top:w.start/60*HOUR,height:(w.end-w.start)/60*HOUR}}><span title=""><Glyph name={w.emoji} size={14}/></span></div>)}
       {done.map(s=>{const st=new Date(s.start),m=st.getHours()*60+st.getMinutes();return <div key={s.id} className="pl-done" style={{top:m/60*HOUR,height:Math.max(8,s.seconds/60/60*HOUR)}}/>;})}
      </div>
      {day===today&&<div className="pl-now" style={{top:nowMin/60*HOUR}}><i/></div>}
     </div>
    </div>
    <aside className="pl-side">
     <form className="pl-add" onSubmit={addTask}>
      <input placeholder={'Add a task for '+(day===today?'today':new Date(day+'T12:00').toLocaleDateString(dateLocale(),{weekday:'long'}))+'…'} value={draft} onChange={e=>setDraft(e.target.value)}/>
      <button className="primary round" aria-label="Add task" disabled={!draft.trim()}><Plus size={15} weight="bold"/></button>
     </form>
     <h5>To schedule<em>{waiting.length}</em></h5>
     <div className="pl-list">
      {waiting.map(t=>(
       <div key={t.id} className="pl-task" draggable onDragStart={e=>{e.dataTransfer.setData('text/tnkr-task',t.id);e.dataTransfer.effectAllowed='move';}}>
        <span className="pl-grip">⋮⋮</span><b>{t.title}</b>
        {t.reminder&&<span className="muted">{t.reminder.slice(11,16)}</span>}
        <button className="pl-check" aria-label="Mark done" onClick={()=>toggleDone(t)}><Check size={12} weight="bold"/></button>
        <button className="pl-check pl-trash" aria-label="Delete task" onClick={()=>removeTask(t)}><Trash size={12}/></button>
       </div>
      ))}
      {!waiting.length&&<p className="muted">{tasks.length?'Everything for this day has a time, or is done.':'No tasks yet. Add one above.'}</p>}
     </div>
     {habits.length>0&&<>
      <h5>Daily habits<em>{habitsDoneToday}/{habits.length}</em></h5>
      <div className="pl-habits">
       <div className="pl-hdots head">{weekDays.map(d=><i key={d} className={d===today?'now':''}>{new Date(d+'T12:00').toLocaleDateString(dateLocale(),{weekday:'narrow'})}</i>)}</div>
       {habits.map(h=>{
        const fin=(h.completions||[]).includes(day),streak=isDailyTask(h)?habitStats(h).current:0;
        return (
         <div key={h.id} className={'pl-habit'+(fin?' done':'')}>
          <button className={'pl-tick'+(fin?' on':'')} disabled={day!==today} aria-label={fin?'Mark not done':'Mark done'} onClick={()=>toggleDone(h)}>{fin&&<Check size={11} weight="bold"/>}</button>
          <div className="pl-hname"><b>{h.title}</b><span className="muted">{recurLabel(h)}{streak>1?' · ':''}{streak>1&&<span className="streak"><Flame size={11} weight="fill"/>{streak}</span>}</span></div>
          <div className="pl-hdots">{weekDays.map(d=><i key={d} className={(h.completions||[]).includes(d)?'on':''}/>)}</div>
         </div>
        );
       })}
      </div>
     </>}
     {doneList.length>0&&<>
      <h5>Done<em>{doneList.length}</em></h5>
      <div className="pl-list">
       {doneList.map(t=>(
        <div key={t.id} className="pl-task done">
         <Check size={13} weight="bold"/><b>{t.title}</b>
         <button className="pl-undo" onClick={()=>patchTask(t.id,toggleTask(t))}><ArrowUUpLeft size={12}/>Undo</button>
        </div>
       ))}
      </div>
     </>}
     <h5>The day</h5>
     <div className="pl-facts">
      <span><Timer size={14}/>{fmtDur(plannedMin*60)} planned</span>
      {winds.length>0&&<span>{winds.length} {winds.length===1?'repeater':'repeaters'}</span>}
      {done.length>0&&<span className="ok">{fmtDur(done.reduce((n,s)=>n+s.seconds,0))} focused</span>}
     </div>
     <p className="muted pl-tip"><Plus size={12}/> Double-click an empty spot to add a task there.</p>
    </aside>
   </div>
   {undo.node}
  </div>
 );
}
