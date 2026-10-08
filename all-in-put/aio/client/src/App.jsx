import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const mmss = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

const Toast = ({ message }) => (
  <div className="toast" style={{ display: message ? 'block' : 'none' }}>
    {message}
  </div>
);

const Strip = () => (
  <div className="strip">
    <div>
      {Array(8).fill(['Every credit counts', '<b>●</b> Going once', 'Going twice', '<b>Sold!</b>', 'Spend wisely']).flat().map((x, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: x }} />
      ))}
    </div>
  </div>
);

const Nav = ({ items, active, tok, role, me, logout }) => (
  <nav>
    <a className="brand" href="#/"><i className="dot"></i>All-in Put</a>
    {items.map(([k, l]) => (
      <a key={k} className={active === k ? 'on' : ''} href={`#/${k}`}>{l}</a>
    ))}
    <span className="sp"></span>
    {tok && (
      <>
        <span className="mono mut">{role === 'admin' ? 'Admin' : me ? me.u : ''}</span>
        <button onClick={logout}>Log out</button>
      </>
    )}
  </nav>
);

const Home = ({ api, setTok, setRole, showToast, tok, role, me, logout }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');

  const doLogin = async (e) => {
    e.preventDefault();
    try {
      const j = await api('login', { username: u, password: p });
      setTok(j.token); setRole(j.role);
      localStorage.tok = j.token; localStorage.role = j.role;
      window.location.hash = j.role === 'admin' ? '#/admin' : '#/shop';
    } catch (x) {
      showToast(x.message);
    }
  };

  return (
    <>
      <Nav items={[]} active="" tok={tok} role={role} me={me} logout={logout} />
      <div className="wrap">
        <div className="hero">
          <div className="hero-text" style={{ paddingBottom: '40px' }}>
            <img className="logo" src="/logo-removebg-preview.png" alt="All-in Put" />
            <div className="mono red" style={{ marginTop: '14px' }}>Team-based electronics &amp; innovation event</div>
            <h1>Bid. Build. <span className="red">Win.</span></h1>
            <p className="mut" style={{ fontSize: '19px', maxWidth: '440px' }}>
              Bid for components with virtual credits. Build a working project with only what you win.
            </p>
            <form className="login" onSubmit={doLogin}>
              <input placeholder="Team or Admin username" required value={u} onChange={e => setU(e.target.value)} />
              <input type="password" placeholder="Password" required value={p} onChange={e => setP(e.target.value)} />
              <button className="btn">Enter portal →</button>
            </form>
          </div>
          <div className="hero-img-wrap">
            <div className="red-circle"></div>
            <img className="car" src="/car_clean.png" alt="" />
          </div>
          <div className="lot-tag">LOT #01 - SOLD?</div>
        </div>
      </div>
      <Strip />
    </>
  );
};

