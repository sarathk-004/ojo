import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileListOrder,belongsMobile} from '../src/mobile-lists.mjs';
import {belongs} from '../src/tasks.mjs';
test('mobile merges undated tasks into Upcoming without changing desktop classification',()=>{
 const now=new Date(2026,8,28,12),task={date:'',repeat:false,done:false};
 assert.equal(belongsMobile(task,'Upcoming',now),true);
 assert.equal(belongsMobile(task,'Today',now),false);
 assert.equal(belongs(task,'Upcoming',now),false);
 assert.equal(belongs(task,'Anytime',now),true);
 assert.equal(belongsMobile({...task,repeat:true},'Upcoming',now),false);
});
test('mobile has three tabs and preserves their saved relative order',()=>{
 assert.deepEqual(mobileListOrder(),['Today','Upcoming','Daily']);
 assert.deepEqual(mobileListOrder(['Daily','Anytime','Today','Upcoming']),['Daily','Today','Upcoming']);
});
