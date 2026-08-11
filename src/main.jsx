import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, ChevronRight, Clock3, History, MapPin, Radar, RefreshCw, Settings, SlidersHorizontal, Sparkles, Store, X } from 'lucide-react';
import './styles.css';

const DEFAULTS = { minDiscount: 25, brickSleuth: true, brickRanker: true, argos: true, alerts: true, buyAlerts: true };
const sourceEnabled=(deal,settings)=>deal.source==='Brick Sleuth'?settings.brickSleuth:deal.source==='Brick Ranker'?settings.brickRanker:deal.source==='Argos'?settings.argos:true;

function money(n){ return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n); }
function ago(value){ const mins=Math.max(1,Math.round((Date.now()-new Date(value))/60000)); return mins<60?`${mins}m ago`:`${Math.round(mins/60)}h ago`; }

function App(){
  const [tab,setTab]=useState('deals');
  const [settings,setSettings]=useState(()=>({...DEFAULTS,...JSON.parse(localStorage.getItem('brick-settings')||'{}')}));
  const [deals,setDeals]=useState([]);
  const [history,setHistory]=useState(()=>JSON.parse(localStorage.getItem('brick-history')||'[]'));
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [scanMessage,setScanMessage]=useState('');
  const [detail,setDetail]=useState(null);
  const [filter,setFilter]=useState('All');
  const [lastScan,setLastScan]=useState(new Date());
  const filtered=useMemo(()=>deals.filter(d=>d.discount>=settings.minDiscount && sourceEnabled(d,settings) && (filter==='All'||(filter==='VOUCHER'?d.voucher:d.rating===filter))),[deals,settings,filter]);
  useEffect(()=>{ localStorage.setItem('brick-settings',JSON.stringify(settings)); },[settings]);
  useEffect(()=>{ localStorage.setItem('brick-history',JSON.stringify(history.slice(0,40))); },[history]);
  useEffect(()=>{ fetchDeals(false); if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js'); },[]);
  async function fetchDeals(manual=true){
    setLoading(true);
    setProgress(8);
    setScanMessage('Contacting deal sources…');
    const timer=setInterval(()=>setProgress(value=>Math.min(92,value+Math.max(1,Math.round((92-value)/7)))),350);
    let found=0;
    try {
      const endpoint=manual?`/api/deals?refresh=${Date.now()}`:'/api/deals';
      const res=await fetch(endpoint,{cache:manual?'no-store':'default'});
      if(!res.ok) throw new Error(`Scan request failed (${res.status})`);
      const data=await res.json();
      const nextDeals=data.deals || [];
      found=nextDeals.filter(d=>d.discount>=settings.minDiscount && sourceEnabled(d,settings)).length;
      setDeals(nextDeals);
      const failed=(data.sourceStatus || []).filter(source=>!source.ok);
      setScanMessage(failed.length
        ? `${found} deals found. ${failed.map(source=>`${source.source}: ${source.error}`).join(' · ')}`
        : `${found} qualifying deals found.`);
    }
    catch(error) { setDeals([]); setScanMessage(error.message || 'Scan failed. Please try again.'); }
    finally {
      clearInterval(timer);
      setProgress(100);
      setLastScan(new Date());
      setLoading(false);
      if(manual) setHistory(h=>[{id:Date.now(),time:new Date().toISOString(),found},...h]);
    }
  }
  return <div className="app-shell">
    <header><div><span className="eyebrow"><span className="live-dot"/> LIVE SCOUT</span><h1>Brick Scout</h1><p>LEGO deals worth your attention.</p></div><button className="icon-button" onClick={()=>setTab('settings')} aria-label="Settings"><Settings size={21}/></button></header>
    {tab==='deals' && <main>
      <section className="scan-card"><div className="scan-top"><div className="radar"><Radar size={23}/></div><div><strong>{filtered.length} qualifying deals</strong><span>Last checked {ago(lastScan)}</span></div></div><button className="scan-button" disabled={loading} onClick={()=>fetchDeals(true)}><RefreshCw size={18} className={loading?'spin':''}/>{loading?`SCANNING… ${progress}%`:'SCRAPE NOW'}</button>{loading&&<div className="scan-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><i style={{width:`${progress}%`}}/></div>}{scanMessage&&<p className={`scan-message ${/failed|responded|timed out|error/i.test(scanMessage)?'warning':''}`}>{scanMessage}</p>}<p className="next-run"><Clock3 size={14}/> Auto-scan every 2 hours</p></section>
      <div className="section-heading"><div><span className="kicker">OPPORTUNITY FEED</span><h2>Latest deals</h2></div><SlidersHorizontal size={20}/></div>
      <div className="chips">{['All','VOUCHER','BUY','MAYBE'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
      <div className="deal-list">{filtered.map(d=><article className={`deal-card ${d.voucher?'voucher-deal':''}`} key={`${d.source}-${d.setNumber}`} onClick={()=>setDetail(d)}><div className="deal-head"><div className="retailer source">{d.source}{d.voucher&&<small className="voucher-badge">VOUCHER{d.voucherCode?` · ${d.voucherCode}`:''}</small>}{d.priceVerified&&<small className="verified-badge">LIVE PRICE</small>}{d.source==='Argos'&&<small className="stock-badge">STOCK CHECK</small>}</div><span className="updated">{ago(d.verifiedAt||d.updatedAt)}</span></div><div className="deal-main"><div className="set-art"><span>{d.setNumber}</span><b>LEGO</b></div><div className="deal-copy"><span className="set-no">LEGO® {d.setNumber}</span><h3>{d.name}</h3><p>{d.source==='Argos'?'Deal store availability required':d.voucher?'Checkout price — verify voucher':d.priceVerified?'Amazon price checked now':'Delivery unverified'}</p></div><ChevronRight className="chevron" size={20}/></div><div className="price-row"><div><span>{d.voucher?'AFTER VOUCHER':'NOW'}</span><strong>{money(d.price)}</strong></div><div><span>{d.shelfPrice?'SHELF PRICE':'WAS'}</span><s>{money(d.shelfPrice||d.normalPrice)}</s></div><div className="discount">−{d.discount}%</div></div><div className="verdict"><span className={`rating ${d.rating.toLowerCase()}`}>{d.rating}</span><div><b>{d.source}</b><p>{d.rationale}</p></div></div><div className="availability"><Store size={15}/>{d.availability}</div></article>)}</div>
    </main>}
    {tab==='history'&&<HistoryView history={history}/>} 
    {tab==='settings'&&<SettingsView settings={settings} setSettings={setSettings}/>} 
    <nav><button className={tab==='deals'?'active':''} onClick={()=>setTab('deals')}><Sparkles/><span>Deals</span></button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><History/><span>History</span></button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/><span>Settings</span></button></nav>
    {detail&&<DealSheet deal={detail} onClose={()=>setDetail(null)}/>} 
  </div>
}

function Toggle({on,onChange,locked=false}){ return <button className={`toggle ${on?'on':''}`} onClick={()=>!locked&&onChange(!on)} aria-pressed={on} aria-disabled={locked}><i/></button> }
function SettingsView({settings,setSettings}){ const set=(k,v)=>setSettings(s=>({...s,[k]:v})); return <main className="page"><span className="kicker">YOUR SCOUT RULES</span><h2>Settings</h2><section className="settings-card"><label className="range-label"><span><b>Minimum discount</b><small>Only surface genuine savings</small></span><strong>{settings.minDiscount}%+</strong></label><input type="range" min="10" max="50" step="5" value={settings.minDiscount} onChange={e=>set('minDiscount',+e.target.value)}/></section><section className="settings-card"><Setting icon={<Store/>} title="Brick Sleuth" sub="Cross-retailer LEGO prices" control={<Toggle on={settings.brickSleuth} onChange={v=>set('brickSleuth',v)}/>}/><Setting icon={<Store/>} title="Brick Ranker" sub="Amazon UK prices and vouchers" control={<Toggle on={settings.brickRanker} onChange={v=>set('brickRanker',v)}/>}/><Setting icon={<Store/>} title="Argos" sub="Sales and official LEGO vouchers" control={<Toggle on={settings.argos} onChange={v=>set('argos',v)}/>}/></section><h3 className="group-title">ALERTS</h3><section className="settings-card"><Setting icon={<Bell/>} title="Deal alerts" sub="Notify when new deals qualify" control={<Toggle on={settings.alerts} onChange={v=>set('alerts',v)}/>}/><Setting title="BUY ratings only" sub="Keep notifications high-signal" control={<Toggle on={settings.buyAlerts} onChange={v=>set('buyAlerts',v)}/>} /></section></main> }
function Setting({icon,title,sub,control}){ return <div className="setting-row">{icon&&<span className="setting-icon">{icon}</span>}<div className="setting-text"><b>{title}</b><small>{sub}</small></div><div className="setting-control">{control}</div></div> }
function HistoryView({history}){ return <main className="page"><span className="kicker">SCAN LOG</span><h2>Deal history</h2>{history.length?<section className="settings-card locations">{history.map(x=><div key={x.id}><span><Clock3/></span><b>{new Date(x.time).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</b><small>{x.found} deals found</small></div>)}</section>:<div className="empty"><History/><h3>No scans yet</h3><p>Run your first manual scan and it will appear here.</p></div>}</main> }
function DealSheet({deal,onClose}){ return <div className="overlay" onClick={onClose}><section className="sheet" onClick={e=>e.stopPropagation()}><button className="close" onClick={onClose}><X/></button><span className={`rating ${deal.rating.toLowerCase()}`}>{deal.voucher?'VOUCHER':deal.rating}</span><h2>{deal.name}</h2><p className="muted">LEGO® {deal.setNumber} · via {deal.source}</p><div className="sheet-price"><strong>{money(deal.price)}</strong><span>{deal.voucher?`${deal.voucherCode?`Use ${deal.voucherCode}. `:''}Estimated checkout price—verify eligibility.`:`Save ${money(deal.normalPrice-deal.price)} against RRP.`}</span></div><h3>Cross-check</h3><p>{deal.rationale}</p>{deal.alternatives?.length>0&&<div className="alternatives">{deal.alternatives.map(item=><div key={item.source}><span>{item.source}</span><b>{money(item.price)}</b></div>)}</div>}{deal.source==='Argos'&&<><h3>Local collection priority</h3><p>Check {deal.preferredStores?.join(' → ')}. Argos will show the exact stocked branch after you enter your postcode.</p></>}<div className="availability"><Store size={16}/>{deal.availability}</div><a className="deal-link" href={deal.url} target="_blank" rel="noreferrer">{deal.source==='Argos'?'Check local Argos stock':'View deal at '+deal.source}</a><p className="fineprint">Voucher eligibility, price, stock and delivery can change. Always confirm the final checkout price before buying.</p></section></div> }
createRoot(document.getElementById('root')).render(<App/>);
