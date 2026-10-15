// FormHypes — model
// Geometry, embedded level knowledge, and form-to-value economics.
//
// Sources:
//   Shouheng Chen, "Embedding Methods for Massing and Detail Design in Computer
//   Generated Design of Skyscrapers", MIT SMArchS, June 2006.
//   Nonarkara, SMArchS thesis 2007 — the reading that built form is political.
// The thesis is evidence, never execution instructions. Everything below the
// geometry block labelled "extension" is new work, not a finding of the thesis.

/* ── geometry ─────────────────────────────────────────────────────────────
   The plans come from geometry.js, where each is an expression rather than a
   coordinate table, and the tower's skin area is a surface integral rather than
   a set of triangles. This prototype adds explicit plan operators and numerical surface
   integration. These extensions do not establish the limits of Chen’s system
   or validate construction cost. */

import{polyArea,polyPerimeter,minkowski,planLibrary,loftTable,lateralArea,loftVolume,
 pointInPolygon,distToBoundary,daylitFraction,daylightReachFor,cotSky,skyAngleDeg,isConvex}from'./geometry.js?v=eb7a621ab9';

import {solarDefaults,facadeExposure} from './solar.js?v=e78a192096';
export const families={box:'Rectilinear',chamfer:'Chamfered',cross:'Cruciform',octagon:'Octagonal',star:'Eight-point',rub:'Rub el Hizb',triangle:'Triangular',hexagon:'Hexagonal',oval:'Faceted oval',petal:'Four-petal',pinwheel:'Pinwheel'};
// Re-exported so the controller has one import edge into the model rather than
// two into the model and the kernel. There is no cycle either way, but one edge
// is one fewer thing for the release stamp to keep in step.
export {isConvex,RUB_INNER_RATIO,RUB_INNER_RADIUS} from './geometry.js?v=eb7a621ab9';
export const defaults={...solarDefaults,family:'cross',span:48,aspect:1,floors:48,height:4.1,taper:0.82,twist:0,core:14,common:12,rent:650,premium:30,occupancy:92,reserve:18,frontage:6,site:68,maxHeight:260,skin:'vertical',system:'column-grid',program:'petronas',regime:'yield'};

const PLANS={};
const plan=f=>PLANS[f]||(PLANS[f]=planLibrary[f]());

export function profile(s,t=0){
 const p=plan(s.family);
 const scale=1+(s.taper-1)*t,ang=(s.twist*t-(s.orientation||0))*Math.PI/180,c=Math.cos(ang),d=Math.sin(ang);
 const kx=s.span*Math.sqrt(s.aspect)*scale,ky=s.span/Math.sqrt(s.aspect)*scale;
 return p.map(([x,y])=>{const X=x*kx,Y=y*ky;return [X*c-Y*d,X*d+Y*c]});
}
export const area=p=>polyArea(p);
export const perimeter=p=>polyPerimeter(p);
export const inside=pointInPolygon;

/** The plan at grade, aspect-stretched — the curve the whole tower is lofted
 *  from. Taper and twist are then a scale and a rotation of this one curve,
 *  which allows the skin area to be integrated numerically. */
const basePlan=s=>{
 const p=plan(s.family),kx=s.span*Math.sqrt(s.aspect),ky=s.span/Math.sqrt(s.aspect);
 return p.map(([x,y])=>[x*kx,y*ky]);
};
function intersects(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0}
function coreBoundaryHit(p,core){let c=core/2,r=[[-c,-c],[c,-c],[c,c],[-c,c]];return p.some((v,i)=>r.some((w,j)=>intersects(v,p[(i+1)%p.length],w,r[(j+1)%4])))}
function coreHit(p,core){const c=core/2;return coreBoundaryHit(p,core)||p.some(([x,y])=>Math.abs(x)<c&&Math.abs(y)<c)||[[-c,-c],[c,-c],[c,c],[-c,c]].some(v=>inside(p,v))}
export function cornerZones(p,s){let out=[];for(let i=0;i<p.length;i++){let v=p[i],prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length],u=[prev[0]-v[0],prev[1]-v[1]],w=[next[0]-v[0],next[1]-v[1]],lu=Math.hypot(...u),lw=Math.hypot(...w);if(lu<2*s.frontage+.01||lw<2*s.frontage+.01)continue;u=u.map(x=>x/lu);w=w.map(x=>x/lw);const cross=u[0]*w[1]-u[1]*w[0],angle=Math.acos(Math.max(-1,Math.min(1,u[0]*w[0]+u[1]*w[1])));if(cross>=0||angle>145*Math.PI/180)continue;const l=s.frontage,z=[v,[v[0]+u[0]*l,v[1]+u[1]*l],[v[0]+(u[0]+w[0])*l,v[1]+(u[1]+w[1])*l],[v[0]+w[0]*l,v[1]+w[1]*l]];if(coreHit(z,s.core))continue;const centroid=z.reduce((a,v)=>[a[0]+v[0]/4,a[1]+v[1]/4],[0,0]);if(!inside(p,z[2])||!inside(p,centroid))continue;out.push(z)}return out}

