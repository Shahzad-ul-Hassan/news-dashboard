
import { i18n } from './i18n.js';
export function initPanels(){
  const overlay=document.getElementById('drawerOverlay'),drawer=document.getElementById('drawer'),title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');
  const close=document.getElementById('drawerClose'),mapBtn=document.getElementById('marketMapBtn'),ctxBtn=document.getElementById('contextBtn');
  if(!overlay||!drawer||!title||!body||!close) return;
  const open=(kind)=>{
    overlay.classList.add('open'); drawer.classList.add('open');
    if(kind==='map'){
      title.textContent=i18n.t('marketMap');
      body.innerHTML=`<div class="card"><div class="card__inner">
        <h2>Market Map Tools</h2>
        <p class="muted">Heatmap / Bubble-style crowd view (tamed) + History tab + Session Edge Meter at the bottom.<br><br><b>Note:</b> Context-only. No signals.</p>
        <div class="hr"></div>
        <div class="kv"><b data-term="market_position_map">Market Position Map</b><span class="tag warn">Context</span></div>
        <div class="hr"></div>
        <div class="kv"><b data-term="session_edge">Session Edge Meter</b><span class="tag">Low / Moderate / High</span></div>
      </div></div>`;
    }else{
      title.textContent=i18n.t('context');
      body.innerHTML=`<div class="card"><div class="card__inner">
        <h2>Market Context Stack</h2>
        <p class="muted">Liquidity + Institutional + Funding + Volatility + Correlation + Macro context (no levels, no signals).</p>
        <div class="hr"></div>
        <div class="kv"><b data-term="liquidity_interest_zones">Liquidity Interest Map</b><span class="tag">Zones only</span></div>
        <div class="hr"></div>
        <div class="kv"><b data-term="liquidity_depth">Liquidity Depth Snapshot</b><span class="tag">Abstract</span></div>
        <div class="hr"></div>
        <div class="kv"><b data-term="institutional_activity_zones">Institutional Activity Zones</b><span class="tag">Historical</span></div>
        <div class="hr"></div>
        <div class="kv"><b data-term="macro_events">Macro Events</b><span class="tag warn">PKT</span></div>
      </div></div>`;
    }
  };
  const closeAll=()=>{ overlay.classList.remove('open'); drawer.classList.remove('open'); };
  overlay.onclick=closeAll; close.onclick=closeAll;
  if(mapBtn) mapBtn.onclick=()=>open('map');
  if(ctxBtn) ctxBtn.onclick=()=>open('ctx');
}
