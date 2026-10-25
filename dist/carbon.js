/* Carbon lab — structural material, upfront carbon and cost as the tower
   grows taller and slimmer. The premium for height, made playable.

   WHAT THIS IS. An order-of-magnitude scaling model of the superstructure
   (floors, vertical gravity structure, the lateral system). It is calibrated
   against published quantities and every factor is named below. It is not a
   structural design and not a certified life-cycle assessment. No foundations,
   no substructure, no transfer structures, no site activities (A5a).

   THE MODEL (all per level of the model's own stack, then summed and divided
   by the model's own gross floor area):
   1. Floors. Each level carries a slab whose material per m² is constant for a
      given system (assumed rates, SYSTEMS below). Floors do not grow with
      height — Foraboschi, Mercanzin & Trabucco (2014) found the flooring
      system dominates embodied energy and that the premium for height of
      embodied energy "is not substantial".
   2. Vertical gravity structure. A column or wall at level i carries every
      floor above it: area = W_i / σ, with W_i = Σ_{j≥i} q·A_j. Summed up the
      height this is ∝ N², so per m² it grows linearly with storeys: the slow
      gravity premium.
   3. Lateral system. The along-wind overturning moment M(z) comes from
      wind.js (EN 1991-1-4). A cantilever resists it with two flanges a lever
      arm d apart: flange area A_f = M/(σ·d), material 2·A_f·dz·ineff. Its
      tip drift is Δ = ∫ κ(z)(H−z) dz with κ = M/(E·I), I = A_f·d²/2, which
      for strength-sized flanges is κ = 2σ/(E·d). When Δ exceeds H/500 every
      flange is scaled by k = Δ/(H/500). With drift governing, the lateral
      material scales as H³/(E·b) for the tower: the steep premium, and the one
      that slenderness bends upward.
   4. Carbon, A1–A5 (upfront): kg × A1–A3 factor, + A4 road transport
      kg·km × 0.10749 g/kg/km, + A5 waste WF × (A1–A3 + A4).
   5. Cost: quantities × user rates. Illustrative inputs, not prices.

   SOURCES (verified 2026-10):
   - IStructE, How to calculate embodied carbon, 2nd ed. (2022): Table 2.3
     A1–A3 factors (ICE V3 concrete by class and GGBS; CARES UK rebar 0.760;
     global rebar 1.960, EAF 0.395, BOF 3.970; UK sections 1.740, EAF 0.567,
     BOF 2.450, global 1.580); Table 2.4 road TEF 0.10749 gCO2e/kg/km; Table 2.5
     A4 defaults (local 50 km, national 300 km); Table 2.6 waste factors
     (in-situ concrete and rebar 0.053, steel frame 0.010); §2.2.2.4 BOF up to
     30% scrap (UK typ. 13%), EAF up to 100% (UK typ. 97%).
     https://www.istructe.org/resources/guidance/how-to-calculate-embodied-carbon/
   - Gibbons & Orr et al., "Setting carbon targets: an introduction to the
     proposed SCORS rating scheme", The Structural Engineer 98(10), 2020: A =
     100–150 kgCO2e/m² GIA, A1–A5, superstructure + substructure; RIBA 2030
     non-domestic structure 156 (B); LETI 2030 commercial structure 228 (C).
     https://www.istructe.org/journal/volumes/volume-98-(2020)/issue-10/setting-carbon-targets-an-introduction-to-scors/
     Price & Myers: B < 200, 300 is D, 341 is E.
     https://www.pricemyers.com/news-insights/price--myers-embodied-carbon-data-and-targets-151
     Band edges other than A and B are read as 50 kg steps from those points.
   - Khan premium for height, steel weight per gross floor area: John Hancock
     Center, 100 storeys, 29 lb/ft² (Construction, 1972; Britannica 145 kg/m²);
     Sears Tower 33 lb/ft² and Empire State Building over 42 lb/ft² (Lehigh,
     https://www.lehigh.edu/~infrk/2011.08.article.html).
   - Hearst Tower diagrid: about 20% less steel (about 2,000 t) than a
     conventionally framed perimeter structure (Foster + Partners, quoted by
     BD+C, https://www.bdcnetwork.com/building-tradition; ArcelorMittal).
   - Outriggers reduce core overturning moment by about 40–60% (secondary:
     Designing Buildings Wiki, https://designingbuildings.co.uk/wiki/Outrigger;
     30–40% elsewhere). Half is assumed.
   - Foraboschi, Mercanzin & Trabucco, Energy and Buildings 68 (2014) 254–269,
     doi:10.1016/j.enbuild.2013.09.003 (qualitative finding only).
   - EN 1992-1-1 Table 3.1 Ecm = 22·(fcm/10)^0.3 GPa, fcm = fck + 8.
     ACI 318-19 Table 6.6.3.1.1(a): uncracked walls 0.70·Ig.
     EN 1991-1-1 Table 6.2: offices, category B1, q_k 2.5 kN/m²; RC 25 kN/m³.
   ASSUMPTIONS are marked ASSUMPTION where they are set. */
import {profile,stack,area} from './model.js?v=67662478b8';
import {leastWidth} from './structure.js?v=b0e70550ec';
import {windRead} from './wind.js?v=b3877d0604';
// The drafting vocabulary this drawing is made of. The release stamper pins
// this against drafting.js; a hand-written token would rot the moment the
// vocabulary changed, which is the whole reason the stamper exists.
import {sheet,cut,beyond,leader as draftLeader,dim as draftDim,rule,txt as draftTxt,ground,layout} from './drafting.js?v=5dc3f3c796';
import {displayText,displayContext,getPreferences,getRateBook,toDisplay,fromDisplay,unitLabel} from './preferences.js?v=48652b12d9';
let displayLang='en',displayKey='';
const shown=value=>displayText(value,displayLang);
const txt=(x,y,text,...args)=>draftTxt(x,y,shown(text),...args);
const leader=(x,y,tx,ty,text,...args)=>draftLeader(x,y,tx,ty,shown(text),...args);
const dim=(x,y,tx,ty,text,...args)=>draftDim(x,y,tx,ty,shown(text),...args);


/* ── factors ─────────────────────────────────────────────────────────── */
// IStructE Table 2.3, UK in-situ concrete (ICE V3), kgCO2e/kg, at 0%, 25% and
// 70% GGBS. Between these points the factor is interpolated linearly.
export const CONCRETE_ECF={
 'C25/30':[[0,0.119],[25,0.100],[70,0.056]],
 'C32/40':[[0,0.149],[25,0.120],[70,0.063]],
 'C40/50':[[0,0.159],[25,0.138],[70,0.072]]
};
export const CONCRETE_CLASSES=Object.keys(CONCRETE_ECF);
export const FCK={'C25/30':25,'C32/40':32,'C40/50':40};
// IStructE Table 2.3, kgCO2e/kg: EAF lower bound, BOF upper bound, global default.
export const REBAR_ECF={eaf:0.395,bof:3.970,global:1.960,uk:0.760};
export const SECTION_ECF={eaf:0.567,bof:2.450,global:1.580,uk:1.740};
export const TEF_ROAD=0.10749/1000;        // kgCO2e per kg per km, Table 2.4
export const CONCRETE_KM=50;               // Table 2.5 "locally manufactured"
export const WASTE={concrete:0.053,rebar:0.053,steel:0.010}; // Table 2.6 WF
export const RHO_C=2400,RHO_S=7850;        // kg/m³
export const GAMMA_RC=25;                  // kN/m³, EN 1991-1-1 Annex A
export const Q_IMPOSED=2.5;                // kN/m², EN 1991-1-1 Table 6.2, B1
// ASSUMPTION: superimposed dead load (finishes, services, partitions,
// facade) carried by the floor structure, kN/m².
export const Q_SDL=2.5;
export const DRIFT=500;                    // tip drift limit H/500 (practice)
export const E_STEEL=210e9;                // Pa, EN 1993-1-1 3.2.6
// ASSUMPTION: working stresses of an allowable-stress sketch. Concrete 0.4·fck;
// S355 steel 0.6·fy = 213 MPa.
export const SIGMA_C=fck=>0.4*fck*1e6;
export const SIGMA_S=213e6;
export const ECM=fck=>22*Math.pow((fck+8)/10,0.3)*1e9; // EN 1992-1-1 Table 3.1
export const WALL_STIFFNESS=0.70;          // ACI 318-19 Table 6.6.3.1.1(a)
// ASSUMPTION: rebar ratio by volume in gravity columns and in core walls.
export const RHO_REBAR_COL=0.02,RHO_REBAR_WALL=0.01;
// ASSUMPTION: flange centroid lever arm as a share of the width it sits in.
export const ARM=0.9;
export const OUTRIGGER_SHARE=0.5;          // of M moved to perimeter (40–60%)
export const HEARST_RATIO=0.8;             // diagrid ÷ conventional perimeter frame
// ASSUMPTION: material multiplier of a conventional steel perimeter frame over
// ideal flanges (shear lag, racking, connections). The diagrid's is 0.8 of it.
export const PERIMETER_FRAME_INEFF=1.6;

/* Each system: floor material per m² of slab (ASSUMPTION, typical
   early-stage rates), where the vertical gravity load goes, and which
   mechanisms resist the overturning moment. */
export const SYSTEMS={
 'column-grid':{slab:{conc:0.25,rebar:25,steel:0},grav:{conc:1,steel:0},
  lat:[{share:1,mat:'conc',arm:'core',ineff:1.25}]},
 outrigger:{slab:{conc:0.13,rebar:6,steel:35},grav:{conc:0.5,steel:0.5},
  lat:[{share:1-OUTRIGGER_SHARE,mat:'conc',arm:'core',ineff:1.25},{share:OUTRIGGER_SHARE,mat:'steel',arm:'plan',ineff:1.1}]},
 diagrid:{slab:{conc:0.13,rebar:6,steel:40},grav:{conc:0,steel:1},
  lat:[{share:1,mat:'steel',arm:'plan',ineff:PERIMETER_FRAME_INEFF*HEARST_RATIO}]}
};
export const SYSTEM_KEYS=Object.keys(SYSTEMS);

/* Published points for the premium-for-height chart. lb/ft² × 4.8824 = kg/m². */
const PSF=4.8824;
export const REFERENCE_STEEL=[
 {key:'hancock',storeys:100,kg:30*PSF,src:'SOM: about 30 psf'},
 {key:'empire',storeys:102,kg:42*PSF,src:'Lehigh (Khan), “over 42”'},
 {key:'sears',storeys:108,kg:33*PSF,src:'Lehigh (Khan)'}
];
// SCORS (A1–A5, structure). [upper edge, band]. Edges read from Figure 1 of the
// 2020 paper (nine equal bands, axis 0 to >400); only A (100–150) is stated in
// its text. SCORS is per m² GIA; this lab divides by the model's GFA.
export const SCORS=[[50,'A++'],[100,'A+'],[150,'A'],[200,'B'],[250,'C'],[300,'D'],[350,'E'],[400,'F'],[Infinity,'G']];
export const TARGETS=[{key:'riba',value:156},{key:'leti',value:228}];

export const DEFAULT_CTL={floors:null,spanFactor:1,system:null,concrete:'C40/50',ggbs:25,
 rebarEAF:56,steelEAF:46,km:300,vb:30,rates:{conc:250,rebar:1.8,steel:4.5}};

const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