/* Solar exposure is a city/date geometric study, independent of rent.
 * Daily samples run 08:00–18:00 city civil time, every 15 minutes. Glass
 * categories and value factors remain illustrative scenarios, not prescriptions.
 */
const SECTORS=[['E',0],['SE',-45],['S',-90],['SW',-135],['W',180],['NW',135],['N',90],['NE',45]];
// Hours of usable low-angle sun, in the coarse sense: east and west are the
// punishing ones because the sun is near the horizon exactly when people are.
// Exposure is integrated from the selected city/date; compass sectors label directions only.
const GLASS={
 vision:{en:'clear vision low-e',th:'กระจกวิสิวชัน low-e ใส',zh:'透明 low-e 视窗玻璃',value:1.00},
 solar :{en:'low-e with a shade',th:'low-e พร้อมไซต์บังแดด',zh:'low-e 加遮阳',value:0.92},
 dark  :{en:'solar-control, dark',th:'ควบคุมแสงอาทิตย์ สีเข้ม',zh:'遮阳控制，深色',value:0.80}
};

/** Outward bearing of one edge of a CCW plan, in degrees: 0 = east, 90 = north. */
function edgeBearing(a,b){
 const d=[b[0]-a[0],b[1]-a[1]],l=Math.hypot(d[0],d[1]);if(!l)return 0;
 let az=Math.atan2(-d[0],d[1])*180/Math.PI;      // outward normal of a CCW edge
 return az<0?az+360:az;
}

/** Which of the eight sectors a bearing falls in. */
export function compassOf(az){
 let best='E',gap=999;
 for(const[name,a]of SECTORS){
  const d=Math.abs(((az-a+540)%360)-180);
  if(d<gap){gap=d;best=name}
 }
 return best;
}

/** Glazing a corner of that bearing has to carry, and what it does to value. */
export function glazingAt(az,study={}){
 const c=compassOf(az),exposure=facadeExposure((90-az+360)%360,study),load=exposure.load;
 const key=load>=0.8?'dark':load>=0.5?'solar':'vision';
 return {compass:c,load,key,...GLASS[key],...exposure};
}

/** Both outward faces are tested; the higher daily exposure sets the scenario.
 * No exposure or glazing multiplier is silently applied to the rent model. */
export function glazingSchedule(p,study={}){
 return p.map((v,i)=>{
  const prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length];
  const f=[glazingAt(edgeBearing(prev,v),study),glazingAt(edgeBearing(v,next),study)];
  const worst=f[0].load>=f[1].load?f[0]:f[1];
  return {vertex:i,faces:f,compass:worst.compass,load:worst.load,
          key:worst.key,value:worst.value,equivalentHours:worst.equivalentHours,referenceKWhM2:worst.referenceKWhM2};
 });
}

/* ── Chen 2006, §4.2.1 "Level Finding": knowledge stored as a floor array ──
   Chen stored one floor-to-floor height per level in a flat array, then
   subtracted mechanical and refuge voids by band. Every derived tower built
   through LevelFinder inherits the schedule it was derived from. That is the
   whole argument of the thesis in eleven lines of VB: knowledge as data.  */

