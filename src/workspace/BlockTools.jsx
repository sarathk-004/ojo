import React,{useEffect,useRef,useState} from 'react';
import {DotsSixVertical,Columns,Trash,X} from '@phosphor-icons/react';

// Blocks you can pick up and place, like Notion: every top-level piece of a page (and every piece inside a column) has a grip.
// Drag the grip above or below another block to reorder, or onto its left or right edge to set the two side by side.
// Drag a box over empty space to select several blocks, then move, set side by side, or delete them together.

const MAX_COLS=4;

export const blockOf=(ed,node)=>{
 let n=node&&node.nodeType===3?node.parentElement:node;
 while(n&&n!==ed){
  const p=n.parentElement;
  if(p===ed&&!n.classList.contains('cols'))return n;
  if(p&&p.classList&&p.classList.contains('col'))return n;
  n=p;
 }
 return null;
};
const allBlocks=ed=>{
 const out=[];
 for(const c of ed.children){
  if(c.classList.contains('cols')){for(const col of c.children)for(const b of col.children)out.push(b);}
  else out.push(c);
 }
 return out;
};
const newCol=blocks=>{const c=document.createElement('div');c.className='col';blocks.forEach(b=>c.appendChild(b));if(!c.children.length)c.innerHTML='<p><br></p>';return c;};

// Tidy after a move: no empty columns, no column set with a single column, always a paragraph to type in at the end.
export function normalise(ed){
 ed.querySelectorAll('.col').forEach(col=>{if(!col.children.length)col.remove();});
 ed.querySelectorAll('.cols').forEach(cs=>{
  if(cs.children.length===0)cs.remove();
  else if(cs.children.length===1){const col=cs.firstElementChild;while(col.firstChild)cs.before(col.firstChild);cs.remove();}
  else cs.dataset.n=String(cs.children.length);
 });
 const last=ed.lastElementChild;
 if(!last||last.classList.contains('cols')||/^(TABLE|HR|DETAILS)$/.test(last.tagName)||last.classList.contains('cblock')){const p=document.createElement('p');p.innerHTML='<br>';ed.appendChild(p);}
}

export function moveBlocks(ed,els,target,zone){
 if(!els.length||els.some(e=>e===target||e.contains(target)))return false;
 if(zone==='before'){els.forEach(e=>target.before(e));}
 else if(zone==='after'){[...els].reverse().forEach(e=>target.after(e));}
 else{
  const col=target.parentElement&&target.parentElement.classList.contains('col')?target.parentElement:null;
  if(col){
   if(col.parentElement.children.length>=MAX_COLS)[...els].reverse().forEach(e=>target.after(e));
   else{const nc=newCol(els);zone==='left'?col.before(nc):col.after(nc);}
  }else{
   const cs=document.createElement('div');cs.className='cols';
   target.before(cs);
   const mine=newCol([target]),theirs=newCol(els);
   if(zone==='left'){cs.appendChild(theirs);cs.appendChild(mine);}else{cs.appendChild(mine);cs.appendChild(theirs);}
  }
 }
 normalise(ed);
 return true;
}

// Wrap selected blocks into columns, one block per column (extra blocks join the last column).
export function setSideBySide(ed,els){
 if(els.length<2)return false;
 const cs=document.createElement('div');cs.className='cols';
 els[0].before(cs);
 const groups=els.slice(0,MAX_COLS).map(e=>[e]);
 els.slice(MAX_COLS).forEach(e=>groups[groups.length-1].push(e));
 groups.forEach(g=>cs.appendChild(newCol(g)));
 normalise(ed);return true;
}

