import {useEffect} from 'react';
import {mobile} from './mobile.js';

export function useMobileKeyboard(){
 useEffect(()=>{
  if(!mobile)return;
  const viewport=window.visualViewport;
  let baseline=window.innerHeight,frame;
  const update=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const height=viewport?.height||window.innerHeight;
    baseline=Math.max(baseline,height);
    const editing=document.activeElement?.matches('input,textarea,[contenteditable=true]');
    const open=editing&&baseline-height>100;
    const shell=document.querySelector('.mobile');
    shell?.classList.toggle('keyboard-open',!!open);
    shell?.style.setProperty('--mobile-viewport-height',`${height}px`);
    const active=document.activeElement;
    if(!editing)return;
    if(active.isContentEditable){
     const selection=window.getSelection();
     if(selection?.rangeCount&&active.contains(selection.anchorNode)){
      const caret=selection.getRangeAt(0).getBoundingClientRect(),box=active.getBoundingClientRect();
      if(caret.bottom>box.bottom-20)active.scrollTop+=caret.bottom-box.bottom+20;
      else if(caret.top<box.top+8)active.scrollTop-=box.top+8-caret.top;
     }
    }else active.scrollIntoView({block:'nearest',inline:'nearest'});
   });
  };
  window.addEventListener('resize',update);viewport?.addEventListener('resize',update);
  document.addEventListener('focusin',update);document.addEventListener('input',update);
  update();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',update);viewport?.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('input',update);};
 },[]);
}
