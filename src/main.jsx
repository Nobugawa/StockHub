import React, {useEffect, useMemo, useState} from 'react'
import { createRoot } from 'react-dom/client'
import { Eye, EyeOff, LogOut, Plus, RefreshCw, Search } from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'

const money = n => n == null ? '—' : new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n)
const pct = n => n == null ? '—' : `${Number(n).toFixed(1)}%`

function Login({onLogin}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [show,setShow]=useState(false)
  const [error,setError]=useState('')
  const submit=async e=>{e.preventDefault();setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);else onLogin?.()}
  return <div className="login"><form className="login-card" onSubmit={submit}>
    <h2 style={{marginTop:0}}>Private Stock Research</h2><p className="muted">Authorized access only.</p>
    <label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{margin:'6px 0 12px'}} />
    <label>Password</label><div className="pw" style={{marginTop:6}}><input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required/><button className="eye" type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
    {error&&<p style={{color:'#ff9ca8'}}>{error}</p>}<button className="btn primary" style={{width:'100%',marginTop:16}}>Sign in</button>
  </form></div>
}

function App(){
 const [session,setSession]=useState(null),[stocks,setStocks]=useState([]),[screens,setScreens]=useState([]),[search,setSearch]=useState(''),[selected,setSelected]=useState(null),[showAdd,setShowAdd]=useState(false),[loading,setLoading]=useState(true)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
 const load=async()=>{setLoading(true);const [{data:s,error:e1},{data:sc,error:e2}]=await Promise.all([supabase.from('stock_dashboard').select('*').order('ticker'),supabase.from('screen_definitions').select('*').eq('active',true).order('name')]);if(e1)console.error(e1);if(e2)console.error(e2);setStocks(s||[]);setScreens(sc||[]);setLoading(false)}
 useEffect(()=>{if(session)load()},[session])
 const filtered=useMemo(()=>stocks.filter(s=>(s.ticker+' '+(s.company_name||'')+' '+(s.sector||'')).toLowerCase().includes(search.toLowerCase())),[stocks,search])
 if(loading&&!session)return <div className="login"><div className="muted">Loading…</div></div>
 if(!session)return <Login/>
 return <div className="shell"><header className="topbar"><div className="brand"><h1>Stock Research Database</h1><p>Private • fundamentals + news + technical screens + ownership evidence</p></div><button className="btn" onClick={()=>supabase.auth.signOut()}><LogOut size={15}/> Sign out</button></header>
 <main className="wrap"><div className="grid"><div className="card"><div className="muted">Candidates</div><div className="metric">{stocks.length}</div></div><div className="card"><div className="muted">Active screens</div><div className="metric">{screens.length}</div></div><div className="card"><div className="muted">Insider-buy flags</div><div className="metric">{stocks.filter(x=>x.significant_net_insider_buying).length}</div></div><div className="card"><div className="muted">Needs research refresh</div><div className="metric">{stocks.filter(x=>!x.last_researched_at || Date.now()-new Date(x.last_researched_at).getTime()>14*864e5).length}</div></div></div>
 <div className="toolbar"><div style={{position:'relative',flex:'1 1 320px'}}><Search size={17} style={{position:'absolute',left:12,top:11,color:'#8497af'}}/><input className="input" placeholder="Search ticker, company, sector…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:36}}/></div><button className="btn" onClick={load}><RefreshCw size={15}/> Refresh</button><button className="btn primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add candidate</button></div>
 <div className="table-wrap"><table className="table"><thead><tr><th>Ticker</th><th>Company</th><th>Price</th><th>Market cap</th><th>Revenue growth</th><th>Gross margin</th><th>Cash / debt</th><th>Insiders</th><th>Technical</th><th>Research</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id} onClick={()=>setSelected(s)} style={{cursor:'pointer'}}><td className="ticker">{s.ticker}</td><td>{s.company_name}<div className="muted" style={{fontSize:11}}>{s.sector||''}</div></td><td>{s.last_price??'—'}</td><td>{money(s.market_cap)}</td><td>{pct(s.revenue_growth_yoy)}</td><td>{pct(s.gross_margin)}</td><td>{money(s.cash_and_equivalents)} / {money(s.total_debt)}</td><td>{s.significant_net_insider_buying?<span className="pill good">NET BUYING</span>:<span className="pill">—</span>}</td><td>{s.latest_technical_summary||'—'}</td><td>{s.last_researched_at?new Date(s.last_researched_at).toLocaleDateString():'—'}</td></tr>)}</tbody></table></div>
 {selected&&<StockDetail stock={selected} onClose={()=>setSelected(null)} onSaved={()=>{load();setSelected(null)}}/>}
 {showAdd&&<AddStock onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load()}}/>}
 </main><footer className="footer">Private research system • no public indexing</footer></div>
}

