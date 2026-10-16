/* Harvest the GROUND around each pilot plot — streets, water, parks — and bake
   it into dist/ground.data.js.

   WHY A SECOND FILE AND NOT AN EXTENSION OF THE CITYSCAPE. The cityscape file
   is live and load-bearing: the hero drawing, the ranks and the tallests all
   read it. Overpass fails often enough that a run which can corrupt that file
   is a standing hazard, so this writes somewhere new. A total failure here
   leaves the site exactly as it was, which is the correct outcome for missing
   scenery and is emphatically not the correct outcome for missing buildings.

   WHY BAKED AND NOT FETCHED. Same reason as the footprints: `connect-src
   'self'` under a strict CSP makes a live Overpass call from the page
   impossible, and inlining keeps the data inside the release graph so a changed
   street network is a changed bytes-hash.

   STREETS ARE THE POINT. Buildings alone read as a massing model floating in
   nothing. What makes a drawing legible as a PLACE is the grain of the street
   network — the block size, the width of the arterials, the way a boulevard
   cuts diagonally through a field of parcels. Without them there is no
   landscape, only objects.

   SIMPLIFICATION IS COARSER HERE THAN ON FOOTPRINTS, DELIBERATELY. A 1.4 m
   Douglas–Peucker tolerance is right for a building corner, where the corner
   is the information. A street is a long curve sampled from GPS and its
   intermediate nodes are noise: at 4 m the straight runs straighten, the
   junctions keep their shape, and the file loses two thirds of its size.

   OpenStreetMap data is © OpenStreetMap contributors, licensed ODbL. The
   attribution is printed on screen, not just here. */

import {writeFileSync, mkdirSync} from 'node:fs';

const UA='FormHypes/1.0 (architectural context study; https://shdt.nonarkara.org)';
const ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];

// [key, name, lat, lon, radius in metres] — the SAME plots the cityscape uses,
// so the buildings and the ground around them describe one place.
const PLOTS=[
 ['bangkok','Sathorn, Bangkok',13.72032,100.53031,700],
 ['kl','Merdeka Square, Kuala Lumpur',3.144944,101.693806,700],
 ['jakarta','Sudirman, Jakarta',-6.20361,106.82,700],
 ['hcmc','Dien Bien Phu, Ho Chi Minh City',10.795,106.7219,700],
 ['shenzhen','Yitian Road, Shenzhen',22.5364,114.0503,700],
 ['tokyo','Marunouchi, Tokyo',35.6812,139.7671,700],
];

/* Road class → index, and index → drawn width in metres. The widths are a
   conventional cartographic scale, not surveyed values: what a section through
   a street is supposed to look like. They are a drawing decision and are
   labelled as one, not passed off as measured. */
const ROAD_CLASS=[
 ['motorway',22],['trunk',18],['primary',15],['secondary',12],
 ['tertiary',9],['residential',7],['unclassified',6],['living_street',5]];
const ROAD_IDX=new Map(ROAD_CLASS.map(([k],i)=>[k,i]));
const ROAD_W=ROAD_CLASS.map(([,w])=>w);

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Equirectangular about the plot, identical to the cityscape projection so the
// two files can be overlaid without a seam between them.
const project=(lat,lon,lat0,lon0)=>{
 const R=6378137,rad=Math.PI/180;
 return [ (lon-lon0)*rad*R*Math.cos(lat0*rad), (lat-lat0)*rad*R ];
};

function simplify(pts,tol){
 if(pts.length<3)return pts;
 const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;
 const stack=[[0,pts.length-1]];
 while(stack.length){
  const [a,b]=stack.pop();
  const[ax,ay]=pts[a],[bx,by]=pts[b];
  const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
  let far=-1,fd=0;
  for(let i=a+1;i<b;i++){
   const[px,py]=pts[i];
   const d=len<1e-9?Math.hypot(px-ax,py-ay):Math.abs(dx*(ay-py)-(ax-px)*dy)/len;
   if(d>fd){fd=d;far=i}
  }
  if(far<0||fd<=tol)continue;
  keep[far]=1;stack.push([a,far],[far,b]);
 }
 return pts.filter((_,i)=>keep[i]);
}

