import hljs from 'highlight.js';

// Every language highlight.js knows (about 190), listed A to Z by name.
const ids=hljs.listLanguages();
// Left out on purpose: REPL sessions, profilers, templates, logs and very niche dialects.
const SKIP=/(-repl$|-template$|^(profile|accesslog|tap|subunit|step21|mojolicious|taggerscript|vbscript-html|fix|dsconfig|isbl|irpf90|roboconf|ruleslanguage|rsl|rib|crmsh|gml|gauss|gams|mizar|hsp|leaf|sqf|tp|xl|zephir|lsl|mel|monkey|n1ql|pony|q|parser3|oxygene|golo|flix|cos|cal|axapta|1c|angelscript|arcade|armasm|avrasm|mipsasm|x86asm|ldif|nestedtext|pf|routeros|jboss-cli|abnf|bnf|ebnf|capnproto|csp|dns|dust|gcode|inform7|livecodeserver|maxima|pgsql|processing|purebasic|reasonml|scilab|stan|stata|thrift|wren|vala|qml|nsis|smali|ceylon|clean|coq|hy|lasso|n1ql)$)/;
const NAMES={shell:'Shell',ini:'INI / TOML',xml:'HTML / XML',dos:'Batch file',php:'PHP',properties:'Properties',erb:'ERB'};
export const ALL_LANGS=ids
 .map(id=>{const l=hljs.getLanguage(id)||{};return {id,name:NAMES[id]||l.name||id,aliases:l.aliases||[]};})
 .filter(l=>l.id!=='plaintext'&&!SKIP.test(l.id))
 .sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true}));
export const langName=id=>id==='plaintext'?'Plain text':(ALL_LANGS.find(l=>l.id===id||l.aliases.includes(id))?.name||id);

const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const alias={html:'xml',text:'plaintext',txt:'plaintext'};
export function highlight(code,lang){
 const l=alias[lang]||lang;
 if(!l||l==='plaintext'||!hljs.getLanguage(l))return esc(code);
 try{return hljs.highlight(code,{language:l,ignoreIllegals:true}).value;}catch{return esc(code);}
}
// For "Auto-detect": the likeliest language, chosen from the whole set but only when highlight.js is reasonably sure.
const POPULAR=['javascript','typescript','python','java','csharp','cpp','c','go','rust','kotlin','swift','php','ruby','sql','xml','css','json','bash','powershell','markdown','yaml','dart','scala','r','lua','perl','haskell','elixir','objectivec','dockerfile','ini','graphql','diff','shell','scss','less','groovy','julia','matlab','vbnet','makefile','nginx','latex','plaintext'];
export function detectLanguage(code){
 try{
  const r=hljs.highlightAuto(code,POPULAR.filter(l=>hljs.getLanguage(l)));
  return r.relevance>=4&&r.language?r.language:'plaintext';
 }catch{return 'plaintext';}
}
