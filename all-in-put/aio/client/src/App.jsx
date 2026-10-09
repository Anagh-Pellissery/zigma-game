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
                  {[...pub.components, ...(pub.auctionItems || [])].filter(x => me.inv[x.id]).map(x => (
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

const aucClock = (lot, status, now) => {
  if (!lot) return { text: '--:--', up: false, pct: 0 };
  if (!lot.time) return { text: '∞', up: false, pct: 100 };
  const left = status === 'paused' ? (lot.remainingMs ?? 0) : Math.max(0, (lot.endsAt ?? now) - now);
  return { text: mmss(left), up: status === 'live' && left <= 0, pct: Math.min(100, (left / (lot.time * 1000)) * 100), low: left <= 10000 };
};

const AuctionAdmin = ({ adm, pub, api, load, showToast, now }) => {
  const A = adm.auction;
  const pa = pub.auction;
  const items = A.items;
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const [lq, setLq] = useState(A.queue);
  const [dragFrom, setDragFrom] = useState(null);
  const [addId, setAddId] = useState(items[0]?.id || '');
  const [bidTeam, setBidTeam] = useState('');
  const [bidAmt, setBidAmt] = useState('');
  const qKey = A.queue.join(',');

  useEffect(() => { setLq(A.queue); }, [qKey]);

  const post = async (path, body, msg) => {
    try { await api(path, body); if (msg) showToast(msg); await load(); }
    catch (e) { showToast(e.message); await load(); }
  };

  const saveQueue = async (next) => {
    setLq(next);
    try { await api('admin/auction-queue', { queue: next }); await load(); }
    catch (e) { showToast(e.message); await load(); }
  };
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= lq.length) return;
    const n = [...lq]; [n[i], n[j]] = [n[j], n[i]]; saveQueue(n);
  };
  const toTop = i => { const n = [...lq]; const [x] = n.splice(i, 1); n.unshift(x); saveQueue(n); };
  const remove = i => saveQueue(lq.filter((_, k) => k !== i));
  const drop = to => {
    if (dragFrom === null || dragFrom === to) return setDragFrom(null);
    const n = [...lq]; const [x] = n.splice(dragFrom, 1); n.splice(to, 0, x);
    setDragFrom(null); saveQueue(n);
  };

  const generate = () => {
    if (lq.length && !window.confirm('Replace the current list with a new random one?')) return;
    post('admin/auction-generate', {}, 'Random list generated');
  };
  const saveItems = () => {
    const list = Array.from(document.querySelectorAll('tr[data-aid]')).map(r => ({
      id: r.dataset.aid, name: r.querySelector('.an').value, time: r.querySelector('.at').value,
      qty: r.querySelector('.aq').value, base: r.querySelector('.ab').value, inc: r.querySelector('.ai').value
    }));
    post('admin/auction-items', { list }, 'Auction components saved');
  };

  // preview of each upcoming lot's starting price: next price + one increment per earlier copy in the list
  const seen = {};
  const rows = lq.map(id => {
    const it = byId[id]; const n = seen[id] || 0; seen[id] = n + 1;
    return { id, it, price: it ? it.next + n * it.inc : 0 };
  });
  const totalSecs = rows.reduce((a, r) => a + (r.it?.time || 0), 0);

  const lot = pa.lot;
  const clk = aucClock(lot, pa.status, now);
  const live = pa.status === 'live' || pa.status === 'paused';

  return (
    <>
      <h2>Component auction</h2>
      <div className="panel">
        <div className="flex" style={{ alignItems: 'center', gap: '28px' }}>
          <div>
            <span className={`tag mono ${live ? 'd' : ''}`}>
              {pa.status === 'idle' ? 'Not started' : pa.status === 'paused' ? 'Paused' : pa.status === 'done' ? 'Auction complete' : clk.up ? "Time's up" : 'Live'}
            </span>
            <div className="clock" style={{ marginTop: '10px', color: clk.low && !clk.up ? 'var(--red)' : undefined }}>{clk.text}</div>
          </div>
          <div style={{ flex: 2, minWidth: '240px' }}>
            {lot ? (
              <>
                <div className="mono mut">On the block</div>
                <div style={{ fontSize: '34px', fontWeight: 700 }}>{lot.name}</div>
                <div className="mono">Starting bid <b className="red">{fmt(lot.start)}</b> · Highest bid <b className="red">{lot.leader ? fmt(lot.bid) : '—'}</b>{lot.leader ? <> · {lot.leader}</> : null}</div>
              </>
            ) : <div className="mut">{pa.status === 'done' ? 'All lots are finished.' : 'Generate a list, then press Start auction. The first random component goes on the block straight away.'}</div>}
          </div>
          <div className="mut mono">{pa.left} lots left<br />{pa.sold} sold · {pa.done - pa.sold} unsold</div>
        </div>

        {live && lot && (
          <div className="flex" style={{ marginTop: '18px' }}>
            <label>Bidding team
              <select value={bidTeam} onChange={e => setBidTeam(e.target.value)}>
                <option value="">Select team…</option>
                {adm.teams.map(t => <option key={t.u} value={t.u}>{t.u} ({fmt(t.credits)})</option>)}
              </select>
            </label>
            <label>Bid amount<input type="number" placeholder={lot.leader ? lot.bid + 1 : lot.start} value={bidAmt} onChange={e => setBidAmt(e.target.value)} /></label>
            <button className="btn r" disabled={pa.status !== 'live'} onClick={async () => { await post('admin/auction-bid', { team: bidTeam, amount: bidAmt }, 'Bid recorded'); setBidAmt(''); }}>Record bid</button>
            <button className="btn" disabled={!lot.leader} onClick={() => post('admin/auction-resolve', { sold: true }, 'Sold!')}>✓ Sold to {lot.leader || '—'}</button>
            <button className="btn o" onClick={() => post('admin/auction-resolve', { sold: false }, 'Passed — no sale')}>No sale / next</button>
            {pa.status === 'live'
              ? <button className="btn o" onClick={() => post('admin/auction-pause', {}, 'Paused')}>⏸ Pause</button>
              : <button className="btn r" onClick={() => post('admin/auction-resume', {}, 'Resumed')}>▶ Resume</button>}
            {lot.time > 0 && <button className="btn o" onClick={() => post('admin/auction-extend', { sec: 10 })}>+10 s</button>}
          </div>
        )}

        <div className="flex" style={{ marginTop: '18px' }}>
          <button className="btn r" disabled={pa.status !== 'idle' || !lq.length} onClick={() => post('admin/auction-start', {}, 'Auction started')}>▶ Start auction</button>
          <button className="btn o" disabled={pa.status !== 'idle'} onClick={generate}>🎲 Generate random list</button>
          <button className="btn o" onClick={() => { if (window.confirm('Reset the auction? The list, history and starting prices are cleared. Credits and items teams already won are NOT refunded (use Reset all event data for that).')) post('admin/auction-reset', {}, 'Auction reset'); }}>Reset auction</button>
        </div>
      </div>

      <div className="panel">
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono red">// Upcoming order ({lq.length} lots{totalSecs ? ` · about ${Math.round(totalSecs / 60)} min of bidding` : ''})</div>
          <div className="flex" style={{ flex: 'none' }}>
            <select style={{ width: '220px' }} value={addId} onChange={e => setAddId(e.target.value)}>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <button className="btn sm o" onClick={() => saveQueue([addId, ...lq])}>Add to top</button>
            <button className="btn sm o" onClick={() => saveQueue([...lq, addId])}>Add to end</button>
          </div>
        </div>
        <div style={{ maxHeight: '420px', overflowY: 'auto', marginTop: '10px' }}>
          <table>
            <tbody>
              <tr><th>#</th><th>Component</th><th>Time</th><th>Starting bid</th><th>Order (drag rows too)</th></tr>
              {rows.length ? rows.map((r, i) => (
                <tr key={i} draggable onDragStart={() => setDragFrom(i)} onDragOver={e => e.preventDefault()} onDrop={() => drop(i)}
                  style={{ cursor: 'grab', opacity: dragFrom === i ? 0.4 : 1 }}>
                  <td className="mono mut">{i + 1}</td>
                  <td><b>{r.it ? r.it.name : r.id}</b></td>
                  <td>{r.it?.time ? r.it.time + ' s' : 'no limit'}</td>
                  <td className="red"><b>{fmt(r.price)}</b></td>
                  <td>
                    <button className="btn sm o" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>{' '}
                    <button className="btn sm o" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>{' '}
                    <button className="btn sm o" onClick={() => toTop(i)} disabled={i === 0}>Top</button>{' '}
                    <button className="btn sm o" onClick={() => remove(i)}>✕</button>
                  </td>
                </tr>
              )) : <tr><td className="mut" colSpan="5">No list yet — press “Generate random list”.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="mono red" style={{ marginBottom: '8px' }}>// Auction components (qty = number of rounds that item goes to auction)</div>
        <table>
          <tbody>
            <tr><th>Component</th><th>Time (s, 0 = no limit)</th><th>Qty</th><th>Base price</th><th>Increment</th><th>Next start</th></tr>
            {items.map(i => (
              <tr key={i.id} data-aid={i.id}>
                <td><input className="an" defaultValue={i.name} /></td>
                <td><input className="at" type="number" min="0" defaultValue={i.time} style={{ maxWidth: '90px' }} /></td>
                <td><input className="aq" type="number" min="0" defaultValue={i.qty} style={{ maxWidth: '80px' }} /></td>
                <td><input className="ab" type="number" min="0" defaultValue={i.base} style={{ maxWidth: '110px' }} /></td>
                <td><input className="ai" type="number" min="0" defaultValue={i.inc} style={{ maxWidth: '90px' }} /></td>
                <td className="price" style={{ fontSize: '18px' }}>{fmt(i.next)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><button className="btn" onClick={saveItems}>Save auction components</button> <span className="mut">Changing base price / qty only takes effect on the next generated list.</span></p>
      </div>

      <div className="panel">
        <div className="mono red" style={{ marginBottom: '8px' }}>// Auction results</div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table>
            <tbody>
              <tr><th>Time</th><th>Component</th><th>Started at</th><th>Result</th></tr>
              {A.history.length ? A.history.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.t).toLocaleTimeString()}</td>
                  <td>{h.name}</td>
                  <td>{fmt(h.start)}</td>
                  <td>{h.sold ? <><b>{fmt(h.price)}</b> → {h.team}</> : <span className="mut">unsold</span>}</td>
                </tr>
              )) : <tr><td className="mut" colSpan="4">Nothing auctioned yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// --- Component image map ---------------------------------------------------
const COMP_IMAGES = {
  'Arduino Nano & Cable': '/Arduino nano and cable.png',
  'Arduino Nano &amp; Cable': '/Arduino nano and cable.png',
  'ESP & Cable': '/ESP32 and cable.png',
  'ESP &amp; Cable': '/ESP32 and cable.png',
  'Voltage Sensor': '/Voltage sensor.png',
  'Current Sensor': '/current sensor.png',
  'RGB LED': null,
  'LDR': '/LDR.png',
  'PIR': '/PIR sensor.png',
  'Ultrasonic': '/HCSR04 ULTRASONIC.png',
  'Buzzer': '/Buzzer.png',
  'IR Sensor': '/IR sensor.png',
  'SG90 Servo': '/SG 90.png',
  'MG90 Servo': '/MG90.png',
  'DHT': '/DHT11 temp and humidity.png',
  'LED': null,
  'Potentiometer (10k)': '/potentiometer.png',
  'Potentiometer (1M)': '/potentiometer.png',
  'Chassis Kit': '/Chasis kit.png',
  'LCD': '/LCD dislplay.png',
};
const getCompImg = (name) => {
  if (!name) return null;
  for (const [k, v] of Object.entries(COMP_IMAGES)) {
    if (name.includes(k.replace('&amp;', '&')) || name.includes(k)) return v;
  }
  return null;
};

// --- Animated countdown ring -----------------------------------------------
const CountdownRing = ({ pct, text, low, up, paused }) => {
  const R = 72, C = 2 * Math.PI * R;
  const dash = C * (1 - pct / 100);
  const arcColor = up ? '#d94221' : low ? '#d94221' : paused ? '#9a9985' : '#eeeadd';
  const textColor = up ? '#d94221' : low ? '#d94221' : paused ? '#9a9985' : '#eeeadd';
  return (
    <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
      <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="#333333" strokeWidth="6" />
        <circle cx="90" cy="90" r={R} fill="none"
          stroke={arcColor}
          strokeWidth="6" strokeLinecap="square"
          strokeDasharray={C} strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: textColor, lineHeight: 1 }}>{text}</div>
        <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9a9985', marginTop: 4, fontFamily: "'Space Mono', monospace" }}>{paused ? 'PAUSED' : up ? "TIME'S UP" : 'REMAINING'}</div>
      </div>
    </div>
  );
};

// --- Medal badge -----------------------------------------------------------
const Medal = ({ rank }) => {
  const labels = ['1', '2', '3'];
  const colors = ['var(--cream)', 'var(--mut)', '#4a4a4a'];
  const textColors = ['var(--bg)', 'var(--bg)', 'var(--mut)'];
  return (
    <div style={{ width: 38, height: 38, border: `2px solid ${colors[rank]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: rank === 0 ? 'var(--cream)' : 'transparent' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', fontWeight: 700, color: rank === 0 ? 'var(--bg)' : colors[rank], lineHeight: 1 }}>{labels[rank]}</span>
    </div>
  );
};

// --- Main Auction Display ---------------------------------------------------
const DEMO_LOT = { name: 'Arduino Nano & Cable', start: 1000, bid: 4500, leader: 'Team Sigma', time: 60, endsAt: null, remainingMs: null };
const DEMO_BIDDERS = [
  { team: 'Team Sigma', bid: 4500 },
  { team: 'Team Nexus', bid: 3800 },
  { team: 'Team Zeta', bid: 3200 },
];
const DEMO_RECENT = [
  { name: 'ESP32 & Cable', price: 6500, team: 'Team Nexus', sold: true },
  { name: 'SG90 Servo', price: 2000, team: 'Team Zeta', sold: true },
  { name: 'Buzzer', price: 0, sold: false },
];

const AuctionDisplay = ({ pub, now }) => {
  const prevBid = useRef(null);
  const [pulse, setPulse] = useState(false);

  const isDemo = !pub || !pub.auction || pub.auction.status === 'idle';
  const a = pub?.auction ?? { status: 'idle', lot: null, recent: DEMO_RECENT, sold: 2, done: 3, left: 5 };
  const lot = isDemo ? DEMO_LOT : a.lot;
  const clk = aucClock(lot, isDemo ? 'live' : a.status, now);
  const status = isDemo ? 'live' : a.status;
  const isDone = !isDemo && (a.status === 'done');
  const isPaused = !isDemo && (a.status === 'paused');
  const isLive = isDemo || (a.status === 'live');

  // Build top-3 from recent history (bids recorded in history, current lot leader as #1)
  let top3 = isDemo ? DEMO_BIDDERS : [];
  if (!isDemo && lot?.leader) {
    // current lot leader is always top
    top3 = [{ team: lot.leader, bid: lot.bid }];
    // fill from recent sold history for demo richness
    (a.recent || []).filter(h => h.sold && h.team && h.team !== lot.leader).slice(0, 2).forEach(h => {
      top3.push({ team: h.team, bid: h.price });
    });
  }

  // Pulse on new bid
  const currentBid = lot?.bid ?? 0;
  useEffect(() => {
    if (prevBid.current !== null && prevBid.current !== currentBid && currentBid > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
    prevBid.current = currentBid;
  }, [currentBid]);

  const compImg = getCompImg(lot?.name ?? '');
  const recent = isDemo ? DEMO_RECENT : (a.recent || []);

  return (
    <div className="auc-disp">
      {/* Top bar */}
      <div className="auc-topbar">
        <div className="auc-brand"><i className="dot"></i><span>All-in Put</span><span className="auc-live-badge">{isDone ? 'FINISHED' : isPaused ? 'PAUSED' : isLive ? '● LIVE' : 'SOON'}</span></div>
        <div className="auc-topbar-stats">
          <span><span className="auc-stat-label">LOTS LEFT</span><span className="auc-stat-val">{a.left ?? 5}</span></span>
          <span><span className="auc-stat-label">SOLD</span><span className="auc-stat-val">{a.sold ?? 2}</span></span>
          {isDemo && <span className="auc-demo-tag">DEMO MODE</span>}
        </div>
      </div>

      {isDone ? (
        <div className="auc-idle-screen">
          <img src="/logo-removebg-preview.png" alt="All-in Put" className="auc-idle-logo" />
          <div className="auc-idle-title">Auction Complete</div>
          <div className="auc-idle-sub">{a.sold} lots sold · {(a.done ?? 0) - (a.sold ?? 0)} unsold</div>
        </div>
      ) : !lot ? (
        <div className="auc-idle-screen">
          <img src="/logo-removebg-preview.png" alt="All-in Put" className="auc-idle-logo" />
          <div className="auc-idle-title">Auction Starting Soon</div>
          <div className="auc-idle-sub">Stand by for the first lot…</div>
        </div>
      ) : (
        <div className="auc-main-layout">
          {/* LEFT — component info */}
          <div className="auc-left">
            {/* Component photo */}
            <div className="auc-photo-wrap">
              {compImg
                ? <img src={compImg} alt={lot.name} className="auc-photo" />
                : <div className="auc-photo-placeholder">📦</div>
              }
            </div>

            {/* Name */}
            <div className="auc-comp-name">{lot.name}</div>
            <div className="auc-base-price">Base Price: {fmt(lot.start)}</div>

            {/* Current bid — focal point */}
            <div className={`auc-bid-block${pulse ? ' auc-bid-pulse' : ''}`}>
              <div className="auc-bid-label">CURRENT BID</div>
              <div className="auc-bid-amount">{lot.leader ? fmt(lot.bid) : '—'}</div>
              <div className="auc-bid-team">{lot.leader ? `↑ ${lot.leader}` : 'No bids placed yet'}</div>
            </div>
          </div>

          {/* CENTER — timer */}
          <div className="auc-center">
            <div className="auc-timer-section">
              <div className="auc-timer-label">TIME LEFT</div>
              <CountdownRing pct={clk.pct} text={clk.text} low={clk.low} up={clk.up} paused={isPaused} />
              {clk.up && <div className="auc-times-up">GOING ONCE…</div>}
              {lot.time === 0 && <div className="auc-no-limit">NO TIME LIMIT</div>}
            </div>

            {/* Status pill */}
            <div className={`auc-status-pill ${isPaused ? 'paused' : clk.up ? 'urgent' : 'live'}`}>
              {isPaused ? '⏸ PAUSED' : clk.up ? "⚠ TIME'S UP" : '⚡ BIDDING OPEN'}
            </div>

            {/* Recent results mini */}
            {recent.length > 0 && (
              <div className="auc-recent">
                <div className="auc-recent-label">RECENTLY CLOSED</div>
                {recent.slice(0, 3).map((h, i) => (
                  <div key={i} className="auc-recent-row">
                    <span className="auc-recent-name">{h.name}</span>
                    {h.sold
                      ? <><span className="auc-recent-price">{fmt(h.price)}</span><span className="auc-recent-team">{h.team}</span></>
                      : <span className="auc-recent-unsold">UNSOLD</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — top 3 */}
          <div className="auc-right">
            <div className="auc-leaderboard-title">TOP BIDDERS</div>
            {top3.length === 0 && <div className="auc-no-bids">No bids yet</div>}
            {top3.slice(0, 3).map((b, i) => (
              <div key={i} className={`auc-bidder-card rank-${i}${i === 0 ? ' auc-leader' : ''}`}>
                <Medal rank={i} />
                <div className="auc-bidder-info">
                  <div className="auc-bidder-name">{b.team}</div>
                  <div className="auc-bidder-bid">{fmt(b.bid)}</div>
                </div>
                {i === 0 && <div className="auc-crown">👑</div>}
              </div>
            ))}
            {/* Lot counter */}
            <div className="auc-lot-counter">
              <div className="auc-lot-num">LOT</div>
              <div className="auc-lot-val">#{(a.done ?? 0) + 1}</div>
            </div>
          </div>
        </div>
      )}

      <Strip />
    </div>
  );
};

const Admin = ({ adm, pub, ph, priceOf, api, load, showToast, tok, role, me, logout, now }) => {
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
      <Nav items={[['admin', 'Admin'], ['display', 'Shop display ↗'], ['auction-display', 'Auction display ↗']]} active="admin" tok={tok} role={role} me={me} logout={logout} />
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

        {adm.auction && pub.auction && <AuctionAdmin adm={adm} pub={pub} api={api} load={load} showToast={showToast} now={now} />}

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
                    <td>{o.phase === 'double' ? '2×' : o.phase === 'auction' ? 'auction' : 'base'}</td>
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
                      const comp = pub ? [...pub.components, ...(pub.auctionItems || [])].find(c => c.id === id) : null;
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
                        <td><span className={`tag ${o.phase === 'double' ? 'd' : ''}`}>{o.phase === 'double' ? '2×' : o.phase === 'auction' ? 'auction' : 'base'}</span></td>
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
    let r;
    try {
      r = await fetch('/api/' + p, {
        method: b ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json', 'x-token': tok },
        body: b ? JSON.stringify(b) : undefined
      });
    } catch {
      throw new Error('Cannot reach the server — is server.js running on port 3000?');
    }
    let j;
    try {
      j = await r.json();
    } catch {
      throw new Error(r.ok ? 'Server returned an empty response' : `Server error (${r.status})`);
    }
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
       route === 'auction-display' ? <AuctionDisplay pub={pub} now={nowUi} /> :
       route === 'admin' && role === 'admin' ? <Admin adm={adm} pub={pub} ph={ph} priceOf={priceOf} api={api} load={load} showToast={showToast} tok={tok} role={role} me={me} logout={logout} now={nowUi} /> :
       route === 'shop' && role === 'team' ? <Shop pub={pub} me={me} setMe={setMe} ph={ph} priceOf={priceOf} api={api} showToast={showToast} tok={tok} role={role} logout={logout} /> :
       <Home api={api} setTok={setTok} setRole={setRole} showToast={showToast} tok={tok} role={role} me={me} logout={logout} />}
    </>
  );
}
