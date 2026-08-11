const SET_NUMBER = /(?:LEGO(?:\s+(?:set|no\.?))?\s*)?#?(\d{4,6})(?:\b|[\s-])/i;
const stripTags = value => String(value ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&pound;/gi, '£').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
function amount(value) { const match = String(value ?? '').replace(/,/g, '').match(/£?\s*(\d+(?:\.\d{1,2})?)/); return match ? Number(match[1]) : undefined; }
function absoluteUrl(value, pageUrl) { try { return new URL(value, pageUrl).href; } catch { return undefined; } }
function firstNumber(...values) { for (const value of values) { const parsed = typeof value === 'number' ? value : amount(value); if (Number.isFinite(parsed) && parsed > 0) return parsed; } }
function jsonProducts(value) {
  const output = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (String(node['@type'] ?? '').toLowerCase().includes('product')) output.push(node);
    if (Array.isArray(node)) node.forEach(visit);
    else for (const [key, child] of Object.entries(node)) if (key === '@graph' || key === 'itemListElement') visit(child?.item ?? child);
  };
  visit(value); return output;
}
export function parseDealPage(html, { pageUrl, source, limit = 100 }) {
  const candidates = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { for (const item of jsonProducts(JSON.parse(match[1]))) { const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers; candidates.push({ name:item.name, text:`${item.name??''} ${item.sku??''} ${item.mpn??''}`, price:firstNumber(offer?.price,offer?.lowPrice), normalPrice:firstNumber(item.highPrice,offer?.highPrice), url:absoluteUrl(item.url??offer?.url,pageUrl) }); } } catch { /* Ignore malformed optional metadata. */ }
  }
  for (const match of html.matchAll(/<(article|li|div)\b[^>]*(?:class=["'][^"']*(?:deal|product)[^"']*["'])?[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const fragment=match[0], text=stripTags(fragment), href=fragment.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1];
    const prices=[...text.matchAll(/£\s*\d+(?:[,.]\d{1,2})?/g)].map(x=>amount(x[0])).filter(Boolean);
    if (href && prices.length) candidates.push({ name:stripTags(fragment.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1]) || stripTags(fragment.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1]), text, price:prices[0], normalPrice:prices.find(price=>price>prices[0]), url:absoluteUrl(href,pageUrl) });
  }
  const seen=new Set();
  return candidates.flatMap(candidate=>{ const match=`${candidate.text??''} ${candidate.name??''} ${candidate.url??''}`.match(SET_NUMBER); if(!match||!candidate.price||!candidate.url)return[]; const setNumber=match[1],key=`${setNumber}|${candidate.price}|${candidate.url}`; if(seen.has(key))return[]; seen.add(key); const normalPrice=candidate.normalPrice>candidate.price?candidate.normalPrice:candidate.price; const primeConfirmed=/(?:amazon\s+prime|prime\s+(?:eligible|delivery|confirmed))/i.test(candidate.text??candidate.name??''); return [{id:`${source.toLowerCase().replace(/\W+/g,'-')}-${setNumber}`,setNumber,name:candidate.name?.replace(/\s+/g,' ').trim()||`LEGO set ${setNumber}`,source,url:candidate.url,price:candidate.price,normalPrice,primeStatus:primeConfirmed?'confirmed':'unverified',updatedAt:new Date().toISOString()}]; }).slice(0,limit);
}
