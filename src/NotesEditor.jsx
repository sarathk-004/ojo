import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {ArrowLeft,TextB,TextItalic,TextH,ListBullets,X} from '@phosphor-icons/react';

// Stored notes contain only formatting, never scripts, images, styles or links.
export function cleanNotes(html){
 const doc=new DOMParser().parseFromString(typeof html==='string'?html:'','text/html');
 const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','H2','H3','UL','OL','LI','BLOCKQUOTE']);
 const walk=node=>{for(const child of [...node.children]){if(['SCRIPT','STYLE','IFRAME','OBJECT'].includes(child.tagName)){child.remove();continue;}walk(child);if(!allowed.has(child.tagName))child.replaceWith(...child.childNodes);else for(const a of [...child.attributes])child.removeAttribute(a.name);}};
 walk(doc.body);return doc.body.innerHTML;
}
export function NotesEditor({task,onChange,onBack}){
 const editor=useRef(null),selection=useRef(null);
 useLayoutEffect(()=>{selection.current=null;editor.current.innerHTML=cleanNotes(task.notes);},[task.id]);
 useEffect(()=>{const remember=()=>{const s=window.getSelection();if(s?.rangeCount&&editor.current?.contains(s.anchorNode)&&editor.current.contains(s.focusNode))selection.current=s.getRangeAt(0).cloneRange();};document.addEventListener('selectionchange',remember);return()=>document.removeEventListener('selectionchange',remember);},[]);
 const save=()=>onChange(cleanNotes(editor.current.innerHTML));
 const format=(command,value)=>{editor.current.focus({preventScroll:true});const s=window.getSelection();if(selection.current&&editor.current.contains(selection.current.commonAncestorContainer)){s.removeAllRanges();s.addRange(selection.current);}document.execCommand('styleWithCSS',false,false);document.execCommand(command,false,value);if(s.rangeCount)selection.current=s.getRangeAt(0).cloneRange();save();};
 return <>
  <div className="panel-title"><button className="icon back-btn" aria-label="Back to tasks" onClick={onBack}><ArrowLeft size={17}/></button><h2>Small notes</h2><span className="saved-label">Saved automatically</span><button type="button" className="icon close-popup" aria-label="Close" onClick={onBack}><X size={18}/></button></div>
  <div className="notes-task-title horizontal-scroll">{task.title}</div>
  <div className="format-toolbar" role="toolbar" aria-label="Note formatting">{[[TextB,'Bold','bold'],[TextItalic,'Italic','italic'],[TextH,'Heading','formatBlock','h2'],[ListBullets,'Bullet list','insertUnorderedList']].map(([Icon,label,command,value])=><button key={label} type="button" aria-label={label} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>format(command,value)}><Icon size={16}/></button>)}<button onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>format('formatBlock','p')}>Aa</button></div>
  <div ref={editor} className="notes-editor scroll-area" contentEditable suppressContentEditableWarning role="textbox" aria-label={`Notes for ${task.title}`} aria-multiline="true" data-placeholder="A thought, a link, a little context…" onInput={save} onPaste={e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));save();}}/>
 </>;
}
