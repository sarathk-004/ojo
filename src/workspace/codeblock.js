import {highlight,langName} from './highlight.js';

// A small code editor that lives inside a note: a transparent <textarea> over a coloured copy of the same text,
// with line numbers. Typing happens in the textarea, so the caret never jumps when the colours are redrawn.
// In the saved note it is stored as a plain <pre data-lang> so search, export and older versions keep working.

const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function refreshCode(block){
 const ta=block.querySelector('.cb-ta'),hl=block.querySelector('.cb-hl'),gut=block.querySelector('.cb-gutter');
 const v=ta.value,n=v.split('\n').length;
 hl.innerHTML=highlight(v,block.dataset.lang||'plaintext')+'\n';
 let nums='';for(let i=1;i<=n;i++)nums+=i+'\n';
 gut.textContent=nums;
 block.dataset.label=langName(block.dataset.lang||'plaintext');
}
export const codeValue=block=>block.querySelector('.cb-ta').value;

function lineBounds(v,start,end){
 const a=v.lastIndexOf('\n',start-1)+1;
 let b=v.indexOf('\n',end);if(b<0)b=v.length;
 return [a,b];
}
// Typed edits go through execCommand so Ctrl+Z and Ctrl+Y keep working inside the block.
function put(ta,text,from,to,selFrom,selTo){
 ta.focus();
 ta.setSelectionRange(from,to);
 let ok=false;
 try{ok=text===''?document.execCommand('delete'):document.execCommand('insertText',false,text);}catch{}
 if(!ok){ta.setRangeText(text,from,to,'preserve');ta.dispatchEvent(new Event('input',{bubbles:true}));}
 ta.setSelectionRange(selFrom,selTo);
}
const CLOSERS={'{':'}','(':')','[':']'};

function onKey(e,block,hooks){
 const ta=e.target,v=ta.value,s=ta.selectionStart,en=ta.selectionEnd;
 if(e.key==='Tab'){
  e.preventDefault();
  const sameLine=!v.slice(s,en).includes('\n');
  if(!e.shiftKey&&sameLine){put(ta,'  ',s,en,s+2,s+2);return;}
  const [a,b]=lineBounds(v,s,en);
  const block_=v.slice(a,b);
  if(e.shiftKey){
   const out=block_.split('\n').map(l=>l.replace(/^ {1,2}|^\t/,'')).join('\n');
   const removedFirst=block_.length>0?block_.split('\n')[0].length-out.split('\n')[0].length:0;
   put(ta,out,a,b,Math.max(a,s-removedFirst),Math.max(a,en-(block_.length-out.length)));
  }else{
   const out=block_.split('\n').map(l=>'  '+l).join('\n');
   put(ta,out,a,b,s+2,en+(out.length-block_.length));
  }
  return;
 }
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
  e.preventDefault();
  const [a]=lineBounds(v,s,s);
  const line=v.slice(a,s),indent=(line.match(/^[ \t]*/)||[''])[0];
  const prev=v[s-1],next=v[s];
  if(prev&&CLOSERS[prev]&&next===CLOSERS[prev]){
   const ins='\n'+indent+'  \n'+indent;
   put(ta,ins,s,en,s+1+indent.length+2,s+1+indent.length+2);
  }else{
   const extra=/[{(\[:]\s*$/.test(line)?'  ':'';
   const ins='\n'+indent+extra;
   put(ta,ins,s,en,s+ins.length,s+ins.length);
  }
  return;
 }
 if(CLOSERS[e.key]&&s===en&&!e.ctrlKey&&!e.metaKey){
  // Brackets close themselves.
  e.preventDefault();put(ta,e.key+CLOSERS[e.key],s,en,s+1,s+1);return;
 }
 if((e.key==='}'||e.key===')'||e.key===']')&&s===en&&v[s]===e.key){e.preventDefault();ta.setSelectionRange(s+1,s+1);return;}
 if(e.key==='Backspace'&&s===en&&s>0&&CLOSERS[v[s-1]]&&v[s]===CLOSERS[v[s-1]]){e.preventDefault();put(ta,'',s-1,s+1,s-1,s-1);return;}
 if(e.key==='Backspace'&&!v&&hooks.remove){e.preventDefault();hooks.remove(block);return;}
 if(e.key==='Escape'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey))){e.preventDefault();hooks.exit(block,'after');return;}
 if(e.key==='ArrowDown'&&!e.shiftKey&&s===en&&v.indexOf('\n',s)<0){e.preventDefault();hooks.exit(block,'after');return;}
 if(e.key==='ArrowUp'&&!e.shiftKey&&s===en&&v.lastIndexOf('\n',s-1)<0){e.preventDefault();hooks.exit(block,'before');return;}
}

export function buildCodeBlock(code='',lang='plaintext',hooks){
 const b=document.createElement('div');
 b.className='cblock';b.setAttribute('contenteditable','false');b.dataset.lang=lang||'plaintext';
 b.innerHTML='<div class="cb-body"><div class="cb-gutter" aria-hidden="true"></div><div class="cb-scroll"><div class="cb-stack"><pre class="cb-hl hljs" aria-hidden="true"></pre><textarea class="cb-ta" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off" aria-label="Code"></textarea></div></div></div>';
 const ta=b.querySelector('.cb-ta');
 ta.value=code;
 refreshCode(b);
 ta.addEventListener('input',()=>{refreshCode(b);hooks.change(b);});
 ta.addEventListener('keydown',e=>onKey(e,b,hooks));
 // Keep the line numbers lined up when a long line scrolls the block sideways.
 return b;
}

// Turn every plain <pre> in the page into the editor (older notes, pasted code).
export function hydrateCode(root,hooks){
 root.querySelectorAll('pre').forEach(pre=>{
  if(pre.closest('.cblock'))return;
  const c=pre.cloneNode(true);c.querySelectorAll('br').forEach(x=>x.replaceWith('\n'));
  const text=c.textContent.replace(/\n$/,'');
  pre.replaceWith(buildCodeBlock(text,pre.dataset.lang&&pre.dataset.lang!=='auto'?pre.dataset.lang:'plaintext',hooks));
 });
}

// The saved form: a plain <pre data-lang>. Reads values from the live blocks (a clone's textarea may not keep typed text).
export function serializeCode(live,clone){
 const blocks=[...live.querySelectorAll('.cblock')];
 clone.querySelectorAll('.cblock').forEach((c,i)=>{
  const src=blocks[i];if(!src){c.remove();return;}
  const pre=document.createElement('pre');
  pre.dataset.lang=src.dataset.lang||'plaintext';pre.dataset.label=langName(pre.dataset.lang);
  pre.innerHTML=esc(codeValue(src));
  c.replaceWith(pre);
 });
}
