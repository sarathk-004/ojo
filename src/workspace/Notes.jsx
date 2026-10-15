import React,{useLayoutEffect,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowBendDownRight,Plus,MagnifyingGlass,PushPin,Trash,TextB,TextItalic,TextUnderline,TextStrikethrough,ListBullets,ListNumbers,CheckSquare,Quotes,Code,LinkSimple,Minus,NotePencil,CaretRight,TextT,TextHOne,TextHTwo,TextHThree,FileText,Lightbulb,CalendarBlank,Table,Kanban,ImageSquare,CaretCircleRight} from '@phosphor-icons/react';
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
import {highlight,detectLanguage,langName} from './highlight.js';
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
 return new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
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
 {id:'divider',name:'Divider',hint:'Visually divide blocks',icon:Minus,keys:'divider line hr rule ---'},
 {id:'date',name:'Today’s date',hint:'Insert the date',icon:CalendarBlank,keys:'date today now'}
];

export function Notes({focusId}){
 const [notes,setNotes,ready]=useCollection('notes');
 const [activeId,setActiveId]=useState(null),[query,setQuery]=useState(''),[confirm,setConfirm]=useState(false),[link,setLink]=useState(null),[linkErr,setLinkErr]=useState(false),[linkPop,setLinkPop]=useState(null),[collapsed,setCollapsed]=useState(()=>new Set());
 const [slash,setSlash]=useState(null),[rowConfirm,setRowConfirm]=useState(null),[mode,setModeRaw]=useState('all'),[menu,setMenu]=useState(null),[exported,setExported]=useState('');
 // Pop-over menus (templates, export) close on any outside click.
 useEffect(()=>{
  if(!menu)return;
  const off=e=>{if(!e.target.closest?.('.pop,.pop-anchor'))setMenu(null);};
  window.addEventListener('mousedown',off);return()=>window.removeEventListener('mousedown',off);
 },[menu]);
 const [outline,setOutline]=useState([]),[activeHead,setActiveHead]=useState(0),[tableBar,setTableBar]=useState(null),[codeBar,setCodeBar]=useState(null);
 const codePre=useRef(null),swapping=useRef(false);
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
  walk('',0);return out;
 },[notes,query,collapsed,byId,mode]);
 const active=byId.get(activeId)||null;
 const setMode=m=>{if(active&&!active.deleted)save();setModeRaw(m);setActiveId(null);loadedId.current=null;};
 const crumbs=useMemo(()=>{const c=[];let n=active;while(n&&n.parent&&byId.has(n.parent)){n=byId.get(n.parent);c.unshift(n);}return c;},[active,byId]);

 useEffect(()=>{if(focusId&&byId.has(focusId))setActiveId(focusId);},[focusId]);
 useEffect(()=>{if(ready&&!activeId&&rows[0])setActiveId(rows[0].n.id);},[ready,rows,activeId]);

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
  if(loadedId.current!==active.id){editor.current.innerHTML=active.html||'';loadedId.current=active.id;setConfirm(false);setLink(null);setSlash(null);setTableBar(null);hydrateImages();readOutline();if(editor.current)editor.current.scrollTop=0;}
  refreshLinks();
 },[active,byId]);

 const patch=(id,change)=>setNotes(list=>list.map(n=>n.id===id?{...n,...change}:n));
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
  const html=serialize(),text=plain(html);
  patch(active.id,{html,text,updated:Date.now()});
  readOutline();
 };
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


 // Code blocks: a language picker, and colouring that applies while you are not typing in the block.
 const codeText=pre=>{const c=pre.cloneNode(true);c.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));return c.textContent;};
 const caretOffset=pre=>{const sel=window.getSelection();if(!sel.rangeCount||!pre.contains(sel.anchorNode))return null;const r=document.createRange();r.selectNodeContents(pre);r.setEnd(sel.anchorNode,sel.anchorOffset);return r.toString().length;};
 const placeCaret=(pre,offset)=>{
  const w=document.createTreeWalker(pre,NodeFilter.SHOW_TEXT);let left=offset,n;
  while((n=w.nextNode())){if(left<=n.data.length){const r=document.createRange();r.setStart(n,left);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);return;}left-=n.data.length;}
  caretTo(pre);
 };
 // Auto-detect: quick rules first, then highlight.js picks from its whole set.
 // The language picker rides the top-left corner of its block, and is re-seated after every render because the block can move.
 const barEl=useRef(null);
 useLayoutEffect(()=>{
  const bar=barEl.current,pre=codePre.current;if(!bar||!pre||!pre.isConnected)return;
  const r=pre.getBoundingClientRect();
  bar.style.left=Math.round(Math.min(Math.max(8,r.left),window.innerWidth-214))+'px';
  bar.style.top=Math.round(Math.max(8,r.top-38))+'px';
 });
 const autoLang=text=>{const g=guessLang(text);return g&&g!=='plaintext'?g:detectLanguage(text);};
 const setLangAttrs=(pre,id,auto)=>{pre.dataset.lang=id;pre.dataset.label=langName(id);if(auto)pre.dataset.auto='1';else delete pre.dataset.auto;};
 const highlightPre=pre=>{
  if(!pre||!pre.isConnected)return;
  const text=codeText(pre);
  if(!text.trim())return;
  if(!pre.dataset.lang)setLangAttrs(pre,autoLang(text),true);
  else if(pre.dataset.auto==='1'&&text.length<4000)setLangAttrs(pre,autoLang(text),true);
  swapping.current=true;
  pre.innerHTML=highlight(text.replace(/\n$/,''),pre.dataset.lang);
  pre.classList.add('hljs');pre.dataset.hl='1';
  swapping.current=false;
 };
 const plainPre=pre=>{
  if(!pre||pre.dataset.hl!=='1')return;
  const off=caretOffset(pre);
  swapping.current=true;
  pre.textContent=codeText(pre);
  delete pre.dataset.hl;pre.classList.remove('hljs');
  if(off!=null)placeCaret(pre,off);
  swapping.current=false;
 };
 const trackCode=()=>{
  if(swapping.current)return;
  const sel=window.getSelection(),n=sel.rangeCount?sel.anchorNode:null;
  const el=n&&(n.nodeType===3?n.parentElement:n);
  const pre=el?.closest?.('pre');
  const inside=pre&&editor.current?.contains(pre)?pre:null;
  if(codePre.current&&codePre.current!==inside){
   // Left the block: colour it, unless focus moved to its own language picker.
   if(!document.activeElement?.closest?.('.code-bar,.lang-menu')){highlightPre(codePre.current);}
  }
  if(inside){
   codePre.current=inside;
   const r=inside.getBoundingClientRect();
   const x=Math.round(Math.min(Math.max(8,r.left),window.innerWidth-214)),y=Math.round(Math.max(8,r.top-38));
   const value=inside.dataset.auto==='1'||!inside.dataset.lang?'':inside.dataset.lang,found=inside.dataset.auto==='1'?inside.dataset.label||'':'';
   setCodeBar(p=>p&&p.x===x&&p.y===y&&p.value===value&&p.found===found?p:{x,y,value,found});
  }else if(!document.activeElement?.closest?.('.code-bar,.lang-menu')){
   codePre.current=null;setCodeBar(null);
  }
 };
 const changeLang=v=>{
  const pre=codePre.current;
  if(!pre)return;
  if(v==='')setLangAttrs(pre,autoLang(codeText(pre)),true);
  else setLangAttrs(pre,v,false);
  if(pre.dataset.hl==='1')highlightPre(pre);
  setCodeBar(b=>b&&{...b,value:v});
  save();
 };
 const settleCode=()=>{if(codePre.current&&!document.activeElement?.closest?.('.code-bar,.lang-menu')){highlightPre(codePre.current);}};
 const onSelection=()=>{updateTableBar();trackCode();};

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
   case 'code':run('formatBlock','pre');break;
   case 'divider':run('insertHorizontalRule');break;
   case 'callout':run('insertHTML','<div class="callout"><br></div>');break;
   case 'date':run('insertText',new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));break;
   case 'table':run('insertHTML',TABLE_HTML());break;
   case 'board':run('insertHTML',KANBAN_HTML());break;
   case 'toggle':run('insertHTML',TOGGLE_HTML);break;
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
  // A code block ends when you press Enter on an empty last line.
  if(e.key==='Enter'&&!e.shiftKey&&!slashRef.current){
   const sel=window.getSelection(),n=sel.anchorNode,el=n&&(n.nodeType===3?n.parentElement:n),pre=el?.closest?.('pre');
   if(pre&&sel.isCollapsed){
    const r=document.createRange();r.selectNodeContents(pre);r.setStart(sel.anchorNode,sel.anchorOffset);
    const last=pre.lastChild;
    const emptyEnd=/\n$/.test(pre.textContent)||(last&&last.nodeName==='BR');
    if(r.toString()===''&&emptyEnd){
     e.preventDefault();
     if(last&&last.nodeName==='BR')last.remove();
     else if(last&&last.nodeType===3)last.textContent=last.textContent.replace(/\n+$/,'');
     const p=document.createElement('p');p.innerHTML='<br>';pre.after(p);caretTo(p);save();return;
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
 const liveTimer=useRef(null);
 // Colour code as it is typed: a short pause after the last key, with the caret put back where it was.
 const liveCode=()=>{
  const sel=window.getSelection(),n=sel.rangeCount?sel.anchorNode:null,el=n&&(n.nodeType===3?n.parentElement:n),pre=el?.closest?.('pre');
  if(!pre||!editor.current?.contains(pre))return;
  clearTimeout(liveTimer.current);
  liveTimer.current=setTimeout(()=>{
   if(!pre.isConnected)return;
   const off=caretOffset(pre);
   highlightPre(pre);
   if(off!=null)placeCaret(pre,off);
  },220);
 };
 const onInput=e=>{save();detectSlash();if(!(e&&e.nativeEvent&&e.nativeEvent.isComposing))liveCode();};
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
      <SelectToggle bulk={bulk} disabled={!rows.length}/>
      <span className="pop-anchor"><button className="ghost round" aria-label="New from template" onClick={()=>setMenu(m=>m==='tpl'?null:'tpl')}><SquaresFour size={16}/></button>
       {menu==='tpl'&&<div className="pop tpl"><div className="pop-title">Start from a template</div>{TEMPLATES.map(t=><button key={t.id} onClick={()=>createFrom(t.id)}><b>{t.name}</b><span>{t.hint}</span></button>)}</div>}
      </span>
      <button className="primary round" aria-label="New note" onClick={()=>create(null)}><Plus size={16} weight="bold"/></button>
     </span>
    </div>
    <label className="search"><MagnifyingGlass size={15}/><input placeholder="Search notes" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <ShelfTabs compact mode={mode} setMode={setMode} counts={tabCounts} onEmpty={emptyTrash}/>
    {bulk.on&&(mode==='trash'
     ?<BulkBar bulk={bulk} ids={rows.map(r=>r.n.id)} noun="page" deleteLabel="Delete forever" confirmDelete onDelete={bulkPurge}><button className="bulk-act" disabled={!bulk.count} onClick={()=>bulkRestore([...bulk.sel])}>Restore</button></BulkBar>
     :<BulkBar bulk={bulk} ids={rows.map(r=>r.n.id)} noun="page" deleteLabel="Move to Trash" onDelete={bulkTrash}/>)}
    <div className="list-scroll">
     {rows.map(({n,depth,kids})=>(
      <div key={n.id} className={'note-row'+(depth>0?' child':'')+(n.id===activeId?' on':'')+(rowConfirm===n.id?' confirm':'')+(bulk.on?' sel-host':'')} style={{paddingLeft:(bulk.on?42:12)+depth*22}} onClick={()=>{if(bulk.on)return;if(active)save();setActiveId(n.id);}}>
       <SelectMark bulk={bulk} id={n.id}/>
       <span className="row-top">
        {depth>0&&!query?<ArrowBendDownRight size={13} className="child-mark"/>:null}
        {kids>0&&!query?<button className={'twisty'+(collapsed.has(n.id)?'':' open')} aria-label="Toggle sub-pages" onClick={e=>{e.stopPropagation();toggle(n.id);}}><CaretRight size={11} weight="bold"/></button>:(!query&&depth===0&&rows.some(r=>r.kids>0)?<span className="twisty-gap"/>:null)}
        {n.icon&&<span className="row-icon"><Glyph name={n.icon} size={16}/></span>}<b>{n.title||'Untitled'}</b>{n.pinned&&<PushPin size={12} weight="fill"/>}{n.favorite&&!n.deleted&&<Star size={12} weight="fill" className="row-star"/>}
        {mode==='trash'
         ?<span className="row-actions-inline always">
           <button className="row-add" aria-label="Restore page" onClick={e=>{e.stopPropagation();restorePage(n.id);}}><ArrowCounterClockwise size={12}/></button>
           <button className="row-del" aria-label="Delete forever" onClick={e=>{e.stopPropagation();purgePage(n.id);}}><Trash size={12}/></button>
          </span>
         :<span className="row-actions-inline">
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
        <span className="pop-anchor"><button className="ghost" onClick={()=>setMenu(m=>m==='export'?null:'export')}>{exported?<CheckIcon size={15}/>:<UploadSimple size={15}/>}{exported==='copy'?'Copied':exported?'Exported':'Export'}</button>
         {menu==='export'&&<div className="pop right"><button onClick={exportMd}><FileMd size={16}/><b>Markdown file</b></button><button onClick={copyMd}><Copy size={16}/><b>Copy as Markdown</b></button><button onClick={exportPdf}><FilePdf size={16}/><b>PDF</b></button></div>}
        </span>
        <button className={'ghost'+(active.favorite?' on':'')} onClick={()=>patch(active.id,{favorite:!active.favorite})}><Star size={15} weight={active.favorite?'fill':'regular'}/>Favorite</button>
        <button className={'ghost'+(active.pinned?' on':'')} onClick={()=>patch(active.id,{pinned:!active.pinned})}><PushPin size={15} weight={active.pinned?'fill':'regular'}/>{active.pinned?'Pinned':'Pin'}</button>
        <button className="ghost danger" onClick={()=>deletePage(active.id)}><Trash size={15}/>Trash</button>
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
      {Tool({icon:Code,label:"Code block",onClick:()=>fmt('formatBlock','pre')})}
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
      onInput={onInput} onPaste={onPaste} onKeyDown={onKeyDown} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))detectSlash();}} onClick={onEditorClick} onBlur={()=>{setTimeout(()=>setSlash(null),120);setTimeout(settleCode,0);}}
      onScroll={onBodyScroll} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={endDrag}/>
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
      <LangPicker value={codeBar.value} autoLabel={codeBar.found} onChange={changeLang}/>
     </div>}
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
