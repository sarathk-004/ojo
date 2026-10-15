// Isolated native regression fixture with forty sample tasks.
// Saved user tasks are never read or written.
const {app,BrowserWindow,ipcMain,screen}=require('electron');
const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const fs=require('node:fs'),path=require('node:path');
const log=path.resolve('qa/taskit-scroll-verification.log');
fs.mkdirSync(path.dirname(log),{recursive:true});fs.writeFileSync(log,'');
const record=s=>fs.appendFileSync(log,s+'\n');
let win,helper;
app.whenReady().then(async()=>{
 const {initialState,dayKey}=await import('../src/tasks.mjs');
 const data={...initialState(),tasks:Array.from({length:40},(_,i)=>({id:'verify-'+i,title:'Verification row '+i,date:dayKey(),done:false})),compact:false,origin:{x:36,y:324}};
 ipcMain.handle('load',()=>data);ipcMain.handle('save',()=>true);
 win=new BrowserWindow({width:310,height:360,title:'Taskit scroll verification',frame:false,transparent:true,webPreferences:{preload:path.resolve('electron/preload.cjs'),contextIsolation:true,sandbox:true}});
 win.on('page-title-updated',e=>e.preventDefault());
 win.webContents.on('before-input-event',(_,input)=>{if(input.key==='F8'&&input.type==='keyDown')attach();});
 await win.loadFile(path.resolve('dist/client/index.html'));win.hide();win.show();attach();
 setInterval(async()=>{if(win.isDestroyed())return;const m=await win.webContents.executeJavaScript('(()=>{const e=document.querySelector(".task-list");return e?{top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight}:null})()');if(m)record(JSON.stringify(m));},1000).unref();
 function attach(){
  if(helper)return;
  helper=spawn(path.resolve('native/bin/DesktopWatch.exe'),[String(process.pid),win.getNativeWindowHandle().readBigUInt64LE().toString()],{windowsHide:true});
  helper.stderr.on('data',d=>record('native '+d));
  createInterface({input:helper.stdout}).on('line',line=>{if(line.startsWith('wheel:')){
   record(line);const [x,y,deltaX,deltaY]=line.slice(6).split(':').map(Number),p=screen.screenToDipPoint({x,y}),b=win.getBounds();
   record(JSON.stringify({bounds:b,point:p}));win.webContents.send('wheel',{x:p.x-b.x,y:p.y-b.y,deltaX,deltaY});
  }});record('attached');
 }
});
app.on('before-quit',()=>helper?.kill());app.on('window-all-closed',()=>app.quit());
