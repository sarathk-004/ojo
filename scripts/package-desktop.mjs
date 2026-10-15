import {packager} from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), stage=path.join(root,'desktop-stage');
await fs.mkdir(stage,{recursive:true});
const stagedClient=path.resolve(stage,'dist/client');
if(!stagedClient.startsWith(path.resolve(root)+path.sep))throw Error('Build staging path is outside the workspace');
await fs.rm(stagedClient,{recursive:true,force:true});
for(const name of ['electron','src/tasks.mjs','src/workspace/classify.mjs','src/workspace/nudges.mjs','src/workspace/bills.mjs','src/workspace/finance.mjs','dist/client','public/art','public/brand']) {
  const dest=path.join(stage,name);await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.cp(path.join(root,name),dest,{recursive:true});
}
const pkg = JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:'ojo',productName:'ojo',version:pkg.version,main:'electron/main.cjs'}));
const result=await packager({dir:stage,name:'ojo',platform:'win32',arch:'x64',electronVersion:'44.4.3',out:path.join(root,process.argv[2]||`release-v${pkg.version}`),extraResource:[path.join(root,'native/bin/DesktopWatch.exe'),path.join(root,'public/brand/ojo.ico')],overwrite:true,prune:false,asar:true,icon:path.join(root,'public/brand/ojo.ico'),appCopyright:'ojo',win32metadata:{ProductName:'ojo',FileDescription:'ojo desktop task widget'}});
console.log(result.join('\n'));





