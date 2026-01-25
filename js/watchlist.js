
import { loadJSON } from './utils.js';
import { state } from './state.js';
import { i18n } from './i18n.js';
let cached=null;
function setNeedle(el,value){ const deg=-90+(value/100)*180; const n=el.querySelector('.needle'); if(n) n.style.transform=`translate(-50%,-100%) rotate(${deg}deg)`; }
export async function initWatchlist(){
  const sidebar=document.getElementById('sidebar'),toggle=document.getElementById('watchlistToggle');
  if(!sidebar||!toggle) return;
  const open=state.watchlistOpen(); sidebar.classList.toggle('hidden',!open);
  toggle.textContent=open?i18n.t('hideWatchlist'):i18n.t('showWatchlist');
  toggle.onclick=()=>{ const next=!state.watchlistOpen(); state.setWatchlistOpen(next); sidebar.classList.toggle('hidden',!next); toggle.textContent=next?i18n.t('hideWatchlist'):i18n.t('showWatchlist'); };
  if(!cached) cached=await loadJSON('./data/watchlist.json');
  const lang=state.getLang();
  const tabs=document.getElementById('wlTabs'),body=document.getElementById('wlBody'),fg=document.getElementById('fearGreed'),bh=document.getElementById('beginnerHelpBtn');
  if(!tabs||!body||!fg) return;
  tabs.innerHTML='';
  cached.tabs.forEach((t,idx)=>{ const b=document.createElement('button'); b.textContent=t.toUpperCase(); b.className=idx===0?'active':'';
    b.onclick=()=>{ tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderTab(t); };
    tabs.appendChild(b);
  });
  if(bh){
    const mode=state.beginnerHelpMode(); const auto=(mode===null||typeof mode==='undefined'); const on=auto?state.isNewUser():!!mode;
    bh.textContent=`${i18n.t('beginnerHelp')}: ${on?i18n.t('on'):i18n.t('off')}`;
    bh.onclick=()=>{ const cur=state.beginnerHelpMode(); let next; if(cur===null||typeof cur==='undefined') next=false; else if(cur===false) next=true; else next=null;
      state.setBeginnerHelpMode(next); const auto2=(next===null||typeof next==='undefined'); const on2=auto2?state.isNewUser():!!next;
      bh.textContent=`${i18n.t('beginnerHelp')}: ${on2?i18n.t('on'):i18n.t('off')}`;
    };
  }
  function renderTab(tab){
    body.innerHTML='';
    if(tab!=='crypto'){ body.innerHTML='<div class="muted">Placeholder (structure only). Context-only.</div>'; return; }
    cached.crypto_sections.forEach(sec=>{
      const wrap=document.createElement('div');
      wrap.innerHTML=`<div class="sectionTitle"><h3>${sec.title}</h3><span class="tag">${sec.rule}</span></div><div class="rows"></div>`;
      const rows=wrap.querySelector('.rows');
      sec.items.forEach(it=>{
        const r=document.createElement('div'); r.className='row';
        r.innerHTML=`<div><div class="sym">${it.symbol}</div><div class="name">${it.name}</div></div><div class="spark"></div><div class="right"><div class="small">${it.mcap}</div><div class="tag">${it.follow}</div></div>`;
        rows.appendChild(r);
      });
      body.appendChild(wrap);
    });
  }
  renderTab('crypto');
  fg.querySelector('[data-fg-value]').textContent=String(cached.fear_greed.value);
  fg.querySelector('[data-fg-label]').textContent=(lang==='ur'?cached.fear_greed.label_ur:cached.fear_greed.label_en);
  setNeedle(fg,cached.fear_greed.value);
}
