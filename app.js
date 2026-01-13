const $ = (id) => document.getElementById(id);

function escapeHtml(s){
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function fmtNumber(n,d=2){
  if(n===null||n===undefined||Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined,{maximumFractionDigits:d});
}
function fmtPct(n,d=2){
  if(n===null||n===undefined||Number.isNaN(Number(n))) return "—";
  const v=Number(n); const sign=v>0?"+":"";
  return `${sign}${v.toFixed(d)}%`;
}
function clsForChange(v){
  if(v===null||v===undefined||Number.isNaN(Number(v))) return "mid";
  if(v>0) return "good";
  if(v<0) return "bad";
  return "mid";
}
function arrowForTrend(tr){
  if(tr==="bullish") return {a:"↑",cls:"good"};
  if(tr==="bearish") return {a:"↓",cls:"bad"};
  return {a:"→",cls:"mid"};
}
async function loadJson(path){
  const r = await fetch(path, {cache:"no-store"});
  if(!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
}

const state = {
  lang: localStorage.getItem("lang") || "en",
  config:null,
  i18n:{en:{}, ur:{}},
  markets:null,
  news:null,
  signals:null,
  sessions:null,
  watchTab:"crypto",
  filters:{category:"all", impact:"all", q:"", date:""},
  feedCursor:0,
  feedPageSize:25,
  selectedNewsId:null,
  prevPrices: JSON.parse(localStorage.getItem("prevPrices") || "{}")
};

function t(key){
  const d = state.i18n[state.lang] || {};
  return d[key] || (state.i18n.en[key] || key);
}

function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(window.__t);
  window.__t = setTimeout(()=> el.hidden=true, 2400);
}

/* ---------- Market timings ---------- */
function parseTimeHM(hm){ const [h,m]=hm.split(":").map(Number); return {h,m}; }
function getNowInTZ(tz){
  const dt = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false
  }).formatToParts(dt).reduce((a,p)=>{a[p.type]=p.value; return a;},{});

  const y=+parts.year, mo=+parts.month, d=+parts.day, hh=+parts.hour, mm=+parts.minute, ss=+parts.second;
  const asUTC = Date.UTC(y,mo-1,d,hh,mm,ss);
  return {parts, asUTC};
}
function msToHMS(ms){
  ms=Math.max(0,ms);
  const total=Math.floor(ms/1000);
  const h=String(Math.floor(total/3600)).padStart(2,"0");
  const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
  const s=String(total%60).padStart(2,"0");
  return `${h}:${m}:${s}`;
}
function isWeekendInTZ(tz){
  const wd=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"short"}).format(new Date());
  return wd==="Sat"||wd==="Sun";
}

function buildTimingTile(name,tz,openHM,closeHM){
  const now=getNowInTZ(tz);
  const {h:oh,m:om}=parseTimeHM(openHM);
  const {h:ch,m:cm}=parseTimeHM(closeHM);
  const y=+now.parts.year, mo=+now.parts.month, d=+now.parts.day;
  const openUTC=Date.UTC(y,mo-1,d,oh,om,0);
  const closeUTC=Date.UTC(y,mo-1,d,ch,cm,0);

  let status="closed", label="", count="";
  const weekend=isWeekendInTZ(tz);

  if(name==="CRYPTO"){
    status="open"; label="Live 24/7";
  } else if(weekend){
    status="closed"; label="Weekend";
  } else if(now.asUTC<openUTC){
    status="pre_open"; label="Opens in"; count=msToHMS(openUTC-now.asUTC);
  } else if(now.asUTC<closeUTC){
    status="open"; label="Closes in"; count=msToHMS(closeUTC-now.asUTC);
  } else {
    status="closed"; label="Opens in"; count=msToHMS(openUTC+86400000-now.asUTC);
  }

  const st = status==="open"?t("market_open"):(status==="pre_open"?t("market_preopen"):t("market_closed"));

  // ✅ 12-hour AM/PM time
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  }).format(new Date());

  return `<div class="timing-tile">
    <div class="timing-title">${escapeHtml(name)} • <span class="muted">${escapeHtml(st)}</span></div>
    <div class="timing-sub">${escapeHtml(tz)} • ${escapeHtml(timeStr)}</div>
    <div class="timing-count">${escapeHtml(label)}${count?(" "+escapeHtml(count)):""}</div>
  </div>`;
}

