import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Smiley,ImageSquare,X,UploadSimple,Trash,ArrowsOutCardinal,Check} from '@phosphor-icons/react';
import {api} from './api.js';
import {useFileUrl} from './hooks.js';
import {ICON_NAMES,Glyph} from './icons.jsx';
import {placeImage,panBy} from './coverfit.mjs';
import {DITHERS,ditherStyle} from './dither.js';

// Gradients that sit well with the sage and paper palette.
export const COVERS=[
 {id:'sage',css:'linear-gradient(120deg,#8fae93,#dfeadb)'},{id:'forest',css:'linear-gradient(120deg,#2f4a37,#7c9d7f)'},
 {id:'sand',css:'linear-gradient(120deg,#e6d4a6,#f7f0dc)'},{id:'peach',css:'linear-gradient(120deg,#efb99a,#fbe6d6)'},
 {id:'rose',css:'linear-gradient(120deg,#dca8ba,#f7e3ea)'},{id:'dusk',css:'linear-gradient(120deg,#7a6aa8,#d8d2ee)'},
 {id:'sky',css:'linear-gradient(120deg,#9dbfe0,#e5eff8)'},{id:'night',css:'linear-gradient(120deg,#22291f,#4d5f4a)'}
];

// An uploaded picture is placed by hand: drag to move it, slide to zoom. While adjusting, `live` overrides the saved position.
function Cover({cover,live,adjusting,onPan}){
 const url=useFileUrl(cover&&cover.type==='image'?cover.fileId:null,'image/*');
 const [box,setBox]=useState(null),[nat,setNat]=useState(null),[el,setEl]=useState(null),drag=useRef(null);
 useLayoutEffect(()=>{
  if(!el||typeof ResizeObserver==='undefined')return;
  const measure=()=>setBox({w:el.clientWidth,h:el.clientHeight});measure();
  const ro=new ResizeObserver(measure);ro.observe(el);return()=>ro.disconnect();
 },[el]);
 if(!cover)return null;
 if(cover.type==='dither')return <div className="nh-cover-art nh-dither" style={ditherStyle(cover.id,192,40)}/>;
 if(cover.type!=='image')return <div className="nh-cover-art" style={{background:(COVERS.find(c=>c.id===cover.id)||COVERS[0]).css}}/>;
 const pos=live||{x:cover.x??50,y:cover.y??50,zoom:cover.zoom??1},p=placeImage(box,nat,pos);
 const down=e=>{if(!adjusting)return;e.preventDefault();drag.current={x:e.clientX,y:e.clientY,pos};e.currentTarget.setPointerCapture(e.pointerId);};
 const move=e=>{const d=drag.current;if(!d)return;onPan(panBy(box,nat,d.pos,e.clientX-d.x,e.clientY-d.y));};
 const up=()=>{drag.current=null;};
 return (
  <div ref={setEl} className={'nh-cover-art nh-photo'+(adjusting?' adjusting':'')} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
   {url&&<img src={url} alt="" draggable={false} onLoad={e=>setNat({w:e.target.naturalWidth,h:e.target.naturalHeight})}
    style={p?{width:p.width,height:p.height,left:p.left,top:p.top}:{width:'100%',height:'100%',objectFit:'cover'}}/>}
  </div>
 );
}

