import {test} from 'node:test';
import assert from 'node:assert/strict';
import geometry from '../electron/geometry.cjs';
const {layout,boundAnchor,SMALL}=geometry;
test('docked collapse stays at each screen corner including negative-coordinate monitors',()=>{for(const area of [{x:0,y:0,width:1920,height:1040},{x:-1280,y:-100,width:1280,height:984}])for(const x of [area.x,area.x+area.width-310])for(const y of [area.y,area.y+area.height-360]){const b={x,y,width:310,height:360};const p=geometry.collapseAnchor(b,{x:260,y:42},area);assert.equal(p.x,x===area.x?area.x:area.x+area.width-72);assert.equal(p.y,y===area.y?area.y:area.y+area.height-72);}});
test('expansion stays on screen and preserves the icon origin at every corner',()=>{
 for(const a of [{x:0,y:0,width:1920,height:1040},{x:-1280,y:0,width:1280,height:984}]){
  for(const p of [{x:a.x,y:a.y},{x:a.x+a.width-SMALL,y:a.y},{x:a.x,y:a.y+a.height-SMALL},{x:a.x+a.width-SMALL,y:a.y+a.height-SMALL}]){
   const b=layout(p,a);assert.ok(b.x>=a.x&&b.x+b.width<=a.x+a.width);assert.ok(b.y>=a.y&&b.y+b.height<=a.y+a.height);
   assert.equal(b.origin.x+b.x+8,p.x+SMALL/2);assert.equal(b.origin.y+b.y+8,p.y+SMALL/2);
  }
 }
});
test('dragging clamps to the selected display rather than the primary screen',()=>{assert.deepEqual(boundAnchor({x:-2000,y:9999},{x:-1280,y:0,width:1280,height:984}),{x:-1280,y:912});});
test('collapse keeps the icon centered on the minimize button without moving the viewport',()=>{
 const bounds={x:-600,y:200,width:310,height:360},point={x:250,y:42};
 const anchor=geometry.collapseAnchor(bounds,point,{x:-1280,y:0,width:1280,height:984});
 const origin=geometry.origin(anchor,bounds);
 assert.equal(anchor.x+SMALL/2,bounds.x+point.x);
 assert.equal(anchor.y+SMALL/2,bounds.y+point.y);
 assert.equal(origin.x+8,point.x);assert.equal(origin.y+8,point.y);
 assert.deepEqual(bounds,{x:-600,y:200,width:310,height:360});
});
