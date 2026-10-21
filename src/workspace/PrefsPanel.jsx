import React,{useEffect,useState} from 'react';
import {Check,Plus,Trash,ArrowUp,ArrowDown} from '@phosphor-icons/react';
import {useCollection,uid} from './hooks.js';
import {Select} from './Select.jsx';
import {api} from './api.js';
import {ACCENTS,SCALES,COLUMN_COLORS,CAPTURE_KEYS,DEFAULTS,DEFAULT_COLUMNS,columnsOf,useLivePrefs,publishPrefs} from './prefs.js';

const PLACES=[['notes','Notes'],['calendar','Calendar'],['saved','Saved'],['pdfs','PDFs'],['finance','Finance'],['canvas','Canvas'],['jobs','Job tracker']];
const LISTS=['Today','Daily','Upcoming','Anytime'];

function Seg({value,onChange,options,label}){
 return (
  <div className="pf-seg" role="radiogroup" aria-label={label}>
   {options.map(([v,t])=><button key={String(v)} role="radio" aria-checked={value===v} className={value===v?'on':''} onClick={()=>onChange(v)}>{t}</button>)}
  </div>
 );
}
const Row=({title,hint,children})=>(
 <div className="pf-row"><div className="pf-lab"><b>{title}</b>{hint&&<span>{hint}</span>}</div><div className="pf-ctl">{children}</div></div>
);
function Check2({on,onChange,children}){
 return <label className="pf-check"><input type="checkbox" checked={on} onChange={e=>onChange(e.target.checked)}/><span>{children}</span></label>;
}

