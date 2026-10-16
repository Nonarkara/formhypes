/* Harvest real building footprints and heights from OpenStreetMap around each
   pilot plot, and bake them into dist/cityscape.data.js.

   WHY BAKED AND NOT FETCHED AT RUNTIME. The site runs a strict CSP
   (connect-src 'self'), so a live Overpass call from the page is impossible and
   a same-origin JSON fetch would add an async state and a failure mode to a
   viewport that currently has neither. Inlining the data also lets
   scripts/release-id.mjs content-pin it, so a changed skyline is a changed
   bytes-hash and shows up in the release graph.

   WHY THESE SIX PLOTS. Five of them are the buildings the Place desk already
   cites with published figures — Empire Tower, Dayabumi, Wisma 46, Landmark 81
   and Ping An. Tokyo is added at Marunouchi. Using the same plots means the
   viewport and the Place desk are talking about one place.

   FOOTPRINTS, NOT BOXES. The first harvest asked Overpass for `out tags geom`,
   then kept only the bounding box of each way and threw the geometry away. That
   turned every L-shaped, cruciform and notched building into its own rectangle,
   and the drawing read as a table of blocks — which is precisely the complaint
   the drawing exists to answer. The real ring is kept and simplified.

   BUILDING RELATIONS ARE KEPT TOO. `relation["building"]` was queried and then
   filtered out, so anything mapped as a multipolygon — malls, stadiums, podiums,
   large complexes — simply vanished. Their outer rings are included.

   OpenStreetMap data is © OpenStreetMap contributors, licensed ODbL. The
   attribution is printed on screen, not just here. */

import {writeFileSync, mkdirSync} from 'node:fs';

const UA='FormHypes/1.0 (architectural context study; https://shdt.nonarkara.org)';
const ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];

// [key, name, lat, lon, radius in metres]
const PLOTS=[
 ['bangkok','Sathorn, Bangkok',13.72032,100.53031,700],
 ['kl','Merdeka Square, Kuala Lumpur',3.144944,101.693806,700],
 ['jakarta','Sudirman, Jakarta',-6.20361,106.82,700],
 ['hcmc','Dien Bien Phu, Ho Chi Minh City',10.795,106.7219,700],
 ['shenzhen','Yitian Road, Shenzhen',22.5364,114.0503,700],
 ['tokyo','Marunouchi, Tokyo',35.6812,139.7671,700],
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Equirectangular projection about the plot. Over 700 m the error against a
// proper projection is well under a metre, which is far below the resolution of
// anything drawn here — and it keeps the baked file to two numbers per point.
const project=(lat,lon,lat0,lon0)=>{
 const R=6378137,rad=Math.PI/180;
 return [ (lon-lon0)*rad*R*Math.cos(lat0*rad), (lat-lat0)*rad*R ];
};

function heightOf(t){
 // Real data first, in the order a surveyor would trust it.
 const h=parseFloat(t.height);
 if(Number.isFinite(h)&&h>0.5&&h<600)return {h,src:'height'};
 const bh=parseFloat(t['building:height']||t['building:levels']);
 if(Number.isFinite(bh)&&bh>0.5&&bh<600)return {h:bh,src:'building:height'};
 const lv=parseFloat(t['building:levels']);
 if(Number.isFinite(lv)&&lv>0&&lv<160)return {h:lv*3.2,src:'levels × 3.2 m'};
 return null;
}

/* ── footprint simplification ───────────────────────────────────────────────
   A raw OSM ring can carry forty vertices, most of them a surveyor's chainage
   point that is invisible at this scale. Douglas–Peucker at 1.4 m keeps an L
   or a notch — the thing that makes a city read as a city — and drops the
   noise. Collinear points then go, because they cost bytes and change nothing.

   The tolerance is a modelling decision and is stated here because it is the
   difference between the footprint that was surveyed and the footprint that is
   drawn. 1.4 m at a 700 m viewing radius is well under one screen pixel. */
function simplify(pts,tol=1.4){
 if(pts.length<4)return pts;
 const keep=new Array(pts.length).fill(false);
 keep[0]=keep[pts.length-1]=true;
 const stack=[[0,pts.length-1]];
 while(stack.length){
  const [a,b]=stack.pop();
  let far=-1,best=tol;
  const [ax,ay]=pts[a],[bx,by]=pts[b];
  const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
  for(let i=a+1;i<b;i++){
   const [px,py]=pts[i];
   // Perpendicular distance for a general segment, normalised by the segment
   // length so a long edge is not held to a stricter standard than a short one.
   const d=len<1e-9?Math.hypot(px-ax,py-ay):Math.abs(dx*(ay-py)-(ax-px)*dy)/len;
   if(d>best){best=d;far=i}
  }
  if(far>0){keep[far]=true;stack.push([a,far],[far,b])}
 }
 const out=pts.filter((_,i)=>keep[i]);
 // Drop vertices that sit on the line between their neighbours.
 const collinear=out.filter((p,i)=>{
  if(i===0||i===out.length-1)return true;
  const [ax,ay]=out[i-1],[bx,by]=out[i+1];
  const [px,py]=p;
  const cross=Math.abs((bx-ax)*(py-ay)-(px-ax)*(by-ay));
  const base=Math.max(Math.hypot(bx-ax,by-ay),1e-6);
  return cross/base>0.15;
 });
 return collinear.length>=3?collinear:out;
}

const ringArea=p=>{
 let a=0;
 for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]*p[i][1]-p[i][0]*p[j][1]);
 return Math.abs(a/2);
};

