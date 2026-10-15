const IMG_EXT=/^(png|jpe?g|gif|webp|avif|bmp|svg)$/i,VIDEO_EXT=/^(mp4|webm|mov|m4v|mkv|ogv)$/i,AUDIO_EXT=/^(mp3|wav|m4a|ogg|oga|flac|aac|opus)$/i,MD_EXT=/^(md|markdown|mdx)$/i,TEXT_EXT=/^(txt|log|rtf)$/i;
const URL_RE=/https?:\/\/[^\s<>"']+/i;

export const LANGS=[
 ['plaintext','Plain text'],['javascript','JavaScript'],['typescript','TypeScript'],['python','Python'],['java','Java'],['csharp','C#'],['cpp','C++'],['c','C'],['go','Go'],['rust','Rust'],['kotlin','Kotlin'],['swift','Swift'],['php','PHP'],['ruby','Ruby'],['sql','SQL'],['html','HTML'],['css','CSS'],['json','JSON'],['bash','Bash'],['powershell','PowerShell'],['markdown','Markdown']
].map(([id,name])=>({id,name}));
const EXT_LANG={js:'javascript',jsx:'javascript',mjs:'javascript',cjs:'javascript',ts:'typescript',tsx:'typescript',py:'python',java:'java',cs:'csharp',cpp:'cpp',cc:'cpp',hpp:'cpp',c:'c',h:'c',go:'go',rs:'rust',kt:'kotlin',swift:'swift',php:'php',rb:'ruby',sql:'sql',html:'html',htm:'html',css:'css',json:'json',sh:'bash',bash:'bash',ps1:'powershell'};

export function youtubeId(url){
 try{
  const u=new URL(url),h=u.hostname.replace(/^(www\.|m\.|music\.)/,'');
  if(h==='youtu.be')return u.pathname.slice(1).split('/')[0]||null;
  if(h==='youtube.com'){
   if(u.pathname==='/watch')return u.searchParams.get('v');
   const m=u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
   return m?m[2]:null;
  }
 }catch{}
 return null;
}
export function looksLikeCode(text){
 const t=text.trim();
 if(t.length<12||URL_RE.test(t)&&!t.includes('\n'))return false;
 const lines=t.split('\n');
 let score=0;
 if(/[{};]\s*$/m.test(t))score++;
 if(/\b(function|const|let|var|import|export|return|class|def|public|private|static|=>|#include|SELECT|FROM|print\()/.test(t))score++;
 if(lines.length>1&&lines.filter(l=>/^\s{2,}|^\t/.test(l)).length>=lines.length/3)score++;
 if(/[=<>!]=|&&|\|\||\(\)|\[\]|<\/?[a-z][^>]*>/.test(t))score++;
 if(/^\s*(def|class|if|elif|else|for|while|try|except|with)\b[^\n]*:\s*$/m.test(t))score++;
 return score>=2;
}
export function looksLikeMarkdown(text){
 const t=text.trim();
 if(t.length<8)return false;
 let s=0;
 if(/^#{1,6}\s+\S/m.test(t))s++;
 if(/^\s*([-*+]|\d+\.)\s+\S/m.test(t))s++;
 if(/\*\*[^*\n]+\*\*|__[^_\n]+__/.test(t))s++;
 if(/\[[^\]\n]+\]\(https?:[^)\s]+\)/.test(t))s++;
 if(/^```/m.test(t)||/^>\s+\S/m.test(t))s++;
 return s>=2||/^#{1,6}\s+\S/.test(t)&&t.includes('\n');
}
export function guessLang(text){
 const t=text.trim();
 if(/^<\?php/.test(t))return 'php';
 if(/^\s*<!doctype html|^\s*<html[\s>]|^\s*<(div|head|body|section|span|p|ul|a)[\s>]/i.test(t))return 'html';
 if(/^[{[]/.test(t)){try{JSON.parse(t);return 'json';}catch{}}
 if(/\b(SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET)/i.test(t))return 'sql';
 if(/^#!.*\b(ba)?sh\b|^\s*(sudo|apt|apt-get|brew|grep|chmod|curl|cd)\s|\becho\s+["$]/m.test(t))return 'bash';
 if(/\b(Get|Set|New|Write|Remove)-[A-Z]\w+|\$\w+\s*=\s*(Get-|\[)|^\s*param\(/m.test(t))return 'powershell';
 if(/^\s*using System|\bnamespace\s+\w+|Console\.(Write|Read)/m.test(t))return 'csharp';
 if(/System\.out\.print|public\s+(static\s+)?(class|void|int)\s|^import java\./m.test(t))return 'java';
 if(/^#include\s*[<"]/m.test(t))return /\b(std::|cout|class\s|template\s*<)/.test(t)?'cpp':'c';
 if(/^package\s+\w+|\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\(|:=\s/m.test(t)&&!/\bdef\b/.test(t))return 'go';
 if(/\bfn\s+\w+\s*\(|\blet\s+mut\b|println!|^use\s+std::/m.test(t))return 'rust';
 if(/\bfun\s+\w+\s*\(|\bval\s+\w+(:|\s*=)/m.test(t)&&!/\bfunction\b/.test(t))return 'kotlin';
 if(/^import\s+(SwiftUI|UIKit|Foundation)|\bfunc\s+\w+\(.*\)\s*(->|\{)|\bguard\s+let\b/m.test(t))return 'swift';
 if(/^\s*(def\s+\w+.*:|class\s+\w+.*:|from\s+\w+\s+import|import\s+\w+(\s+as\s+\w+)?\s*$|elif\s|print\()/m.test(t)&&!/[;{]\s*$/m.test(t))return 'python';
 if(/^\s*def\s+\w+|\bputs\s|\bend\s*$/m.test(t)&&!/[;{]\s*$/m.test(t))return 'ruby';
 if(/:\s*(string|number|boolean|any|void)\b|\binterface\s+\w+\s*\{|\btype\s+\w+\s*=|<\w+(\[\])?>\(/.test(t))return 'typescript';
 if(/^[\s\S]*[.#@]?[\w-]+(\s*[>+~.:#][\w-]+)*\s*\{\s*[\w-]+\s*:[^;{}]+;/m.test(t)&&!/\b(function|const|let|var|=>)\b/.test(t))return 'css';
 if(/\b(const|let|var|function|require\(|=>|console\.log|module\.exports|document\.)/.test(t))return 'javascript';
 return 'plaintext';
}

const BRANDS=[
 [/(^|\.)youtube\.com$|^youtu\.be$/,'YouTube','youtube','#ff0000',p=>/^\/shorts/.test(p)?'Short':/^\/(@|channel|c\/|user\/)/.test(p)?'Channel':/^\/playlist/.test(p)?'Playlist':'Video'],
 [/(^|\.)instagram\.com$/,'Instagram','instagram','#d6249f',p=>/^\/reel/.test(p)?'Reel':/^\/p\//.test(p)?'Post':/^\/stories/.test(p)?'Story':''],
 [/(^|\.)linkedin\.com$/,'LinkedIn','linkedin','#0a66c2',p=>/^\/in\//.test(p)?'Profile':/^\/(posts|feed\/update|pulse)/.test(p)?'Post':/^\/company\//.test(p)?'Company':/^\/jobs/.test(p)?'Job':/^\/learning/.test(p)?'Learning':''],
 [/^gist\.github\.com$/,'GitHub Gist','github','#24292f',()=>''],
 [/(^|\.)github\.com$/,'GitHub','github','#24292f',p=>{const s=p.split('/').filter(Boolean);return s.length>=2?s[0]+'/'+s[1]:s[0]||'';}],
 [/(^|\.)(x|twitter)\.com$/,'X','x','#111111',p=>/\/status\//.test(p)?'Post':p.split('/').filter(Boolean).length===1?'Profile':''],
 [/(^|\.)reddit\.com$/,'Reddit','reddit','#ff4500',p=>{const m=p.match(/^\/r\/(\w+)/);return m?'r/'+m[1]:'';}],
 [/(^|\.)medium\.com$/,'Medium','medium','#111111',()=>'Article'],
 [/(^|\.)substack\.com$/,'Substack','article','#ff6719',()=>'Post'],
 [/^dev\.to$/,'DEV','article','#111111',()=>'Post'],
 [/^news\.ycombinator\.com$/,'Hacker News','article','#ff6600',()=>''],
 [/(^|\.)stackoverflow\.com$/,'Stack Overflow','stackoverflow','#f48024',()=>'Question'],
 [/(^|\.)wikipedia\.org$/,'Wikipedia','globe','#444444',()=>'Article'],
 [/(^|\.)notion\.(so|site)$/,'Notion','notion','#111111',()=>'Page'],
 [/(^|\.)figma\.com$/,'Figma','figma','#a259ff',()=>''],
 [/^docs\.google\.com$/,'Google Docs','google','#4285f4',p=>/^\/spreadsheets/.test(p)?'Sheet':/^\/presentation/.test(p)?'Slides':/^\/forms/.test(p)?'Form':'Doc'],
 [/^drive\.google\.com$/,'Google Drive','drive','#1fa463',()=>''],
 [/^open\.spotify\.com$/,'Spotify','spotify','#1db954',p=>p.split('/')[1]||''],
 [/(^|\.)facebook\.com$/,'Facebook','facebook','#1877f2',()=>''],
 [/(^|\.)discord\.(com|gg)$/,'Discord','discord','#5865f2',()=>''],
 [/(^|\.)tiktok\.com$/,'TikTok','tiktok','#111111',()=>''],
 [/(^|\.)twitch\.tv$/,'Twitch','twitch','#9146ff',()=>''],
 [/(^|\.)pinterest\.\w+$/,'Pinterest','pinterest','#e60023',()=>''],
 [/^t\.me$/,'Telegram','telegram','#229ed9',()=>''],
 [/(^|\.)amazon\.\w+(\.\w+)?$/,'Amazon','amazon','#ff9900',()=>'Product'],
 [/(^|\.)naukri\.com$/,'Naukri','article','#275df5',()=>'Job'],
 [/(^|\.)indeed\.com$/,'Indeed','article','#2164f3',()=>'Job'],
 [/(^|\.)glassdoor\.\w+$/,'Glassdoor','article','#0caa41',()=>''],
 [/(^|\.)leetcode\.com$/,'LeetCode','code','#ffa116',()=>'Problem'],
 [/(^|\.)arxiv\.org$/,'arXiv','article','#b31b1b',()=>'Paper'],
 [/(^|\.)npmjs\.com$/,'npm','code','#cb3837',()=>'Package']
];
export function brandFor(url){
 let u;try{u=new URL(url);}catch{return null;}
 const host=u.hostname.replace(/^www\./,'');
 for(const [re,name,icon,color,sub] of BRANDS)if(re.test(host))return {brand:name,sub:sub(u.pathname)||'',icon,color,host};
 const label=host.split('.').slice(-2,-1)[0]||host;
 return {brand:label.charAt(0).toUpperCase()+label.slice(1),sub:'',icon:'globe',color:'#567458',host};
}
const extOf=u=>{try{return new URL(u).pathname.split('.').pop().toLowerCase();}catch{return '';}};
const nameOf=u=>{try{return decodeURIComponent(new URL(u).pathname.split('/').pop())||u;}catch{return u;}};

export function classifyText({text='',uriList=''}={}){
 const raw=(uriList.split('\n').find(l=>l&&!l.startsWith('#'))||'').trim()||(text.match(URL_RE)||[''])[0];
 const body=text.trim();
 if(raw){
  const yt=youtubeId(raw);
  if(yt)return {kind:'youtube',url:raw,title:'YouTube video',videoId:yt};
  try{new URL(raw);}catch{return {kind:'text',title:body.slice(0,60),text:body};}
  const ext=extOf(raw),file=nameOf(raw);
  if(ext==='pdf')return {kind:'pdf',url:raw,title:file.replace(/\.pdf$/i,''),download:true,mime:'application/pdf'};
  if(MD_EXT.test(ext))return {kind:'md',url:raw,title:file,download:true,mime:'text/markdown'};
  if(TEXT_EXT.test(ext))return {kind:'text',url:raw,title:file,download:true,mime:'text/plain'};
  if(IMG_EXT.test(ext))return {kind:'image',url:raw,title:file};
  if(VIDEO_EXT.test(ext))return {kind:'video',url:raw,title:file};
  if(AUDIO_EXT.test(ext))return {kind:'audio',url:raw,title:file};
  const b=brandFor(raw);
  if(b.brand==='Instagram'||/(^|\.)instagram\.com$/.test(b.host))return {kind:'instagram',url:raw,title:/\/reel/.test(raw)?'Instagram reel':'Instagram post'};
  return {kind:'link',url:raw,title:b.sub?`${b.brand} · ${b.sub}`:b.brand,host:b.host,brand:b.brand,sub:b.sub};
 }
 if(!body)return null;
 const first=body.split('\n')[0].trim().replace(/^#+\s*/,'').slice(0,60);
 if(looksLikeCode(body)&&!looksLikeMarkdown(body))return {kind:'code',title:first||'Code snippet',text:body,lang:guessLang(body)};
 if(looksLikeMarkdown(body))return {kind:'md',title:first||'Markdown note',text:body};
 return {kind:'text',title:body.split('\n')[0].slice(0,60),text:body};
}
export function classifyFile({name='file',type=''}){
 const ext=(name.split('.').pop()||'').toLowerCase(),base=name.replace(/\.[^.]+$/,'');
 if(type==='application/pdf'||ext==='pdf')return {kind:'pdf',title:base};
 if(type.startsWith('image/')||IMG_EXT.test(ext))return {kind:'image',title:base};
 if(type.startsWith('video/')||VIDEO_EXT.test(ext))return {kind:'video',title:base};
 if(type.startsWith('audio/')||AUDIO_EXT.test(ext))return {kind:'audio',title:base};
 if(MD_EXT.test(ext))return {kind:'md',title:base};
 if(TEXT_EXT.test(ext)||type==='text/plain')return {kind:'text',title:base};
 if(EXT_LANG[ext])return {kind:'code',title:name,lang:EXT_LANG[ext]};
 return {kind:'file',title:name};
}
export const KINDS={youtube:'YouTube',instagram:'Reels',video:'Videos',audio:'Audio',image:'Images',pdf:'PDFs',md:'Markdown',text:'Text',code:'Code',link:'Links',file:'Files'};

// ---- Job postings: links from job boards or a company's careers pages go to the Job tracker ----
const JOB_HOST=/(^|\.)(indeed\.[a-z.]+|naukri\.com|glassdoor\.[a-z.]+|wellfound\.com|ziprecruiter\.com|monster\.[a-z.]+|foundit\.in|instahyre\.com|cutshort\.io|hirist\.(tech|com)|greenhouse\.io|lever\.co|myworkdayjobs\.com|workdayjobs\.com|ashbyhq\.com|smartrecruiters\.com|workable\.com|jobvite\.com|icims\.com|recruitee\.com|breezy\.hr|teamtailor\.com|dice\.com|simplyhired\.com|jooble\.org|apna\.co)$/i;
const JOB_SUBHOST=/^(careers?|jobs?)\./i;
const JOB_PATH=/\/(careers?|jobs?|job-openings?|openings?|positions?|vacanc(?:y|ies)|join-us|work-with-us)(\/|$)|\/job[-_]?(?:detail|posting)/i;
const NOT_JOB_HOST=/(^|\.)(youtube\.com|youtu\.be|instagram\.com|x\.com|twitter\.com|github\.com|reddit\.com|news\.ycombinator\.com|facebook\.com)$/i;
export function isJobLink(url){
 let u;try{u=new URL(url);}catch{return false;}
 if(!/^https?:$/.test(u.protocol))return false;
 const h=u.hostname.replace(/^www\./,'');
 if(NOT_JOB_HOST.test(h))return false;
 if(/(^|\.)linkedin\.com$/.test(h))return /^\/(comm\/)?jobs(\/|$)/.test(u.pathname)||/currentJobId=/.test(u.search);
 return JOB_HOST.test(h)||JOB_SUBHOST.test(h)||JOB_PATH.test(u.pathname);
}
const BOARDS=[[/indeed\./,'Indeed'],[/linkedin\.com/,'LinkedIn'],[/naukri\.com/,'Naukri']];
const SITE_WORDS=/^(indeed(\.com)?|linkedin|naukri(\.com)?|glassdoor|wellfound|careers?|jobs?|apply|lever|greenhouse|workday|ashby)$/i;
// Best-effort role / company from a posting's page title, e.g. "Acme hiring Designer in Pune | LinkedIn".
export function jobFromPage({title='',url=''}={}){
 let host='';try{host=new URL(url).hostname.replace(/^www\./,'');}catch{}
 const board=BOARDS.find(([re])=>re.test(host)),source=board?board[1]:(JOB_HOST.test(host)?'Other':'Company site');
 let t=String(title).replace(/\s+/g,' ').trim(),role='',company='',location='';
 const hiring=t.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+?))?(?:\s*[|–—-]\s*.*)?$/i);
 if(hiring){company=hiring[1];role=hiring[2];location=hiring[3]||'';}
 else{
  const parts=t.split(/\s+[|–—-]\s+/).map(p=>p.trim()).filter(p=>p&&!SITE_WORDS.test(p));
  if(parts[0]&&/\s+at\s+/i.test(parts[0])){const [r,c]=parts[0].split(/\s+at\s+/i);role=r;company=c;}
  else{role=parts[0]||'';company=board?'':(parts[1]||'');if(board&&parts[1])location=parts[1];}
 }
 if(!company&&source==='Company site'){
  const label=host.replace(/^(careers?|jobs?)\./i,'').split('.').slice(-2,-1)[0]||'';
  company=label.charAt(0).toUpperCase()+label.slice(1);
 }
 return {role:role.slice(0,120),company:company.slice(0,80),location:location.slice(0,80),source};
}
