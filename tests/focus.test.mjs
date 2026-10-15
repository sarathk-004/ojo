import test from 'node:test';
import assert from 'node:assert/strict';
import {fmtClock,fmtDur,totalsByTask,perDay,sumSeconds,startOfDay} from '../src/workspace/focus.mjs';

test('clock and duration text',()=>{
 assert.equal(fmtClock(25*60000),'25:00');assert.equal(fmtClock(61000),'01:01');assert.equal(fmtClock(3725000),'1:02:05');assert.equal(fmtClock(-5),'00:00');
 assert.equal(fmtDur(20),'20s');assert.equal(fmtDur(45*60),'45m');assert.equal(fmtDur(3600),'1h');assert.equal(fmtDur(4800),'1h 20m');
});
test('totals per task and per day',()=>{
 const day=startOfDay('2026-10-12');
 const s=[{taskId:'a',title:'Write',start:day+3600000,seconds:1500},{taskId:'a',title:'Write',start:day+9*3600000,seconds:1500},{taskId:'b',title:'Read',start:day+86400000*-1+5000,seconds:600},{taskId:'',title:'',start:day+10,seconds:300}];
 assert.equal(sumSeconds(s,day,day+86400000),3300);
 const t=totalsByTask(s,day,day+86400000);
 assert.deepEqual(t.map(x=>[x.taskId,x.seconds,x.count]),[['a',3000,2],['',300,1]]);
 const d=perDay(s,'2026-10-12',3);
 assert.deepEqual(d.map(x=>[x.day,x.seconds]),[['2026-10-10',0],['2026-10-11',600],['2026-10-12',3300]]);
});
