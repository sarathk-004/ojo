import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Plus,Trash,ArrowUUpLeft,ArrowUUpRight,MagnifyingGlassPlus,MagnifyingGlassMinus,ArrowsIn,Sparkle,Smiley,TextT,TextB,TextItalic,ChatCircleText,FrameCorners,GridFour,Tag,Square,Circle,Diamond,Hexagon,Rectangle,ArrowRight,ArrowsHorizontal,Minus,AlignLeft,AlignRight,AlignTop,AlignBottom,AlignCenterHorizontal,AlignCenterVertical,ArrowsOutLineHorizontal,ArrowsOutLineVertical,TextAa,X,TreeStructure,Selection} from '@phosphor-icons/react';
import {Select} from './Select.jsx';
import {Glyph,ICON_NAMES} from './icons.jsx';
import {NODE_COLORS,NODE_W,NODE_H,SHAPES,FONTS,SIZES,EDGE_COLORS,newNode,newEdge,newGroup,isGroup,kindOf,hasEdge,parentOf,childSpot,anchors,tidy,fitView,zoomAt,withoutNodes,snapMove,snapGrid,nearestBox,insideGroup,frameAround,alignBoxes,allTags,cleanTag,makeHistory,pushHistory,undo as histUndo,redo as histRedo} from './canvas.mjs';

const GRID=20;
const SHAPE_ICON={round:Rectangle,pill:Square,ellipse:Circle,diamond:Diamond,hexagon:Hexagon};
const SHAPE_NAME={round:'Rounded',pill:'Pill',ellipse:'Ellipse',diamond:'Diamond',hexagon:'Hexagon'};
const COMMENT_FILL='#f6ecb4';
const fillOf=n=>kindOf(n)==='comment'&&(!n.color||n.color==='sage')?COMMENT_FILL:(NODE_COLORS[n.color]||NODE_COLORS.sage);

