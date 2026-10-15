import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CaretDown,Check,MagnifyingGlass} from '@phosphor-icons/react';
import {ALL_LANGS,langName} from './highlight.js';

// A language dropdown for code: Auto-detect and Plain text first, then every language A to Z. Type to search.
// value: a language id, or '' for Auto-detect. autoLabel names what Auto-detect found.
export function LangPicker({value,autoLabel,onChange,label='Code language'}){
 const btn=useRef(null),menu=useRef(null),list=useRef(null),input=useRef(null);
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[pos,setPos]=useState(null),[active,setActive]=useState(0);

 const rows=useMemo(()=>{
  const s=q.trim().toLowerCase();
  const match=l=>!s||l.name.toLowerCase().includes(s)||l.id.includes(s)||l.aliases.some(a=>a.includes(s));
  const out=[];
  if(!s||'auto detect'.includes(s))out.push({kind:'opt',value:'',name:'Auto-detect'});
  if(!s||'plain text'.includes(s))out.push({kind:'opt',value:'plaintext',name:'Plain text'});
  let letter='';
  for(const l of ALL_LANGS){
   if(!match(l))continue;
   const first=(l.name[0]||'').toUpperCase(),head=/[A-Z]/.test(first)?first:'#';
   if(!s&&head!==letter){letter=head;out.push({kind:'head',name:head});}
   out.push({kind:'opt',value:l.id,name:l.name});
  }
  return out;
 },[q]);
 const opts=rows.filter(r=>r.kind==='opt');
 const current=value===''?'':value;
 const shown=value===''?(autoLabel?'Auto · '+autoLabel:'Auto-detect'):langName(value);

 const close=()=>{setOpen(false);setQ('');};
 const choose=o=>{onChange(o.value);close();};

 // Sit under the button (or above it), at the button's left edge, before the first paint so nothing jumps.
 useLayoutEffect(()=>{
  if(!open||!btn.current)return;
  const r=btn.current.getBoundingClientRect(),width=250,height=340,room=window.innerHeight-r.bottom;
  const up=room<height+12&&r.top>room;
  setPos({left:Math.max(8,Math.min(r.left,window.innerWidth-width-8)),width,top:up?undefined:r.bottom+6,bottom:up?window.innerHeight-r.top+6:undefined});
  setActive(Math.max(0,opts.findIndex(o=>o.value===current)));
 // eslint-disable-next-line
 },[open]);
 useEffect(()=>{if(open&&pos)input.current?.focus({preventScroll:true});},[open,!!pos]);
 useEffect(()=>{
  if(!open)return;
  const down=e=>{if(!menu.current?.contains(e.target)&&!btn.current?.contains(e.target))close();};
  window.addEventListener('mousedown',down);window.addEventListener('resize',close);
  return()=>{window.removeEventListener('mousedown',down);window.removeEventListener('resize',close);};
 },[open]);
 // Keep the highlighted row in view inside the list only (never scrolls the page behind it).
 useEffect(()=>{
  const el=list.current?.querySelector('.lp-opt.active');if(!el||!list.current)return;
  const l=list.current,top=el.offsetTop,bottom=top+el.offsetHeight;
  if(top<l.scrollTop+30)l.scrollTop=Math.max(0,top-30);else if(bottom>l.scrollTop+l.clientHeight)l.scrollTop=bottom-l.clientHeight+6;
 },[active,rows]);
 useEffect(()=>{setActive(0);},[q]);

 const onKey=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();btn.current?.focus();}
  else if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(opts.length-1,a+1));}
  else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(0,a-1));}
  else if(e.key==='Enter'){e.preventDefault();if(opts[active])choose(opts[active]);}
 };
 const host=document.querySelector('.ws')||document.body;
 let n=-1;
 return (
  <>
   <button type="button" ref={btn} className={'lang-btn'+(open?' open':'')} aria-label={label} aria-haspopup="listbox" aria-expanded={open}
    onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(o=>!o)}>
    <span>{shown}</span><CaretDown size={12} weight="bold"/>
   </button>
   {open&&pos&&createPortal(
    <div ref={menu} className="lang-menu" style={pos} onMouseDown={e=>{if(e.target!==input.current)e.preventDefault();}}>
     <label className="lp-search"><MagnifyingGlass size={14}/><input ref={input} placeholder="Search languages" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey}/></label>
     <div ref={list} className="lp-list" role="listbox">
      {rows.map((r,i)=>{
       if(r.kind==='head')return <div key={'h'+r.name+i} className="lp-head">{r.name}</div>;
       n++;const idx=n,on=String(r.value)===String(current);
       return <button type="button" key={r.value+'-'+i} role="option" aria-selected={on} className={'lp-opt'+(idx===active?' active':'')+(on?' on':'')} onMouseEnter={()=>setActive(idx)} onClick={()=>choose(r)}><span>{r.name}</span>{on&&<Check size={14} weight="bold"/>}</button>;
      })}
      {!opts.length&&<p className="lp-none">No language matches “{q}”.</p>}
     </div>
    </div>,host)}
  </>
 );
}
