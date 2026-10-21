import {api} from './api.js';
import {mdToHtml} from './markdown.mjs';

// Bring a file in as a note: Word (.docx), Markdown, plain text or HTML. The result is tidy HTML the editor understands:
// headings, paragraphs, lists, tables, links, emphasis and pictures (stored as files, never inline).
const KEEP=new Set(['p','h1','h2','h3','ul','ol','li','b','strong','i','em','u','s','strike','table','thead','tbody','tr','th','td','a','br','blockquote','pre','code','hr','sub','sup','img']);
const HEAD={h4:'h3',h5:'h3',h6:'h3'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function clean(node,out){
 for(const c of [...node.childNodes]){
  if(c.nodeType===3){out.appendChild(document.createTextNode(c.nodeValue));continue;}
  if(c.nodeType!==1)continue;
  let tag=c.tagName.toLowerCase();
  if(['script','style','head','meta','link','iframe','object','embed','form','input','button'].includes(tag))continue;
  tag=HEAD[tag]||tag;
  if(tag==='div'||tag==='span'||tag==='section'||tag==='article'||tag==='font'||tag==='body'||tag==='html'||tag==='figure'||tag==='figcaption'||!KEEP.has(tag)){
   // unwrap, keeping a line break between block-like containers
   const before=out.childNodes.length;
   clean(c,out);
   if(tag==='div'&&out.childNodes.length>before){const p=document.createElement('p');while(out.childNodes.length>before)p.appendChild(out.childNodes[before]);out.appendChild(p);}
   continue;
  }
  const el=document.createElement(tag);
  if(tag==='a'){const h=c.getAttribute('href')||'';if(/^(https?:|mailto:)/i.test(h)){el.setAttribute('href',h);}}
  if(tag==='img'){const id=c.getAttribute('data-file');if(!id)continue;el.setAttribute('data-file',id);el.setAttribute('alt','');}
  if((tag==='th'||tag==='td')){const cs=c.getAttribute('colspan');if(cs&&/^\d+$/.test(cs))el.setAttribute('colspan',cs);}
  if(tag!=='img'&&tag!=='br'&&tag!=='hr')clean(c,el);
  out.appendChild(el);
 }
}
export function tidyHtml(html){
 const doc=new DOMParser().parseFromString('<body>'+html+'</body>','text/html');
 const out=document.createElement('div');
 clean(doc.body,out);
 // loose text at the top level becomes paragraphs; empty paragraphs go
 const wrap=document.createElement('div');let run=null;
 for(const n of [...out.childNodes]){
  const block=n.nodeType===1&&/^(p|h1|h2|h3|ul|ol|table|blockquote|pre|hr)$/i.test(n.tagName);
  if(block){run=null;wrap.appendChild(n);}
  else{if(!run){run=document.createElement('p');wrap.appendChild(run);}run.appendChild(n);}
 }
 wrap.querySelectorAll('p').forEach(p=>{if(!p.textContent.trim()&&!p.querySelector('img'))p.remove();});
 // a table's first row is its header row
 wrap.querySelectorAll('table').forEach(t=>{
  const first=t.querySelector('tr');
  if(first&&!first.querySelector('th'))[...first.children].forEach(td=>{const th=document.createElement('th');th.innerHTML=td.innerHTML;td.replaceWith(th);});
  t.querySelectorAll('td,th').forEach(c=>{if(!c.innerHTML.trim())c.innerHTML='<br>';});
 });
 // cell paragraphs become plain cell text
 wrap.querySelectorAll('td p,th p').forEach(p=>{const parts=[...p.parentElement.children].filter(x=>x.tagName==='P');if(parts.length>1&&p!==parts[parts.length-1])p.insertAdjacentHTML('afterend','<br>');p.replaceWith(...p.childNodes);});
 return wrap.innerHTML||'<p><br></p>';
}

const textToHtml=t=>t.split(/\r?\n\s*\r?\n/).map(p=>p.trim()).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\r?\n/g,'<br>')+'</p>').join('');

export async function readNoteFile(file){
 const name=file.name||'Imported',ext=(name.split('.').pop()||'').toLowerCase(),base=name.replace(/\.[^.]+$/,'');
 let html='';
 if(ext==='docx'){
  const mammoth=(await import('mammoth/mammoth.browser.js')).default||(await import('mammoth/mammoth.browser.js'));
  const res=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()},{
   convertImage:mammoth.images.imgElement(async image=>{
    const buf=await image.read();
    const id=await api.putFile(buf.buffer?buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength):buf);
    return {src:'','data-file':id||''};
   })
  });
  html=res.value;
 }else if(ext==='md'||ext==='markdown'){html=mdToHtml(await file.text());}
 else if(ext==='html'||ext==='htm'){html=await file.text();}
 else if(ext==='doc'||ext==='rtf'){throw new Error('Save it as .docx first. Older Word and RTF files cannot be read.');}
 else html=textToHtml(await file.text());
 return {title:base.slice(0,120),html:tidyHtml(html)};
}