export function concreteECF(cls,ggbs){
 const pts=CONCRETE_ECF[cls]||CONCRETE_ECF['C40/50'],r=clamp(fin(ggbs,25),0,70);
 for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];if(r<=x1)return y0+(y1-y0)*(r-x0)/(x1-x0)}
 return pts[pts.length-1][1];
}
/* Share of production by the scrap-based electric-arc route, 0–100%, between
   the BOF and EAF bounds of Table 2.3. */
export const steelECF=(b,share)=>{const f=clamp(fin(share,50),0,100)/100;return b.bof+f*(b.eaf-b.bof)};
export const rebarECF=share=>steelECF(REBAR_ECF,share);
export const sectionECF=share=>steelECF(SECTION_ECF,share);
// Typical scrap content implied by the route mix (UK typical BOF 13%, EAF 97%).
export const scrapShare=share=>0.13+clamp(fin(share,50),0,100)/100*(0.97-0.13);
export const scorsBand=v=>SCORS.find(([edge])=>v<edge)[1];

/* ── the tower at n storeys: geometry and wind, cached ─────────────────── */
const towerCache=new Map();
function towerKey(s,n,vb){return [s.family,s.span,s.aspect,s.taper,s.twist,s.height,s.program,s.garden,s.core,n,vb].join('|')}
export function tower(s,n=s.floors,vb=30){
 const key=towerKey(s,n,vb);if(towerCache.has(key))return towerCache.get(key);
 const t=n=>({...s,floors:n,orientation:0});
 const st=stack(t(n)),H=st.reduce((a,l)=>a+l.h,0)||1;
 const bBase=leastWidth(profile(t(n),0));
 const w=windRead(t(n),{vb,terrain:'IV'});
 const strips=w.strips,dz=w.H/strips.length;
 const wsum=strips.reduce((a,x)=>a+x.q*x.b,0)||1,F=w.shear*1e6;
 const forces=strips.map(x=>({z:x.z,f:F*x.q*x.b/wsum}));
 const Mat=z=>{let m=0;for(const x of forces)if(x.z>z)m+=x.f*(x.z-z);return m};
 let gross=0;
 const levels=st.map(l=>{
  const zt=(l.z+l.h/2)/H,a=area(profile(t(n),l.z/H)),frac=l.frac==null?1:l.frac;
  if(l.gfa)gross+=a*frac;
  return {z:l.z,h:l.h,gfa:l.gfa,a,width:bBase*(1+(s.taper-1)*zt),M:Mat(l.z+l.h/2)};
 });
 const out={n,H,bBase,gross:gross||1,levels,moment:w.moment,lambda:H/bBase};
 if(towerCache.size>400)towerCache.clear();
 towerCache.set(key,out);
 return out;
}

/* Material of one tower for one system, in kg, by level and by material.
   Pure arithmetic over tower(); never throws for finite input. */
export function materials(tw,system,o={}){
 const sys=SYSTEMS[system]||SYSTEMS['column-grid'];
 const cls=FCK[o.concrete]?o.concrete:'C40/50',fck=FCK[cls];
 const sc=SIGMA_C(fck),Ec=WALL_STIFFNESS*ECM(fck),core=Math.max(4,fin(o.core,14));
 const slabDead=sys.slab.conc*GAMMA_RC+sys.slab.steel*9.81/1000;
 const q=(slabDead+Q_SDL+Q_IMPOSED)*1e3; // Pa
 const L=tw.levels,H=tw.H,lv=L.map(()=>({grav:{conc:0,rebar:0,steel:0},lat:{conc:0,rebar:0,steel:0}}));
 // floors and gravity
 let above=0;
 for(let i=L.length-1;i>=0;i--){
  const l=L[i],g=lv[i].grav;
  g.conc+=l.a*sys.slab.conc*RHO_C;g.rebar+=l.a*sys.slab.rebar;g.steel+=l.a*sys.slab.steel;
  above+=q*l.a;
  const vc=sys.grav.conc*above/sc*l.h;            // m³ of column/wall concrete
  g.conc+=vc*RHO_C;g.rebar+=vc*RHO_REBAR_COL*RHO_S;
  g.steel+=sys.grav.steel*above/SIGMA_S*l.h*RHO_S;
 }
 // lateral, each mechanism sized for strength then scaled for drift
 const governs=[];
 for(const m of sys.lat){
  const steel=m.mat==='steel',sig=steel?SIGMA_S:sc,E=steel?E_STEEL:Ec;
  const d=l=>ARM*(m.arm==='core'?core:l.width);
  let drift=0;for(const l of L)drift+=2*sig/(E*d(l))*(H-(l.z+l.h/2))*l.h;
  const k=Math.max(1,drift/(H/DRIFT));governs.push(k>1?'drift':'strength');
  L.forEach((l,i)=>{
   const A=2*m.share*l.M/(sig*d(l))*m.ineff*k,v=A*l.h,t=lv[i].lat;
   if(steel)t.steel+=v*RHO_S;else{t.conc+=v*RHO_C;t.rebar+=v*RHO_REBAR_WALL*RHO_S}
  });
 }
 const sum=(part,mat)=>lv.reduce((a,x)=>a+x[part][mat],0);
 const kg={};
 for(const part of ['grav','lat'])for(const mat of ['conc','rebar','steel'])kg[part+'_'+mat]=sum(part,mat);
 return {levels:lv,kg,governs:governs.includes('drift')?'drift':'strength'};
}

/* Carbon and cost of a material take-off, per the IStructE method. */
export function account(kg,o={}){
 const ec={conc:concreteECF(o.concrete,o.ggbs),rebar:rebarECF(o.rebarEAF),steel:sectionECF(o.steelEAF)};
 const km={conc:CONCRETE_KM,rebar:clamp(fin(o.km,300),0,20000),steel:clamp(fin(o.km,300),0,20000)};
 const wf={conc:WASTE.concrete,rebar:WASTE.rebar,steel:WASTE.steel};
 const rates={...DEFAULT_CTL.rates,...(o.rates||{})};
 const out={ecf:ec,carbon:{},a13:0,a4:0,a5:0,cost:0,byMat:{conc:0,rebar:0,steel:0},byPart:{grav:0,lat:0}};
 for(const part of ['grav','lat'])for(const mat of ['conc','rebar','steel']){
  const m=Math.max(0,fin(kg[part+'_'+mat]));
  const a13=m*ec[mat],a4=m*km[mat]*TEF_ROAD,a5=wf[mat]*(a13+a4),c=a13+a4+a5;
  out.a13+=a13;out.a4+=a4;out.a5+=a5;out.byMat[mat]+=c;out.byPart[part]+=c;
  out.cost+=mat==='conc'?m/RHO_C*fin(rates.conc):m*fin(mat==='rebar'?rates.rebar:rates.steel);
 }
 out.total=out.a13+out.a4+out.a5;
 return out;
}

/* Per-m² summary of one tower and system. */
export function summary(tw,system,o={}){
 const mt=materials(tw,system,o),k=mt.kg,G=tw.gross;
 const grav=k.grav_conc+k.grav_rebar+k.grav_steel,lat=k.lat_conc+k.lat_rebar+k.lat_steel;
 const steel=k.grav_rebar+k.grav_steel+k.lat_rebar+k.lat_steel;
 const ac=account(k,o);
 return {n:tw.n,H:tw.H,lambda:tw.lambda,gross:G,kg:k,levels:mt.levels,governs:mt.governs,
  gravM2:grav/G,latM2:lat/G,totalM2:(grav+lat)/G,steelM2:steel/G,
  tonnes:(grav+lat)/1000,concreteM3:(k.grav_conc+k.lat_conc)/RHO_C,
  carbonM2:ac.total/G,carbonT:ac.total/1000,costM2:ac.cost/G,cost:ac.cost,account:ac,band:scorsBand(ac.total/G)};
}

/* The what-if state: storeys and base width at equal gross floor area.
   A narrower plan of the same area needs more storeys: n' = n / f². */
export function whatIf(s,o={}){
 const n0=Math.round(clamp(fin(o.floors,s.floors),12,70)),f=clamp(fin(o.spanFactor,1),0.7,1.3);
 const n=Math.round(clamp(n0/(f*f),6,140));
 return {state:{...s,span:s.span*f,floors:n},floors:n,base:n0,f};
}

/* The whole read for the current controls. */
export function carbonRead(s,o={}){
 const ctl={...DEFAULT_CTL,...o,core:s.core},system=SYSTEMS[o.system]?o.system:(SYSTEMS[s.system]?s.system:'column-grid');
 const vb=clamp(fin(ctl.vb,30),10,60),w=whatIf(s,ctl);
 const tw=tower(w.state,w.floors,vb),here=summary(tw,system,ctl);
 const ref=summary(tower(w.state,40,vb),system,ctl);
 // the same floor area at the original base width, for the slenderness reading
 const same=w.f===1?here:summary(tower({...s,floors:w.base},w.base,vb),system,ctl);
 return {system,vb,f:w.f,state:w.state,here,ref,same,hereTw:tw,
  premiumKg:here.totalM2/ref.totalM2-1,premiumCarbon:here.carbonM2/ref.carbonM2-1,
  slimKg:here.totalM2/same.totalM2-1};
}

/* Premium-for-height curves: per-m² readings at a list of storey counts, for
   every system, at the what-if plan. */
export const CURVE_STOREYS=Array.from({length:50},(_,i)=>12+2*i); // 12…110
export function curves(s,o={},list=CURVE_STOREYS){
 const ctl={...DEFAULT_CTL,...o,core:s.core},vb=clamp(fin(ctl.vb,30),10,60),w=whatIf(s,ctl);
 const out={};
 for(const sys of SYSTEM_KEYS)out[sys]=[];
 for(const n of list){const tw=tower(w.state,n,vb);for(const sys of SYSTEM_KEYS){const r=summary(tw,sys,ctl);out[sys].push({n,steel:r.steelM2,total:r.totalM2,carbon:r.carbonM2})}}
 return out;
}

