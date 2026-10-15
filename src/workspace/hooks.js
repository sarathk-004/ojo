import {useEffect,useRef,useState,useCallback} from 'react';
import {api} from './api.js';
// A collection kept in sync with the main process. Writes are debounced.
export function useCollection(name){
 const [items,setItems]=useState([]),[ready,setReady]=useState(false);
 const timer=useRef(null),latest=useRef([]);
 useEffect(()=>{
  let live=true;
  api.load().then(d=>{if(live){latest.current=d[name]||[];setItems(latest.current);setReady(true);}});
  const off=api.onChanged(({name:n,items:next})=>{if(n===name){clearTimeout(timer.current);latest.current=next;setItems(next);}});
  return()=>{live=false;off();};
 },[name]);
 useEffect(()=>()=>{if(timer.current){clearTimeout(timer.current);api.save(name,latest.current);}},[name]);
 const update=useCallback(fn=>{
  const next=typeof fn==='function'?fn(latest.current):fn;
  latest.current=next;setItems(next);
  clearTimeout(timer.current);
  timer.current=setTimeout(()=>{timer.current=null;api.save(name,latest.current);},300);
 },[name]);
 return [items,update,ready];
}
export function useFileUrl(fileId,mime){
 const [url,setUrl]=useState('');
 useEffect(()=>{
  if(!fileId){setUrl('');return;}
  let live=true,made='';
  api.getFile(fileId).then(buf=>{if(!live||!buf)return;made=URL.createObjectURL(new Blob([buf],{type:mime||'application/octet-stream'}));setUrl(made);});
  return()=>{live=false;if(made)URL.revokeObjectURL(made);setUrl('');};
 },[fileId,mime]);
 return url;
}
export function useTasks(){
 const [tasks,setTasks]=useState([]);
 useEffect(()=>{api.load().then(d=>setTasks(d.tasks||[]));},[]);
 return tasks;
}
export const uid=()=>crypto.randomUUID();
export const fmtSize=b=>!b?'':b<1024*1024?Math.max(1,Math.round(b/1024))+' KB':(b/1024/1024).toFixed(1)+' MB';
export function useFileText(fileId,inline){
 const [text,setText]=useState(inline||'');
 useEffect(()=>{
  if(inline!==undefined&&inline!==null&&inline!==''){setText(inline);return;}
  if(!fileId){setText('');return;}
  let live=true;
  api.getFile(fileId).then(buf=>{if(live&&buf)setText(new TextDecoder().decode(buf));});
  return()=>{live=false;};
 },[fileId,inline]);
 return text;
}
