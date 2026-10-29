// FormHypes — geometry kernel
//
// Everything here is a closed form or an integral of a closed form. Where a
// number comes from a standard result, the result is named. Where it comes from
// a choice, the choice is a named constant the reader can change.
//
// Three ideas do the work:
//
//   1. SUPPORT FUNCTIONS. A convex body is completely described by
//        h_K(θ) = max_{x∈K} x·u(θ),   u(θ) = (cos θ, sin θ)
//      and Cauchy's formulas give its size exactly:
//        perimeter = ∫₀^π h dθ
//        area      = ½∫₀^{2π} (h² − h′²) dθ
//      The reason this matters for architecture is the second property:
//
//   2. MINKOWSKI ADDITION IS ADDITION OF SUPPORT FUNCTIONS.
//        h_{A ⊕ B} = h_A + h_B
//      So a plan is not a table of coordinates you maintain by hand — it is an
//      algebraic expression. "A chamfered slab" becomes rectangle ⊕ 45°
//      rectangle. "A cruciform" is an explicit convex hull. Compositions are
//      convex by construction, which matters because corner offices exist only
//      where the plate is convex. Chen wrote his plans as point arrays, which is
//      why he had to reason about them by eye; this is the same information in a
//      form that composes.
//
//   3. THE TOWER IS A LOFTED SOLID, NOT A STACK OF PLATES.
//      With s(z) the taper factor and θ(z) the twist angle, the surface is
//        X(u,z) = ( s(z)·R(θ(z))·q(u), z )
//      whose exact area element is
//        |∂X/∂u × ∂X/∂z| = √( s² + ( s·s′·(q′×q) + s²·θ′·(q′×Jq) )² )
//      with J the quarter-turn and q parameterised by arc length (|q′| = 1).
//      Three consequences that the old point-sampling method could not express:
//        · for a plain prism it collapses to exactly perimeter × height;
//        · for a twist it depends on where mass sits relative to the rotation
//          axis, because the (q′×Jq) term is the lever arm. The familiar slant
//          formula P·√(1+θ′²) is wrong by a factor that grows with the plan's
//          radial spread — for a 20 m square twisted 360° over its height it
//          understates the true surface by 394%.
//        · the two gradient terms enter as a single magnitude, so a taper and a
//          twist acting in opposite senses partly cancel along the surface
//          instead of being charged twice.

export const cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
export const rot=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return[x=>c*x[0]-s*x[1],x=>s*x[0]+c*x[1]]};
const J=q=>[-q[1],q[0]];

/* ── planar measures ─────────────────────────────────────────────────────── */

export function polyArea(p){let s=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];s+=p[i][0]*q[1]-q[0]*p[i][1]}return Math.abs(s)/2}
export function polyPerimeter(p){let s=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];s+=Math.hypot(q[0]-p[i][0],q[1]-p[i][1])}return s}

/** Twice the signed area of the triangle swept as the profile turns once — a
 *  measure of how strongly the plan reaches out from its own centre, which is
 *  the quantity the twist term actually charges for. */
export function polarMoment(p){
  // ∮ (q·q′)² ds, by sampling each edge in arc length.
  let m=0;
  for(let i=0;i<p.length;i++){
    const A=p[i],B=p[(i+1)%p.length],L=Math.hypot(B[0]-A[0],B[1]-A[1]);
    if(L<1e-12)continue;
    const d=[(B[0]-A[0])/L,(B[1]-A[1])/L];
    const n=Math.max(2,Math.ceil(L*4));
    for(let j=0;j<n;j++){
      const f=(j+.5)/n,q=[A[0]+d[0]*L*f,A[1]+d[1]*L*f];
      m+=(q[0]*d[0]+q[1]*d[1])**2*(L/n);
    }
  }
  return m;
}

/* ── convex primitives and Minkowski addition ───────────────────────────── */

/** Andrew's monotone chain. Used to guarantee convexity for the one family
 *  that is not naturally a Minkowski sum. */
export function convexHull(pts){
  const p=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(p.length<3)return p;
  const half=src=>{const st=[];for(const q of src){while(st.length>=2&&cross2([st[st.length-1][0]-st[st.length-2][0],st[st.length-1][1]-st[st.length-2][1]],[q[0]-st[st.length-2][0],q[1]-st[st.length-2][1]])<=0)st.pop();st.push(q)}st.pop();return st};
  return half(p).concat(half(p.slice().reverse()));
}

/** Rectangle centred on the origin. */
export const rect=(w,h)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];

