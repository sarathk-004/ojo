// Reading time for a saved item: only shown for things long enough to matter.
export const readMinutes=item=>{
 const w=item.kind==='link'?(item.content||'').split(/\s+/).length:(item.text||'').split(/\s+/).length;
 return w>=220?Math.max(1,Math.round(w/220)):0;
};
