import React,{useEffect,useMemo,useRef,useState} from 'react';
import {MagnifyingGlass,Copy,ArrowUpRight,Trash,Play,InstagramLogo,FileText,Check,DownloadSimple,X,BookmarkSimple,Image as ImageIcon,FilePdf,FileMd,MusicNotes,VideoCamera,Globe,LinkedinLogo,GithubLogo,XLogo,RedditLogo,MediumLogo,YoutubeLogo,Article,StackOverflowLogo,NotionLogo,FigmaLogo,GoogleLogo,GoogleDriveLogo,SpotifyLogo,FacebookLogo,DiscordLogo,TiktokLogo,TwitchLogo,PinterestLogo,TelegramLogo,AmazonLogo,Code as CodeIcon,BookOpen,Plus} from '@phosphor-icons/react';
import {useCollection,useFileUrl,useFileText,fmtSize} from './hooks.js';
import {api} from './api.js';
import {ingest,ingestText} from './ingest.js';
import {KINDS,LANGS,brandFor} from './classify.mjs';
import {mdToHtml} from './markdown.mjs';
import {highlight} from './highlight.js';
import {Select} from './Select.jsx';
import {Star,BookOpenText,CheckCircle} from '@phosphor-icons/react';
import {LangPicker} from './LangPicker.jsx';
import {useBulk,SelectToggle,BulkBar,SelectMark} from './bulk.jsx';
import {readMinutes} from './readText.js';
import {FolderBar,PickMenu,CustomRemind} from './SavedFolders.jsx';
import {remindLabel} from './savedlib.mjs';
import {FolderSimple,Bell} from '@phosphor-icons/react';
import {ShelfTabs,FavButton,RestoreButton,modeCounts,inMode,expired,daysLeft,trashNote} from './shelf.jsx';

const FILTERS=['all','toread','unopened','youtube','instagram','video','audio','image','pdf','md','text','code','link','file'];
const LABEL={all:'All',toread:'To read',unopened:'Not opened yet',...KINDS};
const BRAND_ICON={youtube:YoutubeLogo,instagram:InstagramLogo,linkedin:LinkedinLogo,github:GithubLogo,x:XLogo,reddit:RedditLogo,medium:MediumLogo,article:Article,stackoverflow:StackOverflowLogo,notion:NotionLogo,figma:FigmaLogo,google:GoogleLogo,drive:GoogleDriveLogo,spotify:SpotifyLogo,facebook:FacebookLogo,discord:DiscordLogo,tiktok:TiktokLogo,twitch:TwitchLogo,pinterest:PinterestLogo,telegram:TelegramLogo,amazon:AmazonLogo,code:CodeIcon,globe:Globe};
const KIND_ICON={pdf:FilePdf,md:FileMd,audio:MusicNotes,video:VideoCamera,text:FileText,file:FileText};

// Where an item's bytes come from: a stored copy if there is one, otherwise its web address.
function useSource(item){
 const blob=useFileUrl(item.fileId,item.mime);
 return item.fileId?blob:item.url||'';
}

function BrandChip({item}){
 const known=brandFor(item.url),b=known||{brand:item.brand||'Link',icon:'globe',color:'#567458'};
 const Icon=BRAND_ICON[b.icon]||Globe;
 return <span className="brand-chip" style={{'--b':b.color}}><span className={'brand-badge'+(known&&known.icon!=='globe'?'':' plain')}><Icon size={17} weight="fill"/></span><span><b>{b.brand}</b>{b.sub&&<em>{b.sub}</em>}</span></span>;
}

