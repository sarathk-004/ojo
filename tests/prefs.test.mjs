import test from 'node:test';
import assert from 'node:assert/strict';
import {getPrefs,columnsOf,DEFAULTS,DEFAULT_COLUMNS,dowNames,publishPrefs,weekStart,dateLocale,codeOptions} from '../src/workspace/prefs.js';

test('preferences fall back to defaults and keep what was saved',()=>{
 assert.deepEqual(getPrefs([]),DEFAULTS);
 assert.equal(getPrefs([{prefs:{accent:'plum'}}]).accent,'plum');
 assert.equal(getPrefs([{prefs:{accent:'plum'}}]).scale,'default');
});
test('board columns need at least two, otherwise the defaults are used',()=>{
 assert.equal(columnsOf({columns:[{id:'a',name:'A',color:'blue'}]}),DEFAULT_COLUMNS);
 assert.equal(columnsOf({columns:[{id:'a'},{id:'b'}]}).length,2);
});
test('week start, date style and tab width follow the saved choice',()=>{
 publishPrefs({...DEFAULTS,weekStart:0,dateFormat:'mdy',tabWidth:4});
 assert.equal(weekStart(),0);assert.equal(dateLocale(),'en-US');assert.equal(codeOptions().tab,4);
 assert.deepEqual(dowNames(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
 publishPrefs({...DEFAULTS});
 assert.equal(weekStart(),1);
});
