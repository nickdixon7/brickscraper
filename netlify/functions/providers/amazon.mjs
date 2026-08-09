import { rateLimit, pause } from '../lib/rate-limit.mjs';
export async function fetchAmazonDeals() {
  const gate = rateLimit('amazon', 5 * 60_000);
  if (!gate.allowed) return [];
  await pause(250);
  // TODO: Connect an authorised product-data API or affiliate feed here. Avoid page scraping;
  // respect Amazon terms, robots rules, request quotas and Prime eligibility semantics.
  return [];
}
