// Pure helpers for the Job application tracker.
export const STATUSES=['Wishlist','Applied','Screening','Interview','Offer','Rejected'];
export const STATUS_COLORS={Wishlist:'#8a9bb0',Applied:'#4f7ea8',Screening:'#c9a13a',Interview:'#7a6aa8',Offer:'#4d8a52',Rejected:'#b4533f'};
export const SOURCES=['LinkedIn','Naukri','Indeed','Company site','Referral','Recruiter','Other'];
export const PRIORITIES=['Low','Medium','High'];
const dayStr=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function newJob(fields={},now=Date.now(),id=crypto.randomUUID()){
 const status=STATUSES.includes(fields.status)?fields.status:'Applied';
 return {
  company:'',role:'',location:'',salary:'',source:'',link:'',contact:'',notes:'',nextStep:'',nextDate:'',priority:'Medium',
  ...fields,id,status,
  appliedDate:fields.appliedDate||(status==='Wishlist'?'':dayStr(now)),
  created:now,updated:now,history:[{status,at:now}]
 };
}
// Moves a job to another stage and records it in the timeline.
export function moveJob(job,status,now=Date.now()){
 if(!STATUSES.includes(status)||job.status===status)return job;
 const next={...job,status,updated:now,history:[...(job.history||[]),{status,at:now}]};
 if(status!=='Wishlist'&&!next.appliedDate)next.appliedDate=dayStr(now);
 return next;
}
export function stats(jobs){
 const count=s=>jobs.filter(j=>j.status===s).length;
 const applied=jobs.filter(j=>j.status!=='Wishlist');
 const responded=applied.filter(j=>(j.history||[]).some(h=>['Screening','Interview','Offer'].includes(h.status)));
 return {
  total:jobs.length,wishlist:count('Wishlist'),applied:applied.length,
  active:jobs.filter(j=>['Applied','Screening','Interview'].includes(j.status)).length,
  interviews:jobs.filter(j=>(j.history||[]).some(h=>h.status==='Interview')).length,
  offers:count('Offer'),rejected:count('Rejected'),
  responseRate:applied.length?Math.round(responded.length/applied.length*100):null
 };
}
// Jobs with a follow-up or interview date that is overdue or within the next `days` days.
export function followUps(jobs,today,days=7){
 const limit=dayStr(new Date(today+'T12:00:00').getTime()+days*86400000);
 return jobs.filter(j=>j.nextDate&&!['Rejected','Offer'].includes(j.status)&&j.nextDate<=limit)
  .map(j=>({...j,overdue:j.nextDate<today})).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
}
export function daysSince(date,today){
 if(!date)return null;
 return Math.round((new Date(today+'T12:00:00')-new Date(date+'T12:00:00'))/86400000);
}
