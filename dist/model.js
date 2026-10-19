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

import {solarDefaults,facadeExposure} from './solar.js?v=9279efc6dc';
import {gardenOf,gardenIndices,crownOf,crownMetrics,crownPlates,CROWN_RATES} from './crowns.js?v=6daba4a8ca';
import {detailOf,detailCost,airBarrier} from './details.js?v=707811bbf9';
import {materialOf} from './materials.js?v=be1c7d7582';
import {SCHEMA} from './schema.js?v=fd56569c48';
export const families={box:'Rectilinear',chamfer:'Chamfered',cross:'Cruciform',octagon:'Octagonal',star:'Eight-point',rub:'Rub el Hizb',triangle:'Triangular',hexagon:'Hexagonal',oval:'Faceted oval',petal:'Four-petal',pinwheel:'Pinwheel'};
// Re-exported so the controller has one import edge into the model rather than
// two into the model and the kernel. There is no cycle either way, but one edge
// is one fewer thing for the release stamp to keep in step.
export {isConvex,RUB_INNER_RATIO,RUB_INNER_RADIUS} from './geometry.js?v=eb7a621ab9';
export const defaults={...solarDefaults,family:'cross',span:48,aspect:1,floors:48,height:4.1,taper:0.82,twist:0,core:14,common:12,rent:650,premium:30,occupancy:92,reserve:18,frontage:6,site:68,maxHeight:260,skin:'vertical',material:'float',crown:'flat',garden:'none',led:false,detail:'drained-cavity',system:'column-grid',program:'petronas',regime:'yield'};

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
 custom:{levels:s=>Array.from({length:Math.max(1,Math.min(400,s.floors))},()=>({h:s.height*1000,use:'office',gfa:true})),voids:[]},
 mini:{floors:()=>{const a=[];for(let i=0;i<128;i++)a.push({h:4200,use:'office',gfa:true});return a},voids:[]},
 petronas:{levels:()=>PETRONAS.map((h,i)=>({h,use:i<5?'retail':'office',gfa:true})),voids:VOIDS},
 hkifc:{levels:()=>{const a=[];for(let i=0;i<128;i++)a.push({h:hkifcLevel(i),use:i<11?'retail':'office',gfa:true});return a},voids:VOID_HKIFC}
};

/** The level stack: every level, what it is for, and whether it earns.
 *  Chen stored his heights in millimetres. Geometry here is metres, so the
 *  conversion happens once, here, and nowhere else. */
