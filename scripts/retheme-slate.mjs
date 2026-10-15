// One-time recolour inside the workspace: warm paper and charcoal neutrals become slate grays. Orange accents, reds and
// the cover colours are left alone. Originals are kept in qa/backup-before-slate.
import fs from 'node:fs';
import path from 'node:path';
const toHsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60;}return [h,s,l];};
const toRgb=(h,s,l)=>{h/=360;const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};let r,g,b;if(!s)r=g=b=l;else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=f(p,q,h+1/3);g=f(p,q,h);b=f(p,q,h-1/3);}return [r,g,b].map(x=>Math.round(x*255));};
const hex=a=>a.map(x=>x.toString(16).padStart(2,'0')).join('');
function slate(h,s,l){
 if(s<.01||s>.45||h<20||h>110)return null;       // pure greys, strong colours, reds and blues stay
 return [215,l>.7?.13:l>.35?.08:.10,l];            // slate: cool, low saturation, same lightness
}
function recolour(text){
 let n=0;
 const out=text.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g,(m,h6)=>{
  let h=h6;if(h.length===3)h=h.split('').map(c=>c+c).join('');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),a=h.slice(6);
  const t=slate(...toHsl(r,g,b));if(!t)return m;
  n++;return '#'+hex(toRgb(...t))+a;
 });
 return [out,n];
}
const files=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(css|jsx|mjs|js)$/.test(e.name)&&!/(finance|jobs|classify|documents|mascot-paths)\.mjs$|workspace-dark\.css$|NoteHead\.jsx$/.test(e.name))files.push(p);}};
walk('src/workspace');
let all=0;
for(const f of files){const s=fs.readFileSync(f,'utf8'),[o,n]=recolour(s);if(n){fs.writeFileSync(f,o);all+=n;}}
console.log('recoloured',all);
