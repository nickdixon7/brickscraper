const TARGET_UNIT_PRICE = 1.00;
const STRETCH_UNIT_PRICE = 1.25;
const MIN_BULK_QTY = 10;

const INCLUDE = ['lego','foil','foilbag','foil bag','paper bag','paper pack','magazine gift','covermount','cover mount','promo','promotional','polybag','poly bag','minifigure','minifig','job lot','joblot','bulk'];
const SEALED = ['sealed','new','unopened','new in bag','nib','bnib','factory sealed'];
const EXCLUDE = ['loose','used','opened','instructions only','manual only','box only','empty bag','damaged parts','compatible with lego','lego compatible','building blocks compatible'];

function text(item){ return `${item.title||item.name||''} ${item.description||''}`.toLowerCase(); }
function number(value){ const n=Number(value); return Number.isFinite(n) ? n : null; }

export function scoreWholesaleLot(item){
  const hay=text(item);
  if (!hay.includes('lego') || EXCLUDE.some(word=>hay.includes(word))) return null;
  const qty=number(item.quantity || item.qty || item.units || item.packSize) || 1;
  const lotPrice=number(item.landedPrice ?? item.totalPrice ?? item.price);
  if (!lotPrice || qty < 1) return null;
  const shipping=number(item.shipping) || 0;
  const fees=number(item.fees) || 0;
  const landedTotal=item.landedPrice != null ? lotPrice : lotPrice + shipping + fees;
  const unitPrice=landedTotal / qty;
  const relevant=INCLUDE.some(word=>hay.includes(word));
  if (!relevant) return null;
  const sealed=SEALED.some(word=>hay.includes(word)) || item.sealed === true || item.condition === 'new';
  const bulk=qty >= MIN_BULK_QTY || /job ?lot|bulk|wholesale|carton|case|bundle/.test(hay);
  let score=35;
  if (unitPrice <= .75) score+=45; else if(unitPrice <= 1) score+=35; else if(unitPrice <= 1.25) score+=20; else if(unitPrice <= 1.5) score+=8; else score-=20;
  if (sealed) score+=12;
  if (bulk) score+=10;
  if (qty >= 50) score+=8;
  if (qty >= 100) score+=5;
  const verdict=unitPrice<=.75?'HAMMER':unitPrice<=TARGET_UNIT_PRICE?'BUY':unitPrice<=STRETCH_UNIT_PRICE?'GOOD':unitPrice<=1.5?'MAYBE':'PASS';
  return {...item, quantity:qty, landedTotal:+landedTotal.toFixed(2), unitPrice:+unitPrice.toFixed(2), sealed, bulk, verdict, score:Math.max(0,Math.min(100,score)), rationale:`${qty} units · £${unitPrice.toFixed(2)} landed each${sealed?' · sealed/new signal':''}${bulk?' · bulk lot':''}`};
}

export async function collectWholesaleLots({providers=[]}={}){
  const settled=await Promise.allSettled(providers.map(p=>p.run()));
  const sourceStatus=settled.map((result,i)=>({source:providers[i].name,ok:result.status==='fulfilled',found:result.status==='fulfilled'?result.value.length:0,error:result.status==='rejected'?String(result.reason?.message||result.reason):undefined}));
  const lots=settled.flatMap((result,i)=>result.status==='fulfilled'?result.value.map(x=>({...x,source:x.source||providers[i].name})):[]).map(scoreWholesaleLot).filter(Boolean).filter(x=>x.verdict!=='PASS').sort((a,b)=>b.score-a.score||a.unitPrice-b.unitPrice||b.quantity-a.quantity);
  return {lots,sourceStatus,targetUnitPrice:TARGET_UNIT_PRICE,stretchUnitPrice:STRETCH_UNIT_PRICE,checkedAt:new Date().toISOString()};
}
