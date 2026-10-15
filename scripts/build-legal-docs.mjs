// Writes the legal documents as plain text files (used by the installer licence page and for sharing).
import fs from 'node:fs/promises';
import {PRIVACY,TERMS,NOTICES,toText} from '../src/legal/documents.mjs';
await fs.mkdir('legal',{recursive:true});
const rule=String.fromCharCode(10)+'='.repeat(70)+String.fromCharCode(10)+String.fromCharCode(10);
await fs.writeFile('legal/PRIVACY.txt',toText(PRIVACY));
await fs.writeFile('legal/TERMS.txt',toText(TERMS));
await fs.writeFile('legal/NOTICES.txt',toText(NOTICES));
await fs.writeFile('legal/LICENSE.txt',[toText(TERMS),toText(PRIVACY),toText(NOTICES)].join(rule));
console.log('legal documents written');

// Full licence texts of what ojo is built with, installed beside the app.
const pkgs=['react','react-dom','pdfjs-dist','highlight.js','@phosphor-icons/react','simple-icons','simple-icons-v9','@fontsource-variable/geist'];
const nl=String.fromCharCode(10);
const parts=['THIRD-PARTY LICENCES',''+nl+'ojo includes the following projects. Their licence texts follow. Electron and Chromium licences are installed as LICENSE and LICENSES.chromium.html next to ojo.exe. GSAP is used under the GreenSock Standard "no charge" licence: https://gsap.com/standard-license'+nl];
for(const p of pkgs){
 try{
  const meta=JSON.parse(await fs.readFile('node_modules/'+p+'/package.json','utf8'));
  let text='';for(const n of ['LICENSE','LICENSE.md','LICENSE.txt','license']){try{text=await fs.readFile('node_modules/'+p+'/'+n,'utf8');break;}catch{}}if(!text)throw Error('no licence file');
  parts.push('-'.repeat(70)+nl+meta.name+' '+meta.version+' ('+meta.license+')'+nl+'-'.repeat(70)+nl+text.trim()+nl);
 }catch(e){console.warn('licence not found for',p);}
}
await fs.writeFile('legal/THIRD-PARTY-LICENSES.txt',parts.join(nl));
