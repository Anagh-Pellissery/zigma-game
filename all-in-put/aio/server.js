// All-in Put — zero-dependency server. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, ADMIN_PASS=process.env.ADMIN_PASS||'admin123';
const DB=path.join(__dirname,'data.json'), PUB=path.join(__dirname,'public');
let S={v:1,mult:2,defaultCredits:5000,timer:{startedAt:null,baseMin:15},teams:[],orders:[],components:[
 ['Bread board',20,200],['Jumper wires (pack of 40)',24,30],['10k resistor',100,10],['1k resistor',100,10],
 ['3k3 resistor',100,10],['220 resistor',100,10],['LED',300,10],['Power supply',10,1000]
].map(([name,qty,price],i)=>({id:'c'+(i+1),name,qty,price}))};
if(fs.existsSync(DB)) S=Object.assign(S,JSON.parse(fs.readFileSync(DB)));
const save=()=>{S.v++;fs.writeFileSync(DB,JSON.stringify(S,null,1));push()};
const sess=new Map(); // token -> {role,u}
const phase=()=>!S.timer.startedAt?'idle':(Date.now()-S.timer.startedAt<S.timer.baseMin*60000?'base':'double');
const cur=c=>phase()==='double'?c.price*S.mult:c.price;
const pub=()=>({v:S.v,now:Date.now(),startedAt:S.timer.startedAt,baseMs:S.timer.baseMin*60000,mult:S.mult,
 components:S.components.map(c=>({id:c.id,name:c.name,base:c.price,soldOut:c.qty<=0}))});
const clients=new Set();
function push(){const m='data:'+JSON.stringify(pub())+'\n\n';clients.forEach(r=>r.write(m))}
setInterval(push,5000);
const send=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(obj))};
const body=req=>new Promise(ok=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{ok(JSON.parse(d||'{}'))}catch{ok({})}})});
const mime={'.html':'text/html','.png':'image/png','.js':'text/javascript','.css':'text/css'};
const team=u=>S.teams.find(t=>t.u===u);
const me=t=>({u:t.u,credits:t.credits,inv:t.inv});
http.createServer(async(req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/api/stream'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});
  res.write('data:'+JSON.stringify(pub())+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return}
 if(url==='/api/state')return send(res,200,pub());
 if(url.startsWith('/api/')){
  const a=url.slice(5),b=req.method==='POST'?await body(req):{},s=sess.get(req.headers['x-token']);
  try{
  if(a==='login'){
   if(b.username==='admin'&&b.password===ADMIN_PASS){const t=crypto.randomUUID();sess.set(t,{role:'admin'});return send(res,200,{token:t,role:'admin'})}
   const t=team(String(b.username||'').trim());
   if(t&&t.p===b.password){const k=crypto.randomUUID();sess.set(k,{role:'team',u:t.u});return send(res,200,{token:k,role:'team',u:t.u})}
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
  if(s.role!=='admin')return send(res,403,{error:'Admin only'});
  if(a==='admin/state')return send(res,200,{...S,phase:phase(),now:Date.now()});
  if(a==='admin/components'){b.list.forEach(x=>{const c=S.components.find(y=>y.id===x.id);if(c){c.name=String(x.name);c.qty=Math.max(0,+x.qty||0);c.price=Math.max(0,+x.price||0)}})}
  else if(a==='admin/timer'){const m=+b.baseMin;if(m>0)S.timer.baseMin=m;
   if(b.action==='start')S.timer.startedAt=Date.now();if(b.action==='reset')S.timer.startedAt=null}
  else if(a==='admin/settings'){if(+b.mult>0)S.mult=+b.mult;if(+b.defaultCredits>=0)S.defaultCredits=+b.defaultCredits}
  else if(a==='admin/team-add'){const u=String(b.u||'').trim();if(!u||!b.p)throw'Name and password required';if(team(u))throw'Team exists';
   S.teams.push({u,p:String(b.p),credits:b.credits!==''&&b.credits!=null?+b.credits:S.defaultCredits,inv:{}})}
  else if(a==='admin/team-edit'){const t=team(b.u);if(t){if(b.p)t.p=String(b.p);if(b.credits!==''&&b.credits!=null)t.credits=+b.credits}}
  else if(a==='admin/team-del'){S.teams=S.teams.filter(t=>t.u!==b.u)}
  else if(a==='admin/reset-orders'){S.orders=[]}
  else if(a==='admin/reset-all'){S.orders=[];S.timer.startedAt=null;S.teams.forEach(t=>{t.credits=S.defaultCredits;t.inv={}})}
  else return send(res,404,{error:'Not found'});
  save();return send(res,200,{ok:1});
  }catch(e){return send(res,400,{error:typeof e==='string'?e:'Server error'})}
 }
 const f=path.join(PUB,url==='/'?'index.html':path.normalize(url).replace(/^(\.\.[\/\\])+/,''));
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(d)});
}).listen(PORT,'0.0.0.0',()=>console.log(`All-in Put running on port ${PORT}\n  Teams:   http://<this-pc-ip>:${PORT}/\n  Admin:   http://<this-pc-ip>:${PORT}/#/admin  (user: admin, pass: ${ADMIN_PASS})\n  Display: http://<this-pc-ip>:${PORT}/#/display`));
