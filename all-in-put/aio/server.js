// All-in Put — zero-dependency server. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, ADMIN_PASS=process.env.ADMIN_PASS||'admin123';
const DB=path.join(__dirname,'data.json'), PUB=path.join(__dirname,'public');
let S={v:1,mult:2,defaultCredits:5000,timer:{startedAt:null,baseMin:15},teams:[],orders:[],components:[
 ['Bread board',20,200],['Jumper wires (pack of 40)',24,30],['10k resistor',100,10],['1k resistor',100,10],
 ['3k3 resistor',100,10],['220 resistor',100,10],['LED',300,10],['Power supply',10,1000]
].map(([name,qty,price],i)=>({id:'c'+(i+1),name,qty,price}))};
// --- Component auction -------------------------------------------------
// time = seconds (0 = no limit, admin closes the lot); qty = number of auction rounds for that item;
// base = first starting price; inc = added to the starting price every time the item goes to auction.
const AUC_ITEMS=[
 ['Arduino Nano & Cable',80,10,1000,50],['ESP & Cable',100,10,2000,100],['Voltage Sensor',45,3,100,10],
 ['Current Sensor',45,3,100,10],['RGB LED',20,10,20,5],['LDR',40,40,100,10],['PIR',50,5,200,10],
 ['Ultrasonic',50,40,200,10],['Buzzer',30,40,50,5],['IR Sensor',40,10,100,10],['SG90 Servo',80,6,1000,50],
 ['MG90 Servo',150,4,1500,50],['DHT',40,5,100,10],['LED',0,1,3000,0],['Potentiometer (10k)',20,10,20,5],
 ['Potentiometer (1M)',20,10,20,5],['Chassis Kit',240,2,7000,100],['LCD',100,0,0,100]
];
const mkAuction=()=>({status:'idle',queue:[],lot:null,history:[],
 items:AUC_ITEMS.map(([name,time,qty,base,inc],i)=>({id:'a'+(i+1),name,time,qty,base,inc,next:base}))});
S.auction=mkAuction();
if(fs.existsSync(DB)) S=Object.assign(S,JSON.parse(fs.readFileSync(DB)));
const save=()=>{S.v++;fs.writeFileSync(DB,JSON.stringify(S,null,1));push()};
S.auction=Object.assign(mkAuction(),S.auction||{});
S.sess=S.sess||{};
const sess=new Map(Object.entries(S.sess));
const saveSess=(k,v)=>{sess.set(k,v);S.sess[k]=v};
const phase=()=>!S.timer.startedAt?'idle':(Date.now()-S.timer.startedAt<S.timer.baseMin*60000?'base':'double');
const cur=c=>phase()==='double'?c.price*S.mult:c.price;
const pub=()=>({v:S.v,now:Date.now(),startedAt:S.timer.startedAt,baseMs:S.timer.baseMin*60000,mult:S.mult,
 components:S.components.map(c=>({id:c.id,name:c.name,base:c.price,soldOut:c.qty<=0})),
 auctionItems:S.auction.items.map(i=>({id:i.id,name:i.name})),auction:aucPub()});
const aucItem=id=>S.auction.items.find(i=>i.id===id);
const aucPub=()=>{const A=S.auction,l=A.lot;return{status:A.status,left:A.queue.length,
 lot:l?{name:l.name,start:l.start,bid:l.bid,leader:l.leader,time:l.time,endsAt:l.endsAt,remainingMs:l.remainingMs,bids:l.bids||[],inc:S.auction.items.find(i=>i.id===l.itemId)?.inc||0}:null,
 recent:A.history.slice(0,6).map(h=>({name:h.name,price:h.price,team:h.team,sold:h.sold})),
 sold:A.history.filter(h=>h.sold).length,done:A.history.length}};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// put the next queued item on the block; its next starting price rises by its increment
function aucNext(){const A=S.auction;
 if(!A.queue.length){A.lot=null;A.status='done';return}
 const it=aucItem(A.queue.shift());if(!it)return aucNext();
 const now=Date.now(),ms=it.time>0?it.time*1000:0;
 A.lot={itemId:it.id,name:it.name,start:it.next,time:it.time,bid:0,leader:null,endsAt:ms?now+ms:null,remainingMs:null,bids:[]};
 it.next+=it.inc;A.status='live'}