/* ── text ─────────────────────────────────────────────────────────────── */
export const CARBON_TEXT={
 en:{title:'Embodied carbon and the premium for height',
  lede:'Where the carbon sits: the frame, the reinforcement inside it and the steel beside it — each priced at its own factor, hauled to site, and charged again for waste.',
  run:'Storey {n} of {N} · {kg} kg/m² · {c} kgCO₂e/m²',
  metric:{steel:'Steel kg/m²',carbon:'kgCO₂e/m²'},metricLabel:'Chart reading',
  replay:'Grow again',hold:'Hold',
  ctl:{floors:'Storeys, what-if',floorsNote:'Local to this lab. The tower keeps {n} until applied.',
   slender:'Base width at equal floor area',slenderNote:'{p}% of the plan width · {n} storeys for the same area',
   system:'Structural system',conc:'Concrete class',ggbs:'Cement replaced by GGBS',ggbsNote:'{f} kgCO₂e/kg · IStructE points at 0, 25 and 70%, interpolated between',
   rebar:'Reinforcement, electric-arc share',steel:'Steel sections, electric-arc share',steelNote:'{f} kgCO₂e/kg · scrap content about {s}%',
   km:'Steel and rebar by road',kmNote:'Concrete fixed at 50 km, local. IStructE default for national supply: 300 km.',
   vb:'Basic wind velocity v_b',vbNote:'Terrain IV, city, as in the Wind tab.',
   rates:'Unit rates, illustrative USD',rConc:'Concrete per m³',rRebar:'Reinforcement per kg',rSteel:'Steel sections per kg',
   ratesNote:'Rates are local and must be supplied. These defaults only make the arithmetic visible.',
   apply:'Try on the tower',applyNote:'Sets the tower’s system and storeys; every tab follows.',applied:'The tower already has this system and these storeys.'},
  sys:{'column-grid':'Core + grid','outrigger':'Outrigger','diagrid':'Diagrid'},
  u:{kgm2:'kg/m²',co2m2:'kgCO₂e/m²',t:'t',tco2:'tCO₂e',usdm2:'USD/m²',m3:'m³',m:'m'},
  k:{kg:'Material, gravity / lateral / total',steel:'Steel incl. reinforcement',tonnes:'Structure, tonnes · concrete',carbon:'Upfront carbon A1–A5',carbonT:'Upfront carbon, total',stages:'A1–A3 / A4 / A5 waste',cost:'Structure cost per m² gross',costN:'Per m² rentable',capex:'Studio capex reserve, structure',scors:'SCORS band, superstructure only',premium:'Premium for height over 40 storeys',slim:'Premium for slenderness, same area',governs:'Lateral sizing governed by',lambda:'Height ÷ least base width'},
  governs:{strength:'strength',drift:'drift, H/500'},
  capexV:'{v} USD/m² · all-in, includes substructure',
  ledger:'Where the carbon is',byMat:'By material',byPart:'Gravity or wind',
  mat:{conc:'Concrete',rebar:'Reinforcement',steel:'Steel sections'},part:{grav:'Gravity: floors, columns',lat:'Lateral: wind'},
  scorsTitle:'SCORS rating · kgCO₂e/m² A1–A5 structure',
  verdict:{lat:'The wind sizes this structure: {p}% of its material resists overturning, not gravity. A wider lever arm, a stouter plan or fewer storeys bends the curve back.',
   grav:'Gravity still sizes most of this structure; the wind takes {p}%. The premium for height here is {q}% over a 40-storey tower of the same plan.'},
  chart:{x:'Storeys',ySteel:'Steel kg/m² gross',yCarbon:'kgCO₂e/m² gross, A1–A5 structure',limit:'studio limit 70',extrap:'Dashed beyond 70: extrapolated',hancock:'Hancock 100',empire:'Empire State 102',sears:'Sears 108',khan:'Khan, steel only',riba:'RIBA 2030 · 156',leti:'LETI 2030 · 228',same:'same area, original width'},
  elev:'Material per level · gravity grey · lateral amber',elevFoot:'H {h} m · 1:{l}',
  m:{aria:'Section-elevation of the tower with the carbon-bearing members cut, and the stages that turn them into carbon per square metre',
   total:'Total embodied carbon, A1–A5',
   gross:'gross floor area',
   class:'Concrete {cls}, {g}% GGBS',
   ground:'Grade: no foundations or substructure counted',
   byStage:'By stage',
   sA13:'A1–A3 product',sA4:'A4 transport',sA5:'A5 waste',
   scope:'B, C and D are not modelled: upfront carbon A1–A5 only',
   transport:'Road: concrete {c} km, steel and rebar {s} km, at {f} gCO₂e/kg/km',
   perkg:'kgCO₂e/kg'},
  assume:'Assumptions: floor slabs per m² — 250 mm flat slab with 25 kg/m² reinforcement (core + grid), 130 mm composite slab with 35 or 40 kg/m² steel framing (outrigger, diagrid); superimposed dead 2.5 kN/m²; imposed 2.5 kN/m² (EN 1991-1-1, B1); working stress 0.4·f_ck in concrete, 213 MPa in S355 steel; walls at 0.70·E_cm (ACI 318-19); reinforcement 2% in columns, 1% in walls; lever arm 0.9 of the core or the least plan width; an outrigger moves half the moment to the perimeter (40–60% is published); a diagrid uses 0.8 of a conventional perimeter frame (Hearst Tower), that frame 1.6 × ideal flanges. Steel quantities are calibrated so a 68 m square, 108-storey steel tower lands inside Khan’s 142–205 kg/m².',
  cannot:'Cannot claim: an order-of-magnitude scaling law, not a structural design and not a certified life-cycle assessment. No foundations or substructure (SCORS includes them, so the band shown flatters the tower), no transfer structures, no site activities A5a, no seismic design, no dynamic wind response. Carbon factors vary by country and supplier; use EPDs once the supply chain is known.',
  src:'Sources: IStructE, How to calculate embodied carbon, 2nd ed. 2022, Tables 2.3–2.6 (ICE V3, CARES, worldsteel; EAF/BOF bounds for sections from the UK row, global average 1.580) · Arnold, Cook, Cox, Gibbons & Orr, SCORS (bands read from Fig. 1; per m² GIA), The Structural Engineer 98(10) 2020 · Price & Myers carbon data · Khan, premium for height (Lehigh; Construction 1972; Britannica) · Hearst Tower steel (Foster + Partners via BD+C) · outrigger moment relief (Designing Buildings Wiki) · Foraboschi, Mercanzin & Trabucco, Energy and Buildings 68, 2014 · EN 1991-1-4 via the Wind tab · EN 1991-1-1 · EN 1992-1-1 Table 3.1 · ACI 318-19 Table 6.6.3.1.1.'},
 th:{title:'คาร์บอนแฝงและต้นทุนส่วนเพิ่มของความสูง',
  lede:'คาร์บอนอยู่ตรงไหน: โครงสร้าง เหล็กเสริมในโครง และเหล็กรูปพรรณที่อยู่ข้าง ๆ — แต่ละอย่างคิดด้วยตัวค่าของตัวเอง ขนมาที่ไซต์ แล้วคิดค่าของเสียอีกครั้ง',
  run:'ชั้น {n} จาก {N} · {kg} กก./ตร.ม. · {c} กก.CO₂e/ตร.ม.',
  metric:{steel:'เหล็ก กก./ตร.ม.',carbon:'กก.CO₂e/ตร.ม.'},metricLabel:'ค่าที่แสดงในกราฟ',
  replay:'ให้อาคารโตอีกครั้ง',hold:'หยุดไว้',
  ctl:{floors:'จำนวนชั้น (ทดลอง)',floorsNote:'ใช้เฉพาะในห้องทดลองนี้ อาคารยังคง {n} ชั้นจนกว่าจะกดนำไปใช้',
   slender:'ความกว้างฐานที่พื้นที่รวมเท่าเดิม',slenderNote:'{p}% ของความกว้างผัง · {n} ชั้นสำหรับพื้นที่เท่าเดิม',
   system:'ระบบโครงสร้าง',conc:'ชั้นคุณภาพคอนกรีต',ggbs:'สัดส่วนปูนซีเมนต์ที่แทนด้วย GGBS',ggbsNote:'{f} กก.CO₂e/กก. · IStructE ให้ค่าที่ 0, 25 และ 70% ระหว่างนั้นประมาณเชิงเส้น',
   rebar:'เหล็กเสริม สัดส่วนจากเตาอาร์กไฟฟ้า',steel:'เหล็กรูปพรรณ สัดส่วนจากเตาอาร์กไฟฟ้า',steelNote:'{f} กก.CO₂e/กก. · เศษเหล็กรีไซเคิลราว {s}%',
   km:'ระยะขนส่งเหล็กทางถนน',kmNote:'คอนกรีตกำหนดไว้ 50 กม. (ผลิตในพื้นที่) ค่าเริ่มต้นของ IStructE สำหรับการผลิตในประเทศคือ 300 กม.',
   vb:'ความเร็วลมพื้นฐาน v_b',vbNote:'ภูมิประเทศประเภท IV ใจกลางเมือง เช่นเดียวกับแท็บลม',
   rates:'ราคาต่อหน่วย (ตัวอย่าง, ดอลลาร์สหรัฐ)',rConc:'คอนกรีต ต่อ ลบ.ม.',rRebar:'เหล็กเสริม ต่อ กก.',rSteel:'เหล็กรูปพรรณ ต่อ กก.',
   ratesNote:'ราคาขึ้นกับท้องถิ่นและต้องป้อนเอง ค่าเริ่มต้นนี้มีไว้ให้เห็นการคำนวณเท่านั้น',
   apply:'ลองกับอาคารจริง',applyNote:'กำหนดระบบโครงสร้างและจำนวนชั้นให้อาคาร ทุกแท็บจะเปลี่ยนตาม',applied:'อาคารใช้ระบบและจำนวนชั้นนี้อยู่แล้ว'},
  sys:{'column-grid':'แกนกลาง + เสา','outrigger':'เอาท์ริกเกอร์','diagrid':'ไดอะกริด'},
  u:{kgm2:'กก./ตร.ม.',co2m2:'กก.CO₂e/ตร.ม.',t:'ตัน',tco2:'ตันCO₂e',usdm2:'ดอลลาร์/ตร.ม.',m3:'ลบ.ม.',m:'ม.'},
  k:{kg:'วัสดุ รับน้ำหนัก / รับแรงด้านข้าง / รวม',steel:'เหล็กรวมเหล็กเสริม',tonnes:'โครงสร้าง ตัน · คอนกรีต',carbon:'คาร์บอนเริ่มต้น A1–A5',carbonT:'คาร์บอนเริ่มต้น รวม',stages:'A1–A3 / A4 / A5 ของเสีย',cost:'ค่าโครงสร้างต่อ ตร.ม. พื้นที่รวม',costN:'ต่อ ตร.ม. พื้นที่ให้เช่า',capex:'งบลงทุนโครงสร้างของสตูดิโอ',scors:'ระดับ SCORS เฉพาะโครงสร้างเหนือดิน',premium:'ส่วนเพิ่มจากความสูง เทียบ 40 ชั้น',slim:'ส่วนเพิ่มจากความชะลูด พื้นที่เท่าเดิม',governs:'การออกแบบแรงด้านข้างควบคุมโดย',lambda:'ความสูง ÷ ความกว้างฐานด้านแคบสุด'},
  governs:{strength:'กำลัง',drift:'การเคลื่อนตัว H/500'},
  capexV:'{v} ดอลลาร์/ตร.ม. · รวมทุกอย่าง รวมโครงสร้างใต้ดิน',
  ledger:'คาร์บอนอยู่ที่ไหน',byMat:'แยกตามวัสดุ',byPart:'น้ำหนักหรือแรงลม',
  mat:{conc:'คอนกรีต',rebar:'เหล็กเสริม',steel:'เหล็กรูปพรรณ'},part:{grav:'รับน้ำหนัก: พื้น เสา',lat:'รับแรงด้านข้าง: ลม'},
  scorsTitle:'ระดับ SCORS · กก.CO₂e/ตร.ม. A1–A5 โครงสร้าง',
  verdict:{lat:'ลมเป็นตัวกำหนดขนาดโครงสร้างนี้ วัสดุ {p}% ใช้ต้านการพลิกคว่ำ ไม่ใช่รับน้ำหนัก ระยะแขนโมเมนต์ที่กว้างขึ้น ผังที่ป้อมขึ้น หรือจำนวนชั้นที่น้อยลง จะดัดเส้นกราฟกลับลงมา',
   grav:'น้ำหนักยังเป็นตัวกำหนดโครงสร้างส่วนใหญ่ ลมคิดเป็น {p}% ส่วนเพิ่มจากความสูงคือ {q}% เมื่อเทียบกับอาคาร 40 ชั้นที่ผังเดียวกัน'},
  chart:{x:'จำนวนชั้น',ySteel:'เหล็ก กก./ตร.ม. พื้นที่รวม',yCarbon:'กก.CO₂e/ตร.ม. พื้นที่รวม A1–A5 โครงสร้าง',limit:'ขีดจำกัดสตูดิโอ 70',extrap:'เส้นประเกิน 70 ชั้นเป็นการประมาณต่อ',hancock:'Hancock 100',empire:'Empire State 102',sears:'Sears 108',khan:'Khan เฉพาะเหล็ก',riba:'RIBA 2030 · 156',leti:'LETI 2030 · 228',same:'พื้นที่เท่าเดิม ความกว้างเดิม'},
  elev:'วัสดุต่อชั้น · รับน้ำหนักสีเทา · รับแรงด้านข้างสีอำพัน',elevFoot:'สูง {h} ม. · 1:{l}',
  m:{aria:'ภาคตัดแนวตั้งของอาคาร พร้อมชิ้นส่วนที่ให้คาร์บอนถูกตัด และขั้นตอนที่เปลี่ยนมันเป็นคาร์บอนต่อตารางเมตร',
   total:'คาร์บอนแฝงรวม A1–A5',
   gross:'พื้นที่รวม',
   class:'คอนกรีต {cls} ใช้ GGBS {g}%',
   ground:'ระดับดิน: ไม่มีฐานรากและโครงสร้างใต้ดินในการคิดนี้',
   byStage:'แยกตามขั้นตอน',
   sA13:'A1–A3 การผลิต',sA4:'A4 การขนส่ง',sA5:'A5 ของเสีย',
   scope:'B, C และ D ไม่ได้อยู่ในแบบจำลองนี้: คิดเฉพาะคาร์บอนเริ่มต้น A1–A5',
   transport:'ทางถนน: คอนกรีต {c} กม. เหล็กและเหล็กเสริม {s} กม. ที่ {f} กก.CO₂e/กก./กม.',
   perkg:'กก.CO₂e/กก.'},
  assume:'สมมติฐาน: พื้นต่อ ตร.ม. — พื้นไร้คาน 250 มม. เหล็กเสริม 25 กก./ตร.ม. (แกนกลาง + เสา) พื้นคอมโพสิต 130 มม. โครงเหล็ก 35 หรือ 40 กก./ตร.ม. (เอาท์ริกเกอร์ ไดอะกริด) น้ำหนักบรรทุกคงที่เพิ่มเติม 2.5 kN/ตร.ม. น้ำหนักบรรทุกจร 2.5 kN/ตร.ม. (EN 1991-1-1 B1) หน่วยแรงใช้งาน 0.4·f_ck สำหรับคอนกรีต 213 MPa สำหรับเหล็ก S355 ผนังใช้ 0.70·E_cm (ACI 318-19) เหล็กเสริม 2% ในเสา 1% ในผนัง ระยะแขนโมเมนต์ 0.9 ของแกนกลางหรือความกว้างผังด้านแคบสุด เอาท์ริกเกอร์ย้ายโมเมนต์ครึ่งหนึ่งไปที่เสารอบนอก (ข้อมูลที่เผยแพร่ 40–60%) ไดอะกริดใช้เหล็ก 0.8 เท่าของโครงรอบนอกแบบทั่วไป (Hearst Tower) และโครงแบบทั่วไปใช้ 1.6 เท่าของปีกในอุดมคติ ปริมาณเหล็กปรับเทียบให้อาคารเหล็กผังสี่เหลี่ยม 68 ม. สูง 108 ชั้น อยู่ในช่วง 142–205 กก./ตร.ม. ของ Khan',
  cannot:'สิ่งที่อ้างไม่ได้: เป็นกฎการปรับขนาดระดับลำดับขนาด ไม่ใช่การออกแบบโครงสร้าง และไม่ใช่การประเมินวัฏจักรชีวิตที่ได้รับการรับรอง ไม่รวมฐานรากและโครงสร้างใต้ดิน (SCORS รวมไว้ ระดับที่แสดงจึงดูดีกว่าความจริง) ไม่รวมโครงสร้างถ่ายแรง กิจกรรมในสถานที่ก่อสร้าง A5a การออกแบบต้านแผ่นดินไหว และการตอบสนองเชิงพลวัตต่อลม ค่าคาร์บอนแตกต่างตามประเทศและผู้ผลิต เมื่อทราบแหล่งวัสดุให้ใช้ EPD',
  src:'แหล่งอ้างอิง: IStructE, How to calculate embodied carbon ฉบับที่ 2 ปี 2022 ตาราง 2.3–2.6 (ICE V3, CARES, worldsteel; ค่าขอบเขต EAF/BOF ของเหล็กรูปพรรณจากแถวสหราชอาณาจักร ค่าเฉลี่ยโลก 1.580) · Arnold, Cook, Cox, Gibbons และ Orr, SCORS (ช่วงคะแนนอ่านจากรูปที่ 1 ต่อ ตร.ม. พื้นที่ภายในรวม), The Structural Engineer 98(10) 2020 · ข้อมูลคาร์บอนของ Price & Myers · Khan ส่วนเพิ่มของความสูง (Lehigh; Construction 1972; Britannica) · เหล็กของ Hearst Tower (Foster + Partners ผ่าน BD+C) · การลดโมเมนต์ด้วยเอาท์ริกเกอร์ (Designing Buildings Wiki) · Foraboschi, Mercanzin และ Trabucco, Energy and Buildings 68, 2014 · EN 1991-1-4 ผ่านแท็บลม · EN 1991-1-1 · EN 1992-1-1 ตาราง 3.1 · ACI 318-19 ตาราง 6.6.3.1.1'},
 zh:{title:'隐含碳与高度溢价',
  lede:'碳在哪里：混凝土框架、其中的钢筋、旁边的型钢——各按自身排放因子计价，运到工地，再加一次损耗。',
  run:'第 {n} 层 / 共 {N} 层 · {kg} 千克/平方米 · {c} 千克CO₂e/平方米',
  metric:{steel:'钢材 千克/平方米',carbon:'千克CO₂e/平方米'},metricLabel:'图表读数',
  replay:'重新生长',hold:'暂停',
  ctl:{floors:'层数（试算）',floorsNote:'仅在本实验室生效。塔楼保持 {n} 层，直到应用为止。',
   slender:'等建筑面积下的底部宽度',slenderNote:'平面宽度的 {p}% · 同样面积需 {n} 层',
   system:'结构体系',conc:'混凝土强度等级',ggbs:'矿渣粉（GGBS）取代水泥比例',ggbsNote:'{f} 千克CO₂e/千克 · IStructE 给出 0、25、70% 三点，其间线性插值',
   rebar:'钢筋：电弧炉比例',steel:'型钢：电弧炉比例',steelNote:'{f} 千克CO₂e/千克 · 废钢含量约 {s}%',
   km:'钢材公路运距',kmNote:'混凝土固定为 50 公里（本地生产）。IStructE 国内供应默认值为 300 公里。',
   vb:'基本风速 v_b',vbNote:'IV 类地貌（城市），与“风”页默认值一致。',
   rates:'单价（示意，美元）',rConc:'混凝土 每立方米',rRebar:'钢筋 每千克',rSteel:'型钢 每千克',
   ratesNote:'单价因地而异，须自行填写。默认值只为让计算过程可见。',
   apply:'应用到塔楼',applyNote:'设定塔楼的结构体系和层数，所有页面随之更新。',applied:'塔楼已是此体系和层数。'},
  sys:{'column-grid':'核心筒 + 柱网','outrigger':'伸臂桁架','diagrid':'斜交网格'},
  u:{kgm2:'千克/平方米',co2m2:'千克CO₂e/平方米',t:'吨',tco2:'吨CO₂e',usdm2:'美元/平方米',m3:'立方米',m:'米'},
  k:{kg:'材料：竖向 / 抗侧 / 合计',steel:'钢材（含钢筋）',tonnes:'结构 吨 · 混凝土',carbon:'前期碳排放 A1–A5',carbonT:'前期碳排放 合计',stages:'A1–A3 / A4 / A5 损耗',cost:'每平方米建筑面积结构造价',costN:'每平方米可租面积',capex:'工作室结构资本支出',scors:'SCORS 等级（仅上部结构）',premium:'相对 40 层的高度溢价',slim:'同面积下的细长溢价',governs:'抗侧设计控制因素',lambda:'高度 ÷ 底部最窄宽度'},
  governs:{strength:'强度',drift:'位移 H/500'},
  capexV:'{v} 美元/平方米 · 全包，含地下结构',
  ledger:'碳排放在哪里',byMat:'按材料',byPart:'竖向荷载或风',
  mat:{conc:'混凝土',rebar:'钢筋',steel:'型钢'},part:{grav:'竖向：楼板、柱',lat:'抗侧：风'},
  scorsTitle:'SCORS 等级 · 千克CO₂e/平方米 A1–A5 结构',
  verdict:{lat:'风决定了这个结构的用量：{p}% 的材料用于抵抗倾覆，而非承担重力。更宽的力臂、更粗壮的平面或更少的层数，都能把曲线压回来。',
   grav:'重力仍决定大部分结构用量，风占 {p}%。与同一平面的 40 层塔楼相比，高度溢价为 {q}%。'},
  chart:{x:'层数',ySteel:'钢材 千克/平方米建筑面积',yCarbon:'千克CO₂e/平方米建筑面积，A1–A5 结构',limit:'工作室上限 70',extrap:'70 层以上虚线为外推',hancock:'汉考克 100',empire:'帝国大厦 102',sears:'西尔斯 108',khan:'Khan，仅钢材',riba:'RIBA 2030 · 156',leti:'LETI 2030 · 228',same:'同面积，原宽度'},
  elev:'每层材料 · 竖向灰色 · 抗侧琥珀色',elevFoot:'高 {h} 米 · 1:{l}',
  m:{aria:'塔楼竖向剖面，切出承碳构件，以及把构件换算成每平方米碳排的阶段',
   total:'前期碳排合计 A1–A5',
   gross:'建筑面积',
   class:'混凝土 {cls}，矿渣粉 {g}%',
   ground:'地面：本次计算不含基础与地下结构',
   byStage:'按阶段',
   sA13:'A1–A3 生产',sA4:'A4 运输',sA5:'A5 损耗',
   scope:'B、C、D 阶段未建模：仅计算前期碳排 A1–A5',
   transport:'公路：混凝土 {c} 公里，钢筋与型钢 {s} 公里，{f} 克CO₂e/千克/公里',
   perkg:'千克CO₂e/千克'},
  assume:'假定：每平方米楼板——250 毫米无梁楼板配筋 25 千克/平方米（核心筒 + 柱网）；130 毫米组合楼板配钢梁 35 或 40 千克/平方米（伸臂桁架、斜交网格）；附加恒载 2.5 kN/平方米；活载 2.5 kN/平方米（EN 1991-1-1，B1 类）；工作应力混凝土取 0.4·f_ck，S355 钢取 213 MPa；墙体刚度取 0.70·E_cm（ACI 318-19）；柱配筋率 2%，墙 1%；力臂取核心筒或平面最窄宽度的 0.9；伸臂桁架将一半力矩转移到外围（文献为 40–60%）；斜交网格用钢为常规外框的 0.8（赫斯特大厦），常规外框为理想翼缘的 1.6 倍。钢材用量经校准，使 68 米见方、108 层的钢结构塔楼落在 Khan 的 142–205 千克/平方米范围内。',
  cannot:'不能据此断言：这是数量级的比例关系，不是结构设计，也不是经认证的生命周期评估。不含基础和地下结构（SCORS 包含这些，因此所示等级偏乐观），不含转换结构、现场施工活动 A5a、抗震设计和风致动力响应。碳排放因子因国家和供应商而异；供应链明确后应使用 EPD。',
  src:'来源：IStructE《How to calculate embodied carbon》第 2 版，2022，表 2.3–2.6（ICE V3、CARES、worldsteel；型钢 EAF/BOF 取值来自英国行，全球平均 1.580）· Arnold、Cook、Cox、Gibbons、Orr，SCORS（等级取自图 1；按建筑内部面积计），The Structural Engineer 98(10)，2020 · Price & Myers 碳数据 · Khan 高度溢价（理海大学；Construction 1972；大英百科）· 赫斯特大厦（Hearst Tower）用钢（Foster + Partners，经 BD+C）· 伸臂桁架力矩折减（Designing Buildings Wiki）· Foraboschi、Mercanzin、Trabucco，Energy and Buildings 68，2014 · EN 1991-1-4（经“风”页）· EN 1991-1-1 · EN 1992-1-1 表 3.1 · ACI 318-19 表 6.6.3.1.1'}
};

