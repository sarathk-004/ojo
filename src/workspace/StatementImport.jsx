import React,{useMemo,useRef,useState} from 'react';
import {DownloadSimple,FileText,LockSimple,ShieldCheck,ArrowDownLeft,ArrowUpRight} from '@phosphor-icons/react';
import {Modal} from './Modal.jsx';
import {Select} from './Select.jsx';
import {parseStatement,markDuplicates,detectAccount} from './statement.mjs';
import {EXPENSE_CATS,INCOME_CATS,fmtMoney,catOf,monthLabel} from './finance.mjs';

const readText=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsText(file);});
const readBuffer=file=>file.arrayBuffer();

// Import a bank, PhonePe or Google Pay statement. The file is read in this window and never leaves the computer.
export function StatementImport({existing,sym,onImport,onClose}){
 const [stage,setStage]=useState('pick'),[rows,setRows]=useState([]),[format,setFormat]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [pending,setPending]=useState(null),[password,setPassword]=useState(''),[wrong,setWrong]=useState(false),[over,setOver]=useState(false);
 const input=useRef(null),[account,setAccount]=useState(''),sourceRows=useRef([]);
 const known=useMemo(()=>[...new Set(existing.map(t=>t.account).filter(Boolean))],[existing]);

 const load=async(file,pw)=>{
  setBusy(true);setError('');
  try{
   let result,sample='';
   if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
    const {pdfLines}=await import('./pdfText.js');
    const lines=await pdfLines(await readBuffer(file),pw);sample=lines.slice(0,60).join(' ');result=parseStatement({name:file.name,lines});
   }else{const text=await readText(file);sample=text;result=parseStatement({name:file.name,text});}
   if(!result.rows.length){setError('I could not find any transactions in that file. Try the CSV or PDF statement from the app or your bank.');setStage('pick');setPending(null);}
   else{
    const acct=detectAccount(sample,file.name);
    sourceRows.current=result.rows;setAccount(acct);
    const marked=markDuplicates(result.rows,existing,acct).map((r,i)=>({...r,key:i,keep:!r.duplicate}));
    setRows(marked);setFormat(result.format);setStage('review');setPending(null);
   }
  }catch(e){
   if(e&&e.needPassword){setPending(file);setWrong(!!e.wrong);setStage('password');}
   else setError('That file could not be read.');
  }
  setBusy(false);
 };
 const pick=files=>{const f=[...files||[]][0];if(f)load(f);};
 // Changing the account re-checks which rows are already added for that account.
 const changeAccount=name=>{setAccount(name);setRows(l=>{const kept=new Map(l.map(r=>[r.key,r]));return markDuplicates(sourceRows.current,existing,name).map((r,i)=>({...r,key:i,category:kept.get(i)?.category??r.category,type:kept.get(i)?.type??r.type,keep:!r.duplicate}));});};
 const patch=(key,change)=>setRows(l=>l.map(r=>r.key===key?{...r,...change}:r));
 const chosen=rows.filter(r=>r.keep);
 const totals=useMemo(()=>({out:chosen.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0),inn:chosen.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0)}),[rows]);
 const dups=rows.filter(r=>r.duplicate).length;
 // Which months the chosen rows belong to: a statement keeps its own dates, so May's statement files under May.
 const byMonth=useMemo(()=>{const m=new Map();for(const r of chosen)m.set(r.date.slice(0,7),(m.get(r.date.slice(0,7))||0)+1);return [...m].sort((a,b)=>a[0].localeCompare(b[0]));},[rows]);

 return (
  <Modal wide title="Import a statement" onClose={onClose}>
   <div className="stmt">
    <p className="stmt-private"><ShieldCheck size={16} weight="duotone"/>Read on this computer only. The file is never uploaded, and you choose what gets added.</p>
    {stage==='pick'&&<>
     <div className={'stmt-drop'+(over?' over':'')} onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);pick(e.dataTransfer.files);}} onClick={()=>input.current?.click()}>
      <DownloadSimple size={30} weight="light"/>
      <b>{busy?'Reading…':'Drop a statement here, or click to choose'}</b>
      <span className="muted">PhonePe or bank PDF · CSV · Google Pay activity (HTML from Google Takeout)</span>
      <input ref={input} type="file" hidden accept=".pdf,.csv,.txt,.html,.htm,text/csv,application/pdf" onChange={e=>{pick(e.target.files);e.target.value='';}}/>
     </div>
     {error&&<p className="error">{error}</p>}
     <ul className="stmt-how muted">
      <li><b>PhonePe:</b> History → Statement → choose dates → download the PDF.</li>
      <li><b>Google Pay:</b> Google Takeout → My Activity → Google Pay → HTML.</li>
      <li><b>Bank:</b> download the CSV or PDF statement from net banking.</li>
     </ul>
    </>}
    {stage==='password'&&<form className="stmt-pw" onSubmit={e=>{e.preventDefault();load(pending,password);}}>
     <LockSimple size={26} weight="light"/>
     <b>This PDF is password protected</b>
     <span className="muted">Banks usually use your date of birth or the last digits of your phone number. The password stays on this computer.</span>
     <input type="password" autoFocus autoComplete="off" value={password} onChange={e=>{setPassword(e.target.value);setWrong(false);}} placeholder="PDF password"/>
     {wrong&&<p className="error">That password did not open it.</p>}
     <div className="form-actions"><button className="primary" disabled={!password||busy}>Open</button><button type="button" className="ghost" onClick={()=>{setStage('pick');setPending(null);setPassword('');}}>Back</button></div>
    </form>}
    {stage==='review'&&<>
     <div className="stmt-acct"><label>Account<input value={account} maxLength={40} placeholder="e.g. HDFC savings" onChange={e=>changeAccount(e.target.value)}/></label>{known.filter(k=>k!==account).map(k=><button key={k} className="link-btn" onClick={()=>changeAccount(k)}>{k}</button>)}</div>
     <div className="stmt-sum">
      <span><FileText size={15}/> {rows.length} found{dups>0&&<em> · {dups} already added</em>}</span>
      <span className="sp-out"><ArrowUpRight size={14}/>{fmtMoney(totals.out,sym)}</span>
      <span className="sp-in"><ArrowDownLeft size={14}/>{fmtMoney(totals.inn,sym)}</span>
      <span className="spacer"/>
      <button className="link-btn" onClick={()=>setRows(l=>l.map(r=>({...r,keep:true})))}>Select all</button>
      <button className="link-btn" onClick={()=>setRows(l=>l.map(r=>({...r,keep:false})))}>None</button>
     </div>
     {byMonth.length>0&&<p className="stmt-months muted">Each row keeps the date on the statement. {byMonth.map(([k,n])=>n+' in '+monthLabel(k)).join(' · ')}.</p>}
     <div className="stmt-table">
      {rows.map(r=>(
       <div key={r.key} className={'stmt-row'+(r.keep?'':' off')+(r.duplicate?' dup':'')}>
        <input type="checkbox" aria-label="Include" checked={r.keep} onChange={e=>patch(r.key,{keep:e.target.checked})}/>
        <span className="d">{r.date.slice(8)+'/'+r.date.slice(5,7)}</span>
        <span className="n">{r.note||'—'}{r.duplicate&&<em className="badge">Already added</em>}</span>
        <Select compact label="Category" value={r.category} onChange={v=>patch(r.key,{category:v})} options={(r.type==='income'?INCOME_CATS:EXPENSE_CATS).map(c=>({value:c.id,label:c.name}))}/>
        <button className={'tt '+r.type} title="" onClick={()=>patch(r.key,{type:r.type==='income'?'expense':'income',category:r.type==='income'?'other':'other-in'})}>{r.type==='income'?'In':'Out'}</button>
        <b className={'a '+r.type}>{r.type==='income'?'+':'−'}{fmtMoney(r.amount,sym).replace('−','')}</b>
       </div>
      ))}
     </div>
     <div className="form-actions">
      <button className="primary" disabled={!chosen.length} onClick={()=>onImport(chosen.map(({date,type,amount,note,detail,category,ref})=>({date,type,amount,note,detail,category,ref,account:account.trim(),imported:true})))}>Add {chosen.length} transaction{chosen.length===1?'':'s'}</button>
      <button className="ghost" onClick={()=>{setStage('pick');setRows([]);}}>Choose another file</button>
     </div>
    </>}
   </div>
  </Modal>
 );
}
