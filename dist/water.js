/* ── the water lab ─────────────────────────────────────────────────────────
   Two questions an owner asks of a tall building in a wet city, answered on the
   model's own level stack rather than on a typical floor.

   SUPPLY — how does water get up? A fixture may not see more than about 80 psi
   (5.5 bar) static, and the highest one needs about 15 psi (1.0 bar) to work
   (ASPE / UPC; the same window the core section uses). The difference, divided
   by ρg, is the height one pressure zone may span — about 46 m — and the number
   of zones is arithmetic. What is NOT arithmetic is how each zone is fed, and
   the three ways people do it differ mainly in where the pumping energy goes:

     A  pump everything to a roof tank and let it come down by gravity. Simple
        and it keeps water flowing in a power cut, but every litre for the
        bottom zone has been lifted to the roof and the surplus head is then
        burnt in pressure-reducing valves or break-pressure tanks.
     B  booster sets per zone straight from the basement. Each zone is lifted
        only as high as it needs, so almost nothing is burnt — but nothing is
        stored either. When the power stops, so does the water.
     C  the supertall answer: transfer pumps lift in stages to tanks on the
        mechanical and refuge levels the tower already has, and each zone is
        fed by gravity from the tank just above it. Less is burnt than in A, and
        the storage survives a power cut as in A.

   Energy is the hydraulic work E = ρ·g·V·H / η. A friction allowance and a
   part-load penalty for variable-speed boosters are stated assumptions, not
   citations, and the figure says so.

   DRAINAGE — rain out as fast as possible. Q = i·A/3600 (BS EN 12056-3), with
   half the area of any wall that drains onto the roof added to the catchment.
   Stack capacity follows the Wyly–Eaton equation at a filling degree of 0.33,
   which is how BS EN 12056-3 sizes rainwater pipes. When the storm brings more
   than the stacks carry, the difference stands on the roof, and the figure
   shows it standing there. */

import {stack,profile,area,evaluate} from './model.js?v=fe3aa014a2';
import {liftDesign,servicesDesign,CORE_SRC} from './core.js?v=bb23192477';
import {sheet,cut,leader as draftLeader,dim as draftDim,rule,txt as draftTxt,ground} from './drafting.js?v=5dc3f3c796';
import {displayText,displayContext,getPreferences,getRateBook,toDisplay,fromDisplay,unitLabel} from './preferences.js?v=e134c381e7';
let displayLang='en',displayKey='';
const shown=value=>displayText(value,displayLang);
const txt=(x,y,text,...args)=>draftTxt(x,y,shown(text),...args);
const leader=(x,y,tx,ty,text,...args)=>draftLeader(x,y,tx,ty,shown(text),...args);
const dim=(x,y,tx,ty,text,...args)=>draftDim(x,y,tx,ty,shown(text),...args);


export const WATER_METHOD={
 rho:1000,g:9.81,
 // 80 psi / 15 psi, the ASPE window servicesDesign() uses, rounded to the bar.
 pmax:5.5,pmin:1.0,
 // BS 6700 Table 1 (carried into BS 8558): 45 L per person per day for an
 // office with a canteen. The residential figure is an indicative default only.
 lpd:{office:45,residential:150},
 hours:24,eta:0.65,
 friction:0.10,      // assumption: pipe friction as 10% of the static lift
 partLoad:0.85,      // assumption: VSD boosters spend the day at part load
 fill:2.5,           // assumption: tank-filling pumps sized at 2.5× mean demand
 tankRise:2.0,       // water surface above the slab it stands on, m
 outageStart:7,outageMax:16,
 pumpsPerBooster:3,pumpsPerStage:2,   // duty/assist/standby; duty/standby
 // BS EN 12056-3 — rainwater
 wallShare:0.5,parapet:1.1,fillDegree:0.33,kb:0.25,
 siphonV:2.5,        // assumption: full-bore design velocity for siphonic tails
 dn:[100,150,200],designIntensity:100,minStacks:2
};
const M=WATER_METHOD;

export const WATER_SRC={
 pressure:'ASPE / UPC 80 psi max, 15 psi residual (5.5 / 1.0 bar); BS EN 806-2 and CIBSE Guide G on pressure zoning',
 demand:'BS 6700 Table 1 / BS 8558: 45 L per person per day, office with canteen',
 energy:'hydraulic work E = ρgVH/η',
 rain:'BS EN 12056-3: Q = i·A/3600, 50% of exposed wall area added, Wyly–Eaton capacity at filling degree 0.33; BS 8490 siphonic',
 drains:CORE_SRC.drains
};

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const num=(v,d)=>Number.isFinite(+v)&&v!==null&&v!==''?+v:d;
export const headOf=bar=>bar*1e5/(M.rho*M.g);          // m of water
export const barOf=m=>m*M.rho*M.g/1e5;
export const pumpKWh=(m3,head,eta)=>M.rho*M.g*m3*head/eta/3.6e6;

/* An illustrative profile, not a measured one: office demand arrives with the
   people and peaks again at lunch; residential peaks morning and evening. */
const PROFILES={
 office:[.5,.5,.5,.5,.5,1,2,6,10,8,7,7,10,8,7,6,6,5,3,2,1.5,1,.8,.6],
 residential:[1,.7,.5,.5,.7,2,5,8,7,5,4,3.5,4,3.5,3,3,3.5,5,7,8,7,5,3,1.5]
};
export function diurnal(use='office'){const p=PROFILES[use]||PROFILES.office,t=p.reduce((a,b)=>a+b,0);return p.map(v=>v/t)}

export function waterInputs(o={}){
 const use=o.use==='residential'?'residential':'office';
 const pmin=clamp(num(o.pmin,M.pmin),0.3,3);
 let pmax=clamp(num(o.pmax,M.pmax),2,8);if(pmax<pmin+0.5)pmax=pmin+0.5;
 const pop=num(o.pop,null);
 return{pmax,pmin,use,lpd:clamp(num(o.lpd,M.lpd[use]),5,400),
  pop:pop!=null&&pop>0?pop:null,hours:clamp(num(o.hours,M.hours),0,72),
  eta:clamp(num(o.eta,M.eta),0.2,0.95),outage:clamp(num(o.outage,0),0,M.outageMax)};
}

/* Every occupied level, its elevation and its plate area (people follow area),
   and the plant levels a tank could stand on. */
export function buildingLevels(s){
 const st=stack(s);
 const H=st.reduce((a,l)=>a+l.h,0)||Math.max(1,s.floors*s.height);
 let floors=st.filter(l=>l.gfa).map(l=>({z:l.z,w:Math.max(1e-6,area(profile(s,l.z/H))*(l.frac==null?1:l.frac))}));
 if(!floors.length)floors=[{z:0,w:1}];
 const voids=st.filter(l=>!l.gfa&&(l.use==='mech'||l.use==='refuge')).map(l=>({z:l.z,h:l.h,use:l.use}));
 return{H,floors,voids,zTop:Math.max(...floors.map(f=>f.z))};
}

/* Zones from the pressure window: no zone may span more than (Pmax−Pmin)/ρg,
   so the top floor of a zone gets Pmin and the bottom floor no more than Pmax. */
export function zonePlan(floors,pmax,pmin){
 const band=headOf(pmax-pmin),zTop=Math.max(0,...floors.map(f=>f.z));
 const N=zTop>0?Math.max(1,Math.ceil(zTop/band-1e-9)):1,hz=zTop/N||1;
 const raw=Array.from({length:N},()=>({zBot:Infinity,zTop:-Infinity,w:0,count:0,first:Infinity,last:-1}));
 const W=floors.reduce((a,f)=>a+f.w,0)||1;
 floors.forEach((f,i)=>{const k=Math.min(N-1,Math.max(0,Math.floor(f.z/hz+1e-9))),z=raw[k];
  z.zBot=Math.min(z.zBot,f.z);z.zTop=Math.max(z.zTop,f.z);z.w+=f.w;z.count++;z.first=Math.min(z.first,i);z.last=i});
 const zones=raw.filter(z=>z.count).map((z,k)=>({...z,k,share:z.w/W,R:z.zTop+headOf(pmin)}));
 return{band,zones};
}

/* The three strategies on the same zones, the same demand and the same pumps. */
export function supplyDesign(s,metrics,input={}){
 const inp=waterInputs(input),L=buildingLevels(s);
 const hmin=headOf(inp.pmin),hmax=headOf(inp.pmax);
 const {band,zones}=zonePlan(L.floors,inp.pmax,inp.pmin);
 const net=Number.isFinite(metrics?.rentable)?metrics.rentable:evaluate(s).rentable;
 const popAuto=liftDesign(s,Math.max(0,net)).population;
 const pop=inp.pop??popAuto,V=pop*inp.lpd/1000,f=1+M.friction;
 const Vk=zones.map(z=>V*z.share);
 const TA=Math.max(L.H+M.tankRise,L.zTop+hmin);
 const finish=(key,zs,tanks,energy,pumps,stageMax)=>{
  const lifted=zs.reduce((a,z,k)=>a+Vk[k]*z.src,0),useful=zs.reduce((a,z,k)=>a+Vk[k]*z.R,0);
  const elevated=tanks.reduce((a,t)=>a+t.vol,0);
  return{key,zones:zs,tanks,energy,pumps,
   head:stageMax*f,pipeBar:barOf(stageMax*f),
   waste:lifted>0?Math.max(0,1-useful/lifted):0,
   elevated,mass:elevated*M.rho/1000,
   massZ:elevated>0?tanks.reduce((a,t)=>a+t.vol*t.z,0)/elevated:null,
   prv:zs.filter(z=>z.prv).length,
   storageH:elevated>0?inp.hours:0};
 };
 // A — everything to the roof, then down.
 const zA=zones.map(z=>({...z,src:TA,prv:TA-z.zBot>hmax+1e-9,tank:0}));
 const A=finish('A',zA,[{z:TA,vol:V*inp.hours/24,zones:zones.map((_,k)=>k),roof:true}],
  pumpKWh(V,TA*f,inp.eta),M.pumpsPerStage,TA);
 // B — each zone boosted to its own top, plus residual. Nothing stored aloft.
 const zB=zones.map(z=>({...z,src:z.R,prv:false,tank:-1}));
 const B=finish('B',zB,[],zones.reduce((a,z,k)=>a+pumpKWh(Vk[k],z.R*f,inp.eta*M.partLoad),0),
  M.pumpsPerBooster*zones.length,Math.max(...zones.map(z=>z.R)));
 // C — tanks on the plant levels the stack already has. Where it has none, the
 // plant floors are assumed at the height each zone needs, and flagged.
 let cands=L.voids.map(v=>({z:v.z+M.tankRise,use:v.use})).filter(c=>c.z<TA);
 const assumed=!cands.length&&zones.length>1;
 if(assumed)cands=zones.slice(0,-1).map(z=>({z:z.R,assumed:true}));
 cands.push({z:TA,roof:true});cands.sort((a,b)=>a.z-b.z);
 const used=[],zC=zones.map(z=>{const c=cands.find(c=>c.z>=z.R-1e-9)||cands[cands.length-1];
  let j=used.indexOf(c);if(j<0){used.push(c);j=used.length-1}
  return{...z,src:c.z,prv:c.z-z.zBot>hmax+1e-9,tank:c}});
 used.sort((a,b)=>a.z-b.z);
 const tanksC=used.map(c=>{const ks=zC.map((z,k)=>z.tank===c?k:-1).filter(k=>k>=0);
  return{z:c.z,vol:ks.reduce((a,k)=>a+Vk[k],0)*inp.hours/24,zones:ks,roof:!!c.roof,assumed:!!c.assumed,use:c.use}});
 zC.forEach(z=>{z.tank=used.indexOf(z.tank)});
 let prev=0,stageMax=0;for(const t of tanksC){stageMax=Math.max(stageMax,t.z-prev);prev=t.z}
 const C=finish('C',zC,tanksC,zC.reduce((a,z,k)=>a+pumpKWh(Vk[k],z.src*f,inp.eta),0),
  M.pumpsPerStage*tanksC.length,stageMax);
 C.assumed=assumed;
 return{inp,H:L.H,zTop:L.zTop,floors:L.floors,voids:L.voids,band,hmin,hmax,zones,Vk,pop,popAuto,V,TA,A,B,C};
}

