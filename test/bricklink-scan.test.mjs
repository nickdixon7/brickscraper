import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrickLinkListing, normalizeBrickLinkPayload } from '../netlify/functions/providers/bricklink.mjs';
import { prefilterBrickLinkListings, scoreBrickLinkCandidate, groupSellerBaskets, runBrickLinkBatch } from '../netlify/functions/lib/bricklink-scan.mjs';

const listings = normalizeBrickLinkPayload({ listings: [
  { setNumber: '75357-1', name: 'Ghost & Phantom II', seller: 'Store A', sellerCountry: 'UK', price: '109.99', condition: 'N', sealed: true },
  { setNumber: '42143', name: 'Ferrari Daytona SP3', seller: 'Store B', sellerCountry: 'UK', price: 265.95, condition: 'N' },
  { setNumber: '75336', name: 'Inquisitor Transport Scythe', seller: 'Store C', sellerCountry: 'UK', price: 100, condition: 'N' },
  { setNumber: '40620', name: 'BrickHeadz Example', theme: 'BrickHeadz', seller: 'Store A', sellerCountry: 'UK', price: 18, condition: 'N' },
  { setNumber: '76402', name: "Dumbledore's Office", seller: 'EU Store', sellerCountry: 'DE', price: 45, condition: 'N' }
]});

test('normalizes BrickLink listing fields and set suffixes', () => {
  const item = normalizeBrickLinkListing({ itemNo: '42078-1', unitPrice: '£200.00', storeName: 'Example', country: 'UK' });
  assert.equal(item.setNumber, '42078');
  assert.equal(item.price, 200);
  assert.equal(item.seller, 'Example');
  assert.equal(item.sealed, true);
});

test('prefilter keeps UK sealed deals and rejects weak/foreign/BrickHeadz candidates', () => {
  const marketCache = {
    '75357': { marketPrice: 145 },
    '42143': { marketPrice: 315 },
    '75336': { marketPrice: 90 },
    '40620': { marketPrice: 25 },
    '76402': { marketPrice: 75 }
  };
  const filtered = prefilterBrickLinkListings(listings, { marketCache });
  assert.deepEqual(filtered.map(item => item.setNumber).sort(), ['42143', '75357']);
});

test('scores strong buys using market value rather than RRP', () => {
  const item = listings.find(item => item.setNumber === '75357');
  const scored = scoreBrickLinkCandidate(item, {
    marketPrice: 145,
    marketSource: 'eBay sold sealed',
    boxPresence: 9,
    desirability: 9,
    basketEfficiency: 7,
    confidenceScore: 8
  });
  assert.equal(scored.saving, 35.01);
  assert.equal(scored.discountPct, 24.1);
  assert.equal(scored.verdict, 'STRONG BUY');
  assert.ok(scored.score >= 60);
});

test('groups buyable candidates into seller baskets', () => {
  const a = scoreBrickLinkCandidate(listings[0], { marketPrice: 145, boxPresence: 9, desirability: 9, basketEfficiency: 8, confidenceScore: 8 });
  const extra = { ...listings[0], setNumber: '10280', name: 'Flower Bouquet', price: 24.99 };
  const b = scoreBrickLinkCandidate(extra, { marketPrice: 29.95, boxPresence: 6, desirability: 6, basketEfficiency: 8, confidenceScore: 7 });
  const baskets = groupSellerBaskets([a, b]);
  assert.equal(baskets.length, 1);
  assert.equal(baskets[0].seller, 'Store A');
  assert.equal(baskets[0].itemCount, 2);
  assert.equal(baskets[0].saving, 39.97);
});

test('batch scan resumes with a cursor and leaves stale cache rows for validation', () => {
  const now = Date.parse('2026-08-24T12:00:00Z');
  const marketCache = {
    '75357': { marketPrice: 145, checkedAt: '2026-08-24T10:00:00Z' },
    '42143': { marketPrice: 315, checkedAt: '2026-07-01T10:00:00Z' }
  };
  const result = runBrickLinkBatch(listings, { cursor: 0, batchSize: 2, marketCache, now });
  assert.equal(result.processed, 2);
  assert.equal(result.nextCursor, 2);
  assert.equal(result.candidates[0].verdict, 'STRONG BUY');
  assert.ok(result.candidates.some(item => item.setNumber === '42143' && item.verdict === 'VALIDATE'));
});
