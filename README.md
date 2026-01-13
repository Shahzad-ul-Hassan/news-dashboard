# Market & News Intelligence Dashboard (Free)

## What this is
A free, bilingual (English default + one-click Urdu) dashboard that shows:
- Market timings (US / PSX / Crypto)
- Key rates strip (BTC, ETH, indices, USD/PKR, etc.)
- Watchlist (left)
- News feed (center) with archive-by-date
- Signals + session trend + validation (right)

## How to deploy (no coding)
1) Create a new GitHub repo (e.g. `news-dashboard`)
2) Upload all files from this folder (keep structure)
3) Enable GitHub Pages:
   - Settings → Pages → Deploy from a branch
   - Branch: main, Folder: / (root)
4) Open your Pages URL

## Auto updates
GitHub Actions runs every 30 minutes and updates JSON in /data and /archive/news.

You can change the schedule in `.github/workflows/update.yml`.

## Notes
- Free data sources can be delayed or rate-limited.
- Urdu summaries are MVP fallback right now (English copy). You can plug a translator later.
