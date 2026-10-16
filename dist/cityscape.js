import {CITYSCAPE,CITY_KEYS} from './cityscape.data.js?v=@CITYSCAPE@';
export {CITY_KEYS};

/* The city around the plot, from OpenStreetMap. Building footprints and heights
   are real and surveyed; they are not this project's, and the attribution is
   printed on screen rather than held here.

   Every building arrives as [x1,y1,x2,y2,h,heightSource] in metres, local to
   the plot — x east, y north. The sixth field is kept because a tower measured
   at 599 m and one inferred from a level count are not the same claim, and the
   drawing has to be able to say which is which. */
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
 const raw=c.b.split('|').map(s=>s.split(',')).map(a=>[+a[0],+a[1],+a[2],+a[3],+a[4],+a[5]]);
 const r2=c.meta.radius*c.meta.radius;
 const inDisc=raw.filter(([x1,y1,x2,y2])=>x1*x1+y1*y1<=r2&&x2*x2+y2*y2<=r2&&x1*x1+y2*y2<=r2&&x2*x2+y1*y1<=r2);
 // Only the tallest 260 are drawn. Below that the massing is texture, and the
 // file is already 27 KB; keeping the cap here means the renderer cannot be
 // asked to draw a skyline the data does not carry.
 const buildings=inDisc.slice(0,260);
 const out={...c.meta,buildings,harvested:raw.length,culledOutside:raw.length-inDisc.length};
 cache.set(key,out);return out
}

/* The skyline the model is actually standing in: the tallest things within the
   harvest radius, and what they would mean next to this tower. Reported, not
   drawn as a claim — the viewport draws them, this describes them. */
export function skyline(key,modelHeight){
 const c=parsed(key);if(!c)return null;
 const sorted=[...c.buildings].sort((a,b)=>b[4]-a[4]);
 const tallest=sorted[0];
 const above=sorted.filter(b=>b[4]>=modelHeight);
 const rank=sorted.findIndex(b=>b[4]<modelHeight);
 const measured=sorted.filter(b=>b[5]===0).length;
 return {
  label:c.label,source:c.source,count:c.buildings.length,radius:c.radius,
  tallest:tallest?{h:tallest[4],measured:tallest[5]===0}:null,
  tallerThanModel:above.length,
  // +1 because a list indexed from zero: this is the model's position in the
  // real skyline of this plot, counting from the ground up.
  rank:rank<0?sorted.length+1:rank+1,
  measuredFraction:sorted.length?measured/sorted.length:0,
  localMax:tallest?tallest[4]:0
 };
}

/* How much of the drawing each building is worth. A building whose footprint is
   smaller than a pixel and whose height is under a pixel adds noise and hides
   the tower, so it is dropped at the current zoom rather than drawn faintly. */
export function visibleMassings(city,scale,minPx=1.6){
 const out=[];
 for(const[x1,y1,x2,y2,h]of city.buildings){
  const w=Math.max(x2-x1,1),d=Math.max(y2-y1,1);
  if(Math.min(w,d)*scale<minPx&&h*scale*.96<minPx)continue;
  out.push([x1,y1,x2,y2,h]);
 }
 return out;
}
export {parsed as cityData};