import { collectDealsWithStatus } from './lib/deal-service.mjs';
export default async () => {
  const result = await collectDealsWithStatus();
  // TODO: Persist snapshots to Netlify Blobs/Supabase and dispatch opted-in alerts here.
  return Response.json({ ...result, source:'live', fetchedAt:new Date().toISOString() });
};
