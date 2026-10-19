import React,{useEffect,useMemo,useState} from 'react';
import {dateLocale} from './prefs.js';
import {CaretLeft,CaretRight,Trophy,CheckCircle,Flame,Timer,Wallet,PiggyBank,NotePencil,ArrowUp,ArrowDown,Receipt,Briefcase,BookmarkSimple,CalendarBlank} from '@phosphor-icons/react';
import {useCollection} from './hooks.js';
import {api} from './api.js';
import {weeklyStats,weekRange,shiftWeek,dayStr} from './review.mjs';
import {occurrences} from './bills.mjs';
import {fmtDur} from './focus.mjs';
import {CountNum} from './Motion.jsx';
import {catOf,fmtMoney} from './finance.mjs';

const bridge=typeof window!=='undefined'?window.taskit:null;
const short=d=>new Date(d+'T12:00').toLocaleDateString(dateLocale(),{day:'numeric',month:'short'});
const DAY_L=['M','T','W','T','F','S','S'];

// The week at a glance, built only from what ojo actually recorded.
const Stat=({icon:I,label,value,note,tone})=>(<div className={'rv-stat '+(tone||'')}><span>{label}</span><b>{value}</b>{note&&<em>{note}</em>}</div>);

export function Review({go}){
 const [anchor,setAnchor]=useState(dayStr(new Date())),[tasks,setTasks]=useState([]);
 const [finance]=useCollection('finance'),[focus]=useCollection('focus'),[notes]=useCollection('notes'),[saved]=useCollection('saved'),[jobs]=useCollection('jobs'),[events]=useCollection('events'),[bills]=useCollection('bills'),[settings]=useCollection('settings'),[wins]=useCollection('wins'),[reviews,setReviews]=useCollection('reviews');
 useEffect(()=>{if(!bridge)return;bridge.load().then(d=>setTasks(d.tasks||[]));return bridge.onState(d=>setTasks(d.tasks||[]));},[]);
 const sym=settings[0]?.currency||'₹',today=dayStr(new Date());
 const s=useMemo(()=>weeklyStats({tasks,finance,focus,notes,saved,jobs,events,wins},anchor),[tasks,finance,focus,notes,saved,jobs,events,wins,anchor]);
 const r=s.range,isThis=r.start===weekRange(today).start;
 const next=weekRange(shiftWeek(anchor,1));
 const upcoming=useMemo(()=>{
  const list=[];
  for(const b of bills)for(const d of occurrences(b,next.start,next.end))list.push({d,label:b.name,kind:'bill',amount:b.amount});
  for(const e of events)if(e.date>=next.start&&e.date<=next.end)list.push({d:e.date,label:e.title,kind:'event'});
  return list.sort((a,b)=>a.d.localeCompare(b.d)).slice(0,8);
 },[bills,events,next.start,next.end]);
 const overdue=tasks.filter(t=>!t.done&&!t.repeat&&t.date&&t.date<today).length;

 // My review: three short prompts, saved per week and kept with that week.
 const mine=reviews.find(x=>x.start===r.start)||{};
 const saveMine=change=>setReviews(l=>{
  const cur=l.find(x=>x.start===r.start);
  const next={...(cur||{id:r.start,start:r.start}),...change,updated:Date.now()};
  return cur?l.map(x=>x.start===r.start?next:x):[next,...l];
 });
 const filled=[mine.well,mine.change,mine.next].filter(x=>x&&x.trim()).length;

 const maxCat=Math.max(1,...s.money.topCats.map(c=>c.amount));

 return (
  <div className="review">
   <header className="rv-head">
    <div/>
    <span className="spacer"/>
    <div className="rv-nav">
     <button className="icon-btn" aria-label="Previous week" onClick={()=>setAnchor(a=>shiftWeek(a,-1))}><CaretLeft size={16}/></button>
     <b>{isThis?'This week · ':''}{short(r.start)} – {short(r.end)}</b>
     <button className="icon-btn" aria-label="Next week" disabled={isThis||r.start>today} onClick={()=>setAnchor(a=>shiftWeek(a,1))}><CaretRight size={16}/></button>
    </div>
   </header>

   <div className="rv-stats">
    <Stat icon={CheckCircle} label="Tasks finished" value={<CountNum value={s.tasks.finished.length}/>} note={overdue?overdue+' overdue now':''}/>
    <Stat icon={Flame} label="Habits kept" value={s.tasks.habitRate!=null?<><CountNum value={s.tasks.habitRate}/>%</>:'—'} note={s.tasks.habitPossible?s.tasks.habitTotal+' of '+s.tasks.habitPossible+' check-ins':'No daily habits'}/>
    <Stat icon={Timer} label="Focus time" value={fmtDur(s.focus.seconds)} note={s.focus.sessions+' sessions'}/>
    <Stat icon={Wallet} label="Spent" value={fmtMoney(s.money.expense,sym)} note={s.money.change!=null?<>{s.money.change>0?<ArrowUp size={11}/>:<ArrowDown size={11}/>}{Math.abs(s.money.change)}% vs last week</>:'no data last week'} tone={s.money.change>0?'warn':''}/>
    <Stat icon={PiggyBank} label="Kept" value={fmtMoney(s.money.saved,sym)} note={'earned '+fmtMoney(s.money.income,sym)} tone={s.money.saved<0?'warn':'good'}/>
   </div>

   <section className="rv-write">
    <h4><NotePencil size={16} weight="duotone"/>My review<em>{filled}/3 written</em></h4>
    <div className="rv-prompts">
     <label>What went well<textarea rows={3} placeholder="Wins, progress, things you are proud of…" value={mine.well||''} onChange={e=>saveMine({well:e.target.value})}/></label>
     <label>What I will change<textarea rows={3} placeholder="What got in the way, what to do differently…" value={mine.change||''} onChange={e=>saveMine({change:e.target.value})}/></label>
     <label>Top three for next week<textarea rows={3} placeholder="1.&#10;2.&#10;3." value={mine.next||''} onChange={e=>saveMine({next:e.target.value})}/></label>
    </div>
    {mine.updated&&<span className="muted rv-saved">Saved {new Date(mine.updated).toLocaleString(dateLocale(),{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</span>}
   </section>

   <div className="rv-grid">
    <section className="rv-card">
     <h4>Finished this week</h4>
     {s.tasks.finished.map(t=><div className="rv-line" key={t.id}><CheckCircle size={15} weight="fill"/><span>{t.title}</span><em>{new Date(t.at).toLocaleDateString(dateLocale(),{weekday:'short'})}</em></div>)}
     {!s.tasks.finished.length&&<p className="muted">Nothing recorded yet. From now on, every task you finish is logged with the day, so this fills in as you go.</p>}
    </section>

    <section className="rv-card">
     <h4>Daily habits</h4>
     {s.tasks.habits.length>0&&<div className="rv-habit head"><span/>{DAY_L.map((l,i)=><i key={i} className={r.days[i]===today?'now':''}>{l}</i>)}</div>}
     {s.tasks.habits.map(h=><div className="rv-habit" key={h.id}><span>{h.title}</span>{h.days.map((d,i)=><i key={i} className={d?'on':''}/>)}</div>)}
     {!s.tasks.habits.length&&<p className="muted">Add a task to the Daily list and it is tracked here.</p>}
    </section>

    <section className="rv-card">
     <h4>Money</h4>
     {s.money.topCats.map(c=><div className="rv-cat" key={c.category}><span>{catOf(c.category).name}</span><div className="rv-bar"><i style={{width:Math.round(c.amount/maxCat*100)+'%',background:catOf(c.category).color}}/></div><b>{fmtMoney(c.amount,sym)}</b></div>)}
     {!s.money.topCats.length&&<p className="muted">No spending recorded this week.</p>}
     {s.money.biggest&&<p className="rv-note">Biggest: <b>{s.money.biggest.note||catOf(s.money.biggest.category).name}</b> · {fmtMoney(s.money.biggest.amount,sym)}</p>}
     {s.bills.paidCount>0&&<p className="rv-note"><Receipt size={13}/> {s.bills.paidCount} bill{s.bills.paidCount===1?'':'s'} paid · {fmtMoney(s.bills.paidTotal,sym)}</p>}
    </section>

    <section className="rv-card">
     <h4>Focus</h4>
     {s.focus.top.map((t,i)=><div className="rv-cat" key={i}><span>{t.title}</span><div className="rv-bar"><i style={{width:Math.round(t.seconds/s.focus.top[0].seconds*100)+'%'}}/></div><b>{fmtDur(t.seconds)}</b></div>)}
     {!s.focus.top.length&&<p className="muted">No focus sessions this week. Start one from the Focus page.</p>}
    </section>

    {s.wins.length>0&&<section className="rv-card">
     <h4>Wins</h4>
     {s.wins.map(w=><div className="rv-line" key={w.id}><Trophy size={15} weight="fill"/><span>{w.text}</span><em>{new Date(w.day+'T12:00').toLocaleDateString(dateLocale(),{weekday:'short'})}</em></div>)}
    </section>}

    <section className="rv-card">
     <h4>Elsewhere in ojo</h4>
     <div className="rv-other">
      <span><NotePencil size={15}/>{s.other.notesMade} notes written<em>{s.other.notesEdited} edited</em></span>
      <span><BookmarkSimple size={15}/>{s.other.savedAdded} saved</span>
      <span><Briefcase size={15}/>{s.other.jobsApplied} applications<em>{s.other.jobMoves} stage changes</em></span>
      <span><CalendarBlank size={15}/>{s.other.events} calendar events</span>
     </div>
    </section>

    <section className="rv-card">
     <h4>Coming up next week</h4>
     {upcoming.map((u,i)=><div className="rv-line" key={i}>{u.kind==='bill'?<Receipt size={15}/>:<CalendarBlank size={15}/>}<span>{u.label}{u.amount?' · '+fmtMoney(Number(u.amount),sym):''}</span><em>{new Date(u.d+'T12:00').toLocaleDateString(dateLocale(),{weekday:'short',day:'numeric'})}</em></div>)}
     {!upcoming.length&&<p className="muted">Nothing due or scheduled yet.</p>}
    </section>
   </div>
  </div>
 );
}