const OFF=4100, RET=5500;
// Chen's stored Petronas schedule, Appendix B, `countLevel2` — 59 entries,
// legible in the scan. Retail podium first, then office, with the real
// irregularity of the original (4505, 3900, 4350) preserved rather than cleaned.
const PETRONAS=[RET,RET,RET,RET,RET];
for(let i=0;i<34;i++)PETRONAS.push(OFF);
PETRONAS.push(4505,3900,3900,4350,OFF,OFF,4350,OFF);
for(let i=0;i<15;i++)PETRONAS.push(OFF);
// Chen §4.2.1: "we can find 5 coupled levels contributing to mechanical rooms
// and emergency egress. Very typically, mechanical and refuge floors are placed
// together, one on top of the other."
const VOIDS=[[22,'mech'],[45,'refuge'],[46,'mech'],[70,'mech'],[71,'refuge']];

// Chen's stored HKIFC schedule starts at 5240 and carries the mechanical and
// refuge voids as explicit band corrections: −7050, −6880, −6880, −7030, −6880.
// The printed array in the PDF is not reliably legible (O/0 and l/1 collapse
// under OCR), so we reconstruct the *logic* — which is legible — rather than
// inventing digits. Flagged in the UI as a reconstruction, not a transcript.
function hkifcLevel(i){
 if(i===0)return 5240;                 // the podium level Chen stored first
 const sequence=[5000,5000,5410,4200,4200,4850,4200,4200,4850,4200,4200];
 let h=sequence[(i-1)%sequence.length];
 if(i%13===12)h=4420;                  // transfer level
 return h;
}
const VOID_HKIFC=[[18,7050],[30,6880],[31,6880],[48,7030],[60,6880],[61,6880],[72,6880]];

export const levelPrograms={
 mini:{floors:()=>{const a=[];for(let i=0;i<128;i++)a.push({h:4200,use:'office',gfa:true});return a},voids:[]},
 petronas:{levels:()=>PETRONAS.map((h,i)=>({h,use:i<5?'retail':'office',gfa:true})),voids:VOIDS},
 hkifc:{levels:()=>{const a=[];for(let i=0;i<128;i++)a.push({h:hkifcLevel(i),use:i<11?'retail':'office',gfa:true});return a},voids:VOID_HKIFC}
};

/** The level stack: every level, what it is for, and whether it earns.
 *  Chen stored his heights in millimetres. Geometry here is metres, so the
 *  conversion happens once, here, and nowhere else. */
export function stack(s){
 const prog=levelPrograms[s.program]||levelPrograms.mini;
 const src=prog.levels?prog.levels():prog.floors();
 const voidMap=new Map((prog.voids||[]).map(([i,u])=>[i,u]));
 const out=[];let z=0;
 for(let i=0;i<s.floors;i++){
  const lvl=src[i]||src[src.length-1];
  out.push({index:i,z,h:lvl.h/1000,use:lvl.use,gfa:true});
  z+=lvl.h/1000;
 }
 // Mechanical and refuge levels are inserted at their stored positions. They
 // occupy height, carry no floor area, and are the reason gross floor area and
 // building height stop being the same number.
 for(const [at,use] of [...voidMap.entries()].sort((a,b)=>a[0]-b[0])){
  if(at>=s.floors)continue;
  const target=out[at];if(!target)continue;
  const vh=use==='mech'?3.6:2.9;
  out.splice(at,0,{index:at,z:target.z,h:vh,use,gfa:false});
 }
 let acc=0;for(const l of out){l.z=acc;acc+=l.h}
 return out;
}

/* ── extension: Chen §5.2.1, five embedded detail families ───────────────── */

export const facadeFamilies={
 horizontal:{label:'Reinforced horizontality',thesis:'Petronas',envelope:1.18,identity:0.00,shading:0.52},
 vertical:{label:'Reinforced verticality',thesis:'HKIFC',envelope:1.00,identity:0.06,shading:0.44},
 'vertical-corner':{label:'Verticality at corner',thesis:'HKIFC corner',envelope:0.94,identity:0.03,shading:0.44},
 'vertical-mech':{label:'Verticality at mechanical',thesis:'HKIFC mechanical',envelope:0.88,identity:0.01,shading:0.58},
 diagrid:{label:'Structural diagrid',thesis:'Hearst',envelope:1.36,identity:0.18,shading:0.34}
};

