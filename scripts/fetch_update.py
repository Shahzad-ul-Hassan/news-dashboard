#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, List, Optional, Tuple
from xml.etree import ElementTree as ET

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ARCH_NEWS = ROOT / "archive" / "news"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "news-dashboard/1.2 (+github actions)"})


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_get(url: str, timeout: int = 25) -> Optional[requests.Response]:
    try:
        r = SESSION.get(url, timeout=timeout)
        if r.status_code >= 400:
            return None
        return r
    except Exception:
        return None


# ---------------- Markets ----------------
def binance_24h(symbol: str) -> Optional[dict]:
    url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
    r = safe_get(url)
    if not r:
        return None
    try:
        return r.json()
    except Exception:
        return None


def stooq_last(symbol: str) -> Optional[Tuple[float, float]]:
    mapping = {
        "^GSPC": "^spx",
        "^NDX": "^ndx",
        "^DJI": "^dji",
        "AAPL": "aapl.us",
        "MSFT": "msft.us",
        "NVDA": "nvda.us",
        "AMZN": "amzn.us",
        "TSLA": "tsla.us",
        "GOOGL": "googl.us",
        "META": "meta.us",
    }
    t = mapping.get(symbol, symbol)
    url = f"https://stooq.com/q/d/l/?s={t}&i=d"
    r = safe_get(url)
    if not r:
        return None
    try:
        rows = list(csv.DictReader(r.text.splitlines()))
        if len(rows) < 2:
            return None
        last = rows[-1]
        prev = rows[-2]
        close = float(last["Close"])
        prev_close = float(prev["Close"])
        chg = 0.0 if prev_close == 0 else (close - prev_close) / prev_close * 100.0
        return close, chg
    except Exception:
        return None


def fx_rate(pair: str) -> Optional[Tuple[float, float]]:
    base, quote = pair.split("/")
    url_latest = f"https://api.exchangerate.host/latest?base={base}&symbols={quote}"
    r1 = safe_get(url_latest)
    if not r1:
        return None
    try:
        latest = float(r1.json()["rates"][quote])
    except Exception:
        return None

    yday = (utc_now().date() - timedelta(days=1)).isoformat()
    url_y = f"https://api.exchangerate.host/{yday}?base={base}&symbols={quote}"
    r2 = safe_get(url_y)
    if not r2:
        return (latest, 0.0)
    try:
        y = float(r2.json()["rates"][quote])
        chg = 0.0 if y == 0 else (latest - y) / y * 100.0
        return (latest, chg)
    except Exception:
        return (latest, 0.0)


def compute_trend_from_change(chg_pct: float, threshold: float = 0.15) -> str:
    if chg_pct > threshold:
        return "bullish"
    if chg_pct < -threshold:
        return "bearish"
    return "sideways"


def volume_label_from_rvol(rvol: Optional[float], high: float = 1.2, low: float = 0.8) -> Optional[str]:
    if rvol is None:
        return None
    if rvol >= high:
        return "high"
    if rvol <= low:
        return "low"
    return "normal"


def build_markets(cfg: dict) -> dict:
    prev = read_json(DATA / "markets_latest.json") or {"items": []}
    prev_map = {it.get("symbol"): it for it in prev.get("items", [])}

    out_items: List[dict] = []

    # Crypto (Binance)
    for sym in cfg["watchlist_defaults"]["crypto"]:
        j = binance_24h(sym)
        if j:
            price = float(j["lastPrice"])
            chg = float(j["priceChangePercent"])
            vol = float(j.get("quoteVolume", 0.0))
            prev_vol = float(prev_map.get(sym, {}).get("volume_24h", 0.0) or 0.0)
            rvol = (vol / prev_vol) if prev_vol > 0 else None
            trend = compute_trend_from_change(chg, threshold=0.30)
            item = {
                "type": "crypto",
                "symbol": sym,
                "display": sym.replace("USDT", "/USDT"),
                "price": price,
                "change_pct_24h": chg,
                "volume_24h": vol,
                "rvol": rvol,
                "volume_label": volume_label_from_rvol(rvol, **cfg.get("rvol_thresholds", {"high": 1.2, "low": 0.8})),
                "trend": trend,
                "source_name": "Binance",
                "source_url": f"https://www.tradingview.com/symbols/{sym}/",
                "last_update_utc": iso_z(utc_now()),
            }
        else:
            item = prev_map.get(sym)
            if not item:
                continue
            item = dict(item)
            item["last_update_utc"] = iso_z(utc_now())
        out_items.append(item)

    # Stocks (Stooq daily)
    for sym in cfg["watchlist_defaults"]["stocks"]:
        res = stooq_last(sym)
        if res:
            price, chg = res
            trend = compute_trend_from_change(chg, threshold=0.15)
            item = {
                "type": "stock",
                "symbol": sym,
                "display": sym,
                "price": price,
                "change_pct_1d": chg,
                "volume": None,
                "rvol": None,
                "volume_label": None,
                "trend": trend,
                "source_name": "Stooq",
                "source_url": f"https://www.tradingview.com/symbols/{sym.strip('^')}/",
                "last_update_utc": iso_z(utc_now()),
            }
        else:
            item = prev_map.get(sym)
            if not item:
                continue
            item = dict(item)
            item["last_update_utc"] = iso_z(utc_now())
        out_items.append(item)

    # FX (exchangerate.host)
    for pair in cfg["watchlist_defaults"]["fx"]:
        res = fx_rate(pair)
        if res:
            rate, chg = res
            trend = compute_trend_from_change(chg, threshold=0.10)
            item = {
                "type": "fx",
                "symbol": pair,
                "display": pair,
                "price": rate,
                "change_pct_1d": chg,
                "rvol": None,
                "volume_label": None,
                "trend": trend,
                "source_name": "exchangerate.host",
                "source_url": f"https://www.tradingview.com/symbols/{pair.replace('/','')}/",
                "last_update_utc": iso_z(utc_now()),
            }
        else:
            item = prev_map.get(pair)
            if not item:
                continue
            item = dict(item)
            item["last_update_utc"] = iso_z(utc_now())
        out_items.append(item)

    return {"generated_at_utc": iso_z(utc_now()), "items": out_items}


