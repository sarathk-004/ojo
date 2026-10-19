import React,{useEffect,useRef,useState} from 'react';

// ojo's own hover hints: an icon-only button says what it is, with a short line on what it does.
const HELP={
 'edit':'Change the title, date, reminder or repeat.',
 'delete':'Remove it. You can undo straight after.',
 'delete task':'Remove this task. You can undo straight after.',
 'delete forever':'Gone for good. This cannot be undone.',
 'close':'Close this window.',
 'previous month':'Go back one month.','next month':'Go forward one month.',
 'previous week':'Go back one week.','next week':'Go forward one week.',
 'previous day':'Go back one day.','next day':'Go forward one day.',
 'list view':'Tasks as a simple list.','board view':'Tasks as a board: To do, In progress, Done.',
 'add task':'Add this to your list.',
 'zoom in':'Make the page larger.','zoom out':'Make the page smaller.',
 'show sidebar':'Bring the left menu back.','hide sidebar':'Give the page more room.',
 'search everything (ctrl k)':'Find notes, tasks, saved items, jobs and more.','search everything':'Find notes, tasks, saved items, jobs and more.',
 'new note':'Start a blank page.','new from template':'Start from meeting notes, a plan, a trip and more.',
 'add sub-page':'Put a page inside this one.',
 'rename':'Give it a new name.','rename folder':'Give this folder a new name.','delete folder':'Remove the folder. Items stay in Saved.',
 'move to folder':'File this under one of your folders.',
 'remind me':'Get a notification about this later.',
 'open in browser':'Open the original page in your browser.',
 'save a copy':'Save this file somewhere on your computer.',
 'copy':'Copy to the clipboard.','copy text':'Copy the text.','copy all as markdown':'Copy every highlight as Markdown.',
 'move to trash':'Keeps it for 30 days in case you change your mind.',
 'restore page':'Bring this page back from Trash.',
 'focus on this task':'Start a focus timer for this task.',
 'mark done':'Tick this off.','mark not done':'Put this back on the list.',
 'remove':'Take this away.','remove cover':'Take the cover off this page.','remove highlight':'Remove this highlight.',
 'change icon':'Choose an icon for this page.',
 'toggle sub-pages':'Show or hide the pages inside.',
 'take off the timeline':'Unschedule this task.',
 'cancel':'Close without saving.',
 'empty trash':'Delete everything in Trash for good.',
 'appearance':'Light, dark or match Windows.',
 'save as a note':'Turn these highlights into a note.',
 'add as a win':'Keep this as something you got done.',
 'delete session':'Remove this focus session from your log.',
 'delete event':'Remove this event.','not a bill':'Stop suggesting this as a bill.',
 'recently saved':'Your latest saves.','open a pdf':'Choose a PDF from your computer.',
};
const labelOf=el=>(el.getAttribute('data-tip-title')||el.getAttribute('aria-label')||'').trim();

export function Tooltip(){
 const [tip,setTip]=useState(null);
 const timer=useRef(null),current=useRef(null);
 useEffect(()=>{
  const clear=()=>{clearTimeout(timer.current);current.current=null;setTip(null);};
  const over=e=>{
   const el=e.target.closest?.('[aria-label],[data-tip]');
   if(!el||el===current.current)return;
   const isIconOnly=!(el.textContent||'').trim();
   if(!el.hasAttribute('data-tip')&&!(isIconOnly&&(el.tagName==='BUTTON'||el.getAttribute('role')==='button')))return;
   if(el.disabled)return;
   clear();current.current=el;
   timer.current=setTimeout(()=>{
    if(!el.isConnected)return;
    const r=el.getBoundingClientRect(),title=labelOf(el)||'',help=el.getAttribute('data-tip')||HELP[title.toLowerCase()]||'';
    if(!title&&!help)return;
    setTip({title,help,x:Math.round(r.left+r.width/2),top:Math.round(r.bottom+8),above:Math.round(r.top-8),flip:r.bottom+90>window.innerHeight});
   },420);
  };
  const out=e=>{if(current.current&&!current.current.contains(e.relatedTarget))clear();};
  document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);
  document.addEventListener('pointerdown',clear,true);document.addEventListener('scroll',clear,true);window.addEventListener('blur',clear);
  return()=>{clear();document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);document.removeEventListener('pointerdown',clear,true);document.removeEventListener('scroll',clear,true);window.removeEventListener('blur',clear);};
 },[]);
 if(!tip)return null;
 const left=Math.max(10,Math.min(tip.x,window.innerWidth-10));
 return <div className={'ojo-tip'+(tip.flip?' up':'')} role="tooltip" style={{left,top:tip.flip?undefined:tip.top,bottom:tip.flip?window.innerHeight-tip.above:undefined}}><b>{tip.title}</b>{tip.help&&<span>{tip.help}</span>}</div>;
}
