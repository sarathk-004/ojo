import React,{useEffect,useMemo,useRef,useState} from 'react';
import {dateLocale} from './prefs.js';
import {DateField} from './Pickers.jsx';
import {Plus,Briefcase,MapPin,CurrencyInr,CalendarBlank,ArrowUpRight,Trash,Rows,Kanban,Warning} from '@phosphor-icons/react';
import {useCollection} from './hooks.js';
import {api} from './api.js';
import {Modal} from './Modal.jsx';
import {Select} from './Select.jsx';
import {STATUSES,STATUS_COLORS,SOURCES,PRIORITIES,newJob,moveJob,stats,followUps,daysSince} from './jobs.mjs';
import {dayKey} from '../tasks.mjs';
import {useUndo} from './Undo.jsx';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';
import {Pill} from './motionkit.jsx';

const today=()=>dayKey();
const fmtDate=d=>d?new Date(d+'T00:00').toLocaleDateString(dateLocale(),{day:'numeric',month:'short'}):'';
const ago=(ts)=>new Date(ts).toLocaleDateString(dateLocale(),{day:'numeric',month:'short',year:'numeric'});
const EMPTY={company:'',role:'',status:'Applied',location:'',salary:'',source:'',link:'',contact:'',nextStep:'',nextDate:'',priority:'Medium',notes:'',appliedDate:today()};

function JobForm({job,onSave,onDelete}){
 const [f,setF]=useState(job||EMPTY),[confirm,setConfirm]=useState(false),[err,setErr]=useState('');
 const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
 const submit=e=>{
  e.preventDefault();
  if(!f.company.trim()||!f.role.trim()){setErr('Add the company and the role.');return;}
  onSave({...f,company:f.company.trim(),role:f.role.trim()});
 };
 return (
  <form className="job-form" onSubmit={submit}>
   <div className="two"><label>Company<input autoFocus value={f.company} onChange={e=>{setErr('');set('company')(e);}} placeholder="Acme Corp"/></label><label>Role<input value={f.role} onChange={e=>{setErr('');set('role')(e);}} placeholder="Software Engineer"/></label></div>
   {err&&<p className="error">{err}</p>}
   <div className="stage-pick">{STATUSES.map(s=><button type="button" key={s} className={f.status===s?'on':''} style={{'--c':STATUS_COLORS[s]}} onClick={()=>setF(x=>({...x,status:s}))}>{s}</button>)}</div>
   <div className="three">
    <label>Applied on<DateField value={f.appliedDate||''} onChange={set('appliedDate')}/></label>
    <label>Location<input value={f.location} onChange={set('location')} placeholder="Bengaluru / Remote"/></label>
    <label>Salary<input value={f.salary} onChange={set('salary')} placeholder="₹18 LPA"/></label>
   </div>
   <div className="three">
    <label>Source<Select block value={f.source} placeholder="—" onChange={v=>setF(x=>({...x,source:v}))} options={[{value:'',label:'—'},...SOURCES]}/></label>
    <label>Priority<Select block value={f.priority} onChange={v=>setF(x=>({...x,priority:v}))} options={PRIORITIES}/></label>
    <label>Contact<input value={f.contact} onChange={set('contact')} placeholder="Name or email"/></label>
   </div>
   <label>Job link<input value={f.link} onChange={set('link')} placeholder="https://…"/></label>
   <div className="two"><label>Next step<input value={f.nextStep} onChange={set('nextStep')} placeholder="Technical round, follow up…"/></label><label>On<DateField value={f.nextDate||''} onChange={set('nextDate')}/></label></div>
   <label>Notes<textarea rows={3} value={f.notes} onChange={set('notes')} placeholder="Interview prep, impressions, referral details…"/></label>
   {job?.history?.length>1&&<div className="timeline"><b>Timeline</b>{[...job.history].reverse().map((h,i)=><div key={i}><i style={{background:STATUS_COLORS[h.status]}}/><span>{h.status}</span><em>{ago(h.at)}</em></div>)}</div>}
   <div className="form-actions">
    <button className="primary" type="submit">{job?'Save changes':'Add application'}</button>
    {f.link&&/^https?:/i.test(f.link)&&<button type="button" className="ghost" onClick={()=>api.openExternal(f.link)}><ArrowUpRight size={15}/>Open posting</button>}
    {job&&<button type="button" className={'ghost danger'+(confirm?' armed':'')} onClick={()=>{if(!confirm){setConfirm(true);setTimeout(()=>setConfirm(false),2500);}else onDelete(job.id);}}><Trash size={15}/>{confirm?'Click to confirm':'Delete'}</button>}
   </div>
  </form>
 );
}

