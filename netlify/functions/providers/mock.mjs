export async function fetchMockDeals() {
  const now = new Date().toISOString();
  return [
    { id:'75379-amz', setNumber:'75379', name:'R2-D2', theme:'Star Wars', retailer:'Amazon UK', prime:true, price:69.99, normalPrice:99.99, rrp:89.99, discount:30, rating:'BUY', score:92, rationale:'Iconic display set with strong gift appeal. Healthy margin even against the recent street price.', availability:'In stock · Prime delivery', updatedAt:now },
    { id:'42171-argos', setNumber:'42171', name:'Mercedes-AMG F1 W14 E Performance', theme:'Technic', retailer:'Argos', prime:false, price:139.99, normalPrice:189.99, rrp:189.99, discount:26, rating:'BUY', score:87, rationale:'Recognisable licence and high piece count. Reliable live-auction interest at this entry price.', availability:'Deal: collect today', updatedAt:now },
    { id:'10328-amz', setNumber:'10328', name:'Bouquet of Roses', theme:'Icons', retailer:'Amazon UK', prime:true, price:38.49, normalPrice:54.99, rrp:54.99, discount:30, rating:'MAYBE', score:76, rationale:'Broad audience and easy to ship, but the set is frequently discounted. Best as a quick-turn item.', availability:'In stock · Prime delivery', updatedAt:now },
    { id:'60419-argos', setNumber:'60419', name:'Police Prison Island', theme:'City', retailer:'Argos', prime:false, price:59.99, normalPrice:84.99, rrp:84.99, discount:29, rating:'MAYBE', score:71, rationale:'Good play value and discount, though City sets face heavier reseller competition.', availability:'Dover: limited stock', updatedAt:now }
  ];
}
