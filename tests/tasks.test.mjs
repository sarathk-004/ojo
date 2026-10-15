import {test} from 'node:test';
import assert from 'node:assert/strict';
test('unchecking Daily removes only today and allows completion again',()=>{const now=new Date(2026,8,23,10),task={repeat:true,date:'2026-09-23',reminder:'2026-09-23T09:00',completions:['2026-09-22']};const checked=toggleTask(task,now),unchecked=toggleTask(checked,now);assert.deepEqual(unchecked.completions,['2026-09-22']);assert.equal(unchecked.date,'2026-09-23');assert.equal(unchecked.notified,true);assert.equal(completedToday(unchecked,now),false);assert.deepEqual(toggleTask(unchecked,now).completions,['2026-09-22','2026-09-23']);});
test('monthly marks start at the top in weekday order and handle leap years',()=>{const task={completions:['2026-09-23']},now=new Date(2026,8,23);const september=habitMonth(task,2026,8,now);assert.equal(september.offset,1);assert.equal(september.days.length,30);assert.equal(september.days[0].date,'2026-09-01');assert.equal(september.days[22].done,true);assert.equal(september.total,1);assert.equal(habitMonth(task,2026,9,now).days.length,31);assert.equal(habitMonth(task,2028,1,now).days.length,29);});
import {belongs,collectReminders,toggleTask,dayKey,newTask,reorderTask,snoozeTask,habitStats,completedToday,completeTask,habitMonth} from '../src/tasks.mjs';
test('Daily quick-add repeats automatically and stays in Daily after completion',()=>{const now=new Date(2026,8,23,10),task=newTask('Learn a little','Daily',now,'daily');assert.equal(task.repeat,true);assert.equal(task.date,'2026-09-23');for(const view of ['Today','Upcoming','Anytime'])assert.equal(belongs(task,view,now),false);assert.equal(belongs(task,'Daily',now),true);const done=toggleTask(task,now);assert.equal(belongs(done,'Daily',now),true);assert.equal(completedToday(done,now),true);assert.equal(completedToday(done,new Date(2026,8,24)),false);assert.deepEqual(done.completions,['2026-09-23']);assert.equal(belongs({...done,repeat:false},'Upcoming',now),true);});
test('habits credit actual completion day once without backfilling missed days',()=>{const now=new Date(2026,8,23,0,5),task={repeat:true,date:'2026-09-10',notes:'Keep me'};const next=toggleTask(task,now);assert.deepEqual(next.completions,['2026-09-23']);assert.equal(next.date,'2026-09-24');assert.equal(next.notes,'Keep me');assert.equal(completeTask(next,now),next);assert.deepEqual(toggleTask(next,new Date(2026,8,24,10)).completions,['2026-09-23','2026-09-24']);});
test('habit stats deduplicate, handle gaps and preserve yesterday streak',()=>{const task={completions:['2026-09-18','2026-09-19','2026-09-21','2026-09-22','2026-09-22']};const s=habitStats(task,new Date(2026,8,23));assert.equal(s.current,2);assert.equal(s.best,2);assert.equal(s.total,4);assert.equal(s.days.length,84);assert.equal(s.weeks.length,12);assert.equal(s.weeks.at(-1),4);assert.equal(habitStats(task,new Date(2026,8,24)).current,0);assert.equal(habitStats({},new Date(2026,8,23)).total,0);});
test('views keep overdue tasks visible and separate future and undated tasks',()=>{
 const now=new Date(2026,8,21,10);
 assert.equal(belongs({date:'2026-09-20'},'Today',now),true);
 assert.equal(belongs({date:'2026-09-22'},'Upcoming',now),true);
 assert.equal(belongs({date:''},'Anytime',now),true);
 assert.equal(belongs({date:''},'Today',now),false);
});
test('reminders catch up after sleep and do not repeat or notify completed tasks',()=>{
 const state={tasks:[{id:'1',reminder:'2026-09-21T09:00'},{id:'2',done:true,reminder:'2026-09-21T09:00'},{id:'3',reminder:'2026-09-22T09:00'},{id:'4',reminder:'bad'}]};
 const now=new Date(2026,8,21,10).getTime(); const result=collectReminders(state,now);
 assert.deepEqual(result.due.map(t=>t.id),['1']);assert.equal(collectReminders(result.state,now).due.length,0);
});
test('daily completion schedules next occurrence after today, keeping reminder time',()=>{
 const task=toggleTask({date:'2020-01-01',repeat:true,reminder:'2020-01-01T09:30',notified:true});
 assert.ok(task.date>dayKey());assert.equal(task.reminder,task.date+'T09:30');assert.equal(task.notified,false);
});
test('ordinary completion can be undone',()=>{assert.equal(toggleTask(toggleTask({done:false})).done,false);});
test('quick-add respects Today, Upcoming and Anytime, including month boundaries',()=>{
 const now=new Date(2026,11,31,23,59);
 for(const view of ['Today','Upcoming','Anytime']){
  const task=newTask('  My task  ',view,now,view);
  assert.equal(task.title,'My task');
  for(const candidate of ['Today','Upcoming','Anytime'])assert.equal(belongs(task,candidate,now),view===candidate);
 }
 assert.equal(newTask('Next','Upcoming',now,'n').date,'2027-01-01');
});
test('reordering preserves task data and works in both directions',()=>{
 const items=[{id:'a',notes:'<b>Keep</b>'},{id:'b'},{id:'c'},{id:'d'}];
 const moved=reorderTask(items,'a','c',true);
 assert.deepEqual(moved.map(t=>t.id),['b','c','a','d']);
 assert.equal(moved[2],items[0]);
 assert.deepEqual(reorderTask(moved,'a','b').map(t=>t.id),['a','b','c','d']);
 assert.equal(reorderTask(items,'missing','a'),items);
});
test('muted reminders defer until unmuted and snooze crosses midnight',()=>{
 const now=new Date(2026,8,22,23,55).getTime(),task={id:'a',date:'2026-09-22',reminder:'2026-09-22T23:00',notified:true};
 const snoozed=snoozeTask(task,10,now);
 assert.equal(snoozed.reminder,'2026-09-23T00:05');assert.equal(snoozed.notified,false);
 const state={tasks:[{...task,notified:false}],mutedUntil:now+3600000};
 assert.equal(collectReminders(state,now).due.length,0);
 assert.equal(collectReminders(state,now+3600001).due.length,1);
});
