import React,{useState,useCallback} from 'react';
import {CheckSquare,Check,Trash} from '@phosphor-icons/react';

// Select several things in a list and act on them together. Each page owns what "delete" means for its own items.
export function useBulk(){
 const [on,setOn]=useState(false),[sel,setSel]=useState(()=>new Set());
 const toggle=useCallback(id=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;}),[]);
 const stop=useCallback(()=>{setOn(false);setSel(new Set());},[]);
 const clear=useCallback(()=>setSel(new Set()),[]);
 const setAll=useCallback(ids=>setSel(new Set(ids)),[]);
 const prune=useCallback(ids=>setSel(s=>{const keep=new Set(ids);const n=new Set([...s].filter(x=>keep.has(x)));return n.size===s.size?s:n;}),[]);
 return {on,sel,count:sel.size,start:()=>setOn(true),stop,toggle,clear,setAll,prune,has:id=>sel.has(id)};
}

// The button that turns selecting on (or off again).
export function SelectToggle({bulk,disabled}){
 return <button className={'ghost select-toggle'+(bulk.on?' on':'')} data-tip="Pick several items to act on together." data-tip-title={bulk.on?'Cancel selecting':'Select'} disabled={disabled&&!bulk.on} onClick={()=>bulk.on?bulk.stop():bulk.start()}><CheckSquare size={15}/>{bulk.on?'Cancel':'Select'}</button>;
}

// A bar above the list: select all, how many are chosen, and the actions.
export function BulkBar({bulk,ids,noun='item',onDelete,deleteLabel='Delete',confirmDelete=false,children}){
 const [armed,setArmed]=useState(false);
 const all=ids.length>0&&ids.every(i=>bulk.has(i)),n=bulk.count;
 const plural=n===1?noun:noun+'s';
 const del=()=>{
  if(!n)return;
  if(confirmDelete&&!armed){setArmed(true);setTimeout(()=>setArmed(false),3000);return;}
  setArmed(false);onDelete([...bulk.sel]);
 };
 return (
  <div className="bulk-bar" role="toolbar" aria-label="Selected items">
   <button className={'bulk-all'+(all?' on':'')} onClick={()=>all?bulk.clear():bulk.setAll(ids)}>
    <span className="sel-box">{all&&<Check size={12} weight="bold"/>}</span><span className="bulk-full">Select all</span><span className="bulk-short">All</span><em>{ids.length}</em>
   </button>
   <span className="bulk-count"><span className="bulk-full">{n?n+' '+plural+' selected':'Choose '+noun+'s below'}</span><span className="bulk-short">{n?n+' selected':''}</span></span>
   <span className="spacer"/>
   {children}
   <button className={'bulk-delete'+(armed?' armed':'')} disabled={!n} onClick={del}><Trash size={14}/>{armed?<><span className="bulk-full">Click again to confirm</span><span className="bulk-short">Sure?</span></>:<><span className="bulk-full">{deleteLabel}</span><span className="bulk-short">{/trash/i.test(deleteLabel)?'Trash':/forever/i.test(deleteLabel)?'Delete':deleteLabel}</span></>}</button>
  </div>
 );
}

// Sits over a row or card while selecting: the whole thing becomes one big tick target.
export function SelectMark({bulk,id}){
 if(!bulk.on)return null;
 const on=bulk.has(id);
 return <button type="button" className={'sel-cover'+(on?' on':'')} aria-pressed={on} aria-label={on?'Unselect':'Select'} onClick={e=>{e.stopPropagation();bulk.toggle(id);}}><span className="sel-box">{on&&<Check size={12} weight="bold"/>}</span></button>;
}
