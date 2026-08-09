import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, ChevronRight, Clock3, History, MapPin, Radar, RefreshCw, Settings, SlidersHorizontal, Sparkles, Store, X } from 'lucide-react';
import './styles.css';

const DEFAULTS = { minDiscount: 25, primeOnly: true, amazon: true, argos: true, alerts: true, buyAlerts: true, locations: ['Deal', 'Dover', 'Sandwich / Ramsgate', 'Canterbury / Folkestone', 'Wider Kent'] };
const fallbackDeals = [
  { id:'75379-amz', setNumber:'75379', name:'R2-D2', theme:'Star Wars', retailer:'Amazon UK', prime:true, price:69.99, normalPrice:99.99, rrp:89.99, discount:30, rating:'BUY', score:92, rationale:'Iconic display set with strong gift appeal. Healthy margin even against the recent street price.', availability:'In stock · Prime delivery', updatedAt:new Date().toISOString() },
  { id:'42171-argos', setNumber:'42171', name:'Mercedes-AMG F1 W14 E Performance', theme:'Technic', retailer:'Argos', prime:false, price:139.99, normalPrice:189.99, rrp:189.99, discount:26, rating:'BUY', score:87, rationale:'Recognisable licence and high piece count. Reliable live-auction interest at this entry price.', availability:'Deal: collect today', updatedAt:new Date(Date.now()-18*60000).toISOString() },
  { id:'10328-amz', setNumber:'10328', name:'Bouquet of Roses', theme:'Icons', retailer:'Amazon UK', prime:true, price:38.49, normalPrice:54.99, rrp:54.99, discount:30, rating:'MAYBE', score:76, rationale:'Broad audience and easy to ship, but the set is frequently discounted. Best as a quick-turn item.', availability:'In stock · Prime delivery', updatedAt:new Date(Date.now()-42*60000).toISOString() },
  { id:'60419-argos', setNumber:'60419', name:'Police Prison Island', theme:'City', retailer:'Argos', prime:false, price:59.99, normalPrice:84.99, rrp:84.99, discount:29, rating:'MAYBE', score:71, rationale:'Good play value and discount, though City sets face heavier reseller competition.', availability:'Dover: limited stock', updatedAt:new Date(Date.now()-65*60000).toISOString() }
];

function money(n){ return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n); }
function ago(value){ const mins=Math.max(1,Math.round((Date.now()-new Date(value))/60000)); return mins<60?`${mins}m ago`:`${Math.round(mins/60)}h ago`; }

