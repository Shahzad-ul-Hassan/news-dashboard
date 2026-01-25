
import { loadJSON } from './utils.js';
import { state } from './state.js';
export async function renderOverview(){
  const wrap=document.getElementById('overview'); if(!wrap) return;
  const data=await loadJSON('./data/overview.json'); const lang=state.getLang();
  const temp=lang==='ur'?data.temperature.ur:data.temperature.en;
  const ce=lang==='ur'?data.temperature.cause_effect_ur:data.temperature.cause_effect_en;
  const insight=lang==='ur'?data.insight.ur:data.insight.en;
  const scNote=lang==='ur'?data.stablecoin_dominance.note_ur:data.stablecoin_dominance.note_en;
  wrap.innerHTML=`<div class="card"><div class="card__inner">
    <h2 data-term="market_temperature">Market Temperature: <span class="tag warn">${temp}</span></h2>
    <div class="muted">${ce}</div>
    <div class="kv" style="margin-top:10px"><b>Conviction</b><span class="tag">${data.temperature.conviction}</span></div>
    <div class="hr"></div>
    <h2 data-term="trend">Trend Snapshot</h2>
    <div class="grid2">
      <div class="kv"><b>Overall Direction</b><span class="tag">${data.trend.direction}</span></div>
      <div class="kv"><b>Market Regime</b><span class="tag">${data.trend.regime}</span></div>
    </div>
    <div class="kv" style="margin-top:10px"><b>Windows</b><span class="tag">${data.trend.windows.join(' | ')}</span></div>
    <div class="hr"></div>
    <h2>Confidence Snapshot</h2>
    ${data.confidence.map(r=>`
      <div class="kv" style="margin-bottom:8px"><b>${r.asset}</b><span class="tag">${r.level}</span></div>
      <div class="muted" style="margin:-2px 0 10px 0">${lang==='ur'?r.why_ur:r.why_en}</div>
      <div class="kv" style="margin-bottom:10px"><b>${lang==='ur'?'سرگرمی کی حد (مارکیٹ توجہ)':'Activity Range (Market Attention)'}</b><span class="tag">${r.activity_range}</span></div>
      <div class="muted" style="margin-top:-6px;margin-bottom:12px">${lang==='ur'?'یہ پیشگوئی یا ٹریڈنگ اشارہ نہیں۔':'Not a prediction or trading signal.'}</div>
    `).join('')}
    <div class="hr"></div>
    <h2>Market Pressure Indicators</h2>
    <div class="grid2">
      <div class="kv"><b>News Pressure</b><span class="tag">${data.pressure.news}</span></div>
      <div class="kv"><b>Liquidity</b><span class="tag">${data.pressure.liquidity}</span></div>
      <div class="kv"><b>Funding Context</b><span class="tag">${data.pressure.funding}</span></div>
      <div class="kv"><b>Volatility</b><span class="tag">${data.pressure.volatility}</span></div>
      <div class="kv"><b>Flows</b><span class="tag">${data.pressure.flows}</span></div>
    </div>
    <div class="hr"></div>
    <h2>Stablecoin Dominance</h2>
    <div class="grid2">
      <div class="kv"><b>USDT</b><span class="tag">${data.stablecoin_dominance.usdt}%</span></div>
      <div class="kv"><b>USDC</b><span class="tag">${data.stablecoin_dominance.usdc}%</span></div>
    </div>
    <div class="kv" style="margin-top:10px"><b>Total</b><span class="tag">${data.stablecoin_dominance.total}%</span></div>
    <div class="muted" style="margin-top:8px">${scNote}</div>
    <div class="hr"></div>
    <h2>Overview Insight</h2>
    <div class="muted">${insight}</div>
  </div></div>`;
}
