import React,{useEffect,useMemo,useRef,useState} from 'react';
import {DateField,TimeField} from './Pickers.jsx';
import {Plus,Trash,PencilSimple,Check,Repeat,Bell,CalendarBlank,Flame,Star,Timer,Cube,CheckSquare,X,Warning,MoonStars} from '@phosphor-icons/react';
import {belongs,dayKey,newTask,toggleTask,completedToday,habitStats,syncMasterDaily,masterDailyTask,normalizeListOrder,recurLabel,isDailyTask,firstDate,newSubtask,subtaskProgress,toggleSubtask,moveTask,snoozeDate} from '../tasks.mjs';
import {Select} from './Select.jsx';
import {Modal} from './Modal.jsx';
import {TaskBoard} from './TaskBoard.jsx';
import {Rows,Kanban} from '@phosphor-icons/react';
import {Shutdown} from './Shutdown.jsx';
import {TaskNote} from './TaskNote.jsx';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';
import {useUndo} from './Undo.jsx';

import {useCollection} from './hooks.js';
import {totalsByTask,fmtDur} from './focus.mjs';
const bridge=typeof window!=='undefined'?window.taskit:null;
const ICON={Today:Star,Upcoming:Timer,Anytime:Cube,Daily:Repeat};
const fmtDate=d=>d?new Date(d+'T00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'';

const WEEK=[[1,'M'],[2,'T'],[3,'W'],[4,'T'],[5,'F'],[6,'S'],[0,'S']];
const repeatKind=t=>!t.repeat?'none':(t.recur&&t.recur.type)||'daily';

function Editor({task,onSave,onCancel}){
 const [f,setF]=useState({title:task.title,date:task.date||'',time:task.reminder?task.reminder.slice(11,16):'',notes:task.notes||'',
  kind:repeatKind(task),days:(task.recur&&task.recur.days)||[],every:(task.recur&&task.recur.every)||2,subtasks:(task.subtasks||[]).map(x=>({...x})),sub:''});
 const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
 const toggleDay=d=>setF(s=>({...s,days:s.days.includes(d)?s.days.filter(x=>x!==d):[...s.days,d]}));
 const addSub=()=>{if(!f.sub.trim())return;setF(s=>({...s,subtasks:[...s.subtasks,newSubtask(s.sub)],sub:''}));};
 const submit=e=>{
  e.preventDefault();
  if(!f.title.trim())return;
  const repeat=f.kind!=='none';
  const recur=!repeat||f.kind==='daily'?undefined:f.kind==='weekly'?{type:'weekly',days:f.days.length?f.days:[new Date((f.date||dayKey())+'T12:00').getDay()]}:f.kind==='interval'?{type:'interval',every:Math.max(2,Number(f.every)||2)}:{type:'monthly'};
  // A repeating task always has a next due day.
  let date=f.date;
  if(repeat&&(!date||(recur&&recur.type==='weekly'&&!recur.days.includes(new Date(date+'T12:00').getDay()))))date=firstDate(recur||{type:'daily'},date||dayKey());
  const reminder=date&&f.time?`${date}T${f.time}`:'';
  const subs=[...f.subtasks,...(f.sub.trim()?[newSubtask(f.sub)]:[])].filter(x=>x.title.trim());
  onSave({title:f.title.trim(),date,reminder,repeat,recur,notes:f.notes,subtasks:subs.length?subs:undefined,...(reminder!==task.reminder?{notified:false}:{})});
 };
 return (
  <form className="task-edit" onSubmit={submit}>
   <input autoFocus placeholder="Title" value={f.title} onChange={set('title')}/>
   <div className="row3">
    <label>Date<DateField value={f.date} onChange={set('date')}/></label>
    <label>Reminder<TimeField value={f.time} onChange={set('time')} disabled={!f.date&&f.kind==='none'}/></label>
    <label>Repeat<Select block value={f.kind} onChange={v=>setF(s=>({...s,kind:v}))} options={[{value:'none',label:'Does not repeat'},{value:'daily',label:'Every day'},{value:'weekly',label:'Weekly on chosen days'},{value:'interval',label:'Every few days'},{value:'monthly',label:'Monthly'}]}/></label>
   </div>
   {f.kind==='weekly'&&<div className="week-pick">{WEEK.map(([d,l])=><button type="button" key={d} className={f.days.includes(d)?'on':''} onClick={()=>toggleDay(d)}>{l}</button>)}</div>}
   {f.kind==='interval'&&<label className="every-pick">Every <input type="number" min="2" max="365" value={f.every} onChange={set('every')}/> days</label>}
   {f.kind==='monthly'&&<p className="muted small-note">Repeats on the same day of the month as the date above.</p>}
   <div className="sub-edit">
    <span className="sub-h"><CheckSquare size={14}/>Checklist</span>
    {f.subtasks.map((x,i)=><div key={x.id} className="sub-row"><input value={x.title} onChange={e=>setF(s=>({...s,subtasks:s.subtasks.map((y,j)=>j===i?{...y,title:e.target.value}:y)}))}/><button type="button" className="icon-btn" aria-label="Remove item" onClick={()=>setF(s=>({...s,subtasks:s.subtasks.filter((_,j)=>j!==i)}))}><X size={13}/></button></div>)}
    <div className="sub-row"><input placeholder="Add an item and press Enter" value={f.sub} onChange={set('sub')} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSub();}}}/><button type="button" className="icon-btn" aria-label="Add item" onClick={addSub}><Plus size={13}/></button></div>
   </div>
   <textarea rows={2} placeholder="Notes" value={f.notes} onChange={set('notes')}/>
   <div className="form-actions"><button className="primary small" type="submit">Save</button><button type="button" className="ghost" onClick={onCancel}>Cancel</button></div>
  </form>
 );
}

