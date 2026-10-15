import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeNote,notePreview,looksLikeHtml} from '../src/workspace/richtext.mjs';

test('plain text becomes safe paragraphs',()=>{
 assert.equal(sanitizeNote('hello\nworld\n\nsecond'),'<p>hello<br>world</p><p>second</p>');
 assert.equal(sanitizeNote('1 < 2 & 3'),'<p>1 &lt; 2 &amp; 3</p>');
 assert.equal(sanitizeNote('  '),'');
});
test('html keeps formatting and drops everything else',()=>{
 const out=sanitizeNote('<div onclick="x()">Today&nbsp;<br><h2>Chest</h2><ul><li>15 reps</li></ul><script>alert(1)</script><img src=x onerror=y></div>');
 assert.equal(out,'<div>Today&nbsp;<br><h2>Chest</h2><ul><li>15 reps</li></ul></div>');
 assert.ok(!/onclick|script|img/.test(out));
});
test('previews are one clean line',()=>{
 const html='Completed todays Gym&nbsp;<br><div>Today was mostly warmup</div><h2>Chest Group&nbsp;</h2><ul><li>15 reps</li></ul>';
 assert.equal(notePreview(html),'Completed todays Gym Today was mostly warmup Chest Group 15 reps');
 assert.equal(notePreview('x'.repeat(300),20).length,20);
 assert.ok(looksLikeHtml('<b>a</b>')&&!looksLikeHtml('a < b'));
});