function Thumb({item,onOpen}){
 const src=useSource(item);
 if(item.kind==='youtube')return <a className="thumb video" onClick={()=>api.openExternal(item.url)}><img src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`} alt="" loading="lazy"/><span className="play"><Play size={18} weight="fill"/></span></a>;
 if(item.kind==='instagram')return <a className="thumb insta" onClick={()=>api.openExternal(item.url)}><InstagramLogo size={34} weight="light"/></a>;
 if(item.kind==='image')return <a className="thumb img" onClick={()=>src&&onOpen(item)}>{src?<img src={src} alt={item.title} loading="lazy"/>:<ImageIcon size={28} weight="light"/>}</a>;
 if(item.kind==='video')return <a className="thumb video" onClick={()=>onOpen(item)}>{src&&<video src={src+'#t=0.6'} preload="metadata" muted/>}<span className="play"><Play size={18} weight="fill"/></span></a>;
 if(item.kind==='link'&&item.image)return <a className="thumb img" onClick={()=>api.openExternal(item.url)}><img src={item.image} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/></a>;
 return null;
}

function CodeBlock({item,onLang}){
 const [open,setOpen]=useState(false);
 const lang=item.lang||'plaintext';
 const html=useMemo(()=>highlight(item.text||'',lang),[item.text,lang]);
 return (
  <div className="code-wrap">
   <div className="code-head">
    <div className="lang"><CodeIcon size={13}/><LangPicker value={lang} onChange={v=>onLang(v||'plaintext')}/></div>
   </div>
   <pre className={'hljs'+(open?' open':'')} onClick={()=>setOpen(o=>!o)}><code dangerouslySetInnerHTML={{__html:html}}/></pre>
  </div>
 );
}

function Card({item,mode,onMenu,onOpened,onDelete,onFav,onQueue,onRead,onRestore,onPurge,onOpen,onLang,go,bulk}){
 const [copied,setCopied]=useState(false);
 const src=useSource(item);
 const Icon=KIND_ICON[item.kind];
 const copyText=item.text||item.url||item.title;
 const copy=async e=>{e.stopPropagation();try{await navigator.clipboard.writeText(copyText);setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{}};
 const download=async e=>{
  e.stopPropagation();
  const buf=await api.getFile(item.fileId);if(!buf)return;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:item.mime}));a.download=item.title;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 };
 const prog=item.progress,mins=readMinutes(item);
 return (
  <article className={'card k-'+item.kind+(item.favorite?' is-fav':'')+(mode==='trash'?' in-trash':'')+(bulk&&bulk.on?' sel-host':'')}>
   {bulk&&<SelectMark bulk={bulk} id={item.id}/>}
   <Thumb item={item} onOpen={onOpen}/>
   {['link','youtube','instagram'].includes(item.kind)&&<div className="card-brand"><BrandChip item={item}/>{item.favorite&&mode!=='trash'&&<Star className="fav-badge" size={14} weight="fill"/>}</div>}
   <div className="card-body">
    {!['link','youtube','instagram'].includes(item.kind)&&<span className="kind">{item.favorite&&mode!=='trash'&&<Star className="fav-badge" size={12} weight="fill"/>}{LABEL[item.kind]||item.kind}</span>}
    {item.kind==='link'
     ?<>{item.page&&<h4>{item.page}</h4>}{item.description&&<p className="desc">{item.description}</p>}<span className="muted url">{item.url.replace(/^https?:\/\/(www\.)?/,'')}</span></>
     :<h4>{item.title}</h4>}
    {item.author&&<span className="muted">{item.author}</span>}
    {item.url&&item.kind!=='link'&&<span className="muted url">{item.url.replace(/^https?:\/\/(www\.)?/,'')}</span>}
    {item.note&&<span className="muted warn">{item.note}</span>}
    {item.kind==='code'&&<CodeBlock item={item} onLang={l=>onLang(item,l)}/>}
    {item.kind==='text'&&<p className="snippet" onClick={()=>onOpen(item)}>{item.text||'Open to read'}</p>}
    {item.kind==='md'&&<p className="snippet md" onClick={()=>onOpen(item)}>{(item.text||'').replace(/[#*_`>\-]/g,'').slice(0,220)||'Open to read'}</p>}
    {item.kind==='audio'&&src&&<audio controls src={src} preload="none"/>}
    {item.kind==='pdf'&&<div className="doc-row" onClick={()=>go('pdfs',item.id)}><span className="doc-icon"><FilePdf size={30} weight="duotone"/></span><span className="muted">{fmtSize(item.size)}{prog?` · page ${prog.page} of ${prog.total}`:''}</span>{prog&&<span className="mini-bar"><i style={{width:Math.round(prog.page/prog.total*100)+'%'}}/></span>}</div>}
    {Icon&&!['pdf','text','md'].includes(item.kind)&&item.kind!=='audio'&&item.kind!=='video'&&<span className="muted"><Icon size={13}/> {fmtSize(item.size)}</span>}
    <div className="card-cta">
     {item.kind==='pdf'&&<button className="cta" onClick={()=>go('pdfs',item.id)}><BookOpen size={14}/>{prog?'Continue reading':'Read'}</button>}
     {(item.kind==='md'||item.kind==='text')&&<button className="cta" onClick={()=>onOpen(item)}><BookOpen size={14}/>Read</button>}
     {item.kind==='link'&&item.content&&<button className="cta" onClick={()=>onOpen(item)}><BookOpen size={14}/>Read text</button>}
     {mode!=='trash'&&item.toRead&&<button className="cta" onClick={e=>{e.stopPropagation();onRead(item);}}><CheckCircle size={14}/>Mark read</button>}
     {mins>0&&<span className="muted mins">{mins} min read</span>}
    </div>
   </div>
   {mode==='trash'
    ?<div className="card-actions always">
      <span className="muted tleft">{daysLeft(item)}d left</span>
      <RestoreButton onClick={()=>onRestore(item)}/>
      <button className="icon-btn danger" aria-label="Delete forever" onClick={e=>{e.stopPropagation();onPurge(item);}}><Trash size={15}/></button>
     </div>
    :<div className="card-actions">
     {item.remindAt&&<span className="muted remind-note"><Bell size={12} weight="fill"/>{remindLabel(item.remindAt)}</span>}
     <FavButton on={item.favorite} onClick={()=>onFav(item)}/>
     <button className={'icon-btn'+(item.folder?' on':'')} aria-label="Move to folder" onClick={e=>{e.stopPropagation();onMenu('folder',item,e);}}><FolderSimple size={15} weight={item.folder?'fill':'regular'}/></button>
     <button className={'icon-btn'+(item.remindAt?' on':'')} aria-label="Remind me" onClick={e=>{e.stopPropagation();onMenu('remind',item,e);}}><Bell size={15} weight={item.remindAt?'fill':'regular'}/></button>
     <button className={'icon-btn queue'+(item.toRead?' on':'')} aria-label={item.toRead?'Remove from reading list':'Read later'} onClick={e=>{e.stopPropagation();onQueue(item);}}><BookOpenText size={15} weight={item.toRead?'fill':'regular'}/></button>
    {item.url&&<button className="icon-btn" aria-label="Open in browser" onClick={e=>{e.stopPropagation();onOpened(item);api.openExternal(item.url);}}><ArrowUpRight size={15}/></button>}
    {item.fileId&&!['image'].includes(item.kind)&&<button className="icon-btn" aria-label="Save a copy" onClick={download}><DownloadSimple size={15}/></button>}
    {copyText&&<button className="icon-btn" aria-label="Copy" onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>}</button>}
    <button className="icon-btn danger" aria-label="Delete" onClick={e=>{e.stopPropagation();onDelete(item);}}><Trash size={15}/></button>
   </div>}
  </article>
 );
}

