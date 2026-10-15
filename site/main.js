/* ojo landing page. GSAP drives the motion and Lenis smooths the scroll; nothing here talks to a server. */
(()=>{
const {gsap,ScrollTrigger,Draggable,MorphSVGPlugin,DrawSVGPlugin}=window;
gsap.registerPlugin(ScrollTrigger,Draggable,MorphSVGPlugin,DrawSVGPlugin);
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const EASE='power3.out';

/* ---------- smooth scrolling ---------- */
let lenis=null;
if(!reduce&&window.Lenis){
 lenis=new Lenis({lerp:.1,smoothWheel:true});
 lenis.on('scroll',ScrollTrigger.update);
 gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id.length<2)return;const el=$(id);if(!el)return;e.preventDefault();
 if(lenis)lenis.scrollTo(el,{offset:id==='#top'?0:-20,duration:1.2});else el.scrollIntoView({behavior:reduce?'auto':'smooth'});}));

/* ---------- the ojo face, built from its own strokes ---------- */
const {view,paths}=window.OJO;
const ORDER=['eyeL','link1','eyeR','link2','nose','smile','browL','browR'];
const strokes=()=>ORDER.map(k=>[].concat(paths[k]).map(d=>`<path class="p-${k}" d="${d}"/>`).join('')).join('');
const faceSVG=w=>`<svg viewBox="${view}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${strokes()}</svg>`;
$$('[data-face]').forEach(el=>{el.innerHTML=faceSVG(+el.dataset.face||6);});
$$('symbol .facepaths').forEach(g=>{g.innerHTML=strokes();});

/* ---------- OS detection and the download sheet ---------- */
const plat=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'',ua=navigator.userAgent||'';
const os=/win/i.test(plat+ua)?'windows':/iphone|ipad|ios|android/i.test(ua)?'phone':/mac/i.test(plat+ua)?'mac':/linux/i.test(plat+ua)?'linux':'other';
const OS={
 windows:['Free for Windows 11 and 10.','Your download has started. About 120 MB.'],
 mac:['Windows only for now. A Mac version is planned.','The Windows installer is downloading. ojo does not run on a Mac yet; that version is planned.'],
 phone:['ojo is a desktop app for Windows.','ojo is a Windows desktop app. Send yourself this page and open it on your PC.'],
 linux:['Windows only for now.','You are on Linux. ojo is Windows-only for now.'],
 other:['Free for Windows 11 and 10.','Your download has started. ojo runs on Windows 11 and 10.']
}[os];
$('#osNote').textContent=OS[0];$('#dlOs').textContent=OS[1];
const dl=$('#dl'),ticket=$('#dlTicket');let lastFocus=null;
const EXE='https://github.com/sarathk-004/ojo/releases/latest/download/ojo-Setup-x64.exe';
const startDownload=()=>{if(os==='phone')return;const a=document.createElement('a');a.href=EXE;a.download='';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();};
const openDl=()=>{startDownload();lastFocus=document.activeElement;dl.hidden=false;lenis&&lenis.stop();document.documentElement.style.overflow='hidden';
 if(!reduce){gsap.fromTo(dl,{opacity:0},{opacity:1,duration:.3});gsap.fromTo(ticket,{y:30,rotate:-1.5,opacity:0},{y:0,rotate:0,opacity:1,duration:.6,ease:'expo.out'});
  gsap.fromTo('.dl-steps li',{x:-10,opacity:0},{x:0,opacity:1,duration:.45,stagger:.06,delay:.15,ease:EASE});}
 $('#dlClose').focus();};
const closeDl=()=>{const done=()=>{dl.hidden=true;document.documentElement.style.overflow='';lenis&&lenis.start();lastFocus&&lastFocus.focus();};
 if(reduce)return done();gsap.to(ticket,{y:16,opacity:0,duration:.22,ease:'power2.in'});gsap.to(dl,{opacity:0,duration:.26,onComplete:done});};
