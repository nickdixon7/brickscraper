import { fetchMockDeals } from '../providers/mock.mjs';
import { fetchAmazonDeals } from '../providers/amazon.mjs';
import { fetchArgosDeals } from '../providers/argos.mjs';
export async function collectDeals({ live = false } = {}) {
  const providers = live ? [fetchAmazonDeals, fetchArgosDeals] : [fetchMockDeals];
  const results = await Promise.allSettled(providers.map(provider => provider()));
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .map(deal => ({ ...deal, discount: Math.round((1 - deal.price / deal.normalPrice) * 100) }))
    .filter(deal => Number.isFinite(deal.discount))
    .sort((a,b) => b.score - a.score);
}