/* ── DOM ──────────────────────────────────────────────────────────────── */
const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const ACC='#f59e0b',INK='#e6edf3',DIM='#a2aca9',GREY='#5b6461',DARK='#111416';
const ctl={...DEFAULT_CTL,rates:{...DEFAULT_CTL.rates}};
let metric='carbon',held=false;
let ui=null,last=null,raf=0,anim=null,curveCache={key:'',data:null},pick=null,seen={floors:null,system:null};

function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=(/(?:^|-)src$/.test(cls||'')?text:shown(text));return n}
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const loc=lang=>lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
function fmt(v,d=0){return Number.isFinite(v)?v.toLocaleString(loc(ui?ui.lang:'en'),{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
const pct=v=>(v>=0?'+':'')+fmt(v*100)+'%';

function build(host,lang){
 const c=CARBON_TEXT[lang]||CARBON_TEXT.en;
 if(ui&&ui.ro)ui.ro.disconnect();
 host.replaceChildren();
 const root=el('section','cb');
 const head=el('h2','cb-title',c.title);
 const views=el('div','cb-views');
 const elevC=el('canvas','cb-canvas cb-elev'),chartC=el('canvas','cb-canvas cb-chart');
 for(const cv of [elevC,chartC])cv.setAttribute('role','img');
 views.append(elevC,chartC);
 const run=el('p','cb-run');run.setAttribute('aria-live','off');
 const bar=el('div','cb-bar');
 const mseg=el('div','cb-seg');mseg.setAttribute('role','group');mseg.setAttribute('aria-label',c.metricLabel);
 const metricB=['carbon','steel'].map(k=>{const b=el('button',null,c.metric[k]);b.type='button';b.onclick=()=>{metric=k;refresh(false)};mseg.append(b);return [k,b]});
 const holdB=el('button','cb-toggle');holdB.type='button';holdB.onclick=()=>{held=!held;if(!held)restart();else{stop();drawAll()}sync()};
 bar.append(mseg,holdB);
 // The method, drawn. The prose that used to stand here is now the caption
 // under the sheet, and the sheet carries the numbers the paragraph only
 // promised. The figure is a <figure> so the caption is a real <figcaption>,
 // which is what a screen reader and a printer both expect.
 const method=el('figure','cb-method');
 const methodSheet=el('div','cb-sheet');
 method.append(methodSheet,el('figcaption','cb-caption',c.lede));
 const ctls=el('div','cb-controls');
 const field=()=>{const w=el('div','cb-field');ctls.append(w);return w};
 const range=(key,label,min,max,step,note,on,later)=>{
  const u=({km:'km',vb:'m/s'})[key]||'',w=field(),id='cb-'+key,lab=el('label','cb-label',label),out=el('output','cb-out');lab.htmlFor=id;out.htmlFor=id;
  const inp=el('input');inp.type='range';inp.id=id;inp.min=toDisplay(min,u);inp.max=toDisplay(max,u);inp.step=toDisplay(step,u);
  const top=el('div','cb-fieldhead');top.append(lab,out);w.append(top,inp);
  let n=null;if(note!=null){n=el('p','cb-hint',note);w.append(n)}
  inp.oninput=()=>on(fromDisplay(+inp.value,u));if(later)inp.onchange=()=>later(fromDisplay(+inp.value,u));
  return {inp,out,note:n};
 };
 const seg=(label,keys,names,on)=>{
  const w=field(),top=el('div','cb-fieldhead'),s=el('div','cb-seg');top.append(el('span','cb-label',label));s.setAttribute('role','group');s.setAttribute('aria-label',label);
  const bs=keys.map(k=>{const b=el('button',null,names[k]||k);b.type='button';b.onclick=()=>on(k);s.append(b);return [k,b]});
  w.append(top,s);return {bs,w};
 };
 const floors=range('floors',c.ctl.floors,12,70,1,'',v=>{ctl.floors=v;refresh(true)});
 const slender=range('slender',c.ctl.slender,75,125,1,'',v=>{ctl.spanFactor=v/100;refresh(true,true)},()=>refresh(true));
 const sys=seg(c.ctl.system,SYSTEM_KEYS,c.sys,k=>{ctl.system=k;refresh(true)});
 const applyB=el('button','cb-apply',c.ctl.apply);applyB.type='button';
 applyB.onclick=()=>{if(pick&&ui&&ui.r)pick({system:ui.r.system,floors:whatIf(last.state,ctl).base})};
 const applyN=el('p','cb-hint',c.ctl.applyNote);sys.w.append(applyB,applyN);
 const conc=seg(c.ctl.conc,CONCRETE_CLASSES,{},k=>{ctl.concrete=k;refresh(false)});
 const ggbs=range('ggbs',c.ctl.ggbs,0,70,1,'',v=>{ctl.ggbs=v;refresh(false)});
 const rebar=range('rebar',c.ctl.rebar,0,100,1,'',v=>{ctl.rebarEAF=v;refresh(false)});
 const steel=range('steel',c.ctl.steel,0,100,1,'',v=>{ctl.steelEAF=v;refresh(false)});
 const km=range('km',c.ctl.km,0,2000,10,c.ctl.kmNote,v=>{ctl.km=v;refresh(false)});
 const vb=range('vb',c.ctl.vb,15,55,1,c.ctl.vbNote,v=>{ctl.vb=v;refresh(true,true)},()=>refresh(true));
 const rw=field();rw.classList.add('cb-rates');
 rw.append(el('span','cb-label',getPreferences().currency==='USD'?c.ctl.rates:c.ctl.rates.replace(/USD|ดอลลาร์สหรัฐ|美元/g,getPreferences().currency)));
 const rateIn={};
 for(const [k,lab] of [['conc',c.ctl.rConc],['rebar',c.ctl.rRebar],['steel',c.ctl.rSteel]]){
  const row=el('div','cb-rate'),id='cb-rate-'+k,u=k==='conc'?'USD/m³':'USD/kg',l=el('label',null,getPreferences().currency==='USD'&&getPreferences().units==='metric'?lab:c.mat[k]+' · '+unitLabel(u)),inp=el('input');l.htmlFor=id;inp.id=id;inp.type='number';inp.min='0';inp.step=toDisplay(k==='conc'?5:0.1,u);inp.inputMode='decimal';
  inp.oninput=()=>{const v=inp.valueAsNumber;if(Number.isFinite(v)&&v>=0){ctl.rates[k]=fromDisplay(v,u);refresh(false)}};
  row.append(l,inp);rw.append(row);rateIn[k]=inp;
 }
 rw.append(el('p','cb-hint',c.ctl.ratesNote));
 const verdict=el('p','cb-verdict');
 const dl=el('dl','cb-facts'),rows={};
 for(const k of ['kg','steel','tonnes','carbon','carbonT','stages','cost','costN','capex','scors','premium','slim','governs','lambda']){const d=el('div');const dd=el('dd');d.append(el('dt',null,c.k[k]),dd);dl.append(d);rows[k]=dd}
 const ledT=el('h3','cb-sub',c.ledger);
 const ledger=el('div','cb-ledger'),bars={};
 for(const [grp,keys,names] of [['byMat',['conc','rebar','steel'],c.mat],['byPart',['grav','lat'],c.part]]){
  const g=el('div','cb-group');g.append(el('p','cb-gname',c[grp]));
  for(const k of keys){const r=el('div','cb-row'+(k==='lat'?' cb-lat':'')),tr=el('span','cb-track'),b=el('span','cb-barfill'),v=el('span','cb-val');tr.append(b);r.append(el('span','cb-name',names[k]),tr,v);g.append(r);bars[k]={b,v}}
  ledger.append(g);
 }
 const scT=el('h3','cb-sub',c.scorsTitle),sc=el('ol','cb-scors'),scItems=[];
 let lo=0;for(const [edge,band] of SCORS){const li=el('li');li.append(el('span','cb-band',band),el('span','cb-edge',Number.isFinite(edge)?fmt(lo)+'–'+fmt(edge):'≥ '+fmt(lo)));sc.append(li);scItems.push([band,li]);lo=edge}
 const assume=el('p','cb-prose',c.assume),cannot=el('p','cb-prose cb-limits',c.cannot),src=el('p','cb-src',c.src);
 root.append(head,views,run,bar,method,ctls,verdict,dl,ledT,ledger,scT,sc,assume,cannot,src);
 host.append(root);
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>{size();drawAll()}):null;
 if(ro){ro.observe(elevC);ro.observe(chartC)}
 ui={host,lang,c,elevC,chartC,run,metricB,holdB,floors,slender,sys,applyB,applyN,conc,ggbs,rebar,steel,km,vb,rateIn,verdict,rows,bars,scItems,ro,methodSheet,svgN:0,font:'12px monospace'};
 // Thai and Chinese labels use the sans stack: the mono face has no Thai or
 // CJK glyphs and the fallback can be a looped Thai face.
 try{const f=getComputedStyle(host).getPropertyValue(lang==='en'?'--mono':'--sans').trim();if(f)ui.font='12px '+f}catch{}
 size();
}

function size(){
 if(!ui)return;const dpr=Math.min(3,globalThis.devicePixelRatio||1);
 for(const cv of [ui.elevC,ui.chartC]){const w=Math.max(1,Math.round(cv.clientWidth)),h=Math.max(1,Math.round(cv.clientHeight));if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}cv._w=w;cv._h=h;cv._dpr=dpr}
}

function sync(){
 if(!ui)return;const c=ui.c;
 for(const [k,b] of ui.metricB)b.setAttribute('aria-pressed',String(metric===k));
 ui.holdB.textContent=shown(held?c.replay:c.hold);
 ui.holdB.setAttribute('aria-pressed',String(held));
}

/* Recompute the read. geometry: restart the growth; light: skip the curves
   (they are recomputed when a dragged slider is released). */
/* The method sheet, repainted from the reading in hand. The drawing is not a
   picture of an idea: it is the same accounting the ledger shows, cut. */
function paintMethod(h,tw,system){
 if(!ui||!ui.methodSheet||!h)return;
 try{ui.methodSheet.innerHTML=carbonMethodSVG({h,tower:tw,system,options:ctl},{lang:ui.lang});}catch{}
}

function refresh(geometry,light){
 if(!ui||!last)return;
 const {state,metrics}=last,c=ui.c;
 let r;try{r=carbonRead(state,ctl)}catch{return}
 ui.r=r;
 const w=whatIf(state,ctl);
 const ckey=[w.state.span,w.state.family,w.state.aspect,w.state.taper,w.state.twist,w.state.height,w.state.program,w.state.garden,w.state.core,ctl.vb].join('|');
 const fkey=ckey+'|'+[ctl.concrete,ctl.ggbs,ctl.rebarEAF,ctl.steelEAF,ctl.km].join('|');
 if(!light&&curveCache.key!==fkey){try{curveCache={key:fkey,data:curves(state,ctl)}}catch{curveCache={key:'',data:null}}}
 ui.floors.inp.value=w.base;ui.floors.out.textContent=shown(fmt(w.base));
 ui.floors.note.textContent=shown(fill(c.ctl.floorsNote,{n:fmt(state.floors)}));
 ui.slender.inp.value=Math.round(ctl.spanFactor*100);ui.slender.out.textContent=shown(fmt(ctl.spanFactor*100)+'%');
 ui.slender.note.textContent=shown(fill(c.ctl.slenderNote,{p:fmt(ctl.spanFactor*100),n:fmt(w.floors)}));
 for(const [k,b] of ui.sys.bs)b.setAttribute('aria-pressed',String(r.system===k));
 const same=state.system===r.system&&state.floors===w.base;
 ui.applyB.disabled=!pick||same;ui.applyN.textContent=shown(same?c.ctl.applied:c.ctl.applyNote);
 for(const [k,b] of ui.conc.bs)b.setAttribute('aria-pressed',String(ctl.concrete===k));
 const ec=r.here.account.ecf;
 ui.ggbs.inp.value=ctl.ggbs;ui.ggbs.out.textContent=shown(fmt(ctl.ggbs)+'%');ui.ggbs.note.textContent=shown(fill(c.ctl.ggbsNote,{f:fmt(ec.conc,3)}));
 ui.rebar.inp.value=ctl.rebarEAF;ui.rebar.out.textContent=shown(fmt(ctl.rebarEAF)+'%');ui.rebar.note.textContent=shown(fill(c.ctl.steelNote,{f:fmt(ec.rebar,2),s:fmt(scrapShare(ctl.rebarEAF)*100)}));
 ui.steel.inp.value=ctl.steelEAF;ui.steel.out.textContent=shown(fmt(ctl.steelEAF)+'%');ui.steel.note.textContent=shown(fill(c.ctl.steelNote,{f:fmt(ec.steel,2),s:fmt(scrapShare(ctl.steelEAF)*100)}));
 ui.km.inp.value=toDisplay(ctl.km,'km');ui.km.out.textContent=shown(fmt(ctl.km)+' km');
 ui.vb.inp.value=toDisplay(ctl.vb,'m/s');ui.vb.out.textContent=shown(fmt(ctl.vb)+' m/s');
 for(const k of ['conc','rebar','steel'])if(document.activeElement!==ui.rateIn[k])ui.rateIn[k].value=String(toDisplay(ctl.rates[k],k==='conc'?'USD/m³':'USD/kg'));
 const h=r.here,R=ui.rows,u=c.u;
 paintMethod(r.here,r.hereTw,r.system);
 R.kg.textContent=shown(fmt(h.gravM2)+' / '+fmt(h.latM2)+' / '+fmt(h.totalM2)+' '+u.kgm2);
 R.steel.textContent=shown(fmt(h.steelM2)+' '+u.kgm2);
 R.tonnes.textContent=shown(fmt(h.tonnes)+' '+u.t+' · '+fmt(h.concreteM3)+' '+u.m3);
 R.carbon.textContent=shown(fmt(h.carbonM2)+' '+u.co2m2);
 R.carbonT.textContent=shown(fmt(h.carbonT)+' '+u.tco2);
 const a=h.account,G=h.gross;
 R.stages.textContent=shown(fmt(a.a13/G)+' / '+fmt(a.a4/G,1)+' / '+fmt(a.a5/G,1)+' '+u.co2m2);
 R.cost.textContent=shown(fmt(h.costM2)+' '+u.usdm2);
 const nla=metrics&&metrics.gross>0?metrics.rentable/metrics.gross:NaN;
 R.costN.textContent=shown(Number.isFinite(nla)&&nla>0?fmt(h.costM2/nla)+' '+u.usdm2:'—');
 R.capex.textContent=shown(metrics&&metrics.gross>0?fill(c.capexV,{v:fmt(metrics.capexStructure/metrics.gross)}):'—');
 R.scors.textContent=shown(h.band+' · '+fmt(h.carbonM2)+' '+u.co2m2);
 R.premium.textContent=shown(pct(r.premiumKg)+' '+unitLabel(u.kgm2)+' · '+pct(r.premiumCarbon)+' CO₂e');
 R.slim.textContent=shown(r.f===1?'—':pct(r.slimKg)+' '+unitLabel(u.kgm2)+' · '+fmt(toDisplay(r.same.totalM2,'kg/m²'))+' → '+fmt(toDisplay(h.totalM2,'kg/m²')));
 R.governs.textContent=shown(c.governs[h.governs]);
 R.lambda.textContent=shown('1:'+fmt(h.lambda,1)+' · '+fmt(h.H)+' '+u.m);
 const latShare=h.latM2/Math.max(1e-9,h.totalM2);
 ui.verdict.textContent=shown(fill(latShare>0.5?c.verdict.lat:c.verdict.grav,{p:fmt(latShare*100),q:fmt(r.premiumKg*100)}));
 ui.verdict.classList.toggle('cb-flag',latShare>0.5);
 const tot=Math.max(1e-9,a.total);
 for(const k of ['conc','rebar','steel']){ui.bars[k].b.style.width=(100*a.byMat[k]/tot).toFixed(1)+'%';ui.bars[k].v.textContent=shown(fmt(a.byMat[k]/G)+' '+u.co2m2+' · '+fmt(100*a.byMat[k]/tot)+'%')}
 for(const k of ['grav','lat']){ui.bars[k].b.style.width=(100*a.byPart[k]/tot).toFixed(1)+'%';ui.bars[k].v.textContent=shown(fmt(a.byPart[k]/G)+' '+u.co2m2+' · '+fmt(100*a.byPart[k]/tot)+'%')}
 for(const [band,li] of ui.scItems)li.classList.toggle('cb-on',band===h.band);
 ui.elevC.setAttribute('aria-label',c.elev+'. '+fill(c.elevFoot,{h:fmt(h.H),l:fmt(h.lambda,1)}));
 ui.chartC.setAttribute('aria-label',(metric==='steel'?c.chart.ySteel:c.chart.yCarbon)+'. '+c.chart.x+' '+fmt(h.n)+': '+(metric==='steel'?fmt(h.steelM2)+' '+u.kgm2:fmt(h.carbonM2)+' '+u.co2m2));
 const target=h.n;
 if(!anim||geometry||anim.N!==target)restart();
 else{anim.N=target;drawAll()}
 sync();
}

/* ── animation: the tower grows floor by floor ─────────────────────────── */
const SPEED=14,HOLD=3.5;
function restart(){
 if(!ui||!ui.r)return;
 const N=ui.r.here.n,start=Math.min(12,N);
 anim={g:reduced()||held?N:start,N,start,hold:0,done:reduced()||held};
 drawAll();if(!anim.done)go();
 sync();
}
function at(n){
 const r=ui.r,w=whatIf(last.state,ctl);
 try{return summary(tower(w.state,n,r.vb),r.system,{...ctl,core:last.state.core})}catch{return null}
}
function step(dt){
 if(!anim||held)return;
 if(!anim.done){anim.g+=SPEED*dt;if(anim.g>=anim.N){anim.g=anim.N;anim.done=true;anim.hold=0;sync()}}
 else if(!held){anim.hold+=dt;if(anim.hold>HOLD){anim.g=anim.start;anim.done=false;sync()}}
}
/* Split a ' · ' joined label into lines that fit maxW. */
function wrap(x,text,maxW){const parts=text.split(' · '),out=[];let cur='';for(const p of parts){const t=cur?cur+' · '+p:p;if(cur&&x.measureText(t).width>maxW){out.push(cur);cur=p}else cur=t}if(cur)out.push(cur);return out}
function ctx2d(cv){const x=cv.getContext&&displayContext(cv.getContext('2d'),displayLang);if(!x)return null;x.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);return x}