$$('[data-download]').forEach(b=>b.addEventListener('click',openDl));
$('#dlClose').addEventListener('click',closeDl);dl.addEventListener('click',e=>{if(e.target===dl)closeDl();});
addEventListener('keydown',e=>{if(dl.hidden)return;if(e.key==='Escape')closeDl();
 if(e.key==='Tab'){const f=$$('button,a[href]',dl),a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});

/* press feedback on every button (tiny, quick) */
if(!reduce)document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,.cta');if(!b||b.closest('[data-drag]')||b.matches('.w-row'))return;gsap.fromTo(b,{scale:.97},{scale:1,duration:.4,ease:'power2.out',overwrite:'auto'});});

/* ---------- hero ---------- */
{const n=new Date();$('#wNum').textContent=n.getDate();$('#wDay').textContent=n.toLocaleDateString('en-GB',{weekday:'long'});
 $('#wMonth').textContent=n.toLocaleDateString('en-GB',{month:'long'})+' · '+n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}
$$('#h1 .line').forEach(line=>{
 const walk=n=>[...n.childNodes].forEach(c=>{
  if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/( )/).forEach(word=>{if(!word)return;if(word===' ')return f.appendChild(document.createTextNode(' '));const wd=document.createElement('span');wd.className='wd';[...word].forEach(ch=>{const s=document.createElement('span');s.className='ch';s.textContent=ch;wd.appendChild(s);});f.appendChild(wd);});c.replaceWith(f);}
  else if(c.nodeType===1&&c.tagName.toLowerCase()!=='svg')walk(c);});
 walk(line);
});
const brush=$('.brush');
// the intro: the desk starts messy; ojo arrives, looks around, and puts everything in its place
const INTRO=reduce?0:3.7;
if(!reduce){
 const hero=$('.hero'),hr=hero.getBoundingClientRect(),cx=hr.width/2,cy=Math.min(hr.height,innerHeight)/2;
 const sc=$$('.sc'),face=$('#introFace svg'),wrap=$('.intro-face');
 const intro=gsap.timeline();
 sc.forEach((el,i)=>{const r=el.getBoundingClientRect(),ex=r.left-hr.left+r.width/2,ey=r.top-hr.top+r.height/2;
  const a=i/sc.length*Math.PI*2+Math.random()*.6,d=.12+Math.random()*.2;
  el._mess={x:cx+Math.cos(a)*hr.width*d-ex,y:cy+Math.sin(a)*Math.min(hr.height,innerHeight)*d*1.1-ey,rotation:gsap.utils.random(-70,70)};
  gsap.set(el,{...el._mess,opacity:0});
  intro.to(el,{opacity:1,duration:.25},i*.05).from(el,{y:'-=120',duration:.6,ease:'bounce.out'},i*.05);});
 const ps=$$('path',face);gsap.set(ps,{drawSVG:'0%'});
 intro.set(wrap,{opacity:1},.45);
 ORDER.forEach((k,i)=>intro.to($$('.p-'+k,face),{drawSVG:'100%',duration:.28,ease:'power2.inOut'},.5+i*.13));
 intro.to($$('.p-eyeL,.p-eyeR',face),{x:-3,duration:.25,ease:'power2.inOut'},1.6).to($$('.p-eyeL,.p-eyeR',face),{x:3,duration:.3,ease:'power2.inOut'},1.85)
  .to($$('.p-browL,.p-browR',face),{y:-4,duration:.2,ease:'power2.out'},2.0).to($$('.p-eyeL,.p-eyeR',face),{x:0,duration:.2},2.15);
 sc.forEach((el,i)=>intro.to(el,{x:0,y:0,rotation:0,duration:.75,ease:'back.out(1.3)'},2.05+i*.05));
 const hfEl=$('.hero-face');
 intro.to(wrap,{x:()=>{const a=hfEl.getBoundingClientRect(),b=wrap.getBoundingClientRect();return a.left+a.width/2-(b.left+b.width/2);},
   y:()=>{const a=hfEl.getBoundingClientRect(),b=wrap.getBoundingClientRect();return a.top+a.height/2-(b.top+b.height/2);},
   scale:()=>hfEl.offsetWidth/wrap.offsetWidth||.6,rotation:6,duration:.8,ease:'power3.inOut'},2.85)
  .set(wrap,{opacity:0},3.65).set(hfEl,{opacity:1},3.65);
 if(getComputedStyle(hfEl).display==='none')intro.to(wrap,{opacity:0,duration:.3},2.85);
 gsap.set(hfEl,{opacity:0});
 // skip ahead if they are in a hurry
 const hurry=()=>{intro.timeScale(3.5);removeEventListener('wheel',hurry);removeEventListener('pointerdown',hurry);removeEventListener('keydown',hurry);};
 addEventListener('wheel',hurry,{passive:true});addEventListener('pointerdown',hurry);addEventListener('keydown',hurry);
 intro.call(()=>{removeEventListener('wheel',hurry);removeEventListener('pointerdown',hurry);removeEventListener('keydown',hurry);});
}
if(reduce){gsap.set(brush,{clipPath:'inset(0 0% 0 0)'});}
else{
 const tl=gsap.timeline({defaults:{ease:EASE},delay:INTRO+.15});
 tl.from('#h1 .ch',{yPercent:110,duration:1.1,stagger:.016,ease:'expo.out'},0)
   .to(brush,{clipPath:'inset(0 0% 0 0)',duration:.9,ease:'power2.inOut'},.75)
   .from('.lead,.lead-strong,#heroCta,.hero .fine',{y:18,opacity:0,duration:.8,stagger:.08},.5)
   .from('.widget',{y:50,opacity:0,duration:1.2,ease:'expo.out'},.35)
   .from('.pc',{yPercent:30,opacity:0,duration:1.2,stagger:.08,ease:'expo.out'},.5)
   .from('.sticker',{y:-24,scale:1.15,opacity:0,duration:.6,stagger:.12,ease:'back.out(1.6)'},1.05);
 // the face draws itself stroke by stroke, then settles
 const hf=$('#heroFace svg');
 if(hf){
  const draw=gsap.timeline({delay:INTRO});
  draw.call(()=>{
   const brows=$$('.p-browL,.p-browR',hf);
   gsap.timeline({repeat:-1,repeatDelay:5}).to(brows,{y:-2.5,duration:.35,ease:'power2.out'}).to(brows,{y:0,duration:.6,ease:'power2.inOut'},'+=.6');
   if(fine){const eyes=$$('.p-eyeL,.p-eyeR',hf),w=$('.hero-face');
    const ex=gsap.quickTo(eyes,'x',{duration:.7,ease:'power3'}),ey=gsap.quickTo(eyes,'y',{duration:.7,ease:'power3'});
    addEventListener('pointermove',e=>{const r=w.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy)||1,k=Math.min(1,d/500);ex(dx/d*2.2*k);ey(dy/d*1.8*k);},{passive:true});}
  });
 }
}
/* hero widget: starts empty, add and tick tasks */
{
 const w=$('#widget'),list=$('#wList'),count=$('#wCount');
 const refresh=()=>{w.classList.toggle('has',list.children.length>0);count.textContent=$$('.w-row[aria-checked=false]',list).length;};
 $('#wForm').addEventListener('submit',e=>{e.preventDefault();const i=$('#wInput'),t=i.value.trim();if(!t)return;
  const li=document.createElement('li');li.innerHTML='<button class="w-row" role="checkbox" aria-checked="false"><i class="w-check"></i><span></span></button>';$('span',li).textContent=t;
  list.appendChild(li);if(list.children.length>4)list.children[0].remove();i.value='';refresh();
  if(!reduce)gsap.from(li,{y:12,opacity:0,duration:.45,ease:EASE});});
 refresh();
}
document.addEventListener('click',e=>{const r=e.target.closest('.w-row');if(!r)return;const on=r.getAttribute('aria-checked')!=='true';r.setAttribute('aria-checked',on);
 if(!reduce)gsap.fromTo($('.w-check',r),{scale:.7},{scale:1,duration:.4,ease:'back.out(2.4)'});$('#wCount').textContent=$$('#wList .w-row[aria-checked=false]').length;});

