import React,{useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {reorderTask} from './tasks.mjs';
export function useTaskDrag(tasks,commit){
 const session=useRef(null),[order,setOrder]=useState(null),[ghost,setGhost]=useState(null);
 const start=(e,task)=>{if(e.button!==0)return;const row=e.currentTarget.closest('.task'),r=row.getBoundingClientRect();session.current={task,button:e.currentTarget,list:row.closest('.task-list'),startX:e.clientX,startY:e.clientY,dx:e.clientX-r.x,dy:e.clientY-r.y,width:r.width,order:tasks,active:false};e.currentTarget.closest('main').setPointerCapture(e.pointerId);};
 const move=e=>{const s=session.current;if(!s)return;if(!s.active&&Math.hypot(e.clientX-s.startX,e.clientY-s.startY)<5)return;s.active=true;e.preventDefault();setGhost({task:s.task,x:e.clientX-s.dx,y:e.clientY-s.dy,width:s.width,angle:Math.max(-5,Math.min(5,(e.clientX-(s.lastX??s.startX))*.7))});s.lastX=e.clientX;
  const list=s.list,lr=list.getBoundingClientRect();if(e.clientY<lr.top+25)list.scrollTop-=8;if(e.clientY>lr.bottom-25)list.scrollTop+=8;
  const row=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest?.('[data-task-id]')).find(el=>el&&el.dataset.taskId!==s.task.id);if(!row)return;const r=row.getBoundingClientRect();s.order=reorderTask(s.order,s.task.id,row.dataset.taskId,e.clientY>r.y+r.height/2);setOrder(s.order);
 };
 const end=e=>{const s=session.current;if(!s)return;session.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(s.active){e.preventDefault();if(e.type!=='pointercancel')commit(s.order.map(t=>t.id));}else if(e.type!=='pointercancel')s.button.click();setOrder(null);setGhost(null);};
 return {order,dragId:ghost?.task.id,surfaceHandlers:{onPointerMove:move,onPointerUp:end,onPointerCancel:end},handlers:task=>({onPointerDown:e=>start(e,task)}),preview:ghost&&createPortal(<div className="task-drag-preview" style={{left:ghost.x,top:ghost.y,width:ghost.width,transform:`rotate(${ghost.angle||-3}deg)`}}><span className="preview-check"/><span>{ghost.task.title}</span></div>,document.body)};
}
