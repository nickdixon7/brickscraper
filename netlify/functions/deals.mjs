import { collectDeals } from './lib/deal-service.mjs';
export default async () => Response.json({ deals: await collectDeals(), source:'demo', fetchedAt:new Date().toISOString() }, { headers:{'Cache-Control':'public, max-age=300'} });
