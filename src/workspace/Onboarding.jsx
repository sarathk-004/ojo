import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {BellSlash,HardDrives,ShieldCheck,GlobeHemisphereWest,DownloadSimple,ArrowRight,ArrowLeft,Lightning,MagnifyingGlass,NotePencil,Check,Scales} from '@phosphor-icons/react';
import {Mascot} from './Mascot.jsx';
import {ThemePicker} from './Settings.jsx';
import {LegalDoc} from './LegalDoc.jsx';
import {getTheme,setTheme} from './theme.js';
import {PRIVACY,TERMS} from '../legal/documents.mjs';
import {LEGAL_VERSION} from '../legal/info.mjs';

const STEPS=['welcome','data','look','tips','terms'];

// First run: what ojo is, how it treats your data, how it looks, a few shortcuts, then the terms.
export function Onboarding({onAccept,replay=false,legalOnly=false}){
 const [step,setStep]=useState(0),[theme,setT]=useState(getTheme),[agree,setAgree]=useState(false),[read,setRead]=useState(null);
 const card=useRef(null);
 useEffect(()=>{if(card.current)gsap.fromTo(card.current.querySelectorAll('[data-in]'),{y:14,opacity:0},{y:0,opacity:1,duration:.4,stagger:.06,ease:'power3.out'});},[step,read]);
 const steps=replay?STEPS.slice(0,4):legalOnly?['terms']:STEPS;
 const id=steps[step],last=step===steps.length-1;
 const pick=v=>{setT(v);setTheme(v);};
 return (
  <div className="onb" role="dialog" aria-modal="true" aria-label="Welcome to ojo">
   <div className="onb-card" ref={card}>
    <div className="onb-dots" aria-hidden="true">{steps.map((s,i)=><i key={s} className={i===step?'on':i<step?'done':''}/>)}</div>

    {id==='welcome'&&<div className="onb-body">
     <div data-in className="onb-logo"><Mascot size={132} draw follow mood="idle"/></div>
     <h1 data-in>Welcome to ojo</h1>
     <p data-in className="onb-lead">Your tasks, notes, plans, money and saved things, together in one calm place that lives on your computer.</p>
    </div>}

    {id==='data'&&<div className="onb-body">
     <h2 data-in>Your data stays yours</h2>
     <ul className="onb-points">
      <li data-in><HardDrives size={22}/><div><b>It stays on this device</b><span>Tasks, notes and files are kept on your computer. We never receive them.</span></div></li>
      <li data-in><ShieldCheck size={22}/><div><b>No account, no tracking</b><span>No sign-up, analytics, ads or cloud sync. Nothing to leak.</span></div></li>
      <li data-in><GlobeHemisphereWest size={22}/><div><b>Online only when you ask</b><span>ojo connects to a website only to read a link you saved, and it talks straight to that site.</span></div></li>
      <li data-in><DownloadSimple size={22}/><div><b>Take it or erase it</b><span>Export a copy of everything, or erase it all, any time in Settings.</span></div></li>
     </ul>
    </div>}

    {id==='look'&&<div className="onb-body">
     <h2 data-in>Choose how it looks</h2>
     <p data-in className="onb-lead">You can change this later in Settings.</p>
     <div data-in><ThemePicker value={theme} onChange={pick}/></div>
    </div>}

    {id==='tips'&&<div className="onb-body">
     <h2 data-in>Four things worth knowing</h2>
     <ul className="onb-points">
      <li data-in><Lightning size={22}/><div><b>Quick capture</b><span>Press <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Space</kbd> anywhere to jot a task, a note or a link.</span></div></li>
      <li data-in><MagnifyingGlass size={22}/><div><b>Search everything</b><span>Press <kbd>Ctrl</kbd> <kbd>K</kbd> to find any note, task, file or entry.</span></div></li>
      <li data-in><BellSlash size={22}/><div><b>Exams and meetings</b><span>ojo can pop up above other windows. Before an exam, a proctored test or a screen share, turn on <b>Quiet mode</b> from the tray icon or Settings, or quit ojo.</span></div></li>
      <li data-in><NotePencil size={22}/><div><b>The top-of-screen notch</b><span>Drag a link, image or PDF to the top centre of your screen to save it for later.</span></div></li>
     </ul>
    </div>}

    {id==='terms'&&!read&&<div className="onb-body">
     <h2 data-in>{legalOnly?'We updated our notices':'One last thing'}</h2>
     <p data-in className="onb-lead">{legalOnly?'We updated our notices: they now explain pop-ups and Quiet mode (use it before exams, tests and screen shares). Please read the changes and accept to continue.':'Please read how ojo treats your data and the rules for using it. They are short and written in plain language.'}</p>
     <div data-in className="onb-docs">
      <button onClick={()=>setRead(PRIVACY)}><ShieldCheck size={18}/><span><b>Privacy Notice</b><i>What stays on your device, and when ojo goes online</i></span><ArrowRight size={16}/></button>
      <button onClick={()=>setRead(TERMS)}><Scales size={18}/><span><b>Terms of Use</b><i>Your licence, your responsibilities, and our limits</i></span><ArrowRight size={16}/></button>
     </div>
     <label data-in className="onb-agree check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>I am old enough to agree (or have a parent or guardian's permission), and I have read and accept the Terms of Use and the Privacy Notice.</span></label>
    </div>}

    {id==='terms'&&read&&<div className="onb-body onb-read">
     <button className="legal-back" onClick={()=>setRead(null)}><ArrowLeft size={14}/>Back</button>
     <h2>{read.title}</h2>
     <div className="onb-scroll"><LegalDoc doc={read}/></div>
    </div>}

    <div className="onb-nav">
     {step>0&&!read&&<button className="ghost" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={15}/>Back</button>}
     <span className="spacer"/>
     {!last&&<button className="primary" onClick={()=>setStep(s=>s+1)}>Continue<ArrowRight size={15}/></button>}
     {last&&replay&&<button className="primary" onClick={()=>onAccept(LEGAL_VERSION)}>Done</button>}
     {last&&!read&&!replay&&<button className="primary" disabled={!agree} onClick={()=>onAccept(LEGAL_VERSION)}>Start using ojo</button>}
    </div>
   </div>
  </div>
 );
}
