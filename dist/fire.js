/* Fire lab — everybody leaving the tower by the stairs, computed rather than drawn.

   The hero is a section of the tower with each stair shaft. The dots are the
   simulation itself, read back at a printed time scale: occupants leave their
   floors after pre-movement, queue at the stair door, descend at the speed the
   density in that stretch of stair allows, merge with the people already in
   the stair, and stop at refuge floors when those are chosen. A floor turns
   clear when the last of its occupants has entered the stair.

   THE HYDRAULIC MODEL — SFPE Handbook of Fire Protection Engineering, 5th ed.
   (2016), ch. 59, Gwynne & Rosenbaum, "Employing the Hydraulic Model in
   Assessing Emergency Movement" (Nelson & Mowrer before them):
     · effective width W_e = clear width − boundary layers; 0.15 m each side for
       a stairway wall or tread edge, 0.15 m each side of a door;
     · speed S = k − a·k·D with a = 0.266, D in persons per m² of effective
       area. Below D = 0.54 people move freely at S = k(1 − 0.266·0.54);
       at D ≈ 3.8 movement stops;
     · specific flow F_s = S·D, a maximum at D = 1.88 p/m²;
     · stair constant k by riser/tread (inches): 7.5/10 → 1.00, 7/11 → 1.08,
       6.5/12 → 1.16, 6.5/13 → 1.23 m/s, giving F_s,max 0.94, 1.01, 1.09, 1.16
       p/s per metre effective; doors and corridors k = 1.40, F_s,max 1.32;
     · travel along a stair = vertical rise × a conversion factor, 1.85, 2.08,
       2.32, 2.48 for the same four stair types. Landings are not added.

   THE SIMULATION — each stair is a column of short cells, each about as long
   as a freely moving person walks in one 2-second step, and the SFPE speed–
   density relation is the cell's fundamental diagram (a Godunov cell
   transmission scheme). A cell sends at most what its density allows on the
   rising branch and accepts at most what the density downstream allows on the
   falling branch, so a crowded stair moves slower and passes fewer people,
   and a queue that forms in it travels upward. Free descent is rounded UP to
   whole steps per cell: never faster than the SFPE speed.
   Merging at a floor door follows Pauls' observations that people entering
   from a floor and people already descending tend to alternate: where the
   stair can accept fewer than both offer, the space is shared half and half,
   and a side that offers less than its half gives the rest to the other.

   THE HAND CHECK — Pauls, "Movement of People", SFPE Handbook (2nd ed. 1995,
   3rd ed. 2002): from drills in office buildings, mean total evacuation time
   t = 0.68 + 0.081·p^0.73 minutes, p = evacuating population per metre of
   effective stair width. Derived for buildings of roughly 8–15 storeys;
   beyond that it is an extrapolation and is labelled so.

   REFUGE FLOORS — HK Code of Practice for Fire Safety in Buildings 2011: a
   building over 25 storeys has a refuge floor at intervals of not more than
   25 storeys, with a net refuge area of at least 50% of that floor.
   GB 50016-2014 §5.5.23: a building over 100 m has its first refuge floor no
   more than 50 m above the fire-service access level and the rest at no more
   than 50 m intervals; the refuge area is sized at 5.0 people/m². Capacity
   here = 50% of the plate × 5 p/m², i.e. 2.5 people per m² of floor plate.

   EVACUATION LIFTS — IBC 2021 §3008 (occupant evacuation elevators) as a
   concept only. The share using lifts is an input. The cars are this tower's
   own lift groups from liftDesign() (CIBSE Guide D), one floor per trip.

   REDUCED MOBILITY — Boyce, Shields & Silcock, Fire Technology 35 (1999):
   mean stair descent of mobility-impaired people without aids ≈ 0.33 m/s.
   They are modelled waiting for their floor's queue to clear, then descending
   at their own speed; with lifts in use they take the lifts first. */
import {stack,profile,area,evaluate} from './model.js';
import {liftDesign,CORE_METHOD} from './core.js';

/* ── SFPE constants ─────────────────────────────────────────────────────── */
export const A_SFPE=0.266;
export const D_FREE=0.54, D_CRIT=1.88, D_JAM=1/A_SFPE;   // 3.76 p/m²
export const BOUNDARY=0.15;                               // m, each side
export const K_DOOR=1.40;
// riser/tread in mm (from inches), stair constant k, travel conversion factor
export const STAIR_TYPES={
 '7.5/10':{riser:191,tread:254,k:1.00,conv:1.85},
 '7/11':{riser:178,tread:279,k:1.08,conv:2.08},
 '6.5/12':{riser:165,tread:305,k:1.16,conv:2.32},
 '6.5/13':{riser:165,tread:330,k:1.23,conv:2.48}
};
export const TREAD_KEYS=Object.keys(STAIR_TYPES);
export const DT=2;                     // s, simulation step
export const WALK_SPEED=0.85*K_DOOR;   // 1.19 m/s, SFPE unimpeded horizontal
export const REFUGE_PER_M2=0.5*5;      // HK 50% net area × GB 5.0 p/m²
export const PRM_SPEED=0.33;           // m/s, Boyce, Shields & Silcock 1999
export const MAX_T=6*3600;             // s, the simulation never runs longer

const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

export const effectiveWidth=(clear,layer=BOUNDARY)=>Math.max(0,fin(clear)-2*layer);
export function speedAt(D,k){
 const d=Math.max(0,fin(D));
 if(d>=D_JAM)return 0;
 return k*(1-A_SFPE*Math.max(d,D_FREE));
}
export const specificFlow=(D,k)=>speedAt(D,k)*Math.max(0,fin(D));
export const maxSpecificFlow=k=>specificFlow(D_CRIT,k);
/* Pauls: minutes, p persons per metre of effective stair width. */
export const paulsMinutes=p=>0.68+0.081*Math.pow(Math.max(0,fin(p)),0.73);

/* A small seeded generator, for the dots only — the model has no randomness. */
export function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}

/* ── the tower as the evacuation sees it ─────────────────────────────────── */
export function towerLevels(s,m,apP=10){
 let st=[];try{st=stack(s)}catch{st=[]}
 if(!st.length)st=[{z:0,h:4,use:'office',gfa:true}];
 const last=st[st.length-1],H=Math.max(1,fin(last.z)+fin(last.h,4));
 let mm=m&&m.gross>0?m:null;
 if(!mm){try{mm=evaluate(s)}catch{mm=null}}
 const ratio=mm&&mm.gross>0&&Number.isFinite(mm.rentable)?clamp(mm.rentable/mm.gross,0.2,1):0.75;
 const per=Math.max(1,fin(apP,10));
 const levels=st.map((l,i)=>{
  let plate=0;try{plate=area(profile(s,clamp(fin(l.z)/H,0,1)))}catch{plate=0}
  if(!Number.isFinite(plate)||plate<0)plate=0;
  const frac=l.frac==null?1:clamp(fin(l.frac,1),0,1),occ=!!l.gfa;
  const isVoid=!l.gfa&&l.use!=='garden';
  return {i,z:fin(l.z),h:Math.max(0.5,fin(l.h,4)),plate,occ,void:isVoid,
   use:isVoid?(l.use==='refuge'?'refuge':'mech'):(typeof l.use==='string'?l.use:'office'),
   pop:occ?plate*frac*ratio/per:0};
 });
 return {levels,H,ratio};
}

/* Refuge floors under one code. They snap to the model's own refuge and
   mechanical levels where one falls inside the limit; otherwise the highest
   office floor inside the limit is converted, and is reported as such. */
export function placeRefuges(levels,mode){
 const out={mode,required:false,list:[]};
 if(mode!=='hk'&&mode!=='gb'||!levels||levels.length<2)return out;
 const top=levels.length-1;
 out.required=mode==='hk'?top>25:levels[top].z+levels[top].h>100;
 if(!out.required)return out;
 const within=(p,j)=>mode==='hk'?j-p<=25:levels[j].z-levels[p].z<=50;
 let prev=0,guard=0;
 while(!within(prev,top)&&guard++<64){
  let ref=-1,vd=-1,occ=-1;
  for(let j=prev+1;j<=top&&within(prev,j);j++){const l=levels[j];if(l.use==='refuge')ref=j;else if(l.void)vd=j;else if(l.occ)occ=j}
  // The highest void inside the limit spaces refuges furthest apart; a stored
  // refuge level wins when it sits within two storeys of that void.
  // A void barely above the last refuge buys nothing, so it must lie at least
  // half the limit up; otherwise the highest office floor is converted.
  const far=j=>mode==='hk'?j-prev>=13:levels[j].z-levels[prev].z>=25;
  const hv=Math.max(ref,vd),pick=hv>prev&&far(hv)?(ref>prev&&hv-ref<=2?ref:hv):occ>prev?occ:hv>prev?hv:prev+1;
  if(pick<=prev||pick>top)break;
  const l=levels[pick];
  out.list.push({i:pick,kind:l.use==='refuge'?'refuge':l.void?'mech':'converted',capacity:REFUGE_PER_M2*l.plate});
  prev=pick;
 }
 return out;
}

/* ── the stair, one column of cells ──────────────────────────────────────
   p.levels: bottom-up [{h, pop, t0, t1, sink, held}] for ONE stair. Level 0 is
   the exit level. Segment i runs from level i down to level i−1. */
