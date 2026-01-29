
const NEWS_PER_PAGE = 15;
let newsAll=[], newsFiltered=[], page=1;

function t(en, ur){ return (localStorage.getItem("lang")||"EN")==="EN" ? en : ur; }
function dotClass(i){ return i==="High"?"dot-high":(i==="Medium"?"dot-med":"dot-low"); }

function applyFilters(){
  const q = (document.getElementById("globalSearch").value||"").trim().toLowerCase();
  const dateVal = document.getElementById("newsDate").value;
  newsFiltered = newsAll.filter(n=>{
    const mq = !q || (n.headline.toLowerCase().includes(q) || n.market.toLowerCase().includes(q) || n.session.toLowerCase().includes(q) || n.type.toLowerCase().includes(q));
    const md = !dateVal || n.iso.startsWith(dateVal);
    return mq && md;
  });
  const w={"High":0,"Medium":1,"Low":2};
  newsFiltered.sort((a,b)=>{
    const d = w[a.impact]-w[b.impact];
    return d!==0 ? d : (new Date(b.iso)-new Date(a.iso));
  });
}

function renderPagination(){
  const pag = document.getElementById("pagination");
  const pages = Math.max(1, Math.ceil(newsFiltered.length/NEWS_PER_PAGE));
  if(page>pages) page=pages;
  pag.innerHTML="";
  for(let i=1;i<=pages;i++){
    const b=document.createElement("button");
    b.className="pagebtn"+(i===page?" active":"");
    b.textContent=String(i);
    b.addEventListener("click", ()=>{ page=i; renderNews(); });
    pag.appendChild(b);
  }
  document.getElementById("newsMeta").textContent = `${t("Page","صفحہ")} ${page}/${pages} — ${newsFiltered.length} ${t("items","آئٹمز")}`;
}

function renderNews(){
  applyFilters();
  const list = document.getElementById("newsList");
  list.innerHTML="";
  const start=(page-1)*NEWS_PER_PAGE;
  const items=newsFiltered.slice(start,start+NEWS_PER_PAGE);
  items.forEach(n=>{
    const card=document.createElement("article");
    card.className="news-card";
    const meta = `
      <span class="impact-dot ${dotClass(n.impact)}" title="${n.impact}"></span>
      <span>${n.impact}</span>
      <span class="muted">|</span>
      <span>${window.__core.formatPKT(n.iso)}</span>
      <span class="muted">|</span>
      <span>${n.session}</span>
      <span class="muted">|</span>
      <span>${n.market}</span>
    `;
    card.innerHTML = `
      <div class="news-meta">${meta}</div>
      <div class="news-title">${n.headline}</div>
      <p class="news-why">${(localStorage.getItem("lang")||"EN")==="EN" ? n.why : "یہ خبر کیوں اہم ہے — دو لائنوں میں، بغیر ہدایت کے۔"}</p>
      <div class="section-title">${t("Summary","خلاصہ")}</div>
      <div class="muted">${(localStorage.getItem("lang")||"EN")==="EN" ? n.summary : "یہ تناظر ہے، ٹریڈنگ اشارہ نہیں۔"}</div>
      <div class="divider"></div>
      <div class="section-title">${t("Related","حوالہ")}</div>
      <div class="links">${n.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`).join("")}</div>
    `;
    list.appendChild(card);
  });
  renderPagination();
}

async function initNews(){
  newsAll = await (await fetch("./data/sample-news.json")).json();
  renderNews();
  document.getElementById("globalSearch").addEventListener("input", ()=>{page=1; renderNews();});
  document.getElementById("newsDate").addEventListener("change", ()=>{page=1; renderNews();});
}
window.renderNews = renderNews;
initNews().catch(console.error);
