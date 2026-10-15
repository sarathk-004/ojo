import test from 'node:test';
import assert from 'node:assert/strict';
import {placeImage,panBy} from '../src/workspace/coverfit.mjs';
test('cover image always fills its frame',()=>{
 const box={w:800,h:100},nat={w:1600,h:1200};
 const p=placeImage(box,nat,{x:50,y:50,zoom:1});
 assert.equal(p.width,800);assert.equal(p.height,600);assert.equal(p.left,0);assert.equal(p.top,-250);
 const z=placeImage(box,nat,{x:0,y:0,zoom:2});assert.equal(z.width,1600);assert.equal(z.left,0);assert.equal(z.top,0);
 const edge=placeImage(box,nat,{x:100,y:100,zoom:2});assert.equal(edge.left,-800);assert.equal(edge.top,-1100);
});
test('dragging pans the other way and stays inside the picture',()=>{
 const box={w:800,h:100},nat={w:1600,h:1200},pos={x:50,y:50,zoom:1};
 const up=panBy(box,nat,pos,0,-100);assert.ok(up.y>50);
 const far=panBy(box,nat,pos,0,10000);assert.equal(far.y,0);
 assert.equal(panBy(box,nat,pos,40,0).x,50);
});
