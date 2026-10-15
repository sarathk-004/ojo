import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const compiler=path.join(process.env.WINDIR||'C:/Windows','Microsoft.NET/Framework64/v4.0.30319/csc.exe');
fs.mkdirSync('native/bin',{recursive:true});
execFileSync(compiler,['/nologo','/target:exe','/r:System.Windows.Forms.dll','/out:'+path.resolve('native/bin/DesktopWatch.exe'),path.resolve('native/DesktopWatch.cs')],{stdio:'inherit'});
