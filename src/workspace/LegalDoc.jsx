import React from 'react';

// Renders one of the documents in src/legal/documents.mjs.
export function LegalDoc({doc}){
 return (
  <article className="legal-doc">
   <p className="legal-summary">{doc.summary}</p>
   {doc.sections.map(s=>(
    <section key={s.h}>
     <h4>{s.h}</h4>
     {(s.p||[]).map((t,i)=><p key={i}>{t}</p>)}
     {s.list&&<ul>{s.list.map((t,i)=><li key={i}>{t}</li>)}</ul>}
     {(s.after||[]).map((t,i)=><p key={'a'+i}>{t}</p>)}
    </section>
   ))}
  </article>
 );
}
