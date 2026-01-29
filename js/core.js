
const APP = {
  lang: localStorage.getItem("lang") || "EN",
  sessionsVisible: localStorage.getItem("sessionsVisible") !== "0",
  keyMarketsOpen: localStorage.getItem("keyMarketsOpen") === "1",
  rightPanel: localStorage.getItem("rightPanel") || "watchlistPanel",
  view: "home",
};

function setLang(lang){
  APP.lang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang==="EN" ? "en" : "ur";
  document.getElementById("langToggle").textContent = lang==="EN" ? "EN | اردو" : "اردو | EN";
  if (window.renderGlossary) window.renderGlossary();
  if (window.renderNews) window.renderNews();
  if (window.renderOverview) window.renderOverview();
  if (window.renderContextStack) window.renderContextStack();
}

function formatPKT(iso){
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    timeZone:"Asia/Karachi",
    hour:"numeric", minute:"2-digit", hour12:true,
    day:"2-digit", month:"short", year:"numeric"
  });
}

async function loadJSON(path){
  const r = await fetch(path);
  if(!r.ok) throw new Error("Failed to load " + path);
  return r.json();
}

function fmtTime(date, tz){
  return new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",minute:"2-digit",hour12:true}).format(date);
}
function fmtPKTTime(date){
  return new Intl.DateTimeFormat("en-PK",{timeZone:"Asia/Karachi",hour:"numeric",minute:"2-digit",hour12:true}).format(date);
}

function todayParts(tz){
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const y=+parts.find(p=>p.type==="year").value;
  const m=+parts.find(p=>p.type==="month").value;
  const d=+parts.find(p=>p.type==="day").value;
  return {y,m,d};
}

function makeDateInTZ(tz, hhmm){
  const {y,m,d} = todayParts(tz);
  const [hh,mm] = hhmm.split(":").map(Number);
  // create a UTC date at those components; Intl will display correct local time in tz
  return new Date(Date.UTC(y,m-1,d,hh,mm,0));
}

function minutesInTZ(date, tz){
  const hm = new Intl.DateTimeFormat("en-CA",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
  const [h,m]=hm.split(":").map(Number);
  return h*60+m;
}

function diffPretty(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return h>0 ? `${h}h ${m}m` : `${m}m`;
}

async function renderSessions(){
  const grid = document.getElementById("sessionsGrid");
  if(!grid) return;
  const sessions = await loadJSON("./data/sessions.json");
  const now = new Date();

  const cards = sessions.map(s=>{
    if(s.id==="crypto"){
      return {...s, status:"OPEN", next:"24/7", order:999999};
    }
    const openD = makeDateInTZ(s.tz, s.open);
    const closeD = makeDateInTZ(s.tz, s.close);
    const nowMin = minutesInTZ(now, s.tz);
    const openMin = minutesInTZ(openD, s.tz);
    const closeMin = minutesInTZ(closeD, s.tz);

    let status="CLOSED";
    let nextLabel="Opens in";
    let nextMs=0;

    if (nowMin>=openMin && nowMin<closeMin){
      status="OPEN";
      nextLabel="Closes in";
      nextMs = closeD - now;
    } else {
      // pre-open if within 60 mins
      const msToOpen = openD - now;
      const minsToOpen = Math.floor(msToOpen/60000);
      if (minsToOpen>=0 && minsToOpen<=60){
        status="PRE-OPEN";
        nextLabel="Opens in";
        nextMs = msToOpen;
      } else {
        // if open already passed, use tomorrow's open
        const openTomorrow = new Date(openD.getTime() + 24*3600*1000);
        nextMs = (openD - now) >= 0 ? (openD - now) : (openTomorrow - now);
      }
    }

    const order = nextMs<0 ? nextMs+24*3600*1000 : nextMs;
    const pktRange = `${fmtPKTTime(openD)} – ${fmtPKTTime(closeD)} (PKT)`;
    return {...s, status, next:`${nextLabel} ${diffPretty(order)}`, order, pktRange};
  }).sort((a,b)=>a.order-b.order);

  grid.innerHTML="";
  cards.forEach(s=>{
    const el=document.createElement("div");
    el.className="session";
    const badgeClass = s.status==="OPEN" ? "open" : (s.status==="PRE-OPEN" ? "pre" : "closed");
    const pkt = s.id==="crypto" ? "Continuous Market" : s.pktRange;
    el.innerHTML = `
      <div class="session-top">
        <div>
          <div class="session-title">${s.emoji} ${s.label}</div>
          <div class="session-sub">${pkt}</div>
        </div>
        <span class="badge ${badgeClass}">${s.status}</span>
      </div>
      <div class="kv"><span>${s.next}</span></div>
      <div class="session-sub">Volatility: ${s.volatility} <span class="muted">|</span> Focus: ${s.focus}</div>
    `;
    grid.appendChild(el);
  });
}

function bindHeader(){
  document.getElementById("brandBtn").addEventListener("click", ()=>{
    document.getElementById("brandName").classList.toggle("hidden");
  });

  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      APP.view = btn.dataset.view;
      renderViews();
    });
  });

  const langBtn = document.getElementById("langToggle");
  langBtn.addEventListener("click", ()=>{
    setLang(APP.lang==="EN" ? "UR" : "EN");
  });

  const sToggle = document.getElementById("sessionsToggle");
  function syncSessions(){
    document.getElementById("sessionsGrid").classList.toggle("hidden", !APP.sessionsVisible);
    sToggle.textContent = APP.sessionsVisible ? "Hide" : "Show";
  }
  syncSessions();
  sToggle.addEventListener("click", ()=>{
    APP.sessionsVisible = !APP.sessionsVisible;
    localStorage.setItem("sessionsVisible", APP.sessionsVisible ? "1":"0");
    syncSessions();
  });

  const kmBtn = document.getElementById("keyMarketsToggle");
  const kmBody = document.getElementById("keyMarketsBody");
  function syncKM(){
    kmBody.classList.toggle("hidden", !APP.keyMarketsOpen);
    kmBtn.textContent = APP.keyMarketsOpen ? "Hide" : "Show";
  }
  syncKM();
  kmBtn.addEventListener("click", ()=>{
    APP.keyMarketsOpen = !APP.keyMarketsOpen;
    localStorage.setItem("keyMarketsOpen", APP.keyMarketsOpen ? "1":"0");
    syncKM();
  });
}