// Full-size viewer for images, video, markdown, text and saved web pages.
function Viewer({item,onClose}){
 const src=useSource(item);
 const text=useFileText(item.kind==='md'||item.kind==='text'?item.fileId:null,item.kind==='link'?item.content:item.text);
 useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[onClose]);
 let body=null;
 if(item.kind==='image')body=src&&<img className="v-img" src={src} alt=""/>;
 else if(item.kind==='video')body=src&&<video className="v-video" src={src} controls autoPlay/>;
 else if(item.kind==='md')body=<div className="reader md" dangerouslySetInnerHTML={{__html:mdToHtml(text)}}/>;
 else if(item.kind==='link')body=<div className="reader">{text.split('\n\n').map((p,i)=>p.startsWith('## ')?<h3 key={i}>{p.slice(3)}</h3>:<p key={i}>{p}</p>)}</div>;
 else body=<pre className="reader plain">{text}</pre>;
 const dark=item.kind==='image'||item.kind==='video';
 return (
  <div className={'viewer'+(dark?' dark':'')} onClick={onClose}>
   <div className={'viewer-card'+(dark?' media':'')} onClick={e=>e.stopPropagation()}>
    <header>
     {item.kind==='link'?<BrandChip item={item}/>:<h3>{item.title}</h3>}
     <span className="spacer"/>
     {item.url&&<button className="ghost" onClick={()=>api.openExternal(item.url)}><ArrowUpRight size={15}/>Open original</button>}
     <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>
    </header>
    <div className="viewer-body">{item.kind==='link'&&item.page&&<h2 className="v-title">{item.page}</h2>}{body}</div>
   </div>
  </div>
 );
}