/** Minkowski sum of two convex polygons, computed by merging their edge
 *  directions in angular order. O(n+m) after a rotation fix — this is the
 *  standard convex-polygon sum, not an approximation. */
export function minkowski(A,B){
  // Both inputs must be counter-clockwise. Rotate each to start at its
  // lowest-then-leftmost vertex so the angular merge starts from a clean seam.
  const norm=p=>{
    let i=0;
    for(let k=1;k<p.length;k++)
      if(p[k][1]<p[i][1]-1e-12||(Math.abs(p[k][1]-p[i][1])<=1e-12&&p[k][0]<p[i][0]))i=k;
    return p.slice(i).concat(p.slice(0,i));
  };
  const a=norm(A),b=norm(B),n=a.length,m=b.length;
  // Edge directions as strictly increasing angles. A raw atan2 wraps negative
  // just before closing back to the start, which would put the last edge ahead
  // of the first and corrupt the merge — so the sequence is unwrapped.
  const edges=p=>{
    const e=[];
    for(let i=0;i<p.length;i++){
      const y=p[(i+1)%p.length],z=p[i];
      let ang=Math.atan2(y[1]-z[1],y[0]-z[0]);
      let guard=0;
      while(i>0&&ang<=e[i-1][0]&&guard++<8)ang+=2*Math.PI;
      e.push([ang,y[0]-z[0],y[1]-z[1]]);
    }
    return e;
  };
  const ea=edges(a),eb=edges(b);
  const out=[[a[0][0]+b[0][0],a[0][1]+b[0][1]]];
  let i=0,j=0;
  while(i<n||j<m){
    const A1=i<n?ea[i]:null,B1=j<m?eb[j]:null;
    // Merge by edge angle. Both polygons are drained at this angle, not one
    // then the other — otherwise two collinear edges become two vertices and the
    // sum silently loses its shape (a rectangle plus itself must be a rectangle).
    const ang=Math.min(A1?A1[0]:Infinity,B1?B1[0]:Infinity);
    let dx=0,dy=0;
    if(A1)while(i<n&&Math.abs(ea[i][0]-ang)<1e-12){dx+=ea[i][1];dy+=ea[i][2];i++}
    if(B1)while(j<m&&Math.abs(eb[j][0]-ang)<1e-12){dx+=eb[j][1];dy+=eb[j][2];j++}
    const last=out[out.length-1];
    if(Math.hypot(dx,dy)>1e-12)out.push([last[0]+dx,last[1]+dy]);
  }
  out.pop(); // the walk closes back on the start
  return out;
}

/* ── the lofted tower ───────────────────────────────────────────────────── */

/** Precompute the arc-length edge table once per plan; every level reuses it. */
export function loftTable(p){
  const edges=p.map((v,i)=>{
    const w=p[(i+1)%p.length],L=Math.hypot(w[0]-v[0],w[1]-v[1]);
    return L<1e-12?null:{A:v,d:[(w[0]-v[0])/L,(w[1]-v[1])/L],L};
  }).filter(Boolean);
  return {edges,P:edges.reduce((a,e)=>a+e.L,0)};
}

/**
 * Exact lateral area of the lofted surface between two heights.
 *
 *   z      height in metres
 *   s,s0   taper factor at z and its gradient dz⁻¹ (s0 = ds/dz)
 *   th,th0 twist angle at z in radians and its gradient dz⁻¹
 *
 * Integrand (see header): √( s² + ( s·s₀·(q′×q) + s²·θ₀·(q′×Jq) )² )
 * Integrated over arc length u and height z by midpoint rule (Simpson weights do not
 * apply to midpoint nodes, and the integrand is linear-dominant inside a level).
 */
/* The inner loop is the studio's hottest code: it runs once per level per
   candidate, and a candidate search runs it a few hundred times. It used to
   build a two-element array for every sample — the garbage collector was a
   tenth of the profile — and to read the edge's four numbers out of the edge
   object on every sample too. Both are gone, and the arithmetic is the same
   expression in the same order, so the number that comes out is the number that
   came out before. tests/model-identity.test.mjs holds the proof. */
