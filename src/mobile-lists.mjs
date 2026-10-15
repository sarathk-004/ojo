import {belongs,normalizeListOrder} from './tasks.mjs';
export function mobileListOrder(order){return normalizeListOrder(order).filter(name=>name!=='Anytime');}
export function belongsMobile(task,view,now){return belongs(task,view,now)||(view==='Upcoming'&&belongs(task,'Anytime',now));}
