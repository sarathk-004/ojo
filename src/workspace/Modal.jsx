import React,{useCallback,useEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import {X} from '@phosphor-icons/react';
import {dialogIn,backdropIn} from './motionkit.jsx';

// A centred sheet over the workspace. Esc or a click outside closes it.
// Closing from inside (Esc, the backdrop, the close button) plays a short exit before the parent removes it.
export function Modal({title,onClose,children,wide}){
 const [leaving,setLeaving]=useState(false),closeRef=useRef(onClose),panel=useRef(null);
 closeRef.current=onClose;
 const close=useCallback(()=>setLeaving(true),[]);
 useEffect(()=>{
  const k=e=>{if(e.key==='Escape')close();};
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 },[close]);
 // Keep keyboard focus inside the dialog when it opens
 useEffect(()=>{const el=panel.current;if(el&&!el.contains(document.activeElement))el.focus({preventScroll:true});},[]);
 return (
  <motion.div className="modal-back" variants={backdropIn} initial="initial" animate={leaving?'exit':'animate'} onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
   <motion.div ref={panel} tabIndex={-1} className={'modal'+(wide?' wide':'')} role="dialog" aria-modal="true" aria-label={title} variants={dialogIn} initial="initial" animate={leaving?'exit':'animate'} onAnimationComplete={v=>{if(v==='exit')closeRef.current();}}>
    <header><h3>{title}</h3><button className="icon-btn" aria-label="Close" onClick={close}><X size={17}/></button></header>
    <div className="modal-body">{children}</div>
   </motion.div>
  </motion.div>
 );
}