export function simulate(p){
 const L=p.levels||[],n=L.length,dt=p.dt||DT,k=p.k,conv=p.conv;
 const We=Math.max(0.05,fin(p.We,0.9)),Wd=Math.max(0.05,fin(p.WeDoor,We));
 const S0=speedAt(0,k),Lc0=S0*dt;
 const segStart=new Int32Array(n).fill(-1),segCells=new Int32Array(n),segLen=new Float64Array(n);
 const cellLen=[];let C=0;
 for(let i=n-1;i>=1;i--){const len=Math.max(0.5,L[i-1].h*conv),nc=Math.max(1,Math.ceil(len/Lc0-1e-9));segStart[i]=C;segCells[i]=nc;segLen[i]=len;for(let c=0;c<nc;c++)cellLen.push(len/nc);C+=nc}
 const N=new Float64Array(C),dm=new Float64Array(C),sp=new Float64Array(C),inn=new Float64Array(C),out=new Float64Array(C);
 const Q=new Float64Array(n),held=new Float64Array(n),cap=new Float64Array(n),arrived=new Float64Array(n),clear=new Float64Array(n).fill(NaN);
 let total=0,tArr=0;
 for(let i=1;i<n;i++){total+=L[i].pop||0;held[i]=L[i].held||0;cap[i]=Math.max(0,L[i].sink||0);tArr=Math.max(tArr,L[i].t1||0);if(!(L[i].pop>0))clear[i]=0}
 const F=(l,t)=>!(l.t1>l.t0)?(t>l.t0?1:0):clamp((t-l.t0)/(l.t1-l.t0),0,1);
 const doorCap=Wd*maxSpecificFlow(K_DOOR)*dt;
 const snaps=[],SNAP=2;
 let t=0,step=0,exited=0,tExit=0,tRef=0,maxQ={n:0,i:0,t:0},finished=n<2||total<=0;
 const snap=()=>{if(!p.snap)return;const a=new Float32Array(3*n+1);for(let i=1;i<n;i++){let s=0;for(let c=segStart[i];c<segStart[i]+segCells[i];c++)s+=N[c];a[i]=s;a[n+i]=Q[i];a[2*n+i]=held[i]}a[3*n]=exited;snaps.push(a)};
 if(!finished){
  snap();
  while(t<MAX_T){
   for(let i=1;i<n;i++){const l=L[i];if(!(l.pop>0))continue;const a=l.pop*(F(l,t+dt)-F(l,t));Q[i]+=a;arrived[i]+=a}
   for(let c=0;c<C;c++){const A=We*cellLen[c],D=N[c]/A;dm[c]=Math.min(N[c],We*specificFlow(Math.min(D,D_CRIT),k)*dt);sp[c]=Math.max(0,Math.min(We*specificFlow(Math.max(D,D_CRIT),k)*dt,D_JAM*A-N[c]));inn[c]=0;out[c]=0}
   for(let i=n-1;i>=1;i--){
    const s=segStart[i],e=s+segCells[i]-1;
    for(let c=s;c<e;c++){const f=Math.min(dm[c],sp[c+1]);out[c]+=f;inn[c+1]+=f}
    const u=i<n-1?segStart[i+1]+segCells[i+1]-1:-1;
    let du=u>=0?dm[u]:0,fr=0;
    if(u>=0&&cap[i]>held[i]){fr=Math.min(du,cap[i]-held[i]);du-=fr}
    const dq=Math.min(Q[i],doorCap),S=sp[s];
    const fa=Math.min(du,Math.max(S/2,S-dq)),fq=Math.min(dq,Math.max(0,S-fa));
    if(u>=0)out[u]+=fr+fa;inn[s]+=fa+fq;held[i]+=fr;Q[i]-=fq;
    if(fr>1e-6)tRef=t+dt;
   }
   const e1=segStart[1]+segCells[1]-1,fe=dm[e1];out[e1]+=fe;exited+=fe;
   for(let c=0;c<C;c++)N[c]+=inn[c]-out[c];
   t+=dt;step++;
   if(fe>1e-6)tExit=t;
   for(let i=1;i<n;i++){
    if(Q[i]>maxQ.n)maxQ={n:Q[i],i,t};
    if(Number.isNaN(clear[i])&&t>=L[i].t1&&Q[i]<1e-6)clear[i]=t;
   }
   if(step%SNAP===0)snap();
   let inStair=0;for(let c=0;c<C;c++)inStair+=N[c];
   let queued=0;for(let i=1;i<n;i++)queued+=Q[i];
   if(t>=tArr&&inStair+queued<1e-4){finished=true;break}
  }
  snap();
 }
 for(let i=1;i<n;i++)if(Number.isNaN(clear[i]))clear[i]=t;
 return {tEnd:Math.max(tExit,tRef),tExit,tRef,finished,total,exited,held:Array.from(held),
  clear:Array.from(clear),maxQ,snaps,snapDt:SNAP*dt,segLen:Array.from(segLen),cells:C,We,k};
}

/* ── evacuation lifts ─────────────────────────────────────────────────────
   The tower's own lift groups, CIBSE round-trip terms from core.js: each trip
   goes empty to one floor, loads, returns. users: persons per level index. */
export function liftEvac(s,levels,users,netArea,pre){
 const M=CORE_METHOD;let ld;try{ld=liftDesign(s,netArea)}catch{ld=null}
 const zones=Math.max(1,ld?ld.zones:1),cars=Math.max(1,ld?ld.carsPerZone:1);
 const P=M.carLoad*M.carRated,occ=levels.filter(l=>l.i>0&&l.occ);
 const per=Math.max(1,Math.ceil(occ.length/zones));
 let time=0,rttMax=0,total=0;const zs=[];
 for(let z=0;z<zones;z++){
  const ls=occ.slice(z*per,(z+1)*per);if(!ls.length)continue;
  let Nz=0,Hz=0;for(const l of ls){const u=users[l.i]||0;Nz+=u;Hz+=u*l.z}
  const H=Nz>0?Hz/Nz:ls[0].z;
  const rtt=2*(H/M.carSpeed+M.carSpeed/M.carAccel)+2*M.doorTime+2*P*M.transferTime;
  const trips=Math.ceil(Nz/P-1e-9),each=Math.ceil(trips/cars);
  const tz=Nz>0?fin(pre)+each*rtt:0;
  time=Math.max(time,tz);rttMax=Math.max(rttMax,rtt);total+=Nz;
  zs.push({from:ls[0].i,to:ls[ls.length-1].i,users:Nz,rtt,trips,time:tz,h:H});
 }
 return {time,rtt:rttMax,zones,cars,users:total,zs,speed:M.carSpeed};
}

/* ── one scenario ───────────────────────────────────────────────────────── */
const STRATEGIES=['simultaneous','phased','lifts'];
export const FIRE_DEFAULTS={apP:10,stairs:2,width:1.2,tread:'7/11',strategy:'simultaneous',liftShare:0.2,refuge:'hk',fire:null,pre:120,prmShare:0.03,prmSpeed:PRM_SPEED};

export function normalize(o={}){
 const d=FIRE_DEFAULTS;
 return {apP:clamp(fin(o.apP,d.apP),2,40),stairs:Math.round(clamp(fin(o.stairs,d.stairs),1,6)),
  width:clamp(fin(o.width,d.width),0.6,4),tread:STAIR_TYPES[o.tread]?o.tread:d.tread,
  strategy:STRATEGIES.includes(o.strategy)?o.strategy:d.strategy,liftShare:clamp(fin(o.liftShare,d.liftShare),0,0.9),
  refuge:['off','hk','gb'].includes(o.refuge)?o.refuge:d.refuge,fire:o.fire==null?null:Math.round(fin(o.fire,0)),
  pre:clamp(fin(o.pre,d.pre),0,1800),prmShare:clamp(fin(o.prmShare,d.prmShare),0,0.5),prmSpeed:clamp(fin(o.prmSpeed,d.prmSpeed),0.05,1.5)};
}

function scenario(ctx,{strategy='simultaneous',sink=false,only=null,snap=false,width,stairs}){
 const {c,levels,refuges,T}=ctx,n=stairs||c.stairs,We=effectiveWidth(width??c.width);
 const lift=strategy==='lifts'?c.liftShare:0,prmLift=Math.min(c.prmShare,lift),prmStair=c.prmShare-prmLift;
 const stairShare=Math.max(0,1-lift-prmStair);
 const win=l=>{const walk=Math.sqrt(Math.max(0,l.plate))/WALK_SPEED;return [0.5*c.pre,1.5*c.pre+Math.max(1,walk)]};
 const sinks=new Map(sink?refuges.list.map(r=>[r.i,r]):[]);
 let phaseDelay=0;
 const base=levels.map(l=>{const [t0,t1]=win(l),on=!only||only.has(l.i),pop=on?l.pop*stairShare/n:0;return {h:l.h,pop,t0,t1,sink:0,held:0}});
 for(const [i,r]of sinks){base[i].sink=r.capacity/n;if(r.kind==='converted'){base[i].held=base[i].pop;base[i].pop=0}}
 if(strategy==='phased'&&ctx.alarm){
  const a=simulate({levels:base.map((b,i)=>ctx.alarm.has(i)?b:{...b,pop:0}),k:T.k,conv:T.conv,We,WeDoor:We});
  let tDoors=0;for(const i of ctx.alarm)tDoors=Math.max(tDoors,a.clear[i]||0);
  for(let i=1;i<base.length;i++)if(!ctx.alarm.has(i)){base[i].t0+=tDoors;base[i].t1+=tDoors}
  phaseDelay=tDoors;
 }
 const res=simulate({levels:base,k:T.k,conv:T.conv,We,WeDoor:We,snap});
 const g=levels[0],gOn=!only||only.has(0);
 const crowd=Math.max(res.tEnd,gOn&&g.pop>0?base[0].t1:0);
 // reduced mobility: wait for the floor's queue, then descend at their own speed
 let prm=0;const prmDots=[];
 if(prmStair>0&&c.prmSpeed>0)for(let i=1;i<levels.length;i++){
  const l=levels[i];if(!(l.pop>0)||(only&&!only.has(i)))continue;
  if(sinks.get(i)?.kind==='converted')continue;
  let j=0;if(sink)for(let q=i-1;q>=1;q--)if(sinks.has(q)){j=q;break}
  let dist=0;for(let q=j+1;q<=i;q++)dist+=levels[q-1].h*T.conv;
  const start=Math.max(res.clear[i]||0,base[i].t1),end=start+dist/c.prmSpeed;
  prm=Math.max(prm,end);prmDots.push({i,j,start,end,count:l.pop*prmStair});
 }
 let lifts=null;
 if(lift>0){const users=levels.map(l=>(!only||only.has(l.i))&&l.i>0?l.pop*lift:0);lifts=liftEvac(ctx.s,levels,users,ctx.net,c.pre)}
 const total=Math.max(crowd,prm,lifts?lifts.time:0);
 return {res,crowd,prm,prmDots,lifts,total,We,n,stairShare,strategy,sink,phaseDelay};
}

