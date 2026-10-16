/* Harvest real building footprints and heights from OpenStreetMap around each
   pilot plot, and bake them into dist/cityscape.js.

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
for(const [key,label,lat,lon,R] of PLOTS){
 const dlat=R/111320, dlon=R/(111320*Math.cos(lat*Math.PI/180));
 const bb=`${(lat-dlat).toFixed(6)},${(lon-dlon).toFixed(6)},${(lat+dlat).toFixed(6)},${(lon+dlon).toFixed(6)}`;
 const q=`[out:json][timeout:180];(way["building"](${bb});relation["building"](${bb}););out tags geom;`;
 process.stdout.write(key+' … ');
 const j=await query(q);
 if(!j){console.log('FAILED');continue}
 const members=j.elements.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>2);
 const kept=[]; let noHeight=0;
 for(const el of members){
  const g=heightOf(el.tags||{});
  if(!g){noHeight++;continue}
  let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
  for(const p of el.geometry){const [x,y]=project(p.lat,p.lon,lat,lon);
   if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}
  const w=maxx-minx,d=maxy-miny;
  if(w<6||d<6)continue;            // sheds and footway outlines: not city
  if(w>420||d>420)continue;         // a stadium or an airport terminal, not a block
  // A skyline reads from its massing. Two-metre shophouses and bus shelters are
  // real and surveyed, but at this scale they are texture, not city, and they
  // cost bytes that a four-hundred-metre tower does not need.
  if(g.h<6)continue;
  if(w*d<70&&g.h<18)continue;
  kept.push({x1:+minx.toFixed(1),y1:+miny.toFixed(1),x2:+maxx.toFixed(1),y2:+maxy.toFixed(1),
             h:+g.h.toFixed(1),src:g.src});
 }
 // Tallest first, then cap. A cityscape reads as a skyline; the low fabric only
 // matters near the plot, so the height sort keeps the ones that carry the view.
 kept.sort((a,b)=>b.h-a.h);
 console.log(`${members.length} ways, ${kept.length} usable (${noHeight} had no height tag), tallest ${kept[0]?kept[0].h:'-'} m`);
 out[key]={label,lat,lon,radius:R,source:'OpenStreetMap contributors, ODbL',buildings:kept.slice(0,300)};
 await sleep(6000);
}

mkdirSync('dist',{recursive:true});
const lines=Object.entries(out).map(([k,v])=>{
 const b=v.buildings.map(x=>`${x.x1},${x.y1},${x.x2},${x.y2},${x.h},${x.src==='height'?0:x.src==='building:height'?1:2}`).join('|');
 return ` ${JSON.stringify(k)}:{meta:${JSON.stringify({label:v.label,lat:v.lat,lon:v.lon,radius:v.radius,source:v.source,n:v.buildings.length})},b:'${b}'}`;
}).join(',\n');

writeFileSync('dist/cityscape.data.js',
`/* Generated by scripts/harvest-cityscape.mjs — do not edit by hand.
   Real OpenStreetMap building footprints and heights around six pilot plots.
   Building data © OpenStreetMap contributors, licensed ODbL.
   Each building is [x1,y1,x2,y2,height,heightSource] in metres, local to the
   plot: x east, y north. The projection is equirectangular about the plot,
   which is within a metre over the radius harvested. heightSource: 0 = height,
   1 = building:height, 2 = building:levels × 3.2 m. The source is carried per
   building because a tower measured at 599 m and one guessed from a level count
   are not the same claim, and the reader is told which is which. */
export const CITYSCAPE={
${lines}
};
export const CITY_KEYS=Object.keys(CITYSCAPE);
`);
console.log('\nwrote dist/cityscape.data.js');