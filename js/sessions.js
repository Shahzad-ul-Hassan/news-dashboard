
import { loadJSON } from './utils.js';
import { state } from './state.js';
function formatPKT(d){ return d.toLocaleString(state.getLang()==='ur'?'ur-PK':'en-PK',{timeZone:'Asia/Karachi',hour:'numeric',minute:'2-digit',hour12:true}); }
function minutesInTZ(date,tz){ const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const h=+parts.find(p=>p.type==='hour').value,m=+parts.find(p=>p.type==='minute').value; return h*60+m; }
function parseHHMM(s){ const [h,m]=s.split(':').map(Number); return h*60+m; }
function statusFor(now,open,close){ const pre=open-60; if(now>=open && now<=close) return 'open'; if(now>=pre && now<open) return 'preopen'; return 'closed'; }
function labelStatus(st){ if(st==='open') return state.getLang()==='ur'?'اوپن':'Open'; if(st==='preopen') return state.getLang()==='ur'?'پری اوپن':'Pre-Open'; return state.getLang()==='ur'?'کلوزڈ':'Closed'; }
function pkRange(sess){
  const now=new Date(); const tz=sess.tz;
  const dp=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const y=+dp.find(p=>p.type==='year').value,mo=+dp.find(p=>p.type==='month').value,da=+dp.find(p=>p.type==='day').value;
  function make(hhmm){
    const [hh,mm]=hhmm.split(':').map(Number); let t=Date.UTC(y,mo-1,da,hh,mm,0);
    for(let i=0;i<6;i++){
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t));
      const got={}; for(const p of parts) if(p.type!=='literal') got[p.type]=p.value;
      const gotTotal=((((+got.year)*13+(+got.month))*32+(+got.day))*24+(+got.hour))*60+(+got.minute);
      const wantTotal=(((y*13+mo)*32+da)*24+hh)*60+mm;
      const diff=wantTotal-gotTotal; if(diff===0) break; t+=diff*60000;
    }
    return new Date(t);
  }
  const o=make(sess.open),c=make(sess.close);
  return `${formatPKT(o)} — ${formatPKT(c)} (PKT)`;
}
export async function initSessionsButton(){
  const btn=document.getElementById('sessionsBtn'),menu=document.getElementById('sessionsMenu'); if(!btn||!menu) return;
  const data=await loadJSON('./data/sessions.json'); const lang=state.getLang(); const now=new Date();
  menu.innerHTML='';
  data.sessions.forEach(s=>{
    const st=statusFor(minutesInTZ(now,s.tz),parseHHMM(s.open),parseHHMM(s.close));
    const row=document.createElement('div'); row.className='sessionRow';
    row.innerHTML=`<div><div class="status ${st}">${labelStatus(st)}</div><div class="small">${lang==='ur'?s.label_ur:s.label_en}</div></div><div class="time">${pkRange(s)}</div>`;
    menu.appendChild(row);
  });
  btn.onclick=()=>menu.classList.toggle('open');
  document.addEventListener('click',(e)=>{ if(!menu.classList.contains('open')) return; if(!(menu.contains(e.target)||btn.contains(e.target))) menu.classList.remove('open'); });
}