async function query(q,attempt=0){
 for(const ep of ENDPOINTS){
  try{
   const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':UA},body:'data='+encodeURIComponent(q)});
   if(!r.ok){console.log('  ',ep.split('/')[2],r.status);continue}
   return await r.json();
  }catch(e){console.log('  ',ep.split('/')[2],e.message)}
 }
 if(attempt<3){await sleep(8000*(attempt+1));return query(q,attempt+1)}
 return null;
}

const out={};
// `node scripts/harvest-cityscape.mjs hcmc tokyo` refreshes only those. Merging
// below means a partial run is safe, which is the only reason a partial run is
// worth allowing.
const only=process.argv.slice(2).filter(a=>!a.startsWith('-'));
const unknown=only.filter(k=>!PLOTS.some(([key])=>key===k));
if(unknown.length){console.error('unknown city: '+unknown.join(', ')+'\navailable: '+PLOTS.map(([k])=>k).join(', '));process.exit(1)}
const selected=only.length?PLOTS.filter(([key])=>only.includes(key)):PLOTS;

for(const [key,label,lat,lon,R] of selected){
 const dlat=R/111320, dlon=R/(111320*Math.cos(lat*Math.PI/180));
 const bb=`${(lat-dlat).toFixed(6)},${(lon-dlon).toFixed(6)},${(lat+dlat).toFixed(6)},${(lon+dlon).toFixed(6)}`;
 const q=`[out:json][timeout:180];(way["building"](${bb});relation["building"](${bb}););out tags geom;`;
 process.stdout.write(key+' … ');
 const j=await query(q);
 if(!j){console.log('FAILED');continue}

 /* Ways give their ring directly. A relation is a container: its outer members
    are the real outline, and dropping them lost every building mapped as a
    multipolygon. Each closed outer member is taken as its own footprint, which
    is a simplification — a true multipolygon with a hole is drawn as its outer
    ring — but it is far closer to the surveyed shape than a bounding box. */
 const candidates=[];
 for(const el of j.elements){
  if(el.type==='way'&&el.geometry&&el.geometry.length>2)
   candidates.push({tags:el.tags||{},geometry:el.geometry});
  else if(el.type==='relation'&&el.members)
   for(const m of el.members)
    if(m.type==='way'&&(m.role==='outer'||m.role==='')&&m.geometry&&m.geometry.length>2)
     candidates.push({tags:el.tags||{},geometry:m.geometry,fromRelation:true});
 }

 const kept=[]; let noHeight=0;
 for(const c of candidates){
  const g=heightOf(c.tags);
  if(!g){noHeight++;continue}
  // Project first, then simplify in metres, so the tolerance is a real distance.
  let ring=c.geometry.map(p=>project(p.lat,p.lon,lat,lon)).map(([x,y])=>[+x.toFixed(1),+y.toFixed(1)]);
  // OSM rings repeat the first node at the end; a repeated vertex makes the
  // extruder draw a zero-length wall on top of a real one.
  if(ring.length>3&&ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1])ring.pop();
  if(ring.length<3)continue;
  ring=simplify(ring,1.4);

  let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
  for(const [x,y] of ring){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}
  const w=maxx-minx,d=maxy-miny;
  if(w<6||d<6)continue;            // sheds and footway outlines: not city
  if(w>420||d>420)continue;         // a stadium or an airport terminal, not a block
  if(g.h<6)continue;
  const area=ringArea(ring);
  if(area<70&&g.h<18)continue;
  kept.push({ring,h:+g.h.toFixed(1),src:g.src,area:+area.toFixed(0)});
 }

 // Tallest first, then cap. A cityscape reads from its massing; the low fabric
 // only matters near the plot, so the height sort keeps what carries the view.
 kept.sort((a,b)=>b.h-a.h);
 // Prefer real footprints over bounds: a square metre of roof is what is seen.
 const rel=kept.filter(b=>b.fromRelation).length;
 console.log(`${candidates.length} rings, ${kept.length} usable (${noHeight} had no height tag, ${rel} from relations), tallest ${kept[0]?kept[0].h:'-'} m`);
 out[key]={label,lat,lon,radius:R,source:'OpenStreetMap contributors, ODbL',buildings:kept.slice(0,300)};
 await sleep(6000);
}

