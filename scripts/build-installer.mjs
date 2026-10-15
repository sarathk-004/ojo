import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(), stage=path.join(root,'desktop-stage');
await fs.mkdir(path.join(stage,'native'),{recursive:true});
await fs.copyFile(path.join(root,'native/bin/DesktopWatch.exe'),path.join(stage,'native/DesktopWatch.exe'));
await fs.mkdir(path.join(stage,'legal'),{recursive:true});
await fs.cp(path.join(root,'legal'),path.join(stage,'legal'),{recursive:true});
await fs.rm(path.join(stage,'legal/COMPLIANCE-CHECKLIST.md'),{force:true});
await fs.writeFile(path.join(stage,'electron-builder.json'),JSON.stringify({
  appId:'app.taskit.desktop',productName:'ojo',electronVersion:'44.4.3',
  directories:{output:'../downloads'},
  win:{target:'nsis',icon:'public/brand/ojo.ico',signExecutable:false},
  extraResources:[{from:'native/DesktopWatch.exe',to:'DesktopWatch.exe'},{from:'public/brand/ojo.ico',to:'ojo.ico'},{from:'legal',to:'legal'}],
  nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,createStartMenuShortcut:true,deleteAppDataOnUninstall:false,license:'legal/LICENSE.txt',artifactName:'ojo-Setup-${version}-x64.exe',installerIcon:'public/brand/ojo.ico',uninstallerIcon:'public/brand/ojo.ico'},publish:null
},null,2));
execFileSync(process.platform==='win32'?'cmd.exe':path.join(root,'node_modules','.bin','electron-builder'),process.platform==='win32'?['/c',path.join(root,'node_modules','.bin','electron-builder.cmd'),'--project',stage,'--win','nsis','--x64','--publish','never']:['--project',stage,'--win','nsis','--x64','--publish','never'],{stdio:'inherit'});
