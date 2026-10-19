import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {dateLocale,weekStart,dowNames} from './prefs.js';
import {createPortal} from 'react-dom';
import {CalendarBlank,Clock,CaretLeft,CaretRight,X} from '@phosphor-icons/react';

// Date and time fields in the workspace's own look, in place of the browser's native pickers.
// They keep the same shape as <input>: value is 'YYYY-MM-DD' / 'HH:MM', and onChange receives {target:{value}}.
const pad=n=>String(n).padStart(2,'0');
const keyOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=k=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(k||'');return m?new Date(+m[1],+m[2]-1,+m[3],12):null;};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW=['Mo','Tu','We','Th','Fr','Sa','Su'];

function usePopover(open,close,anchor,width,height){
 const [pos,setPos]=useState(null),box=useRef(null);
 useLayoutEffect(()=>{
  if(!open||!anchor.current)return;
  const r=anchor.current.getBoundingClientRect(),room=window.innerHeight-r.bottom,up=room<height+14&&r.top>room;
  setPos({left:Math.max(8,Math.min(r.left,window.innerWidth-width-8)),top:up?undefined:r.bottom+6,bottom:up?window.innerHeight-r.top+6:undefined});
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const down=e=>{if(!box.current?.contains(e.target)&&!anchor.current?.contains(e.target))close();};
  const away=e=>{if(!box.current?.contains(e.target))close();};
  window.addEventListener('mousedown',down);window.addEventListener('resize',close);window.addEventListener('wheel',away,{passive:true,capture:true});
  return()=>{window.removeEventListener('mousedown',down);window.removeEventListener('resize',close);window.removeEventListener('wheel',away,{capture:true});};
 },[open]);
 return {pos,box};
}
const host=()=>document.querySelector('.ws')||document.body;

export function DateField({value,onChange,placeholder='Pick a date',disabled,clearable=true,className=''}){
 const btn=useRef(null),[open,setOpen]=useState(false);
 const sel=parse(value),base=sel||new Date();
 const [view,setView]=useState({y:base.getFullYear(),m:base.getMonth()});
 const {pos,box}=usePopover(open,()=>setOpen(false),btn,296,350);
 useEffect(()=>{if(open){const b=parse(value)||new Date();setView({y:b.getFullYear(),m:b.getMonth()});setTimeout(()=>box.current?.focus(),0);}},[open]);
 const pick=k=>{onChange({target:{value:k}});setOpen(false);btn.current?.focus();};
 const today=keyOf(new Date());
 const first=new Date(view.y,view.m,1,12),offset=(first.getDay()-weekStart()+7)%7;
 const cells=Array.from({length:42},(_,i)=>{const d=new Date(view.y,view.m,1-offset+i,12);return {key:keyOf(d),day:d.getDate(),out:d.getMonth()!==view.m};});
 const shift=n=>setView(v=>{const d=new Date(v.y,v.m+n,1,12);return {y:d.getFullYear(),m:d.getMonth()};});
 const move=n=>{const d=parse(value)||new Date();d.setDate(d.getDate()+n);onChange({target:{value:keyOf(d)}});setView({y:d.getFullYear(),m:d.getMonth()});};
 const onKey=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);btn.current?.focus();}
  else if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowRight'){e.preventDefault();move(1);}
  else if(e.key==='ArrowUp'){e.preventDefault();move(-7);}
  else if(e.key==='ArrowDown'){e.preventDefault();move(7);}
  else if(e.key==='PageUp'){e.preventDefault();shift(-1);}
  else if(e.key==='PageDown'){e.preventDefault();shift(1);}
  else if(e.key==='Enter'){e.preventDefault();setOpen(false);btn.current?.focus();}
 };
 return (
  <>
   <button type="button" ref={btn} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} className={'field-btn '+className+(open?' open':'')+(sel?'':' empty')} onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} onKeyDown={e=>{if(!open&&['ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();setOpen(true);}}}>
    <span className="field-label">{sel?sel.toLocaleDateString(dateLocale(),{weekday:'short',day:'numeric',month:'short',year:'numeric'}):placeholder}</span>
    <CalendarBlank size={15}/>
   </button>
   {open&&pos&&createPortal(
    <div ref={box} className="pk pk-date" style={pos} tabIndex={-1} onKeyDown={onKey} onMouseDown={e=>e.preventDefault()}>
     <div className="pk-head">
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={()=>shift(-1)}><CaretLeft size={15}/></button>
      <b>{MONTHS[view.m]} {view.y}</b>
      <button type="button" className="icon-btn" aria-label="Next month" onClick={()=>shift(1)}><CaretRight size={15}/></button>
     </div>
     <div className="pk-dow">{dowNames(DOW).map(d=><span key={d}>{d}</span>)}</div>
     <div className="pk-days">{cells.map(c=><button type="button" key={c.key} className={'pk-day'+(c.out?' out':'')+(c.key===today?' now':'')+(c.key===value?' on':'')} onClick={()=>pick(c.key)}>{c.day}</button>)}</div>
     <div className="pk-foot"><button type="button" className="link-btn" onClick={()=>pick(today)}>Today</button>{clearable&&value&&<button type="button" className="link-btn muted-btn" onClick={()=>pick('')}><X size={12}/>Clear</button>}</div>
    </div>,host())}
  </>
 );
}

export function TimeField({value,onChange,placeholder='--:--',disabled,clearable=true,className=''}){
 const btn=useRef(null),hours=useRef(null),mins=useRef(null),[open,setOpen]=useState(false);
 const m=/^(\d{2}):(\d{2})$/.exec(value||''),h=m?+m[1]:null,mi=m?+m[2]:null;
 const {pos,box}=usePopover(open,()=>setOpen(false),btn,172,300);
 useEffect(()=>{
  if(!open)return;
  const t=setTimeout(()=>{hours.current?.querySelector('.on')?.scrollIntoView({block:'center'});mins.current?.querySelector('.on')?.scrollIntoView({block:'center'});},30);
  return()=>clearTimeout(t);
 },[open,pos]);
 const set=(hh,mm)=>onChange({target:{value:`${pad(hh)}:${pad(mm)}`}});
 const minutes=[...Array(12).keys()].map(i=>i*5);
 return (
  <>
   <button type="button" ref={btn} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} className={'field-btn '+className+(open?' open':'')+(m?'':' empty')} onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}>
    <span className="field-label">{m?value:placeholder}</span><Clock size={15}/>
   </button>
   {open&&pos&&createPortal(
    <div ref={box} className="pk pk-time" style={pos} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();e.stopPropagation();setOpen(false);btn.current?.focus();}}} onMouseDown={e=>e.preventDefault()}>
     <div className="pk-cols">
      <div className="pk-col" ref={hours}>{Array.from({length:24},(_,i)=><button type="button" key={i} className={h===i?'on':''} onClick={()=>set(i,mi??0)}>{pad(i)}</button>)}</div>
      <div className="pk-col" ref={mins}>{minutes.map(i=><button type="button" key={i} className={mi===i?'on':''} onClick={()=>{set(h??9,i);setOpen(false);}}>{pad(i)}</button>)}</div>
     </div>
     <div className="pk-foot"><button type="button" className="link-btn" onClick={()=>{const d=new Date();set(d.getHours(),Math.round(d.getMinutes()/5)*5%60);setOpen(false);}}>Now</button>{clearable&&value&&<button type="button" className="link-btn muted-btn" onClick={()=>{onChange({target:{value:''}});setOpen(false);}}><X size={12}/>Clear</button>}</div>
    </div>,host())}
  </>
 );
}
