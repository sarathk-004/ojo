// Small Markdown renderer. All text is HTML-escaped first, so output is safe to inject.
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inline=s=>esc(s)
 .replace(/`([^`\n]+)`/g,'<code>$1</code>')
 .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g,(_,a,b)=>`<strong>${a||b}</strong>`)
 .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)|(^|[^_\w])_([^_\n]+)_(?!\w)/g,(m,p1,a,p2,b)=>`${p1||p2}<em>${a||b}</em>`)
 .replace(/~~([^~\n]+)~~/g,'<del>$1</del>')
 .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g,'<img alt="$1" src="$2">')
 .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>');
export function mdToHtml(src=''){
 const lines=src.replace(/\r\n?/g,'\n').split('\n'),out=[];
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(/^```/.test(line)){
   const buf=[];i++;
   while(i<lines.length&&!/^```/.test(lines[i]))buf.push(lines[i++]);
   i++;out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);continue;
  }
  let m;
  if((m=line.match(/^(#{1,6})\s+(.*)$/))){out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);i++;continue;}
  if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)){out.push('<hr>');i++;continue;}
  if(/^>\s?/.test(line)){
   const buf=[];while(i<lines.length&&/^>\s?/.test(lines[i]))buf.push(lines[i++].replace(/^>\s?/,''));
   out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);continue;
  }
  if(/^\s*[-*+]\s+/.test(line)){
   const items=[];while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i]))items.push(lines[i++].replace(/^\s*[-*+]\s+/,''));
   out.push('<ul>'+items.map(t=>{const c=t.match(/^\[( |x|X)\]\s+(.*)$/);return c?`<li class="task${c[1]!==' '?' done':''}">${inline(c[2])}</li>`:`<li>${inline(t)}</li>`;}).join('')+'</ul>');continue;
  }
  if(/^\s*\d+[.)]\s+/.test(line)){
   const items=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i]))items.push(lines[i++].replace(/^\s*\d+[.)]\s+/,''));
   out.push('<ol>'+items.map(t=>`<li>${inline(t)}</li>`).join('')+'</ol>');continue;
  }
  if(!line.trim()){i++;continue;}
  const buf=[];
  while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|```|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i]))buf.push(lines[i++]);
  out.push(`<p>${inline(buf.join(' '))}</p>`);
 }
 return out.join('\n');
}
