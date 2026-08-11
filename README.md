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

The source URLs default to `https://www.bricksleuth.co.uk/lego-deals/` and `https://brickranker.com/deals`. Set `BRICK_SLEUTH_URL` or `BRICK_RANKER_URL` in the deployment environment if a publisher moves its public deal page. Collection failures are isolated, so one unavailable source does not suppress results from the other.

Collection should only be deployed where access complies with each publisher's terms, robots policy, and applicable rate limits.
