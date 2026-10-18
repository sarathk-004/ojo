// Small pure helpers for Saved folders and reminders.
export const STARTER_FOLDERS=['Watch later','Research papers','Books and ideas','Websites to visit'];
const at=(d,h)=>{const x=new Date(d);x.setHours(h,0,0,0);return x.getTime();};
// Reminder choices, each a time in the future.
export function remindOptions(now=Date.now()){
 const d=new Date(now),out=[];
 out.push({id:'3h',label:'In 3 hours',at:now+3*3600000});
 const tom=new Date(d);tom.setDate(d.getDate()+1);
 out.push({id:'tomorrow',label:'Tomorrow morning',at:at(tom,9)});
 const sat=new Date(d);sat.setDate(d.getDate()+((6-d.getDay()+7)%7||7));
 out.push({id:'weekend',label:'This weekend',at:at(sat,10)});
 const mon=new Date(d);mon.setDate(d.getDate()+((8-d.getDay())%7||7));if(mon.getDate()===tom.getDate()&&mon.getMonth()===tom.getMonth())mon.setDate(mon.getDate()+7);
 out.push({id:'week',label:'Next week',at:at(mon,9)});
 const mo=new Date(d);mo.setMonth(d.getMonth()+1);
 out.push({id:'month',label:'In a month',at:at(mo,9)});
 return out;
}
export function remindLabel(ts){
 return new Date(ts).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
export const folderCount=(items,id)=>items.filter(i=>!i.deleted&&i.folder===id).length;
export const unfiled=items=>items.filter(i=>!i.deleted&&!i.folder).length;
