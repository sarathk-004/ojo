// Quiet mode: while it is on, ojo shows nothing on top of other windows. No notch, no reminder pop-ups, no
// notifications, no global shortcuts. Missed reminders wait and appear when quiet mode ends.
// It turns on by hand (an hour, three hours, until tomorrow) and, unless switched off, by itself while another
// app is full screen, a presentation is running or Windows' Focus assist is on (reported by the desktop helper).
const fs=require('node:fs'),path=require('node:path');
let file='',st={until:0,auto:true},busy=false,last='',timer=null;
const listeners=new Set();
const manual=()=>st.until>Date.now();
const isQuiet=()=>manual()||(st.auto&&busy);
const info=()=>({quiet:isQuiet(),manual:manual(),until:manual()?st.until:0,busy,auto:st.auto});
const save=()=>{try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(st));}catch{}};
function emit(){
 const s=info(),key=JSON.stringify(s);
 if(key===last)return;
 last=key;
 for(const f of listeners)try{f(s);}catch(e){console.error('quiet',e.message);}
}
function init(dir){
 file=path.join(dir,'quiet.json');
 try{const j=JSON.parse(fs.readFileSync(file,'utf8'));st={until:Number(j.until)||0,auto:j.auto!==false};}catch{}
 last=JSON.stringify(info());
 clearInterval(timer);timer=setInterval(emit,5000);if(timer.unref)timer.unref();
}
// Next 6 in the morning.
const tomorrow=()=>{const d=new Date();d.setHours(6,0,0,0);if(d.getTime()<=Date.now()+3600e3)d.setDate(d.getDate()+1);return d.getTime();};
function set(what){
 if(what==='off')st.until=0;
 else if(what==='tomorrow')st.until=tomorrow();
 else if(Number(what)>0)st.until=Date.now()+Math.min(Number(what),24)*3600e3;
 save();emit();return info();
}
function setAuto(v){st.auto=!!v;save();emit();return info();}
function setBusy(b){b=!!b;if(b===busy)return;busy=b;emit();}
module.exports={init,isQuiet,info,set,setAuto,setBusy,onChange:f=>{listeners.add(f);return()=>listeners.delete(f);}};
