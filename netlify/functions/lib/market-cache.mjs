const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeMarketCache(cache = {}) {
  const normalized = {};
  for (const [setNumber, value] of Object.entries(cache || {})) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      normalized[setNumber] = { marketPrice: value, checkedAt: null, marketSource: 'cache' };
      continue;
    }
    const marketPrice = Number(value?.marketPrice);
    if (!Number.isFinite(marketPrice) || marketPrice <= 0) continue;
    normalized[setNumber] = {
      ...value,
      marketPrice,
      checkedAt: value.checkedAt ?? null,
      marketSource: value.marketSource ?? 'cache'
    };
  }
  return normalized;
}

export function mergeMarketCache(cache = {}, updates = {}) {
  return {
    ...normalizeMarketCache(cache),
    ...normalizeMarketCache(updates)
  };
}

export function cacheNeedsRefresh(entry, { now = Date.now(), maxAgeDays = 7 } = {}) {
  if (!entry?.marketPrice || !entry?.checkedAt) return true;
  const checkedAt = Date.parse(entry.checkedAt);
  return !Number.isFinite(checkedAt) || now - checkedAt > maxAgeDays * DAY_MS;
}

export function marketValidationQueue(candidates = [], cache = {}, options = {}) {
  const normalized = normalizeMarketCache(cache);
  const seen = new Set();
  return candidates.filter(item => {
    if (!item?.setNumber || seen.has(item.setNumber)) return false;
    seen.add(item.setNumber);
    return cacheNeedsRefresh(normalized[item.setNumber], options);
  }).map(item => ({
    setNumber: item.setNumber,
    name: item.name,
    acquisitionPrice: item.price,
    seller: item.seller,
    priority: item.cachedSaving != null ? 'cached-opportunity' : 'unknown-market'
  }));
}