function renderTimings(){
  const ms = state.config.market_sessions;
  $("timings").innerHTML = [
    buildTimingTile("NEW YORK", ms.NY.tz, ms.NY.open, ms.NY.close),
    buildTimingTile("TOKYO", ms.TYO.tz, ms.TYO.open, ms.TYO.close),
    buildTimingTile("SYDNEY", ms.SYD.tz, ms.SYD.open, ms.SYD.close),
    buildTimingTile("PAKISTAN", ms.PK.tz, ms.PK.open, ms.PK.close),
    buildTimingTile("CRYPTO", ms.CRYPTO.tz, ms.CRYPTO.open, ms.CRYPTO.close)
  ].join("");
}

/* ---------- Rates strip + tick ---------- */
function renderRatesStrip(){
  const items = state.markets?.items || [];

  const wanted = [
    "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT",
    "^GSPC","^NDX","^DJI",
    "USD/PKR","EUR/USD","GBP/USD","USD/JPY","AUD/USD","USD/CAD"
  ];

  const picked = wanted.map(w => items.find(x => x.symbol === w)).filter(Boolean);
  const final = picked.length ? picked : items.slice(0, 16);

  $("ratesStrip").innerHTML = final.map(it=>{
    const chg = it.change_pct_24h ?? it.change_pct_1d ?? 0;
    const cls = clsForChange(chg);
    const ar = arrowForTrend(it.trend);

    // ✅ tick class from previous price
    const symKey = it.symbol;
    const prev = state.prevPrices[symKey];
    let tickCls = "";
    if(prev !== undefined){
      if(it.price > prev) tickCls = "tick-up";
      else if(it.price < prev) tickCls = "tick-down";
    }
    state.prevPrices[symKey] = it.price;

    return `<a class="rate-chip" href="${escapeHtml(it.source_url||"#")}" target="_blank" rel="noreferrer">
      <span class="rate-name">${escapeHtml(it.display||it.symbol)}</span>
      <span class="rate-price price-tick ${tickCls}">${escapeHtml(fmtNumber(it.price, 6))}</span>
      <span class="rate-chg ${cls}">${escapeHtml(fmtPct(chg,2))}</span>
      <span class="rate-arrow arrow ${ar.cls}">${ar.a}</span>
    </a>`;
  }).join("");

  localStorage.setItem("prevPrices", JSON.stringify(state.prevPrices));
}

/* ---------- Watchlist ---------- */
function setWatchTab(tab){
  state.watchTab=tab;
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  renderWatchlist();
}

