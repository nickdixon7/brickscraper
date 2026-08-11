import { fetchBrickSleuthDeals } from '../providers/brick-sleuth.mjs';
import { fetchBrickRankerDeals } from '../providers/brick-ranker.mjs';

export async function collectDeals({ minDiscount = 25, providers = [fetchBrickSleuthDeals, fetchBrickRankerDeals] } = {}) {
  const results = await Promise.allSettled(providers.map(provider => provider()));
  const cheapest = new Map();
  for (const deal of results.flatMap(result => result.status === 'fulfilled' ? result.value : [])) {
    const discount = Math.round((1 - deal.price / deal.normalPrice) * 100);
    if (!Number.isFinite(discount) || discount < minDiscount) continue;
    const enriched = {
      ...deal, discount,
      rating: discount >= 35 ? 'BUY' : 'MAYBE',
      score: Math.min(99, 50 + discount),
      rationale: `${discount}% below the price shown by ${deal.source}.`,
      availability: deal.primeStatus === 'confirmed' ? 'Amazon Prime confirmed by source' : 'Amazon Prime status unverified'
    };
    if (!cheapest.has(deal.setNumber) || deal.price < cheapest.get(deal.setNumber).price) cheapest.set(deal.setNumber, enriched);
  }
  return [...cheapest.values()].sort((a, b) => b.discount - a.discount || a.price - b.price);
}