function Card({job,onOpen,onDragStart,bulk}){
 const t=today(),overdue=job.nextDate&&job.nextDate<t&&!['Rejected','Offer'].includes(job.status),d=daysSince(job.appliedDate,t);
 return (
  <article className={'job-card p-'+(job.priority||'Medium')+(bulk&&bulk.on?' sel-host':'')} draggable={!(bulk&&bulk.on)} onDragStart={e=>onDragStart(e,job)} onClick={()=>onOpen(job)}>
   {bulk&&<SelectMark bulk={bulk} id={job.id}/>}
   <b>{job.company}</b><span className="role">{job.role}</span>
   <div className="job-meta">
    {job.priority==='High'&&<span className="prio">High priority</span>}
    {job.location&&<span><MapPin size={12}/>{job.location}</span>}
    {job.salary&&<span><CurrencyInr size={12}/>{job.salary.replace(/^₹\s?/,'')}</span>}
    {d!==null&&job.status!=='Wishlist'&&<span>{d===0?'Today':d+'d ago'}</span>}
   </div>
   {job.nextDate&&<div className={'next'+(overdue?' late':'')}>{overdue?<Warning size={12} weight="fill"/>:<CalendarBlank size={12}/>}{fmtDate(job.nextDate)} · {job.nextStep||'Follow up'}</div>}
  </article>
 );
}

