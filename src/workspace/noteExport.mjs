// Turns a note's HTML into Markdown, for export and "copy as Markdown". No DOM needed, so it is testable.
const VOID=new Set(['br','hr','img','input','meta','link']);
const BLOCK=new Set(['p','div','section','article','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','hr','table','thead','tbody','tr','details','summary','figure']);
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…'};
const decode=s=>s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,(m,e)=>{
 if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return Number.isFinite(n)&&n>0&&n<0x110000?String.fromCodePoint(n):m;}
 return ENT[e.toLowerCase()]??m;
});
function attrsOf(s){
 const out={},re=/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;let m;
 while((m=re.exec(s||'')))out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return out;
}
export function parseHtml(html){
 const root={tag:'#root',attrs:{},children:[]},stack=[root];
 const re=/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*?)?)\s*(\/?)>|([^<]+)|</g;
 let m;
 while((m=re.exec(String(html||'')))){
  const cur=stack[stack.length-1];
  if(m[5]!==undefined)cur.children.push({text:decode(m[5])});
  else if(m[2]){
   const tag=m[2].toLowerCase();
   if(m[1]){for(let i=stack.length-1;i>0;i--)if(stack[i].tag===tag){stack.length=i;break;}}
   else{
    if(tag==='script'||tag==='style'){const end=html.toLowerCase().indexOf('</'+tag,re.lastIndex);if(end>=0)re.lastIndex=end;continue;}
    const node={tag,attrs:attrsOf(m[3]),children:[]};cur.children.push(node);
    if(!VOID.has(tag)&&!m[4])stack.push(node);
   }
  }
 }
 return root;
}
const cls=n=>(n.attrs&&n.attrs.class||'').split(/\s+/);
const isText=n=>n.text!==undefined;
const textOf=n=>isText(n)?n.text:n.tag==='button'||cls(n).includes('kb-grip')?'':n.children.map(textOf).join('');
const squash=s=>s.replace(/\s+/g,' ');

function inline(n){
 if(isText(n))return squash(n.text);
 const kids=()=>n.children.map(inline).join('');
 switch(n.tag){
  case 'br':return '  \n';
  case 'button':case 'input':case 'script':case 'style':return '';
  case 'b':case 'strong':{const k=kids();return k.trim()?'**'+k.trim()+'**':k;}
  case 'i':case 'em':{const k=kids();return k.trim()?'*'+k.trim()+'*':k;}
  case 's':case 'strike':case 'del':{const k=kids();return k.trim()?'~~'+k.trim()+'~~':k;}
  case 'code':return '`'+textOf(n)+'`';
  case 'a':{const k=kids().trim()||n.attrs.href||'';return n.attrs.href&&!cls(n).includes('page-link')?'['+k+']('+n.attrs.href+')':k;}
  case 'img':return n.attrs.alt?'*['+n.attrs.alt+']*':'*[image]*';
  default:return kids();
 }
}
const blockLike=n=>!isText(n)&&BLOCK.has(n.tag);
const clean=s=>s.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const indent=(s,pad)=>s.split('\n').map(l=>l?pad+l:l).join('\n');

