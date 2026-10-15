import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,CaretLeft,CaretRight,Check,X} from '@phosphor-icons/react';
import {dayKey} from './tasks.mjs';

export function DatePicker({value,onChange,onClose}){
 const [month,setMonth]=useState(()=>{const d=value?new Date(`${value}T12:00:00`):new Date();return new Date(d.getFullYear(),d.getMonth(),1);});
 const start=(month.getDay()+6)%7,days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const pick=date=>{onChange(date);onClose();};
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 return <div className="picker-panel" role="dialog" aria-label="Choose task date">
  <div className="panel-title"><button className="icon back-btn" aria-label="Back to edit" onClick={onClose}><ArrowLeft size={17}/></button><h2>A day for this task</h2><button type="button" className="icon close-popup" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
  <div className="calendar-heading"><button className="icon" aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><CaretLeft size={15}/></button><strong aria-live="polite">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button className="icon" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><CaretRight size={15}/></button></div>
  <div className="calendar-grid">{['M','T','W','T','F','S','S'].map((d,i)=><span className="weekday" key={'w'+i}>{d}</span>)}{Array.from({length:start},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const date=dayKey(new Date(month.getFullYear(),month.getMonth(),i+1));return <button key={date} className={`${date===value?'selected':''} ${date===dayKey()?'today':''}`} aria-label={new Date(date+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'full'})} aria-pressed={date===value} onClick={()=>pick(date)}>{i+1}</button>;})}</div>
  <div className="calendar-shortcuts"><button onClick={()=>pick(dayKey())}>Today</button><button onClick={()=>pick(dayKey(tomorrow))}>Tomorrow</button><button onClick={()=>pick('')}>No date</button></div>
 </div>;
}

export function TimePicker({value,onChange,onClose}){
 const [time,setTime]=useState(value||'09:00'),columns=useRef(null);
 useEffect(()=>{columns.current?.querySelectorAll('[aria-pressed=true]').forEach(el=>{el.parentElement.scrollTop=el.offsetTop-el.parentElement.clientHeight/2+el.offsetHeight/2;});},[]);
 const [hour,minute]=time.split(':');
 return <div className="picker-panel" role="dialog" aria-label="Choose reminder time">
  <div className="panel-title"><button className="icon back-btn" aria-label="Back to edit" onClick={onClose}><ArrowLeft size={17}/></button><h2>A little nudge at…</h2><strong className="selected-time">{time}</strong><button type="button" className="icon close-popup" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
  <div className="time-labels"><span>Hour · 24-hour</span><span>Minute</span></div>
  <div className="time-columns" ref={columns}>{[[24,hour,'hour'],[60,minute,'minute']].map(([count,selected,label],column)=><div className="time-options scroll-area" key={label} role="group" aria-label={label}>{Array.from({length:count},(_,i)=>{const n=String(i).padStart(2,'0');return <button key={n} aria-pressed={selected===n} onClick={()=>setTime(column?`${hour}:${n}`:`${n}:${minute}`)}>{n}{selected===n&&<Check size={12}/>}</button>;})}</div>)}</div>
  <button className="primary time-apply" onClick={()=>{onChange(time);onClose();}}>Set reminder<Check size={13}/></button>
 </div>;
}
