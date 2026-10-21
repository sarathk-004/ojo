import {NODE_COLORS,NODE_W,NODE_H,FONTS,SIZES,EDGE_COLORS,isGroup,kindOf,anchors} from './canvas.mjs';

// Draws a board as a standalone SVG (and from it PNG or JPG). Plain geometry, no screenshots,
// so the picture is sharp at any size and keeps working without the app.
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const BG='#fbfaf6',INK='#2c332b',MUTED='#7b8478',LINE='#8a928a',COMMENT='#f6ecb4';

let ctx=null;
function measure(text,font){
 if(!ctx&&typeof document!=='undefined')ctx=document.createElement('canvas').getContext('2d');
 if(!ctx)return text.length*7;
 ctx.font=font;return ctx.measureText(text).width;
}
function wrap(text,font,max){
 const lines=[];
 for(const para of String(text||'').split('\n')){
  let line='';
  for(const word of para.split(/\s+/).filter(Boolean)){
   const t=line?line+' '+word:word;
   if(line&&measure(t,font)>max){lines.push(line);line=word;}else line=t;
  }
  lines.push(line);
 }
 return lines;
}

export function boardSvg(nodes,edges,sizes={}){
 const boxOf=n=>isGroup(n)?{id:n.id,x:n.x,y:n.y,w:n.w||320,h:n.h||220}:{id:n.id,x:n.x,y:n.y,w:(sizes[n.id]&&sizes[n.id].w)||NODE_W,h:(sizes[n.id]&&sizes[n.id].h)||NODE_H};
 const boxes=Object.fromEntries(nodes.map(n=>[n.id,boxOf(n)]));
 const all=Object.values(boxes);
 if(!all.length)return null;
 const pad=48;
 const x0=Math.min(...all.map(b=>b.x))-pad,y0=Math.min(...all.map(b=>b.y))-pad;
 const x1=Math.max(...all.map(b=>b.x+b.w))+pad,y1=Math.max(...all.map(b=>b.y+b.h))+pad;
 const W=Math.round(x1-x0),H=Math.round(y1-y0);
 const out=[];
 const marker=(id,c)=>`<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1.5 L9,5 L1,8.5 z" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/></marker>`;
 const used=new Set(['#8a928a']);
 const edgeColour=e=>EDGE_COLORS[e.color]||LINE;
 edges.forEach(e=>used.add(edgeColour(e)));
 const defs=[...used].map(c=>marker('a'+c.slice(1),c)).join('');
 // groups first so everything sits on top of them
 for(const n of nodes.filter(isGroup)){
  const b=boxes[n.id];
  out.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="16" fill="${NODE_COLORS[n.color]||NODE_COLORS.slate}" fill-opacity=".35" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="7 6"/>`);
  out.push(`<text x="${b.x+16}" y="${b.y+26}" font-size="13" font-weight="600" fill="${INK}" fill-opacity=".8">${esc(n.text||'Group')}</text>`);
 }
 for(const e of edges){
  const a=boxes[e.from],b=boxes[e.to];if(!a||!b)continue;
  const g=anchors(a,b),c=edgeColour(e),arrow=e.arrow||'end',id='url(#a'+c.slice(1)+')';
  out.push(`<path d="${g.d}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"${e.dash?' stroke-dasharray="7 6"':''}${arrow==='end'||arrow==='both'?` marker-end="${id}"`:''}${arrow==='both'?` marker-start="${id}"`:''}/>`);
  if(e.label){const w=measure(e.label,'12px sans-serif')+16;out.push(`<rect x="${g.mid.x-w/2}" y="${g.mid.y-11}" width="${w}" height="22" rx="11" fill="${BG}" stroke="${c}" stroke-opacity=".5"/><text x="${g.mid.x}" y="${g.mid.y+4}" font-size="12" text-anchor="middle" fill="${INK}">${esc(e.label)}</text>`);}
 }
 for(const n of nodes.filter(n=>!isGroup(n))){
  const b=boxes[n.id],kind=kindOf(n),shape=n.shape||'round';
  const fill=kind==='comment'&&(!n.color||n.color==='sage')?COMMENT:(NODE_COLORS[n.color]||NODE_COLORS.sage);
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  if(kind!=='text'){
   const st=`fill="${fill}" stroke="${INK}" stroke-opacity=".12"`;
   if(shape==='pill')out.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.h/2}" ${st}/>`);
   else if(shape==='ellipse')out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${b.w/2}" ry="${b.h/2}" ${st}/>`);
   else if(shape==='diamond')out.push(`<polygon points="${cx},${b.y} ${b.x+b.w},${cy} ${cx},${b.y+b.h} ${b.x},${cy}" ${st}/>`);
   else if(shape==='hexagon')out.push(`<polygon points="${b.x+b.w*.24},${b.y} ${b.x+b.w*.76},${b.y} ${b.x+b.w},${cy} ${b.x+b.w*.76},${b.y+b.h} ${b.x+b.w*.24},${b.y+b.h} ${b.x},${cy}" ${st}/>`);
   else out.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" ${st}/>`);
  }
  const size=SIZES[n.size||'m'],fam=(FONTS[n.font]&&FONTS[n.font].css!=='inherit'?FONTS[n.font].css:'Geist,Segoe UI,sans-serif'),weight=n.bold?700:400,style=n.italic?'italic':'normal';
  const font=`${style} ${weight} ${size}px ${fam.replace(/"/g,"'")}`;
  const lines=wrap(n.text||'',font,Math.max(40,b.w-28)),lh=size*1.3;
  const y=cy-((lines.length-1)*lh)/2+size*.35;
  out.push(`<text text-anchor="middle" font-family="${esc(fam)}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${INK}">${lines.map((l,i)=>`<tspan x="${cx}" y="${y+i*lh}">${esc(l)}</tspan>`).join('')}</text>`);
  if(n.tags&&n.tags.length)out.push(`<text x="${cx}" y="${b.y+b.h+14}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(n.tags.map(t=>'#'+t).join(' '))}</text>`);
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x0} ${y0} ${W} ${H}"><defs>${defs}</defs><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${BG}"/>${out.join('')}</svg>`;
 return {svg,w:W,h:H};
}

const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);};
export const fileSafe=t=>(String(t||'').trim().replace(/[\\/:*?"<>|]+/g,'').slice(0,60)||'canvas');

// kind: 'svg' | 'png' | 'jpg'. Resolves true when a file was handed over.
export async function exportBoard(kind,title,nodes,edges,sizes){
 const d=boardSvg(nodes,edges,sizes);if(!d)return false;
 const name=fileSafe(title);
 if(kind==='svg'){download(new Blob([d.svg],{type:'image/svg+xml'}),name+'.svg');return true;}
 const scale=Math.min(3,Math.max(1,4096/Math.max(d.w,d.h)));
 const img=new Image();
 await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(d.svg);});
 const c=document.createElement('canvas');c.width=Math.round(d.w*scale);c.height=Math.round(d.h*scale);
 const g=c.getContext('2d');g.fillStyle=BG;g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
 const mime=kind==='jpg'?'image/jpeg':'image/png';
 const blob=await new Promise(r=>c.toBlob(r,mime,.92));
 if(!blob)return false;
 download(blob,name+'.'+kind);return true;
}