export function Jobs({focusId}){
 const [jobs,setJobs]=useCollection('jobs');
 const [view,setView]=useState(()=>{try{return localStorage.getItem('tnkr-ws-jobview')||'board';}catch{return 'board';}}),[modal,setModal]=useState(null),[over,setOver]=useState(null),[query,setQuery]=useState('');
 const dragId=useRef(null);
 useEffect(()=>{if(!focusId)return;const j=jobs.find(x=>x.id===focusId);if(j)setModal(j);},[focusId,jobs.length]);
 const s=useMemo(()=>stats(jobs),[jobs]);
 const due=useMemo(()=>followUps(jobs,today(),7),[jobs]);
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return q?jobs.filter(j=>[j.company,j.role,j.location,j.notes,j.source].some(v=>v&&v.toLowerCase().includes(q))):jobs;},[jobs,query]);
 const setViewSaved=v=>{setView(v);try{localStorage.setItem('tnkr-ws-jobview',v);}catch{}};

 const save=f=>{
  if(modal&&modal.id){
   setJobs(l=>l.map(j=>{
    if(j.id!==modal.id)return j;
    const {status,...rest}=f;
    return moveJob({...j,...rest,updated:Date.now()},status);
   }));
  }else setJobs(l=>[newJob(f),...l]);
  setModal(null);
 };
 const undo=useUndo(),bulk=useBulk();
 useEffect(()=>{bulk.clear();},[query]);
 const bulkDelete=ids=>{
  const gone=jobs.map((j,i)=>ids.includes(j.id)?{j,i}:null).filter(Boolean);
  setJobs(l=>l.filter(x=>!ids.includes(x.id)));bulk.stop();
  undo.show(gone.length+(gone.length===1?' application':' applications')+' deleted',()=>setJobs(l=>{const cur=l.filter(x=>!gone.some(g=>g.j.id===x.id));gone.forEach(({j,i})=>cur.splice(Math.min(i,cur.length),0,j));return cur;}));
 };
 const remove=id=>{setJobs(l=>l.filter(j=>j.id!==id));setModal(null);};
 const drop=status=>{
  const id=dragId.current;dragId.current=null;setOver(null);
  if(id)setJobs(l=>l.map(j=>j.id===id?moveJob(j,status):j));
 };
 const onDragStart=(e,job)=>{dragId.current=job.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',job.id);};

 return (
  <div className="jobs">
   <header className="jobs-head">
    <h2>Job applications</h2>
    <div className="view-toggle">
     <button className={view==='board'?'on':''} onClick={()=>setViewSaved('board')} aria-label="Board view">{view==='board'&&<Pill group="jobview"/>}<Kanban size={16}/>Board</button>
     <button className={view==='list'?'on':''} onClick={()=>setViewSaved('list')} aria-label="List view">{view==='list'&&<Pill group="jobview"/>}<Rows size={16}/>List</button>
    </div>
    <span className="spacer"/>
    <label className="search"><input placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <SelectToggle bulk={bulk} disabled={!shown.length}/>
    <button className="primary" onClick={()=>setModal(0)}><Plus size={15} weight="bold"/>Add application</button>
   </header>

   <div className="stat-cards jobs-stats">
    <div className="stat"><span>Applied</span><b>{s.applied}</b></div>
    <div className="stat"><span>In progress</span><b>{s.active}</b></div>
    <div className="stat"><span>Interviews</span><b>{s.interviews}</b></div>
    <div className="stat income"><span>Offers</span><b>{s.offers}</b></div>
    <div className="stat"><span>Response rate</span><b>{s.responseRate===null?'—':s.responseRate+'%'}</b></div>
   </div>

   {due.length>0&&<div className="followups">
    <b><CalendarBlank size={14}/>Coming up</b>
    {due.slice(0,5).map(j=><button key={j.id} className={j.overdue?'late':''} onClick={()=>setModal(j)}>{j.overdue&&<Warning size={12} weight="fill"/>}<span>{j.company}</span><em>{fmtDate(j.nextDate)} · {j.nextStep||'Follow up'}</em></button>)}
   </div>}

   {bulk.on&&<BulkBar bulk={bulk} ids={shown.map(j=>j.id)} noun="application" onDelete={bulkDelete}/>}
   {view==='board'?<div className={'board'+(jobs.length?'':' compact')}>
    {STATUSES.map(st=>{
     const col=shown.filter(j=>j.status===st);
     return (
      <section key={st} className={'col'+(over===st?' over':'')} style={{'--c':STATUS_COLORS[st]}} onDragOver={e=>{e.preventDefault();setOver(st);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(null);}} onDrop={e=>{e.preventDefault();drop(st);}}>
       <header><i/><b>{st}</b><em>{col.length}</em></header>
       <div className="col-cards">
        {col.map(j=><Card key={j.id} job={j} bulk={bulk} onOpen={setModal} onDragStart={onDragStart}/>)}
        {!col.length&&<p className="col-empty">{st==='Wishlist'?'Jobs you want to apply to':'Drop a card here'}</p>}
       </div>
      </section>
     );
    })}
   </div>:<div className="job-table">
    <div className="jt-head"><span>Company</span><span>Role</span><span>Stage</span><span>Applied</span><span>Next step</span><span>Source</span></div>
    {[...shown].sort((a,b)=>b.updated-a.updated).map(j=>(
     <div className={'jt-row'+(bulk.on?' sel-host':'')} key={j.id} onClick={()=>{if(!bulk.on)setModal(j);}}>
      <SelectMark bulk={bulk} id={j.id}/>
      <b>{j.company}</b><span>{j.role}</span>
      <span><i className="stage-pill" style={{'--c':STATUS_COLORS[j.status]}}>{j.status}</i></span>
      <span>{fmtDate(j.appliedDate)||'—'}</span><span>{j.nextDate?fmtDate(j.nextDate)+' · '+(j.nextStep||'Follow up'):'—'}</span><span>{j.source||'—'}</span>
     </div>
    ))}
   </div>}

   {!jobs.length&&<div className="empty-state small overlay"><Briefcase size={32} weight="light"/><h3>Track every application</h3><p className="muted">Add a job, move it through Applied, Screening and Interview as things progress, and keep notes and follow-up dates in one place.</p><button className="primary" onClick={()=>setModal(0)}><Plus size={15} weight="bold"/>Add your first application</button></div>}

   {undo.node}
   {modal!==null&&<Modal wide title={modal?'Edit application':'Add application'} onClose={()=>setModal(null)}>
    <JobForm job={modal||null} onSave={save} onDelete={remove}/>
   </Modal>}
  </div>
 );
}
