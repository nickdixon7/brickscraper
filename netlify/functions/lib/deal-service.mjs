import { fetchBrickSleuthDeals } from '../providers/brick-sleuth.mjs';
import { fetchBrickRankerDeals } from '../providers/brick-ranker.mjs';
import { fetchArgosDeals } from '../providers/argos.mjs';

export async function collectDeals({ minDiscount = 25, providers = [fetchBrickSleuthDeals, fetchBrickRankerDeals, fetchArgosDeals] } = {}) {
  const results = await Promise.allSettled(providers.map(provider => provider()));
  const allDeals = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const bySet = new Map();
  for (const item of allDeals) bySet.set(item.setNumber, [...(bySet.get(item.setNumber) || []), item]);
  const cheapest = new Map();
  for (const deal of allDeals) {
    const discount = Math.round((1 - deal.price / deal.normalPrice) * 100);
    if (!Number.isFinite(discount) || discount < minDiscount) continue;
    const comparisons = (bySet.get(deal.setNumber) || []).filter(item => item.source !== deal.source).sort((a, b) => a.price - b.price);
    const enriched = {
      ...deal, discount,
      rating: deal.source === 'Argos' && deal.localStockStatus !== 'available' ? 'MAYBE' : deal.voucher || discount >= 35 ? 'BUY' : 'MAYBE',
      score: Math.min(99, 50 + discount + (deal.voucher ? 10 : 0) - (deal.source === 'Argos' && deal.localStockStatus !== 'available' ? 8 : 0)),
      alternatives: comparisons.slice(0, 3).map(item => ({ source: item.source, price: item.price, url: item.url })),
      rationale: `${discount}% below RRP${comparisons[0] ? ` and ${deal.price < comparisons[0].price ? `£${(comparisons[0].price - deal.price).toFixed(2)} cheaper than ${comparisons[0].source}` : `cross-checked with ${comparisons[0].source}`}` : ''}.`,
      availability: deal.source === 'Argos' && deal.localStockStatus !== 'available'
        ? `Check Deal first, then ${(deal.preferredStores || ['Deal', 'Dover', 'Ramsgate', 'Folkestone', 'Canterbury']).slice(1).join(', ')}`
        : deal.voucher
        ? `${deal.voucherStatus === 'official' ? 'Official' : 'Reported'} voucher${deal.voucherCode ? ` ${deal.voucherCode}` : ''} — verify at checkout`
        : deal.primeStatus === 'confirmed' ? 'Amazon Prime confirmed by source' : 'Delivery and voucher status unverified'
    };
    if (!cheapest.has(deal.setNumber) || deal.price < cheapest.get(deal.setNumber).price) cheapest.set(deal.setNumber, enriched);
  }
  return [...cheapest.values()].sort((a, b) => Number(b.voucher) - Number(a.voucher) || Number(b.localStockStatus === 'available') - Number(a.localStockStatus === 'available') || b.discount - a.discount || a.price - b.price);
}

export async function collectDealsWithStatus({ minDiscount = 25 } = {}) {
  const providers = [
    { name: 'Brick Sleuth', run: fetchBrickSleuthDeals },
    { name: 'Brick Ranker', run: fetchBrickRankerDeals },
    { name: 'Argos', run: fetchArgosDeals }
  ];
  const settled = await Promise.allSettled(providers.map(provider => provider.run()));
  const sourceStatus = settled.map((result, index) => ({
    source: providers[index].name,
    ok: result.status === 'fulfilled',
    found: result.status === 'fulfilled' ? result.value.length : 0,
    error: result.status === 'rejected' ? String(result.reason?.message || result.reason || 'Source failed') : undefined
  }));
  const successfulProviders = settled
    .filter(result => result.status === 'fulfilled')
    .map(result => async () => result.value);
  return { deals: await collectDeals({ minDiscount, providers: successfulProviders }), sourceStatus };
}
