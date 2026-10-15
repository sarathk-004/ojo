import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,monthlySeries,budgetUsage,fmtMoney,parseAmount,shiftMonth,toCSV,catOf} from '../src/workspace/finance.mjs';
import {newJob,moveJob,stats,followUps,daysSince} from '../src/workspace/jobs.mjs';

const T=[
 {id:'1',type:'income',amount:50000,category:'salary',date:'2026-10-01'},
 {id:'2',type:'expense',amount:1200.5,category:'food',date:'2026-10-02',note:'dinner, "late"'},
 {id:'3',type:'expense',amount:800,category:'food',date:'2026-10-02'},
 {id:'4',type:'expense',amount:15000,category:'rent',date:'2026-10-05'},
 {id:'5',type:'expense',amount:300,category:'food',date:'2026-09-28'}
];
test('summarize groups a month',()=>{
 const s=summarize(T,'2026-10');
 assert.equal(s.income,50000);assert.equal(s.expense,17000.5);assert.equal(s.net,32999.5);
 assert.deepEqual(s.byCategory.map(c=>c.category),['rent','food']);
 assert.equal(s.byDay['2026-10-02'],2000.5);assert.equal(s.savingsRate,66);
 assert.equal(summarize(T,'2026-08').count,0);assert.equal(summarize(T,'2026-08').savingsRate,null);
});
test('series covers the last months oldest first',()=>{
 const s=monthlySeries(T,'2026-10',3);
 assert.deepEqual(s.map(x=>x.key),['2026-08','2026-09','2026-10']);
 assert.equal(s[1].expense,300);assert.equal(s[2].income,50000);
});
test('budgets flag overspending',()=>{
 const u=budgetUsage([{category:'food',limit:1500},{category:'rent',limit:20000}],summarize(T,'2026-10'));
 assert.equal(u[0].category,'food');assert.equal(u[0].over,true);assert.equal(u[1].pct,75);
});
test('money formatting and parsing',()=>{
 assert.equal(fmtMoney(1234567.5,'₹'),'₹12,34,567.50');
 assert.equal(fmtMoney(-250,'$'),'−$250');
 assert.equal(parseAmount('₹ 1,250.75'),1250.75);
 assert.ok(Number.isNaN(parseAmount('abc')));assert.ok(Number.isNaN(parseAmount('0')));
 assert.equal(shiftMonth('2026-01',-1),'2025-12');assert.equal(shiftMonth('2026-11',2),'2027-01');
 assert.equal(catOf('nope').name,'nope');
});
test('csv escapes quotes and commas',()=>{
 const csv=toCSV(T).split('\n');
 assert.equal(csv[0],'Date,Type,Category,Amount,Note');
 assert.ok(csv.some(l=>l.includes('"dinner, ""late"""')));
});
test('jobs: pipeline, history and stats',()=>{
 const a=newJob({company:'Acme',role:'SDE'},Date.UTC(2026,9,1,6),'a');
 assert.equal(a.status,'Applied');assert.equal(a.history.length,1);
 const b=moveJob(moveJob(a,'Screening',2),'Interview',3);
 assert.deepEqual(b.history.map(h=>h.status),['Applied','Screening','Interview']);
 assert.equal(moveJob(b,'Interview',9),b);
 const w=newJob({company:'Wish',role:'X',status:'Wishlist'},0,'w');
 assert.equal(w.appliedDate,'');
 assert.ok(moveJob(w,'Applied',Date.UTC(2026,9,3,6)).appliedDate);
 const s=stats([a,b,w,moveJob(newJob({company:'R',role:'Y'},0,'r'),'Rejected',1)]);
 assert.equal(s.total,4);assert.equal(s.applied,3);assert.equal(s.interviews,1);assert.equal(s.responseRate,33);
});
test('follow-ups list overdue and soon, skip closed ones',()=>{
 const mk=(id,nextDate,status='Applied')=>newJob({company:id,role:'r',nextDate,status},0,id);
 const f=followUps([mk('late','2026-10-01'),mk('soon','2026-10-14'),mk('far','2026-12-01'),mk('done','2026-10-10','Rejected'),mk('none','')],'2026-10-11');
 assert.deepEqual(f.map(j=>j.id),['late','soon']);assert.equal(f[0].overdue,true);assert.equal(f[1].overdue,false);
 assert.equal(daysSince('2026-10-01','2026-10-11'),10);assert.equal(daysSince('','2026-10-11'),null);
});

test('job links are recognised and parsed',async()=>{
 const {isJobLink,jobFromPage}=await import('../src/workspace/classify.mjs');
 for(const u of ['https://in.indeed.com/viewjob?jk=1','https://www.linkedin.com/jobs/view/123','https://boards.greenhouse.io/acme/jobs/1','https://careers.acme.com/en/role','https://acme.com/careers/designer','https://jobs.lever.co/acme/x'])assert.ok(isJobLink(u),u);
 for(const u of ['https://www.linkedin.com/in/someone','https://youtu.be/abc','https://github.com/acme/jobs/issues','https://example.com/blog/post','nope'])assert.ok(!isJobLink(u),u);
 assert.deepEqual(jobFromPage({title:'Acme hiring Product Designer in Pune | LinkedIn',url:'https://www.linkedin.com/jobs/view/1'}),{role:'Product Designer',company:'Acme',location:'Pune',source:'LinkedIn'});
 assert.equal(jobFromPage({title:'Frontend Engineer at Globex',url:'https://careers.globex.com/x'}).company,'Globex');
 const c=jobFromPage({title:'Data Analyst',url:'https://careers.initech.com/j/1'});assert.equal(c.company,'Initech');assert.equal(c.source,'Company site');
});