export function stack(s){
 const prog=levelPrograms[s.program]||levelPrograms.mini;
 const src=prog.levels?prog.levels(s):prog.floors();
 const voidMap=new Map((prog.voids||[]).map(([i,u])=>[i,u]));
 const out=[];let z=0;
 for(let i=0;i<s.floors;i++){
  const lvl=src[i]||src[src.length-1];
  out.push({index:i,z,h:lvl.h/1000,use:lvl.use,gfa:true});
  z+=lvl.h/1000;
 }
 // Sky gardens are applied first, in the same pre-insertion index space the
 // stored voids below use, so a garden and a mechanical level can land on the
 // same storey the way they would on site. A full-floor setback stops the plate
 // outright; a partial one keeps what is left of the floor and gives away the
 // rest. `frac` is therefore the share of the plate that is KEPT — the selector
 // states the share GIVEN AWAY, and the two are complements, so the conversion
 // happens here once. Getting this backwards would quietly triple the area a
 // quarter-floor gives up.
 const gsel=gardenOf(s);
 for(const i of gardenIndices(s)){
  const lvl=out[i];if(!lvl||!lvl.gfa)continue;
  const given=gsel.frac;
  lvl.frac=1-given;
  lvl.garden=given;
  if(given>=1){lvl.gfa=false;lvl.use='garden'}
  else lvl.use='terrace';
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
 competition:{label:'City competition',reads:'Flag',identityMax:0.42,envelopeDiscipline:0.72,heightPull:1,note:'Height and silhouette are the ranking. The building is measured against the other towers, so the model is asked how tall and how unlike them — and does not use envelope cost in this ranking.'},
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

/* ── extension: what the building costs to put up ───────────────────────────
   A stock and a flow are different quantities and obey different laws. The
   reserves above are annual charges — a $/m²/year rate applied every year for
   ever. Nothing in this file so far said what the tower costs *once*, so the
   model could rank designs against each other but could not answer the question
   a client actually asks first: is this scheme worth building at all.

   So the capital cost is stated separately, as a stock, in the same shape the
   reserves use — a named rate on a named area — and it is never added to or
   subtracted from an annual figure. Two readings of the same money at two
   different moments. Both are illustrative USD assumptions a reader can trace
   to a line in this block; neither is a tender, a cost plan or a valuation.

   The frame rate carries the same column-density multiplier the reserve uses,
   so a plan that pays for a longer perimeter pays for it once as well as yearly.
   The envelope carries the facade family's physical weight but NOT the regime's
   envelopeDiscipline: that factor describes how much attention a market pays to
   the skin, not what the skin is made of. A speculative buyer's indifference does
   not make the glass cheaper. */

export const capex={
  // superstructure and substructure to the base of the occupied stack, USD/m²
  // of gross floor area, before the plate's own frame multiplier.
  structure:1120,
  // curtain wall, glazing and its supporting system, USD/m² of the integrated
  // skin surface — the same surface the envelope reserve is charged on.
  envelope:640,
  // base building only: partitions, finishes, lighting, distribution. Tenant
  // fit-out, loose furniture and building services plant are NOT in this.
  fitout:88,
  // carried on the sum of the three. Applied once, not compounded.
  contingency:0.09,
  // Used only to report the implied annual reserve, so the capital stock and the
  // periodic reserve can be read against each other instead of drifting apart
  // silently. It never feeds either figure.
  life:50
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

 let gross=0,facade=0,cornerArea=0,corners=0,coreFits=true,envelopeFits=true,gardenArea=0;
 const coreArea=s.core**2,c=s.core/2;
 let depthWorst=0,clearWorst=Infinity;

 // The skin belongs to every level, mechanical and refuge included. Those
 // levels earn no floor area but they are still weather-tight and still in the
 // way, and counting only the occupied ones understated the envelope by the
 // whole height of the voids.
 for(const l of st){
  const t=l.z/height,p=profile(s,t),zones=l.gfa?cornerZones(p,s):[];
  const frac=l.frac==null?1:l.frac;
  if(l.gfa){
   gross+=area(p)*frac;
   // Numerically integrated skin for this level's slab, from the surface integral — not two
   // triangles across a quad that a twist has already made non-planar.
  }
  // The plate this level gave up to open air, counted whether or not anything
  // is left to sell. A whole-floor setback earns nothing at all, and it is
  // exactly that floor — the one that earns nothing — that still has to be
  // drained, irrigated, planted and waterproofed every year of its life.
  if(frac<1)gardenArea+=area(p)*(1-frac);
  facade+=lateralArea(tab,l.z,l.z+l.h,sAt,s0z,()=>0,th0z);
  // A terrace level keeps only `frac` of its plate; its corner premium cannot
  // exceed what it keeps. ponytail: proportional, not clipped to the kept outline.
  cornerArea+=zones.reduce((a,z)=>a+area(z),0)*frac;
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

 const gardenLevels=st.filter(l=>l.use==='garden').length;
 const voidLevels=st.length-occupied.length-gardenLevels;
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

/* The envelope reserve carries the material. It used not to: materialEnvelopeCost
   was applied in the view, so the rail showed a granite skin price while
   contribution, capexEnvelope and payback were all computed from the float-glass
   reserve underneath. A choice that moves only the displayed number is worse than
   a choice that moves nothing at all — the reader sees a cost, believes the
   building accounts for it, and the arithmetic underneath quietly disagrees. */
const matFactor=materialOf(s).envelope;
const facadeCost=facade*s.reserve*fac.envelope*reg.envelopeDiscipline*matFactor;
  // Frame cost now follows the plate's own column count, not a flat multiplier.
  const cd=columnDensity(profile(s,0),s);
  const structureCost=gross*econ.structureBase*cd.multiplier;
  // The crown and the terraces. Neither sits inside the rentable stack, so
  // neither is folded into rent: each is charged on its own measured area and
  // each is reported separately. The one thing that must NOT be kept apart is
  // height — a crown spends the same height allowance the floors spend, so it
  // is added to the tower's height before the allowance is tested.
  const topPlate=area(profile(s,1));
  const cm=crownMetrics(s,topPlate);
  const heightTotal=height+cm.h;
  const gardenReserve=gardenArea*CROWN_RATES.garden;
  // How the wall is assembled, as distinct from what it is made of. Each detail
  // is charged on the one area it is named after — the skin for an envelope
  // detail, the crown's own plan for a crown detail, the open-air area for a
  // terrace detail — and it is never multiplied by the material coefficient,
  // because the fabric is already in the envelope reserve above.
  const dr=detailCost({facade,crownPlan:cm.plan,gardenArea},s);
  const contribution=rent+cm.netRent-facadeCost-structureCost-cm.reserve-gardenReserve-dr.reserve;

  /* The capital stock. Same named-area discipline as the reserves above, and
     deliberately not combined with them: capex is paid once, contribution is
     earned yearly, and the only legitimate operation between the two is a ratio
     with a year in it. */
  const capexStructure=gross*capex.structure*cd.multiplier;
  const capexEnvelope=facade*capex.envelope*fac.envelope*matFactor;
  const capexFitout=rentable*capex.fitout;
  const capexBase=capexStructure+capexEnvelope+capexFitout+cm.capital+dr.capital;
  const capexTotal=capexBase*(1+capex.contingency);
  // A tower that earns nothing has no payback. Infinity is the honest reading;
  // NaN would render as a blank cell and imply the figure was merely missing.
  const payback=contribution>0?capexTotal/contribution:Infinity;
  // What the reserves above would charge if this exact stock were spread evenly
  // over its life. Reported so the two readings can be compared; it is a
  // cross-check, not an input to either number.
  const capexImpliedReserve=capexTotal/capex.life;

 const reasons=[];
 if(!coreFits)reasons.push('core');
 if(!envelopeFits)reasons.push('site');
 if(heightTotal>s.maxHeight)reasons.push('height');
 if(rentable<=0)reasons.push('area');

 return {
  gross,core,common,rentable,cornerArea,corners,facade,height,
  occupiedCount:occupied.length,voidLevels:st.length-occupied.length-gardenLevels,
  gardenLevels,gardenArea,gardenReserve,
  detailKey:s.detail,detailArea:dr.area,detailReserve:dr.reserve,detailCapital:dr.capital,detailBasis:dr.basis,
  airRate:airBarrier(s).rate,airMeets:airBarrier(s).meets,
  crownHeight:cm.h,heightTotal,crownReserve:cm.reserve,crownCapital:cm.capital,
  crownPlan:cm.plan,crownKind:cm.kind,crownUse:cm.use,
  crownNetRent:cm.netRent,
  observationArea:cm.observationArea,observationRent:cm.observationRent,
  ledArea:cm.area,ledRent:cm.advertRent,ledCost:cm.advertCost,
  voidArea,rent,facadeCost,structureCost,contribution,
   capex:capexTotal,capexStructure,capexEnvelope,capexFitout,
   capexPerM2:capexTotal/Math.max(gross,1),payback,capexImpliedReserve,
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
  heightHeadroom:s.maxHeight-heightTotal,
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
 facade:(m)=>-m.facade,
 silhouette:(m,s)=>m.distinctiveness*1000+(regimes[s.regime].heightPull?m.height:0),
 yieldOnCost:(m)=>m.yieldOnCost
};

/** Regime pull: a city that is competing wants the tall answer too. */
function regimeScore(metrics,s,objective){
 const base=Object.hasOwn(objectives,objective)?objectives[objective](metrics,s):metrics.contribution;
 const pull=regimes[s.regime].heightPull;
 return pull>=1?(metrics.heightTotal??metrics.height)*metrics.distinctiveness:base;
}
/** True when the regime leaves the chosen objective with no weight at all.
    The run-level blend in rank() gives a pull of 1 the objective
    factor (1-pull) = 0, so every objective ranks identically. That is the
    documented behaviour of the City competition regime — height and silhouette
    are its ranking — but a selector that quietly does nothing is a lie, so the
    interface has to be able to ask this question. */
export function objectiveInert(s){return (regimes[s.regime]||regimes.yield).heightPull>=1}

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
 const fit=Math.min(SCHEMA.floors[2],Math.max(SCHEMA.floors[1],Math.floor(maxFloors(s))));
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
 return {state:candidate,metrics,objective,score:regimeScore(metrics,candidate,objective)};
}

/** Change the ranking rule without evaluating geometry a second time.
 * Metrics and feasibility belong to the captured run, including after Apply. */
export function rerank(results,objective='contribution'){
 return rank(results.map(r=>({...r,objective,score:regimeScore(r.metrics,r.state,objective)})));
}

export function rank(results){
 const feasible=results.filter(x=>x.metrics.valid),ranges=new Map();
 // Only feasible candidates define the scale. Raw USD/area/count values never
 // share a sum with metres; weights now combine two dimensionless signals.
 for(const r of feasible){
  const pull=regimes[r.state.regime].heightPull;if(pull<=0||pull>=1)continue;
  const key=r.state.regime+'|'+r.objective,h=(r.metrics.heightTotal??r.metrics.height)*r.metrics.distinctiveness;
  const b=Object.hasOwn(objectives,r.objective)?objectives[r.objective](r.metrics,r.state):r.metrics.contribution;
  const range=ranges.get(key)||{bMin:Infinity,bMax:-Infinity,hMin:Infinity,hMax:-Infinity};
  range.bMin=Math.min(range.bMin,b);range.bMax=Math.max(range.bMax,b);range.hMin=Math.min(range.hMin,h);range.hMax=Math.max(range.hMax,h);ranges.set(key,range);
 }
 const normalized=(v,lo,hi)=>hi-lo>1e-12?(v-lo)/(hi-lo):.5;
 const ranked=feasible.map(r=>{
  const pull=regimes[r.state.regime].heightPull,rawHeight=(r.metrics.heightTotal??r.metrics.height)*r.metrics.distinctiveness;
  const rawObjective=Object.hasOwn(objectives,r.objective)?objectives[r.objective](r.metrics,r.state):r.metrics.contribution;
  if(pull<=0||pull>=1)return {...r,score:pull>=1?rawHeight:rawObjective};
  const range=ranges.get(r.state.regime+'|'+r.objective),objective=normalized(rawObjective,range.bMin,range.bMax),height=normalized(rawHeight,range.hMin,range.hMax);
  return {...r,score:objective*(1-pull)+height*pull,ranking:{version:2,method:'feasible-run-minmax',objective,height,objectiveWeight:1-pull,heightWeight:pull,rawObjective,rawHeight,...range}};
 });
 ranked.sort((a,b)=>{
  const d=b.score-a.score;
  // Ties are common on integer objectives (corner counts), so the order must
  // not depend on the order candidates arrived in.
  if(Math.abs(d)>1e-9)return d;
  const k=r=>[r.state.family,r.state.taper,r.state.twist,r.state.floors].join('|');
  return k(a)<k(b)?-1:k(a)>k(b)?1:0;
 });
 return ranked;
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
 for(const l of st){ if(l.gfa) gross+=area(profile(s,l.z/total))*(l.frac==null?1:l.frac) }
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
 while(n<400&&stackHeight(s,n+1)+crownOf(s).h<=s.maxHeight)n++;
 while(n>1&&stackHeight(s,n)+crownOf(s).h>s.maxHeight)n--;
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
const levels=s=>{const prog=levelPrograms[s.program]||levelPrograms.mini;return prog.levels?prog.levels(s):prog.floors(s)};

/** Shared exterior massing rings: metres, x east/y north/z up.
 * Crown factors are the existing schematic linear scales used by the drawing.
 * bands optionally samples the continuous body for shadow analysis. */
export function massingRings(s,bands=null){
 const st=stack(s),H=stackHeight(s),c=crownOf(s);
 const zs=bands?Array.from({length:bands+1},(_,i)=>H*i/bands):[0,...st.map(l=>l.z+l.h)];
 const rings=zs.map(z=>({z,poly:profile(s,z/H),kind:'body'}));
 if(c.h>0){const roof=profile(s,1);for(const p of crownPlates(c))rings.push({z:H+p.t*c.h,poly:roof.map(([x,y])=>[x*p.f,y*p.f]),kind:'crown'})}
 return rings;
}

// Ear clipping keeps the concave caps of the cross/star/pinwheel inside their
// actual outline. A fan across those polygons creates faces outside the solid.
function capTriangles(poly){
 const left=poly.map((_,i)=>i),out=[],cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 while(left.length>3){
  let clipped=false;
  for(let j=0;j<left.length;j++){
   const a=left[(j+left.length-1)%left.length],b=left[j],c=left[(j+1)%left.length];
   if(cross(poly[a],poly[b],poly[c])<=1e-10)continue;
   if(left.some(k=>k!==a&&k!==b&&k!==c&&cross(poly[a],poly[b],poly[k])>=-1e-10&&cross(poly[b],poly[c],poly[k])>=-1e-10&&cross(poly[c],poly[a],poly[k])>=-1e-10))continue;
   out.push([a,b,c]);left.splice(j,1);clipped=true;break;
  }
  if(!clipped)throw new RangeError('Cannot triangulate massing cap');
 }
 out.push([...left]);return out;
}

export function meshOBJ(s){
 const rings=massingRings(s),n=rings[0].poly.length;
 const lines=['# FormHypes conceptual exterior massing; units: metres; Y up',
 '# Embedded level knowledge after Shouheng Chen, MIT SMArchS 2006',
 '# Schematic crown included; no core, interiors, terrace openings or assembly detail',
 `# level program: ${s.program} (${occupiedLevels(levels(s))} levels of schedule)`,
 `# rings: ${rings.length} (grade and slab/crown elevations)`];
 for(const r of rings)for(const [x,y] of r.poly)lines.push(`v ${x.toFixed(5)} ${r.z.toFixed(5)} ${y.toFixed(5)}`);
 // Swapping north/up for OBJ reflects the axes: reverse each world-space face
 // so outward normals remain outward in the exported coordinate system.
 const face=indices=>lines.push('f '+indices.map(i=>i+1).reverse().join(' '));
 for(let k=0;k<rings.length-1;k++)for(let i=0;i<n;i++){
  const j=(i+1)%n,a=k*n+i,b=k*n+j,c=(k+1)*n+j,d=(k+1)*n+i;
  face([a,b,c]);face([a,c,d]);
 }
 for(const f of capTriangles(rings[0].poly))face([...f].reverse());
 for(const f of capTriangles(rings.at(-1).poly))face(f.map(i=>(rings.length-1)*n+i));
 return lines.join('\n');
}