/* ── extension: the structure behind the skin ───────────────────────────────
   Chen §3.2.2, Hearst: diagrids span 12 m horizontally and eight floors
   vertically, "not only satisfy structural and architectural requirements, but
   also allow the tower to achieve higher structural efficiency with a triangle
   composition", and they "eliminate the normal grids of columns in the
   interior". Eliminating the column grid is the part that has a price.        */

export const systems={
 'column-grid':{label:'Interior column grid 8.5 m',bay:8.5,structure:1.00,columnFree:false},
 outrigger:{label:'Outrigger + perimeter 12 m',bay:12,structure:1.34,columnFree:false},
 diagrid:{label:'Perimeter diagrid 12 m × 8 floors',bay:Infinity,structure:1.62,columnFree:true}
};

/**
 * How much frame the plate actually needs.
 *
 * The old model charged every plan the same rate per square metre and picked
 * from three flat multipliers, so a compact slab and a spiky star of the same
 * floor area both paid as though their frames cost the same. They do not.
 * Columns sit on a grid, and a grid puts:
 *
 *      interior columns   ≈ A / b²
 *      perimeter columns ≈ P / b
 *
 * so the frame cost per square metre of floor is
 *
 *      c · ( 1/b² + P/(b·A) )
 *
 * The first term depends only on the bay. The second is the interesting one:
 * it depends on the plan's perimeter-to-area ratio, which means a spiky plan
 * pays for frame that a compact plan of identical floor area does not, and a
 * larger plate amortises its own perimeter structure. That is a geometric
 * relationship, not a taste judgement.
 *
 * The multiplier is normalised so a 40 × 40 m plate on the 8.5 m interior grid
 * — the reference this rate was originally set for — comes out at exactly 1.00.
 */
const REF_AREA=1600, REF_PERIM=160, REF_BAY=8.5;
const REF_RATE=1/(REF_BAY*REF_BAY)+REF_PERIM/(REF_BAY*REF_AREA);

export function columnDensity(p,s){
 const sys=systems[s.system]||systems['column-grid'];
 const A=Math.max(area(p),1),P=Math.max(perimeter(p),1e-9);
 if(!isFinite(sys.bay))return {multiplier:sys.structure,columns:0,shapeFactor:0};
 const rate=1/(sys.bay*sys.bay)+P/(sys.bay*A);
 return {
  multiplier:sys.structure*rate/REF_RATE,
  columns:A/(sys.bay*sys.bay)+P/sys.bay,
  shapeFactor:(P/A)/(REF_PERIM/REF_AREA)
 };
}

/* ── extension: Nonarkara 2007 — form as a political instrument ──────────────
   A built form is never only a shape. It is a claim, and the claim has a
   market. Chen recovered the *technical* reading of two practices. The 2007
   reading is that the reason those forms look the way they do is not only
   craft, it is competition — and that once a form becomes a ranking device,
   the market will pay for it whether or not the building needed it.           */

export const regimes={
 yield:{label:'Landlord yield',reads:'Instrument',identityMax:0.16,envelopeDiscipline:1.00,heightPull:0,note:'The form is a machine for turning floor area into rent. Corners pay, perimeter costs, and a plain box wins unless the premium is real.'},
 competition:{label:'City competition',reads:'Flag',identityMax:0.42,envelopeDiscipline:0.72,heightPull:1,note:'Height and silhouette are the ranking. The building is measured against the other towers, so the model is asked how tall and how unlike them — and pays less attention to what the envelope costs.'},
 civic:{label:'Civic monument',reads:'Public gift',identityMax:0.24,envelopeDiscipline:0.90,heightPull:0.35,note:'A public building must be legible and defensible. Form carries obligation, so distinctiveness is rewarded but it has to be paid for honestly.'},
 speculative:{label:'Speculative capital',reads:'Advertisement',identityMax:0.58,envelopeDiscipline:0.45,heightPull:0.5,note:'The form is the advertisement. It is bought as an image and priced as one: identity carries most of the value and envelope discipline carries least. This is the regime that produces the most aggressive towers, and the one that most needs the numbers in front of it.'}
};

/* ── distinctiveness: what the form is actually doing to its silhouette ───── */