mkdirSync('dist',{recursive:true});

/* MERGE, DO NOT REPLACE.

   Overpass returns 502/500 under load often enough to matter, and on the run
   that produced the first footprint harvest one of the six cities failed all
   four attempts. The old script wrote whatever came back, so that city simply
   disappeared from the file — a silent loss that looked like a successful run
   and was only caught because a test counts the keys.

   So: read the existing data, replace only the cities that succeeded this run,
   and keep the rest. A failed city now means "this run did not refresh it",
   which is the truth, instead of "this city no longer exists".

   `node scripts/harvest-cityscape.mjs hcmc` re-runs one city and merges it. */
const FILE='dist/cityscape.data.js';
let previous={};
try{
 const mod=await import(new URL('../'+FILE,import.meta.url).href+'?t='+Date.now());
 previous=mod.CITYSCAPE||{};
}catch{previous={}}

/* Half-metre integers. The ring is simplified to 1.4 m before it gets here, so
   a 0.5 m grid costs nothing the eye can see and removes a decimal point from
   every one of the ~60,000 numbers in this file. */
const q=v=>String(Math.round(v*2));

let keptKeys=[];
for(const [key]of PLOTS){
 if(out[key]){previous[key]=toRecord(out[key]);continue}
 // Not refreshed this run: hold whatever was already there rather than dropping
 // the city. A missing city is not an acceptable substitute for a real one.
 if(previous[key])keptKeys.push(key);
}
for(const k of keptKeys)console.log(`${k}: not refreshed (Overpass failed) — keeping the previous harvest`);

function toRecord(v){
 const b=v.buildings.map(x=>{
  const pts=x.ring.map(([x1,y1])=>q(x1)+','+q(y1)).join(',');
  return `${q(x.h)},${x.src==='height'?0:x.src==='building:height'?1:2},${x.ring.length}~${pts}`;
 }).join('|');
 return {meta:{label:v.label,lat:v.lat,lon:v.lon,radius:v.radius,source:v.source,n:v.buildings.length},b};
}

const missing=PLOTS.map(([k])=>k).filter(k=>!previous[k]);
if(missing.length){console.error('\nABORT: no data at all for '+missing.join(', ')+' — refusing to write a file with cities missing.');process.exit(1)}

// Written in PLOTS order, so the file reads the same way every time it is
// generated rather than in whatever order the network answered.
const lines=PLOTS.map(([k])=>` ${JSON.stringify(k)}:{meta:${JSON.stringify(previous[k].meta)},b:'${previous[k].b}'}`).join(',\n');

writeFileSync(FILE,
`/* Generated by scripts/harvest-cityscape.mjs — do not edit by hand.
   Real OpenStreetMap building footprints and heights around six pilot plots.
   Building data © OpenStreetMap contributors, licensed ODbL.

   Each building is "height,heightSource,vertices~x,y,x,y,…" in HALF METRES,
   local to the plot: x east, y north. "|" separates buildings and "~" separates
   a record's head from its point list. The projection is equirectangular about
   the plot, within a metre over the radius harvested. Rings are simplified by
   Douglas–Peucker at 1.4 m, which guarantees every REMOVED vertex lay within
   1.4 m of the outline that was kept — so the drawn outline is within 1.4 m of
   the surveyed one. It does NOT mean the kept vertices are 1.4 m apart: a kept
   vertex is precisely a corner too far from the line to drop.

   heightSource: 0 = height, 1 = building:height, 2 = building:levels × 3.2 m.
   The source is carried per building because a tower measured at 599 m and one
   guessed from a level count are not the same claim, and the reader is told
   which is which. */
export const CITYSCAPE={
${lines}
};
export const CITY_KEYS=Object.keys(CITYSCAPE);
`);
console.log('\nwrote dist/cityscape.data.js');