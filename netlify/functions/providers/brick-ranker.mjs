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
    const crossed = row.match(/<(?:del|s)\b[^>]*>([\s\S]*?)<\/(?:del|s)>/i)?.[1];
    const normalPrice = number(text(crossed));
    const withoutCrossed = row.replace(/<(?:del|s)\b[^>]*>[\s\S]*?<\/(?:del|s)>/gi, ' ');
    const currentPrice = number(text(withoutCrossed).match(/£\s*[\d,]+(?:\.\d{1,2})?/i)?.[0]);
    const title = attribute(image, 'alt')?.replace(/\s*(?:box|image|set)\s*$/i, '') || text(amazonAnchor?.[2]);
    return deal({
      source: 'Brick Ranker', setNumber, name: title, price: currentPrice, normalPrice,
      link: url(amazonAnchor?.[1], pageUrl), primeConfirmed: false
    });
  }), 100);
}

export async function fetchBrickRankerDeals({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BRICK_RANKER_URL, { headers: { 'User-Agent': 'Brick Scout/1.0 (+deal aggregator)' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Brick Ranker responded with ${response.status}`);
  return parseBrickRanker(await response.text());
}
