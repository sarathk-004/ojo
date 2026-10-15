import {api} from './api.js';
import {classifyText,classifyFile} from './classify.mjs';
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#38;/g,'&').replace(/&quot;/g,'"');
// The page address behind whatever was dragged: a link tile's href, not its thumbnail.
const anchorFromHtml=html=>{const m=(html||'').match(/<a\s[^>]*href=["'](https?:[^"']+)/i);return m?decode(m[1]):'';};
const imgFromHtml=html=>{const m=(html||'').match(/<img[^>]+src=["']([^"']+)/i);return m&&/^https?:/i.test(m[1])?m[1]:'';};

// Fills in what can be learned about a record: titles and readable text for web pages,
// and a local copy for linked PDFs and documents so they open offline.
async function enrich(rec){
 if(rec.download&&rec.url){
  const got=await api.fetchFile(rec.url,rec.kind==='pdf'?'pdf':undefined);
  if(got&&!got.error)return {...rec,fileId:got.fileId,size:got.size,mime:rec.mime||got.mime};
  return {...rec,note:got?.error};
 }
 if(!rec.url||(rec.kind!=='link'&&rec.kind!=='youtube'))return rec;
 const meta=await api.meta(rec.url);
 if(!meta)return rec;
 if(rec.kind==='youtube')return {...rec,title:meta.title||rec.title,author:meta.author};
 const generic=!meta.title||meta.title.length>120;
 return {...rec,page:generic?undefined:meta.title,image:meta.image,description:meta.description,content:meta.content||undefined};
}
// Turns anything dropped or pasted (files, links, images, text) into saved-item records.
export async function ingest(dt){
 const out=[];
 const files=[...(dt.files||[])];
 // Read the transfer synchronously; it is cleared once the handler yields.
 const uriList=dt.getData('text/uri-list'),text=dt.getData('text/plain'),html=dt.getData('text/html');
 // Dragging a tile, thumbnail or link out of a web page also carries its picture as a file.
 // What was meant is the link, so a web address wins over those files. Files from Explorer have none.
 const link=(uriList.split(/\r?\n/).find(l=>/^https?:/i.test(l.trim()))||'').trim()||anchorFromHtml(html);
 if(link){
  const rec=classifyText({text:link,uriList:link});
  if(rec)out.push(await enrich(rec));
  return out;
 }
 // A file opened from disk in a browser tab is dragged out as a file:// link. Copy the file itself in.
 const fileLink=(uriList.split(/\r?\n/).find(l=>/^file:/i.test(l.trim()))||'').trim();
 if(fileLink&&!files.length){
  const got=await api.fetchFile(fileLink);
  if(got&&!got.error){
   const info=classifyFile({name:got.name||'file',type:''});
   out.push({...info,fileId:got.fileId,size:got.size,mime:info.kind==='pdf'?'application/pdf':undefined});
   return out;
  }
 }
 for(const f of files){
  const info=classifyFile({name:f.name,type:f.type});
  const buf=await f.arrayBuffer();
  const fileId=await api.putFile(buf);
  out.push({...info,fileId,mime:f.type||info.mime||'application/octet-stream',size:f.size});
 }
 if(!files.length){
  const img=!uriList&&!text?imgFromHtml(html):'';
  const rec=classifyText({text:text||img,uriList:uriList||img});
  if(rec)out.push(await enrich(rec));
 }
 return out;
}
export async function ingestText(text){
 const rec=classifyText({text});
 return rec?[await enrich(rec)]:[];
}
