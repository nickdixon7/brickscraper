import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseBrickSleuth } from '../netlify/functions/providers/brick-sleuth.mjs';
import { parseBrickRanker } from '../netlify/functions/providers/brick-ranker.mjs';
import { collectDeals } from '../netlify/functions/lib/deal-service.mjs';

const fixture = name => readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8');

test('parses multiple Brick Sleuth deals from embedded Next.js data', async () => {
  const deals = parseBrickSleuth(await fixture('brick-sleuth-deals.html'));
  assert.equal(deals.length, 3);
  assert.deepEqual(deals.map(item => item.setNumber), ['75379', '42171', '10328']);
  assert.deepEqual(deals.map(item => item.price), [59.99, 129.99, 36]);
  assert.deepEqual(deals.map(item => item.normalPrice), [89.99, 189.99, 54.99]);
  assert.equal(deals[0].name, 'R2-D2');
  assert.equal(deals[0].theme, 'Star Wars');
  assert.equal(deals[0].url, 'https://bricksleuth.com/item/75379-r2-d2');
  assert.equal(deals[2].url, 'https://www.amazon.co.uk/dp/B0BQUET10328');
  assert.ok(deals.every(item => item.primeStatus === 'unverified'));
});

test('parses multiple Brick Ranker table rows and direct Amazon links', async () => {
  const deals = parseBrickRanker(await fixture('brick-ranker-amazon-uk.html'));
  assert.equal(deals.length, 4);
  assert.deepEqual(deals.map(item => item.setNumber), ['75379', '42171', '10328', '60419']);
  assert.deepEqual(deals.map(item => item.price), [64.99, 124.99, 34.99, 59.99]);
  assert.deepEqual(deals.map(item => item.normalPrice), [89.99, 189.99, 54.99, 84.99]);
  assert.match(deals[0].url, /^https:\/\/www\.amazon\.co\.uk\/dp\//);
  assert.match(deals[1].url, /tag=brickranker-21&linkCode=ogi/);
  assert.equal(deals[2].url, 'https://amzn.to/3Roses28');
  assert.ok(deals.every(item => item.primeStatus === 'unverified'));
});

test('keeps the cheapest set across sources and calculates discounts', async () => {
  const sleuth = parseBrickSleuth(await fixture('brick-sleuth-deals.html'));
  const ranker = parseBrickRanker(await fixture('brick-ranker-amazon-uk.html'));
  const deals = await collectDeals({ providers: [async () => sleuth, async () => ranker] });
  assert.equal(deals.length, 4);
  const r2d2 = deals.find(item => item.setNumber === '75379');
  assert.equal(r2d2.source, 'Brick Sleuth');
  assert.equal(r2d2.price, 59.99);
  assert.equal(r2d2.discount, 33);
  assert.ok(deals.every(item => item.discount >= 25));
});

test('caps both source parsers at 100 deals', async () => {
  const sleuthRecord = index => ({ set_number: 10000 + index, set_name: `Set ${index}`, Retail_Price: 100, best_price: 50, best_price_url: `/deal/${index}` });
  const sleuthHtml = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { deals: Array.from({ length: 105 }, (_, index) => sleuthRecord(index)) } })}</script>`;
  const rankerHtml = `<table>${Array.from({ length: 105 }, (_, index) => `<tr><td><img src="/${10000 + index}.png" alt="LEGO ${10000 + index} set"></td><td><a href="https://amazon.co.uk/dp/${index}">Amazon</a> £50 <del>£100</del></td></tr>`).join('')}</table>`;
  assert.equal(parseBrickSleuth(sleuthHtml).length, 100);
  assert.equal(parseBrickRanker(rankerHtml).length, 100);
});
