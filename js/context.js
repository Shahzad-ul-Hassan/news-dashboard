
let glossary=[];
function lang(){return (localStorage.getItem("lang")||"EN");}
async function loadJSON(p){const r=await fetch(p); if(!r.ok) throw new Error("Failed "+p); return r.json();}

function renderKeyMarkets(){
  const body=document.getElementById("keyMarketsBody");
  if(!body) return;
  const items=[
    {sym:"BTC", ch:"+0.8%", tag:"NY", hint:"Equities-linked"},
    {sym:"ETH", ch:"+1.1%", tag:"NY", hint:"Mixed"},
    {sym:"S&P 500", ch:"+0.3%", tag:"NY", hint:"Benchmark"},
    {sym:"Nasdaq", ch:"+0.4%", tag:"NY", hint:"Tech"},
    {sym:"DXY", ch:"-0.2%", tag:"London", hint:"Dollar"},
    {sym:"Gold (XAU)", ch:"+0.1%", tag:"London", hint:"Hedge"},
    {sym:"Silver (XAG)", ch:"+0.2%", tag:"London", hint:"Hybrid"},
    {sym:"Oil (WTI)", ch:"-0.4%", tag:"Mixed", hint:"Macro"},
  ];
  body.innerHTML="";
  const wrap=document.createElement("div"); wrap.className="list";
  items.forEach(x=>{
    const el=document.createElement("div"); el.className="item";
    el.innerHTML=`<div class="item-top"><div class="item-title">${x.sym}</div><div class="item-sub">${x.ch}</div></div>
      <div class="item-sub">Session: ${x.tag} <span class="muted">|</span> ${x.hint}</div>`;
    wrap.appendChild(el);
  });
  body.appendChild(wrap);
}

function renderOverview(){
  const wrap=document.getElementById("overviewBody"); if(!wrap) return;
  wrap.innerHTML="";
  const b=document.createElement("div"); b.className="block";
  b.innerHTML=`<h4><span class="gloss" data-term="Stablecoin Dominance">Market Temperature</span></h4>
    <div class="muted">${lang()==="EN" ? "Stablecoin dominance rising → cautious participation" : "Stablecoin dominance بڑھ رہی ہے → سرمایہ محتاط رویہ اختیار کیے ہوئے"}</div>
    <div class="muted" style="margin-top:6px;">Conviction: High</div>`;
  wrap.appendChild(b);

  const b2=document.createElement("div"); b2.className="block";
  b2.innerHTML=`<h4>Trend Snapshot</h4><div class="muted">Overall: Sideways | Regime: Stable | 1W • 1M • 6M</div>`;
  wrap.appendChild(b2);

  const b3=document.createElement("div"); b3.className="block";
  b3.innerHTML=`<h4>Confidence Snapshot</h4>
    <div class="item"><div class="item-top"><div class="item-title">BTC: Moderate</div><div class="item-sub">سرگرمی کی حد: $25M–$60M</div></div><div class="item-sub muted">${lang()==="EN"?"Flows mixed, funding neutral":"Flows mixed، funding neutral"}</div><div class="item-sub muted">${lang()==="EN"?"Not a prediction or trading signal.":"یہ پیشگوئی یا ٹریڈنگ اشارہ نہیں۔"}</div></div>
    <div class="item"><div class="item-top"><div class="item-title">ETH: Moderate</div><div class="item-sub">سرگرمی کی حد: $25M–$60M</div></div><div class="item-sub muted">${lang()==="EN"?"Participation fair, narrative mixed":"Participation fair، narrative mixed"}</div><div class="item-sub muted">${lang()==="EN"?"Not a prediction or trading signal.":"یہ پیشگوئی یا ٹریڈنگ اشارہ نہیں۔"}</div></div>
    <div class="item"><div class="item-top"><div class="item-title">Overall: Low</div><div class="item-sub">سرگرمی کی حد: $25M–$60M</div></div><div class="item-sub muted">${lang()==="EN"?"Macro risk nearby, volatility elevated":"Macro risk قریب، volatility بلند"}</div><div class="item-sub muted">${lang()==="EN"?"Not a prediction or trading signal.":"یہ پیشگوئی یا ٹریڈنگ اشارہ نہیں۔"}</div></div>`;
  wrap.appendChild(b3);

  const b4=document.createElement("div"); b4.className="block";
  b4.innerHTML=`<h4>Market Pressure Indicators</h4><div class="muted">News: Medium | Liquidity: Tight | Funding: Neutral | Volatility: High | Flows: Mixed</div>`;
  wrap.appendChild(b4);

  const b5=document.createElement("div"); b5.className="block";
  b5.innerHTML=`<h4>Dominance</h4><div class="muted">BTC Dom: — | Stable Dom: — | TOTAL1: — | TOTAL2: — | TOTAL3: —</div>
    <div class="muted" style="margin-top:6px;">${lang()==="EN"?"Rising stablecoin dominance often aligns with a more cautious environment.":"Stablecoin dominance میں اضافہ عموماً محتاط / خطرہ کم ماحول کی نشاندہی کرتا ہے۔"}</div>`;
  wrap.appendChild(b5);

  const b6=document.createElement("div"); b6.className="block";
  b6.innerHTML=`<h4>Overview Insight</h4><div>${lang()==="EN"?"Risk-Off, sideways trend, moderate confidence — volatility elevated (context only).":"خطرہ کم، سائیڈ ویز trend، confidence معتدل — volatility بلند (صرف تناظر)."}</div>`;
  wrap.appendChild(b6);
}
window.renderOverview = renderOverview;

