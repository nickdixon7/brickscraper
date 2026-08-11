import { parseDealPage } from './deal-parser.mjs';

export const BRICK_SLEUTH_URL = process.env.BRICK_SLEUTH_URL || 'https://www.bricksleuth.co.uk/lego-deals/';

export async function fetchBrickSleuthDeals({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BRICK_SLEUTH_URL, { headers: { 'User-Agent': 'Brick Scout/1.0 (+deal aggregator)' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Brick Sleuth responded with ${response.status}`);
  return parseDealPage(await response.text(), { pageUrl: BRICK_SLEUTH_URL, source: 'Brick Sleuth', limit: 100 });
}

