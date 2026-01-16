/* ========= Helpers ========= */
let LANG = "en";
let NEWS_LIMIT = 12;

const $ = (id) => document.getElementById(id);

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

function safeText(s){ return (s ?? "").toString(); }

function flash(el, cls){
  el.classList.remove("price-up","price-down");
  if(cls) el.classList.add(cls);
  setTimeout(()=> el.classList.remove("price-up","price-down"), 650);
}

/* ========= Load JSON ========= */
async function loadJSON(path){
  const url = `${path}?v=${Date.now()}`; // cache-bust
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Fetch failed ${path}: ${r.status}`);
  return await r.json();
}

/* ========= Sessions (Top) ========= */
function renderSessions(cfg){
  const host = $("timings");
  host.innerHTML = "";
  const sessions = cfg.market_sessions || {};

  Object.entries(sessions).forEach(([key, s]) => {
    const tile = document.createElement("div");
    tile.className = "timing-tile";
    tile.innerHTML = `
      <div class="timing-title">${key}</div>
      <div class="timing-time">${to12h(s.open)} — ${to12h(s.close)}</div>
      <div class="timing-sub">${s.tz}</div>
    `;
    host.appendChild(tile);
  });
}

/* ========= News ========= */
function applyNewsFilters(items){
  const q = safeText($("globalSearch").value).toLowerCase().trim();
  const cat = $("filterCategory").value;
  const imp = $("filterImpact").value;
  const dt = $("filterDate").value; // yyyy-mm-dd

  return items.filter(n => {
    if(cat !== "all" && n.category !== cat) return false;
    if(imp !== "all" && n.impact_tag !== imp) return false;

    if(dt){
      // compare PKT date
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

function renderNews(items){
  const host = $("news");
  host.innerHTML = "";

  const shown = items.slice(0, NEWS_LIMIT);

  shown.forEach(n => {
    const title = (LANG === "ur") ? n.title_ur : n.title_en;
    const summary = (LANG === "ur") ? (n.summary_ur || []) : (n.summary_en || []);

    // ✅ آپ کی شرط: “آگے کیا دیکھیں / follow-up…” والی auto لائنیں show نہ ہوں
    const cleanSummary = summary.filter(line => {
      const t = safeText(line).toLowerCase();
      if(t.includes("watch market reaction")) return false;
      if(t.includes("follow-up")) return false;
      if(t.includes("فالو اَپ")) return false;
      if(t.includes("ردِعمل")) return false;
      return safeText(line).trim().length > 0;
    });

    const card = document.createElement("div");
    card.className = "news-item";
    card.innerHTML = `
      <h4>${safeText(title)}</h4>
      <small>${formatPKTFromISO(n.published_at_pkt || n.published_at_utc)}</small>
      <ul>${cleanSummary.map(s => `<li>${safeText(s)}</li>`).join("")}</ul>
      <a href="${n.original_url}" target="_blank" rel="noopener">Open source</a>
    `;
    host.appendChild(card);
  });

  $("btnLoadMore").style.display = (items.length > NEWS_LIMIT) ? "inline-block" : "none";
}

/* ========= Watchlist + Live Crypto ========= */
let CFG = null;
let MARKETS_JSON = null;
let NEWS_JSON = null;

function renderWatchlistFromMarkets(markets, tab){
  const host = $("watchlist");
  host.innerHTML = "";

  const items = (markets.items || []).filter(it => it.type === tab);

  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "rate-chip";

    const sym = document.createElement("div");
    sym.className = "rate-sym";
    sym.textContent = it.display || it.symbol;

    const price = document.createElement("div");
    price.className = "rate-price";
    price.textContent = (it.price ?? "").toString();

    const chg = document.createElement("div");
    let pct = it.change_pct_24h ?? it.change_pct_1d ?? 0;
    const up = pct >= 0;
    chg.className = "rate-chg " + (up ? "up" : "down");
    chg.textContent = `${up ? "+" : ""}${Number(pct).toFixed(2)}%`;

    row.appendChild(sym);
    row.appendChild(price);
    row.appendChild(chg);
    host.appendChild(row);
  });
}

function renderTopRatesStrip(markets){
  const host = $("ratesStrip");
  host.innerHTML = "";

  const pick = ["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT"];
  const map = new Map((markets.items || []).map(x => [x.symbol, x]));
  pick.forEach(sym => {
    const it = map.get(sym);
    if(!it) return;
    const chip = document.createElement("div");
    chip.className = "rate-chip";
    chip.innerHTML = `
      <span class="rate-sym">${it.display || sym}</span>
      <span class="rate-price" data-sym="${sym}">${Number(it.price).toLocaleString()}</span>
      <span class="rate-chg ${(it.change_pct_24h ?? 0) >= 0 ? "up":"down"}">
        ${(it.change_pct_24h ?? 0) >= 0 ? "+" : ""}${Number(it.change_pct_24h ?? 0).toFixed(2)}%
      </span>
    `;
    host.appendChild(chip);
  });
}

/* Live crypto from CoinGecko every 6s */
const SYM_TO_CG = {
  "BTCUSDT":"bitcoin",
  "ETHUSDT":"ethereum",
  "SOLUSDT":"solana",
  "BNBUSDT":"binancecoin",
  "XRPUSDT":"ripple",
  "ADAUSDT":"cardano",
  "DOGEUSDT":"dogecoin",
  "AVAXUSDT":"avalanche-2",
  "LINKUSDT":"chainlink",
  "MATICUSDT":"polygon-ecosystem-token",
  "DOTUSDT":"polkadot",
  "TRXUSDT":"tron",
  "LTCUSDT":"litecoin",
  "BCHUSDT":"bitcoin-cash",
  "UNIUSDT":"uniswap",
  "ATOMUSDT":"cosmos",
  "ICPUSDT":"internet-computer",
  "FILUSDT":"filecoin",
  "APTUSDT":"aptos",
  "ARBUSDT":"arbitrum"
};

async function liveCryptoTick(){
  if(!CFG) return;
  const wanted = (CFG.watchlist_defaults?.crypto || []).slice(0, 20);
  const ids = wanted.map(s => SYM_TO_CG[s]).filter(Boolean).join(",");
  if(!ids) return;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
  const r = await fetch(url);
  if(!r.ok) return;
  const data = await r.json();

  // Update markets json in-memory + UI chips
  const items = MARKETS_JSON?.items || [];
  const mapBySym = new Map(items.map(x => [x.symbol, x]));

  wanted.forEach(sym => {
    const id = SYM_TO_CG[sym];
    const px = data?.[id]?.usd;
    if(typeof px !== "number") return;

    const it = mapBySym.get(sym);
    if(it){
      const old = Number(it.price || 0);
      it.price = px;

      // update strip element if exists
      document.querySelectorAll(`.rate-price[data-sym="${sym}"]`).forEach(el => {
        const oldEl = Number(el.textContent.replace(/,/g,"")) || old;
        el.textContent = Number(px).toLocaleString();
        flash(el, px > oldEl ? "price-up" : (px < oldEl ? "price-down" : ""));
      });
    }
  });

  // re-render watchlist if crypto tab active
  const activeTab = document.querySelector(".tab.active")?.dataset?.tab || "crypto";
  if(activeTab === "crypto" && MARKETS_JSON) renderWatchlistFromMarkets(MARKETS_JSON, "crypto");
}

/* ========= Right panels (simple render) ========= */
function renderSignals(sig){
  const host = $("signals");
  host.innerHTML = "";
  const list = sig.active || [];
  if(!list.length){
    host.innerHTML = `<div style="color:rgba(229,231,235,.7);font-size:13px">No active signals.</div>`;
    return;
  }
  list.slice(0,6).forEach(s => {
    const div = document.createElement("div");
    div.className = "rate-chip";
    div.innerHTML = `
      <span class="rate-sym">${s.asset}</span>
      <span class="rate-chg ${s.bias === "bullish" ? "up" : (s.bias === "bearish" ? "down":"") }">
        ${s.bias.toUpperCase()}
      </span>
      <span class="rate-price">${s.confidence_pct}%</span>
    `;
    host.appendChild(div);
  });
}

function renderSessionTrend(sessions){
  const host = $("sessionsPanel");
  host.innerHTML = "";
  const list = sessions.sessions || [];
  if(!list.length){
    host.innerHTML = `<div style="color:rgba(229,231,235,.7);font-size:13px">Session model active (MVP).</div>`;
    return;
  }
  list.forEach(s => {
    const w = s.windows?.[0] || {};
    const div = document.createElement("div");
    div.className = "rate-chip";
    div.innerHTML = `
      <span class="rate-sym">${s.market}</span>
      <span class="rate-chg ${w.direction === "bullish" ? "up" : (w.direction === "bearish" ? "down":"") }">
        ${safeText(w.direction).toUpperCase()}
      </span>
      <span class="rate-price">${Number(w.net_move_pct || 0).toFixed(2)}%</span>
    `;
    host.appendChild(div);
  });
}

function renderImpactValidation(){
  $("impact").innerHTML = `<div style="color:rgba(229,231,235,.7);font-size:13px">Coming next: impact accuracy tracking.</div>`;
}

/* ========= Boot ========= */
async function boot(){
  try{
    CFG = await loadJSON("data/config.json");
    renderSessions(CFG);

    // load base json snapshots
    MARKETS_JSON = await loadJSON("data/markets_latest.json");
    NEWS_JSON = await loadJSON("data/news_latest.json");
    const SIG = await loadJSON("data/signals_latest.json");
    const SESS = await loadJSON("data/sessions_latest.json");

    renderTopRatesStrip(MARKETS_JSON);

    // default watchlist
    renderWatchlistFromMarkets(MARKETS_JSON, "crypto");

    // news
    const filtered = applyNewsFilters(NEWS_JSON.items || []);
    renderNews(filtered);

    // right panels
    renderSignals(SIG);
    renderSessionTrend(SESS);
    renderImpactValidation();

    // events
    $("btnLangEn").onclick = () => { LANG="en"; $("btnLangEn").classList.add("active"); $("btnLangUr").classList.remove("active"); renderNews(applyNewsFilters(NEWS_JSON.items||[])); };
    $("btnLangUr").onclick = () => { LANG="ur"; $("btnLangUr").classList.add("active"); $("btnLangEn").classList.remove("active"); renderNews(applyNewsFilters(NEWS_JSON.items||[])); };

    $("globalSearch").addEventListener("input", () => { NEWS_LIMIT = 12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterCategory").addEventListener("change", () => { NEWS_LIMIT = 12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterImpact").addEventListener("change", () => { NEWS_LIMIT = 12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });
    $("filterDate").addEventListener("change", () => { NEWS_LIMIT = 12; renderNews(applyNewsFilters(NEWS_JSON.items||[])); });

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
        renderWatchlistFromMarkets(MARKETS_JSON, btn.dataset.tab);
      });
    });

    // live crypto tick
    setInterval(liveCryptoTick, 6000);

  }catch(e){
    console.error(e);
    const host = $("news");
    if(host) host.innerHTML = `<div class="news-item"><h4>App error</h4><ul><li>${safeText(e.message)}</li></ul></div>`;
  }
}

boot();
