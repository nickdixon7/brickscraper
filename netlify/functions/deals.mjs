import { collectDealsWithStatus } from './lib/deal-service.mjs';
export default async () => {
  const result = await collectDealsWithStatus();
  return Response.json({ ...result, source:'live', fetchedAt:new Date().toISOString() }, { headers:{'Cache-Control':'public, max-age=300'} });
};
