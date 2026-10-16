import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CITYSCAPE,CITY_KEYS} from '../dist/cityscape.data.js';
import {cityData,skyline,visibleMassings,ringArea,CITY_KEYS as READER_KEYS} from '../dist/cityscape.js';
import {cities,solarDefaults} from '../dist/solar.js';
import {t} from '../dist/i18n.js';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

/* The cityscape is the only part of the drawing made of somebody else's data.
   That makes it the part where an unstated assumption is most likely to sit, so
   these guards are about claims: what is real, what is inferred, and what the
   drawing says out loud. */

test('every pilot city has a harvested cityscape, and every city offered has one',()=>{
 assert.deepEqual(CITY_KEYS.slice().sort(),Object.keys(cities).slice().sort());
 for(const k of CITY_KEYS){
  const c=cityData(k);
  assert.ok(c&&c.buildings.length,k+' has no buildings');
  // The radius the harvest covered, and the label that names the plot.
  assert.ok(c.radius>=300&&c.radius<=1000,k+' radius is not a believable study radius');
  assert.ok(c.label&&c.label.length>4,k+' plot is unnamed');
  assert.match(c.source,/OpenStreetMap/,'every city must carry its attribution');
  assert.ok(Number.isFinite(c.lat)&&Number.isFinite(c.lon));
 }
});

test('every building is inside the harvested radius and above the ground',()=>{
 for(const k of CITY_KEYS){
  const c=cityData(k),r=c.radius;
  for(const b of c.buildings){
   assert.ok(b.h>0&&b.h<700,`${k} has an impossible height ${b.h}`);
   assert.ok(b.ring.length>=3,`${k} has a footprint with fewer than three corners`);
   // Every corner has to sit inside the square the harvest actually queried.
   for(const [x,y]of b.ring){
    assert.ok(Math.abs(x)<=r+1,`${k} building sits outside its radius`);
    assert.ok(Math.abs(y)<=r+1,`${k} building sits outside its radius`);
    assert.ok(Number.isFinite(x)&&Number.isFinite(y),`${k} has a non-finite coordinate`);
   }
   // A zero-length edge would draw a wall on top of a real one and a zero-area
   // ring would extrude into nothing. Both come from an OSM ring whose first
   // node is repeated at the end, which the harvester strips.
   for(let i=0;i<b.ring.length;i++){
    const a=b.ring[i],d=b.ring[(i+1)%b.ring.length];
    assert.ok(Math.hypot(d[0]-a[0],d[1]-a[1])>0.01,`${k} has a zero-length edge`);
   }
  }
 }
});

test('heights are real or inferred, and which one is recorded per building',()=>{
 for(const k of CITY_KEYS){
  for(const b of cityData(k).buildings){
   assert.ok([0,1,2].includes(b.src),`${k} carries height source ${b.src}, which names nothing`);
  }
 }
 for(const k of CITY_KEYS){
  const top=cityData(k).buildings.slice(0,12);
  assert.ok(top.length>=8,`${k} has too few buildings to read a skyline from`);
  // A top-12 band may legitimately include heights from `building:height` or a
  // level count. What must not happen is a band that is entirely inferred and
  // would therefore be presented as if every one of them were surveyed.
  if(top.some(x=>x.src!==0))assert.ok(top.some(x=>x.src===0),
   `${k}: the top of the skyline mixes inferred heights in, but has no surveyed one to anchor them`);
  // The tallest building is the biggest claim the drawing makes about anybody
  // else's work, so it has to be a measured one in every city.
  assert.ok([0,1].includes(cityData(k).buildings[0].src),
   `${k}: the tallest building's height came from a level count, not a measurement`);
 }
});

