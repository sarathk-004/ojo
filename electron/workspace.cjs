const {BrowserWindow,ipcMain,screen,shell,dialog,nativeImage,net,Notification,globalShortcut}=require('electron');
const {fileURLToPath}=require('node:url');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const quiet=require('./quiet.cjs');
const COLLECTIONS=['notes','events','saved','pdfs','finance','budgets','jobs','settings','reminders','nudgelog','bills','focus','wins','reviews','folders','projects','boards'];
const MAX_FILE=200*1024*1024;
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'};
const decode=s=>s.replace(/&(#x?[0-9a-f]+|\w+);/gi,(m,e)=>{
 if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return Number.isFinite(n)&&n>0&&n<0x110000?String.fromCodePoint(n):m;}
 return ENT[e.toLowerCase()]??m;
});
const strip=s=>decode(s.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
// Pulls the readable text (headings, paragraphs, lists, quotes) out of an HTML page.
function readable(html){
 let h=html.replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
 const scope=(h.match(/<article[\s\S]*?<\/article>/i)||h.match(/<main[\s\S]*?<\/main>/i)||[h])[0];
 const out=[];
 scope.replace(/<(h[1-3]|p|li|blockquote|pre)[^>]*>([\s\S]*?)<\/\1>/gi,(m,tag,inner)=>{
  const t=strip(inner);
  if(!t||(tag.toLowerCase()==='p'&&t.length<25))return m;
  out.push(/^h/i.test(tag)?'## '+t:tag.toLowerCase()==='li'?'• '+t:t);return m;
 });
 const text=out.join('\n\n');
 return text.length<200?'':text.slice(0,80000);
}
module.exports=function workspace({root,userData,getTasks,addTask,aumid,resetTasks}){
 const dir=path.join(userData,'Workspace'),files=path.join(dir,'files'),db=path.join(dir,'workspace.json');
 fs.mkdirSync(files,{recursive:true});
 let data={notes:[],events:[],saved:[],pdfs:[],finance:[],budgets:[],jobs:[],settings:[],reminders:[],nudgelog:[],bills:[],focus:[],wins:[],reviews:[],folders:[],projects:[],boards:[]},win,notch,timer,classify;
 const classifyReady=import('../src/workspace/classify.mjs').then(m=>{classify=m;});
 try{data={...data,...JSON.parse(fs.readFileSync(db,'utf8'))};}catch{}
 // PDFs now live in Save later; fold in any from the earlier PDFs-only library.
 if(data.pdfs.length){
  data.saved=[...data.pdfs.map(p=>({id:p.id,kind:'pdf',title:p.name,fileId:p.fileId,mime:'application/pdf',size:p.size,created:p.added})),...data.saved];
  data.pdfs=[];
 }
 // AI features were removed: forget any API keys, model choices and generated summaries kept by earlier versions.
 {
  let dirty=false;
  const st=data.settings&&data.settings[0];
  if(st){for(const k of ['aiProvider','aiKeys','aiModels','aiLocal','localModel','anthropicKey','openrouterKey'])if(k in st){delete st[k];dirty=true;}}
  data.saved=data.saved.map(s=>{if(s.summary){const {summary,...rest}=s;dirty=true;return rest;}return s;});
  if(dirty)setTimeout(()=>{try{fs.writeFileSync(db+'.tmp',JSON.stringify(data),'utf8');fs.renameSync(db+'.tmp',db);}catch{}},0);
 }
 for(const f of ['news.json','digests.json'])try{fs.unlinkSync(path.join(dir,f));}catch{}
 const write=()=>{try{fs.writeFileSync(db+'.tmp',JSON.stringify(data),'utf8');fs.renameSync(db+'.tmp',db);}catch(e){console.error('workspace persist',e);}};
 const persist=()=>{clearTimeout(timer);timer=setTimeout(write,150);};
 const flush=()=>{clearTimeout(timer);write();};
 const fileId=id=>typeof id==='string'&&/^[\w-]{8,64}$/.test(id)?path.join(files,id):null;
 const broadcast=name=>{for(const w of [win,notch])if(w&&!w.isDestroyed())w.webContents.send('ws-changed',{name,items:data[name]});};
 const webPrefs={preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true};
 const page=(w,name)=>w.loadFile(path.join(root,'dist/client/'+name+'.html'));
 // The icon lives as a real file outside the archive: Windows needs a path it can open for the taskbar.
 const iconPath=(()=>{const outside=path.join(process.resourcesPath||'','ojo.ico');return fs.existsSync(outside)?outside:path.join(root,'public/brand/ojo.ico');})();
 const icon=()=>iconPath;
 function open(section,itemId){
  if(win&&!win.isDestroyed()){
   if(win.isMinimized())win.restore();
   win.show();win.focus();
   if(section)win.webContents.send('ws-section',{section,itemId});
   return;
  }
  win=new BrowserWindow({width:1240,height:800,minWidth:960,minHeight:620,title:'ojo workspace',icon:icon(),backgroundColor:'#f3f0e9',autoHideMenuBar:true,show:false,titleBarStyle:'hidden',titleBarOverlay:{color:'#f3f0e9',symbolColor:'#252923',height:40},webPreferences:webPrefs});
  win.setMenuBarVisibility(false);
  win.setIcon(iconPath);
  // Tells the taskbar which icon, name and relaunch command belong to this window, so it never falls back to a generic app icon.
  try{win.setAppDetails({appId:aumid||'com.tnkr.workspace',appIconPath:iconPath,appIconIndex:0});}catch(err){console.error('setAppDetails',err.message);}
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(e,url)=>{
   // Only ojo's own pages may load in this window (it has the app bridge); web links open in the browser, anything else is refused.
   const own=url.startsWith('file:')&&(()=>{try{return path.resolve(fileURLToPath(url)).toLowerCase().startsWith(path.resolve(root,'dist','client').toLowerCase());}catch{return false;}})();
   if(own)return;
   e.preventDefault();if(/^https?:/i.test(url))shell.openExternal(url);
  });
  win.once('ready-to-show',()=>{win.show();if(section)setTimeout(()=>win&&!win.isDestroyed()&&win.webContents.send('ws-section',{section,itemId}),400);});
  win.on('closed',()=>{win=null;});
  page(win,'workspace');
 }
 // The notch lives tucked into the top edge: it slides out when the cursor rests at the top centre
 // (or something is dragged there) and retracts again. The window is ONE fixed size and never resizes,
 // because resizing a transparent window is what made the animation jump. Only the pill inside is
 // animated, and the transparent area around it lets clicks through to whatever is underneath.
 const SIZE_H={w:420,h:300},SIZE_V={w:290,h:350};
 // On the top and bottom the pill is wide; on the left and right it is the same thing stood on end.
 const RECT_H={peek:{w:132,h:26},intro:{w:360,h:128},open:{w:400,h:166}};
 const RECT_V={peek:{w:30,h:132},intro:{w:160,h:330},open:{w:170,h:236}};
 // The first time ojo runs, the notch introduces itself so people know it is there.
 const introFlag=path.join(dir,'.notch-intro-ojo');
 const introPending=()=>!fs.existsSync(introFlag);
 let lift=0,downAt=0,mode='hidden',hot=0,away=0,outside=0,poll,graceUntil=0,target=null,ignoring=null,needLeave=false,hideTimer=null;
 const alive=()=>notch&&!notch.isDestroyed();
  // Where the notch lives: one screen edge and a position along it (0 to 1). The person can drag it to any edge;
 // it opens away from that edge, so it always comes into the screen. The window is the same size everywhere.
 const placeFile=path.join(dir,'notch-place.json');
 let place={edge:'top',pos:.5},moving=null,lastMoveEnd=0,moveTimer=null;
 try{const p=JSON.parse(fs.readFileSync(placeFile,'utf8'));if(['top','bottom','left','right'].includes(p.edge)&&Number.isFinite(p.pos))place={edge:p.edge,pos:Math.max(0,Math.min(1,p.pos))};}catch{}
 const savePlace=()=>{try{fs.writeFileSync(placeFile,JSON.stringify(place));}catch{}};
 const horizontal=()=>place.edge==='top'||place.edge==='bottom';
 const clampN=(n,a,b)=>Math.max(a,Math.min(n,b));
 // The window overhangs the screen edge by a few pixels so no sliver of desktop can show between the pill and the edge.
 const OVER=6;let rawShift=0;
 function notchBounds(d){
  const a=(d||target||screen.getPrimaryDisplay()).bounds,{w,h}=horizontal()?SIZE_H:SIZE_V;
  let x,y;
  if(horizontal()){const c=a.x+place.pos*a.width;x=clampN(c-w/2,a.x,a.x+a.width-w);rawShift=c-(x+w/2);y=place.edge==='top'?a.y-OVER:a.y+a.height-h+OVER;}
  else{const c=a.y+place.pos*a.height;y=clampN(c-h/2,a.y,a.y+a.height-h);rawShift=c-(y+h/2);x=place.edge==='left'?a.x-OVER:a.x+a.width-w+OVER;}
  return {x:Math.round(x),y:Math.round(y),width:w,height:h};
 }
 // The pill sits in the middle of its window; near a corner it slides along the edge, as far as the window allows for its current size.
 const pillSize=m=>{const r=(horizontal()?RECT_H:RECT_V)[m]||(horizontal()?RECT_H:RECT_V).peek;return horizontal()?{w:r.w,h:r.h+OVER}:{w:r.w+OVER,h:r.h};};
 function shiftFor(m,nb){const s=pillSize(m),room=horizontal()?(nb.width-s.w)/2:(nb.height-s.h)/2;return clampN(rawShift,-room,room);}
 // The visible pill inside the window, for hit tests. The resting pill is a thin tab: wide on top and bottom, tall on the sides.
 function pillRect(m,nb){
  const s=pillSize(m),pw=s.w,ph=s.h,sh=shiftFor(m,nb);
  const x=horizontal()?nb.x+(nb.width-pw)/2+sh:place.edge==='left'?nb.x:nb.x+nb.width-pw;
  const y=!horizontal()?nb.y+(nb.height-ph)/2+sh:place.edge==='top'?nb.y:nb.y+nb.height-ph;
  return {x,y,w:pw,h:ph};
 }
 // How far the cursor is from the notch's spot on the edge (across it, and along it).
 function edgeDistance(p,d){
  // The notch sits just inside the usable area (above a taskbar, for example). The taskbar itself counts as the edge,
  // so resting the cursor on it summons the notch.
  const b=d.bounds,wa=d.bounds,nb=notchBounds(d),mid=horizontal()?nb.x+nb.width/2+rawShift:nb.y+nb.height/2+rawShift;
  const e=place.edge,limit=(e==='top'?wa.y-b.y:e==='bottom'?b.y+b.height-(wa.y+wa.height):e==='left'?wa.x-b.x:b.x+b.width-(wa.x+wa.width))+2;
  if(horizontal())return {perp:e==='top'?p.y-b.y:b.y+b.height-1-p.y,along:Math.abs(p.x-mid),limit};
  return {perp:e==='left'?p.x-b.x:b.x+b.width-1-p.x,along:Math.abs(p.y-mid),limit};
 }
 // Right-clicking the notch opens a small panel inside the notch (ojo's own UI) listing what was saved last.
 let recent=null,recentRects=[],recentTimer=null,recentAway=0,lastContext=0;
 const recentItems=()=>(data.saved||[]).filter(i=>!i.deleted).sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,5)
  .map(i=>({id:i.id,kind:i.kind,title:String(i.page||i.title||i.text||i.url||'Untitled').replace(/\s+/g,' ').trim().slice(0,70),host:String(i.host||i.url||'').replace(/^https?:\/\/(www\.)?/,'').split('/')[0].slice(0,40)}));
 function openRecent(){
  if(!alive()||recent||quiet.isQuiet()||Date.now()-lastContext<400||mode==='ask')return;
  lastContext=Date.now();
  recent={prev:mode};recentRects=[];recentAway=0;
  mode='recent';hot=0;away=0;outside=0;showNotch();setIgnore(false);
  notch.webContents.send('ws-notch-recent',{items:recentItems(),edge:place.edge});
  clearTimeout(recentTimer);recentTimer=setTimeout(()=>closeRecent(),14000);
 }
 function closeRecent(openId){
  if(!recent)return;
  recent=null;recentRects=[];clearTimeout(recentTimer);
  notch.webContents.send('ws-notch-recent',null);
  graceUntil=Date.now()+1500;needLeave=false;mode='peek';setIgnore(true);tellNotch('peek');
  if(openId==='__saved')open('saved');else if(openId)open('saved',openId);
 }
 ipcMain.handle('ws-notch-context',()=>{openRecent();return true;});
 ipcMain.handle('ws-notch-recent-pick',(_,id)=>{closeRecent(id||null);return true;});
 ipcMain.handle('ws-notch-recent-rects',(_,list)=>{if(recent)recentRects=Array.isArray(list)?list.filter(r=>r&&Number.isFinite(r.x)):[];return true;});
 // Notifications wait while quiet mode is on and appear (at most a few) when it ends.
 const heldNotes=[];
 const notify=n=>{if(quiet.isQuiet()){heldNotes.push(n);if(heldNotes.length>8)heldNotes.shift();}else{try{n.show();}catch{}}};
 quiet.onChange(s=>{
  if(s.quiet){
   try{globalShortcut.unregisterAll();}catch{}
   if(cap&&!cap.isDestroyed())cap.hide();
   if(nudgeToast&&!nudgeToast.isDestroyed())nudgeToast.hide();
   if(alive()&&notch.isVisible()){mode='hidden';ignoring=null;notch.hide();}
  }else{
   registerShortcuts();
   if(alive()){notch.showInactive();ignoring=null;setIgnore(true);raiseNotch();}
   for(const n of heldNotes.splice(0))try{n.show();}catch{}
  }
  for(const x of [win])if(x&&!x.isDestroyed())x.webContents.send('ws-quiet',s);
 });
 ipcMain.handle('ws-quiet-get',()=>quiet.info());
 ipcMain.handle('ws-quiet-set',(_,what)=>{
  if(what&&typeof what==='object'&&'auto' in what)return quiet.setAuto(what.auto);
  return quiet.set(what==='off'||what==='tomorrow'?what:Math.min(24,Math.max(1,Number(what)||1)));
 });
 // Brings the notch out right now, on the display the cursor is on, and keeps it out for a few seconds so it can be found.
 function revealNow(){if(!alive()||quiet.isQuiet())return;target=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());graceUntil=Date.now()+7000;needLeave=false;applyMode('peek');tellNotch('peek');}
 function tellEdge(){if(alive())notch.webContents.send('ws-notch-edge',{...place,shift:rawShift});}
 const buttonDown=()=>downAt>0&&Date.now()-downAt<30000;
 function setIgnore(v){if(alive()&&ignoring!==v){ignoring=v;notch.setIgnoreMouseEvents(v);}}
 function tellNotch(m){if(alive())notch.webContents.send('ws-notch-mode',m);}
 function showNotch(){
  clearTimeout(hideTimer);
  const fresh=!notch.isVisible();
  if(fresh){
   notch.setBounds(notchBounds());
   ignoring=null;setIgnore(true);
   notch.showInactive();
  }else{
   // The window stays on screen (click-through and empty) so its place in the stack never changes mid-drag.
   const nb=notchBounds(),cb=notch.getBounds();
   if(nb.x!==cb.x||nb.y!==cb.y||nb.width!==cb.width||nb.height!==cb.height)notch.setBounds(nb);
  }
  // While a mouse button is held (a file being dragged), leave the stacking alone: the file's drag image is its own
  // always-on-top window, and raising the notch above it would hide the file under the notch.
  if(fresh||!buttonDown())raiseNotch();
 }
 // Hiding and showing can drop the always-on-top flag on Windows, and Electron skips re-applying a
 // flag it believes is already set, so switch it off and back on to force the window to the top.
 function raiseNotch(){
  notch.setAlwaysOnTop(false);
  notch.setAlwaysOnTop(true,'screen-saver');
  notch.moveTop();
 }
 // Renderer-driven: 'peek' (the small pill), 'open' (drop target in use) or 'hidden' (retracted).
 function applyMode(m){
  if(!alive())return;
  if(m==='panel')m='open';
  if(quiet.isQuiet()&&m!=='hidden')return;
  if((mode==='ask'||mode==='recent')&&m!=='ask')return;
  if(m!=='peek'&&m!=='open'&&m!=='hidden'&&m!=='intro')return;
  mode=m;hot=0;away=0;outside=0;
  if(m==='hidden'){
   needLeave=true;
   clearTimeout(hideTimer);
   // Give the retract animation time to finish before the window goes away.
   hideTimer=setTimeout(()=>{if(mode==='hidden'&&alive())setIgnore(true);},520);
   return;
  }
  showNotch();
 }
 function createNotch(){
  notch=new BrowserWindow({...notchBounds(),frame:false,transparent:true,backgroundColor:'#00000000',thickFrame:false,roundedCorners:false,resizable:false,movable:false,minimizable:false,maximizable:false,skipTaskbar:true,alwaysOnTop:true,focusable:false,hasShadow:false,show:false,webPreferences:webPrefs});
  notch.webContents.on('will-navigate',e=>e.preventDefault());
  notch.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  // Greets you with the logo for a couple of seconds on launch, then tucks away.
  page(notch,'notch').then(()=>{
   tellEdge();applyMode('peek');graceUntil=Date.now()+2400;
   if(introPending()){
    try{fs.writeFileSync(introFlag,String(Date.now()));}catch{}
    setTimeout(()=>{if(alive()&&mode==='peek'){applyMode('intro');tellNotch('intro');}},900);
   }
  });
  screen.on('display-metrics-changed',()=>{if(alive()&&notch.isVisible()){notch.setBounds(notchBounds());tellEdge();}});

  poll=setInterval(()=>{
   if(!alive())return;
   const p=screen.getCursorScreenPoint(),d=screen.getDisplayNearestPoint(p),ed=edgeDistance(p,d);
   if(quiet.isQuiet()){if(mode!=='hidden'||notch.isVisible()){mode='hidden';ignoring=null;try{notch.hide();}catch{}}return;}
   if(moving){away=0;outside=0;setIgnore(false);return;}
   if(mode==='ask'){away=0;setIgnore(false);return;}
   if(mode==='recent'){
    setIgnore(false);
    // Close when the cursor has been away from the panel for a moment.
    const nb=notch.getBounds(),panel=recentRects.find(r=>r.id==='panel');
    const inside=panel&&p.x>=nb.x+panel.x-30&&p.x<=nb.x+panel.x+panel.w+30&&p.y>=nb.y+panel.y-30&&p.y<=nb.y+panel.y+panel.h+30;
    recentAway=inside?0:recentAway+1;if(recentAway>=30)closeRecent();
    return;
   }
   // The taskbar is also always-on-top and can slip over the notch, so lift the notch again from time to time (never mid-drag).
   if(++lift%8===0&&!buttonDown())notch.moveTop();
   const nearTop=ed.perp<=ed.limit+6&&ed.along<=90;
   if(mode==='hidden'){
    // After retracting, the cursor must leave the top edge before it can be summoned again.
    if(needLeave&&(ed.perp>ed.limit+38||ed.along>150))needLeave=false;
    hot=(!needLeave&&nearTop)?hot+1:0;
    if(hot>=3){target=d;applyMode('peek');tellNotch('peek');}
    return;
   }
   // Only the pill itself takes the mouse; the rest of the window is click-through.
   const pr=pillRect(mode,notch.getBounds()),pad=mode==='peek'?14:8,left=pr.x-pad,right=pr.x+pr.w+pad,top=pr.y-pad,bottom=pr.y+pr.h+pad;
   const inside=p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;
   // Take the mouse the instant the cursor is on the pill, but only go click-through after it has been
   // away for a few polls, so a stale cursor reading can never swallow a click.
   outside=inside?0:outside+1;
   if(inside)setIgnore(false);
   else if(outside>=4)setIgnore(true);
   if(mode==='peek'){
    const m=28+Math.max(0,ed.limit),near=p.x>=left-m&&p.x<=right+m&&p.y>=top-m&&p.y<=bottom+m;
    away=near?0:away+1;
    if(away>=8&&Date.now()>graceUntil){tellNotch('hidden');applyMode('hidden');}
   }else if(mode==='open'&&!inside){
    // Tell the pill the cursor left, in case a drag ended without a dragleave.
    if(++away===3)tellNotch('cursor-out');
   }else away=0;
  },60);
 }
 const BROWSER_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
 // Brings a file into the workspace: a local file:// link is copied, a web link is downloaded.
 async function download(url,expect){
  const link=String(url);
  if(/^file:/i.test(link)){
   const p=fileURLToPath(link),ext=path.extname(p).toLowerCase();
   const ALLOWED=['.pdf','.md','.markdown','.txt','.csv','.png','.jpg','.jpeg','.gif','.webp','.svg','.bmp','.mp3','.wav','.m4a','.ogg','.flac','.mp4','.webm','.mov','.mkv','.docx','.pptx','.xlsx','.html','.htm','.json'];
   if(!ALLOWED.includes(ext))throw Error('That kind of file cannot be added.');
   if(path.resolve(p).toLowerCase().startsWith(path.resolve(dir).toLowerCase()))throw Error('That file is part of ojo itself.');
   const st=fs.statSync(p);
   if(!st.isFile())throw Error('That is not a file.');
   if(st.size>MAX_FILE)throw Error('That file is larger than 200 MB.');
   const id=crypto.randomUUID();fs.copyFileSync(p,fileId(id));
   return {fileId:id,size:st.size,name:path.basename(p),mime:''};
  }
  if(!/^https?:\/\//i.test(link))throw Error('Only web links and local files can be added.');
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),60000);
  try{
   // Chromium's network stack, with the headers a browser would send, so sites treat it like Chrome.
   const host=new URL(link).hostname.replace(/^\[|\]$/g,'').toLowerCase();
   if(/^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fe80:|fc|fd)/i.test(host)||host.endsWith('.local')||host.endsWith('.internal'))throw Error('Links to this computer or your local network cannot be downloaded.');
   const origin=new URL(link).origin;
   const r=await net.fetch(link,{signal:ac.signal,headers:{'user-agent':BROWSER_UA,'accept':expect==='pdf'?'application/pdf,*/*;q=0.8':'*/*','referer':origin+'/'}});
   if(!r.ok)throw Error(r.status===401||r.status===403?'The site needs you to be signed in to download this ('+r.status+').':'Download failed ('+r.status+').');
   const len=Number(r.headers.get('content-length')||0);
   if(len>MAX_FILE)throw Error('That file is larger than 200 MB.');
   const buf=Buffer.from(await r.arrayBuffer());
   if(!buf.length||buf.length>MAX_FILE)throw Error('That file is empty or too large.');
   if(expect==='pdf'&&buf.subarray(0,1024).indexOf('%PDF')<0)throw Error('That link opens a web page, not a PDF file.');
   const id=crypto.randomUUID();fs.writeFileSync(fileId(id),buf);
   let name='';try{name=decodeURIComponent(new URL(link).pathname.split('/').pop());}catch{}
   return {fileId:id,size:buf.length,name,mime:(r.headers.get('content-type')||'').split(';')[0]};
  }finally{clearTimeout(t);}
 }
 // Postings from job boards or a company's careers pages belong in the Job tracker (Wishlist), not Save later.
 function addJobs(records){
  const now=Date.now(),made=[];
  for(const r of records){
   if(data.jobs.some(j=>j.link===r.url)||made.some(j=>j.link===r.url))continue;
   const info=classify.jobFromPage({title:r.page||'',url:r.url});
   made.push({id:crypto.randomUUID(),company:info.company,role:info.role||'Job opening',location:info.location,salary:'',source:info.source,link:r.url,contact:'',notes:String(r.description||'').slice(0,600),nextStep:'',nextDate:'',priority:'Medium',status:'Wishlist',appliedDate:'',created:now,updated:now,history:[{status:'Wishlist',at:now}]});
  }
  if(made.length){data.jobs=[...made,...data.jobs];broadcast('jobs');persist();}
  return made;
 }
 function addSaved(all){
  const isJob=r=>classify&&r.kind==='link'&&r.url&&classify.isJobLink(r.url);
  const jobs=addJobs(all.filter(isJob)),records=all.filter(r=>!isJob(r));
  if(!records.length)return jobs;
  const now=Date.now();
  const keep=['kind','title','note','page','url','text','mime','size','videoId','image','author','lang','brand','sub','host','description','content'];
  const clean=records.slice(0,50).map((r,i)=>{
   const o={id:crypto.randomUUID(),created:now+i};
   for(const k of keep)if(r[k]!==undefined&&r[k]!==null)o[k]=typeof r[k]==='string'?r[k].slice(0,k==='text'||k==='content'?200000:2000):r[k];
   if(fileId(r.fileId))o.fileId=r.fileId;
   o.kind=String(o.kind||'text');o.title=String(o.title||'Untitled').slice(0,200);
   return o;
  });
  data.saved=[...clean,...data.saved];broadcast('saved');persist();
  return [...clean,...jobs];
 }
 async function importPaths(paths){
  await classifyReady;
  const records=[];
  for(const p of paths){
   try{
    const st=fs.statSync(p);
    if(!st.isFile()||st.size>MAX_FILE)continue;
    const name=path.basename(p),info=classify.classifyFile({name,type:''});
    const id=crypto.randomUUID();fs.copyFileSync(p,fileId(id));
    records.push({...info,fileId:id,size:st.size,mime:info.kind==='pdf'?'application/pdf':undefined});
   }catch(e){console.error('import failed',p,e.message);}
  }
  return records.length?addSaved(records):[];
 }
 // The person's data is theirs: they can take a copy of everything, or wipe it, from Settings.
 // Settings can replay the notch introduction.
 ipcMain.handle('ws-notch-intro',()=>{
  if(!alive())return false;
  target=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  graceUntil=Date.now()+15000;needLeave=false;
  applyMode('intro');tellNotch('intro');
  return true;
 });
 ipcMain.handle('ws-theme',(_,dark)=>{
  if(!win||win.isDestroyed())return false;
  try{win.setBackgroundColor(dark?'#1a1813':'#f3f0e9');win.setTitleBarOverlay({color:dark?'#1a1813':'#f3f0e9',symbolColor:dark?'#ece8dc':'#252923',height:40});}catch{}
  return true;
 });
 ipcMain.handle('ws-export-all',async()=>{
  const pick=await dialog.showOpenDialog(win&&!win.isDestroyed()?win:undefined,{title:'Choose where to put your ojo data',properties:['openDirectory','createDirectory']});
  if(pick.canceled||!pick.filePaths[0])return {ok:false,canceled:true};
  try{
   const out=path.join(pick.filePaths[0],'ojo-data-'+new Date().toISOString().slice(0,10));
   fs.mkdirSync(out,{recursive:true});
   const {nudgelog,...mine}=data;
   fs.writeFileSync(path.join(out,'workspace.json'),JSON.stringify(mine,null,2),'utf8');
   fs.writeFileSync(path.join(out,'tasks.json'),JSON.stringify({tasks:getTasks()},null,2),'utf8');
   if(fs.existsSync(files))fs.cpSync(files,path.join(out,'files'),{recursive:true});
   const readme=['Your ojo data, exported '+new Date().toLocaleString()+'.','workspace.json: notes, events, saved items, finance, jobs, bills, focus sessions and settings.','tasks.json: your tasks and their history.','files: images, PDFs and other files you added (named by id; workspace.json says which item each belongs to).','Nothing here was ever sent anywhere by ojo.'];
   fs.writeFileSync(path.join(out,'README.txt'),readme.join(String.fromCharCode(13,10)),'utf8');
   shell.showItemInFolder(out);
   return {ok:true,path:out};
  }catch(e){return {ok:false,error:e.message};}
 });
 ipcMain.handle('ws-erase-all',async(_,confirmed)=>{
  const r=confirmed===true?{response:1}:await dialog.showMessageBox(win&&!win.isDestroyed()?win:undefined,{type:'warning',buttons:['Cancel','Erase everything'],defaultId:0,cancelId:0,title:'Erase all data',message:'Erase everything in ojo?',detail:'All tasks, notes, saved items, PDFs, finance, jobs, bills and settings on this computer will be deleted. This cannot be undone.'});
  if(r.response!==1)return false;
  clearTimeout(timer);
  try{resyncNudges(data.reminders,[]);}catch{}
  const names=Object.keys(data);
  data=Object.fromEntries(names.map(n=>[n,[]]));
  try{fs.rmSync(files,{recursive:true,force:true});fs.mkdirSync(files,{recursive:true});}catch{}
  for(const f of ['alerts.json','news.json','digests.json'])try{fs.unlinkSync(path.join(dir,f));}catch{}
  write();
  try{resetTasks&&resetTasks();}catch(e){console.error('reset tasks',e.message);}
  for(const n of names)broadcast(n);
  return true;
 });
 ipcMain.handle('ws-load',()=>({...data,tasks:getTasks()}));
 ipcMain.handle('ws-save',(_,name,items)=>{
  if(!COLLECTIONS.includes(name)||!Array.isArray(items)||items.length>50000)throw Error('Invalid collection');
  if(name==='nudgelog')return true;
  if(name==='reminders')resyncNudges(data.reminders,items);
  if(name==='focus')return true;           // the focus log is written only by the focus timer below
  data[name]=items;persist();
  if(name==='settings'&&capRaw!==(userPrefs().captureKey||'')&&!quiet.isQuiet()){const want=userPrefs().captureKey;if(want!==undefined&&(capRaw!==want||!want)){try{if(capRaw)globalShortcut.unregister(capRaw);}catch{}capRaw='';registerShortcuts();}}
  if(name==='bills')setTimeout(()=>billsTick(),700);
  if(name==='finance'||name==='budgets')setTimeout(()=>budgetTick(),900);
  return true;
 });
 ipcMain.handle('ws-open',(_,section)=>{open(section);return true;});
 // Clicking the notch: open the workspace; click again while it is in front and it closes (the app keeps running).
 // Two sources can report the same click (the notch window and the global mouse hook), so a toggle
 // within a short window of the last one is ignored.
 let lastToggle=0;
 function toggleWorkspace(section){
  if(Date.now()-lastToggle<800)return 'ignored';
  lastToggle=Date.now();
  const showing=!!(win&&!win.isDestroyed()&&win.isVisible()&&!win.isMinimized());
  if(showing){win.close();return 'closed';}
  open(section);return 'opened';
 }
 ipcMain.handle('ws-toggle',(_,section)=>toggleWorkspace(section));
 ipcMain.handle('ws-notch-place',()=>({...place,shift:(notchBounds(),rawShift)}));
 function endMove(){
  if(!moving)return;moving=null;lastMoveEnd=Date.now();clearInterval(moveTimer);savePlace();
  // Dropped in a corner: ask whether it should sit on the top/bottom edge or on the side.
  const p=screen.getCursorScreenPoint(),d=screen.getDisplayNearestPoint(p),b=d.bounds,Z=110;
  const nearX=p.x-b.x<Z?'left':b.x+b.width-p.x<Z?'right':null,nearY=p.y-b.y<Z?'top':b.y+b.height-p.y<Z?'bottom':null;
  if(nearX&&nearY)askCorner(nearX,nearY,d);
 }
 // Dropped in a corner: the notch itself asks which edge to sit on, right there in the corner.
 let ask=null,askRects=[],askTimer=null;
 function askCorner(sideX,sideY,d){
  if(!alive()||ask)return;
  ask={sideX,sideY,d,options:[{edge:sideY,label:sideY==='top'?'Along the top':'Along the bottom'},{edge:sideX,label:sideX==='left'?'Down the left':'Down the right'}]};
  askRects=[];target=d;
  notch.setBounds(notchBounds(d));
  mode='ask';hot=0;away=0;outside=0;showNotch();setIgnore(false);
  notch.webContents.send('ws-notch-ask',{sideX,sideY,edge:place.edge,options:ask.options});
  clearTimeout(askTimer);askTimer=setTimeout(()=>chooseCorner(null),15000);
 }
 function chooseCorner(edge){
  if(!ask)return;
  const {sideX,sideY,d}=ask;ask=null;askRects=[];clearTimeout(askTimer);
  if(edge===sideX||edge===sideY){
   const a=d.bounds,tb=edge==='top'||edge==='bottom',len=tb?a.width:a.height,half=(tb?RECT_H.peek.w:RECT_V.peek.h)/2+6;
   place={edge,pos:clampN(tb?(sideX==='left'?0:1):(sideY==='top'?0:1),half/len,1-half/len)};
  }
  target=d;savePlace();
  notch.webContents.send('ws-notch-ask',null);
  if(alive()){notch.setBounds(notchBounds(d));tellEdge();}
  // Show where it landed for a moment, then tuck away as usual.
  graceUntil=Date.now()+3500;needLeave=false;mode='peek';setIgnore(true);tellNotch('peek');
 }
 ipcMain.handle('ws-notch-choose',(_,edge)=>{chooseCorner(edge);return true;});
 ipcMain.handle('ws-notch-ask-rects',(_,list)=>{if(ask)askRects=(Array.isArray(list)?list:[]).filter(r=>r&&['top','bottom','left','right',null,'keep'].includes(r.edge));return true;});
 // Drag to move: while the pill is held, the notch snaps to whichever screen edge is nearest the cursor and slides along it.
 ipcMain.handle('ws-notch-move',(_,on)=>{
  if(!alive())return false;
  if(on&&!moving){
   moving={at:Date.now()};setIgnore(false);
   clearInterval(moveTimer);
   moveTimer=setInterval(()=>{
    if(!moving||!alive()||Date.now()-moving.at>90000){clearInterval(moveTimer);moving=null;return;}
    const p=screen.getCursorScreenPoint(),d=screen.getDisplayNearestPoint(p),b=d.bounds;
    const dist={left:p.x-b.x,right:b.x+b.width-p.x,top:p.y-b.y,bottom:b.y+b.height-p.y};
    // The edge only changes when another edge is clearly closer (60 px), so near a corner it cannot flick back and forth.
    let edge=place.edge;const best=Object.keys(dist).sort((a,c)=>dist[a]-dist[c])[0];if(best!==edge&&dist[best]+60<dist[edge])edge=best;
    const side=edge==='top'||edge==='bottom',len=side?b.width:b.height,half=(side?RECT_H.peek.w:RECT_V.peek.h)/2+6;
    const pos=clampN(((side?p.x-b.x:p.y-b.y)),half,len-half)/len;
    const changed=edge!==place.edge||d!==target;
    place={edge,pos};target=d;
    const nb=notchBounds(d),cb=notch.getBounds();
    if(nb.x!==cb.x||nb.y!==cb.y||nb.width!==cb.width||nb.height!==cb.height)notch.setBounds(nb);
    tellEdge();
   },16);
  }else if(!on&&moving){
   endMove();
  }
  return true;
 });
 ipcMain.handle('ws-notch',(_,m)=>{applyMode(m===true?'open':m===false?'hidden':m);return true;});
 ipcMain.handle('ws-put-file',(_,{bytes}={})=>{
  const buf=Buffer.from(bytes);
  if(!buf.length||buf.length>MAX_FILE)throw Error('File is empty or larger than 200 MB.');
  const id=crypto.randomUUID();fs.writeFileSync(fileId(id),buf);return id;
 });
 ipcMain.handle('ws-get-file',(_,id)=>{const p=fileId(id);if(!p||!fs.existsSync(p))return null;return fs.readFileSync(p);});
 ipcMain.handle('ws-del-file',(_,id)=>{const p=fileId(id);if(p)try{fs.unlinkSync(p);}catch{}return true;});
 ipcMain.handle('ws-fetch-file',async(_,url,expect)=>{try{return await download(url,expect);}catch(e){return {error:e.message};}});
 // Makes sure a saved item has its file on disk, fetching it again from its address if it does not.
 ipcMain.handle('ws-ensure-file',async(_,itemId)=>{
  const item=data.saved.find(s=>s.id===itemId);
  if(!item)return {error:'That item is no longer saved.'};
  const p=fileId(item.fileId);
  if(p&&fs.existsSync(p))return {fileId:item.fileId};
  if(!item.url)return {error:'The stored copy is missing and there is no web address to fetch it from.'};
  try{
   const got=await download(item.url,item.kind==='pdf'?'pdf':undefined);
   item.fileId=got.fileId;item.size=got.size;if(!item.mime&&got.mime)item.mime=got.mime;delete item.note;
   broadcast('saved');persist();
   return {fileId:got.fileId};
  }catch(e){return {error:e.message};}
 });
 ipcMain.handle('ws-open-external',(_,url)=>{if(/^https?:\/\//i.test(String(url)))shell.openExternal(url);return true;});
 ipcMain.handle('ws-pick-files',async(_,kind)=>{
  const filters=kind==='pdf'?[{name:'PDF documents',extensions:['pdf']}]:[{name:'All files',extensions:['*']}];
  const r=await dialog.showOpenDialog(win&&!win.isDestroyed()?win:undefined,{title:kind==='pdf'?'Open PDFs':'Add files',filters,properties:['openFile','multiSelections']});
  if(r.canceled||!r.filePaths.length)return [];
  return (await importPaths(r.filePaths)).map(x=>x.id);
 });
 ipcMain.handle('ws-meta',async(_,url)=>{
  // Best-effort lookup. YouTube exposes oEmbed without a key; other pages are read for title, preview image and text.
  if(!/^https?:\/\//i.test(String(url)))return null;
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),6000);
  try{
   const u=new URL(url);
   if(/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)){
    const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(url),{signal:ac.signal});
    if(!r.ok)return null;
    const j=await r.json();return {title:j.title,author:j.author_name};
   }
   if(/instagram\.com$/.test(u.hostname))return null;
   const r=await fetch(url,{signal:ac.signal,headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ojo'}});
   if(!/html/i.test(r.headers.get('content-type')||''))return null;
   const html=(await r.text()).slice(0,1500000);
   const pick=re=>{const m=html.match(re);return m?decode(m[1]).trim():null;};
   return {
    title:pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)||pick(/<title[^>]*>([^<]+)/i),
    image:pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i),
    description:pick(/<meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)/i),
    content:readable(html)
   };
  }catch{return null;}finally{clearTimeout(t);}
 });
