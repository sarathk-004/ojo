import React,{useEffect,useRef} from 'react';
import {gsap} from 'gsap';

// A number that counts up to its value when it appears or changes.
export function CountNum({value,format=n=>Math.round(n)}){
 const el=useRef(null),from=useRef(0);
 useEffect(()=>{
  const target=Number(value)||0,o={v:from.current};
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){if(el.current)el.current.textContent=String(format(target));from.current=target;return;}
  const tw=gsap.to(o,{v:target,duration:.7,ease:'power2.out',onUpdate:()=>{if(el.current)el.current.textContent=String(format(o.v));},onComplete:()=>{from.current=target;}});
  return()=>tw.kill();
 },[value]);
 return <span ref={el}>{String(format(from.current))}</span>;
}
