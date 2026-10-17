/* Where does this building stand?

   The cityscape desk draws a real city from harvested OpenStreetMap footprints
   and heights, and until now the tower stood in the middle of it because there
   was nowhere else to put it. The plot was never chosen. That is the difference
   between a massing study and a site appraisal, and it is the question an
   architect actually asks first: not "what does it look like" but "on WHICH
   piece of ground does it have to live, and what does that cost it".

   So this module does three things, in order:

     1. Reads the harvested GROUND — streets, water, parks — into metres. It is
        a separate file from the footprints on purpose: Overpass fails, and a
        missing street is scenery, while a missing building is the building.

     2. Turns the footprint field into CANDIDATE PLOTS and, for each one,
        computes what standing there would actually mean: the plot area, how
        much of it the plate eats, the depth and aspect the daylight has to
        cross, the width of the street it fronts, how tall the neighbours are,
        the sky it would see, and whose roof it would put in shadow.

     3. Draws it — a landscape with our tower standing in it, not floating over
        it.

   THE METRICS ARE REAL AND THEY ARE APPROXIMATE, AND THE FILE SAYS WHICH.
   The sky view factor is a cosine-weighted average of the skyline elevation
   over 72 azimuths, which is the standard sketch method and is wrong at the
   corners of a real hemisphere. The shadow is the convex hull of the footprint
   and its own offset, which is exact for a prism and silently understates the
   shadow of anything with a crown. Both are stated on the drawing. A number
   that is quietly wrong is worse than a number that is honestly coarse.

   AND THE SKY IS A CEILING, NOT A MEASUREMENT.

   The footprint harvest keeps a building only when OpenStreetMap carries a
   height for it. That is the right call — a default storey count would be a
   made-up number wearing a real one's name — and it has a consequence that has
   to be stated rather than discovered: Sathorn has 121 buildings with a height
   tag where the real district has thousands, so the massing here is a skeleton
   and every sky view factor computed against it is too high. It over-reports.
   So the note under the section says the factor is a ceiling, in all three
   languages, and the section draws the band it actually measured rather than
   the one the district would give. Adding buildings by assumption would make
   the picture fuller and the number worse.

   NOTHING HERE IS INVENTED. Every length is metres, projected from OSM
   coordinates by the same equirectangular projection the footprints use, so
   the ground and the buildings overlay without a seam. The only declared
   assumption is the one already declared everywhere on this site: the drawing
   is a study, not a survey. */

/* ── projection ───────────────────────────────────────────────────────────
   The same oblique the hero cityscape uses, lifted out of app.js so it can be
   tested without a canvas. Derived, not copied: screen X is a rotation of the
   ground plane, screen Y falls as (0.96·z − 0.36·depth) rises, so a point
   further away draws higher and a point higher draws higher. */

export function makeScene({width=760,maxHeight=470,radius=700,towerH=220,angle=0.62,margin=16}={}){
  const s=Math.sin(angle),c=Math.cos(angle);
  /* The viewBox is DERIVED from the projected extent of the ground, not chosen
     and hoped for.

     The projection is a rotation followed by two different vertical scales: a
     point R metres away lands at rx = R·cos(θ+angle) on screen x — and because
     a rotation preserves length that is R, not R·(|cos|+|sin|) — while on screen
     y the depth term is compressed by 0.36. So the ground disc projects to an
     ELLIPSE R·scale wide and 0.36·R·scale tall. Clipping it with a circle of
     radius R·scale is not wrong so much as lazy, and fitting it as a circle
     pushed the near edge of the city off the bottom of the frame.

     Everything below is arithmetic on those two numbers, so the whole ground is
     in the box by construction rather than by having been checked once.

     THE HEIGHT IS DERIVED TOO, and this is the second half of the same fix. The
     first version took a height of 470 and fitted the ground inside it, which
     left 176 px of blank paper below a drawing that only ever occupied 294 —
     the CSS sizes the SVG by width, so that slack shipped as visible margin
     under every city. Worse, the slack was not even symmetric: the tall thing
     on this drawing is usually the FAR EDGE OF THE GROUND, not the tower,
     because 0.36·700 m of compressed depth beats a 220 m tower. So the highest
     content is whichever is greater of the two, the frame is that plus the near
     edge, and the height is whatever that comes to. A 600 m tower still fits,
     because the scale gives way to maxHeight rather than the drawing growing
     past its box. */
  const halfW=radius, halfH=radius*0.36;
  const topH=towerH*0.96;                       // the tower, straight up
  const topReach=Math.max(halfH,topH);          // highest thing on the sheet
  const scale=Math.min((width-2*margin)/(2*halfW),(maxHeight-2*margin)/(topReach+halfH));
  const height=Math.round(2*margin+(topReach+halfH)*scale);
  const cx=width/2;
  const cy=margin+topReach*scale;               // where the plot centre lands
  return {
   width,height,scale,angle,s,c,cx,cy,margin,
   // The ground ellipse, for the clip path. Drawn on top as well, so where the
   // harvested data stops is visible rather than quietly rounded off.
   disc:{cx,cy,rx:halfW*scale,ry:halfH*scale},
   project:(x,y,z=0)=>{
    const rx=x*c-y*s, ry=x*s+y*c;
    return [cx+rx*scale, cy-(z*0.96-ry*0.36)*scale, ry];
   },
   // "Further away" is the gradient of ry, which is (s, c). Guessing the
   // convention instead of deriving it rotates the cull by ninety degrees.
   viewDir:[s,c],
  };
}

