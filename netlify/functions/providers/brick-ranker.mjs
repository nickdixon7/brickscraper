import { deal, number, text, unique, url } from './deal-parser.mjs';

export const BRICK_RANKER_URL = process.env.BRICK_RANKER_URL || 'https://brickranker.com/price-trackers/amazon/uk';

function attribute(fragment, name) {
  return fragment.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
}

export function parseBrickRanker(html, pageUrl = BRICK_RANKER_URL) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1]);
  return unique(rows.map(row => {
    const amazonAnchor = [...row.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .find(match => /amazon\.(?:co\.uk|com)|amzn\.to/i.test(match[1]));
    const image = row.match(/<img\b[^>]*>/i)?.[0] ?? '';
    const imageIdentity = `${attribute(image, 'alt') ?? ''} ${attribute(image, 'src') ?? ''}`;
    const setNumber = imageIdentity.match(/(?:set[-_\s]?)?(\d{4,6})(?:\D|$)/i)?.[1] ?? text(row).match(/\b(\d{4,6})\b/)?.[1];
    const crossedMatch = row.match(/<(?:del|s)\b[^>]*>([\s\S]*?)<\/(?:del|s)>|<span\b(?=[^>]*style=["'][^"']*text-decoration\s*:\s*line-through)[^>]*>([\s\S]*?)<\/span>/i);
    const crossed = crossedMatch?.[1] ?? crossedMatch?.[2];
    const normalPrice = number(text(crossed));
    const withoutCrossed = row
      .replace(/<(?:del|s)\b[^>]*>[\s\S]*?<\/(?:del|s)>/gi, ' ')
      .replace(/<span\b(?=[^>]*style=["'][^"']*text-decoration\s*:\s*line-through)[^>]*>[\s\S]*?<\/span>/gi, ' ');
    const currentPrice = number(text(withoutCrossed).match(/£\s*[\d,]+(?:\.\d{1,2})?/i)?.[0]);
    const title = attribute(image, 'alt')?.replace(/\s*(?:box|image|set)\s*$/i, '') || text(amazonAnchor?.[2]);
    const parsed = deal({
      source: 'Brick Ranker', setNumber, name: title, price: currentPrice, normalPrice,
      link: url(amazonAnchor?.[1], pageUrl), primeConfirmed: false
    });
    const voucherText = text(row).match(/(?:voucher|coupon|tick (?:the )?box)[^£%]{0,50}(?:£\s*[\d.]+|\d+%)/i)?.[0];
    return parsed && { ...parsed, retailer: 'Amazon UK', voucher: Boolean(voucherText), voucherStatus: voucherText ? 'reported' : undefined, voucherText };
  }), 100);
}

export async function fetchBrickRankerDeals({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BRICK_RANKER_URL, { headers: { 'User-Agent': 'Brick Scout/1.0 (+deal aggregator)' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Brick Ranker responded with ${response.status}`);
  const candidates = parseBrickRanker(await response.text());
  const limit = Math.max(0, Math.min(30, Number(process.env.AMAZON_LIVE_CHECK_LIMIT ?? 16)));
  const checked = (await Promise.all(candidates.slice(0, limit).map(item => checkAmazonListing(item, fetchImpl)))).filter(Boolean);
  if (candidates.length && !checked.length) throw new Error('Amazon blocked live price validation; stale Brick Ranker prices were excluded');
  return checked;
}

export function parseAmazonListing(html, item) {
  const raw = String(html ?? '').replace(/&pound;/gi, '£');
  const markers = ['priceToPay', 'corePriceDisplay', 'apex_desktop', 'apexPriceToPay'];
  const regions = markers.flatMap(marker => {
    const index = raw.indexOf(marker);
    return index === -1 ? [] : [raw.slice(Math.max(0, index - 300), index + 3500)];
  });
  const priceFrom = fragment => number(
    fragment.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(£\s*[\d,]+(?:\.\d{1,2})?)/i)?.[1]
      ?? fragment.match(/"priceAmount"\s*:\s*([\d.]+)/i)?.[1]
      ?? fragment.match(/£\s*[\d,]+(?:\.\d{1,2})?/i)?.[0]
  );
  const livePrice = regions.map(priceFrom).find(value => value > 0);
  if (!livePrice) return undefined;
  const pageText = text(raw);
  const voucher = pageText.match(/(?:save|extra)\s*(\d{1,2})%[^.]{0,80}(?:voucher|coupon)|(?:voucher|coupon)[^.]{0,80}(\d{1,2})%/i);
  const amount = pageText.match(/(?:save|extra)\s*£\s*([\d.]+)[^.]{0,80}(?:voucher|coupon)|(?:voucher|coupon)[^.]{0,80}£\s*([\d.]+)/i);
  const percent = Number(voucher?.[1] ?? voucher?.[2]);
  const pounds = Number(amount?.[1] ?? amount?.[2]);
  const effectivePrice = Math.max(0.01, Math.round((percent ? livePrice * (1 - percent / 100) : pounds ? livePrice - pounds : livePrice) * 100) / 100);
  return {
    ...item,
    price: effectivePrice,
    shelfPrice: percent || pounds ? livePrice : undefined,
    priceVerified: true,
    verifiedAt: new Date().toISOString(),
    voucher: Boolean(percent || pounds),
    voucherPercent: percent || undefined,
    voucherAmount: pounds || undefined,
    voucherStatus: percent || pounds ? 'listing' : undefined,
    voucherText: percent ? `${percent}% Amazon voucher` : pounds ? `£${pounds.toFixed(2)} Amazon voucher` : undefined
  };
}

async function checkAmazonListing(item, fetchImpl) {
  try {
    const response = await fetchImpl(item.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Brick Scout/1.0)', 'Accept-Language': 'en-GB,en;q=0.9' },
      redirect: 'follow', signal: AbortSignal.timeout(4_000)
    });
    if (!response.ok) return undefined;
    return parseAmazonListing(await response.text(), item);
  } catch { return undefined; }
}
