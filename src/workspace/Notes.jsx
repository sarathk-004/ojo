import React,{useLayoutEffect,useEffect,useMemo,useRef,useState} from 'react';
import {dateLocale} from './prefs.js';
import {ArrowBendDownRight,Plus,MagnifyingGlass,PushPin,Trash,TextB,TextItalic,TextUnderline,TextStrikethrough,ListBullets,ListNumbers,CheckSquare,Quotes,Code,LinkSimple,Minus,NotePencil,CaretRight,TextT,TextHOne,TextHTwo,TextHThree,FileText,Lightbulb,CalendarBlank,Table,Kanban,ImageSquare,CaretCircleRight,FolderSimple,FolderSimplePlus,ArrowUp,ArrowDown,PencilSimple,DownloadSimple} from '@phosphor-icons/react';
import {readNoteFile} from './importDoc.js';
import {PickMenu} from './SavedFolders.jsx';
import {BlockTools,normalise} from './BlockTools.jsx';
import {gsap} from 'gsap';
import {Glyph} from './icons.jsx';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin';
import {useCollection,uid} from './hooks.js';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';
import {api} from './api.js';
import {Select} from './Select.jsx';
import {NoteHead} from './NoteHead.jsx';
import {ShelfTabs,modeCounts,expired,daysLeft} from './shelf.jsx';
import {Star,ArrowCounterClockwise,SquaresFour,UploadSimple,FileMd,FilePdf,Copy,Check as CheckIcon} from '@phosphor-icons/react';
import {TEMPLATES,getTemplate} from './templates.mjs';
import {htmlToMarkdown,fileNameFor} from './noteExport.mjs';
import {LANGS,guessLang} from './classify.mjs';
import {langName} from './highlight.js';
import {useUndo} from './Undo.jsx';
import {buildCodeBlock,hydrateCode,serializeCode,refreshCode} from './codeblock.js';
import {LangPicker} from './LangPicker.jsx';

gsap.registerPlugin(ScrollToPlugin);
const blobCache=new Map();
const caretTo=el=>{const r=document.createRange();r.selectNodeContents(el);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);};

// Block builders for the slash menu. Everything is plain HTML so it saves with the page.
const TABLE_HTML=()=>'<table class="nb-table"><tbody>'+[0,1,2].map(r=>'<tr>'+[0,1,2].map(()=>(r?'<td><br></td>':'<th><br></th>')).join('')+'</tr>').join('')+'</tbody></table><p><br></p>';
const kbCard=(t='')=>`<div class="kb-card"><span class="kb-grip" draggable="true" contenteditable="false">⋮⋮</span><span class="kb-text" contenteditable="true">${t||'<br>'}</span><button type="button" class="kb-x" contenteditable="false">×</button></div>`;
const kbCol=(title,cards=[])=>`<div class="kb-col"><div class="kb-head"><span class="kb-title" contenteditable="true">${title}</span><button type="button" class="kb-colx" contenteditable="false">×</button></div><div class="kb-cards">${cards.map(kbCard).join('')}</div><button type="button" class="kb-add" contenteditable="false">+ Add card</button></div>`;
const KANBAN_HTML=()=>`<div class="kanban" contenteditable="false"><div class="kb-top"><span class="kb-name" contenteditable="true">Board</span><button type="button" class="kb-del">Delete board</button></div><div class="kb-cols">${kbCol('To do',['Write the first card'])}${kbCol('Doing')}${kbCol('Done')}</div><button type="button" class="kb-addcol">+ Column</button></div><p><br></p>`;
const TOGGLE_HTML='<details class="toggle" open><summary>Toggle</summary><p><br></p></details><p><br></p>';

// Plain text of a page for search and the sidebar snippet: no board buttons, with blocks kept apart.
const plain=html=>{
 const d=document.createElement('div');d.innerHTML=html;
 d.querySelectorAll('button,.kb-grip').forEach(e=>e.remove());
 d.querySelectorAll('p,div,h1,h2,h3,li,tr,th,td,br,summary,.kb-col').forEach(e=>e.append(' '));
 return (d.textContent||'').replace(/\s+/g,' ').trim();
};
const words=t=>t?t.split(' ').filter(Boolean).length:0;
const ago=ts=>{
 const s=(Date.now()-ts)/1000;
 if(s<60)return 'just now';
 if(s<3600)return Math.floor(s/60)+'m ago';
 if(s<86400)return Math.floor(s/3600)+'h ago';
 return new Date(ts).toLocaleDateString(dateLocale(),{day:'numeric',month:'short'});
};
const run=(cmd,val)=>document.execCommand(cmd,false,val);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Slash-menu commands, in Notion's order.
const COMMANDS=[
 {id:'text',name:'Text',hint:'Plain paragraph',icon:TextT,keys:'paragraph plain p'},
 {id:'h1',name:'Heading 1',hint:'Big section heading',icon:TextHOne,keys:'h1 heading title #'},
 {id:'h2',name:'Heading 2',hint:'Medium heading',icon:TextHTwo,keys:'h2 heading ##'},
 {id:'h3',name:'Heading 3',hint:'Small heading',icon:TextHThree,keys:'h3 heading ###'},
 {id:'page',name:'Page',hint:'A new page inside this page',icon:FileText,keys:'page subpage new child'},
 {id:'todo',name:'To-do list',hint:'Track tasks with checkboxes',icon:CheckSquare,keys:'todo task checkbox check []'},
 {id:'bullet',name:'Bulleted list',hint:'A simple list',icon:ListBullets,keys:'bullet list unordered ul -'},
 {id:'number',name:'Numbered list',hint:'A list with numbering',icon:ListNumbers,keys:'number ordered list ol 1.'},
 {id:'quote',name:'Quote',hint:'Capture a quote',icon:Quotes,keys:'quote blockquote >'},
 {id:'callout',name:'Callout',hint:'Make writing stand out',icon:Lightbulb,keys:'callout note tip info'},
 {id:'code',name:'Code',hint:'A block of code',icon:Code,keys:'code snippet pre block'},
 {id:'table',name:'Table',hint:'Rows and columns',icon:Table,keys:'table grid rows columns spreadsheet'},
 {id:'board',name:'Kanban board',hint:'Columns of draggable cards',icon:Kanban,keys:'kanban board columns cards trello tasks'},
 {id:'image',name:'Image',hint:'Upload or paste a picture',icon:ImageSquare,keys:'image picture photo upload img'},
 {id:'link',name:'Link',hint:'Add a web link',icon:LinkSimple,keys:'link url web href'},
 {id:'toggle',name:'Toggle list',hint:'Content you can fold away',icon:CaretCircleRight,keys:'toggle collapse fold details accordion'},
 {id:'cols2',name:'2 columns',hint:'Two blocks side by side',icon:SquaresFour,keys:'columns side by side two 2 layout'},
 {id:'cols3',name:'3 columns',hint:'Three blocks side by side',icon:SquaresFour,keys:'columns side by side three 3 layout'},
 {id:'divider',name:'Divider',hint:'Visually divide blocks',icon:Minus,keys:'divider line hr rule ---'},
 {id:'date',name:'Today’s date',hint:'Insert the date',icon:CalendarBlank,keys:'date today now'}
];