/* Pressure at elevation z in zone `zone` — delivered, and the head the source
   would put there if nothing reduced it. */
export function deliveredBar(d,zone,z){return zone.prv?d.inp.pmin+barOf(zone.zTop-z):barOf(zone.src-z)}
export function sourceBar(zone,z){return barOf(zone.src-z)}

/* A simulated day, five-minute steps, run twice so the tanks start the
   recorded day where the previous one left them. The outage, if any, starts at
   07:00 on the recorded day: pumps stop; gravity storage keeps serving. */
export function simulateDay(d,input={}){
 const inp=waterInputs({...d.inp,...input}),prof=diurnal(inp.use);
 const steps=288,dt=24/steps,start=M.outageStart,out=inp.outage;
 const series={};
 for(const key of ['A','B','C']){
  const st=d[key],nz=st.zones.length;
  const tanks=st.tanks.map(t=>({cap:t.vol,lvl:t.vol,on:false,zones:t.zones,
   rate:M.fill*t.zones.reduce((a,k)=>a+d.Vk[k],0)/24*dt,lv:new Float32Array(steps),pump:new Uint8Array(steps)}));
  const served=Array.from({length:nz},()=>new Float32Array(steps));
  const boost=new Uint8Array(steps);
  let unserved=0,firstDry=-1;
  for(let day=0;day<2;day++)for(let i=0;i<steps;i++){
   const h=i*dt,power=!(day===1&&out>0&&h>=start-1e-9&&h<start+out-1e-9);
   const dem=d.Vk.map(v=>v*prof[Math.floor(h)]*dt);
   const sv=new Array(nz).fill(power?1:0);
   if(key==='B'){if(day)boost[i]=power?1:0}
   else for(const t of tanks){
    const want=t.zones.reduce((a,k)=>a+dem[k],0);let frac;
    if(t.cap<=1e-9){frac=power?1:0;if(day)t.pump[i]=power&&want>0?1:0}
    else{
     if(t.lvl<0.6*t.cap)t.on=true;if(t.lvl>=t.cap-1e-9)t.on=false;
     const run=t.on&&power;if(run)t.lvl=Math.min(t.cap,t.lvl+t.rate);
     const take=Math.min(t.lvl,want);t.lvl-=take;
     frac=want>0?take/want:(t.lvl>0?1:0);
     if(day){t.lv[i]=t.lvl/t.cap;t.pump[i]=run?1:0}
    }
    for(const k of t.zones)sv[k]=frac;
   }
   if(day){for(let k=0;k<nz;k++){served[k][i]=sv[k];unserved+=dem[k]*(1-sv[k]);
     if(firstDry<0&&!power&&sv[k]<0.999)firstDry=i}}
  }
  const kept=out>0?(firstDry<0?out:Math.max(0,firstDry*dt-start)):null;
  series[key]={tanks:tanks.map(t=>({lv:t.lv,pump:t.pump})),served,boost,unserved,kept};
 }
 return{steps,dt,start,outage:out,prof,series};
}

/* ── drainage ─────────────────────────────────────────────────────────── */
export const rainFlow=(i,A)=>i*A/3600;                 // L/s, i in mm/h, A in m²
export function stackCapacity(dn,mode='gravity'){
 if(mode==='siphonic')return Math.PI/4*(dn/1000)**2*M.siphonV*1000;
 // Wyly–Eaton, as BS EN 12056-3 gives it for vertical rainwater pipes.
 return 2.5e-4*M.kb**(-1/6)*dn**(8/3)*M.fillDegree**(5/3);
}
const extent=p=>{const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);return Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))};
export function drainageInputs(o={}){
 const dn=M.dn.includes(+o.dn)?+o.dn:150;
 const n=num(o.n,null);
 return{i:clamp(num(o.i,M.designIntensity),5,300),mode:o.mode==='siphonic'?'siphonic':'gravity',
  dn,n:n!=null&&n>=1?Math.round(n):null,dur:clamp(num(o.dur,60),1,240)};
}
export function drainageDesign(s,input={}){
 const inp=drainageInputs(input);
 const top=profile(s,1),base=profile(s,0);
 const roof=area(top),wTop=extent(top),wBase=extent(base);
 const H=stack(s).reduce((a,l)=>a+l.h,0)||s.floors*s.height;
 const wall=M.wallShare*M.parapet*wTop,catchment=roof+wall;
 const Q=rainFlow(inp.i,catchment),cap=stackCapacity(inp.dn,inp.mode);
 const need=Math.max(1,Math.ceil(Q/cap-1e-9));
 // Never fewer than two: one blocked outlet must not flood the roof (assumption).
 const design=Math.max(M.minStacks,Math.ceil(rainFlow(M.designIntensity,catchment)/cap-1e-9));
 const n=inp.n??design,capacity=n*cap,excess=Math.max(0,Q-capacity);
 // L/m² is mm: what the stacks cannot take stands on the roof.
 const pondRate=excess/roof*60,pond=pondRate*inp.dur;
 const facade=M.wallShare*H*(wTop+wBase)/2,Qf=rainFlow(inp.i,facade);
 return{inp,roof,wall,catchment,Q,cap,need,design,n,auto:inp.n==null,capacity,excess,
  pondRate,pond,pondKPa:pond*M.g/1000,facade,Qf,
  detention:(Q+Qf)*inp.dur*60/1000,H,waste:servicesDesign(s)};
}

/* The best strategy for THIS tower: the least pumping energy among those that
   keep water flowing for the whole outage the user set. */
export function supplyVerdict(d,sim){
 const keys=['A','B','C'],need=sim&&sim.outage>0?sim.outage:0;
 let ok=keys.filter(k=>!need||sim.series[k].kept>=need-1e-6);
 if(!ok.length){const most=Math.max(...keys.map(k=>sim.series[k].kept));ok=keys.filter(k=>sim.series[k].kept>=most-1e-6)}
 const best=ok.reduce((a,k)=>d[k].energy<d[a].energy?k:a,ok[0]);
 const pct=d.A.energy>0?(1-d[best].energy/d.A.energy)*100:0;
 return{best,pct,energy:d[best].energy,kept:need?sim.series[best].kept:null,storage:d[best].storageH,need};
}