function drawAll(){
 if(!ui||!ui.r||!anim||!ui.elevC.isConnected)return;
 try{
  const n=Math.max(1,Math.floor(anim.g)),now=n===anim.N?ui.r.here:at(n)||ui.r.here;
  const c=ui.c;
  // The sheet is repainted as the tower grows, but only when the storey count
  // actually changes: rebuilding a sheet on every frame is a waste of a frame.
  if(ui.svgN!==now.n){
   ui.svgN=now.n;
   const twn=now===ui.r.here?ui.r.hereTw:tower(whatIf(last.state,ctl).state,now.n,ui.r.vb);
   paintMethod(now,twn,ui.r.system);
  }
  ui.run.textContent=shown(fill(c.run,{n:fmt(now.n),N:fmt(anim.N),kg:fmt(now.totalM2),c:fmt(now.carbonM2)}));
  drawElev(now);drawChart(now);
 }catch{}
}

function drawElev(now){
 const cv=ui.elevC,x=ctx2d(cv);if(!x)return;const c=ui.c,final=ui.r.here;
 const W=cv._w||300,Hh=cv._h||300;
 x.fillStyle=DARK;x.fillRect(0,0,W,Hh);
 x.font=ui.font;x.textBaseline='middle';x.lineWidth=1;
 const top=28+15*(wrap(x,c.elev,W-16).length-1),bot=Hh-26,zpx=(bot-top)/Math.max(1,final.H);
 const ws=whatIf(last.state,ctl).state,tw=tower(ws,now.n,ui.r.vb),L=tw.levels,fl=tower(ws,final.n,ui.r.vb).levels;
 const bmax=Math.max(1,...fl.map(l=>l.width));
 const tw0=Math.min(W*0.3,Math.max(24,bmax*zpx)),scale=tw0/bmax,cx=10+tw0/2;
 x.strokeStyle=GREY;x.beginPath();x.moveTo(6,bot+0.5);x.lineTo(W-6,bot+0.5);x.stroke();
 // bars: material per metre of height, banded so each band is at least 3 px
 const x0=10+tw0+12,avail=Math.max(20,W-x0-10);
 const band=Math.max(1,Math.ceil(3/Math.max(0.01,(final.H/Math.max(1,L.length))*zpx)));
 const bands=(lv,LL)=>{const out=[];for(let i=0;i<LL.length;i+=band){let g=0,l=0,h=0;for(let j=i;j<Math.min(LL.length,i+band);j++){const m=lv[j];g+=m.grav.conc+m.grav.rebar+m.grav.steel;l+=m.lat.conc+m.lat.rebar+m.lat.steel;h+=LL[j].h}out.push({z:LL[i].z,h,g:g/h,l:l/h})}return out};
 const maxRate=Math.max(1e-9,...bands(final.levels,fl).map(b=>b.g+b.l));
 for(const b of bands(now.levels,L)){
  const y=bot-(b.z+b.h)*zpx,hh=Math.max(1,b.h*zpx-1),lg=avail*b.g/maxRate,ll=avail*b.l/maxRate;
  x.fillStyle=GREY;x.fillRect(x0,y,Math.min(avail,lg),hh);
  x.fillStyle=ACC;x.fillRect(x0+Math.min(avail,lg),y,Math.max(0,Math.min(avail-lg,ll)),hh);
 }
 // the tower, level by level, to true proportion
 x.strokeStyle=DIM;x.globalAlpha=0.5;
 for(const l of L){const y=Math.round(bot-l.z*zpx)+0.5,hw=l.width*scale/2;x.beginPath();x.moveTo(cx-hw,y);x.lineTo(cx+hw,y);x.stroke()}
 x.globalAlpha=1;x.strokeStyle=INK;x.beginPath();
 x.moveTo(cx-L[0].width*scale/2,bot);for(const l of L)x.lineTo(cx-l.width*scale/2,bot-(l.z+l.h)*zpx);
 const t=L[L.length-1];x.lineTo(cx+t.width*scale/2,bot-(t.z+t.h)*zpx);
 for(let i=L.length-1;i>=0;i--)x.lineTo(cx+L[i].width*scale/2,bot-L[i].z*zpx);x.closePath();x.stroke();
 x.fillStyle=DIM;wrap(x,c.elev,W-16).forEach((t,i)=>x.fillText(t,8,13+15*i));
 x.fillText(fill(c.elevFoot,{h:fmt(tw.H),l:fmt(tw.lambda,1)}),8,Hh-12);
}

