import { deal, unique, url } from './deal-parser.mjs';

export const BRICK_SLEUTH_URL = process.env.BRICK_SLEUTH_URL || 'https://bricksleuth.com/deals';

function walk(value, output) {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value) && value.set_number != null && value.best_price != null) output.push(value);
  for (const child of Object.values(value)) walk(child, output);
}

function embeddedJson(html) {
  const values = [];
  for (const match of html.matchAll(/<script\b[^>]*(?:id=["']__NEXT_DATA__["']|type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { values.push(JSON.parse(match[1])); } catch { /* Ignore unrelated or incomplete Next.js chunks. */ }
  }
  // Current App Router pages stream records in self.__next_f.push([id, "..."])
  // chunks rather than a single __NEXT_DATA__ element.
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?self\.__next_f\.push[\s\S]*?)<\/script>/gi)) {
    for (const argument of nextPushArguments(script[1])) {
      try {
        const chunk = JSON.parse(argument);
        if (typeof chunk[1] === 'string') values.push(...jsonObjects(chunk[1]));
      } catch { /* A streamed chunk may not contain deal JSON. */ }
    }
  }
  return values;
}

// Regex cannot safely capture a streamed push argument because the encoded
// payload itself contains arrays. Scan brackets while respecting JSON strings.
function nextPushArguments(script) {
  const marker = 'self.__next_f.push(';
  const output = [];
  let cursor = 0;
  while ((cursor = script.indexOf(marker, cursor)) !== -1) {
    const start = script.indexOf('[', cursor + marker.length);
    if (start === -1) break;
    let depth = 0, quoted = false, escaped = false;
    for (let end = start; end < script.length; end += 1) {
      const char = script[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '[') depth += 1;
      else if (char === ']' && --depth === 0) {
        output.push(script.slice(start, end + 1));
        cursor = end + 1;
        break;
      }
    }
    if (cursor <= start) cursor = start + 1;
  }
  return output;
}

function jsonObjects(chunk) {
  const output = [];
  for (let start = 0; start < chunk.length; start += 1) {
    if (chunk[start] !== '{' && chunk[start] !== '[') continue;
    const opening = chunk[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0, quoted = false, escaped = false;
    for (let end = start; end < chunk.length; end += 1) {
      const char = chunk[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === opening) depth += 1;
      else if (char === closing && --depth === 0) {
        try { output.push(JSON.parse(chunk.slice(start, end + 1))); start = end; } catch { /* Try the next opening token. */ }
        break;
      }
    }
  }
  return output;
}

function first(object, keys) {
  for (const key of keys) if (object[key] != null && object[key] !== '') return object[key];
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseBrickSleuth(html, pageUrl = BRICK_SLEUTH_URL) {
  const records = [];
  for (const payload of embeddedJson(html)) walk(payload, records);
  return unique(records.map(item => {
    const analysis = item.price_analysis ?? item.priceAnalysis ?? {};
    const setNumber = String(item.set_number);
    const name = first(item, ['Name', 'set_name', 'name', 'title']);
    const productUrl = first(item, ['best_price_url', 'best_price_link', 'product_url', 'affiliate_url', 'url']);
    return deal({
      source: 'Brick Sleuth',
      setNumber,
      name,
      theme: typeof item.theme === 'object' ? item.theme?.name : item.theme,
      price: item.best_price,
      normalPrice: first(item, ['Retail_Price', 'retail_price', 'rrp']) ?? first(analysis, ['retail_price', 'comparison_price']),
      link: productUrl
        ? url(productUrl, pageUrl)
        : `https://bricksleuth.com/item/${setNumber}-${slugify(name)}`,
      updatedAt: item.best_price_updated_at,
      primeConfirmed: item.prime_confirmed === true
    });
  }), 100);
}

export async function fetchBrickSleuthDeals({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(BRICK_SLEUTH_URL, { headers: { 'User-Agent': 'Brick Scout/1.0 (+deal aggregator)' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Brick Sleuth responded with ${response.status}`);
  return parseBrickSleuth(await response.text());
}
