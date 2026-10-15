import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

if(!pdfjs.GlobalWorkerOptions.workerPort)pdfjs.GlobalWorkerOptions.workerPort=new PdfWorker();

// Text of a PDF as lines (items on the same baseline are joined left to right). Runs entirely in this window.
// Throws {needPassword:true,wrong:boolean} for protected files.
export async function pdfLines(buffer,password,maxPages=Infinity){
 let doc;
 try{
  doc=await pdfjs.getDocument({data:new Uint8Array(buffer.slice(0)),password:password||undefined}).promise;
 }catch(e){
  if(e&&e.name==='PasswordException')throw {needPassword:true,wrong:e.code===2};
  throw e;
 }
 const lines=[];
 for(let p=1;p<=Math.min(doc.numPages,maxPages);p++){
  const page=await doc.getPage(p),content=await page.getTextContent();
  const rows=[];
  for(const it of content.items){
   if(!('str' in it)||!it.str.trim())continue;
   const y=Math.round(it.transform[5]/3),x=it.transform[4];
   let row=rows.find(r=>Math.abs(r.y-y)<=1);
   if(!row){row={y,items:[]};rows.push(row);}
   row.items.push({x,s:it.str});
  }
  rows.sort((a,b)=>b.y-a.y);
  for(const r of rows)lines.push(r.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim());
 }
 await doc.destroy();
 return lines;
}

