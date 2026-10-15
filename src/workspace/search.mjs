// Search across everything in the workspace: notes, tasks, saved items, PDFs, jobs, finance and calendar events.
// Pure and fast enough to run on every keystroke.
export const TYPES=[
 {id:'notes',label:'Notes',section:'notes'},
 {id:'tasks',label:'Tasks',section:'tasks'},
 {id:'saved',label:'Saved',section:'saved'},
 {id:'pdfs',label:'PDFs',section:'pdfs'},
 {id:'jobs',label:'Jobs',section:'jobs'},
 {id:'finance',label:'Finance',section:'finance'},
 {id:'events',label:'Calendar',section:'calendar'},
 {id:'bills',label:'Bills',section:'bills'}
];
const norm=s=>String(s||'').toLowerCase();
const words=q=>norm(q).split(/[\s,]+/).filter(Boolean);

// Everything searchable becomes {type,id,title,body,extra,date,boost}.
export function entries(data){
 const out=[],push=(type,id,title,body,extra,extraFields={})=>out.push({type,id,title:String(title||'').trim(),body:String(body||''),extra:String(extra||''),...extraFields});
 for(const n of data.notes||[])if(!n.deleted)push('notes',n.id,n.title||'Untitled',n.text,'',{date:n.updated||n.created||0,boost:(n.favorite?1:0)+(n.pinned?.5:0)});
 for(const t of data.tasks||[])push('tasks',t.id,t.title,[t.notes,...(t.subtasks||[]).map(x=>x.title)].filter(Boolean).join(' '),(t.date||'')+(t.repeat?' daily':''),{date:0,done:!!t.done});
 for(const s of data.saved||[]){
  if(s.deleted)continue;
  const type=s.kind==='pdf'?'pdfs':'saved';
  push(type,s.id,s.page||s.title,[s.description,s.text,s.content,...(s.highlights||[]).map(h=>h.text+' '+(h.note||''))].filter(Boolean).join(' '),[s.title,s.brand,s.author,s.url,s.kind].filter(Boolean).join(' '),{date:s.created||0,boost:s.favorite?1:0,kind:s.kind});
 }
 for(const j of data.jobs||[])push('jobs',j.id,[j.role,j.company].filter(Boolean).join(' · ')||'Job',[j.notes,j.nextStep,j.location].filter(Boolean).join(' '),[j.status,j.source,j.link].filter(Boolean).join(' '),{date:j.updated||j.created||0});
 for(const f of data.finance||[])push('finance',f.id,f.note||f.category||'Transaction',[f.category,f.type].filter(Boolean).join(' '),String(f.amount)+' '+(f.date||''),{date:f.created||0,amount:f.amount,ftype:f.type});
 for(const e of data.events||[])push('events',e.id,e.title,e.note,e.date||'',{date:0,when:e.date});
 for(const b of data.bills||[])push('bills',b.id,b.name,[b.kind,b.cycle,b.category].filter(Boolean).join(' '),String(b.amount)+' '+(b.due||''),{date:0});
 return out;
}
function snippet(body,tokens,len=130){
 if(!body)return '';
 const low=norm(body);let at=-1;
 for(const t of tokens){const i=low.indexOf(t);if(i>=0&&(at<0||i<at))at=i;}
 if(at<0)return body.slice(0,len).trim();
 const start=Math.max(0,at-45),end=Math.min(body.length,start+len);
 return (start>0?'…':'')+body.slice(start,end).replace(/\s+/g,' ').trim()+(end<body.length?'…':'');
}
export function search(data,query,{types=null,limit=40,list=null}={}){
 const tokens=words(query);
 if(!tokens.length)return [];
 const all=list||entries(data);
 const results=[];
 for(const e of all){
  if(types&&!types.includes(e.type))continue;
  const title=norm(e.title),body=norm(e.body),extra=norm(e.extra);
  let score=0,ok=true;
  for(const t of tokens){
   let s=0;
   if(title.startsWith(t))s=10;
   else if(title.includes(' '+t))s=8;
   else if(title.includes(t))s=6;
   else if(extra.includes(t))s=3;
   else if(body.includes(t))s=2;
   if(!s){ok=false;break;}
   score+=s;
  }
  if(!ok)continue;
  if(tokens.length>1&&title.includes(tokens.join(' ')))score+=6;
  score+=(e.boost||0)+(e.date?Math.min(1,e.date/Date.now()):0)-(e.done?1:0);
  results.push({...e,score,snippet:snippet(e.body||e.extra,tokens)});
 }
 return results.sort((a,b)=>b.score-a.score).slice(0,limit);
}
export const sectionOf=type=>TYPES.find(t=>t.id===type)?.section||'notes';