/* ── words ─────────────────────────────────────────────────────────────── */
export const WATER_TEXT={
 en:{
  viewSupply:'Supply',viewDrain:'Drainage',view:'View',strategy:'Strategy',play:'Play',pause:'Pause',
  sA:'A · roof tank, gravity down',sB:'B · boosters per zone',sC:'C · hybrid, tanks on plant floors',
  time:'Time of day',stormTime:'Storm elapsed',
  pmax:'Max static pressure at any outlet',pmin:'Min residual at the highest outlet',use:'Occupancy',
  office:'Office',residential:'Residential',lpd:'Water per person per day',pop:'Population',
  popAuto:'auto from the lift design',hours:'Elevated storage',eta:'Pump efficiency η',
  outage:'Power outage from 07:00',gauge:'Pressure gauge at floor',
  intensity:'Rainfall intensity',mode:'Roof drainage',gravity:'Gravity',siphonic:'Siphonic',
  dn:'Stack size',stacks:'Rainwater stacks provided',auto:'auto',storm:'Storm duration',
  rZones:'Pressure zones',rDemand:'Daily demand',rHead:'Highest pump head',rEnergy:'Pumping energy',
  rWaste:'Lifted head not needed (burnt in PRVs or at the tap)',rMass:'Water carried aloft',
  rMassZ:'Height of that water (centroid)',rTanks:'Elevated tanks',rPumps:'Pumps incl. standby',
  rPipe:'Highest pipe pressure',rOutage:'Water kept in the outage',rStore:'Gravity storage at mean demand',
  dRoof:'Roof plate',dWall:'Half the parapet wall',dQ:'Roof flow',dCap:'Capacity per stack',
  dNeed:'Stacks needed at this intensity',dPond:'Ponding by the end of the storm',
  dFacade:'Façade rain to the podium (upper bound)',dDet:'Detention for the whole storm',
  dWaste:'Wastewater stacks',dBreak:'Velocity breakers',dVent:'Vent stacks',
  zonesV:'{n} zones of ≤ {b} m',demandV:'{p} people × {l} L = {v} m³',noOutage:'no outage set',
  keptV:'{k} of {o} h',none:'none',
  cBreak:'break tank',cRoof:'roof',cOutage:'outage',cDry:'dry',cSource:'head before PRV',
  cBar:'bar',cDetail:'roof, enlarged',cPond:'ponding',cNoPond:'no ponding',cInflow:'inflow',
  cCapacity:'capacity',cDetention:'detention',cFacade:'façade',cWW:'WW',cRW:'RW',cBrk:'breakers',cAssumed:'assumed plant floor',
  rec:'At {h} m this tower needs {n} pressure zones. {best} pumps the least that still meets the brief: {e} kWh a day, {pct} than roof downfeed A. {keep}',
  pctLess:'{x}% less',pctMore:'{x}% more',pctSame:'the same',
  keepNone:'It stores nothing aloft — when the power stops, so does the water.',
  keepStore:'It holds {s} h of gravity storage at mean demand.',
  keepOutage:'It keeps water flowing for {k} of the {o} h outage.',
  recDrain:'{q} L/s comes off the roof at {i} mm/h: {need} × DN{dn} {mode} stacks carry it.',
  recPondNo:'With {n} provided nothing ponds.',
  recPond:'With {n} provided, {mm} mm stands on the roof after {d} min — add stacks or an overflow.',
  cannot:'Cannot claim: no hydraulic network model, no fixture-unit simulation of peak flow, no local code check. Pump energy is hydraulic work with stated allowances, not a selection.',
  assumes:'Assumes: friction 10% of lift; boosters at 0.85 of rated efficiency through the day; filling pumps at 2.5× mean demand; at least two rainwater stacks; outlets at floor level; the demand profile is illustrative, not measured.',
  sources:'Sources',
  note:'Every litre for a low floor that goes to the roof first is lifted twice: once by the pump, once as head a valve must destroy. Drag the outage and watch which riser keeps running.',
  noteDrain:'Rain on the roof is Q = i·A/3600. A stack carries a fixed flow; what the stacks cannot take stands on the roof until the storm passes, and a ponded roof is a structural load. Wastewater runs in its own stacks, with velocity breakers every ten floors.',
  aria:'Water lab, live section',
  /* The method sheet's own words. Flat keys, so the dict stays a flat dict. */
  m1:'The tower in section, cut into pressure zones: one zone spans (Pmax − Pmin)/ρg. The three ways of feeding those zones side by side: E = ρgVH/η, split into the head the tap needs and the head burnt in a valve.',
  mAria:'Method drawing: the tower in section, cut into pressure zones, with the roof tank, the tanks on the plant floors and the booster at each zone top marked, and the pumping energy of the three strategies drawn as three bars, each split into the head the tap needs and the head burnt in a valve.',
  mTitleSup:'Supply',mTitleBar:'Pumping energy, a day',
  mLabelA:'A · roof tank',mLabelB:'B · zone boosters',mLabelC:'C · plant-floor tanks',
  mLabelAC:'A and C · the roof tank',
  mPump:'pump',
  mWindow:'{a} → {b} bar',
  mStoreAC:'A and C hold {s} h of water aloft',mStoreNone:'no strategy holds water aloft',mStoreB:'B holds no water aloft',
  mBarVal:'{e} kWh/d',mBarBurnt:'{p}% burnt',
  mKeyNeed:'head the tap needs',mKeyBurnt:'head burnt in a valve',
  mFormula:'energy E = ρgVH/η'
 },
 th:{
  viewSupply:'ระบบจ่ายน้ำ',viewDrain:'ระบบระบายน้ำ',view:'มุมมอง',strategy:'แนวทาง',play:'เล่น',pause:'หยุด',
  sA:'A · ถังบนหลังคา จ่ายลงด้วยแรงโน้มถ่วง',sB:'B · ปั๊มเพิ่มแรงดันแยกทุกโซน',sC:'C · แบบผสม ถังบนชั้นเครื่องกล',
  time:'เวลาของวัน',stormTime:'เวลาที่ฝนตกไปแล้ว',
  pmax:'แรงดันสถิตสูงสุดที่จุดใช้น้ำ',pmin:'แรงดันคงเหลือขั้นต่ำที่จุดใช้น้ำสูงสุด',use:'ประเภทการใช้งาน',
  office:'สำนักงาน',residential:'ที่พักอาศัย',lpd:'ปริมาณน้ำต่อคนต่อวัน',pop:'จำนวนผู้ใช้อาคาร',
  popAuto:'ค่าอัตโนมัติจากการออกแบบลิฟต์',hours:'ปริมาณน้ำสำรองบนที่สูง',eta:'ประสิทธิภาพปั๊ม η',
  outage:'ไฟฟ้าดับตั้งแต่ 07:00',gauge:'มาตรวัดแรงดันที่ชั้น',
  intensity:'ความเข้มฝน',mode:'การระบายน้ำหลังคา',gravity:'แรงโน้มถ่วง',siphonic:'ไซฟอนิก',
  dn:'ขนาดท่อดิ่ง',stacks:'จำนวนท่อน้ำฝนที่ติดตั้ง',auto:'อัตโนมัติ',storm:'ระยะเวลาพายุฝน',
  rZones:'โซนแรงดัน',rDemand:'ความต้องการน้ำต่อวัน',rHead:'เฮดปั๊มสูงสุด',rEnergy:'พลังงานสูบน้ำ',
  rWaste:'เฮดที่ยกขึ้นเกินความจำเป็น (สูญเสียที่วาล์วลดแรงดันหรือที่ก๊อก)',rMass:'น้ำหนักน้ำที่โครงสร้างรับบนที่สูง',
  rMassZ:'ความสูงศูนย์ถ่วงของน้ำนั้น',rTanks:'ถังเก็บน้ำบนที่สูง',rPumps:'จำนวนปั๊มรวมสำรอง',
  rPipe:'แรงดันสูงสุดในท่อ',rOutage:'น้ำที่ยังจ่ายได้ระหว่างไฟดับ',rStore:'น้ำสำรองแบบแรงโน้มถ่วงที่อัตราใช้เฉลี่ย',
  dRoof:'พื้นที่หลังคา',dWall:'ครึ่งหนึ่งของผนังกันตก',dQ:'อัตราการไหลจากหลังคา',dCap:'ความสามารถต่อท่อ',
  dNeed:'จำนวนท่อที่ต้องใช้ที่ความเข้มฝนนี้',dPond:'น้ำขังบนหลังคาเมื่อสิ้นสุดพายุ',
  dFacade:'น้ำฝนจากผนังอาคารลงโพเดียม (ค่าสูงสุด)',dDet:'ปริมาตรหน่วงน้ำตลอดพายุ',
  dWaste:'ท่อดิ่งน้ำเสีย',dBreak:'ข้อลดความเร็ว',dVent:'ท่ออากาศ',
  zonesV:'{n} โซน สูงไม่เกิน {b} ม.',demandV:'{p} คน × {l} ลิตร = {v} ลบ.ม.',noOutage:'ยังไม่ได้กำหนดไฟดับ',
  keptV:'{k} จาก {o} ชม.',none:'ไม่มี',
  cBreak:'ถังพักน้ำ',cRoof:'หลังคา',cOutage:'ไฟดับ',cDry:'น้ำไม่ไหล',cSource:'เฮดก่อนวาล์วลดแรงดัน',
  cBar:'บาร์',cDetail:'หลังคา ขยาย',cPond:'น้ำขัง',cNoPond:'ไม่มีน้ำขัง',cInflow:'น้ำเข้า',
  cCapacity:'ความสามารถ',cDetention:'ถังหน่วงน้ำ',cFacade:'ผนังอาคาร',cWW:'WW',cRW:'RW',cBrk:'ข้อลดความเร็ว',cAssumed:'ชั้นเครื่องกลที่สมมติ',
  rec:'ที่ความสูง {h} ม. อาคารนี้ต้องแบ่ง {n} โซนแรงดัน {best} ใช้พลังงานสูบน้ำน้อยที่สุดในบรรดาแนวทางที่ยังตอบโจทย์ได้ คือ {e} kWh ต่อวัน {pct}เมื่อเทียบกับถังบนหลังคาแบบ A {keep}',
  pctLess:'น้อยกว่า {x}% ',pctMore:'มากกว่า {x}% ',pctSame:'เท่ากัน ',
  keepNone:'แนวทางนี้ไม่มีน้ำสำรองบนที่สูง เมื่อไฟดับ น้ำก็หยุดไหลทันที',
  keepStore:'มีน้ำสำรองแบบแรงโน้มถ่วง {s} ชม. ที่อัตราใช้เฉลี่ย',
  keepOutage:'ยังจ่ายน้ำได้ {k} จาก {o} ชม. ของช่วงไฟดับ',
  recDrain:'ที่ความเข้มฝน {i} มม./ชม. น้ำไหลจากหลังคา {q} ลิตร/วินาที ต้องใช้ท่อ{mode} DN{dn} จำนวน {need} ท่อ',
  recPondNo:'เมื่อติดตั้ง {n} ท่อ จะไม่มีน้ำขัง',
  recPond:'เมื่อติดตั้ง {n} ท่อ จะมีน้ำขังบนหลังคา {mm} มม. หลังฝนตก {d} นาที ควรเพิ่มท่อหรือทางน้ำล้น',
  cannot:'ข้อจำกัด: ไม่ใช่แบบจำลองโครงข่ายชลศาสตร์ ไม่ได้จำลองอัตราการไหลสูงสุดด้วยหน่วยสุขภัณฑ์ และไม่ได้ตรวจสอบตามกฎหมายท้องถิ่น พลังงานปั๊มเป็นงานทางชลศาสตร์ตามสมมติฐานที่ระบุ ไม่ใช่การเลือกปั๊มจริง',
  assumes:'สมมติฐาน: แรงเสียดทาน 10% ของความสูงยก ปั๊มเพิ่มแรงดันทำงานที่ 0.85 ของประสิทธิภาพพิกัดตลอดวัน ปั๊มเติมถังขนาด 2.5 เท่าของอัตราใช้เฉลี่ย ท่อน้ำฝนอย่างน้อยสองท่อ จุดใช้น้ำอยู่ที่ระดับพื้น และรูปแบบการใช้น้ำรายชั่วโมงเป็นเพียงตัวอย่าง ไม่ใช่ข้อมูลตรวจวัด',
  sources:'แหล่งอ้างอิง',
  note:'น้ำทุกลิตรสำหรับชั้นล่างที่ต้องขึ้นถึงหลังคาก่อนถูกยกสองครั้ง ครั้งแรกโดยปั๊ม อีกครั้งในรูปเฮดที่วาล์วต้องทำลายทิ้ง ลองเลื่อนช่วงไฟดับแล้วดูว่าท่อใดยังมีน้ำไหล',
  noteDrain:'น้ำฝนบนหลังคาคือ Q = i·A/3600 ท่อดิ่งแต่ละท่อรับน้ำได้จำกัด ส่วนที่รับไม่ทันจะขังบนหลังคาจนพายุผ่านไป และน้ำขังคือน้ำหนักที่โครงสร้างต้องรับ น้ำเสียแยกท่อดิ่งของตัวเอง และอาคารสูงต้องมีข้อลดความเร็วทุกสิบชั้น',
  aria:'ห้องทดลองระบบน้ำ รูปตัดเคลื่อนไหว',
  m1:'ภาคตัดอาคารที่ถูกแบ่งเป็นโซนแรงดัน โซนหนึ่งสูงไม่เกิน (Pmax − Pmin)/ρg ภาพเทียบสามแนวทางจ่ายน้ำ E = ρgVH/η แยกเป็นเฮดที่จุดใช้น้ำต้องการกับเฮดที่วาล์วทำลายทิ้ง',
  mAria:'ภาพวิธีคำนวณ: ภาคตัดอาคารที่แบ่งเป็นโซนแรงดัน พร้อมถังบนหลังคา ถังบนชั้นเครื่องกล และปั๊มเพิ่มแรงดันที่ยอดโซน พลังงานสูบน้ำของสามแนวทางวาดเป็นแท่งสามแท่ง แต่ละแท่งแบ่งเป็นเฮดที่จุดใช้น้ำต้องการกับเฮดที่วาล์วทำลายทิ้ง',
  mTitleSup:'ระบบจ่ายน้ำ',mTitleBar:'พลังงานสูบน้ำต่อวัน',
  mLabelA:'A · ถังบนหลังคา',mLabelB:'B · ปั๊มแยกโซน',mLabelC:'C · ถังชั้นเครื่องกล',
  mLabelAC:'A และ C · ถังบนหลังคา',
  mPump:'ปั๊ม',
  mWindow:'{a} → {b} บาร์',
  mStoreAC:'A และ C เก็บน้ำบนที่สูง {s} ชม.',mStoreNone:'ไม่มีแนวทางใดเก็บน้ำไว้บนที่สูง',mStoreB:'B ไม่เก็บน้ำไว้บนที่สูง',
  mBarVal:'{e} kWh ต่อวัน',mBarBurnt:'{p}% สูญเสียในวาล์ว',
  mKeyNeed:'เฮดที่จุดใช้น้ำต้องการ',mKeyBurnt:'เฮดที่วาล์วทำลายทิ้ง',
  mFormula:'พลังงาน E = ρgVH/η'
 },
 zh:{
  viewSupply:'给水',viewDrain:'排水',view:'视图',strategy:'方案',play:'播放',pause:'暂停',
  sA:'A · 屋顶水箱，重力下行',sB:'B · 分区变频加压',sC:'C · 混合，设备层中间水箱',
  time:'时刻',stormTime:'降雨已持续',
  pmax:'任一用水点最大静压',pmin:'最高用水点最小剩余压力',use:'使用类型',
  office:'办公',residential:'住宅',lpd:'人均日用水量',pop:'人数',
  popAuto:'自动取自电梯设计',hours:'高位储水时长',eta:'水泵效率 η',
  outage:'停电（自 07:00 起）',gauge:'压力表所在楼层',
  intensity:'降雨强度',mode:'屋面排水方式',gravity:'重力流',siphonic:'虹吸',
  dn:'立管管径',stacks:'雨水立管数量',auto:'自动',storm:'降雨历时',
  rZones:'压力分区',rDemand:'日用水量',rHead:'最高水泵扬程',rEnergy:'水泵能耗',
  rWaste:'多余扬程（消耗于减压阀或龙头）',rMass:'结构承载的高位水量',
  rMassZ:'该水量的重心高度',rTanks:'高位水箱',rPumps:'水泵数量（含备用）',
  rPipe:'管道最高压力',rOutage:'停电期间可供水',rStore:'按平均用水量的重力储水',
  dRoof:'屋面面积',dWall:'女儿墙面积的一半',dQ:'屋面流量',dCap:'单根立管排水能力',
  dNeed:'此强度所需立管',dPond:'降雨结束时屋面积水',
  dFacade:'立面雨水流至裙房（上限）',dDet:'整场降雨的调蓄容积',
  dWaste:'污水立管',dBreak:'消能弯',dVent:'通气立管',
  zonesV:'{n} 个分区，每区 ≤ {b} 米',demandV:'{p} 人 × {l} 升 = {v} 立方米',noOutage:'未设定停电',
  keptV:'{k} / {o} 小时',none:'无',
  cBreak:'断流水箱',cRoof:'屋顶',cOutage:'停电',cDry:'断水',cSource:'减压前水头',
  cBar:'巴',cDetail:'屋面放大',cPond:'积水',cNoPond:'无积水',cInflow:'来水',
  cCapacity:'排水能力',cDetention:'调蓄池',cFacade:'立面',cWW:'WW',cRW:'RW',cBrk:'消能弯',cAssumed:'假定设备层',
  rec:'此塔楼高 {h} 米，需要 {n} 个压力分区。在满足要求的方案中，{best} 水泵能耗最低：每天 {e} kWh，比屋顶水箱下行方案 A {pct}。{keep}',
  pctLess:'少 {x}%',pctMore:'多 {x}%',pctSame:'持平',
  keepNone:'它在高处不储水——停电即停水。',
  keepStore:'按平均用水量可维持 {s} 小时重力供水。',
  keepOutage:'在 {o} 小时的停电中可持续供水 {k} 小时。',
  recDrain:'降雨强度 {i} mm/h 时屋面来水 {q} L/s，需要 {need} 根 DN{dn} {mode}立管。',
  recPondNo:'按已设 {n} 根，屋面不积水。',
  recPond:'按已设 {n} 根，降雨 {d} 分钟后屋面积水 {mm} mm——应增加立管或设溢流口。',
  cannot:'不能声称：未建立水力管网模型，未按卫生器具当量模拟峰值流量，未核对当地规范。水泵能耗为附带假设的水力功，并非选型结果。',
  assumes:'假设：摩阻按提升高度的 10%；加压泵全天按额定效率的 0.85 运行；补水泵按平均用水量的 2.5 倍；雨水立管至少两根；用水点位于楼面标高；逐时用水曲线仅为示意，并非实测。',
  sources:'来源',
  note:'低层用水若先送上屋顶，就等于被提升了两次——一次靠水泵，一次化作阀门必须消耗掉的水头。拖动停电时长，看看哪根立管还在流。',
  noteDrain:'屋面雨水 Q = i·A/3600。每根立管的排水能力是固定的；排不走的水会留在屋面上，直到雨停，而屋面积水就是结构荷载。污水走独立立管，超高层每十层设一组消能弯。',
  aria:'水系统实验室，动态剖面',
  m1:'塔楼剖面按压力分区：每区不超过 (Pmax − Pmin)/ρg。右侧并列三种供水方式：E = ρgVH/η，分为龙头所需的扬程与阀门消耗的扬程。',
  mAria:'方法图：塔楼剖面按压力分区，标出屋顶水箱、设备层水箱与各区顶部的加压泵；三套方案的泵送能耗各画成一条横条，分为龙头所需的扬程与阀门消耗的扬程。',
  mTitleSup:'给水',mTitleBar:'每日泵送能耗',
  mLabelA:'A · 屋顶水箱',mLabelB:'B · 分区加压泵',mLabelC:'C · 设备层水箱',
  mLabelAC:'A 与 C · 屋顶水箱',
  mPump:'水泵',
  mWindow:'{a} → {b} 巴',
  mStoreAC:'A 与 C 高位储水 {s} 小时',mStoreNone:'各方案均不在高位储水',mStoreB:'B 高位不储水',
  mBarVal:'{e} 千瓦时/天',mBarBurnt:'{p}% 耗于减压阀',
  mKeyNeed:'龙头所需的扬程',mKeyBurnt:'阀门消耗的扬程',
  mFormula:'能耗 E = ρgVH/η'
 }
};
const fill=(t,o)=>t.replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');