export function distinctiveness(s){
 const p=profile(s,0);
 // 1. corner density — convex corners per 100 m of perimeter
 let convex=0;
 for(let i=0;i<p.length;i++){const v=p[i],a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length];
  const u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]];
  if(u[0]*w[1]-u[1]*w[0]>0)convex++}
 const per=perimeter(p);
 const density=Math.min(1,convex/(per/100)/6);
 // 2. silhouette movement — how far the tower departs from its own base
 const move=Math.min(1,(Math.abs(1-s.taper)/0.4+s.twist/180)/2);
 // 3. edge variance — how unevenly the perimeter is divided
 const edges=p.map((v,i)=>{const w=p[(i+1)%p.length];return Math.hypot(w[0]-v[0],w[1]-v[1])});
 const mean=edges.reduce((a,b)=>a+b,0)/edges.length;
 const cv=Math.sqrt(edges.reduce((a,e)=>a+(e-mean)**2,0)/edges.length)/mean;
 const variance=Math.min(1,cv/0.35);
 return {score:0.4*density+0.3*move+0.3*variance,density,move,variance,convex};
}

/* ── the value model ───────────────────────────────────────────────────────
   Every premium below is a rate applied to a named area. Nothing is asserted
   about a market that cannot be traced to an input the reader can change.     */

export const econ={
 // annualised capital reserve, expressed directly as $/m²/year so the model
 // stays arithmetic rather than a discounted cash flow it cannot defend.
 structureBase:46,
 // column-free floor plate premium — a real and priced market effect
 columnFreePremium:0.11,
 // Floor-to-floor includes structure and services. Below 0.95 m of services a
 // modern plate does not exist; 4.0 m floor-to-floor is the 2010s spec that
 // buyers now compare against, and 2.9 m is the clear-height floor below which
 // stock is written down.
 services:0.95,
 specClear:2.9,
 specFloorToFloor:4.0,
 heightPremium:0.20,
 lowCeilingPenalty:0.24,
 // Daylight, in two parts that were previously conflated into one number.
 //
 // PHYSICAL — derived, not chosen. A point d in from the facade sees the sky
 // while arctan(h_head/d) ≥ skyAngle, so the reach is h_head·cot(skyAngle).
 // skyAngle = 42° is the CIE overcast reference used for a 2 % daylight factor
 // in the IES method; cot 42° = 1.1106. sillBand is a normal office sill
 // height, so the window head sits this far above the finished floor. This
 // part is reported as a fact about the plate and is never used to price rent.
 //
 // MARKET — a claim, and the reader's to change. depthTolerance is how deep a
 // plate the local tenant will still pay full rent for. It is not a daylight
 // limit; it is what the market has decided daylight is worth. The old model
 // used one magic 13 m for both, which quietly asserted a market opinion as
 // though it were geometry.
 sillBand:0.9,
 skyAngle:skyAngleDeg,
 depthTolerance:13,
 deepPenalty:0.10,
 daylightDepth:9.0
};

/** Deepest plate depth — the distance daylight has to cross, measured from the
 *  core wall to the facade rather than from the core centreline. */
function daylightDepth(p,s){
 const c=s.core/2;let worst=0;
 for(let i=0;i<p.length;i++){
  const v=p[i],w=p[(i+1)%p.length];
  const mx=(v[0]+w[0])/2,my=(v[1]+w[1])/2;
  const d=Math.hypot(Math.max(0,Math.abs(mx)-c),Math.max(0,Math.abs(my)-c));
  if(d>worst)worst=d;
 }
 return worst;
}