# ---------------- News (RSS/Atom) ----------------
@dataclass
class Feed:
    name: str
    url: str
    category: str
    source_url: str


FEEDS: List[Feed] = [
    Feed("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml", "usa_decisions", "https://www.federalreserve.gov/"),
    Feed("U.S. Treasury", "https://home.treasury.gov/feeds/press-releases", "usa_decisions", "https://home.treasury.gov/"),

    Feed("CoinDesk", "https://feeds.feedburner.com/CoinDesk", "crypto", "https://www.coindesk.com/"),
    Feed("Cointelegraph", "https://cointelegraph.com/rss", "crypto", "https://cointelegraph.com/"),
    Feed("Bitcoin Magazine", "https://bitcoinmagazine.com/.rss/full/", "crypto", "https://bitcoinmagazine.com/"),

    Feed("Yahoo Finance", "https://finance.yahoo.com/news/rssindex", "stocks_macro", "https://finance.yahoo.com/news/"),
    Feed("Nasdaq", "https://www.nasdaq.com/feed/rssoutbound?category=Markets", "stocks_macro", "https://www.nasdaq.com/"),
    Feed("Investing.com", "https://www.investing.com/rss/news_25.rss", "stocks_macro", "https://www.investing.com/"),
]


def parse_datetime_guess(s: str) -> datetime:
    s = (s or "").strip()
    if not s:
        return utc_now()
    # Try RFC2822 (RSS)
    try:
        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    # Try ISO (Atom)
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return utc_now()


