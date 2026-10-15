import React,{useEffect,useState} from 'react';
import {Bell,Check,X,Clock,BellSlash} from '@phosphor-icons/react';
import '@fontsource-variable/geist';
export function ReminderToast(){
 const [items,setItems]=useState([]);
 useEffect(()=>{const stop=window.taskit.onReminderQueue(setItems);window.taskit.reminderQueue().then(setItems);return stop;},[]);
 const task=items[0];
 if(!task)return null;
 const act=action=>window.taskit.reminderAction(task.id,action);
 return <main className="toast-root"><section className="side-reminder" role="alert" aria-live="assertive"><header><span className="toast-brand"><Bell size={16} weight="fill"/>ojo<span>Time for a little progress</span></span><button className="icon" aria-label="Dismiss reminder" onClick={()=>act('dismiss')}><X size={16}/></button></header><h1>{task.title}</h1><p>{items.length>1?`${items.length-1} more reminder${items.length>2?'s':''} waiting`:'One thing at a time.'}</p><div className="toast-actions"><button className="primary" onClick={()=>act('done')}><Check size={14}/>Done</button><button className="secondary" onClick={()=>act('snooze')}><Clock size={14}/>Snooze 10 min</button><button className="icon" aria-label="Mute reminders for 1 hour" onClick={()=>act('mute')}><BellSlash size={17}/></button></div></section></main>;
}
