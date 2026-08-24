# Brick Scout — live UK LEGO deals

Brick Scout is a mobile-first PWA that collects live deal pages from **Brick Sleuth** and **Brick Ranker**. Each scan reads at most 100 listings per source, identifies LEGO set numbers, applies a 25% minimum discount, and retains the cheapest listing when both sources show the same set.

Every result identifies its source and links directly to the source listing. Amazon Prime is displayed as **unverified** unless the source explicitly confirms Prime eligibility or delivery; users should still verify price and fulfilment before purchasing.

## Development

Requires Node.js 20 or later.

```sh
npm install
npm test
npm run build
npm run dev
```

Netlify serves `deals.mjs` at `/api/deals`, while the scheduled and manual scan use `poll-deals.mjs`. Both endpoints collect live results. The scheduled function runs every two hours.

The source URLs default to `https://bricksleuth.com/deals` and `https://brickranker.com/price-trackers/amazon/uk`. Set `BRICK_SLEUTH_URL` or `BRICK_RANKER_URL` in the deployment environment if a publisher moves its public deal page. Collection failures are isolated, so one unavailable source does not suppress results from the other.

## BrickLink deep sourcing

`/.netlify/functions/bricklink-scan` is a separate sourcing endpoint for large BrickLink inventories. It deliberately does **not** scrape BrickLink HTML or attempt to bypass JavaScript/anti-bot checks. Configure `BRICKLINK_FEED_URL` to a permitted JSON/API/export feed containing BrickLink listings. If the feed requires a bearer token, set `BRICKLINK_FEED_TOKEN`.

The endpoint can also accept normalized listings directly in a POST body, which is useful for testing or for an upstream importer:

```json
{
  "cursor": 0,
  "batchSize": 200,
  "listings": [
    {
      "setNumber": "75357-1",
      "name": "Ghost & Phantom II",
      "seller": "Example UK Store",
      "sellerCountry": "UK",
      "price": 109.99,
      "condition": "N",
      "sealed": true
    }
  ],
  "marketCache": {
    "75357": {
      "marketPrice": 145,
      "checkedAt": "2026-08-24T10:00:00Z",
      "marketSource": "eBay sold sealed"
    }
  }
}
```

The deep scan:

- keeps UK new/sealed complete-set candidates;
- deduplicates seller/set/price rows;
- requires roughly 50% market discount for BrickHeadz;
- uses cached real-market values as a cheap first-stage filter;
- marks stale or unknown market values as `VALIDATE` instead of pretending an RRP discount is a deal;
- scores validated listings as `STRONG BUY`, `BUY`, `BASKET`, `WATCH`, or `PASS`;
- groups buyable items into seller baskets to expose postage-efficient sourcing opportunities; and
- returns `nextCursor` so large scans can resume without restarting.

Market validation should prioritise recent UK eBay sold prices for new/sealed sets, then realistic live eBay and current UK retail. RRP is not the primary benchmark for BrickLink sourcing.

Collection should only be deployed where access complies with each publisher's terms, robots policy, and applicable rate limits.