def parse_feed_items(xml_text: str) -> List[dict]:
    items: List[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except Exception:
        return items

    channel = root.find("channel")
    if channel is not None:
        for it in channel.findall("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            pub = (it.findtext("pubDate") or it.findtext("{http://purl.org/dc/elements/1.1/}date") or "").strip()
            desc = (it.findtext("description") or "").strip()
            items.append({"title": title, "link": link, "published": pub, "description": desc})
        return items

    # Atom fallback
    ns = {"a": "http://www.w3.org/2005/Atom"}
    for entry in root.findall("a:entry", ns):
        title = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
        link_el = entry.find("a:link", ns)
        link = (link_el.get("href") if link_el is not None else "").strip()
        updated = (entry.findtext("a:updated", default="", namespaces=ns) or "").strip()
        summary = (entry.findtext("a:summary", default="", namespaces=ns) or "").strip()
        items.append({"title": title, "link": link, "published": updated, "description": summary})
    return items


def clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def summarize_english(title: str, description: str) -> List[str]:
    desc = clean_html(description)
    sents = re.split(r"(?<=[.!?])\s+", desc)
    sents = [s.strip() for s in sents if len(s.strip()) > 20]
    lines: List[str] = []
    if title:
        lines.append(title.strip())
    for s in sents[:3]:
        lines.append(s)
    lines.append("Watch market reaction and follow-up official updates.")
    lines = lines[:7]
    if len(lines) < 3:
        lines = (lines + ["Watch market reaction."] * 3)[:3]
    return lines


def urdu_fallback(lines_en: List[str]) -> List[str]:
    # MVP Urdu: same text. Next step can add offline translator.
    return lines_en


def impact_score(feed_name: str, title: str) -> int:
    s = 0
    name_l = (feed_name or "").lower()
    t = (title or "").lower()

    if "federal reserve" in name_l or "treasury" in name_l:
        s += 30
    elif any(k in name_l for k in ["nasdaq", "yahoo", "coindesk", "cointelegraph", "investing"]):
        s += 20
    else:
        s += 10

    if any(k in t for k in ["rate", "fomc", "inflation", "cpi", "policy", "sanction", "regulation", "supreme court"]):
        s += 30
    elif any(k in t for k in ["earnings", "sec", "lawsuit", "hack", "etf", "approval"]):
        s += 20
    else:
        s += 10

    if any(k in t for k in ["breaking", "emergency", "unexpected", "announces", "approves", "cuts", "hikes"]):
        s += 20
    else:
        s += 10

    return min(100, s)


def tag_from_score(score: int, cfg: dict) -> str:
    thr = cfg.get("impact_thresholds", {"high": 70, "medium": 40})
    if score >= thr["high"]:
        return "high"
    if score >= thr["medium"]:
        return "medium"
    return "low"


def keywords_from_title(title: str) -> List[str]:
    stops = {"the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with", "from", "at", "by", "as", "is", "are"}
    words = re.findall(r"[A-Za-z][A-Za-z0-9\\-]{2,}", title or "")
    kws: List[str] = []
    for w in words:
        wl = w.lower()
        if wl in stops:
            continue
        if wl not in [x.lower() for x in kws]:
            kws.append(w)
    return kws[:8]


def linked_assets_from_text(text: str) -> List[str]:
    t = (text or "").lower()
    assets: List[str] = []

    def add(a: str):
        if a not in assets:
            assets.append(a)

    if "bitcoin" in t or "btc" in t:
        add("BTCUSDT")
    if "ethereum" in t or "eth" in t:
        add("ETHUSDT")
    if "nasdaq" in t:
        add("^NDX")
    if "s&p" in t or "s&p 500" in t:
        add("^GSPC")
    if "dollar" in t or "usd" in t:
        add("USD/PKR")

    return assets[:10]


def build_news(cfg: dict, limit_per_feed: int = 25) -> dict:
    prev = read_json(DATA / "news_latest.json") or {"items": []}
    seen = {it.get("dedupe_hash") for it in prev.get("items", []) if it.get("dedupe_hash")}

    out: List[dict] = []
    pkt_tz = timezone(timedelta(hours=5))

    for feed in FEEDS:
        r = safe_get(feed.url, timeout=30)
        if not r:
            continue
        parsed = parse_feed_items(r.text)

        for it in parsed[:limit_per_feed]:
            title = (it.get("title") or "").strip()
            link = (it.get("link") or "").strip()
            pub_raw = (it.get("published") or "").strip()
            desc = it.get("description") or ""

            if not title or not link:
                continue

            published_dt = parse_datetime_guess(pub_raw)
            h = hashlib.sha1((link + title).encode("utf-8")).hexdigest()
            dh = f"sha1:{h}"
            if dh in seen:
                continue
            seen.add(dh)

            score = impact_score(feed.name, title)
            tag = tag_from_score(score, cfg)
            kws = keywords_from_title(title)
            linked = linked_assets_from_text(title + " " + clean_html(desc))

            sum_en = summarize_english(title, desc)
            sum_ur = urdu_fallback(sum_en)

            news_id = f"news_{published_dt.strftime('%Y%m%d_%H%M%S')}_{h[:6]}"

            out.append({
                "id": news_id,
                "category": feed.category,
                "title_en": title,
                "title_ur": sum_ur[0] if sum_ur else title,
                "summary_en": sum_en[:7],
                "summary_ur": sum_ur[:7],
                "published_at_utc": iso_z(published_dt),
                "published_at_pkt": published_dt.astimezone(pkt_tz).replace(microsecond=0).isoformat(),
                "source_name": feed.name,
                "source_url": feed.source_url,
                "original_url": link,
                "impact_score": score,
                "impact_tag": tag,
                "why_it_matters_en": "This may influence market direction and risk sentiment.",
                "why_it_matters_ur": "یہ خبر مارکیٹ کے رجحان اور رسک سینٹیمنٹ کو متاثر کر سکتی ہے۔",
                "what_to_watch_en": "Watch follow-up confirmations and market reaction.",
                "what_to_watch_ur": "فالو اَپ کنفرمیشن اور مارکیٹ ردِعمل پر نظر رکھیں۔",
                "keywords": kws,
                "linked_assets": linked,
                "dedupe_hash": dh,
            })

    out.sort(key=lambda x: x.get("published_at_utc", ""), reverse=True)
    return {"generated_at_utc": iso_z(utc_now()), "items": out[:150]}


# ---------------- Signals / Sessions (MVP) ----------------
def build_signals(cfg: dict, news: dict, markets: dict) -> dict:
    market_map = {it["symbol"]: it for it in markets.get("items", []) if it.get("symbol")}
    active: List[dict] = []

    prev = read_json(DATA / "signals_latest.json") or {}
    closed_list = prev.get("closed", [])

    for it in news.get("items", []):
        if it.get("impact_tag") not in ("high", "medium"):
            continue
        linked = it.get("linked_assets") or []
        if not linked:
            continue

        asset = linked[0]
        m = market_map.get(asset, {})

        title = (it.get("title_en") or "").lower()
        bias = "neutral"
        if any(k in title for k in ["cuts", "cut", "dovish", "eases", "approves", "approval", "surge", "rally"]):
            bias = "bullish"
        if any(k in title for k in ["hikes", "hawkish", "tightens", "ban", "sanction", "hack", "lawsuit", "crash"]):
            bias = "bearish"

        asset_type = "stock"
        if asset.endswith("USDT"):
            asset_type = "crypto"
        elif "/" in asset:
            asset_type = "fx"

        if it["impact_tag"] == "high":
            base_low, base_high = (1.5, 4.5) if asset_type == "crypto" else ((0.4, 1.2) if asset_type == "stock" else (0.2, 0.8))
        else:
            base_low, base_high = (0.8, 2.2) if asset_type == "crypto" else ((0.2, 0.7) if asset_type == "stock" else (0.1, 0.4))

        mult = 1.0
        if m.get("volume_label") == "high":
            mult *= 1.2
        if m.get("volume_label") == "low":
            mult *= 0.8

        low = base_low * mult
        high = base_high * mult
        if bias == "bearish":
            low, high = (-high, -low)
        if bias == "neutral":
            low, high = (-0.3, 0.3)

        confidence = 55
        confidence += 10 if it.get("impact_tag") == "high" else 5
        if m.get("volume_label") == "high":
            confidence += 7
        if m.get("trend") == bias:
            confidence += 7
        if bias == "neutral":
            confidence -= 10
        confidence = max(35, min(85, confidence))

        now = utc_now()
        window_h = 3 if it.get("impact_tag") == "high" else 5
        sig_id = f"sig_{now.strftime('%Y%m%d_%H%M%S')}_{asset.replace('/','')}"

        active.append({
            "signal_id": sig_id,
            "news_id": it["id"],
            "asset": asset,
            "bias": bias,
            "expected_move_pct_range": {"low": round(low, 2), "high": round(high, 2)},
            "time_window_hours": window_h,
            "confidence_pct": int(confidence),
            "created_at_utc": iso_z(now),
            "valid_until_utc": iso_z(now + timedelta(hours=window_h)),
            "reason_en": "Rule-based signal from news impact + current context (MVP).",
            "reason_ur": "خبر کے امپیکٹ اور موجودہ کنٹیکسٹ سے بنایا گیا رول بیسڈ سگنل (MVP).",
            "context": {"rvol": m.get("rvol"), "pre_trend": m.get("trend")},
        })

    active.sort(key=lambda s: s.get("confidence_pct", 0), reverse=True)
    return {"generated_at_utc": iso_z(utc_now()), "active": active[:8], "closed": closed_list[:12]}


def build_sessions(cfg: dict, markets: dict) -> dict:
    mm = {it["symbol"]: it for it in markets.get("items", []) if it.get("symbol")}
    sessions: List[dict] = []
    spx = mm.get("^GSPC")
    if spx:
        sessions.append({
            "market": "US",
            "asset_proxy": "^GSPC",
            "now_utc": iso_z(utc_now()),
            "status": "open",
            "windows": [{
                "hours": 1,
                "direction": spx.get("trend", "sideways"),
                "net_move_pct": float(spx.get("change_pct_1d", 0.0)),
                "volatility_label": "normal",
                "volume_label": spx.get("volume_label") or "normal",
                "reason_en": "MVP uses daily change as proxy. Next version will compute real 1h/3h/5h/7h trends.",
                "reason_ur": "MVP میں روزانہ تبدیلی بطور پراکسی۔ اگلا ورژن حقیقی 1/3/5/7 گھنٹے رجحانات نکالے گا۔",
            }],
        })
    return {"generated_at_utc": iso_z(utc_now()), "sessions": sessions}


def main() -> None:
    cfg = read_json(DATA / "config.json")
    if not cfg:
        raise SystemExit("Missing data/config.json")

    markets = build_markets(cfg)
    write_json(DATA / "markets_latest.json", markets)

    news = build_news(cfg)
    write_json(DATA / "news_latest.json", news)

    signals = build_signals(cfg, news, markets)
    write_json(DATA / "signals_latest.json", signals)

    sessions = build_sessions(cfg, markets)
    write_json(DATA / "sessions_latest.json", sessions)

    ymd = utc_now().strftime("%Y-%m-%d")
    write_json(ARCH_NEWS / f"{ymd}.json", news)

    print("Updated:", iso_z(utc_now()))


if __name__ == "__main__":
    main()
