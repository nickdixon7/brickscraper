const CHANNELS = [
  {name:'Wholesale Clearance UK',url:'https://www.wholesaleclearance.co.uk/',queries:['lego','lego magazine','lego job lot']},
  {name:'Merkandi',url:'https://merkandi.co.uk/',queries:['lego foil','lego promotional','lego wholesale']},
  {name:'GEM Wholesale',url:'https://www.gemwholesale.co.uk/',queries:['lego','construction toys']},
  {name:'B-Stock',url:'https://bstock.com/',queries:['lego toys','toy liquidation']},
  {name:'eBay UK',url:'https://www.ebay.co.uk/',queries:['lego magazine gift job lot','lego foil pack job lot','lego polybag bulk']},
  {name:'BrickLink UK',url:'https://www.bricklink.com/',queries:['lego foil pack bulk','lego promotional bulk']}
];

// Search API adapter. Set WHOLESALE_SEARCH_ENDPOINT to a JSON search service that accepts
// ?q=<query>&site=<hostname> and returns {results:[{title,url,price,quantity,shipping,condition,description}]}.
// This keeps scraping credentials/server-side access out of the browser and lets us add
// EasyParser, Serper, Apify or another compliant provider without changing the UI.
async function searchChannel(channel){
  const endpoint=process.env.WHOLESALE_SEARCH_ENDPOINT;
  if(!endpoint) return [];
  const token=process.env.WHOLESALE_SEARCH_TOKEN;
  const host=new URL(channel.url).hostname;
  const out=[];
  for(const q of channel.queries){
    const url=new URL(endpoint);
    url.searchParams.set('q',q); url.searchParams.set('site',host);
    const res=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{}});
    if(!res.ok) throw new Error(`${channel.name} search failed (${res.status})`);
    const data=await res.json();
    for(const item of data.results||[]) out.push({...item,source:channel.name,searchQuery:q});
  }
  return out;
}

export const wholesaleChannels=CHANNELS;
export function wholesaleProviders(){ return CHANNELS.map(channel=>({name:channel.name,run:()=>searchChannel(channel)})); }