export function supplySentence(d,sim,lang='en'){
 const T=WATER_TEXT[lang]||WATER_TEXT.en,v=supplyVerdict(d,sim),nf=nfmt(lang);
 const p=Math.round(v.pct);
 const pct=fill(Math.abs(p)<1?T.pctSame:p>0?T.pctLess:T.pctMore,{x:nf(Math.abs(p))});
 const keep=v.need?fill(T.keepOutage,{k:nf(v.kept,1),o:nf(v.need,1)}):d[v.best].storageH>0?fill(T.keepStore,{s:nf(d[v.best].storageH)}):T.keepNone;
 return fill(T.rec,{h:nf(d.H),n:d.zones.length,best:T['s'+v.best],e:nf(v.energy),pct,keep});
}
export function drainSentence(r,lang='en'){
 const T=WATER_TEXT[lang]||WATER_TEXT.en,nf=nfmt(lang);
 return fill(T.recDrain,{q:nf(r.Q,1),i:nf(r.inp.i),need:r.need,dn:r.inp.dn,mode:lang==='en'?T[r.inp.mode].toLowerCase():T[r.inp.mode]})+' '+
  (r.excess>0?fill(T.recPond,{n:r.n,mm:nf(r.pond),d:nf(r.inp.dur)}):fill(T.recPondNo,{n:r.n}));
}
function nfmt(lang){return(v,dec=0)=>Number.isFinite(v)?(+v).toLocaleString(lang==='zh'?'zh-CN':lang==='th'?'th-TH':'en-GB',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'—'}

/* ── the method, drawn ──────────────────────────────────────────────────────
   The water lab's method was a paragraph: how the pressure window cuts the
   tower into zones, and what becomes of the head the pumps put in before it
   reaches the tap. A paragraph cannot show a PROPORTION. The sheet can: the
   section says where each strategy takes its water from, and the three bars
   say how much of the head each one destroys in a valve.

   Every NUMBER on the sheet is a number the lab has already computed. The
   payload comes from waterMethodPayload(), which is built from the SAME
   supplyDesign() call that produces the numbers the lab reports, so the
   drawing and the arithmetic cannot drift apart. Nothing here is drawn from
   a constant.

   Every WORD on the sheet comes out of WATER_TEXT[lang]. There is no English
   left lying about on the Thai sheet or the Chinese one. */
const MW=490,MH=215;

/* The payload is the lab's own design and nothing else. If a quantity the
   sheet needs is not in it, the fix is to carry it here — never to invent it
   in the drawing. */
export function waterMethodPayload(d){
 if(!d||!d.inp||!Array.isArray(d.zones)||!d.zones.length)return null;
 const strats=['A','B','C'].map(k=>{
  const s=d[k];if(!s)return null;
  return {key:k,energy:s.energy,waste:s.waste,head:s.head,
   tanks:(s.tanks||[]).length,pumps:s.pumps,storage:s.storageH};
 }).filter(Boolean);
 if(!strats.length)return null;
 return {H:d.H,zTop:d.zTop,band:d.band,nZones:d.zones.length,
  zones:d.zones.map(z=>({zBot:z.zBot,zTop:z.zTop,count:z.count})),
  pmax:d.inp.pmax,pmin:d.inp.pmin,V:d.V,pop:d.pop,lpd:d.inp.lpd,
  tanks:(d.C&&d.C.tanks||[]).map(t=>({z:t.z,roof:!!t.roof})),
  strats,maxE:Math.max(...strats.map(s=>s.energy))||1};
}

export function waterMethodSVG(p,{lang='en'}={}){
 displayLang=lang;
 const c=WATER_TEXT[lang]||WATER_TEXT.en;
 if(!p)return sheet('',MW,MH,'');
 const nf=nfmt(lang);
 const f1=v=>Number.isFinite(v)?v.toFixed(1):'—';
 const GY=150,TY=48,k=(GY-TY)/Math.max(1,p.H),yOf=z=>GY-z*k;
 const labelOf=s=>s.key==='A'?c.mLabelA:s.key==='B'?c.mLabelB:c.mLabelC;
 const A=p.strats.find(s=>s.key==='A');
 let g='';
 /* the ground, and the tower cut through it */
 g+=ground(12,GY,100);
 g+=cut(`M46 ${TY} H54 V${GY} H46 Z`,'conc');
 g+=cut(`M88 ${TY} H96 V${GY} H88 Z`,'conc');
 g+=cut(`M42 ${TY} H100 V${TY+3} H42 Z`,'conc');
 /* the tank on the roof: where A takes its water from */
 g+=cut(`M58 39 H86 V${TY} H58 Z`,'metal');
 /* the tanks on the plant floors: where C takes its water from */
 const plant=(p.tanks||[]).filter(t=>!t.roof).sort((a,b)=>b.z-a.z);
 let plantY=null,lastY=TY;
 for(const t of plant){
  let yb=yOf(t.z);
  if(yb<TY+10)yb=TY+10;                       // never drawn through the roof slab
  if(Math.abs(yb-lastY)<9)continue;
  g+=cut(`M64 ${(yb-6).toFixed(2)} H80 V${yb.toFixed(2)} H64 Z`,'metal');
  lastY=yb;if(plantY===null)plantY=yb-3;
 }
 /* the pump, in the basement */
 g+=cut(`M60 152 H76 V162 H60 Z`,'metal');
 /* the pressure zones, as dashed bands, and the top of each one marked: that
    is where B puts its booster */
 for(const z of p.zones){
  const y0=yOf(z.zTop),y1=yOf(z.zBot);
  g+=rule(42,y0.toFixed(2),104,y0.toFixed(2),{c:'var(--faint)',w:.6,dash:'3 2'});
  g+=rule(104,y0.toFixed(2),104,y1.toFixed(2),{c:'var(--faint)',w:.6,dash:'3 2'});
  g+=rule(104,y1.toFixed(2),42,y1.toFixed(2),{c:'var(--faint)',w:.6,dash:'3 2'});
  g+=rule(42,y1.toFixed(2),42,y0.toFixed(2),{c:'var(--faint)',w:.6,dash:'3 2'});
  g+=rule(104,y0.toFixed(2),112,y0.toFixed(2),{c:'var(--accent)',w:1.2});
 }
 /* the height of the tower, dimensioned */
 g+=dim(34,GY,34,TY,`${f1(p.H)} m`);
 /* the names, in the margin, each landing on the thing it names */
 g+=txt(12,20,c.mTitleSup);
 g+=leader(86,42,128,26,plant.length?c.mLabelA:c.mLabelAC);
 if(plantY!==null)g+=leader(80,plantY,128,50,c.mLabelC);
 g+=leader(112,yOf(p.zones[Math.floor(p.zones.length/2)].zTop),128,74,c.mLabelB);
 g+=leader(104,GY,128,98,fill(c.mWindow,{a:f1(p.pmax),b:f1(p.pmin)}));
 g+=leader(104,yOf(p.zones[0].zTop),128,122,fill(c.zonesV,{n:p.nZones,b:f1(p.band)}));
 g+=leader(76,157,128,146,c.mPump);
 const st=A?A.storage:0;
 g+=txt(128,172,st>0?fill(c.mStoreAC,{s:nf(st)}):c.mStoreNone);
 g+=txt(128,196,c.mStoreB);
 /* ── the bars: the pumping energy of each strategy, in proportion, split
      into the head the tap needs and the head the valve has to destroy ──── */
 const BX0=270,BX1=405,BH=16,rows=[62,96,130];
 p.strats.forEach((s,i)=>{
  const y=rows[i]!==undefined?rows[i]:50+i*34;
  const w=Math.max(0,(BX1-BX0)*s.energy/p.maxE);
  const wB=w*(Number.isFinite(s.waste)?s.waste:0),wN=w-wB;
  let x=BX0;
  if(wN>0.05){g+=cut(`M${x} ${y} H${(x+wN).toFixed(2)} V${y+BH} H${x} Z`,'metal');x+=wN}
  if(wB>0.05){g+=cut(`M${x.toFixed(2)} ${y} H${(x+wB).toFixed(2)} V${y+BH} H${x.toFixed(2)} Z`,'wool')}
  g+=txt(BX0,y-6,labelOf(s),{anchor:'start'});   // clear of the bar it names
  g+=txt(415,y+2,fill(c.mBarVal,{e:nf(s.energy,1)}));
  g+=txt(415,y+15,fill(c.mBarBurnt,{p:Math.round((Number.isFinite(s.waste)?s.waste:0)*100)}));
 });
 /* the key to the two materials, and the formula the bars are the picture of */
 g+=cut(`M${BX0} 158 H${BX0+12} V166 H${BX0} Z`,'metal');
 g+=txt(BX0+16,164,c.mKeyNeed,{anchor:'start'});
 g+=cut(`M${BX0} 174 H${BX0+12} V182 H${BX0} Z`,'wool');
 g+=txt(BX0+16,180,c.mKeyBurnt,{anchor:'start'});
 /* The resolver will not set a note above the top margin, so the panel's own
    heading starts there and everything else is laid out below it. */
 g+=txt(BX0,25,c.mTitleBar,{anchor:'start'});
 g+=txt(BX0,39,c.mFormula,{anchor:'start'});
 g+=txt(BX0,196,fill(c.demandV,{p:nf(p.pop),l:nf(p.lpd),v:nf(p.V,1)}),{anchor:'start'});
 return sheet(g,MW,MH,c.mAria);
}

/* ── the lab ──────────────────────────────────────────────────────────── */
const C={bg:'#111416',dim:'#a2aca9',faint:'#3a4245',grid:'#1c2124',band:'#171c1f',plant:'#22282b',
 water:'#d6e2e8',amber:'#f59e0b',text:'#c3cbc8',out:'#2a3033'};
const L0={view:'supply',strat:'C',playing:true,t:8,tm:0,gauge:null,
 sup:{pmax:M.pmax,pmin:M.pmin,use:'office',lpd:M.lpd.office,pop:null,hours:M.hours,eta:M.eta,outage:0},
 dr:{i:M.designIntensity,mode:'gravity',dn:150,n:null,dur:60}};
const S={host:null,lang:null,ui:null,key:'',d:null,sim:null,r:null,raf:0,last:0,active:false,ro:null,
 ctl:JSON.parse(JSON.stringify(L0)),state:null,metrics:null,mono:'monospace'};

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=(/(?:^|-)src$/.test(cls||'')?text:shown(text));return e};
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function segment(name,opts,get,set){
 const g=el('div','wat-seg');g.setAttribute('role','group');g.setAttribute('aria-label',name);
 const bs=opts.map(([v,label])=>{const b=el('button',null,label);b.type='button';b.onclick=()=>{set(v);sync()};g.append(b);return[b,v]});
 const sync=()=>bs.forEach(([b,v])=>b.setAttribute('aria-pressed',String(get()===v)));
 sync();return{node:g,sync};
}
function slider(T,key,o,get,set){
 const lab=el('label','wat-field'),row=el('span','wat-lab'),name=el('span',null,T[key]),out=el('output','wat-out');
 const inp=el('input');inp.type='range';inp.min=toDisplay(o.min,o.unit||'');inp.max=toDisplay(o.max,o.unit||'');inp.step=toDisplay(o.step,o.unit||'');inp.value=toDisplay(get(),o.unit||'');
 inp.oninput=()=>{set(fromDisplay(+inp.value,o.unit||''));update()};
 row.append(name,out);lab.append(row,inp);
 const fmtv=()=>o.fmt?o.fmt(get()):(+get()).toFixed(o.dec||0)+(o.unit?' '+o.unit:'');
 out.textContent=shown(fmtv());
 return{node:lab,input:inp,sync(){if(document.activeElement!==inp)inp.value=toDisplay(get(),o.unit||'');out.textContent=shown(fmtv())}};
}

