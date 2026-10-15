const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const quiet=require('./quiet.cjs');
module.exports=function reminders({root,getState,commit,toggleTask,snoozeTask}){
 let toast,queue=[];
 const snapshot=()=>queue.map(id=>getState().tasks.find(t=>t.id===id)).filter(Boolean);
 const publish=()=>{if(!toast||toast.isDestroyed())return;const items=snapshot();toast.webContents.send('reminder-queue',items);if(!items.length)toast.hide();};
 const show=async()=>{
  if(quiet.isQuiet())return;   // held in the queue; shown when quiet mode ends
  if(!toast||toast.isDestroyed()){
   toast=new BrowserWindow({width:350,height:216,frame:false,transparent:true,resizable:false,minimizable:false,maximizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,webPreferences:{preload:path.join(root,'electron/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
   toast.webContents.setWindowOpenHandler(()=>({action:'deny'}));toast.webContents.on('will-navigate',e=>e.preventDefault());
   await toast.loadFile(path.join(root,'dist/client/index.html'),{hash:'reminder'});
  }
  if(!snapshot().length)return;
  const a=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  toast.setBounds({x:a.x+a.width-366,y:a.y+a.height-232,width:350,height:216});
  publish();toast.showInactive();
  // Hiding drops the always-on-top flag on Windows and Electron skips re-applying it, so switch it off and on.
  toast.setAlwaysOnTop(false);toast.setAlwaysOnTop(true,'screen-saver');toast.moveTop();
 };
 quiet.onChange(s=>{if(s.quiet){if(toast&&!toast.isDestroyed())toast.hide();}else if(queue.length)show().catch(()=>{});});
 ipcMain.handle('reminder-queue',()=>snapshot());
 ipcMain.handle('reminder-action',(_,id,action)=>{
  if(!queue.includes(id))return;
  const state=getState();
  if(action==='mute'){commit({...state,mutedUntil:Date.now()+3600000});queue=[];}
  else if(['done','snooze','dismiss'].includes(action)){
   if(action!=='dismiss')commit({...state,tasks:state.tasks.map(t=>t.id===id?(action==='done'?toggleTask(t):snoozeTask(t)):t)});
   queue=queue.filter(x=>x!==id);
  }
  publish();
 });
 return {enqueue(tasks){queue=[...new Set([...queue,...tasks.map(t=>t.id)])];show().catch(err=>console.error('Reminder window:',err));},refresh:publish,close(){toast?.destroy();}};
};
