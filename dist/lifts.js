/* Lifts lab — the morning rush, run in section.

   Two instruments side by side, and the point is that they are side by side.

   THE CALCULATION is CIBSE Guide D's up-peak method, the one real towers are
   sized with (Barney & Al-Sharif, Elevator Traffic Handbook, ch. 4–5 derive
   it):
     RTT = 2·(E + H)·t_v + (S + 1)·t_s + 2·P·t_p
     S   = N·[1 − (1 − 1/N)^P]                probable stops over N floors
     H   = N − Σ_{i=1}^{N−1} (i/N)^P          highest reversal floor
     E   = express floors run past below the zone
     t_v = floor height ÷ rated speed
     t_s = single-floor flight time − t_v + door open + close
     t_p = 1.2 s per passenger transfer, P = 80% of rated load
     interval = RTT ÷ L,  handling = 300·P·L ÷ RTT persons per 5 minutes
   Average waiting time uses the Barney/Al-Sharif up-peak approximation
     AWT ≈ [0.4 + (1.8·P/CC − 0.77)²]·interval   (car load 50–80%)
     AWT ≈ 0.4·interval                          (car load below 50%)
   at the car load the chosen arrival rate actually produces.

   The Core desk (core.js liftDesign) uses the same RTT formula with cruder
   inputs: H = S = N/2 and no express run; same speed and stop time. rttFormula() below is
   that formula, and the tests feed it liftDesign's own inputs and get
   liftDesign's own round trip back. The lab then states on screen why its
   fuller inputs give a different, longer answer for the upper zones.

   THE SIMULATION is a plain collective-control group with seeded Poisson
   arrivals, trapezoidal car kinematics (acceleration, rated speed, door
   dwell) and one loading car per group at a lobby. It is a picture of
   behaviour, not an industry traffic simulator — the lab says so.

   Everything above the DOM section is pure and DOM-free so it can be tested. */
import {liftDesign,CORE_METHOD,liftSpeed} from './core.js?v=deb2864e7f';
import {stack,evaluate} from './model.js?v=4d4eb35fb5';

/* Stated assumptions. Each one is printed where it is used. */
export const LIFT_ASSUME={
 accel:CORE_METHOD.carAccel,          // m/s², as the Core desk
 tp:CORE_METHOD.transferTime,         // s per passenger, CIBSE Guide D
 load:CORE_METHOD.carLoad,            // design car load 80%, CIBSE Guide D
 intervalMax:CORE_METHOD.intervalMax, // s, office up-peak criterion
 groupMax:8,                          // practical group size round one lobby
 coreShare:0.5,                       // ASSUMPTION: lift shafts may take half the core
 ddPenalty:1.0,                       // ASSUMPTION: s per stop, double-deck coincidence
 sectors:2,                           // ASSUMPTION: destination dispatch as 2 sectors
 topRun:30,                           // ASSUMPTION: rule of thumb, s to top of run
 lobbyDwell:10,                       // ASSUMPTION: s a loading car holds at a lobby
 longWait:60                          // s, a wait drawn in the accent
};
/* ASSUMPTION: shaft plan area per car, walls and landing doors included.
   13 persons (≈1000 kg) → 6.05 m², 21 → 8.05 m², 26 → 9.3 m². */
export const shaftArea=cap=>2.8+0.25*cap;

const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ── kinematics ────────────────────────────────────────────────────────── */
export function flightTime(d,v,a){
 d=Math.abs(fin(d));if(!(d>0))return 0;
 v=Math.max(0.1,fin(v,1));a=Math.max(0.05,fin(a,1));
 return d>=v*v/a?d/v+v/a:2*Math.sqrt(d/a);
}
/* Distance covered t seconds into a run of length d (trapezoid or triangle). */
export function travelPos(d,v,a,t){
 d=Math.abs(fin(d));v=Math.max(0.1,fin(v,1));a=Math.max(0.05,fin(a,1));
 const T=flightTime(d,v,a);if(!(t>0))return 0;if(t>=T)return d;
 if(d>=v*v/a){const ta=v/a;if(t<ta)return 0.5*a*t*t;if(t<T-ta)return 0.5*a*ta*ta+v*(t-ta);const r=T-t;return d-0.5*a*r*r}
 if(t<T/2)return 0.5*a*t*t;const r=T-t;return d-0.5*a*r*r;
}

/* ── CIBSE Guide D up-peak ─────────────────────────────────────────────── */
export function probableStops(N,P){
 N=Math.max(0,fin(N));P=Math.max(0,fin(P));
 if(N<=0||P<=0)return 0;if(N<=1)return 1;
 return N*(1-Math.pow(1-1/N,P));
}
export function highestReversal(N,P){
 N=Math.max(1,Math.round(fin(N,1)));P=Math.max(0,fin(P));if(P<=0)return 0;
 let s=0;for(let i=1;i<N;i++)s+=Math.pow(i/N,P);return N-s;
}
export function rttFormula({H,S,E=0,tv,ts,P,tp}){return 2*(E+H)*tv+(S+1)*ts+2*P*tp}

/* One local group. N floors in the zone, E express floors below it.
   Double-deck: floors paired, P per deck, decks load in parallel.
   Destination dispatch: modelled as `sectors` dynamic sectors (assumption). */
export function groupRTT({N,E=0,df,v,a,td,tp=LIFT_ASSUME.tp,P,sectors=1,dd=false,ddPenalty=LIFT_ASSUME.ddPenalty}){
 const decks=dd?2:1,Np=Math.max(1,Math.ceil(N/decks)),unit=Math.max(0.1,df)*decks;
 const m=sectors>1&&Np>=4?sectors:1,Ns=Np/m,Pcar=P*decks;
 const S=probableStops(Ns,Pcar),H=(m-1)/2*Ns+highestReversal(Ns,Pcar);
 const tv=unit/v,ts=flightTime(unit,v,a)-tv+td+(dd?ddPenalty:0);
 const Eu=Math.max(0,E)/decks;
 return {rtt:rttFormula({H,S,E:Eu,tv,ts,P,tp}),S,H,E:Eu,tv,ts};
}
/* A shuttle: one stop up, one stop down, full flight between. */
export function shuttleRTT({d,v,a,td,tp=LIFT_ASSUME.tp,P}){return 2*flightTime(d,v,a)+2*td+2*P*tp}

export function awtCibse(interval,loadFactor){
 const lf=Math.max(0,fin(loadFactor));
 return (lf<=0.5?0.4:0.4+Math.pow(1.8*lf-0.77,2))*fin(interval);
}

/* Cars for one group: fewest that carry the demand at 80% load AND meet the
   interval (auto), or a fixed count. Then the load the demand really
   produces, found by fixed point P = λ·RTT(P)/L, and the AWT at that load. */
export function sizeGroup({rttOf,demand,cap,decks=1,cars=1,auto=true,delta=0}){
 const A=LIFT_ASSUME,P80=A.load*cap,r80=rttOf(P80),perCar=300*P80*decks/r80;
 let L;
 if(auto){L=Math.max(1,Math.ceil(demand/perCar-1e-9));while(r80/L>A.intervalMax&&L<40)L++;L=Math.max(1,L+Math.round(fin(delta)))}
 else L=Math.max(1,Math.round(fin(cars,1)));
 const lam=Math.max(0,demand)/300;
 const saturated=lam*rttOf(cap)/(L*decks)>cap;
 let P=clamp(lam*r80/(L*decks),0.01,cap);
 for(let i=0;i<40;i++)P=clamp(lam*rttOf(P)/(L*decks),0.01,cap);
 const rt=rttOf(P),lf=P/cap;
 return {cars:L,rtt:r80,interval:r80/L,hc:perCar*L,perCar,P80,Pact:P,lf,rttAct:rt,
  awt:saturated?Infinity:awtCibse(rt/L,lf),saturated};
}

/* Plant and refuge levels, as the first occupied floor above each one. */
export function skyCandidates(s){
 let st;try{st=stack(s)}catch{return []}
 const occ=st.filter(l=>l.gfa),top=occ.length-1,out=new Map();
 for(const l of st){
  if(l.gfa||l.use==='garden'||l.use==='terrace')continue;
  const f=occ.filter(o=>o.z<l.z+1e-6).length;
  if(f>=2&&f<=top-2&&!out.has(f))out.set(f,{f,use:l.use==='refuge'?'refuge':'plant'});
 }
 return [...out.values()].sort((a,b)=>a.f-b.f);
}

const splitRange=(lo,hi,k)=>{
 const cnt=hi-lo+1;if(cnt<=0)return [];k=clamp(Math.round(k),1,cnt);
 const out=[];let a0=lo;
 for(let i=0;i<k;i++){const b=lo+Math.round(cnt*(i+1)/k)-1;if(b>=a0)out.push([a0,b]);a0=b+1}
 return out;
};