function build(host,lang){
 const T=WATER_TEXT[lang]||WATER_TEXT.en,c=S.ctl;
 host.textContent=shown('');
 const root=el('div','wat');root.lang=lang;
 const canvas=el('canvas','wat-canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',T.aria);
 const bar=el('div','wat-bar');
 const view=segment(T.view,[['supply',T.viewSupply],['drain',T.viewDrain]],()=>c.view,v=>{c.view=v;c.tm=0;update()});
 const strat=segment(T.strategy,[['A','A'],['B','B'],['C','C']],()=>c.strat,v=>{c.strat=v;update()});
 for(const [b,k] of [...strat.node.children].map((b,i)=>[b,'ABC'[i]]))b.title=T['s'+k];
 const play=el('button','wat-play');play.type='button';play.onclick=()=>{c.playing=!c.playing;S.last=0;update()};
 const stratName=el('span','wat-strat');
 bar.append(view.node,strat.node,play,stratName);
 const time=slider(T,'time',{min:0,max:23.95,step:0.05,fmt:v=>clock(v)},()=>c.t,v=>{c.t=v;c.playing=false});
 const storm=slider(T,'stormTime',{min:0,max:240,step:1,fmt:v=>Math.round(v)+' / '+c.dr.dur+' min'},()=>c.tm,v=>{c.tm=Math.min(v,c.dr.dur);c.playing=false});
 const sup=el('div','wat-ctl'),dr=el('div','wat-ctl');
 const sp=c.sup,dp=c.dr;
 const sc=[
  slider(T,'pmax',{min:3,max:8,step:0.1,dec:1,unit:'bar'},()=>sp.pmax,v=>{sp.pmax=v;if(sp.pmin>v-0.5)sp.pmin=+(v-0.5).toFixed(1)}),
  slider(T,'pmin',{min:0.3,max:3,step:0.1,dec:1,unit:'bar'},()=>sp.pmin,v=>{sp.pmin=v;if(sp.pmax<v+0.5)sp.pmax=+(v+0.5).toFixed(1)}),
  slider(T,'lpd',{min:10,max:300,step:5,unit:'L'},()=>sp.lpd,v=>{sp.lpd=v}),
  slider(T,'hours',{min:0,max:48,step:1,unit:'h'},()=>sp.hours,v=>{sp.hours=v}),
  slider(T,'eta',{min:0.3,max:0.9,step:0.01,dec:2},()=>sp.eta,v=>{sp.eta=v}),
  slider(T,'outage',{min:0,max:M.outageMax,step:0.5,fmt:v=>v>0?(+v).toFixed(1)+' h':T.none},()=>sp.outage,v=>{sp.outage=v}),
  slider(T,'gauge',{min:1,max:48,step:1,fmt:v=>'F'+v},()=>c.gauge??1,v=>{c.gauge=v})
 ];
 const useSeg=segment(T.use,[['office',T.office],['residential',T.residential]],()=>sp.use,v=>{sp.use=v;sp.lpd=M.lpd[v];update()});
 const useLab=el('div','wat-field');useLab.append(el('span','wat-lab',T.use),useSeg.node);
 const popLab=el('label','wat-field'),popRow=el('span','wat-lab'),popIn=el('input','wat-num');
 popRow.append(el('span',null,T.pop),el('span','wat-out',T.popAuto));popIn.type='number';popIn.min='1';popIn.step='1';popIn.inputMode='numeric';
 popIn.onchange=()=>{const v=+popIn.value;sp.pop=popIn.value!==''&&v>0?v:null;update()};
 popLab.append(popRow,popIn);
 sup.append(sc[0].node,sc[1].node,useLab,sc[2].node,popLab,sc[3].node,sc[4].node,sc[5].node,sc[6].node);
 const dc=[
  slider(T,'intensity',{min:20,max:250,step:5,unit:'mm/h'},()=>dp.i,v=>{dp.i=v}),
  slider(T,'stacks',{min:1,max:24,step:1,fmt:v=>v+(dp.n==null?' ('+T.auto+')':'')},()=>dp.n??(S.r?S.r.design:1),v=>{dp.n=v}),
  slider(T,'storm',{min:5,max:120,step:5,unit:'min'},()=>dp.dur,v=>{dp.dur=v;c.tm=Math.min(c.tm,v)})
 ];
 const modeSeg=segment(T.mode,[['gravity',T.gravity],['siphonic',T.siphonic]],()=>dp.mode,v=>{dp.mode=v;dp.n=null;update()});
 const dnSeg=segment(T.dn,M.dn.map(v=>[v,'DN'+v]),()=>dp.dn,v=>{dp.dn=v;dp.n=null;update()});
 const modeLab=el('div','wat-field');modeLab.append(el('span','wat-lab',T.mode),modeSeg.node);
 const dnLab=el('div','wat-field');dnLab.append(el('span','wat-lab',T.dn),dnSeg.node);
 dr.append(dc[0].node,modeLab,dnLab,dc[1].node,dc[2].node);
 const read=el('dl','wat-read');
 const rec=el('p','wat-rec'),note=el('p','wat-note'),cannot=el('p','wat-cannot'),assumes=el('p','wat-cannot'),src=el('p','wat-src');
 /* the method, drawn: a figure, so the caption is a figcaption */
 const methodFig=el('figure','wat-method');
 const methodBox=el('div','wat-methodsvg');
 methodFig.append(methodBox,el('figcaption','wat-methodcap',T.m1));
 root.append(canvas,bar,time.node,storm.node,sup,dr,read,rec,methodFig,note,cannot,assumes,src);
 host.append(root);
 S.ui={root,canvas,view,strat,play,stratName,time,storm,sup,dr,sc,dc,useSeg,modeSeg,dnSeg,popIn,read,rec,note,cannot,assumes,src,methodFig,methodBox,rows:{},T};
 if(S.ro)S.ro.disconnect();
 if(typeof ResizeObserver==='function'){S.ro=new ResizeObserver(()=>{size();if(S.active||reduced())draw()});S.ro.observe(canvas)}
 S.mono=(getComputedStyle(host).getPropertyValue('--mono')||'').trim()||'monospace';
}
const clock=h=>{const m=Math.floor(((h%24)+24)%24*60+1e-6);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};

