import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Minus,Plus,BookmarkSimple,ArrowBendUpLeft,Highlighter,Trash,Copy,NotePencil,X,Check} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin';
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';
import 'pdfjs-dist/web/pdf_viewer.css';
import {api} from './api.js';

gsap.registerPlugin(ScrollToPlugin);
if(!pdfjs.GlobalWorkerOptions.workerPort)pdfjs.GlobalWorkerOptions.workerPort=new PdfWorker();
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const HL_COLORS=[{id:'yellow',hex:'#f5d547'},{id:'green',hex:'#8fcf8a'},{id:'blue',hex:'#7fb5e8'},{id:'pink',hex:'#f09bb8'}];
const hex=id=>(HL_COLORS.find(c=>c.id===id)||HL_COLORS[0]).hex;
// Pieces of a selection, as fractions of the page, so they stay put at any zoom level.
function selectionRects(range,pageEl){
 const pr=pageEl.getBoundingClientRect(),out=[];
 for(const r of range.getClientRects()){
  if(r.width<2||r.height<2)continue;
  const x=(r.left-pr.left)/pr.width,y=(r.top-pr.top)/pr.height,w=r.width/pr.width,h=r.height/pr.height;
  if(x<-0.02||y<-0.02||x>1||y>1)continue;
  out.push({x:clamp(x,0,1),y:clamp(y,0,1),w:Math.min(w,1-clamp(x,0,1)),h});
 }
 // Drop pieces that sit entirely inside another one.
 return out.filter((a,i)=>!out.some((b,j)=>j!==i&&b.x<=a.x+.001&&b.y<=a.y+.001&&b.x+b.w>=a.x+a.w-.001&&b.y+b.h>=a.y+a.h-.001&&(b.w>a.w||b.h>a.h||j<i)));
}

