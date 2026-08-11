import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDealPage } from '../netlify/functions/providers/deal-parser.mjs';
import { collectDeals } from '../netlify/functions/lib/deal-service.mjs';

test('parses HTML cards, resolves direct links and leaves Prime unverified', () => {
  const html = `<article class="deal-card"><a href="/deal/75379"><h2>LEGO 75379 R2-D2</h2></a><span>£69.99</span><del>£99.99</del></article>`;
  const [deal] = parseDealPage(html, { pageUrl: 'https://example.test/deals', source: 'Brick Sleuth' });
  assert.equal(deal.setNumber, '75379');
  assert.equal(deal.url, 'https://example.test/deal/75379');
  assert.equal(deal.price, 69.99);
  assert.equal(deal.normalPrice, 99.99);
  assert.equal(deal.primeStatus, 'unverified');
});

test('parses JSON-LD and only confirms explicitly stated Prime status', () => {
  const html = `<script type="application/ld+json">{"@type":"Product","name":"LEGO set 42171 Amazon Prime delivery","sku":"42171","url":"/42171","offers":{"price":"£120.00","highPrice":"£180.00"}}</script>`;
  const [deal] = parseDealPage(html, { pageUrl: 'https://example.test/deals', source: 'Brick Ranker' });
  assert.equal(deal.setNumber, '42171');
  assert.equal(deal.primeStatus, 'confirmed');
});

test('keeps the cheapest set across sources and applies the default 25% filter', async () => {
  const base = { setNumber: '10328', name: 'Roses', normalPrice: 100, url: 'https://example.test', primeStatus: 'unverified', updatedAt: new Date().toISOString() };
  const providers = [
    async () => [{ ...base, id: 'one', source: 'Brick Sleuth', price: 70 }, { ...base, id: 'filtered', setNumber: '60419', source: 'Brick Sleuth', price: 80 }],
    async () => [{ ...base, id: 'two', source: 'Brick Ranker', price: 65 }]
  ];
  const deals = await collectDeals({ providers });
  assert.equal(deals.length, 1);
  assert.equal(deals[0].source, 'Brick Ranker');
  assert.equal(deals[0].price, 65);
});

test('caps a source page at 100 listings', () => {
  const html = Array.from({ length: 105 }, (_, index) => `<article><a href="/${10000 + index}">LEGO ${10000 + index}</a><b>£50</b><del>£100</del></article>`).join('');
  assert.equal(parseDealPage(html, { pageUrl: 'https://example.test', source: 'Brick Sleuth' }).length, 100);
});