function row(key,label){
 const u=S.ui;let r=u.rows[key];
 if(!r){const d=el('div'),dt=el('dt',null,label),dd=el('dd');d.append(dt,dd);u.read.append(d);r=u.rows[key]={d,dd,spans:null}}
 return r;
}
function triple(key,label,vals){
 const r=row(key,label);
 if(!r.spans){r.dd.textContent=shown('');r.spans=['A','B','C'].map(k=>{const s=el('span','wat-v');r.dd.append(s);return s})}
 r.spans.forEach((s,i)=>{s.textContent=shown('ABC'[i]+' '+vals[i]);s.classList.toggle('is-on',S.ctl.strat==='ABC'[i])});
}
function single(key,label,val){const r=row(key,label);r.spans=null;r.dd.textContent=shown(val)}

/* Recompute only when the tower or a lab control changed. */
function compute(){
 const c=S.ctl,s=S.state,key=JSON.stringify([s,S.metrics?.rentable,c.sup,c.dr]);
 if(key===S.key)return;S.key=key;
 S.d=supplyDesign(s,S.metrics,c.sup);S.sim=simulateDay(S.d);S.r=drainageDesign(s,c.dr);
}

function update(){
 try{
  const u=S.ui;if(!u)return;compute();
  const T=u.T,c=S.ctl,d=S.d,r=S.r,nf=nfmt(S.lang),sup=c.view==='supply';
  u.view.sync();u.strat.sync();u.useSeg.sync();u.modeSeg.sync();u.dnSeg.sync();
  u.strat.node.hidden=!sup;u.stratName.hidden=!sup;u.stratName.textContent=shown(T['s'+c.strat]);
  u.time.node.hidden=!sup;u.storm.node.hidden=sup;u.sup.hidden=!sup;u.dr.hidden=sup;
  u.play.textContent=shown(c.playing&&!reduced()?T.pause:T.play);u.play.setAttribute('aria-pressed',String(c.playing));
  const nFloors=d.floors.length;if(c.gauge==null||c.gauge>nFloors)c.gauge=Math.max(1,Math.round(nFloors*0.5));
  u.sc[6].input.max=nFloors;u.storm.input.max=r.inp.dur;
  for(const x of [...u.sc,...u.dc,u.time,u.storm])x.sync();
  u.popIn.placeholder=String(d.popAuto);if(document.activeElement!==u.popIn)u.popIn.value=c.sup.pop==null?'':String(c.sup.pop);
  u.read.textContent=shown('');u.rows={};
  if(sup){
   const k3=f=>['A','B','C'].map(k=>f(d[k],S.sim.series[k]));
   single('zones',T.rZones,fill(T.zonesV,{n:d.zones.length,b:nf(d.band,1)}));
   single('demand',T.rDemand,fill(T.demandV,{p:nf(d.pop),l:nf(d.inp.lpd),v:nf(d.V,1)}));
   triple('energy',T.rEnergy+', kWh/d',k3(x=>nf(x.energy)));
   triple('head',T.rHead+', '+unitLabel('m'),k3(x=>nf(toDisplay(x.head,'m'))));
   triple('waste',T.rWaste,k3(x=>nf(x.waste*100)+'%'));
   triple('pipe',T.rPipe+', '+unitLabel('bar'),k3(x=>nf(toDisplay(x.pipeBar,'bar'),1)));
   triple('tanks',T.rTanks,k3(x=>String(x.tanks.length)));
   triple('mass',T.rMass+', '+unitLabel('t'),k3(x=>nf(toDisplay(x.mass,'t'))));
   triple('massZ',T.rMassZ+', '+unitLabel('m'),k3(x=>x.massZ==null?'—':nf(toDisplay(x.massZ,'m'))));
   triple('pumps',T.rPumps,k3(x=>String(x.pumps)));
   if(S.sim.outage>0)triple('outage',T.rOutage,k3((x,ss)=>fill(T.keptV,{k:nf(ss.kept,1),o:nf(S.sim.outage,1)})));
   else triple('store',T.rStore+', h',k3(x=>nf(x.storageH)));
   u.rec.textContent=shown(supplySentence(d,S.sim,S.lang)+(d.C.assumed?' (C: '+T.cAssumed+')':''));
   u.note.textContent=shown(T.note);
   u.src.textContent=T.sources+': '+[WATER_SRC.pressure,WATER_SRC.demand,WATER_SRC.energy].join(' · ');
  }else{
   single('roof',T.dRoof,nf(r.roof)+' m²');
   single('wall',T.dWall,nf(r.wall)+' m²');
   single('q',T.dQ,nf(r.Q,1)+' L/s');
   single('cap',T.dCap,'DN'+r.inp.dn+' · '+nf(r.cap,1)+' L/s');
   single('need',T.dNeed,r.need+' / '+r.n);
   single('pond',T.dPond,nf(r.pond)+' mm · '+nf(r.pondKPa,2)+' kPa');
   single('facade',T.dFacade,nf(r.facade)+' m² · '+nf(r.Qf,1)+' L/s');
   single('det',T.dDet,nf(r.detention)+' m³');
   single('ww',T.dWaste,r.waste.stacks+' × DN'+r.waste.stackMM);
   single('brk',T.dBreak,String(r.waste.velocityBreakers));
   single('vent',T.dVent,String(r.waste.ventStacks));
   u.rec.textContent=shown(drainSentence(r,S.lang));
   u.note.textContent=shown(T.noteDrain);
   u.src.textContent=T.sources+': '+[WATER_SRC.rain,WATER_SRC.drains].join(' · ');
  }
  u.cannot.textContent=shown(T.cannot);u.assumes.textContent=shown(T.assumes);
  /* the method sheet, drawn from the SAME design the numbers above came from */
  try{const pay=waterMethodPayload(S.d);u.methodBox.innerHTML=pay?waterMethodSVG(pay,{lang:S.lang}):''}catch{u.methodBox.innerHTML=''}
  u.canvas.setAttribute('aria-label',T.aria+'. '+u.rec.textContent);
  loop();draw();
 }catch(e){/* never throw into the console */}
}

