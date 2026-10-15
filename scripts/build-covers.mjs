// Draws ojo's own cover artwork: soft blurred colour fields with a little grain. Nothing here is taken from
// anyone else's work, so the covers are ours to ship. Run: node scripts/build-covers.mjs
import fs from 'node:fs/promises';

// Small seeded random so every run draws the same pictures.
const rng=seed=>()=>((seed=Math.imul(seed^(seed>>>15),seed|1)^(seed+Math.imul(seed^(seed>>>7),seed|61)))>>>0)/4294967296;

const W=600,H=260;
const COVERS={
 river:{base:['#dfe8e4','#cfdcea'],blobs:['#a9c4b0','#b7c9e4','#f1d3c2','#c4d8d2','#e8e0f0'],grain:7},
 garden:{base:['#e6ead3','#dfe6e0'],blobs:['#b9cf9c','#e5d9a2','#cbbfe0','#a8c9a4','#f0e3c0'],grain:11},
 waves:{base:['#d7e6e6','#cdd9e2'],blobs:['#9fc3c4','#b9c9dc','#e6dcc2','#8fb3b8','#c9d6c8'],grain:23}
};

function svg(name,{base,blobs,grain}){
 const r=rng(grain*977+13);
 const shapes=blobs.map((c,i)=>{
  const cx=Math.round(r()*W),cy=Math.round(r()*H),rx=Math.round(120+r()*170),ry=Math.round(50+r()*90),rot=Math.round(r()*80-40);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${(.7+r()*.3).toFixed(2)}" transform="rotate(${rot} ${cx} ${cy})"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="34"/></filter>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${grain}"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .3  0 0 0 .5 0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<g filter="url(#b)">${shapes}</g>
<rect width="${W}" height="${H}" filter="url(#n)" opacity=".16"/>
</svg>
`;
}

await fs.mkdir('public/art',{recursive:true});
for(const [name,spec] of Object.entries(COVERS))await fs.writeFile(`public/art/${name}.svg`,svg(name,spec));
console.log('Wrote',Object.keys(COVERS).map(n=>`public/art/${n}.svg`).join(', '));
