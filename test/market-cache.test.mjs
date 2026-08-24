import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarketCache, mergeMarketCache, cacheNeedsRefresh, marketValidationQueue } from '../netlify/functions/lib/market-cache.mjs';

test('normalizes numeric and object market cache entries', () => {
  const cache = normalizeMarketCache({
    '75357': 145,
    '42143': { marketPrice: '315', checkedAt: '2026-08-24T10:00:00Z', marketSource: 'eBay sold' },
    bad: { marketPrice: 'nope' }
  });
  assert.equal(cache['75357'].marketPrice, 145);
  assert.equal(cache['42143'].marketPrice, 315);
  assert.equal(cache.bad, undefined);
});

test('merge prefers updates and validation queue deduplicates set numbers', () => {
  const cache = mergeMarketCache({ '75357': 140 }, { '75357': { marketPrice: 145, checkedAt: '2026-08-24T10:00:00Z' } });
  assert.equal(cache['75357'].marketPrice, 145);
  assert.equal(cacheNeedsRefresh(cache['75357'], { now: Date.parse('2026-08-24T12:00:00Z') }), false);

  const queue = marketValidationQueue([
    { setNumber: '42143', name: 'Ferrari Daytona SP3', price: 265.95, seller: 'A' },
    { setNumber: '42143', name: 'Ferrari Daytona SP3', price: 270, seller: 'B' },
    { setNumber: '75357', name: 'Ghost & Phantom II', price: 109.99, seller: 'C' }
  ], cache, { now: Date.parse('2026-08-24T12:00:00Z') });

  assert.deepEqual(queue.map(item => item.setNumber), ['42143']);
});