/* ── ground ──────────────────────────────────────────────────────────────── */

const unpair=s=>s.length?s.split(',').reduce((a,v,i)=>(i%2?a[a.length-1].push(+v/2):a.push([+v/2]),a),[]):[];
const recs=(s,head)=>s?(head?s.split('|'):s.split('|')).filter(Boolean):[];

/** Fallback street widths, in metres, motorway first. Used only if a caller
    forgets to hand the harvested table in — the drawing says so rather than
    quietly rendering every street at one width. */
const DEFAULT_ROAD_M=[22,18,15,12,9,7,6,5];

/** Parse the baked ground into metres. Coordinates arrive in half-metres.

    `roadW` is carried in, not looked up at draw time. The harvester writes a
    class index per street and the widths live in a separate exported table,
    and the version that shipped read `ground.roadW` — a property this function
    had never produced. Every street therefore fell through to the 8 m default
    and the arterial came out exactly as wide as the service lane beside it,
    which is the one thing a street drawing exists to say. */
export function parseGround(city,GROUND,ROAD_M){
  const rec=GROUND&&GROUND[city];
  if(!rec)return null;
  const roads=recs(rec.r,true).map(r=>{
   const i=r.indexOf('~');
   return {cls:+r.slice(0,i), pts:unpair(r.slice(i+1))};
  }).filter(r=>r.pts.length>=2);
  const ways=recs(rec.x,true).map(r=>{
   const i=r.indexOf('~');
   return {w:+r.slice(0,i), pts:unpair(r.slice(i+1))};
  }).filter(r=>r.pts.length>=2);
  const water=recs(rec.w,false).map(r=>({pts:unpair(r)})).filter(r=>r.pts.length>=3);
  const green=recs(rec.g,false).map(r=>({pts:unpair(r)})).filter(r=>r.pts.length>=3);
  return {meta:rec.meta,roads,ways,water,green,roadW:ROAD_M||DEFAULT_ROAD_M};
}

/** Parse the baked footprints into metres, tallest first (the file is stored
    that way). `src` is the height tag the number came from, kept because a
    tower measured at 599 m and one guessed from a level count are not the same
    claim. */
export function parseCity(city,CITYSCAPE){
  const rec=CITYSCAPE&&CITYSCAPE[city];
  if(!rec)return null;
  const buildings=rec.b.split('|').filter(Boolean).map(r=>{
   const head=r.slice(0,r.indexOf('~')),pts=unpair(r.slice(r.indexOf('~')+1));
   const [h,src]=head.split(',').map(Number);
   return {h,src,pts};
  }).filter(b=>b.pts.length>=3);
  return {meta:rec.meta,buildings};
}

/* ── geometry ────────────────────────────────────────────────────────────── */

export function ringArea(p){
  let a=0;
  for(let i=0,j=p.length-1;i<p.length;j=i++)a+=p[j][0]*p[i][1]-p[i][0]*p[j][1];
  return a/2;
}
export const ringPerimeter=p=>{let L=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];L+=Math.hypot(b[0]-a[0],b[1]-a[1])}return L};

/** Centroid of a polygon by area. The vertex average is used only when the ring
    is degenerate, because on an L-shaped footprint the two are metres apart and
    the vertex average lands outside the building. */
export function ringCentroid(p){
  let a=0,cx=0,cy=0;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
   const cr=p[j][0]*p[i][1]-p[i][0]*p[j][1];
   a+=cr;cx+=(p[j][0]+p[i][0])*cr;cy+=(p[j][1]+p[i][1])*cr;
  }
  if(Math.abs(a)<1e-9){
   const n=p.length;
   return [p.reduce((s,q)=>s+q[0],0)/n, p.reduce((s,q)=>s+q[1],0)/n];
  }
  a*=3;
  return [cx/a, cy/a];
}

export function pointInRing(x,y,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

/** Shortest distance from a point to a polygon boundary. Used for "how far is
    this plot from that street", which is a distance to the EDGE, not to the
    centreline. */
export function distToRing(x,y,ring){
  let best=Infinity;
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length];
   const dx=b[0]-a[0],dy=b[1]-a[1];
   const L=dx*dx+dy*dy;
   const t=L<1e-12?0:Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/L));
   const d=Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy));
   if(d<best)best=d;
  }
  return best;
}

/** Shortest distance from a point to a POLYLINE. A street is not a polygon, and
    measuring to a closed ring would fold the join back on itself. */
export function distToPolyline(x,y,pts){
  let best=Infinity;
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1];
   const dx=b[0]-a[0],dy=b[1]-a[1];
   const L=dx*dx+dy*dy;
   const t=L<1e-12?0:Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/L));
   const d=Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy));
   if(d<best)best=d;
  }
  return best;
}