function blocks(children,ctx){
 const out=[];let run=[];
 const flush=()=>{if(!run.length)return;const t=run.map(inline).join('').trim();if(t)out.push(t);run=[];};
 for(const n of children){
  if(blockLike(n)||(!isText(n)&&(cls(n).includes('kanban')||cls(n).includes('callout')))){flush();const b=block(n,ctx);if(b!==null&&b!=='')out.push(b);}
  else run.push(n);
 }
 flush();
 return out.join('\n\n');
}
function list(n,depth){
 const ordered=n.tag==='ol',todo=cls(n).includes('todo');let i=0;
 return n.children.filter(c=>!isText(c)&&c.tag==='li').map(li=>{
  i++;
  const own=[],nested=[];
  for(const c of li.children){if(!isText(c)&&(c.tag==='ul'||c.tag==='ol'))nested.push(list(c,depth+1));else own.push(c);}
  const text=own.map(inline).join('').trim();
  const mark=todo?('['+(li.attrs&&'data-done' in li.attrs?'x':' ')+'] '):'';
  let line=(ordered?i+'. ':'- ')+mark+text;
  if(nested.length)line+='\n'+indent(nested.join('\n'),ordered?'   ':'  ');
  return line;
 }).join('\n');
}
function table(n){
 const rows=[];
 const walk=x=>{for(const c of x.children){if(isText(c))continue;if(c.tag==='tr')rows.push(c.children.filter(k=>!isText(k)&&(k.tag==='td'||k.tag==='th')).map(k=>squash(textOf(k)).trim().replace(/\|/g,'\\|')));else walk(c);}};
 walk(n);
 if(!rows.length)return '';
 const w=Math.max(...rows.map(r=>r.length)),pad=r=>[...r,...Array(w-r.length).fill('')];
 const line=r=>'| '+pad(r).join(' | ')+' |';
 return [line(rows[0]),'| '+Array(w).fill('---').join(' | ')+' |',...rows.slice(1).map(line)].join('\n');
}
function block(n,ctx){
 const t=n.tag;
 if(cls(n).includes('kanban')){
  const name=squash(textOf(n.children.find(c=>!isText(c)&&c.children&&cls(c).includes('kb-top'))||{children:[]})).replace(/Delete board/,'').trim();
  const cols=[];
  const find=(x)=>{for(const c of x.children){if(isText(c))continue;if(cls(c).includes('kb-col'))cols.push(c);else find(c);}};
  find(n);
  const body=cols.map(col=>{
   const head=squash(textOf(col.children.find(c=>!isText(c)&&cls(c).includes('kb-head'))||{children:[]})).replace(/×/g,'').trim();
   const cards=[];const f=x=>{for(const c of x.children){if(isText(c))continue;if(cls(c).includes('kb-text'))cards.push(squash(textOf(c)).trim());else f(c);}};f(col);
   return '**'+head+'**\n'+cards.filter(Boolean).map(c=>'- '+c).join('\n');
  }).join('\n\n');
  return '### '+(name||'Board')+'\n\n'+body;
 }
 if(cls(n).includes('callout'))return clean(blocks(n.children,ctx)).split('\n').map(l=>'> '+l).join('\n');
 if(/^h[1-6]$/.test(t))return '#'.repeat(+t[1])+' '+n.children.map(inline).join('').trim();
 switch(t){
  case 'p':return n.children.map(inline).join('').trim();
  case 'ul':case 'ol':return list(n,0);
  case 'blockquote':return clean(blocks(n.children,ctx)).split('\n').map(l=>'> '+l).join('\n');
  case 'pre':{const code=n.children.find(c=>!isText(c)&&c.tag==='code'),lang=((code&&cls(code).find(c=>c.startsWith('language-')))||(n.attrs['data-lang']?'language-'+n.attrs['data-lang']:'')).replace('language-','');return '```'+lang+'\n'+textOf(n).replace(/\n$/,'')+'\n```';}
  case 'hr':return '---';
  case 'table':return table(n);
  case 'details':{
   const sum=n.children.find(c=>!isText(c)&&c.tag==='summary');
   const rest=n.children.filter(c=>c!==sum);
   return '**'+squash(textOf(sum||{children:[]})).trim()+'**'+(rest.length?'\n\n'+blocks(rest,ctx):'');
  }
  case 'summary':return '';
  case 'li':return '- '+n.children.map(inline).join('').trim();
  default:return blocks(n.children,ctx);
 }
}
export function htmlToMarkdown(html){
 return clean(blocks(parseHtml(html).children,{}))+'\n';
}
// A safe file name for an exported note.
export const fileNameFor=(title,ext)=>(String(title||'Untitled').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Untitled')+'.'+ext;
