import { collectWholesaleLots } from './lib/wholesale-service.mjs';
import { wholesaleProviders, wholesaleChannels } from './providers/wholesale-web.mjs';

export async function handler(){
  try{
    const data=await collectWholesaleLots({providers:wholesaleProviders()});
    return {statusCode:200,headers:{'content-type':'application/json','cache-control':'public,max-age=300'},body:JSON.stringify({...data,channels:wholesaleChannels,configured:Boolean(process.env.WHOLESALE_SEARCH_ENDPOINT)})};
  }catch(error){
    return {statusCode:500,headers:{'content-type':'application/json'},body:JSON.stringify({error:error.message||'Wholesale scan failed'})};
  }
}
