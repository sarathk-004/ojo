// Pure helpers for the Canvas (mind maps): nodes, links, layout and view maths. No DOM in here, so they are easy to test.

export const NODE_COLORS={sage:'#e1e8dc',sand:'#f3ead2',sky:'#dde9f4',rose:'#f4dfe5',lilac:'#e7e1f3',peach:'#f6e2d4',slate:'#e6e8e8'};
export const NODE_W=150,NODE_H=44;
const id=()=>Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,6);

export const newNode=(x,y,over={})=>({id:id(),x:Math.round(x),y:Math.round(y),text:'',color:'sage',...over});
export const newEdge=(from,to)=>({id:id(),from,to,label:''});
export const newBoard=(project=null,now=Date.now())=>({id:id(),project,title:'',nodes:[],edges:[],vx:0,vy:0,vz:1,created:now,updated:now});
export const newProject=(now=Date.now())=>({id:id(),name:'',created:now});

export const hasEdge=(edges,a,b)=>edges.some(e=>(e.from===a&&e.to===b)||(e.from===b&&e.to===a));
export const childrenOf=(edges,nodeId)=>edges.filter(e=>e.from===nodeId).map(e=>e.to);
export const parentOf=(edges,nodeId)=>{const e=edges.find(x=>x.to===nodeId);return e?e.from:null;};

// Where a new child goes: to the right of its parent, below any children it already has.
export function childSpot(node,size,edges,nodes){
 const kids=childrenOf(edges,node.id).map(k=>nodes.find(n=>n.id===k)).filter(Boolean);
 const w=(size&&size.w)||NODE_W;
 const x=node.x+w+70;
 const y=kids.length?Math.max(...kids.map(k=>k.y))+62:node.y;
 return {x,y};
}

// The ends and curve of a link between two boxes ({x,y,w,h}), leaving from the sides that face each other.
export function anchors(a,b){
 const ac={x:a.x+a.w/2,y:a.y+a.h/2},bc={x:b.x+b.w/2,y:b.y+b.h/2};
 const dx=bc.x-ac.x,dy=bc.y-ac.y;
 const horizontal=Math.abs(dx)/((a.w+b.w)/2||1)>=Math.abs(dy)/((a.h+b.h)/2||1);
 let p1,p2,c1,c2;
 if(horizontal){
  const s=dx>=0?1:-1,k=Math.max(40,Math.abs(dx)*.4);
  p1={x:s>0?a.x+a.w:a.x,y:ac.y};p2={x:s>0?b.x:b.x+b.w,y:bc.y};
  c1={x:p1.x+s*k,y:p1.y};c2={x:p2.x-s*k,y:p2.y};
 }else{
  const s=dy>=0?1:-1,k=Math.max(40,Math.abs(dy)*.4);
  p1={x:ac.x,y:s>0?a.y+a.h:a.y};p2={x:bc.x,y:s>0?b.y:b.y+b.h};
  c1={x:p1.x,y:p1.y+s*k};c2={x:p2.x,y:p2.y-s*k};
 }
 // the middle of the curve (t = .5), for a label
 const mid={x:(p1.x+3*c1.x+3*c2.x+p2.x)/8,y:(p1.y+3*c1.y+3*c2.y+p2.y)/8};
 return {p1,p2,c1,c2,mid,d:`M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`};
}

// Tidy a mind map: every tree grows left to right, children stacked and centred on their parent.
// Returns {nodeId:{x,y}}. Nodes with no links keep their place.
export function tidy(nodes,edges,sizes={}){
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const kids=new Map(nodes.map(n=>[n.id,[]]));
 const hasParent=new Set();
 for(const e of edges){if(byId.has(e.from)&&byId.has(e.to)&&e.from!==e.to&&!hasParent.has(e.to)){kids.get(e.from).push(e.to);hasParent.add(e.to);}}
 const roots=nodes.filter(n=>!hasParent.has(n.id)&&kids.get(n.id).length).sort((a,b)=>a.y-b.y||a.x-b.x);
 const out={},ROW=64,GAP=70;
 let cursor=roots.length?Math.min(...roots.map(r=>r.y)):0;
 const seen=new Set();
 const place=(nid,x)=>{
  seen.add(nid);
  const n=byId.get(nid),w=(sizes[nid]&&sizes[nid].w)||NODE_W;
  const ch=kids.get(nid).filter(c=>!seen.has(c));
  if(!ch.length){out[nid]={x,y:cursor};cursor+=ROW;return;}
  for(const c of ch)place(c,x+w+GAP);
  const ys=ch.map(c=>out[c].y);
  out[nid]={x,y:Math.round((Math.min(...ys)+Math.max(...ys))/2)};
 };
 for(const r of roots){place(r.id,r.x);cursor+=ROW/2;}
 return out;
}

// A view (pan and zoom) that shows every node with some room around it.
export function fitView(nodes,sizes,w,h,pad=60){
 if(!nodes.length||!w||!h)return {vx:0,vy:0,vz:1};
 const boxes=nodes.map(n=>({x:n.x,y:n.y,w:(sizes[n.id]&&sizes[n.id].w)||NODE_W,h:(sizes[n.id]&&sizes[n.id].h)||NODE_H}));
 const x0=Math.min(...boxes.map(b=>b.x)),y0=Math.min(...boxes.map(b=>b.y));
 const x1=Math.max(...boxes.map(b=>b.x+b.w)),y1=Math.max(...boxes.map(b=>b.y+b.h));
 const z=Math.min(1.25,Math.max(.25,Math.min((w-pad*2)/(x1-x0||1),(h-pad*2)/(y1-y0||1))));
 return {vx:Math.round(w/2-((x0+x1)/2)*z),vy:Math.round(h/2-((y0+y1)/2)*z),vz:Math.round(z*100)/100};
}

// Zoom keeping the point under the cursor where it is.
export function zoomAt(view,factor,px,py){
 const z=Math.min(2.5,Math.max(.2,view.vz*factor)),r=z/view.vz;
 return {vz:Math.round(z*1000)/1000,vx:px-(px-view.vx)*r,vy:py-(py-view.vy)*r};
}

// What search should know about a board.
export const boardText=b=>(b.nodes||[]).map(n=>n.text).filter(Boolean).join(' · ');

// Removing a node removes the links that touched it.
export const withoutNodes=(nodes,edges,ids)=>{
 const gone=new Set(ids);
 return {nodes:nodes.filter(n=>!gone.has(n.id)),edges:edges.filter(e=>!gone.has(e.from)&&!gone.has(e.to))};
};

// Undo and redo: snapshots of {nodes,edges}.
export function makeHistory(limit=80){
 return {past:[],future:[],limit};
}
export function pushHistory(h,snapshot){
 const last=h.past[h.past.length-1];
 if(last===snapshot)return;
 h.past.push(snapshot);if(h.past.length>h.limit)h.past.shift();
 h.future.length=0;
}
export function undo(h,current){
 if(!h.past.length)return null;
 h.future.push(current);return h.past.pop();
}
export function redo(h,current){
 if(!h.future.length)return null;
 h.past.push(current);return h.future.pop();
}
