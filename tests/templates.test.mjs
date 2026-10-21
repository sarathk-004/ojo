import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATES,getTemplate} from '../src/workspace/templates.mjs';

test('every template is well formed',()=>{
 const ids=new Set();
 for(const t of TEMPLATES){
  assert.ok(!ids.has(t.id),'duplicate '+t.id);ids.add(t.id);
  assert.ok(t.name&&t.hint&&t.title(new Date()).trim(),t.id);
  const html=t.html(new Date());
  assert.ok(/<h2>/.test(html)||/class="todo"/.test(html),t.id+' has structure');
  // every opened tag is closed
  for(const tag of ['h2','p','ul','li','blockquote','table','tr','th','td','div']){
   const open=(html.match(new RegExp('<'+tag+'[ >]','g'))||[]).length,close=(html.match(new RegExp('</'+tag+'>','g'))||[]).length;
   assert.equal(open,close,t.id+' '+tag);
  }
  assert.ok(!/undefined|NaN|Invalid Date/.test(html+t.title(new Date())),t.id);
 }
 assert.equal(getTemplate('workout').id,'workout');
});
