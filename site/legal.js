/* Draws the ojo face on the legal pages (kept in a file so the site can forbid inline scripts). */
(function(){
 var o=window.OJO,order=['eyeL','link1','eyeR','link2','nose','smile','browL','browR'];
 var s=order.map(function(k){return [].concat(o.paths[k]).map(function(d){return '<path d="'+d+'"/>';}).join('');}).join('');
 document.querySelectorAll('[data-face]').forEach(function(el){
  el.innerHTML='<svg viewBox="'+o.view+'" fill="none" stroke="currentColor" stroke-width="'+(el.dataset.face||6)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+s+'</svg>';
 });
})();
