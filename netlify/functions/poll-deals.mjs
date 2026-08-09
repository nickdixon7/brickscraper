import { collectDeals } from './lib/deal-service.mjs';
export default async () => {
  // Set DEAL_PROVIDER=live only after authorised provider adapters are implemented.
  const live = Netlify.env.get('DEAL_PROVIDER') === 'live';
  const deals = await collectDeals({ live });
  // TODO: Persist snapshots to Netlify Blobs/Supabase and dispatch opted-in alerts here.
  return Response.json({ deals, source:live?'live':'demo', fetchedAt:new Date().toISOString() });
};
