// Where a cover image sits inside its frame. x and y are 0-100 (which part of the picture is centred), zoom is 1 or more.
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function placeImage(box,nat,{x=50,y=50,zoom=1}={}){
 if(!box||!nat||!box.w||!box.h||!nat.w||!nat.h)return null;
 const z=clamp(Number(zoom)||1,1,4),s=Math.max(box.w/nat.w,box.h/nat.h)*z,width=nat.w*s,height=nat.h*s;
 return {width,height,left:((box.w-width)*clamp(x,0,100)/100)||0,top:((box.h-height)*clamp(y,0,100)/100)||0};
}
// Dragging the picture by (dx,dy) pixels moves the focus point the opposite way.
export function panBy(box,nat,pos,dx,dy){
 const p=placeImage(box,nat,pos);if(!p)return pos;
 const rx=box.w-p.width,ry=box.h-p.height;
 return {...pos,x:rx?clamp((pos.x??50)+dx/rx*100,0,100):50,y:ry?clamp((pos.y??50)+dy/ry*100,0,100):50};
}
