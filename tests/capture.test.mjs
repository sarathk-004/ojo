import test from 'node:test';
import assert from 'node:assert/strict';
import {planCapture,labelFor} from '../src/workspace/capture.mjs';

test('short lines become tasks, with an optional day word',()=>{
 assert.deepEqual(planCapture('Call mum'),{kind:'task',title:'Call mum',view:'Today'});
 assert.deepEqual(planCapture('Pay rent tomorrow'),{kind:'task',title:'Pay rent',view:'Upcoming'});
 assert.deepEqual(planCapture('Stretch daily'),{kind:'task',title:'Stretch',view:'Daily'});
 assert.equal(labelFor(planCapture('Call mum')),'Task · Today');
});
test('links go to Saved and long or multi-line text becomes a note',()=>{
 assert.equal(planCapture('https://www.youtube.com/watch?v=abc123').kind,'saved');
 assert.equal(planCapture('https://example.com/article').kind,'saved');
 const n=planCapture('Meeting ideas\n- ship search\n- fix toast');
 assert.equal(n.kind,'note');assert.equal(n.title,'Meeting ideas');assert.match(n.body,/ship search/);
 assert.equal(planCapture('x'.repeat(150)).kind,'note');
});
test('prefixes and modes force the target; empty input is ignored',()=>{
 assert.equal(planCapture('n: remember the milk').kind,'note');
 assert.equal(planCapture('t: https://example.com').kind,'task');
 assert.equal(planCapture('s: a thought').kind,'saved');
 assert.equal(planCapture('just text','note').kind,'note');
 assert.equal(planCapture('   '),null);assert.equal(planCapture('t:   '),null);
});

test('plain lines: actions and times are tasks, statements and ideas are notes',()=>{
 for(const x of ['call mum','buy milk','Pay rent tomorrow','Meeting with Rahul at 5pm','dentist'])assert.equal(planCapture(x).kind,'task',x);
 for(const x of ['AI is a','AI is a field of computers learning','what is RAG?','idea: app for plants','thinking about the roadmap...'])assert.equal(planCapture(x).kind,'note',x);
});
