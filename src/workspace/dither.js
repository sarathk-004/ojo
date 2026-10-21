// Ordered-dither covers: a smooth two-colour gradient reduced to crisp pixels with an 8x8 Bayer matrix.
// Drawn once per cover on a tiny canvas and reused as an image, so they cost nothing to show.
export const DITHERS=[
 {id:'d-sage',name:'Sage',a:'#2f4a37',b:'#dfeadb',shape:'diag'},
 {id:'d-dusk',name:'Dusk',a:'#3b3566',b:'#f0c9d4',shape:'rise'},
 {id:'d-sand',name:'Sand',a:'#a9855a',b:'#f7efd9',shape:'diag'},
 {id:'d-sky',name:'Sky',a:'#2b4a6b',b:'#e5f0fa',shape:'rise'},
 {id:'d-clay',name:'Clay',a:'#7a3b2a',b:'#f6dccb',shape:'orb'},
 {id:'d-mono',name:'Mono',a:'#1f2220',b:'#eceae3',shape:'orb'}
];
const BAYER=(()=>{
 let m=[[0]];
 for(let n=1;n<8;n*=2){const s=n*2,next=Array.from({length:s},()=>Array(s).fill(0));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=m[y][x]*4;next[y][x]=v;next[y][x+n]=v+2;next[y+n][x]=v+3;next[y+n][x+n]=v+1;}
  m=next;}
 return m.map(r=>r.map(v=>(v+.5)/64));
})();
const cache=new Map();
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
export function ditherURL(id,w=192,h=40){
 const key=id+w+'x'+h;
 if(cache.has(key))return cache.get(key);
 const d=DITHERS.find(x=>x.id===id)||DITHERS[0];
 let url='';
 try{
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d'),img=g.createImageData(w,h),A=hex(d.a),B=hex(d.b);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=x/(w-1),v=y/(h-1);
   let t;
   if(d.shape==='diag')t=Math.min(1,Math.max(0,(u*.78+(1-v)*.22)));
   else if(d.shape==='rise')t=Math.min(1,Math.max(0,1-v*1.05+Math.sin(u*Math.PI*2)*.08));
   else{const dx=(u-.72)*(w/h)*.55,dy=v-.35;t=Math.min(1,Math.max(0,1-Math.sqrt(dx*dx+dy*dy)*1.15));}
   const c=t>BAYER[y&7][x&7]?B:A,i=(y*w+x)*4;
   img.data[i]=c[0];img.data[i+1]=c[1];img.data[i+2]=c[2];img.data[i+3]=255;
  }
  g.putImageData(img,0,0);url=cv.toDataURL('image/png');
 }catch{url='';}
 cache.set(key,url);return url;
}
export const ditherStyle=(id,w,h)=>{const u=ditherURL(id,w,h);return u?{backgroundImage:'url('+u+')',backgroundSize:'cover',backgroundPosition:'center',imageRendering:'pixelated'}:{background:'#8a9184'};};
