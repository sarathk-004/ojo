import React,{useEffect,useMemo,useState} from 'react';
import {dateLocale} from './prefs.js';
import {TimeField} from './Pickers.jsx';
import {Plus,Trash,PencilSimple,BellRinging,Minus,Pause,Play} from '@phosphor-icons/react';
import {useCollection} from './hooks.js';
import {api} from './api.js';
import {Modal} from './Modal.jsx';
import {Select} from './Select.jsx';
import {Glyph} from './icons.jsx';
import {PRESETS,EMOJIS,DAY_NAMES,ALL_DAYS,newReminder,nextSlot,scheduleText,dayKey,fmtClock} from './nudges.mjs';

const lastDays=n=>Array.from({length:n},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(n-1-i));return dayKey(d.getTime());});
const nextText=(r,log)=>{
 if(!r.enabled)return 'Paused';
 const t=log?.nextAt>Date.now()?log.nextAt:nextSlot(r,Date.now());
 if(!t)return 'Nothing scheduled';
 const d=new Date(t),today=new Date(),sameDay=d.toDateString()===today.toDateString();
 const clock=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).toLowerCase();
 return 'Next '+(sameDay?clock:d.toLocaleDateString(dateLocale(),{weekday:'short'})+' '+clock);
};

function Form({initial,editing,onSave,onDelete}){
 const [f,setF]=useState(initial),[err,setErr]=useState(''),[confirm,setConfirm]=useState(false);
 const set=k=>e=>setF(s=>({...s,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
 // The interval is edited as a number plus a unit and stored in minutes.
 const [unit,setUnit]=useState(initial.every%60===0&&initial.every>=60?'h':'m');
 const [amount,setAmount]=useState(String(unit==='h'?initial.every/60:initial.every));
 const everyMin=Math.round((parseFloat(amount)||0)*(unit==='h'?60:1));
 const toggleDay=d=>setF(s=>({...s,days:s.days.includes(d)?s.days.filter(x=>x!==d):[...s.days,d].sort()}));
 const submit=e=>{
  e.preventDefault();
  if(!f.name.trim()){setErr('Give the repeater a name.');return;}
  if(everyMin<1){setErr('Choose how often it should repeat.');return;}
  if(f.to<=f.from){setErr('The end time must be after the start time.');return;}
  if(!f.days.length){setErr('Pick at least one day.');return;}
  onSave({...f,name:f.name.trim(),every:everyMin,goal:Math.max(0,parseInt(f.goal)||0),unit:f.unit.trim()});
 };
 return (
  <form className="nudge-form" onSubmit={submit}>
   {!editing&&<div className="preset-row">{PRESETS.map(p=><button type="button" key={p.name} className={f.name===p.name?'on':''} onClick={()=>{setF(s=>({...s,...p,days:s.days}));const h=p.every>=60&&p.every%60===0;setUnit(h?'h':'m');setAmount(String(h?p.every/60:p.every));setErr('');}}><span><Glyph name={p.emoji} size={16}/></span>{p.name.replace(/ \(.*\)/,'')}</button>)}</div>}
   <div className="emoji-row">{EMOJIS.map(e=><button type="button" key={e} className={f.emoji===e?'on':''} onClick={()=>setF(s=>({...s,emoji:e}))}><Glyph name={e} size={18}/></button>)}</div>
   <label>Name<input autoFocus value={f.name} onChange={e=>{setErr('');set('name')(e);}} placeholder="Drink water"/></label>
   <div className="three">
    <label>Repeat every<div className="inline"><input inputMode="decimal" value={amount} onChange={e=>{setErr('');setAmount(e.target.value);}}/><Select value={unit} onChange={setUnit} options={[{value:'m',label:'Min'},{value:'h',label:'Hours'}]}/></div></label>
    <label>From<TimeField value={f.from} onChange={e=>{setErr('');set('from')(e);}}/></label>
    <label>Until<TimeField value={f.to} onChange={e=>{setErr('');set('to')(e);}}/></label>
   </div>
   <div className="days-row">{DAY_NAMES.map((n,d)=><button type="button" key={n} className={f.days.includes(d)?'on':''} onClick={()=>{setErr('');toggleDay(d);}}>{n}</button>)}</div>
   <div className="two">
    <label>Daily goal (optional)<input inputMode="numeric" value={f.goal||''} onChange={set('goal')} placeholder="8"/></label>
    <label>What to count<input value={f.unit} onChange={set('unit')} placeholder="Glasses, Walks…"/></label>
   </div>
   <label className="check"><input type="checkbox" checked={f.sound!==false} onChange={set('sound')}/>Play a sound</label>
   {err&&<p className="error">{err}</p>}
   <div className="form-actions">
    <button className="primary" type="submit">{editing?'Save changes':'Add repeater'}</button>
    {editing&&<button type="button" className={'ghost danger'+(confirm?' armed':'')} onClick={()=>{if(!confirm){setConfirm(true);setTimeout(()=>setConfirm(false),2500);}else onDelete(initial.id);}}><Trash size={15}/>{confirm?'Click to confirm':'Delete'}</button>}
   </div>
  </form>
 );
}

function Ring({count,goal}){
 const R=30,C=2*Math.PI*R,pct=goal?Math.min(1,count/goal):0;
 return (
  <svg width="76" height="76" viewBox="0 0 76 76" className="ring">
   <circle cx="38" cy="38" r={R} fill="none" stroke="#e8e4d8" strokeWidth="8"/>
   <circle cx="38" cy="38" r={R} fill="none" stroke={pct>=1?'#4d8a52':'#567458'} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)} transform="rotate(-90 38 38)" style={{transition:'stroke-dashoffset .5s cubic-bezier(.3,1.3,.5,1)'}}/>
   <text x="38" y="44" textAnchor="middle" fontSize="19" fontWeight="700" fill="#252923" style={{letterSpacing:'-.05em'}}>{count}</text>
  </svg>
 );
}

export function Reminders(){
 const [list,setList,ready]=useCollection('reminders'),[logs]=useCollection('nudgelog');
 const [modal,setModal]=useState(null);
 // Re-render now and then so "Next 3:00 pm" and the day roll-over stay current.
 const [,tick]=useState(0);
 useEffect(()=>{const t=setInterval(()=>tick(x=>x+1),30000);return()=>clearInterval(t);},[]);
 const logOf=id=>logs.find(l=>l.id===id);
 const today=dayKey(Date.now()),week=useMemo(()=>lastDays(7),[today]);

 const save=f=>{
  setList(l=>l.some(x=>x.id===f.id)?l.map(x=>x.id===f.id?{...x,...f}:x):[...l,f]);
  setModal(null);
 };
 const remove=id=>{setList(l=>l.filter(x=>x.id!==id));setModal(null);};
 const flip=r=>setList(l=>l.map(x=>x.id===r.id?{...x,enabled:!x.enabled}:x));

 return (
  <div className="nudges">
   <header className="nudge-head">
    <div/>
    <span className="spacer"/>
    <button className="primary" onClick={()=>setModal(newReminder())}><Plus size={15} weight="bold"/>New repeater</button>
   </header>

   <div className="nudge-grid">
    {list.map(r=>{
     const l=logOf(r.id),count=(l?.days||{})[today]||0;
     return (
      <article key={r.id} className={'nudge-card'+(r.enabled?'':' paused')}>
       <div className="nudge-top">
        <span className="nudge-emoji"><Glyph name={r.emoji} size={24}/></span>
        <div className="nudge-title"><b>{r.name}</b><span className="muted">{scheduleText(r)}</span></div>
        <button className={'switch'+(r.enabled?' on':'')} role="switch" aria-checked={r.enabled} aria-label={r.enabled?'Pause':'Resume'} onClick={()=>flip(r)}><i/></button>
       </div>
       <div className="nudge-mid">
        {r.goal>0?<Ring count={count} goal={r.goal}/>:<div className="count-big"><b>{count}</b><span>today</span></div>}
        <div className="nudge-info">
         <b>{r.goal>0?`${count} of ${r.goal} ${r.unit||'done'}`:`${count} ${r.unit||'times'} today`}</b>
         <span className="muted">{nextText(r,l)}</span>
         <div className="nudge-log">
          <button className="icon-btn" aria-label="Remove one" disabled={!count} onClick={()=>api.nudgeLog(r.id,-1)}><Minus size={14}/></button>
          <button className="primary small" onClick={()=>api.nudgeLog(r.id,1)}><Plus size={13} weight="bold"/>Log one</button>
         </div>
        </div>
       </div>
       <div className="week">
        {week.map(d=>{
         const c=(l?.days||{})[d]||0,h=r.goal>0?Math.min(1,c/r.goal):Math.min(1,c/4);
         return <span key={d} className={'day'+(d===today?' now':'')} title={undefined}><i style={{height:Math.max(c?14:4,h*100)+'%'}} className={r.goal>0&&c>=r.goal?'hit':''}/><em>{DAY_NAMES[new Date(d+'T12:00').getDay()][0]}</em></span>;
        })}
       </div>
       <div className="nudge-foot">
        <button className="ghost" onClick={()=>api.nudgeTest(r.id)}><BellRinging size={14}/>Test</button>
        <button className="ghost" onClick={()=>setModal({...r})}><PencilSimple size={14}/>Edit</button>
       </div>
      </article>
     );
    })}
   </div>

   {ready&&!list.length&&<div className="empty-state small nudge-empty">
    <BellRinging size={34} weight="light"/>
    <h3>Nothing repeating yet</h3>
    <p className="muted">Start from one of these, or build your own.</p>
    <div className="preset-row">{PRESETS.map(p=><button key={p.name} onClick={()=>setModal(newReminder(p))}><span><Glyph name={p.emoji} size={16}/></span>{p.name.replace(/ \(.*\)/,'')}</button>)}</div>
   </div>}

   {modal&&<Modal wide title={list.some(x=>x.id===modal.id)?'Edit repeater':'New repeater'} onClose={()=>setModal(null)}>
    <Form initial={modal} editing={list.some(x=>x.id===modal.id)} onSave={save} onDelete={remove}/>
   </Modal>}
  </div>
 );
}
