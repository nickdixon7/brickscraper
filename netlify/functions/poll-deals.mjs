import { collectDeals } from './lib/deal-service.mjs';
export default async () => {
  const deals = await collectDeals();
  // TODO: Persist snapshots to Netlify Blobs/Supabase and dispatch opted-in alerts here.
  return Response.json({ deals, source:'live', fetchedAt:new Date().toISOString() });
};