function renderWatchlist(){
  const syms = state.config.watchlist_defaults[state.watchTab] || [];
  const items = state.markets?.items||[];
  const list = syms.map(s=>items.find(x=>x.symbol===s)).filter(Boolean);

  $("wlHint").textContent = (state.lang==="ur")
    ? "نوٹ: فری ڈیٹا میں کچھ مارکیٹس میں تاخیر ہو سکتی ہے۔"
    : "Note: Free data may be delayed for some markets.";

  $("watchlist").innerHTML = list.map(it=>{
    const chg = it.change_pct_24h ?? it.change_pct_1d ?? 0;
    const cls = clsForChange(chg);
    const ar = arrowForTrend(it.trend);

    const symKey = it.symbol;
    const prev = state.prevPrices[symKey];
    let tickCls = "";
    if(prev !== undefined){
      if(it.price > prev) tickCls = "tick-up";
      else if(it.price < prev) tickCls = "tick-down";
    }
    state.prevPrices[symKey] = it.price;

    const vol = it.volume_label ? (it.volume_label==="high"?t("volume_high"):(it.volume_label==="low"?t("volume_low"):t("volume_normal"))) : "";

    return `<div class="card">
      <div class="row">
        <div>
          <div style="font-weight:800">${escapeHtml(it.display||it.symbol)}</div>
          <div class="muted small">${escapeHtml(it.symbol)}</div>
        </div>
        <div style="text-align:right">
          <div class="mono price-tick ${tickCls}">${escapeHtml(fmtNumber(it.price, 6))}</div>
          <div class="${cls} small"><span class="arrow ${ar.cls}">${ar.a}</span> ${escapeHtml(fmtPct(chg,2))}</div>
        </div>
      </div>
      <div class="kv">
        ${vol?`<div class="kvitem small">${escapeHtml(vol)}</div>`:""}
        <div class="kvitem small">${escapeHtml((it.last_update_utc||"").replace("T"," ").replace("Z"," UTC"))}</div>
        <a class="kvitem small" href="${escapeHtml(it.source_url||"#")}" target="_blank" rel="noreferrer">Open</a>
      </div>
    </div>`;
  }).join("");

  localStorage.setItem("prevPrices", JSON.stringify(state.prevPrices));
}

/* ---------- News feed ---------- */
function impactBadge(tag){
  const cls = tag||"low";
  return `<span class="badge ${cls}">${escapeHtml((tag||"low").toUpperCase())}</span>`;
}
function categoryLabel(cat){
  const map = {
    crypto: state.lang==="ur"?"کرپٹو":"Crypto",
    stocks_macro: state.lang==="ur"?"اسٹاک/میکرو":"Stocks/Macro",
    usa_decisions: state.lang==="ur"?"یو ایس فیصلے":"USA Decisions"
  };
  return map[cat]||cat;
}
function applyNewsFilters(items){
  const {category, impact, q}=state.filters;
  const query=(q||"").trim().toLowerCase();
  return items.filter(it=>{
    if(category!=="all" && it.category!==category) return false;
    if(impact!=="all" && it.impact_tag!==impact) return false;
    if(query){
      const text=[it.title_en,it.title_ur,(it.keywords||[]).join(" "),it.source_name,(it.linked_assets||[]).join(" ")].join(" ").toLowerCase();
      if(!text.includes(query)) return false;
    }
    return true;
  });
}
function renderNewsFeed(reset=false){
  const container=$("newsFeed");
  const all=state.news?.items||[];
  const items=applyNewsFilters(all);

  if(reset){ state.feedCursor=0; container.innerHTML=""; }
  const slice=items.slice(state.feedCursor, state.feedCursor+state.feedPageSize);
  state.feedCursor += slice.length;

  const html = slice.map(it=>{
    const title = state.lang==="ur"?it.title_ur:it.title_en;
    const summary = state.lang==="ur"?it.summary_ur:it.summary_en;
    const why = state.lang==="ur"?it.why_it_matters_ur:it.why_it_matters_en;
    const watch = state.lang==="ur"?it.what_to_watch_ur:it.what_to_watch_en;
    const time = it.published_at_pkt || it.published_at_utc;
    const cat = categoryLabel(it.category);
    const selected = state.selectedNewsId===it.id;

    return `<div class="card" id="card_${escapeHtml(it.id)}" style="${selected?"outline:2px solid rgba(255,255,255,.18)":""}">
      <div class="row">
        <div style="flex:1">
          <h3 class="news-title">${escapeHtml(title||"—")}</h3>
          <div class="muted small">
            ${impactBadge(it.impact_tag)} <span class="badge">${escapeHtml(cat)}</span>
            <span class="muted">•</span> ${escapeHtml(time||"—")}
          </div>
        </div>
        <div style="text-align:right">
          <button class="btn small" type="button" data-news="${escapeHtml(it.id)}">${state.lang==="ur"?"سگنل دیکھیں":"Open Impact"}</button>
        </div>
      </div>

      <ul class="news-lines">
        ${(summary||[]).slice(0,7).map(l=>`<li>${escapeHtml(l)}</li>`).join("")}
      </ul>

      <div class="kv">
        <div class="kvitem"><b>${escapeHtml(t("why_it_matters"))}:</b> ${escapeHtml(why||"—")}</div>
        <div class="kvitem"><b>${escapeHtml(t("what_to_watch"))}:</b> ${escapeHtml(watch||"—")}</div>
      </div>

      <div class="links" style="margin-top:10px">
        <a class="link" href="${escapeHtml(it.source_url||it.original_url||"#")}" target="_blank" rel="noreferrer">${escapeHtml((state.lang==="ur"?"ریفرنس":"Reference")+": "+(it.source_name||"Source"))}</a>
        <a class="link" href="${escapeHtml(it.original_url||"#")}" target="_blank" rel="noreferrer">${escapeHtml(state.lang==="ur"?"اصل لنک":"Original Link")}</a>
        ${(it.linked_assets||[]).slice(0,8).map(a=>`<span class="badge">${escapeHtml(a)}</span>`).join("")}
      </div>
    </div>`;
  }).join("");

  container.insertAdjacentHTML("beforeend", html);
  container.querySelectorAll("button[data-news]").forEach(btn=>{ btn.onclick=()=>selectNews(btn.dataset.news); });

  const remaining = items.length - state.feedCursor;
  $("btnLoadMore").disabled = remaining<=0;
  $("btnLoadMore").textContent = remaining>0 ? (state.lang==="ur"?"مزید لوڈ کریں":"Load more") : (state.lang==="ur"?"مزید کچھ نہیں":"No more");
}

