import React,{useEffect} from 'react';
import {X} from '@phosphor-icons/react';

// A centred sheet over the workspace. Esc or a click outside closes it.
export function Modal({title,onClose,children,wide}){
 useEffect(()=>{
  const k=e=>{if(e.key==='Escape')onClose();};
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 },[onClose]);
 return (
  <div className="modal-back" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <div className={'modal'+(wide?' wide':'')} role="dialog" aria-label={title}>
    <header><h3>{title}</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={17}/></button></header>
    <div className="modal-body">{children}</div>
   </div>
  </div>
 );
}
