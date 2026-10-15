import fs from 'node:fs/promises';
const png=await fs.readFile('public/brand/taskit.png');
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
await fs.writeFile('public/brand/taskit.ico',Buffer.concat([header,png]));
const file=JSON.parse(await fs.readFile('package.json','utf8'));file.version='1.2.0';file.description='A quiet desktop home for your tasks';file.author='Taskit';file.scripts.installer='npm run package && electron-builder --win nsis --x64 --prepackaged release-v1.2.0/Taskit-win32-x64 --publish never';await fs.writeFile('package.json',JSON.stringify(file,null,2)+'\n');
