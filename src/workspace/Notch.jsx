import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link as LinkIcon,PlayCircle,FileText,NotePencil,VideoCamera,ClockCounterClockwise,ArrowLineUp,ArrowLineDown,ArrowLineLeft,ArrowLineRight,X as XIcon,Play,InstagramLogo,Image as ImageIcon,Code,FilePdf,FileMd,MusicNotes,LinkSimple} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import '@fontsource-variable/geist';
import './notch.css';
import {api} from './api.js';
import {ingest} from './ingest.js';
import {KINDS,isJobLink} from './classify.mjs';
import {Mascot} from './Mascot.jsx';

const SIZES={peek:{w:132,h:26,r:11},intro:{w:360,h:128,r:30},over:{w:400,h:166,r:32},saving:{w:240,h:124,r:28},done:{w:300,h:150,r:32},error:{w:280,h:130,r:28}};
const HINTS=[Play,InstagramLogo,ImageIcon,FilePdf,FileMd,MusicNotes,Code,LinkSimple];
const CIRC=2*Math.PI*26;
const SIDE={peek:{w:30,h:132,r:11},intro:{w:160,h:330,r:30},over:{w:170,h:236,r:32},saving:{w:140,h:170,r:28},done:{w:170,h:196,r:32},error:{w:160,h:180,r:28}};
const TUCKS={top:{x:0,y:-40},bottom:{x:0,y:40},left:{x:-40,y:0},right:{x:40,y:0}};
const ORIGIN={top:'50% 0%',bottom:'50% 100%',left:'0% 50%',right:'100% 50%'};
const letters=(t,cls)=>t.split('').map((c,i)=><span key={i} className={cls}>{c===' '?' ':c}</span>);

// A pill tucked into the top of the screen. Rest the cursor there (or drag something to the top) and
// it slides out. Click it to open the app; it slides back up. Anything dropped on it is filed into Save later.
// The window never resizes: only the pill is animated, so nothing can jump.
// The question shown at a corner: two clear choices, drawn as little screens with the notch on the edge it would take.
function AskCard({q,edge}){
 const ref=useRef(null);
 const pos=(q.sideY==='top'?'t':'b')+(q.sideX==='left'?'l':'r');
 const icon=e=>e==='top'?ArrowLineUp:e==='bottom'?ArrowLineDown:e==='left'?ArrowLineLeft:ArrowLineRight;
 const pick=(e,ev)=>{ev&&ev.stopPropagation();api.notchChoose(e);};
 useLayoutEffect(()=>{
  const el=ref.current;
  gsap.fromTo(el,{opacity:0,scale:.92},{opacity:1,scale:1,duration:.35,ease:'back.out(1.6)',transformOrigin:(q.sideX==='left'?'0%':'100%')+' '+(q.sideY==='top'?'0%':'100%')});
  // Windows does not always deliver clicks to a small overlay, so the main process also hears the click: tell it where the buttons are.
  const t=setTimeout(()=>{api.notchAskRects([...el.querySelectorAll('[data-pick]')].map(b=>{const r=b.getBoundingClientRect();return {edge:b.dataset.pick,x:r.x,y:r.y,w:r.width,h:r.height};}));},450);
  return()=>clearTimeout(t);
 },[]);
 return (
  <div ref={ref} className={'cq ask-'+pos+' on-'+edge} role="dialog" aria-label="Where should the notch sit?">
   <p className="ask-t">Where should the notch sit?</p>
   <div className="ask-opts">
    {q.options.map(o=>{const I=icon(o.edge);return <button key={o.edge} data-pick={o.edge} className="ask-opt" onClick={e=>pick(o.edge,e)}><span className={'ask-ico e-'+o.edge}><i/></span><span className="ask-l"><I size={14} weight="bold"/>{o.label}</span></button>;})}
   </div>
   <button data-pick="keep" className="ask-keep" onClick={e=>pick(null,e)}>Keep it where it was</button>
  </div>
 );
}

