import {useEffect} from 'react';
export function useHorizontalScroll(){
 useEffect(()=>{const wheel=e=>{const el=e.target.closest?.('.horizontal-scroll');if(!el||el.scrollWidth<=el.clientWidth+1)return;const delta=e.deltaX||(e.shiftKey||el.dataset.wheelHorizontal==='true'?e.deltaY:0);if(!delta)return;const before=el.scrollLeft;el.scrollLeft+=delta*(e.deltaMode===1?16:e.deltaMode===2?el.clientWidth:1);if(el.scrollLeft!==before)e.preventDefault();};document.addEventListener('wheel',wheel,{passive:false});return()=>document.removeEventListener('wheel',wheel);},[]);
}
