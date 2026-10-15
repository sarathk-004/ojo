// Writes the website's legal pages (site/privacy.html, terms.html, notices.html) from the same wording the app and the installer use.
// Run: node scripts/build-site-legal.mjs   (the pages are committed; run it again after changing src/legal/documents.mjs)
import fs from 'node:fs/promises';
import {PRIVACY,TERMS,NOTICES} from '../src/legal/documents.mjs';
import {PUBLISHER,CONTACT_EMAIL,LEGAL_VERSION,EFFECTIVE} from '../src/legal/info.mjs';

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

// What applies to this website itself (the app's notice covers the app).
const SITE_SECTION={h:'This website',p:[
 'This page (the ojo website) sets no cookies, has no accounts or forms, and runs no analytics or advertising.',
 'To display the page, your browser loads fonts from Google Fonts (fonts.googleapis.com and fonts.gstatic.com) and animation scripts from jsDelivr (cdn.jsdelivr.net). Those services can see your internet address and the usual details a browser sends, under their own privacy policies. Nothing is sent to ojo.',
 'The Download button fetches the installer from GitHub (github.com), which can see your internet address under GitHub\'s own privacy policy. The ojo app itself never contacts the publisher.'
]};

function section(s){
 const out=['<section class="lg-sec" id="'+slug(s.h)+'"><h2>'+esc(s.h)+'</h2>'];
 for(const p of s.p||[])out.push('<p>'+esc(p)+'</p>');
 if(s.list)out.push('<ul>'+s.list.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>');
 for(const p of s.after||[])out.push('<p>'+esc(p)+'</p>');
 out.push('</section>');
 return out.join('');
}

function page(doc,file,extra=[]){
 const sections=[...doc.sections.slice(0,-1),...extra,...doc.sections.slice(-1)];
 const nav=[['privacy.html','Privacy Policy'],['terms.html','Terms of Use'],['notices.html','Open-source notices']];
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(doc.title)} · ojo</title>
<meta name="description" content="${esc(doc.summary)}">
<meta name="theme-color" content="#ece6d9">
<link rel="icon" href="brand/ojo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="legal.css">
</head>
<body class="legal">
<header class="lg-top"><a class="lg-brand" href="./" aria-label="ojo, back to the home page"><span class="face lg-face" data-face="7"></span></a><a class="lg-back" href="./">Back to ojo</a></header>
<main class="lg-main">
 <p class="lg-kicker">${esc(PUBLISHER)} · version ${esc(LEGAL_VERSION)} · effective ${esc(EFFECTIVE)}</p>
 <h1>${esc(doc.title)}</h1>
 <p class="lg-sum">${esc(doc.summary)}</p>
 <nav class="lg-nav" aria-label="Legal documents">${nav.map(([f,t])=>`<a href="${f}"${f===file?' aria-current="page"':''}>${t}</a>`).join('')}</nav>
 <div class="lg-body">${sections.map(section).join('')}</div>
</main>
<footer class="lg-foot">
  <span>Free for personal use.</span>
 <span class="lg-links">${nav.map(([f,t])=>`<a href="${f}">${t}</a>`).join('')}${CONTACT_EMAIL?`<a href="mailto:${esc(CONTACT_EMAIL)}">Contact</a>`:''}</span>
</footer>
<script src="mascot-data.js"></script>
<script src="legal.js"></script>
</body>
</html>
`;
}

await fs.writeFile('site/privacy.html',page({...PRIVACY,title:'Privacy Policy'},'privacy.html',[SITE_SECTION]));
await fs.writeFile('site/terms.html',page(TERMS,'terms.html'));
await fs.writeFile('site/notices.html',page(NOTICES,'notices.html'));
console.log('Wrote site/privacy.html, terms.html, notices.html');