/* The whole design: groups, cars, intervals, waits, shafts, area. Pure. */
export function liftPlan(s,o={},metrics,noCounterpart=false){
 const A=LIFT_ASSUME;s=s||{};o=o||{};
 let st=[];try{st=stack(s)}catch{st=[]}
 const occ=st.filter(l=>l.gfa);
 const h0=Math.max(2,fin(s.height,4));
 const Zs=occ.length>=2?occ.map(l=>l.z):[0,h0];
 const Hs=occ.length>=2?occ.map(l=>l.h):[h0,h0];
 const top=Zs.length-1,N=top;
 const df=Math.max(0.5,(Zs[top]-Zs[0])/top);
 let net=metrics&&Number.isFinite(metrics.rentable)?metrics.rentable:null;
 if(net==null){try{net=evaluate(s).rentable}catch{net=0}}
 let cd;try{cd=liftDesign({floors:fin(s.floors,1),height:h0},Math.max(0,fin(net)))}catch{cd={population:0,zones:1,carsPerZone:1,carRated:13,carSpeed:1.6,rt:0,interval:0}}
 const popDefault=cd.population;
 const pop=fin(o.pop,0)>0?o.pop:popDefault;
 const rate=clamp(fin(o.rate,12),1,40);
 const cap=clamp(Math.round(fin(o.cap,cd.carRated)),4,40);
 // Default to the typical speed for this rise, not the Core desk's fixed
 // 1.6 m/s: at 200 m that would flag every tower as failing before the reader
 // has touched a control. The Core desk's own figures stay in their row.
 const vDefault=liftSpeed(Zs[top]-Zs[0]); // the Core desk's own rule (core.js)
 const v=clamp(fin(o.speed,vDefault),0.5,12),a=A.accel,tp=A.tp;
 const td=clamp(fin(o.door,4),1,15);
 const maxZ=Math.max(1,Math.min(8,Math.floor(N/2)));
 const Z=clamp(Math.round(fin(o.zones,cd.zones)),1,maxZ);
 const cands=skyCandidates(s);
 const skyOK=Z>=2&&N>=8;
 const sky=!!o.sky&&skyOK;
 let L=null,snap=null;
 if(sky){
  let want=fin(o.skyLevel,NaN);
  if(!Number.isFinite(want))want=cands.length?cands.reduce((b,c)=>Math.abs(c.f-N/2)<Math.abs(b.f-N/2)?c:b).f:Math.round(N/2);
  want=clamp(Math.round(want),2,top-2);
  const near=cands.length?cands.reduce((b,c)=>Math.abs(c.f-want)<Math.abs(b.f-want)?c:b):null;
  if(near&&Math.abs(near.f-want)<=2){L=near.f;snap=near}else L=want;
 }
 const dd=!!o.dd,decks=dd?2:1,dest=o.dispatch==='destination',auto=o.auto!==false;
 const carsM=clamp(Math.round(fin(o.cars,cd.carsPerZone)),1,30),delta=clamp(Math.round(fin(o.delta,0)),-20,20);
 const pattern=['up','two','down'].includes(o.pattern)?o.pattern:'up';
 const served=[];for(let f=1;f<=top;f++)if(f!==L)served.push(f);
 const popPer=pop/Math.max(1,served.length);
 const groups=[];
 const local=(lo,hi,base,bank)=>{
  const Nz=hi-lo+1,E=lo-1-base,demand=rate/100*popPer*Nz,sectors=dest?A.sectors:1;
  const rttOf=P=>groupRTT({N:Nz,E,df,v,a,td,tp,P,sectors,dd}).rtt;
  const d=groupRTT({N:Nz,E,df,v,a,td,tp,P:A.load*cap,sectors,dd});
  groups.push({kind:'local',bank,base,lo,hi,N:Nz,E,pop:popPer*Nz,demand,S:d.S,H:d.H,
   ...sizeGroup({rttOf,demand,cap,decks,cars:carsM,auto,delta})});
 };
 if(!sky)splitRange(1,top,Z).forEach(([lo,hi])=>local(lo,hi,0,'single'));
 else{
  const Zl=clamp(Math.round(Z*(L-1)/(top-1)),1,Z-1),Zu=Z-Zl,upPop=popPer*(top-L);
  const dist=Zs[L]-Zs[0],rttOf=P=>shuttleRTT({d:dist,v,a,td,tp,P});
  groups.push({kind:'shuttle',bank:'shuttle',base:0,lo:L,hi:L,N:1,E:0,pop:upPop,demand:rate/100*upPop,S:1,H:L,
   ...sizeGroup({rttOf,demand:rate/100*upPop,cap,decks,auto:true,delta})});
  splitRange(1,L-1,Zl).forEach(([lo,hi])=>local(lo,hi,0,'low'));
  splitRange(L+1,top,Zu).forEach(([lo,hi])=>local(lo,hi,L,'high'));
 }
 // drawing columns: upper-bank shafts stack over the low-rise shafts
 let col=0;
 for(const g of groups)if(g.kind==='shuttle'){g.col0=col;col+=g.cars}
 const lowStart=col;
 for(const g of groups)if(g.bank==='low'||g.bank==='single'){g.col0=col;col+=g.cars}
 let ucol=lowStart;
 for(const g of groups)if(g.bank==='high'){g.col0=ucol;ucol+=g.cars}
 const cols=Math.max(col,ucol,1);
 // summaries
 const locals=groups.filter(g=>g.kind==='local'),shuttle=groups.find(g=>g.kind==='shuttle');
 const worst=groups.reduce((m,g)=>g.interval>m.interval?g:m,groups[0]);
 for(const g of groups)g.hcPct=g.pop>0?g.hc/g.pop*100:Infinity;
 const lowHc=groups.reduce((m,g)=>g.hcPct<m.hcPct?g:m,groups[0]);
 const saturated=groups.some(g=>g.saturated);
 let awt=0;for(const g of locals)awt+=g.pop*(g.awt+(g.bank==='high'&&shuttle?shuttle.awt:0));
 awt=pop>0?awt/pop:0;if(saturated)awt=Infinity;
 const most=groups.reduce((m,g)=>g.cars>m.cars?g:m,groups[0]),big=most.cars>A.groupMax?most:null;
 const verdict=saturated?'sat':worst.interval>A.intervalMax?'int':lowHc.hcPct<rate-1e-9?'hc':big?'group':'pass';
 // shafts
 const Ash=shaftArea(cap);
 const shafts=Array.from({length:top+1},(_,f)=>groups.reduce((n,g)=>n+(f>=g.base&&f<=g.hi?g.cars:0),0));
 const bands=[];shafts.forEach((n,f)=>{const b=bands[bands.length-1];if(b&&b.shafts===n)b.to=f;else bands.push({from:f,to:f,shafts:n,area:n*Ash})});
 const shaftFloorArea=shafts.reduce((t,n)=>t+n*Ash,0);
 const groundArea=shafts[0]*Ash,core=Math.max(1,fin(s.core,14)),coreArea=core*core;
 const suggestCore=groundArea>A.coreShare*coreArea?Math.ceil(Math.sqrt(groundArea/A.coreShare)):null;
 const run=Math.max(...groups.map(g=>Zs[g.hi]-Zs[g.base]),df);
 const vTypical=liftSpeed(run);
 const plan={pattern,pop,popDefault,net,rate,cap,v,a,td,tp,Z,decks,dd,dest,auto,carsM,sky,skyOK,L,snap,cands,
  N,top,df,levelZ:Zs,levelH:Hs,towerTop:Zs[top]+Hs[top],
  voids:st.filter(l=>!l.gfa&&l.use!=='garden').map(l=>({z:l.z,h:l.h})),
  groups,cols,worst,lowHc,awt,saturated,verdict,big,cars:groups.reduce((t,g)=>t+g.cars,0),
  interval:worst.interval,hcPct:lowHc.hcPct,
  shaftA:Ash,shafts,bands,shaftFloorArea,groundArea,coreArea,core,suggestCore,run,vTypical,
  coreDesk:{zones:cd.zones,cars:cd.carsPerZone,rt:cd.rt,interval:cd.interval},
  recovered:null,recoveredUpper:null};
 if(sky&&!noCounterpart){
  const base=liftPlan(s,{...o,sky:false},metrics,true);
  plan.recovered=base.shaftFloorArea-shaftFloorArea;
  let u=0;for(let f=L+1;f<=top;f++)u+=(base.shafts[f]-shafts[f])*Ash;
  plan.recoveredUpper=u;plan.baseline={cars:base.cars,interval:base.interval,ground:base.groundArea};
 }
 return plan;
}

/* Average wait and lobby shaft area against a fixed number of cars per zone. */
export function waitCurve(s,o={},metrics,max=12){
 const out=[];
 for(let c=1;c<=max;c++){const p=liftPlan(s,{...o,auto:false,cars:c},metrics,true);out.push({cars:c,x:c,label:String(c),awt:p.awt,interval:p.interval,ground:p.groundArea})}
 return out;
}
/* The same, with every group sized to CIBSE and then given `d` cars more or
   fewer — the honest axis when the zones need different numbers of cars. */
export function waitCurveDelta(s,o={},metrics,lo=-3,hi=8){
 const out=[];
 for(let d=lo;d<=hi;d++){const p=liftPlan(s,{...o,auto:true,delta:d},metrics,true);out.push({cars:p.cars,x:d,label:d>0?'+'+d:d<0?'−'+(-d):'0',awt:p.awt,interval:p.interval,ground:p.groundArea})}
 return out;
}

