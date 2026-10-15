import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,newBill,occurrences,status,dueLabel,markPaid,skip,monthlyCost,totals,needsNotify,billTxn,detectRecurring} from '../src/workspace/bills.mjs';

test('dates advance by cycle and keep the day of the month',()=>{
 assert.equal(advance('2026-01-31','monthly',31),'2026-02-28');
 assert.equal(advance('2026-02-28','monthly',31),'2026-03-31');
 assert.equal(advance('2026-10-12','weekly'),'2026-10-19');
 assert.equal(advance('2026-10-12','biweekly'),'2026-10-26');
 assert.equal(advance('2026-11-30','quarterly',30),'2027-02-28');
 assert.equal(advance('2026-03-15','yearly',15),'2027-03-15');
});
test('status, labels and reminders',()=>{
 const b=newBill({name:'Rent',amount:15000,due:'2026-10-14',remind:3},'b1',0);
 assert.deepEqual(status(b,'2026-10-12'),{days:2,state:'soon'});
 assert.equal(dueLabel(b,'2026-10-12'),'Due in 2 days');
 assert.equal(dueLabel(b,'2026-10-14'),'Due today');
 assert.equal(dueLabel(b,'2026-10-16'),'2 days overdue');
 assert.ok(needsNotify(b,'2026-10-12'));assert.ok(!needsNotify(b,'2026-10-05'));
 assert.ok(!needsNotify({...b,notified:'2026-10-14'},'2026-10-12'));
 assert.ok(!needsNotify({...b,auto:true},'2026-10-12'));
});
test('paying or skipping moves on; EMIs end',()=>{
 const b=newBill({name:'Rent',amount:100,due:'2026-10-31'},'b1',0);
 const p=markPaid(b,'2026-10-30','t1');
 assert.equal(p.due,'2026-11-30');assert.equal(p.paid.length,1);assert.equal(p.notified,'');
 assert.equal(skip(b).due,'2026-11-30');
 const emi=newBill({name:'EMI',amount:5000,due:'2026-12-05',endDate:'2026-12-31'},'e',0);
 const last=markPaid(emi,'2026-12-05');
 assert.equal(last.active,false);
 assert.deepEqual(occurrences(newBill({name:'x',due:'2026-10-01',cycle:'weekly'},'x',0),'2026-10-05','2026-10-31'),['2026-10-08','2026-10-15','2026-10-22','2026-10-29']);
});
test('monthly cost and totals',()=>{
 assert.equal(monthlyCost({amount:1200,cycle:'yearly'}),100);
 assert.equal(Math.round(monthlyCost({amount:100,cycle:'weekly'})),433);
 const t=totals([newBill({name:'A',amount:100,due:'2026-10-13',kind:'subscription'},'a',0),newBill({name:'B',amount:1200,cycle:'yearly',due:'2027-01-01'},'b',0)],'2026-10-12');
 assert.equal(t.monthly,200);assert.equal(t.yearly,2400);assert.equal(t.subscriptions,1);assert.equal(t.dueSoon,1);assert.equal(t.dueSoonAmount,100);
 const x=billTxn({id:'b1',name:'Rent',amount:99,category:'rent'},'2026-10-12','t',1);
 assert.deepEqual([x.type,x.amount,x.billId,x.note],['expense',99,'b1','Rent']);
});
test('repeating payments are found in spending',()=>{
 const tx=[];let id=0;
 for(const m of ['2026-06','2026-07','2026-08','2026-09'])tx.push({id:++id,type:'expense',amount:649,date:m+'-05',note:'Netflix',category:'fun'});
 for(const d of ['2026-09-01','2026-09-08','2026-09-15','2026-09-22'])tx.push({id:++id,type:'expense',amount:120,date:d,note:'Milk delivery',category:'food'});
 tx.push({id:++id,type:'expense',amount:300,date:'2026-09-03',note:'Dinner'},{id:++id,type:'expense',amount:150,date:'2026-09-20',note:'Dinner'});
 const r=detectRecurring(tx,[],{today:'2026-10-12'});
 assert.deepEqual(r.map(x=>[x.name,x.cycle,x.amount]),[['Netflix','monthly',649],['Milk delivery','weekly',120]]);
 assert.equal(r[0].due,'2026-10-05'.replace('10-05','11-05'));
 assert.equal(detectRecurring(tx,[{name:'Netflix'}],{today:'2026-10-12'}).length,1);
 assert.equal(detectRecurring(tx,[],{today:'2026-10-12',dismissed:['netflix']}).length,1);
});

import {alertLevels} from '../src/workspace/finance.mjs';
test('budget alerts fire once per level and can fire again after a reset',()=>{
 const u=(pct,cat='food')=>[{category:cat,pct,spent:pct*10,limit:1000}];
 let r=alertLevels(u(70));assert.equal(r.alerts.length,0);
 r=alertLevels(u(82),r.next);assert.deepEqual(r.alerts.map(a=>a.level),[80]);
 r=alertLevels(u(90),r.next);assert.equal(r.alerts.length,0);          // still in the same band
 r=alertLevels(u(104),r.next);assert.deepEqual(r.alerts.map(a=>a.level),[100]);
 r=alertLevels(u(60),r.next);assert.equal(r.alerts.length,0);          // limit raised: quiet, but re-armed
 r=alertLevels(u(85),r.next);assert.deepEqual(r.alerts.map(a=>a.level),[80]);
 r=alertLevels(u(120,'rent'),{});assert.deepEqual(r.alerts.map(a=>a.level),[100]);   // jumped straight past 100
});