function renderViews(){
  document.getElementById("newsCard").classList.toggle("hidden", APP.view!=="home");
  document.getElementById("macroView").classList.toggle("hidden", APP.view!=="macro");
  document.getElementById("reviewView").classList.toggle("hidden", APP.view!=="review");
  document.getElementById("educationView").classList.toggle("hidden", APP.view!=="education");
}

function bindSidebars(){
  const icons = document.querySelectorAll(".sideicon");
  icons.forEach(ic=>{
    ic.addEventListener("click", ()=>{
      icons.forEach(x=>x.classList.remove("active"));
      ic.classList.add("active");
      const pid = ic.dataset.panel;
      localStorage.setItem("rightPanel", pid);
      document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden"));
      document.getElementById(pid).classList.remove("hidden");
    });
  });

  const restore = Array.from(icons).find(x=>x.dataset.panel===APP.rightPanel) || icons[0];
  restore.click();

  document.querySelectorAll("[data-collapse]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-collapse");
      const el = document.getElementById(id);
      const willShow = el.classList.contains("hidden");
      el.classList.toggle("hidden", !willShow);
      btn.textContent = willShow ? "Collapse" : "Show";
      btn.setAttribute("aria-expanded", willShow ? "true":"false");
    });
  });

  // market map default collapsed
  const mmBtn = document.querySelector('#marketMapPanel [data-collapse="marketMapBody"]');
  const mmBody = document.getElementById("marketMapBody");
  if(mmBtn && mmBody){
    mmBody.classList.add("hidden");
    mmBtn.textContent="Show";
    mmBtn.setAttribute("aria-expanded","false");
  }
}

function bindLeftToolbar(){
  document.querySelectorAll(".toolbtn").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll(".toolbtn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      window.openTool && window.openTool(b.dataset.tool);
    });
  });
}

async function boot(){
  bindHeader();
  bindSidebars();
  bindLeftToolbar();
  setLang(APP.lang);
  renderViews();
  await renderSessions();
  setInterval(()=>renderSessions().catch(()=>{}), 30000);
}

window.__core = { formatPKT, setLang };
boot().catch(console.error);