function size(){
 const cv=S.ui?.canvas;if(!cv)return;
 const w=Math.max(200,cv.clientWidth||600),h=Math.max(200,cv.clientHeight||400),dpr=Math.min(3,globalThis.devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 S.dim={w,h,dpr};
}
function loop(){
 const want=S.active&&S.ctl.playing&&!reduced();
 if(want&&!S.raf){S.last=0;S.raf=requestAnimationFrame(frame)}
 if(!want&&S.raf){cancelAnimationFrame(S.raf);S.raf=0}
}
function frame(ts){
 S.raf=0;
 try{
  const dt=S.last?Math.min(0.1,(ts-S.last)/1000):0;S.last=ts;S.phase=(S.phase||0)+dt;
  const c=S.ctl;
  if(c.view==='supply')c.t=(c.t+dt*0.5)%24;
  else{c.tm+=dt*S.r.inp.dur/12;if(c.tm>S.r.inp.dur+S.r.inp.dur/6)c.tm=0}
  const u=S.ui;if(u){(c.view==='supply'?u.time:u.storm).sync()}
  draw();
 }catch(e){}
 if(S.active&&S.ctl.playing&&!reduced())S.raf=requestAnimationFrame(frame);
}

function draw(){
 try{
  const cv=S.ui?.canvas;if(!cv||!S.d)return;
  if(!S.dim)size();const {w,h,dpr}=S.dim,ctx=displayContext(cv.getContext('2d'),displayLang);if(!ctx)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);
  ctx.font='11px '+S.mono;ctx.textBaseline='alphabetic';ctx.lineCap='butt';
  if(S.ctl.view==='supply')drawSupply(ctx,w,h);else drawDrain(ctx,w,h);
 }catch(e){}
}

function line(ctx,x0,y0,x1,y1,col,wd=1,dash=null,off=0){ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.strokeStyle=col;ctx.lineWidth=wd;ctx.setLineDash(dash||[]);ctx.lineDashOffset=off;ctx.stroke();ctx.setLineDash([])}
function text(ctx,s,x,y,col=C.text,align='left'){ctx.fillStyle=col;ctx.textAlign=align;ctx.fillText(s,x,y)}
/* A pipe: dim when idle, water moving along it from (x0,y0) to (x1,y1) when on. */
function pipe(ctx,x0,y0,x1,y1,on,speed=1){
 line(ctx,x0,y0,x1,y1,C.faint,2);
 if(on)line(ctx,x0,y0,x1,y1,C.water,1.5,[3,5],-((S.phase||0)*24*speed)%8);
}
function tank(ctx,x,y,wd,ht,frac,dashed){
 ctx.fillStyle=C.water;const f=Math.max(0,Math.min(1,frac));if(f>0)ctx.fillRect(x,y+ht*(1-f),wd,ht*f);
 ctx.strokeStyle=C.dim;ctx.lineWidth=1;ctx.setLineDash(dashed?[2,2]:[]);ctx.strokeRect(x+0.5,y+0.5,wd-1,ht-1);ctx.setLineDash([]);
}
function pump(ctx,x,y,on){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=on?C.amber:C.bg;ctx.fill();ctx.strokeStyle=on?C.amber:C.dim;ctx.lineWidth=1;ctx.stroke()}
function prvMark(ctx,x,y){ctx.beginPath();ctx.moveTo(x-4,y-3);ctx.lineTo(x+4,y+3);ctx.lineTo(x+4,y-3);ctx.lineTo(x-4,y+3);ctx.closePath();ctx.fillStyle=C.bg;ctx.fill();ctx.strokeStyle=C.dim;ctx.lineWidth=1;ctx.stroke()}
function ticks(ctx,x,y,zMax,pad){
 const stp=zMax>420?100:zMax>140?50:25;
 for(let z=0;z<=zMax;z+=stp){const yy=y(z);line(ctx,x-4,yy,x,yy,C.dim);text(ctx,String(z),pad,yy+4,C.dim)}
 text(ctx,'m',pad,y(zMax)-6,C.dim);
}

function drawSupply(ctx,W,Hc){
 const T=S.ui.T,c=S.ctl,d=S.d,sim=S.sim,st=d[c.strat],ser=sim.series[c.strat];
 const step=Math.min(sim.steps-1,Math.max(0,Math.floor(c.t/sim.dt)));
 const pad=10,stripH=50,top=20,bottom=Hc-stripH-34;
 const lx0=pad+30,lx1=Math.round(W*0.46),cx0=lx1+26,cx1=W-pad-6;
 const zMin=-10,zMax=Math.max(d.TA,d.H)+6,y=z=>bottom-(z-zMin)/(zMax-zMin)*(bottom-top);
 const N=d.zones.length,zs=st.zones;
 // zone bands, alternate, read across section and chart so they line up
 zs.forEach((z,k)=>{const lo=k?(zs[k-1].zTop+z.zBot)/2:0,hi=k<N-1?(z.zTop+zs[k+1].zBot)/2:d.H;
  if(k%2){ctx.fillStyle=C.band;ctx.fillRect(lx0,y(hi),cx1-lx0,y(lo)-y(hi))}
  text(ctx,'Z'+(k+1),lx0+4,y(hi)+13,C.dim)});
 // plant levels
 for(const v of d.voids){ctx.fillStyle=C.plant;ctx.fillRect(lx0,y(v.z+v.h),lx1-lx0,Math.max(2,y(v.z)-y(v.z+v.h)))}
 if(d.floors.length<=90)for(const f of d.floors)line(ctx,lx0,y(f.z),lx1,y(f.z),C.grid);
 ctx.strokeStyle=C.dim;ctx.lineWidth=1;ctx.strokeRect(lx0+0.5,y(d.H)+0.5,lx1-lx0-1,y(0)-y(d.H));
 line(ctx,pad+24,y(0),lx1+8,y(0),C.dim,1.5);
 ctx.strokeStyle=C.faint;ctx.strokeRect(lx0+0.5,y(0)+0.5,lx1-lx0-1,y(zMin+1)-y(0));
 ticks(ctx,lx0,y,Math.floor(d.H),pad);
 // basement break tank, fed from the main
 const bx=lx0+6,by=y(-2.5),bh=Math.max(10,y(-8)-by);
 tank(ctx,bx,by,30,bh,0.8);text(ctx,T.cBreak,bx,y(zMin+1)+12>Hc-stripH-20?by-3:y(zMin+1)+12,C.dim);
 const px=i=>Math.min(lx1-30,lx0+48+i*8),pumpY=by+bh/2,phase=S.phase||0;
 const servedZ=k=>ser.served[k][step];
 const branch=(k,x)=>{const z=zs[k],ym=y((z.zBot+z.zTop)/2);pipe(ctx,x,ym,lx1-22,ym,servedZ(k)>0&&!reduced(),0.6)};
 const tw=Math.max(26,Math.min(44,(lx1-lx0)*0.3));
 if(c.strat==='A'){
  const t=st.tanks[0],ty=y(t.z)-8,on=!!ser.tanks[0].pump[step],x0=px(0),x1=px(1);
  pump(ctx,x0,pumpY,on);pipe(ctx,x0,pumpY-4,x0,ty+12,on,1.4);
  tank(ctx,x0-4,ty,tw,12,t.vol>0?ser.tanks[0].lv[step]:0);
  pipe(ctx,x1,ty+12,x1,y(zs[0].zBot),zs.some((_,k)=>servedZ(k)>0),1);
  zs.forEach((z,k)=>{branch(k,x1);if(z.prv)prvMark(ctx,x1,y(z.zTop)-6)});
 }else if(c.strat==='B'){
  zs.forEach((z,k)=>{const x=px(k),on=!!ser.boost[step];pump(ctx,x,pumpY,on);pipe(ctx,x,pumpY-4,x,y((z.zBot+z.zTop)/2),on,1.2);branch(k,x)});
 }else{
  let prevY=pumpY;const x0=px(0);
  st.tanks.forEach((t,j)=>{const ty=y(t.z)-8,on=!!ser.tanks[j].pump[step];
   pump(ctx,x0,prevY,on);pipe(ctx,x0,prevY-4,x0,ty+12,on,1.4);
   tank(ctx,x0-4,ty,tw,12,t.vol>0?ser.tanks[j].lv[step]:0,t.assumed);
   const xd=px(1+j),lo=Math.min(...t.zones.map(k=>zs[k].zBot));
   pipe(ctx,x0+tw-6,ty+6,xd,ty+6,false);
   pipe(ctx,xd,ty+12,xd,y(lo),t.zones.some(k=>servedZ(k)>0),1);
   for(const k of t.zones){branch(k,xd);if(zs[k].prv)prvMark(ctx,xd,y(zs[k].zTop)-6)}
   prevY=ty-6;
  });
 }
 // the gauge floor
 const gi=Math.min(d.floors.length,Math.max(1,c.gauge))-1,gz=d.floors[gi].z;
 const gk=Math.max(0,zs.findIndex(z=>gz>=z.zBot-1e-9&&gz<=z.zTop+1e-9));
 line(ctx,lx0,y(gz),lx1,y(gz),C.amber);
 // pressure against height, on the section's own vertical scale
 const pAx=Math.max(c.sup.pmax+1.5,7),X=p=>cx0+Math.min(1,Math.max(0,p/pAx))*(cx1-cx0);
 ctx.fillStyle=C.band;ctx.fillRect(X(d.inp.pmin),top,X(d.inp.pmax)-X(d.inp.pmin),bottom-top);
 line(ctx,X(d.inp.pmin),top,X(d.inp.pmin),bottom,C.faint);line(ctx,X(d.inp.pmax),top,X(d.inp.pmax),bottom,C.faint);
 text(ctx,d.inp.pmin.toFixed(1),X(d.inp.pmin),top-6,C.dim,'center');text(ctx,d.inp.pmax.toFixed(1),X(d.inp.pmax),top-6,C.dim,'center');
 line(ctx,cx0,bottom,cx1,bottom,C.dim);line(ctx,cx0,top,cx0,bottom,C.dim);
 for(let p=0;p<=pAx;p+=2){line(ctx,X(p),bottom,X(p),bottom+4,C.dim);if(X(p)<cx1-30)text(ctx,String(p),X(p),bottom+15,C.dim,'center')}
 text(ctx,T.cBar,cx1,bottom+15,C.dim,'right');
 let srcLabelled=false;
 zs.forEach((z,k)=>{
  const on=servedZ(k)>0;
  if(z.prv||z.src-z.zTop>d.hmin+0.5){
   const sb=sourceBar(z,z.zBot),stp=sourceBar(z,z.zTop);
   line(ctx,X(sb),y(z.zBot),X(stp),y(z.zTop),C.dim,1,[2,3]);
   if(sb>pAx)text(ctx,sb.toFixed(1)+' →',cx1,y(z.zBot)-3,C.dim,'right');
   srcLabelled=true;
  }
  if(on)line(ctx,X(deliveredBar(d,z,z.zBot)),y(z.zBot),X(deliveredBar(d,z,z.zTop)),y(z.zTop),C.water,2);
  else{line(ctx,X(0)+1,y(z.zBot),X(0)+1,y(z.zTop),C.amber,2);text(ctx,T.cDry,X(0)+6,(y(z.zBot)+y(z.zTop))/2,C.amber)}
 });
 const gp=servedZ(gk)>0?deliveredBar(d,zs[gk],gz):0;
 ctx.beginPath();ctx.arc(X(gp),y(gz),3.5,0,Math.PI*2);ctx.fillStyle=C.amber;ctx.fill();
 const gl='F'+(gi+1)+' · '+gp.toFixed(1)+' bar',gw=ctx.measureText(gl).width;
 const gx=Math.max(cx0+2,X(gp)+8+gw>cx1?X(gp)-8-gw:X(gp)+8);ctx.fillStyle=C.bg;ctx.fillRect(gx-2,y(gz)-17,gw+4,14);
 text(ctx,gl,gx,y(gz)-6,C.amber);
 // the day: demand, the outage, the tank and the playhead
 const sy0=Hc-stripH,sy1=Hc-16,hx=hh=>pad+hh/24*(W-2*pad);
 if(sim.outage>0){ctx.fillStyle=C.out;ctx.fillRect(hx(sim.start),sy0,hx(sim.start+sim.outage)-hx(sim.start),sy1-sy0);text(ctx,T.cOutage,hx(sim.start)+3,sy0+11,C.dim)}
 const pm=Math.max(...sim.prof);
 sim.prof.forEach((p,i)=>{const bh=p/pm*(sy1-sy0-14);ctx.fillStyle=C.faint;ctx.fillRect(hx(i)+1,sy1-bh,Math.max(1,hx(1)-hx(0)-2),bh)});
 ctx.beginPath();
 for(let i=0;i<sim.steps;i++){
  const v=ser.tanks.length?ser.tanks.reduce((a,t)=>a+t.lv[i],0)/ser.tanks.length:ser.served.reduce((a,s)=>a+s[i],0)/ser.served.length;
  const xx=hx(i*sim.dt),yy=sy1-v*(sy1-sy0-2);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);
 }
 ctx.strokeStyle=C.water;ctx.lineWidth=1.2;ctx.stroke();
 line(ctx,pad,sy1,W-pad,sy1,C.dim);
 for(let hh=0;hh<=24;hh+=6)text(ctx,String(hh).padStart(2,'0'),hx(hh),Hc-4,C.dim,hh===0?'left':hh===24?'right':'center');
 line(ctx,hx(c.t),sy0-4,hx(c.t),sy1,C.amber,1.5);
 const dem=d.V*sim.prof[Math.floor(c.t)%24];
 text(ctx,clock(c.t)+' · '+dem.toFixed(1)+' m³/h · '+c.strat,pad,sy0-6,C.text);
 if(srcLabelled){const lw=ctx.measureText(T.cSource).width;if(W-pad-lw-22>pad+170){line(ctx,W-pad-lw-20,sy0-10,W-pad-lw-6,sy0-10,C.dim,1,[2,3]);text(ctx,T.cSource,W-pad,sy0-6,C.dim,'right')}}
}

