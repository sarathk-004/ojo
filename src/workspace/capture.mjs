// Decides what a line typed into Quick capture becomes: a task, a note, or something to save (link, snippet).
import {classifyText} from './classify.mjs';

export const MODES=['auto','task','note','saved'];
const PREFIX=/^\s*(t|n|s)\s*:\s*/i;
const PREFIX_MODE={t:'task',n:'note',s:'saved'};

// What a plain line most likely is. A task is something to do: it starts with an action word, names a day or time, or is a short phrase.
// A note is something to remember: a statement ("AI is a ..."), a question, a trailing "...", an idea, or a long sentence.
const VERBS='call|email|mail|text|message|ping|buy|get|order|book|pay|renew|send|submit|finish|complete|fix|review|schedule|remind|write|draft|read|clean|check|update|prepare|pick|drop|print|cancel|apply|follow|reply|ask|tell|plan|set|make|do|take|bring|return|install|upload|download|file|sign|visit|meet|attend|study|practice|revise|research|organi[sz]e|deploy|merge|test|ship|publish|post|delete|remove|add|create|build|start|stop|water|walk|exercise|workout|cook|wash|pack|charge|backup|back up|transfer|withdraw|deposit|invite|confirm|arrange|find|look up|reach out|talk to|speak to';
const ACTION=new RegExp('^(to\s+|remember to\s+|don.t forget to\s+)?('+VERBS+')\b','i');
const WHEN=/\b(today|tonight|tomorrow|tmrw|daily|every ?day|weekly|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|weekend|at \d{1,2}(:\d\d)?\s*(am|pm)?|by \d|\d{1,2}\s*(am|pm))\b/i;
const STATEMENT=/\b(is|are|was|were|means|isn.t|aren.t|can be|should be|because|which|that|about|how|why|what|idea|thought|note)\b/i;
export function guessKind(text){
 const t=text.trim(),words=t.split(/\s+/).length;
 if(/(\.\.\.|…)$/.test(t)||t.endsWith('?'))return 'note';
 if(/^(idea|note|thought|todo later|remember)\b\s*[:\-]/i.test(t))return 'note';
 if(ACTION.test(t))return 'task';
 if(WHEN.test(t)&&words<=12)return 'task';
 if(STATEMENT.test(t)||words>=8)return 'note';
 return words<=5?'task':'note';
}
export function planCapture(raw,mode='auto'){
 let text=String(raw||'').replace(/\r\n/g,'\n');
 if(!text.trim())return null;
 // "t: call mum", "n: idea …", "s: https://…" choose the target without touching the mouse.
 const p=text.match(PREFIX);
 if(p){mode=PREFIX_MODE[p[1].toLowerCase()];text=text.slice(p[0].length);}
 text=text.trim();
 if(!text)return null;
 const looksSaved=()=>{
  const c=classifyText({text});
  return !!c&&['youtube','instagram','pdf','md','link','image','video','audio','code'].includes(c.kind)&&(c.kind!=='md'&&c.kind!=='code'||text.includes('\n'));
 };
 let kind=mode;
 if(mode==='auto'){
  if(/^https?:\/\/\S+$/i.test(text)||looksSaved())kind='saved';
  else if(text.includes('\n')||text.length>110)kind='note';
  else kind=guessKind(text);
 }
 if(kind==='task'){
  // A trailing "tomorrow", "today" or "daily" picks the list.
  let view='Today',title=text.replace(/\n+/g,' ');
  const m=title.match(/\s+(tomorrow|today|daily|anytime)\s*$/i);
  if(m){const w=m[1].toLowerCase();view=w==='tomorrow'?'Upcoming':w==='daily'?'Daily':w==='anytime'?'Anytime':'Today';title=title.slice(0,m.index).trim();}
  if(!title)title=text;
  return {kind:'task',title:title.slice(0,200),view};
 }
 if(kind==='note'){
  const lines=text.split('\n'),first=lines[0].trim().replace(/^#+\s*/,'');
  const body=lines.length>1?lines.slice(1).join('\n').trim():(first.length>60?text:'');
  return {kind:'note',title:first.slice(0,80),body};
 }
 return {kind:'saved',text};
}
export const labelFor=plan=>!plan?'':plan.kind==='task'?'Task · '+({Today:'Today',Upcoming:'Tomorrow',Daily:'Every day',Anytime:'Anytime'}[plan.view]||'Today'):plan.kind==='note'?'New note':'Saved';