const NICE=[50,100,150,200,250,300,400,500,600,800,1000,1500,2000,3000];
function drawChart(now){
 const cv=ui.chartC,x=ctx2d(cv);if(!x)return;const c=ui.c,data=curveCache.data;
 const W=cv._w||300,Hh=cv._h||300;
 x.fillStyle=DARK;x.fillRect(0,0,W,Hh);x.font=ui.font;x.textBaseline='middle';x.lineWidth=1;
 if(!data)return;
 const key=metric==='steel'?'steel':'carbon';
 const foot=wrap(x,metric==='steel'?c.chart.x+' · '+c.chart.khan+' · '+c.chart.extrap:c.chart.x+' · '+c.chart.extrap,W-16);
 const head=wrap(x,(metric==='steel'?c.chart.ySteel.replace(c.u.kgm2,unitLabel(c.u.kgm2)):c.chart.yCarbon.replace(c.u.co2m2,unitLabel(c.u.co2m2))),W-16);
 const L=46,Rr=W-12,T=22+15*head.length,B=Hh-24-15*foot.length,X=n=>L+(Rr-L)*(n-10)/100;
 let ymax=0;for(const s of SYSTEM_KEYS)for(const p of data[s])if(p.n<=70)ymax=Math.max(ymax,p[key]);
 ymax=Math.max(ymax,metric==='steel'?220:420,now[metric==='steel'?'steelM2':'carbonM2']*1.1);
 const step=NICE.find(v=>ymax/v<=5)||NICE[NICE.length-1],top=Math.ceil(ymax/step)*step,Y=v=>B-(B-T)*Math.min(v,top)/top;
 // grid
 x.fillStyle=DIM;x.strokeStyle=GREY;
 for(let v=0;v<=top+1e-9;v+=step){const y=Math.round(Y(v))+0.5;x.globalAlpha=v?0.45:1;x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke();x.globalAlpha=1;x.textAlign='right';x.fillText(fmt(toDisplay(v,metric==='steel'?'kg/m²':'kgCO₂e/m²')),L-6,y)}
 x.textAlign='center';for(const n of [20,40,60,80,100])x.fillText(String(n),X(n),B+12);
 x.textAlign='left';head.forEach((t,i)=>x.fillText(t,8,12+15*i));foot.forEach((t,i)=>x.fillText(t,8,Hh-8-15*(foot.length-1-i)));
 // studio limit
 x.setLineDash([2,4]);x.strokeStyle=GREY;x.beginPath();x.moveTo(Math.round(X(70))+0.5,T);x.lineTo(Math.round(X(70))+0.5,B);x.stroke();x.setLineDash([]);
 // references
 x.save();x.beginPath();x.rect(L,T-4,Rr-L,B-T+4);x.clip();
 if(metric==='steel'){
  x.strokeStyle=INK;x.fillStyle=INK;
  for(const p of REFERENCE_STEEL){const px=X(p.storeys),py=Y(p.kg);x.beginPath();x.moveTo(px-4,py-4);x.lineTo(px+4,py+4);x.moveTo(px+4,py-4);x.lineTo(px-4,py+4);x.stroke()}
 }else{
  x.strokeStyle=DIM;x.setLineDash([4,3]);
  for(const t of TARGETS){const y=Math.round(Y(t.value))+0.5;x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke()}
  x.setLineDash([]);
 }
 // curves: faint whole, bright up to the growing storey; dashed past 70
 const cur=ui.r.system,g=anim.g;
 const line=(pts,upto,dash)=>{x.beginPath();let on=false;for(const p of pts){if(p.n>upto)break;const X1=X(p.n),Y1=Y(p[key]);on?x.lineTo(X1,Y1):x.moveTo(X1,Y1);on=true}x.setLineDash(dash);x.stroke();x.setLineDash([])};
 for(const s of SYSTEM_KEYS){
  const pts=data[s],mine=s===cur,lo=pts.filter(p=>p.n<=70),hi=pts.filter(p=>p.n>=70);
  x.strokeStyle=mine?INK:DIM;x.globalAlpha=0.25;x.lineWidth=1;line(lo,999,[]);line(hi,999,[3,3]);
  x.globalAlpha=1;x.lineWidth=mine?2:1;line(lo,g,[]);if(g>70)line(hi,g,[3,3]);
 }
 x.lineWidth=1;x.restore();
 // the slimmer tower's original-width twin: hollow mark
 const r=ui.r;
 if(r.f!==1){const v=metric==='steel'?r.same.steelM2:r.same.carbonM2;x.strokeStyle=ACC;x.lineWidth=1.5;x.strokeRect(X(r.same.n)-4,Y(v)-4,8,8);x.lineWidth=1}
 // this tower, as it grows
 const v=metric==='steel'?now.steelM2:now.carbonM2,px=X(Math.min(110,now.n)),py=Y(v);
 x.fillStyle=ACC;x.fillRect(px-4,py-4,8,8);
 // Labels are placed one by one; a label that would overlap one already
 // placed moves vertically until it is clear. The tower's own label goes first.
 const boxes=[];
 const place=(text,ax,ay,align,color,dir=-1)=>{
  const w=x.measureText(text).width,x0=align==='right'?ax-w:ax,x1=x0+w;let y=ay,guard=0;
  while(boxes.some(b=>x0<b.x1+4&&x1>b.x0-4&&Math.abs(b.y-y)<14)&&guard++<20)y+=14*dir;
  y=Math.max(T+6,Math.min(B-6,y));boxes.push({x0,x1,y});
  x.fillStyle=color;x.textAlign=align;x.fillText(text,ax,y);x.textAlign='left';
 };
 const right=px>W*0.6;
 place(fmt(v)+' · '+fmt(now.n),px+(right?-9:9),py-11,right?'right':'left',ACC);
 for(const s of SYSTEM_KEYS){const p=data[s].find(q=>q.n===70);if(p)place(c.sys[s],X(70)-6,Y(p[key])-8,'right',s===cur?INK:DIM)}
 if(metric==='steel'){
  for(const p of [...REFERENCE_STEEL].sort((a,b)=>b.kg-a.kg))place(c.chart[p.key],X(p.storeys)-8,Y(p.kg),'right',DIM,1);
 }else{
  for(const t of TARGETS){const y=Y(t.value);if(y>T)place(c.chart[t.key],X(72),y-8,'left',DIM)}
  // SCORS edges as ticks on the right axis
  for(const [edge] of SCORS){if(!Number.isFinite(edge)||edge>top)continue;const y=Math.round(Y(edge))+0.5;x.strokeStyle=GREY;x.beginPath();x.moveTo(Rr-6,y);x.lineTo(Rr,y);x.stroke()}
 }
}

