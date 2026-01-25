
import { state } from './state.js';
import { i18n } from './i18n.js';
import { initSessionsButton } from './sessions.js';
import { initWatchlist } from './watchlist.js';
import { initPanels } from './panels.js';
import { initTooltips } from './tooltips.js';
import { renderOverview } from './overview.js';

async function boot(){
  state.init();
  const langBtns=document.querySelectorAll('[data-lang]');
  function apply(l){
    state.setLang(l);
    langBtns.forEach(b=>b.classList.toggle('active',b.dataset.lang===l));
    document.documentElement.lang=(l==='ur'?'ur':'en');
    i18n.apply();
    await initSessionsButton();
    await initWatchlist();
    initPanels();
    await initTooltips();
    await renderOverview();
  }
  langBtns.forEach(b=>b.addEventListener('click',()=>apply(b.dataset.lang)));
  await apply(state.getLang());

  const s=document.getElementById('globalSearch');
  if(s) s.addEventListener('input',()=>{
    const q=s.value.trim().toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(el=>{
      const t=(el.textContent||'').toLowerCase();
      el.style.display=t.includes(q)?'':'none';
    });
  });
}
boot();
