
import { loadJSON, clamp } from './utils.js';
import { state } from './state.js';
import { i18n } from './i18n.js';
let glossary=null, beginner=null;
function shouldBeginner(){ const m=state.beginnerHelpMode(); if(m===null||typeof m==='undefined') return state.isNewUser(); return !!m; }
function ensure(){
  let el=document.getElementById('tooltip'); if(el) return el;
  el=document.createElement('div'); el.id='tooltip'; el.className='tooltip';
  el.innerHTML=`<h4></h4><p></p><div class="more"><a href="#" id="tooltipMore">${i18n.t('learnMore')}</a></div>`;
  document.body.appendChild(el); return el;
}
function setPos(tt,x,y){
  const pad=12,w=tt.offsetWidth,h=tt.offsetHeight;
  const nx=clamp(x+14,pad,window.innerWidth-w-pad), ny=clamp(y+14,pad,window.innerHeight-h-pad);
  tt.style.left=nx+'px'; tt.style.top=ny+'px';
}
export async function initTooltips(){
  glossary=await loadJSON('./data/glossary.json');
  beginner=await loadJSON('./data/beginner-help.json');
  const tt=ensure(); const h4=tt.querySelector('h4'), p=tt.querySelector('p'); const more=tt.querySelector('#tooltipMore');
  let tQuick=null,tBegin=null,active=null,last=null;
  const hide=()=>{ tt.classList.remove('open'); active=null; if(tQuick) clearTimeout(tQuick); if(tBegin) clearTimeout(tBegin); tQuick=tBegin=null; };
  const showQuick=(term)=>{ const lang=state.getLang(); const rec=glossary.terms[term]; if(!rec) return;
    h4.textContent=rec[lang].title; p.textContent=`${rec[lang].simple} — ${rec[lang].why}`; tt.classList.add('open'); if(last) setPos(tt,last.clientX,last.clientY);
  };
  const showBegin=(term)=>{ if(!shouldBeginner()) return; const lang=state.getLang(); const rec=beginner.terms[term]; if(!rec) return;
    h4.textContent=rec[lang].title; p.textContent=`${rec[lang].simple} ${rec[lang].explain}`; tt.classList.add('open'); if(last) setPos(tt,last.clientX,last.clientY);
  };
  document.addEventListener('mouseover',(e)=>{
    const t=e.target.closest('[data-term]'); if(!t) return; last=e; active=t.dataset.term;
    tQuick=setTimeout(()=>{ if(active===t.dataset.term) showQuick(t.dataset.term); },800);
    tBegin=setTimeout(()=>{ if(active===t.dataset.term) showBegin(t.dataset.term); },(beginner.meta.trigger_delay_seconds||8)*1000);
  });
  document.addEventListener('mousemove',(e)=>{ if(!tt.classList.contains('open')) return; last=e; setPos(tt,e.clientX,e.clientY); });
  document.addEventListener('mouseout',(e)=>{ if(e.target.closest('[data-term]')) hide(); });
  document.addEventListener('click',(e)=>{ if(!tt.classList.contains('open')) return;
    if(e.target && e.target.id==='tooltipMore'){ e.preventDefault(); window.location.href='./education.html'; }
  });
}
