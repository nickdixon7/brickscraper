const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isBrickHeadz(item) {
  const text = `${item.theme ?? ''} ${item.name ?? ''}`.toLowerCase();
  return text.includes('brickheadz') || text.includes('brick headz');
}

function marketEntry(cache, setNumber) {
  const value = cache?.[setNumber];
  if (!value) return null;
  if (typeof value === 'number') return { marketPrice: value, checkedAt: null, confidence: 'cached' };
  return value;
}

export function isMarketCacheFresh(entry, now = Date.now(), maxAgeDays = 7) {
  if (!entry?.checkedAt) return false;
  const checked = Date.parse(entry.checkedAt);
  return Number.isFinite(checked) && now - checked <= maxAgeDays * DAY_MS;
}

export function prefilterBrickLinkListings(listings, {
  country = 'UK',
  requireNew = true,
  requireSealed = true,
  marketCache = {},
  minCachedDiscountPct = 8,
  minCachedSaving = 4,
  brickHeadzMinDiscountPct = 50
} = {}) {
  const seen = new Set();
  const accepted = [];

  for (const item of listings) {
    if (!item?.setNumber || !Number.isFinite(item.price)) continue;
    if (String(item.sellerCountry ?? 'UK').toUpperCase() !== country.toUpperCase()) continue;
    if (requireNew && String(item.condition ?? 'N').toUpperCase() === 'U') continue;
    if (requireSealed && item.sealed === false) continue;

    const key = `${item.seller}|${item.setNumber}|${item.price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cached = marketEntry(marketCache, item.setNumber);
    if (!cached?.marketPrice || cached.marketPrice <= 0) {
      accepted.push({ ...item, preliminaryReason: 'No cached market value — needs validation' });
      continue;
    }

    const saving = cached.marketPrice - item.price;
    const discountPct = saving / cached.marketPrice * 100;
    const requiredPct = isBrickHeadz(item) ? brickHeadzMinDiscountPct : minCachedDiscountPct;
    if (saving < minCachedSaving || discountPct < requiredPct) continue;

    accepted.push({
      ...item,
      cachedMarketPrice: cached.marketPrice,
      cachedSaving: Number(saving.toFixed(2)),
      cachedDiscountPct: Number(discountPct.toFixed(1)),
      preliminaryReason: `${discountPct.toFixed(1)}% below cached market`
    });
  }

  return accepted.sort((a, b) => (b.cachedSaving ?? -1) - (a.cachedSaving ?? -1) || a.price - b.price);
}

export function scoreBrickLinkCandidate(item, market = {}) {
  const marketPrice = Number(market.marketPrice ?? item.cachedMarketPrice);
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
    return { ...item, verdict: 'VALIDATE', score: 0, marketPrice: null, saving: null, discountPct: null };
  }

  const saving = marketPrice - item.price;
  const discountPct = saving / marketPrice * 100;
  const presence = clamp(Number(market.boxPresence ?? item.boxPresence ?? 6), 1, 10);
  const desirability = clamp(Number(market.desirability ?? 6), 1, 10);
  const basketEfficiency = clamp(Number(market.basketEfficiency ?? 5), 1, 10);
  const confidence = clamp(Number(market.confidenceScore ?? 7), 1, 10);

  const percentComponent = clamp(discountPct, 0, 50) / 50 * 40;
  const absoluteComponent = clamp(saving, 0, 100) / 100 * 20;
  const score = Math.round(
    percentComponent +
    absoluteComponent +
    presence / 10 * 15 +
    desirability / 10 * 10 +
    basketEfficiency / 10 * 10 +
    confidence / 10 * 5
  );

  let verdict = 'PASS';
  if (saving >= 15 && discountPct >= 20 && score >= 60) verdict = 'STRONG BUY';
  else if (saving >= 8 && discountPct >= 12 && score >= 48) verdict = 'BUY';
  else if (saving >= 4 && discountPct >= 8) verdict = 'BASKET';
  else if (saving > 0) verdict = 'WATCH';

  return {
    ...item,
    marketPrice: Number(marketPrice.toFixed(2)),
    saving: Number(saving.toFixed(2)),
    discountPct: Number(discountPct.toFixed(1)),
    score,
    verdict,
    marketSource: market.marketSource ?? 'cache',
    marketCheckedAt: market.checkedAt ?? null
  };
}

export function groupSellerBaskets(candidates) {
  const baskets = new Map();
  for (const item of candidates.filter(item => ['STRONG BUY', 'BUY', 'BASKET'].includes(item.verdict))) {
    const key = item.seller || 'Unknown seller';
    const basket = baskets.get(key) || { seller: key, items: [], cost: 0, marketValue: 0, saving: 0 };
    basket.items.push(item);
    basket.cost += item.price;
    basket.marketValue += item.marketPrice ?? item.price;
    basket.saving += item.saving ?? 0;
    baskets.set(key, basket);
  }
  return [...baskets.values()].map(basket => ({
    ...basket,
    cost: Number(basket.cost.toFixed(2)),
    marketValue: Number(basket.marketValue.toFixed(2)),
    saving: Number(basket.saving.toFixed(2)),
    itemCount: basket.items.length
  })).sort((a, b) => b.saving - a.saving || b.itemCount - a.itemCount);
}

export function runBrickLinkBatch(listings, {
  cursor = 0,
  batchSize = 200,
  marketCache = {},
  marketOverrides = {},
  now = Date.now()
} = {}) {
  const start = Math.max(0, Number(cursor) || 0);
  const batch = listings.slice(start, start + batchSize);
  const prefiltered = prefilterBrickLinkListings(batch, { marketCache });
  const candidates = prefiltered.map(item => {
    const cached = marketEntry(marketCache, item.setNumber);
    const override = marketOverrides[item.setNumber];
    const market = override || (cached && isMarketCacheFresh(cached, now) ? cached : null);
    return market ? scoreBrickLinkCandidate(item, market) : { ...item, verdict: 'VALIDATE', score: 0 };
  });
  const nextCursor = start + batch.length < listings.length ? start + batch.length : null;
  return {
    cursor: start,
    nextCursor,
    processed: batch.length,
    total: listings.length,
    prefiltered: prefiltered.length,
    candidates,
    baskets: groupSellerBaskets(candidates)
  };
}