/** How much of a plot's boundary a street can actually reach, within a verge.

    Frontage is a planning quantity measured in metres of street edge, so it is
    counted here as length: each edge of the plot is sampled, and the part lying
    within `verge` of the road is accumulated. Sampling rather than testing the
    edge midpoint matters — a 90 m plot edge can front a road for half its
    length and a courtyard for the rest, and the midpoint test would score that
    as zero frontage.

    TWO THINGS THIS GOT WRONG, AND ONE OF THEM PRINTED AN EM DASH.

    One: the distance went to the road's CENTRELINE, so a 7 m street counted a
    plot as fronting it only if the boundary lay within 12 m of the middle of the
    tarmac — roughly three metres of pavement, which is not a frontage. The verge
    is now measured from the edge of the carriageway, at half the street's own
    width plus the verge allowance on top of it.

    Two: only roads of the same class as the nearest road were considered, and
    only if they were near the OBSERVATION POINT. On a 5 500 m² lot the eye sits
    67 m inside the site while the boundary comes within 23 m of the street, so
    the road that actually touched the plot failed a test about a point inside
    it, and the row printed "—" for a plot plainly sitting on a street.

    So the boundary is walked once and each sample attributed to the nearest
    road. A metre of street edge is counted once even where two roads both reach
    it, which summing per-road would not guarantee. */
export function frontageLength(ring,roads,{verge=6,step=2,roadW=DEFAULT_ROAD_M}={}){
  if(!ring||!ring.length||!roads||!roads.length)return 0;
  let total=0;
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length];
   const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const n=Math.max(2,Math.ceil(len/step));
   for(let k=0;k<n;k++){
    const t=(k+0.5)/n;
    const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
    let best=Infinity;
    for(const r of roads){
     const d=distToPolyline(x,y,r.pts)-((roadW&&roadW[r.cls])||7)/2;
     if(d<best)best=d;
    }
    if(best<=verge)total+=len/n;
   }
  }
  return total;
}

/** The short dimension of a footprint, by rotating calipers over the polygon
    edges. Daylight has to cross this; it is the number that decides whether a
    deep plan needs a core in the middle, and a bounding box cannot tell you. */
export function caliperWidth(p){
  let best=Infinity;
  for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length];
   const dx=b[0]-a[0],dy=b[1]-a[1];
   const L=Math.hypot(dx,dy);
   if(L<1e-6)continue;
   const nx=-dy/L,ny=dx/L;
   let lo=Infinity,hi=-Infinity;
   for(const q of p){const d=q[0]*nx+q[1]*ny;if(d<lo)lo=d;if(d>hi)hi=d}
   const w=hi-lo;
   if(w<best)best=w;
  }
  return best===Infinity?0:best;
}

/** A point guaranteed to be INSIDE the footprint.

    The area centroid is the obvious answer and it is wrong here: on an L-shaped
    or crescent plot it lands in the courtyard, and a sky view factor measured
    from the courtyard is a measurement of nothing. When the centroid falls out,
    we walk it back towards the vertices in shrinking steps and take the first
    point that is inside, which terminates because the vertices are on the
    boundary. It is an approximation — it is not the pole of inaccessibility —
    and it is only ever used as an observation point, never as an area. */
export function observerPoint(ring){
  const c=ringCentroid(ring);
  if(pointInRing(c[0],c[1],ring))return c;
  for(const t of[0.5,0.25,0.75,0.1,0.9,0.05,0.95,0.02]){
   for(const v of ring){
    const p=[c[0]+(v[0]-c[0])*t, c[1]+(v[1]-c[1])*t];
    if(pointInRing(p[0],p[1],ring))return p;
   }
  }
  const n=ring.length;
  return [ring.reduce((s,q)=>s+q[0],0)/n, ring.reduce((s,q)=>s+q[1],0)/n];
}

export function convexHull(pts){
  const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(p.length<4)return p;
  const turn=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const bad=(o,a,b)=>{
   // Relative to the edge length, not absolute: the shadow offset is
   // h / tan(alt), which for h=40 and alt=45° is 40.000000000000014, and an
   // absolute epsilon on the cross product leaves the two collinear corners
   // either side of that 5e-15 apart and BOTH of them on the hull.
   const e=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
   return Math.abs(turn(o,a,b))/e<1e-9||turn(o,a,b)/e<=0;
  };
  const lo=[],hi=[];
  for(const q of p){while(lo.length>=2&&bad(lo[lo.length-2],lo[lo.length-1],q))lo.pop();lo.push(q)}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(hi.length>=2&&bad(hi[hi.length-2],hi[hi.length-1],q))hi.pop();hi.push(q)}
  lo.pop();hi.pop();
  return lo.concat(hi);
}

/* ── sky view factor ───────────────────────────────────────────────────────

   For each of 72 azimuths, find the skyline elevation angle to the surrounding
   mass, then take the cosine-weighted fraction of the hemisphere that the
   mass hides: (1 − cos α)/2. Average over the azimuths.

   The angle at each azimuth is atan(h / d), where d is the horizontal distance
   from the observer to the building along that ray. Buildings are matched to
   azimuths by the arc their vertices subtend from the observer, so a long slab
   to the north blocks twenty degrees, not one.

   This is the standard sketch method. It treats each neighbour as blocking a
   wedge of equal density regardless of its own geometry beyond that wedge,
   which is why the drawing says "approximate". */

const SKY_BINS=72;

/** Angular span a polygon subtends from an external point, in the same units as
    atan2: 0 = north, increasing clockwise. Lifted in shape from simcity's
    isometricView.ts, which needed the same question answered for a different
    reason. */