function drawDrain(ctx,W,Hc){
 const T=S.ui.T,c=S.ctl,r=S.r,phase=S.phase||0,motion=!reduced();
 const pad=10,top=24,bottom=Hc-22,lx0=pad+30,lx1=Math.round(W*0.42),rx0=lx1+28,rx1=W-pad;
 const zMin=-14,zMax=r.H+12,y=z=>bottom-(z-zMin)/(zMax-zMin)*(bottom-top);
 const prog=Math.min(1,c.tm/r.inp.dur),raining=c.tm<=r.inp.dur;
 // rain over the tower, slanted by the wind onto the windward (left) face
 const drops=Math.min(220,Math.round(r.inp.i*0.8)),hash=k=>((Math.sin(k*127.1)*43758.5453)%1+1)%1;
 ctx.strokeStyle=C.dim;ctx.lineWidth=1;
 if(raining)for(let k=0;k<drops;k++){
  const span=y(0)-4;let yy=(hash(k)*span+phase*240*(0.8+hash(k+9)*0.4))%span;
  const xx=pad+hash(k+3)*(lx1+20-pad)+yy*0.12-span*0.06;
  if(xx>lx0-3&&xx<lx1+3&&yy>y(r.H)-8||xx>rx0-8)continue;
  ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+2,yy+7);ctx.stroke();
 }
 const fh=r.H/Math.max(1,S.state.floors);
 if(S.state.floors<=90)for(let f=1;f<S.state.floors;f++)line(ctx,lx0,y(f*fh),lx1,y(f*fh),C.grid);
 ctx.strokeStyle=C.dim;ctx.lineWidth=1;ctx.strokeRect(lx0+0.5,y(r.H)+0.5,lx1-lx0-1,y(0)-y(r.H));
 line(ctx,pad+24,y(0),lx1+12,y(0),C.dim,1.5);
 // the windward face runs with water all the way down to the podium
 if(raining)line(ctx,lx0-1.5,y(r.H),lx0-1.5,y(0),C.water,1.5,[2,6],motion?-(phase*50)%8:0);
 ticks(ctx,lx0,y,Math.floor(r.H),pad);
 // rainwater stacks, running at the share of their capacity the storm asks for
 const load=r.capacity>0?Math.min(1,r.Q/r.capacity):1,full=r.excess>0;
 const n=Math.min(r.n,12),gap=Math.min(12,(lx1-lx0-40)/Math.max(1,n));
 for(let j=0;j<n;j++){const x=lx0+(lx1-lx0)*0.3+j*gap;
  line(ctx,x,y(r.H),x,y(-3),C.faint,2);
  if(raining)line(ctx,x,y(r.H),x,y(-3),C.water,full?2.5:1.5,full?[]:[3,5],motion?-(phase*40*(0.4+load))%8:0);
 }
 text(ctx,T.cRW+' ×'+r.n,lx0+(lx1-lx0)*0.3-4,y(r.H)-6,C.text);
 // wastewater, with velocity breakers on a tall stack
 const wx=lx1-12,wb=r.waste.velocityBreakers;
 line(ctx,wx,y(r.H-4),wx,y(-3),C.faint,2);line(ctx,wx,y(r.H-4),wx,y(-3),C.dim,1,[2,6],motion?-(phase*18)%8:0);
 for(let b=1;b<=wb;b++){const yy=y(r.H-b*10*fh);ctx.beginPath();ctx.moveTo(wx,yy-5);ctx.lineTo(wx+4,yy-2);ctx.lineTo(wx,yy+1);ctx.strokeStyle=C.dim;ctx.stroke()}
 text(ctx,T.cWW,wx,y(r.H)-6,C.dim,'center');
 // detention below grade, filling across the storm
 const dy=y(-4),dh=Math.max(12,y(-13)-dy);
 tank(ctx,lx0+4,dy,lx1-lx0-8,dh,prog);
 // the roof, enlarged: what the stacks cannot take stands here
 const by0=top,by1=top+Math.round((bottom-top)*0.46),slab=by1-14,parH=Math.min(60,by1-by0-30);
 text(ctx,T.cDetail+' · '+Math.round(r.roof)+' m²',rx0,by0-8,C.dim);
 line(ctx,rx0,slab,rx1,slab,C.dim,3);line(ctx,rx0+1,slab,rx0+1,slab-parH,C.dim,2);line(ctx,rx1-1,slab,rx1-1,slab-parH,C.dim,2);
 const depth=r.pondRate*Math.min(c.tm,r.inp.dur),dpx=Math.min(parH-2,depth*0.35);
 if(dpx>0.3){ctx.fillStyle=C.water;ctx.fillRect(rx0+2,slab-1.5-dpx,rx1-rx0-4,dpx)}
 if(raining)for(let k=0;k<Math.round(drops*0.4);k++){
  const sp=slab-by0-4,yy=by0+(hash(k+50)*sp+phase*200)%sp,xx=rx0+4+hash(k+77)*(rx1-rx0-8);
  if(yy>slab-dpx-4)continue;line(ctx,xx,yy,xx+1.5,yy+6,C.dim);
 }
 const no=Math.min(r.n,24);
 for(let j=0;j<no;j++){const x=rx0+(j+1)*(rx1-rx0)/(no+1);
  line(ctx,x,slab+2,x,by1,C.faint,2);if(raining)line(ctx,x,slab+2,x,by1,C.water,1.5,[3,4],motion?-(phase*30)%7:0)}
 text(ctx,depth>0.05?T.cPond+' '+depth.toFixed(0)+' mm':T.cNoPond,rx0+6,Math.min(slab-parH+12,slab-dpx-6),depth>0.05?C.amber:C.text);
 // inflow against capacity
 const qy=by1+30,mx=Math.max(r.Q,r.capacity)*1.08||1,bw=v=>(rx1-rx0)*v/mx;
 text(ctx,T.cInflow+' '+r.Q.toFixed(1)+' L/s',rx0,qy-5,C.text);
 ctx.fillStyle=C.water;ctx.fillRect(rx0,qy,bw(Math.min(r.Q,r.capacity)),8);
 if(r.excess>0){ctx.fillStyle=C.amber;ctx.fillRect(rx0+bw(r.capacity),qy,bw(r.excess),8)}
 text(ctx,T.cCapacity+' '+r.n+'×DN'+r.inp.dn+' '+r.capacity.toFixed(1)+' L/s',rx0,qy+30,C.text);
 ctx.strokeStyle=C.dim;ctx.lineWidth=1;ctx.strokeRect(rx0+0.5,qy+35.5,bw(r.capacity)-1,7);
 text(ctx,T.cFacade+' ≤ '+r.Qf.toFixed(0)+' L/s',rx0,qy+66,C.dim);
 text(ctx,T.cWW+' '+r.waste.stacks+'×DN'+r.waste.stackMM+(wb?' · '+wb+' '+T.cBrk:''),rx0,qy+86,C.dim);
 text(ctx,T.cDetention+' '+Math.round(r.detention*prog)+' / '+Math.round(r.detention)+' m³',rx0,qy+106,C.dim);
 text(ctx,Math.round(Math.min(c.tm,r.inp.dur))+' / '+r.inp.dur+' min · '+r.inp.i+' mm/h',rx0,bottom,C.text);
}

/* The contract: called on every model change and workspace switch. */
export function renderWaterLab({host,state,metrics,lang='en',active=false}={}){
 try{
  if(!host||!state)return;
  const L=WATER_TEXT[lang]?lang:'en';
  S.state=state;S.metrics=metrics;S.active=!!active;
  displayLang=L;const preferenceKey=JSON.stringify([getPreferences(),getRateBook()]);
  if(displayKey!==preferenceKey){S.lang=null;displayKey=preferenceKey}
  if(S.host!==host||S.lang!==L||!S.ui||!host.contains(S.ui.root)){S.host=host;S.lang=L;S.key='';build(host,L)}
  if(!S.active){loop();return}
  size();update();
 }catch(e){/* a lab must never take the studio down */}
}
