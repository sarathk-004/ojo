// Brings the original sage-green palette back. Each current line that matches a line of the pre-orange backup (same text apart
// from colours) takes its original colours; lines written since get an approximate green/warm-paper mapping.
import fs from 'node:fs';
import path from 'node:path';
const ORIG='qa/backup-before-ojo-orange/src';
const HEX=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const skel=l=>l.replace(HEX,'#');
const toHsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60;}return [h,s,l];};
const toRgb=(h,s,l)=>{h/=360;const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};let r,g,b;if(!s)r=g=b=l;else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=f(p,q,h+1/3);g=f(p,q,h);b=f(p,q,h-1/3);}return [r,g,b].map(x=>Math.round(x*255));};
const hx=a=>a.map(x=>x.toString(16).padStart(2,'0')).join('');
// approximate: slate accent -> sage, other slate -> warm paper, orange -> sage
function approx(m){
 let h=m.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');
 const a=h.slice(6),[H,S,L]=toHsl(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16));
 let t=null;
 if(H>=205&&H<=225&&S>.01&&S<.2){t=(S>=.135&&S<=.145&&L>=.28&&L<=.47)?[124,.18,Math.min(.6,L+.02)]:L>.7?[43,.24,L]:[100,.14,L];}
 else if(H>=20&&H<=34&&S>=.5){t=L>.78?[96,.2,L]:[124,.18,Math.max(.32,L-.12)];}
 return t?'#'+hx(toRgb(...t))+a:m;
}
function lcs(a,b){
 const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const pairs=new Map();let i=0,j=0;
 while(i<n&&j<m){if(a[i]===b[j]){pairs.set(i,j);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
 return pairs;
}
let restored=0,approxed=0,files=0;
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(css|jsx|mjs|js)$/.test(e.name))fix(p);}};
function fix(p){
 const op=path.join(ORIG,path.relative('src',p));
 const cur=fs.readFileSync(p,'utf8').split('\n');
 if(!cur.some(l=>HEX.test(l))){HEX.lastIndex=0;return;}
 HEX.lastIndex=0;
 const orig=fs.existsSync(op)?fs.readFileSync(op,'utf8').split('\n'):[];
 const pairs=lcs(cur.map(skel),orig.map(skel));
 let changed=false;
 const out=cur.map((l,i)=>{
  if(!HEX.test(l)){HEX.lastIndex=0;return l;}HEX.lastIndex=0;
  if(pairs.has(i)){const o=orig[pairs.get(i)];if(o!==l){changed=true;restored++;}return o;}
  const n=l.replace(HEX,approx);if(n!==l){changed=true;approxed++;}return n;
 });
 if(changed){fs.writeFileSync(p,out.join('\n'));files++;}
}
walk('src');
console.log({files,restored,approxed});