test('the rank is the model\'s real position in the mapped skyline, not a guess',()=>{
 // 214 m in Bangkok: the tallest mapped building is 181 m, so nothing is above
 // it and the model is first. Jakarta has seven towers above 214 m, so it is
 // eighth. These are counted, not asserted from a table.
 const bkk=skyline('bangkok',214.4);
 assert.equal(bkk.tallerThanModel,0);
 assert.equal(bkk.rank,1);
 assert.ok(bkk.localMax<214.4,'Bangkok really does have nothing taller than this model');
 const jak=skyline('jakarta',214.4);
 assert.ok(jak.tallerThanModel>0,'Jakarta has towers above this model');
 assert.equal(jak.rank,jak.tallerThanModel+1,'rank is the count above it, plus one');
 // Rank is counted from the top, so a TALLER model must land LOWER in the
 // number: the fifth-tallest thing in Shenzhen ranks 5. Getting this backwards
 // would make the readout say the opposite of what it measures.
 let last=Infinity;
 for(const h of[50,120,214,383,500]){
  const r=skyline('shenzhen',h).rank;
  assert.ok(r<=last,`a taller model cannot rank higher in the skyline (${h} m -> ${r} after ${last})`);
  last=r;
 }
 // And a model taller than everything is first, not off the end of the list.
 assert.equal(skyline('kl',900).rank,1);
});

test('the surveyed fraction is a real count, and it is reported as such',()=>{
 for(const k of CITY_KEYS){
  const c=cityData(k);
  const measured=c.buildings.filter(b=>b.src===0).length;
  const s=skyline(k,214.4);
  assert.equal(Math.round(s.measuredFraction*100),Math.round(measured/c.buildings.length*100));
  assert.ok(s.measuredFraction>=0&&s.measuredFraction<=1);
 }
 // KL's low-rise fabric is almost entirely surveyed; Shenzhen's towers are not.
 // If these two ever swap, the harvest has silently changed and someone should
 // look at it rather than accept a different number.
 assert.ok(skyline('kl',214.4).measuredFraction>.7);
 assert.ok(skyline('shenzhen',214.4).measuredFraction<.7);
});

test('massing too small to see is dropped, and nothing else is',()=>{
 const c=cityData('tokyo');
 const all=visibleMassings(c,1,0);
 assert.equal(all.length,c.buildings.length,'at scale 1 with no threshold nothing is dropped');
 const fewer=visibleMassings(c,0.02,1.6);
 assert.ok(fewer.length<all.length,'at 20 mm per metre the low fabric must drop');
 assert.ok(fewer.length>0,'and something must survive — it is the whole point');
 const keyOf=b=>b.ring.map(p=>p.join(':')).join(';')+'@'+b.h;
 const kept=new Set(fewer.map(keyOf));
 // The guarantee that matters is not a height cut-off, which is scale-dependent,
 // but this: the cull must never lose the skyline. Whenever the tallest building
 // would stand taller than the threshold, it is on the sheet.
 const tallest=c.buildings[0];
 if(tallest.h*0.02*.96>=1.6)assert.ok(kept.has(keyOf(tallest)),'the tallest building was culled while still visible');
 // And the cull is a real cull: most of the low fabric is gone at that scale.
 assert.ok(all.length-fewer.length>all.length*0.3,'the low fabric is not being dropped at all');
});

