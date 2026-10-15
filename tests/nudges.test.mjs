import test from 'node:test';
import assert from 'node:assert/strict';
import {nextSlot,tick,scheduleText,fmtEvery,fmtClock,newReminder,dayKey} from '../src/workspace/nudges.mjs';
const at=(d,h,m=0)=>new Date(2026,9,d,h,m,0,0).getTime(); // October 2026; the 12th is a Monday
const R=(o={})=>newReminder({every:60,from:'08:00',to:'22:00',...o},'r');

test('next slot is aligned to the window start',()=>{
 assert.equal(nextSlot(R(),at(12,7)),at(12,8));
 assert.equal(nextSlot(R(),at(12,8,0)),at(12,9));
 assert.equal(nextSlot(R(),at(12,8,1)),at(12,9));
 assert.equal(nextSlot(R(),at(12,13,30)),at(12,14));
 assert.equal(nextSlot(R({every:45}),at(12,8,50)),at(12,9,30));
});
test('after the window closes it rolls to the next day',()=>{
 assert.equal(nextSlot(R(),at(12,22)),at(13,8));
 assert.equal(nextSlot(R(),at(12,23)),at(13,8));
});
test('only active days',()=>{
 const weekdays=R({days:[1,2,3,4,5]});
 assert.equal(nextSlot(weekdays,at(10,23)),at(12,8)); // Saturday night -> Monday
 assert.equal(nextSlot(R({days:[3]}),at(12,9)),at(14,8)); // Wednesday only
 assert.equal(nextSlot(R({from:'20:00',to:'08:00'}),at(12,9)),null);
});
test('tick fires on time, then schedules the next slot',()=>{
 const r=R();
 let t=tick(r,undefined,(at(12,10)+1),0);
 assert.equal(t.fire,false);
 const nextAt=t.state.nextAt;
 t=tick(r,{nextAt},nextAt+5000,0);
 assert.equal(t.fire,true);assert.ok(t.state.nextAt>nextAt);
});
test('tick skips a backlog after a long gap and stops at the goal',()=>{
 const r=R({goal:3});
 const stale={nextAt:at(12,9)};
 const t=tick(r,stale,at(12,15,20),0);
 assert.equal(t.fire,false);assert.equal(t.state.nextAt,at(12,16));
 const due={nextAt:at(12,16)};
 assert.equal(tick(r,due,(at(12,16)+1),3).fire,false);
 assert.equal(tick(r,due,(at(12,16)+1),2).fire,true);
 assert.equal(tick(R({enabled:false}),due,at(12,16,1),0).fire,false);
});
test('text helpers',()=>{
 assert.equal(fmtEvery(60),'hour');assert.equal(fmtEvery(20),'20 min');assert.equal(fmtEvery(120),'2 hours');assert.equal(fmtEvery(90),'1 h 30 min');
 assert.equal(fmtClock('08:00'),'8 am');assert.equal(fmtClock('22:30'),'10:30 pm');
 assert.equal(scheduleText(R()),'Every hour · 8 am–10 pm · Every day');
 assert.equal(scheduleText(R({days:[1,2,3,4,5]})),'Every hour · 8 am–10 pm · Weekdays');
 assert.equal(dayKey(at(12,9)),'2026-10-12');
});
