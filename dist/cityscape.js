import {CITYSCAPE,CITY_KEYS} from './cityscape.data.js?v=e5a1d6659e';
export {CITY_KEYS};

/* The city around the plot, from OpenStreetMap. Footprints are mapped and heights are tagged or inferred; they are not this project's, and the attribution is printed on
   screen rather than held here.

   Each building is a real ring — an outline, not a rectangle — so an L-shaped
   block, a cruciform tower or a notched podium is drawn as the shape that was
   mapped. The sixth field of the source record is kept because a tower
   measured at 599 m and one inferred from a level count are not the same claim,
   and the drawing has to be able to say which is which.

   Record shape: {h, src, ring:[[x,y],…]} — x east, y north, in metres. */
export function cityOf(key){return CITYSCAPE[key]||null}

const cache=new Map();
function parsed(key){
 if(cache.has(key))return cache.get(key);
 const c=CITYSCAPE[key];
 if(!c){cache.set(key,null);return null}
 /* The harvest queried a lat/lon BOX of half-width R, so its corners reach
    R·√2 — 990 m at R=700. The study radius is a circle, and the difference
    between the two is 48 buildings in Bangkok alone. Culled here rather than in
    the harvester because the circle is a modelling decision about how much city
    the drawing is about, and the raw query is not. */
 const raw=[];
 for(const rec of c.b.split('|')){
  const parts=rec.split('~'),head=parts[0].split(',');
  const h=+head[0]/2,src=+head[1],n=+head[2];
  const nums=parts[1].split(',');
  const ring=[];
  for(let i=0;i<n;i++)ring.push([+nums[i*2]/2,+nums[i*2+1]/2]);
  raw.push({h,src,ring});
 }
 const r2=c.meta.radius*c.meta.radius;
 /* A building is kept only if EVERY corner is inside the study circle.

    Culling on the centroid instead is the obvious shortcut and it is wrong
    here: a 60 m slab whose middle is at 690 m has corners at 730 m, so it is
    kept and drawn hanging over the edge of the ground plate — a block floating
    off the end of its own city. The circle is also where the harvested data
    stops, so a building poking past it is partly an inference. Requiring the
    whole outline inside costs a handful of perimeter buildings and keeps the
    edge of the drawing honest. */
 const inDisc=raw.filter(b=>b.ring.every(([x,y])=>x*x+y*y<=r2));
 // Only the tallest 260 are drawn. Below that the massing is texture; the cap
 // here means the renderer cannot be asked to draw a skyline the data lacks.
 const buildings=inDisc.slice(0,260);
 const out={...c.meta,buildings,harvested:raw.length,culledOutside:raw.length-inDisc.length};
 cache.set(key,out);return out
}

/* The skyline the model is actually standing in: the tallest things within the
   harvest radius, and what they would mean next to this tower. Reported, not
   drawn as a claim — the viewport draws them, this describes them. */
/* `plotRing` excludes the buildings the tower replaces from the ranking as well
   as from the drawing. Ranking against a skyline that includes a 599 m building
   the drawing no longer shows would put "tallest 599 m" on a sheet with no 599 m
   building in it — the rank would describe a city the tower will not stand in. */
export function skyline(key,modelHeight,plotRing){
 const c=parsed(key);if(!c)return null;
 const pool=plotRing?c.buildings.filter(b=>!ringsIntersect(b.ring,plotRing)):c.buildings;
 const sorted=[...pool].sort((a,b)=>b.h-a.h);
 const tallest=sorted[0];
 const above=sorted.filter(b=>b.h>=modelHeight);
 const rank=sorted.findIndex(b=>b.h<modelHeight);
 const measured=sorted.filter(b=>(b.src===0||b.src===1)).length;
 return {
  label:c.label,source:c.source,count:pool.length,radius:c.radius,
  replaced:c.buildings.length-pool.length,
  tallest:tallest?{h:tallest.h,measured:tallest.src===0}:null,
  tallerThanModel:above.length,
  // +1 because a list indexed from zero: this is the model's position in the
  // real skyline of this plot, counting from the ground up.
  rank:rank<0?sorted.length+1:rank+1,
  measuredFraction:sorted.length?measured/sorted.length:0,
  localMax:tallest?tallest.h:0
 };
}

