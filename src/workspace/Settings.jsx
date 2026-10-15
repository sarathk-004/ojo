import React,{useEffect,useState} from 'react';
import {Sun,Moon,Desktop,UploadSimple,Trash,ShieldCheck,FileText,Scales,CaretLeft,Check,PlayCircle,ArrowLineDown,BellSlash} from '@phosphor-icons/react';
import {Modal} from './Modal.jsx';
import {LegalDoc} from './LegalDoc.jsx';
import {api} from './api.js';
import {getTheme,setTheme} from './theme.js';
import {useCollection} from './hooks.js';
import {PRIVACY,TERMS,NOTICES} from '../legal/documents.mjs';
import {LEGAL_VERSION} from '../legal/info.mjs';

export const THEMES=[{id:'light',name:'Light',icon:Sun},{id:'dark',name:'Dark',icon:Moon},{id:'system',name:'Match Windows',icon:Desktop}];

export function ThemePicker({value,onChange}){
 return (
  <div className="theme-pick" role="radiogroup" aria-label="Appearance">
   {THEMES.map(t=>{const I=t.icon;return <button key={t.id} role="radio" aria-checked={value===t.id} className={value===t.id?'on':''} onClick={()=>onChange(t.id)}><I size={20} weight={value===t.id?'fill':'regular'}/>{t.name}</button>;})}
  </div>
 );
}

// Appearance, your data, and the legal documents, all in one place.
// Quiet mode: nothing pops up over other windows (notch, reminders, notifications, shortcuts). For exams, tests and meetings.
function QuietSection(){
 const [q,setQ]=useState({quiet:false,manual:false,until:0,busy:false,auto:true});
 useEffect(()=>{api.quietGet().then(setQ);return api.onQuiet(setQ);},[]);
 const set=what=>api.quietSet(what).then(setQ);
 const until=q.manual?new Date(q.until).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+(new Date(q.until).toDateString()!==new Date().toDateString()?' tomorrow':''):'';
 return (
  <section className="quiet-sec">
   <h4>Quiet mode</h4>
   <p className="muted">ojo can show reminders, notifications and a small notch above other windows. Turn Quiet mode on <b>before an exam, a proctored test, a presentation or a screen share</b>. Missed reminders wait and appear when it ends.</p>
   <p className={'quiet-state'+(q.quiet?' on':'')}><BellSlash size={16} weight={q.quiet?'fill':'regular'}/>{q.manual?'Quiet until '+until:q.quiet?'Quiet now, because another app is full screen':'Off. Pop-ups can appear.'}</p>
   <div className="set-actions">
    <button className="ghost" onClick={()=>set(1)}>1 hour</button>
    <button className="ghost" onClick={()=>set(3)}>3 hours</button>
    <button className="ghost" onClick={()=>set('tomorrow')}>Until tomorrow</button>
    {q.manual&&<button className="ghost" onClick={()=>set('off')}>Turn off</button>}
   </div>
   <label className="check quiet-auto"><input type="checkbox" checked={q.auto} onChange={e=>api.quietSet({auto:e.target.checked}).then(setQ)}/><span>Also stay quiet while another app is full screen, a presentation is running or Windows Focus assist is on</span></label>
   <p className="muted quiet-note">For a proctored exam, quit ojo from its tray icon: ojo's desktop helper watches where you click (never what you type), and some exam software does not allow that.</p>
  </section>
 );
}

export function Settings({onClose,onTour}){
 const [confirmErase,setConfirmErase]=useState(false),[typed,setTyped]=useState('');
 const [theme,setT]=useState(getTheme),[doc,setDoc]=useState(null),[note,setNote]=useState('');
 const [settings]=useCollection('settings');
 const accepted=settings[0]?.legalAccepted;
 const pick=id=>{setT(id);setTheme(id);};
 const exportAll=async()=>{
  setNote('');
  const r=await api.exportAll();
  if(r&&r.ok)setNote('Saved a copy to '+r.path);
  else if(r&&!r.canceled)setNote('Could not export'+(r.error?': '+r.error:'.'));
 };
 const eraseAll=async()=>{
  const ok=await api.eraseAll(true);
  if(ok){
   try{for(const k of Object.keys(localStorage))if(k.startsWith('tnkr-')&&k!=='tnkr-theme')localStorage.removeItem(k);}catch{}
   location.reload();
  }
 };
 const DOCS={privacy:PRIVACY,terms:TERMS,notices:NOTICES};
 if(confirmErase)return (
  <Modal title="Erase all data" onClose={()=>setConfirmErase(false)}>
   <div className="erase-box">
    <p>This permanently deletes every task, note, saved item, PDF, finance entry, job, bill and setting on this computer. It cannot be undone.</p>
    <p className="muted">Want a copy first? Cancel and use Export my data.</p>
    <label>Type <b>confirm</b> to continue<input autoFocus value={typed} onChange={e=>setTyped(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&typed.trim().toLowerCase()==='confirm')eraseAll();}} placeholder="confirm"/></label>
    <div className="form-actions">
     <button className="ghost" onClick={()=>setConfirmErase(false)}>Cancel</button>
     <button className="danger-fill" disabled={typed.trim().toLowerCase()!=='confirm'} onClick={eraseAll}>Erase everything</button>
    </div>
   </div>
  </Modal>
 );
 if(doc)return (
  <Modal title={DOCS[doc].title} onClose={onClose} wide>
   <button className="legal-back" onClick={()=>setDoc(null)}><CaretLeft size={14}/>Settings</button>
   <LegalDoc doc={DOCS[doc]}/>
  </Modal>
 );
 return (
  <Modal title="Settings" onClose={onClose}>
   <div className="settings">
    <section>
     <h4>Appearance</h4>
     <ThemePicker value={theme} onChange={pick}/>
    </section>
    <QuietSection/>
    <section>
     <h4>Welcome</h4>
     <div className="set-links">
      <button onClick={onTour}><PlayCircle size={17}/>Replay the welcome tour</button>
      <button onClick={()=>{api.notchIntro();setNote('The notch will slide down at the top of your screen.');}}><ArrowLineDown size={17}/>Show the notch introduction again</button>
     </div>
    </section>
    <section>
     <h4>Your data</h4>
     <p className="muted">Everything lives on this computer. Nothing is sent to anyone.</p>
     <div className="set-actions">
      <button className="ghost" onClick={exportAll}><UploadSimple size={16}/>Export my data</button>
      <button className="ghost danger-btn" onClick={()=>{setTyped('');setConfirmErase(true);}}><Trash size={16}/>Erase all data</button>
     </div>
     {note&&<p className="muted set-note"><Check size={13}/>{note}</p>}
    </section>
    <section>
     <h4>Privacy and legal</h4>
     <div className="set-links">
      <button onClick={()=>setDoc('privacy')}><ShieldCheck size={17}/>Privacy Notice</button>
      <button onClick={()=>setDoc('terms')}><Scales size={17}/>Terms of Use</button>
      <button onClick={()=>setDoc('notices')}><FileText size={17}/>Open-source notices</button>
     </div>
    </section>
   </div>
  </Modal>
 );
}
