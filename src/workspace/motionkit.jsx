import React,{useEffect,useState} from 'react';
import {motion,MotionConfig} from 'motion/react';

// One motion vocabulary for the workspace. The CSS tokens in workspace-system.css use the same numbers,
// so CSS transitions and Motion animations feel like one system.
export const EASE={
 out:[0.22,1,0.36,1],   // decelerating entrance
 inout:[0.4,0,0.2,1],   // state change
 quick:[0.2,0,0,1],     // direct feedback
 in:[0.4,0,1,1]         // leaving
};
export const DUR={hover:.12,press:.09,tip:.15,pop:.18,dialog:.22,move:.24,panel:.26};
// Close to critically damped: it settles without a visible bounce and keeps its speed if interrupted.
export const SPRING={type:'spring',stiffness:520,damping:44,mass:1};
export const SPRING_SOFT={type:'spring',stiffness:380,damping:36,mass:1};

export const T={
 pop:{duration:DUR.pop,ease:EASE.out},
 popOut:{duration:.12,ease:EASE.in},
 dialog:{duration:DUR.dialog,ease:EASE.out},
 dialogOut:{duration:.14,ease:EASE.in},
 move:{duration:DUR.move,ease:EASE.inout},
 indicator:SPRING
};

// Variants for things that appear under a button (menus, popovers) and for sheets.
export const popIn={initial:{opacity:0,y:-4},animate:{opacity:1,y:0,transition:T.pop},exit:{opacity:0,y:-2,transition:T.popOut}};
export const dialogIn={initial:{opacity:0,y:8,scale:.985},animate:{opacity:1,y:0,scale:1,transition:T.dialog},exit:{opacity:0,y:4,scale:.99,transition:T.dialogOut}};
export const backdropIn={initial:{opacity:0},animate:{opacity:1,transition:{duration:DUR.dialog,ease:EASE.out}},exit:{opacity:0,transition:{duration:.14,ease:EASE.in}}};
// Rows that leave a list: fade out in place while the rest close the gap (used with AnimatePresence mode="popLayout").
export const rowOut={opacity:0,transition:{duration:.14,ease:EASE.in}};

export function MotionRoot({children}){
 return <MotionConfig reducedMotion="user" transition={T.move}>{children}</MotionConfig>;
}

// The background of the selected item in a group of tabs, a segmented control or the sidebar.
// Render it inside the selected item only; it glides to the next one when the selection changes.
// `group` must be unique per control on the page.
export function Pill({group,className='pill-bg'}){
 return <motion.span layoutId={'pill-'+group} className={className} aria-hidden="true" transition={T.indicator} initial={false}/>;
}

// True once, after the first paint: lets lists skip their entrance animation on first render.
export function useMounted(){
 const [m,setM]=useState(false);
 useEffect(()=>{const r=requestAnimationFrame(()=>setM(true));return()=>cancelAnimationFrame(r);},[]);
 return m;
}
