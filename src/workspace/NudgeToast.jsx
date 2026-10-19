import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import '@fontsource-variable/geist';
import './nudge.css';
import {api} from './api.js';
import {Glyph} from './icons.jsx';

// The pop-up for a repeating reminder: shows the first one waiting, with Done / Snooze / Skip.
export function NudgeToast(){
 const [items,setItems]=useState([]),card=useRef(null),shown=useRef('');
 useEffect(()=>{
  document.documentElement.style.background='transparent';document.body.style.background='transparent';
  api.nudgeQueue().then(setItems);
  return api.onNudgeQueue(setItems);
 },[]);
 const cur=items[0];
 // Slide up whenever a different reminder takes the top spot.
 useEffect(()=>{
  if(!cur||!card.current||shown.current===cur.id)return;
  shown.current=cur.id;
  gsap.fromTo(card.current,{y:30,opacity:0,scale:.96},{y:0,opacity:1,scale:1,duration:.5,ease:'power3.out'});
  gsap.fromTo('.emoji',{scale:.4,rotate:-20},{scale:1,rotate:0,duration:.6,ease:'back.out(2.2)',delay:.1});
 },[cur?.id]);
 // Tell the main process where the buttons are once the card has settled, so a click Windows does not
 // deliver to this window can still be recognised.
 useEffect(()=>{
  if(!cur)return;
  const t=setTimeout(()=>{
   const rects=[...document.querySelectorAll('.btns button')].map(b=>{const r=b.getBoundingClientRect();return {action:b.dataset.action,x:r.left,y:r.top,w:r.width,h:r.height};});
   api.nudgeRects(rects);
  },700);
  return()=>clearTimeout(t);
 },[cur?.id,items.length]);
 if(!cur)return null;
 const act=a=>{
  gsap.to(card.current,{y:20,opacity:0,duration:.22,ease:'power2.in',onComplete:()=>{shown.current='';api.nudgeAction(cur.id,a);}});
 };
 const dots=cur.goal>0?Math.min(cur.goal,12):0;
 return (
  <div className="nudge-wrap">
   <div ref={card} className="nudge-card-toast">
    <div className="row">
     <span className="emoji"><Glyph name={cur.emoji} size={26} weight="fill"/></span>
     <div className="txt">
      <b>{cur.name}</b>
      <span>{cur.goal>0?`${cur.count} of ${cur.goal} ${cur.unit||'done'} today`:`Time for a quick one`}</span>
     </div>
     {items.length>1&&<em className="more">+{items.length-1}</em>}
    </div>
    {dots>0&&<div className="pips">{Array.from({length:dots},(_,i)=><i key={i} className={i<cur.count?'on':''}/>)}</div>}
    <div className="btns">
     <button className="done" data-action="done" onClick={()=>act('done')}>Done</button>
     <button data-action="snooze" onClick={()=>act('snooze')}>Snooze {cur.snooze||10} min</button>
     <button className="quiet" data-action="dismiss" onClick={()=>act('dismiss')}>Skip</button>
    </div>
   </div>
  </div>
 );
}