// One idea, text label or comment. Module level so it never remounts while you type.
function NodeBox({n,picked,editing,target,dim,tidying,onDown,onEditDone,onSize,onHandle,onDouble}){
 const el=useRef(null),kind=kindOf(n),shape=n.shape||'round';
 useLayoutEffect(()=>{
  const e=el.current;if(!e)return;
  const report=()=>onSize(n.id,e.offsetWidth,e.offsetHeight);report();
  if(typeof ResizeObserver==='undefined')return;
  const ro=new ResizeObserver(report);ro.observe(e);return()=>ro.disconnect();
 },[n.id]);
 const [text,setText]=useState(n.text);
 useEffect(()=>{if(!editing)setText(n.text);},[n.text,editing]);
 const done=how=>onEditDone(n.id,text.replace(/\s+$/,''),how);
 const style={left:n.x,top:n.y,'--nc':fillOf(n),fontFamily:FONTS[n.font]?FONTS[n.font].css:undefined,fontSize:SIZES[n.size||'m'],fontWeight:n.bold?700:undefined,fontStyle:n.italic?'italic':undefined};
 return (
  <div ref={el} data-id={n.id} className={'cv-node k-'+kind+' s-'+shape+(picked?' picked':'')+(editing?' editing':'')+(target?' target':'')+(dim?' dim':'')+(tidying?' tidying':'')} style={style}
   onPointerDown={e=>onDown(e,n)} onDoubleClick={e=>{e.stopPropagation();onDouble(n.id);}}>
   {(shape==='diamond'||shape==='hexagon')&&kind!=='text'&&<svg className="cv-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{shape==='diamond'?<polygon points="50,2 98,50 50,98 2,50"/>:<polygon points="24,3 76,3 98,50 76,97 24,97 2,50"/>}</svg>}
   <div className="cv-body">
    {kind==='comment'&&!n.icon&&<span className="cv-ico"><ChatCircleText size={16} weight="duotone"/></span>}
    {n.icon&&<span className="cv-ico"><Glyph name={n.icon} size={18}/></span>}
    {editing
     ?<textarea autoFocus className="cv-edit" value={text} rows={1} placeholder={kind==='text'?'Text':kind==='comment'?'Comment':'Idea'} onChange={e=>setText(e.target.value)} onPointerDown={e=>e.stopPropagation()}
        onFocus={e=>e.target.setSelectionRange(e.target.value.length,e.target.value.length)} onBlur={()=>done('blur')}
        onKeyDown={e=>{
         e.stopPropagation();
         if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();done('stop');}
         else if(e.key==='Tab'&&kind!=='text'){e.preventDefault();done('child');}
         else if(e.key==='Escape'){e.preventDefault();done('stop');}
        }}/>
     :<span className={'cv-text'+(n.text?'':' ph')}>{n.text||(kind==='text'?'Text':kind==='comment'?'Comment':'Idea')}</span>}
   </div>
   {(n.tags&&n.tags.length>0)&&<div className="cv-tags">{n.tags.map(t=><span key={t} className="cv-tag">#{t}</span>)}</div>}
   {['top','right','bottom','left'].map(s=><button key={s} type="button" tabIndex={-1} className={'cv-h '+s} aria-label="Drag to connect" onPointerDown={e=>onHandle(e,n)}/>)}
  </div>
 );
}

// A named frame that holds other ideas. Move it and what sits inside moves along.
function GroupBox({g,picked,editing,dim,dropIn,count,onDown,onTitleDone,onResize,onDouble}){
 const [title,setTitle]=useState(g.text);
 useEffect(()=>{if(!editing)setTitle(g.text);},[g.text,editing]);
 return (
  <div data-id={g.id} className={'cv-group'+(picked?' picked':'')+(dim?' dim':'')+(dropIn?' drop-in':'')} style={{left:g.x,top:g.y,width:g.w,height:g.h,'--nc':NODE_COLORS[g.color]||NODE_COLORS.slate}} onPointerDown={e=>onDown(e,g)} onDoubleClick={e=>{e.stopPropagation();onDouble(g.id);}}>
   <div className="cv-group-head">
    {editing
     ?<input autoFocus className="cv-group-input" value={title} maxLength={60} onChange={e=>setTitle(e.target.value)} onFocus={e=>e.target.select()} onPointerDown={e=>e.stopPropagation()} onBlur={()=>onTitleDone(g.id,title.trim()||'Group')} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'||e.key==='Escape')e.target.blur();}}/>
     :<b>{g.text||'Group'}</b>}
    <em className="cv-count-chip">{count} {count===1?'idea':'ideas'}</em>
    {(g.tags||[]).map(t=><span key={t} className="cv-tag">#{t}</span>)}
   </div>
   {['n','e','s','w','ne','nw','se','sw'].map(d=><span key={d} className={'cv-rz '+d} onPointerDown={e=>onResize(e,g,d)}/>)}
   {dropIn&&<span className="cv-dropnote">Release to add to {g.text||'this group'}</span>}
  </div>
 );
}

const Pop=({children})=><div className="cv-pop" onPointerDown={e=>e.stopPropagation()}>{children}</div>;

export function BoardView({board,projects,onChange,onDelete}){
 const nodes=board.nodes||[],edges=board.edges||[];
 const [vp,setVp]=useState({vx:board.vx||0,vy:board.vy||0,vz:board.vz||1});
 const [sel,setSel]=useState(()=>new Set()),[selEdge,setSelEdge]=useState(null),[editing,setEditing]=useState(null),[editEdge,setEditEdge]=useState(null);
 const [dropOn,setDropOn]=useState(null),[link,setLink]=useState(null),[sizes,setSizes]=useState({}),[pop,setPop]=useState(null),[tidying,setTidying]=useState(false);
 const [dropGroup,setDropGroup]=useState(null),[guides,setGuides]=useState([]),[marquee,setMarquee]=useState(null),[grid,setGrid]=useState(()=>{try{return localStorage.getItem('tnkr-ws-canvas-grid')==='1';}catch{return false;}}),[filter,setFilter]=useState(''),[tagDraft,setTagDraft]=useState('');
 const dragGroupRef=useRef(null),surf=useRef(null),hist=useRef(makeHistory()),graph=useRef({nodes,edges}),vpRef=useRef(vp),fresh=useRef(null),sizesRef=useRef(sizes),gridRef=useRef(grid);
 graph.current={nodes,edges};vpRef.current=vp;sizesRef.current=sizes;gridRef.current=grid;

 useEffect(()=>{setVp({vx:board.vx||0,vy:board.vy||0,vz:board.vz||1});setSel(new Set());setSelEdge(null);setEditing(null);setPop(null);hist.current=makeHistory();},[board.id]);
 useEffect(()=>{const t=setTimeout(()=>{if(vp.vx!==board.vx||vp.vy!==board.vy||vp.vz!==board.vz)onChange({vx:Math.round(vp.vx),vy:Math.round(vp.vy),vz:vp.vz},true);},500);return()=>clearTimeout(t);},[vp.vx,vp.vy,vp.vz]);
 useEffect(()=>{try{localStorage.setItem('tnkr-ws-canvas-grid',grid?'1':'0');}catch{}},[grid]);

 const snapNow=()=>JSON.stringify({nodes:graph.current.nodes,edges:graph.current.edges});
 const setGraph=(n,e,record=true)=>{if(record)pushHistory(hist.current,snapNow());onChange({nodes:n,edges:e,updated:Date.now()});};
 const toWorld=(cx,cy)=>{const r=surf.current.getBoundingClientRect(),v=vpRef.current;return {x:(cx-r.left-v.vx)/v.vz,y:(cy-r.top-v.vy)/v.vz};};
 const boxOf=n=>isGroup(n)?{id:n.id,x:n.x,y:n.y,w:n.w||320,h:n.h||220}:{id:n.id,x:n.x,y:n.y,w:(sizesRef.current[n.id]&&sizesRef.current[n.id].w)||NODE_W,h:(sizesRef.current[n.id]&&sizesRef.current[n.id].h)||NODE_H};
 const onSize=useCallback((id,w,h)=>setSizes(s=>s[id]&&s[id].w===w&&s[id].h===h?s:{...s,[id]:{w,h}}),[]);
 const plain=()=>graph.current.nodes.filter(n=>!isGroup(n));

 // ---- adding
 const centre=()=>{
  const gSel=sel.size===1?graph.current.nodes.find(n=>n.id===[...sel][0]&&isGroup(n)):null;
  if(gSel){const kids=insideGroup(boxOf(gSel),plain().map(boxOf)).length;return {x:gSel.x+30+60,y:gSel.y+54+kids%5*58+20};}
  const r=surf.current.getBoundingClientRect();return toWorld(r.left+r.width/2,r.top+r.height/2);
 };
 const addNode=(x,y,over={},edit=true)=>{
  const n=newNode(x,y,over);
  setGraph([...graph.current.nodes,n],graph.current.edges);
  setSel(new Set([n.id]));setSelEdge(null);setPop(null);if(edit){fresh.current=n.id;setEditing(n.id);}
  return n;
 };
 const addKind=kind=>{const c=centre();addNode(c.x-60,c.y-20,{kind,color:kind==='comment'?'sand':'sage'});};
 const addGroupEmpty=()=>{const c=centre(),g=newGroup(c.x-170,c.y-120);setGraph([...graph.current.nodes,g],graph.current.edges);setSel(new Set([g.id]));setEditing(g.id);};
 const addChild=parentId=>{
  const p=graph.current.nodes.find(n=>n.id===parentId);if(!p||isGroup(p))return;
  const spot=childSpot(p,sizesRef.current[p.id],graph.current.edges,graph.current.nodes);
  const n=newNode(spot.x,spot.y,{color:p.color,shape:p.shape,font:p.font,size:p.size});
  pushHistory(hist.current,snapNow());
  onChange({nodes:[...graph.current.nodes,n],edges:[...graph.current.edges,newEdge(p.id,n.id)],updated:Date.now()});
  setSel(new Set([n.id]));setSelEdge(null);setPop(null);fresh.current=n.id;setEditing(n.id);
 };
 const patchIds=(ids,ch,record=true)=>setGraph(graph.current.nodes.map(n=>ids.includes(n.id)?{...n,...(typeof ch==='function'?ch(n):ch)}:n),graph.current.edges,record);
 const onEditDone=(id,text,how)=>{
  setEditing(null);
  const n=graph.current.nodes.find(x=>x.id===id);if(!n)return;
  const wasFresh=fresh.current===id;fresh.current=null;
  if(!text&&wasFresh&&!n.text){const r=withoutNodes(graph.current.nodes,graph.current.edges,[id]);onChange({nodes:r.nodes,edges:r.edges});setSel(new Set());return;}
  if(text!==n.text)patchIds([id],{text},!wasFresh);
  if(how==='child')setTimeout(()=>addChild(id),0);
  else surf.current&&surf.current.focus({preventScroll:true});
 };
 const onGroupTitle=(id,title)=>{setEditing(null);patchIds([id],{text:title});surf.current&&surf.current.focus({preventScroll:true});};
 const removeSelected=()=>{
  if(selEdge){setGraph(graph.current.nodes,graph.current.edges.filter(e=>e.id!==selEdge));setSelEdge(null);return;}
  if(!sel.size)return;
  const r=withoutNodes(graph.current.nodes,graph.current.edges,[...sel]);setGraph(r.nodes,r.edges);setSel(new Set());setPop(null);
 };
 const makeGroup=()=>{
  const ids=[...sel].filter(id=>{const n=graph.current.nodes.find(x=>x.id===id);return n&&!isGroup(n);});if(!ids.length)return;
  const f=frameAround(ids.map(id=>boxOf(graph.current.nodes.find(x=>x.id===id))));
  const g=newGroup(f.x,f.y,f.w,f.h,{text:'Group'});
  setGraph([g,...graph.current.nodes],graph.current.edges);setSel(new Set([g.id]));setEditing(g.id);setPop(null);
 };
 const ungroup=id=>{setGraph(graph.current.nodes.filter(n=>n.id!==id),graph.current.edges);setSel(new Set());};
 const doTidy=()=>{
  const pos=tidy(plain(),edges,sizesRef.current);if(!Object.keys(pos).length)return;
  setTidying(true);setGraph(nodes.map(n=>pos[n.id]?{...n,...pos[n.id]}:n),edges);
  setTimeout(()=>{setTidying(false);fit();},420);
 };
 const doAlign=mode=>{
  const ids=[...sel].filter(id=>!isGroup(graph.current.nodes.find(x=>x.id===id)||{}));
  const pos=alignBoxes(ids.map(id=>boxOf(graph.current.nodes.find(x=>x.id===id))),mode);
  setTidying(true);patchIds(ids,n=>pos[n.id]||{});setTimeout(()=>setTidying(false),300);setPop(null);
 };
 const fit=()=>{const r=surf.current.getBoundingClientRect();setVp(fitView(graph.current.nodes.map(n=>isGroup(n)?{...n}:n),Object.fromEntries(graph.current.nodes.filter(isGroup).map(g=>[g.id,{w:g.w,h:g.h}]).concat(Object.entries(sizesRef.current))),r.width,r.height));};
 const undo=()=>{const s=histUndo(hist.current,snapNow());if(s){const g=JSON.parse(s);onChange({nodes:g.nodes,edges:g.edges,updated:Date.now()});setSel(new Set());}};
 const redo=()=>{const s=histRedo(hist.current,snapNow());if(s){const g=JSON.parse(s);onChange({nodes:g.nodes,edges:g.edges,updated:Date.now()});setSel(new Set());}};
 const toggleStyle=(ids,key)=>{const all=ids.every(id=>(graph.current.nodes.find(n=>n.id===id)||{})[key]);patchIds(ids,{[key]:!all});};

 // ---- pointer: pan, marquee, move, resize, connect
 const onSurfaceDown=e=>{
  if(e.button!==0&&e.button!==1)return;
  if(e.target.closest('.cv-node,.cv-group,.cv-bar,.cv-edge-hit,.cv-edge-input,.cv-ebar'))return;
  surf.current.focus({preventScroll:true});setPop(null);
  if(e.shiftKey&&e.button===0){
   const r0=surf.current.getBoundingClientRect(),sx=e.clientX-r0.left,sy=e.clientY-r0.top;
   setMarquee({x:sx,y:sy,w:0,h:0});
   const mv=ev=>setMarquee({x:Math.min(sx,ev.clientX-r0.left),y:Math.min(sy,ev.clientY-r0.top),w:Math.abs(ev.clientX-r0.left-sx),h:Math.abs(ev.clientY-r0.top-sy)});
   const up=ev=>{
    window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);setMarquee(null);
    const a=toWorld(Math.min(e.clientX,ev.clientX),Math.min(e.clientY,ev.clientY)),b=toWorld(Math.max(e.clientX,ev.clientX),Math.max(e.clientY,ev.clientY));
    const hit=graph.current.nodes.filter(n=>{const q=boxOf(n);return q.x<b.x&&q.x+q.w>a.x&&q.y<b.y&&q.y+q.h>a.y;}).map(n=>n.id);
    setSel(new Set(hit));setSelEdge(null);
   };
   window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);return;
  }
  setSel(new Set());setSelEdge(null);
  const s={x:e.clientX,y:e.clientY,vx:vpRef.current.vx,vy:vpRef.current.vy};
  const mv=ev=>setVp(v=>({...v,vx:s.vx+ev.clientX-s.x,vy:s.vy+ev.clientY-s.y}));
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);surf.current&&surf.current.classList.remove('panning');};
  surf.current.classList.add('panning');
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };
 const onNodeDown=(e,n)=>{
  if(e.button!==0||editing===n.id||e.target.closest('.cv-h,.cv-resize'))return;
  e.stopPropagation();surf.current.focus({preventScroll:true});setPop(null);
  if(e.shiftKey){setSel(s=>{const x=new Set(s);x.has(n.id)?x.delete(n.id):x.add(n.id);return x;});return;}
  let ids=sel.has(n.id)?[...sel]:[n.id];
  if(isGroup(n))ids=[...new Set([...ids,...insideGroup(boxOf(n),plain().map(boxOf))])];
  if(!sel.has(n.id))setSel(new Set([n.id]));
  setSelEdge(null);
  const g0=graph.current;
  const orig=new Map(g0.nodes.filter(x=>ids.includes(x.id)).map(x=>[x.id,{x:x.x,y:x.y}]));
  const bb=(()=>{const bs=g0.nodes.filter(x=>ids.includes(x.id)).map(boxOf);const x0=Math.min(...bs.map(b=>b.x)),y0=Math.min(...bs.map(b=>b.y)),x1=Math.max(...bs.map(b=>b.x+b.w)),y1=Math.max(...bs.map(b=>b.y+b.h));return {x:x0,y:y0,w:x1-x0,h:y1-y0};})();
  const others=g0.nodes.filter(x=>!ids.includes(x.id)&&!isGroup(x)).map(boxOf);
  const start={x:e.clientX,y:e.clientY},single=ids.length===1&&!isGroup(n);
  let moved=false,over=null;
  const under=ev=>{const el=document.elementsFromPoint(ev.clientX,ev.clientY).find(x=>x.classList&&x.classList.contains('cv-node')&&!ids.includes(x.dataset.id));return el?el.dataset.id:null;};
  const mv=ev=>{
   const z=vpRef.current.vz;
   let dx=(ev.clientX-start.x)/z,dy=(ev.clientY-start.y)/z;
   if(!moved){if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<4)return;moved=true;pushHistory(hist.current,snapNow());}
   if(!ev.altKey){
    if(gridRef.current){dx=snapGrid(bb.x+dx,GRID)-bb.x;dy=snapGrid(bb.y+dy,GRID)-bb.y;setGuides([]);}
    else{const r=snapMove({x:bb.x+dx,y:bb.y+dy,w:bb.w,h:bb.h},others,7/z);dx+=r.dx;dy+=r.dy;setGuides(r.guides);}
   }else setGuides([]);
   onChange({nodes:graph.current.nodes.map(x=>orig.has(x.id)?{...x,x:Math.round(orig.get(x.id).x+dx),y:Math.round(orig.get(x.id).y+dy)}:x),updated:Date.now()});
   if(single){const t=under(ev);if(t!==over){over=t;setDropOn(t);}}
   if(!isGroup(n)){
    const cx=bb.x+dx+bb.w/2,cy=bb.y+dy+bb.h/2;
    const gr=graph.current.nodes.find(q=>isGroup(q)&&!ids.includes(q.id)&&cx>=q.x&&cx<=q.x+(q.w||320)&&cy>=q.y&&cy<=q.y+(q.h||220));
    const gid=gr?gr.id:null;if(gid!==dragGroupRef.current){dragGroupRef.current=gid;setDropGroup(gid);}
   }
  };
  const up=()=>{
   window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
   setDropOn(null);setGuides([]);dragGroupRef.current=null;setDropGroup(null);
   if(moved&&over&&single){
    const g=graph.current,add=!hasEdge(g.edges,n.id,over);
    setTidying(true);
    onChange({nodes:g.nodes.map(x=>orig.has(x.id)?{...x,...orig.get(x.id)}:x),edges:add?[...g.edges,newEdge(n.id,over)]:g.edges,updated:Date.now()});
    setTimeout(()=>setTidying(false),420);
   }
  };
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };
 const onResize=(e,g,dir='se')=>{
  e.stopPropagation();e.preventDefault();setSel(new Set([g.id]));
  const s={x:e.clientX,y:e.clientY,gx:g.x,gy:g.y,w:g.w||320,h:g.h||220};pushHistory(hist.current,snapNow());
  const mv=ev=>{
   const z=vpRef.current.vz,dx=(ev.clientX-s.x)/z,dy=(ev.clientY-s.y)/z;
   let x=s.gx,y=s.gy,w=s.w,h=s.h;
   if(dir.includes('e'))w=Math.max(180,s.w+dx);
   if(dir.includes('s'))h=Math.max(110,s.h+dy);
   if(dir.includes('w')){w=Math.max(180,s.w-dx);x=s.gx+(s.w-w);}
   if(dir.includes('n')){h=Math.max(110,s.h-dy);y=s.gy+(s.h-h);}
   onChange({nodes:graph.current.nodes.map(q=>q.id===g.id?{...q,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)}:q),updated:Date.now()});
  };
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };
 const onHandle=(e,n)=>{
  e.stopPropagation();e.preventDefault();
  const from=n.id,start=toWorld(e.clientX,e.clientY);
  setLink({from,...start,snap:null});
  const near=p=>nearestBox(p,graph.current.nodes.filter(x=>!isGroup(x)&&x.id!==from).map(boxOf),44/vpRef.current.vz);
  const mv=ev=>{const p=toWorld(ev.clientX,ev.clientY);setLink({from,...p,snap:near(p)});};
  const up=ev=>{
   window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);setLink(null);
   const p=toWorld(ev.clientX,ev.clientY),tgt=near(p),g=graph.current;
   if(tgt){if(!hasEdge(g.edges,from,tgt)){pushHistory(hist.current,snapNow());onChange({edges:[...g.edges,newEdge(from,tgt)],updated:Date.now()});}}
   else{
    const el=document.elementFromPoint(ev.clientX,ev.clientY);
    if(el&&el.closest('.cv-surface')&&Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)>24){
     const src=g.nodes.find(x=>x.id===from);
     const nn=newNode(p.x-20,p.y-NODE_H/2,{color:src?src.color:'sage',shape:src&&src.shape,font:src&&src.font,size:src&&src.size});
     pushHistory(hist.current,snapNow());
     onChange({nodes:[...g.nodes,nn],edges:[...g.edges,newEdge(from,nn.id)],updated:Date.now()});
     setSel(new Set([nn.id]));fresh.current=nn.id;setEditing(nn.id);
    }
   }
  };
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };

 useEffect(()=>{
  const el=surf.current;if(!el)return;
  const h=e=>{
   e.preventDefault();
   const r=el.getBoundingClientRect();
   if(e.ctrlKey||e.metaKey)setVp(v=>zoomAt(v,Math.exp(-e.deltaY*.0085),e.clientX-r.left,e.clientY-r.top));
   else setVp(v=>({...v,vx:v.vx-(e.shiftKey?e.deltaY:e.deltaX),vy:v.vy-(e.shiftKey?0:e.deltaY)}));
  };
  el.addEventListener('wheel',h,{passive:false});return()=>el.removeEventListener('wheel',h);
 },[]);
 const zoomBy=f=>{const r=surf.current.getBoundingClientRect();setVp(v=>zoomAt(v,f,r.width/2,r.height/2));};

 const picked=[...sel],one=picked.length===1?nodes.find(n=>n.id===picked[0]):null,many=picked.length>1;
 const onKey=e=>{
  if(editing||e.target.closest('input,textarea'))return;
  const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}
  else if(e.key==='Tab'&&one&&!isGroup(one)){e.preventDefault();addChild(one.id);}
  else if((e.key==='Enter'||e.key==='F2')&&one){e.preventDefault();setEditing(one.id);}
  else if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if(mod&&key==='y'){e.preventDefault();redo();}
  else if(mod&&key==='a'){e.preventDefault();setSel(new Set(nodes.map(n=>n.id)));}
  else if(mod&&key==='g'){e.preventDefault();makeGroup();}
  else if(mod&&key==='b'&&picked.length){e.preventDefault();toggleStyle(picked,'bold');}
  else if(mod&&key==='i'&&picked.length){e.preventDefault();toggleStyle(picked,'italic');}
  else if(e.key.startsWith('Arrow')&&picked.length){e.preventDefault();const s=e.shiftKey?20:2,d={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,-s],ArrowDown:[0,s]}[e.key];patchIds(picked,n=>({x:n.x+d[0],y:n.y+d[1]}),true);}
  else if(e.key==='Escape'){setSel(new Set());setSelEdge(null);setPop(null);}
  else if(e.key.length===1&&!mod&&e.key!==' '&&one&&!isGroup(one)){patchIds([one.id],{text:e.key},true);setEditing(one.id);e.preventDefault();}
 };

 const edgeGeo=edges.map(e=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);return a&&b?{e,g:anchors(boxOf(a),boxOf(b))}:null;}).filter(Boolean);
 const live=link&&(()=>{const a=nodes.find(n=>n.id===link.from);if(!a)return null;const A=boxOf(a);
  if(link.snap){const b=nodes.find(n=>n.id===link.snap);if(b)return anchors(A,boxOf(b)).d;}
  return `M${A.x+A.w/2},${A.y+A.h/2} L${link.x},${link.y}`;})();
 const gridPx=Math.max(8,GRID*vp.vz),tags=allTags(nodes);
 const selEdgeGeo=selEdge&&edgeGeo.find(x=>x.e.id===selEdge);
 const patchEdge=ch=>setGraph(nodes,edges.map(x=>x.id===selEdge?{...x,...ch}:x));
 const groups=nodes.filter(isGroup),items=nodes.filter(n=>!isGroup(n));
 const barPos=one?{left:vp.vx+one.x*vp.vz,top:vp.vy+one.y*vp.vz-52}:null;
 const multiBox=many?(()=>{const bs=picked.map(id=>nodes.find(n=>n.id===id)).filter(Boolean).map(boxOf);return {left:vp.vx+Math.min(...bs.map(b=>b.x))*vp.vz,top:vp.vy+Math.min(...bs.map(b=>b.y))*vp.vz-52};})():null;
 const oneStyle=one||{},ids1=one?[one.id]:[];
 const dimmed=n=>filter&&!(n.tags||[]).includes(filter);

 return (
  <div className="cv-board">
   <div className="cv-bar-top">
    <input className="cv-title" placeholder="Untitled board" value={board.title||''} onChange={e=>onChange({title:e.target.value,updated:Date.now()})}/>
    <div className="cv-actions">
    {tags.length>0&&<Select compact label="Filter by tag" value={filter} onChange={setFilter} options={[{value:'',label:'All tags'},...tags.map(t=>({value:t,label:'#'+t}))]}/>}
    <Select compact label="Project" value={board.project||''} onChange={v=>onChange({project:v||null})} options={[{value:'',label:'No project'},...projects.map(p=>({value:p.id,label:p.name||'Untitled project'}))]}/>
    <div className="cv-tools" role="toolbar" aria-label="History">
     <button className="icon-btn" aria-label="Undo" disabled={!hist.current.past.length} onClick={undo}><ArrowUUpLeft size={16}/></button>
     <button className="icon-btn" aria-label="Redo" disabled={!hist.current.future.length} onClick={redo}><ArrowUUpRight size={16}/></button>
    </div>
    <div className="cv-tools" role="group" aria-label="View">
     <button className="icon-btn" aria-label="Zoom out" onClick={()=>zoomBy(.8)}><MagnifyingGlassMinus size={16}/></button>
     <span className="cv-zoom">{Math.round(vp.vz*100)}%</span>
     <button className="icon-btn" aria-label="Zoom in" onClick={()=>zoomBy(1.25)}><MagnifyingGlassPlus size={16}/></button>
     <button className="icon-btn" aria-label="Fit to screen" onClick={fit}><ArrowsIn size={16}/></button>
     <button className={'icon-btn'+(grid?' on':'')} aria-pressed={grid} data-tip="Snap ideas to a grid while you move them. Without it, ideas still snap to line up with each other." data-tip-title={grid?'Grid snapping on':'Grid snapping off'} aria-label="Snap to grid" onClick={()=>setGrid(g=>!g)}><GridFour size={16}/></button>
    </div>
    <div className="cv-tools" role="group" aria-label="Add">
     <button className="icon-btn" aria-label="Add text" data-tip="A free text label with no box." data-tip-title="Text" onClick={()=>addKind('text')}><TextT size={16}/></button>
     <button className="icon-btn" aria-label="Add comment" data-tip="A sticky comment to leave a thought beside your ideas." data-tip-title="Comment" onClick={()=>addKind('comment')}><ChatCircleText size={16}/></button>
     <button className="icon-btn" aria-label="Add group" data-tip="A named frame that holds ideas together." data-tip-title="Group" onClick={addGroupEmpty}><FrameCorners size={16}/></button>
    </div>
    <button className="icon-btn cv-quiet" data-tip="Lines the ideas up as a tree, left to right." data-tip-title="Tidy up" aria-label="Tidy up" disabled={!edges.length} onClick={doTidy}><Sparkle size={17}/></button>
    <button className="primary cv-add" onClick={()=>{const c=centre();addNode(c.x-60,c.y-20);}}><Plus size={15} weight="bold"/>Idea</button>
    <button className="icon-btn cv-quiet danger" aria-label="Delete board" onClick={onDelete}><Trash size={16}/></button>
    </div>
   </div>
   <div ref={surf} className="cv-surface" tabIndex={0} onPointerDown={onSurfaceDown} onKeyDown={onKey}
    onDoubleClick={e=>{if(e.target.closest('.cv-node,.cv-group,.cv-bar,.cv-edge-hit,.cv-edge-input,.cv-ebar'))return;const p=toWorld(e.clientX,e.clientY);addNode(p.x-60,p.y-20);}}
    style={{backgroundSize:gridPx+'px '+gridPx+'px',backgroundPosition:vp.vx+'px '+vp.vy+'px'}}>
    <div className="cv-world" style={{transform:`translate(${vp.vx}px,${vp.vy}px) scale(${vp.vz})`}}>
     {groups.map(g=><GroupBox key={g.id} g={g} picked={sel.has(g.id)} editing={editing===g.id} dim={dimmed(g)} dropIn={dropGroup===g.id} count={insideGroup(boxOf(g),items.map(boxOf)).length} onDown={onNodeDown} onTitleDone={onGroupTitle} onResize={onResize} onDouble={setEditing}/>)}
     <svg className="cv-edges" width="1" height="1" overflow="visible">
      <defs>
       <marker id="cv-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1.5 L9,5 L1,8.5 z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></marker>
      </defs>
      {edgeGeo.map(({e,g})=>{
       const colour=EDGE_COLORS[e.color]||'',arrow=e.arrow||'end';
       return (
        <g key={e.id} className={'cv-edge'+(selEdge===e.id?' picked':'')} style={colour?{color:colour}:undefined}>
         <path className="cv-edge-line" d={g.d} strokeDasharray={e.dash?'7 6':undefined} markerEnd={arrow==='end'||arrow==='both'?'url(#cv-arrow)':undefined} markerStart={arrow==='both'?'url(#cv-arrow)':undefined}/>
         <path className="cv-edge-hit" d={g.d} onPointerDown={ev=>{ev.stopPropagation();surf.current.focus({preventScroll:true});setSelEdge(e.id);setSel(new Set());setPop(null);}} onDoubleClick={ev=>{ev.stopPropagation();setEditEdge(e.id);}}/>
        </g>
       );
      })}
      {live&&<path className="cv-edge-live" d={live}/>}
     </svg>
     {guides.map((g,i)=>g.axis==='x'
      ?<i key={i} className="cv-guide v" style={{left:g.at,top:g.from,height:g.to-g.from}}/>
      :<i key={i} className="cv-guide h" style={{top:g.at,left:g.from,width:g.to-g.from}}/>)}
     {edgeGeo.map(({e,g})=>(editEdge===e.id
      ?<input key={e.id} autoFocus className="cv-edge-input" style={{left:g.mid.x,top:g.mid.y}} defaultValue={e.label||''} placeholder="Label"
         onPointerDown={ev=>ev.stopPropagation()} onKeyDown={ev=>{ev.stopPropagation();if(ev.key==='Enter'||ev.key==='Escape')ev.target.blur();}}
         onBlur={ev=>{setEditEdge(null);const v=ev.target.value.trim().slice(0,40);if(v!==(e.label||''))setGraph(nodes,edges.map(x=>x.id===e.id?{...x,label:v}:x));}}/>
      :e.label?<span key={e.id} className="cv-edge-label" style={{left:g.mid.x,top:g.mid.y}} onDoubleClick={()=>setEditEdge(e.id)}>{e.label}</span>:null))}
     {items.map(n=><NodeBox key={n.id} n={n} picked={sel.has(n.id)} editing={editing===n.id} target={dropOn===n.id} dim={dimmed(n)} tidying={tidying} onDown={onNodeDown} onEditDone={onEditDone} onSize={onSize} onHandle={onHandle} onDouble={setEditing}/>)}
    </div>

    {marquee&&<div className="cv-marquee" style={{left:marquee.x,top:marquee.y,width:marquee.w,height:marquee.h}}/>}

    {one&&!editing&&<div className="cv-bar" style={barPos} onPointerDown={e=>e.stopPropagation()}>
     {!isGroup(one)&&<button className={'icon-btn'+(pop==='shape'?' on':'')} aria-label="Shape" onClick={()=>setPop(pop==='shape'?null:'shape')}>{React.createElement(SHAPE_ICON[one.shape||'round'],{size:16})}</button>}
     <button className={'icon-btn'+(pop==='color'?' on':'')} aria-label="Colour" onClick={()=>setPop(pop==='color'?null:'color')}><span className="cv-swatch" style={{background:isGroup(one)?(NODE_COLORS[one.color]||NODE_COLORS.slate):fillOf(one)}}/></button>
     {!isGroup(one)&&<><button className={'icon-btn'+(pop==='text'?' on':'')} aria-label="Text style" onClick={()=>setPop(pop==='text'?null:'text')}><TextAa size={17}/></button>
     <button className={'icon-btn'+(one.bold?' on':'')} aria-label="Bold" onClick={()=>toggleStyle(ids1,'bold')}><TextB size={15} weight="bold"/></button>
     <button className={'icon-btn'+(one.italic?' on':'')} aria-label="Italic" onClick={()=>toggleStyle(ids1,'italic')}><TextItalic size={15}/></button>
     <button className={'icon-btn'+(pop==='icon'?' on':'')} aria-label="Choose icon" onClick={()=>setPop(pop==='icon'?null:'icon')}>{one.icon?<Glyph name={one.icon} size={16}/>:<Smiley size={16}/>}</button></>}
     <button className={'icon-btn'+(pop==='tag'?' on':'')} aria-label="Tags" onClick={()=>setPop(pop==='tag'?null:'tag')}><Tag size={16}/></button>
     <i className="sep"/>
     {!isGroup(one)&&<button className="icon-btn" aria-label="Add a connected idea" onClick={()=>addChild(one.id)}><Plus size={15} weight="bold"/></button>}
     {isGroup(one)&&<button className="cv-txtbtn" aria-label="Select contents" data-tip="Select every idea inside, to align or move them together." data-tip-title="Select contents" onClick={()=>setSel(new Set(insideGroup(boxOf(one),plain().map(boxOf))))}><Selection size={15}/>Select contents</button>}
     {isGroup(one)&&<button className="icon-btn" aria-label="Ungroup" data-tip="Remove the frame, keep the ideas." data-tip-title="Ungroup" onClick={()=>ungroup(one.id)}><X size={15}/></button>}
     <button className="icon-btn danger" aria-label="Delete idea" onClick={removeSelected}><Trash size={15}/></button>
     {pop==='shape'&&<Pop><div className="cv-opts">{SHAPES.map(s=><button key={s} className={(one.shape||'round')===s?'on':''} onClick={()=>{patchIds(ids1,{shape:s});setPop(null);}}>{React.createElement(SHAPE_ICON[s],{size:16})}{SHAPE_NAME[s]}</button>)}</div></Pop>}
     {pop==='color'&&<Pop><div className="cv-dots">{Object.entries(NODE_COLORS).map(([k,c])=><button key={k} aria-label={'Colour '+k} className={'cv-dot'+(one.color===k?' on':'')} style={{background:c}} onClick={()=>{patchIds(ids1,{color:k});setPop(null);}}/>)}</div></Pop>}
     {pop==='text'&&<Pop><div className="cv-opts">{Object.entries(FONTS).map(([k,f])=><button key={k} style={{fontFamily:f.css}} className={(one.font||'sans')===k?'on':''} onClick={()=>patchIds(ids1,{font:k})}>{f.name}</button>)}</div>
      <div className="cv-sizes">{Object.keys(SIZES).map(k=><button key={k} className={(one.size||'m')===k?'on':''} onClick={()=>patchIds(ids1,{size:k})}>{k.toUpperCase()}</button>)}</div></Pop>}
     {pop==='icon'&&<Pop><div className="cv-icons">{ICON_NAMES.map(i=><button key={i} aria-label={i} className={one.icon===i?'on':''} onClick={()=>{patchIds(ids1,{icon:i});setPop(null);}}><Glyph name={i} size={20}/></button>)}{one.icon&&<button className="cv-noicon" onClick={()=>{patchIds(ids1,{icon:undefined});setPop(null);}}><TextT size={13}/>Text only</button>}</div></Pop>}
     {pop==='tag'&&<Pop><div className="cv-tagbox">
      <div className="cv-taglist">{(one.tags||[]).map(t=><button key={t} className="cv-tag rm" onClick={()=>patchIds(ids1,{tags:(one.tags||[]).filter(x=>x!==t)})}>#{t}<X size={10}/></button>)}</div>
      <input autoFocus placeholder="Add a tag, press Enter" value={tagDraft} maxLength={24} onChange={e=>setTagDraft(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){const t=cleanTag(tagDraft);if(t&&!(one.tags||[]).includes(t))patchIds(ids1,{tags:[...(one.tags||[]),t]});setTagDraft('');}}}/>
      {tags.filter(t=>!(one.tags||[]).includes(t)).length>0&&<div className="cv-taglist sug">{tags.filter(t=>!(one.tags||[]).includes(t)).map(t=><button key={t} className="cv-tag" onClick={()=>patchIds(ids1,{tags:[...(one.tags||[]),t]})}>#{t}</button>)}</div>}
     </div></Pop>}
    </div>}

    {many&&!editing&&<div className="cv-bar" style={multiBox} onPointerDown={e=>e.stopPropagation()}>
     <span className="cv-count">{picked.length} selected</span>
     <button className="cv-txtbtn" onClick={makeGroup}><FrameCorners size={15}/>Group</button>
     <button className={'cv-txtbtn'+(pop==='align'?' on':'')} onClick={()=>setPop(pop==='align'?null:'align')}><AlignLeft size={15}/>Align</button>
     <button className="icon-btn danger" aria-label="Delete idea" onClick={removeSelected}><Trash size={15}/></button>
     {pop==='align'&&<Pop><div className="cv-aligns">
      {[['left','Align left',AlignLeft],['centerX','Centre horizontally',AlignCenterHorizontal],['right','Align right',AlignRight],['top','Align top',AlignTop],['centerY','Centre vertically',AlignCenterVertical],['bottom','Align bottom',AlignBottom],['spreadX','Spread evenly across',ArrowsOutLineHorizontal],['spreadY','Spread evenly down',ArrowsOutLineVertical]].map(([m,l,I])=><button key={m} aria-label={l} data-tip-title={l} onClick={()=>doAlign(m)}><I size={17}/></button>)}
     </div></Pop>}
    </div>}

    {selEdgeGeo&&<div className="cv-bar cv-ebar" style={{left:vp.vx+selEdgeGeo.g.mid.x*vp.vz-110,top:vp.vy+selEdgeGeo.g.mid.y*vp.vz-54}} onPointerDown={e=>e.stopPropagation()}>
      {[['end','Arrow',ArrowRight],['both','Arrows both ways',ArrowsHorizontal],['none','No arrow',Minus]].map(([k,l,I])=><button key={k} className={'icon-btn'+((selEdgeGeo.e.arrow||'end')===k?' on':'')} aria-label={l} onClick={()=>patchEdge({arrow:k})}><I size={16}/></button>)}
      <button className={'icon-btn'+(selEdgeGeo.e.dash?' on':'')} aria-label="Dashed line" onClick={()=>patchEdge({dash:!selEdgeGeo.e.dash})}><span className="cv-dashicon"/></button>
      <i className="sep"/>
      {Object.entries(EDGE_COLORS).map(([k,c])=><button key={k} aria-label={'Line colour '+k} className={'cv-dot'+((selEdgeGeo.e.color||'slate')===k?' on':'')} style={{background:c||'#8a9184'}} onClick={()=>patchEdge({color:k})}/>)}
      <i className="sep"/>
      <button className="icon-btn" aria-label="Label" data-tip="Name this connection." data-tip-title="Label" onClick={()=>setEditEdge(selEdgeGeo.e.id)}><TextT size={15}/></button>
      <button className="icon-btn danger" aria-label="Delete link" onClick={removeSelected}><Trash size={15}/></button>
    </div>}

    <div className="cv-keys"><span>Double-click to add</span><span>Drag an idea onto another to connect</span><span>Tab adds a branch</span><span>Shift-drag selects several</span></div>
    {!nodes.length&&<div className="cv-hint"><TreeStructure size={30} weight="light"/><b>Start with one idea</b><span>Double-click anywhere, or press Idea.</span></div>}
   </div>
  </div>
 );
}