/* ── simulation ──────────────────────────────────────────────────────── */
export function rng(seed){let a=(seed>>>0)||1;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const expo=(R,l)=>-Math.log(1-R())/l;
const qk=(g,f,dir)=>g*100000+f*2+(dir>0?1:0);

export function createSim(plan,{seed=1}={}){
 const G=plan.groups,R=rng(seed),floorGroup=new Map();
 G.forEach((g,i)=>{if(g.kind==='local')for(let f=g.lo;f<=g.hi;f++)floorGroup.set(f,i)});
 const tot=plan.rate/100*plan.pop/300,p=plan.pattern;
 const up=p==='down'?0:p==='two'?tot/2:tot,down=p==='up'?0:p==='two'?tot/2:tot;
 const sim={t:0,plan,G,R,floorGroup,served:[...floorGroup.keys()],shuttle:G.findIndex(g=>g.kind==='shuttle'),
  cap:plan.cap*plan.decks,up,down,nextUp:up>0?expo(R,up):Infinity,nextDown:down>0?expo(R,down):Infinity,
  cars:[],q:new Map(),claims:new Map(),waits:[],delivered:0,arrived:0,waiting:0,queueMax:0,saturated:false,flash:[]};
 G.forEach((g,i)=>{for(let k=0;k<g.cars;k++)sim.cars.push({g:i,k,z:plan.levelZ[g.base],level:g.base,target:g.base,state:'idle',dir:1,riders:[],until:0,seg:null,sector:0,nextBoard:0,lastBoard:0,loadStart:0,claim:null,next:null})});
 return sim;
}
const queue=(sim,g,f,dir)=>{const k=qk(g,f,dir);let q=sim.q.get(k);if(!q){q=[];sim.q.set(k,q)}return q};
const stopOf=(sim,g,f)=>sim.plan.decks===2&&g.kind==='local'&&f!==g.base?g.lo+2*Math.floor((f-g.lo)/2):f;
const floorsAt=(sim,g,x)=>sim.plan.decks===2&&g.kind==='local'?[x,x+1].filter(f=>f<=g.hi):[x];
const sectorOf=(sim,g,f)=>sim.plan.dest&&g.kind==='local'&&g.N>=4?Math.min(1,Math.floor((f-g.lo)/Math.ceil(g.N/2))):0;
const legTo=p=>p.legs[p.leg].to;

function route(sim,o,d){
 const G=sim.G;
 if(o===0){const g=sim.floorGroup.get(d),b=G[g].base;return b===0?[{g,from:0,to:d}]:[{g:sim.shuttle,from:0,to:b},{g,from:b,to:d}]}
 const g=sim.floorGroup.get(o),b=G[g].base;
 return b===0?[{g,from:o,to:0}]:[{g,from:o,to:b},{g:sim.shuttle,from:b,to:0}];
}
function enqueue(sim,p,t){const l=p.legs[p.leg];p.qt=t;queue(sim,l.g,l.from,l.to>l.from?1:-1).push(p);sim.waiting++}
function board(sim,c,p){
 p.wait+=sim.t-p.qt;sim.waiting--;c.riders.push(p);
 if(p.leg===p.legs.length-1){sim.waits.push({t:sim.t,w:p.wait});if(sim.waits.length>4000)sim.waits.splice(0,1000)}
}
function finishLeg(sim,p){
 p.leg++;
 if(p.leg<p.legs.length)enqueue(sim,p,sim.t);
 else{sim.delivered++;sim.flash.push({f:p.dest,t:sim.t});if(sim.flash.length>300)sim.flash.splice(0,100)}
}
function highestCall(sim,gi,c,above){
 const g=sim.G[gi];
 for(let f=g.hi;f>=g.lo;f--){
  const s=stopOf(sim,g,f);if(s<=above)continue;
  if(!queue(sim,gi,f,-1).length)continue;
  const who=sim.claims.get(qk(gi,s,-1));if(!who||who===c)return s;
 }
 return null;
}
function moveTo(sim,c,target){
 const Z=sim.plan.levelZ;
 if(target===c.level){c.state='dwell';c.until=sim.t+0.1;c.next=null;return}
 const z1=Z[target];
 c.seg={z0:c.z,z1,t0:sim.t,T:flightTime(z1-c.z,sim.plan.v,sim.plan.a)};
 c.target=target;c.state='move';
}
function arrive(sim,c){
 const g=sim.G[c.g],x=c.level,t=sim.t,{td,tp}=sim.plan;let moves=0;
 const stay=[];for(const p of c.riders){if(stopOf(sim,g,legTo(p))===x){moves++;finishLeg(sim,p)}else stay.push(p)}
 c.riders=stay;
 if(c.claim!=null){sim.claims.delete(qk(c.g,c.claim,-1));if(c.claim===x)c.dir=-1;c.claim=null}
 if(x===g.base){c.dir=1;c.state='dwell';c.until=t+td/2+tp*moves;c.next='idle';return}
 if(c.dir===1){
  const more=c.riders.some(p=>stopOf(sim,g,legTo(p))>x)||highestCall(sim,c.g,c,x)!=null;
  if(!more)c.dir=-1;
 }
 if(c.dir===-1)for(const f of floorsAt(sim,g,x)){const q=queue(sim,c.g,f,-1);while(q.length&&c.riders.length<sim.cap){board(sim,c,q.shift());moves++}}
 c.state='dwell';c.until=t+td+tp*moves;c.next=null;
}
function depart(sim,c){
 if(c.next==='idle'){c.state='idle';c.next=null;return}
 const g=sim.G[c.g],x=c.level;let target=null;
 if(c.dir===1){
  const ups=c.riders.map(p=>stopOf(sim,g,legTo(p))).filter(f=>f>x);
  if(ups.length)target=Math.min(...ups);
  else{const f=highestCall(sim,c.g,c,x);if(f!=null){target=f;c.claim=f;sim.claims.set(qk(c.g,f,-1),c)}else c.dir=-1}
 }
 if(target==null){
  c.dir=-1;
  const downs=c.riders.map(p=>stopOf(sim,g,legTo(p))).filter(f=>f<x);
  if(c.riders.length<sim.cap)for(let f=g.hi;f>=g.lo;f--){const s=stopOf(sim,g,f);if(s<x&&queue(sim,c.g,f,-1).length)downs.push(s)}
  target=downs.length?Math.max(...downs):g.base;
  if(target>=x)target=g.base;
 }
 moveTo(sim,c,target);
}
function stepCar(sim,c){
 const g=sim.G[c.g],t=sim.t,P=sim.plan;
 if(c.state==='move'){
  const s=c.seg,el=t-s.t0;
  if(el>=s.T){c.z=s.z1;c.level=c.target;arrive(sim,c)}
  else c.z=s.z0+Math.sign(s.z1-s.z0)*travelPos(Math.abs(s.z1-s.z0),P.v,P.a,el);
  return;
 }
 if(c.state==='dwell'){if(t>=c.until)depart(sim,c);return}
 if(c.state==='load'){
  const q=queue(sim,c.g,c.level,1);
  if(t>=c.nextBoard&&c.riders.length<sim.cap){
   const i=q.findIndex(p=>sectorOf(sim,g,legTo(p))===c.sector);
   if(i>=0){board(sim,c,q.splice(i,1)[0]);c.nextBoard=t+P.tp;c.lastBoard=t}
  }
  const more=q.some(p=>sectorOf(sim,g,legTo(p))===c.sector);
  const full=c.riders.length>=sim.cap;
  const timeUp=t-c.loadStart>=LIFT_ASSUME.lobbyDwell&&t>=c.nextBoard;
  if(c.riders.length&&(full||(timeUp&&!more))){c.state='dwell';c.until=t+P.td/2;c.next=null;return}
  if(!c.riders.length&&!more&&t>=c.nextBoard)c.state='idle';
  return;
 }
 // idle at the group's base, doors open
 const q=queue(sim,c.g,c.level,1);
 if(q.length){
  for(const p of q){
   const sec=sectorOf(sim,g,legTo(p));
   if(!sim.cars.some(d=>d!==c&&d.g===c.g&&d.state==='load'&&d.level===c.level&&d.sector===sec)){
    c.state='load';c.sector=sec;c.loadStart=t;c.nextBoard=t+P.td/2;c.lastBoard=t;return;
   }
  }
 }
 const f=highestCall(sim,c.g,c,g.base);
 if(f!=null){c.claim=f;sim.claims.set(qk(c.g,f,-1),c);c.dir=1;moveTo(sim,c,f)}
}
export function stepSim(sim,dt){
 sim.t+=dt;const R=sim.R,S=sim.served;
 while(sim.nextUp<=sim.t){
  if(!sim.saturated&&S.length){const d=S[Math.floor(R()*S.length)];const p={legs:route(sim,0,d),leg:0,wait:0,dest:d,born:sim.nextUp};sim.arrived++;enqueue(sim,p,sim.nextUp)}
  sim.nextUp+=expo(R,sim.up);
 }
 while(sim.nextDown<=sim.t){
  if(!sim.saturated&&S.length){const o=S[Math.floor(R()*S.length)];const p={legs:route(sim,o,0),leg:0,wait:0,dest:0,born:sim.nextDown};sim.arrived++;enqueue(sim,p,sim.nextDown)}
  sim.nextDown+=expo(R,sim.down);
 }
 if(sim.waiting>3000)sim.saturated=true;
 for(const c of sim.cars)stepCar(sim,c);
 let m=0;for(const q of sim.q.values())if(q.length>m)m=q.length;
 sim.queueNow=m;if(m>sim.queueMax)sim.queueMax=m;
}
export function advance(sim,seconds,dt=0.2){let left=seconds;while(left>1e-9){const h=Math.min(dt,left);stepSim(sim,h);left-=h}}
export function simStats(sim,windowS=900){
 const t0=sim.t-windowS,w=[];
 for(const x of sim.waits)if(x.t>=t0)w.push(x.w);
 // passengers still waiting count at the wait they have had so far: a lower
 // bound, but leaving them out would hide a saturated queue entirely
 for(const q of sim.q.values())for(const p of q)w.push(p.wait+sim.t-p.qt);
 w.sort((a,b)=>a-b);
 const avg=w.length?w.reduce((a,b)=>a+b,0)/w.length:0;
 const p90=w.length?w[Math.min(w.length-1,Math.floor(0.9*w.length))]:0;
 return {t:sim.t,n:w.length,avg,p90,queue:sim.queueNow||0,queueMax:sim.queueMax,delivered:sim.delivered,arrived:sim.arrived,waiting:sim.waiting,saturated:sim.saturated};
}
export function simulate(plan,{seed=1,duration=900,dt=0.2}={}){
 const sim=createSim(plan,{seed});advance(sim,duration,dt);
 return {...simStats(sim),zs:sim.cars.map(c=>+c.z.toFixed(4))};
}

const NICE=[2,3,4,5,6,8,10,12,15,20,25,30,40,50,60];
export function timeScale(maxRtt){const raw=Math.max(1,fin(maxRtt,60))/8;return NICE.reduce((a,b)=>Math.abs(Math.log(b/raw))<Math.abs(Math.log(a/raw))?b:a,NICE[0])}

/* ── text ─────────────────────────────────────────────────────────────── */
export const LIFTS_TEXT={
 en:{title:'Lifts — traffic, zones and sky lobbies',
  lede:'The morning rush, run in section. Every car moves with real acceleration, rated speed and door time; every dot is a person waiting. Change the criteria and watch the queues answer, beside the CIBSE calculation that sizes real towers.',
  ctl:{pattern:'Traffic pattern',pat:{up:'Morning up-peak',two:'Lunch two-way',down:'Evening down-peak'},
   patNote:'The CIBSE figures are the up-peak design check whatever the pattern; the simulation is what changes. Lunch is modelled as half up, half down, with no inter-floor trips.',
   pop:'Population',popNote:'Default {p} persons: {a} m² net ÷ 11 m² per person, as the Core desk.',popReset:'Use default',
   rate:'Arrival rate, % of population per 5 min',rateNote:'CIBSE office design range 12–15%.',
   cap:'Car capacity',capNote:'13 persons is about a 1000 kg car; the design load is 80% of it.',
   speed:'Rated speed',speedNote:'Typical for the {r} m run here: about {v} m/s (rule of thumb: a car reaches the top of its run at rated speed in about 30 s). Acceleration {a} m/s² assumed.',
   door:'Door open + close',doorNote:'Per stop. The Core desk counts 2 s per stop in all.',
   zones:'Zones (local groups)',zonesNote:'Each zone has its own group of cars. Upper zones run express past the lower ones.',
   cars:'Cars per zone',auto:'Size every group to CIBSE',autoOn:'On · fewest cars that meet 30 s and the arrival rate',autoOff:'Off · the slider sets every zone',
   sky:'Sky lobby',skyLevel:'Sky lobby level',on:'On',off:'Off',
   skySnap:'Snapped to the {use} level below floor {f}.',skyFree:'Free level, floor {f}.',skyList:'Plant and refuge levels in this tower: {list}.',skyNone:'This programme has no plant or refuge level to snap to.',skyNeed:'Needs two zones or more and eight floors.',
   skyNote:'Shuttles run lobby to sky lobby non-stop; local groups start there, and their shafts stack above the low-rise shafts.',
   use:{plant:'plant',refuge:'refuge'},
   dispatch:'Dispatch',disp:{collective:'Collective',destination:'Destination'},
   dispNote:'Destination dispatch is modelled as two sectors per group: each car takes passengers for one half of its zone. An assumption, not a manufacturer figure; published gains vary with the algorithm and none is applied.',
   dd:'Double-deck cars',ddNote:'Two decks serve two adjacent floors per stop: floors paired, decks load in parallel, plus 1 s per stop assumed for decks that do not line up.'},
  u:{s:'s',ms:'m/s',m2:'m²',m:'m',p:'persons'},
  k:{awt:'Average wait',p90:'90th percentile wait',queue:'Longest queue',interval:'Worst up-peak interval',hc:'Handling capacity, 5 min',ground:'Shafts at the lobby',top:'Shafts at the top floor',sky:'Sky lobby, rentable recovered',coreDesk:'Core desk (simplified)'},
  v:{awt:'CIBSE {c} s · simulated {s} s',p90:'{s} s simulated',queue:'{n} now · {m} at most',interval:'{i} s · {g}',hc:'{h}% of population, lowest group · demand {r}%',
   ground:'{n} shafts · {a} m² · {p}% of the {c} m² core',top:'{n} shafts · {a} m²',sky:'{m} m² over the tower · {u} m² above the sky lobby',skyOff:'Off',coreDesk:'{z} zones × {c} cars · RTT {r} s · interval {i} s',sat:'saturated'},
  status:'Simulated: average wait {a} s · 90th percentile {p} s · longest queue {q}',
  statusSat:'Saturated: arrivals outrun the cars and the queue only grows',
  th:{g:'Group',f:'Floors',c:'Cars',r:'RTT s',i:'Interval s',h:'HC %'},
  grp:{shuttle:'Shuttle',single:'Zone {n}',low:'Low {n}',high:'High {n}'},
  cv:{head:'Section · {f} floors · {c} cars · {s} shafts at the lobby',time:'1 s on screen = {k} s real · t {t}',legend:'Dot = one person waiting · amber = waited over 60 s',lobby:'Lobby',sky:'Sky lobby',aria:'Animated section of the tower: lift shafts, cars moving with real acceleration and door time, and passengers queueing at the lobby.'},
  verdict:{pass:'Interval {i} s, handling {h}% — meets the CIBSE office up-peak (≤ 30 s, ≥ {r}%).',
   int:'Interval {i} s in {g} exceeds 30 s. Add cars, raise the speed, or add a zone or a sky lobby.',
   hc:'Handling {h}% in {g} is below the {r}% arrival rate, so queues grow. Add cars or car capacity.',
   group:'{g} needs {n} cars; a group of more than 8 is impractical round one lobby. Add a zone, raise the speed, or use a sky lobby.',
   sat:'Saturated: {g} cannot carry the arrival rate, and its queue grows without limit.'},
  coreDesk:'Why the Core desk differs: it sizes each zone with H = S = N/2, and no express run past the lower zones. Both use the same rated speed and the same stop time (one-floor flight plus doors). This lab takes S and H from the probability formulas and adds each upper zone’s express run. Same formula, fuller inputs.',
  simGap:'When the simulated wait is longer than the CIBSE figure: the formula assumes cars leave the lobby at even intervals, about 80% full. The simulated group has no dispatcher, so cars bunch and leave fuller, as an unmanaged collective group does. The gap between the two numbers is the case for good dispatching.',
  chart:{sat:'saturated',title:'Average wait against cars per zone',note:'The CIBSE average wait (solid) falls with each car added, by less each time; the shaft area at the lobby (dashed) climbs in a straight line. The current choice is marked.',x:'cars per zone',xd:'cars per group, against the CIBSE minimum',y:'average wait, s',a:'lobby shafts, m²'},
  apply:'Apply a {c} m core to the tower',applyNote:'The lift shafts here take more than half of the {s} m core at the lobby (half is an assumption, leaving room for stairs, risers and toilets).',
  m1:'Round trip, CIBSE Guide D up-peak: RTT = 2·(E + H)·t_v + (S + 1)·t_s + 2·P·t_p. P is 80% of the car capacity. S = N·[1 − (1 − 1/N)^P] is the probable number of stops over N floors; H = N − Σ(i/N)^P for i = 1…N−1 is the highest reversal floor; E is the express floors below the zone; t_v = floor height ÷ rated speed; t_s = single-floor flight time − t_v + door time; t_p = 1.2 s per passenger.',
  m2:'Interval = RTT ÷ cars; handling capacity = 300·P·cars ÷ RTT persons per 5 min. Average wait (Barney and Al-Sharif): AWT ≈ [0.4 + (1.8·P/CC − 0.77)²]·interval for car loads of 50–80%, 0.4·interval below, at the load the arrival rate really produces.',
  m3:'Shaft area per car is assumed at {a} m² for {c} persons (2.8 m² + 0.25 m² per person, walls and landing doors included; check against ISO 8100-30 and manufacturer planning data). A shaft takes floor area on every floor it passes. A sky lobby stops the upper zones’ shafts at the lobby level and replaces their express runs with shuttles; the difference, in m², is what the tower gets back to let.',
  cannot:'Cannot claim: this is not a traffic simulation to industry standard (such as Elevate); there is no lift manufacturer data; no accuracy is claimed for lunch-time or down-peak traffic. The simulation is a simple collective group with a 10 s lobby dwell, seeded arrivals and no inter-floor trips. It shows behaviour, not a certified figure.',
  src:'Sources: CIBSE Guide D: Transportation systems in buildings (2020), up-peak round trip time · G. Barney and L. Al-Sharif, Elevator Traffic Handbook, 2nd ed. (Routledge, 2016) · G. Strakosch and R. Caporale, The Vertical Transportation Handbook, 4th ed. (Wiley, 2010) · ISO 8100-32:2020.'},
 th:{title:'ลิฟต์ — การจราจร โซน และสกายล็อบบี้',
  lede:'ช่วงเร่งด่วนตอนเช้าในภาคตัด รถลิฟต์ทุกคันเคลื่อนด้วยความเร่ง ความเร็วพิกัด และเวลาเปิดปิดประตูจริง ทุกจุดคือคนหนึ่งคนที่รออยู่ ปรับเกณฑ์แล้วดูแถวคอยตอบสนอง เทียบกับการคำนวณตาม CIBSE ที่ใช้ออกแบบอาคารสูงจริง',
  ctl:{pattern:'รูปแบบการจราจร',pat:{up:'ขาขึ้นช่วงเช้า',two:'สองทางช่วงกลางวัน',down:'ขาลงช่วงเย็น'},
   patNote:'ตัวเลขตาม CIBSE เป็นการตรวจสอบการออกแบบช่วงขาขึ้นไม่ว่าจะเลือกรูปแบบใด ส่วนที่เปลี่ยนคือการจำลอง ช่วงกลางวันจำลองเป็นขึ้นครึ่งหนึ่ง ลงครึ่งหนึ่ง และไม่มีการเดินทางระหว่างชั้น',
   pop:'จำนวนผู้ใช้อาคาร',popNote:'ค่าเริ่มต้น {p} คน: พื้นที่สุทธิ {a} ตร.ม. ÷ 11 ตร.ม. ต่อคน ตามแผงแกนอาคาร',popReset:'ใช้ค่าเริ่มต้น',
   rate:'อัตราการมาถึง % ของผู้ใช้อาคารต่อ 5 นาที',rateNote:'ช่วงการออกแบบสำนักงานตาม CIBSE 12–15%',
   cap:'ความจุรถลิฟต์',capNote:'13 คนเท่ากับรถราว 1000 กก. น้ำหนักบรรทุกออกแบบคือ 80% ของค่านี้',
   speed:'ความเร็วพิกัด',speedNote:'ค่าทั่วไปสำหรับระยะวิ่ง {r} ม. ในอาคารนี้: ราว {v} ม./วินาที (หลักง่าย ๆ: รถถึงปลายทางบนสุดด้วยความเร็วพิกัดในราว 30 วินาที) สมมติความเร่ง {a} ม./วินาที²',
   door:'เวลาเปิด + ปิดประตู',doorNote:'ต่อการจอดหนึ่งครั้ง แผงแกนอาคารคิดรวม 2 วินาทีต่อการจอด',
   zones:'จำนวนโซน (กลุ่มลิฟต์)',zonesNote:'แต่ละโซนมีกลุ่มลิฟต์ของตนเอง โซนบนวิ่งด่วนผ่านโซนล่าง',
   cars:'จำนวนรถต่อโซน',auto:'กำหนดทุกกลุ่มตาม CIBSE',autoOn:'เปิด · จำนวนรถน้อยที่สุดที่ผ่าน 30 วินาทีและรับอัตราการมาถึงได้',autoOff:'ปิด · ใช้แถบเลื่อนกำหนดทุกโซน',
   sky:'สกายล็อบบี้',skyLevel:'ระดับสกายล็อบบี้',on:'เปิด',off:'ปิด',
   skySnap:'ยึดกับชั้น{use}ที่อยู่ใต้ชั้น {f}',skyFree:'ระดับอิสระ ชั้น {f}',skyList:'ชั้นเครื่องกลและชั้นหลบภัยในอาคารนี้: {list}',skyNone:'โปรแกรมนี้ไม่มีชั้นเครื่องกลหรือชั้นหลบภัยให้ยึด',skyNeed:'ต้องมีอย่างน้อยสองโซนและแปดชั้น',
   skyNote:'ลิฟต์รับส่งวิ่งตรงจากล็อบบี้ถึงสกายล็อบบี้โดยไม่จอด กลุ่มลิฟต์ท้องถิ่นเริ่มจากชั้นนั้น และช่องลิฟต์ซ้อนอยู่เหนือช่องลิฟต์โซนล่าง',
   use:{plant:'เครื่องกล',refuge:'หลบภัย'},
   dispatch:'การจัดสรรรถ',disp:{collective:'แบบรวมเรียก',destination:'แบบระบุปลายทาง'},
   dispNote:'การจัดสรรแบบระบุปลายทางจำลองเป็นสองช่วงชั้นต่อกลุ่ม รถแต่ละคันรับผู้โดยสารเฉพาะครึ่งหนึ่งของโซน เป็นค่าสมมติ ไม่ใช่ตัวเลขจากผู้ผลิต ผลที่มีการเผยแพร่แตกต่างกันตามอัลกอริทึม และไม่ได้นำมาใช้ที่นี่',
   dd:'รถลิฟต์สองชั้น',ddNote:'สองห้องโดยสารให้บริการสองชั้นติดกันต่อการจอดหนึ่งครั้ง จับคู่ชั้น ผู้โดยสารขึ้นลงพร้อมกันทั้งสองห้อง และสมมติเพิ่ม 1 วินาทีต่อการจอดเมื่อระดับห้องไม่ตรงกัน'},
  u:{s:'วินาที',ms:'ม./วินาที',m2:'ตร.ม.',m:'ม.',p:'คน'},
  k:{awt:'เวลารอเฉลี่ย',p90:'เวลารอเปอร์เซ็นไทล์ที่ 90',queue:'แถวคอยที่ยาวที่สุด',interval:'ช่วงห่างขาขึ้นที่แย่ที่สุด',hc:'ความสามารถในการขนส่ง 5 นาที',ground:'ช่องลิฟต์ที่ชั้นล็อบบี้',top:'ช่องลิฟต์ที่ชั้นบนสุด',sky:'สกายล็อบบี้ พื้นที่ให้เช่าที่ได้คืน',coreDesk:'แผงแกนอาคาร (แบบย่อ)'},
  v:{awt:'CIBSE {c} วินาที · จำลอง {s} วินาที',p90:'จำลอง {s} วินาที',queue:'ตอนนี้ {n} · สูงสุด {m}',interval:'{i} วินาที · {g}',hc:'{h}% ของผู้ใช้อาคาร กลุ่มที่ต่ำที่สุด · ความต้องการ {r}%',
   ground:'{n} ช่อง · {a} ตร.ม. · {p}% ของแกน {c} ตร.ม.',top:'{n} ช่อง · {a} ตร.ม.',sky:'{m} ตร.ม. ทั้งอาคาร · {u} ตร.ม. เหนือสกายล็อบบี้',skyOff:'ปิด',coreDesk:'{z} โซน × {c} คัน · RTT {r} วินาที · ช่วงห่าง {i} วินาที',sat:'อิ่มตัว'},
  status:'ผลจำลอง: เวลารอเฉลี่ย {a} วินาที · เปอร์เซ็นไทล์ที่ 90 {p} วินาที · แถวคอยยาวสุด {q}',
  statusSat:'อิ่มตัว: คนมาถึงเร็วกว่าที่รถลิฟต์รับได้ แถวคอยจึงยาวขึ้นเรื่อย ๆ',
  th:{g:'กลุ่ม',f:'ชั้น',c:'รถ',r:'RTT วินาที',i:'ช่วงห่าง วินาที',h:'HC %'},
  grp:{shuttle:'ลิฟต์รับส่ง',single:'โซน {n}',low:'ล่าง {n}',high:'บน {n}'},
  cv:{head:'ภาคตัด · {f} ชั้น · รถ {c} คัน · {s} ช่องที่ล็อบบี้',time:'1 วินาทีบนจอ = {k} วินาทีจริง · t {t}',legend:'จุด = คนที่รอหนึ่งคน · สีอำพัน = รอเกิน 60 วินาที',lobby:'ล็อบบี้',sky:'สกายล็อบบี้',aria:'ภาคตัดเคลื่อนไหวของอาคาร: ช่องลิฟต์ รถลิฟต์ที่เคลื่อนด้วยความเร่งและเวลาประตูจริง และผู้โดยสารที่ต่อแถวที่ล็อบบี้'},
  verdict:{pass:'ช่วงห่าง {i} วินาที ความสามารถขนส่ง {h}% — ผ่านเกณฑ์ขาขึ้นสำนักงานของ CIBSE (≤ 30 วินาที, ≥ {r}%)',
   int:'ช่วงห่าง {i} วินาทีใน{g} เกิน 30 วินาที ให้เพิ่มรถ เพิ่มความเร็ว หรือเพิ่มโซนหรือสกายล็อบบี้',
   hc:'ความสามารถขนส่ง {h}% ใน{g} ต่ำกว่าอัตราการมาถึง {r}% แถวคอยจึงยาวขึ้น ให้เพิ่มรถหรือความจุรถ',
   group:'{g} ต้องใช้รถ {n} คัน กลุ่มที่เกิน 8 คันจัดรอบล็อบบี้เดียวได้ยาก ให้เพิ่มโซน เพิ่มความเร็ว หรือใช้สกายล็อบบี้',
   sat:'อิ่มตัว: {g} รับอัตราการมาถึงไม่ไหว แถวคอยยาวขึ้นไม่สิ้นสุด'},
  coreDesk:'เหตุที่ต่างจากแผงแกนอาคาร: แผงนั้นคิดแต่ละโซนด้วย H = S = N/2 และไม่คิดระยะวิ่งด่วนผ่านโซนล่าง ทั้งสองใช้ความเร็วพิกัดและเวลาต่อการจอดเดียวกัน (เวลาวิ่งหนึ่งชั้นรวมเวลาเปิดปิดประตู) ส่วนนี้คิด S และ H จากสูตรความน่าจะเป็น เพิ่มระยะวิ่งด่วนของโซนบน และนับเวลาเคลื่อนที่หนึ่งชั้นกับเวลาประตู สูตรเดียวกัน แต่ข้อมูลครบกว่า',
  simGap:'เมื่อเวลารอจากการจำลองนานกว่าตัวเลขของ CIBSE: สูตรสมมติว่ารถออกจากล็อบบี้เป็นช่วงห่างเท่ากัน บรรทุกราว 80% แต่กลุ่มลิฟต์ในการจำลองไม่มีระบบจัดสรร รถจึงจับกลุ่มกันและออกไปแน่นกว่า เหมือนกลุ่มลิฟต์แบบรวมเรียกที่ไม่มีการควบคุม ช่องว่างระหว่างสองตัวเลขนี้คือเหตุผลที่ต้องมีการจัดสรรรถที่ดี',
  chart:{sat:'อิ่มตัว',title:'เวลารอเฉลี่ยเทียบกับจำนวนรถต่อโซน',note:'เวลารอเฉลี่ยตาม CIBSE (เส้นทึบ) ลดลงทุกครั้งที่เพิ่มรถ แต่ลดน้อยลงทุกครั้ง ส่วนพื้นที่ช่องลิฟต์ที่ล็อบบี้ (เส้นประ) เพิ่มเป็นเส้นตรง จุดที่เลือกอยู่ทำเครื่องหมายไว้',x:'รถต่อโซน',xd:'รถต่อกลุ่ม เทียบกับจำนวนต่ำสุดตาม CIBSE',y:'เวลารอเฉลี่ย วินาที',a:'ช่องลิฟต์ที่ล็อบบี้ ตร.ม.'},
  apply:'ใช้แกนอาคารขนาด {c} ม. กับอาคาร',applyNote:'ช่องลิฟต์ที่นี่กินพื้นที่เกินครึ่งของแกน {s} ม. ที่ชั้นล็อบบี้ (ครึ่งหนึ่งเป็นค่าสมมติ เผื่อพื้นที่บันได ช่องท่อ และห้องน้ำ)',
  m1:'เวลาเดินทางไปกลับ ช่วงขาขึ้นตาม CIBSE Guide D: RTT = 2·(E + H)·t_v + (S + 1)·t_s + 2·P·t_p โดย P คือ 80% ของความจุรถ S = N·[1 − (1 − 1/N)^P] คือจำนวนการจอดที่น่าจะเกิดใน N ชั้น H = N − Σ(i/N)^P สำหรับ i = 1…N−1 คือชั้นกลับตัวสูงสุด E คือจำนวนชั้นที่วิ่งด่วนใต้โซน t_v = ความสูงชั้น ÷ ความเร็วพิกัด t_s = เวลาเคลื่อนที่หนึ่งชั้น − t_v + เวลาประตู t_p = 1.2 วินาทีต่อผู้โดยสาร',
  m2:'ช่วงห่าง = RTT ÷ จำนวนรถ ความสามารถขนส่ง = 300·P·จำนวนรถ ÷ RTT คนต่อ 5 นาที เวลารอเฉลี่ย (Barney และ Al-Sharif): AWT ≈ [0.4 + (1.8·P/CC − 0.77)²]·ช่วงห่าง เมื่อบรรทุก 50–80% และ 0.4·ช่วงห่างเมื่อต่ำกว่านั้น คิดที่น้ำหนักบรรทุกที่อัตราการมาถึงเกิดขึ้นจริง',
  m3:'สมมติพื้นที่ช่องลิฟต์ต่อรถ {a} ตร.ม. สำหรับ {c} คน (2.8 ตร.ม. + 0.25 ตร.ม. ต่อคน รวมผนังช่องและประตูชั้น ควรตรวจกับ ISO 8100-30 และข้อมูลการวางแผนของผู้ผลิต) ช่องลิฟต์กินพื้นที่ทุกชั้นที่วิ่งผ่าน สกายล็อบบี้ทำให้ช่องลิฟต์โซนบนหยุดที่ระดับล็อบบี้ และแทนการวิ่งด่วนด้วยลิฟต์รับส่ง ส่วนต่างเป็นตารางเมตรคือพื้นที่ที่อาคารได้คืนมาให้เช่า',
  cannot:'สิ่งที่อ้างไม่ได้: นี่ไม่ใช่การจำลองการจราจรตามมาตรฐานอุตสาหกรรม (เช่น Elevate) ไม่มีข้อมูลจากผู้ผลิตลิฟต์ ไม่อ้างความแม่นยำของการจราจรช่วงกลางวันหรือขาลง การจำลองเป็นกลุ่มลิฟต์แบบรวมเรียกอย่างง่าย รอที่ล็อบบี้ 10 วินาที การมาถึงแบบสุ่มที่กำหนดเมล็ดไว้ และไม่มีการเดินทางระหว่างชั้น แสดงพฤติกรรม ไม่ใช่ตัวเลขที่รับรองได้',
  src:'แหล่งอ้างอิง: CIBSE Guide D: Transportation systems in buildings (2020) เวลาเดินทางไปกลับช่วงขาขึ้น · G. Barney และ L. Al-Sharif, Elevator Traffic Handbook พิมพ์ครั้งที่ 2 (Routledge, 2016) · G. Strakosch และ R. Caporale, The Vertical Transportation Handbook พิมพ์ครั้งที่ 4 (Wiley, 2010) · ISO 8100-32:2020'},
 zh:{title:'电梯 — 交通、分区与空中大堂',
  lede:'早高峰在剖面中运行。每台轿厢都按真实的加速度、额定速度和开关门时间运动；每个点代表一位候梯者。调整设计条件，看候梯队列如何变化，并与实际塔楼设计所用的 CIBSE 计算对照。',
  ctl:{pattern:'交通模式',pat:{up:'早高峰上行',two:'午间双向',down:'晚高峰下行'},
   patNote:'无论选择哪种模式，CIBSE 数值都是上行高峰的设计校核；随模式变化的是模拟。午间按一半上行、一半下行建模，不含层间交通。',
   pop:'人数',popNote:'默认 {p} 人：净面积 {a} 平方米 ÷ 每人 11 平方米，与核心筒面板一致。',popReset:'恢复默认',
   rate:'到达率，每 5 分钟占总人数的 %',rateNote:'CIBSE 办公楼设计范围 12–15%。',
   cap:'轿厢载客量',capNote:'13 人约合 1000 公斤轿厢；设计载荷取其 80%。',
   speed:'额定速度',speedNote:'本楼 {r} 米运行距离的常用值：约 {v} 米/秒（经验法则：轿厢以额定速度约 30 秒到达运行区段顶部）。假定加速度 {a} 米/秒²。',
   door:'开门 + 关门时间',doorNote:'每次停靠。核心筒面板每次停靠共计 2 秒。',
   zones:'分区数（电梯组）',zonesNote:'每个分区有自己的电梯组。高区电梯快速直驶穿过低区。',
   cars:'每区轿厢数',auto:'按 CIBSE 配置每组',autoOn:'开 · 满足 30 秒间隔和到达率的最少轿厢数',autoOff:'关 · 用滑块统一设定每区',
   sky:'空中大堂',skyLevel:'空中大堂所在楼层',on:'开',off:'关',
   skySnap:'已对齐到第 {f} 层下方的{use}层。',skyFree:'自由设定，第 {f} 层。',skyList:'本楼的设备层与避难层：{list}。',skyNone:'此楼层方案没有可对齐的设备层或避难层。',skyNeed:'需要至少两个分区和八层楼。',
   skyNote:'穿梭电梯从首层大堂直达空中大堂，中途不停；本地电梯组从那里起步，其井道叠在低区井道之上。',
   use:{plant:'设备',refuge:'避难'},
   dispatch:'派梯方式',disp:{collective:'集选控制',destination:'目的层派梯'},
   dispNote:'目的层派梯按每组两个分段建模：每台轿厢只接载本区一半楼层的乘客。这是假定，不是厂商数据；公开的提升幅度因算法而异，此处未采用。',
   dd:'双层轿厢',ddNote:'两层轿厢每次停靠服务相邻两层：楼层成对，两层同时上下客，并假定轿厢与楼层不能同时对齐时每次停靠多 1 秒。'},
  u:{s:'秒',ms:'米/秒',m2:'平方米',m:'米',p:'人'},
  k:{awt:'平均候梯时间',p90:'第 90 百分位候梯时间',queue:'最长队列',interval:'最不利上行间隔',hc:'5 分钟输送能力',ground:'首层大堂井道',top:'顶层井道',sky:'空中大堂，收回的可租面积',coreDesk:'核心筒面板（简化）'},
  v:{awt:'CIBSE {c} 秒 · 模拟 {s} 秒',p90:'模拟 {s} 秒',queue:'当前 {n} · 最多 {m}',interval:'{i} 秒 · {g}',hc:'占人数 {h}%（最低一组）· 需求 {r}%',
   ground:'{n} 个井道 · {a} 平方米 · 占 {c} 平方米核心筒的 {p}%',top:'{n} 个井道 · {a} 平方米',sky:'全楼 {m} 平方米 · 空中大堂以上 {u} 平方米',skyOff:'关',coreDesk:'{z} 个分区 × {c} 台 · RTT {r} 秒 · 间隔 {i} 秒',sat:'饱和'},
  status:'模拟：平均候梯 {a} 秒 · 第 90 百分位 {p} 秒 · 最长队列 {q}',
  statusSat:'饱和：到达人数超过电梯运力，队列只会越来越长',
  th:{g:'电梯组',f:'楼层',c:'台数',r:'RTT 秒',i:'间隔 秒',h:'HC %'},
  grp:{shuttle:'穿梭梯',single:'{n} 区',low:'低区 {n}',high:'高区 {n}'},
  cv:{head:'剖面 · {f} 层 · {c} 台轿厢 · 首层 {s} 个井道',time:'屏幕 1 秒 = 实际 {k} 秒 · t {t}',legend:'点 = 一位候梯者 · 琥珀色 = 已等候超过 60 秒',lobby:'大堂',sky:'空中大堂',aria:'塔楼动态剖面：电梯井道、按真实加速度和开关门时间运行的轿厢，以及在大堂排队的乘客。'},
  verdict:{pass:'间隔 {i} 秒，输送能力 {h}% — 满足 CIBSE 办公楼上行高峰要求（≤ 30 秒，≥ {r}%）。',
   int:'{g}的间隔 {i} 秒超过 30 秒。请增加轿厢、提高速度，或增加分区或空中大堂。',
   hc:'{g}的输送能力 {h}% 低于 {r}% 的到达率，队列会增长。请增加轿厢或载客量。',
   group:'{g}需要 {n} 台轿厢；超过 8 台的电梯组难以围绕一个候梯厅布置。请增加分区、提高速度，或采用空中大堂。',
   sat:'饱和：{g}无法承担该到达率，队列将无限增长。'},
  coreDesk:'与核心筒面板不同的原因：该面板按 H = S = N/2 计算每个分区，不计穿过低区的直驶段；两者采用相同的额定速度和相同的停靠时间（单层运行加开关门）。本实验按概率公式求 S 和 H，加入高区的直驶段，并计入单层运行时间和开关门时间。公式相同，输入更完整。',
  simGap:'模拟候梯时间长于 CIBSE 数值时：公式假定轿厢以均匀间隔、约 80% 满载离开大堂；模拟中的电梯组没有调度器，轿厢会扎堆、载得更满才出发，就像缺乏管理的集选电梯组。两个数字之间的差距，正说明良好派梯的价值。',
  chart:{sat:'饱和',title:'平均候梯时间与每区轿厢数',note:'CIBSE 平均候梯时间（实线）随每增加一台轿厢而下降，但降幅越来越小；首层井道面积（虚线）则直线上升。当前选择已标出。',x:'每区轿厢数',xd:'每组轿厢数（相对 CIBSE 最少配置）',y:'平均候梯 秒',a:'首层井道 平方米'},
  apply:'将 {c} 米核心筒应用到塔楼',applyNote:'此处电梯井道在首层占用了 {s} 米核心筒一半以上的面积（一半为假定值，为楼梯、管井和卫生间留出空间）。',
  m1:'往返时间，CIBSE Guide D 上行高峰：RTT = 2·(E + H)·t_v + (S + 1)·t_s + 2·P·t_p。P 为轿厢载客量的 80%。S = N·[1 − (1 − 1/N)^P] 为 N 层内的可能停站数；H = N − Σ(i/N)^P（i = 1…N−1）为最高返回层；E 为分区以下的直驶层数；t_v = 层高 ÷ 额定速度；t_s = 单层运行时间 − t_v + 开关门时间；t_p = 每位乘客 1.2 秒。',
  m2:'间隔 = RTT ÷ 轿厢数；输送能力 = 300·P·轿厢数 ÷ RTT（人/5 分钟）。平均候梯时间（Barney 与 Al-Sharif）：轿厢载荷 50–80% 时 AWT ≈ [0.4 + (1.8·P/CC − 0.77)²]·间隔，低于 50% 时为 0.4·间隔，按到达率实际产生的载荷计算。',
  m3:'假定每台轿厢井道面积为 {a} 平方米（{c} 人；2.8 平方米 + 每人 0.25 平方米，含井道墙和层门；请与 ISO 8100-30 及厂商规划资料核对）。井道在其经过的每一层都占用楼面。空中大堂让高区井道止于该层，并以穿梭电梯取代直驶段；两者之差（平方米）就是塔楼收回的可出租面积。',
  cannot:'不能据此断言：这不是符合行业标准的交通模拟（如 Elevate）；没有电梯厂商数据；不声称午间或下行高峰的准确性。模拟是一个简单的集选电梯组，大堂停留 10 秒，到达按固定种子随机生成，不含层间交通。它展示的是行为，不是认证数值。',
  src:'来源：CIBSE Guide D: Transportation systems in buildings（2020），上行高峰往返时间 · G. Barney、L. Al-Sharif，Elevator Traffic Handbook 第 2 版（Routledge，2016）· G. Strakosch、R. Caporale，The Vertical Transportation Handbook 第 4 版（Wiley，2010）· ISO 8100-32:2020。'}
};

/* ── DOM ──────────────────────────────────────────────────────────────── */
const fill=(t,v)=>String(t).replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const ACC='#f59e0b',INK='#e6edf3',DIM='#a2aca9',DARK='#111416';
const ctl={pattern:'up',pop:null,rate:12,cap:13,speed:null,door:4,zones:null,cars:null,auto:true,sky:false,skyLevel:null,dispatch:'collective',dd:false};
let ui=null,last=null,raf=0,sim=null,plan=null,curve=null,apply=null;

function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const loc=lang=>lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
function fmt(v,d=0){if(v===Infinity)return '∞';return Number.isFinite(v)?v.toLocaleString(loc(ui?ui.lang:'en'),{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
const clock=t=>{t=Math.max(0,Math.floor(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};

function build(host,lang){
 const c=LIFTS_TEXT[lang]||LIFTS_TEXT.en;
 if(ui&&ui.ro)ui.ro.disconnect();
 host.replaceChildren();
 const root=el('section','lt');
 const head=el('h2','lt-title',c.title);
 const sheet=el('canvas','lt-canvas lt-sheet');sheet.setAttribute('role','img');sheet.setAttribute('aria-label',c.cv.aria);
 const status=el('p','lt-status');
 const lede=el('p','lt-prose',c.lede);
 const ctls=el('div','lt-controls');
 const field=(id,label)=>{const w=el('div','lt-field'),top=el('div','lt-fieldhead'),lab=el('label','lt-label',label),out=el('output','lt-out');lab.htmlFor='lt-'+id;top.append(lab,out);w.append(top);ctls.append(w);return {w,out,lab}};
 const range=(id,label,min,max,step,on,note)=>{const f=field(id,label),inp=el('input');inp.type='range';inp.id='lt-'+id;inp.min=min;inp.max=max;inp.step=step;inp.oninput=()=>{on(+inp.value);refresh()};f.w.append(inp);const n=el('p','lt-hint',note??'');f.w.append(n);return {...f,inp,note:n}};
 const seg=(id,label,opts,on,note)=>{const f=field(id,label),g=el('div','lt-seg');g.setAttribute('role','group');g.setAttribute('aria-label',label);
  const bs=opts.map(([k,t])=>{const b=el('button',null,t);b.type='button';b.onclick=()=>{on(k);refresh()};g.append(b);return [k,b]});
  bs[0][1].id='lt-'+id;f.w.append(g);const n=el('p','lt-hint',note??'');f.w.append(n);return {...f,bs,note:n}};
 const onoff=[[true,c.ctl.on],[false,c.ctl.off]];
 const R={};
 R.pattern=seg('pattern',c.ctl.pattern,[['up',c.ctl.pat.up],['two',c.ctl.pat.two],['down',c.ctl.pat.down]],k=>{ctl.pattern=k},c.ctl.patNote);
 {const f=field('pop',c.ctl.pop),row=el('div','lt-inrow'),inp=el('input','lt-num');inp.type='number';inp.id='lt-pop';inp.min=1;inp.max=200000;inp.step=1;inp.inputMode='numeric';
  const unit=el('span','lt-unit',c.u.p),reset=el('button','lt-btn',c.ctl.popReset);reset.type='button';
  inp.onchange=()=>{const v=+inp.value;ctl.pop=Number.isFinite(v)&&v>0?Math.round(v):null;refresh()};
  reset.onclick=()=>{ctl.pop=null;refresh()};row.append(inp,unit,reset);const n=el('p','lt-hint');f.w.append(row,n);R.pop={...f,inp,note:n,reset}}
 R.rate=range('rate',c.ctl.rate,5,25,0.5,v=>{ctl.rate=v},c.ctl.rateNote);
 R.cap=range('cap',c.ctl.cap,6,26,1,v=>{ctl.cap=v},c.ctl.capNote);
 R.speed=range('speed',c.ctl.speed,1,10,0.5,v=>{ctl.speed=v});
 R.door=range('door',c.ctl.door,2,8,0.5,v=>{ctl.door=v},c.ctl.doorNote);
 R.zones=range('zones',c.ctl.zones,1,8,1,v=>{ctl.zones=v},c.ctl.zonesNote);
 R.cars=range('cars',c.ctl.cars,1,24,1,v=>{ctl.cars=v;ctl.auto=false});
 R.auto=seg('auto',c.ctl.auto,onoff,k=>{ctl.auto=k});
 R.sky=seg('sky',c.ctl.sky,onoff,k=>{ctl.sky=k},c.ctl.skyNote);
 R.skyLevel=range('skyLevel',c.ctl.skyLevel,2,40,1,v=>{ctl.skyLevel=v;ctl.sky=true});
 R.dispatch=seg('dispatch',c.ctl.dispatch,[['collective',c.ctl.disp.collective],['destination',c.ctl.disp.destination]],k=>{ctl.dispatch=k},c.ctl.dispNote);
 R.dd=seg('dd',c.ctl.dd,onoff,k=>{ctl.dd=k},c.ctl.ddNote);
 const verdict=el('p','lt-verdict');verdict.setAttribute('aria-live','polite');
 const dl=el('dl','lt-facts'),rows={};
 for(const k of ['awt','p90','queue','interval','hc','ground','top','sky','coreDesk']){const d=el('div');const dd=el('dd');d.append(el('dt',null,c.k[k]),dd);dl.append(d);rows[k]=dd}
 const tw=el('div','lt-tablewrap'),table=el('table','lt-table'),thead=el('thead'),tr=el('tr'),tbody=el('tbody');
 for(const k of ['g','f','c','r','i','h'])tr.append(el('th',null,c.th[k]));thead.append(tr);table.append(thead,tbody);tw.append(table);
 const applyB=el('button','lt-btn lt-apply');applyB.type='button';const applyN=el('p','lt-hint');
 const coreNote=el('p','lt-prose',c.coreDesk),simGap=el('p','lt-prose',c.simGap);
 const chartT=el('h3','lt-sub',c.chart.title),chart=el('canvas','lt-canvas lt-chart');chart.setAttribute('role','img');chart.setAttribute('aria-label',c.chart.title);
 const chartN=el('p','lt-hint',c.chart.note);
 const m1=el('p','lt-prose lt-formula',c.m1),m2=el('p','lt-prose lt-formula',c.m2),m3=el('p','lt-prose');
 const cannot=el('p','lt-prose lt-limits',c.cannot),src=el('p','lt-src',c.src);
 root.append(head,sheet,status,lede,ctls,verdict,dl,tw,applyB,applyN,coreNote,simGap,chartT,chart,chartN,m1,m2,m3,cannot,src);
 host.append(root);
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>{size();if(!raf)drawAll()}):null;
 if(ro){ro.observe(sheet);ro.observe(chart)}
 // Canvas text: the mono face first, then the non-looped Thai and the Chinese
 // faces the page already loads, so th and zh labels never fall to a system face.
 ui={host,lang,c,root,sheet,chart,status,R,verdict,rows,tbody,applyB,applyN,m3,ro,font:"11px 'IBM Plex Mono','IBM Plex Sans Thai','Noto Sans SC',ui-monospace,monospace",lastDom:0};
 size();
}

function size(){
 if(!ui)return;const dpr=Math.min(3,globalThis.devicePixelRatio||1);
 for(const cv of [ui.sheet,ui.chart]){const w=Math.max(1,Math.round(cv.clientWidth)),h=Math.max(1,Math.round(cv.clientHeight));if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}cv._w=w;cv._h=h;cv._dpr=dpr}
}

const planKey=p=>[p.pattern,p.pop,p.rate,p.cap,p.v,p.td,p.decks,p.dest,p.L,p.top,p.towerTop.toFixed(2),p.groups.map(g=>g.base+'.'+g.lo+'.'+g.hi+'.'+g.cars).join(',')].join('|');

function grpName(g,i,groups){
 const c=ui.c;if(g.kind==='shuttle')return c.grp.shuttle;
 const same=groups.filter(x=>x.bank===g.bank);return fill(c.grp[g.bank],{n:same.indexOf(g)+1});
}

function refresh(){
 if(!ui||!last)return;
 const {state,metrics}=last,c=ui.c,R=ui.R;
 let p;try{p=liftPlan(state,ctl,metrics)}catch{return}
 plan=p;
 try{
  if(p.auto){curve=waitCurveDelta(state,ctl,metrics);curve.cur=3;curve.xl=c.chart.xd}
  else{const auto=liftPlan(state,{...ctl,auto:true},metrics,true);const need=Math.max(...auto.groups.map(g=>g.cars));curve=waitCurve(state,ctl,metrics,clamp(Math.max(need,p.carsM)+4,8,24));curve.cur=p.carsM-1;curve.xl=c.chart.x}
 }catch{curve=null}
 // controls
 for(const [k,b]of R.pattern.bs)b.setAttribute('aria-pressed',String(p.pattern===k));
 R.pattern.out.textContent='';
 if(document.activeElement!==R.pop.inp)R.pop.inp.value=String(Math.round(p.pop));
 R.pop.out.textContent=fmt(p.pop)+' '+c.u.p;
 R.pop.note.textContent=fill(c.ctl.popNote,{p:fmt(p.popDefault),a:fmt(p.net)});
 R.pop.reset.disabled=ctl.pop==null;
 R.rate.inp.value=p.rate;R.rate.out.textContent=fmt(p.rate,1)+'%';
 R.cap.inp.value=p.cap;R.cap.out.textContent=fmt(p.cap)+' '+c.u.p;
 R.speed.inp.value=p.v;R.speed.out.textContent=fmt(p.v,1)+' '+c.u.ms;
 R.speed.note.textContent=fill(c.ctl.speedNote,{r:fmt(p.run),v:fmt(p.vTypical,1),a:fmt(p.a,1)});
 R.door.inp.value=p.td;R.door.out.textContent=fmt(p.td,1)+' '+c.u.s;
 const maxZ=Math.max(1,Math.min(8,Math.floor(p.N/2)));R.zones.inp.max=maxZ;R.zones.inp.value=p.Z;R.zones.out.textContent=fmt(p.Z);
 const loc=p.groups.filter(g=>g.kind==='local').map(g=>g.cars),lo=Math.min(...loc),hi=Math.max(...loc);
 R.cars.inp.value=p.auto?Math.round(loc.reduce((a,b)=>a+b,0)/loc.length):p.carsM;
 R.cars.out.textContent=lo===hi?fmt(lo):fmt(lo)+'–'+fmt(hi);
 R.cars.note.textContent='';
 for(const [k,b]of R.auto.bs)b.setAttribute('aria-pressed',String(p.auto===k));
 R.auto.note.textContent=p.auto?c.ctl.autoOn:c.ctl.autoOff;
 for(const [k,b]of R.sky.bs){b.setAttribute('aria-pressed',String(p.sky===k));b.disabled=k===true&&!p.skyOK}
 R.sky.out.textContent='';
 R.skyLevel.inp.min=2;R.skyLevel.inp.max=Math.max(3,p.top-2);R.skyLevel.inp.disabled=!p.skyOK;
 R.skyLevel.inp.value=p.L??(p.cands[0]?.f??Math.round(p.N/2));
 R.skyLevel.out.textContent=p.sky?'L'+p.L:c.ctl.off;
 const list=p.cands.map(x=>'L'+x.f+' '+c.ctl.use[x.use]).join(', ');
 R.skyLevel.note.textContent=!p.skyOK?c.ctl.skyNeed:(p.sky?(p.snap?fill(c.ctl.skySnap,{use:c.ctl.use[p.snap.use],f:p.L}):fill(c.ctl.skyFree,{f:p.L}))+' ':'')+(list?fill(c.ctl.skyList,{list}):c.ctl.skyNone);
 for(const [k,b]of R.dispatch.bs)b.setAttribute('aria-pressed',String(ctl.dispatch===k));
 for(const [k,b]of R.dd.bs)b.setAttribute('aria-pressed',String(p.dd===k));
 // verdict
 const names=new Map(p.groups.map((g,i)=>[g,grpName(g,i,p.groups)]));
 const sat=p.groups.find(g=>g.saturated);
 const vg=p.verdict==='sat'?sat:p.verdict==='int'?p.worst:p.verdict==='hc'?p.lowHc:p.verdict==='group'?p.big:p.worst;
 ui.verdict.textContent=fill(c.verdict[p.verdict],{i:fmt(p.interval,1),h:fmt(p.hcPct,1),r:fmt(p.rate,1),g:names.get(vg)||'',n:vg?vg.cars:''});
 ui.verdict.classList.toggle('lt-flag',p.verdict!=='pass');
 const rw=ui.rows;
 rw.interval.textContent=fill(c.v.interval,{i:fmt(p.interval,1),g:names.get(p.worst)});
 rw.hc.textContent=fill(c.v.hc,{h:fmt(p.hcPct,1),r:fmt(p.rate,1)});
 const topN=p.shafts[p.top];
 rw.ground.textContent=fill(c.v.ground,{n:fmt(p.shafts[0]),a:fmt(p.groundArea),p:fmt(100*p.groundArea/p.coreArea),c:fmt(p.coreArea)});
 rw.top.textContent=fill(c.v.top,{n:fmt(topN),a:fmt(topN*p.shaftA)});
 rw.sky.textContent=p.sky&&p.recovered!=null?fill(c.v.sky,{m:fmt(p.recovered),u:fmt(p.recoveredUpper)}):c.v.skyOff;
 rw.coreDesk.textContent=fill(c.v.coreDesk,{z:fmt(p.coreDesk.zones),c:fmt(p.coreDesk.cars),r:fmt(p.coreDesk.rt),i:fmt(p.coreDesk.interval,1)});
 ui.tbody.replaceChildren(...p.groups.map(g=>{
  const tr=el('tr');if(g===vg&&p.verdict!=='pass')tr.className='lt-me';
  for(const t of [names.get(g),(g.kind==='shuttle'?'0→'+g.lo:g.lo+'–'+g.hi),fmt(g.cars),fmt(g.rtt),fmt(g.interval,1),g.saturated?c.v.sat:fmt(g.hcPct,1)])tr.append(el('td',null,t));
  return tr}));
 const canApply=apply&&p.suggestCore&&p.suggestCore>p.core;
 ui.applyB.hidden=!canApply;ui.applyN.hidden=!canApply;
 if(canApply){ui.applyB.textContent=fill(c.apply,{c:fmt(p.suggestCore)});ui.applyN.textContent=fill(c.applyNote,{s:fmt(p.core)});ui.applyB.onclick=()=>{try{apply({core:p.suggestCore})}catch{}}}
 ui.m3.textContent=fill(c.m3,{a:fmt(p.shaftA,2),c:fmt(p.cap)});
 const key=planKey(p);
 if(!sim||sim.key!==key){sim=createSim(p,{seed:7});sim.key=key;sim.k=timeScale(Math.max(...p.groups.map(g=>g.rtt)));}
 else sim.plan=p;
 updateLive(true);
 if(!raf)drawAll();
}

function updateLive(force){
 if(!ui||!sim||!plan)return;
 const c=ui.c,st=simStats(sim),wait=st.t>5;
 const a=wait?fmt(st.avg,1):'—',p9=wait?fmt(st.p90,1):'—';
 ui.status.textContent=st.saturated||plan.saturated?c.statusSat:fill(c.status,{a,p:p9,q:fmt(st.queue)});
 ui.status.classList.toggle('lt-flag',!!(st.saturated||plan.saturated));
 ui.rows.awt.textContent=fill(c.v.awt,{c:plan.saturated?c.v.sat:fmt(plan.awt,1),s:a});
 ui.rows.p90.textContent=fill(c.v.p90,{s:p9});
 ui.rows.queue.textContent=fill(c.v.queue,{n:fmt(st.queue),m:fmt(st.queueMax)});
}

function ctx2d(cv){const x=cv.getContext&&cv.getContext('2d');if(!x)return null;x.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);return x}

function drawSection(){
 const cv=ui.sheet,x=ctx2d(cv);if(!x||!sim||!plan)return;
 const p=sim.plan,c=ui.c,W=cv._w||cv.clientWidth||320,H=cv._h||cv.clientHeight||400;
 x.fillStyle=DARK;x.fillRect(0,0,W,H);x.font=ui.font;x.textBaseline='middle';x.lineWidth=1;
 const kf=sim.k||10,fits=t=>x.measureText(t).width<=W-16;
 const headParts=[fmt(p.top+1),fmt(p.cars),fmt(p.shafts[0])],headFull=fill(c.cv.head,{f:headParts[0],c:headParts[1],s:headParts[2]});
 const head=fits(headFull)?headFull:headFull.split(' · ').slice(0,2).join(' · ');
 const timeT=fill(c.cv.time,{k:fmt(kf),t:clock(sim.t)}),[legA,legB='']=c.cv.legend.split(' · ');
 const legOne=fits(legA+' · '+legB);
 const foot=1+(legOne?1:2),top=28,bot=H-14*foot-22,gut=clamp(Math.round(W*0.22),72,160),right=40;
 const avail=W-gut-right,colW=clamp(avail/Math.max(1,p.cols),3,16),sx0=gut;
 const py=(bot-top)/Math.max(1,p.towerTop),y=z=>bot-z*py;
 const fpx=p.df*py;
 // plant and refuge levels
 x.fillStyle='rgba(162,172,169,0.16)';
 for(const v of p.voids)x.fillRect(sx0,y(v.z+v.h),p.cols*colW,Math.max(1,v.h*py));
 // floors
 x.strokeStyle=DIM;x.globalAlpha=fpx>=4?0.16:0.08;x.beginPath();
 for(let f=0;f<=p.top;f++){const yy=Math.round(y(p.levelZ[f]))+0.5;x.moveTo(sx0,yy);x.lineTo(sx0+p.cols*colW,yy)}
 const yt=Math.round(y(p.towerTop))+0.5;x.moveTo(sx0,yt);x.lineTo(sx0+p.cols*colW,yt);x.stroke();x.globalAlpha=1;
 x.fillStyle=DIM;x.textAlign='left';
 const every=fpx>=11?5:10;
 for(let f=every;f<=p.top;f+=every)x.fillText('L'+f,sx0+p.cols*colW+6,y(p.levelZ[f]+p.levelH[f]/2));
 // shafts
 x.strokeStyle=DIM;x.globalAlpha=0.55;
 for(const g of p.groups)for(let k=0;k<g.cars;k++){
  const x0=Math.round(sx0+(g.col0+k)*colW)+0.5,y0=y(p.levelZ[g.hi]+p.levelH[g.hi]),y1=y(p.levelZ[g.base]);
  x.strokeRect(x0,y0,Math.max(1,colW-1),y1-y0);
 }
 x.globalAlpha=1;
 // lobby and sky lobby
 x.strokeStyle=INK;x.beginPath();x.moveTo(8,Math.round(bot)+0.5);x.lineTo(W-8,Math.round(bot)+0.5);x.stroke();
 x.fillStyle=DIM;x.fillText(c.cv.lobby,8,bot+10);
 if(p.sky){const yy=Math.round(y(p.levelZ[p.L]))+0.5;x.strokeStyle=INK;x.setLineDash([4,3]);x.beginPath();x.moveTo(8,yy);x.lineTo(sx0+p.cols*colW,yy);x.stroke();x.setLineDash([]);x.fillStyle=INK;x.fillText(c.cv.sky+' L'+p.L,8,yy+9)}
 // queues, aggregated by level
 const lv=new Map();
 for(const [k,q]of sim.q)if(q.length){const f=Math.floor((k%100000)/2);let e=lv.get(f);if(!e){e={n:0,late:0};lv.set(f,e)}for(const pp of q){e.n++;if(sim.t-pp.qt+pp.wait>LIFT_ASSUME.longWait)e.late++}}
 const per=Math.max(4,Math.floor((gut-16)/5));
 for(const [f,e]of lv){
  const base=y(p.levelZ[f]),rowsMax=(f===0||f===p.L)?4:1,shown=Math.min(e.n,per*rowsMax);
  for(let i=0;i<shown;i++){const r=Math.floor(i/per),cI=i%per;x.fillStyle=i<e.late?ACC:INK;x.fillRect(sx0-8-cI*5,base-4-r*5,3,3)}
  if(e.n>shown){x.fillStyle=e.late?ACC:INK;x.textAlign='left';x.fillText('+'+(e.n-shown),8,base-4-Math.min(rowsMax,Math.ceil(shown/per))*5-4)}
 }
 // deliveries
 for(const fl of sim.flash){const age=(sim.t-fl.t)/kf;if(age>0.6||fl.f>p.top)continue;x.globalAlpha=1-age/0.6;x.fillStyle=INK;x.fillRect(sx0+p.cols*colW+1,y(p.levelZ[fl.f])-3,3,3)}
 x.globalAlpha=1;
 // cars
 const capT=sim.cap;
 for(const car of sim.cars){
  const g=p.groups[car.g];if(!g)continue;
  const x0=Math.round(sx0+(g.col0+car.k)*colW)+1.5,w=Math.max(2,colW-3),hh=Math.max(4,fpx*p.decks-1),yb=y(car.z);
  x.fillStyle=DARK;x.fillRect(x0,yb-hh,w,hh);
  const load=Math.min(1,car.riders.length/capT);
  if(load>0){x.fillStyle=INK;x.fillRect(x0,yb-hh*load,w,hh*load)}
  x.strokeStyle=INK;x.strokeRect(x0,yb-hh,w,hh);
 }
 // labels, written over their own bands
 x.fillStyle=DARK;x.fillRect(0,0,W,top-6);x.fillRect(0,bot+18,W,H-bot-18);
 x.fillStyle=DIM;x.textAlign='left';
 x.fillText(head,8,12);
 let ly=H-8-14*(foot-1);
 x.fillText(timeT,8,ly);ly+=14;
 x.fillStyle=INK;x.fillText(legA,8,ly);
 if(legOne){x.fillStyle=ACC;x.fillText(legB,8+x.measureText(legA+' · ').width,ly)}
 else{x.fillStyle=ACC;x.fillText(legB,8,ly+14)}
}

function drawChart(){
 const cv=ui.chart,x=ctx2d(cv);if(!x||!curve||!plan)return;
 const c=ui.c,W=cv._w||cv.clientWidth||320,H=cv._h||cv.clientHeight||180;
 x.fillStyle=DARK;x.fillRect(0,0,W,H);x.font=ui.font;x.lineWidth=1;x.textBaseline='middle';
 const L=34,Rr=40,T=26,B=H-32,n=curve.length;
 const fin2=curve.filter(d=>Number.isFinite(d.awt)).map(d=>d.awt);
 const ymax=Math.max(10,Math.ceil(Math.min(Math.max(...fin2,10),120)/10)*10);
 const amax=Math.max(1,...curve.map(d=>d.ground));
 const X=i=>L+(W-L-Rr)*i/Math.max(1,n-1),Y=v=>B-(B-T)*Math.min(v,ymax)/ymax,YA=v=>B-(B-T)*v/amax;
 x.strokeStyle=DIM;x.globalAlpha=0.4;x.beginPath();x.moveTo(L,B+0.5);x.lineTo(W-Rr,B+0.5);x.moveTo(L+0.5,T);x.lineTo(L+0.5,B);x.moveTo(W-Rr+0.5,T);x.lineTo(W-Rr+0.5,B);x.stroke();x.globalAlpha=1;
 // saturated stretch
 const firstOk=curve.findIndex(d=>Number.isFinite(d.awt));
 if(firstOk!==0){const xe=firstOk<0?W-Rr:X(firstOk);x.fillStyle='rgba(162,172,169,0.12)';x.fillRect(L+1,T,xe-L-1,B-T);x.fillStyle=DIM;x.textAlign='left';x.fillText(c.chart.sat,L+6,T+8)}
 x.fillStyle=DIM;x.textAlign='center';
 const step=n>12?2:1;
 curve.forEach((d,i)=>{if(i%step===0||i===curve.cur)x.fillText(d.label,X(i),B+10)});
 x.fillText(curve.xl,(L+W-Rr)/2,B+24);
 x.textAlign='right';x.fillText(String(ymax),L-4,T);x.fillText('0',L-4,B);
 x.textAlign='left';x.fillText(fmt(amax),W-Rr+4,T);x.fillText('0',W-Rr+4,B);
 x.textAlign='left';x.fillText(c.chart.y,4,10);x.textAlign='right';x.fillText(c.chart.a,W-4,10);
 // shaft area, dashed
 x.strokeStyle=DIM;x.setLineDash([3,3]);x.beginPath();curve.forEach((d,i)=>{i?x.lineTo(X(i),YA(d.ground)):x.moveTo(X(i),YA(d.ground))});x.stroke();x.setLineDash([]);
 // wait, solid; broken where saturated
 x.strokeStyle=INK;x.beginPath();let pen=false;
 curve.forEach((d,i)=>{if(!Number.isFinite(d.awt)){pen=false;return}const px=X(i),pyv=Y(d.awt);pen?x.lineTo(px,pyv):x.moveTo(px,pyv);pen=true});x.stroke();
 // current
 const i=clamp(curve.cur??0,0,n-1),d=curve[i],cx=Math.round(X(i))+0.5;
 x.strokeStyle=ACC;x.beginPath();x.moveTo(cx,T);x.lineTo(cx,B);x.stroke();
 if(d&&Number.isFinite(d.awt)){x.fillStyle=ACC;x.fillRect(cx-3.5,Y(d.awt)-3,6,6);const r=cx>W/2;x.textAlign=r?'right':'left';x.fillText(fmt(d.awt,1)+' '+c.u.s+' · '+fmt(d.ground)+' '+c.u.m2,cx+(r?-8:8),Math.max(T+8,Y(d.awt)-10))}
}

function drawAll(){if(!ui||!ui.sheet.isConnected)return;try{drawSection();drawChart()}catch{}}

function loop(){
 let prev=0;
 const tick=t=>{
  if(!ui)return;const dt=prev?Math.min(1/20,(t-prev)/1000):1/60;prev=t;
  try{advance(sim,dt*(sim.k||10),0.2);drawSection();if(t-ui.lastDom>400){ui.lastDom=t;updateLive()}}catch{}
  raf=requestAnimationFrame(tick);
 };
 raf=requestAnimationFrame(tick);
}
function stop(){if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0}

export function renderLiftsLab({host,state,metrics,lang='en',active=false,changed=null}={}){
 try{
  if(!host||!state)return;
  apply=typeof changed==='function'?changed:null;
  lang=LIFTS_TEXT[lang]?lang:'en';
  last={state,metrics};
  if(!active){stop();return}
  if(typeof document==='undefined')return;
  if(!ui||ui.host!==host||ui.lang!==lang||!host.contains(ui.root)){stop();sim=null;build(host,lang)}
  refresh();
  if(reduced()){
   stop();
   // one honest still: the same seeded run, a few round trips in
   if(sim&&sim.t<1)advance(sim,Math.min(900,3*Math.max(...plan.groups.map(g=>g.rtt))),0.25);
   updateLive();drawAll();
  }else if(!raf&&typeof requestAnimationFrame==='function')loop();
 }catch{stop()}
}
