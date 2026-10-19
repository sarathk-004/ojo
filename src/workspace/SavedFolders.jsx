import React,{useEffect,useRef,useState} from 'react';
import {FolderSimple,Plus,PencilSimple,Trash,Check,X,Bell,BellSlash} from '@phosphor-icons/react';
import {uid} from './hooks.js';
import {Modal} from './Modal.jsx';
import {DateField,TimeField} from './Pickers.jsx';
import {STARTER_FOLDERS,remindOptions,remindLabel,folderCount,unfiled} from './savedlib.mjs';

// Folder chips for Saved: open one, make a new one, rename or delete the open one.
export function FolderBar({folders,setFolders,items,current,setCurrent,onDeleted}){
 const [adding,setAdding]=useState(false),[name,setName]=useState(''),[renaming,setRenaming]=useState(false),[confirm,setConfirm]=useState(false);
 const input=useRef(null);
 useEffect(()=>{if(adding||renaming)input.current?.focus();},[adding,renaming]);
 useEffect(()=>{setConfirm(false);setRenaming(false);},[current]);
 const make=n=>{const t=n.trim().slice(0,40);if(!t||folders.some(f=>f.name.toLowerCase()===t.toLowerCase()))return null;const f={id:uid(),name:t,created:Date.now()};setFolders(l=>[...l,f]);return f;};
 const submit=e=>{e.preventDefault();if(renaming){const t=name.trim().slice(0,40);if(t)setFolders(l=>l.map(f=>f.id===current?{...f,name:t}:f));setRenaming(false);}else{const f=make(name);if(f)setCurrent(f.id);setAdding(false);}setName('');};
 const cur=folders.find(f=>f.id===current);
 const remove=()=>{onDeleted(current);setFolders(l=>l.filter(f=>f.id!==current));setCurrent('all');setConfirm(false);};
 return (
  <div className="folder-bar"><span className="fb-label">Folders</span>
   <button className={'filter'+(current==='all'?' on':'')} onClick={()=>setCurrent('all')}>Everything</button>
   {folders.map(f=><button key={f.id} className={'filter'+(current===f.id?' on':'')} onClick={()=>setCurrent(f.id)}><FolderSimple size={13}/>{f.name}<em>{folderCount(items,f.id)}</em></button>)}
   {folders.length>0&&unfiled(items)>0&&<button className={'filter'+(current==='none'?' on':'')} onClick={()=>setCurrent('none')}>No folder<em>{unfiled(items)}</em></button>}
   {(adding||renaming)
    ?<form className="folder-new" onSubmit={submit}><FolderSimple size={14}/><input ref={input} value={name} maxLength={40} placeholder={renaming?'Folder name':'Name your folder'} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){setAdding(false);setRenaming(false);setName('');}}}/><button className="fn-ok" disabled={!name.trim()}>{renaming?'Save':'Create'}</button><button type="button" className="fn-x" aria-label="Cancel" onClick={()=>{setAdding(false);setRenaming(false);setName('');}}><X size={13}/></button></form>
    :<button className="link-btn" onClick={()=>setAdding(true)}><Plus size={13}/>New folder</button>}
   {cur&&!renaming&&!adding&&<>
    <button className="icon-btn" aria-label="Rename folder" onClick={()=>{setName(cur.name);setRenaming(true);}}><PencilSimple size={14}/></button>
    {confirm
     ?<span className="folder-ask"><button className="ask-yes" autoFocus onClick={remove}>Delete folder</button><button className="ask-no" onClick={()=>setConfirm(false)}>Keep</button><em>Items stay in Saved.</em></span>
     :<button className="icon-btn danger" aria-label="Delete folder" onClick={()=>setConfirm(true)}><Trash size={14}/></button>}
   </>}
   {!folders.length&&!adding&&<span className="muted folder-hint">Try:{STARTER_FOLDERS.map(n=><button key={n} className="link-btn" onClick={()=>make(n)}>{n}</button>)}</span>}
  </div>
 );
}

