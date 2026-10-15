import React,{useState} from 'react';
import {ArrowLeft,CaretLeft,CaretRight,X} from '@phosphor-icons/react';
import {habitStats,habitMonth,dayKey,masterDailyTask} from './tasks.mjs';
import './habits.css';
export function Habits({tasks,masterDaily={},initialId,onBack,now}){
 const habits=[masterDailyTask(masterDaily),...tasks.filter(t=>t.repeat||t.completions?.length)],[selected,setSelected]=useState(initialId||'__master_daily__'),[inspect,setInspect]=useState(null);
 const task=habits.find(t=>t.id===selected)||habits[0],stats=task&&habitStats(task,now);
 const [month,setMonth]=useState(()=>new Date(now.getFullYear(),now.getMonth(),1,12));
 const calendar=task&&habitMonth(task,month.getFullYear(),month.getMonth(),now),monthName=month.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
 const changeMonth=delta=>{setMonth(m=>new Date(m.getFullYear(),m.getMonth()+delta,1,12));setInspect(null);};
 const progress=masterDaily[dayKey(now)],inspected=inspect&&masterDaily[inspect];
 return <><div className="panel-title"><button className="icon back-btn" aria-label="Back to tasks" onClick={onBack}><ArrowLeft size={17}/></button><h2>Little by little</h2><button type="button" className="icon close-popup" aria-label="Close" onClick={onBack}><X size={18}/></button></div><div className="habit-content scroll-area">
 {!task?<div className="empty"><h3>A little every day.</h3><p>Add a task to Daily, or turn on Repeat daily in Edit. Each completion will leave a mark here.</p></div>:<>
 <div className="habit-tabs horizontal-scroll" data-wheel-horizontal="true" role="group" aria-label="Daily habits">{habits.map(t=><button key={t.id} aria-pressed={t.id===task.id} onClick={()=>{setSelected(t.id);setInspect(null);}}>{t.title}</button>)}</div>
 {task.master&&<div className="master-progress"><strong>{progress?.required.length?`${progress.completed.length} of ${progress.required.length} daily tasks done today`:'No daily tasks scheduled for today'}</strong><span>{progress?.required.length?'Complete every scheduled habit to earn today’s mark.':'Add your first habit in Daily to start tracking.'}</span></div>}
 <div className="habit-stats"><span><strong>{stats.current}</strong>day streak</span><span><strong>{stats.best}</strong>best streak</span><span><strong>{stats.total}</strong>days done</span></div>
 <div className="habit-heading"><h3>Your daily marks</h3></div>
 <div className="habit-month-heading"><button className="icon" aria-label="Previous month" onClick={()=>changeMonth(-1)}><CaretLeft size={14}/></button><strong>{monthName}</strong><button className="icon" aria-label="Next month" onClick={()=>changeMonth(1)}><CaretRight size={14}/></button></div>
 <div className="habit-month-grid" role="group" aria-label={`${monthName} completion history for ${task.title}`}>{['M','T','W','T','F','S','S'].map((d,i)=><span className="weekday" key={'w'+i}>{d}</span>)}{Array.from({length:calendar.offset},(_,i)=><span key={'blank'+i} aria-hidden="true"/>)}{calendar.days.map(d=><button key={d.date} className={`${d.done?'filled':''} ${d.future?'future':''} ${d.date===dayKey(now)?'today':''}`} aria-label={`${d.date}: ${d.done?'completed':d.future?'future date':'no completion recorded'}`} aria-pressed={inspect===d.date} onClick={()=>setInspect(d.date)}>{d.day}</button>)}</div>
 <p className="habit-caption">{inspect?`${new Date(inspect+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${task.master&&inspected?`${inspected.completed.length} of ${inspected.required.length} completed`:calendar.days.find(d=>d.date===inspect)?.done?'Completed':inspect>dayKey(now)?'Future date':'No completion recorded'}`:`${calendar.total} ${calendar.total===1?'day':'days'} ${task.master?'fully completed':'completed'} in ${month.toLocaleDateString('en-GB',{month:'long'})}`}</p>
 <div className="habit-heading"><h3>{task.master?'All-done days':'Growing consistency'}</h3><span>Days / week</span></div>
 <svg className="habit-chart" viewBox="0 0 240 84" role="img" aria-label={`Weekly completions, oldest to newest: ${stats.weeks.join(', ')}. Maximum seven per week.`}><line x1="12" y1="10" x2="230" y2="10"/><line x1="12" y1="66" x2="230" y2="66"/><text x="0" y="13">7</text><text x="0" y="69">0</text><path d={`M ${stats.weeks.map((n,i)=>`${14+i*19.5},${66-n*8}`).join(' L ')}`} fill="none"/>{stats.weeks.map((n,i)=><circle key={i} cx={14+i*19.5} cy={66-n*8} r="2.5"/>)}<text x="12" y="82">12 weeks ago</text><text x="195" y="82">This week</text></svg>
 <p className="habit-footnote">{task.master?'One mark means every habit scheduled for that day was completed. Master history starts with this update; past daily totals stay saved.':'A record of showing up, one day at a time. Past activity starts from your first recorded completion.'}</p>
 </>}
 </div></>;
}
