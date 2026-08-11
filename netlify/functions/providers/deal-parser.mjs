const GBP = /£\s*([\d,]+(?:\.\d{1,2})?)/i;

export function number(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const match = String(value ?? '').replace(/&pound;/gi, '£').match(GBP) ?? String(value ?? '').replace(/,/g, '').match(/^-?\d+(?:\.\d+)?$/);
  const parsed = Number((match?.[1] ?? match?.[0])?.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function text(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&pound;/gi, '£').replace(/&amp;/gi, '&').replace(/&#39;/g, "'").replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ').trim();
}

export function url(value, pageUrl) {
  try { return new URL(String(value).replace(/&amp;/gi, '&'), pageUrl).href; } catch { return undefined; }
}

export function deal({ source, setNumber, name, theme, price, normalPrice, link, updatedAt, primeConfirmed = false }) {
  const current = number(price);
  const comparison = number(normalPrice);
  if (!/^\d{4,6}$/.test(String(setNumber)) || !current || !comparison || comparison <= current || !link) return undefined;
  return {
    id: `${source.toLowerCase().replace(/\W+/g, '-')}-${setNumber}`,
    setNumber: String(setNumber),
    name: text(name) || `LEGO set ${setNumber}`,
    theme: text(theme) || 'LEGO',
    source,
    url: link,
    price: current,
    normalPrice: comparison,
    primeStatus: primeConfirmed ? 'confirmed' : 'unverified',
    updatedAt: updatedAt && !Number.isNaN(Date.parse(updatedAt)) ? new Date(updatedAt).toISOString() : new Date().toISOString()
  };
}

export function unique(deals, limit = 100) {
  const bySet = new Map();
  for (const item of deals.filter(Boolean)) {
    if (!bySet.has(item.setNumber) || item.price < bySet.get(item.setNumber).price) bySet.set(item.setNumber, item);
  }
  return [...bySet.values()].slice(0, limit);
}