const Shop = ({ pub, me, setMe, ph, priceOf, api, showToast, tok, role, logout }) => {
  const [tab, setTab] = useState('shop');
  const [qtys, setQtys] = useState({});
  
  if (!pub) return <div className="wrap">Loading...</div>;
  const { p, left } = ph();

  const buy = async (id, baseQty = 1) => {
    const q = qtys[id] || baseQty;
    try {
      const data = await api('buy', { id, qty: Number(q) });
      setMe(data);
      showToast('Purchased ×' + q);
    } catch (e) { showToast(e.message); }
  };

  return (
    <>
      <Nav items={[['shop', 'Shop']]} active="shop" tok={tok} role={role} me={me} logout={logout} />
      <div className="wrap">
        <div className="bar">
          <div>
            <div className="big mono">{p === 'idle' ? mmss(pub.baseMs) : mmss(left)}</div>
            <div className="mut">until prices double</div>
          </div>
          <div>
            <div className="big" style={{ fontSize: '24px', paddingTop: '10px' }}>
              <span className={`tag mono ${p === 'double' ? 'd' : ''}`}>
                {p === 'double' ? 'Double price — ' + pub.mult + '×' : p === 'base' ? 'Base price window' : 'Not started'}
              </span>
            </div>
          </div>
        </div>
        <div className="tabs">
          <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>Shop</button>
          <button className={tab === 'bid' ? 'on' : ''} onClick={() => setTab('bid')}>Bid</button>
          <button className={tab === 'kit' ? 'on' : ''} onClick={() => setTab('kit')}>My kit</button>
          <span style={{ flex: 1 }}></span>
          <span style={{ padding: '14px 0' }} className="mono">Credits <b className="red" style={{ fontSize: '18px' }}>{me ? fmt(me.credits) : '…'}</b></span>
        </div>
        
        {tab === 'shop' && (
          <div className="grid">
            {pub.components.map(x => (
              <div className="card" key={x.id}>
                <h3>{x.name}</h3>
                <div className="price">{fmt(priceOf(x.base))}</div>
                <div className="mono mut">per unit</div>
                <div className="row">
                  <input type="number" min="1" value={qtys[x.id] || 1} onChange={e => setQtys({...qtys, [x.id]: e.target.value})} disabled={x.soldOut} />
                  <button className="btn sm buy" disabled={x.soldOut || p === 'idle'} onClick={() => buy(x.id, qtys[x.id] || 1)}>
                    {x.soldOut ? 'Sold out' : 'Buy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'bid' && (
          <div className="panel" style={{ marginTop: '24px' }}>
            <div className="mono red">// Bidding</div>
            <h2 style={{ margin: '8px 0' }}>Coming soon</h2>
            <p className="mut">The auction round will open here once the organisers set it up.</p>
          </div>
        )}
        {tab === 'kit' && (
          <div className="panel" style={{ marginTop: '24px' }}>
            <div className="mono red">// What you own</div>
            {me && Object.keys(me.inv).length ? (
              <table>
                <tbody>
                  <tr><th>Component</th><th>Qty</th></tr>
                  {pub.components.filter(x => me.inv[x.id]).map(x => (
                    <tr key={x.id}><td>{x.name}</td><td>{me.inv[x.id]}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="mut">Nothing yet — head to the shop.</p>}
          </div>
        )}
      </div>
    </>
  );
};

const Admin = ({ adm, pub, ph, priceOf, api, load, showToast, tok, role, me, logout }) => {
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('all');
  const [activeModalTeam, setActiveModalTeam] = useState(null);
  
  const [bm, setBm] = useState('');
  const [mu, setMu] = useState('');
  const [dc, setDc] = useState('');
  const [tn, setTn] = useState('');
  const [tp, setTp] = useState('');
  const [tc, setTc] = useState('');

  useEffect(() => {
    if (adm) {
      if (bm === '') setBm(adm.timer.baseMin);
      if (mu === '') setMu(adm.mult);
      if (dc === '') setDc(adm.defaultCredits);
    }
  }, [adm]);

  if (!adm || !pub) return <><Nav items={[]} active="admin" tok={tok} role={role} me={me} logout={logout} /><div className="wrap"><p>Loading…</p></div></>;
  const A = adm;
  const { p, left } = ph();

  const post = async (path, body, msg) => {
    try {
      await api(path, body);
      if (msg) showToast(msg);
      await load();
    } catch (e) { showToast(e.message); }
  };

  const resetOrders = async () => {
    if (window.confirm('Clear all recent order logs?')) {
      await post('admin/reset-orders', {}, 'Order logs cleared');
      setSelectedAdminFilter('all');
    }
  };

  const resetAll = async () => {
    if (window.confirm('RESET ALL EVENT DATA?\\n\\nThis will:\\n• Clear all order logs\\n• Reset all team credits to default\\n• Clear all team inventories\\n• Restore component stock levels\\n• Stop and reset the timer')) {
      await post('admin/reset-all', {}, 'All event data reset');
      setSelectedAdminFilter('all');
    }
  };

  const saveComps = () => {
    const list = Array.from(document.querySelectorAll('tr[data-id]')).map(r => ({
      id: r.dataset.id,
      name: r.querySelector('.n').value,
      qty: r.querySelector('.qty').value,
      price: r.querySelector('.pr').value
    }));
    post('admin/components', { list }, 'Inventory saved');
  };

  const filteredOrders = selectedAdminFilter === 'all' ? A.orders : A.orders.filter(o => o.team === selectedAdminFilter);

  return (
    <>
      <Nav items={[['admin', 'Admin'], ['display', 'Display ↗']]} active="admin" tok={tok} role={role} me={me} logout={logout} />
      <div className="wrap">
        <h2>Timer</h2>
        <div className="panel">
          <div className="flex">
            <div>
              <div className="clock">{p === 'idle' ? mmss(pub.baseMs) : mmss(left)}</div>
              <span className={`tag mono ${p === 'double' ? 'd' : ''}`}>
                {p === 'double' ? 'Double price — ' + pub.mult + '×' : p === 'base' ? 'Base price window' : 'Not started'}
              </span>
            </div>
            <label>Base-price minutes<input type="number" min="1" value={bm} onChange={e => setBm(e.target.value)} /></label>
            <button className="btn r" onClick={() => post('admin/timer', { action: 'start', baseMin: bm }, 'Timer started')}>▶ Start</button>
            <button className="btn o" onClick={() => { if(window.confirm('Reset the timer? The shop will lock.')) post('admin/timer', { action: 'reset', baseMin: bm }, 'Timer reset') }}>Reset</button>
            <button className="btn o" onClick={() => post('admin/timer', { action: '', baseMin: bm }, 'Saved')}>Save minutes</button>
          </div>
        </div>

        <div className="panel">
          <div className="flex">
            <label>Price multiplier after timer (×)<input type="number" step="0.1" value={mu} onChange={e => setMu(e.target.value)} /></label>
            <label>Default starting credits<input type="number" value={dc} onChange={e => setDc(e.target.value)} /></label>
            <button className="btn o" onClick={() => post('admin/settings', { mult: mu, defaultCredits: dc }, 'Saved')}>Save settings</button>
          </div>
        </div>

        <h2>Inventory &amp; prices</h2>
        <div className="panel">
          <table>
            <tbody>
              <tr><th>Component</th><th>Stock left</th><th>Base price</th><th>Selling now</th></tr>
              {A.components.map(c => (
                <tr key={c.id} data-id={c.id}>
                  <td><input className="n" defaultValue={c.name} /></td>
                  <td><input className="qty" type="number" defaultValue={c.qty} /></td>
                  <td><input className="pr" type="number" defaultValue={c.price} /></td>
                  <td className="price" style={{ fontSize: '20px' }}>{fmt(priceOf(c.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p><button className="btn" onClick={saveComps}>Save inventory</button></p>
        </div>

        <h2>Teams Leaderboard</h2>
        <div className="panel">
          <div className="flex">
            <label>Team name<input value={tn} onChange={e => setTn(e.target.value)} /></label>
            <label>Password<input value={tp} onChange={e => setTp(e.target.value)} /></label>
            <label>Credits (optional)<input type="number" placeholder={A.defaultCredits} value={tc} onChange={e => setTc(e.target.value)} /></label>
            <button className="btn" onClick={() => { post('admin/team-add', { u: tn, p: tp, credits: tc }, 'Team added'); setTn(''); setTp(''); setTc(''); }}>Add team</button>
          </div>
        </div>
        
        <div className="panel">
          <table>
            <tbody>
              <tr><th>Team</th><th>Password</th><th>Balance</th><th>Logs</th><th>Actions</th></tr>
              {A.teams.length > 0 ? A.teams.map(t => {
                const tCount = A.orders.filter(o => o.team === t.u).length;
                return (
                  <tr key={t.u} data-t={t.u}>
                    <td><b style={{ fontSize: '16px' }}>{t.u}</b></td>
                    <td><input className="tp" placeholder={t.p} style={{ maxWidth: '140px' }} /></td>
                    <td><input className="tc" type="number" defaultValue={t.credits} style={{ maxWidth: '120px' }} /></td>
                    <td>
                      <button className="btn sm o" onClick={() => setActiveModalTeam(t.u)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>📋 View Logs</span><span className="tag sm">{tCount}</span>
                      </button>
                    </td>
                    <td>
                      <button className="btn sm o" onClick={(e) => {
                        const r = e.target.closest('tr');
                        post('admin/team-edit', { u: t.u, p: r.querySelector('.tp').value, credits: r.querySelector('.tc').value }, 'Updated');
                      }}>Update</button>
                      <button className="btn sm o" onClick={() => { if(window.confirm('Delete team '+t.u+'?')) post('admin/team-del', { u: t.u }); }}>Delete</button>
                    </td>
                  </tr>
                );
              }) : <tr><td className="mut" colSpan="5">No teams yet</td></tr>}
            </tbody>
          </table>
          <p className="mut">Password box shows current password as placeholder. Click "View Logs" to view individual logs &amp; balance for that team.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '36px 0 12px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="mono mut">Filter by Team:</span>
            <select style={{ maxWidth: '220px' }} value={selectedAdminFilter} onChange={e => setSelectedAdminFilter(e.target.value)}>
              <option value="all">All Teams ({A.orders.length})</option>
              {A.teams.map(t => (
                <option key={t.u} value={t.u}>{t.u} ({A.orders.filter(o => o.team === t.u).length})</option>
              ))}
            </select>
            <button className="btn sm o" onClick={resetOrders} style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>Clear Orders</button>
          </div>
        </div>
        
        <div className="panel">
          <table>
            <tbody>
              <tr><th>Time</th><th>Team</th><th>Item</th><th>Qty</th><th>Total</th><th>Balance</th><th>Tier</th></tr>
              {filteredOrders.length > 0 ? filteredOrders.slice(0, 50).map((o, i) => {
                const teamData = A.teams.find(t => t.u === o.team);
                return (
                  <tr key={i}>
                    <td>{new Date(o.t).toLocaleTimeString()}</td>
                    <td><a href="#!" onClick={(e) => { e.preventDefault(); setActiveModalTeam(o.team); }} style={{ color: 'var(--cream)', fontWeight: 'bold', textDecoration: 'underline' }} title="View Team Inventory & Logs">{o.team}</a></td>
                    <td>{o.item}</td>
                    <td>{o.qty}</td>
                    <td>{fmt(o.total)}</td>
                    <td>{teamData ? fmt(teamData.credits) : '---'}</td>
                    <td>{o.phase === 'double' ? '2×' : 'base'}</td>
                  </tr>
                );
              }) : <tr><td className="mut" colSpan="7">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {activeModalTeam && (() => {
        const tObj = A.teams.find(t => t.u === activeModalTeam);
        if (!tObj) return null;
        const tOrders = A.orders.filter(o => o.team === activeModalTeam);
        const totalSpent = tOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        return (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveModalTeam(null); }}>
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <div className="mono red">// Individual Team Dashboard</div>
                  <h2 style={{ margin: '4px 0 0' }}>{tObj.u}</h2>
                </div>
                <button className="close-btn" onClick={() => setActiveModalTeam(null)}>✕</button>
              </div>
              
              <div className="stat-box">
                <div className="stat-card"><div className="mono mut">Current Balance</div><div className="val red">{fmt(tObj.credits)}</div></div>
                <div className="stat-card"><div className="mono mut">Total Spent</div><div className="val">{fmt(totalSpent)}</div></div>
                <div className="stat-card"><div className="mono mut">Orders Placed</div><div className="val">{tOrders.length}</div></div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                <div className="mono mut" style={{ marginBottom: '8px' }}>Inventory Owned</div>
                {Object.keys(tObj.inv || {}).filter(k => tObj.inv[k] > 0).length ? (
                  <div className="inv-tags">
                    {Object.entries(tObj.inv).filter(([_, q]) => q > 0).map(([id, q]) => {
                      const comp = pub ? pub.components.find(c => c.id === id) : null;
                      return <div className="inv-tag" key={id}><span>{comp ? comp.name : id}</span><b>×{q}</b></div>;
                    })}
                  </div>
                ) : <p className="mut" style={{ margin: '4px 0' }}>No components owned yet.</p>}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                <div className="mono mut" style={{ marginBottom: '8px' }}>Individual Logs ({tOrders.length})</div>
                <table>
                  <tbody>
                    <tr><th>Time</th><th>Item</th><th>Qty</th><th>Total</th><th>Tier</th></tr>
                    {tOrders.length > 0 ? tOrders.map((o, i) => (
                      <tr key={i}>
                        <td>{new Date(o.t).toLocaleTimeString()}</td>
                        <td>{o.item}</td>
                        <td>{o.qty}</td>
                        <td>{fmt(o.total)}</td>
                        <td><span className={`tag ${o.phase === 'double' ? 'd' : ''}`}>{o.phase === 'double' ? '2×' : 'base'}</span></td>
                      </tr>
                    )) : <tr><td className="mut" colSpan="5">No individual orders yet for this team.</td></tr>}
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn sm o" onClick={() => setActiveModalTeam(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

const Display = ({ pub, ph, priceOf }) => {
  if (!pub) return null;
  const { p, left } = ph();
  return (
    <div className="disp">
      <nav><span className="brand"><i className="dot"></i>All-in Put</span><span className="sp"></span><span className="mono mut" style={{ border: 0 }}>Live shop board</span></nav>
      <div className="wrap">
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '30px 0 10px' }}>
          <div>
            <div className="mono mut">Prices {p === 'double' ? 'are now doubled' : 'double in'}</div>
            <div className="clock">{p === 'idle' ? mmss(pub.baseMs) : mmss(left)}</div>
            <span className={`tag mono ${p === 'double' ? 'd' : ''}`}>
              {p === 'double' ? 'Double price — ' + pub.mult + '×' : p === 'base' ? 'Base price window' : 'Not started'}
            </span>
          </div>
          <img src="/logo-removebg-preview.png" style={{ width: 'min(420px, 100%)' }} alt="" />
        </div>
        <div className="grid">
          {pub.components.map(x => (
            <div className="card" key={x.id}>
              <h3>{x.name}</h3>
              <div className="price">{fmt(priceOf(x.base))}</div>
              <div className={`mono ${x.soldOut ? 'red' : 'mut'}`}>{x.soldOut ? 'Sold out' : 'per unit'}</div>
            </div>
          ))}
        </div>
      </div>
      <Strip />
    </div>
  );
};

export default function App() {
  const [tok, setTok] = useState(localStorage.tok || '');
  const [role, setRole] = useState(localStorage.role || '');
  const [route, setRoute] = useState(window.location.hash.replace('#/', '') || 'home');
  const [pub, setPub] = useState(null);
  const [me, setMe] = useState(null);
  const [adm, setAdm] = useState(null);
  const [off, setOff] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  
  const [nowUi, setNowUi] = useState(Date.now() + off);
  const lastV = useRef(-1);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.replace('#/', '') || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const showToast = (m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(''), 2800);
  };

  const api = async (p, b) => {
    const r = await fetch('/api/' + p, {
      method: b ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', 'x-token': tok },
      body: b ? JSON.stringify(b) : undefined
    });
    const j = await r.json();
    if (!r.ok) {
      if (r.status === 401 && p !== 'login') logout(true);
      throw new Error(j.error || 'Error');
    }
    return j;
  };

  const load = async () => {
    if (tok && role === 'admin') {
      try { const data = await api('admin/state'); setAdm(data); } catch(e) {}
    } else if (tok && role === 'team') {
      try { const data = await api('me'); setMe(data); } catch(e) {}
    }
  };

  const logout = (q) => {
    setTok(''); setRole(''); localStorage.clear(); setMe(null); setAdm(null);
    if (typeof q !== 'boolean' || !q) showToast('Logged out');
    window.location.hash = '#/';
  };

  useEffect(() => {
    if (route === 'admin' || route === 'shop') load();
  }, [route, tok, role]);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      setPub(data);
      setOff(data.now - Date.now());
      if (data.v !== lastV.current) {
        lastV.current = data.v;
        const ae = document.activeElement;
        if (!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT') && window.location.hash.includes('admin'))) {
          await load();
        }
      }
    };
    return () => es.close();
  }, [tok, role]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowUi(Date.now() + off);
    }, 250);
    return () => clearInterval(interval);
  }, [off]);

  const ph = () => {
    if (!pub || !pub.startedAt) return { p: 'idle', left: pub ? pub.baseMs : 0 };
    const e = nowUi - pub.startedAt;
    return e < pub.baseMs ? { p: 'base', left: pub.baseMs - e } : { p: 'double', left: 0 };
  };

  const priceOf = (b) => ph().p === 'double' ? b * pub.mult : b;

  return (
    <>
      <Toast message={toastMsg} />
      {route === 'display' ? <Display pub={pub} ph={ph} priceOf={priceOf} /> :
       route === 'admin' && role === 'admin' ? <Admin adm={adm} pub={pub} ph={ph} priceOf={priceOf} api={api} load={load} showToast={showToast} tok={tok} role={role} me={me} logout={logout} /> :
       route === 'shop' && role === 'team' ? <Shop pub={pub} me={me} setMe={setMe} ph={ph} priceOf={priceOf} api={api} showToast={showToast} tok={tok} role={role} logout={logout} /> :
       <Home api={api} setTok={setTok} setRole={setRole} showToast={showToast} tok={tok} role={role} me={me} logout={logout} />}
    </>
  );
}
