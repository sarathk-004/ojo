import test from 'node:test';
import assert from 'node:assert/strict';
import {remindOptions,folderCount,unfiled} from '../src/workspace/savedlib.mjs';

test('reminder choices are all in the future and in order of distance',()=>{
 const now=new Date('2026-10-18T12:00:00').getTime();
 const o=remindOptions(now);
 for(const x of o)assert.ok(x.at>now,x.id);
 assert.equal(new Date(o.find(x=>x.id==='weekend').at).getDay(),6);
 assert.equal(new Date(o.find(x=>x.id==='week').at).getDay(),1);
});
test('folder counts ignore trashed items',()=>{
 const items=[{folder:'a'},{folder:'a',deleted:1},{folder:'b'},{}];
 assert.equal(folderCount(items,'a'),1);
 assert.equal(unfiled(items),1);
});
