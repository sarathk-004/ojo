import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Star,Timer,Cube,Check,Plus,Minus,GearSix,ArrowLeft,Bell,X,Trash,ArrowUpRight,Repeat,PencilSimple,ImageSquare,DotsSixVertical,ArrowUp,ArrowDown,CalendarBlank,Clock,ChartLine,SquaresFour} from '@phosphor-icons/react';
import {gsap} from 'gsap';
import '@fontsource-variable/geist';
import {belongs,dayKey,initialState,toggleTask,collectReminders,newTask,reorderTask,snoozeTask,completedToday,syncMasterDaily} from './tasks.mjs';
import {DatePicker,TimePicker} from './DatePicker.jsx';
import {useTaskDrag} from './useTaskDrag.jsx';
import {useHorizontalScroll} from './horizontalScroll.js';
import {mobile,android,widgetPanel,loadMobile,saveMobile,requestNotifications,requestWidget,requestExactReminders} from './mobile.js';
import {ListTabs,ListOrderEditor} from './ListTabs.jsx';
import {Habits} from './Habits.jsx';
import {NotesEditor} from './NotesEditor.jsx';
import {belongsMobile} from './mobile-lists.mjs';
import {useMobileKeyboard} from './useMobileKeyboard.js';
const desktop=!!window.taskit;
const THEME_KEY='tnkr-theme';
const readTheme=()=>{try{return localStorage.getItem(THEME_KEY)||'system';}catch{return 'system';}};
const isDark=m=>m==='dark'||(m==='system'&&typeof matchMedia!=='undefined'&&matchMedia('(prefers-color-scheme: dark)').matches);
const themes=[{id:'river',name:'Soft dawn',src:'./art/river.svg'},{id:'garden',name:'Meadow haze',src:'./art/garden.svg'},{id:'waves',name:'Quiet tide',src:'./art/waves.svg'}];
const views=[{name:'Today',icon:Star},{name:'Upcoming',icon:Timer},{name:'Anytime',icon:Cube},{name:'Daily',icon:Repeat}];
export function App(){
 useMobileKeyboard();
 useHorizontalScroll();
 const [data,setRawData]=useState(initialState),[ready,setReady]=useState(false),[view,setView]=useState('Today');
 const [look,setLook]=useState(readTheme),
 [panel,setPanel]=useState('tasks'),[compact,setCompact]=useState(false),[draft,setDraft]=useState(null),[quick,setQuick]=useState('');
 const [now,setNow]=useState(new Date()),[error,setError]=useState(''),[reminders,setReminders]=useState([]),[origin,setOrigin]=useState({x:252,y:36}),[offset,setOffset]=useState({x:0,y:0});
 const [picker,setPicker]=useState(null),[noteId,setNoteId]=useState(null),[habitId,setHabitId]=useState(null),[renaming,setRenaming]=useState(null),[renameText,setRenameText]=useState(''),[priorityId,setPriorityId]=useState(null);
 const widgetEntry=useRef(false);
 const titleClick=useRef(null),collapseButton=useRef(null);
 const saveQueue=useRef(Promise.resolve()),surface=useRef(null),busy=useRef(false),pointer=useRef(null),coverInput=useRef(null),isInitialLoad=useRef(true);
 const getScrollContainer=(x,y)=>{
  if(Number.isFinite(x)&&Number.isFinite(y)){
   const el=document.elementFromPoint(x,y);
   const matched=el?.closest('.horizontal-scroll,.scroll-area,.task-list,.themes,.panel-settings,.panel-edit');
   if(matched)return matched;
  }
  return document.querySelector('.notes-editor,.panel-settings,.task-list,.themes,.panel-edit');
 };
 useEffect(()=>{if(mobile)return;const apply=()=>{document.documentElement.dataset.wtheme=isDark(readTheme())?'dark':'light';};apply();const mq=matchMedia('(prefers-color-scheme: dark)'),on=()=>{setLook(readTheme());apply();};mq.addEventListener('change',on);window.addEventListener('storage',on);return()=>{mq.removeEventListener('change',on);window.removeEventListener('storage',on);};},[mobile]);
 const chooseLook=m=>{try{localStorage.setItem(THEME_KEY,m);}catch{}setLook(m);document.documentElement.dataset.wtheme=isDark(m)?'dark':'light';};
 useEffect(()=>{if(!desktop)return;return window.taskit.onWheel(({x,y,deltaX,deltaY})=>{
  let area=getScrollContainer(x,y);
  if(area?.classList.contains('horizontal-scroll')&&!deltaX&&area.dataset.wheelHorizontal!=='true')area=area.parentElement.closest('.scroll-area,.task-list,.themes,.panel-settings,.panel-edit');
  if(!area)return;
  const scrollStep=-deltaY*.5;
  if(area.classList.contains('horizontal-scroll')&&(deltaX||area.dataset.wheelHorizontal==='true')){area.scrollLeft+=deltaX||scrollStep;return;}if(scrollStep)area.scrollTop+=scrollStep;
  if(deltaX)area.scrollLeft+=deltaX*.5;
 });},[]);
 useEffect(()=>{let mounted=true;(async()=>{try{const saved=desktop?await window.taskit.load():mobile?loadMobile():JSON.parse(localStorage.getItem('taskit')||'null');if(mounted&&saved&&Array.isArray(saved.tasks)){setData(saved);if(desktop){setCompact(!!saved.compact);setOrigin(saved.origin);}}}catch{setError('Your saved tasks could not be loaded.');}finally{if(mounted)setReady(true);}})();return()=>{mounted=false;};},[]);
 useEffect(()=>{if(!ready)return;if(isInitialLoad.current){isInitialLoad.current=false;return;}saveQueue.current=saveQueue.current.then(()=>desktop?window.taskit.save(data):mobile?saveMobile(data):localStorage.setItem('taskit',JSON.stringify(data))).catch(()=>setError('Could not save. Keep ojo open and try again.'));},[data,ready]);
 useEffect(()=>{const tick=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(tick);},[]);
 useEffect(()=>{if(!desktop)return;const a=window.taskit.onState(next=>setData(next));const b=window.taskit.onExpand(value=>{if(surface.current){gsap.killTweensOf(surface.current);gsap.set(surface.current,{clearProps:'transform,opacity'});}busy.current=false;setOrigin(value.origin);setCompact(value.compact);});return()=>{a();b();};},[]);
 useEffect(()=>{if(desktop||android||!ready)return;const r=collectReminders(data,now.getTime());if(r.due.length){setData(r.state);setReminders(s=>[...s,...r.due]);}},[now,data,ready]);
 useEffect(()=>()=>clearTimeout(titleClick.current),[]);
 useLayoutEffect(()=>{if(mobile||!surface.current||!ready)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const tween=gsap.fromTo(surface.current,{scale:compact?.92:.19,opacity:compact?.85:0,transformOrigin:compact?'50% 50%':`${origin.x}px ${origin.y}px`},{scale:1,opacity:1,duration:reduced?0:compact?.14:.36,ease:'power3.out',clearProps:'transform,opacity'});return()=>tween.kill();},[compact,ready]);
 const setData=change=>setRawData(previous=>syncMasterDaily(typeof change==='function'?change(previous):change));
 useEffect(()=>{if(ready)setData(s=>s);},[ready,dayKey(now)]);
 useEffect(()=>{if(!android)return;const refresh=()=>{try{setData(loadMobile());}catch{setError('Could not reload your tasks.');}};const back=()=>{if(panel!=='tasks'){setPanel('tasks');setPicker(null);}else window.TnkrAndroid.closeApp();};window.addEventListener('tnkr-resume',refresh);window.addEventListener('tnkr-back',back);return()=>{window.removeEventListener('tnkr-resume',refresh);window.removeEventListener('tnkr-back',back);};},[panel]);
 useEffect(()=>{if(!widgetPanel||!ready||widgetEntry.current)return;widgetEntry.current=true;const params=new URLSearchParams(location.search),list=params.get('list')==='Anytime'?'Upcoming':params.get('list');if(views.some(v=>v.name===list))setView(list);const task=data.tasks.find(t=>t.id===params.get('taskId'));if(params.get('action')==='settings'){setPanel('settings');}else if(params.get('action')==='habits'){setHabitId(null);setPanel('habits');}else if(task&&params.get('action')==='delete'){setNoteId(task.id);setPanel('delete');}else if(task&&params.get('action')==='reorder'){setPriorityId(task.id);setPanel('tasks');}else if(params.get('action')==='add'){setDraft({...newTask('',list||'Today'),time:'',isNew:true});setPanel('edit');}else if(task&&params.get('action')==='edit'){setDraft({...task,time:task.reminder?.slice(11,16)||''});setPanel('edit');}else if(task&&params.get('action')==='notes'){setNoteId(task.id);setPanel('notes');}},[ready,data]);
 useLayoutEffect(()=>{if(!mobile||!ready||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const paper=surface.current?.querySelector('.paper');if(!paper)return;const animation=gsap.fromTo(paper,{opacity:0,y:6},{opacity:1,y:0,duration:.2,ease:'power2.out',clearProps:'transform,opacity'});return()=>{animation.kill();gsap.set(paper,{clearProps:'transform,opacity'});};},[panel,picker,view,ready]);
 const patch=change=>setData(s=>({...s,...change}));
 const changeMode=async value=>{if(busy.current)return;busy.current=true;try{let point;if(value&&surface.current){gsap.killTweensOf(surface.current);gsap.set(surface.current,{clearProps:'transform,opacity'});const button=collapseButton.current.getBoundingClientRect(),box=surface.current.getBoundingClientRect();point={x:button.x+button.width/2,y:button.y+button.height/2};const next=desktop?await window.taskit.collapseTarget(point):{x:point.x-box.x,y:point.y-box.y};setOrigin(next);await new Promise(resolve=>gsap.to(surface.current,{scale:.19,opacity:0,transformOrigin:`${next.x}px ${next.y}px`,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.28,ease:'power3.inOut',onComplete:resolve}));}if(desktop)setOrigin(await window.taskit.compact(value,point));setCompact(value);}catch{setError('Could not resize the widget.');}finally{busy.current=false;}};
 const startDrag=e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointer.current={x:e.screenX,y:e.screenY,offset,moved:false};if(desktop)window.taskit.dragStart().catch(()=>{});};
 const moveDrag=e=>{const p=pointer.current;if(!p)return;const dx=e.screenX-p.x,dy=e.screenY-p.y;if(Math.hypot(dx,dy)>4)p.moved=true;if(!desktop&&!mobile&&p.moved)setOffset({x:p.offset.x+dx,y:p.offset.y+dy});};
 const endDrag=async e=>{const p=pointer.current;if(!p)return;pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const moved=desktop?await window.taskit.dragEnd():p.moved;if(!moved&&e.type!=='pointercancel')changeMode(false);};
 const deleteTask=id=>{clearTimeout(titleClick.current);setData(s=>({...s,tasks:s.tasks.filter(t=>t.id!==id)}));};
 const updateTask=task=>setData(s=>({...s,tasks:s.tasks.map(t=>t.id===task.id?task:t)}));
 const handleCloseEdit=()=>{if(widgetPanel&&android)window.TnkrAndroid.closeApp();else{setPanel('tasks');setPicker(null);}};
 const toggleTaskWithAnim=(task,e)=>{
  const btn=e?.currentTarget;
  if(btn&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   gsap.fromTo(btn,{scale:0.72},{scale:1,duration:0.28,ease:'back.out(2.5)',clearProps:'transform'});
  }
  updateTask(toggleTask(task));
 };
 const addQuick=e=>{
  e.preventDefault();
  if(!quick.trim())return;
  const submitBtn=e.currentTarget?.querySelector('button[type="submit"]');
  if(submitBtn&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   gsap.fromTo(submitBtn,{scale:0.8},{scale:1,duration:0.22,ease:'back.out(2)',clearProps:'transform'});
  }
  setData(s=>({...s,tasks:[...s.tasks,newTask(quick,view)]}));
  setQuick('');
 };
 const patchTask=(id,changes)=>setData(s=>({...s,tasks:s.tasks.map(t=>t.id===id?{...t,...changes}:t)}));
 const rename=task=>{clearTimeout(titleClick.current);setRenaming(task.id);setRenameText(task.title);};
 const finishRename=()=>{if(renaming&&renameText.trim())patchTask(renaming,{title:renameText.trim()});setRenaming(null);};
 const openNotes=task=>{clearTimeout(titleClick.current);titleClick.current=setTimeout(()=>{setNoteId(task.id);setPanel('notes');},260);};
 const moveTask=(id,target,after=false)=>setData(s=>({...s,tasks:reorderTask(s.tasks,id,target,after)}));
 const movePriority=(task,direction)=>{const visible=data.tasks.filter(t=>(mobile?belongsMobile:belongs)(t,view,now)),index=visible.findIndex(t=>t.id===task.id),target=visible[index+direction];if(target)moveTask(task.id,target.id,direction>0);};
 const openEditor=task=>{clearTimeout(titleClick.current);setPicker(null);setDraft({...task,time:task.reminder?.slice(11,16)||''});setPanel('edit');};
 const saveTask=e=>{e.preventDefault();if(!draft.title.trim())return;const task={...draft,title:draft.title.trim(),reminder:draft.date&&draft.time?`${draft.date}T${draft.time}`:'',notified:false};delete task.time;const isNew=task.isNew;delete task.isNew;if(isNew)setData(s=>({...s,tasks:[...s.tasks,task]}));else updateTask(task);if(widgetPanel&&android)window.TnkrAndroid.closeApp();else setPanel('tasks');};
 const settings=async change=>{if(!desktop){patch(change);return;}try{const r=await window.taskit.settings({...data,...change});patch({startup:r.startup,mutedUntil:r.mutedUntil});if(change.startup&&!r.packaged)setError('Launch at login is available in the packaged app.');}catch{setError('Could not apply this setting.');}};
 const addCover=async()=>{if((data.covers||[]).length>=12){setError('You can keep up to 12 custom covers.');return;}if(desktop){try{const c=await window.taskit.addCover();if(c)setData(s=>({...s,covers:[...(s.covers||[]),c],theme:c.id}));}catch(e){setError(e.message||'This image could not be opened.');}}else coverInput.current.click();};
 const uploadCover=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>3*1024*1024){setError('Choose a PNG, JPG or WebP smaller than 3 MB.');return;}const reader=new FileReader();reader.onload=()=>{const c={id:'cover-'+crypto.randomUUID(),name:f.name.replace(/\.[^.]+$/,'').slice(0,35),src:reader.result};setData(s=>({...s,covers:[...(s.covers||[]),c],theme:c.id}));};reader.onerror=()=>setError('Could not read this cover.');reader.readAsDataURL(f);};
 const taskDrag=useTaskDrag(data.tasks,ids=>setData(s=>{const byId=new Map(s.tasks.map(t=>[t.id,t]));return {...s,tasks:[...ids.map(id=>byId.get(id)).filter(Boolean),...s.tasks.filter(t=>!ids.includes(t.id))]};}));
 const tasks=(taskDrag.order||data.tasks).filter(t=>(mobile?belongsMobile:belongs)(t,view,now)),complete=tasks.filter(t=>completedToday(t,now)).length;
 const covers=[...themes,...(data.covers||[])],art=(covers.find(t=>t.id===data.theme)||themes[0]).src,ViewIcon=views.find(v=>v.name===view).icon;
 if(!ready)return null;
 return <main {...taskDrag.surfaceHandlers} className={`${mobile?'mobile':desktop?'desktop':'preview'} ${widgetPanel?'widget-panel':''} ${compact?'is-compact':''}`}>
 {!desktop&&!mobile&&<><div className="preview-brand"><img src="./brand/ojo.svg" width="25" height="25" alt=""/><span>ojo</span></div><div className="intro"><span className="eyebrow">A LITTLE ROOM FOR YOUR DAY</span><h1>One thing at a time.</h1><p>Your plans, a little closer. Your mind, a little clearer.</p></div></>}
 <div className="anchor-shell" style={!desktop?{transform:`translate(${offset.x}px,${offset.y}px)`}:undefined}>
 {compact?<div ref={surface} className="mini" style={{backgroundImage:`url(${art})`,left:origin.x-28,top:origin.y-28}}><button aria-label="Expand ojo" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={e=>{if(e.detail===0)changeMode(false);}}><img src="./brand/ojo-white.svg" width="36" height="36" alt="" draggable="false"/>{data.tasks.some(t=>!t.done)&&<span className="count">{data.tasks.filter(t=>!t.done).length}</span>}</button></div>:
 <section ref={surface} className={`widget theme-${data.theme}`} aria-label={mobile?"ojo tasks":"ojo desktop widget"}>
 {!mobile&&<header className="art-header" style={{backgroundImage:`url(${art})`}} onPointerDown={e=>{if(e.button!==0||!desktop||e.target.closest('button'))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);window.taskit.dragStart().catch(()=>{});}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){e.currentTarget.releasePointerCapture(e.pointerId);window.taskit.dragEnd();}}} onPointerCancel={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){e.currentTarget.releasePointerCapture(e.pointerId);window.taskit.dragEnd();}}}><div className="datebar"><b className="d-num">{now.getDate()}</b><span className="d-txt"><i>{now.toLocaleDateString('en-GB',{weekday:'long'})}</i><i>{now.toLocaleDateString('en-GB',{month:'long'})} · <time>{now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</time></i></span>{!mobile&&<button ref={collapseButton} className="collapse" aria-label="Collapse to icon" onClick={()=>changeMode(true)}><Minus size={16}/></button>}</div></header>}
 <div className={`paper panel-${panel}`}>
 {panel==='tasks'&&<><div className="title-row"><h2>Things to do</h2><span className="current-view"><ViewIcon size={16} weight="fill"/>{view}</span>{desktop&&<button className="icon workspace-open" aria-label="Open workspace" onClick={()=>window.workspace?.open()}><SquaresFour size={17}/></button>}<button className="icon habit-open" aria-label="Habit tracker" onClick={()=>{setHabitId(null);setPanel('habits');}}><ChartLine size={17}/></button><button className="icon settings" aria-label="Settings" onClick={()=>setPanel('settings')}><GearSix size={17}/></button>{(widgetPanel||mobile)&&<button type="button" className="icon close-popup" aria-label="Close" onClick={()=>{if(widgetPanel&&android)window.TnkrAndroid.closeApp();}}><X size={18}/></button>}</div>
 <ListTabs mobileMode={mobile} order={data.listOrder} view={view} onSelect={setView} onOrder={listOrder=>patch({listOrder})} tasks={data.tasks} now={now}/>
 <div className="task-list">{tasks.length===0?<div className="empty"><h3>{view==='Today'?'A little space to begin.':view==='Upcoming'?'Good things ahead.':view==='Daily'?'A little every day.':'Room for someday.'}</h3><p>{view==='Today'?'Write a task below. The rest can wait.':view==='Upcoming'?'New tasks start tomorrow. Edit to pick another day.':view==='Daily'?'Add a daily habit below. It repeats automatically.':'A place for tasks without a date.'}</p></div>:tasks.map(task=><div key={task.id} data-task-id={task.id} className={`task ${completedToday(task,now)?'done':''} ${taskDrag.dragId===task.id?'dragging':''}`}>
  <button className="drag-handle icon" aria-label={`Reorder ${task.title}`} {...taskDrag.handlers(task)} onClick={()=>setPriorityId(priorityId===task.id?null:task.id)} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();movePriority(task,e.key==='ArrowUp'?-1:1);}}}><DotsSixVertical size={13}/></button>
  <button role="checkbox" aria-checked={completedToday(task,now)} aria-label={`Complete ${task.title}`} className="check" onClick={e=>toggleTaskWithAnim(task,e)}>{completedToday(task,now)&&<Check size={12} weight="bold"/>}</button>
  <div className="task-copy">{renaming===task.id?<input className="rename-input" aria-label="Rename task" autoFocus maxLength={250} value={renameText} onChange={e=>setRenameText(e.target.value)} onBlur={finishRename} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();finishRename();}if(e.key==='Escape'){e.preventDefault();setRenaming(null);}}}/>:<button className="task-title horizontal-scroll" onClick={e=>{if(e.detail<2)openNotes(task);else clearTimeout(titleClick.current);}} onDoubleClick={()=>rename(task)}>{task.title}</button>}
   {(task.reminder||task.repeat||task.notes||(task.date&&task.date<dayKey(now)&&!task.done))&&<small>{task.reminder&&<><Bell size={10}/>{new Date(task.reminder).toLocaleString('en-GB',{...(view==='Upcoming'?{day:'numeric',month:'short'}:{}),hour:'2-digit',minute:'2-digit'})}</>}{task.repeat&&<button className="routine" aria-label={`Habit history for ${task.title}`} onClick={()=>{setHabitId(task.id);setPanel('habits');}}><Repeat size={10}/>Daily</button>}{task.notes&&<span>Notes</span>}{task.date&&task.date<dayKey(now)&&!task.done&&<span className="overdue">Overdue</span>}</small>}
   {priorityId===task.id&&<div className="priority-controls"><button onClick={()=>movePriority(task,-1)} disabled={tasks[0].id===task.id}><ArrowUp size={11}/>Move up</button><button onClick={()=>movePriority(task,1)} disabled={tasks.at(-1).id===task.id}><ArrowDown size={11}/>Move down</button></div>}
  </div><button className="icon edit-task" aria-label={`Edit ${task.title}`} onClick={()=>openEditor(task)}><PencilSimple size={14}/></button><button className="icon delete-task" aria-label={`Delete ${task.title}`} onClick={()=>deleteTask(task.id)}><Trash size={14}/></button>
 </div>)}</div>
 <div className="quick-area"><form className="quick-add" onSubmit={addQuick}><input aria-label={`New task for ${view.toLowerCase()}`} placeholder={view==='Today'?'Add a task for today…':view==='Upcoming'?'Add a task for tomorrow…':view==='Daily'?'Add a daily habit…':'Add a task for anytime…'} maxLength={250} value={quick} onChange={e=>setQuick(e.target.value)}/><button type="submit" aria-label="Add task" disabled={!quick.trim()}><Plus size={17}/></button></form><small>{tasks.length?`${complete} of ${tasks.length} complete · drag the dots to prioritise`:'One thing at a time.'}</small></div></>}
 {panel==='delete'&&<><div className="panel-title"><h2>Delete task?</h2><button type="button" className="icon close-popup" aria-label="Close" onClick={()=>setPanel('tasks')}><X size={18}/></button></div><p>{data.tasks.find(t=>t.id===noteId)?.title}</p><p className="hint">This also removes its notes and habit history.</p><div className="form-actions"><button className="secondary" onClick={()=>setPanel('tasks')}>Cancel</button><button className="primary" onClick={()=>{deleteTask(noteId);setPanel('tasks');}}>Delete</button></div></>}
 {panel==='habits'&&<Habits tasks={data.tasks} masterDaily={data.masterDaily} initialId={habitId} now={now} onBack={()=>setPanel('tasks')}/>} 
 {panel==='notes'&&data.tasks.find(t=>t.id===noteId)&&<NotesEditor task={data.tasks.find(t=>t.id===noteId)} onChange={notes=>patchTask(noteId,{notes})} onBack={()=>setPanel('tasks')}/>}
 {panel==='edit'&&!picker&&<><div className="panel-title"><button className="icon back-btn" aria-label="Back to tasks" onClick={()=>setPanel('tasks')}><ArrowLeft size={17}/></button><h2>{draft.isNew?'Add Task':'Edit Task'}</h2><button type="button" className="icon close-popup" aria-label="Close" onClick={handleCloseEdit}><X size={18}/></button></div><form className="edit-form" onSubmit={saveTask}><label>Task<input autoFocus maxLength={250} required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><div className="field-pair"><label>Date<button type="button" className="field-button" onClick={()=>setPicker('date')}><CalendarBlank size={14}/>{draft.date?new Date(draft.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Anytime'}</button></label><label>{widgetPanel?'Time':'Remind me at'}<button type="button" className="field-button" disabled={!draft.date} onClick={()=>setPicker('time')}><Clock size={14}/>{draft.time||'Set a time'}</button></label></div><label className="toggle-label"><span><Repeat size={14}/>Repeat Daily</span><input type="checkbox" disabled={!draft.date} checked={draft.repeat} onChange={e=>setDraft({...draft,repeat:e.target.checked})}/></label>{draft.time?<button type="button" className="text-button remove-reminder" onClick={()=>setDraft({...draft,time:'',reminder:''})}><X size={11}/>Remove reminder</button>:<p className="hint">Choose a date to add a reminder. No date means Anytime.</p>}<div className="form-actions"><button type="button" className="icon danger" aria-label="Delete task" onClick={()=>{deleteTask(draft.id);handleCloseEdit();}}><Trash size={16}/></button><button type="button" className="secondary" onClick={handleCloseEdit}>Cancel</button><button className="primary" type="submit">Save<Check size={14}/></button></div></form></>}
 {panel==='edit'&&picker==='date'&&<DatePicker value={draft.date} onChange={date=>setDraft({...draft,date,repeat:date?draft.repeat:false,time:date?draft.time:''})} onClose={()=>setPicker(null)}/>}
 {panel==='edit'&&picker==='time'&&<TimePicker value={draft.time} onChange={time=>setDraft({...draft,time})} onClose={()=>setPicker(null)}/>}
 {panel==='settings'&&<><div className="panel-title"><button className="icon back-btn" aria-label="Back to tasks" onClick={()=>setPanel('tasks')}><ArrowLeft size={17}/></button><h2>Make it yours</h2><button type="button" className="icon close-popup" aria-label="Close" onClick={handleCloseEdit}><X size={18}/></button></div>{!mobile&&<><div className="section-row"><p className="section-label">Your covers</p><button className="text-button" onClick={addCover}><ImageSquare size={14}/>Add cover</button></div><input ref={coverInput} className="file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload cover image" onChange={uploadCover}/><div className="themes">{covers.map(t=><button key={t.id} aria-label={t.name} aria-pressed={data.theme===t.id} onClick={()=>patch({theme:t.id})}><img src={t.src} alt=""/>{data.theme===t.id&&<span><Check size={11}/></span>}<small>{t.name}</small></button>)}</div></>}{!mobile&&<label className="toggle-label"><span><ArrowUpRight size={15}/>Open when I sign in</span><input type="checkbox" checked={!!data.startup} disabled={!desktop} onChange={e=>settings({startup:e.target.checked})}/></label>}<p className="hint">{mobile?'Your tasks stay on this phone. Add the home-screen widget for quick check-offs.':desktop?'Lives on your desktop. Other apps sit above it.':'Desktop-only visibility works in the Windows app. This preview stays inside your browser.'}</p>{desktop&&<button className="text-button quit" onClick={()=>window.taskit.quit()}>Quit ojo</button>}</>}
 {panel==='settings'&&mobile&&<div className="mobile-actions"><button className="text-button" onClick={requestWidget}>Add home-screen widget</button><button className="text-button" onClick={requestNotifications}>Enable reminder notifications</button><button className="text-button" onClick={requestExactReminders}>Allow precise reminder times</button><p className="hint">Reminders follow Android notification and battery settings. Open a task with a tap; use the pencil to rename it.</p></div>}
 {panel==='settings'&&!mobile&&<div className="look-row"><p className="section-label">Appearance</p><div className="look-pick" role="radiogroup" aria-label="Appearance">{[['light','Light'],['dark','Dark'],['system','Match Windows']].map(([id,name])=><button key={id} role="radio" aria-checked={look===id} className={look===id?'on':''} onClick={()=>chooseLook(id)}>{name}</button>)}</div></div>}
 {panel==='settings'&&<ListOrderEditor mobileMode={mobile} order={data.listOrder} onOrder={listOrder=>patch({listOrder})}/>}
 {panel==='settings'&&<button className="text-button" onClick={()=>settings({mutedUntil:data.mutedUntil>Date.now()?0:Date.now()+3600000})}><Bell size={13}/>{data.mutedUntil>Date.now()?'Unmute reminders':'Mute reminders for 1 hour'}</button>}
 </div>
 {error&&<div className="notice" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={14}/></button></div>}
 {reminders.length>0&&<div className="reminder" role="alert"><Bell size={17} weight="fill"/><div><strong>A little nudge</strong><p>{reminders[0].title}</p><button onClick={()=>{const task=data.tasks.find(t=>t.id===reminders[0].id);if(task){const d=new Date(Date.now()+600000);updateTask({...task,reminder:`${dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,notified:false});}setReminders(r=>r.slice(1));}}>Snooze 10 min</button></div><button className="icon" aria-label="Dismiss reminder" onClick={()=>setReminders(r=>r.slice(1))}><X size={16}/></button></div>}
 </section>}
 </div>
 {!desktop&&!mobile&&<div className="preview-note">A calm corner. Just for your desktop.<small>{compact?'Drag the icon anywhere. Click to open.':'Type a task and press Enter. Use the pencil for the details.'}</small></div>}
 {taskDrag.preview}
 </main>;
}










