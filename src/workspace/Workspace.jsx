import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {CheckCircle,NotePencil,CalendarBlank,BookmarkSimple,FilePdf,Wallet,Briefcase,Repeat,CalendarCheck,Timer,Receipt,ChartLineUp,SidebarSimple,MagnifyingGlass,Columns,DotsSixVertical,GearSix,Sun,Moon,TreeStructure} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import '@fontsource-variable/geist';
import './workspace.css';
import './workspace-more.css';
import './workspace-fixes.css';
import './workspace-blocks.css';
import './workspace-fin.css';
import './workspace-news.css';
import './workspace-select.css';
import './workspace-brief.css';
import './workspace-shelf.css';
import './workspace-stmt.css';
import './workspace-search.css';
import './workspace-bills.css';
import './workspace-focus.css';
import './workspace-planner.css';
import './workspace-review.css';
import './workspace-shutdown.css';
import './workspace-notehead.css';
import './workspace-controls.css';
import './workspace-motion.css';
import './workspace-settings.css';
import './workspace-polish.css';
import './workspace-narrow.css';
import './workspace-extras.css';
import './workspace-dark.css';
import {Settings} from './Settings.jsx';
import {Tooltip} from './Tooltip.jsx';
import {useLivePrefs,applyPrefs,SCALES} from './prefs.js';
import {Mascot} from './Mascot.jsx';
import {Onboarding} from './Onboarding.jsx';
import {applyTheme,getTheme,setTheme,watchSystemTheme} from './theme.js';
import {useCollection} from './hooks.js';
import {LEGAL_VERSION,TOUR_VERSION} from '../legal/info.mjs';
import {Tasks} from './Tasks.jsx';
import {Notes} from './Notes.jsx';
import {Calendar} from './Calendar.jsx';
import {Saved} from './Saved.jsx';
import {Pdfs} from './Pdfs.jsx';
import {Finance} from './Finance.jsx';
import {Jobs} from './Jobs.jsx';
import {Reminders} from './Reminders.jsx';
import {Bills} from './Bills.jsx';
import {Focus,useFocus} from './Focus.jsx';
import {Planner} from './Planner.jsx';
import {Review} from './Review.jsx';
import {Canvas} from './Canvas.jsx';
import './workspace-canvas.css';
import {fmtClock} from './focus.mjs';
import {api} from './api.js';
import {SearchPalette} from './SearchPalette.jsx';

