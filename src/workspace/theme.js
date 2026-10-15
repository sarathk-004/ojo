import {api} from './api.js';

// Light, dark, or follow Windows. The choice is a harmless preference kept in this browser profile.
const KEY='tnkr-theme';
export const getTheme=()=>{try{return localStorage.getItem(KEY)||'system';}catch{return 'system';}};
const wantsDark=mode=>mode==='dark'||(mode==='system'&&typeof matchMedia!=='undefined'&&matchMedia('(prefers-color-scheme: dark)').matches);
export function applyTheme(mode=getTheme()){
 const dark=wantsDark(mode);
 document.documentElement.dataset.theme=dark?'dark':'light';
 try{api.setTheme&&api.setTheme(dark);}catch{}
 return dark;
}
export function setTheme(mode){try{localStorage.setItem(KEY,mode);}catch{}return applyTheme(mode);}
// Keep "system" in step with Windows while the window is open.
export function watchSystemTheme(){
 if(typeof matchMedia==='undefined')return()=>{};
 const mq=matchMedia('(prefers-color-scheme: dark)'),fn=()=>{if(getTheme()==='system')applyTheme('system');};
 mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn);
}