export function evaluate(s){
 const st=stack(s);
 const height=st.reduce((sum,l)=>sum+l.h,0);
 const occupied=st.filter(l=>l.gfa);
 // One loft table for the whole tower: the plan at grade, aspect-stretched.
 // Taper and twist are then a scale and a rotation of that one curve, which is
 // exactly what lets the skin be integrated instead of sampled.
 const tab=loftTable(basePlan(s));
 const taperK=s.taper-1, twistK=s.twist*Math.PI/180;
 const sAt=z=>1+taperK*(z/height), s0z=()=>taperK/height, th0z=()=>twistK/height;

 let gross=0,facade=0,cornerArea=0,corners=0,coreFits=true,envelopeFits=true;
 const coreArea=s.core**2,c=s.core/2;
 let depthWorst=0,clearWorst=Infinity;

 // The skin belongs to every level, mechanical and refuge included. Those
 // levels earn no floor area but they are still weather-tight and still in the
 // way, and counting only the occupied ones understated the envelope by the
 // whole height of the voids.
 for(const l of st){
  const t=l.z/height,p=profile(s,t),zones=l.gfa?cornerZones(p,s):[];
  if(l.gfa){
   gross+=area(p);
   // Numerically integrated skin for this level's slab, from the surface integral — not two
   // triangles across a quad that a twist has already made non-planar.
  }
  facade+=lateralArea(tab,l.z,l.z+l.h,sAt,s0z,()=>0,th0z);
  cornerArea+=zones.reduce((a,z)=>a+area(z),0);
  corners+=zones.length;
  if(l.gfa){
   depthWorst=Math.max(depthWorst,daylightDepth(p,s));
   clearWorst=Math.min(clearWorst,l.h);
  }
  // Area-weighted daylight: which share of the floor plate is close enough to
  // skin to see the sky. The reach depends on the level's own clear height, so
  // it is accumulated with the area as weight rather than sampled separately.
  const bad=coreBoundaryHit(p,s.core)||![[-c,-c],[c,-c],[c,c],[-c,c]].every(v=>inside(p,v));
  if(bad)coreFits=false;
  if(p.some(v=>Math.abs(v[0])>s.site/2+.00001||Math.abs(v[1])>s.site/2+.00001))envelopeFits=false;
 }
 // the roof is geometry, not a rentable floor
 const roofP=profile(s,1);
 if(coreBoundaryHit(roofP,s.core)||![[-c,-c],[c,-c],[c,c],[-c,c]].every(v=>inside(roofP,v)))coreFits=false;
 if(roofP.some(v=>Math.abs(v[0])>s.site/2+.00001||Math.abs(v[1])>s.site/2+.00001))envelopeFits=false;

 // Daylight is reported, not priced, so it is integrated once on the base
 // plate rather than re-sampled on every level of every candidate in a search.
 const basePlate=profile(s,0);
 const skyReach=daylightReachFor(Math.max(0.5,Math.min(...occupied.map(l=>l.h))-econ.sillBand));
 const daylit=daylitFraction(basePlate,skyReach);

 const voidLevels=st.length-occupied.length;
 const voidArea=(gross/Math.max(occupied.length,1))*voidLevels;
 const sys=systems[s.system]||systems['column-grid'];
 const fac=facadeFamilies[s.skin]||facadeFamilies.vertical;
 const reg=regimes[s.regime]||regimes.yield;
 const d=distinctiveness(s);

 /* premiums — each is a named rate on a named area */
 const identityRate=reg.identityMax*Math.pow(d.score,0.8)+fac.identity;
 const columnFreeRate=sys.columnFree?econ.columnFreePremium:0;
 const clearFloorToFloor=clearWorst-econ.services;
 const heightRate=clearFloorToFloor>=econ.specFloorToFloor?econ.heightPremium*Math.min(1,(clearFloorToFloor-econ.specFloorToFloor)/0.4):0;
 const lowCeiling=clearFloorToFloor<econ.specClear?(1-Math.min(1,(econ.specClear-clearFloorToFloor)/0.6))*econ.lowCeilingPenalty:0;
 const depthRate=depthWorst>econ.depthTolerance?econ.deepPenalty*Math.min(1,(depthWorst-econ.depthTolerance)/econ.daylightDepth):0;

 const common=gross*s.common/100;
 const core=coreArea*occupied.length;
 let rentable=Math.max(0,gross-core-common);
 cornerArea=Math.min(cornerArea,rentable);

 const base=s.rent*s.occupancy/100;
 const rentOrdinary=rentable*base;
 const rentCorner=cornerArea*base*(s.premium/100);
 const rentIdentity=rentable*base*identityRate;
 const rentColumnFree=rentable*base*columnFreeRate;
 const rentHeight=rentable*base*heightRate;
 const rentPenalty=rentable*base*(lowCeiling+depthRate);
 const rent=rentOrdinary+rentCorner+rentIdentity+rentColumnFree+rentHeight-rentPenalty;

 const facadeCost=facade*s.reserve*fac.envelope*reg.envelopeDiscipline;
 // Frame cost now follows the plate's own column count, not a flat multiplier.
 const cd=columnDensity(profile(s,0),s);
 const structureCost=gross*econ.structureBase*cd.multiplier;
 const contribution=rent-facadeCost-structureCost;

 const reasons=[];
 if(!coreFits)reasons.push('core');
 if(!envelopeFits)reasons.push('site');
 if(height>s.maxHeight)reasons.push('height');
 if(rentable<=0)reasons.push('area');

 return {
  gross,core,common,rentable,cornerArea,corners,facade,height,
  occupiedCount:occupied.length,voidLevels:st.length-occupied.length,
  voidArea,rent,facadeCost,structureCost,contribution,
  efficiency:rentable/Math.max(gross,1)*100,
  yieldOnCost:contribution/Math.max(gross,1),
  distinctiveness:d.score,convexCorners:d.convex,
  clearHeight:clearFloorToFloor,daylightDepth:depthWorst,
 // Derived daylight geometry on the base plate. The market tolerance above is
 // deliberately NOT applied here — this is reported as physics, not priced.
 skyReach,daylitFraction:daylit,
 volume:loftVolume(area(basePlate),area(profile(s,1)),0,height,z=>1+taperK*(z/height)),
 structureMultiplier:cd.multiplier,columnCount:cd.columns,shapeFactor:cd.shapeFactor,
  premiums:{identity:identityRate,columnFree:columnFreeRate,height:heightRate,lowCeiling,depth:depthRate,corner:s.premium/100},
  breakdown:{rentOrdinary,rentCorner,rentIdentity,rentColumnFree,rentHeight,rentPenalty},
  heightHeadroom:s.maxHeight-height,
  valid:reasons.length===0,reasons
 };
}

