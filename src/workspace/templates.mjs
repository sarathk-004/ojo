// Starting points for a new note. They are plain editor HTML, so everything stays editable.
// Each is built for what the note is: headings that prompt the right thinking, and tables where the content is really a grid.
const todo=items=>'<ul class="todo">'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
const list=items=>'<ul>'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
const h=t=>'<h2>'+t+'</h2>';
const p=t=>'<p>'+(t||'<br>')+'</p>';
const quote=t=>'<blockquote>'+(t||'<br>')+'</blockquote>';
// A table: a header row, then body rows. Cells may be empty strings. Followed by a paragraph so typing can continue below it.
const cell=(tag,v)=>'<'+tag+'>'+(v||'<br>')+'</'+tag+'>';
const table=(head,rows)=>'<table class="nb-table"><tbody><tr>'+head.map(v=>cell('th',v)).join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(v=>cell('td',v)).join('')+'</tr>').join('')+'</tbody></table><p><br></p>';
const blank=(cols,n)=>Array.from({length:n},()=>Array(cols).fill(''));
const day=(d=new Date())=>d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
const short=(d=new Date())=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const weekStart=(d=new Date())=>{const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;};

export const TEMPLATES=[
 {id:'meeting',name:'Meeting notes',hint:'Agenda, decisions, action table',title:d=>'Meeting · '+short(d),
  html:d=>p('<b>When:</b> '+day(d))+p('<b>With:</b> ')+h('Agenda')+list([''])+h('Notes')+p('')+h('Decisions')+list([''])+h('Action items')+table(['Owner','Action','Due'],blank(3,3))},
 {id:'oneonone',name:'1:1 conversation',hint:'Check-in, feedback, next steps',title:d=>'1:1 · '+short(d),
  html:d=>p('<b>With:</b> ')+h('How are things')+p('')+h('Topics')+list([''])+h('Feedback, both ways')+table(['','From me','From them'],[['Keep doing','',''],['Change','','']])+h('Next steps')+table(['Who','What','By when'],blank(3,3))},
 {id:'daily',name:'Daily plan',hint:'Top three, time blocks, review',title:d=>day(d),
  html:()=>h('Top three for today')+todo(['','',''])+h('Time blocks')+table(['Time','Plan'],[['Morning',''],['Midday',''],['Afternoon',''],['Evening','']])+h('Notes')+p('')+h('End of day')+p('<b>Went well:</b> ')+p('<b>Carry to tomorrow:</b> ')},
 {id:'weekly',name:'Weekly plan',hint:'Look back, then plan each day',title:d=>'Week of '+short(weekStart(d)),
  html:()=>h('Last week')+p('<b>Went well:</b> ')+p('<b>Did not:</b> ')+h('This week')+p('<b>The one thing:</b> ')+table(['Day','Focus','Notes'],['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=>[d,'','']))+h('Waiting on')+list([''])},
 {id:'project',name:'Project brief',hint:'Goal, scope, milestone and risk tables',title:()=>'Project brief',
  html:()=>h('Goal')+p('')+h('Why it matters')+p('')+h('Scope')+table(['In scope','Out of scope'],blank(2,3))+h('Milestones')+table(['Milestone','Owner','Due','Status'],blank(4,3))+h('Risks')+table(['Risk','How likely','What we will do'],blank(3,2))},
 {id:'decision',name:'Decision matrix',hint:'Weigh options against what matters',title:()=>'Decision',
  html:d=>p('<b>Decided on:</b> '+day(d))+h('The decision')+p('')+h('Options compared')+p('Score each option from 1 (poor) to 5 (great). Weight is how much the criterion matters, 1 to 5.')+table(['Criterion','Weight','Option A','Option B','Option C'],[['Cost','','','',''],['Effort','','','',''],['Impact','','','',''],['Risk','','','',''],['<b>Total</b>','','','','']])+h('Why this one')+p('')+h('Revisit if')+p('')},
 {id:'proscons',name:'Pros and cons',hint:'Two sides of one choice',title:()=>'Pros and cons',
  html:()=>p('<b>Question:</b> ')+table(['Pros','Cons'],blank(2,4))+h('Where I lean')+p('')},
 {id:'retro',name:'Retrospective',hint:'Went well, did not, try next',title:d=>'Retro · '+short(d),
  html:()=>table(['Went well','Did not go well','Try next time'],blank(3,4))+h('Actions')+table(['Action','Owner','Due'],blank(3,3))},
 {id:'reading',name:'Reading notes',hint:'Source, key ideas, what to do',title:()=>'Reading notes',
  html:()=>p('<b>Source:</b> ')+p('<b>Author:</b> ')+h('In one sentence')+p('')+h('Key ideas')+list(['','',''])+h('Quotes worth keeping')+quote('')+h('What I will do with it')+todo([''])},
 {id:'study',name:'Study notes',hint:'Concept table, questions, practice',title:()=>'Study notes',
  html:()=>p('<b>Topic:</b> ')+p('<b>Source:</b> ')+h('Concepts')+table(['Concept','In my own words','Example'],blank(3,4))+h('Questions I still have')+list([''])+h('Practice')+todo([''])},
 {id:'workout',name:'Workout log',hint:'Exercise, sets, reps and weight',title:d=>'Workout · '+short(d),
  html:()=>p('<b>Focus:</b> ')+h('Warm-up')+list([''])+h('Main sets')+table(['Exercise','Sets','Reps','Weight','Notes'],blank(5,5))+h('How it felt')+p('')},
 {id:'trip',name:'Trip plan',hint:'Itinerary, bookings, packing, budget',title:()=>'Trip plan',
  html:()=>p('<b>Where:</b> ')+p('<b>Dates:</b> ')+h('Itinerary')+table(['Day','Plan','Booked'],blank(3,4))+h('Bookings')+todo(['Travel','Stay'])+h('Packing')+todo(['','',''])+h('Budget')+table(['Item','Estimate','Actual'],[['Travel','',''],['Stay','',''],['Food','',''],['Things to do','',''],['<b>Total</b>','','']])},
 {id:'checklist',name:'Checklist',hint:'A simple list to tick off',title:()=>'Checklist',html:()=>todo(['','',''])}
];
export const getTemplate=id=>TEMPLATES.find(t=>t.id===id);