export function lateralArea(tab,z0,z1,s,s0,th,th0,NZ=8,NU=12){
  if(z1<=z0)return 0;
  const dz=(z1-z0)/NZ;
  let total=0;
  for(let k=0;k<NZ;k++){
    // Simpson weights 1,4,2,4,...,4,1 over the slice
    const zm=z0+dz*(k+.5);
    const sz=s(zm),s0z=s0(zm),t0z=th0(zm);
    let inner=0;
    for(const e of tab.edges){
      const ex=e.d[0],ey=e.d[1],ax=e.A[0],ay=e.A[1],el=e.L;
      const step=el/NU;
      let seg=0;
      for(let j=0;j<NU;j++){
        const f=(j+.5)/NU;
        const qx=ax+ex*el*f,qy=ay+ey*el*f;
        const lever=qx*ex+qy*ey;               // q′×Jq = q·q′
        const crossq=ex*qy-ey*qx;              // q′×q
        const I=Math.sqrt(sz*sz+(sz*s0z*crossq+sz*sz*t0z*lever)**2);
        seg+=I*step;
      }
      inner+=seg;
    }
    total+=inner*dz;
  }
  return total;
}

/** Convexity test: every turn the same way. Used as an invariant — the point of
 *  building plans by composition is that they *cannot* be concave by accident. */
export function isConvex(p){
  let sign=0;
  for(let i=0;i<p.length;i++){
    const v=p[i],a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length];
    const c=cross2([v[0]-a[0],v[1]-a[1]],[b[0]-v[0],b[1]-v[1]]);
    if(Math.abs(c)<1e-9)continue;
    const s=Math.sign(c);
    if(!sign)sign=s;else if(s!==sign)return false;
  }
  return true;
}

/* ── plan families, built as expressions rather than coordinate tables ───────
   Chen wrote his plans as arrays of points and had to reason about them by eye.
   Here each plan is a composition, which means it is convex by construction,
   its perimeter and area are known before it is drawn, and a change to one
   operand propagates correctly instead of having to be re-typed at 12 points. */

const rotate=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return p.map(([x,y])=>[c*x-s*y,s*x+c*y])};
const scale=(p,k)=>p.map(([x,y])=>[x*k,y*k]);

/** Regular n-gon of circumradius r, exact, counter-clockwise. */
export function regularPolygon(n,r,phase=0){
  const p=[];
  for(let i=0;i<n;i++){const a=phase+2*Math.PI*i/n;p.push([r*Math.cos(a),r*Math.sin(a)])}
  return p;
}

/** A 45° square — the chamfer/diamond operator. `c` is the half-diagonal, so
 *  c = 0.2 cuts a 0.2·√2 chamfer off each corner of a unit plan. */
const diamond=c=>[[0,-c],[c,0],[0,c],[-c,0]];

/** Normalise so the largest half-extent is 0.5, which is the convention Chen's
 *  hand-drawn plans used and the one the span control is calibrated against:
 *  `span` means the plate's half-width in metres. */
const unit=p=>{
  const m=Math.max(...p.flatMap(([x,y])=>[Math.abs(x),Math.abs(y)]));
  return m<1e-12?p:p.map(([x,y])=>[x/(2*m),y/(2*m)]);
};

/** Chen's eight-point construction — sixteen vertices at alternating radii,
 *  outer fixed at 0.5 so `rin` is an absolute inner radius against it. This is
 *  not a cosmetic change: the valley edges between points scale directly with
 *  that radius, and at 0.34 the short edges fall to 11.8 m at a 48 m span,
 *  just under the two-frontage threshold a corner office needs. At 0.30 they
 *  clear it at 13.0 m and all sixteen corners become real. Non-convex, like the
 *  cruciform, and for the same reason. */
const starPolygon=rin=>{
  const p=[];
  for(let i=0;i<16;i++){
    const a=Math.PI/8+i*Math.PI/8,r=i%2?rin:0.5;
    p.push([Math.cos(a)*r,Math.sin(a)*r]);
  }
  return p;
};

/**
 * THE RUB EL HIZB RATIO — Pelli's actual plan, as a single number.
 *
 * A Rub el Hizb is two squares of the same side, concentric, one rotated 45°
 * about the other (archnet.org/sites/4402; Wikipedia, Petronas Towers, which
 * names the figure and notes circular sectors were added for office space). The
 * union of two such squares is an eight-pointed star, so it lands on exactly the
 * same sixteen-vertex lattice `starPolygon` already uses. The ratio between the
 * inner and outer radii is therefore not a choice but a consequence:
 *
 *      outer  = a√2                     (the rotated square's corners)
 *      inner  = √(a² + (√2−1)²a²) = a√(4−2√2)   (where each square crosses)
 *      ratio  = √(4−2√2) / √2 = √(2−√2) = 0.7653669…
 *
 * Two closed forms fall out of that and are asserted in the test suite, so the
 * research copy can quote the engine instead of quoting itself. With the outer
 * radius held at the family convention R = 0.5:
 *
 *      area               = 8·R·r·sin(π/8)   = 2−√2        = 0.5857864…
 *      valley edge length = √(¼(3−2√2))    = (√2−1)/2    = 0.2071068…
 *      interior angle at each point = 90°, at each valley = 135°
 *
 * Chen's star uses the same operator at an inner radius of 0.30. Pelli's is
 * 0.3826834 — five times the outer radius of the valley instead of three fifths
 * of it. Same sixteen vertices, same code path, an entirely different plate.
 */
