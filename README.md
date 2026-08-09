# Brick Scout — LEGO Deal Hunter

A mobile-first, installable PWA designed for iPhone 13. It runs immediately with realistic demo data and includes separated, rate-limited Amazon UK and Argos adapter stubs for an authorised live-data integration.

## What is included

- Latest qualifying deals with retailer, price, recent normal price, calculated genuine discount, resale score and BUY/MAYBE/SKIP rating
- Amazon Prime-only rule locked on, retailer toggles and a 25% default discount threshold
- Argos stock priority: Deal, Dover, Sandwich/Ramsgate, Canterbury/Folkestone, then wider Kent
- Manual **SCRAPE NOW**, two-hour scheduled Netlify function, deal detail sheets and local scan history
- Offline app shell, Home Screen manifest, safe provider boundaries and rate limiting

## Deploy from an iPhone or any web browser

1. Unzip this project. Put the folder in a GitHub repository using GitHub's **Add file → Upload files** page. Keep the folder contents at the repository root.
2. Sign in at [app.netlify.com](https://app.netlify.com), choose **Add new site → Import an existing project**, and connect GitHub.
3. Select the repository. Netlify reads `netlify.toml`; the build command is `npm run build` and the publish folder is `dist`. Choose **Deploy**.
4. When deployment finishes, open the generated `*.netlify.app` address. The demo feed should load immediately.
5. On iPhone, open the address in Safari, tap **Share**, choose **Add to Home Screen**, then **Add**. Launch Brick Scout from its new icon.

Netlify scheduled functions run on published production deploys. The included schedule calls `poll-deals` every two hours. Manual scans call the same endpoint.

## Local development

Install Node.js 20+, then run:

```sh
npm install
npm run dev
```

Open the address shown by Netlify Dev. `npm run build` performs a production build check.

## Connecting live retailer data

The working default is deliberately `demo`. Implement an authorised feed/API inside:

- `netlify/functions/providers/amazon.mjs`
- `netlify/functions/providers/argos.mjs`

Map results to the schema used by `mock.mjs`, preserve the rate limits, add durable caching/storage, and test carefully. Then add the Netlify environment variable `DEAL_PROVIDER=live`. Direct page scraping is intentionally absent because retailer markup and anti-bot controls are brittle, and collection must comply with each retailer's terms and data-source rules.

For persistent history across devices, replace the TODO in `poll-deals.mjs` with Netlify Blobs or a database. Phone-local settings and manual scan history already persist in the browser.

## Important price note

“Genuine discount” is calculated against `normalPrice`, not automatically against RRP. A live provider should populate that field from recent observed pricing or a trustworthy price-history source. Always confirm price, availability, fees and resale demand before purchasing.
