import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDate,toNumber,parseCSV,fromCSV,fromLines,fromGooglePay,htmlToLines,parseStatement,markDuplicates,guessCategory,detectAccount} from '../src/workspace/statement.mjs';

test('dates in the formats statements use',()=>{
 assert.equal(parseDate('31/12/2026'),'2026-12-31');
 assert.equal(parseDate('05-03-26'),'2026-03-05');
 assert.equal(parseDate('2026-10-12'),'2026-10-12');
 assert.equal(parseDate('12 Oct 2026'),'2026-10-12');
 assert.equal(parseDate('Oct 12, 2026, 10:15:03 PM IST'),'2026-10-12');
 assert.equal(parseDate('not a date'),'');
 assert.equal(toNumber('₹1,250.50'),1250.5);assert.equal(toNumber('(300.00)'),-300);
});
test('CSV with debit and credit columns',()=>{
 const csv='Account Statement\nDate,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Balance\n01/10/2026,UPI-SWIGGY-123,UPI123456,349.00,,10000.00\n02/10/2026,"SALARY, ACME LTD",NEFT99,,50000.00,60000.00\n';
 const r=fromCSV(csv);
 assert.equal(r.rows.length,2);
 assert.deepEqual(r.rows[0],{date:'2026-10-01',type:'expense',amount:349,note:'Swiggy',detail:'UPI-SWIGGY-123',category:'food',ref:'UPI123456'});
 assert.equal(r.rows[1].type,'income');assert.equal(r.rows[1].category,'salary');assert.equal(r.rows[1].note,'SALARY, ACME LTD');
});
test('CSV with one signed amount column',()=>{
 const r=fromCSV('Date;Description;Amount\n12-10-2026;Uber ride;-250,00\n13-10-2026;Refund Amazon;120.00\n');
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[0].type,'expense');assert.equal(r.rows[0].category,'transport');
});
test('PhonePe style PDF lines',()=>{
 const lines=['Transaction Statement for 9999999999','Date Transaction Details Type Amount',
  'Oct 12, 2026','10:15 pm','Paid to Swiggy','Transaction ID T2610121015','Paid by XXXXXX1234','DEBIT','₹349',
  'Oct 11, 2026','09:02 am','Received from Ramesh Kumar','Transaction ID T2610110902','CREDIT','₹1,000'];
 const r=fromLines(lines);
 assert.equal(r.rows.length,2);
 assert.deepEqual([r.rows[0].date,r.rows[0].type,r.rows[0].amount,r.rows[0].note,r.rows[0].ref],['2026-10-12','expense',349,'Swiggy','T2610121015']);
 assert.equal(r.rows[1].type,'income');assert.equal(r.rows[1].amount,1000);
});
test('bank PDF lines use the balance to tell debit from credit',()=>{
 const lines=['01/10/2026 UPI/Zomato/4455 120.00 4,880.00','02/10/2026 NEFT salary 20,000.00 24,880.00','03/10/2026 ATM WDL 2,000.00 22,880.00'];
 const r=fromLines(lines);
 assert.deepEqual(r.rows.map(x=>[x.type,x.amount]),[['expense',120],['income',20000],['expense',2000]]);
});
test('Google Pay activity',()=>{
 const html='<div>Paid ₹250.00 to Chai Point<br>Oct 12, 2026, 10:15:03 PM IST</div><div>Received ₹500.00 from Asha<br>Oct 10, 2026, 8:00:00 AM IST</div>';
 const r=parseStatement({name:'My Activity.html',text:html});
 assert.deepEqual(r.rows.map(x=>[x.date,x.type,x.amount,x.note]),[['2026-10-12','expense',250,'Chai Point'],['2026-10-10','income',500,'Asha']]);
});
test('duplicates are flagged against existing transactions',()=>{
 const rows=[{date:'2026-10-12',type:'expense',amount:349,note:'Swiggy',ref:'T1'},{date:'2026-10-12',type:'expense',amount:50,note:'Tea',ref:''},{date:'2026-10-12',type:'expense',amount:50,note:'Tea',ref:''}];
 const out=markDuplicates(rows,[{date:'2026-10-12',type:'expense',amount:349,note:'Swiggy',ref:'T1'}]);
 assert.deepEqual(out.map(r=>r.duplicate),[true,false,false]);
 assert.equal(guessCategory('Netflix','expense'),'fun');
});

test('two accounts in the same month are not duplicates of each other',()=>{
 const rows=[{date:'2026-10-05',type:'expense',amount:200,note:'Zomato',detail:'UPI/Zomato',ref:''}];
 const saved=[{date:'2026-10-05',type:'expense',amount:200,note:'Zomato',detail:'UPI/Zomato',account:'HDFC'}];
 assert.equal(markDuplicates(rows,saved,'ICICI')[0].duplicate,false);
 assert.equal(markDuplicates(rows,saved,'HDFC')[0].duplicate,true);
});
test('detectAccount reads a masked number or falls back to the file name',()=>{
 assert.equal(detectAccount('Statement for A/c No: XXXXXX1234'),'Account ending 1234');
 assert.equal(detectAccount('nothing here','icici_oct.pdf'),'icici oct');
});
