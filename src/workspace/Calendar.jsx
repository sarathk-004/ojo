import React,{useEffect,useMemo,useState} from 'react';
import {dateLocale,weekStart,dowNames} from './prefs.js';
import {DateField,TimeField} from './Pickers.jsx';
import {CaretLeft,CaretRight,CaretDown,Plus,Trash,Check,CalendarBlank,CaretRight as Chev} from '@phosphor-icons/react';
import {useCollection,useTasks,uid} from './hooks.js';
import {dayKey,newTask} from '../tasks.mjs';
import {occurrences} from './bills.mjs';

const COLORS=['#567458','#c9803f','#4f7ea8','#a85a7a','#7a6aa8','#3d3d3a'];
const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const blank=date=>({title:'',date,time:'',end:'',color:COLORS[0],note:''});

export function Calendar({focusId}){
 const [events,setEvents]=useCollection('events');
 const tasks=useTasks();
 const [jobs]=useCollection('jobs'),[bills]=useCollection('bills');
 const today=dayKey();
 const [cursor,setCursor]=useState(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()};});
 const [selected,setSelected]=useState(today);
 // Tasks are not what the calendar is for: they sit in a section that opens and closes (remembered on this computer).
 const [tasksOpen,setTasksOpen]=useState(()=>{try{return localStorage.getItem('tnkr-ws-cal-tasks')==='open';}catch{return false;}});
 const toggleTasks=()=>setTasksOpen(v=>{const n=!v;try{localStorage.setItem('tnkr-ws-cal-tasks',n?'open':'shut');}catch{}return n;});
 const [form,setForm]=useState(blank(today)),[editing,setEditing]=useState(null);
 useEffect(()=>{
  const ev=focusId&&events.find(e=>e.id===focusId);
  if(ev&&ev.date){const [y,m]=ev.date.split('-').map(Number);setCursor({y,m:m-1});setSelected(ev.date);}
 },[focusId,events.length]);

 const cells=useMemo(()=>{
  const first=new Date(cursor.y,cursor.m,1),offset=(first.getDay()-weekStart()+7)%7;
  return Array.from({length:42},(_,i)=>{const d=new Date(cursor.y,cursor.m,1-offset+i);return {key:dayKey(d),day:d.getDate(),out:d.getMonth()!==cursor.m};});
 },[cursor,weekStart()]);
 const byDay=useMemo(()=>{
  const map={};
  const add=(k,item)=>{(map[k]??=[]).push(item);};
  events.forEach(e=>add(e.date,{...e,type:'event'}));
  // Interview and follow-up dates from the Job tracker.
  jobs.filter(j=>j.nextDate&&!['Rejected'].includes(j.status)).forEach(j=>add(j.nextDate,{id:j.id,title:j.company+' · '+(j.nextStep||'Follow up'),time:'',type:'job',color:'#7a6aa8',status:j.status}));
  // Bills and subscriptions: every due date in the six weeks on screen.
  {const from=cells[0].key,to=cells[cells.length-1].key;for(const b of bills)for(const d of occurrences(b,from,to))add(d,{id:b.id+d,title:b.name+' due',time:'',type:'bill',color:'#c9803f'});}
  tasks.filter(t=>t.date&&!t.repeat).forEach(t=>add(t.date,{id:t.id,title:t.title,time:t.reminder?.slice(11)||'',done:t.done,type:'task'}));
  Object.values(map).forEach(l=>l.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')));
  return map;
 },[events,tasks,jobs,bills,cells]);
 const upcoming=useMemo(()=>events.filter(e=>e.date>=today).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||''))).slice(0,6),[events,today]);

 const go=n=>setCursor(c=>{const d=new Date(c.y,c.m+n,1);return {y:d.getFullYear(),m:d.getMonth()};});
 const pick=key=>{setSelected(key);setEditing(null);setForm(blank(key));};
 const jumpToday=()=>{const d=new Date();setCursor({y:d.getFullYear(),m:d.getMonth()});pick(today);};
 const save=e=>{
  e.preventDefault();
  if(!form.title.trim()||!form.date)return;
  const item={...form,title:form.title.trim()};
  if(editing)setEvents(l=>l.map(x=>x.id===editing?{...x,...item}:x));
  else setEvents(l=>[...l,{...item,id:uid()}]);
  setSelected(form.date);setEditing(null);setForm(blank(form.date));
 };
 // The same box can add a to-do instead of an event, so nobody has to switch pages for it.
 const addAsTask=async()=>{
  const bridge=window.taskit;if(!bridge||!form.title.trim()||!form.date)return;
  const d=await bridge.load(),t={...newTask(form.title,'Today'),date:form.date,notes:form.note||'',...(form.time?{reminder:form.date+'T'+form.time}:{})};
  await bridge.save({tasks:[...(d.tasks||[]),t],listOrder:d.listOrder,theme:d.theme,covers:d.covers});
  setForm(blank(form.date));
 };
 const edit=ev=>{setEditing(ev.id);setForm({title:ev.title,date:ev.date,time:ev.time||'',end:ev.end||'',color:ev.color||COLORS[0],note:ev.note||''});};
 const remove=id=>{setEvents(l=>l.filter(x=>x.id!==id));if(editing===id){setEditing(null);setForm(blank(selected));}};
 const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
 const monthName=new Date(cursor.y,cursor.m,1).toLocaleDateString(dateLocale(),{month:'long',year:'numeric'});
 // Jump straight to any month of any year.
 const [picker,setPicker]=useState(false),[pickYear,setPickYear]=useState(cursor.y),[yearMode,setYearMode]=useState(false);
 const openPicker=()=>{setPickYear(cursor.y);setYearMode(false);setPicker(p=>!p);};
 const chooseMonth=m=>{setCursor({y:pickYear,m});setPicker(false);};
 const MONTHS=Array.from({length:12},(_,i)=>new Date(2000,i,1).toLocaleDateString(dateLocale(),{month:'short'}));
 const decade=Math.floor(pickYear/12)*12;
 const allDay=byDay[selected]||[],dayTasks=allDay.filter(i=>i.type==='task'),dayItems=allDay.filter(i=>i.type!=='task');

 return (
  <div className="calendar">
   <section className="cal-main">
    <div className="cal-head">
     <div className="cal-title">
      <button className={'cal-title-btn'+(picker?' open':'')} onClick={openPicker} aria-haspopup="dialog" aria-expanded={picker}><h2>{monthName}</h2><CaretDown size={15} weight="bold"/></button>
      {picker&&<>
       <div className="cal-picker-back" onMouseDown={()=>setPicker(false)}/>
       <div className="cal-picker" role="dialog" aria-label="Choose month and year">
        <div className="cp-head">
         <button className="icon-btn" aria-label={yearMode?'Earlier years':'Previous year'} onClick={()=>setPickYear(y=>y-(yearMode?12:1))}><CaretLeft size={15}/></button>
         <button className="cp-year" onClick={()=>setYearMode(m=>!m)}>{yearMode?decade+' – '+(decade+11):pickYear}<CaretDown size={12} weight="bold"/></button>
         <button className="icon-btn" aria-label={yearMode?'Later years':'Next year'} onClick={()=>setPickYear(y=>y+(yearMode?12:1))}><CaretRight size={15}/></button>
        </div>
        {yearMode
         ?<div className="cp-grid">{Array.from({length:12},(_,i)=>decade+i).map(y=><button key={y} className={y===cursor.y?'cur':y===new Date().getFullYear()?'now':''} onClick={()=>{setPickYear(y);setYearMode(false);}}>{y}</button>)}</div>
         :<div className="cp-grid">{MONTHS.map((n,i)=><button key={n} className={pickYear===cursor.y&&i===cursor.m?'cur':(pickYear===new Date().getFullYear()&&i===new Date().getMonth())?'now':''} onClick={()=>chooseMonth(i)}>{n}</button>)}</div>}
        <button className="ghost cp-today" onClick={()=>{jumpToday();setPicker(false);}}>Today</button>
       </div>
      </>}
     </div>
     <span className="spacer"/>
     <button className="ghost" onClick={jumpToday}>Today</button>
     <button className="icon-btn" aria-label="Previous month" onClick={()=>go(-1)}><CaretLeft size={16}/></button>
     <button className="icon-btn" aria-label="Next month" onClick={()=>go(1)}><CaretRight size={16}/></button>
    </div>
    <div className="cal-grid dow">{dowNames(DOW).map(d=><span key={d}>{d}</span>)}</div>
    <div className="cal-grid days">
     {cells.map(c=>{
      const items=byDay[c.key]||[];
      return (
       <button key={c.key} className={'cell'+(c.out?' out':'')+(c.key===today?' today':'')+(c.key===selected?' picked':'')} onClick={()=>{pick(c.key);if(c.out){const [y,m]=c.key.split('-');setCursor({y:+y,m:+m-1});}}}>
        <span className="num">{c.day}</span>
        {(()=>{
         // The side panel lists everything; a day cell only hints: a few dated things, and the tasks as one count.
         const tasks=items.filter(i=>i.type==='task'),others=items.filter(i=>i.type!=='task'),doneN=tasks.filter(t=>t.done).length;
         return <span className="chips">
          {others.slice(0,2).map(it=><span key={it.type+it.id} className={'chip '+it.type} style={{'--c':it.color||COLORS[0]}}>{it.title}</span>)}
          {others.length>2&&<span className="more">+{others.length-2} more</span>}
          {tasks.length>0&&<span className="task-count"><i/>{tasks.length===1?'1 task':doneN?doneN+'/'+tasks.length+' tasks':tasks.length+' tasks'}</span>}
         </span>;
        })()}
       </button>
      );
     })}
    </div>
   </section>
   <aside className="cal-side">
    <div className="side-card">
     <h3>{new Date(selected+'T00:00').toLocaleDateString(dateLocale(),{weekday:'long',day:'numeric',month:'long'})}</h3>
     <div className="agenda">
      {dayItems.map(it=>(
       <div key={it.type+it.id} className={'agenda-row '+it.type+(it.done?' done':'')} style={it.type!=='task'?{'--c':it.color||COLORS[0]}:undefined}>
        <span className="dot">{it.type==='task'&&it.done&&<Check size={9} weight="bold"/>}</span>
        <button className="agenda-main" disabled={it.type!=='event'} onClick={()=>edit(it)}>
         <b>{it.title}</b>
         <span className="muted">{it.type==='task'?'Task':it.type==='job'?'Job · '+it.status:it.type==='bill'?'Bill':'Event'}{it.time?` · ${it.time}${it.end?'–'+it.end:''}`:''}</span>
         {it.note&&<span className="muted note">{it.note}</span>}
        </button>
        {it.type==='event'&&<button className="icon-btn" aria-label="Delete event" onClick={()=>remove(it.id)}><Trash size={14}/></button>}
       </div>
      ))}
      {!dayItems.length&&!dayTasks.length&&<p className="muted">Nothing planned.</p>}
     </div>
     {dayTasks.length>0&&<div className={'acc'+(tasksOpen?' open':'')}>
      <button className="acc-head" aria-expanded={tasksOpen} aria-controls="cal-tasks-body" onClick={toggleTasks}>
       <Chev size={14} weight="bold"/><span>Tasks</span><em>{dayTasks.filter(t=>t.done).length?dayTasks.filter(t=>t.done).length+'/'+dayTasks.length:dayTasks.length}</em>
      </button>
      <div className="acc-body" id="cal-tasks-body" role="region"><div className="acc-inner agenda">
       {dayTasks.map(it=>(
        <div key={'task'+it.id} className={'agenda-row task'+(it.done?' done':'')}>
         <span className="dot">{it.done&&<Check size={9} weight="bold"/>}</span>
         <span className="agenda-main"><b>{it.title}</b></span>
        </div>
       ))}
      </div></div>
     </div>}
    </div>
    <form className="side-card" onSubmit={save}>
     <h3>{editing?'Edit event':'Add to this day'}</h3>
     <input placeholder="Title" value={form.title} onChange={set('title')}/>
     <div className="row2"><label>Date<DateField value={form.date} onChange={set('date')}/></label><label>Starts<TimeField value={form.time} onChange={set('time')}/></label><label>Ends<TimeField value={form.end} onChange={set('end')}/></label></div>
     <textarea rows={2} placeholder="Notes (optional)" value={form.note} onChange={set('note')}/>
     <div className="swatches">{COLORS.map(c=><button type="button" key={c} aria-label={'Colour '+c} className={form.color===c?'on':''} style={{background:c}} onClick={()=>setForm(f=>({...f,color:c}))}/>)}</div>
     <div className="form-actions">
      <button className="primary" type="submit" disabled={!form.title.trim()}><Plus size={15} weight="bold"/>{editing?'Save':'Add'}</button>
      {!editing&&<button type="button" className="ghost" disabled={!form.title.trim()} onClick={addAsTask}>Add as task</button>}
      {editing&&<button type="button" className="ghost" onClick={()=>{setEditing(null);setForm(blank(selected));}}>Cancel</button>}
     </div>
    </form>
    <div className="side-card">
     <h3>Coming up</h3>
     {upcoming.map(ev=>(
      <button key={ev.id} className="up-row" onClick={()=>{pick(ev.date);const [y,m]=ev.date.split('-');setCursor({y:+y,m:+m-1});}}>
       <span className="dot" style={{background:ev.color}}/>
       <b>{ev.title}</b>
       <span className="muted">{new Date(ev.date+'T00:00').toLocaleDateString(dateLocale(),{day:'numeric',month:'short'})}{ev.time?' · '+ev.time:''}</span>
      </button>
     ))}
     {!upcoming.length&&<p className="muted"><CalendarBlank size={14}/> No upcoming events.</p>}
    </div>
   </aside>
  </div>
 );
}
