const SMALL=72,WIDTH=310,HEIGHT=360;
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
function boundAnchor(p,a){return {x:Math.round(clamp(p.x,a.x,a.x+a.width-SMALL)),y:Math.round(clamp(p.y,a.y,a.y+a.height-SMALL))};}
function origin(p,b){return {x:p.x-b.x+SMALL/2-8,y:p.y-b.y+SMALL/2-8};}
function layout(p,a){const x=clamp(p.x-(WIDTH-SMALL)/2,a.x,a.x+a.width-WIDTH),y=p.y+SMALL>=HEIGHT+a.y?p.y+SMALL-HEIGHT:clamp(p.y,a.y,a.y+a.height-HEIGHT);const b={x:Math.round(x),y:Math.round(y),width:WIDTH,height:HEIGHT};return {...b,origin:origin(p,b)};}
function collapseAnchor(bounds,point,area){const p={x:bounds.x+point.x-SMALL/2,y:bounds.y+point.y-SMALL/2};const edge=24;if(bounds.x-area.x<=edge)p.x=area.x;else if(area.x+area.width-bounds.x-bounds.width<=edge)p.x=area.x+area.width-SMALL;if(bounds.y-area.y<=edge)p.y=area.y;else if(area.y+area.height-bounds.y-bounds.height<=edge)p.y=area.y+area.height-SMALL;return boundAnchor(p,area);}
module.exports={SMALL,WIDTH,HEIGHT,boundAnchor,layout,origin,collapseAnchor};