function renderContextStack(){
  const wrap=document.getElementById("contextBody"); if(!wrap) return;
  wrap.innerHTML="";
  const items=[
    {title:"Liquidity Interest Map", term:"Liquidity", body:"Above highs / Below lows / Range extremes (no levels)"},
    {title:"Institutional Activity Zones", term:"Institutional Activity Zones", body:"Accumulation / Distribution (Weak–Strong, Recent–Aging)"},
    {title:"Narrative Alignment", term:"Narrative Alignment", body:"Aligned / Conflicting / Unclear"},
    {title:"Volatility Regime", term:"Volatility", body:"Compression / Expansion (context only)"},
  ];
  items.forEach(x=>{
    const el=document.createElement("div"); el.className="item";
    el.innerHTML=`<div class="item-top"><div class="item-title"><span class="gloss" data-term="${x.term}">${x.title}</span></div><div class="item-sub">—</div></div>
      <div class="item-sub">${x.body}</div>`;
    wrap.appendChild(el);
  });
}
window.renderContextStack=renderContextStack;

function setupWatchlist(){
  const fav=["BTCUSDT","ETHUSDT","SOLUSDT","DXY","XAUUSD"];
  let watch=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT","XAUUSD","WTI","SPX","NDX","DXY"];
  const favList=document.getElementById("favoritesList");
  const list=document.getElementById("watchlistList");

  function render(){
    favList.innerHTML="";
    fav.forEach(s=>{
      const el=document.createElement("div"); el.className="item";
      el.innerHTML=`<div class="item-top"><div class="item-title">${s}</div><button class="ghost small" data-add="${s}">Add</button></div><div class="item-sub">Followed</div>`;
      favList.appendChild(el);
    });
    list.innerHTML="";
    watch.forEach(s=>{
      const el=document.createElement("div"); el.className="item";
      el.innerHTML=`<div class="item-top"><div class="item-title">${s}</div><div class="item-sub">—</div></div><div class="item-sub">Session-wise change: —</div>`;
      list.appendChild(el);
    });
    favList.querySelectorAll("[data-add]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const sym=b.getAttribute("data-add");
        if(!watch.includes(sym)) watch.unshift(sym);
        render();
      });
    });
  }
  render();
  document.getElementById("addWatch").addEventListener("click", ()=>{
    const v=(document.getElementById("watchSearch").value||"").trim().toUpperCase();
    if(!v) return;
    if(!watch.includes(v)) watch.unshift(v);
    document.getElementById("watchSearch").value="";
    render();
  });
}

