import test from 'node:test';
import assert from 'node:assert/strict';
import {newNode,newEdge,anchors,tidy,fitView,zoomAt,childSpot,withoutNodes,hasEdge,makeHistory,pushHistory,undo,redo,boardText} from '../src/workspace/canvas.mjs';

test('a link leaves from the sides that face each other',()=>{
 const a={x:0,y:0,w:100,h:40},b={x:300,y:0,w:100,h:40};
 const r=anchors(a,b);
 assert.equal(r.p1.x,100);assert.equal(r.p2.x,300);
 const c={x:0,y:200,w:100,h:40},v=anchors(a,c);
 assert.equal(v.p1.y,40);assert.equal(v.p2.y,200);
 assert.match(r.d,/^M100,20 C/);
});
test('tidy puts children right of their parent and stacks siblings',()=>{
 const root=newNode(0,0,{id:'r'}),a=newNode(500,500,{id:'a'}),b=newNode(40,900,{id:'b'}),c=newNode(10,10,{id:'c'});
 const edges=[newEdge('r','a'),newEdge('r','b'),newEdge('a','c')];
 const out=tidy([root,a,b,c],edges,{r:{w:100},a:{w:100},b:{w:100},c:{w:100}});
 assert.ok(out.a.x>out.r.x&&out.b.x>out.r.x&&out.c.x>out.a.x);
 assert.notEqual(out.a.y,out.b.y);
 // the parent sits between its children
 assert.ok(out.r.y>=Math.min(out.a.y,out.b.y)&&out.r.y<=Math.max(out.a.y,out.b.y));
});
test('tidy copes with cycles and loose nodes',()=>{
 const a=newNode(0,0,{id:'a'}),b=newNode(0,0,{id:'b'}),l=newNode(5,5,{id:'l'});
 const out=tidy([a,b,l],[newEdge('a','b'),newEdge('b','a')]);
 assert.ok(!('l' in out));
 assert.ok(Object.keys(out).length<=2);
});
test('fit shows every node, zoom keeps the point under the cursor',()=>{
 const nodes=[newNode(0,0),newNode(1000,600)];
 const v=fitView(nodes,{},800,500);
 assert.ok(v.vz<1&&v.vz>=.25);
 const z=zoomAt({vx:10,vy:20,vz:1},2,100,100);
 assert.equal(z.vz,2);
 // the world point that was under (100,100) is still there
 assert.equal((100-z.vx)/z.vz,(100-10)/1);
});
test('children go below existing children; deleting a node removes its links',()=>{
 const p=newNode(0,0,{id:'p'}),k=newNode(220,0,{id:'k'});
 const spot=childSpot(p,{w:100},[newEdge('p','k')],[p,k]);
 assert.ok(spot.y>k.y);
 const r=withoutNodes([p,k],[newEdge('p','k')],['k']);
 assert.equal(r.nodes.length,1);assert.equal(r.edges.length,0);
 assert.ok(hasEdge([newEdge('p','k')],'k','p'));
});
test('undo and redo walk back and forth',()=>{
 const h=makeHistory();
 pushHistory(h,'one');pushHistory(h,'two');
 assert.equal(undo(h,'three'),'two');
 assert.equal(redo(h,'two'),'three');
 assert.equal(boardText({nodes:[{text:'a'},{text:''},{text:'b'}]}),'a · b');
});

import {snapMove,nearestBox,insideGroup,frameAround,alignBoxes,allTags,cleanTag,newGroup} from '../src/workspace/canvas.mjs';
test('moving boxes snap to the edges and centres of others and report guides',()=>{
 const others=[{id:'a',x:200,y:0,w:100,h:40}];
 const r=snapMove({x:197,y:101,w:100,h:40},others,6);
 assert.equal(r.dx,3);assert.equal(r.dy,0);assert.ok(r.guides.some(g=>g.axis==='x'&&g.at===200));
 const far=snapMove({x:50,y:300,w:100,h:40},others,6);
 assert.equal(far.dx,0);assert.equal(far.dy,0);assert.equal(far.guides.length,0);
});
test('a link lets go on the nearest idea within reach',()=>{
 const boxes=[{id:'a',x:0,y:0,w:100,h:40},{id:'b',x:300,y:0,w:100,h:40}];
 assert.equal(nearestBox({x:130,y:20},boxes,36),'a');
 assert.equal(nearestBox({x:200,y:20},boxes,36),null);
});
test('groups hold the ideas inside them and frames wrap a selection',()=>{
 const g=newGroup(0,0,300,200);
 const boxes=[{id:'in',x:20,y:40,w:80,h:30},{id:'out',x:400,y:40,w:80,h:30}];
 assert.deepEqual(insideGroup(g,boxes),['in']);
 const f=frameAround(boxes);
 assert.ok(f.x<20&&f.w>460);
});
test('alignment lines ideas up and spreads them evenly',()=>{
 const boxes=[{id:'a',x:0,y:10,w:50,h:20},{id:'b',x:100,y:50,w:50,h:20},{id:'c',x:400,y:30,w:50,h:20}];
 assert.equal(alignBoxes(boxes,'left').b.x,0);
 assert.equal(alignBoxes(boxes,'top').c.y,10);
 const s=alignBoxes(boxes,'spreadX');
 assert.equal(s.b.x,200);
 assert.deepEqual(allTags([{tags:['b','a']},{tags:['a']}]),['a','b']);
 assert.equal(cleanTag(' #My Tag '),'my-tag');
});
