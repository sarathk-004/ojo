import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Plus,FolderSimplePlus,FolderSimple,TreeStructure,MagnifyingGlassPlus,MagnifyingGlassMinus,ArrowsIn,Trash,ArrowUUpLeft,ArrowUUpRight,CaretRight,Sparkle,Smiley,TextT} from '@phosphor-icons/react';
import {useCollection} from './hooks.js';
import {useUndo} from './Undo.jsx';
import {Select} from './Select.jsx';
import {NoteHead,COVERS} from './NoteHead.jsx';
import {Glyph,ICON_NAMES} from './icons.jsx';
import {useFileUrl} from './hooks.js';
import {NODE_COLORS,NODE_W,NODE_H,newNode,newEdge,newBoard,newProject,hasEdge,parentOf,childSpot,anchors,tidy,fitView,zoomAt,withoutNodes,makeHistory,pushHistory,undo as histUndo,redo as histRedo} from './canvas.mjs';

const VIEW_KEY='tnkr-ws-canvas-view';
const readView=()=>{try{return JSON.parse(localStorage.getItem(VIEW_KEY))||null;}catch{return null;}};

// A small cover picture for a board or project card.
function CoverThumb({cover}){
 const url=useFileUrl(cover&&cover.type==='image'?cover.fileId:null,'image/*');
 if(!cover)return <div className="cv-thumb empty"><TreeStructure size={22} weight="light"/></div>;
 if(cover.type==='image')return <div className="cv-thumb">{url&&<img src={url} alt="" draggable={false} style={{objectPosition:(cover.x??50)+'% '+(cover.y??50)+'%'}}/>}</div>;
 return <div className="cv-thumb" style={{background:(COVERS.find(c=>c.id===cover.id)||COVERS[0]).css}}/>;
}

// One idea on the canvas. Module level so it never remounts while you type.
function NodeBox({n,selected,editing,size,tidying,onDown,onEditDone,onSize,onHandle,onDouble}){
 const el=useRef(null);
 useLayoutEffect(()=>{
  const e=el.current;if(!e)return;
  const report=()=>onSize(n.id,e.offsetWidth,e.offsetHeight);report();
  if(typeof ResizeObserver==='undefined')return;
  const ro=new ResizeObserver(report);ro.observe(e);return()=>ro.disconnect();
 },[n.id]);
 const [text,setText]=useState(n.text);
 useEffect(()=>{if(!editing)setText(n.text);},[n.text,editing]);
 const done=(how)=>onEditDone(n.id,text.replace(/\s+$/,''),how);
 return (
  <div ref={el} data-id={n.id} className={'cv-node'+(selected?' sel':'')+(editing?' editing':'')+(tidying?' tidying':'')} style={{left:n.x,top:n.y,'--nc':NODE_COLORS[n.color]||NODE_COLORS.sage}}
   onPointerDown={e=>onDown(e,n)} onDoubleClick={e=>{e.stopPropagation();onDouble(n.id);}}>
   {n.icon&&<span className="cv-ico"><Glyph name={n.icon} size={18}/></span>}
   {editing
    ?<textarea autoFocus className="cv-edit" value={text} rows={1} placeholder="Idea" onChange={e=>setText(e.target.value)} onPointerDown={e=>e.stopPropagation()}
       onFocus={e=>e.target.setSelectionRange(e.target.value.length,e.target.value.length)}
       onBlur={()=>done('blur')}
       onKeyDown={e=>{
        e.stopPropagation();
        if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();done('sibling');}
        else if(e.key==='Tab'){e.preventDefault();done('child');}
        else if(e.key==='Escape'){e.preventDefault();done('stop');}
       }}/>
    :<span className={'cv-text'+(n.text?'':' ph')}>{n.text||'Idea'}</span>}
   {['top','right','bottom','left'].map(s=><button key={s} type="button" tabIndex={-1} className={'cv-h '+s} aria-label="Drag to connect" onPointerDown={e=>onHandle(e,n)}/>)}
  </div>
 );
}