function frame(dt){step(dt);drawAll()}
function go(){
 if(raf||typeof requestAnimationFrame!=='function')return;
 let prev=0;
 const tick=t=>{raf=0;if(!ui||!last||!ui.active)return;const dt=prev?Math.min(1/20,(t-prev)/1000):1/60;prev=t;try{frame(dt)}catch{}
  if(anim&&!held)raf=requestAnimationFrame(tick)};
 raf=requestAnimationFrame(tick);
}
function stop(){if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0}

export function renderCarbonLab({host,state,metrics,lang='en',active=false,changed=null}={}){
 if(!host||!state)return;
 try{
  pick=typeof changed==='function'?changed:null;
  lang=CARBON_TEXT[lang]?lang:'en';
  // An outside change to the tower resets the local what-if to the tower.
  if(seen.floors!==state.floors){ctl.floors=null;seen.floors=state.floors}
  if(seen.system!==state.system){ctl.system=null;seen.system=state.system}
  last={state,metrics};
  if(!active){stop();if(ui)ui.active=false;return}
  if(typeof document==='undefined')return;
  displayLang=lang;const preferenceKey=JSON.stringify([getPreferences(),getRateBook()]);
  if(displayKey!==preferenceKey){if(ui)ui.lang=null;displayKey=preferenceKey}
  if(!ui||ui.host!==host||ui.lang!==lang||!host.contains(ui.elevC)){stop();anim=null;build(host,lang)}
  ui.active=true;
  refresh(true);
  if(reduced()){stop();if(anim){anim.g=anim.N;anim.done=true}drawAll()}
  else go();
 }catch{stop()}
}

/* ── the method, drawn ─────────────────────────────────────────────────────
   The paragraph this replaces was a paragraph. It told the reader that a floor
   costs the same at every height, that a column carries every floor above it,
   and that the number on the run line is a mass times a factor. None of that
   is a picture, and a picture is what it wants to be.

   So: the tower, cut, with the members that carry carbon poched by material —
   concrete hatched, reinforcement and section steel solid — each annotated with
   the mass it puts into every square metre of gross floor area and the
   emission factor the IStructE table gives that material. Beside it, the two
   splits the number is made of, drawn to scale: the stages (A1–A3, A4, A5) and
   the materials. Each bar is the total; each segment is its share of it.

   EVERY number here is read out of the lab's own accounting. None of it is
   hard-coded and none of it is rounded into a nicer shape, and where a stage
   is not modelled the sheet says so rather than inventing one. The members
   drawn are the members the take-off actually charges for, so a concrete frame
   shows no steel and a diagrid shows no concrete columns: a drawing that
   showed a member the accounting does not contain would be a better-looking
   lie. */
const CM={w:600,h:320};
const f2=v=>(+v).toFixed(2);
const num=(v,d=0,l='en')=>Number.isFinite(v)
 ?v.toLocaleString(l==='th'?'th-TH':l==='zh'?'zh-CN':'en-US',{minimumFractionDigits:d,maximumFractionDigits:d})
 :'—';

