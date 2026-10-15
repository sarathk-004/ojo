const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,screen,powerMonitor,dialog,shell} = require('electron');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const root=path.join(__dirname,'..');
const geometry=require('./geometry.cjs'),{SMALL,WIDTH,HEIGHT}=geometry;
const {applyVisibility}=require('./visibility.cjs');
const quiet=require('./quiet.cjs');
let win,tray,state,file,timer,watch,dragTimer,dragSession,saveTimer,quitting=false,isCompact=false,desktopVisible=false,loaded=false,applying=false;
let anchor,placement,lastBounds,reminderController,workspaceHost;
// TNKR_DATA_DIR lets a test instance run beside the installed app with its own data.
if(!process.env.TNKR_DATA_DIR&&!app.requestSingleInstanceLock()) app.quit();
app.name='ojo';
// Windows remembers the taskbar icon per app id. A development run (electron.exe) must never share the installed app's id,
// or Windows can keep showing the Electron icon for the real app.
const AUMID=process.env.TNKR_AUMID||(app.isPackaged?'com.tnkr.workspace':'com.tnkr.workspace.dev');
app.setAppUserModelId(AUMID);
const userDataPath=process.env.TNKR_DATA_DIR||path.join(app.getPath('appData'),'Taskit');
try{app.setPath('userData',userDataPath);}catch{}
file=path.join(userDataPath,'tasks.json');
function persist(){
 try{
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),'utf8');
  if(Array.isArray(state.tasks)&&state.tasks.length>0){
   try{fs.writeFileSync(file+'.backup',JSON.stringify(state,null,2),'utf8');}catch{}
  }
  try{fs.renameSync(file+'.tmp',file);}catch{fs.copyFileSync(file+'.tmp',file);try{fs.unlinkSync(file+'.tmp');}catch{}}
 }catch(err){console.error('persist error:',err);}
}
function loadSavedState(initialState){
 const candidates=[file,file+'.backup',file+'.tmp',path.join(app.getPath('appData'),'taskit','tasks.json'),path.join(app.getPath('appData'),'taskit','tasks.json.backup')];
 for(const p of candidates){
  try{
   if(fs.existsSync(p)){
    const parsed=JSON.parse(fs.readFileSync(p,'utf8'));
    if(Array.isArray(parsed.tasks)&&parsed.tasks.length>0)return {...initialState(),...parsed};
   }
  }catch{}
 }
 try{if(fs.existsSync(file)){const parsed=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(parsed.tasks))return {...initialState(),...parsed};}}catch{}
 return initialState();
}
function pushState(){if(win&&!win.isDestroyed())win.webContents.send('state',state);workspaceHost?.sendState(state);}
function areaFor(point){return screen.getDisplayNearestPoint(point).workArea;}
function boundAnchor(point){return geometry.boundAnchor(point,areaFor(point));}
function layout(){return geometry.layout(anchor,areaFor(anchor));}
// The open widget is dragged by its header. It follows the cursor but is always held fully inside the screen it is on,
// and the icon's anchor is kept in step so collapsing and re-expanding land in the same place.
function clampBounds(b){const area=areaFor({x:b.x+b.width/2,y:b.y+b.height/2});return {...b,x:Math.round(Math.max(area.x,Math.min(b.x,area.x+area.width-b.width))),y:Math.round(Math.max(area.y,Math.min(b.y,area.y+area.height-b.height)))};}
function moveExpanded(dx,dy){
 const s=dragSession.bounds,nb=clampBounds({x:s.x+dx,y:s.y+dy,width:s.width,height:s.height});
 anchor=boundAnchor({x:nb.x+(WIDTH-SMALL)/2,y:nb.y+HEIGHT-SMALL});placement={...nb,origin:geometry.origin(anchor,nb)};applyBounds(nb);
}
function applyBounds(bounds){applying=true;lastBounds=bounds;win.setBounds(bounds);setTimeout(()=>{applying=false;},100);}
function forwardDesktopScroll(x,y,deltaX,deltaY){
 if(!loaded||win.isDestroyed()||isCompact)return;
 const point=screen.screenToDipPoint({x,y}),bounds=win.getBounds();
 win.webContents.send('wheel',{x:point.x-bounds.x,y:point.y-bounds.y,deltaX,deltaY});
}
function setCompact(value,point){
 const bounds=win.getBounds();
 if(value&&point&&Number.isFinite(point.x)&&Number.isFinite(point.y))anchor=geometry.collapseAnchor(bounds,point,areaFor({x:bounds.x+point.x,y:bounds.y+point.y}));
 isCompact=!!value;
 // Keep the native surface stable. Resize/move during a React mode swap
 // exposes one frame of the old icon in the new window's top-left corner.
 placement={...bounds,origin:geometry.origin(anchor,bounds)};
 state.compact=isCompact;state.anchor=anchor;persist();return placement.origin;
}
function open(){setCompact(false);win.webContents.send('expand',{compact:false,origin:placement.origin});win.showInactive();}
function updateVisibility(mode){
 if(mode.startsWith('busy:')){quiet.setBusy(mode.slice(5)==='1');return;}
 if(mode==='down'||mode.startsWith('down:')){workspaceHost?.globalDown();return;}
 if(mode.startsWith('rclick:')){
  const [x,y]=mode.slice(7).split(':').map(Number);
  if(Number.isFinite(x)&&Number.isFinite(y))workspaceHost?.globalRightClick(screen.screenToDipPoint({x,y}));
  return;
 }
 if(mode.startsWith('click:')){
  const [x,y]=mode.slice(6).split(':').map(Number);
  if(Number.isFinite(x)&&Number.isFinite(y))workspaceHost?.globalClick(screen.screenToDipPoint({x,y}));
  return;
 }
 if(mode.startsWith('wheel:')){
  const [x,y,deltaX,deltaY]=mode.slice(6).split(':').map(Number);
  if(![x,y,deltaX,deltaY].every(Number.isFinite))return;
  forwardDesktopScroll(x,y,deltaX,deltaY);
  return;
 }
 desktopVisible=mode==='desktop'||mode==='self'||mode==='attached';
 if(!loaded||win.isDestroyed())return;
 applyVisibility(win,mode==='attached'?'self':mode);
}
const pdfArgs=argv=>argv.slice(1).filter(a=>/.pdf$/i.test(a)&&fs.existsSync(a));
app.on('second-instance',(_,argv)=>{const pdfs=pdfArgs(argv);if(pdfs.length)workspaceHost?.openPdfs(pdfs);else if(argv.includes('--workspace'))workspaceHost?.open();else win&&open();});
app.whenReady().then(async()=>{
 const {initialState,collectReminders,completeTask,snoozeTask,syncMasterDaily,normalizeListOrder,newTask}=await import('../src/tasks.mjs');
 state=syncMasterDaily(loadSavedState(initialState));persist();
 state.top=false;
 if(state.startup&&app.isPackaged)app.setLoginItemSettings({openAtLogin:true,path:process.execPath});
 const a=screen.getPrimaryDisplay().workArea;
 anchor=boundAnchor(state.anchor&&Number.isFinite(state.anchor.x)&&Number.isFinite(state.anchor.y)?state.anchor:{x:a.x+a.width-100,y:a.y+a.height-100});
 isCompact=!!state.compact;placement=layout();
 win=new BrowserWindow({...placement,frame:false,transparent:true,resizable:false,minimizable:false,focusable:true,alwaysOnTop:false,skipTaskbar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 lastBounds=win.getBounds();
 // Wait for the Windows three-finger/Show Desktop animation to finish, then
 // undo its OS minimization only if the user is still on the desktop.
 win.on('minimize',()=>setTimeout(()=>{if(!quitting&&desktopVisible)applyVisibility(win,'desktop');},450));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
 win.on('close',e=>{if(!quitting){e.preventDefault();setCompact(true);win.webContents.send('expand',{compact:true,origin:placement.origin});}});
 win.on('moved',()=>{if(applying||dragSession||win.isMinimized())return;let b=win.getBounds();{const c=clampBounds(b);if(c.x!==b.x||c.y!==b.y){applyBounds(c);b=c;}}anchor=boundAnchor({x:anchor.x+b.x-lastBounds.x,y:anchor.y+b.y-lastBounds.y});lastBounds=b;placement={...b,origin:geometry.origin(anchor,b)};state.anchor=anchor;clearTimeout(saveTimer);saveTimer=setTimeout(persist,250);});
 // The tile icon (dark square, white mark) stays visible on light and dark taskbars; the bare white mark did not.
 const icon=nativeImage.createFromPath(path.join(root,'public/brand/ojo.png')).resize({width:32,height:32,quality:'best'});
 win.setIcon(nativeImage.createFromPath(path.join(root,'public/brand/ojo.png')));
 // Windows takes the taskbar icon for this app id from its Start menu shortcut, so keep that shortcut pointing at the ojo icon.
 if(app.isPackaged&&process.platform==='win32'&&!process.env.TNKR_DATA_DIR){
  try{try{fs.unlinkSync(path.join(app.getPath('appData'),'Microsoft/Windows/Start Menu/Programs/tnkr.lnk'));}catch{}shell.writeShortcutLink(path.join(app.getPath('appData'),'Microsoft/Windows/Start Menu/Programs/ojo.lnk'),'replace',{target:process.execPath,cwd:path.dirname(process.execPath),description:'ojo',icon:path.join(process.resourcesPath,'ojo.ico'),iconIndex:0,appUserModelId:AUMID});}catch(err){console.error('shortcut',err.message);}
 }
 quiet.init(path.join(userDataPath,'Workspace'));
 tray=new Tray(icon);
 const buildTray=()=>{
  const q=quiet.info(),until=q.manual?new Date(q.until).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
  tray.setToolTip(q.quiet?'ojo · quiet mode'+(until?' until '+until:' (another app is full screen)'):'ojo · available on your desktop');
  tray.setContextMenu(Menu.buildFromTemplate([
   {label:'Quick capture',click:()=>workspaceHost?.toggleCapture()},
   {label:'Show the notch',click:()=>workspaceHost?.revealNotch(),enabled:!q.quiet},
   {label:'Open workspace',click:()=>workspaceHost?.open()},
   {label:'Expand on desktop',click:open},
   {type:'separator'},
   {label:q.manual?'Quiet mode is on until '+until:q.quiet?'Quiet (another app is full screen)':'Quiet mode (for exams and meetings)',enabled:false},
   {label:'Quiet for 1 hour',click:()=>quiet.set(1)},
   {label:'Quiet for 3 hours',click:()=>quiet.set(3)},
   {label:'Quiet until tomorrow morning',click:()=>quiet.set('tomorrow')},
   {label:'Turn quiet mode off',click:()=>quiet.set('off'),enabled:q.manual},
   {type:'separator'},
   {label:'Quit ojo',click:()=>{quiet.set('off');quitting=true;app.quit();}}
  ]));
 };
 buildTray();quiet.onChange(buildTray);
 tray.on('click',open);
 workspaceHost=require('./workspace.cjs')({aumid:AUMID,resetTasks:()=>{state=syncMasterDaily(initialState());persist();pushState();if(win&&!win.isDestroyed())win.webContents.send('state',state);},root,userData:userDataPath,getTasks:()=>state.tasks,addTask:(title,view)=>{const t=newTask(title,view);state=syncMasterDaily({...state,tasks:[...state.tasks,t]});persist();pushState();return t;}});
 ipcMain.handle('load',()=>({...state,compact:isCompact,origin:placement.origin}));
 ipcMain.handle('save',(event,incoming)=>{if(!incoming||!Array.isArray(incoming.tasks)||incoming.tasks.length>10000)throw Error('Invalid task data');state=syncMasterDaily({...state,tasks:incoming.tasks,listOrder:normalizeListOrder(incoming.listOrder),theme:incoming.theme,covers:incoming.covers||[],top:false});persist();reminderController?.refresh();if(win.webContents!==event.sender)win.webContents.send('state',state);workspaceHost?.sendState(state,event.sender);return true;});
 ipcMain.handle('compact',(_,value,point)=>setCompact(value,point));
 ipcMain.handle('collapse-target',(_,point)=>{const b=win.getBounds();return geometry.origin(geometry.collapseAnchor(b,point,areaFor({x:b.x+point.x,y:b.y+point.y})),b);});
 ipcMain.handle('drag-start',()=>{
  if(dragSession)return;const p=screen.getCursorScreenPoint(),b=win.getBounds();dragSession={start:p,bounds:b,anchor:{...anchor},moved:false};
  dragTimer=setInterval(()=>{if(!dragSession)return;const cur=screen.getCursorScreenPoint(),dx=cur.x-dragSession.start.x,dy=cur.y-dragSession.start.y;if(Math.hypot(dx,dy)<4&&!dragSession.moved)return;dragSession.moved=true;if(!isCompact){moveExpanded(dx,dy);return;}anchor=boundAnchor({x:dragSession.anchor.x+dx,y:dragSession.anchor.y+dy});placement=layout();applyBounds(placement);win.webContents.send('expand',{compact:isCompact,origin:placement.origin});},16);
 });
 ipcMain.handle('drag-end',()=>{clearInterval(dragTimer);const moved=!!dragSession?.moved;dragSession=null;state.anchor=anchor;persist();return moved;});
 ipcMain.handle('add-cover',async()=>{const result=await dialog.showOpenDialog(win,{title:'Choose a cover',filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}],properties:['openFile']});if(result.canceled)return null;const p=result.filePaths[0];if(fs.statSync(p).size>12*1024*1024)throw Error('Choose an image smaller than 12 MB.');let img=nativeImage.createFromPath(p);if(img.isEmpty())throw Error('This image could not be opened.');if(img.getSize().width>1400)img=img.resize({width:1400});return {id:'cover-'+Date.now(),name:path.basename(p,path.extname(p)).slice(0,35),src:'data:image/jpeg;base64,'+img.toJPEG(85).toString('base64')};});
 ipcMain.handle('settings',(_,value)=>{if(app.isPackaged)app.setLoginItemSettings({openAtLogin:!!value.startup,path:process.execPath});state.startup=app.isPackaged&&!!value.startup;if(Number.isFinite(value.mutedUntil))state.mutedUntil=value.mutedUntil;persist();return {startup:state.startup,mutedUntil:state.mutedUntil,packaged:app.isPackaged};});
 ipcMain.handle('quit',()=>{quitting=true;app.quit();});
 reminderController=require('./reminders.cjs')({root,getState:()=>state,commit:next=>{state=syncMasterDaily(next);persist();pushState();},toggleTask:completeTask,snoozeTask});
 const check=()=>{const tracked=syncMasterDaily(state);if(tracked!==state){state=tracked;persist();pushState();}const result=collectReminders(state);if(!result.due.length)return;state=result.state;persist();pushState();reminderController.enqueue(result.due);};
 timer=setInterval(check,5000);powerMonitor.on('resume',check);
 const startWatch=()=>{
  if(quitting||!win||win.isDestroyed())return;
  const helper=app.isPackaged?path.join(process.resourcesPath,'DesktopWatch.exe'):path.join(root,'native/bin/DesktopWatch.exe');
  try{
   watch=spawn(helper,[String(process.pid),win.getNativeWindowHandle().readBigUInt64LE().toString()],{windowsHide:true,stdio:['ignore','pipe','pipe']});
   createInterface({input:watch.stdout}).on('line',updateVisibility);
   watch.on('error',()=>{if(!quitting)win.showInactive();});
   watch.on('exit',()=>{if(!quitting){desktopVisible=true;setTimeout(startWatch,1000);}});
  }catch{win.showInactive();}
 };
 startWatch();
 await win.loadFile(path.join(root,'dist/client/index.html'));loaded=true;win.showInactive();check();workspaceHost.createNotch();workspaceHost.startNudges();workspaceHost.startBills();workspaceHost.startDayTicks();workspaceHost.startCapture();
 {const pdfs=pdfArgs(process.argv);if(pdfs.length)workspaceHost.openPdfs(pdfs);else if(process.argv.includes('--workspace'))workspaceHost.open();}
 screen.on('display-metrics-changed',()=>{anchor=boundAnchor(anchor);placement=layout();applyBounds(placement);win.webContents.send('expand',{compact:isCompact,origin:placement.origin});state.anchor=anchor;persist();});
});
app.on('before-quit',()=>{quitting=true;workspaceHost?.close();clearInterval(timer);clearInterval(dragTimer);clearTimeout(saveTimer);watch?.kill();reminderController?.close();});



