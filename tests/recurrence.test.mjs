import test from 'node:test';
import assert from 'node:assert/strict';
import {nextDate,firstDate,recurLabel,isDailyTask,toggleTask,newSubtask,subtaskProgress,toggleSubtask,moveTask,snoozeDate,addDays,syncMasterDaily,belongs} from '../src/tasks.mjs';

const at=s=>new Date(s+'T10:00:00');
const base=over=>({id:'t',title:'T',date:'2026-10-12',reminder:'',repeat:true,done:false,notes:'',...over});

test('weekly tasks go to the next chosen weekday',()=>{
 const t=base({recur:{type:'weekly',days:[1,3]}});            // Mon + Wed; 12 Oct 2026 is a Monday
 assert.equal(nextDate(t,'2026-10-12'),'2026-10-14');
 assert.equal(nextDate({...t,date:'2026-10-14'},'2026-10-14'),'2026-10-19');
 assert.equal(nextDate(t,'2026-10-15'),'2026-10-19');         // completed late: skips to the next one after today
 assert.equal(nextDate(base({recur:{type:'weekly',days:[]}}),'2026-10-12'),'2026-10-19');
});
test('every N days counts from the last due date and never lands in the past',()=>{
 const t=base({recur:{type:'interval',every:3}});
 assert.equal(nextDate(t,'2026-10-12'),'2026-10-15');
 assert.equal(nextDate(t,'2026-10-20'),'2026-10-21');         // 12, 15, 18, 21
});
test('monthly keeps the day of the month',()=>{
 assert.equal(nextDate(base({recur:{type:'monthly'},date:'2026-01-31'}),'2026-01-31'),'2026-02-28');
 assert.equal(nextDate(base({recur:{type:'monthly',dom:31},date:'2026-02-28'}),'2026-02-28'),'2026-03-31');
 assert.equal(nextDate(base({recur:{type:'monthly'},date:'2026-12-15'}),'2026-12-15'),'2027-01-15');
});
test('no recur means every day, as before',()=>{
 assert.equal(nextDate(base(),'2026-10-12'),'2026-10-13');
 assert.ok(isDailyTask(base()));assert.ok(!isDailyTask(base({recur:{type:'weekly',days:[1]}})));
});
test('labels and first dates',()=>{
 assert.equal(recurLabel(base()),'Every day');
 assert.equal(recurLabel(base({recur:{type:'weekly',days:[3,1]}})),'Mon · Wed');
 assert.equal(recurLabel(base({recur:{type:'interval',every:3}})),'Every 3 days');
 assert.equal(recurLabel(base({recur:{type:'monthly'},date:'2026-10-02'})),'Monthly on the 2nd');
 assert.equal(recurLabel(base({recur:{type:'monthly'},date:'2026-10-23'})),'Monthly on the 23rd');
 assert.equal(firstDate({type:'weekly',days:[3]},'2026-10-12'),'2026-10-14');
 assert.equal(firstDate({type:'weekly',days:[1]},'2026-10-12'),'2026-10-12');
});
test('completing moves a repeating task on and resets its checklist',()=>{
 const t=base({recur:{type:'weekly',days:[1,3]},subtasks:[{id:'a',title:'x',done:true},{id:'b',title:'y',done:true}]});
 const done=toggleTask(t,at('2026-10-12'));
 assert.equal(done.date,'2026-10-14');assert.deepEqual(done.completions,['2026-10-12']);assert.ok(done.subtasks.every(s=>!s.done));
 // a weekly task that is not due today does not count toward "every habit done"
 const state=syncMasterDaily({tasks:[done,base({id:'d'})]},at('2026-10-12'));
 assert.deepEqual(state.masterDaily['2026-10-12'].required.sort(),['d','t']);   // t was done today, so it counted; it is not due again until the 14th
 const next=syncMasterDaily({tasks:[done]},at('2026-10-13'));
 assert.equal(next.masterDaily,undefined);
 assert.ok(!belongs(done,'Today'));
});
test('subtasks and moving a task',()=>{
 let t={id:'t',title:'Trip',date:'2026-10-10',reminder:'2026-10-10T09:30',subtasks:[newSubtask('Passport','a'),newSubtask('Tickets','b')]};
 t=toggleSubtask(t,'a');assert.deepEqual(subtaskProgress(t),{done:1,total:2});
 const m=moveTask(t,'2026-10-13');assert.equal(m.date,'2026-10-13');assert.equal(m.reminder,'2026-10-13T09:30');assert.equal(m.notified,false);
 assert.equal(moveTask({...t,reminder:''},'2026-10-13').reminder,'');
 assert.equal(snoozeDate('tomorrow','2026-10-12'),'2026-10-13');
 assert.equal(snoozeDate('weekend','2026-10-12'),'2026-10-17');   // Monday to Saturday
 assert.equal(snoozeDate('weekend','2026-10-17'),'2026-10-24');   // already Saturday: the next one
 assert.equal(snoozeDate('nextweek','2026-10-12'),'2026-10-19');
 assert.equal(snoozeDate('nextweek','2026-10-18'),'2026-10-19');  // Sunday to Monday
 assert.equal(addDays('2026-10-31',1),'2026-11-01');
});