// One icon and colour per kind of thing, so a row says what it is at a glance.
const KIND={
 link:{I:LinkIcon,c:'#8fb7e6',n:'Link'},youtube:{I:PlayCircle,c:'#ef8a7e',n:'Video'},video:{I:VideoCamera,c:'#ef8a7e',n:'Video'},instagram:{I:InstagramLogo,c:'#e59ac4',n:'Reel'},
 pdf:{I:FilePdf,c:'#f0a76a',n:'PDF'},image:{I:ImageIcon,c:'#8fd0a0',n:'Image'},code:{I:Code,c:'#c0a6ef',n:'Code'},text:{I:NotePencil,c:'#e6cf7a',n:'Note'},
 md:{I:FileMd,c:'#e6cf7a',n:'Markdown'},audio:{I:MusicNotes,c:'#7fd0cf',n:'Audio'}
};
// What was saved last, in ojo's own style. Clicking a row opens it in Saved.
function RecentCard({r,edge,shift}){
 const ref=useRef(null),side=edge==='left'||edge==='right';
 // Near a corner the panel stays inside its window.
 const room=side?(350-280)/2:(420-292)/2,cs=Math.max(-room,Math.min(room,shift));
 useLayoutEffect(()=>{
  const el=ref.current,origin={top:'50% 0%',bottom:'50% 100%',left:'0% 50%',right:'100% 50%'}[edge];
  gsap.fromTo(el,{opacity:0,scale:.94,y:edge==='top'?-10:edge==='bottom'?10:0,x:edge==='left'?-10:edge==='right'?10:0},{opacity:1,scale:1,x:0,y:0,duration:.4,ease:'expo.out',transformOrigin:origin});
  // Windows does not always deliver clicks to a small overlay, so the main process also hears them: report where the rows are.
  const t=setTimeout(()=>{
   const list=[...el.querySelectorAll('[data-recent]')].map(b=>{const q=b.getBoundingClientRect();return {id:b.dataset.recent,x:q.x,y:q.y,w:q.width,h:q.height};});
   const q=el.getBoundingClientRect();list.push({id:'panel',x:q.x,y:q.y,w:q.width,h:q.height});
   api.notchRecentRects(list);
  },520);
  return()=>clearTimeout(t);
 },[]);
 const pick=(id,e)=>{e&&e.stopPropagation();api.notchRecentPick(id);};
 return (
  <div className={'rc-wrap on-'+edge}>
   <div ref={ref} className="rc" style={{'--cs':cs}} role="dialog" aria-label="Recently saved" onContextMenu={e=>e.preventDefault()}>
    <p className="rc-t"><ClockCounterClockwise size={14} weight="bold"/>Recently saved</p>
    {r.items.length?<div className="rc-list">{r.items.map(i=>{const k=KIND[i.kind]||{I:FileText,c:'#b9c4b4',n:''},K=k.I;return (
     <button key={i.id} data-recent={i.id} className="rc-row" onClick={e=>pick(i.id,e)} title="">
      <span className="rc-ico" style={{'--k':k.c}}><K size={16} weight="duotone"/></span>
      <span className="rc-txt"><span className="rc-n">{i.title}</span><span className="rc-s">{k.n}{i.host&&k.n==='Link'?' · '+i.host:''}</span></span>
     </button>
    );})}</div>:<p className="rc-empty">Nothing saved yet. Drop a link, image or file on the notch.</p>}
    <button data-recent="__saved" className="rc-all" onClick={e=>pick('__saved',e)}>Open Saved</button>
   </div>
  </div>
 );
}