function context(s,o,m){
 const c=normalize(o),T=STAIR_TYPES[c.tread];
 const {levels,H,ratio}=towerLevels(s,m,c.apP);
 const refuges=placeRefuges(levels,c.refuge);
 const occ=levels.filter(l=>l.i>0&&l.occ);
 let fire=null;
 if(occ.length){const want=c.fire==null?occ[Math.min(occ.length-1,Math.round(occ.length*0.6))].i:c.fire;fire=occ.reduce((a,l)=>Math.abs(l.i-want)<Math.abs(a.i-want)?l:a,occ[0]).i}
 const alarm=new Set();
 if(fire!=null){const k=occ.findIndex(l=>l.i===fire);for(const q of [k-1,k,k+1])if(occ[q])alarm.add(occ[q].i)}
 const net=levels.reduce((a,l)=>a+l.pop*c.apP,0);
 return {s,c,T,levels,H,ratio,refuges,fire,alarm,net};
}

/* The whole read. Pure, deterministic, never throws for a model state. */
export function fireRead(s,o={},m){
 const ctx=context(s,o,m),{c,T,levels,refuges}=ctx;
 const We=effectiveWidth(c.width),fsMax=maxSpecificFlow(T.k);
 const pop=levels.reduce((a,l)=>a+l.pop,0),stairPop=levels.reduce((a,l)=>a+(l.i>0?l.pop:0),0);
 let liftPop=0;try{liftPop=liftDesign(s,pop*c.apP).population}catch{liftPop=0}
 const hasRef=refuges.list.length>0;
 const simA=scenario(ctx,{strategy:'simultaneous',snap:c.strategy==='simultaneous'&&!hasRef});
 const chosen=c.strategy==='simultaneous'&&!hasRef?simA:scenario(ctx,{strategy:c.strategy,sink:hasRef,snap:true});
 const alarmRun=scenario(ctx,{strategy:'simultaneous',only:ctx.alarm});
 const phasedAll=c.strategy==='phased'&&!hasRef?chosen:scenario(ctx,{strategy:'phased'});
 const lifts=c.strategy==='lifts'?(hasRef?scenario(ctx,{strategy:'lifts'}):chosen):null;
 const wider=scenario(ctx,{strategy:'simultaneous',width:c.width+0.3});
 const more=scenario(ctx,{strategy:'simultaneous',stairs:c.stairs+1});
 const p=stairPop/Math.max(1e-6,c.stairs*We);
 // refuge capacity: static demand = everyone between this refuge and the next one up
 const ref=refuges.list.map((r,q)=>{
  const next=refuges.list[q+1]?refuges.list[q+1].i:levels.length;
  let demand=0;for(let i=r.i;i<next;i++)demand+=levels[i].pop;
  const heldNow=hasRef&&chosen.res.held[r.i]!=null?chosen.res.held[r.i]*chosen.n:0;
  return {...r,z:levels[r.i].z,demand,held:heldNow,ratio:demand/Math.max(1e-6,r.capacity)};
 });
 const mq=chosen.res.maxQ;
 const occCount=levels.filter(l=>l.i>0&&l.occ).length;
 const storeys=levels.length-1,Htop=levels[levels.length-1].z+levels[levels.length-1].h;
 return {c,levels,height:Htop,ratio:ctx.ratio,storeys,occupied:occCount,
  pop,stairPop,liftPop,perFloor:stairPop/Math.max(1,occCount),
  stairs:c.stairs,width:c.width,We,k:T.k,conv:T.conv,tread:c.tread,riser:T.riser,treadMM:T.tread,
  fsMax,flowPerStair:fsMax*We,
  simTotal:simA.total,simCrowd:simA.crowd,simPrm:simA.prm,
  paulsP:p,pauls:paulsMinutes(p)*60,paulsExtrapolated:storeys>15,
  bound:0.5*c.pre+stairPop/Math.max(1e-6,c.stairs*We*fsMax),
  phasedAlarm:alarmRun.total,phasedTotal:phasedAll.total,alarm:[...ctx.alarm].sort((a,b)=>a-b),fire:ctx.fire,
  lifts:lifts?{...(lifts.lifts||{}),share:c.liftShare,time:lifts.lifts?lifts.lifts.time:0,total:lifts.total,crowd:lifts.crowd}:null,
  refuge:{mode:c.refuge,required:refuges.required,list:ref,
   needHK:storeys>25,needGB:Htop>100,
   safety:hasRef?chosen.total:null},
  maxQueue:{n:mq.n*chosen.n,level:mq.i,t:mq.t,wait:Math.max(0,(chosen.res.clear[mq.i]||0)-mq.t)},
  prm:{share:c.prmShare,speed:c.prmSpeed,time:chosen.prm},
  wider:{width:c.width+0.3,total:wider.total,crowd:wider.crowd},more:{stairs:c.stairs+1,total:more.total,crowd:more.crowd},
  chosen,strategy:c.strategy,finished:simA.res.finished&&chosen.res.finished};
}

/* Evacuation time against clear stair width, simultaneous, to the exit level. */
export function widthCurve(s,o={},m,widths=[0.9,1.05,1.2,1.35,1.5,1.65,1.8,1.95,2.1]){
 const ctx=context(s,o,m),stairPop=ctx.levels.reduce((a,l)=>a+(l.i>0?l.pop:0),0);
 return widths.map(w=>{const r=scenario(ctx,{strategy:'simultaneous',width:w}),We=effectiveWidth(w);
  return {width:w,total:r.total,pauls:paulsMinutes(stairPop/Math.max(1e-6,ctx.c.stairs*We))*60}});
}

