// FormHypes — run the real engine on Pelli's plate.
//
// The research tab quotes figures about the Rub el Hizb. Those figures must be
// produced by geometry.js and model.js, not typed by hand, or the copy drifts
// from the code. This script is the thing that generates them; the test suite
// pins its output so a change to the kernel cannot silently falsify the prose.
//
//   node scripts/petronas-report.mjs
//
// Output is JSON on stdout.

import {
  planLibrary, polyArea, polyPerimeter, isConvex,
  RUB_INNER_RATIO, RUB_INNER_RADIUS,
  daylitFraction, daylightReachFor, cotSky
} from '../dist/geometry.js';
import { cornerZones, columnDensity, evaluate, defaults, profile, distinctiveness } from '../dist/model.js';

const f=(n,d=4)=>Number(n.toFixed(d));
const R2=Math.SQRT2;

/* ── 1. the closed forms, checked before anything is claimed ─────────────── */

// The ratio geometry before `unit()` normalises it, rebuilt here so the two
// identities can be asserted against the library's own construction.
const rawStar=[];
for(let i=0;i<16;i++){
  const a=Math.PI/8+i*Math.PI/8,r=i%2?RUB_INNER_RADIUS:0.5;
  rawStar.push([Math.cos(a)*r,Math.sin(a)*r]);
}
const rawArea=polyArea(rawStar),rawEdge=polyPerimeter(rawStar)/16;
const closedArea=2-R2;                  // 8·R·r·sin(π/8)          0.5857864…
const closedEdge=(R2-1)/2;              // √(¼(3−2√2))              0.2071068…

/* ── 2. the plate, at equal gross floor area ───────────────────────────────
   Equal-area discipline is the spine of this model: two plans are only ever
   compared after both have been resized to the same GFA. So the reference here
   is a plain box carrying the same floor area as the Rub el Hizb, and every
   comparison below is at that matched area. */

const SPAN=48;                                   // half-width in metres
const s={...defaults,family:'rub',span:SPAN,aspect:1,system:'column-grid'};
const r=evaluate(s);                              // the model's own sky reach
const reach=r.skyReach;                           // derived, not chosen
const rub=profile(s,0);
const rubArea=polyArea(rub);

// The matched plain slab: same area, so k below rescales its span.
const boxUnit=profile({...s,family:'box',span:1},0);
const k=Math.sqrt(rubArea/polyArea(boxUnit));
const box=profile({...s,family:'box',span:k},0);

const zones=p=>cornerZones(p,{...s,core:14,frontage:6});

/* ── 3. what the engine says about the two plates ────────────────────────── */

const describe=(p,name)=>{
  const A=polyArea(p),P=polyPerimeter(p);
  const z=zones(p);
  const cd=columnDensity(p,s);
  const zA=z.reduce((a,q)=>a+polyArea(q),0);
  return {
    name,
    area:f(A,1),
    perimeter:f(P,2),
    shapeFactor:f(P/A,5),                       // P/A — the frame-cost driver
    convex:isConvex(p),
    vertices:p.length,
    cornerOffices:z.length,
    cornerArea:f(zA,1),
    cornerAreaPct:f(zA/A*100,1),
    daylitPct:f(daylitFraction(p,reach)*100,1),
    frameMultiplier:f(cd.multiplier,3),
    columnsPerFloor:f(cd.columns,0)
  };
};

/* ── 4. at what span does Pelli's star start to lease? ─────────────────────
   The two-frontage test needs 2·frontage metres on each adjoining edge. The
   Rub el Hizb's edges are short by construction, so this is the number that
   decides whether the eight points are worth anything. */

const sweep=[24,30,36,42,48,54,60,72,84].map(sp=>{
  const p=profile({...s,span:sp},0);
  const e=polyPerimeter(p)/16;
  return {span:sp,edgeMetres:f(e,2),cornerOffices:zones(p).length,area:f(polyArea(p),0)};
});

/* ── 5. interior angles, which is where the corner offices come from ─────── */

const angles=p=>{
  const seen={};
  p.forEach((v,i)=>{
    const a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length];
    const u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]];
    const lu=Math.hypot(...u),lw=Math.hypot(...w);
    const cr=(u[0]*w[1]-u[1]*w[0])/(lu*lw);
    const deg=Math.acos(Math.max(-1,Math.min(1,(u[0]*w[0]+u[1]*w[1])/(lu*lw))))*180/Math.PI;
    const key=`${f(deg,1)}`;
    if(!seen[key])seen[key]={deg:f(deg,1),count:0,convex:cr<0,edgeMetres:f(Math.min(lu,lw),2)};
    seen[key].count++;
  });
  return Object.values(seen);
};

/* ── 6. the full evaluate() pass on Pelli's plate ────────────────────────── */

const dx=distinctiveness(s);

/* ── 7. an order-of-magnitude check against the real building ───────────────
   Archnet gives 218,000 m² per tower over 88 storeys. Dividing gives the
   average floor area of the real Petronas tower, bustle included. That average
   is not a measurement of a single plate — it is smeared over 88 floors and a
   44-storey circular annex — so this is a sanity check on the order of
   magnitude the engine produces, not a claim that Pelli used this span. */

const REAL_TOWER_AREA=218000, REAL_FLOORS=88;
const impliedFloorArea=REAL_TOWER_AREA/REAL_FLOORS;
const span60=profile({...s,span:60},0);

const report={
  ratio:f(RUB_INNER_RATIO,10),
  innerRadius:f(RUB_INNER_RADIUS,10),
  identityChecks:{
    rawArea:f(rawArea,10),closedArea:f(closedArea,10),
    areaError:f(Math.abs(rawArea-closedArea),12),
    rawEdge:f(rawEdge,10),closedEdge:f(closedEdge,10),
    edgeError:f(Math.abs(rawEdge-closedEdge),12)
  },
  sky:{cotSky:f(cotSky,6),reachMetres:f(reach,3)},
  span:SPAN,matchedBoxScale:f(k,4),
  plates:{rub:describe(rub,'Rub el Hizb (Pelli, 1993)'),box:describe(box,'Rectilinear slab, area-matched')},
  rubAngles:angles(rub),
  spanSweep:sweep,
  realBuilding:{
    source:'archnet.org/sites/4402 — 218,000 m² per tower, 88 storeys, incl. 44-storey bustle',
    impliedFloorArea:f(impliedFloorArea,0),
    engineFloorAreaAtSpan60:f(polyArea(span60),0),
    differencePct:f((polyArea(span60)-impliedFloorArea)/impliedFloorArea*100,2)
  },
  evaluate:{
    gross:f(r.gross,1),rentable:f(r.rentable,1),efficiency:f(r.efficiency,1),
    corners:r.corners,cornerArea:f(r.cornerArea,1),
    height:f(r.height,2),facade:f(r.facade,0),volume:f(r.volume,0),
    skyReach:f(r.skyReach,3),daylitFraction:f(r.daylitFraction*100,1),
    structureMultiplier:f(r.structureMultiplier,3),shapeFactor:f(r.shapeFactor,3),
    distinctiveness:f(r.distinctiveness,4)
  },
  distinctivenessBreakdown:{density:f(dx.density,3),move:f(dx.move,3),variance:f(dx.variance,3),convex:dx.convex}
};

console.log(JSON.stringify(report,null,2));