// Everything a person can change about how ojo looks and behaves. Each change applies at once.
export function PrefsPanel(){
 const [settings,setSettings]=useCollection('settings');
 const p=useLivePrefs(settings);
 const set=change=>{publishPrefs({...p,...change});setSettings(l=>[{...(l[0]||{id:'settings'}),prefs:{...DEFAULTS,...((l[0]&&l[0].prefs)||{}),...change}},...l.slice(1)]);};
 const toggleIn=(key,v,on)=>set({[key]:on?[...p[key].filter(x=>x!==v),v]:p[key].filter(x=>x!==v)});
 const [fonts,setFonts]=useState([]);
 useEffect(()=>{let live=true;api.listFonts().then(l=>{if(live)setFonts(l||[]);});return()=>{live=false;};},[]);
 const cols=columnsOf(p);
 const setCols=next=>set({columns:next});
 const middleIds=cols.slice(1,-1).map(c=>c.id);
 const patchCol=(i,ch)=>setCols(cols.map((c,j)=>j===i?{...c,...ch}:c));
 const addCol=()=>{if(cols.length>=6)return;const n=[...cols];n.splice(cols.length-1,0,{id:'c'+uid().slice(0,6),name:'New column',color:'amber'});setCols(n);};
 const delCol=i=>{if(i===0||i===cols.length-1||cols.length<=2)return;setCols(cols.filter((_,j)=>j!==i));};
 const moveCol=(i,d)=>{const j=i+d;if(i<1||j<1||i>cols.length-2||j>cols.length-2)return;const n=[...cols];[n[i],n[j]]=[n[j],n[i]];setCols(n);};
 const layoutPick=v=>{set({layout:v});try{localStorage.setItem('tnkr-ws-tasks-layout',v);}catch{}};
 const reset=()=>{publishPrefs({...DEFAULTS});setSettings(l=>[{...(l[0]||{id:'settings'}),prefs:undefined},...l.slice(1)]);try{localStorage.removeItem('tnkr-ws-tasks-layout');}catch{}};
 const customised=JSON.stringify(p)!==JSON.stringify(DEFAULTS);

 return (
  <div className="pf">
   <section>
    <h4>Look</h4>
    <Row title="Accent colour" hint="Buttons, ticks and highlights.">
     <div className="pf-swatches" role="radiogroup" aria-label="Accent colour">
      {Object.entries(ACCENTS).map(([id,a])=>(
       <button key={id} role="radio" aria-checked={p.accent===id} aria-label={a.name} className={p.accent===id?'on':''} style={{'--sw':a.sage}} onClick={()=>set({accent:id})}>{p.accent===id&&<Check size={13} weight="bold"/>}</button>
      ))}
     </div>
    </Row>
    <Row title="Text size" hint="Scales the whole window."><Seg label="Text size" value={p.scale} onChange={v=>set({scale:v})} options={Object.entries(SCALES).map(([k,s])=>[k,s.name])}/></Row>
    <Row title="Spacing"><Seg label="Spacing" value={p.density} onChange={v=>set({density:v})} options={[['compact','Compact'],['comfortable','Comfortable'],['roomy','Roomy']]}/></Row>
    <Row title="Note width" hint="How wide a page of writing runs."><Seg label="Note width" value={p.noteWidth} onChange={v=>set({noteWidth:v})} options={[['narrow','Narrow'],['standard','Standard'],['wide','Wide'],['full','Full']]}/></Row>
   </section>

   <section>
    <h4>Sidebar and start</h4>
    <Row title="Places to show" hint="Tasks is always there.">
     <div className="pf-checks">{PLACES.map(([id,name])=><Check2 key={id} on={!p.hiddenPlaces.includes(id)} onChange={on=>toggleIn('hiddenPlaces',id,!on)}>{name}</Check2>)}</div>
    </Row>
    <Row title="Open on" hint="Where ojo starts each time.">
     <Select compact label="Start page" value={p.startPage} onChange={v=>set({startPage:v})} options={[{value:'last',label:'Where I left off'},{value:'tasks',label:'Tasks'},{value:'notes',label:'Notes'},{value:'calendar',label:'Calendar'},{value:'saved',label:'Saved'},{value:'finance',label:'Finance'},{value:'jobs',label:'Job tracker'}]}/>
    </Row>
   </section>

   <section>
    <h4>Tasks</h4>
    <Row title="Lists to show"><div className="pf-checks">{LISTS.map(l=><Check2 key={l} on={!p.hiddenLists.includes(l)} onChange={on=>{if(!on&&LISTS.filter(x=>!p.hiddenLists.includes(x)).length<=1)return;toggleIn('hiddenLists',l,!on);}}>{l}</Check2>)}</div></Row>
    <Row title="Default view"><Seg label="Default view" value={p.layout} onChange={layoutPick} options={[['list','List'],['board','Board']]}/></Row>
    <Row title="Board columns" hint="First holds open tasks, last holds finished ones.">
     <div className="pf-cols">
      {cols.map((c,i)=>{const fixed=i===0||i===cols.length-1;return (
       <div className="pf-col" key={c.id}>
        <input value={c.name} maxLength={24} aria-label="Column name" onChange={e=>patchCol(i,{name:e.target.value})} onBlur={e=>{if(!e.target.value.trim())patchCol(i,{name:DEFAULT_COLUMNS[Math.min(i,2)].name});}}/>
        <span className="pf-dots">{Object.entries(COLUMN_COLORS).map(([k,hex])=><button key={k} aria-label={k} className={c.color===k?'on':''} style={{background:hex}} onClick={()=>patchCol(i,{color:k})}/>)}</span>
        <span className="pf-col-acts">
         <button className="icon-btn" aria-label="Move up" disabled={fixed||i<=1} onClick={()=>moveCol(i,-1)}><ArrowUp size={13}/></button>
         <button className="icon-btn" aria-label="Move down" disabled={fixed||i>=cols.length-2} onClick={()=>moveCol(i,1)}><ArrowDown size={13}/></button>
         <button className="icon-btn danger" aria-label="Remove column" disabled={fixed||cols.length<=2} onClick={()=>delCol(i)}><Trash size={13}/></button>
        </span>
       </div>
      );})}
      <button className="link-btn" disabled={cols.length>=6} onClick={addCol}><Plus size={13}/>Add a column</button>
     </div>
    </Row>
   </section>

   <section>
    <h4>Notes</h4>
    <Row title="Writing font" hint="Any font installed on this computer."><Select compact label="Writing font" value={p.noteFont} onChange={v=>set({noteFont:v})} options={[{value:'',label:'ojo default (Geist)'},...fonts.map(f=>({value:f,label:f})),...(p.noteFont&&!fonts.includes(p.noteFont)?[{value:p.noteFont,label:p.noteFont}]:[])]}/></Row>
    <Row title="Sticky headings" hint="The current heading stays at the top while you scroll."><Check2 on={p.stickyHeadings} onChange={v=>set({stickyHeadings:v})}>Keep headings in view</Check2></Row>
   </section>

   <section>
    <h4>Code in notes</h4>
    <Row title="Theme"><Seg label="Code theme" value={p.codeTheme} onChange={v=>set({codeTheme:v})} options={[['dark','Dark'],['light','Light']]}/></Row>
    <Row title="Font size"><Select compact label="Code font size" value={p.codeSize} onChange={v=>set({codeSize:Number(v)})} options={[12,13,14,15,16].map(n=>({value:n,label:n+' px'}))}/></Row>
    <Row title="Tab width"><Seg label="Tab width" value={p.tabWidth} onChange={v=>set({tabWidth:v})} options={[[2,'2 spaces'],[4,'4 spaces']]}/></Row>
    <Row title="Line numbers"><Check2 on={p.lineNumbers} onChange={v=>set({lineNumbers:v})}>Show them</Check2></Row>
   </section>

   <section>
    <h4>Dates</h4>
    <Row title="Week starts on"><Seg label="Week starts on" value={p.weekStart} onChange={v=>set({weekStart:v})} options={[[1,'Monday'],[0,'Sunday']]}/></Row>
    <Row title="Date style"><Seg label="Date style" value={p.dateFormat} onChange={v=>set({dateFormat:v})} options={[['dmy','19 Oct'],['mdy','Oct 19']]}/></Row>
   </section>

   <section>
    <h4>Reminders and shortcuts</h4>
    <Row title="Sounds" hint="A short beep with reminders and when a focus session ends."><Check2 on={p.sound} onChange={v=>set({sound:v})}>Play sounds</Check2></Row>
    <Row title="Snooze for"><Select compact label="Snooze length" value={p.snooze} onChange={v=>set({snooze:Number(v)})} options={[5,10,15,30,60].map(n=>({value:n,label:n+' minutes'}))}/></Row>
    <Row title="Quick capture shortcut" hint="Opens the small box from anywhere."><Select compact label="Quick capture shortcut" value={p.captureKey} onChange={v=>set({captureKey:v})} options={CAPTURE_KEYS.map(k=>({value:k.value,label:k.label}))}/></Row>
   </section>

   <div className="pf-foot"><button className="ghost" disabled={!customised} onClick={reset}>Reset all to defaults</button></div>
  </div>
 );
}
