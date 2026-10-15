// Icon rasters for ojo: the line-drawn face (white strokes)
// on a sage-green tile for the app icon, the tray and the Android launcher.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
// Needs the 'sharp' image package (npm i -D sharp, or set SHARP_PATH to an existing copy).
const sharp=require(process.env.SHARP_PATH||'sharp');
const ORANGE=process.env.OJO_TILE||'#567458';
const face=await sharp(await fs.readFile('public/brand/ojo-white.svg')).resize({width:186}).png().toBuffer();
const fm=await sharp(face).metadata();
// Centre by weight, not by bounding box: the drawing's ink is heavier on some sides, so its middle of mass
// is what the eye reads as the middle. Place that point on the middle of the tile.
const {data,info}=await sharp(face).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let sw=0,sx=0,sy=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const w=data[(y*info.width+x)*4+3];sw+=w;sx+=w*x;sy+=w*y;}
const cx=sx/sw,cy=sy/sw;
const left=Math.round(128-cx),top=Math.round(128-cy);
console.log('mass centre',cx.toFixed(1),cy.toFixed(1),'of',info.width,info.height,'-> offset',left,top);
const tile=await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([
 {input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="58" fill="${ORANGE}"/></svg>`)},
 {input:face,left,top}
]).png().toBuffer();
await fs.writeFile('public/brand/ojo.png',tile);
await sharp(tile).resize(32,32).png().toFile('public/brand/tray.png');
const sizes=[16,24,32,48,64,128,256],images=await Promise.all(sizes.map(n=>sharp(tile).resize(n,n).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
images.forEach((b,i)=>{const p=6+i*16;header[p]=sizes[i]===256?0:sizes[i];header[p+1]=header[p];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(b.length,p+8);header.writeUInt32LE(offset,p+12);offset+=b.length;});
await fs.writeFile('public/brand/ojo.ico',Buffer.concat([header,...images]));
await sharp(tile).resize(512,512).png().toFile('qa-ojo-preview.png');
console.log('ojo icons written');