const clients=new Set();
function push(){const m='data:'+JSON.stringify(pub())+'\n\n';clients.forEach(r=>r.write(m))}
setInterval(push,5000);
const send=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(obj))};
const body=req=>new Promise(ok=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{ok(JSON.parse(d||'{}'))}catch{ok({})}})});
const mime={'.html':'text/html','.png':'image/png','.js':'text/javascript','.css':'text/css'};
const team=u=>S.teams.find(t=>t.u===u);
const me=t=>({u:t.u,credits:t.credits,inv:t.inv,orders:S.orders.filter(o=>o.team===t.u).map(o=>({item:o.item,qty:o.qty,total:o.total,t:o.t}))});
http.createServer(async(req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/api/stream'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});
  res.write('data:'+JSON.stringify(pub())+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return}
 if(url==='/api/state')return send(res,200,pub());
 if(url.startsWith('/api/')){
  const a=url.slice(5),b=req.method==='POST'?await body(req):{},s=sess.get(req.headers['x-token']);
  try{
  if(a==='login'){
   if(b.username==='admin'&&b.password===ADMIN_PASS){const t=crypto.randomUUID();saveSess(t,{role:'admin'});save();return send(res,200,{token:t,role:'admin'})}
   const t=team(String(b.username||'').trim());
   if(t&&t.p===b.password){const k=crypto.randomUUID();saveSess(k,{role:'team',u:t.u});save();return send(res,200,{token:k,role:'team',u:t.u})}
   return send(res,401,{error:'Wrong team name or password'})}
  if(!s)return send(res,401,{error:'Please log in again'});
  if(a==='me'&&s.role==='team'){const t=team(s.u);return t?send(res,200,me(t)):send(res,401,{error:'Team removed'})}
  if(a==='buy'&&s.role==='team'){
   const t=team(s.u),c=S.components.find(x=>x.id===b.id),q=Math.floor(+b.qty);
   if(phase()==='idle')throw'The shop opens when the event starts';
   if(!c||!(q>0))throw'Invalid order';
   if(c.qty<q)throw'Not enough stock';
   const cost=cur(c)*q; if(t.credits<cost)throw'Not enough credits';
   c.qty-=q;t.credits-=cost;t.inv[c.id]=(t.inv[c.id]||0)+q;
   S.orders.unshift({t:Date.now(),team:t.u,item:c.name,qty:q,total:cost,phase:phase()});S.orders.length=Math.min(S.orders.length,2000);
   save();return send(res,200,me(t))}
  if(a==='team/bid'&&s.role==='team'){
   const A=S.auction,l=A.lot,t=team(s.u),amt=Math.floor(+b.amount);
   if(A.status!=='live'||!l)throw'No live lot';if(l.endsAt&&Date.now()>l.endsAt)throw'Time is up for this lot';
   if(!(amt>=l.start))throw'Bid must be at least '+l.start;if(l.leader&&amt<=l.bid)throw'Bid must beat '+l.bid;
   if(t.credits<amt)throw'Team does not have enough credits';
   l.bid=amt;l.leader=t.u;
   l.bids = (l.bids || []).filter(x => x.team !== t.u);
   l.bids.push({team: t.u, bid: amt});
   l.bids = l.bids.sort((a,b)=>b.bid-a.bid).slice(0,3);
   return send(res,200,me(t))}
  if(s.role!=='admin')return send(res,403,{error:'Admin only'});
  if(a==='admin/state')return send(res,200,{...S,phase:phase(),now:Date.now()});
  if(a==='admin/components'){b.list.forEach(x=>{const c=S.components.find(y=>y.id===x.id);if(c){c.name=String(x.name);c.qty=Math.max(0,+x.qty||0);c.price=Math.max(0,+x.price||0)}})}
  else if(a==='admin/timer'){const m=+b.baseMin;if(m>0)S.timer.baseMin=m;
   if(b.action==='start')S.timer.startedAt=Date.now();if(b.action==='reset')S.timer.startedAt=null}
  else if(a==='admin/settings'){if(+b.mult>0)S.mult=+b.mult;if(+b.defaultCredits>=0)S.defaultCredits=+b.defaultCredits}
  else if(a==='admin/auction-items'){const A=S.auction;
   b.list.forEach(x=>{const i=aucItem(x.id);if(!i)return;
    i.name=String(x.name||i.name);i.time=Math.max(0,Math.floor(+x.time)||0);i.qty=Math.max(0,Math.floor(+x.qty)||0);
    i.base=Math.max(0,+x.base||0);i.inc=Math.max(0,+x.inc||0);if(A.status==='idle')i.next=i.base})}
  else if(a==='admin/auction-generate'){const A=S.auction;
   if(A.status!=='idle')throw'Reset the auction before generating a new list';
   A.items.forEach(i=>i.next=i.base);
   const q=[];A.items.forEach(i=>{for(let k=0;k<i.qty;k++)q.push(i.id)});
   if(!q.length)throw'No component has a quantity above 0';
   A.queue=shuffle(q)}
  else if(a==='admin/auction-queue'){const A=S.auction;
   if(!Array.isArray(b.queue)||b.queue.some(id=>!aucItem(id)))throw'Invalid list';A.queue=b.queue}
  else if(a==='admin/auction-start'){const A=S.auction;
   if(A.status!=='idle')throw'Auction already started';if(!A.queue.length)throw'Generate a list first';aucNext()}
  else if(a==='admin/auction-pause'){const l=S.auction.lot;
   if(S.auction.status!=='live'||!l)throw'Nothing to pause';
   if(l.endsAt){l.remainingMs=Math.max(0,l.endsAt-Date.now());l.endsAt=null}S.auction.status='paused'}
  else if(a==='admin/auction-resume'){const l=S.auction.lot;
   if(S.auction.status!=='paused'||!l)throw'Not paused';
   if(l.remainingMs!=null){l.endsAt=Date.now()+l.remainingMs;l.remainingMs=null}S.auction.status='live'}
  else if(a==='admin/auction-extend'){const l=S.auction.lot,ms=Math.max(0,+b.sec||10)*1000;
   if(!l||!l.time)throw'This lot has no time limit';
   if(l.endsAt)l.endsAt=Math.max(l.endsAt,Date.now())+ms;else if(l.remainingMs!=null)l.remainingMs+=ms}
  else if(a==='admin/auction-bid'){const A=S.auction,l=A.lot,t=team(b.team),amt=Math.floor(+b.amount);
   if(A.status!=='live'||!l)throw'No live lot';if(l.endsAt&&Date.now()>l.endsAt)throw'Time is up for this lot';
   if(!t)throw'Pick a team';if(!(amt>=l.start))throw'Bid must be at least '+l.start;if(l.leader&&amt<=l.bid)throw'Bid must beat '+l.bid;
   if(t.credits<amt)throw'Team does not have enough credits';
   l.bid=amt;l.leader=t.u;
   l.bids = (l.bids || []).filter(x => x.team !== t.u);
   l.bids.push({team: t.u, bid: amt});
   l.bids = l.bids.sort((a,b)=>b.bid-a.bid).slice(0,3);
  }
  else if(a==='admin/auction-resolve'){const A=S.auction,l=A.lot;
   if(!l||(A.status!=='live'&&A.status!=='paused'))throw'No lot to close';
   if(b.sold){const t=team(l.leader);if(!t)throw'Nobody has bid on this lot';if(t.credits<l.bid)throw'Team no longer has enough credits';
    t.credits-=l.bid;t.inv[l.itemId]=(t.inv[l.itemId]||0)+1;
    S.orders.unshift({t:Date.now(),team:t.u,item:l.name,qty:1,total:l.bid,phase:'auction'});S.orders.length=Math.min(S.orders.length,2000)}
   A.history.unshift({t:Date.now(),itemId:l.itemId,name:l.name,start:l.start,price:b.sold?l.bid:0,team:b.sold?l.leader:null,sold:!!b.sold});
   aucNext()}
  else if(a==='admin/auction-reset'){S.auction=mkAuction()}
  else if(a==='admin/team-add'){const u=String(b.u||'').trim();if(!u||!b.p)throw'Name and password required';if(team(u))throw'Team exists';
   S.teams.push({u,p:String(b.p),credits:b.credits!==''&&b.credits!=null?+b.credits:S.defaultCredits,inv:{}})}
  else if(a==='admin/team-edit'){const t=team(b.u);if(t){if(b.p)t.p=String(b.p);if(b.credits!==''&&b.credits!=null)t.credits=+b.credits}}
  else if(a==='admin/team-del'){S.teams=S.teams.filter(t=>t.u!==b.u)}
  else if(a==='admin/reset-orders'){S.orders=[]}
  else if(a==='admin/reset-all'){
   S.orders=[];
   S.auction=mkAuction();
   S.timer.startedAt=null;
   S.teams.forEach(t=>{t.credits=S.defaultCredits;t.inv={}});
   const DEFAULTS=[['Bread board',20],['Jumper wires (pack of 40)',24],['10k resistor',100],['1k resistor',100],['3k3 resistor',100],['220 resistor',100],['LED',300],['Power supply',10]];
   S.components.forEach(c=>{const d=DEFAULTS.find(x=>x[0]===c.name);if(d)c.qty=d[1]});
  }
  else return send(res,404,{error:'Not found'});
  save();return send(res,200,{ok:1});
  }catch(e){return send(res,400,{error:typeof e==='string'?e:'Server error'})}
 }
 const f=path.join(PUB,url==='/'?'index.html':path.normalize(url).replace(/^(\.\.[\/\\])+/,''));
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(d)});
}).listen(PORT,'0.0.0.0',()=>console.log(`All-in Put running on port ${PORT}\n  Teams:   http://<this-pc-ip>:${PORT}/\n  Admin:   http://<this-pc-ip>:${PORT}/#/admin  (user: admin, pass: ${ADMIN_PASS})\n  Display: http://<this-pc-ip>:${PORT}/#/display`));