function AddStock({onClose,onSaved}){const [f,setF]=useState({ticker:'',company_name:'',sector:'',industry:'',business_overview:'',status:'watch'});const save=async()=>{const payload={...f,ticker:f.ticker.trim().toUpperCase()};const {error}=await supabase.from('stocks').insert(payload);if(error)alert(error.message);else onSaved()};return <div className="modal-back"><div className="modal"><h2>Add candidate</h2><div className="form-grid"><input className="input" placeholder="Ticker" value={f.ticker} onChange={e=>setF({...f,ticker:e.target.value})}/><input className="input" placeholder="Company name" value={f.company_name} onChange={e=>setF({...f,company_name:e.target.value})}/><input className="input" placeholder="Sector" value={f.sector} onChange={e=>setF({...f,sector:e.target.value})}/><input className="input" placeholder="Industry" value={f.industry} onChange={e=>setF({...f,industry:e.target.value})}/><textarea className="textarea full" rows="5" placeholder="What the business does" value={f.business_overview} onChange={e=>setF({...f,business_overview:e.target.value})}/></div><div className="toolbar" style={{justifyContent:'flex-end'}}><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save candidate</button></div></div></div>}

function StockDetail({stock,onClose}){const [tab,setTab]=useState('overview'),[snapshots,setSnapshots]=useState([]),[technicals,setTechnicals]=useState([]),[news,setNews]=useState([]),[insiders,setInsiders]=useState([]),[institutions,setInstitutions]=useState([])
 useEffect(()=>{Promise.all([supabase.from('research_snapshots').select('*').eq('stock_id',stock.id).order('as_of_date',{ascending:false}),supabase.from('technical_snapshots').select('*,screen_definitions(name)').eq('stock_id',stock.id).order('as_of_date',{ascending:false}),supabase.from('news_items').select('*').eq('stock_id',stock.id).order('published_at',{ascending:false}),supabase.from('insider_activity').select('*').eq('stock_id',stock.id).order('transaction_date',{ascending:false}),supabase.from('institutional_activity').select('*').eq('stock_id',stock.id).order('as_of_date',{ascending:false})]).then(rs=>{setSnapshots(rs[0].data||[]);setTechnicals(rs[1].data||[]);setNews(rs[2].data||[]);setInsiders(rs[3].data||[]);setInstitutions(rs[4].data||[])})},[stock.id])
 const tabs=['overview','fundamentals','technical','news','insiders','institutions']
 return <div className="detail card"><div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><h2 style={{margin:'0 0 5px'}}><span className="ticker">{stock.ticker}</span> — {stock.company_name}</h2><div className="muted">{stock.sector} {stock.industry&&`• ${stock.industry}`}</div></div><button className="btn" onClick={onClose}>Close</button></div><div className="tabs">{tabs.map(t=><button key={t} className={'tab '+(tab===t?'active':'')} onClick={()=>setTab(t)}>{t}</button>)}</div>
 {tab==='overview'&&<div className="snapshot">{stock.business_overview||'No business overview saved yet.'}</div>}
 {tab==='fundamentals'&&<div>{snapshots.map(x=><div className="card" key={x.id} style={{marginBottom:10}}><b>{x.as_of_date}</b><div className="snapshot">{x.summary}</div></div>)}{!snapshots.length&&<p className="muted">No fundamentals snapshots yet.</p>}</div>}
 {tab==='technical'&&<div>{technicals.map(x=><div className="card" key={x.id} style={{marginBottom:10}}><b>{x.as_of_date} • {x.screen_definitions?.name||'Technical review'}</b> {x.passed!=null&&<span className={'pill '+(x.passed?'good':'warn')}>{x.passed?'PASS':'NO PASS'}</span>}<div className="snapshot">{x.summary}</div></div>)}{!technicals.length&&<p className="muted">No technical snapshots yet.</p>}</div>}
 {tab==='news'&&<div>{news.map(x=><div className="card" key={x.id} style={{marginBottom:10}}><b>{x.headline}</b><div className="muted">{x.published_at?new Date(x.published_at).toLocaleString():''} • {x.source||''}</div><p>{x.summary}</p></div>)}{!news.length&&<p className="muted">No saved news yet.</p>}</div>}
 {tab==='insiders'&&<div>{insiders.map(x=><div className="card" key={x.id} style={{marginBottom:10}}><b>{x.transaction_date} • {x.insider_name}</b><p>{x.transaction_type} • {money(x.shares)} shares • ${x.price??'—'} • value {money(x.value)}</p></div>)}{!insiders.length&&<p className="muted">No insider records yet.</p>}</div>}
 {tab==='institutions'&&<div>{institutions.map(x=><div className="card" key={x.id} style={{marginBottom:10}}><b>{x.as_of_date} • {x.institution_name}</b><p>{x.activity_type} • shares {money(x.shares)} • change {pct(x.change_pct)}</p></div>)}{!institutions.length&&<p className="muted">No institutional records yet.</p>}</div>}
 </div>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