export function Notes({focusId}){
 const [notes,setNotes,ready]=useCollection('notes'),[nfolders,setNfolders]=useCollection('notefolders'),[nfMenu,setNfMenu]=useState(null),[renamingF,setRenamingF]=useState(null);
 const [activeId,setActiveId]=useState(null),[query,setQuery]=useState(''),[confirm,setConfirm]=useState(false),[link,setLink]=useState(null),[linkErr,setLinkErr]=useState(false),[linkPop,setLinkPop]=useState(null),[collapsed,setCollapsed]=useState(()=>new Set());
 const [slash,setSlash]=useState(null),[rowConfirm,setRowConfirm]=useState(null),[mode,setModeRaw]=useState('all'),[menu,setMenu]=useState(null),[exported,setExported]=useState('');
 // Pop-over menus (templates, export) close on any outside click.
 useEffect(()=>{
  if(!menu)return;
  const off=e=>{if(!e.target.closest?.('.pop,.pop-anchor'))setMenu(null);};
  window.addEventListener('mousedown',off);return()=>window.removeEventListener('mousedown',off);
 },[menu]);
 const [outline,setOutline]=useState([]),[activeHead,setActiveHead]=useState(0),[tableBar,setTableBar]=useState(null),[codeBar,setCodeBar]=useState(null),[blockBar,setBlockBar]=useState(null),blockEl=useRef(null);
 const codePre=useRef(null),saveRef=useRef(null),undoNote=useUndo(),lastRemoved=useRef(null);
 // Before a block is removed, keep the page as it was so Undo (or Ctrl+Z) can bring it back.
 const rememberPage=label=>{
  const html=serialize();lastRemoved.current={html,at:Date.now()};
  undoNote.show(label,restorePageHtml);
 };
 const restorePageHtml=()=>{
  const r=lastRemoved.current;if(!r||!editor.current)return;
  editor.current.innerHTML=r.html;hydrateCode(editor.current,codeHooks);hydrateImages();lastRemoved.current=null;saveRef.current&&saveRef.current();
 };
 const fileInput=useRef(null),dragCard=useRef(null);
 const editor=useRef(null),loadedId=useRef(null),range=useRef(null),slashRef=useRef(null);
 slashRef.current=slash;
 const byId=useMemo(()=>new Map(notes.map(n=>[n.id,n])),[notes]);

 // Flatten the page tree for the sidebar (or a flat result list while searching).
 const tabCounts=useMemo(()=>modeCounts(notes),[notes]);
 const rows=useMemo(()=>{
  const q=query.trim().toLowerCase();
  const match=n=>!q||(n.title||'').toLowerCase().includes(q)||(n.text||'').toLowerCase().includes(q);
  const liveIds=new Set(notes.filter(n=>!n.deleted).map(n=>n.id));
  // Trash lists only the pages that were deleted themselves; their sub-pages travel with them.
  if(mode==='trash')return notes.filter(n=>n.deleted&&!(n.parent&&byId.get(n.parent)?.deleted===n.deleted)&&match(n)).sort((a,b)=>b.deleted-a.deleted).map(n=>({n,depth:0,kids:0}));
  if(mode==='fav')return notes.filter(n=>!n.deleted&&n.favorite&&match(n)).sort((a,b)=>b.updated-a.updated).map(n=>({n,depth:0,kids:0}));
  if(q)return notes.filter(n=>!n.deleted&&match(n)).sort((a,b)=>b.updated-a.updated).map(n=>({n,depth:0,kids:0}));
  const kids=new Map();
  notes.filter(n=>!n.deleted).forEach(n=>{const p=n.parent&&liveIds.has(n.parent)?n.parent:'';(kids.get(p)||kids.set(p,[]).get(p)).push(n);});
  const out=[],walk=(parent,depth)=>{
   const list=[...(kids.get(parent)||[])].sort(depth?(a,b)=>a.created-b.created:(a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.updated-a.updated);
   for(const n of list){
    const count=(kids.get(n.id)||[]).length;
    out.push({n,depth,kids:count});
    if(count&&!collapsed.has(n.id))walk(n.id,depth+1);
   }
  };
  if(!nfolders.length){walk('',0);return out;}
  // With folders, top-level pages sit under their folder, in the folder order the user chose.
  const tops=[...(kids.get('')||[])].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.updated-a.updated);
  const place=(list,depthStart)=>{for(const n of list){const count=(kids.get(n.id)||[]).length;out.push({n,depth:0,kids:count});if(count&&!collapsed.has(n.id))walk(n.id,1);}};
  const known=new Set(nfolders.map(f=>f.id));
  const loose=tops.filter(n=>!n.folder||!known.has(n.folder));
  if(loose.length)out.push({head:{id:'',name:'Pages'},count:loose.length});
  if(!collapsed.has('f:')||false)place(loose);
  for(const f of nfolders){
   const mine=tops.filter(n=>n.folder===f.id);
   out.push({head:f,count:mine.length});
   if(!collapsed.has('f:'+f.id))place(mine);
  }
  return out;
 },[notes,query,collapsed,byId,mode,nfolders]);
 const active=byId.get(activeId)||null;
 const setMode=m=>{if(active&&!active.deleted)save();setModeRaw(m);setActiveId(null);loadedId.current=null;};
 const crumbs=useMemo(()=>{const c=[];let n=active;while(n&&n.parent&&byId.has(n.parent)){n=byId.get(n.parent);c.unshift(n);}return c;},[active,byId]);

 useEffect(()=>{if(focusId&&byId.has(focusId))setActiveId(focusId);},[focusId]);
 useEffect(()=>{const first=rows.find(r=>r.n);if(ready&&!activeId&&first)setActiveId(first.n.id);},[ready,rows,activeId]);

 // Keep page-link chips in the open note labelled with their page's current title.
 const refreshLinks=()=>{
  editor.current?.querySelectorAll('.page-link').forEach(a=>{
   const t=byId.get(a.dataset.page);
   const label=t&&!t.deleted?(t.title||'Untitled'):'Deleted page';
   if(a.textContent!==label)a.textContent=label;
   a.classList.toggle('gone',!t||!!t.deleted);
  });
 };
 useEffect(()=>{
  // Load the note body into the editor only when the note changes, so typing never resets the caret.
  if(!editor.current)return;
  if(!active){loadedId.current=null;return;}
  if(loadedId.current!==active.id){editor.current.innerHTML=active.html||'';loadedId.current=active.id;hydrateCode(editor.current,codeHooks);setConfirm(false);setLink(null);setSlash(null);setTableBar(null);hydrateImages();readOutline();if(editor.current)editor.current.scrollTop=0;}
  refreshLinks();
 },[active,byId]);

 const patch=(id,change)=>setNotes(list=>list.map(n=>n.id===id?{...n,...change}:n));
 // Bring in a Word document, Markdown, text or HTML file as a new page.
 const importInput=useRef(null),[importMsg,setImportMsg]=useState('');
 const importFiles=async files=>{
  for(const f of [...files||[]]){
   try{
    const r=await readNoteFile(f);
    const n={id:uid(),title:r.title,html:r.html,text:plain(r.html),pinned:false,parent:null,created:Date.now(),updated:Date.now()};
    setNotes(list=>[n,...list]);setModeRaw('all');setActiveId(n.id);setQuery('');loadedId.current=null;
    setImportMsg('Imported “'+r.title+'”.');
   }catch(e){setImportMsg(String(e&&e.message||'That file could not be imported.'));}
  }
  setTimeout(()=>setImportMsg(''),6000);
 };
 const create=(parent=null)=>{
  // Pressing + again on a page that is still blank just goes back to it instead of piling up empty pages.
  const blank=!parent&&byId&&active&&!active.title&&!(active.text||'').trim()&&!active.parent;
  if(blank){setQuery('');setTimeout(()=>document.querySelector('.note-title')?.focus(),30);return active;}
  const n={id:uid(),title:'',html:'',text:'',pinned:false,parent,created:Date.now(),updated:Date.now()};
  setNotes(list=>[n,...list]);setActiveId(n.id);setQuery('');
  if(parent)setCollapsed(s=>{const x=new Set(s);x.delete(parent);return x;});
  setTimeout(()=>document.querySelector('.note-title')?.focus(),30);
  return n;
 };
 const createFrom=id=>{
  const t=getTemplate(id);if(!t)return;
  const html=t.html(new Date()),n={id:uid(),title:t.title(new Date()),html,text:plain(html),pinned:false,parent:null,created:Date.now(),updated:Date.now()};
  setNotes(list=>[n,...list]);setModeRaw('all');setActiveId(n.id);setQuery('');setMenu(null);
  setTimeout(()=>editor.current?.focus(),60);
 };
 // Images are stored as files; their temporary blob addresses are never saved with the page.
 const serialize=()=>{
  const c=editor.current.cloneNode(true);
  c.querySelectorAll('img[data-file]').forEach(i=>i.removeAttribute('src'));
  serializeCode(editor.current,c);
  c.querySelectorAll('.blk-sel').forEach(e=>{e.classList.remove('blk-sel');if(!e.getAttribute('class'))e.removeAttribute('class');});
  return c.innerHTML;
 };
 const hydrateImages=()=>{
  editor.current?.querySelectorAll('img[data-file]:not([src])').forEach(img=>{
   const id=img.dataset.file;
   if(blobCache.has(id)){img.src=blobCache.get(id);return;}
   api.getFile(id).then(buf=>{if(!buf)return;const u=URL.createObjectURL(new Blob([buf]));blobCache.set(id,u);img.src=u;});
  });
 };
 // The page's headings, for the navigator on the right edge.
 const readOutline=()=>{
  const heads=[...(editor.current?.querySelectorAll('h1,h2,h3')||[])].map(h=>({level:+h.tagName[1],text:h.textContent.trim()||'Untitled heading'}));
  setOutline(o=>JSON.stringify(o)===JSON.stringify(heads)?o:heads);
 };
 const save=()=>{
  if(!active||!editor.current)return;
  if(editor.current.querySelector('pre'))hydrateCode(editor.current,codeHooks);
  const html=serialize(),text=plain(html);
  patch(active.id,{html,text,updated:Date.now()});
  readOutline();
 };
 saveRef.current=save;
 // Deleting a page also removes the pages inside it.
 const subtree=(id,pick=n=>!n.deleted)=>{
  const set=new Set([id]);
  for(let grew=true;grew;){grew=false;for(const n of notes)if(n.parent&&set.has(n.parent)&&!set.has(n.id)&&pick(n)){set.add(n.id);grew=true;}}
  return set;
 };
 const deletePage=id=>{
  const doomed=subtree(id),ts=Date.now();
  const next=rows.find(r=>!doomed.has(r.n.id));
  setNotes(list=>list.map(n=>doomed.has(n.id)?{...n,deleted:ts}:n));
  if(doomed.has(activeId)){setActiveId(next?.n.id||null);loadedId.current=null;}
  setConfirm(false);setRowConfirm(null);
 };
 // Restoring brings back the page and everything that was deleted with it.
 const restorePage=id=>{
  const root=byId.get(id);if(!root)return;
  const back=subtree(id,n=>n.deleted===root.deleted);
  setNotes(list=>list.map(n=>back.has(n.id)?{...n,deleted:undefined,parent:n.id===id&&n.parent&&byId.get(n.parent)?.deleted?null:n.parent}:n));
  if(activeId===id){setActiveId(null);loadedId.current=null;}
 };
 const bulk=useBulk();
 useEffect(()=>{bulk.clear();},[mode,query]);
 // Several pages at once: to Trash (with their sub-pages), and in Trash, back out or gone for good.
 const bulkTrash=ids=>{
  const doomed=new Set();ids.forEach(id=>subtree(id).forEach(x=>doomed.add(x)));const ts=Date.now();
  setNotes(list=>list.map(n=>doomed.has(n.id)?{...n,deleted:ts}:n));
  if(doomed.has(activeId)){setActiveId(null);loadedId.current=null;}bulk.stop();
 };
 const bulkRestore=ids=>{ids.forEach(restorePage);bulk.stop();};
 const bulkPurge=ids=>{ids.forEach(purgePage);bulk.stop();};
 const purgePage=id=>{
  const root=byId.get(id);if(!root)return;
  const gone=subtree(id,n=>n.deleted===root.deleted);
  setNotes(list=>list.filter(n=>!gone.has(n.id)));
  if(gone.has(activeId)){setActiveId(null);loadedId.current=null;}
 };
 const emptyTrash=()=>{setNotes(list=>list.filter(n=>!n.deleted));setActiveId(null);loadedId.current=null;};
 useEffect(()=>{if(notes.some(n=>expired(n)))setNotes(list=>list.filter(n=>!expired(n)));},[notes.length]);
 const remove=()=>{
  if(!confirm){setConfirm(true);setTimeout(()=>setConfirm(false),2500);return;}
  deletePage(active.id);
 };
 const askDelete=id=>{
  if(rowConfirm===id){deletePage(id);return;}
  setRowConfirm(id);setTimeout(()=>setRowConfirm(c=>c===id?null:c),2500);
 };
 // Export: Markdown file, copy as Markdown, or a PDF (images are embedded so the file stands alone).
 const markdown=()=>'# '+(active.title||'Untitled')+'\n\n'+htmlToMarkdown(serialize());
 const flash=k=>{setExported(k);setMenu(null);setTimeout(()=>setExported(''),1600);};
 const exportMd=()=>{
  save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown'}));a.download=fileNameFor(active.title,'md');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);flash('md');
 };
 const copyMd=async()=>{save();try{await navigator.clipboard.writeText(markdown());flash('copy');}catch{setMenu(null);}};
 const exportPdf=async()=>{
  save();setMenu(null);
  const c=editor.current.cloneNode(true);
  c.querySelectorAll('button,.kb-grip').forEach(e=>e.remove());
  for(const img of c.querySelectorAll('img')){
   const src=img.getAttribute('src')||'';
   if(src.startsWith('blob:')){try{const b=await (await fetch(src)).blob();img.src=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});}catch{img.remove();}}
  }
  const res=await api.exportPdf({title:active.title||'Untitled',html:c.innerHTML});
  if(res&&res.ok)flash('pdf');
 };
 // Enter (or the down arrow) in the title moves on to the page itself.
 const onTitleKey=e=>{
  if(e.nativeEvent.isComposing)return;
  if(e.key==='Enter'||(e.key==='ArrowDown'&&!e.shiftKey)){
   e.preventDefault();
   const ed=editor.current;if(!ed)return;
   ed.focus();
   const first=ed.firstElementChild;
   // Start of the first block; an empty page gets a plain paragraph to type into.
   if(!first){ed.innerHTML='<p><br></p>';caretTo(ed.firstElementChild);}
   else caretTo(first.querySelector?.('li,.kb-text')||first);
  }
 };
 const fmt=(cmd,val)=>{editor.current.focus();run(cmd,val);save();};
 const checklist=()=>{
  editor.current.focus();
  run('insertUnorderedList');
  const sel=window.getSelection();
  let el=sel.anchorNode;
  while(el&&el!==editor.current&&el.nodeName!=='UL')el=el.parentNode;
  if(el&&el.nodeName==='UL')el.classList.toggle('todo');
 };
 const subpage=()=>{
  // Link the new page into this one, then open it.
  const parent=active.id,child={id:uid(),title:'',html:'',text:'',pinned:false,parent,created:Date.now(),updated:Date.now()};
  run('insertHTML',`<a class="page-link" data-page="${child.id}" contenteditable="false">Untitled</a>&nbsp;`);
  const html=serialize();
  setNotes(list=>[child,...list.map(n=>n.id===parent?{...n,html,text:plain(html),updated:Date.now()}:n)]);
  setActiveId(child.id);
  setTimeout(()=>document.querySelector('.note-title')?.focus(),30);
 };
 // Kanban boards: buttons add, remove and reorder cards and columns.
 const boardClick=(e,kb)=>{
  const btn=e.target.closest('button');if(!btn)return;
  const cls=btn.classList;
  if(cls.contains('kb-add')){const holder=btn.closest('.kb-col').querySelector('.kb-cards');holder.insertAdjacentHTML('beforeend',kbCard());caretTo(holder.lastElementChild.querySelector('.kb-text'));}
  else if(cls.contains('kb-x'))btn.closest('.kb-card').remove();
  else if(cls.contains('kb-colx'))btn.closest('.kb-col').remove();
  else if(cls.contains('kb-addcol')){kb.querySelector('.kb-cols').insertAdjacentHTML('beforeend',kbCol('New column'));}
  else if(cls.contains('kb-del'))kb.remove();
  else return;
  save();
 };
 const onEditorClick=e=>{
  const kb=e.target.closest?.('.kanban');
  if(kb){boardClick(e,kb);return;}
  const pg=e.target.closest?.('.page-link');
  if(pg){e.preventDefault();if(byId.has(pg.dataset.page)){save();setActiveId(pg.dataset.page);}return;}
  // Links open in the browser with Ctrl+click; a plain click just places the caret so the text stays editable.
  const a=e.target.closest?.('a[href]');
  if(a&&(e.ctrlKey||e.metaKey)){e.preventDefault();api.openExternal(a.href);return;}
  // A plain click on a link shows what it points to, with Open, Copy and Remove.
  if(a){const r=a.getBoundingClientRect();setLinkPop({href:a.href,x:Math.round(Math.min(r.left,window.innerWidth-300)),y:Math.round(r.bottom+8),el:a});return;}
  setLinkPop(null);
  const li=e.target.closest?.('ul.todo > li');
  if(li&&e.clientX<li.getBoundingClientRect().left+4){li.toggleAttribute('data-done');save();}
 };
 const insertImages=async files=>{
  const imgs=[...files].filter(f=>f.type.startsWith('image/'));
  if(!imgs.length)return;
  editor.current.focus();
  const sel=window.getSelection();
  if(range.current){sel.removeAllRanges();sel.addRange(range.current);}
  for(const f of imgs){
   const id=await api.putFile(await f.arrayBuffer());
   const url=URL.createObjectURL(f);blobCache.set(id,url);
   run('insertHTML',`<img data-file="${id}" src="${url}" alt=""><p><br></p>`);
  }
  save();
 };
 const onPaste=e=>{
  e.preventDefault();
  const files=[...(e.clipboardData.files||[])];
  if(files.some(f=>f.type.startsWith('image/'))){
   const sel=window.getSelection();range.current=sel.rangeCount?sel.getRangeAt(0).cloneRange():null;
   insertImages(files);return;
  }
  run('insertText',e.clipboardData.getData('text/plain'));
  save();
 };
 const onDragStart=e=>{
  const grip=e.target.closest?.('.kb-grip');if(!grip)return;
  const card=grip.closest('.kb-card');dragCard.current=card;
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','kanban-card');
  requestAnimationFrame(()=>card.classList.add('dragging'));
 };
 const onDragOver=e=>{
  if(dragCard.current){
   const col=e.target.closest?.('.kb-col');if(!col)return;
   e.preventDefault();
   const holder=col.querySelector('.kb-cards');
   const after=[...holder.querySelectorAll('.kb-card:not(.dragging)')].find(c=>{const r=c.getBoundingClientRect();return e.clientY<r.top+r.height/2;});
   if(after)holder.insertBefore(dragCard.current,after);else holder.appendChild(dragCard.current);
  }else if([...(e.dataTransfer?.types||[])].includes('Files'))e.preventDefault();
 };
 const endDrag=()=>{if(!dragCard.current)return;dragCard.current.classList.remove('dragging');dragCard.current=null;save();};
 const onDrop=e=>{
  if(dragCard.current){e.preventDefault();endDrag();return;}
  const files=[...(e.dataTransfer?.files||[])];
  if(files.some(f=>f.type.startsWith('image/'))){
   e.preventDefault();
   const r=document.caretRangeFromPoint?.(e.clientX,e.clientY);
   range.current=r||null;insertImages(files);
  }
 };


 // Code blocks are small editors (codeblock.js). The language picker rides the block's top-left corner.
 const barEl=useRef(null);
 useLayoutEffect(()=>{
  const bar=barEl.current,blk=codePre.current;if(!bar||!blk||!blk.isConnected)return;
  const r=blk.getBoundingClientRect();
  bar.style.left=Math.round(Math.min(Math.max(8,r.left),window.innerWidth-214))+'px';
  bar.style.top=Math.round(Math.max(8,r.top-38))+'px';
 });
 const placeBar=blk=>{
  const r=blk.getBoundingClientRect();
  const x=Math.round(Math.min(Math.max(8,r.left),window.innerWidth-214)),y=Math.round(Math.max(8,r.top-38));
  const value=blk.dataset.lang||'plaintext';
  setCodeBar(p=>p&&p.x===x&&p.y===y&&p.value===value?p:{x,y,value});
 };
 const codeHooks=useRef({
  change:()=>saveRef.current&&saveRef.current(),
  remove:blk=>{
   rememberPage('Code block deleted');
   const prev=blk.previousElementSibling,next=blk.nextElementSibling;blk.remove();
   if(!editor.current.querySelector('p,h1,h2,h3,ul,ol,.cblock,table,details,.kanban,.callout'))editor.current.innerHTML='<p><br></p>';
   const t=prev||next;if(t&&t.nodeType===1)caretTo(t);
   codePre.current=null;setCodeBar(null);saveRef.current&&saveRef.current();
  },
  exit:(blk,dir)=>{
   let t=dir==='after'?blk.nextElementSibling:blk.previousElementSibling;
   if(!t||t.classList.contains('cblock')||!/^(P|H1|H2|H3|DIV|UL|OL|BLOCKQUOTE)$/.test(t.tagName)){
    const p=document.createElement('p');p.innerHTML='<br>';
    if(dir==='after')blk.after(p);else blk.before(p);t=p;
   }
   caretTo(t);if(dir==='before'){const r=document.createRange();r.selectNodeContents(t);r.collapse(false);const sl=window.getSelection();sl.removeAllRanges();sl.addRange(r);}
   saveRef.current&&saveRef.current();
  }
 }).current;
 // Columns: a row of side-by-side blocks, each column an ordinary place to type.
 const insertColumns=n=>{
  const ed=editor.current;ed.focus();
  const sel=window.getSelection();let blk=null;
  if(sel.rangeCount){let nd=sel.anchorNode;while(nd&&nd.parentNode!==ed)nd=nd.parentNode;if(nd&&nd.nodeType===1)blk=nd;}
  const cs=document.createElement('div');cs.className='cols';cs.dataset.n=String(n);
  for(let i=0;i<n;i++){const c=document.createElement('div');c.className='col';c.innerHTML='<p><br></p>';cs.appendChild(c);}
  if(blk&&blk.tagName==='P'&&!blk.textContent.trim())blk.replaceWith(cs);else if(blk)blk.after(cs);else ed.appendChild(cs);
  normalise(ed);caretTo(cs.querySelector('.col p'));saveRef.current&&saveRef.current();
 };
 const insertCodeBlock=()=>{
  const ed=editor.current;ed.focus();
  const sel=window.getSelection();let blk=null;
  if(sel.rangeCount){let n=sel.anchorNode;while(n&&n.parentNode!==ed)n=n.parentNode;if(n&&n.nodeType===1)blk=n;}
  const cb=buildCodeBlock('','plaintext',codeHooks);
  if(blk&&blk.tagName==='P'&&!blk.textContent.trim())blk.replaceWith(cb);
  else if(blk)blk.after(cb);
  else ed.appendChild(cb);
  if(!cb.nextElementSibling){const p=document.createElement('p');p.innerHTML='<br>';cb.after(p);}
  cb.querySelector('.cb-ta').focus();
  codePre.current=cb;placeBar(cb);saveRef.current&&saveRef.current();
 };
 const trackCode=()=>{
  const blk=document.activeElement?.closest?.('.cblock');
  const inside=blk&&editor.current?.contains(blk)?blk:null;
  if(inside){codePre.current=inside;placeBar(inside);}
  else if(!document.activeElement?.closest?.('.code-bar,.lang-menu')&&!hoverCode.current){codePre.current=null;setCodeBar(null);}
 };
 const hoverCode=useRef(false);
 const changeLang=v=>{
  const blk=codePre.current;
  if(!blk)return;
  blk.dataset.lang=v||'plaintext';refreshCode(blk);
  setCodeBar(x=>x&&{...x,value:v||'plaintext'});
  saveRef.current&&saveRef.current();
 };
 const settleCode=()=>{};
 const onSelection=()=>{updateTableBar();trackCode();};

 // Blocks that are awkward to remove with the keyboard get a Delete control, and a drag selection that covers them deletes them.
 const BLOCKS='details.toggle,.callout,hr,.cblock,img[data-file]';
 const showBlockBar=e=>{
  const cb=e.target.closest?.('.cblock');
  if(cb&&editor.current?.contains(cb)){hoverCode.current=true;if(codePre.current!==cb){codePre.current=cb;placeBar(cb);}}
  else if(hoverCode.current){hoverCode.current=false;if(!document.activeElement?.closest?.('.cblock,.code-bar,.lang-menu')&&!e.target.closest?.('.code-bar')){codePre.current=null;setCodeBar(null);}}
  const b=e.target.closest?.(BLOCKS);
  if(!b||!editor.current?.contains(b)||active?.deleted){if(!e.target.closest?.('.block-bar')&&blockEl.current){blockEl.current=null;setBlockBar(null);}return;}
  if(blockEl.current===b)return;
  blockEl.current=b;const r=b.getBoundingClientRect();
  setBlockBar({x:Math.round(Math.min(window.innerWidth-132,r.right-124)),y:Math.round(Math.max(8,r.top-30)),name:b.matches('details')?'toggle':b.matches('.cblock')?'code':b.matches('img')?'image':b.matches('hr')?'divider':'callout'});
 };
 const blockLabel=b=>b.matches('details')?'Toggle':b.matches('.cblock')?'Code block':b.matches('img')?'Image':b.matches('hr')?'Divider':'Callout';
 const deleteBlock=()=>{
  const b=blockEl.current;if(!b)return;
  rememberPage(blockLabel(b)+' deleted');
  const next=b.nextElementSibling;b.remove();blockEl.current=null;setBlockBar(null);
  if(!editor.current.querySelector('p,h1,h2,h3,ul,ol,.cblock,table,details,.kanban,.callout')){editor.current.innerHTML='<p><br></p>';}
  if(next&&next.nodeType===1)caretTo(next);save();
 };
 // Selecting across blocks and pressing Delete removes what is fully selected, including toggles, boards and tables.
 const deleteSelection=()=>{
  const sel=window.getSelection();if(!sel.rangeCount||sel.isCollapsed)return false;
  const r=sel.getRangeAt(0);if(!editor.current.contains(r.commonAncestorContainer))return false;
  const special=[...editor.current.querySelectorAll('details.toggle,.kanban,table,.callout,hr,.cblock,img[data-file]')].filter(b=>r.intersectsNode(b));
  if(!special.length)return false;
  const inside=b=>{const nr=document.createRange();nr.selectNode(b);return r.compareBoundaryPoints(Range.START_TO_START,nr)<=0&&r.compareBoundaryPoints(Range.END_TO_END,nr)>=0;};
  const whole=special.filter(inside);
  if(!whole.length)return false;
  rememberPage('Deleted');
  const blk=n=>{const el=n.nodeType===3?n.parentElement:n;return el?.closest?.('p,h1,h2,h3,li');};
  const endBlk=blk(r.endContainer),startBlk=blk(r.startContainer);
  whole.forEach(b=>b.remove());
  try{if(!r.collapsed)r.deleteContents();}catch{}
  // Join what is left of the first and last paragraphs, as an ordinary deletion would.
  if(startBlk&&endBlk&&startBlk!==endBlk&&startBlk.isConnected&&endBlk.isConnected&&startBlk.tagName===endBlk.tagName){
   const pos=document.createRange();pos.selectNodeContents(startBlk);pos.collapse(false);
   while(endBlk.firstChild)startBlk.appendChild(endBlk.firstChild);endBlk.remove();
   sel.removeAllRanges();sel.addRange(pos);
  }
  if(!editor.current.querySelector('p,h1,h2,h3,ul,ol,.cblock,table,details,.kanban,.callout'))editor.current.innerHTML='<p><br></p>';
  blockEl.current=null;setBlockBar(null);save();return true;
 };
 // Tables.
 const cellOf=()=>{
  const n=window.getSelection().anchorNode;
  const el=n&&(n.nodeType===3?n.parentElement:n);
  const c=el?.closest?.('td,th');
  return c&&editor.current?.contains(c)?c:null;
 };
 const updateTableBar=()=>{
  const c=cellOf();
  if(!c){setTableBar(null);return;}
  const r=c.closest('table').getBoundingClientRect();
  const x=Math.round(Math.max(8,r.left)),y=Math.round(Math.max(8,r.top-42));
  setTableBar(p=>p&&p.x===x&&p.y===y?p:{x,y});
 };
 useEffect(()=>{
  document.addEventListener('selectionchange',onSelection);
  return()=>document.removeEventListener('selectionchange',onSelection);
 },[]);
 const tableOp=op=>{
  const cell=cellOf();if(!cell)return;
  const row=cell.parentElement,table=cell.closest('table'),idx=[...row.children].indexOf(cell);
  if(op==='row+'){const nr=row.cloneNode(true);[...nr.children].forEach(c=>{c.innerHTML='<br>';});row.after(nr);}
  if(op==='col+')[...table.rows].forEach(r=>{const c=document.createElement(r.rowIndex===0?'th':'td');c.innerHTML='<br>';r.cells[idx]?.after(c);});
  if(op==='row-'&&table.rows.length>1)row.remove();
  if(op==='col-'&&row.cells.length>1)[...table.rows].forEach(r=>r.cells[idx]?.remove());
  if(op==='del'){table.remove();setTableBar(null);}
  else requestAnimationFrame(updateTableBar);
  save();
 };

 // Heading navigator.
 const jumpTo=i=>{
  const ed=editor.current,h=ed?.querySelectorAll('h1,h2,h3')[i];
  if(!h)return;
  const y=ed.scrollTop+h.getBoundingClientRect().top-ed.getBoundingClientRect().top-14;
  gsap.to(ed,{scrollTo:{y,autoKill:true},duration:.55,ease:'power3.inOut'});
 };
 const onBodyScroll=()=>{
  trackCode();
  const ed=editor.current;if(!ed)return;
  const top=ed.getBoundingClientRect().top+40;let a=0;
  ed.querySelectorAll('h1,h2,h3').forEach((h,i)=>{if(h.getBoundingClientRect().top<=top)a=i;});
  setActiveHead(a);updateTableBar();
 };

 // Slash menu: opens when "/" starts a word, filters as you type.
 const filtered=useMemo(()=>{
  if(!slash)return [];
  const q=slash.query.toLowerCase();
  return COMMANDS.filter(c=>!q||c.name.toLowerCase().includes(q)||c.keys.includes(q));
 },[slash?.query]);
 // Keep the highlighted command in view while arrowing through a long list.
 useEffect(()=>{document.querySelector('.slash button.on')?.scrollIntoView({block:'nearest'});},[slash?.index]);
 const detectSlash=()=>{
  const sel=window.getSelection();
  if(!sel.rangeCount||!sel.isCollapsed||!editor.current?.contains(sel.anchorNode)||sel.anchorNode.nodeType!==3||sel.anchorNode.parentElement?.closest('.kanban')){setSlash(null);return;}
  const before=sel.anchorNode.textContent.slice(0,sel.anchorOffset);
  const m=before.match(/(?:^|\s)\/([\w#.\-\[\]]{0,14})$/);
  if(!m){setSlash(null);return;}
  const r=sel.getRangeAt(0).cloneRange();r.collapse(true);
  const rect=r.getClientRects()[0]||sel.anchorNode.parentElement.getBoundingClientRect();
  setSlash(s=>({query:m[1],x:rect.left,y:rect.bottom+6,index:s&&s.query===m[1]?s.index:0}));
 };
 const applySlash=cmd=>{
  const s=slashRef.current;if(!s||!cmd)return;
  const sel=window.getSelection(),node=sel.anchorNode,end=sel.anchorOffset,start=end-(s.query.length+1);
  editor.current.focus();
  if(node?.nodeType===3&&start>=0){const r=document.createRange();r.setStart(node,start);r.setEnd(node,end);sel.removeAllRanges();sel.addRange(r);run('delete');}
  setSlash(null);
  switch(cmd.id){
   case 'text':run('formatBlock','p');break;
   case 'h1':case 'h2':case 'h3':run('formatBlock',cmd.id);break;
   case 'bullet':run('insertUnorderedList');break;
   case 'number':run('insertOrderedList');break;
   case 'todo':checklist();break;
   case 'quote':run('formatBlock','blockquote');break;
   case 'code':insertCodeBlock();break;
   case 'divider':run('insertHorizontalRule');break;
   case 'callout':run('insertHTML','<div class="callout"><br></div>');break;
   case 'date':run('insertText',new Date().toLocaleDateString(dateLocale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}));break;
   case 'table':run('insertHTML',TABLE_HTML());break;
   case 'board':run('insertHTML',KANBAN_HTML());break;
   case 'toggle':run('insertHTML',TOGGLE_HTML);break;
   case 'cols2':insertColumns(2);break;
   case 'cols3':insertColumns(3);break;
   case 'link':openLink();return;
   case 'image':{
    const s2=window.getSelection();range.current=s2.rangeCount?s2.getRangeAt(0).cloneRange():null;
    fileInput.current?.click();return;
   }
   case 'page':subpage();return;
  }
  save();
 };
 const onKeyDown=e=>{
  if(e.target.closest?.('.cblock'))return;
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&lastRemoved.current&&Date.now()-lastRemoved.current.at<60000){e.preventDefault();restorePageHtml();return;}
  if((e.key==='Delete'||e.key==='Backspace')&&!e.ctrlKey&&!e.metaKey&&deleteSelection()){e.preventDefault();return;}
  // Backspace in an empty toggle title removes the toggle.
  if(e.key==='Backspace'){const sum=e.target.closest?.('summary');if(sum&&!sum.textContent.trim()&&window.getSelection().isCollapsed){e.preventDefault();const d=sum.closest('details');const next=d.nextElementSibling;d.remove();if(next)caretTo(next);save();return;}}
  // Inside a kanban board: Enter makes the next card, Backspace on an empty card removes it.
  const inBoard=e.target.closest?.('.kanban');
  if(inBoard){
   const kt=e.target.closest('.kb-text'),card=kt?.closest('.kb-card');
   if(e.key==='Enter'){
    e.preventDefault();
    if(card){card.insertAdjacentHTML('afterend',kbCard());caretTo(card.nextElementSibling.querySelector('.kb-text'));save();}
   }else if(e.key==='Backspace'&&kt&&!kt.textContent.trim()){
    e.preventDefault();const prev=card.previousElementSibling;card.remove();if(prev)caretTo(prev.querySelector('.kb-text'));save();
   }
   return;
  }
  // Tables: Tab moves between cells, and adds a row from the last one.
  const cell=cellOf();
  if(cell&&e.key==='Tab'&&!slashRef.current){
   e.preventDefault();
   const cells=[...cell.closest('table').querySelectorAll('th,td')],at=cells.indexOf(cell);
   if(e.shiftKey){if(cells[at-1])caretTo(cells[at-1]);}
   else if(cells[at+1])caretTo(cells[at+1]);
   else{tableOp('row+');const fresh=[...cell.closest('table').querySelectorAll('th,td')];caretTo(fresh[at+1]||cell);}
   return;
  }
  // Pressing Enter at the end of a heading starts a normal paragraph below it.
  if(e.key==='Enter'&&!e.shiftKey&&!slashRef.current){
   const sel=window.getSelection(),n=sel.anchorNode,el=n&&(n.nodeType===3?n.parentElement:n),head=el?.closest?.('h1,h2,h3');
   if(head&&sel.isCollapsed&&editor.current.contains(head)){
    const r=document.createRange();r.selectNodeContents(head);r.setStart(sel.anchorNode,sel.anchorOffset);
    if(r.toString()===''){
     e.preventDefault();
     const p=document.createElement('p');p.innerHTML='<br>';head.after(p);caretTo(p);save();return;
    }
   }
  }
  const s=slashRef.current;
  if(s&&filtered.length){
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const d=e.key==='ArrowDown'?1:-1;setSlash(x=>({...x,index:(x.index+d+filtered.length)%filtered.length}));return;}
   if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();applySlash(filtered[Math.min(s.index,filtered.length-1)]);return;}
   if(e.key==='Escape'){e.preventDefault();setSlash(null);return;}
  }
  if(e.key==='Tab'){e.preventDefault();run(e.shiftKey?'outdent':'indent');save();}
  if(e.key===' '){
   // Markdown-style shortcuts at the start of a line.
   const sel=window.getSelection();
   if(sel.rangeCount&&sel.isCollapsed){
    const node=sel.anchorNode,t=node.nodeType===3?node.textContent.slice(0,sel.anchorOffset):'';
    const map={'#':()=>run('formatBlock','h1'),'##':()=>run('formatBlock','h2'),'###':()=>run('formatBlock','h3'),'-':()=>run('insertUnorderedList'),'*':()=>run('insertUnorderedList'),'1.':()=>run('insertOrderedList'),'>':()=>run('formatBlock','blockquote'),'[]':checklist};
    if(map[t]){
     e.preventDefault();
     // Apply the block format first, then strip the marker, so the caret never leaves the line.
     map[t]();
     let block=sel.anchorNode;
     while(block&&block!==editor.current&&!/^(H[1-6]|LI|BLOCKQUOTE|DIV|P|PRE)$/.test(block.nodeName))block=block.parentNode;
     const walker=document.createTreeWalker(block||editor.current,NodeFilter.SHOW_TEXT);
     for(let tn=walker.nextNode();tn;tn=walker.nextNode()){
      if(tn.data.startsWith(t)){
       const r=document.createRange();r.setStart(tn,0);r.setEnd(tn,t.length);
       sel.removeAllRanges();sel.addRange(r);run('delete');break;
      }
     }
     save();
    }
   }
  }
 };
 const onInput=e=>{if(e.target.closest?.('.cblock'))return;save();detectSlash();};
 const openLink=()=>{
  const sel=window.getSelection();
  range.current=sel.rangeCount?sel.getRangeAt(0).cloneRange():null;
  setLinkErr(false);setLink('');
 };
 const applyLink=()=>{
  editor.current.focus();
  const sel=window.getSelection();sel.removeAllRanges();if(range.current)sel.addRange(range.current);
  // A bare address like example.com gets https:// in front.
  let url=(link||'').trim();
  if(url&&!/^https?:\/\//i.test(url))url='https://'+url;
  if(!/^https?:\/\/[^\s/]+\.[^\s/]{2,}/i.test(url)){setLinkErr(true);return;}
  run(sel.isCollapsed?'insertHTML':'createLink',sel.isCollapsed?`<a href="${esc(url)}">${esc(url)}</a>`:url);
  setLink(null);setLinkErr(false);save();
 };
 const removeLink=()=>{
  const a=linkPop&&linkPop.el;if(!a||!a.parentNode)return;
  a.replaceWith(...a.childNodes);setLinkPop(null);save();
 };
 const keep=e=>e.preventDefault();
 const Tool=({icon:Icon,label,onClick})=>(
  <button className="tool" aria-label={label} onMouseDown={keep} onClick={onClick}><Icon size={17}/></button>
 );
 const toggle=id=>setCollapsed(s=>{const x=new Set(s);x.has(id)?x.delete(id):x.add(id);return x;});

 return (
  <div className="notes">
   <aside className="notes-list">
    <div className="list-head">
     <h2>Notes</h2>
     <span className="head-actions">
      <SelectToggle bulk={bulk} disabled={!rows.some(r=>r.n)}/>
      <span className="pop-anchor"><button className="ghost round" aria-label="New from template" onClick={()=>setMenu(m=>m==='tpl'?null:'tpl')}><SquaresFour size={16}/></button>
       {menu==='tpl'&&<div className="pop tpl"><div className="pop-title">Start from a template</div>{TEMPLATES.map(t=><button key={t.id} onClick={()=>createFrom(t.id)}><b>{t.name}</b><span>{t.hint}</span></button>)}</div>}
      </span>
      <button className="ghost round" aria-label="Import a document" data-tip="Bring in a Word document, Markdown, text or HTML file as a note." data-tip-title="Import" onClick={()=>importInput.current&&importInput.current.click()}><DownloadSimple size={16}/></button>
      <input ref={importInput} type="file" hidden multiple accept=".docx,.md,.markdown,.txt,.html,.htm" onChange={e=>{importFiles(e.target.files);e.target.value='';}}/>
      <button className="ghost round" aria-label="New folder" onClick={()=>{const f={id:uid(),name:'New folder',created:Date.now()};setNfolders(l=>[...l,f]);setRenamingF(f.id);}}><FolderSimplePlus size={16}/></button>
      <button className="primary round" aria-label="New note" onClick={()=>create(null)}><Plus size={16} weight="bold"/></button>
     </span>
    </div>
    {importMsg&&<p className="muted nf-msg" role="status">{importMsg}</p>}
    <label className="search"><MagnifyingGlass size={15}/><input placeholder="Search notes" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <ShelfTabs compact mode={mode} setMode={setMode} counts={tabCounts} onEmpty={emptyTrash}/>
    {bulk.on&&(mode==='trash'
     ?<BulkBar bulk={bulk} ids={rows.filter(r=>r.n).map(r=>r.n.id)} noun="page" deleteLabel="Delete forever" confirmDelete onDelete={bulkPurge}><button className="bulk-act" disabled={!bulk.count} onClick={()=>bulkRestore([...bulk.sel])}>Restore</button></BulkBar>
     :<BulkBar bulk={bulk} ids={rows.filter(r=>r.n).map(r=>r.n.id)} noun="page" deleteLabel="Move to Trash" onDelete={bulkTrash}/>)}
    <div className="list-scroll">
     {rows.map(({n,depth,kids,head,count})=>head?(
      <div key={'h'+head.id} className="nf-head">
       <button className={'nf-caret'+(collapsed.has('f:'+head.id)?'':' open')} aria-label="Show or hide this folder" onClick={()=>toggle('f:'+head.id)}><CaretRight size={11} weight="bold"/></button>
       {head.id?<FolderSimple size={14}/>:null}
       {renamingF===head.id&&head.id
        ?<input autoFocus className="nf-name" defaultValue={head.name} maxLength={40} onBlur={e=>{const v=e.target.value.trim().slice(0,40);if(v)setNfolders(l=>l.map(f=>f.id===head.id?{...f,name:v}:f));setRenamingF(null);}} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape')e.target.blur();}}/>
        :<b onDoubleClick={()=>head.id&&setRenamingF(head.id)}>{head.name}</b>}
       <em>{count}</em>
       {head.id&&<span className="nf-acts">
        <button className="icon-btn" aria-label="Move folder up" onClick={()=>setNfolders(l=>{const i=l.findIndex(f=>f.id===head.id);if(i<1)return l;const n2=[...l];[n2[i-1],n2[i]]=[n2[i],n2[i-1]];return n2;})}><ArrowUp size={12}/></button>
        <button className="icon-btn" aria-label="Move folder down" onClick={()=>setNfolders(l=>{const i=l.findIndex(f=>f.id===head.id);if(i<0||i>=l.length-1)return l;const n2=[...l];[n2[i+1],n2[i]]=[n2[i],n2[i+1]];return n2;})}><ArrowDown size={12}/></button>
        <button className="icon-btn" aria-label="Rename folder" onClick={()=>setRenamingF(head.id)}><PencilSimple size={12}/></button>
        <button className="icon-btn danger" aria-label="Delete folder" onClick={()=>{setNotes(l=>l.map(x=>x.folder===head.id?{...x,folder:undefined}:x));setNfolders(l=>l.filter(f=>f.id!==head.id));}}><Trash size={12}/></button>
       </span>}
      </div>
     ):(
      <div key={n.id} className={'note-row'+(depth>0?' child':'')+(n.id===activeId?' on':'')+(rowConfirm===n.id?' confirm':'')+(bulk.on?' sel-host':'')} style={{paddingLeft:(bulk.on?42:12)+depth*22}} onClick={()=>{if(bulk.on)return;if(active)save();setActiveId(n.id);}}>
       <SelectMark bulk={bulk} id={n.id}/>
       <span className="row-top">
        {depth>0&&!query?<ArrowBendDownRight size={13} className="child-mark"/>:null}
        {kids>0&&!query?<button className={'twisty'+(collapsed.has(n.id)?'':' open')} aria-label="Toggle sub-pages" onClick={e=>{e.stopPropagation();toggle(n.id);}}><CaretRight size={11} weight="bold"/></button>:(!query&&depth===0&&rows.some(r=>r.kids>0)?<span className="twisty-gap"/>:null)}
        {n.icon&&<span className="row-icon"><Glyph name={n.icon} size={16}/></span>}<b>{n.title||'Untitled'}</b>{n.pinned&&<PushPin size={12} weight="fill"/>}
        {mode==='trash'
         ?<span className="row-actions-inline always">
           <button className="row-add" aria-label="Restore page" onClick={e=>{e.stopPropagation();restorePage(n.id);}}><ArrowCounterClockwise size={12}/></button>
           <button className="row-del" aria-label="Delete forever" onClick={e=>{e.stopPropagation();purgePage(n.id);}}><Trash size={12}/></button>
          </span>
         :<span className="row-actions-inline">
           <button className={'row-add'+(n.favorite?' fav-on':'')} aria-label={n.favorite?'Remove from favorites':'Add to favorites'} onClick={e=>{e.stopPropagation();patch(n.id,{favorite:!n.favorite});}}><Star size={12} weight={n.favorite?'fill':'regular'}/></button>
           <button className={'row-add'+(n.folder?' fav-on':'')} aria-label="Move to folder" onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setNfMenu({kind:'folder',ids:[n.id],x:r.right,y:r.bottom,current:n.folder});}}><FolderSimple size={12} weight={n.folder?'fill':'regular'}/></button>
           <button className="row-add" aria-label="Add sub-page" onClick={e=>{e.stopPropagation();create(n.id);}}><Plus size={12} weight="bold"/></button>
           <button className="row-del" aria-label="Move to trash" onClick={e=>{e.stopPropagation();deletePage(n.id);}}><Trash size={12}/></button>
          </span>}
       </span>
       {mode==='trash'&&<span className="row-snippet">{daysLeft(n)+' days left'}</span>}
      </div>
     ))}
     {ready&&!rows.length&&<p className="muted pad">{query?'No notes match.':mode==='trash'?'Trash is empty.':mode==='fav'?'Star a page to find it here.':'Nothing here yet.'}</p>}
    </div>
   </aside>
   <section className="note-pane">
    {active?<>
     <div className="note-bar">
      <span className="crumbs">{crumbs.map(c=><React.Fragment key={c.id}><button onClick={()=>{save();setActiveId(c.id);}}>{c.title||'Untitled'}</button><CaretRight size={10}/></React.Fragment>)}<span className="muted">{words(active.text)} words · edited {ago(active.updated)}</span></span>
      <span className="spacer"/>
      {active.deleted
       ?<><span className="muted">In Trash · {daysLeft(active)} days left</span><button className="ghost" onClick={()=>restorePage(active.id)}><ArrowCounterClockwise size={15}/>Restore</button><button className="ghost danger" onClick={()=>purgePage(active.id)}><Trash size={15}/>Delete forever</button></>
       :<>
        <span className="pop-anchor"><button className="ghost" data-tip="Save this page as Markdown or PDF." data-tip-title="Export" onClick={()=>setMenu(m=>m==='export'?null:'export')}>{exported?<CheckIcon size={15}/>:<UploadSimple size={15}/>}{exported==='copy'?'Copied':exported?'Exported':'Export'}</button>
         {menu==='export'&&<div className="pop right"><button onClick={exportMd}><FileMd size={16}/><b>Markdown file</b></button><button onClick={copyMd}><Copy size={16}/><b>Copy as Markdown</b></button><button onClick={exportPdf}><FilePdf size={16}/><b>PDF</b></button></div>}
        </span>
        <button className={'ghost'+(active.favorite?' on':'')} data-tip="Keep this page in Favorites." data-tip-title="Favorite" onClick={()=>patch(active.id,{favorite:!active.favorite})}><Star size={15} weight={active.favorite?'fill':'regular'}/>Favorite</button>
        <button className={'ghost'+(active.pinned?' on':'')} data-tip="Keep this page at the top of the list." data-tip-title="Pin" onClick={()=>patch(active.id,{pinned:!active.pinned})}><PushPin size={15} weight={active.pinned?'fill':'regular'}/>{active.pinned?'Pinned':'Pin'}</button>
        <button className="ghost danger" data-tip="Moves to Trash for 30 days." data-tip-title="Trash" onClick={()=>deletePage(active.id)}><Trash size={15}/>Trash</button>
       </>}
     </div>
     <div className="toolbar">
      <Select compact keepFocus label="Text style" value="p" onChange={v=>fmt('formatBlock',v)} options={[{value:'p',label:'Text'},{value:'h1',label:'Heading 1'},{value:'h2',label:'Heading 2'},{value:'h3',label:'Heading 3'}]}/>
      <i className="sep"/>
      {Tool({icon:TextB,label:"Bold",onClick:()=>fmt('bold')})}
      {Tool({icon:TextItalic,label:"Italic",onClick:()=>fmt('italic')})}
      {Tool({icon:TextUnderline,label:"Underline",onClick:()=>fmt('underline')})}
      {Tool({icon:TextStrikethrough,label:"Strikethrough",onClick:()=>fmt('strikeThrough')})}
      <i className="sep"/>
      {Tool({icon:ListBullets,label:"Bulleted list",onClick:()=>fmt('insertUnorderedList')})}
      {Tool({icon:ListNumbers,label:"Numbered list",onClick:()=>fmt('insertOrderedList')})}
      {Tool({icon:CheckSquare,label:"Checklist",onClick:()=>{checklist();save();}})}
      <i className="sep"/>
      {Tool({icon:Quotes,label:"Quote",onClick:()=>fmt('formatBlock','blockquote')})}
      {Tool({icon:Code,label:"Code block",onClick:()=>insertCodeBlock()})}
      {Tool({icon:Minus,label:"Divider",onClick:()=>fmt('insertHorizontalRule')})}
      {Tool({icon:LinkSimple,label:"Link",onClick:openLink})}
      {link!==null&&<span className="link-bar">
       <input autoFocus className={linkErr?'bad':''} placeholder="Paste or type a link" aria-invalid={linkErr} value={link} onChange={e=>{setLinkErr(false);setLink(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyLink();}if(e.key==='Escape')setLink(null);}}/>
       <button className="primary small" onClick={applyLink}>Add link</button>
       {linkErr&&<em className="link-err">Enter a web address like example.com</em>}
      </span>}
     </div>
     <NoteHead note={active} readOnly={!!active.deleted} onChange={change=>patch(active.id,{...change,updated:Date.now()})}/>
     <input className="note-title" placeholder="Untitled" readOnly={!!active.deleted} value={active.title} onChange={e=>patch(active.id,{title:e.target.value,updated:Date.now()})} onKeyDown={onTitleKey}/>
     <div ref={editor} className="note-body" contentEditable={!active.deleted} suppressContentEditableWarning spellCheck data-placeholder="Write, or press / for commands"
      onInput={onInput} onPaste={onPaste} onKeyDown={onKeyDown} onMouseMove={showBlockBar} onMouseLeave={e=>{if(!e.relatedTarget?.closest?.('.block-bar')){blockEl.current=null;setBlockBar(null);}}} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))detectSlash();}} onClick={onEditorClick} onBlur={()=>{setTimeout(()=>setSlash(null),120);}} onFocus={()=>setTimeout(trackCode,0)}
      onScroll={onBodyScroll} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={endDrag}/>
     <BlockTools key={active.id} editor={editor} readOnly={!!active.deleted} remember={rememberPage} onChange={()=>saveRef.current&&saveRef.current()}/>
     <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={e=>{insertImages(e.target.files);e.target.value='';}}/>
     {outline.length>0&&<nav className="outline" aria-label="On this page">
      <div className="outline-dashes">{outline.map((h,i)=><i key={i} className={'dash l'+h.level+(i===activeHead?' on':'')}/>)}</div>
      <div className="outline-panel">
       <b>On this page</b>
       {outline.map((h,i)=><button key={i} className={'l'+h.level+(i===activeHead?' on':'')} onClick={()=>jumpTo(i)}>{h.text}</button>)}
      </div>
     </nav>}
     {linkPop&&<div className="link-pop" style={{left:linkPop.x,top:linkPop.y}} onMouseDown={e=>e.preventDefault()}>
      <span className="lp-url">{linkPop.href.replace(/^https?:\/\//,'').slice(0,46)}</span>
      <button onClick={()=>{api.openExternal(linkPop.href);setLinkPop(null);}}>Open</button>
      <button onClick={()=>{try{navigator.clipboard.writeText(linkPop.href);}catch{}setLinkPop(null);}}>Copy</button>
      <button className="danger" onClick={removeLink}>Remove</button>
     </div>}
     {codeBar&&<div ref={barEl} className="code-bar" style={{left:codeBar.x,top:codeBar.y}} onMouseDown={e=>e.preventDefault()}>
      <Code size={14}/>
      <LangPicker value={codeBar.value} noAuto onChange={changeLang}/>
     </div>}
     {undoNote.node}
     {nfMenu&&<PickMenu menu={nfMenu} folders={nfolders} onClose={()=>setNfMenu(null)} onFolder={id=>{setNotes(l=>l.map(x=>nfMenu.ids.includes(x.id)?{...x,folder:id||undefined}:x));setNfMenu(null);}} onRemind={()=>setNfMenu(null)} onNewFolder={name=>{const t=name.trim().slice(0,40);if(!t)return;const f={id:uid(),name:t,created:Date.now()};setNfolders(l=>[...l,f]);setNotes(l=>l.map(x=>nfMenu.ids.includes(x.id)?{...x,folder:f.id}:x));setNfMenu(null);}}/>}
     {blockBar&&<div className="block-bar" style={{left:blockBar.x,top:blockBar.y}} onMouseDown={e=>e.preventDefault()} onMouseLeave={()=>{blockEl.current=null;setBlockBar(null);}}><button className="danger" onClick={deleteBlock}><Trash size={13}/>Delete {blockBar.name}</button></div>}
     {tableBar&&<div className="table-bar" style={{left:tableBar.x,top:tableBar.y}} onMouseDown={e=>e.preventDefault()}>
      <button onClick={()=>tableOp('row+')}>+ Row</button><button onClick={()=>tableOp('col+')}>+ Column</button>
      <i className="sep"/><button onClick={()=>tableOp('row-')}>− Row</button><button onClick={()=>tableOp('col-')}>− Column</button>
      <i className="sep"/><button className="danger" onClick={()=>tableOp('del')}>Delete table</button>
     </div>}
     {slash&&filtered.length>0&&<div className="slash" style={{left:Math.min(slash.x,window.innerWidth-300),top:Math.min(slash.y,window.innerHeight-340)}} onMouseDown={e=>e.preventDefault()}>
      <div className="slash-label">{slash.query?'Results':'Basic blocks'}</div>
      {filtered.map((c,i)=>{const I=c.icon;return (
       <button key={c.id} className={i===Math.min(slash.index,filtered.length-1)?'on':''} onMouseEnter={()=>setSlash(s=>({...s,index:i}))} onClick={()=>applySlash(c)}>
        <span className="slash-ico"><I size={20}/></span><span className="slash-txt"><b>{c.name}</b><em>{c.hint}</em></span>
       </button>
      );})}
     </div>}
    </>:<div className="empty-state">
     <NotePencil size={34} weight="light"/>
     <h3>Write something worth keeping</h3>
     <p className="muted">Press / for headings, lists, to-dos, callouts and sub-pages, or use markdown shortcuts as you type.</p>
     <button className="primary" onClick={()=>create(null)}><Plus size={15} weight="bold"/>New note</button>
    </div>}
   </section>
  </div>
 );
}
