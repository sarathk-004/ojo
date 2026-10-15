import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyText,classifyFile,youtubeId,looksLikeCode,looksLikeMarkdown,guessLang,brandFor} from '../src/workspace/classify.mjs';
test('youtube variants',()=>{
 assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=3'),'dQw4w9WgXcQ');
 assert.equal(youtubeId('https://www.youtube.com/watch?v=abc12345678'),'abc12345678');
 assert.equal(youtubeId('https://youtube.com/shorts/abc12345678'),'abc12345678');
 assert.equal(youtubeId('https://example.com/watch?v=1'),null);
});
test('urls by extension',()=>{
 assert.equal(classifyText({text:'https://arxiv.org/pdf/1706.03762.pdf'}).kind,'pdf');
 assert.equal(classifyText({text:'https://a.com/files/Report%20Q3.PDF?dl=1'}).kind,'pdf');
 assert.equal(classifyText({text:'https://raw.githubusercontent.com/x/y/main/README.md'}).kind,'md');
 assert.equal(classifyText({text:'https://a.com/notes.txt'}).kind,'text');
 assert.equal(classifyText({text:'https://a.com/clip.mp4'}).kind,'video');
 assert.equal(classifyText({text:'https://a.com/song.mp3'}).kind,'audio');
 assert.equal(classifyText({uriList:'https://a.com/x.png\n'}).kind,'image');
 assert.equal(classifyText({text:'https://a.com/x.pdf'}).download,true);
});
test('url sites',()=>{
 assert.equal(classifyText({text:'https://www.instagram.com/reel/Cxyz/'}).kind,'instagram');
 assert.equal(classifyText({text:'https://youtu.be/dQw4w9WgXcQ'}).videoId,'dQw4w9WgXcQ');
 const li=classifyText({text:'https://www.linkedin.com/in/jane-doe-123/'});
 assert.equal(li.kind,'link');assert.equal(li.title,'LinkedIn · Profile');
 assert.equal(brandFor('https://github.com/facebook/react/issues/1').sub,'facebook/react');
 assert.equal(brandFor('https://www.reddit.com/r/programming/comments/x').sub,'r/programming');
 assert.equal(brandFor('https://docs.google.com/spreadsheets/d/1').sub,'Sheet');
 assert.equal(brandFor('https://www.nytimes.com/2024/a.html').brand,'Nytimes');
 assert.equal(classifyText({text:'look https://news.ycombinator.com/item?id=1'}).brand,'Hacker News');
});
test('code vs markdown vs text',()=>{
 assert.equal(classifyText({text:'const a = () => {\n  return 1;\n}'}).kind,'code');
 assert.equal(classifyText({text:'# Plan\n\n- ship it\n- **test** it'}).kind,'md');
 assert.equal(classifyText({text:'buy milk and eggs tomorrow'}).kind,'text');
 assert.equal(classifyText({text:'  '}),null);
 assert.equal(looksLikeCode('hello there friend'),false);
 assert.equal(looksLikeMarkdown('just words here'),false);
});
test('language guessing',()=>{
 const g=guessLang;
 assert.equal(g('def add(a, b):\n    return a + b\n\nprint(add(1, 2))'),'python');
 assert.equal(g('const x = (a) => a * 2;\nconsole.log(x(2));'),'javascript');
 assert.equal(g('interface User { name: string; age: number }'),'typescript');
 assert.equal(g('SELECT id, name FROM users WHERE id = 1;'),'sql');
 assert.equal(g('{"a":1,"b":[1,2]}'),'json');
 assert.equal(g('<div class="x">hi</div>'),'html');
 assert.equal(g('package main\n\nfunc main() {\n  fmt.Println("hi")\n}'),'go');
 assert.equal(g('fn main() {\n    let mut x = 5;\n    println!("{}", x);\n}'),'rust');
 assert.equal(g('public class A {\n  public static void main(String[] a) {\n    System.out.println(1);\n  }\n}'),'java');
 assert.equal(g('#include <stdio.h>\nint main(){printf("hi");}'),'c');
 assert.equal(g('Get-ChildItem | Where-Object { $_.Length -gt 1 }'),'powershell');
 assert.equal(g('body { color: red; margin: 0; }'),'css');
 assert.equal(g('just some words'),'plaintext');
 assert.equal(classifyText({text:'def f(x):\n    return x * 2\n'}).lang,'python');
});
test('files',()=>{
 assert.equal(classifyFile({name:'a.PDF',type:''}).kind,'pdf');
 assert.equal(classifyFile({name:'p.jpg',type:'image/jpeg'}).kind,'image');
 assert.equal(classifyFile({name:'clip.mov',type:'video/quicktime'}).kind,'video');
 assert.equal(classifyFile({name:'a.mp3',type:'audio/mpeg'}).kind,'audio');
 assert.equal(classifyFile({name:'README.md',type:''}).kind,'md');
 assert.equal(classifyFile({name:'todo.txt',type:'text/plain'}).kind,'text');
 const c=classifyFile({name:'x.py',type:''});assert.equal(c.kind,'code');assert.equal(c.lang,'python');
 assert.equal(classifyFile({name:'z.zip',type:''}).kind,'file');
});
import {mdToHtml} from '../src/workspace/markdown.mjs';
test('markdown renders and escapes',()=>{
 assert.match(mdToHtml('# Hi'),/<h1>Hi<\/h1>/);
 assert.match(mdToHtml('a **b** and *c*'),/<strong>b<\/strong> and <em>c<\/em>/);
 assert.match(mdToHtml('- [x] done\n- todo'),/class="task done">done/);
 assert.match(mdToHtml('```\n<b>x</b>\n```'),/&lt;b&gt;x&lt;\/b&gt;/);
 assert.doesNotMatch(mdToHtml('<img src=x onerror=alert(1)>'),/<img/);
 assert.doesNotMatch(mdToHtml('[x](javascript:alert(1))'),/href/);
 assert.match(mdToHtml('[site](https://a.com)'),/href="https:\/\/a.com"/);
});
test('indent-style code without braces is still code',()=>{
 assert.equal(classifyText({text:'def add(a, b):\n    return a + b\n\nprint(add(1, 2))'}).kind,'code');
 assert.equal(classifyText({text:'for i in range(3):\n    print(i)'}).lang,'python');
 assert.equal(classifyText({text:'Things I need: milk, eggs and bread.'}).kind,'text');
});
test('YouTube and Instagram carry brand info',()=>{
 assert.equal(brandFor('https://www.youtube.com/watch?v=abc12345678').brand,'YouTube');
 assert.equal(brandFor('https://www.youtube.com/@somechannel').sub,'Channel');
 assert.equal(brandFor('https://www.instagram.com/reel/Cxyz/').sub,'Reel');
 assert.equal(classifyText({text:'https://www.youtube.com/@somechannel'}).kind,'link');
 assert.equal(classifyText({text:'https://www.instagram.com/p/Cabc/'}).kind,'instagram');
});
