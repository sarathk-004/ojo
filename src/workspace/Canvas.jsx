import React,{useEffect,useState} from 'react';
import {Plus,FolderSimplePlus,FolderSimple,TreeStructure,Trash,CaretRight} from '@phosphor-icons/react';
import {useCollection} from './hooks.js';
import {useUndo} from './Undo.jsx';
import {Select} from './Select.jsx';
import {NoteHead,COVERS} from './NoteHead.jsx';
import {Glyph,ICON_NAMES} from './icons.jsx';
import {useFileUrl} from './hooks.js';
import {ditherStyle} from './dither.js';
import {BoardView} from './CanvasBoard.jsx';
import {newBoard,newProject} from './canvas.mjs';

const VIEW_KEY='tnkr-ws-canvas-view';
const readView=()=>{try{return JSON.parse(localStorage.getItem(VIEW_KEY))||null;}catch{return null;}};

// A small cover picture for a board or project card.
function CoverThumb({cover}){
 const url=useFileUrl(cover&&cover.type==='image'?cover.fileId:null,'image/*');
 if(!cover)return <div className="cv-thumb empty"><TreeStructure size={22} weight="light"/></div>;
 if(cover.type==='dither')return <div className="cv-thumb" style={ditherStyle(cover.id,96,24)}/>;
 if(cover.type==='image')return <div className="cv-thumb">{url&&<img src={url} alt="" draggable={false} style={{objectPosition:(cover.x??50)+'% '+(cover.y??50)+'%'}}/>}</div>;
 return <div className="cv-thumb" style={{background:(COVERS.find(c=>c.id===cover.id)||COVERS[0]).css}}/>;
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