test('the drawing names the city, the rank and the source, in all three languages',()=>{
 for(const l of ['en','th','zh']){
  assert.ok(t[l]['v.skyline'],l+' omits the skyline sentence');
  assert.ok(t[l]['v.skycredit'],l+' omits the attribution');
  assert.ok(t[l]['v.skyline'].includes('{where}')&&t[l]['v.skyline'].includes('{rank}'),l+' loses its subject');
  assert.match(t[l]['v.skycredit'],/OpenStreetMap/,'the attribution is a proper noun and stays Latin');
 }
 // A Chinese sentence must not carry an English clause. The proper noun and
 // the licence are exempt; four English words in a row are not.
 assert.ok(!/[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(t.zh['v.skyline']));
 assert.ok(!/[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(t.th['v.skyline']));
});

test('footprints are outlines, not bounding boxes — this is the whole point',()=>{
 // The first harvest asked Overpass for `out tags geom` and then kept only the
 // bounding box, so every L, cruciform and notched building in the six cities was
 // drawn as a rectangle and the viewport read as a table of blocks. These guards
 // exist so that regression cannot pass quietly.
 for(const k of CITY_KEYS){
  const c=cityData(k);
  // A ring with four corners all axis-aligned IS a rectangle. Count them.
  const rectangular=c.buildings.filter(b=>{
   if(b.ring.length!==4)return false;
   let axis=0;
   for(let i=0;i<4;i++){
    const a=b.ring[i],d=b.ring[(i+1)%4];
    if(Math.abs(a[0]-d[0])<0.01||Math.abs(a[1]-d[1])<0.01)axis++;
   }
   return axis===4;
  });
  const rectFrac=rectangular.length/c.buildings.length;
  // Real city footprints are overwhelmingly non-rectangular. If more than
  // three quarters of a harvested city are four-sided axis-aligned boxes, the
  // geometry has been flattened again.
  assert.ok(rectFrac<.75,
   `${k}: ${rectFrac*100|0}% of buildings are axis-aligned rectangles — the footprints are boxes again`);

  // The real signature: buildings must have more than four corners, because an L
  // is five and a notch is six. If none did, simplification would have reduced
  // every outline to a rectangle again.
  //
  // The floor is 20%, not higher, because it has to hold for the smallest
  // city: Ho Chi Minh has 16 usable buildings and four of them are complex,
  // which is exactly 25% and is simply what that data contains. A threshold
  // tuned to Tokyo would reject an honest small sample as if it were a bug.
  const complex=c.buildings.filter(b=>b.ring.length>4);
  assert.ok(complex.length>=c.buildings.length*0.2,
   `${k}: only ${complex.length} of ${c.buildings.length} buildings have a non-rectangular outline`);

  // What simplification actually guarantees, stated honestly: every point it
  // REMOVED lay within the tolerance of the line it kept. It never claims the
  // opposite — a retained vertex is precisely the corner too far from the line
  // to drop, so it can be many metres off its neighbours. Asserting that a kept
  // vertex sits near its neighbours asserts that the simplification did nothing,
  // which would reject every real corner in the file.
  //
  // So the tolerance is checked as the properties the drawing actually needs:
  // the outline is still a closed ring, it still encloses area, and it has not
  // collapsed or repeated a vertex.
  for(const b of c.buildings.slice(0,40)){
   assert.notEqual(ringArea(b.ring),0,`${k}: a simplified ring encloses no area`);
   const keys=new Set(b.ring.map(p=>p.join(',')));
   assert.equal(keys.size,b.ring.length,`${k}: a simplified ring repeats a vertex`);
   assert.ok(b.ring.length>=3,`${k}: a simplified ring has fewer than three corners`);
  }
 }
});

test('the ring winding is known, so the renderer can cull the back walls',()=>{
 // The extruder draws only the edges whose outward normal faces the camera, and
 // that normal is (ey, -ex) for a counter-clockwise ring. A ring wound the other
 // way points every face inwards and the cull removes exactly the walls the
 // reader can see — the building disappears instead of looking wrong.
 // The renderer normalises handedness per drawing; this checks the data can
 // support that, i.e. every ring has a definite orientation, not a degenerate
 // zero area that would be ambiguous.
 for(const k of CITY_KEYS){
  for(const b of cityData(k).buildings.slice(0,60)){
   const area=ringArea(b.ring);
   assert.ok(Math.abs(area)>1,`${k}: a footprint encloses no area, so its facing is undefined`);
  }
 }
 // A square wound both ways still draws correctly after normalisation, which is
 // the property the renderer depends on.
 const ccw=[[0,0],[10,0],[10,10],[0,10]];
 assert.ok(ringArea(ccw)>0,'this winding is counter-clockwise');
 assert.ok(ringArea([...ccw].reverse())<0,'and reversing it flips the sign, which is what normalising relies on');
});

test('the viewport stands on harvested ground instead of four invented boxes',()=>{
 const app=dist('app.js');
 assert.ok(!app.includes('[-65,34,20,38]'),'the four hand-placed blocks are back');
 // The city must be fetched ABOVE the grid that reads it. It was declared at
 // its point of use once, and the grid hit it in the temporal dead zone: the
 // whole canvas came back black with one ReferenceError in the console.
 const cityAt=app.indexOf('const city=cityData(state.city)');
 const gridAt=app.indexOf('const gridR=city?city.radius');
 assert.ok(cityAt>0&&gridAt>0,'city and grid must both be present');
 assert.ok(cityAt<gridAt,'the city must be read before the grid that depends on it');
 // Depth split: the half of the city nearer the camera is drawn after the
 // tower, or every block stands behind it and orbiting changes nothing.
 assert.ok(app.includes('drawCity(cityNear)'));
 assert.ok(app.indexOf('drawCity(cityNear)')>app.indexOf('drawCity(cityFar)'));
 assert.match(dist('index.html'),/id="skylineReadout"/);
});