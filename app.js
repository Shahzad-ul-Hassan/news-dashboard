function formatPKT(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* ===== Price tick animation ===== */
function updatePrice(el, newPrice) {
  const old = parseFloat(el.dataset.price || newPrice);
  el.dataset.price = newPrice;

  if (newPrice > old) el.classList.add("price-up");
  if (newPrice < old) el.classList.add("price-down");

  el.textContent = newPrice.toLocaleString();

  setTimeout(() => {
    el.classList.remove("price-up","price-down");
  }, 600);
}

/* ===== Render News ===== */
function renderNews(items, lang) {
  const box = document.querySelector(".news-list");
  box.innerHTML = "";

  items.forEach(n => {
    const div = document.createElement("div");
    div.className = "news-item";

    const title = lang === "ur" ? n.title_ur : n.title_en;
    const summary = lang === "ur" ? n.summary_ur : n.summary_en;

    div.innerHTML = `
      <h4>${title}</h4>
      <small>${formatPKT(n.published_at_pkt)}</small>
      <ul>
        ${summary.map(s => `<li>${s}</li>`).join("")}
      </ul>
      <a href="${n.original_url}" target="_blank">Source</a>
    `;
    box.appendChild(div);
  });
}
