// Thin wrapper over the Electron bridge. In a plain browser (design preview)
// it falls back to localStorage plus in-memory files so the UI stays testable.
const real=typeof window!=='undefined'?window.workspace:null;
const memFiles=new Map();
const key=n=>'tnkr-ws-'+n;
const read=n=>{try{return JSON.parse(localStorage.getItem(key(n)))||[];}catch{return [];}};
const mock={
 load:async()=>({notes:read('notes'),events:read('events'),saved:read('saved'),pdfs:read('pdfs'),finance:read('finance'),budgets:read('budgets'),jobs:read('jobs'),bills:read('bills'),focus:read('focus'),wins:read('wins'),reviews:read('reviews'),folders:read('folders'),projects:read('projects'),boards:read('boards'),notefolders:read('notefolders'),settings:read('settings'),reminders:read('reminders'),nudgelog:read('nudgelog'),tasks:[]}),
 save:async(n,items)=>{try{localStorage.setItem(key(n),JSON.stringify(items));}catch{}return true;},
 setZoom:async()=>true,listFonts:async()=>['Arial','Calibri','Cambria','Consolas','Georgia','Segoe UI','Times New Roman','Verdana'],focusState:async()=>null,focusStart:async()=>null,focusPause:async()=>null,focusResume:async()=>null,focusStop:async()=>null,focusDelete:async()=>true,onFocus:()=>()=>{},capTask:async()=>true,capNote:async()=>true,capHide:async()=>true,capInfo:async()=>({key:''}),onCapOpen:()=>()=>{},exportPdf:async()=>({ok:false}),aiTest:async()=>({ok:false,error:'Needs the desktop app.'}),onSummaryProgress:()=>()=>{},summarise:async()=>({ok:false,error:'Summaries need the desktop app.'}),nudgeLog:async()=>true,nudgeRects:async()=>true,nudgeTest:async()=>true,nudgeQueue:async()=>[],nudgeAction:async()=>true,onNudgeQueue:()=>()=>{},
 setTheme:async()=>true,notchIntro:async()=>true,exportAll:async()=>({ok:false}),eraseAll:async()=>{['notes','events','saved','finance','budgets','jobs','bills','focus','wins','reviews','folders','projects','boards','notefolders','settings','reminders'].forEach(n=>localStorage.removeItem(key(n)));return true;},
 open:async()=>true,toggle:async()=>'opened',notch:async()=>true,
 putFile:async bytes=>{const id=crypto.randomUUID();memFiles.set(id,new Uint8Array(bytes));return id;},
 getFile:async id=>memFiles.get(id)||null,
 delFile:async id=>{memFiles.delete(id);return true;},
 openExternal:async url=>{window.open(url,'_blank','noopener');return true;},
 meta:async()=>null,
 fetchIcon:async()=>null,
 fetchFile:async()=>({error:"Downloads need the desktop app."}),
 ensureFile:async()=>({error:"Downloads need the desktop app."}),
 pickFiles:async()=>[],
 addSaved:async records=>{const cur=read('saved');await mock.save('saved',[...records.map((r,i)=>({...r,id:crypto.randomUUID(),created:Date.now()+i})),...cur]);return records.length;},
 onChanged:()=>()=>{},onSection:()=>()=>{},onNotchMode:()=>()=>{},onNotchEdge:()=>()=>{},notchPlace:async()=>({edge:'top',pos:.5}),notchMove:async()=>true,notchContext:async()=>true,quietGet:async()=>({quiet:false,manual:false,until:0,busy:false,auto:true}),quietSet:async()=>({quiet:false}),onQuiet:()=>()=>{},notchRecentPick:async()=>true,notchRecentRects:async()=>true,onNotchRecent:()=>()=>{},notchChoose:async()=>true,notchAskRects:async()=>true,onNotchAsk:()=>()=>{}
};
export const api=real||mock;
export const isNative=!!real;
