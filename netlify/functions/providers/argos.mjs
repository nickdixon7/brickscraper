import { deal, number, text, unique, url } from './deal-parser.mjs';

export const ARGOS_OFFERS_URL = process.env.ARGOS_OFFERS_URL || 'https://www.argos.co.uk/list/shop-for-all-our-latest-lego-offers-at-argos';
export const ARGOS_VOUCHER_URL = process.env.ARGOS_VOUCHER_URL || 'https://www.argos.co.uk/list/shop-savings-on-selected-lego-sets/';

function productAnchors(html) {
  const anchors = [];
  const pattern = /<a\b([^>]*href=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const name = text(match[3]);
    const setNumber = name.match(/\b(\d{4,6})\b/)?.[1];
    if (/\bLEGO\b/i.test(name) && setNumber) anchors.push({ index: match.index, end: match.index + match[0].length, href: match[2], name, setNumber });
  }
  return anchors;
}

export function parseArgos(html, { pageUrl = ARGOS_OFFERS_URL, voucherCode, voucherPercent = 0 } = {}) {
  const anchors = productAnchors(html);
  return unique(anchors.map((item, index) => {
    const fragment = html.slice(item.end, anchors[index + 1]?.index ?? Math.min(html.length, item.end + 3500));
    const prices = [...text(fragment).matchAll(/£\s*[\d,]+(?:\.\d{1,2})?/g)].map(match => number(match[0])).filter(Boolean).slice(0, 2);
    if (!prices.length) return undefined;
    const shelfPrice = prices[0];
    const normalPrice = prices[1] > shelfPrice ? prices[1] : shelfPrice;
    const effectivePrice = voucherPercent ? Math.round(shelfPrice * (1 - voucherPercent / 100) * 100) / 100 : shelfPrice;
    const parsed = deal({
      source: 'Argos', setNumber: item.setNumber, name: item.name,
      price: effectivePrice, normalPrice, link: url(item.href, pageUrl)
    });
    return parsed && {
      ...parsed,
      shelfPrice,
      voucher: Boolean(voucherCode),
      voucherCode,
      voucherPercent,
      voucherStatus: voucherCode ? 'official' : undefined,
      localStockStatus: 'check-required',
      preferredStores: ['Deal', 'Dover', 'Ramsgate', 'Folkestone', 'Canterbury']
    };
  }), 100);
}

async function fetchPage(target, fetchImpl) {
  const response = await fetchImpl(target, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Brick Scout/1.0; +deal aggregator)', 'Accept-Language': 'en-GB,en;q=0.9' },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`Argos responded with ${response.status}`);
  return response.text();
}

export async function fetchArgosDeals({ fetchImpl = fetch } = {}) {
  const [offers, vouchers] = await Promise.allSettled([
    fetchPage(ARGOS_OFFERS_URL, fetchImpl),
    fetchPage(ARGOS_VOUCHER_URL, fetchImpl)
  ]);
  if (offers.status === 'rejected' && vouchers.status === 'rejected') throw offers.reason;
  return unique([
    ...(offers.status === 'fulfilled' ? parseArgos(offers.value) : []),
    ...(vouchers.status === 'fulfilled' ? parseArgos(vouchers.value, { pageUrl: ARGOS_VOUCHER_URL, voucherCode: 'LEGO25', voucherPercent: 25 }) : [])
  ], 100);
}