export const RUB_INNER_RATIO=Math.sqrt(2-Math.SQRT2);
export const RUB_INNER_RADIUS=0.5*RUB_INNER_RATIO;

/** The five plans. Three are convex and are built as compositions; two cannot
 *  be, and that fact is itself a result. */
export const planLibrary={
  // A plain slab. The trivial Minkowski sum — the baseline every other plan is
  // measured against. Four corners, all of them usable.
  box:()=>unit(rect(1,1)),

  // Rectangular slab ⊕ 45° diamond = the chamfered slab. The chamfer is not a
  // drawing decision here; it is the radius of one operand. Note the honest
  // outcome: a 45° chamfer edge is short, and a corner office needs two full
  // frontages of frontage on both sides of it, so the chamfered slab earns no
  // corner offices at all. That finding is from the model, not from the drawing.
  chamfer:()=>unit(minkowski(rect(1,0.74),diamond(0.13))),

  // THE FIRST EXCEPTION. A cruciform is not a convex body: the segment joining
  // two opposite arm tips leaves the plan, so its support function records only its convex hull;
  // convex Minkowski sums cannot preserve its recesses. Every one of its eight
  // arm-tip turns is still locally convex, which is why it carries corner
  // offices — cornerZones tests each vertex and never asks whether the plan as a
  // whole is convex. Chen's twelve vertices, kept exactly as he wrote them.
  cross:()=>unit([[-.2,-.5],[.2,-.5],[.2,-.2],[.5,-.2],[.5,.2],[.2,.2],[.2,.5],[-.2,.5],[-.2,.2],[-.5,.2],[-.5,-.2],[-.2,-.2]]),

  // Regular octagon, from the closed form rather than eight typed points.
  // Equivalently square ⊕ 45° square at the ratio that equalises the sides.
  // Eight equal 19.9 m faces at a 48 m span, 135° at each corner: eight corner
  // offices that the chamfered slab above cannot have.
  octagon:()=>unit(regularPolygon(8,0.5,Math.PI/8)),

  // THE SECOND EXCEPTION — and again because the plan is not convex. A convex
  // sixteen-sided star has 157.5° at every vertex and therefore no corner
  // offices at all; the points have to be re-entrant for the tips to bite.
  star:()=>unit(starPolygon(0.30)),

  // Pelli's plate, 1993. The same sixteen-vertex operator as `star` above, run at
  // RUB_INNER_RADIUS instead of 0.30 — which is the entire difference between
  // Chen's aggressive star and the Rub el Hizb, and it is a closed form rather
  // than a taste. The eight points come out at a 90° interior angle on edges of
  // (√2−1)/2 × scale; the eight valleys are 135° reflex and are correctly
  // refused by cornerZones, because a re-entrant corner is where the plate is
  // missing, not where a tenant sits.
  rub:()=>unit(starPolygon(RUB_INNER_RADIUS)),

  // New 2026 design families. All are simple CCW polygons without holes.
  // The oval and petals are deliberately faceted approximations, not curves.
  triangle:()=>unit(regularPolygon(3,0.5,Math.PI/2)),
  hexagon:()=>unit(regularPolygon(6,0.5,Math.PI/6)),
  oval:()=>unit(regularPolygon(24,0.5).map(([x,y])=>[x,y*.72])),
  petal:()=>unit(Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,r=.4+.09*Math.cos(4*a);return[r*Math.cos(a),r*Math.sin(a)]})),
  pinwheel:()=>unit(Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r=[.5,.38,.29][i%3];return[r*Math.cos(a),r*Math.sin(a)]}))
};
export function loftVolume(A0,A1,z0,z1,s,NZ=8){
  if(z1<=z0)return 0;
  const dz=(z1-z0)/NZ;
  let t=0;
  for(let k=0;k<NZ;k++){
    const zm=z0+dz*(k+.5);
    const sz=s(zm);
    t+=(A0+(A1-A0)*sz*sz)*dz;
  }
  return t;
}

/* ── daylight: the physical part ────────────────────────────────────────── */