// The top of a page: an optional cover, and an icon. Both are optional and reveal their buttons on hover.
export function NoteHead({note,readOnly,onChange}){
 const [menu,setMenu]=useState(null),[adjust,setAdjust]=useState(null),file=useRef(null),box=useRef(null),icon=useRef(null),frame=useRef(null);
 useEffect(()=>{
  if(!menu)return;
  const off=e=>{if(!e.target.closest?.('.nh-pop,.nh-anchor'))setMenu(null);};
  window.addEventListener('mousedown',off);return()=>window.removeEventListener('mousedown',off);
 },[menu]);
 useEffect(()=>{if(menu&&box.current)gsap.fromTo(box.current,{opacity:0,y:-6},{opacity:1,y:0,duration:.2,ease:'power3.out'});},[menu]);
 useEffect(()=>{setAdjust(null);},[note.id]);
 const upload=async f=>{
  if(!f||!f.type.startsWith('image/'))return;
  const id=await api.putFile(await f.arrayBuffer());
  if(id){onChange({cover:{type:'image',fileId:id,x:50,y:50,zoom:1}});setAdjust({x:50,y:50,zoom:1});}
  setMenu(null);
 };
 const pickIcon=n=>{onChange({icon:n||undefined});setMenu(null);if(n&&icon.current)gsap.fromTo(icon.current,{scale:.4,rotate:-20},{scale:1,rotate:0,duration:.5,ease:'back.out(2.4)'});};
 const has=!!note.cover,isPhoto=has&&note.cover.type==='image';
 const startAdjust=()=>{setMenu(null);setAdjust({x:note.cover.x??50,y:note.cover.y??50,zoom:note.cover.zoom??1});};
 const saveAdjust=()=>{onChange({cover:{...note.cover,x:adjust.x,y:adjust.y,zoom:adjust.zoom}});setAdjust(null);};
 return (
  <div className={'nh'+(has?' has-cover':'')+(note.icon?' has-icon':'')}>
   {has&&<div className="nh-cover" ref={frame}>
    <Cover cover={note.cover} live={adjust} adjusting={!!adjust} onPan={setAdjust}/>
    {adjust
     ?<div className="nh-adjust" onPointerDown={e=>e.stopPropagation()}>
       <span><ArrowsOutCardinal size={14}/>Drag the picture to move it</span>
       <input type="range" min="1" max="3" step="0.02" aria-label="Zoom" value={adjust.zoom} onChange={e=>setAdjust(a=>({...a,zoom:Number(e.target.value)}))}/>
       <button className="ok" onClick={saveAdjust}><Check size={13} weight="bold"/>Done</button>
       <button onClick={()=>setAdjust(null)}>Cancel</button>
      </div>
     :!readOnly&&<div className="nh-cover-acts">
       {isPhoto&&<button onClick={startAdjust}><ArrowsOutCardinal size={14}/>Reposition</button>}
       <span className="nh-anchor"><button onClick={()=>setMenu(m=>m==='cover'?null:'cover')}><ImageSquare size={14}/>Change cover</button></span>
       <button aria-label="Remove cover" onClick={()=>{onChange({cover:undefined});setAdjust(null);}}><X size={13}/></button>
      </div>}
   </div>}
   <div className="nh-row">
    {note.icon
     ?<span className="nh-anchor"><button ref={icon} className="nh-icon" disabled={readOnly} aria-label="Change icon" onClick={()=>setMenu(m=>m==='icon'?null:'icon')}><Glyph name={note.icon} size={38}/></button></span>
     :null}
    {!readOnly&&<div className="nh-add">
     {!note.icon&&<span className="nh-anchor"><button onClick={()=>setMenu(m=>m==='icon'?null:'icon')}><Smiley size={14}/>Add icon</button></span>}
     {!has&&<span className="nh-anchor"><button onClick={()=>setMenu(m=>m==='cover'?null:'cover')}><ImageSquare size={14}/>Add cover</button></span>}
    </div>}
   </div>
   {menu==='icon'&&<div className="nh-pop nh-emoji" ref={box}>
    <div className="nh-grid">{ICON_NAMES.map(n=><button key={n} aria-label={n} className={note.icon===n?'on':''} onClick={()=>pickIcon(n)}><Glyph name={n} size={22}/></button>)}</div>
    {note.icon&&<button className="nh-remove" onClick={()=>pickIcon('')}><Trash size={13}/>Remove icon</button>}
   </div>}
   {menu==='cover'&&<div className="nh-pop nh-covers" ref={box}>
    <div className="nh-swatches">{DITHERS.map(d=><button key={d.id} aria-label={'Dithered cover '+d.name} className={'nh-dsw'+(note.cover&&note.cover.id===d.id?' on':'')} style={ditherStyle(d.id,48,12)} onClick={()=>{onChange({cover:{type:'dither',id:d.id}});setMenu(null);}}/>)}{COVERS.map(c=><button key={c.id} aria-label={'Cover '+c.id} className={note.cover&&note.cover.id===c.id?'on':''} style={{background:c.css}} onClick={()=>{onChange({cover:{type:'gradient',id:c.id}});setMenu(null);}}/>)}</div>
    <button className="nh-upload" onClick={()=>file.current?.click()}><UploadSimple size={14}/>Upload an image</button>
    <input ref={file} type="file" accept="image/*" hidden onChange={e=>{upload(e.target.files[0]);e.target.value='';}}/>
   </div>}
  </div>
 );
}