// A small floating menu used for "Move to folder" and "Remind me". Positioned from the button that opened it.
export function PickMenu({menu,folders,onFolder,onRemind,onNewFolder,onClose}){
 const ref=useRef(null);
 useEffect(()=>{
  const down=e=>{if(!ref.current?.contains(e.target))onClose();};
  const key=e=>{if(e.key==='Escape')onClose();};
  setTimeout(()=>window.addEventListener('pointerdown',down),0);window.addEventListener('keydown',key);
  return()=>{window.removeEventListener('pointerdown',down);window.removeEventListener('keydown',key);};
 },[]);
 const [draft,setDraft]=useState('');
 const w=232,left=Math.max(8,Math.min(menu.x-w+24,window.innerWidth-w-8));
 const top=menu.y+8+300>window.innerHeight?Math.max(8,menu.y-308):menu.y+8;
 return (
  <div className="pick-menu" ref={ref} style={{left,top,width:w}} role="menu">
   {menu.kind==='folder'&&<>
    <p className="pm-title">Move to folder</p>
    {folders.map(f=><button key={f.id} role="menuitem" className={menu.current===f.id?'on':''} onClick={()=>onFolder(f.id)}><FolderSimple size={14}/>{f.name}{menu.current===f.id&&<Check size={13}/>}</button>)}
    {menu.current&&<button role="menuitem" onClick={()=>onFolder('')}><X size={14}/>Take out of folder</button>}
    <form className="pm-new" onSubmit={e=>{e.preventDefault();if(draft.trim())onNewFolder(draft);}}><input value={draft} maxLength={40} placeholder="Name a new folder" onChange={e=>setDraft(e.target.value)}/><button className="pm-create" disabled={!draft.trim()}>Create</button></form>
   </>}
   {menu.kind==='remind'&&<>
    <p className="pm-title">Remind me</p>
    {remindOptions().map(o=><button key={o.id} role="menuitem" onClick={()=>onRemind(o.at)}><Bell size={14}/>{o.label}<span className="muted">{remindLabel(o.at)}</span></button>)}
    <button role="menuitem" onClick={()=>onRemind('custom')}><PencilSimple size={14}/>Pick date and time…</button>
    {menu.remindAt&&<button role="menuitem" onClick={()=>onRemind(0)}><BellSlash size={14}/>Clear reminder<span className="muted">{remindLabel(menu.remindAt)}</span></button>}
   </>}
  </div>
 );
}

// Choose any date and time for a reminder.
export function CustomRemind({initial,onSet,onClose}){
 const d0=initial?new Date(initial):new Date(Date.now()+3600000);
 const pad=n=>String(n).padStart(2,'0');
 const [date,setDate]=useState(d0.getFullYear()+'-'+pad(d0.getMonth()+1)+'-'+pad(d0.getDate())),[time,setTime]=useState(pad(d0.getHours())+':'+pad(d0.getMinutes()));
 const at=date&&time?new Date(date+'T'+time).getTime():NaN;
 const past=!Number.isNaN(at)&&at<=Date.now();
 return (
  <Modal title="Remind me" onClose={onClose}>
   <form className="remind-form" onSubmit={e=>{e.preventDefault();if(!Number.isNaN(at)&&!past)onSet(at);}}>
    <label>Date<DateField value={date} onChange={e=>setDate(e.target.value)} clearable={false}/></label>
    <label>Time<TimeField value={time} onChange={e=>setTime(e.target.value)} clearable={false}/></label>
    {past&&<p className="error">That time has passed. Pick a later one.</p>}
    <div className="form-actions"><button className="primary" disabled={Number.isNaN(at)||past}>Set reminder</button><button type="button" className="ghost" onClick={onClose}>Cancel</button></div>
   </form>
  </Modal>
 );
}
