import React,{useEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Check,CheckCircle,NotePencil,BookmarkSimple,Lightning} from '@phosphor-icons/react';
import '@fontsource-variable/geist';
import './capture.css';
import {api} from './api.js';
import {Mascot} from './Mascot.jsx';
import {ingest,ingestText} from './ingest.js';
import {MODES,planCapture,labelFor} from './capture.mjs';

const KINDS=['task','note','saved'];
const KIND_HINT={task:'Something to do',note:'Something to remember',saved:'A link, file or snippet to keep'};
const MODE_LABEL={auto:'Ask me',task:'Task',note:'Note',saved:'Saved'};
const MODE_ICON={auto:Lightning,task:CheckCircle,note:NotePencil,saved:BookmarkSimple};

// A tiny box that opens from anywhere with a global shortcut: type, press Enter, it lands in the right place.
export function Capture(){
 const [text,setText]=useState(''),[mode,setMode]=useState('auto'),[state,setState]=useState('idle'),[done,setDone]=useState(''),[key,setKey]=useState(''),[choosing,setChoosing]=useState(false),[pick,setPick]=useState('task');
 const card=useRef(null),area=useRef(null),busy=useRef(false);
 useEffect(()=>{
  document.documentElement.style.background='transparent';document.body.style.background='transparent';
  api.capInfo().then(i=>setKey(i.key||''));
  return api.onCapOpen(()=>{
   setText('');setMode('auto');setChoosing(false);setState('idle');setDone('');busy.current=false;
   setTimeout(()=>{area.current?.focus();},30);
   gsap.fromTo(card.current,{y:-18,opacity:0,scale:.97},{y:0,opacity:1,scale:1,duration:.28,ease:'power3.out'});
  });
 },[]);
 const plan=useMemo(()=>planCapture(text,mode),[text,mode]);
 useEffect(()=>{const a=area.current;if(a){a.style.height='auto';a.style.height=Math.min(150,a.scrollHeight)+'px';}},[text]);

 const finish=label=>{
  setState('done');setDone(label);
  setTimeout(()=>api.capHide(),1500);
 };
 // Unless a type was chosen up front (chip, Tab or a t:/n:/s: prefix), Enter asks what this is, with the best guess highlighted.
 const asksFirst=mode==='auto'&&!/^s*[tns]s*:/i.test(text);
 const submit=async(forced)=>{
  if(busy.current||!plan)return;
  if(asksFirst&&!forced){setPick(plan.kind);setChoosing(true);return;}
  const p=forced?planCapture(text,forced):plan;
  if(!p)return;
  setChoosing(false);
  busy.current=true;setState('saving');
  try{
   if(p.kind==='task')await api.capTask(p);
   else if(p.kind==='note')await api.capNote(p);
   else{const records=await ingestText(p.text);if(records.length)await api.addSaved(records);}
   finish(labelFor(p));
  }catch{setState('error');busy.current=false;}
 };
 const onKey=e=>{
  if(choosing){
   const k=e.key.toLowerCase(),i=KINDS.indexOf(pick);
   if(e.key==='Escape'){e.preventDefault();setChoosing(false);return;}
   if(e.key==='Enter'){e.preventDefault();submit(pick);return;}
   if(e.key==='ArrowRight'||e.key==='Tab'){e.preventDefault();setPick(KINDS[(i+1)%3]);return;}
   if(e.key==='ArrowLeft'){e.preventDefault();setPick(KINDS[(i+2)%3]);return;}
   const hit=k==='1'||k==='t'?'task':k==='2'||k==='n'?'note':k==='3'||k==='s'?'saved':null;
   if(hit){e.preventDefault();submit(hit);}
   else e.preventDefault();
   return;
  }
  if(e.key==='Escape'){e.preventDefault();api.capHide();}
  else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}
  else if(e.key==='Tab'){e.preventDefault();setMode(m=>MODES[(MODES.indexOf(m)+(e.shiftKey?-1:1)+MODES.length)%MODES.length]);}
 };
 // Pasted images and files go straight to Saved.
 const onPaste=async e=>{
  const dt=e.clipboardData;
  if(dt?.files?.length){
   e.preventDefault();busy.current=true;setState('saving');
   try{const records=await ingest(dt);if(records.length){await api.addSaved(records);finish('Saved');}else{setState('idle');busy.current=false;}}catch{setState('error');busy.current=false;}
  }
 };
 return (
  <div className="cap-wrap">
   <div ref={card} className="cap-card">
    {state==='done'
     ?<div className="cap-done"><span className="cap-tick"><Mascot size={46} mood="happy" hover={false}/></span><b>Added</b><span>{done}</span></div>
     :<>
      {choosing&&<div className="cap-ask"><span className="cap-q">What is this?</span>{KINDS.map((k,n)=>{const I=MODE_ICON[k];return <button key={k} className={pick===k?'on':''} onMouseDown={e=>e.preventDefault()} onClick={()=>submit(k)}><I size={18} weight={pick===k?'fill':'regular'}/><b>{MODE_LABEL[k]}</b><i>{KIND_HINT[k]}</i><kbd>{n+1}</kbd></button>;})}</div>}
      <textarea ref={area} rows={1} autoFocus spellCheck="false" value={text} placeholder="Capture a task, a note or a link…" onChange={e=>setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste}/>
      <div className="cap-bar">
       <div className="cap-modes">{MODES.map(m=>{const I=MODE_ICON[m];return <button key={m} className={mode===m?'on':''} onMouseDown={e=>e.preventDefault()} onClick={()=>{setMode(m);area.current?.focus();}}><I size={13} weight={mode===m?'fill':'regular'}/>{MODE_LABEL[m]}</button>;})}</div>
       <span className="cap-plan">{state==='saving'?'Saving…':state==='error'?'Could not save':plan&&!asksFirst?'→ '+labelFor(plan):''}</span>
       <span className="cap-hint"><kbd>Enter</kbd> {asksFirst?'next':'save'} <kbd>Tab</kbd> switch <kbd>Esc</kbd> close</span>
      </div>
     </>}
   </div>
   {key&&state!=='done'&&<div className="cap-key">Open anywhere with {key}</div>}
  </div>
 );
}