export function BlockTools({editor,onChange,remember,readOnly}){
 const [grip,setGrip]=useState(null),[drop,setDrop]=useState(null),[lasso,setLasso]=useState(null),[bar,setBar]=useState(null);
 const st=useRef({hover:null,drag:null,sel:[],dropTo:null,overGrip:false,hideT:null});
 const clearSel=()=>{st.current.sel.forEach(e=>e.classList&&e.classList.remove('blk-sel'));st.current.sel=[];setBar(null);};
 const showBar=()=>{
  const sel=st.current.sel.filter(e=>e.isConnected);st.current.sel=sel;
  if(!sel.length){setBar(null);return;}
  const rs=sel.map(e=>e.getBoundingClientRect());
  setBar({x:Math.round(Math.min(...rs.map(r=>r.right))-0),y:Math.round(Math.max(8,Math.min(...rs.map(r=>r.top))-44)),n:sel.length});
 };

 useEffect(()=>{
  const ed=editor.current;if(!ed||readOnly)return;
  const S=st.current;
  const move=e=>{
   if(S.drag||S.lassoing)return;
   if(e.target===ed){return;}
   const b=blockOf(ed,e.target);
   if(!b){return;}
   if(S.hover===b)return;
   S.hover=b;clearTimeout(S.hideT);
   const r=b.getBoundingClientRect();
   setGrip({x:Math.round(r.left-26),y:Math.round(r.top+2)});
  };
  const leave=()=>{S.hideT=setTimeout(()=>{if(!S.overGrip&&!S.drag){S.hover=null;setGrip(null);}},220);};

  // ---- dragging blocks
  const over=e=>{
   if(!S.drag)return;
   e.preventDefault();e.dataTransfer.dropEffect='move';
   const b=blockOf(ed,e.target);
   if(!b||S.drag.some(x=>x===b||x.contains(b))){setDrop(null);S.dropTo=null;return;}
   const r=b.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
   let zone;
   if(fx<.16)zone='left';else if(fx>.84)zone='right';else zone=fy<.5?'before':'after';
   S.dropTo={b,zone};
   setDrop(zone==='left'||zone==='right'
    ?{x:Math.round(zone==='left'?r.left-6:r.right+3),y:Math.round(r.top),w:3,h:Math.round(r.height)}
    :{x:Math.round(r.left),y:Math.round(zone==='before'?r.top-3:r.bottom+1),w:Math.round(r.width),h:3});
  };
  const dropped=e=>{
   if(!S.drag)return;
   e.preventDefault();
   const t=S.dropTo,els=S.drag;S.drag=null;S.dropTo=null;setDrop(null);
   if(t){remember&&remember('Blocks moved');if(moveBlocks(ed,els,t.b,t.zone)){clearSel();onChange&&onChange();}}
  };
  const dragEnd=()=>{S.drag=null;S.dropTo=null;setDrop(null);};

  // ---- selecting blocks with a box
  const down=e=>{
   if(e.button!==0)return;
   if(e.target!==ed){if(S.sel.length&&!e.target.closest('.blk-sel'))clearSel();return;}
   // pressed on the page margin or empty space: start a selection box
   const sx=e.clientX,sy=e.clientY;let moved=false;
   if(!e.shiftKey)clearSel();
   S.lassoing=true;
   const mv=ev=>{
    if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
    moved=true;ev.preventDefault();
    const x=Math.min(sx,ev.clientX),y=Math.min(sy,ev.clientY),w=Math.abs(ev.clientX-sx),h=Math.abs(ev.clientY-sy);
    setLasso({x,y,w,h});
    const hit=allBlocks(ed).filter(b=>{const r=b.getBoundingClientRect();return r.left<x+w&&r.right>x&&r.top<y+h&&r.bottom>y;});
    S.sel.forEach(b=>{if(!hit.includes(b))b.classList.remove('blk-sel');});
    hit.forEach(b=>b.classList.add('blk-sel'));S.sel=hit;
   };
   const up=()=>{
    window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
    S.lassoing=false;setLasso(null);
    if(moved){showBar();window.getSelection().removeAllRanges();}
   };
   window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  };
  const key=e=>{
   if(!S.sel.length)return;
   if(e.target.closest&&e.target.closest('input,textarea'))return;
   if(e.key==='Escape'){clearSel();return;}
   if(e.key==='Delete'||e.key==='Backspace'){
    e.preventDefault();e.stopPropagation();
    remember&&remember('Blocks deleted');
    S.sel.forEach(b=>b.remove());clearSel();normalise(ed);onChange&&onChange();
   }
  };
  ed.addEventListener('mousemove',move);ed.addEventListener('mouseleave',leave);
  ed.addEventListener('dragover',over);ed.addEventListener('drop',dropped);ed.addEventListener('pointerdown',down);
  document.addEventListener('dragend',dragEnd);ed.addEventListener('keydown',key,true);
  return()=>{ed.removeEventListener('mousemove',move);ed.removeEventListener('mouseleave',leave);ed.removeEventListener('dragover',over);ed.removeEventListener('drop',dropped);ed.removeEventListener('pointerdown',down);document.removeEventListener('dragend',dragEnd);ed.removeEventListener('keydown',key,true);clearSel();};
 // eslint-disable-next-line
 },[editor,readOnly]);

 const gripDrag=e=>{
  const S=st.current,b=S.hover;if(!b)return;
  const ed=editor.current;
  S.drag=S.sel.includes(b)?allBlocks(ed).filter(x=>S.sel.includes(x)):[b];
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','ojo-blocks');
  try{e.dataTransfer.setDragImage(b,12,12);}catch{}
  setGrip(null);
 };
 const sideBySide=()=>{const S=st.current,ed=editor.current;remember&&remember('Set side by side');const els=allBlocks(ed).filter(x=>S.sel.includes(x));if(setSideBySide(ed,els)){clearSel();onChange&&onChange();}};
 const deleteSel=()=>{const S=st.current,ed=editor.current;remember&&remember('Blocks deleted');S.sel.forEach(b=>b.remove());clearSel();normalise(ed);onChange&&onChange();};

 return (
  <>
   {grip&&!readOnly&&<button type="button" className="bt-grip" aria-label="Drag to move this block" draggable style={{left:grip.x,top:grip.y}}
     onMouseEnter={()=>{st.current.overGrip=true;clearTimeout(st.current.hideT);}} onMouseLeave={()=>{st.current.overGrip=false;}}
     onDragStart={gripDrag} onDragEnd={()=>{st.current.drag=null;setDrop(null);}} onMouseDown={e=>e.stopPropagation()}><DotsSixVertical size={16} weight="bold"/></button>}
   {drop&&<div className="bt-drop" style={{left:drop.x,top:drop.y,width:drop.w,height:drop.h}}/>}
   {lasso&&<div className="bt-lasso" style={{left:lasso.x,top:lasso.y,width:lasso.w,height:lasso.h}}/>}
   {bar&&<div className="bt-bar" style={{left:Math.max(8,bar.x-250),top:bar.y}} onMouseDown={e=>e.preventDefault()}>
    <span>{bar.n} {bar.n===1?'block':'blocks'}</span>
    {bar.n>1&&<button onClick={sideBySide}><Columns size={14}/>Side by side</button>}
    <button className="danger" onClick={deleteSel}><Trash size={14}/>Delete</button>
    <button className="icon-btn" aria-label="Clear selection" onClick={clearSel}><X size={13}/></button>
   </div>}
  </>
 );
}
