import React,{useEffect,useMemo,useRef} from 'react';
import {TextB,TextItalic,TextH,ListBullets,ListNumbers} from '@phosphor-icons/react';
import {sanitizeNote,notePreview} from './richtext.mjs';

// The note that belongs to a task. Collapsed it is a short preview; opened (by clicking the task) it is a small rich editor.
export function TaskNote({task,open,onSave,onClose}){
 const ref=useRef(null);
 const html=useMemo(()=>sanitizeNote(task.notes),[task.notes]);
 useEffect(()=>{
  const el=ref.current;if(!open||!el)return;
  el.innerHTML=html;el.focus();
  const sel=window.getSelection(),r=document.createRange();r.selectNodeContents(el);r.collapse(false);sel.removeAllRanges();sel.addRange(r);
 // eslint-disable-next-line
 },[open]);
 const save=()=>{
  const el=ref.current;if(!el)return;
  const text=el.textContent.replace(/ /g,' ').trim();
  const clean=text?sanitizeNote(el.innerHTML):'';
  if(clean!==html)onSave(clean);
  onClose();
 };
 const fmt=(cmd,val)=>{ref.current?.focus();document.execCommand(cmd,false,val);};
 const tool=(Icon,label,run)=><button type="button" className="icon-btn tn-tool" aria-label={label} onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={15}/></button>;
 if(!open)return task.notes?<span className="muted task-note-preview">{notePreview(task.notes)}</span>:null;
 return (
  <div className="task-note-rich" onClick={e=>e.stopPropagation()}>
   <div className="tn-bar">
    {tool(TextB,'Bold',()=>fmt('bold'))}
    {tool(TextItalic,'Italic',()=>fmt('italic'))}
    {tool(TextH,'Heading',()=>fmt('formatBlock','h3'))}
    {tool(ListBullets,'Bulleted list',()=>fmt('insertUnorderedList'))}
    {tool(ListNumbers,'Numbered list',()=>fmt('insertOrderedList'))}
   </div>
   <div ref={ref} className="tn-body" contentEditable suppressContentEditableWarning data-placeholder="Write a note for this task…"
    onBlur={save} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.currentTarget.blur();}}}
    onPaste={e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));}}/>
  </div>
 );
}
