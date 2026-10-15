import test from 'node:test';
import assert from 'node:assert/strict';
import {timeToMin,minToTime,snap,layoutColumns,blockFor,repeaterWindows} from '../src/workspace/planner.mjs';
import {weekRange,shiftWeek,weeklyStats} from '../src/workspace/review.mjs';

test('times and snapping',()=>{
 assert.equal(timeToMin('09:30'),570);assert.equal(minToTime(570),'09:30');assert.equal(minToTime(24*60),'24:00');
 assert.equal(snap(547),540);assert.equal(snap(553),555);
 assert.deepEqual(blockFor({block:{date:'2026-10-12',start:'10:00',end:'11:30'}},'2026-10-12'),{start:600,end:690});
 assert.equal(blockFor({block:{date:'2026-10-11',start:'10:00',end:'11:30'}},'2026-10-12'),null);
});
test('overlapping blocks sit side by side',()=>{
 const out=layoutColumns([{id:'a',start:600,end:660},{id:'b',start:630,end:700},{id:'c',start:720,end:780}]);
 const by=Object.fromEntries(out.map(x=>[x.id,x]));
 assert.deepEqual([by.a.col,by.a.cols,by.b.col,by.b.cols],[0,2,1,2]);
 assert.deepEqual([by.c.col,by.c.cols],[0,1]);
});
test('repeaters that run on the day',()=>{
 const r=[{id:'w',name:'Water',emoji:'x',from:'08:00',to:'22:00',every:60,days:[1,2,3,4,5],enabled:true},{id:'x',name:'Off',from:'09:00',to:'10:00',enabled:false}];
 assert.equal(repeaterWindows(r,'2026-10-12').length,1);   // a Monday
 assert.equal(repeaterWindows(r,'2026-10-11').length,0);   // a Sunday
});
test('weeks run Monday to Sunday',()=>{
 const w=weekRange('2026-10-14');
 assert.equal(w.start,'2026-10-12');assert.equal(w.end,'2026-10-18');assert.equal(w.days.length,7);
 assert.equal(shiftWeek('2026-10-14',-1),'2026-10-07');
});
test('weekly numbers come only from real records',()=>{
 const at=day=>new Date(day+'T10:00:00').getTime();
 const data={
  tasks:[{id:'1',title:'Ship',done:true,doneAt:at('2026-10-13')},{id:'2',title:'Old',done:true},{id:'3',title:'Walk',repeat:true,completions:['2026-10-12','2026-10-14','2026-10-05']}],
  finance:[{type:'expense',amount:200,category:'food',date:'2026-10-13'},{type:'expense',amount:100,category:'bills',date:'2026-10-14',billId:'b'},{type:'income',amount:1000,category:'salary',date:'2026-10-15'},{type:'expense',amount:150,category:'food',date:'2026-10-06'}],
  focus:[{taskId:'1',title:'Ship',start:at('2026-10-13'),seconds:1500},{taskId:'1',title:'Ship',start:at('2026-10-14'),seconds:1500},{taskId:'',title:'Read',start:at('2026-10-01'),seconds:900}],
  notes:[{created:at('2026-10-13'),updated:at('2026-10-13')},{created:at('2026-09-01'),updated:at('2026-10-14')}],
  saved:[{created:at('2026-10-16')}],jobs:[{appliedDate:'2026-10-14',history:[{status:'Applied',at:at('2026-10-14')}]}],events:[{date:'2026-10-17'}]
 };
 const s=weeklyStats(data,'2026-10-14');
 assert.deepEqual(s.tasks.finished.map(t=>t.title),['Ship']);     // "Old" has no completion time, so it is not guessed
 assert.equal(s.tasks.habits[0].count,2);assert.equal(s.tasks.habitRate,29);
 assert.deepEqual([s.money.expense,s.money.income,s.money.saved,s.money.prevExpense,s.money.change],[300,1000,700,150,100]);
 assert.equal(s.money.topCats[0].category,'food');assert.equal(s.bills.paidCount,1);
 assert.equal(s.focus.seconds,3000);assert.equal(s.focus.top[0].title,'Ship');
 assert.deepEqual([s.other.notesMade,s.other.notesEdited,s.other.savedAdded,s.other.jobsApplied,s.other.events],[1,1,1,1,1]);
});