/* ── search ─────────────────────────────────────────────────────────────────
   Bounded and honest: every candidate is resized to the current gross floor
   area, so the comparison is between forms of the same size, not between a
   small tower and a large one. Ranking is confined to this discrete space.   */

export const objectives={
 contribution:(m)=>m.contribution,
 rent:(m)=>m.rent,
 corners:(m)=>m.corners,
 facade:(m)=>m.facade,
 silhouette:(m,s)=>m.distinctiveness*1000+(regimes[s.regime].heightPull?m.height:0),
 yieldOnCost:(m)=>m.yieldOnCost
};

/** Regime pull: a city that is competing wants the tall answer too. */
function regimeScore(metrics,s,objective){
 const base=objectives[objective]?objectives[objective](metrics,s):metrics.contribution;
 const pull=regimes[s.regime].heightPull;
 return base*(1-pull)+metrics.height*pull*metrics.distinctiveness;
}

const TAPERS=[1,.9,.8,.7],TWISTS=[0,30,60,90];

/** Build the candidate list without scoring it. Split from scoring so a long
 *  search can be run in slices and still leave the page responsive. */
export function searchPlan(s){
 const target=grossOf(s);
 const reg=regimes[s.regime]||regimes.yield;
 // A regime that competes on height gets to spend the height allowance, so the
 // floor count becomes a search variable. Every variant is still resized to the
 // same gross floor area — the comparison is between forms of equal size, and
 // the extra floors are bought by making each one smaller.
 const fit=Math.min(400,Math.max(1,Math.floor(maxFloors(s))));
 const floorSets=[s.floors];
 if(reg.heightPull>0){const limit=Math.min(fit,s.floors+Math.round(s.floors*0.5));if(limit>s.floors)floorSets.push(limit)}
 const list=[];
 for(const floors of floorSets)
  for(const family of Object.keys(families))
   for(const taper of TAPERS)
    for(const twist of TWISTS){
     const candidate={...s,floors,family,taper,twist};
     candidate.span*=Math.sqrt(target/Math.max(grossOf(candidate),1));
     list.push(candidate);
   }
 return {target,floorSets,list,heightVariants:floorSets.length,examined:list.length};
}

