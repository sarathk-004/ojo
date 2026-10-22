import React,{useState,useEffect,useId} from 'react';
import {Star,Trash,ArrowCounterClockwise} from '@phosphor-icons/react';
import {Pill} from './motionkit.jsx';

// Shared by Notes, Saved and PDFs: All / Favorites / Trash. Deleting only moves an item to Trash
// (it gets a `deleted` timestamp); it is removed for good from Trash, or automatically after 30 days.
export const TRASH_DAYS=30;
export const isLive=i=>!i.deleted;
export const expired=(i,now=Date.now())=>!!i.deleted&&now-i.deleted>TRASH_DAYS*86400000;
export function modeCounts(list){
 let all=0,fav=0,trash=0;
 for(const i of list){if(i.deleted)trash++;else{all++;if(i.favorite)fav++;}}
 return {all,fav,trash};
}
export const inMode=(i,mode)=>mode==='trash'?!!i.deleted:!i.deleted&&(mode!=='fav'||!!i.favorite);
export const daysLeft=i=>Math.max(0,Math.ceil(TRASH_DAYS-(Date.now()-i.deleted)/86400000));

export function ShelfTabs({mode,setMode,counts,onEmpty,compact}){
 const [asking,setAsking]=useState(false),pid=useId();
 useEffect(()=>{setAsking(false);},[mode,counts.trash]);
 const tab=(id,label,n,icon)=>(
  <button key={id} role="tab" aria-selected={mode===id} className={mode===id?'on':''} onClick={()=>setMode(id)}>{mode===id&&<Pill group={'shelf'+pid}/>}{icon}{label}{n>0&&<em>{n}</em>}</button>
 );
 return (
  <div className={'shelf-tabs'+(compact?' compact':'')}>
   <div className="seg" role="tablist">
    {tab('all','All',counts.all)}
    {tab('fav','Favorites',counts.fav,<Star size={12} weight="fill"/>)}
    {tab('trash','Trash',counts.trash,<Trash size={12}/>)}
   </div>
   {mode==='trash'&&counts.trash>0&&!asking&&<button className="link-btn danger" onClick={()=>setAsking(true)}>Empty trash</button>}
   {mode==='trash'&&counts.trash>0&&asking&&<span className="trash-ask" role="alertdialog" aria-label="Empty trash"><span>Delete {counts.trash} {counts.trash===1?'item':'items'} forever? This cannot be undone.</span><button className="link-btn" onClick={()=>setAsking(false)}>Cancel</button><button className="link-btn danger solid" onClick={()=>{setAsking(false);onEmpty();}}>Delete forever</button></span>}
  </div>
 );
}
export const FavButton=({on,onClick})=>(
 <button className={'icon-btn fav'+(on?' on':'')} aria-label={on?'Remove from favorites':'Add to favorites'} aria-pressed={!!on} onClick={e=>{e.stopPropagation();onClick();}}><Star size={15} weight={on?'fill':'regular'}/></button>
);
export const RestoreButton=({onClick,label='Restore'})=>(
 <button className="ghost small restore" onClick={e=>{e.stopPropagation();onClick();}}><ArrowCounterClockwise size={14}/>{label}</button>
);
export const trashNote=mode=>mode==='trash'?'Items stay here for '+TRASH_DAYS+' days, then they are removed for good.':'';