/* ---------- Signals + sessions ---------- */
function renderSignals(){
  const active=state.signals?.active||[];
  const closed=state.signals?.closed||[];
  const newsMap=new Map((state.news?.items||[]).map(n=>[n.id,n]));

  $("signalsActive").innerHTML = active.slice(0,8).map(sig=>{
    const ar = sig.bias==="bullish"?{a:"↑",cls:"good"}:sig.bias==="bearish"?{a:"↓",cls:"bad"}:{a:"→",cls:"mid"};
    const r = sig.expected_move_pct_range;
    const exp = `${fmtPct(r.low,1)} → ${fmtPct(r.high,1)}`;
    const reason = state.lang==="ur"?sig.reason_ur:sig.reason_en;
    const linked=newsMap.get(sig.news_id);
    const title = linked ? (state.lang==="ur"?linked.title_ur:linked.title_en) : "";

    return `<div class="card" style="cursor:pointer" data-newsid="${escapeHtml(sig.news_id||"")}">
      <div class="row">
        <div>
          <div style="font-weight:900">${escapeHtml(sig.asset)} <span class="arrow ${ar.cls}">${ar.a}</span></div>
          <div class="muted small">${escapeHtml(title)}</div>
        </div>
        <div style="text-align:right">
          <div class="badge">${escapeHtml(t("expected_move"))}: ${escapeHtml(exp)}</div>
          <div class="muted small">${escapeHtml(t("confidence"))}: ${escapeHtml(sig.confidence_pct+"%")}</div>
        </div>
      </div>
      <div class="muted small" style="margin-top:8px">${escapeHtml(reason||"")}</div>
    </div>`;
  }).join("") || `<div class="muted small">${escapeHtml(state.lang==="ur"?"کوئی فعال سگنل موجود نہیں۔":"No active signals.")}</div>`;

  $("signalsClosed").innerHTML = closed.slice(0,12).map(sig=>{
    const res = sig.result || "partial";
    const badge = res==="played_out"?"✅":res==="failed"?"❌":"⚠️";
    const r=sig.expected_move_pct_range;
    const exp=`${fmtPct(r.low,1)} → ${fmtPct(r.high,1)}`;
    const act=fmtPct(sig.actual_move_pct,1);
    return `<div class="card"><div class="row"><div style="font-weight:900">${badge} ${escapeHtml(sig.asset)}</div><div class="muted small">${escapeHtml(act)} (${escapeHtml(exp)})</div></div></div>`;
  }).join("") || `<div class="muted small">${escapeHtml(state.lang==="ur"?"ابھی کوئی ویلیڈیشن نہیں۔":"No validations yet.")}</div>`;

  $("signalsActive").querySelectorAll("[data-newsid]").forEach(el=> el.onclick=()=>{ if(el.dataset.newsid) selectNews(el.dataset.newsid,true); });
}