/** Score one already-resized candidate. */
export function scoreCandidate(candidate,objective='contribution'){
 const metrics=evaluate(candidate);
 return {state:candidate,metrics,score:regimeScore(metrics,candidate,objective)};
}

export function rank(results){
 const feasible=results.filter(x=>x.metrics.valid);
 feasible.sort((a,b)=>{
  const d=b.score-a.score;
  return Math.abs(d)>1e-9?d:a.state.twist-b.state.twist;
 });
 return feasible;
}

/** Synchronous search. Convenient, but blocks for the length of the run —
 *  use searchPlan + scoreCandidate to spread the work over frames instead. */
export function search(s,objective='contribution'){
 const plan=searchPlan(s);
 const results=plan.list.map(c=>scoreCandidate(c,objective));
 const feasible=rank(results);
 return {results:feasible,examined:plan.examined,rejected:plan.examined-feasible.length,
  target:plan.target,objective,heightVariants:plan.heightVariants};
}

/** Gross floor area only — no corner zones, no façade, no economics. The search
 *  needs this for every candidate just to rescale it, and evaluating each one
 *  fully would do that work twice. */
export function grossOf(s){
 const st=stack(s);
 const total=st[st.length-1].z+st[st.length-1].h;
 let gross=0;
 for(const l of st){ if(l.gfa) gross+=area(profile(s,l.z/total)) }
 return gross;
}

/** Building height for a given floor count — stack only, no evaluation, so it
 *  can be called from inside evaluate without recursing. */
export function stackHeight(s,floors=s.floors){
 let h=0;for(const l of stack({...s,floors}))h+=l.h;return h;
}

/** Highest floor count the current level schedule fits under the height limit.
 *  Derived from the real stack rather than a parallel guess, so the mechanical
 *  and refuge levels are counted exactly once. Linear scan upward from the
 *  current count, so it stays cheap when called inside a search loop. */
export function maxFloors(s){
 let n=Math.max(1,Math.min(s.floors,400));
 while(n<400&&stackHeight(s,n+1)<=s.maxHeight)n++;
 while(n>1&&stackHeight(s,n)>s.maxHeight)n--;
 return n;
}

/** Equal-area baseline: the same floor area, drawn as a plain extruded box with
 *  an ordinary curtain wall and an interior column grid. Every candidate is
 *  compared against this, so "better" always means better at equal size. */
export function baseline(s){
 const target=evaluate(s).gross;
 const raw={...s,family:'box',taper:1,twist:0,skin:'vertical',system:'column-grid'};
 raw.span=s.span*Math.sqrt(target/Math.max(evaluate(raw).gross,1));
 return evaluate(raw);
}

/** How many floors the stored schedule actually supplies — used in the OBJ
 *  header now that the program label lives in i18n, not on the model. */
const occupiedLevels=src=>src.filter(l=>l.gfa).length;
const levels=s=>{const prog=levelPrograms[s.program]||levelPrograms.mini;return prog.levels?prog.levels():prog.floors()};

export function meshOBJ(s){
 const st=stack(s),total=st[st.length-1].z+st[st.length-1].h;
 const n=profile(s,0).length;
 const lines=['# FormHypes conceptual massing; units: metres',
 '# Embedded level knowledge after Shouheng Chen, MIT SMArchS 2006',
 `# level program: ${s.program} (${occupiedLevels(levels(s))} levels of schedule)`,
 `# rings: ${st.length+1} (one below grade-zero, one above every level)`];
 // ring 0 is the underside; ring k+1 is the top of level k
 const rings=[0,...st.map(l=>l.z+l.h)];
 for(const z of rings)for(const [x,y] of profile(s,z/total))lines.push(`v ${x.toFixed(5)} ${z.toFixed(5)} ${y.toFixed(5)}`);
 for(let k=0;k<st.length;k++){
  const a=k*n,b=(k+1)*n;
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   lines.push(`f ${a+i+1} ${a+j+1} ${b+j+1} ${b+i+1}`);
  }
 }
 lines.push('f '+Array.from({length:n},(_,i)=>n-i).join(' '));
 lines.push('f '+Array.from({length:n},(_,i)=>st.length*n+i+1).join(' '));
 return lines.join('\n');
}