// The icon a service publishes on its own website (apple-touch-icon, then the page's icon links, then /favicon.ico).
 ipcMain.handle('ws-fetch-icon',async(_,domain)=>{
  if(!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(String(domain)))return null;
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),8000);
  const get=async u=>{const r=await fetch(u,{signal:ac.signal,headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ojo'},redirect:'follow'});return r.ok?r:null;};
  try{
   const base='https://'+domain+'/';
   const found=[];
   try{
    const page=await get(base);
    if(page&&/html/i.test(page.headers.get('content-type')||'')){
     const html=(await page.text()).slice(0,400000);
     for(const m of html.matchAll(/<link\b[^>]*>/gi)){
      const tag=m[0],rel=(tag.match(/rel=["']([^"']+)["']/i)||[])[1]||'',href=(tag.match(/href=["']([^"']+)["']/i)||[])[1];
      if(!href||!/icon/i.test(rel)||/mask-icon/i.test(rel))continue;
      const size=parseInt(((tag.match(/sizes=["'](\d+)/i)||[])[1])||'0',10);
      found.push({href,score:(/apple-touch/i.test(rel)?1000:0)+size});
     }
    }
   }catch{}
   found.sort((a,b)=>b.score-a.score);
   const urls=[...found.map(f=>{try{return new URL(f.href,base).href;}catch{return null;}}).filter(Boolean),base+'favicon.ico'];
   for(const u of urls.slice(0,5)){
    try{
     const r=await get(u);if(!r)continue;
     const type=(r.headers.get('content-type')||'').split(';')[0];
     if(!/^image\//i.test(type)&&!/\.(ico|png|svg|webp)(\?|$)/i.test(u))continue;
     const buf=Buffer.from(await r.arrayBuffer());
     if(buf.length<80||buf.length>1500000)continue;
     return {bytes:buf,type:/^image\//i.test(type)?type:(/\.svg/i.test(u)?'image/svg+xml':'image/x-icon')};
    }catch{}
   }
   return null;
  }catch{return null;}finally{clearTimeout(t);}
 });
 // ---- Repeating reminders (water, walking, stretching…): scheduled here so they fire with the workspace closed ----
 let nudges=null,nudgeToast=null,nudgeQueue=[],nudgeTimer=null;
 const nudgeReady=import('../src/workspace/nudges.mjs').then(m=>{nudges=m;});
 const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 function logFor(id){
  let l=data.nudgelog.find(x=>x.id===id);
  if(!l){l={id,nextAt:null,days:{}};data.nudgelog.push(l);}
  return l;
 }
 const countToday=id=>(data.nudgelog.find(x=>x.id===id)?.days||{})[todayKey()]||0;
 function touchLog(){persist();broadcast('nudgelog');}
 const userPrefs=()=>(data.settings[0]&&data.settings[0].prefs)||{};
 const snoozeMinutes=()=>{const m=Number(userPrefs().snooze);return [5,10,15,30,60].includes(m)?m:10;};
 function nudgePayload(){
  return nudgeQueue.map(id=>{
   const r=data.reminders.find(x=>x.id===id);
   return r?{id:r.id,name:r.name,emoji:r.emoji,goal:r.goal||0,unit:r.unit||'',count:countToday(r.id),snooze:snoozeMinutes()}:null;
  }).filter(Boolean);
 }
 function publishNudges(){
  if(!nudgeToast||nudgeToast.isDestroyed())return;
  const items=nudgePayload();
  nudgeToast.webContents.send('nudge-queue',items);
  if(!items.length)nudgeToast.hide();
 }
 async function showNudge(){
  if(!nudgeToast||nudgeToast.isDestroyed()){
   nudgeToast=new BrowserWindow({width:340,height:150,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,minimizable:false,maximizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,hasShadow:false,webPreferences:webPrefs});
   nudgeToast.webContents.setWindowOpenHandler(()=>({action:'deny'}));nudgeToast.webContents.on('will-navigate',e=>e.preventDefault());
   await page(nudgeToast,'nudge');
  }
  if(!nudgePayload().length)return;
  const a=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  // The window is tall enough for a stack of three; it is click-through-free but transparent above the cards.
  nudgeToast.setBounds({x:a.x+a.width-356,y:a.y+a.height-166,width:340,height:150});
  publishNudges();
  nudgeToast.showInactive();
  // Hiding drops the always-on-top flag on Windows and Electron skips re-applying it, so switch it off and on.
  nudgeToast.setAlwaysOnTop(false);
  nudgeToast.setAlwaysOnTop(true,'screen-saver');
  nudgeToast.moveTop();
 }
 function fireNudge(r){
  if(quiet.isQuiet())return;   // a repeater that comes due during quiet mode is simply skipped
  if(!nudgeQueue.includes(r.id))nudgeQueue.push(r.id);
  if(r.sound!==false&&userPrefs().sound!==false)shell.beep();
  showNudge().catch(e=>console.error('Reminder toast:',e));
  // An unanswered nudge quietly goes away after a while rather than piling up.
  setTimeout(()=>{if(nudgeQueue.includes(r.id)){nudgeQueue=nudgeQueue.filter(x=>x!==r.id);publishNudges();}},45000);
 }
 function nudgeTick(){
  if(!nudges)return;
  const now=Date.now();
  let changed=false;
  for(const r of data.reminders){
   if(!r.enabled)continue;
   const l=data.nudgelog.find(x=>x.id===r.id);
   const t=nudges.tick(r,l,now,countToday(r.id));
   if(t.state.nextAt!==l?.nextAt){logFor(r.id).nextAt=t.state.nextAt;changed=true;}
   if(t.fire)fireNudge(r);
  }
  if(changed)touchLog();
 }
 // When a reminder's schedule is edited (or it is switched on), forget its old "next time" so the new
 // schedule takes effect straight away; drop the history of deleted reminders.
 function resyncNudges(prev,next){
  const sched=x=>[x.every,x.from,x.to,(x.days||[]).join(),x.enabled].join('|');
  const ids=new Set(next.map(r=>r.id));
  let changed=false;
  for(const r of next){
   const p=prev.find(x=>x.id===r.id),l=data.nudgelog.find(x=>x.id===r.id);
   if((!p||sched(p)!==sched(r))&&l&&l.nextAt!=null){l.nextAt=null;changed=true;}
  }
  const kept=data.nudgelog.filter(l=>ids.has(l.id));
  if(kept.length!==data.nudgelog.length){data.nudgelog=kept;changed=true;}
  nudgeQueue=nudgeQueue.filter(id=>ids.has(id));
  if(changed)touchLog();
  setTimeout(()=>{if(nudges){data.reminders=next;nudgeTick();}},400);
 }
 function startNudges(){
  nudgeReady.then(()=>{nudgeTick();nudgeTimer=setInterval(nudgeTick,15000);});
 }
 ipcMain.handle('nudge-queue',()=>nudgePayload());
 function doNudgeAction(id,action){
  if(!nudgeQueue.includes(id))return false;
  const l=logFor(id);
  if(action==='done'){const k=todayKey();l.days[k]=(l.days[k]||0)+1;}
  if(action==='snooze')l.nextAt=Date.now()+snoozeMinutes()*60000;
  nudgeQueue=nudgeQueue.filter(x=>x!==id);
  touchLog();publishNudges();
  return true;
 }
 ipcMain.handle('nudge-action',(_,id,action)=>doNudgeAction(id,action));
 // The pop-up reports where its buttons are, so a click that Windows fails to deliver to it can still be
 // recognised from the global mouse hook (see globalClick).
 let nudgeRects=[];
 ipcMain.handle('nudge-rects',(_,rects)=>{nudgeRects=Array.isArray(rects)?rects.slice(0,6).filter(r=>r&&['done','snooze','dismiss'].includes(r.action)):[];return true;});
 function nudgeClick(pt){
  if(!nudgeToast||nudgeToast.isDestroyed()||!nudgeToast.isVisible()||!nudgeRects.length)return false;
  const b=nudgeToast.getBounds();
  const hit=nudgeRects.find(r=>pt.x>=b.x+r.x&&pt.x<=b.x+r.x+r.w&&pt.y>=b.y+r.y&&pt.y<=b.y+r.y+r.h);
  const top=nudgePayload()[0];
  if(hit&&top){doNudgeAction(top.id,hit.action);return true;}
  return false;
 }
 // Manual +1 / −1 from the Reminders page, and a test nudge.
 ipcMain.handle('ws-nudge-log',(_,id,delta)=>{
  if(!data.reminders.some(r=>r.id===id))return false;
  const l=logFor(id),k=todayKey();
  l.days[k]=Math.max(0,(l.days[k]||0)+(delta>0?1:-1));
  touchLog();return true;
 });
 ipcMain.handle('ws-nudge-test',(_,id)=>{const r=data.reminders.find(x=>x.id===id);if(r)fireNudge(r);return !!r;});
 // ---- Export a note as PDF: rendered offscreen with scripts off, then saved wherever the person chooses ----
 ipcMain.handle('ws-export-pdf',async(_,payload)=>{
  const title=String(payload&&payload.title||'Untitled').slice(0,120);
  const body=String(payload&&payload.html||'').slice(0,20*1024*1024)
   .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi,'').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,'');
  const safe=title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim()||'Untitled';
  const pick=process.env.TNKR_TEST_PDF?{filePath:process.env.TNKR_TEST_PDF}:await dialog.showSaveDialog(win&&!win.isDestroyed()?win:undefined,{title:'Export as PDF',defaultPath:safe+'.pdf',filters:[{name:'PDF',extensions:['pdf']}]});
  if(pick.canceled||!pick.filePath)return {ok:false,canceled:true};
  const w=new BrowserWindow({show:false,width:900,height:1200,webPreferences:{sandbox:true,javascript:false,contextIsolation:true}});
  try{
   const css='body{font:14px/1.6 "Segoe UI",system-ui,sans-serif;color:#252923;margin:0}h1{font-size:28px;letter-spacing:-.03em;margin:0 0 18px}h2{font-size:20px;margin:22px 0 6px}h3{font-size:16px}p{margin:6px 0}img{max-width:100%}blockquote{border-left:3px solid #c3beaf;margin:10px 0;padding:2px 14px;color:#555}.callout{background:#eef2ea;border-radius:8px;padding:10px 14px;margin:10px 0}pre{background:#f3f0e9;padding:10px 12px;border-radius:8px;white-space:pre-wrap;font:12.5px/1.5 Consolas,monospace}code{font-family:Consolas,monospace}table{border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc7b8;padding:5px 10px}th{background:#f3f0e9}ul.todo{list-style:none;padding-left:4px}ul.todo li:before{content:"\\2610  "}ul.todo li[data-done]:before{content:"\\2611  "}ul.todo li[data-done]{color:#888;text-decoration:line-through}button,.kb-grip,.kb-x,.kb-colx,.kb-del{display:none}.kb-cols{display:flex;gap:10px}.kb-col{flex:1;background:#f3f0e9;border-radius:8px;padding:8px}.kb-card{background:#fff;border:1px solid #e4dfd0;border-radius:6px;padding:4px 8px;margin:4px 0}.kb-title,.kb-name{font-weight:700}';
   const doc='<!doctype html><meta charset="utf-8"><title>'+title.replace(/</g,'&lt;')+'</title><style>'+css+'</style><h1>'+title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</h1>'+body;
   await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(doc));
   const pdf=await w.webContents.printToPDF({pageSize:'A4',printBackground:true,margins:{top:0.6,bottom:0.6,left:0.7,right:0.7}});
   fs.writeFileSync(pick.filePath,pdf);
   if(!process.env.TNKR_TEST_PDF)shell.showItemInFolder(pick.filePath);
   return {ok:true,path:pick.filePath};
  }catch(e){console.error('PDF export:',e.message);return {ok:false,error:e.message};}
  finally{w.destroy();}
 });
 // ---- Bills: a reminder before each is due, and optional automatic entries in Finance ----
 let billsMod=null;
 const billsReady=import('../src/workspace/bills.mjs').then(m=>{billsMod=m;});
 function billsTick(){
  if(!billsMod)return;
  const today=billsMod.dayStr(new Date()),sym=data.settings[0]?.currency||'₹';
  let bChanged=false,fChanged=false;
  const money=n=>sym+new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(n);
  data.bills=data.bills.map(b=>{
   if(!b||!b.active)return b;
   let cur=b;
   if(cur.auto){
    // Entered in Finance on the due date: every one that passed while the app was closed, too.
    for(let guard=0;cur.active&&cur.due<=today&&guard<14;guard++){
     const due=cur.due;
     if(!data.finance.some(x=>x.billId===cur.id&&x.date===due)){data.finance=[billsMod.billTxn(cur,due,crypto.randomUUID()),...data.finance];fChanged=true;}
     cur=billsMod.markPaid(cur,due,'');bChanged=true;
    }
   }else if(billsMod.needsNotify(cur,today)){
    if(Notification.isSupported()){
     const n=new Notification({title:cur.name+' · '+billsMod.dueLabel(cur,today).toLowerCase(),body:money(Number(cur.amount)||0)+' · '+cur.kind,icon:iconPath,silent:false});
     n.on('click',()=>open('bills'));notify(n);
    }
    cur={...cur,notified:cur.due};bChanged=true;
   }
   return cur;
  });
  if(bChanged)broadcast('bills');
  if(fChanged)broadcast('finance');
  if(bChanged||fChanged)persist();
 }
 function startBills(){billsReady.then(()=>{setTimeout(billsTick,15000);setInterval(billsTick,30*60000);});}

 // ---- Budget alerts: a notification the first time a category passes 80% and again at 100% of its monthly limit ----
 let financeMod=null;
 const financeReady=import('../src/workspace/finance.mjs').then(m=>{financeMod=m;});
 const alertsFile=path.join(dir,'alerts.json');
 let alertState={month:'',levels:{}};
 try{alertState={...alertState,...JSON.parse(fs.readFileSync(alertsFile,'utf8'))};}catch{}
 function budgetTick(){
  if(!financeMod||!data.budgets.length)return;
  const d=new Date(),month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),sym=data.settings[0]?.currency||'₹';
  if(alertState.month!==month)alertState={month,levels:{}};
  const usage=financeMod.budgetUsage(data.budgets,financeMod.summarize(data.finance.filter(t=>!t.deleted),month));
  const {alerts,next}=financeMod.alertLevels(usage,alertState.levels);
  alertState.levels=next;
  try{fs.writeFileSync(alertsFile,JSON.stringify(alertState));}catch{}
  const money=n=>sym+new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(n);
  for(const a of alerts){
   if(!Notification.isSupported())break;
   const name=financeMod.catOf(a.category).name;
   const n=new Notification({title:a.level>=100?name+' is over budget':name+': '+a.pct+'% of your budget used',body:a.level>=100?money(a.spent)+' spent of '+money(a.limit)+' this month.':money(a.limit-a.spent)+' left of '+money(a.limit)+' this month.',icon:iconPath,silent:false});
   n.on('click',()=>open('finance'));notify(n);
  }
 }
 // ---- End-of-day reminder (when switched on in Close the day) ----
 let shutdownNotified='';
 function shutdownTick(){
  const st=data.settings[0]||{},at=st.shutdownAt;
  if(!at)return;
  const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const nowHM=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(nowHM<at||st.lastShutdown===day||shutdownNotified===day)return;
  shutdownNotified=day;
  if(Notification.isSupported()){const n=new Notification({title:'Time to close your day',body:'See what you did, move what is left, and start tomorrow clean.',icon:iconPath,silent:false});n.on('click',()=>open('tasks','shutdown'));notify(n);}
 }
 // ---- Saved reminders: a reminder the user set on one item, plus one gentle weekly nudge about things never opened ----
 function savedTick(){
  const now=Date.now();let changed=false;
  for(const it of data.saved){
   if(it.remindAt&&it.remindAt<=now&&!it.deleted){
    it.remindAt=undefined;it.remindedAt=now;changed=true;
    if(Notification.isSupported()){const n=new Notification({title:'Saved for later: '+String(it.title||it.url||'an item').slice(0,80),body:'You asked ojo to remind you about this.',icon:iconPath,silent:false});n.on('click',()=>open('saved',it.id));notify(n);}
   }else if(it.remindAt&&it.deleted){it.remindAt=undefined;changed=true;}
  }
  if(changed){persist();broadcast('saved');}
  const st=data.settings[0]||{};
  if(st.savedNudge===false)return;
  const d=new Date();if(d.getHours()<10)return;
  if(st.lastSavedNudge&&now-st.lastSavedNudge<7*86400000)return;
  const waiting=data.saved.filter(i=>!i.deleted&&!i.openedAt&&!i.progress&&!i.remindAt&&now-(i.created||now)>3*86400000);
  if(waiting.length<3)return;
  if(!data.settings[0])data.settings[0]={id:'settings'};
  data.settings[0].lastSavedNudge=now;persist();broadcast('settings');
  if(Notification.isSupported()){const n=new Notification({title:waiting.length+' saved things are waiting',body:'You have not opened '+String(waiting[0].title||'one of them').slice(0,60)+' and '+(waiting.length-1)+' more. Take a look when you have a minute.',icon:iconPath,silent:false});n.on('click',()=>open('saved'));notify(n);}
 }
 function startDayTicks(){
  setTimeout(savedTick,25000);setInterval(savedTick,60000);
  financeReady.then(()=>{setTimeout(budgetTick,20000);setInterval(budgetTick,30*60000);});
  setInterval(shutdownTick,60000);
 }

 // ---- Focus timer: runs here so it keeps going with the window closed, and writes the session log ----
 let focus=null;
 const focusView=()=>focus?{taskId:focus.taskId,title:focus.title,kind:focus.kind,minutes:focus.minutes,startedAt:focus.startedAt,endsAt:focus.paused?null:focus.endsAt,paused:!!focus.paused,left:focus.paused?focus.left:Math.max(0,focus.endsAt-Date.now())}:null;
 const tellFocus=()=>{for(const w of [win])if(w&&!w.isDestroyed())w.webContents.send('ws-focus',focusView());};
 function logFocus(f,activeMs){
  const seconds=Math.round(activeMs/1000);
  if(f.kind!=='focus'||seconds<30)return;
  data.focus=[{id:crypto.randomUUID(),taskId:f.taskId||'',title:f.title||'Focus',start:f.startedAt,end:Date.now(),seconds},...data.focus].slice(0,5000);
  broadcast('focus');persist();
 }
 const activeMs=f=>f.activeMs+(f.paused?0:Date.now()-f.segStart);
 function endFocus(finished){
  if(!focus)return;
  clearTimeout(focus.timer);
  const f=focus;focus=null;
  logFocus(f,finished?f.minutes*60000:activeMs(f));
  tellFocus();
  if(finished){
   if(userPrefs().sound!==false)shell.beep();
   if(Notification.isSupported()){
    const n=new Notification({title:f.kind==='focus'?'Focus session done':'Break over',body:f.kind==='focus'?(f.title?f.title+' · ':'')+(f.minutes>=1&&Number.isInteger(f.minutes)?f.minutes+' minutes':Math.round(f.minutes*60)+' seconds')+'. Time for a break.':'Ready for the next one?',icon:iconPath,silent:false});
    n.on('click',()=>open('focus'));notify(n);
   }
  }
 }
 function startFocus({taskId,title,minutes,seconds,kind}){
  if(focus)endFocus(false);
  const secs=Math.max(5,Math.min(240*60,Math.round(Number(seconds)||(Number(minutes)||25)*60))),m=secs/60;
  const now=Date.now();
  focus={taskId:String(taskId||''),title:String(title||'').slice(0,120),kind:kind==='break'?'break':'focus',minutes:m,startedAt:now,segStart:now,activeMs:0,endsAt:now+secs*1000,paused:false,left:0};
  focus.timer=setTimeout(()=>endFocus(true),secs*1000);
  tellFocus();
 }
 ipcMain.handle('ws-focus-state',()=>focusView());
 ipcMain.handle('ws-focus-start',(_,opts)=>{startFocus(opts||{});return focusView();});
 ipcMain.handle('ws-focus-pause',(_,shownSecs)=>{
  if(focus&&!focus.paused){focus.activeMs=activeMs(focus);const real=Math.max(0,focus.endsAt-Date.now()),shown=Number(shownSecs)*1000;focus.left=real;focus.paused=true;clearTimeout(focus.timer);tellFocus();}
  return focusView();
 });
 ipcMain.handle('ws-focus-resume',()=>{
  if(focus&&focus.paused){focus.paused=false;focus.segStart=Date.now();focus.endsAt=Date.now()+focus.left;focus.timer=setTimeout(()=>endFocus(true),focus.left);tellFocus();}
  return focusView();
 });
 ipcMain.handle('ws-focus-stop',()=>{endFocus(false);return null;});
 ipcMain.handle('ws-focus-delete',(_,id)=>{data.focus=data.focus.filter(s=>s.id!==id);broadcast('focus');persist();return true;});

 // ---- Quick capture: a small box that a global shortcut opens from anywhere ----
 let cap=null,capShownAt=0,capKey='';
 const CAP_KEYS=['CommandOrControl+Shift+Space','CommandOrControl+Alt+Space','CommandOrControl+Shift+K'];
 async function ensureCapture(){
  if(cap&&!cap.isDestroyed())return;
  cap=new BrowserWindow({width:704,height:380,frame:false,transparent:true,backgroundColor:'#00000000',thickFrame:false,resizable:false,minimizable:false,maximizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,hasShadow:false,webPreferences:webPrefs});
  cap.webContents.setWindowOpenHandler(()=>({action:'deny'}));cap.webContents.on('will-navigate',e=>e.preventDefault());
  // Clicking elsewhere puts it away, but not in the instant it appears.
  cap.on('blur',()=>setTimeout(()=>{if(cap&&!cap.isDestroyed()&&Date.now()-capShownAt>500)cap.hide();},120));
  cap.on('closed',()=>{cap=null;});
  await page(cap,'capture');
 }
 function hideCapture(){if(cap&&!cap.isDestroyed())cap.hide();}
async function toggleCapture(){
  if(quiet.isQuiet())return;
  await ensureCapture();
  if(cap.isVisible()&&cap.isFocused()){cap.hide();return;}
  const a=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  cap.setBounds({x:Math.round(a.x+a.width/2-352),y:Math.round(a.y+a.height*0.14-24),width:704,height:380});
  capShownAt=Date.now();
  cap.show();cap.setAlwaysOnTop(false);cap.setAlwaysOnTop(true,'screen-saver');cap.focus();cap.webContents.focus();
  cap.webContents.send('cap-open',true);
 }
 let capRaw='';
 function registerShortcuts(){
  const want=userPrefs().captureKey;
  const keys=want&&CAP_KEYS.concat(['CommandOrControl+Alt+K','CommandOrControl+Shift+J']).includes(want)?[want,...CAP_KEYS]:CAP_KEYS;
  if(!capRaw)for(const k of keys){
   try{if(globalShortcut.register(k,()=>{toggleCapture().catch(e=>console.error('Quick capture:',e));})){capRaw=k;capKey=k.replace('CommandOrControl','Ctrl').replace(/\+/g,' + ');break;}}catch{}
  }else{try{globalShortcut.register(capRaw,()=>{toggleCapture().catch(e=>console.error('Quick capture:',e));});}catch{}}
  try{globalShortcut.register('CommandOrControl+Alt+N',revealNow);}catch{}
 }
 function startCapture(){
  if(!quiet.isQuiet())registerShortcuts();
  if(!capKey)console.error('Quick capture: no free shortcut');
  ensureCapture().catch(()=>{});
 }
 const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 ipcMain.handle('cap-task',(_,plan)=>{
  const title=String(plan&&plan.title||'').trim().slice(0,200);
  if(!title||!addTask)return false;
  addTask(title,['Today','Upcoming','Daily','Anytime'].includes(plan.view)?plan.view:'Today');return true;
 });
 ipcMain.handle('cap-note',(_,plan)=>{
  const title=String(plan&&plan.title||'').trim().slice(0,120),body=String(plan&&plan.body||'').slice(0,100000);
  if(!title&&!body)return false;
  const now=Date.now(),lines=body?body.split('\n'):[];
  const html=lines.map(l=>l.trim()?'<p>'+escapeHtml(l)+'</p>':'<p><br></p>').join('');
  const noteId=crypto.randomUUID();
  data.notes=[{id:noteId,title:title||'Quick note',html,text:body,pinned:false,parent:null,created:now,updated:now},...data.notes];
  broadcast('notes');persist();return noteId;
 });
 ipcMain.handle('cap-hide',()=>{hideCapture();return true;});
 ipcMain.handle('cap-info',()=>({key:capKey}));
 // Items dropped on the notch arrive as ready-made records and land here.
 ipcMain.handle('ws-add-saved',(_,records)=>Array.isArray(records)&&records.length?addSaved(records).length:0);
 return {
  // A left click anywhere on screen, reported by the native helper. Windows does not always deliver
  // clicks to a small overlay window while another app is in front, so a click that lands on the visible
  // pill is handled here instead.
  globalDown(){downAt=Date.now();},
  // Brings the notch out right now (tray menu): on the display the cursor is on, and it stays a while so it can be found.
  revealNotch(){revealNow();},
  // A right click on the visible notch (or its tucked-away marker) opens the recent-saves menu.
  // A right click on the visible notch (or its tucked-away marker) opens the recent-saves panel.
  globalRightClick(pt){
   if(!alive()||!notch.isVisible()||mode==='ask')return;
   if(mode==='recent'){return;}
   if(mode==='peek'||mode==='intro'){const pr=pillRect(mode,notch.getBounds());if(pt.x>=pr.x-4&&pt.x<=pr.x+pr.w+4&&pt.y>=pr.y-4&&pt.y<=pr.y+pr.h+4)openRecent();return;}
   if(mode==='hidden'){const dd=screen.getDisplayNearestPoint(pt),e=edgeDistance(pt,dd);if(e.perp<=e.limit+10&&e.along<=40)openRecent();}
  },
  globalClick(pt){
   downAt=0;
   // The recent-saves panel: a click on a row opens it, a click anywhere else closes the panel.
   if(mode==='recent'&&recent&&alive()){const nb=notch.getBounds();for(const r of recentRects){if(r.id!=='panel'&&pt.x>=nb.x+r.x&&pt.x<=nb.x+r.x+r.w&&pt.y>=nb.y+r.y&&pt.y<=nb.y+r.y+r.h){closeRecent(r.id);return;}}const pn=recentRects.find(r=>r.id==='panel');if(!pn||!(pt.x>=nb.x+pn.x&&pt.x<=nb.x+pn.x+pn.w&&pt.y>=nb.y+pn.y&&pt.y<=nb.y+pn.y+pn.h))closeRecent();return;}
   if(nudgeClick(pt))return;
   // Releasing the mouse button anywhere ends a notch move, even if the pill never saw the release.
   if(moving){endMove();return;}
   if(mode==='ask'&&ask&&alive()){const nb=notch.getBounds();for(const r of askRects){if(pt.x>=nb.x+r.x&&pt.x<=nb.x+r.x+r.w&&pt.y>=nb.y+r.y&&pt.y<=nb.y+r.y+r.h){chooseCorner(r.edge==='keep'?null:r.edge);return;}}return;}
   if(mode==='hidden'&&alive()&&notch.isVisible()){const dd=screen.getDisplayNearestPoint(pt),e=edgeDistance(pt,dd);if(e.perp<=e.limit+10&&e.along<=70){target=dd;graceUntil=Date.now()+5000;needLeave=false;applyMode('peek');tellNotch('peek');}return;}
   if((mode!=='peek'&&mode!=='intro')||!alive()||!notch.isVisible())return;
   if(Date.now()-lastMoveEnd<700)return;
   const pr=pillRect(mode,notch.getBounds());
   if(pt.x>=pr.x-4&&pt.x<=pr.x+pr.w+4&&pt.y>=pr.y-4&&pt.y<=pr.y+pr.h+4){
    if(toggleWorkspace()!=='ignored')tellNotch('click');
   }
  },
  open,createNotch,startNudges,startBills,startDayTicks,startCapture,toggleCapture,close(){try{globalShortcut.unregisterAll();}catch{}clearInterval(poll);if(focus)endFocus(false);flush();},importPaths,
  openPdfs:async paths=>{const added=await importPaths(paths);open('pdfs',added[0]?.id);},
  sendState(state,except){if(win&&!win.isDestroyed()&&win.webContents!==except)win.webContents.send('state',state);}
 };
};
