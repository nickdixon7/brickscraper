import { collectDealsWithStatus } from './lib/deal-service.mjs';
export default async request => {
  const result = await collectDealsWithStatus();
  const manual = new URL(request.url).searchParams.has('refresh');
  return Response.json(
    { ...result, source:'live', fetchedAt:new Date().toISOString() },
    { headers:{'Cache-Control':manual?'no-store':'public, max-age=300'} }
  );
};