function renderSessions(){
  const ss=state.sessions?.sessions||[];
  $("sessions").innerHTML = ss.map(s=>{
    const label = s.status==="open"?t("market_open"):(s.status==="pre_open"?t("market_preopen"):t("market_closed"));
    const rows=(s.windows||[]).map(w=>`<div class="card" style="background:rgba(18,24,38,.65)">
      <div class="row"><div><b>${escapeHtml(s.market)}</b> • ${escapeHtml(label)} • ${escapeHtml(w.hours+"h")}</div><div class="muted small">${escapeHtml(fmtPct(w.net_move_pct,2))}</div></div>
      <div class="muted small" style="margin-top:6px">${escapeHtml(state.lang==="ur"?w.reason_ur:w.reason_en)}</div>
    </div>`).join("");
    return `<div class="card">
      <div class="row"><div><div style="font-weight:900">${escapeHtml(s.market)} • ${escapeHtml(s.asset_proxy||"")}</div><div class="muted small">${escapeHtml(label)}</div></div></div>
      <div style="margin-top:10px">${rows || `<div class="muted small">${escapeHtml(state.lang==="ur"?"اوپن کے بعد رجحان ظاہر ہوگا۔":"Trends will appear after open.")}</div>`}</div>
    </div>`;
  }).join("") || `<div class="muted small">${escapeHtml(state.lang==="ur"?"سیشن ڈیٹا موجود نہیں۔":"No session data.")}</div>`;
}

/* ---------- Selection ---------- */
function selectNews(newsId, scrollTo=false){
  state.selectedNewsId=newsId;
  document.querySelectorAll('[id^="card_"]').forEach(el=> el.style.outline="");
  const el=$(`card_${newsId}`);
  if(el){
    el.style.outline="2px solid rgba(255,255,255,.18)";
    if(scrollTo) el.scrollIntoView({behavior:"smooth",block:"start"});
  }
  toast(state.lang==="ur"?"منتخب خبر کا امپیکٹ دکھایا گیا۔":"Showing impact for selected news.");
}

/* ---------- Filters / lang ---------- */
function bindFilters(){
  $("filterCategory").onchange = (e)=>{ state.filters.category=e.target.value; renderNewsFeed(true); };
  $("filterImpact").onchange = (e)=>{ state.filters.impact=e.target.value; renderNewsFeed(true); };
  $("globalSearch").oninput = (e)=>{ state.filters.q=e.target.value; renderNewsFeed(true); };

  $("btnClearFilters").onclick = async ()=>{
    state.filters={category:"all",impact:"all",q:"",date:""};
    $("filterCategory").value="all";
    $("filterImpact").value="all";
    $("filterDate").value="";
    $("globalSearch").value="";
    $("modeBadge").hidden=true;
    await loadLatest();
  };

  $("filterDate").onchange = async (e)=>{
    const val=e.target.value;
    state.filters.date=val;
    if(!val){ $("modeBadge").hidden=true; await loadLatest(); return; }
    $("modeBadge").hidden=false;
    await loadArchiveDate(val);
  };

  $("btnLoadMore").onclick = ()=> renderNewsFeed(false);
}

