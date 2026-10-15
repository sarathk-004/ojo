import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CaretDown,Check} from '@phosphor-icons/react';

// A dropdown in the workspace's own look, in place of the browser's native one.
// options: strings, or {value,label}. Arrow keys, Enter, Esc and type-to-jump all work.
export function Select({value,onChange,options,placeholder='Select',label,className='',compact,block,disabled,keepFocus,onOpenChange}){
 const btn=useRef(null),menu=useRef(null),typed=useRef({s:'',t:0});
 const [open,setOpen]=useState(false),[pos,setPos]=useState(null),[active,setActive]=useState(0);
 const items=options.map(o=>typeof o==='object'?o:{value:o,label:String(o)});
 const idx=items.findIndex(o=>String(o.value)===String(value));
 const cur=items[idx];
 const close=()=>{setOpen(false);onOpenChange?.(false);};
 const choose=o=>{onChange(o.value);close();btn.current?.focus();};

 // Sit under the button, or above it when there is no room.
 useLayoutEffect(()=>{
  if(!open||!btn.current)return;
  const r=btn.current.getBoundingClientRect(),height=Math.min(300,items.length*34+14),room=window.innerHeight-r.bottom;
  const up=room<height+12&&r.top>room;
  const width=Math.max(r.width,170);
  setPos({left:Math.max(8,Math.min(r.left,window.innerWidth-width-8)),minWidth:r.width,top:up?undefined:r.bottom+6,bottom:up?window.innerHeight-r.top+6:undefined});
  setActive(Math.max(0,idx));
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const down=e=>{if(!menu.current?.contains(e.target)&&!btn.current?.contains(e.target))close();};
  const away=e=>{if(!menu.current?.contains(e.target))close();};
  window.addEventListener('mousedown',down);window.addEventListener('resize',close);window.addEventListener('wheel',away,{passive:true,capture:true});
  return()=>{window.removeEventListener('mousedown',down);window.removeEventListener('resize',close);window.removeEventListener('wheel',away,{capture:true});};
 },[open]);
 useEffect(()=>{if(open)menu.current?.querySelector('.sel-opt.active')?.scrollIntoView({block:'nearest'});},[active,open,pos]);

 const onKey=e=>{
  if(disabled)return;
  if(!open){
   if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();setOpen(true);onOpenChange?.(true);}
   return;
  }
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  else if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>(a+1)%items.length);}
  else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>(a-1+items.length)%items.length);}
  else if(e.key==='Home'){e.preventDefault();setActive(0);}
  else if(e.key==='End'){e.preventDefault();setActive(items.length-1);}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(items[active])choose(items[active]);}
  else if(e.key==='Tab')close();
  else if(e.key.length===1){
   // Typing jumps to the first option starting with those letters.
   const t=typed.current,now=Date.now();
   t.s=(now-t.t>700?'':t.s)+e.key.toLowerCase();t.t=now;
   const i=items.findIndex(o=>o.label.toLowerCase().startsWith(t.s));
   if(i>=0)setActive(i);
  }
 };
 const host=document.querySelector('.ws')||document.body;
 return (
  <>
   <button type="button" ref={btn} disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open}
    className={'sel '+className+(open?' open':'')+(compact?' compact':'')+(block?' block':'')+(cur?'':' empty')}
    onMouseDown={keepFocus?e=>e.preventDefault():undefined} onClick={e=>{e.stopPropagation();if(open)close();else{setOpen(true);onOpenChange?.(true);}}} onKeyDown={onKey}>
    <span className="sel-label">{cur?cur.label:placeholder}</span><CaretDown size={13} weight="bold" className="sel-caret"/>
   </button>
   {open&&pos&&createPortal(
    <div ref={menu} className="sel-menu" role="listbox" style={pos} onMouseDown={e=>e.preventDefault()}>
     {items.map((o,i)=>{
      const on=String(o.value)===String(value);
      return (
       <button type="button" key={String(o.value)+i} role="option" aria-selected={on} className={'sel-opt'+(i===active?' active':'')+(on?' on':'')}
        onMouseEnter={()=>setActive(i)} onClick={e=>{e.stopPropagation();choose(o);}}>
        <span>{o.label}</span>{on&&<Check size={14} weight="bold"/>}
       </button>
      );
     })}
    </div>,host)}
  </>
 );
}
