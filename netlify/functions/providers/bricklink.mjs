const DEFAULT_TIMEOUT_MS = 12000;

function asNumber(value) {
  const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function normalizeSetNumber(value) {
  const match = String(value ?? '').match(/(\d{4,6})(?:-\d+)?/);
  return match ? match[1] : null;
}

export function normalizeBrickLinkListing(raw = {}) {
  const setNumber = normalizeSetNumber(raw.setNumber ?? raw.itemNo ?? raw.no ?? raw.number);
  const price = asNumber(raw.price ?? raw.unitPrice ?? raw.unit_price);
  if (!setNumber || price == null || price <= 0) return null;

  const condition = String(raw.condition ?? raw.newOrUsed ?? raw.new_or_used ?? 'N').toUpperCase();
  const sellerCountry = String(raw.sellerCountry ?? raw.country ?? raw.seller_country ?? 'UK').toUpperCase();
  const seller = String(raw.seller ?? raw.storeName ?? raw.store_name ?? raw.sellerName ?? 'Unknown seller').trim();

  return {
    source: 'BrickLink',
    setNumber,
    name: raw.name ?? raw.setName ?? raw.itemName ?? `LEGO ${setNumber}`,
    seller,
    sellerCountry,
    price,
    currency: String(raw.currency ?? 'GBP').toUpperCase(),
    condition,
    sealed: raw.sealed !== false && condition !== 'U',
    quantity: Math.max(1, Math.trunc(asNumber(raw.quantity) ?? 1)),
    sellerMinBuy: asNumber(raw.sellerMinBuy ?? raw.minimumBuy ?? raw.minimum_buy),
    shippingEstimate: asNumber(raw.shippingEstimate ?? raw.shipping ?? raw.postage),
    url: raw.url ?? raw.listingUrl ?? raw.listing_url ?? null,
    sellerUrl: raw.sellerUrl ?? raw.storeUrl ?? raw.store_url ?? null,
    theme: raw.theme ?? null,
    category: raw.category ?? 'Set',
    boxPresence: raw.boxPresence ?? null,
    fetchedAt: raw.fetchedAt ?? new Date().toISOString()
  };
}

export function normalizeBrickLinkPayload(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.listings ?? payload?.items ?? payload?.data ?? [];
  return rows.map(normalizeBrickLinkListing).filter(Boolean);
}

async function fetchJson(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', ...headers },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`BrickLink feed returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBrickLinkListings({
  feedUrl = process.env.BRICKLINK_FEED_URL,
  token = process.env.BRICKLINK_FEED_TOKEN,
  fetchImpl = fetch
} = {}) {
  if (!feedUrl) {
    throw new Error('BRICKLINK_FEED_URL is not configured. Use a permitted BrickLink/API/export feed; HTML anti-bot bypassing is intentionally unsupported.');
  }

  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const payload = await fetchJson(feedUrl, { fetchImpl, headers });
  return normalizeBrickLinkPayload(payload);
}