/* How much of the drawing each building is worth. A footprint smaller than a
   pixel and a height under a pixel add noise and hide the tower, so it is
   dropped at the current zoom rather than drawn faintly. */
export function visibleMassings(city,scale,minPx=1.6){
 const out=[];
 for(const b of city.buildings){
  let minx=Infinity,maxx=-Infinity,miny=-Infinity,maxy=-Infinity;
  for(const [x,y]of b.ring){
   if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
  }
  const w=Math.max(maxx-minx,1),d=Math.max(maxy-miny,1);
  if(Math.min(w,d)*scale<minPx&&b.h*scale*.96<minPx)continue;
  // Centroid, used for the depth sort. A polygon centroid rather than the
  // bounding-box centre: for an L or a ring the two can be metres apart, which
  // is exactly enough to sort a building into the wrong half of the drawing.
  let sx=0,sy=0;
  for(const [x,y]of b.ring){sx+=x;sy+=y}
  out.push({...b,cx:sx/b.ring.length,cy:sy/b.ring.length});
 }
 return out;
}

/* The signed area tells the renderer which way a wall faces. A footprint that
   arrives clockwise has every outward normal pointing into the building, and
   the back-face cull would then remove exactly the walls the camera can see —
   a silent, plausible-looking failure that only shows as a missing wall. So the
   handedness is normalised once, here, rather than tested per edge per frame. */
/* Does this harvested building stand on the plot the tower is being drawn on?

   In Shenzhen a 599 m massing spans x -32..44, y -11..65 — it contains the
   origin, which is exactly where the tower stands. Drawing both means the
   neighbour is painted in front of the one building the sheet is about, and the
   tower appears to rise from inside another building rather than from the
   ground. It read as floating, and no amount of shadow or contact line fixes a
   contradiction about where the buildings are.

   The tower occupies the plot, so whatever stands on it is the site, not the
   context. It is removed from the drawing and counted, and the count is stated
   on the sheet — because a neighbour that silently disappears is a massing the
   reader cannot check, and a rank computed against massings they cannot see is
   a rank they cannot audit.

   Edge crossing plus containment. Bounding boxes alone would take a large
   building whose box merely contains the plot while the polygon does not, and
   a small shed just past the corner would be missed. */
function segCross(ax,ay,bx,by,cx,cy,dx,dy){
 const d1=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax),d2=(bx-ax)*(dy-ay)-(by-ay)*(dx-ax);
 const d3=(dx-cx)*(ay-cy)-(dy-cy)*(ax-cx),d4=(dx-cx)*(by-cy)-(dy-cy)*(bx-cx);
 return (d1>0)!==(d2>0)&&(d3>0)!==(d4>0);
}
function pointIn(ring,x,y){
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
 }
 return hit;
}
export function ringsIntersect(a,b){
 if(!a||!b||a.length<3||b.length<3)return false;
 for(let i=0;i<a.length;i++){
  const [ax,ay]=a[i],[bx,by]=a[(i+1)%a.length];
  for(let j=0;j<b.length;j++){
   const [cx,cy]=b[j],[dx,dy]=b[(j+1)%b.length];
   if(segCross(ax,ay,bx,by,cx,cy,dx,dy))return true;
  }
 }
 return pointIn(a,b[0][0],b[0][1])||pointIn(b,a[0][0],a[0][1]);
}
export function splitByPlot(massings,ring){
 const onPlot=[],context=[];
 for(const m of massings)(ringsIntersect(m.ring,ring)?onPlot:context).push(m);
 return {onPlot,context};
}

export function ringArea(ring){
 let a=0;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++)a+=(ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1]);
 return a/2;
}

export {parsed as cityData};