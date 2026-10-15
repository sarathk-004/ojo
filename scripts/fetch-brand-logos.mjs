// Fetches the icon each service publishes on its own website (apple-touch-icon first, then its icon links, then /favicon.ico)
// and saves it to src/workspace/brand-logos/<id>.<ext>, so the app ships real logos instead of initials.
// Run: node scripts/fetch-brand-logos.mjs   (only brands tagged with a domain in brands.jsx)
import fs from 'node:fs/promises';
const src=await fs.readFile('src/workspace/brands.jsx','utf8');
const brands=[...src.matchAll(/D\('([^']+)',B\('([a-z0-9]+)'/g)].map(m=>({domain:m[1],id:m[2]}));
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const get=async(u,ms=12000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{signal:ac.signal,headers:{'user-agent':UA,'accept':'*/*'},redirect:'follow'});return r.ok?r:null;}catch{return null;}finally{clearTimeout(t);}};
const extOf=(type,u)=>/svg/.test(type)||/\.svg(\?|$)/i.test(u)?'svg':/png/.test(type)||/\.png(\?|$)/i.test(u)?'png':/webp/.test(type)?'webp':/jpe?g/.test(type)?'jpg':'ico';
await fs.mkdir('src/workspace/brand-logos',{recursive:true});
for(const {domain,id} of brands){
 const base='https://'+domain+'/';
 const found=[];
 const page=await get(base);
 let finalBase=base;
 if(page){
  finalBase=page.url||base;
  if(/html/i.test(page.headers.get('content-type')||'')){
   const html=(await page.text()).slice(0,600000);
   for(const m of html.matchAll(/<link\b[^>]*>/gi)){
    const tag=m[0],rel=(tag.match(/rel=["']([^"']+)["']/i)||[])[1]||'',href=(tag.match(/href=["']([^"']+)["']/i)||[])[1];
    if(!href||!/icon/i.test(rel)||/mask-icon/i.test(rel))continue;
    const size=parseInt(((tag.match(/sizes=["'](\d+)/i)||[])[1])||'0',10);
    found.push({href,score:(/apple-touch/i.test(rel)?1000:0)+size+(/\.svg/i.test(href)?500:0)});
   }
  }
 }
 found.sort((a,b)=>b.score-a.score);
 const urls=[...found.map(f=>{try{return new URL(f.href,finalBase).href;}catch{return null;}}).filter(Boolean),new URL('/favicon.ico',finalBase).href];
 let saved=false;
 for(const u of urls.slice(0,6)){
  const r=await get(u);if(!r)continue;
  const type=(r.headers.get('content-type')||'').split(';')[0];
  if(/html/i.test(type))continue;
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.length<100||buf.length>1500000)continue;
  for(const old of await fs.readdir('src/workspace/brand-logos'))if(old.startsWith(id+'.'))await fs.rm('src/workspace/brand-logos/'+old);
  const file='src/workspace/brand-logos/'+id+'.'+extOf(type,u);
  await fs.writeFile(file,buf);
  console.log('ok  ',id.padEnd(14),buf.length+' bytes',u);saved=true;break;
 }
 if(!saved)console.log('MISS',id,domain);
}
