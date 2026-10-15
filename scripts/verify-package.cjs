const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const asar=require('@electron/asar');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const resources=process.argv[2]||`release-v${version}/ojo-win32-x64/resources`;
const archive=path.join(resources,'app.asar');
assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,version);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(hash(path.join(resources,'DesktopWatch.exe')),hash('native/bin/DesktopWatch.exe'));
const html=fs.readFileSync('dist/client/index.html','utf8');
const assets=[...html.matchAll(/(?:src|href)="\.\/(assets\/[^"?]+)"/g)].map(m=>'dist/client/'+m[1]);
for(const file of ['electron/main.cjs','electron/preload.cjs','electron/reminders.cjs','src/tasks.mjs','dist/client/index.html',...assets]){
 assert.equal(asar.extractFile(archive,path.normalize(file)).toString(),fs.readFileSync(file,'utf8'));
}
console.log(`ojo ${version}: packaged UI, main process, preload and native helper match the current build.`);