export function Saved({go,focusId}){
 const [items,setItems]=useCollection('saved'),[folders,setFolders]=useCollection('folders');
 const [folder,setFolder]=useState('all'),[menu,setMenu]=useState(null),[custom,setCustom]=useState(null);
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[draft,setDraft]=useState(''),[view,setView]=useState(null),[over,setOver]=useState(false),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState('all');
 const depth=useRef(0);
 // Anything that has sat in Trash for 30 days is removed for good.
 useEffect(()=>{if(items.some(i=>expired(i))){items.filter(i=>expired(i)).forEach(i=>i.fileId&&api.delFile(i.fileId));setItems(l=>l.filter(i=>!expired(i)));}},[items.length]);

 const add=async records=>{
  if(!records.length)return;
  setBusy(true);
  try{await api.addSaved(records);const d=await api.load();setItems(d.saved);}finally{setBusy(false);}
 };
 useEffect(()=>{
  // Paste anywhere outside a text field to save it.
  const onPaste=async e=>{
   if(e.target.closest?.('input,textarea,select,[contenteditable]'))return;
   const dt=e.clipboardData;
   if((dt?.files?.length)||dt?.getData('text/plain')){e.preventDefault();add(await ingest(dt));}
  };
  window.addEventListener('paste',onPaste);
  return()=>window.removeEventListener('paste',onPaste);
 },[]);
 const tabCounts=useMemo(()=>modeCounts(items),[items]);
 const inTab=useMemo(()=>items.filter(i=>inMode(i,mode)),[items,mode]);
 const counts=useMemo(()=>inTab.reduce((c,i)=>{c[i.kind]=(c[i.kind]||0)+1;if(i.toRead)c.toread=(c.toread||0)+1;if(!i.openedAt&&!i.progress)c.unopened=(c.unopened||0)+1;return c;},{}),[inTab]);
 const shown=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return inTab.filter(i=>(filter==='all'||(filter==='toread'?!!i.toRead:filter==='unopened'?!i.openedAt&&!i.progress:i.kind===filter))&&(folder==='all'||(folder==='none'?!i.folder:i.folder===folder))&&(!q||[i.title,i.url,i.text,i.author,i.brand,i.page,i.description].some(v=>v&&String(v).toLowerCase().includes(q))));
 },[inTab,filter,query,folder]);
 const bulk=useBulk();
 useEffect(()=>{bulk.clear();},[mode,filter,query]);
 // Many at once: to Trash (they can be brought back), and in Trash, back out or gone for good.
 const bulkTrash=ids=>{setItems(l=>l.map(x=>ids.includes(x.id)?{...x,deleted:Date.now()}:x));bulk.stop();};
 const bulkRestore=ids=>{setItems(l=>l.map(x=>ids.includes(x.id)?{...x,deleted:undefined}:x));bulk.stop();};
 const bulkPurge=ids=>{items.filter(i=>ids.includes(i.id)&&i.fileId).forEach(i=>api.delFile(i.fileId));setItems(l=>l.filter(x=>!ids.includes(x.id)));bulk.stop();};
 const patchItem=(item,change)=>setItems(l=>l.map(x=>x.id===item.id?{...x,...change}:x));
 const del=item=>patchItem(item,{deleted:Date.now()});
 const fav=item=>patchItem(item,{favorite:!item.favorite});
 const queue=item=>patchItem(item,{toRead:!item.toRead,queuedAt:Date.now(),readAt:undefined});
 const markRead=item=>patchItem(item,{toRead:false,readAt:Date.now()});
 const restore=item=>patchItem(item,{deleted:undefined});
 const purge=item=>{if(item.fileId)api.delFile(item.fileId);setItems(l=>l.filter(x=>x.id!==item.id));};
 const emptyTrash=()=>{items.filter(i=>i.deleted&&i.fileId).forEach(i=>api.delFile(i.fileId));setItems(l=>l.filter(x=>!x.deleted));};
 const setLang=(item,lang)=>setItems(l=>l.map(x=>x.id===item.id?{...x,lang}:x));
 const submit=async e=>{e.preventDefault();const text=draft;setDraft('');await add(await ingestText(text));};
 const onDrop=async e=>{e.preventDefault();depth.current=0;setOver(false);add(await ingest(e.dataTransfer));};
 const pick=async()=>{await api.pickFiles('any');const d=await api.load();setItems(d.saved);};
 const opened=item=>{if(!item.openedAt)patchItem(item,{openedAt:Date.now()});};
 const open=item=>{opened(item);if(item.kind==='pdf')go('pdfs',item.id);else setView(item);};
 const openMenu=(kind,item,e)=>{const r=e.currentTarget.getBoundingClientRect();setMenu({kind,ids:[item.id],x:r.right,y:r.bottom,current:item.folder,remindAt:item.remindAt});};
 const moveTo=(ids,id)=>{setItems(l=>l.map(x=>ids.includes(x.id)?{...x,folder:id||undefined}:x));setMenu(null);bulk.stop();};
 const remindAt=(ids,at)=>{setItems(l=>l.map(x=>ids.includes(x.id)?{...x,remindAt:at||undefined}:x));setMenu(null);};
 const newFolder=(ids,name)=>{const t=name.trim().slice(0,40);if(!t)return;const found=folders.find(f=>f.name.toLowerCase()===t.toLowerCase());const f=found||{id:crypto.randomUUID(),name:t,created:Date.now()};if(!found)setFolders(l=>[...l,f]);moveTo(ids,f.id);};
 useEffect(()=>{if(!focusId)return;const it=items.find(i=>i.id===focusId);if(it){if(it.deleted)setMode('trash');open(it);}},[focusId,items.length]);

 return (
  <div className={'saved'+(over?' over':'')} onDragEnter={e=>{e.preventDefault();depth.current++;setOver(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={()=>{if(--depth.current<=0)setOver(false);}} onDrop={onDrop}>
   <div className="saved-head">
    <div><h2>Saved</h2></div>
    <label className="search wide"><MagnifyingGlass size={15}/><input placeholder="Search saved" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <SelectToggle bulk={bulk} disabled={!shown.length}/>
   </div>
   <form className="quick-add" onSubmit={submit}>
    <BookmarkSimple size={16}/>
    <input placeholder="Paste a link, snippet or note and press Enter" value={draft} onChange={e=>setDraft(e.target.value)}/>
    {isNativePick&&<button type="button" className="ghost" onClick={pick}><Plus size={14}/>Add files</button>}
    <button className="primary small" disabled={!draft.trim()||busy}>{busy?'Saving':'Save'}</button>
   </form>
   <ShelfTabs mode={mode} setMode={m=>{setMode(m);setFilter('all');}} counts={tabCounts} onEmpty={emptyTrash}/>
   {mode==='trash'&&<p className="muted trash-note">{trashNote(mode)}</p>}
   <FolderBar folders={folders} setFolders={setFolders} items={inTab} current={folder} setCurrent={setFolder} onDeleted={id=>setItems(l=>l.map(x=>x.folder===id?{...x,folder:undefined}:x))}/>
   <div className="chips-row">
    {FILTERS.filter(f=>f==='all'||counts[f]).map(f=>(
     <button key={f} className={'filter'+(filter===f?' on':'')} onClick={()=>setFilter(f)}>{LABEL[f]}<em>{f==='all'?inTab.length:counts[f]}</em></button>
    ))}
   </div>
   {bulk.on&&(mode==='trash'
    ?<BulkBar bulk={bulk} ids={shown.map(i=>i.id)} noun="item" deleteLabel="Delete forever" confirmDelete onDelete={bulkPurge}><button className="bulk-act" disabled={!bulk.count} onClick={()=>bulkRestore([...bulk.sel])}>Restore</button></BulkBar>
    :<BulkBar bulk={bulk} ids={shown.map(i=>i.id)} noun="item" deleteLabel="Move to Trash" onDelete={bulkTrash}><button className="bulk-act" disabled={!bulk.count} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setMenu({kind:'folder',ids:[...bulk.sel],x:r.right,y:r.bottom});}}>Move to folder</button></BulkBar>)}
   <div className="cards">
    {shown.map(i=><Card bulk={bulk} key={i.id} item={i} mode={mode} onMenu={openMenu} onOpened={opened} onDelete={del} onFav={fav} onQueue={queue} onRead={markRead} onRestore={restore} onPurge={purge} onOpen={open} onLang={setLang} go={go}/>)}
   </div>
   {!shown.length&&<div className="empty-state">
    <BookmarkSimple size={34} weight="light"/>
    <h3>{mode==='trash'?'Trash is empty':mode==='fav'?'No favorites yet':items.some(i=>!i.deleted)?'Nothing matches':'Nothing saved yet'}</h3>
    <p className="muted">{mode==='trash'?'Deleted items wait here for 30 days so you can bring them back.':mode==='fav'?'Tap the star on anything you want to keep close.':'Videos, reels, PDFs, markdown, audio, images, code, web pages. Drop them on the notch and they land here, sorted.'}</p>
   </div>}
   {menu&&<PickMenu menu={menu} folders={folders} onClose={()=>setMenu(null)} onFolder={id=>moveTo(menu.ids,id)} onRemind={at=>{if(at==='custom'){setCustom({ids:menu.ids,at:menu.remindAt});setMenu(null);}else remindAt(menu.ids,at);}} onNewFolder={n=>newFolder(menu.ids,n)}/>}
   {custom&&<CustomRemind initial={custom.at} onClose={()=>setCustom(null)} onSet={at=>{remindAt(custom.ids,at);setCustom(null);}}/>}
   {over&&<div className="drop-veil"><span>Drop to save</span></div>}
   {view&&<Viewer item={items.find(x=>x.id===view.id)||view} onClose={()=>setView(null)}/>}
  </div>
 );
}
const isNativePick=typeof window!=='undefined'&&!!window.workspace;