export function azimuthSpan(ring,ox,oy){
  const az=ring.map(([x,y])=>Math.atan2(x-ox,y-oy));
  const s=[...az].sort((a,b)=>a-b);
  let gap=-Infinity,gi=0;
  for(let i=0;i<s.length;i++){
   const g=(s[(i+1)%s.length]-s[i]+Math.PI*2)%(Math.PI*2);
   if(g>gap){gap=g;gi=i}
  }
  const rawStart=s[(gi+1)%s.length];
  const start=((rawStart%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return {start, width:Math.PI*2-gap, contains:pointInRing(ox,oy,ring)};
}

export function skyViewFactor(ox,oy,blocks,skip){
  const skyline=new Float64Array(SKY_BINS);
  for(const b of blocks){
   if(skip&&skip(b))continue;
   if(b.h<=0.5)continue;
   const {start,width,contains}=azimuthSpan(b.pts,ox,oy);
   if(contains)continue;                       // the observer is inside it
   const d=distToRing(ox,oy,b.pts);
   if(d<1e-6)continue;
   const alpha=Math.atan2(b.h,d);
   const a0=start/(Math.PI*2)*SKY_BINS;
   const span=width/(Math.PI*2)*SKY_BINS;
   const n=Math.max(1,Math.ceil(span));
   for(let k=0;k<=n;k++){
    const bin=((Math.floor(a0+span*k/n)%SKY_BINS)+SKY_BINS)%SKY_BINS;
    if(alpha>skyline[bin])skyline[bin]=alpha;
   }
  }
  let blocked=0;
  for(let i=0;i<SKY_BINS;i++)blocked+=(1-Math.cos(skyline[i]))/2;
  return {svf:1-blocked/SKY_BINS, skyline};
}

/* ── shadow ────────────────────────────────────────────────────────────────

   The shadow of a prism under a sun at altitude A is the convex hull of the
   footprint and the footprint pushed along the ground by h / tan A. That is
   exact for a box, and it under-reports for anything with a crown or a setback,
   because the shadow of the top of the building is wider than the shadow of
   its base. The drawing carries the reach, which is the part that matters. */

export function shadowPolygon(pts,heightM,sunAltitudeDeg,sunAzimuthDeg){
  const alt=sunAltitudeDeg*Math.PI/180;
  if(!(alt>0.02))return null;
  const reach=heightM/Math.tan(alt);
  const a=sunAzimuthDeg*Math.PI/180;          // 0 = north, clockwise
  /* The shadow falls AWAY from the sun. Azimuth is the compass bearing OF the
     sun, so the offset is the negative of its unit vector: a sun in the south
     (180°) puts the shadow to the north, which is +y here. Offsetting towards
     the sun instead draws the shadow back under the tower and reports zero
     neighbours overshadowed on the brightest afternoon of the year. */
  const dx=-Math.sin(a)*reach, dy=-Math.cos(a)*reach;
  /* Snapped to a micrometre before hulling, and this is not cosmetic.

     reach = 40 / tan(45°) is 40.000000000000014, so −sin(180°)·reach leaves an
     x offset of −4.9e−15. The footprint's left edge is then at x = −5 and the
     shadow's left edge at x = −5.000000000000005, and a sort by x puts a point
     from the middle of the shadow's left edge BEFORE the footprint's own
     bottom-left corner. The monotone chain then starts on the wrong edge and
     returns a six-vertex polygon with an area of 400 where the true shadow is
     500. A micrometre is five orders of magnitude below anything this drawing
     can resolve, and it makes the sort total. */
  const snap=v=>Math.round(v*1e6)/1e6;
  return convexHull([...pts,...pts.map(([x,y])=>[snap(x+dx),snap(y+dy)])]);
}

/** Which neighbouring footprints fall inside the computed shadow. Counted by
    centroid, which is stated: a tower that clips the corner of a long slab does
    not shade "half of it" in any sense a reader would defend. */
export function overshadow(pts,heightM,sun,blocks,skip){
  const sh=shadowPolygon(pts,heightM,sun.altitude,sun.azimuth);
  if(!sh)return {caught:[],reach:0,poly:null};
  /* Reach comes from h / tan(alt), never from the hull. The hull is sorted, so
     its first vertex is the leftmost-lowest point of the SHADOW and has no
     fixed relationship to pts[0]; measuring the distance between them is a
     coincidence that happens to be right for an axis-aligned plot and wrong for
     a rotated one. */
  const reach=heightM/Math.tan(sun.altitude*Math.PI/180);
  const caught=[];
  for(const b of blocks){
   if(skip&&skip(b))continue;
   const c=ringCentroid(b.pts);
   if(pointInRing(c[0],c[1],sh))caught.push(b);
  }
  return {caught,reach,poly:sh};
}

/* ── plots ───────────────────────────────────────────────────────────────── */

/** The plots worth standing on: real footprints that can take the plate, each
    with the ground facts that decide whether they should. Sorted by area,
    because area is the one criterion that cannot be argued with — everything
    else here is a preference, and preferences are shown, not applied.

    `plate` is the footprint polygon. It is kept in the signature rather than
    its area alone because the shape decides whether a lot is a candidate at
    all — but the shape is a REPORT, not a filter. Not one of the 745 lots in
    the six harvests can take a 48 m cruciform plate, the widest being 47 m, so
    filtering on fit would leave the desk empty in every city. Which is a
    finding about the plate and the city, not about the drawing, so it is shown:
    plotFacts reports what fraction of the plate is standing on the lot.

    Two things are carried on the candidate that the arithmetic needs later.

    `from` is the building the lot was taken from, because the plot's `ring` is
    the same array of points as that building's `pts` and nothing else about
    the two objects is shared — see plotFacts.

    And the lot has to be INSIDE the surveyed ground. Seven of Bangkok's
    twenty-one candidates had centroids beyond the 700 m harvest radius, which
    is land the drawing crops away at the ellipse: the biggest lot on the list
    was half off the sheet. A tool that offers a lot it cannot draw has already
    answered the question for you. */
export function plotCandidates(city,ground,plate,minRatio=0.9,cap=90){
  const R=(ground&&ground.meta&&ground.meta.radius)||Infinity;
  const need=Math.abs(ringArea(plate))*minRatio;
  const out=[];
  for(const b of city.buildings){
   const area=Math.abs(ringArea(b.pts));
   if(area<need)continue;
   const [cx,cy]=ringCentroid(b.pts);
   if(Math.hypot(cx,cy)>R)continue;
   out.push({id:b.pts.length+'-'+Math.round(cx)+'-'+Math.round(cy),
             ring:b.pts, from:b, area, cx, cy, existing:b.h});
  }
  out.sort((a,b)=>b.area-a.area);
  return out.slice(0,cap);
}

/** What this plot would actually be. Every number here is arithmetic on the
    harvested geometry and the model's own schedule. */
export function plotFacts(plot,{ground,buildings,towerH,plate,plateArea,sun,reach=140}){
  const width=caliperWidth(plot.ring);
  const perimeter=ringPerimeter(plot.ring);
  const eye=observerPoint(plot.ring);
  /* THE PLOT IS NOT ITS OWN NEIGHBOUR.

     Lots are cut from the building list and `ring` is that building's own array
     of points — but `plot` is a fresh wrapper, so `filter(b=>b!==plot)` removed
     nothing and `skip(b=>b===plot)` never fired. The building standing on the
     lot being appraised was counted as its own tallest neighbour and as an
     obstruction in its own sky view factor. On the largest Bangkok lot that
     printed "tallest neighbour 40 m" for a plot whose real surroundings top
     out at 20 m, and doubled the height ratio with it.

     Matched on the ring, which is the identity that actually holds. */
  const isPlot=b=>b.pts===plot.ring;
  const blocks=buildings.filter(b=>!isPlot(b));
  // The nearest street is measured to the plot's BOUNDARY, not to the observer
  // point. On a 5 000 m² lot the eye sits 57 m inside the site while the front
  // fence is 19 m from the road, and "nearest street: 57 m" is a number about
  // somewhere on the site rather than about the lot. Sampled on the road's own
  // vertices, which the harvest simplified at 4 m, so the distance can read low
  // by up to half that.
  const roads=ground?ground.roads:[];
  let nearest=null,nearestD=Infinity;
  for(const r of roads){
   let d=Infinity;
   for(const [x,y] of r.pts){const e=distToRing(x,y,plot.ring);if(e<d)d=e}
   if(d<nearestD){nearestD=d;nearest=r.cls}
  }
  const frontage=frontageLength(plot.ring,roads,{roadW:ground&&ground.roadW});
  const near=blocks.filter(b=>{
   const c=ringCentroid(b.pts);
   return Math.hypot(c[0]-eye[0],c[1]-eye[1])<reach;
  });
  const neighbourMax=near.reduce((m,b)=>Math.max(m,b.h),0);
  const {svf,skyline}=skyViewFactor(eye[0],eye[1],blocks);
  const sh=sun?overshadow(plot.ring,towerH,sun,blocks):{caught:[],reach:0,poly:null};
  /* WHERE THE BUILDING STANDS IS DECIDED HERE, ONCE.

     The seat was being chosen by the renderer while the numbers were computed
     from a plate still sitting at the origin, so it was possible — and was —
     for the drawing and the appraisal to describe two different buildings. The
     seat comes back on the facts and the desk draws that, so there is only one
     answer to disagree with. */
  const seated=plateOnPlot(plate,plot);
  return {
   eye, seated, fit:seated.fit,
   area:plot.area, width, perimeter, frontage,
   nearestRoad:nearest, nearestRoadDist:nearestD,
   existing:plot.existing,
   coverage:plateArea/plot.area,
   neighbourMax, neighbourCount:near.length,
   heightRatio:neighbourMax>0?towerH/neighbourMax:null,
   svf, skyline,
   shadowReach:sh.reach, shadowCaught:sh.caught.length,
   shadowArea:sh.caught.reduce((s,b)=>s+Math.abs(ringArea(b.pts)),0),
  };
}
/* ── where the building stands ─────────────────────────────────────────────── */

/** Where a plate of this shape goes on this ring.

    Candidates are tried in order — the area centroid, the observation point for
    lots whose centroid is in the courtyard, then the same walk inward that
    observerPoint does — and each is judged on whether it holds EVERY corner of
    the plate inside the ring.

    Not one of the 745 lots in the six harvests can hold a 48 m cruciform; the
    widest is 47 m. So the "nothing holds it" branch is the normal branch, not
    an edge case, and it used to return the origin — which put the tower back in
    the middle of the map and left the chosen lot outlined a block away again,
    the exact defect this function exists to remove. It now returns the best
    attempt with `holds:false`, so the building stands on the lot and the `fit`
    fraction says by how much it is overhanging. */
function seatFor(plate,ring){
  const holds=p=>plate.every(([x,y])=>pointInRing(x+p[0],y+p[1],ring));
  const c=ringCentroid(ring);
  if(holds(c))return {at:c,holds:true,centred:true};
  const eye=observerPoint(ring);
  if(holds(eye))return {at:eye,holds:true,centred:false};
  for(const t of[0.5,0.25,0.75,0.1,0.9,0.05,0.95,0.02]){
   for(const v of ring){
    const p=[eye[0]+(v[0]-eye[0])*t, eye[1]+(v[1]-eye[1])*t];
    if(holds(p))return {at:p,holds:true,centred:false};
   }
  }
  // Nothing holds the whole plate. Sit it on the centroid when the centroid is
  // itself on the lot, which is the ordinary case and puts the overhang
  // symmetrically around the lot; otherwise fall back to the observation point,
  // which is inside by construction.
  const at=pointInRing(c[0],c[1],ring)?c:eye;
  return {at,holds:false,centred:pointInRing(c[0],c[1],ring)};
}

/** How much of the plate is actually standing on the lot, as a fraction.

    Sampled on a 1 m grid rather than clipped: clipping a non-convex polygon
    properly needs the concave case handled deliberately, and this is a sketch
    instrument reporting a proportion, not a setting-out dimension. It is
    declared as a sample for exactly that reason.

    This number exists because the alternative is a drawing that lies. Not one
    of the 745 lots in the six harvests can take a 48 m cruciform — the widest
    is 47 m — so a tower drawn standing on a lot outline with the arms hanging
    over the boundary and no note attached is a picture of something that cannot
    be built. A 41% is a finding; a floating slab is a lie. */
export function fitOf(plate,ring,step=1){
  if(!plate||plate.length<3||!ring||ring.length<3)return 0;
  let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
  for(const [x,y] of plate){
   if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
  }
  let inside=0,total=0;
  for(let x=minx+step/2;x<maxx;x+=step)
   for(let y=miny+step/2;y<maxy;y+=step){
    if(!pointInRing(x,y,plate))continue;
    total++;
    if(pointInRing(x,y,ring))inside++;
   }
  return total?inside/total:0;
}

/** Put the plate on the lot it was chosen for.

    The plate is defined at the origin, because it is a module-level idea of a
    floor, and the lot is a real footprint a few hundred metres from the survey
    centre. So drawing the plate as handed over stood the tower at the middle
    of the map and outlined the chosen lot somewhere else entirely — on Shenzhen
    the amber building and the amber outline were a block apart, and the desk is
    called "Stand here".

    The seat is the area centroid where that holds the whole plate, then the
    observation point for lots whose centroid is in the courtyard, then the same
    walk inward that observerPoint does. Where none of them holds it, the best
    attempt is used and `fit` says by how much it misses — the building is still
    drawn, because "this plate does not fit this site" is a result the desk
    exists to produce. */
export function plateOnPlot(plate,plot){
  const seat=plot&&plot.ring?seatFor(plate,plot.ring):null;
  if(!seat)return {pts:plate,origin:[0,0],centred:false,holds:false,fit:0};
  const pts=plate.map(([x,y])=>[x+seat.at[0],y+seat.at[1]]);
  return {pts,origin:seat.at,centred:seat.centred,holds:seat.holds,
   fit:fitOf(pts,plot.ring)};
}

/* ── drawing ───────────────────────────────────────────────────────────────

   One amber building in a grey city. That is the whole argument: the tower is
   the only thing in the drawing with colour in it, so the eye goes to it
   without a single arrow or label pointing at it.

   FLAT, NOT GRADIENTED. Three tones split by which way a wall faces, the same
   treatment the hero cityscape uses. A gradient on a building is how a drawing
   starts pretending to be a render.

   ROADS ARE CASED. A street drawn as a single line reads as a wire; drawn as a
   dark casing under a lighter carriageway it reads as a road, and the width
   stops being a number and starts being a place. */

const GROUND='#111416',GREEN='#1a2620',WATER='#14212a',ROADCASE='#2b343b',ROADFILL='#3d4a53';
const WALL_A='#2b3843',WALL_B='#1e2830',WALL_C='#121920';
const ROOF=h=>h>=120?'#33414c':h>=60?'#2b3843':'#243039';
const LIGHT=[-0.55,-0.84];
const INK='#6c818c';
const AMBER='#f59e0b',AMBER_LIT='#fbbf24',AMBER_DARK='#b45309';

const toneFor=d=>d>.35?WALL_A:d<-.35?WALL_C:WALL_B;
const f2=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';

function ringPath(scene,pts,z){
  return pts.map(([x,y],i)=>{const p=scene.project(x,y,z);return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join('')+'Z';
}

/** Extrude one footprint: roof cap, then only the walls that face the camera.
    A wall is drawn when its OUTWARD NORMAL opposes the view direction — an edge
    test culls the wrong half on an axis-aligned box and the building loses a
    side without looking broken.

    THE TEST IS A DOT PRODUCT, and the version that shipped was
    `n.x·v.x − n.y·v.y`, with a minus. On a box that still draws two walls, which
    is why a guard that counted them passed: the count was right and the walls
    were wrong. The sign threw away exactly the term that decides whether the
    near face is kept, so what survived was one NEAR wall and one FAR wall —
    which reads on screen as a slab with a slot cut through it, and is the reason
    the tower looked split.

    The outward normal is also only outward if the ring winds the way the
    formula assumes, and OSM ways wind both ways. `ringArea` returns the
    NEGATIVE of the standard signed area, so a counter-clockwise ring (and hence
    `(ey,−ex)` pointing out of the building) is the one where it is negative.
    That is checked rather than assumed, because a ring that winds the other way
    gets its interior painted and no amount of correct arithmetic saves it.

    `wall` is either a flat colour or a function of the wall's facing, which is
    what lets the amber tower use the same geometry as the grey city without
    also inheriting the grey city's three-tone split. */
function extrude(scene,pts,h,{fill,wall,ink,strokeWidth=.7}={}){
  const tone=typeof wall==='function'?wall:(dot=>wall);
  const ccw=ringArea(pts)<0;                   // (ey,−ex) points outboard only here
  let out='';
  out+=`<path d="${ringPath(scene,pts,h)}" fill="${fill||ROOF(h)}"/>`;
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length];
   const ex=b[0]-a[0],ey=b[1]-a[1];
   const nx=ccw?ey:-ey,ny=ccw?-ex:ex;
   if(nx*scene.viewDir[0]+ny*scene.viewDir[1]>=0)continue;
   const lit=(nx*LIGHT[0]+ny*LIGHT[1])/(Math.hypot(nx,ny)||1);
   const A=scene.project(a[0],a[1],0),B=scene.project(b[0],b[1],0),
         C=scene.project(b[0],b[1],h),D=scene.project(a[0],a[1],h);
   out+=`<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}L${C[0].toFixed(1)} ${C[1].toFixed(1)}L${D[0].toFixed(1)} ${D[1].toFixed(1)}Z" fill="${tone(lit)}"${ink?` stroke="${ink}" stroke-width="${strokeWidth}"`:''}/>`;
  }
  return out;
}

/** The whole landscape with the tower standing in it. */
export function landscapeSVG({ground,city,plot,tower,towerH,scene,labels}){
  const S=scene||makeScene({});
  const D=S.disc;
  let g='';
  // The clip path, for the harvested ground.
  g+=`<clipPath id="lsClip"><ellipse cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" rx="${D.rx.toFixed(1)}" ry="${D.ry.toFixed(1)}"/></clipPath>`;
  /* THE SHEET IS THE PAGE, NOT A BLACK SLAB.

     This used to fill the whole viewBox with the ground colour and then clip
     the ground into the harvested ellipse. Both regions came out the same near
     black, so the ellipse that the caption calls "the area the data covers" was
     invisible, and the drawing read as a black rectangle with a faint oval
     drawn on it. The field the survey actually covers now IS the dark shape, and
     the paper around it is the paper of the page — which is what makes the
     harvested edge mean something. */
  g+=`<ellipse cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" rx="${D.rx.toFixed(1)}" ry="${D.ry.toFixed(1)}" fill="${GROUND}"/>`;
  g+=`<g clip-path="url(#lsClip)">`;
  const flat=(rings,fill)=>{
   let o='';
   for(const r of rings){
    const p=r.pts.map(([x,y],i)=>{const q=S.project(x,y,0);return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('')+'Z';
    o+=`<path d="${p}" fill="${fill}"/>`;
   }
   return o;
  };
  if(ground){
   g+=flat(ground.green,GREEN);
   g+=flat(ground.water,WATER);
   // Waterways: a wide flat band, then the channel. Two tones, because a river
   // drawn as one colour and a street drawn as one colour look like the same
   // kind of thing, and they are not.
   for(const w of ground.ways){
    const p=w.pts.map(([x,y],i)=>{const q=S.project(x,y,0);return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('');
    g+=`<path d="${p}" fill="none" stroke="${WATER}" stroke-width="${Math.max(2,w.w*S.scale).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    g+=`<path d="${p}" fill="none" stroke="#1d2f3a" stroke-width="${Math.max(1,w.w*S.scale*0.45).toFixed(1)}"/>`;
   }
   // Roads far to near, so a near arterial's casing does not cut a far street.
   const roads=ground.roads.map(r=>({...r,depth:Math.max(...r.pts.map(([x,y])=>S.project(x,y,0)[2]))})).sort((a,b)=>b.depth-a.depth);
   for(const r of roads){
    const p=r.pts.map(([x,y],i)=>{const q=S.project(x,y,0);return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('');
    const w=Math.max(1.1,((ground.roadW&&ground.roadW[r.cls])||7)*S.scale*0.55);
    g+=`<path d="${p}" fill="none" stroke="${ROADCASE}" stroke-width="${(w+1.8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    g+=`<path d="${p}" fill="none" stroke="${ROADFILL}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
   }
  }

  // Buildings far to near, on the view axis rather than on their centroid: a
  // long slab pushed back by its own length is the classic sorting error, and it
  // shows up as a near wall drawn over a far one.
  const blocks=city.buildings.filter(b=>!plot||b.pts!==plot.ring)
   .map(b=>({...b,depth:b.pts.reduce((a,[x,y])=>a+(x*S.s+y*S.c),0)/b.pts.length}))
   .sort((a,b)=>a.depth-b.depth);
  for(const b of blocks)g+=extrude(S,b.pts,b.h,{fill:ROOF(b.h),wall:toneFor,ink:INK,strokeWidth:.6});

  g+='</g>';
  // The harvested edge, drawn on top so the clipping is visible as a boundary.
  g+=`<ellipse cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" rx="${D.rx.toFixed(1)}" ry="${D.ry.toFixed(1)}" fill="none" stroke="#39454d" stroke-width="1"/>`;
  /* THE LOT AND THE TOWER ARE DRAWN OUTSIDE THE CLIP. They are not survey data;
     they are the decision. Clipping them to the harvest edge cropped the tower
     in half whenever the chosen lot sat near the boundary of what was surveyed,
     which reads as a rendering fault rather than as "the survey stops here". */
  if(plot){
   const p=plot.ring.map(([x,y],i)=>{const q=S.project(x,y,0);return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('')+'Z';
   g+=`<path d="${p}" fill="none" stroke="${AMBER}" stroke-width="1.4" stroke-dasharray="5 3"/>`;
  }
  if(tower&&tower.length>=3){
   // The tower is an amber split by which way a wall faces, the same way the
   // city is a grey — but the cap takes the LIGHTEST tone, because a roof is the
   // face that sees the sky, and a dark cap on a lit tower reads as a hole in
   // the top of it. Note that only two wall tones can appear at once from this
   // camera: both visible faces of a box are turned towards the light. That is
   // what the geometry gives, and the drawing says what the geometry gives.
   g+=extrude(S,tower,towerH,{fill:AMBER_LIT,wall:d=>d>.35?AMBER:AMBER_DARK,strokeWidth:.8});
  }
  return `<svg viewBox="0 0 ${S.width} ${S.height}" role="img" aria-label="${(labels&&labels.aria)||''}">${g}</svg>`;
}

/** The sky section: the skyline this plot would see, as a profile, with the
    cosine-weighted hidden band drawn solid. It is the one place on the site
    where a shape explains a number instead of sitting next to it.

    THE BAND IS MEASURED UP FROM THE HORIZON, and it was not. It used to be
    traced from the TOP of the box down to the skyline, which means the shape of
    an open horizon — a flat skyline at 0° — closes on itself and fills the
    entire frame. The number said 99% of the sky was still visible and the
    picture next to it was a solid wall of amber. Two objects agreed with each
    other and both were the wrong answer; the guard that caught it read the path
    string rather than the percentage.

    Note also that the line the old version drew at y=T, and labelled 0°, was
    the TOP of the box, ninety degrees up. The horizon is at the bottom. */
export function skyViewSVG({skyline,svf,plot,towerH,labels}){
  const W=420,H=164,L=34,R=12,T=24,B=34;
  const pw=W-L-R,ph=H-T-B;
  const maxA=Math.PI/2;
  const n=Math.max(1,skyline.length);
  const x=i=>L+pw*i/n;
  const y=a=>T+ph-ph*(a/maxA);
  const HZ=T+ph;                                // elevation 0
  let g='';
  g+=`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="var(--dark)"/>`;
  // The hidden band, in amber: the sky this plot does not get to see.
  let d=`M${x(0).toFixed(1)} ${HZ}`;
  for(let i=0;i<skyline.length;i++)d+=`L${x(i+0.5).toFixed(1)} ${y(skyline[i]).toFixed(1)}`;
  d+=`L${x(skyline.length).toFixed(1)} ${HZ}Z`;
  g+=`<path d="${d}" fill="${AMBER}" fill-opacity=".28"/>`;
  g+=`<path d="${d}" fill="none" stroke="${AMBER}" stroke-width="1.1"/>`;
  // Horizon at the bottom, top of the hemisphere above, and the scale between.
  g+=`<line x1="${L}" y1="${HZ}" x2="${L+pw}" y2="${HZ}" stroke="#6c818c" stroke-width="1"/>`;
  g+=`<line x1="${L}" y1="${T}" x2="${L+pw}" y2="${T}" stroke="#2c363d" stroke-width="1"/>`;
  g+=`<line x1="${L}" y1="${T}" x2="${L}" y2="${HZ}" stroke="#6c818c" stroke-width="1"/>`;
  // L, not L-2: anchored end at the very edge of the box, "90°" runs off the
  // left of the viewBox and is clipped, so the axis read 60, 30 and a stub.
  for(const a of [0,30,60,90])g+=`<text x="${L-5}" y="${y(a*Math.PI/180)+3}" class="sx-s" text-anchor="end">${a}°</text>`;
  g+=`<text x="${L}" y="${T-9}" class="sx-s">${(labels&&labels.title)||''}</text>`;
  g+=`<text x="${L}" y="${HZ+15}" class="sx-s">N</text>`;
  g+=`<text x="${L+pw}" y="${HZ+15}" class="sx-s" text-anchor="end">S</text>`;
  g+=`<text x="${L+pw/2}" y="${HZ+15}" class="sx-s" text-anchor="middle">E · W</text>`;
  g+=`<text x="${L+pw}" y="${HZ+26}" class="sx-s" text-anchor="end">${(labels&&labels.value)||f2(svf*100,0)+'%'}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${(labels&&labels.aria)||''}">${g}</svg>`;
}