function Page({n,doc,width,bookmarked,register,marks,flash}){
 const box=useRef(null),canvas=useRef(null),text=useRef(null);
 const [size,setSize]=useState(null),[live,setLive]=useState(false);
 const task=useRef(null);
 // Render only while near the viewport; free the canvas when far away.
 useEffect(()=>{
  const el=box.current;register(n,el);
  const io=new IntersectionObserver(([e])=>setLive(e.isIntersecting),{root:el.closest('.reader-scroll'),rootMargin:'900px 0px'});
  io.observe(el);return()=>{io.disconnect();register(n,null);};
 },[n]);
 useEffect(()=>{
  let cancelled=false;
  const cv=canvas.current,tl=text.current;
  if(!live){cv.width=0;cv.height=0;tl.replaceChildren();return;}
  (async()=>{
   const page=await doc.getPage(n);if(cancelled)return;
   const base=page.getViewport({scale:1}),scale=width/base.width,viewport=page.getViewport({scale});
   setSize({w:viewport.width,h:viewport.height});
   const dpr=window.devicePixelRatio||1;
   cv.width=Math.floor(viewport.width*dpr);cv.height=Math.floor(viewport.height*dpr);
   cv.style.width=viewport.width+'px';cv.style.height=viewport.height+'px';
   const ctx=cv.getContext('2d');
   task.current=page.render({canvasContext:ctx,viewport,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null});
   try{await task.current.promise;}catch{return;}
   if(cancelled)return;
   tl.replaceChildren();tl.style.setProperty('--scale-factor',String(scale));
   const layer=new pdfjs.TextLayer({textContentSource:page.streamTextContent(),container:tl,viewport});
   layer.render().then(()=>{const end=document.createElement('div');end.className='endOfContent';tl.append(end);}).catch(()=>{});
  })();
  return()=>{cancelled=true;task.current?.cancel();};
 },[live,width,doc,n]);
 const [first,setFirst]=useState(null);
 useEffect(()=>{if(n===1||first)return;doc.getPage(1).then(p=>{const v=p.getViewport({scale:1});setFirst(v.height/v.width);});},[doc]);
 const h=size?size.h:width*(first||1.414);
 return (
  <div ref={box} className="pdf-page" data-page={n} style={{width,height:h}}>
   <canvas ref={canvas}/>
   <div className="hl-layer">{marks.flatMap(h=>h.rects.map((r,i)=><i key={h.id+i} className={'hl'+(flash===h.id?' flash':'')} style={{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%','--hl':hex(h.color)}}/>))}</div>
   <div ref={text} className="textLayer" onMouseDown={e=>{e.currentTarget.classList.add('selecting');if(e.target===e.currentTarget)window.getSelection().removeAllRanges();}} onMouseUp={e=>e.currentTarget.classList.remove('selecting')}/>
   {bookmarked&&<PageRibbon/>}
   <span className="page-no">{n}</span>
  </div>
 );
}

function PageRibbon(){
 const el=useRef(null);
 useLayoutEffect(()=>{gsap.fromTo(el.current,{opacity:0},{opacity:1,duration:.2,ease:'power1.out'});},[]);
 return <svg ref={el} className="page-ribbon" width="22" height="46" viewBox="0 0 22 46"><path d="M0 0h22v46L11 36 0 46z" fill="#b8453a"/><path d="M3 0v38" stroke="#ffffff55" strokeWidth="1" strokeDasharray="2 2"/></svg>;
}

// A fixed ribbon hanging from the top of the reader, like a bookmark card. Tap to place it on the
// current page, tap again on that page to take it out, tap from elsewhere to jump back to it.
function Ribbon({bookmark,current,onPlace,onRemove,onJump}){
 const el=useRef(null);
 const settle=()=>gsap.fromTo(el.current,{y:-16,opacity:.5},{y:0,opacity:1,duration:.22,ease:'power2.out',overwrite:true});
 const click=()=>{
  if(!bookmark){onPlace();settle();}
  else if(bookmark.page===current){gsap.to(el.current,{y:-16,opacity:0,duration:.16,ease:'power1.in',onComplete:()=>{onRemove();gsap.set(el.current,{y:0,opacity:1});}});}
  else onJump();
 };
 const filled=!!bookmark,away=filled&&bookmark.page!==current;
 return (
  <div className={'ribbon'+(filled?' filled':'')+(away?' away':'')} ref={el}>
   <button className="ribbon-swing" onClick={click} aria-label={filled?'Bookmark':'Place bookmark'}>
    <svg width="38" height="112" viewBox="0 0 38 112">
     <defs><filter id="rs"><feDropShadow dx="0" dy="2" stdDeviation="1.6" floodOpacity=".22"/></filter></defs>
     <g filter="url(#rs)">
      <path className="r-body" d="M5 0h28v108l-14-14-14 14z" fill={filled?'#b8453a':'#f3f0e9'} stroke={filled?'none':'#b8453a'} strokeWidth="1.6" strokeDasharray={filled?'0':'5 4'}/>
      {filled&&<path d="M9 0v88M29 0v88" stroke="#ffffff40" strokeWidth="1" strokeDasharray="3 3" fill="none"/>}
     </g>
     <rect x="2" y="0" width="34" height="9" rx="2" fill="#2f3a2c"/>
    </svg>
    <span className="ribbon-tag">
     {!filled&&<><BookmarkSimple size={12}/>Place bookmark</>}
     {filled&&!away&&<>p. {bookmark.page}</>}
     {away&&<><ArrowBendUpLeft size={12}/>p. {bookmark.page}</>}
    </span>
   </button>
   {away&&<button className="ribbon-move" onClick={()=>{onPlace();settle();}}>Move here</button>}
  </div>
 );
}

export function PdfReader({item,onProgress,onBookmark,onHighlights}){
 const scroller=useRef(null),wrap=useRef(null),pages=useRef({}),saveT=useRef(null);
 const [doc,setDoc]=useState(null),[error,setError]=useState(''),[zoom,setZoom]=useState(1),[box,setBox]=useState(800),[current,setCurrent]=useState(1),[total,setTotal]=useState(0);
 const currentRef=useRef(1);
 const [pop,setPop]=useState(null),[panel,setPanel]=useState(false),[flash,setFlash]=useState(''),[copied,setCopied]=useState('');
 const marks=item.highlights||[];
 const setMarks=next=>onHighlights&&onHighlights(next);
 const byPage=useMemo(()=>{const m={};for(const h of marks)(m[h.page]||(m[h.page]=[])).push(h);return m;},[marks]);

 useEffect(()=>{
  let live=true,loaded=null;
  setDoc(null);setError('');setTotal(0);setCurrent(1);currentRef.current=1;
  (async()=>{
   try{
    // Use the stored copy; if there isn't one, fetch it from the web address now.
    let buf=item.fileId?await api.getFile(item.fileId):null;
    if(!buf){
     const got=await api.ensureFile(item.id);
     if(got.error)throw Error(got.error);
     buf=await api.getFile(got.fileId);
     if(!buf)throw Error('The PDF could not be read.');
    }
    loaded=await pdfjs.getDocument({data:new Uint8Array(buf)}).promise;
    if(!live){loaded.destroy();return;}
    setDoc(loaded);setTotal(loaded.numPages);
   }catch(e){if(live)setError(e.message||'Could not open this PDF.');}
  })();
  return()=>{live=false;loaded?.destroy();};
 },[item.id,item.fileId]);

 useEffect(()=>{
  const ro=new ResizeObserver(([e])=>setBox(e.contentRect.width));
  ro.observe(wrap.current);return()=>ro.disconnect();
 },[]);
 const width=Math.max(280,(box-72)*zoom);
 const register=useCallback((n,el)=>{if(el)pages.current[n]=el;else delete pages.current[n];},[]);
 const top=n=>{const el=pages.current[n];return el?el.offsetTop-14:0;};
 const goto=useCallback((n,animate=true)=>{
  const sc=scroller.current;if(!sc)return;
  const y=top(clamp(n,1,total||1));
  if(animate)gsap.to(sc,{scrollTo:{y,autoKill:true},duration:Math.min(1.6,.5+Math.abs(y-sc.scrollTop)/4000),ease:'power3.inOut'});
  else sc.scrollTop=y;
 },[total]);

 // Resume where the reader left off (bookmark first, otherwise the last page read).
 const resumed=useRef(null);
 useEffect(()=>{
  if(!doc||resumed.current===item.id)return;
  resumed.current=item.id;
  const target=item.bookmark?.page||item.progress?.page||1;
  requestAnimationFrame(()=>requestAnimationFrame(()=>goto(target,false)));
 },[doc,item.id]);

 // Keep the same page in view when zooming.
 const anchor=useRef(1);
 useLayoutEffect(()=>{if(doc)goto(anchor.current,false);},[zoom]);

 useEffect(()=>{
  const sc=scroller.current;if(!sc||!doc)return;
  let raf=0;
  const update=()=>{
   raf=0;
   const line=sc.scrollTop+sc.clientHeight*.35;let found=1;
   for(let n=1;n<=doc.numPages;n++){const el=pages.current[n];if(el&&el.offsetTop<=line)found=n;else if(el)break;}
   if(found!==currentRef.current){
    currentRef.current=found;setCurrent(found);
    clearTimeout(saveT.current);saveT.current=setTimeout(()=>onProgress(found,doc.numPages),500);
   }
  };
  const onScroll=()=>{if(!raf)raf=requestAnimationFrame(update);};
  sc.addEventListener('scroll',onScroll,{passive:true});update();
  return()=>{sc.removeEventListener('scroll',onScroll);cancelAnimationFrame(raf);clearTimeout(saveT.current);};
 },[doc]);
 useEffect(()=>{anchor.current=current;},[current]);
 useEffect(()=>{
  const k=e=>{
   if(e.target.closest?.('input,textarea,select'))return;
   if(e.key==='PageDown'||e.key==='ArrowRight')goto(currentRef.current+1);
   if(e.key==='PageUp'||e.key==='ArrowLeft')goto(currentRef.current-1);
  };
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 },[goto]);

 // Selecting text offers highlight colours; clicking an existing highlight offers to change or remove it.
 useEffect(()=>{
  const up=e=>{
   const sc=scroller.current;if(!sc||!sc.contains(e.target))return;
   if(e.target.closest?.('.hl-pop'))return;
   setTimeout(()=>{
    const sel=window.getSelection();
    const wr=wrap.current.getBoundingClientRect();
    if(sel&&!sel.isCollapsed&&sel.rangeCount){
     const range=sel.getRangeAt(0),startEl=(range.startContainer.nodeType===3?range.startContainer.parentElement:range.startContainer),pageEl=startEl?.closest?.('.pdf-page');
     if(!pageEl)return setPop(null);
     const rects=selectionRects(range,pageEl);
     if(!rects.length)return setPop(null);
     const text=sel.toString().replace(/\s+/g,' ').trim();
     if(!text)return setPop(null);
     const last=[...range.getClientRects()].pop();
     setPop({mode:'new',page:+pageEl.dataset.page,rects,text,x:clamp(last.right-wr.left,120,wr.width-150),y:last.bottom-wr.top+8});
    }else{
     // A plain click: did it land on a highlight?
     const pageEl=e.target.closest?.('.pdf-page');
     if(pageEl){
      const pr=pageEl.getBoundingClientRect(),fx=(e.clientX-pr.left)/pr.width,fy=(e.clientY-pr.top)/pr.height,pg=+pageEl.dataset.page;
      const hit=marks.find(h=>h.page===pg&&h.rects.some(r=>fx>=r.x&&fx<=r.x+r.w&&fy>=r.y&&fy<=r.y+r.h));
      if(hit)return setPop({mode:'edit',id:hit.id,x:clamp(e.clientX-wr.left,120,wr.width-150),y:e.clientY-wr.top+14});
     }
     setPop(null);
    }
   },10);
  };
  document.addEventListener('mouseup',up);return()=>document.removeEventListener('mouseup',up);
 },[marks]);
 const addMark=color=>{
  if(!pop||pop.mode!=='new')return;
  const h={id:crypto.randomUUID(),page:pop.page,rects:pop.rects,text:pop.text.slice(0,2000),color,note:'',at:Date.now()};
  setMarks([...marks,h]);setPop({mode:'edit',id:h.id,x:pop.x,y:pop.y,fresh:true});window.getSelection()?.removeAllRanges();
 };
 const patchMark=(id,change)=>setMarks(marks.map(h=>h.id===id?{...h,...change}:h));
 const removeMark=id=>{setMarks(marks.filter(h=>h.id!==id));setPop(null);};
 const jumpMark=h=>{goto(h.page);setTimeout(()=>{setFlash(h.id);setTimeout(()=>setFlash(''),1600);},500);};
 const asMarkdown=()=>'# Highlights: '+item.title+'\n\n'+[...marks].sort((a,b)=>a.page-b.page||a.rects[0].y-b.rects[0].y).map(h=>'> '+h.text+'\n> — page '+h.page+(h.note?'\n\n'+h.note:'')).join('\n\n')+'\n';
 const copyAll=async()=>{try{await navigator.clipboard.writeText(asMarkdown());setCopied('copy');setTimeout(()=>setCopied(''),1500);}catch{}};
 const toNote=async()=>{
  const body=[...marks].sort((a,b)=>a.page-b.page||a.rects[0].y-b.rects[0].y).map(h=>'“'+h.text+'” (page '+h.page+')'+(h.note?'\n'+h.note:'')).join('\n\n');
  await api.capNote({title:'Highlights: '+item.title,body});setCopied('note');setTimeout(()=>setCopied(''),1800);
 };
 const popMark=pop?.mode==='edit'?marks.find(h=>h.id===pop.id):null;
 const pct=total?Math.round(current/total*100):0;
 return (
  <div className="reader-wrap" ref={wrap}>
   <div className="reader-bar">
    <b className="reader-title">{item.title}</b>
    <span className="spacer"/>
    <button className={'ghost hl-toggle'+(panel?' on':'')} onClick={()=>setPanel(p=>!p)}><Highlighter size={15}/>Highlights{marks.length>0&&<em>{marks.length}</em>}</button>
    <label className="pg">Page <input type="number" min="1" max={total||1} value={current} onChange={e=>{const n=clamp(+e.target.value||1,1,total||1);setCurrent(n);goto(n);}}/> of {total||'…'}</label>
    <button className="icon-btn" aria-label="Zoom out" onClick={()=>setZoom(z=>clamp(+(z-.15).toFixed(2),.5,2.2))}><Minus size={15}/></button>
    <span className="muted zoom">{Math.round(zoom*100)}%</span>
    <button className="icon-btn" aria-label="Zoom in" onClick={()=>setZoom(z=>clamp(+(z+.15).toFixed(2),.5,2.2))}><Plus size={15}/></button>
   </div>
   <div className="reader-progress"><i style={{width:pct+'%'}}/></div>
   <div className="reader-scroll" ref={scroller}>
    {error&&item.url&&/^https?:/i.test(item.url)&&<div className="pdf-fallback">
     <div className="fb-bar"><span className="muted">Showing the online copy ({error}) Page tracking and the bookmark need a downloaded copy.</span><button className="ghost" onClick={()=>api.openExternal(item.url)}>Open in browser</button></div>
     <iframe title={item.title} src={item.url}/>
    </div>}
    {error&&!(item.url&&/^https?:/i.test(item.url))&&<div className="empty-state"><p className="muted">{error}</p></div>}
    {!doc&&!error&&<div className="empty-state"><p className="muted">Opening…</p></div>}
    {doc&&<div className="pages">{Array.from({length:total},(_,i)=><Page key={i+1} n={i+1} doc={doc} width={width} bookmarked={item.bookmark?.page===i+1} register={register} marks={byPage[i+1]||[]} flash={flash}/>)}</div>}
   </div>
   {pop&&(pop.mode==='new'||popMark)&&<div className="hl-pop" style={{left:pop.x,top:pop.y}} onMouseDown={e=>e.preventDefault()}>
    {pop.mode==='new'
     ?<div className="hl-colors">{HL_COLORS.map(c=><button key={c.id} aria-label={'Highlight '+c.id} style={{background:c.hex}} onClick={()=>addMark(c.id)}/>)}<span className="hl-sep"/><button className="hl-act" aria-label="Copy text" onClick={()=>{navigator.clipboard?.writeText(pop.text);setPop(null);}}><Copy size={14}/></button></div>
     :<div className="hl-edit">
       <div className="hl-colors">{HL_COLORS.map(c=><button key={c.id} className={popMark.color===c.id?'on':''} aria-label={'Colour '+c.id} style={{background:c.hex}} onClick={()=>patchMark(popMark.id,{color:c.id})}/>)}<span className="hl-sep"/><button className="hl-act" aria-label="Remove highlight" onClick={()=>removeMark(popMark.id)}><Trash size={14}/></button><button className="hl-act" aria-label="Done" onClick={()=>setPop(null)}><Check size={14}/></button></div>
       <textarea autoFocus={pop.fresh} rows={2} placeholder="Add a note…" value={popMark.note||''} onChange={e=>patchMark(popMark.id,{note:e.target.value})} onMouseDown={e=>e.stopPropagation()}/>
      </div>}
   </div>}
   {panel&&<aside className="hl-panel">
    <header><b>Highlights</b><span className="muted">{marks.length}</span><span className="spacer"/>
     {marks.length>0&&<><button className="icon-btn" aria-label="Copy all as Markdown" onClick={copyAll}>{copied==='copy'?<Check size={15}/>:<Copy size={15}/>}</button><button className="icon-btn" aria-label="Save as a note" onClick={toNote}>{copied==='note'?<Check size={15}/>:<NotePencil size={15}/>}</button></>}
     <button className="icon-btn" aria-label="Close" onClick={()=>setPanel(false)}><X size={15}/></button></header>
    <div className="hl-list">
     {[...marks].sort((a,b)=>a.page-b.page||a.rects[0].y-b.rects[0].y).map(h=>(
      <div key={h.id} className="hl-item" style={{'--hl':hex(h.color)}} onClick={()=>jumpMark(h)}>
       <p>{h.text}</p>
       {h.note&&<span className="hl-note">{h.note}</span>}
       <span className="muted">Page {h.page}</span>
       <button className="icon-btn danger" aria-label="Delete highlight" onClick={e=>{e.stopPropagation();removeMark(h.id);}}><Trash size={13}/></button>
      </div>
     ))}
     {!marks.length&&<p className="muted pad">Select text in the PDF and pick a colour. Your highlights and notes collect here.</p>}
    </div>
   </aside>}
   {doc&&<>
    <Ribbon key={item.id} bookmark={item.bookmark} current={current}
     onPlace={()=>onBookmark({page:currentRef.current,at:Date.now()})}
     onRemove={()=>onBookmark(null)}
     onJump={()=>goto(item.bookmark.page)}/>
    <div className="rail" aria-hidden="true">
     <i className="rail-dot" style={{top:total>1?(current-1)/(total-1)*100+'%':'0%'}}/>
     {item.bookmark&&<button className="rail-mark" style={{top:total>1?(item.bookmark.page-1)/(total-1)*100+'%':'0%'}} onClick={()=>goto(item.bookmark.page)}/>}
    </div>
   </>}
  </div>
 );
}