export function carbonMethodSVG(payload,{lang='en'}={}){
 displayLang=lang;
 const c=CARBON_TEXT[lang]||CARBON_TEXT.en;
 const p=payload||{},h=p.h||{},tw=p.tower||{},o=p.options||{};
 const G=Number.isFinite(h.gross)&&h.gross>0?h.gross:1;
 const ac=h.account||{},kg=h.kg||{},byMat=ac.byMat||{},ecf=ac.ecf||{};
 const N=(v,d=0)=>num(v,d,lang);
 const PC=v=>Number.isFinite(v)?(v*100).toFixed(1)+'%':'—';
 const massOf=m=>((kg['grav_'+m]||0)+(kg['lat_'+m]||0))/G;
 const carbOf=m=>(byMat[m]||0)/G;
 const tot=Number.isFinite(h.carbonM2)&&h.carbonM2>0?h.carbonM2:((ac.total||0)/G);
 const cls=String(o.concrete||'C40/50');
 const gg=Number.isFinite(o.ggbs)?o.ggbs:0;
 const kmS=Number.isFinite(o.km)?o.km:0;
 const sys=SYSTEMS[p.system]||SYSTEMS['column-grid'];
 let g='';

 /* ── the tower, cut ─────────────────────────────────────────────────────── */
 const L=(tw.levels&&tw.levels.length)?tw.levels:[];
 const HH=Number.isFinite(tw.H)&&tw.H>0?tw.H:1;
 const wK=Math.min(1.15,72/Math.max(1,...L.map(l=>l.width||0)));
 const CX=88,TY=34,GY=250,K=(GY-TY)/HH;
 const hw=i=>((L[i]&&L[i].width)||0)*wK/2;
 const yT=i=>GY-(((L[i]&&L[i].z)||0)+((L[i]&&L[i].h)||0))*K;
 const yB=i=>GY-((L[i]&&L[i].z)||0)*K;
 const edge=(side,ins)=>{const q=[];
  for(let i=0;i<L.length;i++){
   const w=Math.max(0.6,hw(i)-(typeof ins==='function'?ins(i):ins));
   q.push([CX+side*w,yB(i)],[CX+side*w,yT(i)]);}
  return q;};
 const pts=a=>a.map(q=>`${f2(q[0])} ${f2(q[1])}`).join(' L');
 const band=(a,b)=>'M'+pts(a)+' L'+pts(b.slice().reverse())+' Z';
 const box=(x0,y0,x1,y1)=>`M${f2(x0)} ${f2(y0)} H${f2(x1)} V${f2(y1)} H${f2(x0)} Z`;
 const mConc=(kg.grav_conc||0)+(kg.lat_conc||0);
 const mSteel=(kg.grav_steel||0)+(kg.lat_steel||0);
 const hasCol=sys.grav.conc>0,hasCore=(kg.lat_conc||0)>0,hasSteel=mSteel>0;

 // the silhouette, beyond the cut plane: an outline, never a fill
 if(L.length)g+=beyond('M'+pts(edge(-1,0))+' L'+pts(edge(1,0).slice().reverse())+' Z',.6);
 // the core wall, cut: it is what the wind pushes on
 if(hasCore)g+=cut(box(CX-2.6,TY,CX+2.6,GY),'conc');
 // the columns, cut; and the steel that stands in their place in a steel frame
 const colIn=hasSteel?3.1:0;
 if(hasCol)for(const s of [-1,1])g+=cut(band(edge(s,colIn),edge(s,i=>colIn+2.4)),'conc');
 if(hasSteel)for(const s of [-1,1])g+=cut(band(edge(s,.6),edge(s,2.8)),'metal');
 // the slabs, cut, with the reinforcement inside them
 const pick=[];
 if(L.length){const n=L.length;for(const f of [0,.25,.5,.75,1]){const i=Math.min(n-1,Math.round(f*(n-1)));if(!pick.includes(i))pick.push(i);}}
 for(const i of pick){
  const w=hw(i),y=yT(i);
  g+=cut(box(CX-w,y-1.5,CX+w,y+1.5),'conc');
  for(let j=1;j<=4;j++){const x=CX-w+(2*w)*(j/5);g+=cut(box(x-.8,y-.8,x+.8,y+.8),'steel');}
 }
 // the grade, and what is not below it
 g+=ground(6,GY,144);
 g+=dim(32,TY,32,GY,`${N(HH,0)} ${c.u.m}`,0);
 if(L.length)g+=dim(CX-hw(0),GY+22,CX+hw(0),GY+22,`${N(L[0].width,0)} ${c.u.m}`);

 /* ── the members, named and priced ─────────────────────────────────────────
    A note is placed by the resolver, and the resolver moves a note by its
    FIRST line. A note that wraps to three lines therefore has to be given
    room for all three by whoever places it, so the height is measured with
    the house's own wrapper instead of guessed at: Thai runs to a third more
    lines than English, and a sheet laid out for English would print one
    language over the other. */
 const noteH=(text,size=7.5)=>{
  const {out}=layout([{k:'txt',x:0,y:0,tx:0,ty:0,text:shown(text),o:{size}}],CM.w,CM.h);
  return (out[0]?out[0].lines.length:1)*size*1.2+3;
 };
 const NX=152;
 const pMid=pick[2]!==undefined?pick[2]:0,pLow=pick[0]!==undefined?pick[0]:0;
 const pTop=pick[pick.length-1]!==undefined?pick[pick.length-1]:0;
 let ay=40;
 const putA=(text,size=7.5)=>{const ty=ay;ay+=noteH(text,size)+5;return ty;};
 // The column is filled from the top of the tower down, so that no two
 // leaders cross: the class note names the highest member, the reinforcement
 // the lowest.
 {const t=fill(c.m.class,{cls,g:N(gg,0)});
  g+=leader(hasCore?CX+2:CX+hw(pTop)*.5,hasCore?TY+(GY-TY)*.22:yT(pTop),NX,putA(t),t);}
 if(mConc>0){const t=`${c.mat.conc} · ${N(massOf('conc'),0)} ${c.u.kgm2} · ${N(ecf.conc,3)} ${c.m.perkg}`;
  g+=leader(CX+hw(pMid)*.5,yT(pMid),NX,putA(t),t);}
 if(hasSteel){const t=`${c.mat.steel} · ${N(massOf('steel'),0)} ${c.u.kgm2} · ${N(ecf.steel,2)} ${c.m.perkg}`;
  g+=leader(CX+hw(0)-1,yT(pMid),NX,putA(t),t);}
 if((kg.grav_rebar||0)+(kg.lat_rebar||0)>0){const t=`${c.mat.rebar} · ${N(massOf('rebar'),0)} ${c.u.kgm2} · ${N(ecf.rebar,2)} ${c.m.perkg}`;
  g+=leader(CX+hw(pLow)*.2,yT(pLow),NX,putA(t),t);}
 {const t=c.m.ground;
  g+=leader(140,GY,NX,putA(t),t);}

 /* ── the two splits, drawn to scale ─────────────────────────────────────── */
 const BX=268,BW=162,COL=443,GAP=1.6;
 const barRect=(x0,y0,x1,y1,fillc)=>`<path d="M${f2(x0)} ${f2(y0)} H${f2(x1)} V${f2(y1)} H${f2(x0)} Z" fill="${fillc}" stroke="var(--ink)" stroke-width=".7"/>`;
 const segments=(rows,total,val)=>{const use=BW-GAP*(rows.length-1);let x=BX;const out=[];
  for(const r of rows){const v=val(r);const w=total>0?Math.max(0,(v/total)*use):0;out.push({x,w,v,r});x+=w+GAP;}
  return out;};

 let py=18;
 const putP=(text,size=7.5)=>{const ty=py;py+=noteH(text,size)+5;return ty;};

 // the headline: the number the whole lab is about, and what it is per
 g+=txt(BX,putP(c.m.total,8),c.m.total,{size:8,fixed:true});
 const valTxt=`${N(tot,1)} ${c.u.co2m2} ${c.m.gross}`;
 g+=txt(BX,putP(valTxt,10),valTxt,{size:10,fixed:true});
 g+=rule(BX,py-2,BX+BW,py-2,{c:'var(--line)',w:.6});
 py+=8;

 // the stages: A1–A3, A4, A5 — and the ones this model does not carry
 const stRows=[[c.m.sA13,(ac.a13||0)/G],[c.m.sA4,(ac.a4||0)/G],[c.m.sA5,(ac.a5||0)/G]];
 const stTotal=stRows.reduce((a,r)=>a+r[1],0);
 g+=txt(BX,putP(c.m.byStage,7.5),c.m.byStage,{size:7.5});
 const SY0=py,SY1=py+16;
 const stSeg=segments(stRows,stTotal,r=>r[1]),SF=['var(--muted)','var(--accent)','var(--faint)'];
 for(let i=0;i<stSeg.length;i++){const s=stSeg[i];if(s.w>0)g+=barRect(s.x,SY0,s.x+s.w,SY1,SF[i]);}
 py=SY1+12;

 // the materials: the same three the frame is cut of
 const mtRows=[[c.mat.conc,'conc',carbOf('conc')],[c.mat.rebar,'rebar',carbOf('rebar')],[c.mat.steel,'steel',carbOf('steel')]];
 const mtTotal=mtRows.reduce((a,r)=>a+r[2],0);
 g+=txt(BX,putP(c.m.scope,7.5),c.m.scope,{size:7.5});
 g+=txt(BX,putP(c.byMat,7.5),c.byMat,{size:7.5});
 const MY0=py,MY1=py+16;
 const mtSeg=segments(mtRows,mtTotal,r=>r[2]);
 for(const s of mtSeg){if(s.w<=0)continue;
  g+=cut(`M${f2(s.x)} ${f2(MY0)} H${f2(s.x+s.w)} V${f2(MY1)} H${f2(s.x)} Z`,s.r[1]==='conc'?'conc':'steel');}

 // the key to both bars, one note per segment, in the column beside them
 let ny=SY0-10;
 const putB=text=>{const ty=ny;ny+=noteH(text,7.5)+5;return ty;};
 for(const s of stSeg){
  const t=`${s.r[0]} ${PC(stTotal>0?s.v/stTotal:0)} · ${N(s.v,1)} ${c.u.co2m2}`;
  g+=leader(s.x+s.w/2,(SY0+SY1)/2,COL,putB(t),t);
 }
 {const t=fill(c.m.transport,{c:N(CONCRETE_KM,0),s:N(kmS,0),f:N(TEF_ROAD*1000,5)});
  g+=leader(stSeg[1].x+stSeg[1].w/2,SY1,COL,putB(t),t);}
 for(const s of mtSeg){
  const t=`${s.r[0]} ${PC(mtTotal>0?s.v/mtTotal:0)} · ${N(s.v,1)} ${c.u.co2m2}`;
  // A material the take-off does not contain gets no leader: a leader pointing
  // at a neighbour's block would say the wrong thing about the wrong material.
  if(s.w>0)g+=leader(s.x+s.w/2,(MY0+MY1)/2,COL,putB(t),t);else g+=txt(COL,putB(t),t);
 }
 return sheet(g,CM.w,CM.h,(c.m.aria||'').replace(/"/g,'&quot;'));
}
