import test from 'node:test';
import assert from 'node:assert/strict';
import {vendorName,cycleOf,vendorStats} from '../src/workspace/vendor.mjs';
import {parseStatement,markDuplicates} from '../src/workspace/statement.mjs';

test('long bank and UPI text becomes the vendor name',()=>{
 assert.equal(vendorName('UPI/DR/412345678901/ZOMATO LTD/zomato@hdfcbank/HDFC0000001'),'Zomato');
 assert.equal(vendorName('UPI-RAMESH KUMAR-9876543210@ybl-YESB0YBLUPI-412345678901-UPI'),'Ramesh Kumar');
 assert.equal(vendorName('UPI/DR/412/Sri Balaji Fruits/sribalaji@paytm/PYTM0123456'),'Sri Balaji Fruits');
 assert.equal(vendorName('NEFT-N123456789-ACME CORP-SALARY'),'Acme Corp');
 assert.equal(vendorName('IMPS-412345678-SURESH TEA STALL-HDFC-XXXX'),'Suresh Tea Stall');
 assert.equal(vendorName('9876543210@ybl'),'Phone ••3210');
 assert.equal(vendorName('Paid to Swiggy'),'Swiggy');
 assert.equal(vendorName('Lunch with team'),'Lunch with team');
});

const days=(start,gaps)=>{
 let d=Date.UTC(2026,4,start);
 const out=[new Date(d).toISOString().slice(0,10)];
 for(const g of gaps){d+=g*864e5;out.push(new Date(d).toISOString().slice(0,10));}
 return out;
};
test('how often a vendor is paid',()=>{
 assert.equal(cycleOf(days(1,Array(10).fill(1))).id,'daily');
 assert.equal(cycleOf(days(1,[3,4,3,4,3,4])).id,'twice');
 assert.equal(cycleOf(days(1,[7,7,7,7])).id,'weekly');
 assert.equal(cycleOf(days(1,[30,31,30])).id,'monthly');
 assert.equal(cycleOf(days(1,[2,19,40])),null);
 assert.equal(cycleOf(['2026-05-01','2026-05-02']),null);
});

test('regular vendors group by name, whatever the UPI text says',()=>{
 const tx=days(1,Array(9).fill(1)).map((date,i)=>({
  type:'expense',date,amount:50+i*3,category:'food',
  note:i%2?'UPI/DR/4123'+i+'/CHAI POINT/chaipoint@ybl/x':'UPI-CHAI POINT-chaipoint@ybl-YESB0YBLUPI-9'+i
 }));
 const v=vendorStats(tx,{month:'2026-05'});
 assert.equal(v.length,1);
 assert.equal(v[0].name,'Chai Point');
 assert.equal(v[0].label,'Daily');
 assert.equal(v[0].monthCount,10);
});

test('a May statement keeps its May dates and re-importing it adds nothing',()=>{
 const csv=[
  'Date,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Balance',
  '03/05/2026,UPI-ZOMATO LTD-zomato@hdfc-HDFC0000001-412345678901-UPI,R1,250.00,,9750.00',
  '10/05/2026,UPI-ZOMATO LTD-zomato@hdfc-HDFC0000001-412345678902-UPI,R2,300.00,,9450.00'
 ].join('\n')+'\n';
 const r=parseStatement({name:'may.csv',text:csv});
 assert.deepEqual(r.rows.map(x=>x.date),['2026-05-03','2026-05-10']);
 assert.equal(r.rows[0].note,'Zomato');
 const saved=r.rows.map(x=>({...x,imported:true}));
 assert.ok(markDuplicates(parseStatement({name:'may.csv',text:csv}).rows,saved).every(x=>x.duplicate));
 // rows saved by an earlier version (the long text as the note, no detail) are still recognised
 const old=r.rows.map(x=>({...x,note:x.detail,detail:undefined,ref:''}));
 assert.ok(markDuplicates(parseStatement({name:'may.csv',text:csv}).rows.map(x=>({...x,ref:''})),old).every(x=>x.duplicate));
});
