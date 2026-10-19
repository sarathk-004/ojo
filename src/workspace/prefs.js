import {useEffect,useState} from 'react';
// Personal settings: look, layout and behaviour. Stored in settings[0].prefs and applied live.
export const ACCENTS={
 sage:{name:'Sage',sage:'#567458',soft:'#e1e8dc',dark:'#2f3a2c'},
 ocean:{name:'Ocean',sage:'#4a7ba6',soft:'#dde8f2',dark:'#27394a'},
 plum:{name:'Plum',sage:'#8a5a86',soft:'#eadfe9',dark:'#3d2a3c'},
 clay:{name:'Clay',sage:'#b4623f',soft:'#f3e2d8',dark:'#4a2e22'},
 graphite:{name:'Graphite',sage:'#5d6470',soft:'#e4e6ea',dark:'#2a2e34'}
};
export const SCALES={small:{name:'Small',zoom:.92},default:{name:'Default',zoom:1},large:{name:'Large',zoom:1.1},xlarge:{name:'Extra large',zoom:1.2}};
export const COLUMN_COLORS={slate:'#8a9184',blue:'#4f7ea8',green:'#567458',amber:'#c9923f',plum:'#8a5a86',rose:'#b4533f'};
export const DEFAULT_COLUMNS=[{id:'todo',name:'To do',color:'slate'},{id:'doing',name:'In progress',color:'blue'},{id:'done',name:'Done',color:'green'}];
export const CAPTURE_KEYS=[
 {value:'',label:'Automatic'},
 {value:'CommandOrControl+Shift+Space',label:'Ctrl + Shift + Space'},
 {value:'CommandOrControl+Alt+Space',label:'Ctrl + Alt + Space'},
 {value:'CommandOrControl+Shift+K',label:'Ctrl + Shift + K'},
 {value:'CommandOrControl+Alt+K',label:'Ctrl + Alt + K'},
 {value:'CommandOrControl+Shift+J',label:'Ctrl + Shift + J'}
];
export const DEFAULTS={
 accent:'sage',scale:'default',density:'comfortable',noteWidth:'standard',
 hiddenPlaces:[],startPage:'last',hiddenLists:[],layout:'list',columns:DEFAULT_COLUMNS,
 codeTheme:'dark',codeSize:13,tabWidth:2,lineNumbers:true,
 weekStart:1,dateFormat:'dmy',sound:true,snooze:10,captureKey:''
};
export const getPrefs=settings=>({...DEFAULTS,...((settings&&settings[0]&&settings[0].prefs)||{})});

// What the rest of the code needs without a hook: dates and code options.
const live={...DEFAULTS};
export const dateLocale=()=>live.dateFormat==='mdy'?'en-US':'en-GB';
export const weekStart=()=>live.weekStart===0?0:1;
export const codeOptions=()=>({tab:live.tabWidth===4?4:2,lines:live.lineNumbers!==false});
export const dowNames=names=>weekStart()===0?[names[6],...names.slice(0,6)]:names;
export const columnsOf=p=>{const c=Array.isArray(p&&p.columns)&&p.columns.length>=2?p.columns:DEFAULT_COLUMNS;return c;};

// The three tiers of text colours a block of code needs.
const CODE_LIGHT=`.ws[data-codetheme=light] .note-body .cblock{background:#f3f1e8;color:#2a2f27}
.ws[data-codetheme=light] .note-body .cblock::before{color:#7d8a74}
.ws[data-codetheme=light] .cb-gutter{color:#a0a898;border-right-color:#dedacb}
.ws[data-codetheme=light] .note-body .cblock .cb-hl{color:#2a2f27}
.ws[data-codetheme=light] .cb-hl .hljs-keyword,.ws[data-codetheme=light] .cb-hl .hljs-selector-tag,.ws[data-codetheme=light] .cb-hl .hljs-literal,.ws[data-codetheme=light] .cb-hl .hljs-built_in{color:#a3358a}
.ws[data-codetheme=light] .cb-hl .hljs-string,.ws[data-codetheme=light] .cb-hl .hljs-regexp{color:#3d7a2e}
.ws[data-codetheme=light] .cb-hl .hljs-number,.ws[data-codetheme=light] .cb-hl .hljs-attr,.ws[data-codetheme=light] .cb-hl .hljs-attribute,.ws[data-codetheme=light] .cb-hl .hljs-variable{color:#a2661b}
.ws[data-codetheme=light] .cb-hl .hljs-title,.ws[data-codetheme=light] .cb-hl .hljs-section,.ws[data-codetheme=light] .cb-hl .hljs-name{color:#1c64a6}
.ws[data-codetheme=light] .cb-hl .hljs-type{color:#a2661b}
.ws[data-codetheme=light] .cb-hl .hljs-comment,.ws[data-codetheme=light] .cb-hl .hljs-quote{color:#8a9283}
.ws[data-codetheme=light] .cb-ta{caret-color:#2a2f27}`;

export function applyPrefs(p){
 Object.assign(live,p);
 const a=ACCENTS[p.accent]||ACCENTS.sage;
 let el=document.getElementById('ojo-prefs');
 if(!el){el=document.createElement('style');el.id='ojo-prefs';document.head.appendChild(el);}
 const widths={narrow:'660px',standard:'820px',wide:'1080px',full:'none'};
 const cols=columnsOf(p).map(c=>`.ws .tb-col[data-col="${c.id}"]{--col:${COLUMN_COLORS[c.color]||COLUMN_COLORS.slate}}`).join('\n');
 el.textContent=`.ws{--sage:${a.sage};--sage-soft:${a.soft};--accent-dark:${a.dark};--code-size:${+p.codeSize||13}px;--code-lh:${Math.round((+p.codeSize||13)*1.55)}px}
.ws .note-body{max-width:${widths[p.noteWidth]||widths.standard}}
${cols}
${CODE_LIGHT}`;
 const root=document.querySelector('.ws');
 if(root){root.dataset.density=p.density;root.dataset.codetheme=p.codeTheme;root.dataset.lines=p.lineNumbers===false?'off':'on';}
 document.documentElement.dataset.density=p.density;
}

// Windows share one saved copy through the main process, but components in this window hear about a change here.
const listeners=new Set();
export const publishPrefs=p=>{Object.assign(live,p);listeners.forEach(f=>f(p));};
export function useLivePrefs(settings){
 const [p,setP]=useState(()=>getPrefs(settings));
 useEffect(()=>{setP(getPrefs(settings));},[settings]);
 useEffect(()=>{const f=np=>setP(np);listeners.add(f);return()=>listeners.delete(f);},[]);
 return p;
}