/* ── text ───────────────────────────────────────────────────────────────── */
export const FIRE_TEXT={
 en:{title:'Fire evacuation',
  lede:'Everyone leaving by the stairs at once, or in phases: where the queues form, how fast the stair moves, and when the last person reaches the exit level.',
  ctl:{load:'Occupant load',loadNote:'Net area per person. CIBSE Guide D gives 10–12 m²/p for offices (the lift design uses 11); BS 9999:2017 Table 1 gives 6 m²/p for offices, a dense case; IBC 2021 Table 1004.5 gives 150 ft² gross per person for business, about 13.9 m²/p.',loadLift:'Use the lift-design load',
   stairs:'Number of stairs',width:'Clear stair width',widthNote:'Effective width = clear width − 2 × 0.15 m boundary layer (SFPE): {we} m.',
   tread:'Riser / tread',treadNote:'SFPE stair type: speed constant k {k} m/s, maximum specific flow {f} people/s per metre effective, travel {c} × the rise.',
   strategy:'Evacuation strategy',liftShare:'Share using evacuation lifts',liftNote:'An input, not a code value. This tower’s own lift groups: {z} zones × {c} cars at {v} m/s, one floor per trip. Occupants with reduced mobility take the lifts first.',
   refuge:'Refuge floors',fire:'Fire floor',fireOut:'level {f}',pre:'Pre-movement time',preNote:'An input. Occupants start between 0.5× and 1.5× this time, then walk to the stair at 1.19 m/s. Take it from PD 7974-6 or the fire engineer.',
   prm:'Occupants with reduced mobility',prmSpeed:'Their stair speed',prmNote:'They wait for their floor’s queue to clear, then descend at their own speed. 0.33 m/s is the mean stair descent of mobility-impaired people without aids (Boyce, Shields & Silcock 1999).'},
  strat:{simultaneous:'Simultaneous',phased:'Phased',lifts:'With lifts'},
  stratNote:{simultaneous:'Every floor is alarmed at once.',phased:'The fire floor and the floors directly above and below go first; the rest are alarmed when those floors have all entered the stair.',lifts:'Every floor at once; a share of occupants uses the lifts (IBC 2021 §3008 concept).'},
  ref:{off:'Off',hk:'HK · ≤25 storeys',gb:'GB · ≤50 m'},
  refNote:{off:'No refuge floors: everyone descends to the exit level.',hk:'HK Code of Practice for Fire Safety in Buildings 2011: over 25 storeys, a refuge floor at most every 25 storeys.',gb:'GB 50016-2014 §5.5.23: over 100 m, the first refuge floor at most 50 m up, then at most every 50 m.',snap:'Placed on this tower’s refuge and mechanical levels where one falls inside the limit; otherwise an office floor is converted. Capacity 50% of the plate at 5 people/m².',notReq:'Not required at this height under the chosen code.'},
  u:{m:'m',mm:'mm',s:'s',min:'min',p:'people',pmin:'people/min',m2p:'m²/p',pct:'%',ms:'m/s',h:'h'},
  k:{pop:'Population',total:'Total evacuation, simultaneous',pauls:'Pauls’ approximation',bound:'Flow bound, by hand',phased:'Phased: alarm floors',phasedAll:'Phased: whole building',safety:'To a refuge or the exit',queue:'Longest queue',flow:'Stair flow, each stair',refuge:'Refuge capacity',lifts:'Share using lifts',prm:'Last occupant with reduced mobility'},
  val:{pop:'{n} · {a} m²/p · lift design {l}',queue:'{n} at level {f} · {w} to clear',flow:'{f} people/min · W_e {we} m',refuge:'level {f}: {d} / {c} people',over:'over capacity',none:'—',liftsOff:'not used',lifts:'{p}% · last car down {t}',alarm:'levels {a}–{b} · {t}',pauls:'{t} · p {p}/m',extra:'extrapolated beyond 15 storeys',bound:'{t} = ½ pre + N ÷ (n·W_e·F_s,max)',off:'off',kind:{refuge:'refuge level',mech:'mechanical level',converted:'converted office floor'}},
  canvas:{scale:'1 s on screen = {k} s',dot:'1 dot = {n} people · hollow: reduced mobility',clear:'floors clear {c} / {n}',out:'out {n}',held:'in refuge {n}',fire:'fire',refuge:'refuge',lift:'lifts',section:'Section · stairs to scale in height, plates not to scale'},
  status:{simultaneous:'Simultaneous: the last person reaches {target} at {t}.',phased:'Phased: the alarm floors are out at {a}; everyone reaches {target} at {t}.',lifts:'With lifts: the last person reaches {target} at {t}.'},
  target:{exit:'the exit level',safety:'a refuge or the exit level'},
  verdict:{base:'{n} stairs at {w} m clear move {f} people a minute between them; the crowd reaches the exit level by {t}.',wider:'Each stair {w2} m wide: {t2}. One more stair: {t3}.',prm:'The slowest group is the occupants with reduced mobility: the last of them arrives at {t}. Evacuation lifts or refuge floors shorten that; a wider stair barely does.',over:'Refuge level {f} would need room for {d} people against {c}.',need:'A refuge floor is required at this height under {code}, and none is switched on.',lifts:'The lifts finish at {t}: with these cars, more lift users would lengthen the evacuation, not shorten it.'},
  code:{hk:'the HK Code (over 25 storeys)',gb:'GB 50016 (over 100 m)'},
  chart:{title:'Evacuation time against stair width',note:'This tower with {n} stairs, simultaneous, to the exit level. Solid: the simulation. Dashed: Pauls’ approximation. The amber point is the current width.',x:'clear stair width, m',y:'min'},
  method:'How it is computed: each stair is a column of short cells. Speed and flow in a cell follow the SFPE hydraulic relations: speed S = k(1 − 0.266·D), specific flow F_s = S·D, its maximum at 1.88 people/m². A crowded stair moves slower and passes fewer people, so a queue that forms in it climbs upward. Each floor joins the stair at its door; where the stair cannot take both, the space is shared half and half between people already descending and people entering, after Pauls’ observations of merging. Refuge floors take people off the stair until they fill.',
  cannot:'Cannot claim: this is not a performance-based fire engineering assessment. No smoke, tenability or fire growth; no human-behaviour model beyond hydraulic flow; no firefighters climbing against the flow; exits at grade and landings are assumed not to limit. One occupant load for every floor, retail included. Local code and the authority having jurisdiction govern.',
  src:'Sources: SFPE Handbook of Fire Protection Engineering, 5th ed. (2016), ch. 59, Gwynne & Rosenbaum, hydraulic model (speed, specific flow, boundary layers, stair types, travel factors) · Pauls, “Movement of People”, SFPE Handbook, t = 0.68 + 0.081·p^0.73 · NFPA 101 · BS 9999:2017 Table 1 · IBC 2021 Table 1004.5 and §3008 · HK Code of Practice for Fire Safety in Buildings 2011 · GB 50016-2014 §5.5.23 · Boyce, Shields & Silcock, Fire Technology 35 (1999) · CIBSE Guide D. Each value to be checked against the edition in force.'},
 th:{title:'การอพยพหนีไฟ',
  lede:'ทุกคนลงบันไดพร้อมกัน หรือทยอยเป็นระยะ คิวเกิดขึ้นที่ใด บันไดเคลื่อนตัวเร็วเพียงใด และคนสุดท้ายถึงระดับทางออกเมื่อใด',
  ctl:{load:'อัตราผู้ใช้อาคาร',loadNote:'พื้นที่สุทธิต่อคน CIBSE Guide D ให้ 10–12 ตร.ม./คน สำหรับสำนักงาน (การออกแบบลิฟต์ใช้ 11) BS 9999:2017 ตาราง 1 ให้ 6 ตร.ม./คน สำหรับสำนักงาน เป็นกรณีหนาแน่น IBC 2021 ตาราง 1004.5 ให้ 150 ตร.ฟุต พื้นที่รวมต่อคน สำหรับอาคารธุรกิจ ราว 13.9 ตร.ม./คน',loadLift:'ใช้ค่าจากการออกแบบลิฟต์',
   stairs:'จำนวนบันได',width:'ความกว้างสุทธิของบันได',widthNote:'ความกว้างประสิทธิผล = ความกว้างสุทธิ − 2 × 0.15 ม. (ชั้นขอบตาม SFPE): {we} ม.',
   tread:'ลูกตั้ง / ลูกนอน',treadNote:'ประเภทบันไดตาม SFPE: ค่าคงที่ความเร็ว k {k} ม./วินาที อัตราการไหลจำเพาะสูงสุด {f} คน/วินาที ต่อเมตรประสิทธิผล ระยะเดิน {c} เท่าของความสูง',
   strategy:'กลยุทธ์การอพยพ',liftShare:'สัดส่วนผู้ใช้ลิฟต์อพยพ',liftNote:'เป็นค่าที่ป้อนเอง ไม่ใช่ค่าตามมาตรฐาน ใช้กลุ่มลิฟต์ของอาคารนี้ {z} โซน × {c} ตัว ที่ {v} ม./วินาที เที่ยวละหนึ่งชั้น ผู้มีข้อจำกัดในการเคลื่อนไหวใช้ลิฟต์ก่อน',
   refuge:'ชั้นหลบภัย',fire:'ชั้นที่เกิดเพลิงไหม้',fireOut:'ชั้น {f}',pre:'เวลาก่อนเริ่มเคลื่อนที่',preNote:'เป็นค่าที่ป้อนเอง ผู้ใช้อาคารเริ่มเคลื่อนที่ระหว่าง 0.5 ถึง 1.5 เท่าของเวลานี้ แล้วเดินไปยังบันไดที่ 1.19 ม./วินาที ให้ใช้ค่าจาก PD 7974-6 หรือวิศวกรป้องกันอัคคีภัย',
   prm:'ผู้มีข้อจำกัดในการเคลื่อนไหว',prmSpeed:'ความเร็วบนบันไดของกลุ่มนี้',prmNote:'รอให้คิวของชั้นตนเองหมดก่อน แล้วจึงลงด้วยความเร็วของตนเอง 0.33 ม./วินาที เป็นค่าเฉลี่ยการลงบันไดของผู้มีข้อจำกัดในการเคลื่อนไหวที่ไม่ใช้อุปกรณ์ช่วย (Boyce, Shields & Silcock 1999)'},
  strat:{simultaneous:'พร้อมกัน',phased:'ทยอยเป็นระยะ',lifts:'ใช้ลิฟต์ร่วม'},
  stratNote:{simultaneous:'ส่งสัญญาณทุกชั้นพร้อมกัน',phased:'ชั้นที่เกิดเพลิงไหม้และชั้นที่อยู่ติดกันด้านบนและด้านล่างออกก่อน ชั้นอื่นได้รับสัญญาณเมื่อทุกคนจากชั้นเหล่านั้นเข้าบันไดแล้ว',lifts:'ทุกชั้นพร้อมกัน โดยผู้ใช้อาคารส่วนหนึ่งใช้ลิฟต์ (แนวคิดตาม IBC 2021 ข้อ 3008)'},
  ref:{off:'ปิด',hk:'ฮ่องกง · ≤25 ชั้น',gb:'GB · ≤50 ม.'},
  refNote:{off:'ไม่มีชั้นหลบภัย ทุกคนลงถึงระดับทางออก',hk:'HK Code of Practice for Fire Safety in Buildings 2011: อาคารสูงเกิน 25 ชั้น ต้องมีชั้นหลบภัยทุก ๆ ไม่เกิน 25 ชั้น',gb:'GB 50016-2014 ข้อ 5.5.23: อาคารสูงเกิน 100 ม. ชั้นหลบภัยแรกสูงไม่เกิน 50 ม. และชั้นถัดไปห่างกันไม่เกิน 50 ม.',snap:'วางบนชั้นหลบภัยและชั้นงานระบบของอาคารนี้เมื่ออยู่ในระยะที่กำหนด หากไม่มีจะเปลี่ยนชั้นสำนักงานหนึ่งชั้น ความจุคิดจากครึ่งหนึ่งของพื้นที่ชั้นที่ 5 คน/ตร.ม.',notReq:'มาตรฐานที่เลือกไม่กำหนดให้มีที่ความสูงนี้'},
  u:{m:'ม.',mm:'มม.',s:'วินาที',min:'นาที',p:'คน',pmin:'คน/นาที',m2p:'ตร.ม./คน',pct:'%',ms:'ม./วินาที',h:'ชม.'},
  k:{pop:'จำนวนผู้ใช้อาคาร',total:'เวลาอพยพทั้งหมด แบบพร้อมกัน',pauls:'ค่าประมาณของ Pauls',bound:'ขอบเขตจากอัตราการไหล คำนวณด้วยมือ',phased:'แบบทยอย: ชั้นที่ได้รับสัญญาณ',phasedAll:'แบบทยอย: ทั้งอาคาร',safety:'ถึงชั้นหลบภัยหรือทางออก',queue:'คิวที่ยาวที่สุด',flow:'อัตราการไหลต่อบันได',refuge:'ความจุชั้นหลบภัย',lifts:'สัดส่วนผู้ใช้ลิฟต์',prm:'ผู้มีข้อจำกัดในการเคลื่อนไหวคนสุดท้าย'},
  val:{pop:'{n} · {a} ตร.ม./คน · การออกแบบลิฟต์ {l}',queue:'{n} ที่ชั้น {f} · อีก {w} จึงหมด',flow:'{f} คน/นาที · W_e {we} ม.',refuge:'ชั้น {f}: {d} / {c} คน',over:'เกินความจุ',none:'—',liftsOff:'ไม่ใช้',lifts:'{p}% · ลิฟต์เที่ยวสุดท้ายถึงชั้นล่าง {t}',alarm:'ชั้น {a}–{b} · {t}',pauls:'{t} · p {p}/ม.',extra:'ต่อเส้นเกิน 15 ชั้น',bound:'{t} = ½ เวลาก่อนเคลื่อนที่ + N ÷ (n·W_e·F_s,max)',off:'ปิด',kind:{refuge:'ชั้นหลบภัย',mech:'ชั้นงานระบบ',converted:'ชั้นสำนักงานที่เปลี่ยนเป็นชั้นหลบภัย'}},
  canvas:{scale:'1 วินาทีบนจอ = {k} วินาทีจริง',dot:'1 จุด = {n} คน · จุดกลวง: ผู้มีข้อจำกัดในการเคลื่อนไหว',clear:'ชั้นที่ว่างแล้ว {c} / {n}',out:'ออกแล้ว {n}',held:'ในชั้นหลบภัย {n}',fire:'เพลิง',refuge:'หลบภัย',lift:'ลิฟต์',section:'รูปตัด · ความสูงตามมาตราส่วน ความกว้างพื้นไม่ตามมาตราส่วน'},
  status:{simultaneous:'พร้อมกัน: คนสุดท้ายถึง{target}ที่ {t}',phased:'ทยอย: ชั้นที่ได้รับสัญญาณออกหมดที่ {a} ทุกคนถึง{target}ที่ {t}',lifts:'ใช้ลิฟต์ร่วม: คนสุดท้ายถึง{target}ที่ {t}'},
  target:{exit:'ระดับทางออก',safety:'ชั้นหลบภัยหรือระดับทางออก'},
  verdict:{base:'บันได {n} ชุด กว้างสุทธิ {w} ม. รับคนได้รวม {f} คนต่อนาที ฝูงชนลงถึงระดับทางออกหมดภายใน {t}',wider:'ถ้าบันไดแต่ละชุดกว้าง {w2} ม.: {t2} ถ้าเพิ่มบันไดอีกหนึ่งชุด: {t3}',prm:'กลุ่มที่ช้าที่สุดคือผู้มีข้อจำกัดในการเคลื่อนไหว คนสุดท้ายของกลุ่มนี้ถึงที่ {t} ลิฟต์อพยพหรือชั้นหลบภัยช่วยลดเวลานี้ได้ แต่การขยายบันไดแทบไม่ช่วย',over:'ชั้นหลบภัยชั้น {f} ต้องรับคน {d} คน แต่รับได้ {c} คน',need:'ที่ความสูงนี้ {code} กำหนดให้มีชั้นหลบภัย แต่ยังไม่ได้เปิดใช้',lifts:'ลิฟต์เสร็จสิ้นที่ {t} ด้วยจำนวนลิฟต์เท่านี้ การเพิ่มผู้ใช้ลิฟต์จะทำให้การอพยพนานขึ้น ไม่ใช่สั้นลง'},
  code:{hk:'มาตรฐานฮ่องกง (เกิน 25 ชั้น)',gb:'GB 50016 (เกิน 100 ม.)'},
  chart:{title:'เวลาอพยพเทียบกับความกว้างบันได',note:'อาคารนี้ บันได {n} ชุด อพยพพร้อมกัน ถึงระดับทางออก เส้นทึบ: ผลจำลอง เส้นประ: ค่าประมาณของ Pauls จุดสีอำพันคือความกว้างปัจจุบัน',x:'ความกว้างสุทธิของบันได ม.',y:'นาที'},
  method:'วิธีคำนวณ: บันไดแต่ละชุดแบ่งเป็นช่วงสั้น ๆ ต่อกัน ความเร็วและอัตราการไหลในแต่ละช่วงเป็นไปตามความสัมพันธ์ไฮดรอลิกของ SFPE ความเร็ว S = k(1 − 0.266·D) อัตราการไหลจำเพาะ F_s = S·D สูงสุดที่ 1.88 คน/ตร.ม. บันไดที่แออัดเคลื่อนช้าลงและให้คนผ่านได้น้อยลง คิวที่เกิดในบันไดจึงลามขึ้นด้านบน แต่ละชั้นเข้าสู่บันไดที่ประตูของตน เมื่อบันไดรับทั้งสองทางไม่ไหว พื้นที่จะแบ่งครึ่งระหว่างคนที่กำลังลงกับคนที่เข้ามาใหม่ ตามข้อสังเกตเรื่องการรวมกระแสของ Pauls ชั้นหลบภัยรับคนออกจากบันไดจนเต็ม',
  cannot:'สิ่งที่อ้างไม่ได้: นี่ไม่ใช่การประเมินทางวิศวกรรมป้องกันอัคคีภัยแบบอิงสมรรถนะ ไม่มีควัน สภาวะที่ทนได้ หรือการลุกลามของไฟ ไม่มีแบบจำลองพฤติกรรมมนุษย์นอกเหนือจากการไหลแบบไฮดรอลิก ไม่มีพนักงานดับเพลิงที่เดินสวนขึ้นมา สมมติว่าทางออกที่ระดับพื้นและชานพักไม่เป็นข้อจำกัด ใช้อัตราผู้ใช้อาคารเดียวกันทุกชั้นรวมถึงพื้นที่ค้าปลีก มาตรฐานท้องถิ่นและหน่วยงานผู้มีอำนาจเป็นผู้กำหนด',
  src:'แหล่งอ้างอิง: SFPE Handbook of Fire Protection Engineering ฉบับที่ 5 (2016) บทที่ 59 Gwynne & Rosenbaum แบบจำลองไฮดรอลิก (ความเร็ว อัตราการไหลจำเพาะ ชั้นขอบ ประเภทบันได ตัวคูณระยะเดิน) · Pauls, “Movement of People”, SFPE Handbook, t = 0.68 + 0.081·p^0.73 · NFPA 101 · BS 9999:2017 ตาราง 1 · IBC 2021 ตาราง 1004.5 และข้อ 3008 · HK Code of Practice for Fire Safety in Buildings 2011 · GB 50016-2014 ข้อ 5.5.23 · Boyce, Shields & Silcock, Fire Technology 35 (1999) · CIBSE Guide D ทุกค่าควรตรวจสอบกับฉบับที่ใช้บังคับ'},
 zh:{title:'火灾疏散',
  lede:'所有人同时走楼梯撤离，或分阶段撤离：队伍在哪里形成，楼梯走得多快，最后一个人何时到达出口层。',
  ctl:{load:'人员密度',loadNote:'每人净面积。CIBSE Guide D 给出办公 10–12 平方米/人（电梯设计取 11）；BS 9999:2017 表 1 给出办公 6 平方米/人，属高密度情形；IBC 2021 表 1004.5 规定商务用途每人 150 平方英尺（总面积），约 13.9 平方米/人。',loadLift:'采用电梯设计的人数',
   stairs:'楼梯数量',width:'楼梯净宽',widthNote:'有效宽度 = 净宽 − 2 × 0.15 米边界层（SFPE）：{we} 米。',
   tread:'踏步高 / 踏步宽',treadNote:'SFPE 楼梯类型：速度常数 k {k} 米/秒，最大比流量 {f} 人/秒·米有效宽度，行走距离为层高的 {c} 倍。',
   strategy:'疏散策略',liftShare:'使用疏散电梯的比例',liftNote:'这是输入值，不是规范值。采用本塔楼自身的电梯分组：{z} 个分区 × {c} 台，速度 {v} 米/秒，每趟服务一层。行动不便者优先乘梯。',
   refuge:'避难层',fire:'起火层',fireOut:'第 {f} 层',pre:'疏散准备时间',preNote:'这是输入值。人员在此时间的 0.5 至 1.5 倍之间开始行动，再以 1.19 米/秒走到楼梯。应按 PD 7974-6 或消防工程师的意见取值。',
   prm:'行动不便者比例',prmSpeed:'其楼梯速度',prmNote:'他们等本层队伍走完后，再以自己的速度下楼。0.33 米/秒为不使用辅助器具的行动不便者平均下楼速度（Boyce, Shields & Silcock 1999）。'},
  strat:{simultaneous:'同时疏散',phased:'分阶段疏散',lifts:'结合电梯'},
  stratNote:{simultaneous:'所有楼层同时报警。',phased:'起火层及其上下相邻楼层先撤离；这些楼层的人员全部进入楼梯后，其余楼层再报警。',lifts:'所有楼层同时撤离，部分人员乘电梯（IBC 2021 第 3008 节的概念）。'},
  ref:{off:'关',hk:'香港 · ≤25 层',gb:'国标 · ≤50 米'},
  refNote:{off:'不设避难层：所有人下到出口层。',hk:'香港《建筑物消防安全守则》2011：超过 25 层的建筑，每隔不超过 25 层设一个避难层。',gb:'GB 50016-2014 第 5.5.23 条：建筑高度超过 100 米时，第一个避难层距地面不大于 50 米，两个避难层之间不大于 50 米。',snap:'在限值范围内优先落在本塔楼的避难层和设备层上；否则将一个办公层改为避难层。容量按楼板面积的 50%、每平方米 5 人计。',notReq:'在此高度下，所选规范不要求设置。'},
  u:{m:'米',mm:'毫米',s:'秒',min:'分',p:'人',pmin:'人/分',m2p:'平方米/人',pct:'%',ms:'米/秒',h:'小时'},
  k:{pop:'总人数',total:'同时疏散总时间',pauls:'Pauls 近似值',bound:'流量下限（手算）',phased:'分阶段：报警楼层',phasedAll:'分阶段：整栋建筑',safety:'到达避难层或出口',queue:'最长队伍',flow:'每部楼梯的流量',refuge:'避难层容量',lifts:'使用电梯的比例',prm:'最后一位行动不便者'},
  val:{pop:'{n} · {a} 平方米/人 · 电梯设计 {l}',queue:'第 {f} 层 {n} 人 · {w} 后清空',flow:'{f} 人/分 · W_e {we} 米',refuge:'第 {f} 层：{d} / {c} 人',over:'超出容量',none:'—',liftsOff:'未使用',lifts:'{p}% · 最后一趟电梯 {t} 到达',alarm:'第 {a}–{b} 层 · {t}',pauls:'{t} · p {p}/米',extra:'超过 15 层为外推',bound:'{t} = ½ 准备时间 + N ÷ (n·W_e·F_s,max)',off:'关',kind:{refuge:'避难层',mech:'设备层',converted:'改作避难层的办公层'}},
  canvas:{scale:'屏幕 1 秒 = 实际 {k} 秒',dot:'1 点 = {n} 人 · 空心：行动不便者',clear:'已清空楼层 {c} / {n}',out:'已撤出 {n}',held:'避难层内 {n}',fire:'起火',refuge:'避难',lift:'电梯',section:'剖面 · 高度按比例，楼板宽度不按比例'},
  status:{simultaneous:'同时疏散：最后一人在 {t} 到达{target}。',phased:'分阶段：报警楼层在 {a} 撤空；所有人在 {t} 到达{target}。',lifts:'结合电梯：最后一人在 {t} 到达{target}。'},
  target:{exit:'出口层',safety:'避难层或出口层'},
  verdict:{base:'{n} 部净宽 {w} 米的楼梯合计每分钟通过 {f} 人；人流在 {t} 前全部到达出口层。',wider:'每部楼梯加宽到 {w2} 米：{t2}。再加一部楼梯：{t3}。',prm:'最慢的是行动不便者，其中最后一人在 {t} 到达。疏散电梯或避难层可以缩短这一时间，加宽楼梯几乎无济于事。',over:'第 {f} 层避难层需要容纳 {d} 人，但只能容纳 {c} 人。',need:'按{code}，此高度需要设置避难层，但目前未开启。',lifts:'电梯在 {t} 才完成：以现有电梯数量，增加乘梯人数只会延长疏散，而不会缩短。'},
  code:{hk:'香港守则（超过 25 层）',gb:'GB 50016（超过 100 米）'},
  chart:{title:'疏散时间与楼梯宽度',note:'本塔楼，{n} 部楼梯，同时疏散至出口层。实线：模拟值。虚线：Pauls 近似值。琥珀色点为当前宽度。',x:'楼梯净宽，米',y:'分'},
  method:'计算方法：每部楼梯被分成一串短单元。单元内的速度和流量遵循 SFPE 水力模型：速度 S = k(1 − 0.266·D)，比流量 F_s = S·D，在 1.88 人/平方米时达到最大。楼梯越拥挤走得越慢、通过的人越少，因此楼梯里形成的队伍会向上蔓延。各楼层从本层的门进入楼梯；当楼梯容纳不下两股人流时，按 Pauls 对汇流的观察，空间由正在下楼的人和新进入的人各占一半。避难层把人从楼梯上接走，直到住满为止。',
  cannot:'不能据此断言：这不是性能化消防评估。没有烟气、可承受条件或火灾发展；除水力流动外没有人员行为模型；没有逆向上楼的消防员；假定首层出口和楼梯平台不构成限制。所有楼层（包括零售层）采用同一人员密度。以当地规范和主管部门为准。',
  src:'来源：SFPE Handbook of Fire Protection Engineering 第 5 版（2016）第 59 章，Gwynne & Rosenbaum，水力模型（速度、比流量、边界层、楼梯类型、行走距离系数）· Pauls，“Movement of People”，SFPE Handbook，t = 0.68 + 0.081·p^0.73 · NFPA 101 · BS 9999:2017 表 1 · IBC 2021 表 1004.5 及第 3008 节 · 香港《建筑物消防安全守则》2011 · GB 50016-2014 第 5.5.23 条 · Boyce, Shields & Silcock，Fire Technology 35（1999）· CIBSE Guide D。各数值须对照现行版本核实。'}
};

