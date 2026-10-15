// One-time recolour inside the workspace: the orange accent becomes slate gray, so the app itself is one calm color family.
// Orange stays in the brand (logo, app icon). Reds, cover colours and chart palettes are left alone.
import fs from 'node:fs';
import path from 'node:path';
const toHsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60;}return [h,s,l];};
const toRgb=(h,s,l)=>{h/=360;const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};let r,g,b;if(!s)r=g=b=l;else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=f(p,q,h+1/3);g=f(p,q,h);b=f(p,q,h-1/3);}return [r,g,b].map(x=>Math.round(x*255));};
const hex=a=>a.map(x=>x.toString(16).padStart(2,'0')).join('');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function mono(h,s,l){
 if(h<20||h>34||s<.5)return null;                       // only the orange accent family
 if(l>.78)return [215,.13,clamp(l,.86,.93)];            // soft tints -> pale slate
 return [215,.14,clamp(l-.16,.3,.46)];                  // accents -> slate
}
function recolour(text){
 let n=0;
 const out=text.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g,(m,h6)=>{
  let h=h6;if(h.length===3)h=h.split('').map(c=>c+c).join('');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),a=h.slice(6);
  const t=mono(...toHsl(r,g,b));if(!t)return m;
  n++;return '#'+hex(toRgb(...t))+a;
 });
 return [out,n];
}
const files=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(css|jsx|mjs|js)$/.test(e.name)&&!/(finance|jobs|classify|documents|mascot-paths)\.mjs$|NoteHead\.jsx$|Calendar\.jsx$|(notch|capture|nudge)\.css$|Notch\.jsx$/.test(e.name))files.push(p);}};
walk('src/workspace');
let all=0;
for(const f of files){const s=fs.readFileSync(f,'utf8'),[o,n]=recolour(s);if(n){fs.writeFileSync(f,o);all+=n;}}
console.log('recoloured',all);