/* hero widget plays by itself until you touch it */
{
 const w=$('#widget'),input=$('#wInput'),form=$('#wForm'),list=$('#wList');
 let stopped=reduce,tl=null;
 const stop=()=>{if(stopped)return;stopped=true;tl&&tl.kill();input.value='';};
 ['pointerdown','focusin','keydown'].forEach(ev=>w.addEventListener(ev,stop));
 const typeTo=(t,s)=>{const o={n:0};t.to(o,{n:s.length,duration:s.length*.055,ease:'none',onUpdate(){input.value=s.slice(0,Math.round(o.n));}});t.call(()=>form.requestSubmit(),null,'+=.35');};
 const run=()=>{if(stopped)return;
  tl=gsap.timeline({onComplete:()=>{if(stopped)return;gsap.to('#wList li',{opacity:0,y:-6,duration:.4,stagger:.05,onComplete:()=>{if(stopped)return;list.innerHTML='';w.classList.remove('has');$('#wCount').textContent=0;gsap.delayedCall(1.2,run);}});}});
  typeTo(tl,'Call the dentist');tl.to({},{duration:.6});typeTo(tl,'Water the plants');tl.to({},{duration:.6});typeTo(tl,'Plan the week');
  tl.call(()=>{const r=$('#wList .w-row');r&&r.click();},null,'+=.8').call(()=>{const r=$$('#wList .w-row')[2];r&&r.click();},null,'+=.9').to({},{duration:2.4});
 };
 if(!reduce)gsap.delayedCall(INTRO+2.6,run);
 if(!reduce){
  $$('.pc').forEach((p,i)=>gsap.to(p,{y:-10-i*3,rotation:i%2?1.2:-1.2,duration:3+i*.6,ease:'sine.inOut',yoyo:true,repeat:-1,delay:2+i*.4}));
  $$('.sticker').forEach((s,i)=>gsap.to(s,{rotation:'+='+(i%2?2:-2),y:-4,duration:2.4+i*.5,ease:'sine.inOut',yoyo:true,repeat:-1,delay:2.2+i*.3}));
  gsap.to('.hero-face',{y:-8,duration:3.4,ease:'sine.inOut',yoyo:true,repeat:-1,delay:3});
 }
}