function BoardView({board,projects,onChange,onDelete}){
 const nodes=board.nodes||[],edges=board.edges||[];
 const [vp,setVp]=useState({vx:board.vx||0,vy:board.vy||0,vz:board.vz||1});
 const [sel,setSel]=useState(()=>new Set()),[selEdge,setSelEdge]=useState(null),[editing,setEditing]=useState(null),[editEdge,setEditEdge]=useState(null);
 const [link,setLink]=useState(null),[sizes,setSizes]=useState({}),[iconOpen,setIconOpen]=useState(false),[tidying,setTidying]=useState(false);
 const surf=useRef(null),hist=useRef(makeHistory()),graph=useRef({nodes,edges}),vpRef=useRef(vp),fresh=useRef(null);
 graph.current={nodes,edges};vpRef.current=vp;

 useEffect(()=>{setVp({vx:board.vx||0,vy:board.vy||0,vz:board.vz||1});setSel(new Set());setSelEdge(null);setEditing(null);hist.current=makeHistory();},[board.id]);
 // The view (pan and zoom) is remembered, but not written on every wheel tick.
 useEffect(()=>{const t=setTimeout(()=>{if(vp.vx!==board.vx||vp.vy!==board.vy||vp.vz!==board.vz)onChange({vx:Math.round(vp.vx),vy:Math.round(vp.vy),vz:vp.vz},true);},500);return()=>clearTimeout(t);},[vp.vx,vp.vy,vp.vz]);

 const snapNow=()=>JSON.stringify({nodes:graph.current.nodes,edges:graph.current.edges});
 const setGraph=(n,e,record=true)=>{if(record)pushHistory(hist.current,snapNow());onChange({nodes:n,edges:e,updated:Date.now()});};
 const toWorld=(cx,cy)=>{const r=surf.current.getBoundingClientRect(),v=vpRef.current;return {x:(cx-r.left-v.vx)/v.vz,y:(cy-r.top-v.vy)/v.vz};};
 const box=n=>({x:n.x,y:n.y,w:(sizes[n.id]&&sizes[n.id].w)||NODE_W,h:(sizes[n.id]&&sizes[n.id].h)||NODE_H});
 const onSize=useCallback((id,w,h)=>setSizes(s=>s[id]&&s[id].w===w&&s[id].h===h?s:{...s,[id]:{w,h}}),[]);

 // ---- adding and changing ideas
 const addNode=(x,y,over={},edit=true)=>{
  const n=newNode(x,y,over);
  setGraph([...graph.current.nodes,n],graph.current.edges);
  setSel(new Set([n.id]));setSelEdge(null);if(edit){fresh.current=n.id;setEditing(n.id);}
  return n;
 };
 const addChild=(parentId)=>{
  const p=graph.current.nodes.find(n=>n.id===parentId);if(!p)return;
  const spot=childSpot(p,sizes[p.id],graph.current.edges,graph.current.nodes);
  const n=newNode(spot.x,spot.y,{color:p.color});
  pushHistory(hist.current,snapNow());
  onChange({nodes:[...graph.current.nodes,n],edges:[...graph.current.edges,newEdge(p.id,n.id)],updated:Date.now()});
  setSel(new Set([n.id]));setSelEdge(null);fresh.current=n.id;setEditing(n.id);
 };
 const addSibling=(id)=>{const par=parentOf(graph.current.edges,id);if(par)addChild(par);else{const n=graph.current.nodes.find(x=>x.id===id);if(n)addNode(n.x,n.y+64,{color:n.color});}};
 const patchNode=(id,ch,record=true)=>setGraph(graph.current.nodes.map(n=>n.id===id?{...n,...ch}:n),graph.current.edges,record);
 const onEditDone=(id,text,how)=>{
  setEditing(null);
  const n=graph.current.nodes.find(x=>x.id===id);if(!n)return;
  const wasFresh=fresh.current===id;fresh.current=null;
  if(!text&&wasFresh&&!n.text){
   const r=withoutNodes(graph.current.nodes,graph.current.edges,[id]);onChange({nodes:r.nodes,edges:r.edges});setSel(new Set());return;
  }
  if(text!==n.text)patchNode(id,{text},!wasFresh);
  if(how==='sibling')setTimeout(()=>addSibling(id),0);
  else if(how==='child')setTimeout(()=>addChild(id),0);
  else surf.current&&surf.current.focus({preventScroll:true});
 };
 const removeSelected=()=>{
  if(selEdge){setGraph(graph.current.nodes,graph.current.edges.filter(e=>e.id!==selEdge));setSelEdge(null);return;}
  if(!sel.size)return;
  const r=withoutNodes(graph.current.nodes,graph.current.edges,[...sel]);setGraph(r.nodes,r.edges);setSel(new Set());
 };
 const doTidy=()=>{
  const pos=tidy(nodes,edges,sizes);if(!Object.keys(pos).length)return;
  setTidying(true);setGraph(nodes.map(n=>pos[n.id]?{...n,...pos[n.id]}:n),edges);
  setTimeout(()=>{setTidying(false);fit();},420);
 };
 const fit=()=>{const r=surf.current.getBoundingClientRect();setVp(fitView(graph.current.nodes,sizes,r.width,r.height));};
 const undo=()=>{const s=histUndo(hist.current,snapNow());if(s){const g=JSON.parse(s);onChange({nodes:g.nodes,edges:g.edges,updated:Date.now()});setSel(new Set());}};
 const redo=()=>{const s=histRedo(hist.current,snapNow());if(s){const g=JSON.parse(s);onChange({nodes:g.nodes,edges:g.edges,updated:Date.now()});setSel(new Set());}};

 // ---- pointer: pan, move ideas, connect
 const onSurfaceDown=e=>{
  if(e.button!==0&&e.button!==1)return;
  if(e.target.closest('.cv-node,.cv-bar,.cv-edge-hit,.cv-edge-input'))return;
  surf.current.focus({preventScroll:true});
  if(!e.shiftKey){setSel(new Set());setSelEdge(null);setIconOpen(false);}
  const s={x:e.clientX,y:e.clientY,vx:vpRef.current.vx,vy:vpRef.current.vy};
  const mv=ev=>setVp(v=>({...v,vx:s.vx+ev.clientX-s.x,vy:s.vy+ev.clientY-s.y}));
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);surf.current&&surf.current.classList.remove('panning');};
  surf.current.classList.add('panning');
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };
 const onNodeDown=(e,n)=>{
  if(e.button!==0||editing===n.id||e.target.closest('.cv-h'))return;
  e.stopPropagation();surf.current.focus({preventScroll:true});
  if(e.shiftKey){setSel(s=>{const x=new Set(s);x.has(n.id)?x.delete(n.id):x.add(n.id);return x;});return;}
  const ids=sel.has(n.id)?[...sel]:[n.id];
  if(!sel.has(n.id))setSel(new Set([n.id]));
  setSelEdge(null);
  const start={x:e.clientX,y:e.clientY},orig=new Map(graph.current.nodes.filter(x=>ids.includes(x.id)).map(x=>[x.id,{x:x.x,y:x.y}]));
  let moved=false;
  const mv=ev=>{
   const dx=(ev.clientX-start.x)/vpRef.current.vz,dy=(ev.clientY-start.y)/vpRef.current.vz;
   if(!moved){if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<4)return;moved=true;pushHistory(hist.current,snapNow());}
   onChange({nodes:graph.current.nodes.map(x=>orig.has(x.id)?{...x,x:Math.round(orig.get(x.id).x+dx),y:Math.round(orig.get(x.id).y+dy)}:x),updated:Date.now()});
  };
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };
 const onHandle=(e,n)=>{
  e.stopPropagation();e.preventDefault();
  const from=n.id,start=toWorld(e.clientX,e.clientY);
  setLink({from,...start});
  const mv=ev=>setLink({from,...toWorld(ev.clientX,ev.clientY)});
  const up=ev=>{
   window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);setLink(null);
   const el=document.elementFromPoint(ev.clientX,ev.clientY);
   const tgt=el&&el.closest('.cv-node')&&el.closest('.cv-node').dataset.id;
   const g=graph.current;
   if(tgt&&tgt!==from){if(!hasEdge(g.edges,from,tgt)){pushHistory(hist.current,snapNow());onChange({edges:[...g.edges,newEdge(from,tgt)],updated:Date.now()});}}
   else if(!tgt&&el&&el.closest('.cv-surface')&&Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)>24){
    const p=toWorld(ev.clientX,ev.clientY),src=g.nodes.find(x=>x.id===from);
    const nn=newNode(p.x-20,p.y-NODE_H/2,{color:src?src.color:'sage'});
    pushHistory(hist.current,snapNow());
    onChange({nodes:[...g.nodes,nn],edges:[...g.edges,newEdge(from,nn.id)],updated:Date.now()});
    setSel(new Set([nn.id]));fresh.current=nn.id;setEditing(nn.id);
   }
  };
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
 };

 // Wheel: pinch or Ctrl zooms around the cursor, a swipe pans.
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

 const onKey=e=>{
  if(editing||e.target.closest('input,textarea'))return;
  const one=sel.size===1?[...sel][0]:null,mod=e.ctrlKey||e.metaKey;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}
  else if(e.key==='Tab'&&one){e.preventDefault();addChild(one);}
  else if(e.key==='Enter'&&one){e.preventDefault();addSibling(one);}
  else if((e.key==='F2'||(e.key.length===1&&!mod&&e.key!==' '))&&one){if(e.key!=='F2'){patchNode(one,{text:e.key},true);}setEditing(one);if(e.key!=='F2')e.preventDefault();}
  else if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
  else if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();setSel(new Set(nodes.map(n=>n.id)));}
  else if(e.key==='Escape'){setSel(new Set());setSelEdge(null);setIconOpen(false);}
 };

 const one=sel.size===1?nodes.find(n=>n.id===[...sel][0]):null;
 const barPos=one?{left:vp.vx+one.x*vp.vz,top:vp.vy+one.y*vp.vz-48}:null;
 const edgeGeo=edges.map(e=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);return a&&b?{e,g:anchors(box(a),box(b))}:null;}).filter(Boolean);
 const live=link&&(()=>{const a=nodes.find(n=>n.id===link.from);if(!a)return null;const A=box(a);return `M${A.x+A.w/2},${A.y+A.h/2} L${link.x},${link.y}`;})();
 const gridPx=Math.max(8,24*vp.vz);

 return (
  <div className="cv-board">
   <div className="cv-bar-top">
    <input className="cv-title" placeholder="Untitled board" value={board.title||''} onChange={e=>onChange({title:e.target.value,updated:Date.now()})}/>
    <span className="spacer"/>
    <Select compact label="Project" value={board.project||''} onChange={v=>onChange({project:v||null})} options={[{value:'',label:'No project'},...projects.map(p=>({value:p.id,label:p.name||'Untitled project'}))]}/>
    <div className="cv-tools" role="toolbar" aria-label="Canvas tools">
     <button className="icon-btn" aria-label="Undo" disabled={!hist.current.past.length} onClick={undo}><ArrowUUpLeft size={16}/></button>
     <button className="icon-btn" aria-label="Redo" disabled={!hist.current.future.length} onClick={redo}><ArrowUUpRight size={16}/></button>
     <i className="sep"/>
     <button className="icon-btn" aria-label="Zoom out" onClick={()=>zoomBy(.8)}><MagnifyingGlassMinus size={16}/></button>
     <span className="cv-zoom">{Math.round(vp.vz*100)}%</span>
     <button className="icon-btn" aria-label="Zoom in" onClick={()=>zoomBy(1.25)}><MagnifyingGlassPlus size={16}/></button>
     <button className="icon-btn" aria-label="Fit to screen" onClick={fit}><ArrowsIn size={16}/></button>
     <i className="sep"/>
     <button className="ghost cv-tidy" data-tip="Lines the ideas up as a tree, left to right." data-tip-title="Tidy up" onClick={doTidy} disabled={!edges.length}><Sparkle size={15}/>Tidy up</button>
     <button className="primary cv-add" onClick={()=>{const r=surf.current.getBoundingClientRect(),p=toWorld(r.left+r.width/2-60,r.top+r.height/2-20);addNode(p.x,p.y);}}><Plus size={15} weight="bold"/>Idea</button>
     <button className="icon-btn danger" aria-label="Delete board" onClick={onDelete}><Trash size={16}/></button>
    </div>
   </div>
   <div ref={surf} className="cv-surface" tabIndex={0} onPointerDown={onSurfaceDown} onKeyDown={onKey}
    onDoubleClick={e=>{if(e.target.closest('.cv-node,.cv-bar,.cv-edge-hit,.cv-edge-input'))return;const p=toWorld(e.clientX,e.clientY);addNode(p.x-60,p.y-20);}}
    style={{backgroundSize:gridPx+'px '+gridPx+'px',backgroundPosition:vp.vx+'px '+vp.vy+'px'}}>
    <div className="cv-world" style={{transform:`translate(${vp.vx}px,${vp.vy}px) scale(${vp.vz})`}}>
     <svg className="cv-edges" width="1" height="1" overflow="visible">
      <defs><marker id="cv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="currentColor"/></marker></defs>
      {edgeGeo.map(({e,g})=>(
       <g key={e.id} className={'cv-edge'+(selEdge===e.id?' sel':'')}>
        <path className="cv-edge-line" d={g.d} markerEnd="url(#cv-arrow)"/>
        <path className="cv-edge-hit" d={g.d} onPointerDown={ev=>{ev.stopPropagation();surf.current.focus({preventScroll:true});setSelEdge(e.id);setSel(new Set());}} onDoubleClick={ev=>{ev.stopPropagation();setEditEdge(e.id);}}/>
       </g>
      ))}
      {live&&<path className="cv-edge-live" d={live}/>}
     </svg>
     {edgeGeo.map(({e,g})=>(editEdge===e.id
      ?<input key={e.id} autoFocus className="cv-edge-input" style={{left:g.mid.x,top:g.mid.y}} defaultValue={e.label||''} placeholder="Label"
         onPointerDown={ev=>ev.stopPropagation()} onKeyDown={ev=>{ev.stopPropagation();if(ev.key==='Enter'||ev.key==='Escape')ev.target.blur();}}
         onBlur={ev=>{setEditEdge(null);const v=ev.target.value.trim().slice(0,40);if(v!==(e.label||''))setGraph(nodes,edges.map(x=>x.id===e.id?{...x,label:v}:x));}}/>
      :e.label?<span key={e.id} className="cv-edge-label" style={{left:g.mid.x,top:g.mid.y}} onDoubleClick={()=>setEditEdge(e.id)}>{e.label}</span>:null))}
     {nodes.map(n=><NodeBox key={n.id} n={n} selected={sel.has(n.id)} editing={editing===n.id} tidying={tidying} onDown={onNodeDown} onEditDone={onEditDone} onSize={onSize} onHandle={onHandle} onDouble={setEditing}/>)}
    </div>
    {one&&!editing&&<div className="cv-bar" style={barPos} onPointerDown={e=>e.stopPropagation()}>
     {Object.entries(NODE_COLORS).map(([k,c])=><button key={k} aria-label={'Colour '+k} className={'cv-dot'+(one.color===k?' on':'')} style={{background:c}} onClick={()=>patchNode(one.id,{color:k})}/>)}
     <i className="sep"/>
     <button className="icon-btn" aria-label="Choose icon" onClick={()=>setIconOpen(o=>!o)}>{one.icon?<Glyph name={one.icon} size={16}/>:<Smiley size={16}/>}</button>
     <button className="icon-btn" aria-label="Add a connected idea" onClick={()=>addChild(one.id)}><Plus size={15} weight="bold"/></button>
     <button className="icon-btn danger" aria-label="Delete idea" onClick={removeSelected}><Trash size={15}/></button>
     {iconOpen&&<div className="cv-icons">
      {ICON_NAMES.map(i=><button key={i} aria-label={i} className={one.icon===i?'on':''} onClick={()=>{patchNode(one.id,{icon:i});setIconOpen(false);}}><Glyph name={i} size={20}/></button>)}
      {one.icon&&<button className="cv-noicon" onClick={()=>{patchNode(one.id,{icon:undefined});setIconOpen(false);}}><TextT size={13}/>Text only</button>}
     </div>}
    </div>}
    {!nodes.length&&<div className="cv-hint"><TreeStructure size={30} weight="light"/><b>Start with one idea</b><span>Double-click anywhere, or press Idea. Drag from the dots on an idea to connect it to another, or let go on empty space to branch out.</span></div>}
   </div>
  </div>
 );
}