const dedupe=pts=>{
 const seen=new Set(),out=[];
 for(const p of pts){
  const k=p[0]+','+p[1];
  if(seen.has(k))continue;
  seen.add(k);out.push(p);
 }
 return out;
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
// `node scripts/harvest-ground.mjs hcmc tokyo` refreshes only those; the merge
// at the bottom makes a partial run safe.
const only=process.argv.slice(2).filter(a=>!a.startsWith('-'));
const unknown=only.filter(k=>!PLOTS.some(([key])=>key===k));
if(unknown.length){console.error('unknown city: '+unknown.join(', ')+'\navailable: '+PLOTS.map(([k])=>k).join(', '));process.exit(1)}
const selected=only.length?PLOTS.filter(([key])=>only.includes(key)):PLOTS;

for(const [key,label,lat,lon,R] of selected){
 const dlat=R/111320, dlon=R/(111320*Math.cos(lat*Math.PI/180));
 const bb=`${(lat-dlat).toFixed(6)},${(lon-dlon).toFixed(6)},${(lat+dlat).toFixed(6)},${(lon+dlon).toFixed(6)}`;
 const q=`[out:json][timeout:240];(`+
  `way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${bb});`+
  `way["natural"="water"](${bb});`+
  `way["waterway"~"^(river|canal)$"](${bb});`+
  `way["leisure"~"^(park|garden|recreation_ground)$"](${bb});`+
  `way["landuse"~"^(grass|forest|meadow|cemetery)$"](${bb});`+
  `relation["natural"="water"](${bb});`+
  `relation["leisure"~"^(park|garden)$"](${bb});`+
  `);out tags geom;`;
 process.stdout.write(key+' … ');
 const j=await query(q);
 if(!j){console.log('FAILED');continue}

 const roads=[],waterways=[],waters=[],greens=[];
 /* A relation is selected because it INTERSECTS the box, and Overpass then
    returns EVERY member of it — including ways kilometres away. Shenzhen's
    largest multipolygon reached 4832 m from the plot centre, seven times the
    radius the file claims to cover. Nothing downstream noticed, because the
    drawing clips to a 700 m circle and the stray geometry vanishes off the edge
    while still costing bytes in the file.

    So members are admitted on their own geometry, not on the fact that their
    relation matched. The bound is 1.6·R rather than R, because the query box is
    a SQUARE: a street crossing the plot has its corners at R·√2 ≈ 1.41·R, and
    clipping at exactly R would chop real streets in half. */
 const LIMIT=R*1.25;                       // RADIAL, not a square
 let strayed=0;
 const strays=pts=>{for(const [x,y] of pts)if(Math.hypot(x,y)>LIMIT)return true;return false};
 for(const el of j.elements){
  const tags=el.tags||{};
  const ways=[];
  if(el.type==='way'&&el.geometry&&el.geometry.length>1)ways.push({tags,geometry:el.geometry});
  else if(el.type==='relation'&&el.members)
   // A relation's outer members are the real outline; taking the relation's own
   // tags is what stopped malls and podiums vanishing in the first harvest.
   for(const m of el.members)
    if(m.type==='way'&&(m.role==='outer'||m.role==='')&&m.geometry&&m.geometry.length>1)
     ways.push({tags,geometry:m.geometry});

  for(const w of ways){
   let pts=w.geometry.map(p=>project(p.lat,p.lon,lat,lon)).map(([x,y])=>[+x.toFixed(1),+y.toFixed(1)]);
   pts=dedupe(pts);
   if(pts.length<2)continue;
   if(strays(pts)){strayed++;continue}

   if(tags.highway){
    const ci=ROAD_IDX.get(tags.highway);
    if(ci===undefined)continue;
    const s=simplify(pts,4);
    if(s.length>=2)roads.push({ci,pts:s});
   }else if(tags.waterway&&(tags.waterway==='river'||tags.waterway==='canal')){
    const s=simplify(pts,4);
    // Width is conventional where OSM carries it and conventional where it does
    // not; a canal mapped without width is drawn as a canal, not a river.
    const w=parseFloat(tags.width);
    const wid=Number.isFinite(w)&&w>0?Math.min(w,60):(tags.waterway==='canal'?12:35);
    if(s.length>=2)waterways.push({pts:s,wid:+wid.toFixed(1)});
   }else if(tags.natural==='water'){
    const ring=pts.length>3&&pts[0][0]===pts[pts.length-1][0]&&pts[0][1]===pts[pts.length-1][1]?pts.slice(0,-1):pts;
    const s=simplify(ring,2);
    if(s.length>=3)waters.push({pts:s});
   }else if((tags.leisure&&(tags.leisure==='park'||tags.leisure==='garden'||tags.leisure==='recreation_ground'))||
            (tags.landuse&&(tags.landuse==='grass'||tags.landuse==='forest'||tags.landuse==='meadow'||tags.landuse==='cemetery'))){
    const ring=pts.length>3&&pts[0][0]===pts[pts.length-1][0]&&pts[0][1]===pts[pts.length-1][1]?pts.slice(0,-1):pts;
    const s=simplify(ring,2);
    if(s.length>=3)greens.push({pts:s});
   }
  }
 }

 // Cap the streets, keeping the arterials. A full 700 m of every service road is
 // bytes nobody will see behind a building; a missing motorway is a missing
 // piece of the city.
 roads.sort((a,b)=>a.ci-b.ci||b.pts.length-a.pts.length);
 const keptRoads=roads.slice(0,700);
 out[key]={label,lat,lon,radius:R,source:'OpenStreetMap contributors, ODbL',
  roads:keptRoads,waterways,water:waters,green:greens};
 console.log(`${roads.length} streets (${keptRoads.length} kept), ${waterways.length} waterways, ${waters.length} water, ${greens.length} green${strayed?`, ${strayed} members dropped as strays beyond ${Math.round(LIMIT)} m`:''}`);
 await sleep(6000);
}

mkdirSync('dist',{recursive:true});

/* MERGE, DO NOT REPLACE. Same reasoning as the cityscape harvester: Overpass
   drops cities under load, and a script that writes whatever came back turns a
   transient outage into permanent, silent data loss. */
const FILE='dist/ground.data.js';
let previous={};
try{
 const mod=await import(new URL('../'+FILE,import.meta.url).href+'?t='+Date.now());
 previous=mod.GROUND||{};
}catch{previous={}}

const q=v=>String(Math.round(v*2));
const enc=pts=>pts.map(([x,y])=>q(x)+','+q(y)).join(',');

function toRecord(v){
 return {
  meta:{label:v.label,lat:v.lat,lon:v.lon,radius:v.radius,source:v.source,
   nRoads:v.roads.length,nWater:v.waterways.length,nArea:v.water.length+v.green.length},
  r:v.roads.map(x=>x.ci+'~'+enc(x.pts)).join('|'),
  x:v.waterways.map(x=>x.wid+'~'+enc(x.pts)).join('|'),
  w:v.water.map(x=>enc(x.pts)).join('|'),
  g:v.green.map(x=>enc(x.pts)).join('|'),
 };
}

const held=[];
for(const [key]of PLOTS){
 if(out[key]){previous[key]=toRecord(out[key]);continue}
 if(previous[key])held.push(key);
}
for(const k of held)console.log(`${k}: not refreshed (Overpass failed) — keeping the previous harvest`);

const missing=PLOTS.map(([k])=>k).filter(k=>!previous[k]);
if(missing.length){console.error('\nABORT: no data at all for '+missing.join(', ')+' — refusing to write a file with cities missing.');process.exit(1)}

const lines=PLOTS.map(([k])=>` ${JSON.stringify(k)}:{meta:${JSON.stringify(previous[k].meta)},r:'${previous[k].r}',x:'${previous[k].x}',w:'${previous[k].w}',g:'${previous[k].g}'}`).join(',\n');

writeFileSync(FILE,
`/* Generated by scripts/harvest-ground.mjs — do not edit by hand.
   Real OpenStreetMap ground around six pilot plots: streets, waterways, water
   and green space. Data © OpenStreetMap contributors, licensed ODbL.

   All coordinates are in HALF METRES, local to the plot, x east and y north,
   on the same equirectangular projection the cityscape uses — so the buildings
   and the ground they stand on overlay without a seam.

   r  streets.  "classIndex~x,y,x,y,…", "|" between streets. The class index is
      into ROAD_W: ${ROAD_W.map((w,i)=>i+'='+w+'m').join(', ')}. Those widths are a
      conventional cartographic scale, not surveyed values.
   x  waterways. "width~x,y,…". Width is metres, from the OSM width tag where
      present and conventional where it is not.
   w  water areas. "x,y,…", "|" between polygons.
   g  green space. Parks, gardens, recreation grounds, grass, forest, meadow and
      cemetery. Same encoding as w.

   Streets are simplified by Douglas–Peucker at 4 m and areas at 2 m, which
   guarantees every REMOVED vertex lay within that distance of the line that was
   kept. */
export const GROUND={
${lines}
};
export const GROUND_KEYS=Object.keys(GROUND);
export const GROUND_ROAD_M=[${ROAD_W.join(',')}];
`);
console.log('\nwrote '+FILE);