function setupMarketMap(){
  const tabs=document.querySelectorAll("[data-mmtab]");
  const content=document.getElementById("marketMapContent");
  const guard=document.getElementById("decisionReadinessGuard");

  function render(tab){
    tabs.forEach(t=>t.classList.toggle("active", t.dataset.mmtab===tab));
    content.innerHTML="";
    const el=document.createElement("div"); el.className="item";
    if(tab==="heatmap") el.innerHTML=`<div class="item-title">Heatmap (context)</div><div class="item-sub">Crowded / Balanced / Depressed (no signals)</div>`;
    if(tab==="bubbles") el.innerHTML=`<div class="item-title">Bubbles (crowd)</div><div class="item-sub">Bubble score: —</div>`;
    if(tab==="movers") el.innerHTML=`<div class="item-title">Gainers / Losers</div><div class="item-sub">Imbalance: —</div>`;
    content.appendChild(el);
    guard.classList.remove("hidden");
    guard.textContent = lang()==="EN"
      ? "⚠️ Some key conditions look mixed. Consider reviewing session edge, liquidity, and macro context before recording a decision."
      : "⚠️ کچھ اہم عوامل اس وقت ہم آہنگ نہیں۔ فیصلہ محفوظ کرنے سے پہلے سیشن، لیکویڈیٹی اور میکرو تناظر دیکھیں۔";
  }
  tabs.forEach(t=>t.addEventListener("click", ()=>render(t.dataset.mmtab)));
  render("heatmap");
}

async function loadGlossary(){
  glossary = await loadJSON("./data/glossary.json");
}

function renderGlossary(){
  const list=document.getElementById("glossaryList"); if(!list) return;
  const q=(document.getElementById("glossarySearch").value||"").trim().toLowerCase();
  list.innerHTML="";
  glossary.filter(g=>!q || g.term.toLowerCase().includes(q) || (g.ur||"").toLowerCase().includes(q)).forEach(g=>{
    const el=document.createElement("div"); el.className="item";
    el.innerHTML=`<div class="item-top"><div class="item-title"><span class="gloss" data-term="${g.term}">${g.term}</span> <span class="muted">— ${g.ur}</span></div></div>
      <div class="item-sub">${lang()==="EN"?g.simple_en:g.simple_ur}</div>
      <div class="item-sub muted">${lang()==="EN"?"Why: "+g.why_en:"کیوں: "+g.why_ur}</div>`;
    list.appendChild(el);
  });
}
window.renderGlossary=renderGlossary;

function setupTooltips(){
  const tip=document.getElementById("tooltip");
  let timer=null;
  function show(target,g){
    const r=target.getBoundingClientRect();
    tip.innerHTML=`<div class="t-title">${g.term} — ${g.ur}</div><div>${lang()==="EN"?g.simple_en:g.simple_ur}</div><div class="t-line">${lang()==="EN"?"Why it matters: "+g.why_en:"کیوں اہم: "+g.why_ur}</div>`;
    tip.style.left=Math.min(window.innerWidth-340, r.left+10)+"px";
    tip.style.top=(r.bottom+10)+"px";
    tip.classList.remove("hidden");
  }
  function hide(){ tip.classList.add("hidden"); }
  document.addEventListener("mouseover",(e)=>{
    const t=e.target.closest(".gloss"); if(!t) return;
    const term=t.getAttribute("data-term"); const g=glossary.find(x=>x.term===term); if(!g) return;
    clearTimeout(timer); timer=setTimeout(()=>show(t,g),800);
  });
  document.addEventListener("mouseout",(e)=>{
    if(e.target.closest(".gloss")){ clearTimeout(timer); hide(); }
  });
  document.addEventListener("click",(e)=>{
    const t=e.target.closest(".gloss"); if(!t) return;
    const term=t.getAttribute("data-term");
    document.querySelector('.sideicon[data-panel="helpPanel"]').click();
    const inp=document.getElementById("glossarySearch");
    inp.value=term; renderGlossary(); inp.focus();
  });
}

function openTool(tool){
  const map={
    trade:"Demo Trading Panel (Spot/Futures) — record decisions only.",
    rr:"Risk–Reward Calculator — context tool, no advice.",
    tf:"Timeframe toggle: 1H / 4H (read-only).",
    patterns:"Pattern detector (read-only) — describes patterns, no entries.",
    movers:"Session movers — gainers/losers by active session (context).",
    listings:"Listings & Launch Watch — upcoming listings incl. MEXC links (context).",
    institutions:"Institutional lens — what large players track (macro/liquidity/narratives)."
  };
  window.alert(map[tool]||tool);
}
window.openTool=openTool;

async function init(){
  await loadGlossary();
  document.getElementById("glossarySearch").addEventListener("input", renderGlossary);
  renderGlossary();
  setupTooltips();

  renderKeyMarkets();
  renderOverview();
  renderContextStack();
  setupWatchlist();
  setupMarketMap();
}
init().catch(console.error);