export function Notch(){
 const [state,setState]=useState('peek'),[info,setInfo]=useState({count:0,summary:''});
 const [edge,setEdge]=useState('top'),edgeRef=useRef('top'),root=useRef(null),pill=useRef(null),press0=useRef(null),dragging=useRef(false),swallow=useRef(false);
 edgeRef.current=edge;
 // The size of a state's pill on this edge: the resting tab is wide along the top and bottom and tall along the sides.
 const OVER=6;
 const [asking,setAsking]=useState(null),[recent,setRecent]=useState(null);
 // Sizes include the few pixels that hang past the screen edge, so the pill always touches the edge.
 const sz=name=>{const side=edgeRef.current==='left'||edgeRef.current==='right',z=(side?SIDE:SIZES)[name]||(side?SIDE:SIZES).peek;return side?{...z,w:z.w+OVER}:{...z,h:z.h+OVER};};
 const shiftRaw=useRef(0);
 // Near a corner the pill slides along the edge, as far as its window allows for the size it has now.
 const applyShift=(dur=.3)=>{
  const side=edgeRef.current==='left'||edgeRef.current==='right',z=sz(stateRef.current==='hidden'?'peek':stateRef.current),room=((side?innerHeight-z.h:innerWidth-z.w)/2)||0;
  gsap.to(root.current,{'--shift':Math.max(-room,Math.min(room,shiftRaw.current)),duration:dur,ease:'power2.out',overwrite:'auto'});
 };
 const tuck=()=>TUCKS[edgeRef.current];
 const pressRef=useRef(()=>{}),depth=useRef(0),hold=useRef(null),first=useRef(true),stateRef=useRef('peek'),prev=useRef('peek'),leaving=useRef(false);
 stateRef.current=state;

 useEffect(()=>{document.documentElement.style.background='transparent';document.body.style.background='transparent';},[]);

 const morph=(s,{dur=.55,ease='power3.out'}={})=>gsap.to(pill.current,{width:s.w,height:s.h,'--r':s.r+'px',duration:dur,ease,overwrite:'auto'});

 // Slides the pill up into the top edge, then lets the main process hide the window.
 const retract=()=>{
  if(leaving.current)return;
  leaving.current=true;
  clearTimeout(hold.current);
  gsap.to(pill.current,{...tuck(),opacity:0,duration:.4,ease:'power3.in',overwrite:'auto',onComplete:()=>{
   leaving.current=false;
   prev.current='hidden';
   setState('hidden');
   api.notch('hidden');
  }});
 };

 // Where the notch is docked (it can be dragged to any screen edge) so it opens away from that edge.
 useEffect(()=>{
  const take=p=>{if(p&&p.edge){edgeRef.current=p.edge;shiftRaw.current=+p.shift||0;setEdge(p.edge);applyShift(.12);}};
  api.notchPlace().then(take);
  return api.onNotchEdge(take);
 },[]);
 // Right-click: a small panel of what was saved last.
 useEffect(()=>api.onNotchRecent(r=>{
  if(r){edgeRef.current=r.edge;setEdge(r.edge);setRecent(r);setState('recent');}
  else{setRecent(null);if(stateRef.current==='recent')setState('peek');}
 }),[]);
 // Dropped in a corner: the notch asks which edge it should sit on.
 useEffect(()=>api.onNotchAsk(q=>{
  if(q){edgeRef.current=q.edge;setEdge(q.edge);setAsking(q);setState('ask');}
  else{setAsking(null);if(stateRef.current==='ask')setState('peek');}
 }),[]);
 // The main process slides it out when the cursor rests at the top, and tucks it away again.
 useEffect(()=>api.onNotchMode(m=>{
  const s=stateRef.current;
  if(m==='peek'&&s==='hidden')setState('peek');
  if(m==='intro'&&(s==='peek'||s==='hidden'))setState('intro');
  if(m==='hidden'&&(s==='peek'||s==='intro'))retract();
  if(m==='cursor-out'&&s==='over'){depth.current=0;settle();}
  if(m==='click')pressRef.current();
 }),[]);

 useLayoutEffect(()=>{
  const el=pill.current,was=prev.current;
  prev.current=state;
  if(first.current){
   first.current=false;
   gsap.set(el,{width:sz('peek').w,height:sz('peek').h,'--r':SIZES.peek.r+'px'});
   // Launch: the pill slides out of the screen edge.
   gsap.fromTo(el,{...tuck(),opacity:0},{x:0,y:0,opacity:1,duration:.6,ease:'power3.out',delay:.2});
   return;
  }
  if(state==='ask'||state==='recent'){gsap.to(el,{opacity:0,duration:.15,overwrite:'auto'});return;}
  if(state==='hidden'){gsap.set(el,{...tuck(),opacity:0});return;}
  if(was==='hidden'||was==='ask'||was==='recent'){
   // Reveal: slide out from the screen edge at peek size.
   gsap.set(el,{width:sz('peek').w,height:sz('peek').h,'--r':SIZES.peek.r+'px'});
   gsap.fromTo(el,{...tuck(),opacity:0},{x:0,y:0,opacity:1,duration:.45,ease:'power3.out',overwrite:'auto'});
   if(state!=='peek')morph(sz(state),{dur:.6,ease:'expo.out'});
   return;
  }
  gsap.to(el,{x:0,y:0,opacity:1,duration:.2,overwrite:false});
  const opening=state!=='peek';
  morph(sz(state),opening?{dur:.6,ease:'expo.out'}:{dur:.45,ease:'power3.inOut'});
 },[state]);

 // Dragging the notch to another edge swaps the resting tab between wide and tall.
 const edgeSeen=useRef(true);
 useLayoutEffect(()=>{
  const el=pill.current,s=stateRef.current;
  if(edgeSeen.current){edgeSeen.current=false;return;}
  if(!el||first.current)return;
  const z=sz(s==='hidden'?'peek':s);
  gsap.set(el,{width:z.w,height:z.h,'--r':z.r+'px',...(s==='hidden'?{...tuck(),opacity:0}:{x:0,y:0})});
 },[edge]);

 // Keep the along-the-edge shift right when the pill changes size.
 useLayoutEffect(()=>{applyShift(.35);},[state,edge]);

 // Per-state content motion.
 useLayoutEffect(()=>{
  const ctx=gsap.context(()=>{
   if(state==='peek'){
    gsap.to('.logo',{y:-1,duration:2.2,repeat:-1,yoyo:true,ease:'sine.inOut'});
   }
   if(state==='intro'){
    gsap.fromTo('.intro-text>*',{y:12,opacity:0},{y:0,opacity:1,duration:.45,ease:'power3.out',stagger:.09,delay:.25});
    gsap.fromTo('.intro .logo',{scale:.5,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(2)',delay:.2});
    gsap.fromTo('.intro-hints .hint',{scale:.4,opacity:0},{scale:1,opacity:1,duration:.35,ease:'power3.out',stagger:.04,delay:.5});
    gsap.to('.intro-hints .hint',{y:-3,duration:1.1,repeat:-1,yoyo:true,ease:'sine.inOut',stagger:{each:.1,from:'start'},delay:1});
   }
   if(state==='over'){
    gsap.fromTo('.over-text .ch',{y:16,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out',stagger:.025,delay:.15});
    gsap.fromTo('.dash-ring',{opacity:0},{opacity:.7,duration:.4});
    gsap.to('.dash-ring',{opacity:.25,duration:.9,repeat:-1,yoyo:true,ease:'sine.inOut',delay:.5});
   }
   if(state==='saving'){
    gsap.to('.spin-arc',{rotation:360,transformOrigin:'50% 50%',duration:.9,repeat:-1,ease:'none'});
    gsap.fromTo('.saving-text',{opacity:0,y:6},{opacity:1,y:0,duration:.3});
   }
   if(state==='done'){
    gsap.timeline()
     .fromTo('.done-text .ch',{y:18,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out',stagger:.035},.3)
     .fromTo('.done-sub',{opacity:0,y:6},{opacity:1,y:0,duration:.35},.6);
   }
   if(state==='error')gsap.fromTo('.err',{y:8,opacity:0},{y:0,opacity:1,duration:.4,ease:'power2.out'});
  },root);
  return()=>ctx.revert();
 },[state]);

 useEffect(()=>()=>clearTimeout(hold.current),[]);
 // The introduction stays long enough to read, then tucks away by itself.
 useEffect(()=>{
  if(state!=='intro')return;
  const t=setTimeout(()=>{if(stateRef.current==='intro')retract();},13000);
  return()=>clearTimeout(t);
 },[state]);

 // Clicking the notch opens the app (or closes it if it is already in front), then the pill slides back up.
 const press=()=>{
  if((stateRef.current!=='peek'&&stateRef.current!=='intro')||leaving.current)return;
  gsap.to(pill.current,{scale:.94,duration:.08,yoyo:true,repeat:1,ease:'power1.out',transformOrigin:ORIGIN[edgeRef.current],onComplete:retract});
 };
 // The main process also reports clicks it sees globally ('click'), because Windows sometimes does not
 // deliver a click to this small window; it only ever toggles once.
 const onClick=()=>{if(swallow.current){swallow.current=false;return;}api.toggle();press();};
 // Press and drag the pill to move the notch to any screen edge; a plain click still opens the app.
 const grab=e=>{if(e.button!==0)return;press0.current={x:e.screenX,y:e.screenY};dragging.current=false;e.currentTarget.setPointerCapture(e.pointerId);};
 const drag=e=>{const p=press0.current;if(!p)return;if(!dragging.current&&Math.hypot(e.screenX-p.x,e.screenY-p.y)>6){dragging.current=true;api.notchMove(true);}};
 const drop0=e=>{const p=press0.current;press0.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(p&&dragging.current){dragging.current=false;swallow.current=true;setTimeout(()=>{swallow.current=false;},400);api.notchMove(false);}};
 const grabProps={onPointerDown:grab,onPointerMove:drag,onPointerUp:drop0,onPointerCancel:drop0};
 pressRef.current=press;
 const settle=()=>{
  setState('peek');api.notch('peek');
 };

 const enter=async e=>{
  e.preventDefault();clearTimeout(hold.current);
  if(depth.current++===0){
   gsap.killTweensOf(pill.current,'scale');gsap.set(pill.current,{scale:1});
   api.notch('open');
   setState('over');
  }
 };
 const leave=()=>{if(--depth.current<=0){depth.current=0;settle();}};
 const drop=async e=>{
  e.preventDefault();depth.current=0;setState('saving');
  let n=0,records=[];
  try{
   records=await ingest(e.dataTransfer);
   n=records.length?await api.addSaved(records):0;
   if(n){
    const kinds=[...new Set(records.map(r=>r.kind==='link'&&isJobLink(r.url)?'Job tracker':KINDS[r.kind]||r.kind))];
    setInfo({count:n,summary:kinds.slice(0,3).join(' · ')});setState('done');
   }else settle();
  }catch{setState('error');}
  hold.current=setTimeout(settle,n?2500:1800);
 };

 return (
  <div ref={root} className={'notch e-'+edge+' '+state} onDragEnter={enter} onDragOver={e=>e.preventDefault()} onDragLeave={leave} onDrop={drop} onContextMenu={e=>{e.preventDefault();api.notchContext();}}>
   <i className="marker" aria-hidden="true"/>
   {state==='ask'&&asking&&<AskCard q={asking} edge={edge}/>}
   {state==='recent'&&recent&&<RecentCard r={recent} edge={edge} shift={shiftRaw.current}/>}
   <div ref={pill} className="pill">
    {(state==='peek'||state==='hidden')&&<div className="idle" onClick={onClick} {...grabProps}><Mascot className="logo" size={19} mood="idle" hover={false}/></div>}
    {state==='intro'&&<div className="intro" onClick={onClick} {...grabProps}>
     <Mascot className="logo" size={46} draw mood="idle"/>
     <div className="intro-text"><b>ojo is tucked up here</b><span>Click to open the app. Drag links, images or PDFs here to save them for later.</span>
      <div className="intro-hints">{HINTS.slice(0,6).map((I,i)=><span key={i} className="hint"><I size={15} weight="duotone"/></span>)}</div></div>
    </div>}
    {state==='over'&&<div className="over"><i className="dash-ring"/>
     <Mascot size={66} mood="lookdown" hover={false}/>
     <b className="over-text">{letters('Drop to save','ch')}</b></div>}
    {state==='saving'&&<div className="saving">
     <Mascot size={52} mood="busy" hover={false}/>
     <b className="saving-text">Saving…</b></div>}
    {state==='done'&&<div className="done">
     <Mascot size={70} mood="happy" hover={false}/>
     <b className="done-text">{letters('Saved!','ch')}</b>
     <span className="done-sub">{info.count===1?'1 item':info.count+' items'}{info.summary&&' · '+info.summary}</span></div>}
    {state==='error'&&<div className="error-face"><Mascot size={46} mood="sad" hover={false}/><b className="err">Couldn’t save that</b></div>}
   </div>
  </div>
 );
}