/* desk stationery: drag it around; it settles with a little bounce */
$$('.sc').forEach((el,i)=>{
 const r=parseFloat(getComputedStyle(el).rotate)||0;
 Draggable.create(el,{type:'x,y',bounds:'.hero',onPress(){gsap.to(el,{scale:1.06,duration:.2,ease:EASE});},onRelease(){gsap.to(el,{scale:1,duration:.5,ease:'back.out(2.2)'});}});
 if(!reduce)gsap.to(el,{rotation:(i%2?1.5:-1.5),duration:4+i*.5,ease:'sine.inOut',yoyo:true,repeat:-1,delay:INTRO+.4+i*.2});
});
if(!reduce)gsap.from('.hero-copy',{y:40,rotate:-5,opacity:0,duration:1.1,ease:'expo.out',delay:INTRO-.15});

/* draggable stickers and plan blocks */
$$('[data-drag]').forEach(el=>Draggable.create(el,{type:'x,y',bounds:'.hero-stage',zIndexBoost:false,
 onPress(){gsap.to(el,{scale:1.06,duration:.2,ease:EASE});},onRelease(){gsap.to(el,{scale:1,duration:.4,ease:'back.out(2)'});}}));
$$('[data-block]').forEach(el=>Draggable.create(el,{type:'x,y',bounds:'#planTrack',onPress(){gsap.to(el,{scale:1.03,duration:.15});},
 onRelease(){gsap.to(el,{scale:1,duration:.3});},onDragEnd(){const step=$('#planTrack').clientWidth/12;gsap.to(el,{x:Math.round(this.x/step)*step,y:Math.round(this.y/48)*48,duration:.35,ease:'back.out(1.8)'});}}));