const SECTIONS=[
 {id:'tasks',name:'Tasks',icon:CheckCircle,view:Tasks,panel:true},
 {id:'notes',name:'Notes',icon:NotePencil,view:Notes,panel:true},
 {id:'calendar',name:'Calendar',icon:CalendarBlank,view:Calendar,panel:true},
 {id:'saved',name:'Saved',icon:BookmarkSimple,view:Saved},
 {id:'pdfs',name:'PDFs',icon:FilePdf,view:Pdfs,panel:true},
 {id:'finance',name:'Finance',icon:Wallet,view:Finance,panel:true},
 {id:'jobs',name:'Job tracker',icon:Briefcase,view:Jobs},
 {id:'planner',name:'Planner',icon:CalendarCheck,view:Planner},
 {id:'focus',name:'Focus',icon:Timer,view:Focus},
 {id:'bills',name:'Bills',icon:Receipt,view:Bills},
 {id:'review',name:'Weekly review',icon:ChartLineUp,view:Review},
 {id:'reminders',name:'Repeaters',icon:Repeat,view:Reminders},
 {id:'canvas',name:'Canvas',icon:TreeStructure,view:Canvas}
];
// The sidebar shows a few places; each opens a row of related pages at the top, so nobody scrolls a long menu.
const GROUPS=[
 {id:'tasks',name:'Tasks',icon:CheckCircle,items:['tasks','planner','focus','reminders','review']},
 {id:'notes',name:'Notes',icon:NotePencil,items:['notes']},
 {id:'calendar',name:'Calendar',icon:CalendarBlank,items:['calendar']},
 {id:'saved',name:'Saved',icon:BookmarkSimple,items:['saved']},
 {id:'pdfs',name:'PDFs',icon:FilePdf,items:['pdfs']},
 {id:'finance',name:'Finance',icon:Wallet,items:['finance','bills']},
 {id:'canvas',name:'Canvas',icon:TreeStructure,items:['canvas']},
 {id:'jobs',name:'Job tracker',icon:Briefcase,items:['jobs']}
];
const groupOf=id=>GROUPS.find(g=>g.items.includes(id))||GROUPS[0];
const DEFAULT_ORDER=GROUPS.map(g=>g.id);
const ORDER_KEY='tnkr-ws-nav-order3';
const lastKey=g=>'tnkr-ws-last-'+g;
const initial=()=>{try{const s=localStorage.getItem('tnkr-ws-section');if(SECTIONS.some(x=>x.id===s))return s;}catch{}return 'tasks';};
// A saved order only lists what it knew about, so anything added later is appended at the end.
const arrange=saved=>{const known=saved.filter(id=>DEFAULT_ORDER.includes(id));return [...known,...DEFAULT_ORDER.filter(id=>!known.includes(id))];};
const loadOrder=()=>{try{const o=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]');return arrange(Array.isArray(o)?o:[]);}catch{return DEFAULT_ORDER;}};

export function Workspace(){
 const {focus:running,left:runLeft}=useFocus();
 const [settings,setSettings,settingsReady]=useCollection('settings');
 const [dark,setDark]=useState(()=>applyTheme()==='dark'||document.documentElement.dataset.theme==='dark'),[showSettings,setShowSettings]=useState(false);
 useEffect(()=>{applyTheme();return watchSystemTheme();},[]);
 useEffect(()=>{const t=setInterval(()=>setDark(document.documentElement.dataset.theme==='dark'),800);return()=>clearInterval(t);},[]);
 const flipTheme=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(next);setDark(next==='dark');};
 const prefs=useLivePrefs(settings);
 useLayoutEffect(()=>{applyPrefs(prefs);},[prefs]);
 useEffect(()=>{api.setZoom((SCALES[prefs.scale]||SCALES.default).zoom);},[prefs.scale]);
 const [replay,setReplay]=useState(false);
 const accept=version=>{setReplay(false);setSettings(l=>[{...(l[0]||{}),id:'settings',legalAccepted:(l[0]&&l[0].legalAccepted&&l[0].legalAccepted.version===version)?l[0].legalAccepted:{version,at:Date.now()},tour:TOUR_VERSION},...l.slice(1)]);};
 const needsTour=settingsReady&&settings[0]?.tour!==TOUR_VERSION,needsLegal=settingsReady&&settings[0]?.legalAccepted?.version!==LEGAL_VERSION;
 const needsOnboarding=needsTour||needsLegal;
 const [section,setSection]=useState(initial),[focusId,setFocusId]=useState(null),[searching,setSearching]=useState(false);
 // Ctrl+K (or Cmd+K) opens search from anywhere in the workspace.
 useEffect(()=>{
  const k=e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();setSearching(s=>!s);}};
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 },[]);
 // Lets one section jump to another with an item selected, e.g. Save later opening a PDF in the reader.
 const go=(id,item)=>{if(SECTIONS.some(x=>x.id===id)){setSection(id);setFocusId(item||null);}};
 useEffect(()=>api.onSection(v=>{const o=typeof v==='string'?{section:v}:v;go(o.section,o.itemId);}),[]);
 useEffect(()=>{try{localStorage.setItem('tnkr-ws-section',section);}catch{}},[section]);
 const startDone=useRef(false);
 useEffect(()=>{
  if(startDone.current||!settingsReady)return;
  startDone.current=true;
  const sp=prefs.startPage;
  const g=GROUPS.find(x=>x.id===sp);
  if(sp&&sp!=='last'&&g)setSection(g.items[0]);
 },[settingsReady]);
 // Clicking empty space, or pressing Escape, always clears a text selection.
 useEffect(()=>{
  const down=e=>{if(e.button===0&&!e.target.closest('input,textarea,select,button,a,[contenteditable],.textLayer span'))window.getSelection()?.removeAllRanges();};
  const key=e=>{if(e.key==='Escape'&&!e.target.closest?.('input,textarea,[contenteditable]'))window.getSelection()?.removeAllRanges();};
  document.addEventListener('mousedown',down);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('mousedown',down);document.removeEventListener('keydown',key);};
 },[]);
 // Sidebars can be tucked away; the choice is remembered. Ctrl+\ toggles the left menu, Ctrl+Shift+\ the side panel.
 const stored=k=>{try{return localStorage.getItem('tnkr-ws-'+k)==='1';}catch{return false;}};
 const [navClosed,setNavClosed]=useState(()=>stored('nav-closed')),[panelClosed,setPanelClosed]=useState(()=>stored('panel-closed'));
 useEffect(()=>{try{localStorage.setItem('tnkr-ws-nav-closed',navClosed?'1':'0');}catch{}},[navClosed]);
 useEffect(()=>{try{localStorage.setItem('tnkr-ws-panel-closed',panelClosed?'1':'0');}catch{}},[panelClosed]);
 useEffect(()=>{
  const k=e=>{
   if(!(e.ctrlKey||e.metaKey)||(e.key!=='\\'&&e.key!=='|'))return;
   e.preventDefault();
   if(e.shiftKey)setPanelClosed(v=>!v);else setNavClosed(v=>!v);
  };
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 },[]);

 // Rearranging the sidebar: drag an item (or Alt+Up / Alt+Down on it); the order is remembered.
 const [order,setOrder]=useState(loadOrder),[dragging,setDragging]=useState(null);
 const dragId=useRef(null),itemRefs=useRef({}),tops=useRef({});
 const persist=o=>{try{localStorage.setItem(ORDER_KEY,JSON.stringify(o));}catch{}};
 const move=(id,toIndex)=>setOrder(o=>{
  const from=o.indexOf(id);if(from<0||toIndex<0||toIndex>=o.length||toIndex===from)return o;
  const next=[...o];next.splice(from,1);next.splice(toIndex,0,id);return next;
 });
 // Glide items to their new places instead of snapping.
 useLayoutEffect(()=>{
  for(const id of order){
   const el=itemRefs.current[id];if(!el)continue;
   const top=el.getBoundingClientRect().top,prev=tops.current[id];
   if(prev!==undefined&&Math.abs(prev-top)>1)gsap.fromTo(el,{y:prev-top},{y:0,duration:.28,ease:'power3.out',clearProps:'transform'});
   tops.current[id]=top;
  }
 },[order]);
 const onDragStart=(e,id)=>{dragId.current=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);requestAnimationFrame(()=>setDragging(id));};
 const onDragOver=(e,id)=>{
  const from=dragId.current;
  if(!from)return;
  e.preventDefault();
  if(from===id)return;
  const r=e.currentTarget.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;
  setOrder(o=>{
   const without=o.filter(x=>x!==from),at=without.indexOf(id)+(after?1:0);
   const next=[...without.slice(0,at),from,...without.slice(at)];
   return next.join()===o.join()?o:next;
  });
 };
 const endDrag=()=>{if(dragId.current)setOrder(o=>{persist(o);return o;});dragId.current=null;setDragging(null);};
 const onNavKey=(e,id)=>{
  if(!e.altKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
  e.preventDefault();
  const i=order.indexOf(id),to=i+(e.key==='ArrowUp'?-1:1);
  move(id,to);
  setOrder(o=>{persist(o);return o;});
  requestAnimationFrame(()=>itemRefs.current[id]?.focus());
 };
 const customised=order.join()!==DEFAULT_ORDER.join();
 const reset=()=>{setOrder(DEFAULT_ORDER);try{localStorage.removeItem(ORDER_KEY);}catch{}};

 const meta=SECTIONS.find(s=>s.id===section),Current=meta.view,group=groupOf(section);
 useEffect(()=>{try{localStorage.setItem(lastKey(group.id),section);}catch{}},[section]);
 const openGroup=g=>{let t=g.items[0];try{const l=localStorage.getItem(lastKey(g.id));if(g.items.includes(l))t=l;}catch{}go(t);};
 return (
  <div className={'ws'+(navClosed?' nav-closed':'')+(panelClosed?' panel-closed':'')}>
   <nav className="ws-nav">
    <div className="brand"><Mascot size={36} follow className="brand-mascot"/></div>
    <button className="bar-btn nav-search" aria-label="Search everything (Ctrl K)" onClick={()=>setSearching(true)}><MagnifyingGlass size={18}/></button>
    <button className="bar-btn nav-toggle" aria-label="Hide sidebar" onClick={()=>setNavClosed(true)}><SidebarSimple size={18}/></button>
    <div className="nav-group" onDrop={e=>{e.preventDefault();endDrag();}}>
     {order.filter(id=>id==='tasks'||!prefs.hiddenPlaces.includes(id)).map(id=>{const s=GROUPS.find(x=>x.id===id),Icon=s.icon;return (
      <button key={id} ref={el=>{itemRefs.current[id]=el;}} draggable className={'nav-item'+(group.id===id?' on':'')+(dragging===id?' dragging':'')}
       onClick={()=>openGroup(s)} onDragStart={e=>onDragStart(e,id)} onDragOver={e=>onDragOver(e,id)} onDragEnd={endDrag} onKeyDown={e=>onNavKey(e,id)}>
       <Icon size={18} weight={group.id===id?'fill':'regular'}/>{s.name}{id==='tasks'&&running&&<em className="nav-timer">{running.paused?'paused':fmtClock(runLeft)}</em>}<DotsSixVertical className="grip" size={14} weight="bold"/>
      </button>
     );})}
     {customised&&<button className="nav-reset" onClick={reset}>Reset order</button>}
    </div>
    <div className="nav-foot"><button onClick={()=>setShowSettings(true)}><GearSix size={17}/>Settings</button><button className="only-icon" aria-label={dark?'Switch to light mode':'Switch to dark mode'} onClick={flipTheme}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div>
   </nav>
   <main className="ws-main"><div className="drag-strip"/>{group.items.length>1&&<div className="subnav-row"><div className="subnav">{group.items.map(i=>{const m=SECTIONS.find(x=>x.id===i);return <button key={i} className={section===i?'on':''} onClick={()=>go(i)}>{m.name}{i==='focus'&&running&&<em>{running.paused?'paused':fmtClock(runLeft)}</em>}</button>;})}</div></div>}
    <div className="bars">
     {navClosed&&<button className="bar-btn" aria-label="Show sidebar" onClick={()=>setNavClosed(false)}><SidebarSimple size={18} weight="fill"/></button>}
     {meta.panel&&<button className={'bar-btn'+(panelClosed?'':' on')} aria-label={panelClosed?'Show side panel':'Hide side panel'} onClick={()=>setPanelClosed(v=>!v)}><Columns size={18}/></button>}
    </div><Current key={section} focusId={focusId} go={go}/></main>
   <Tooltip/>
   {showSettings&&<Settings onClose={()=>setShowSettings(false)} onTour={()=>{setShowSettings(false);setReplay(true);}}/>}
   {(needsOnboarding||replay)&&<Onboarding replay={replay&&!needsOnboarding} legalOnly={needsLegal&&!needsTour} onAccept={accept}/>}
   {searching&&<SearchPalette onClose={()=>setSearching(false)} go={go}/>}
  </div>
 );
}