/* ── DOM ──────────────────────────────────────────────────────────────── */
const fill=(t,v)=>String(t).replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const ACC='#f59e0b',INK='#e6edf3',DIM='#a2aca9',DARK='#111416';
const ctl={...FIRE_DEFAULTS};
let ui=null,last=null,raf=0,anim=null,chartTimer=0,chartCache={key:'',rows:null};
const NICE=[5,10,15,20,30,45,60,90,120,180,240,300,600];

function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const loc=lang=>lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
function fmt(v,d=0){return Number.isFinite(v)?v.toLocaleString(loc(ui?ui.lang:'en'),{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
export function fmtTime(sec,u={min:'min',s:'s',h:'h'}){
 if(!Number.isFinite(sec))return '—';
 const t=Math.max(0,Math.round(sec)),m=Math.floor(t/60),s=t%60;
 return m>0?m+' '+u.min+' '+String(s).padStart(2,'0')+' '+u.s:s+' '+u.s;
}
const clock=sec=>{const t=Math.max(0,Math.round(sec)),h=Math.floor(t/3600),m=Math.floor(t/60)%60,s=t%60;return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(s).padStart(2,'0')};

function build(host,lang){
 const c=FIRE_TEXT[lang]||FIRE_TEXT.en;
 if(ui&&ui.ro)ui.ro.disconnect();
 host.replaceChildren();
 const root=el('section','fe');
 const head=el('h2','fe-title',c.title);
 const hero=el('canvas','fe-canvas fe-hero');hero.setAttribute('role','img');
 const status=el('p','fe-status');status.setAttribute('aria-live','polite');
 const lede=el('p','fe-prose',c.lede);
 const ctls=el('div','fe-controls');
 const field=(id,label)=>{const w=el('div','fe-field'),top=el('div','fe-fieldhead'),lab=el('label','fe-label',label),out=el('output','fe-out');lab.htmlFor=id;out.htmlFor=id;top.append(lab,out);w.append(top);ctls.append(w);return {w,out,lab}};
 const range=(key,label,min,max,step,note)=>{const id='fe-'+key,f=field(id,label),inp=el('input');inp.type='range';inp.id=id;inp.min=min;inp.max=max;inp.step=step;f.w.append(inp);let n=null;if(note!=null){n=el('p','fe-hint',note);f.w.append(n)}return {...f,inp,note:n}};
 const seg=(key,label,opts,names,note)=>{const id='fe-'+key,f=field(id,label),g=el('div','fe-seg');g.id=id;g.setAttribute('role','group');g.setAttribute('aria-label',label);f.lab.htmlFor='';f.lab.id=id+'-l';
  const bs=opts.map((v,i)=>{const b=el('button',null,names[i]);b.type='button';b.onclick=()=>{ctl[key]=v;refresh(true)};g.append(b);return [v,b]});f.w.append(g);let n=null;if(note!=null){n=el('p','fe-hint',note);f.w.append(n)}return {...f,bs,note:n}};
 const load=range('apP',c.ctl.load,4,20,0.5,c.ctl.loadNote);
 load.inp.oninput=()=>{ctl.apP=+load.inp.value;refresh(true)};
 const liftB=el('button','fe-toggle',c.ctl.loadLift);liftB.type='button';liftB.onclick=()=>{ctl.apP=CORE_METHOD.areaPerPerson;refresh(true)};load.w.append(liftB);
 const stairs=seg('stairs',c.ctl.stairs,[2,3,4],['2','3','4']);
 const width=range('width',c.ctl.width,0.9,2.4,0.05,'');
 width.inp.oninput=()=>{ctl.width=+width.inp.value;refresh(true)};
 const tread=seg('tread',c.ctl.tread,TREAD_KEYS,TREAD_KEYS.map(k=>STAIR_TYPES[k].riser+'/'+STAIR_TYPES[k].tread),'');
 const strat=seg('strategy',c.ctl.strategy,STRATEGIES,STRATEGIES.map(k=>c.strat[k]),'');
 const lift=range('liftShare',c.ctl.liftShare,0,60,5,'');
 lift.inp.oninput=()=>{ctl.liftShare=+lift.inp.value/100;refresh(true)};
 const refuge=seg('refuge',c.ctl.refuge,['off','hk','gb'],['off','hk','gb'].map(k=>c.ref[k]),'');
 const fire=range('fire',c.ctl.fire,1,2,1,null);
 fire.inp.oninput=()=>{const occ=ui.occ||[];ctl.fire=occ[Math.max(0,Math.min(occ.length-1,+fire.inp.value-1))]??null;refresh(true)};
 const pre=range('pre',c.ctl.pre,0,600,15,c.ctl.preNote);
 pre.inp.oninput=()=>{ctl.pre=+pre.inp.value;refresh(true)};
 const prm=range('prmShare',c.ctl.prm,0,10,0.5,null);
 prm.inp.oninput=()=>{ctl.prmShare=+prm.inp.value/100;refresh(true)};
 const prmV=range('prmSpeed',c.ctl.prmSpeed,0.15,0.7,0.01,c.ctl.prmNote);
 prmV.inp.oninput=()=>{ctl.prmSpeed=+prmV.inp.value;refresh(true)};
 const verdict=el('p','fe-verdict');
 const dl=el('dl','fe-facts'),rows={};
 for(const k of ['pop','total','pauls','bound','phased','phasedAll','safety','queue','flow','refuge','lifts','prm']){const d=el('div'),dd=el('dd');d.append(el('dt',null,c.k[k]),dd);dl.append(d);rows[k]=dd}
 const chartT=el('h3','fe-sub',c.chart.title),chart=el('canvas','fe-canvas fe-chart'),chartN=el('p','fe-hint');chart.setAttribute('role','img');
 const method=el('p','fe-prose',c.method),cannot=el('p','fe-prose fe-limits',c.cannot),src=el('p','fe-src',c.src);
 root.append(head,hero,status,lede,ctls,verdict,dl,chartT,chart,chartN,method,cannot,src);
 host.append(root);
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>{size();drawChart();if(!raf)drawStatic()}):null;
 if(ro){ro.observe(hero);ro.observe(chart)}
 ui={host,lang,c,hero,chart,chartN,status,load,stairs,width,tread,strat,lift,refuge,fire,pre,prm,prmV,rows,verdict,ro,occ:[],font:'12px monospace',fontL:'15px monospace',key:''};
 try{const f=getComputedStyle(host).getPropertyValue('--mono').trim();if(f){ui.font='12px '+f;ui.fontL='15px '+f}}catch{}
 size();
}

function size(){
 if(!ui)return;const dpr=Math.min(3,globalThis.devicePixelRatio||1);
 for(const cv of [ui.hero,ui.chart]){const w=Math.max(1,Math.round(cv.clientWidth)),h=Math.max(1,Math.round(cv.clientHeight));if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}cv._w=w;cv._h=h;cv._dpr=dpr}
}
function ctx2d(cv){const x=cv.getContext&&cv.getContext('2d');if(!x)return null;x.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);return x}