function App(){
  const [tab,setTab]=useState('deals');
  const [settings,setSettings]=useState(()=>({...DEFAULTS,...JSON.parse(localStorage.getItem('brick-settings')||'{}')}));
  const [deals,setDeals]=useState(fallbackDeals);
  const [history,setHistory]=useState(()=>JSON.parse(localStorage.getItem('brick-history')||'[]'));
  const [loading,setLoading]=useState(false);
  const [detail,setDetail]=useState(null);
  const [filter,setFilter]=useState('All');
  const [lastScan,setLastScan]=useState(new Date());
  const filtered=useMemo(()=>deals.filter(d=>d.discount>=settings.minDiscount && (d.retailer==='Amazon UK'?settings.amazon:settings.argos) && (filter==='All'||d.rating===filter)),[deals,settings,filter]);
  useEffect(()=>{ localStorage.setItem('brick-settings',JSON.stringify(settings)); },[settings]);
  useEffect(()=>{ localStorage.setItem('brick-history',JSON.stringify(history.slice(0,40))); },[history]);
  useEffect(()=>{ fetchDeals(false); if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js'); },[]);
  async function fetchDeals(manual=true){
    setLoading(true);
    try { const res=await fetch(manual?'/api/poll':'/api/deals'); if(!res.ok) throw new Error(); const data=await res.json(); if(data.deals?.length) setDeals(data.deals); }
    catch { /* Demo data keeps the PWA useful during local/offline use. */ }
    finally { setLastScan(new Date()); setLoading(false); if(manual) setHistory(h=>[{id:Date.now(),time:new Date().toISOString(),found:filtered.length},...h]); }
  }
  return <div className="app-shell">
    <header><div><span className="eyebrow"><span className="live-dot"/> LIVE SCOUT</span><h1>Brick Scout</h1><p>LEGO deals worth your attention.</p></div><button className="icon-button" onClick={()=>setTab('settings')} aria-label="Settings"><Settings size={21}/></button></header>
    {tab==='deals' && <main>
      <section className="scan-card"><div className="scan-top"><div className="radar"><Radar size={23}/></div><div><strong>{filtered.length} qualifying deals</strong><span>Last checked {ago(lastScan)}</span></div></div><button className="scan-button" disabled={loading} onClick={()=>fetchDeals(true)}><RefreshCw size={18} className={loading?'spin':''}/>{loading?'SCANNING…':'SCRAPE NOW'}</button><p className="next-run"><Clock3 size={14}/> Auto-scan every 2 hours</p></section>
      <div className="section-heading"><div><span className="kicker">OPPORTUNITY FEED</span><h2>Latest deals</h2></div><SlidersHorizontal size={20}/></div>
      <div className="chips">{['All','BUY','MAYBE','SKIP'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
      <div className="deal-list">{filtered.map((d,i)=><article className="deal-card" key={d.id} onClick={()=>setDetail(d)}><div className="deal-head"><div className={`retailer ${d.retailer==='Argos'?'argos':'amazon'}`}>{d.retailer==='Argos'?'ARGOS':'amazon'}{d.prime&&<small>prime</small>}</div><span className="updated">{ago(d.updatedAt)}</span></div><div className="deal-main"><div className="set-art"><span>{d.setNumber}</span><b>{d.theme.slice(0,2).toUpperCase()}</b></div><div className="deal-copy"><span className="set-no">LEGO® {d.setNumber}</span><h3>{d.name}</h3><p>{d.theme}</p></div><ChevronRight className="chevron" size={20}/></div><div className="price-row"><div><span>NOW</span><strong>{money(d.price)}</strong></div><div><span>RECENT NORMAL</span><s>{money(d.normalPrice)}</s></div><div className="discount">−{d.discount}%</div></div><div className="verdict"><span className={`rating ${d.rating.toLowerCase()}`}>{d.rating}</span><div><b>{d.score}/100 resale score</b><p>{d.rationale}</p></div></div>{d.retailer==='Argos'&&<div className="availability"><MapPin size={15}/>{d.availability}</div>}</article>)}</div>
    </main>}
    {tab==='history'&&<HistoryView history={history}/>} 
    {tab==='settings'&&<SettingsView settings={settings} setSettings={setSettings}/>} 
    <nav><button className={tab==='deals'?'active':''} onClick={()=>setTab('deals')}><Sparkles/><span>Deals</span></button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><History/><span>History</span></button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/><span>Settings</span></button></nav>
    {detail&&<DealSheet deal={detail} onClose={()=>setDetail(null)}/>} 
  </div>
}

function Toggle({on,onChange,locked=false}){ return <button className={`toggle ${on?'on':''}`} onClick={()=>!locked&&onChange(!on)} aria-pressed={on} aria-disabled={locked}><i/></button> }
function SettingsView({settings,setSettings}){ const set=(k,v)=>setSettings(s=>({...s,[k]:v})); return <main className="page"><span className="kicker">YOUR SCOUT RULES</span><h2>Settings</h2><section className="settings-card"><label className="range-label"><span><b>Minimum discount</b><small>Only surface genuine savings</small></span><strong>{settings.minDiscount}%+</strong></label><input type="range" min="10" max="50" step="5" value={settings.minDiscount} onChange={e=>set('minDiscount',+e.target.value)}/></section><section className="settings-card"><Setting icon={<Store/>} title="Amazon UK" sub="Show Amazon deals" control={<Toggle on={settings.amazon} onChange={v=>set('amazon',v)}/>}/><Setting title="Prime-only" sub="Locked on for trusted delivery" control={<><span className="locked">LOCKED</span><Toggle on locked/></>}/><Setting icon={<Store/>} title="Argos" sub="Show collection deals" control={<Toggle on={settings.argos} onChange={v=>set('argos',v)}/>}/></section><h3 className="group-title">ARGOS STOCK PRIORITY</h3><section className="settings-card locations">{settings.locations.map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b></div>)}</section><h3 className="group-title">ALERTS</h3><section className="settings-card"><Setting icon={<Bell/>} title="Deal alerts" sub="Notify when new deals qualify" control={<Toggle on={settings.alerts} onChange={v=>set('alerts',v)}/>}/><Setting title="BUY ratings only" sub="Keep notifications high-signal" control={<Toggle on={settings.buyAlerts} onChange={v=>set('buyAlerts',v)}/>} /></section></main> }
function Setting({icon,title,sub,control}){ return <div className="setting-row">{icon&&<span className="setting-icon">{icon}</span>}<div className="setting-text"><b>{title}</b><small>{sub}</small></div><div className="setting-control">{control}</div></div> }
function HistoryView({history}){ return <main className="page"><span className="kicker">SCAN LOG</span><h2>Deal history</h2>{history.length?<section className="settings-card locations">{history.map(x=><div key={x.id}><span><Clock3/></span><b>{new Date(x.time).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</b><small>{x.found} deals found</small></div>)}</section>:<div className="empty"><History/><h3>No scans yet</h3><p>Run your first manual scan and it will appear here.</p></div>}</main> }
function DealSheet({deal,onClose}){ return <div className="overlay" onClick={onClose}><section className="sheet" onClick={e=>e.stopPropagation()}><button className="close" onClick={onClose}><X/></button><span className={`rating ${deal.rating.toLowerCase()}`}>{deal.rating}</span><h2>{deal.name}</h2><p className="muted">LEGO® {deal.setNumber} · {deal.theme}</p><div className="sheet-price"><strong>{money(deal.price)}</strong><span>Save {money(deal.normalPrice-deal.price)} against recent normal</span></div><h3>Why it scored {deal.score}/100</h3><p>{deal.rationale}</p><div className="availability"><MapPin size={16}/>{deal.availability}</div><p className="fineprint">Always confirm price, condition and availability with the retailer before buying.</p></section></div> }
createRoot(document.getElementById('root')).render(<App/>);
