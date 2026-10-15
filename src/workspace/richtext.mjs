// Task notes may be plain text (typed here) or a little HTML (written with formatting on the phone or the widget).
// These helpers make either safe to show, and give a short plain-text preview.
const ALLOWED=new Set(['b','strong','i','em','u','s','strike','h1','h2','h3','h4','p','div','br','ul','ol','li','blockquote','code','pre']);
const ENT={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const esc=t=>t.replace(/&(?!(?:nbsp|amp|lt|gt|quot|apos|#\d+);)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const looksLikeHtml=s=>/<\/?[a-z][a-z0-9]*[^>]*>/i.test(s||'');

// Plain text becomes paragraphs; HTML keeps only simple formatting tags, with every attribute removed.
export function sanitizeNote(raw){
 const s=String(raw||'');
 if(!s.trim())return '';
 if(!looksLikeHtml(s))return s.split(/\n{2,}/).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
 const noScripts=s.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi,'');
 let out='',last=0;
 const re=/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi;
 let m;
 while((m=re.exec(noScripts))){
  out+=esc(noScripts.slice(last,m.index));last=re.lastIndex;
  const tag=m[2].toLowerCase();
  if(!ALLOWED.has(tag))continue;
  out+=tag==='br'?'<br>':m[1]?'</'+tag+'>':'<'+tag+'>';
 }
 return out+esc(noScripts.slice(last));
}
// A short readable line for collapsed rows.
export function notePreview(raw,max=160){
 const s=String(raw||'');
 const text=(looksLikeHtml(s)?s.replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,''):s)
  .replace(/&(nbsp|amp|lt|gt|quot|apos);/g,(_,k)=>ENT[k]).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g,' ').trim();
 return text.length>max?text.slice(0,max-1).trimEnd()+'…':text;
}