/* ---------- reveals ---------- */
if(!reduce){
 gsap.utils.toArray('.sec-head').forEach(h=>gsap.from(h.children,{y:30,opacity:0,duration:1,stagger:.08,ease:'expo.out',scrollTrigger:{trigger:h,start:'top 86%',once:true}}));
 // Elements are hidden before they are ever painted, then revealed as they enter: a "from" tween created on entry would show the finished card for a frame first.
 gsap.set('.card',{y:36,opacity:0,willChange:'transform,opacity'});
 ScrollTrigger.batch('.card',{start:'top 94%',once:true,onEnter:b=>gsap.to(b,{y:0,opacity:1,duration:.9,stagger:.08,ease:'power3.out',clearProps:'transform,opacity,willChange'})});
 gsap.set('.die-cuts li',{y:16,opacity:0});
 ScrollTrigger.create({trigger:'.rest',start:'top 92%',once:true,onEnter:()=>gsap.to('.die-cuts li',{y:0,opacity:1,duration:.55,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'})});
}

/* ---------- focus timer: start, pause, reset (real time) ---------- */
{
 const fg=$('#ringFg'),time=$('#ringTime'),start=$('#tStart'),reset=$('#tReset');
 const C=2*Math.PI*52,TOTAL=1500;fg.style.strokeDasharray=C;
 let left=TOTAL,endAt=0,raf=0;
 const fmt=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
 const draw=()=>{time.textContent=fmt(left);fg.style.strokeDashoffset=C*(1-left/TOTAL);};
 const stop=()=>{cancelAnimationFrame(raf);raf=0;};
 const loop=()=>{left=Math.max(0,(endAt-performance.now())/1000);draw();if(left<=0){stop();start.textContent='Start';left=TOTAL;draw();return;}raf=requestAnimationFrame(loop);};
 start.addEventListener('click',()=>{if(raf){stop();start.textContent='Resume';}else{endAt=performance.now()+left*1000;start.textContent='Pause';raf=requestAnimationFrame(loop);}});
 reset.addEventListener('click',()=>{stop();left=TOTAL;start.textContent='Start';if(!reduce)gsap.fromTo(fg,{strokeDashoffset:fg.style.strokeDashoffset},{strokeDashoffset:0,duration:.5,ease:EASE,onComplete:draw});else draw();time.textContent=fmt(left);});
 draw();
 let auto=false;start.addEventListener('pointerdown',()=>{auto=true;});
 if(!reduce)ScrollTrigger.create({trigger:'.c-focus',start:'top 70%',once:true,onEnter:()=>{if(!auto&&!raf)start.click();}});
}

/* ---------- plan: a cursor shows how dragging works, until you try it ---------- */
{
 const track=$('#planTrack'),cur=document.createElement('div');
 cur.className='fake-cursor';cur.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.6 L11.6 14 L18 14 Z"/></svg>';track.appendChild(cur);
 const blk=$('.b2'),blk3=$('.b3');let tl=null,user=false;
 track.addEventListener('pointerdown',e=>{if(e.target.closest('[data-block]')){user=true;tl&&tl.kill();gsap.to(cur,{opacity:0,duration:.2});}});
 const step=()=>track.clientWidth/12;
 const pos=el=>({x:el.offsetLeft+el.offsetWidth*.55+gsap.getProperty(el,'x'),y:el.offsetTop+22+gsap.getProperty(el,'y')});
 if(!reduce){
  tl=gsap.timeline({repeat:-1,repeatDelay:1,paused:true,defaults:{ease:'power2.inOut'}});
  tl.set(cur,{x:track.clientWidth*.85,y:140,opacity:0})
   .to(cur,{opacity:1,duration:.3})
   .to(cur,{x:()=>pos(blk).x,y:()=>pos(blk).y,duration:.9})
   .to(cur,{scale:.85,duration:.12}).to(blk,{scale:1.04,duration:.12},'<')
   .to([blk],{x:()=>step()*4,y:-48,duration:1})
   .to(cur,{x:()=>pos(blk).x+step()*4,y:()=>pos(blk).y-48,duration:1},'<')
   .to(cur,{scale:1,duration:.12}).to(blk,{scale:1,duration:.12},'<')
   .to(cur,{x:()=>pos(blk3).x,y:()=>pos(blk3).y,duration:.8},'+=.6')
   .to(cur,{scale:.85,duration:.12}).to(blk3,{scale:1.04,duration:.12},'<')
   .to(blk3,{x:()=>-step()*5,duration:.9})
   .to(cur,{x:()=>pos(blk3).x-step()*5,duration:.9},'<')
   .to(cur,{scale:1,duration:.12}).to(blk3,{scale:1,duration:.12},'<')
   .to(cur,{opacity:0,duration:.3},'+=.7')
   .to([blk,blk3],{x:0,y:0,duration:.8,ease:'power3.inOut'},'+=.4');
  ScrollTrigger.create({trigger:'.c-plan',start:'top 80%',end:'bottom 10%',onToggle:s=>{if(user)return;s.isActive?tl.play():tl.pause();}});
 }
}

/* ---------- notes demo: a page writes itself ---------- */
{
 const h=$('#nH'),items=$$('#nTodo li'),texts=['Book the train','Pack the camera','Call Amma'];
 const tl=gsap.timeline({repeat:-1,repeatDelay:1.8,paused:true});
 const type=(el,s,dur)=>{const o={n:0};tl.to(o,{n:s.length,duration:dur,ease:'none',onUpdate(){el.textContent=s.slice(0,Math.round(o.n));}});};
 tl.call(()=>{h.textContent='';items.forEach(li=>{li.classList.remove('done');gsap.set(li,{opacity:0,y:4});$('span',li).textContent='';});});
 type(h,'Weekend trip',.8);
 items.forEach((li,i)=>{tl.to(li,{opacity:1,y:0,duration:.3,ease:EASE},'+=.15');type($('span',li),texts[i],.6);});
 tl.call(()=>items[0].classList.add('done'),null,'+=.5').call(()=>items[1].classList.add('done'),null,'+=.5').to({},{duration:1.4});
 if(reduce){h.textContent='Weekend trip';items.forEach((li,i)=>{li.style.opacity=1;$('span',li).textContent=texts[i];});items[0].classList.add('done');}
 else ScrollTrigger.create({trigger:'.c-notes',start:'top 85%',end:'bottom 10%',onToggle:s=>s.isActive?tl.play():tl.pause()});
}

/* ---------- money donut ---------- */
{
 const C=2*Math.PI*44;let acc=0;
 $$('.donut circle[data-p]').forEach(c=>{const p=+c.dataset.p/100;c.style.strokeDasharray=`0 ${C}`;c.style.strokeDashoffset=-acc*C;acc+=p;c.dataset.len=p*C;});
 ScrollTrigger.create({trigger:'.c-money',start:'top 85%',once:true,onEnter:()=>$$('.donut circle[data-p]').forEach((c,i)=>gsap.to(c,{strokeDasharray:`${c.dataset.len-3} ${C}`,duration:reduce?0:1.2,delay:reduce?0:.2+i*.15,ease:'expo.out'}))});
}

/* ---------- saved demo: plays by itself ---------- */
{
 const pill=$('#dropPill'),face=$('.dp-face'),done=$('#dpDone'),file=$('#file');
 const toX=()=>pill.offsetLeft-(file.offsetLeft+file.offsetWidth/2),toY=()=>-(file.offsetTop+file.offsetHeight/2-18);
 const tl=gsap.timeline({repeat:-1,repeatDelay:1,paused:true,defaults:{ease:'power3.inOut'}});
 tl.set(file,{x:0,y:0,scale:1,opacity:1,rotate:0}).set(done,{opacity:0}).set(face,{opacity:1})
   .to(pill,{width:150,height:40,duration:.5,ease:'expo.out'},.5)
   .to(file,{x:toX,y:toY,scale:.45,rotate:-4,duration:1,ease:'power2.inOut'},.45)
   .to(file,{opacity:0,duration:.2},1.3)
   .to(face,{opacity:0,duration:.15},1.32)
   .to(done,{opacity:1,duration:.25},1.4)
   .to(pill,{width:132,duration:.6,ease:'elastic.out(1,.6)'},1.4)
   .to(done,{opacity:0,duration:.2},2.5)
   .to(face,{opacity:1,duration:.2},2.6)
   .to(pill,{width:122,height:28,duration:.5,ease:'expo.out'},2.5)
   .fromTo(file,{y:24,opacity:0,x:0,scale:1,rotate:0},{y:0,opacity:1,duration:.6,ease:EASE},3.2);
 if(!reduce)ScrollTrigger.create({trigger:'.c-saved',start:'top 85%',end:'bottom 10%',onToggle:s=>s.isActive?tl.play():tl.pause()});
}

/* ---------- the notch, pinned: top edge only ---------- */
{
 const pill=$('#nPill'),label=$('.n-label'),over=$('.n-over'),saved=$('.n-saved'),file=$('#nFile'),face=$('#nFace'),screen=$('#screen'),steps=$$('#notchSteps li');
 const setStep=i=>steps.forEach((s,k)=>s.classList.toggle('on',k===i));
 const fx=()=>screen.clientWidth/2-(file.offsetLeft+file.offsetWidth/2),fy=()=>Math.min(75,screen.clientHeight*.25)-(file.offsetTop+file.offsetHeight/2);
 const W=()=>Math.min(300,screen.clientWidth*.6),H=()=>Math.min(150,screen.clientHeight*.5),F=()=>Math.min(46,screen.clientWidth*.09);
 gsap.matchMedia().add({motion:'(prefers-reduced-motion: no-preference)',reduced:'(prefers-reduced-motion: reduce)'},ctx=>{
  if(ctx.conditions.reduced){gsap.set(pill,{width:W,height:H,borderRadius:'0 0 34px 34px'});gsap.set(face,{width:F,height:()=>F()*.95});gsap.set(label,{height:26,marginTop:12,opacity:1});gsap.set(file,{opacity:0});return;}
  const tl=gsap.timeline({defaults:{ease:'power2.inOut'},scrollTrigger:{trigger:'#notchPin',start:'top top',end:'+=2200',pin:true,scrub:.8,anticipatePin:1,invalidateOnRefresh:true,
   onUpdate:s=>setStep(s.progress<.28?0:s.progress<.62?1:2)}});
  tl.from(pill,{yPercent:-110,duration:.4},0)
    .to(pill,{width:W,height:H,borderRadius:'0 0 34px 34px',duration:.6},.6)
    .to(face,{width:F,height:()=>F()*.95,duration:.6},'<')
    .to(label,{height:26,marginTop:12,opacity:1,duration:.4},'<.2')
    .fromTo(file,{x:0,y:0,scale:1,opacity:1},{x:fx,y:fy,duration:.9},.8)
    .to(file,{scale:.4,opacity:0,duration:.25},1.7)
    .to(over,{opacity:0,duration:.2},1.75)
    .to(saved,{opacity:1,duration:.25},1.85)
    .to({},{duration:.5})
    .to(label,{height:0,marginTop:0,opacity:0,duration:.3},2.6)
    .to(face,{width:18,height:17,duration:.4},2.6)
    .to(pill,{width:132,height:28,borderRadius:'0 0 14px 14px',duration:.45},2.65)
    .to({},{duration:.3});
  return()=>setStep(0);
 });
}

/* ---------- your day: tape measure 8 am to 10 pm, the sun becomes the moon ---------- */
{
 const START=8,END=22,strip=$('#tmStrip'),mark=$('#tmMark'),track=$('#dayTrack'),slots=$$('.slot');
 const pct=h=>(h-START)/(END-START)*100;
 for(let t=START;t<=END+.001;t+=.25){
  const i=document.createElement('i');i.style.left=pct(t)+'%';if(Number.isInteger(t))i.className='hour';else if(t%1===.5)i.className='half';strip.appendChild(i);
  if(Number.isInteger(t)&&t<END){const b=document.createElement('b');b.style.left=pct(t)+'%';b.textContent=((t+11)%12)+1;strip.appendChild(b);}
 }
 const hours=slots.map(s=>+s.dataset.h);
 const place=p=>{const f=p*(hours.length-1),i=Math.min(hours.length-2,Math.floor(f)),h=hours[i]+(hours[i+1]-hours[i])*(f-i);
  mark.style.left=pct(h)+'%';
  const near=Math.round(f);slots.forEach((s,k)=>s.classList.toggle('now',k===near));};
 place(0);
 gsap.matchMedia().add('(min-width:901px) and (prefers-reduced-motion: no-preference)',()=>{
  const dist=()=>Math.max(0,track.scrollWidth-innerWidth);
  gsap.to(track,{x:()=>-dist(),ease:'none',scrollTrigger:{trigger:'#dayPin',start:'top top',end:()=>'+='+Math.round(dist()*2.4+600),pin:true,scrub:1,invalidateOnRefresh:true,anticipatePin:1,onUpdate:s=>place(s.progress)}});
  return()=>place(0);
 });

}

/* ---------- private: leaf shadows, folders, the stamp ---------- */
if(!reduce){
 const shapes=['M150 30 C 232 6, 290 84, 270 160 C 252 232, 214 290, 140 278 C 66 268, 8 214, 30 140 C 48 76, 92 46, 150 30 Z',
  'M150 12 C 206 28, 296 60, 284 150 C 272 240, 214 270, 150 288 C 86 270, 28 240, 16 150 C 4 60, 94 28, 150 12 Z',
  'M150 18 C 220 14, 284 70, 282 148 C 280 226, 224 286, 150 284 C 76 282, 16 226, 18 150 C 20 74, 80 22, 150 18 Z'];
 // a closed curve through 10 points whose distance from the centre drifts on overlapping sine waves
 const bp=$('#blob'),N=10,seeds=Array.from({length:N},(_,i)=>[Math.random()*6,Math.random()*6,.5+Math.random()*.6]);
 const draw=t=>{const pts=seeds.map(([a,b,s],i)=>{const ang=i/N*Math.PI*2+Math.sin(t*.13)*.25,r=118+Math.sin(t*s+a)*13+Math.sin(t*s*.53+b)*9;return [150+Math.cos(ang)*r,150+Math.sin(ang)*r];});
  let d='M'+pts[0].join(' ');for(let i=0;i<N;i++){const p0=pts[(i-1+N)%N],p1=pts[i],p2=pts[(i+1)%N],p3=pts[(i+2)%N];d+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+' '+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+','+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+' '+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+','+p2[0].toFixed(1)+' '+p2[1].toFixed(1);}
  bp.setAttribute('d',d+'Z');};
 draw(0);
 const blob={play(){gsap.ticker.add(tickB);},pause(){gsap.ticker.remove(tickB);}};function tickB(t){draw(t*1.6);}
 const sway=gsap.timeline({repeat:-1,yoyo:true,paused:true,defaults:{ease:'sine.inOut'}})
  .to('.leaves .sway',{rotation:2.2,skewX:1.5,duration:3.6},0).to('.leaves .sway2',{rotation:-1.8,skewX:-1,duration:4.4},0).to('.leaves',{x:6,duration:4},0);
 ScrollTrigger.create({trigger:'.mat',start:'top bottom',end:'bottom top',onToggle:s=>{if(s.isActive){blob.play();sway.play();}else{blob.pause();sway.pause();}}});
 gsap.from('.divider',{y:90,duration:1,stagger:.1,ease:'expo.out',clearProps:'transform',scrollTrigger:{trigger:'.drawer',start:'top 85%',once:true}});
 gsap.from('.drawer-front',{y:40,opacity:0,duration:.9,ease:'expo.out',scrollTrigger:{trigger:'.drawer',start:'top 85%',once:true}});
 gsap.from('.stamp',{scale:1.5,opacity:0,duration:.4,ease:'power4.in',scrollTrigger:{trigger:'.stamp-wrap',start:'top 78%',once:true},onComplete:()=>gsap.fromTo('.stamp-wrap',{x:-3},{x:0,duration:.4,ease:'elastic.out(1,.3)'})});
}

/* ---------- felt dividers: tab shape built at the real size so the rounded tab never stretches ---------- */
{
 const T=40,R=12;
 const shape=li=>{
  const svg=$('.dv-shape',li),p=$('path',svg),w=li.clientWidth,h=li.clientHeight,tab=$('.dv-tab',li);
  const tw=Math.min(w-8,tab.offsetWidth+52),tx=Math.max(0,Math.min(parseFloat(getComputedStyle(li).getPropertyValue('--t'))/100*w,w-tw-6));tab.style.left=(tx+26)+'px';
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  const a=tx,b=tx+tw;
  p.setAttribute('d',['M0',T+R,'Q0',T,R,T,'L',Math.max(R,a-R),T,'Q',a,T,a+R*.6,T-R*.9,'L',a+R*1.4,R*.9,'Q',a+R*2,0,a+R*3,0,'L',b-R*3,0,'Q',b-R*2,0,b-R*1.4,R*.9,'L',b-R*.6,T-R*.9,'Q',b,T,b+R,T,'L',w-R,T,'Q',w,T,w,T+R,'L',w,h,'L0',h,'Z'].join(' '));
 };
 const all=()=>$$('.divider').forEach(shape);
 const files=$$('.divider');let pulled=null;
 // pull a file up out of the drawer; the files behind lean back, the ones in front lean forward
 const pull=f=>{if(pulled===f)return;pulled=f;const k=files.indexOf(f);
  files.forEach((x,i)=>gsap.to(x,{y:i===k?-78:i<k?-8:10,rotation:i===k?-1.2:i<k?-.6:.4,duration:.6,ease:i===k?'back.out(1.4)':'power3.out',overwrite:'auto'}));};
 const drop=()=>{pulled=null;files.forEach(x=>gsap.to(x,{y:0,rotation:0,duration:.55,ease:'power3.out',overwrite:'auto'}));};
 files.forEach(f=>{f.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')pull(f);});f.addEventListener('click',()=>pulled===f?drop():pull(f));});
 $('.drawer').addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')drop();});
 all();addEventListener('resize',all);document.fonts&&document.fonts.ready.then(all);
}

/* ---------- promises: a receipt prints as you scroll ---------- */
{
 const rc=$('#receipt'),d=new Date();
 $('#rcDate').textContent=d.toLocaleDateString('en-GB')+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 if(!reduce){
  gsap.set(rc,{yPercent:100,rotationX:14,transformOrigin:'50% 100%'});
  const desk=matchMedia('(min-width:901px)').matches;
  const ST={trigger:'#notesPin',start:'bottom bottom-=24',end:()=>'+='+Math.round(rc.offsetHeight*1.6),pin:'#notesPin',pinSpacing:true,anticipatePin:1,invalidateOnRefresh:true};
  const tl=gsap.timeline({scrollTrigger:{...ST,scrub:.6}});
  tl.to(rc,{yPercent:0,ease:'steps(40)'});
  // the printer shudders while it prints
  ScrollTrigger.create({trigger:'.printer',start:ST.start,end:ST.end,onUpdate:s=>{if(Math.abs(s.getVelocity())>20)gsap.fromTo('.pr-body',{x:-1},{x:0,duration:.08,overwrite:'auto'});$('.pr-led').style.opacity=s.progress<1?(Math.floor(performance.now()/180)%2?1:.35):1;}});
 }
}

/* ---------- paper cut and footer desk ---------- */
if(!reduce){
 gsap.fromTo('.cut1',{y:30},{y:0,ease:'none',scrollTrigger:{trigger:'.papercut',start:'top bottom',end:'bottom 60%',scrub:1}});
 gsap.fromTo('.cut2',{y:18},{y:0,ease:'none',scrollTrigger:{trigger:'.papercut',start:'top bottom',end:'bottom 60%',scrub:1}});
 gsap.from('.foot-big>*',{y:40,opacity:0,duration:1.1,stagger:.08,ease:'expo.out',scrollTrigger:{trigger:'.foot',start:'top 80%',once:true}});
 gsap.from('.desk .ill',{y:70,opacity:0,rotate:(i)=>[-8,6,-4,10,-6,12,-5,8,-10,6,12,-7][i],duration:1.1,stagger:.08,ease:'expo.out',scrollTrigger:{trigger:'.desk',start:'top 96%',once:true}});
 gsap.to('.il-pushpin',{rotation:'+=6',duration:2.2,ease:'sine.inOut',yoyo:true,repeat:-1,transformOrigin:'50% 90%'});
 gsap.fromTo('#i-mug .steam path',{strokeDasharray:'30 50',strokeDashoffset:0},{strokeDashoffset:-80,duration:3.2,ease:'none',repeat:-1});
}

addEventListener('load',()=>ScrollTrigger.refresh());
})();
