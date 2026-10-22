import React,{useCallback,useEffect,useRef,useState} from 'react';
import {motion,AnimatePresence} from 'motion/react';
import {ArrowUUpLeft,Check,X} from '@phosphor-icons/react';
import {SPRING,EASE} from './motionkit.jsx';

// "Marked done · Undo" toasts. show(message, undo) adds one; up to three stack at the bottom of the page,
// the newest in front and the two before it tucked behind. Pointing at the stack fans it out and pauses the timers.
// The stacking and fan-out follow Bencho's free "Toast stack" block (MIT, bencho.dev), rebuilt on ojo's tokens.
const LIFE=6000,AFTER_HOVER=2500,SHOWN=3,H=42,GAP=8,PEEK=8;
let seq=0;

export function useUndo(){
 const [list,setList]=useState([]);
 const timers=useRef(new Map()),hovering=useRef(false);
 const drop=useCallback(id=>{clearTimeout(timers.current.get(id));timers.current.delete(id);setList(l=>l.filter(t=>t.id!==id));},[]);
 const arm=useCallback((id,ms)=>{clearTimeout(timers.current.get(id));timers.current.set(id,setTimeout(()=>drop(id),ms));},[drop]);
 const show=useCallback((message,undo)=>{
  const id=++seq;
  setList(l=>{const next=[{id,message,undo},...l];next.slice(SHOWN).forEach(t=>{clearTimeout(timers.current.get(t.id));timers.current.delete(t.id);});return next.slice(0,SHOWN);});
  if(!hovering.current)arm(id,LIFE);
 },[arm]);
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current.clear();},[]);
 const pause=on=>{
  hovering.current=on;
  if(on){timers.current.forEach(clearTimeout);timers.current.clear();}
  else list.forEach((t,i)=>arm(t.id,AFTER_HOVER+i*400));
 };
 const node=<ToastStack list={list} onUndo={t=>{t.undo();drop(t.id);}} onDismiss={drop} onHover={pause}/>;
 return {show,node};
}

function ToastStack({list,onUndo,onDismiss,onHover}){
 const [open,setOpen]=useState(false),root=useRef(null);
 const n=list.length,many=n>1;
 useEffect(()=>{if(!n&&open){setOpen(false);onHover(false);}},[n]);
 const place=k=>open&&many?{y:-k*(H+GAP),scale:1,opacity:1}:{y:-Math.min(k,SHOWN-1)*PEEK,scale:1-Math.min(k,SHOWN-1)*.05,opacity:k<SHOWN?1-k*.18:0};
 const frame=open&&many?n*H+(n-1)*GAP:H+(Math.min(n,SHOWN)-1)*PEEK;
 const enter=()=>{if(!open){setOpen(true);onHover(true);}};
 const leave=e=>{const to=e.relatedTarget;if(!to||!root.current?.contains(to)){setOpen(false);onHover(false);}};
 return (
  <div ref={root} className="toast-stack" role="region" aria-label="Notifications" style={{height:n?frame:0}}
   onPointerOver={enter} onPointerOut={leave} onFocus={enter} onBlur={leave}>
   <AnimatePresence initial={false}>
    {list.map((t,k)=>{
     const p=place(k),front=k===0;
     return (
      <motion.div key={t.id} className="undo-toast" role="status" style={{height:H,zIndex:SHOWN-k}}
       initial={{y:16,opacity:0,scale:1}} animate={p} exit={{y:p.y+10,opacity:0,transition:{duration:.16,ease:EASE.in}}} transition={SPRING}
       aria-hidden={!open&&!front?true:undefined}>
       <Check size={15} weight="bold"/><span>{t.message}</span>
       <button tabIndex={open||front?0:-1} onClick={()=>onUndo(t)}><ArrowUUpLeft size={14}/>Undo</button>
       <button className="toast-x" tabIndex={open||front?0:-1} aria-label="Dismiss" onClick={()=>onDismiss(t.id)}><X size={13}/></button>
      </motion.div>
     );
    })}
   </AnimatePresence>
  </div>
 );
}
