const {app,BrowserWindow,ipcMain,screen}=require('electron');
const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const fs=require('node:fs'),path=require('node:path');
const log=path.resolve('qa/scroll-verification.log');
fs.mkdirSync(path.dirname(log),{recursive:true});fs.writeFileSync(log,'');
const record=s=>fs.appendFileSync(log,s+'\n');
let win,helper;
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:360,height:380,title:'Taskit scroll verification',webPreferences:{nodeIntegration:true,contextIsolation:false}});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<html><body style="font:16px sans-serif"><button id="attach">Attach test to desktop</button><div id="list" style="height:250px;overflow:auto">${Array.from({length:40},(_,i)=>'<p>Verification row '+i+'</p>').join('')}</div><output id="result">Scroll: 0</output><script>const {ipcRenderer}=require('electron');const list=document.getElementById('list');document.getElementById('attach').onclick=()=>ipcRenderer.send('attach');list.onscroll=()=>{document.getElementById('result').textContent='Scroll: '+list.scrollTop;ipcRenderer.send('metric','scroll='+list.scrollTop)};window.onwheel=e=>ipcRenderer.send('metric','DOM wheel='+e.deltaY);ipcRenderer.on('wheel',(_,delta)=>{list.scrollTop-=delta*.5});</script></body></html>`));
 win.hide();win.show();
 ipcMain.on('metric',(_,s)=>record(s));
 ipcMain.on('attach',()=>{
  if(helper)return;
  helper=spawn(path.resolve('native/bin/DesktopWatch.exe'),[String(process.pid),win.getNativeWindowHandle().readBigUInt64LE().toString()],{windowsHide:true});
  helper.stderr.on('data',d=>record('native '+d));
  createInterface({input:helper.stdout}).on('line',line=>{if(line.startsWith('wheel:')){record(line);const [x,y]=line.slice(6).split(':').map(Number);record(JSON.stringify({bounds:win.getBounds(),point:screen.screenToDipPoint({x,y})}));win.webContents.send('wheel',Number(line.split(':')[4]));}});
  record('attached');
 });
});
app.on('before-quit',()=>helper?.kill());
app.on('window-all-closed',()=>app.quit());