const fingerprint=(state,metrics)=>{try{const st=stack(state);return st.length+':'+st[st.length-1].z.toFixed(2)+':'+Math.round(metrics?.rentable||0)+':'+Math.round(metrics?.gross||0)+':'+state.family+':'+state.span+':'+state.taper+':'+state.program}catch{return 'x'}};

function refresh(force){
 if(!ui||!last)return;
 const {state,metrics}=last,c=ui.c,u=c.u;
 const key=fingerprint(state,metrics)+'|'+JSON.stringify(ctl);
 if(!force&&key===ui.key&&ui.r)return;
 let r;try{r=fireRead(state,ctl,metrics)}catch{return}
 ui.r=r;ui.key=key;
 const T=(sec)=>fmtTime(sec,u);
 ui.occ=r.levels.filter(l=>l.i>0&&l.occ).map(l=>l.i);
 // controls
 ui.load.inp.value=r.c.apP;ui.load.out.textContent=fmt(r.c.apP,1)+' '+u.m2p;
 for(const [v,b]of ui.stairs.bs)b.setAttribute('aria-pressed',String(r.c.stairs===v));ui.stairs.out.textContent=String(r.c.stairs);
 ui.width.inp.value=r.c.width;ui.width.out.textContent=fmt(r.c.width,2)+' '+u.m;
 ui.width.note.textContent=fill(c.ctl.widthNote,{we:fmt(r.We,2)});
 for(const [v,b]of ui.tread.bs)b.setAttribute('aria-pressed',String(r.c.tread===v));
 ui.tread.out.textContent=r.riser+'/'+r.treadMM+' '+u.mm;
 ui.tread.note.textContent=fill(c.ctl.treadNote,{k:fmt(r.k,2),f:fmt(r.fsMax,2),c:fmt(r.conv,2)});
 for(const [v,b]of ui.strat.bs)b.setAttribute('aria-pressed',String(r.c.strategy===v));
 ui.strat.out.textContent=c.strat[r.c.strategy];ui.strat.note.textContent=c.stratNote[r.c.strategy];
 const ld=(()=>{try{return liftDesign(state,metrics?.rentable??0)}catch{return {zones:1,carsPerZone:1,carSpeed:CORE_METHOD.carSpeed}}})();
 ui.lift.inp.value=Math.round(r.c.liftShare*100);ui.lift.inp.disabled=r.c.strategy!=='lifts';
 ui.lift.out.textContent=r.c.strategy==='lifts'?fmt(r.c.liftShare*100)+u.pct:c.val.off;
 ui.lift.note.textContent=fill(c.ctl.liftNote,{z:fmt(ld.zones),c:fmt(ld.carsPerZone),v:fmt(ld.carSpeed,1)});
 for(const [v,b]of ui.refuge.bs)b.setAttribute('aria-pressed',String(r.c.refuge===v));
 ui.refuge.out.textContent=c.ref[r.c.refuge];
 ui.refuge.note.textContent=r.c.refuge==='off'?c.refNote.off:c.refNote[r.c.refuge]+' '+(r.refuge.required?c.refNote.snap:c.refNote.notReq);
 const fi=Math.max(0,ui.occ.indexOf(r.fire));
 ui.fire.inp.max=String(Math.max(1,ui.occ.length));ui.fire.inp.value=String(fi+1);
 ui.fire.out.textContent=fill(c.ctl.fireOut,{f:r.fire??'—'});
 ui.pre.inp.value=r.c.pre;ui.pre.out.textContent=T(r.c.pre);
 ui.prm.inp.value=r.c.prmShare*100;ui.prm.out.textContent=fmt(r.c.prmShare*100,1)+u.pct;
 ui.prmV.inp.value=r.c.prmSpeed;ui.prmV.out.textContent=fmt(r.c.prmSpeed,2)+' '+u.ms;
 // readouts
 const R=ui.rows,v=c.val;
 R.pop.textContent=fill(v.pop,{n:fmt(r.pop),a:fmt(r.c.apP,1),l:fmt(r.liftPop)});
 R.total.textContent=T(r.simTotal);
 R.pauls.textContent=fill(v.pauls,{t:T(r.pauls),p:fmt(r.paulsP)})+(r.paulsExtrapolated?' · '+v.extra:'');
 R.bound.textContent=fill(v.bound,{t:T(r.bound)});
 const a0=r.alarm[0],a1=r.alarm[r.alarm.length-1];
 R.phased.textContent=r.alarm.length?fill(v.alarm,{a:a0,b:a1,t:T(r.phasedAlarm)}):v.none;
 R.phasedAll.textContent=T(r.phasedTotal);
 R.safety.textContent=r.refuge.safety!=null?T(r.refuge.safety):v.none;
 R.queue.textContent=r.maxQueue.n>0.5?fill(v.queue,{n:fmt(r.maxQueue.n),f:r.maxQueue.level,w:T(r.maxQueue.wait)}):v.none;
 R.flow.textContent=fill(v.flow,{f:fmt(r.flowPerStair*60),we:fmt(r.We,2)});
 const worst=r.refuge.list.reduce((a,x)=>!a||x.ratio>a.ratio?x:a,null);
 R.refuge.textContent=worst?fill(v.refuge,{f:worst.i,d:fmt(worst.demand),c:fmt(worst.capacity)})+' · '+v.kind[worst.kind]+(worst.ratio>1?' · '+v.over:''):(r.c.refuge==='off'?v.off:c.refNote.notReq);
 R.refuge.classList.toggle('fe-flagtext',!!worst&&worst.ratio>1);
 R.lifts.textContent=r.lifts?fill(v.lifts,{p:fmt(r.lifts.share*100),t:T(r.lifts.time)}):v.liftsOff;
 R.prm.textContent=r.prm.share>0&&r.prm.time>0?T(r.prm.time):v.none;
 // verdict
 const parts=[fill(c.verdict.base,{n:r.stairs,w:fmt(r.width,2),f:fmt(r.flowPerStair*60*r.stairs),t:T(r.simCrowd)}),
  fill(c.verdict.wider,{w2:fmt(r.wider.width,2),t2:T(r.wider.crowd),t3:T(r.more.crowd)})];
 let flag=false;
 if(r.simPrm>r.simCrowd+1&&!(r.lifts&&r.lifts.share>=r.prm.share)){parts.push(fill(c.verdict.prm,{t:T(r.simPrm)}))}
 if(r.lifts&&r.lifts.time>r.lifts.crowd+1){parts.push(fill(c.verdict.lifts,{t:T(r.lifts.time)}));flag=true}
 if(worst&&worst.ratio>1){parts.push(fill(c.verdict.over,{f:worst.i,d:fmt(worst.demand),c:fmt(worst.capacity)}));flag=true}
 if(r.c.refuge==='off'&&(r.refuge.needHK||r.refuge.needGB)){parts.push(fill(c.verdict.need,{code:r.refuge.needHK?c.code.hk:c.code.gb}));flag=true}
 ui.verdict.textContent=parts.join(' ');ui.verdict.classList.toggle('fe-flag',flag);
 const target=r.refuge.safety!=null?c.target.safety:c.target.exit;
 const st=fill(c.status[r.strategy],{target,t:T(r.chosen.total),a:T(r.phasedAlarm)});
 ui.status.textContent=st;
 ui.hero.setAttribute('aria-label',c.canvas.section+'. '+st);
 // animation: restart the clock from zero on any change
 const run=r.chosen,pop=Math.max(1,r.stairPop);
 const per=Math.max(1,Math.ceil(pop/1400));
 const end=Math.max(1,run.total);
 const raw=end/24,k=NICE.reduce((a,b)=>Math.abs(Math.log(b/raw))<Math.abs(Math.log(a/raw))?b:a,NICE[0]);
 anim={r,run,per,end,k,t:0,hold:0,rnd:dots(r.levels.length)};
 scheduleChart(state,metrics);
 if(!raf)drawStatic();
}

