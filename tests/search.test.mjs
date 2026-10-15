import test from 'node:test';
import assert from 'node:assert/strict';
import {search,entries,sectionOf} from '../src/workspace/search.mjs';

const data={
 notes:[{id:'n1',title:'Trip to Goa',text:'Book flights and a beach hotel for December',updated:1},{id:'n2',title:'Groceries',text:'milk, eggs',updated:2},{id:'n3',title:'Old',text:'goa mention',deleted:5}],
 tasks:[{id:'t1',title:'Renew passport',notes:'before the Goa trip',date:'2026-11-01'},{id:'t2',title:'Buy milk',done:true}],
 saved:[{id:'s1',kind:'link',title:'Blog',page:'Best beaches in Goa',description:'A guide',url:'https://x.com/goa',favorite:true},{id:'p1',kind:'pdf',title:'Visa form'}],
 jobs:[{id:'j1',company:'Acme',role:'Designer',notes:'remote role in Goa?'}],
 finance:[{id:'f1',note:'Hotel deposit',category:'travel',amount:5000,date:'2026-10-02',type:'expense'}],
 events:[{id:'e1',title:'Flight to Goa',date:'2026-12-20'}]
};
test('finds matches across every collection and skips trashed items',()=>{
 const r=search(data,'goa');
 const kinds=new Set(r.map(x=>x.type));
 for(const k of ['notes','tasks','saved','jobs','events'])assert.ok(kinds.has(k),k);
 assert.ok(!r.some(x=>x.id==='n3'));
});
test('title matches rank above body matches and every word must match',()=>{
 const r=search(data,'goa');
 assert.ok(['n1','s1','e1'].includes(r[0].id));
 assert.equal(search(data,'goa hotel').length,1);
 assert.equal(search(data,'goa zzzz').length,0);
 assert.equal(search(data,'').length,0);
});
test('type filter, sections and snippets',()=>{
 assert.deepEqual(search(data,'goa',{types:['notes']}).map(x=>x.id),['n1']);
 assert.equal(sectionOf('pdfs'),'pdfs');assert.equal(sectionOf('events'),'calendar');
 const n=search(data,'beach',{types:['notes']})[0];
 assert.match(n.snippet,/beach hotel/);
 assert.equal(search(data,'visa')[0].type,'pdfs');
 assert.equal(entries(data).length,9);
});
