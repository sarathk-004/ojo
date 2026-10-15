import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlToMarkdown,fileNameFor} from '../src/workspace/noteExport.mjs';

test('headings, text styles, links and lists',()=>{
 const md=htmlToMarkdown('<h1>Plan</h1><p>Some <b>bold</b>, <i>italic</i> and <a href="https://x.com">a link</a>.</p><ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul><ol><li>first</li><li>second</li></ol>');
 assert.equal(md,'# Plan\n\nSome **bold**, *italic* and [a link](https://x.com).\n\n- one\n  - nested\n- two\n\n1. first\n2. second\n');
});
test('to-do lists, quotes, callouts, code, dividers',()=>{
 const md=htmlToMarkdown('<ul class="todo"><li data-done>Done</li><li>Open</li></ul><blockquote>Wise words</blockquote><div class="callout">Remember this</div><pre><code class="language-js">const a=1;\nlet b=2;</code></pre><hr><p>end</p>');
 assert.match(md,/- \[x\] Done\n- \[ \] Open/);
 assert.match(md,/> Wise words/);assert.match(md,/> Remember this/);
 assert.match(md,/```js\nconst a=1;\nlet b=2;\n```/);
 assert.match(md,/\n---\n/);assert.match(md,/end\n$/);
});
test('tables, toggles and boards',()=>{
 const t=htmlToMarkdown('<table class="nb-table"><tbody><tr><th>Name</th><th>Qty</th></tr><tr><td>Tea</td><td>2</td></tr></tbody></table>');
 assert.equal(t,'| Name | Qty |\n| --- | --- |\n| Tea | 2 |\n');
 assert.match(htmlToMarkdown('<details class="toggle" open><summary>More</summary><p>hidden text</p></details>'),/\*\*More\*\*\n\nhidden text/);
 const kb=htmlToMarkdown('<div class="kanban"><div class="kb-top"><span class="kb-name">Launch</span><button class="kb-del">Delete board</button></div><div class="kb-cols"><div class="kb-col"><div class="kb-head"><span class="kb-title">To do</span><button class="kb-colx">×</button></div><div class="kb-cards"><div class="kb-card"><span class="kb-grip">⋮⋮</span><span class="kb-text">Write copy</span><button class="kb-x">×</button></div></div></div></div></div>');
 assert.equal(kb,'### Launch\n\n**To do**\n- Write copy\n');
});
test('entities, scripts and file names',()=>{
 assert.equal(htmlToMarkdown('<p>Tom &amp; Jerry&nbsp;&lt;3</p><script>alert(1)</script>'),'Tom & Jerry <3\n');
 assert.equal(fileNameFor('Plan: Q4 / 2026?','md'),'Plan Q4 2026.md');
 assert.equal(fileNameFor('','pdf'),'Untitled.pdf');
});
