let LANG = "en";
let NEWS_LIMIT = 12;

const $ = (id) => document.getElementById(id);

function safeText(s){ return (s ?? "").toString(); }

function to12h(timeHHMM){
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatPKTFromISO(iso){
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function flash(el, cls){
  el.classList.remove("price-up","price-down");
  if(cls) el.classList.add(cls);
  setTimeout(()=> el.classList.remove("price-up","price-down"), 650);
}

async function loadJSON(path){
  const url = `${path}?v=${Date.now()}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Fetch failed ${path}: ${r.status}`);
  return await r.json();
}

/* ===== Language handling ===== */
function setLang(newLang){
  LANG = newLang;
  const en = $("btnLangEn"), ur = $("btnLangUr");
  if(LANG === "ur"){
    ur.classList.add("active"); en.classList.remove("active");
    document.documentElement.lang = "ur";
    document.documentElement.dir = "rtl";
  } else {
    en.classList.add("active"); ur.classList.remove("active");
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }
}

/* ===== Session Status (Open/Pre-Open/Closed) ===== */
function nowInTZ(tz){
  // returns "HH:MM" in that timezone
  const s = new Date().toLocaleString("en-GB", { timeZone: tz, hour12:false, hour:"2-digit", minute:"2-digit" });
  return s;
}
function hmToMin(hm){
  const [h,m] = hm.split(":").map(Number);
  return h*60 + m;
}
function sessionStatus(tz, open, close){
  const nowHM = nowInTZ(tz);
  const now = hmToMin(nowHM);
  const o = hmToMin(open);
  const c = hmToMin(close);

  // crypto (00:00–23:59) always open
  if(o === 0 && c >= 1439) return "OPEN";

  // normal same-day sessions
  if(now >= o && now <= c) return "OPEN";
  if(now >= (o - 60) && now < o) return "PRE-OPEN";
  return "CLOSED";
}

function renderSessions(cfg){
  const host = $("timings");
  host.innerHTML = "";
  const sessions = cfg.market_sessions || {};

  Object.entries(sessions).forEach(([key, s]) => {
    const st = sessionStatus(s.tz, s.open, s.close);

    const tile = document.createElement("div");
    tile.className = "timing-tile";
    tile.innerHTML = `
      <div class="timing-title">${key} <span style="opacity:.8">(${st})</span></div>
      <div class="timing-time">${to12h(s.open)} — ${to12h(s.close)}</div>
      <div class="timing-sub">${s.tz}</div>
    `;
    host.appendChild(tile);
  });
}

/* ===== News ===== */
function applyNewsFilters(items){
  const q = safeText($("globalSearch").value).toLowerCase().trim();
  const cat = $("filterCategory").value;
  const imp = $("filterImpact").value;
  const dt = $("filterDate").value;

  return items.filter(n => {
    if(cat !== "all" && n.category !== cat) return false;
    if(imp !== "all" && n.impact_tag !== imp) return false;

    if(dt){
      const pkt = safeText(n.published_at_pkt);
      if(!pkt.startsWith(dt)) return false;
    }

    if(q){
      const hay = [
        n.title_en, n.title_ur,
        ...(n.summary_en || []),
        ...(n.summary_ur || [])
      ].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function impactBadge(tag){
  const t = (tag || "low").toLowerCase();
  const label = t.toUpperCase();
  const cls = t === "high" ? "down" : (t === "medium" ? "" : "up");
  // use existing CSS colors: up/down
  return `<span class="rate-chg ${cls}" style="margin-left:10px">${label}</span>`;
}

function renderNews(items){
  const host = $("news");
  host.innerHTML = "";

  const shown = items.slice(0, NEWS_LIMIT);

  shown.forEach(n => {
    const title = (LANG === "ur") ? n.title_ur : n.title_en;
    const summary = (LANG === "ur") ? (n.summary_ur || []) : (n.summary_en || []);

    const cleanSummary = summary.filter(line => safeText(line).trim().length > 0);

    const card = document.createElement("div");
    card.className = "news-item";
    card.innerHTML = `
      <h4>${safeText(title)}</h4>
      <small>
        ${formatPKTFromISO(n.published_at_pkt || n.published_at_utc)}
        ${impactBadge(n.impact_tag)}
        <span style="margin-left:10px;opacity:.8">Ref: ${safeText(n.source_name)}</span>
      </small>
      <ul>${cleanSummary.map(s => `<li>${safeText(s)}</li>`).join("")}</ul>
      <a href="${n.original_url}" target="_blank" rel="noopener">Open source</a>
    `;
    host.appendChild(card);
  });

  $("btnLoadMore").style.display = (items.length > NEWS_LIMIT) ? "inline-block" : "none";
}

/* ===== Markets / Movers / Watchlist ===== */
let CFG=null, MARKETS_JSON=null, NEWS_JSON=null;

function getPct(it){
  if(it.type === "crypto") return Number(it.change_pct_24h ?? 0);
  return Number(it.change_pct_1d ?? 0);
}
function trendClass(it){
  const t = it.trend || (getPct(it) > 0 ? "bullish" : (getPct(it) < 0 ? "bearish":"sideways"));
  if(t === "bullish") return "trend-up";
  if(t === "bearish") return "trend-down";
  return "";
}

function renderTopRatesStrip(markets){
  const host = $("ratesStrip");
  host.innerHTML = "";

  // Show key indices + Gold + top crypto pair
  const pick = ["^GSPC","XAUUSD","BTCUSDT","ETHUSDT","^NDX","OIL"];
  const map = new Map((markets.items || []).map(x => [x.symbol, x]));

  pick.forEach(sym => {
    const it = map.get(sym);
    if(!it) return;

    const pct = getPct(it);
    const up = pct >= 0;

    const chip = document.createElement("div");
    chip.className = "rate-chip " + trendClass(it);
    chip.innerHTML = `
      <span class="rate-sym">${it.display || sym}</span>
      <span class="rate-price" data-sym="${sym}">${Number(it.price ?? 0).toLocaleString()}</span>
      <span class="rate-chg ${up ? "up":"down"}">
        ${up ? "+" : ""}${pct.toFixed(2)}%
      </span>
    `;
    host.appendChild(chip);
  });
}

function renderMovers(markets){
  // movers: top absolute changes (crypto + stocks + commodities)
  const items = (markets.items || [])
    .filter(it => it.type === "crypto" || it.type === "stock" || it.type === "commodity")
    .map(it => ({...it, _pct: getPct(it)}));

  items.sort((a,b) => Math.abs(b._pct) - Math.abs(a._pct));

  const top = items.slice(0, 12); // show more like earlier

  // append movers just under rates strip (reuse watchlist container visually)
  // We will show in left watchlist top area by mixing in renderWatchlist
  return top;
}

function renderWatchlist(markets, tab){
  const host = $("watchlist");
  host.innerHTML = "";

  const movers = renderMovers(markets);
  const moverSet = new Set(movers.map(x => x.symbol));

  // If user is on crypto tab, show movers first then tab list
  const all = (markets.items || []).filter(it => it.type === tab);
  const list = [...movers.filter(x => x.type === tab), ...all.filter(x => !moverSet.has(x.symbol))];

  list.forEach(it => {
    const pct = getPct(it);
    const up = pct >= 0;

    const row = document.createElement("div");
    row.className = "rate-chip " + trendClass(it);
    row.innerHTML = `
      <span class="rate-sym">${it.display || it.symbol}</span>
      <span class="rate-price">${Number(it.price ?? 0).toLocaleString()}</span>
      <span class="rate-chg ${up ? "up":"down"}">${up?"+":""}${pct.toFixed(2)}%</span>
    `;
    host.appendChild(row);
  });
}

/* ===== Boot ===== */
async function boot(){
  try{
    CFG = await loadJSON("data/config.json");
    renderSessions(CFG);

    MARKETS_JSON = await loadJSON("data/markets_latest.json");
    NEWS_JSON = await loadJSON("data/news_latest.json");

    renderTopRatesStrip(MARKETS_JSON);

    // default language from cfg
    setLang(CFG.default_language || "en");

    // initial watchlist: crypto
    renderWatchlist(MARKETS_JSON, "crypto");

    // news
    renderNews(applyNewsFilters(NEWS_JSON.items || []));

    // events
    $("btnLangEn").onclick = () => { setLang("en"); renderNews(applyNewsFilters(NEWS_JSON.items||[])); };
    $("btnLangUr").onclick = () => { setLang("ur"); renderNews(applyNewsFilters(NEWS_JSON.items||[])); };

    $("globalSearch").addEventListener("input", () => { NEWS_LIMIT=12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterCategory").addEventListener("change", () => { NEWS_LIMIT=12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterImpact").addEventListener("change", () => { NEWS_LIMIT=12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterDate").addEventListener("change", () => { NEWS_LIMIT=12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });

    $("btnClear").onclick = () => {
      $("globalSearch").value = "";
      $("filterCategory").value = "all";
      $("filterImpact").value = "all";
      $("filterDate").value = "";
      NEWS_LIMIT = 12;
      renderNews(applyNewsFilters(NEWS_JSON.items||[]));
    };

    $("btnLoadMore").onclick = () => {
      NEWS_LIMIT += 12;
      renderNews(applyNewsFilters(NEWS_JSON.items||[]));
    };

    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderWatchlist(MARKETS_JSON, btn.dataset.tab);
      });
    });

  }catch(e){
    console.error(e);
    const host = $("news");
    if(host) host.innerHTML = `<div class="news-item"><h4>App error</h4><ul><li>${safeText(e.message)}</li></ul></div>`;
  }
}

boot();