function dots(n){const out=[];for(let i=0;i<n;i++){const g=seeded(1009+i*7919),a=new Float32Array(1200);for(let j=0;j<a.length;j++)a[j]=g();out.push(a)}return out}

function scheduleChart(state,metrics){
 const key=fingerprint(state,metrics)+'|'+JSON.stringify({...ctl,width:0,strategy:0,liftShare:0,refuge:0,fire:0});
 ui.chartN.textContent=fill(ui.c.chart.note,{n:ctl.stairs});
 if(chartCache.key===key&&chartCache.rows){drawChart();return}
 if(chartTimer&&typeof clearTimeout==='function')clearTimeout(chartTimer);
 const go=()=>{chartTimer=0;try{chartCache={key,rows:widthCurve(state,ctl,metrics)}}catch{chartCache={key,rows:[]}}drawChart()};
 if(typeof setTimeout==='function')chartTimer=setTimeout(go,140);else go();
}

function drawChart(){
 if(!ui||!ui.r)return;const cv=ui.chart,x=ctx2d(cv);if(!x)return;
 const W=cv._w||cv.clientWidth||300,H=cv._h||cv.clientHeight||200,c=ui.c,rows=chartCache.rows||[];
 x.fillStyle=DARK;x.fillRect(0,0,W,H);x.font=ui.font;x.textBaseline='middle';x.lineWidth=1;
 const L=44,Rm=16,T=26,B=H-30;
 if(!rows.length){x.fillStyle=DIM;x.fillText('…',L,H/2);return}
 const w0=rows[0].width,w1=rows[rows.length-1].width;
 const vals=rows.flatMap(r=>[r.total,r.pauls]).concat(ui.r.simTotal).filter(Number.isFinite);
 const tmax=Math.max(60,...vals)/60,step=[1,2,5,10,15,20,30,60,90,120].find(s=>tmax/s<=5)||180,ymax=Math.ceil(tmax/step)*step;
 const sx=w=>L+(W-L-Rm)*(w-w0)/Math.max(1e-6,w1-w0),sy=m=>B-(B-T)*m/ymax;
 x.strokeStyle='rgba(162,172,169,0.35)';x.fillStyle=DIM;
 for(let m=0;m<=ymax+1e-9;m+=step){const y=Math.round(sy(m))+0.5;x.beginPath();x.moveTo(L,y);x.lineTo(W-Rm,y);x.stroke();x.textAlign='right';x.fillText(String(m),L-6,y)}
 const ticks=rows.filter((_,i)=>i%2===0);
 ticks.forEach((r,i)=>{x.textAlign=i===0?'left':i===ticks.length-1?'right':'center';x.fillText(r.width.toFixed(2),i===0?L:i===ticks.length-1?W-Rm:sx(r.width),B+11)});
 x.textAlign='left';x.fillText(c.chart.y,4,10);x.textAlign='right';x.fillText(c.chart.x,W-Rm,B+24);x.textAlign='left';
 x.strokeStyle=DIM;x.setLineDash([4,4]);x.beginPath();rows.forEach((r,i)=>{const X=sx(r.width),Y=sy(r.pauls/60);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();x.setLineDash([]);
 x.strokeStyle=INK;x.lineWidth=1.5;x.beginPath();rows.forEach((r,i)=>{const X=sx(r.width),Y=sy(r.total/60);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();x.lineWidth=1;
 const cw=Math.min(w1,Math.max(w0,ui.r.width)),X=sx(cw),Y=sy(ui.r.simTotal/60);
 x.strokeStyle=ACC;x.beginPath();x.moveTo(Math.round(X)+0.5,T);x.lineTo(Math.round(X)+0.5,B);x.stroke();
 x.fillStyle=ACC;x.beginPath();x.arc(X,Y,4,0,2*Math.PI);x.fill();
 cv.setAttribute('aria-label',c.chart.title+'. '+rows.map(r=>r.width.toFixed(2)+' '+c.u.m+': '+fmtTime(r.total,c.u)).join('; '));
}

/* The hero: a section, every level at its true height, each stair a shaft. */
function drawHero(t){
 if(!ui||!anim)return;const cv=ui.hero,x=ctx2d(cv);if(!x)return;
 const {r,run,per,rnd,k}=anim,c=ui.c,res=run.res,lv=r.levels,n=lv.length,ns=run.n;
 const W=cv._w||cv.clientWidth||300,H=cv._h||cv.clientHeight||400;
 x.fillStyle=DARK;x.fillRect(0,0,W,H);x.lineWidth=1;x.textBaseline='middle';
 const top=40,bot=H-40,zpx=(bot-top)/Math.max(1,r.height),yOf=z=>bot-z*zpx;
 x.font=ui.font;
 const gx=Math.round(Math.max(36,x.measureText(c.canvas.fire).width,x.measureText(c.canvas.refuge).width)+10),right=W-10,cx=(gx+right)/2,half=(right-gx)/2;
 const wmax=Math.max(1,...lv.map(l=>Math.sqrt(l.plate)));
 const hw=l=>Math.max(18,half*Math.sqrt(l.plate)/wmax);
 const sw=9,gap=5,lifts=run.lifts?run.lifts.zs.length:0,lw=5;
 const coreW=ns*sw+(ns-1)*gap+(lifts?gap+lifts*(lw+2):0),coreL=cx-coreW/2,coreR=cx+coreW/2;
 const snaps=res.snaps,sn=snaps.length?snaps[Math.min(snaps.length-1,Math.floor(t/res.snapDt))]:null;
 const sinks=new Map(run.sink?r.refuge.list.map(q=>[q.i,q]):[]);
 // outline of the tower
 x.strokeStyle=DIM;x.beginPath();
 lv.forEach((l,i)=>{const y0=yOf(l.z),y1=yOf(l.z+l.h),w=hw(l);i?x.lineTo(cx-w,y0):x.moveTo(cx-w,y0);x.lineTo(cx-w,y1)});
 for(let i=n-1;i>=0;i--){const l=lv[i],w=hw(l);x.lineTo(cx+w,yOf(l.z+l.h));x.lineTo(cx+w,yOf(l.z))}
 x.stroke();
 x.beginPath();x.moveTo(8,bot+0.5);x.lineTo(W-8,bot+0.5);x.stroke();
 let cleared=0,occN=0;
 for(let i=1;i<n;i++){
  const l=lv[i],y=Math.round(yOf(l.z))+0.5,w=hw(l),isFire=l.i===r.fire,sink=sinks.get(i);
  if(l.occ){occN++;if(t>=res.clear[i])cleared++}
  const done=l.occ&&t>=res.clear[i];
  x.strokeStyle=isFire?ACC:sink?INK:l.void?DIM:done?'rgba(162,172,169,0.4)':'rgba(230,237,243,0.75)';
  x.lineWidth=isFire?2:1;if(l.void&&!sink)x.setLineDash([3,3]);
  x.beginPath();x.moveTo(cx-w,y);x.lineTo(cx+w,y);x.stroke();x.setLineDash([]);x.lineWidth=1;
  if(r.alarm.includes(l.i)&&run.strategy==='phased'){x.strokeStyle=ACC;x.beginPath();x.moveTo(cx-w-6,y);x.lineTo(cx-w-2,y);x.stroke()}
  // occupants still on the floor: pre-movement and walking
  const band=Math.max(1,yOf(l.z)-yOf(l.z+l.h)-2),pop=l.pop*run.stairShare;
  if(l.occ&&pop>0){
   const qn=sn?sn[n+i]*ns:0;
   // people not yet at the door: total on this floor minus those in queue and gone
   const left=pop*Math.max(0,1-arrivedFrac(l,t,run,r));
   const a=rnd[i],nd=Math.min(500,Math.round(left/per));x.fillStyle=DIM;
   for(let d=0;d<nd;d++){const u=a[(2*d)%a.length],v=a[(2*d+1)%a.length];let X=cx-w+2+u*(2*w-4);if(X>coreL-3&&X<coreR+3)X=X<cx?coreL-4-u*6:coreR+4+u*6;x.fillRect(Math.round(X),Math.round(y-1-v*Math.min(band,10)),2,2)}
   const qd=Math.min(400,Math.round(qn/per));x.fillStyle=INK;
   for(let d=0;d<qd;d++){const side=d%2?1:-1,j=d>>1,X=side<0?coreL-4-j*3:coreR+2+j*3;if(X<cx-w||X>cx+w)break;x.fillRect(X,y-3,2,2)}
  }
  if(sink&&sn){const hd=Math.min(500,Math.round(sn[2*n+i]*ns/per)),a=rnd[i];x.fillStyle=INK;for(let d=0;d<hd;d++){const u=a[(2*d)%a.length],v=a[(2*d+1)%a.length];let X=cx-w+2+u*(2*w-4);if(X>coreL-3&&X<coreR+3)X=X<cx?coreL-4:coreR+4;x.fillRect(Math.round(X),Math.round(y-1-v*Math.min(band,8)),2,2)}}
 }
 // the stair shafts
 for(let j=0;j<ns;j++){
  const X0=coreL+j*(sw+gap);x.strokeStyle=DIM;x.strokeRect(X0+0.5,yOf(r.height)+0.5,sw-1,bot-yOf(r.height));
  if(!sn)continue;x.fillStyle=INK;
  for(let i=1;i<n;i++){
   const N=sn[i]||0,nd=Math.min(300,Math.round(N/per));if(!nd)continue;
   const len=res.segLen[i]||1,D=N/(res.We*len),vS=speedAt(D,res.k),ph=t*vS/len,yT=yOf(lv[i].z),yB=yOf(lv[i-1].z),a=rnd[(i*3+j)%n];
   for(let d=0;d<nd;d++){const f=(a[(2*d+7)%a.length]+ph)%1,X=X0+1.5+a[(2*d+8)%a.length]*(sw-4);x.fillRect(Math.round(X),Math.round(yT+f*(yB-yT)),2,2)}
  }
 }
 // reduced mobility: hollow marks, waiting on their floor, then descending
 if(run.prmDots.length){x.strokeStyle=INK;for(const p of run.prmDots){if(p.count<=0)continue;let y;const yT=yOf(lv[p.i].z),yE=yOf(lv[p.j].z);
  if(t<p.start)y=yT-3;else if(t<p.end)y=yT+(yE-yT)*(t-p.start)/Math.max(1,p.end-p.start);else continue;
  const X=t<p.start?coreL-6:coreL+2;x.strokeRect(Math.round(X)+0.5,Math.round(t<p.start?y-5:y)-1.5,3,3)}}
 // lift cars, one per zone, on the computed round trip
 if(run.lifts)run.lifts.zs.forEach((z,q)=>{const X0=coreL+ns*(sw+gap)+q*(lw+2);x.strokeStyle=DIM;x.strokeRect(X0+0.5,yOf(r.height)+0.5,lw-1,bot-yOf(r.height));
  if(t<r.c.pre||t>z.time||!(z.users>0))return;const ph=((t-r.c.pre)%z.rtt)/z.rtt,f=ph<0.5?ph*2:2-ph*2,y=bot-f*z.h*zpx;x.fillStyle=INK;x.fillRect(X0+1,Math.round(y)-4,lw-2,4)});
 // fire label
 x.font=ui.font;x.textAlign='left';
 x.fillStyle=INK;for(const i of sinks.keys())x.fillText(c.canvas.refuge,4,yOf(lv[i].z)-7);
 if(r.fire!=null){const y=yOf(lv[r.fire].z);x.fillStyle=ACC;x.fillText(c.canvas.fire,4,y-7)}
 // header and footer
 x.font=ui.fontL;x.textAlign='left';x.fillStyle=INK;x.fillText(clock(Math.min(t,anim.end))+' / '+clock(anim.end),8,18);
 x.font=ui.font;x.textAlign='right';x.fillStyle=DIM;
 const outN=sn?sn[3*n]*ns:0;let heldN=0;if(sn)for(const i of sinks.keys())heldN+=sn[2*n+i]*ns;
 x.fillText(fill(c.canvas.clear,{c:cleared,n:occN}),W-8,14);
 x.fillText(fill(c.canvas.out,{n:fmt(outN)})+(sinks.size?' · '+fill(c.canvas.held,{n:fmt(heldN)}):''),W-8,30);
 x.textAlign='left';
 x.fillText(fill(c.canvas.scale,{k:fmt(k)})+' · '+c.strat[r.strategy],8,H-24);
 x.fillText(fill(c.canvas.dot,{n:fmt(per)}),8,H-9);
}

/* Share of a floor's stair users that have reached its door by time t, using
   the same uniform arrival window the model uses (with the phased delay). */
function arrivedFrac(l,t,run,r){
 const a=0.5*r.c.pre,b=1.5*r.c.pre+Math.max(1,Math.sqrt(l.plate)/WALK_SPEED),d=r.alarm.includes(l.i)?0:run.phaseDelay;
 return b>a?Math.min(1,Math.max(0,(t-a-d)/(b-a))):(t>=a+d?1:0);
}

function frame(dt){
 if(!anim)return;
 if(anim.t>=anim.end){anim.hold+=dt;if(anim.hold>1.6){anim.t=0;anim.hold=0}}
 else anim.t=Math.min(anim.end,anim.t+dt*anim.k);
 drawHero(anim.t);
}
function drawStatic(){
 if(!ui||!anim||!ui.hero.isConnected)return;
 try{drawHero(reduced()||!raf?Math.min(anim.end,Math.max(0,anim.r.maxQueue.t||anim.end*0.4)):anim.t)}catch{}
}
function loop(){
 let prev=0;
 const tick=ts=>{if(!ui)return;const dt=prev?Math.min(1/20,(ts-prev)/1000):1/60;prev=ts;try{frame(dt)}catch{}raf=requestAnimationFrame(tick)};
 raf=requestAnimationFrame(tick);
}
function stop(){if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0}

export function renderFireLab({host,state,metrics,lang='en',active=false,changed=null}={}){
 if(!host||!state)return;
 void changed;   // the lab writes no design patch: every control here is a scenario, not the tower
 lang=FIRE_TEXT[lang]?lang:'en';
 last={state,metrics};
 if(!active){stop();return}
 if(typeof document==='undefined')return;
 try{
  if(!ui||ui.host!==host||ui.lang!==lang||!host.contains(ui.hero)){stop();build(host,lang)}
  refresh(false);
  if(reduced()){stop();drawStatic()}
  else if(!raf&&typeof requestAnimationFrame==='function')loop();
 }catch{stop()}
}