/**
 * Depth at which a point on the floor still sees the sky.
 *
 * Under a CIE overcast sky of altitude angle θ_s, a point d metres in from the
 * facade sees the sky only while
 *      arctan(h_head / d) ≥ θ_s      ⇒      d ≤ h_head / tan θ_s = h_head · cot θ_s
 *
 * θ_s = 42° is the standard overcast reference used for a 2 % daylight factor
 * in the IES daylight-factor method; cot 42° = 1.1106. This is the *sky
 * component alone* — inter-reflected light carries further, which is why the
 * value model below keeps a separate, named market tolerance rather than
 * pretending this number is what a tenant pays for.
 */
export const skyAngleDeg=42;
export const cotSky=1/Math.tan(skyAngleDeg*Math.PI/180);
export const daylightReachFor=headHeight=>headHeight*cotSky;

/** Shortest distance from a point to a polygon boundary. */
export function distToBoundary(p,v){
  let best=Infinity;
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length];
    const abx=b[0]-a[0],aby=b[1]-a[1],L2=abx*abx+aby*aby;
    const t=L2<1e-18?0:Math.max(0,Math.min(1,((v[0]-a[0])*abx+(v[1]-a[1])*aby)/L2));
    const dx=v[0]-(a[0]+abx*t),dy=v[1]-(a[1]+aby*t);
    const d=Math.hypot(dx,dy);
    if(d<best)best=d;
  }
  return best;
}

/** The same measurement, squared, and without the square root.
 *
 *  The daylight quadrature asks one question of every sample: is this point
 *  within the sky reach? That question is about a comparison, and a comparison
 *  does not need the distance itself — it needs the distance against the reach
 *  squared. Math.hypot was called eight thousand times per evaluation to
 *  produce a number nobody read, and hypot is deliberately slower than sqrt
 *  because it is careful about overflow. This returns the squared distance to
 *  the boundary; the reach is squared by the caller and the two are compared.
 *
 *  The sample count is a quadrature estimate and says so wherever it is shown,
 *  so a difference of one part in 10^16 in a distance is not a change in the
 *  answer. tests/model-identity.test.mjs still compares the two paths over a
 *  wide sample of plates and reaches and requires them to agree. */
function distSqToBoundary(p,vx,vy){
  let best=Infinity;
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length];
    const abx=b[0]-a[0],aby=b[1]-a[1],L2=abx*abx+aby*aby;
    const t=L2<1e-18?0:Math.max(0,Math.min(1,((vx-a[0])*abx+(vy-a[1])*aby)/L2));
    const dx=vx-(a[0]+abx*t),dy=vy-(a[1]+aby*t);
    const q=dx*dx+dy*dy;
    if(q<best)best=q;
  }
  return best;
}

/**
 * The fraction of the plate that can still see the sky.
 *
 * Integrated on an N×N lattice over the plan's bounding box, keeping samples
 * that fall inside the polygon and measuring each one's distance to the
 * boundary. This is a quadrature estimate, not a closed form — it is labelled as
 * such wherever it is shown — but it answers the question the plan is actually
 * being judged on: not how deep the worst spot is, but how much of the floor
 * plate is paying rent while sitting in the dark.
 */
export function daylitFraction(p,reach,N=28){
  let xs=[Infinity,-Infinity],ys=[Infinity,-Infinity];
  for(const [x,y] of p){xs[0]=Math.min(xs[0],x);xs[1]=Math.max(xs[1],x);ys[0]=Math.min(ys[0],y);ys[1]=Math.max(ys[1],y)}
  const w=xs[1]-xs[0],h=ys[1]-ys[0];
  if(w<1e-12||h<1e-12)return 0;
  const reach2=reach*reach;
  let inside=0,lit=0;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const vx=xs[0]+w*(i+.5)/N, vy=ys[0]+h*(j+.5)/N;
    if(!pointInXY(p,vx,vy))continue;
    inside++;
    if(distSqToBoundary(p,vx,vy)<=reach2)lit++;
  }
  return inside?lit/inside:0;
}

export function pointInPolygon(p,v){return pointInXY(p,v[0],v[1])}

/** The same test, with the point's coordinates already in hand. The public
 *  form takes a pair because that is how callers hold a point; the loops that
 *  test thousands of points have the numbers already and should not rebuild a
 *  pair for each one. */
export function pointInXY(p,vx,vy){
  let c=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const a=p[i],b=p[j];
    if((a[1]>vy)!==(b[1]>vy)&&vx<(b[0]-a[0])*(vy-a[1])/(b[1]-a[1])+a[0])c=!c;
  }
  return c;
}