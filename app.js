let LANG = "en";
let NEWS_LIMIT = 12;

const $ = (id) => document.getElementById(id);
function safeText(s){ return (s ?? "").toString(); }

/* ---------------- Time helpers ---------------- */
function to12h(timeHHMM){
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});
}
function formatPKTFromISO(iso){
  const d = new Date(iso);
  return d.toLocaleString("en-PK",{
    timeZone:"Asia/Karachi",
    year:"numeric",month:"short",day:"numeric",
    hour:"numeric",minute:"2-digit",hour12:true
  });
}

/* ---------------- Session countdown ---------------- */
function sessionCountdown(tz, open, close){
  const now = new Date();
  const nowTz = new Date(now.toLocaleString("en-US",{timeZone:tz}));
  const [oh,om] = open.split(":").map(Number);
  const [ch,cm] = close.split(":").map(Number);

  const o = new Date(nowTz); o.setHours(oh,om,0,0);
  const c = new Date(nowTz); c.setHours(ch,cm,0,0);

  let target,label;
  if(nowTz < o){ target=o; label="Opens in"; }
  else if(nowTz <= c){ target=c; label="Closes in"; }
  else { o.setDate(o.getDate()+1); target=o; label="Opens in"; }

  const diff = Math.max(0,target-nowTz);
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  const s = Math.floor((diff%60000)/1000);
  return `${label} ${h}h ${m}m ${s}s`;
}

/* ---------------- Fetch helper ---------------- */
async function loadJSON(path){
  const r = await fetch(`${path}?v=${Date.now()}`);
  if(!r.ok) throw new Error(`Fetch failed ${path}`);
  return await r.json();
}

/* ---------------- Language ---------------- */
function setLang(l){
  LANG=l;
  $("btnLangEn").classList.toggle("active",l==="en");
  $("btnLangUr").classList.toggle("active",l==="ur");
  document.documentElement.lang=l;
  document.documentElement.dir=(l==="ur"?"rtl":"ltr");
}

/* ---------------- Sessions render ---------------- */
function renderSessions(cfg){
  const host=$("timings"); host.innerHTML="";
  Object.entries(cfg.market_sessions).forEach(([k,s])=>{
    const cd=sessionCountdown(s.tz,s.open,s.close);
    const div=document.createElement("div");
    div.className="timing-tile";
    div.innerHTML=`
      <div class="timing-title">${k}</div>
      <div class="timing-time">${to12h(s.open)} — ${to12h(s.close)}</div>
      <div class="timing-sub">${cd}</div>`;
    host.appendChild(div);
  });
}

/* ---------------- News ---------------- */
function applyNewsFilters(items){
  const q=safeText($("globalSearch").value).toLowerCase();
  const cat=$("filterCategory").value;
  const imp=$("filterImpact").value;
  return items.filter(n=>{
    if(cat!=="all" && n.category!==cat) return false;
    if(imp!=="all" && n.impact_tag!==imp) return false;
    if(q){
      const hay=[n.title_en,n.title_ur,...(n.summary_en||[]),...(n.summary_ur||[])].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function renderNews(items){
  const host=$("news"); host.innerHTML="";
  items.slice(0,NEWS_LIMIT).forEach(n=>{
    const title=(LANG==="ur"?n.title_ur:n.title_en);
    const sum=(LANG==="ur"?n.summary_ur:n.summary_en)||[];
    const card=document.createElement("div");
    card.className="news-item";
    card.innerHTML=`
      <h4>${safeText(title)}</h4>
      <small>${formatPKTFromISO(n.published_at_pkt)} | ${n.impact_tag.toUpperCase()} | ${n.source_name}</small>
      <ul>${sum.map(x=>`<li>${safeText(x)}</li>`).join("")}</ul>
      <a href="${n.original_url}" target="_blank">Source</a>`;
    host.appendChild(card);
  });
}

/* ---------------- Markets / Watchlist ---------------- */
function pct(it){ return Number(it.change_pct_24h ?? it.change_pct_1d ?? 0); }
function arrow(p){ return p>=0?"▲":"▼"; }

function renderWatchlist(markets,tab){
  const host=$("watchlist"); host.innerHTML="";
  markets.items.filter(x=>x.type===tab).forEach(it=>{
    const p=pct(it);
    const row=document.createElement("div");
    row.className="rate-chip";
    row.innerHTML=`
      <span>${it.display}</span>
      <span>${Number(it.price).toLocaleString()}</span>
      <span class="${p>=0?"up":"down"}">${arrow(p)} ${p.toFixed(2)}%</span>`;
    host.appendChild(row);
  });
}

/* ---------------- Right panel ---------------- */
function renderRightPanel(markets){
  const host=$("signals"); host.innerHTML="";
  markets.items.slice(0,5).forEach(it=>{
    const p=pct(it);
    const d=document.createElement("div");
    d.className="rate-chip";
    d.innerHTML=`${it.display} ${arrow(p)} ${p.toFixed(2)}%`;
    host.appendChild(d);
  });
}

/* ---------------- Boot ---------------- */
let CFG,MARKETS,NEWS;
async function boot(){
  CFG=await loadJSON("data/config.json");
  MARKETS=await loadJSON("data/markets_latest.json");
  NEWS=await loadJSON("data/news_latest.json");

  setLang(CFG.default_language||"en");
  renderSessions(CFG);
  renderWatchlist(MARKETS,"crypto");
  renderRightPanel(MARKETS);
  renderNews(applyNewsFilters(NEWS.items));

  setInterval(()=>renderSessions(CFG),1000);

  $("btnLangEn").onclick=()=>{setLang("en");renderNews(applyNewsFilters(NEWS.items));};
  $("btnLangUr").onclick=()=>{setLang("ur");renderNews(applyNewsFilters(NEWS.items));};

  document.querySelectorAll(".tab").forEach(b=>{
    b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); renderWatchlist(MARKETS,b.dataset.tab);}
  });
}
boot();
