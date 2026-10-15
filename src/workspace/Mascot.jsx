import React,{useEffect,useRef} from 'react';
import {gsap} from 'gsap';
import {DrawSVGPlugin} from 'gsap/DrawSVGPlugin';
import {P,VIEW} from './mascot-paths.mjs';

gsap.registerPlugin(DrawSVGPlugin);

const calm=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// Anything in the app can make the mascot smile: ojoHappy().
export const ojoHappy=()=>{try{window.dispatchEvent(new Event('ojo-happy'));}catch{}};

// The ojo face, drawn from its own strokes so GSAP can move the parts.
// The two o's are its eyes, the strokes above them are eyebrows, the j is a nose and the curve is the smile.
// mood: idle | lookdown | busy | happy | sad.   draw: trace the strokes on first show.   follow: eyes follow the pointer.
export function Mascot({size=40,mood='idle',draw=false,follow=false,hover=false,className='',style}){
 const root=useRef(null),drawing=useRef(false),current=useRef(mood),base=useRef(mood),timers=useRef({tl:null,call:null});
 const q=s=>root.current?root.current.querySelectorAll(s):[];

 const stop=()=>{const t=timers.current;if(t.tl){t.tl.kill();t.tl=null;}if(t.call){t.call.kill();t.call=null;}};
 const settle=(dur=.25)=>{
  gsap.to(q('.m-eye'),{x:0,y:0,scaleX:1,scaleY:1,rotation:0,duration:dur,ease:'power2.out',overwrite:'auto'});
  gsap.to(q('.m-brow'),{y:0,rotation:0,duration:dur,ease:'power2.out',overwrite:'auto'});
  gsap.to(q('.m-smile'),{scaleX:1,scaleY:1,y:0,strokeWidth:5,duration:dur,ease:'power2.out',overwrite:'auto'});
  gsap.to(q('.m-body'),{y:0,scaleX:1,scaleY:1,rotation:0,duration:dur,ease:'power2.out',overwrite:'auto'});
 };

 const play=name=>{
  if(!root.current)return;
  stop();current.current=name;
  gsap.set(q('.m-body'),{svgOrigin:'49 80'});gsap.set(q('.m-lean'),{svgOrigin:'49 80'});
  if(calm()){settle(.01);return;}
  settle(.2);
  const eyes=q('.m-eye'),brows=q('.m-brow'),smile=q('.m-smile'),body=q('.m-body');
  if(name==='idle'){
   // Still. (To bring back blinking, schedule a short scaleY dip on the eyes here.)
  }else if(name==='lookdown'){
   timers.current.tl=gsap.timeline()
    .to(eyes,{y:3,scaleX:1.1,scaleY:1.12,duration:.3,ease:'back.out(2)'},0)
    .to(brows,{y:-3.5,duration:.3,ease:'back.out(2)'},0)
    .to(smile,{scaleX:1.06,duration:.3},0);
  }else if(name==='busy'){
   timers.current.tl=gsap.timeline({repeat:-1,repeatDelay:.1})
    .to(eyes,{x:-3,duration:.28,ease:'sine.inOut'})
    .to(eyes,{x:3,duration:.5,ease:'sine.inOut'})
    .to(eyes,{x:0,y:-1.5,duration:.25,ease:'sine.inOut'})
    .to(eyes,{y:0,duration:.2});
   gsap.to(brows,{y:-1.5,duration:.4,yoyo:true,repeat:-1,ease:'sine.inOut'});
  }else if(name==='happy'){
   const tl=gsap.timeline({onComplete:()=>{timers.current.tl=null;play(base.current==='happy'?'idle':base.current);}});
   // two little hops, eyes squint into happy arches, brows jump, the smile widens
   tl.to(body,{y:-7,scaleY:1.07,scaleX:.96,duration:.16,ease:'power2.out'},0)
    .to(body,{y:0,scaleY:.93,scaleX:1.05,duration:.14,ease:'power2.in'},.16)
    .to(body,{scaleY:1,scaleX:1,duration:.18,ease:'back.out(3)'},.3)
    .to(body,{y:-5,scaleY:1.05,duration:.15,ease:'power2.out'},.55)
    .to(body,{y:0,scaleY:.95,scaleX:1.04,duration:.13,ease:'power2.in'},.7)
    .to(body,{scaleY:1,scaleX:1,duration:.2,ease:'back.out(3)'},.83)
    .to(eyes,{scaleX:1.08,scaleY:1.08,y:-1.5,duration:.22,ease:'back.out(2)'},.05)
    .to(brows,{y:-4,duration:.2,ease:'back.out(3)'},.05)
    .to(smile,{scaleX:1.12,y:1.5,strokeWidth:6.5,duration:.25,ease:'back.out(2.4)'},.05)
    .add(()=>settle(.35),1.9)
    .to({},{duration:.4},1.9);
   timers.current.tl=tl;
  }else if(name==='sad'){
   timers.current.tl=gsap.timeline()
    .to(eyes,{y:2.5,scaleY:.9,duration:.35,ease:'power2.out'},0)
    .to(brows[0],{rotation:-13,y:2,duration:.35,transformOrigin:'50% 50%'},0)
    .to(brows[1],{rotation:13,y:2,duration:.35,transformOrigin:'50% 50%'},0)
    .to(smile,{scaleY:-1,y:-8,duration:.4,ease:'back.out(1.6)',transformOrigin:'50% 50%'},0);
  }
 };

 // First show: trace the strokes one after another, then settle into the base mood.
 useEffect(()=>{
  const el=root.current;if(!el)return;
  if(!draw||calm()){play(mood);return;}
  const parts=['.m-eyeL path','.m-link1','.m-nose','.m-link2','.m-eyeR path','.m-smile','.m-browL path','.m-browR path'];
  drawing.current=true;
  gsap.set(el.querySelectorAll('.m-ink path'),{drawSVG:'0%'});
  const tl=gsap.timeline({onComplete:()=>{drawing.current=false;gsap.set(el.querySelectorAll('.m-ink path'),{clearProps:'strokeDasharray,strokeDashoffset'});play(base.current);}});
  parts.forEach((s,i)=>tl.to(el.querySelectorAll(s),{drawSVG:'100%',duration:i===5?.55:.4,ease:'power2.inOut',stagger:.1},i===0?0:'>-.12'));
  tl.fromTo(el.querySelector('.m-body'),{scale:.9,svgOrigin:'49 80'},{scale:1,duration:.5,ease:'back.out(3)'},'>-.1');
  return()=>{tl.kill();stop();};
 // eslint-disable-next-line
 },[draw]);

 // The mood follows the prop (idle, looking down at a drop, busy saving, happy when done, sad on an error).
 useEffect(()=>{base.current=mood;if(drawing.current)return;play(mood);
 // eslint-disable-next-line
 },[mood]);
 useEffect(()=>()=>{stop();},[]);

 // Smile whenever the app says something good happened.
 useEffect(()=>{
  const on=()=>{if(current.current!=='happy')play('happy');};
  window.addEventListener('ojo-happy',on);return()=>window.removeEventListener('ojo-happy',on);
 // eslint-disable-next-line
 },[]);

 // Eyes follow the pointer and the head leans a little toward it.
 useEffect(()=>{
  if(!follow||calm())return;
  const look=q('.m-look'),lx=gsap.quickTo(look,'x',{duration:.3,ease:'power3.out'}),ly=gsap.quickTo(look,'y',{duration:.3,ease:'power3.out'});
  const lean=gsap.quickTo(q('.m-lean'),'rotation',{duration:.5,ease:'power3.out'}),sway=gsap.quickTo(q('.m-lean'),'x',{duration:.5,ease:'power3.out'});
  const move=e=>{
   const r=root.current.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   const dx=gsap.utils.clamp(-1,1,(e.clientX-cx)/(innerWidth/2)),dy=gsap.utils.clamp(-1,1,(e.clientY-cy)/(innerHeight/2));
   lx(dx*3.4);ly(dy*2.4);lean(dx*3.5);sway(dx*1.6);
  };
  window.addEventListener('pointermove',move);
  return()=>window.removeEventListener('pointermove',move);
 // eslint-disable-next-line
 },[follow]);

 return (
  <svg ref={root} className={'mascot '+className} style={style} width={size} height={size*93/98} viewBox={VIEW} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
   >
   <g className="m-lean"><g className="m-body m-ink" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none">
    <g className="m-brow m-browL"><path d={P.browL}/></g>
    <g className="m-brow m-browR"><path d={P.browR}/></g>
    <g className="m-look"><g className="m-eye m-eyeL">{P.eyeL.map((d,i)=><path key={i} d={d}/>)}</g></g>
    <g className="m-look"><g className="m-eye m-eyeR">{P.eyeR.map((d,i)=><path key={i} d={d}/>)}</g></g>
    <path className="m-link1" d={P.link1}/>
    <path className="m-link2" d={P.link2}/>
    <path className="m-nose" d={P.nose}/>
    <path className="m-smile" d={P.smile}/>
   </g></g>
  </svg>
 );
}
