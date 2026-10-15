import React,{Suspense,lazy,useEffect,useRef,useState} from 'react';
import {FilePdf,Plus,Trash,PencilSimple,UploadSimple,BookmarkSimple} from '@phosphor-icons/react';
import {useCollection,fmtSize} from './hooks.js';
import {api} from './api.js';
import {ingest} from './ingest.js';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';
import {ShelfTabs,FavButton,RestoreButton,modeCounts,inMode,expired,daysLeft} from './shelf.jsx';

// pdf.js is large, so the reader loads only when a PDF is opened.
const PdfReader=lazy(()=>import('./PdfReader.jsx').then(m=>({default:m.PdfReader})));
const last=()=>{try{return localStorage.getItem('tnkr-ws-pdf');}catch{return null;}};

export function Pdfs({focusId}){
 const [saved,setSaved,ready]=useCollection('saved');
 const [mode,setMode]=useState('all');
 const allPdfs=saved.filter(i=>i.kind==='pdf');
 const tabCounts=modeCounts(allPdfs);
 const pdfs=allPdfs.filter(i=>inMode(i,mode));
 useEffect(()=>{if(allPdfs.some(i=>expired(i))){allPdfs.filter(expired).forEach(i=>i.fileId&&api.delFile(i.fileId));setSaved(l=>l.filter(i=>!expired(i)));}},[saved.length]);
 const [activeId,setActiveId]=useState(()=>focusId||last()),[renaming,setRenaming]=useState(null),[over,setOver]=useState(false),[error,setError]=useState('');
 const depth=useRef(0);
 const active=pdfs.find(p=>p.id===activeId)||pdfs[0]||null;

 useEffect(()=>{if(focusId)setActiveId(focusId);},[focusId]);
 useEffect(()=>{try{if(active)localStorage.setItem('tnkr-ws-pdf',active.id);}catch{}},[active?.id]);

 const patch=(id,change)=>setSaved(l=>l.map(x=>x.id===id?{...x,...change}:x));
 const reload=async()=>{const d=await api.load();setSaved(d.saved);return d.saved;};
 const openDialog=async()=>{
  setError('');
  const ids=await api.pickFiles('pdf');
  if(ids?.length){await reload();setActiveId(ids[0]);}
 };
 const addDropped=async dt=>{
  const files=[...dt.files].filter(f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name));
  if(!files.length&&!dt.getData('text/uri-list')&&!dt.getData('text/plain')){setError('Only PDF files or links to PDFs can be added here.');return;}
  setError('');
  const records=(await ingest(dt)).filter(r=>r.kind==='pdf');
  if(!records.length){setError('That is not a PDF.');return;}
  await api.addSaved(records);
  const list=await reload();
  const newest=list.find(i=>i.kind==='pdf');if(newest)setActiveId(newest.id);
 };
 const bulk=useBulk();
 useEffect(()=>{bulk.clear();},[mode]);
 const bulkTrash=ids=>{setSaved(l=>l.map(x=>ids.includes(x.id)?{...x,deleted:Date.now()}:x));if(ids.includes(activeId))setActiveId(null);bulk.stop();};
 const bulkRestore=ids=>{setSaved(l=>l.map(x=>ids.includes(x.id)?{...x,deleted:undefined}:x));bulk.stop();};
 const bulkPurge=ids=>{allPdfs.filter(i=>ids.includes(i.id)&&i.fileId).forEach(i=>api.delFile(i.fileId));setSaved(l=>l.filter(x=>!ids.includes(x.id)));if(ids.includes(activeId))setActiveId(null);bulk.stop();};
 const remove=p=>{patch(p.id,{deleted:Date.now()});if(activeId===p.id)setActiveId(null);};
 const restore=p=>patch(p.id,{deleted:undefined});
 const favorite=p=>patch(p.id,{favorite:!p.favorite});
 const purge=p=>{if(p.fileId)api.delFile(p.fileId);setSaved(l=>l.filter(x=>x.id!==p.id));if(activeId===p.id)setActiveId(null);};
 const emptyTrash=()=>{allPdfs.filter(i=>i.deleted&&i.fileId).forEach(i=>api.delFile(i.fileId));setSaved(l=>l.filter(x=>!(x.kind==='pdf'&&x.deleted)));};
 const rename=(p,name)=>{setRenaming(null);if(name.trim())patch(p.id,{title:name.trim()});};
 const onDrop=e=>{e.preventDefault();depth.current=0;setOver(false);addDropped(e.dataTransfer);};

 return (
  <div className={'pdfs'+(over?' over':'')} onDragEnter={e=>{e.preventDefault();depth.current++;setOver(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={()=>{if(--depth.current<=0)setOver(false);}} onDrop={onDrop}>
   <aside className="pdf-list">
    <div className="list-head">
     <h2>PDFs</h2>
     <SelectToggle bulk={bulk} disabled={!pdfs.length}/>
     <button className="primary round" aria-label="Open a PDF" onClick={openDialog}><Plus size={16} weight="bold"/></button>
    </div>
    {bulk.on&&(mode==='trash'
     ?<BulkBar bulk={bulk} ids={pdfs.map(p=>p.id)} noun="PDF" deleteLabel="Delete forever" confirmDelete onDelete={bulkPurge}><button className="bulk-act" disabled={!bulk.count} onClick={()=>bulkRestore([...bulk.sel])}>Restore</button></BulkBar>
     :<BulkBar bulk={bulk} ids={pdfs.map(p=>p.id)} noun="PDF" deleteLabel="Move to Trash" onDelete={bulkTrash}/>)}
    <ShelfTabs compact mode={mode} setMode={setMode} counts={tabCounts} onEmpty={emptyTrash}/>
    {error&&<p className="error">{error}</p>}
    <div className="list-scroll">
     {pdfs.map(p=>(
      <div key={p.id} className={'pdf-row'+(active?.id===p.id?' on':'')+(bulk.on?' sel-host':'')} onClick={()=>{if(!bulk.on)setActiveId(p.id);}}>
       <SelectMark bulk={bulk} id={p.id}/>
       <FilePdf size={22} weight="duotone"/>
       <div className="pdf-meta">
        {renaming===p.id
         ?<input autoFocus defaultValue={p.title} onClick={e=>e.stopPropagation()} onBlur={e=>rename(p,e.target.value)} onKeyDown={e=>{if(e.key==='Enter')rename(p,e.target.value);if(e.key==='Escape')setRenaming(null);}}/>
         :<b>{p.title}</b>}
        <span className="muted">{mode==='trash'?daysLeft(p)+' days left':''}{mode!=='trash'&&(p.progress?`Page ${p.progress.page} of ${p.progress.total}`:fmtSize(p.size)||'Not opened yet')}{p.bookmark&&<BookmarkSimple size={12} weight="fill" className="bm"/>}</span>
        {p.progress&&<span className="mini-bar"><i style={{width:Math.round(p.progress.page/p.progress.total*100)+'%'}}/></span>}
       </div>
       {mode==='trash'
        ?<span className="row-actions always"><RestoreButton label="" onClick={()=>restore(p)}/><button className="icon-btn danger" aria-label="Delete forever" onClick={e=>{e.stopPropagation();purge(p);}}><Trash size={14}/></button></span>
        :<span className={'row-actions'+(p.favorite?' has-fav':'')}>
         <FavButton on={p.favorite} onClick={()=>favorite(p)}/>
         <button className="icon-btn" aria-label="Rename" onClick={e=>{e.stopPropagation();setRenaming(p.id);}}><PencilSimple size={14}/></button>
         <button className="icon-btn danger" aria-label="Remove" onClick={e=>{e.stopPropagation();remove(p);}}><Trash size={14}/></button>
        </span>}
      </div>
     ))}
     {ready&&!pdfs.length&&<p className="muted pad">{mode==='trash'?'Trash is empty.':mode==='fav'?'No favorite PDFs yet.':'Nothing yet. PDFs you save from the notch appear here too.'}</p>}
    </div>
   </aside>
   <section className="pdf-view">
    {active
     ?<Suspense fallback={<div className="empty-state"><p className="muted">Opening…</p></div>}>
       <PdfReader key={active.id} item={active}
        onProgress={(page,total)=>patch(active.id,{progress:{page,total,at:Date.now()}})}
        onBookmark={bm=>patch(active.id,{bookmark:bm||undefined})}
        onHighlights={hl=>patch(active.id,{highlights:hl})}/>
      </Suspense>
     :<div className="empty-state">
      <FilePdf size={38} weight="light"/>
      <h3>Pick up where you left off</h3>
      <p className="muted">Open a PDF from your computer, drop one here, or save one from the notch. Your page and bookmark are remembered.</p>
      <button className="primary" onClick={openDialog}><UploadSimple size={15}/>Open a PDF</button>
     </div>}
   </section>
   {over&&<div className="drop-veil"><span>Drop PDFs to add</span></div>}
  </div>
 );
}