function ProjectPage({project,boards,onChange,onOpen,onNewBoard,onDelete}){
 return (
  <div className="cv-project">
   <NoteHead note={project} onChange={onChange}/>
   <div className="cv-proj-head">
    <input className="cv-title big" placeholder="Untitled project" value={project.name||''} onChange={e=>onChange({name:e.target.value})}/>
    <button className="icon-btn danger" aria-label="Delete project" onClick={onDelete}><Trash size={16}/></button>
   </div>
   <p className="muted cv-proj-sub">{boards.length} {boards.length===1?'board':'boards'}. A project keeps related canvases together.</p>
   <div className="cv-cards">
    {boards.map(b=>(
     <button key={b.id} className="cv-card" onClick={()=>onOpen(b.id)}>
      <CoverThumb cover={b.cover}/>
      <span className="cv-card-t">{b.icon&&<Glyph name={b.icon} size={16}/>}<b>{b.title||'Untitled board'}</b></span>
      <span className="muted">{(b.nodes||[]).length} ideas</span>
     </button>
    ))}
    <button className="cv-card new" onClick={onNewBoard}><Plus size={22} weight="light"/><b>New board</b></button>
   </div>
  </div>
 );
}

export function Canvas({focusId}){
 const [boards,setBoards,ready]=useCollection('boards'),[projects,setProjects]=useCollection('projects');
 const [view,setViewRaw]=useState(readView),[open,setOpen]=useState(()=>new Set());
 const undo=useUndo();
 const setView=v=>{setViewRaw(v);try{localStorage.setItem(VIEW_KEY,JSON.stringify(v));}catch{}};
 useEffect(()=>{
  if(!focusId||!ready)return;
  if(boards.some(b=>b.id===focusId))setView({kind:'board',id:focusId});else if(projects.some(p=>p.id===focusId))setView({kind:'project',id:focusId});
 },[focusId,ready]);
 const board=view&&view.kind==='board'?boards.find(b=>b.id===view.id):null;
 const project=view&&view.kind==='project'?projects.find(p=>p.id===view.id):null;
 useEffect(()=>{if(ready&&view&&!board&&!project)setView(null);},[ready,boards.length,projects.length]);

 const patchBoard=(id,ch,quiet)=>setBoards(l=>l.map(b=>b.id===id?{...b,...ch}:b));
 const patchProject=(id,ch)=>setProjects(l=>l.map(p=>p.id===id?{...p,...ch}:p));
 const makeBoard=pid=>{const b=newBoard(pid||null);setBoards(l=>[b,...l]);setView({kind:'board',id:b.id});if(pid)setOpen(s=>new Set(s).add(pid));};
 const makeProject=()=>{const p=newProject();setProjects(l=>[p,...l]);setView({kind:'project',id:p.id});setOpen(s=>new Set(s).add(p.id));};
 const delBoard=b=>{
  const at=boards.findIndex(x=>x.id===b.id);
  setBoards(l=>l.filter(x=>x.id!==b.id));setView(b.project?{kind:'project',id:b.project}:null);
  undo.show('“'+(b.title||'Untitled board')+'” deleted',()=>{setBoards(l=>{if(l.some(x=>x.id===b.id))return l;const n=[...l];n.splice(Math.min(at,n.length),0,b);return n;});setView({kind:'board',id:b.id});});
 };
 const delProject=p=>{
  const mine=boards.filter(b=>b.project===p.id).map(b=>b.id),at=projects.findIndex(x=>x.id===p.id);
  setProjects(l=>l.filter(x=>x.id!==p.id));setBoards(l=>l.map(b=>b.project===p.id?{...b,project:null}:b));setView(null);
  undo.show('Project “'+(p.name||'Untitled project')+'” deleted. Its boards were kept.',()=>{setProjects(l=>{const n=[...l];n.splice(Math.min(at,n.length),0,p);return n;});setBoards(l=>l.map(b=>mine.includes(b.id)?{...b,project:p.id}:b));setView({kind:'project',id:p.id});});
 };
 const toggle=id=>setOpen(s=>{const x=new Set(s);x.has(id)?x.delete(id):x.add(id);return x;});
 const loose=boards.filter(b=>!b.project||!projects.some(p=>p.id===b.project));
 const row=(b,depth)=>(
  <button key={b.id} className={'cv-row'+(view&&view.kind==='board'&&view.id===b.id?' on':'')+(depth?' child':'')} onClick={()=>setView({kind:'board',id:b.id})}>
   <span className="cv-row-ic">{b.icon?<Glyph name={b.icon} size={16}/>:<TreeStructure size={16}/>}</span><b>{b.title||'Untitled board'}</b>
  </button>
 );

 return (
  <div className="cv">
   <aside className="cv-side">
    <div className="cv-side-head"><h2>Canvas</h2><span className="spacer"/>
     <button className="icon-btn" aria-label="New project" onClick={makeProject}><FolderSimplePlus size={17}/></button>
     <button className="icon-btn primary-ic" aria-label="New board" onClick={()=>makeBoard(project?project.id:board&&board.project)}><Plus size={17} weight="bold"/></button>
    </div>
    <div className="cv-tree">
     {projects.map(p=>{
      const mine=boards.filter(b=>b.project===p.id),isOpen=open.has(p.id);
      return (
       <div key={p.id} className="cv-proj">
        <div className={'cv-row proj'+(view&&view.kind==='project'&&view.id===p.id?' on':'')}>
         <button className={'cv-caret'+(isOpen?' open':'')} aria-label="Show boards" onClick={()=>toggle(p.id)}><CaretRight size={11} weight="bold"/></button>
         <button className="cv-row-main" onClick={()=>{setView({kind:'project',id:p.id});setOpen(s=>new Set(s).add(p.id));}}>
          <span className="cv-row-ic">{p.icon?<Glyph name={p.icon} size={16}/>:<FolderSimple size={16}/>}</span><b>{p.name||'Untitled project'}</b><em>{mine.length}</em>
         </button>
        </div>
        {isOpen&&mine.map(b=>row(b,1))}
       </div>
      );
     })}
     {loose.length>0&&<div className="cv-loose">{projects.length>0&&<span className="cv-label">Boards</span>}{loose.map(b=>row(b,0))}</div>}
     {!boards.length&&!projects.length&&<p className="muted cv-none">No boards yet.</p>}
    </div>
   </aside>
   <section className="cv-main">
    {board&&<div className="cv-head"><NoteHead note={board} onChange={ch=>patchBoard(board.id,ch)}/></div>}
    {board&&<BoardView key={board.id} board={board} projects={projects} onChange={(ch,quiet)=>patchBoard(board.id,ch,quiet)} onDelete={()=>delBoard(board)}/>}
    {project&&<ProjectPage project={project} boards={boards.filter(b=>b.project===project.id)} onChange={ch=>patchProject(project.id,ch)} onOpen={id=>setView({kind:'board',id})} onNewBoard={()=>makeBoard(project.id)} onDelete={()=>delProject(project)}/>}
    {!board&&!project&&<div className="cv-empty">
     <TreeStructure size={44} weight="light"/>
     <h3>Map your thinking</h3>
     <p className="muted">Boards are open canvases for ideas: connect thoughts, branch them out, colour and label them. Keep related boards together in a project.</p>
     <div className="cv-empty-acts"><button className="primary" onClick={()=>makeBoard(null)}><Plus size={15} weight="bold"/>New board</button><button className="ghost" onClick={makeProject}><FolderSimplePlus size={15}/>New project</button></div>
    </div>}
   </section>
   {undo.node}
  </div>
 );
}
