import { parseDealPage } from './deal-parser.mjs';

export const BRICK_RANKER_URL = process.env.BRICK_RANKER_URL || 'https://brickranker.com/deals';

export async function fetchBrickRankerDeals({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BRICK_RANKER_URL, { headers: { 'User-Agent': 'Brick Scout/1.0 (+deal aggregator)' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Brick Ranker responded with ${response.status}`);
  return parseDealPage(await response.text(), { pageUrl: BRICK_RANKER_URL, source: 'Brick Ranker', limit: 100 });
}
