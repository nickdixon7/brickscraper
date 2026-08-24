import { fetchBrickLinkListings, normalizeBrickLinkPayload } from './providers/bricklink.mjs';
import { runBrickLinkBatch } from './lib/bricklink-scan.mjs';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

export async function handler(event = {}) {
  if (event.httpMethod && !['GET', 'POST'].includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const body = parseBody(event);
    const query = event.queryStringParameters || {};
    const cursor = Number(body.cursor ?? query.cursor ?? 0);
    const batchSize = Math.min(1000, Math.max(1, Number(body.batchSize ?? query.batchSize ?? 200)));
    const marketCache = body.marketCache || {};
    const marketOverrides = body.marketOverrides || {};

    let listings;
    if (body.listings || body.items || body.data) {
      listings = normalizeBrickLinkPayload(body);
    } else {
      listings = await fetchBrickLinkListings();
    }

    const result = runBrickLinkBatch(listings, {
      cursor,
      batchSize,
      marketCache,
      marketOverrides
    });

    return json(200, {
      source: 'BrickLink',
      mode: 'deep-sourcing',
      ...result,
      progressPct: result.total ? Math.round(((result.cursor + result.processed) / result.total) * 100) : 100,
      note: result.nextCursor == null
        ? 'Scan complete for the supplied listing feed.'
        : 'Pass nextCursor back to continue without restarting.'
    });
  } catch (error) {
    return json(502, {
      error: String(error?.message || error),
      hint: 'Configure BRICKLINK_FEED_URL to a permitted JSON/API/export feed, or POST normalized listings directly.'
    });
  }
}
