import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCS,PRIVACY,toText} from '../src/legal/documents.mjs';
import {LEGAL_VERSION} from '../src/legal/info.mjs';
import {PRESETS,EMOJIS} from '../src/workspace/nudges.mjs';

test('legal documents are complete and name every network use',()=>{
 assert.match(LEGAL_VERSION,/^\d{4}-\d{2}-\d{2}$/);
 for(const d of DOCS){assert.ok(d.title&&d.summary&&d.sections.length>0);assert.ok(toText(d).length>300);}
 const text=toText(PRIVACY);
 for(const word of ['YouTube','DesktopWatch','Export my data','Erase all data','does not check for updates'])assert.ok(text.includes(word),word);
});
test('repeaters use icon names, never emoji',()=>{
 for(const p of PRESETS)assert.match(p.emoji,/^[a-z]+$/);
 for(const e of EMOJIS)assert.match(e,/^[a-z]+$/);
});
