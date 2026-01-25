
import { state } from './state.js';
import { loadJSON } from './utils.js';
const JKEY='nmi_journal_v1';
const readJ=()=>{try{return JSON.parse(localStorage.getItem(JKEY)||'[]')}catch(e){return[]}};
const saveJ=(r)=>localStorage.setItem(JKEY,JSON.stringify(r));
const num=v=>{const n=Number(String(v).replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:0;};
function calc(){
  const entry=num(document.getElementById('entry').value), exit=num(document.getElementById('exit').value),
        stop=num(document.getElementById('stop').value), amount=num(document.getElementById('amount').value);
  const risk=Math.abs(entry-stop), reward=Math.abs(exit-entry), rr=risk>0?(reward/risk):0, pnl=amount>0?((exit-entry)/entry)*amount:0;
  document.getElementById('rr').textContent=rr?rr.toFixed(2):'—';
  document.getElementById('pnl').textContent=amount?pnl.toFixed(2):'—';
}
function guard(al){
  const low=al.sessionEdge==='Low';
  const mixed=al.sessionEdge==='Moderate' && al.newsPressure==='High';
  const macroHigh=al.macroImpact==='High';
  const tight=al.liquidity==='Tight';
  const mis=(macroHigh && tight && (low||mixed)) || (al.trend==='Mixed');
  const box=document.getElementById('guard'); if(!box) return {mis:false};
  box.style.display=mis?'block':'none'; return {mis};
}
function render(){
  const w=document.getElementById('journal'); if(!w) return; const rows=readJ();
  if(!rows.length){ w.innerHTML='<div class="muted">No records yet. This is a learning tool (not advice).</div>'; return; }
  w.innerHTML=rows.slice(0,12).map(r=>{
    const d=new Date(r.at); const flag=r.guard_low_alignment?'<span class="tag bad">Recorded while alignment was low</span>':'<span class="tag good">Normal</span>';
    return `<div class="kv" style="margin-bottom:10px;align-items:flex-start"><div><b>${d.toLocaleString()}</b>
      <div class="muted">Entry: ${r.entry} • Exit: ${r.exit} • Stop: ${r.stop} • Amount: ${r.amount}</div>
      <div class="muted">R/R: ${r.rr} • P/L (calc): ${r.pnl}</div></div><div>${flag}</div></div>`;
  }).join('');
}
async function boot(){
  state.init();
  const ov=await loadJSON('./data/overview.json');
  const al={sessionEdge:'Moderate',newsPressure:ov.pressure.news,liquidity:ov.pressure.liquidity,macroImpact:'High',trend:(ov.trend.direction==='Sideways')?'Mixed':'Aligned'};
  const st=guard(al);
  ['entry','exit','stop','amount'].forEach(id=>document.getElementById(id).addEventListener('input',calc));
  calc();
  document.getElementById('reviewContext').onclick=()=>location.href='./index.html';
  document.getElementById('proceed').onclick=()=>{
    const rows=readJ();
    rows.unshift({at:new Date().toISOString(),
      entry:document.getElementById('entry').value, exit:document.getElementById('exit').value, stop:document.getElementById('stop').value,
      amount:document.getElementById('amount').value, rr:document.getElementById('rr').textContent, pnl:document.getElementById('pnl').textContent,
      guard_low_alignment:st.mis?true:false});
    saveJ(rows); render(); state.markReturning();
  };
  render();
}
boot();
