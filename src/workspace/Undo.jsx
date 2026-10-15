import React,{useCallback,useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {ArrowUUpLeft,Check} from '@phosphor-icons/react';

// A small "Marked done · Undo" toast. show(message, undo) displays it for a few seconds.
export function useUndo(){
 const [t,setT]=useState(null),timer=useRef(null);
 const hide=useCallback(()=>{clearTimeout(timer.current);setT(null);},[]);
 const show=useCallback((message,undo)=>{
  clearTimeout(timer.current);
  setT({message,undo,id:Math.random()});
  timer.current=setTimeout(()=>setT(null),6000);
 },[]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const node=t?<UndoToast key={t.id} message={t.message} onUndo={()=>{t.undo();hide();}}/>:null;
 return {show,node};
}
function UndoToast({message,onUndo}){
 const el=useRef(null);
 useEffect(()=>{gsap.fromTo(el.current,{y:24,opacity:0,scale:.96},{y:0,opacity:1,scale:1,duration:.35,ease:'back.out(1.6)'});},[]);
 return (
  <div className="undo-toast" ref={el} role="status">
   <Check size={15} weight="bold"/><span>{message}</span>
   <button onClick={onUndo}><ArrowUUpLeft size={14}/>Undo</button>
  </div>
 );
}
