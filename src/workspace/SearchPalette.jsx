import React,{useEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {MagnifyingGlass,NotePencil,CheckCircle,BookmarkSimple,FilePdf,Briefcase,Wallet,CalendarBlank,Receipt,ArrowElbowDownLeft,TreeStructure} from '@phosphor-icons/react';
import {api} from './api.js';
import {TYPES,entries,search,sectionOf} from './search.mjs';

const ICON={notes:NotePencil,tasks:CheckCircle,saved:BookmarkSimple,pdfs:FilePdf,jobs:Briefcase,finance:Wallet,events:CalendarBlank,bills:Receipt,canvas:TreeStructure};
const COLOR={notes:'#4f7ea8',tasks:'#567458',saved:'#c9803f',pdfs:'#b4533f',jobs:'#7a6aa8',finance:'#3d8f8f',events:'#a85a7a',bills:'#c9803f',canvas:'#4a7ba6'};

// Wraps the matched words in <mark>.
function Marked({text,q}){
 const words=q.toLowerCase().split(/\s+/).filter(Boolean);
 if(!words.length||!text)return text||null;
 const re=new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','ig');
 return text.split(re).map((p,i)=>i%2?<mark key={i}>{p}</mark>:p);
}

// Ctrl+K: one box that searches notes, tasks, saved items, PDFs, jobs, finance and calendar events.
export function SearchPalette({onClose,go}){
 const [q,setQ]=useState(''),[data,setData]=useState(null),[type,setType]=useState('all'),[idx,setIdx]=useState(0);
 const box=useRef(null),listRef=useRef(null);
 useEffect(()=>{api.load().then(setData);},[]);
 useEffect(()=>{gsap.fromTo(box.current,{opacity:0,y:-14,scale:.98},{opacity:1,y:0,scale:1,duration:.22,ease:'power3.out'});},[]);
 const list=useMemo(()=>data?entries(data):[],[data]);
 const counts=useMemo(()=>{const c={};for(const e of list)c[e.type]=(c[e.type]||0)+1;return c;},[list]);
 const results=useMemo(()=>q.trim()?search(data||{},q,{list,types:type==='all'?null:[type],limit:40}):[],[q,list,type,data]);
 // Nothing typed yet: the most recently touched things.
 const recent=useMemo(()=>q.trim()?[]:[...list].filter(e=>e.date&&(type==='all'||e.type===type)).sort((a,b)=>b.date-a.date).slice(0,8).map(e=>({...e,snippet:e.body.slice(0,110)})),[list,q,type]);
 const shown=q.trim()?results:recent;
 useEffect(()=>{setIdx(0);},[q,type]);
 useEffect(()=>{listRef.current?.querySelector('.on')?.scrollIntoView({block:'nearest'});},[idx]);

 const open=r=>{onClose();go(sectionOf(r.type),r.id);};
 const key=e=>{
  if(e.key==='Escape'){e.preventDefault();onClose();}
  else if(e.key==='ArrowDown'){e.preventDefault();setIdx(i=>Math.min(shown.length-1,i+1));}
  else if(e.key==='ArrowUp'){e.preventDefault();setIdx(i=>Math.max(0,i-1));}
  else if(e.key==='Enter'&&shown[idx]){e.preventDefault();open(shown[idx]);}
  else if(e.key==='Tab'){e.preventDefault();const ids=['all',...TYPES.map(t=>t.id)],i=ids.indexOf(type);setType(ids[(i+(e.shiftKey?-1:1)+ids.length)%ids.length]);}
 };
 return (
  <div className="sp-back" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <div className="sp" ref={box} role="dialog" aria-label="Search everything" onKeyDown={key}>
    <label className="sp-input"><MagnifyingGlass size={19}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search notes, tasks, saved items, PDFs, jobs, money and events" spellCheck="false"/><kbd>Esc</kbd></label>
    <div className="sp-types">
     <button className={type==='all'?'on':''} onClick={()=>setType('all')}>All</button>
     {TYPES.map(t=>counts[t.id]?<button key={t.id} className={type===t.id?'on':''} onClick={()=>setType(t.id)}>{t.label}<em>{counts[t.id]}</em></button>:null)}
    </div>
    <div className="sp-list" ref={listRef}>
     {!q.trim()&&shown.length>0&&<div className="sp-head">Recent</div>}
     {shown.map((r,i)=>{const Icon=ICON[r.type];return (
      <button key={r.type+r.id} className={'sp-row'+(i===idx?' on':'')} onMouseMove={()=>setIdx(i)} onClick={()=>open(r)}>
       <span className="sp-ic" style={{'--c':COLOR[r.type]}}><Icon size={17} weight="duotone"/></span>
       <span className="sp-main">
        <b><Marked text={r.title||'Untitled'} q={q}/></b>
        {r.snippet&&<span className="sp-snip"><Marked text={r.snippet} q={q}/></span>}
       </span>
       <span className="sp-type">{TYPES.find(t=>t.id===r.type)?.label}</span>
       {i===idx&&<ArrowElbowDownLeft size={14} className="sp-enter"/>}
      </button>
     );})}
     {q.trim()&&!shown.length&&data&&<p className="sp-empty">Nothing matches “{q}”.</p>}
     {!q.trim()&&!shown.length&&data&&<p className="sp-empty">Type to search everything you have saved in ojo.</p>}
    </div>
    <div className="sp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Tab</kbd> filter</span></div>
   </div>
  </div>
 );
}
