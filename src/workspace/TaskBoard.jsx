import React,{useState} from 'react';
import {PencilSimple,Trash,CheckSquare,CalendarBlank,Repeat} from '@phosphor-icons/react';
import {completedToday,subtaskProgress} from '../tasks.mjs';

export const COLUMNS=[{id:'todo',name:'To do'},{id:'doing',name:'In progress'},{id:'done',name:'Done'}];
export const columnOf=t=>completedToday(t)?'done':t.status==='doing'?'doing':'todo';
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';

// A three-column board for the tasks of the open list. Drag a card to change its column.
export function TaskBoard({tasks,onMove,onEdit,onDelete}){
 const [drag,setDrag]=useState(null),[over,setOver]=useState('');
 const drop=col=>{const t=tasks.find(x=>x.id===drag);setDrag(null);setOver('');if(t&&columnOf(t)!==col)onMove(t,col);};
 return (
  <div className="tboard">
   {COLUMNS.map(c=>{
    const cards=tasks.filter(t=>columnOf(t)===c.id);
    return (
     <section key={c.id} className={'tb-col tb-'+c.id+(over===c.id?' over':'')} onDragOver={e=>{e.preventDefault();setOver(c.id);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver('');}} onDrop={e=>{e.preventDefault();drop(c.id);}}>
      <header><h4><i className="tb-dot"/>{c.name}</h4><span>{cards.length}</span></header>
      <div className="tb-cards">
       {cards.map(t=>{const p=t.subtasks?.length?subtaskProgress(t):null;return (
        <article key={t.id} draggable className={'tb-card'+(drag===t.id?' dragging':'')} onDragStart={e=>{setDrag(t.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',t.id);}} onDragEnd={()=>{setDrag(null);setOver('');}}>
         <b className="tb-title">{t.title}</b>
         <div className="tb-foot">
         <div className="tb-meta">
          {t.date&&<span><CalendarBlank size={12}/>{fmt(t.date)}</span>}
          {t.repeat&&<span><Repeat size={12}/>Repeats</span>}
          {p&&<span><CheckSquare size={12}/>{p.done}/{p.total}</span>}
         </div>
         <div className="tb-acts">
          <button className="icon-btn" aria-label="Edit" onClick={()=>onEdit(t.id)}><PencilSimple size={14}/></button>
          <button className="icon-btn danger" aria-label="Delete" onClick={()=>onDelete(t)}><Trash size={14}/></button>
         </div>
         </div>
        </article>
       );})}
       {!cards.length&&<p className="tb-empty">{c.id==='done'?'Finished tasks land here.':'Drop a task here.'}</p>}
      </div>
     </section>
    );
   })}
  </div>
 );
}