function setLang(lang){
  state.lang=lang;
  localStorage.setItem("lang",lang);

  $("btnLangEn").classList.toggle("active",lang==="en");
  $("btnLangUr").classList.toggle("active",lang==="ur");

  $("globalSearch").placeholder = lang==="ur" ? "نیوز تلاش کریں (Fed, BTC, CPI...)" : "Search news (Fed, BTC, CPI, USD/PKR...)";
  $("wlTitle").textContent = lang==="ur" ? "واچ لسٹ" : "Watchlist";
  $("sigTitle").textContent = lang==="ur" ? "فعال سگنلز" : "Active Signals";
  $("sessTitle").textContent = lang==="ur" ? "سیشن رجحان" : "Session Trend";
  $("valTitle").textContent = lang==="ur" ? "ویلیڈیشن" : "Impact Validation";
  $("btnClearFilters").textContent = lang==="ur" ? "صاف کریں" : "Clear";
  $("btnLoadMore").textContent = lang==="ur" ? "مزید لوڈ کریں" : "Load more";

  renderTimings();
  renderRatesStrip();
  renderWatchlist();
  renderSignals();
  renderSessions();
  renderNewsFeed(true);
}

/* ---------- Loaders ---------- */
async function loadLatest(){
  try{
    const [cfg, mk, nw, sg, ss] = await Promise.all([
      loadJson("data/config.json"),
      loadJson("data/markets_latest.json"),
      loadJson("data/news_latest.json"),
      loadJson("data/signals_latest.json"),
      loadJson("data/sessions_latest.json"),
    ]);
    state.config=cfg;
    state.markets=mk;
    state.news=nw;
    state.signals=sg;
    state.sessions=ss;

    $("lastUpdated").textContent = (state.lang==="ur"?"آخری اپڈیٹ: ":"Last updated: ")
      + ((nw.generated_at_utc||mk.generated_at_utc||"").replace("T"," ").replace("Z"," UTC"));

    renderTimings();
    renderRatesStrip();
    renderWatchlist();
    renderSignals();
    renderSessions();
    renderNewsFeed(true);
  }catch(e){
    console.error(e);
    toast(state.lang==="ur"?"ڈیٹا لوڈ نہیں ہو سکا۔":"Failed to load data.");
  }
}

async function loadArchiveDate(ymd){
  try{
    const nw = await loadJson(`archive/news/${ymd}.json`);
    state.news = nw;
    $("lastUpdated").textContent = (state.lang==="ur"?"آرکائیو تاریخ: ":"Archive date: ")+ymd;
    renderNewsFeed(true);
    toast(state.lang==="ur"?"آرکائیو خبریں لوڈ ہو گئیں۔":"Archive news loaded.");
  }catch(e){
    console.error(e);
    toast(state.lang==="ur"?"اس تاریخ کی فائل موجود نہیں۔":"No archive file for this date.");
  }
}

async function init(){
  try{
    state.i18n.en = await loadJson("i18n/en.json");
    state.i18n.ur = await loadJson("i18n/ur.json");
  }catch(_){}

  document.querySelectorAll(".tab").forEach(btn=> btn.onclick=()=>setWatchTab(btn.dataset.tab));

  $("btnCollapseLeft").onclick = ()=>{
    const el=$("leftSidebar");
    if(el.style.display==="none"){
      el.style.display="";
      toast(state.lang==="ur"?"واچ لسٹ دکھا دی گئی۔":"Watchlist shown.");
    } else {
      el.style.display="none";
      toast(state.lang==="ur"?"واچ لسٹ چھپا دی گئی۔":"Watchlist hidden.");
    }
  };

  $("btnLangEn").onclick = ()=>setLang("en");
  $("btnLangUr").onclick = ()=>setLang("ur");

  bindFilters();
  await loadLatest();
  setLang(state.lang);

  // update countdown clocks
  setInterval(renderTimings, 5000);

  // ✅ refresh markets every 30s for live-feel ticks
  setInterval(async ()=>{
    try{
      const mk = await loadJson("data/markets_latest.json");
      state.markets = mk;
      renderRatesStrip();
      renderWatchlist();
    }catch(_){}
  }, 30000);
}

init();
