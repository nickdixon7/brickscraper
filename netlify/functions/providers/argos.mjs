import { rateLimit, pause } from '../lib/rate-limit.mjs';
export async function fetchArgosDeals() {
  const gate = rateLimit('argos', 5 * 60_000);
  if (!gate.allowed) return [];
  await pause(250);
  // TODO: Connect an authorised catalogue/stock source here. Keep location checks sequential,
  // cache responses, identify this service responsibly, and honour site terms and quotas.
  return [];
}