export function Tasks({go,focusId}){
 const undo=useUndo();
 const [closing,setClosing]=useState(focusId==='shutdown');
 useEffect(()=>{if(focusId==='shutdown')setClosing(true);},[focusId]);
 const [noting,setNoting]=useState(null),[dragTab,setDragTab]=useState(null),[overTab,setOverTab]=useState(null),[data,setData]=useState(null),[view,setView]=useState('Today'),[quick,setQuick]=useState(''),[editing,setEditing]=useState(null),[open,setOpen]=useState(()=>new Set()),[subDraft,setSubDraft]=useState({}),[layout,setLayout]=useState(()=>{try{return localStorage.getItem('tnkr-ws-tasks-layout')==='board'?'board':'list';}catch{return 'list';}});
 const pickLayout=l=>{setLayout(l);try{localStorage.setItem('tnkr-ws-tasks-layout',l);}catch{}};
 const dataRef=useRef(null);
 const [focusLog]=useCollection('focus');
 const spent=useMemo(()=>Object.fromEntries(totalsByTask(focusLog).map(t=>[t.taskId,t.seconds])),[focusLog]);
 const today=dayKey();

 useEffect(()=>{
  if(!bridge)return;
  let live=true;
  bridge.load().then(d=>{if(live){dataRef.current=d;setData(d);}});
  // The widget (or a reminder) can change tasks while this window is open.
  const off=bridge.onState(next=>{dataRef.current=next;setData(next);});
  return()=>{live=false;off();};
 },[]);

 const commit=tasks=>{
  const next=syncMasterDaily({...dataRef.current,tasks});
  dataRef.current=next;setData(next);
  bridge.save({tasks:next.tasks,listOrder:next.listOrder,theme:next.theme,covers:next.covers});
 };
 const order=useMemo(()=>normalizeListOrder(data?.listOrder),[data?.listOrder]);
 // Finished one-off tasks stay in Today only on the day they were finished; open ones come first.
 const list=useMemo(()=>{
  const all=(data?.tasks||[]).filter(t=>belongs(t,view)&&!(view==='Today'&&!t.repeat&&t.done&&!(t.doneAt&&dayKey(new Date(t.doneAt))===today)));
  return [...all.filter(t=>!completedToday(t)),...all.filter(t=>completedToday(t))];
 },[data,view,today]);
 const reorderTabs=(from,to)=>{
  if(from===to||!order.includes(from)||!order.includes(to))return;
  const next=order.filter(v=>v!==from);next.splice(order.indexOf(to),0,from);
  const d={...dataRef.current,listOrder:next};dataRef.current=d;setData(d);
  bridge.save({tasks:d.tasks,listOrder:next,theme:d.theme,covers:d.covers});
 };
 // The board shows every task of the open list, including what was finished today.
 const boardTasks=useMemo(()=>(data?.tasks||[]).filter(t=>belongs(t,view)||(view==='Today'&&!t.repeat&&t.done&&t.doneAt&&dayKey(new Date(t.doneAt))===today)),[data,view,today]);
 const bulk=useBulk();
 useEffect(()=>{bulk.clear();},[view]);
 // Delete or finish many at once; deleting puts everything back with one Undo.
 const bulkDelete=ids=>{
  const all=dataRef.current.tasks,gone=all.map((t,i)=>ids.includes(t.id)?{t,i}:null).filter(Boolean);
  commit(all.filter(t=>!ids.includes(t.id)));bulk.stop();
  undo.show(gone.length+(gone.length===1?' task':' tasks')+' deleted',()=>{const cur=dataRef.current.tasks.filter(t=>!gone.some(g=>g.t.id===t.id));gone.forEach(({t,i})=>cur.splice(Math.min(i,cur.length),0,t));commit(cur);});
 };
 const bulkDone=ids=>{commit(dataRef.current.tasks.map(t=>ids.includes(t.id)&&!completedToday(t)?toggleTask(t):t));bulk.stop();};
 const removeTask=t=>{
  const list0=dataRef.current.tasks,at=list0.findIndex(x=>x.id===t.id);
  commit(list0.filter(x=>x.id!==t.id));
  undo.show('“'+t.title+'” deleted',()=>{const cur=dataRef.current.tasks;if(cur.some(x=>x.id===t.id))return;const n=[...cur];n.splice(Math.min(at,n.length),0,t);commit(n);});
 };
 const counts=useMemo(()=>Object.fromEntries(order.map(v=>[v,(data?.tasks||[]).filter(t=>belongs(t,v)&&!completedToday(t)).length])),[data,order]);
 const dailies=(data?.tasks||[]).filter(t=>t.repeat);
 const doneToday=dailies.filter(t=>completedToday(t)).length;
 const master=useMemo(()=>habitStats(masterDailyTask(data?.masterDaily)),[data]);

 const patchTask=(id,change)=>commit(data.tasks.map(t=>t.id===id?{...t,...change}:t));
 const toggleOpen=id=>setOpen(s=>{const x=new Set(s);x.has(id)?x.delete(id):x.add(id);return x;});
 const addSubTo=t=>{const text=(subDraft[t.id]||'').trim();if(!text)return;patchTask(t.id,{subtasks:[...(t.subtasks||[]),newSubtask(text)]});setSubDraft(d=>({...d,[t.id]:''}));};
 // Snooze: move a task to another day, keeping its reminder time.
 const moveTo=(t,date)=>patchTask(t.id,moveTask(t,date));
 const overdue=(data?.tasks||[]).filter(t=>!t.repeat&&!t.done&&t.date&&t.date<today);
 const moveAll=date=>commit(data.tasks.map(t=>overdue.some(o=>o.id===t.id)?moveTask(t,date):t));
 // Board: dropping a card in a column changes its state.
 const moveCard=(t,col)=>{
  const was=completedToday(t);
  let next=was&&col!=='done'?toggleTask(t):t;
  if(!was&&col==='done')next=toggleTask(t);
  next={...next,status:col==='doing'?'doing':undefined};
  patchTask(t.id,next);
  if(col==='done'&&!was)undo.show('“'+t.title+'” done',()=>commit(dataRef.current.tasks.map(x=>x.id===t.id?t:x)));
 };
 const add=e=>{
  e.preventDefault();
  if(!quick.trim())return;
  // Same rule as the widget: new tasks go to the bottom of the list they were added in.
  commit([...data.tasks,newTask(quick,view)]);setQuick('');
 };

 if(!bridge)return <div className="empty-state"><h3>Tasks live in the desktop app</h3><p className="muted">Open the workspace from ojo to see and edit your to-dos here.</p></div>;
 if(!data)return <div className="empty-state"><p className="muted">Loading…</p></div>;
 const ring=dailies.length?doneToday/dailies.length:0;

 return (
  <div className="tasks">
   <section className="tasks-main">
    <div className="tasks-head"><h2>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h2><span className="spacer"/><div className="seg-toggle layout-toggle" role="group" aria-label="Layout"><button className={layout==='list'?'on':''} aria-label="List view" onClick={()=>pickLayout('list')}><Rows size={15}/>List</button><button className={layout==='board'?'on':''} aria-label="Board view" onClick={()=>pickLayout('board')}><Kanban size={15}/>Board</button></div>{layout==='list'&&<SelectToggle bulk={bulk} disabled={!list.length}/>}<button className="ghost close-day-btn" data-tip="See what you did, move what is left, start tomorrow clean." data-tip-title="Close the day" onClick={()=>setClosing(true)}><MoonStars size={15} weight="fill"/>Close the day</button></div>
    <div className="task-tabs">
     {order.map(v=>{const I=ICON[v];return <button key={v} draggable className={(view===v?'on':'')+(dragTab===v?' dragging':'')+(overTab===v&&dragTab&&dragTab!==v?' over-tab':'')} onClick={()=>{setView(v);setEditing(null);}} onDragStart={e=>{setDragTab(v);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/tnkr-tab',v);}} onDragOver={e=>{if(dragTab){e.preventDefault();setOverTab(v);}}} onDrop={e=>{e.preventDefault();reorderTabs(dragTab,v);setDragTab(null);setOverTab(null);}} onDragEnd={()=>{setDragTab(null);setOverTab(null);}} onKeyDown={e=>{if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const i=order.indexOf(v),j=i+(e.key==='ArrowLeft'?-1:1);if(order[j])reorderTabs(v,order[j]);}}}><I size={15} weight={view===v?'fill':'regular'}/>{v}<em>{counts[v]}</em></button>;})}
    </div>
    {overdue.length>0&&view==='Today'&&<div className="overdue-bar"><Warning size={16} weight="fill"/><b>{overdue.length} overdue</b><span className="spacer"/><button onClick={()=>moveAll(today)}>All to today</button><button onClick={()=>moveAll(snoozeDate('tomorrow'))}>All to tomorrow</button></div>}
    {bulk.on&&<BulkBar bulk={bulk} ids={list.map(t=>t.id)} noun="task" onDelete={bulkDelete}><button className="bulk-act" disabled={!bulk.count} onClick={()=>bulkDone([...bulk.sel])}><Check size={14} weight="bold"/>Mark done</button></BulkBar>}
    {layout==='board'&&<>
     <TaskBoard tasks={boardTasks} onMove={moveCard} onEdit={setEditing} onDelete={removeTask}/>
     {editing&&<Modal title="Edit task" onClose={()=>setEditing(null)}><Editor task={dataRef.current.tasks.find(x=>x.id===editing)||{title:''}} onCancel={()=>setEditing(null)} onSave={c=>{patchTask(editing,c);setEditing(null);}}/></Modal>}
    </>}
    {layout==='list'&&<div className="task-list-ws">
     {list.map(t=>{
      const done=completedToday(t),streak=t.repeat?habitStats(t).current:0;
      return editing===t.id
       ?<Editor key={t.id} task={t} onCancel={()=>setEditing(null)} onSave={c=>{patchTask(t.id,c);setEditing(null);}}/>
       :<div key={t.id} className={'task-row'+(done?' done':'')+((open.has(t.id)||noting===t.id||(!t.repeat&&!done&&t.date&&t.date<today))?' tall':'')+(bulk.on?' sel-host sel-tasks':'')} onClick={e=>{if(bulk.on)return;if(e.target.closest('button,input,a,textarea,[contenteditable],.sub-list,.snooze-row,.task-note-rich'))return;setNoting(n=>n===t.id?null:t.id);}}>
         <SelectMark bulk={bulk} id={t.id}/>
         <button className={'tick'+(done?' on':'')} aria-label={done?'Mark not done':'Mark done'} onClick={()=>{patchTask(t.id,toggleTask(t));if(!done)undo.show('“'+t.title+'” done',()=>commit(dataRef.current.tasks.map(x=>x.id===t.id?toggleTask(x):x)));}}>{done&&<Check size={13} weight="bold"/>}</button>
         <div className="task-text">
          <b>{t.title}</b>
          <span className="task-meta">
           {t.date&&(!t.repeat||t.date>today)&&<span className={!t.repeat&&t.date<today&&!done?'late':''}><CalendarBlank size={12}/>{!t.repeat&&t.date<today&&!done?'Overdue · ':t.repeat?'Starts ':''}{fmtDate(t.date)}</span>}
           {t.reminder&&<span><Bell size={12}/>{t.reminder.slice(11,16)}</span>}
           {t.repeat&&<span><Repeat size={12}/>{recurLabel(t)}</span>}
           {t.subtasks?.length>0&&<button type="button" className={'sub-chip'+(subtaskProgress(t).done===subtaskProgress(t).total?' all':'')} onClick={()=>toggleOpen(t.id)}><CheckSquare size={12}/>{subtaskProgress(t).done}/{subtaskProgress(t).total}</button>}
           {spent[t.id]>0&&<span className="task-focus"><Timer size={12}/>{fmtDur(spent[t.id])} focused</span>}
           {streak>0&&isDailyTask(t)&&<span className="streak"><Flame size={12} weight="fill"/>{streak}-day streak</span>}
          </span>
          <TaskNote task={t} open={noting===t.id} onSave={notes=>patchTask(t.id,{notes})} onClose={()=>setNoting(null)}/>          {t.subtasks?.length>0&&open.has(t.id)&&<div className="sub-list">
           {t.subtasks.map(x=><label key={x.id} className={'sub-item'+(x.done?' done':'')}><input type="checkbox" checked={x.done} onChange={()=>patchTask(t.id,toggleSubtask(t,x.id))}/><span>{x.title}</span></label>)}
           <div className="sub-add"><input placeholder="Add item" value={subDraft[t.id]||''} onChange={e=>setSubDraft(d=>({...d,[t.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSubTo(t);}}}/></div>
          </div>}
          {!t.repeat&&!done&&t.date&&t.date<today&&<div className="snooze-row">
           <span>Move to</span>
           <button onClick={()=>moveTo(t,today)}>Today</button><button onClick={()=>moveTo(t,snoozeDate('tomorrow'))}>Tomorrow</button><button onClick={()=>moveTo(t,snoozeDate('weekend'))}>Weekend</button><button onClick={()=>moveTo(t,snoozeDate('nextweek'))}>Next week</button>
          </div>}
         </div>
         {!done&&go&&<button className="icon-btn" aria-label="Focus on this task" onClick={()=>go('focus',t.id)}><Timer size={15}/></button>}
         <button className="icon-btn" aria-label="Edit" onClick={()=>setEditing(t.id)}><PencilSimple size={15}/></button>
         <button className="icon-btn danger" aria-label="Delete" onClick={()=>removeTask(t)}><Trash size={15}/></button>
        </div>;
     })}
     {!list.length&&<p className="muted pad">{view==='Today'?'A little space to begin.':'Nothing here yet.'}</p>}
    </div>}
    <form className="task-add" onSubmit={add}>
     <input placeholder={`Add a task${view==='Today'?' for today':view==='Daily'?' that repeats daily':''}…`} value={quick} onChange={e=>setQuick(e.target.value)}/>
     <button className="primary round" aria-label="Add task" disabled={!quick.trim()}><Plus size={16} weight="bold"/></button>
    </form>
   </section>
   <aside className="tasks-side">
    <div className="side-card habit-card">
     <h3>Daily habits</h3>
     <div className="ring-wrap">
      <svg width="104" height="104" viewBox="0 0 104 104"><circle cx="52" cy="52" r="44" fill="none" stroke="#e4e0d2" strokeWidth="9"/><circle cx="52" cy="52" r="44" fill="none" stroke="#567458" strokeWidth="9" strokeLinecap="round" strokeDasharray={2*Math.PI*44} strokeDashoffset={2*Math.PI*44*(1-ring)} transform="rotate(-90 52 52)" style={{transition:'stroke-dashoffset .6s cubic-bezier(.3,1.4,.5,1)'}}/></svg>
      <div className="ring-num"><b>{doneToday}</b><span>of {dailies.length}</span></div>
     </div>
     <div className="stat-row"><div><b>{master.current}</b><span>current streak</span></div><div><b>{master.best}</b><span>best</span></div><div><b>{master.total}</b><span>perfect days</span></div></div>
     <div className="heat">{master.days.map(d=><i key={d.date} className={d.done?'on':''}/>)}</div>
     <p className="muted">A perfect day means every scheduled daily habit is done.</p>
    </div>
   </aside>
   {closing&&<div className="sheet-back" onMouseDown={e=>{if(e.target===e.currentTarget)setClosing(false);}}><div className="sheet" role="dialog" aria-label="Close the day"><Shutdown go={go} onClose={()=>setClosing(false)}/></div></div>}
   {undo.node}
  </div>
 );
}
