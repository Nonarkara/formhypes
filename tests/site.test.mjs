import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GROUND,GROUND_KEYS,GROUND_ROAD_M} from '../dist/ground.data.js';
import {CITYSCAPE,CITY_KEYS} from '../dist/cityscape.data.js';
import {defaults,evaluate,profile,area,stackHeight} from '../dist/model.js';
import * as S from '../dist/site.js';

const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const CTX={storeyM:4.1,heightM:538,netArea:42495};
const PLATE=[[-24,-24],[24,-24],[24,24],[-24,24]];

test('the harvested ground and the harvested buildings describe the same six places',()=>{
 assert.deepEqual([...GROUND_KEYS].sort(),[...CITY_KEYS].sort(),
  'the ground file and the building file are about different cities');
 for(const city of GROUND_KEYS){
  const g=GROUND[city],c=CITYSCAPE[city];
  // Same plot, same projection, same radius. A mismatch here is the seam the
  // two files were written to avoid.
  assert.equal(g.meta.lat,c.meta.lat,`${city}: the ground and the buildings are centred on different latitudes`);
  assert.equal(g.meta.lon,c.meta.lon,`${city}: the ground and the buildings are centred on different longitudes`);
  assert.equal(g.meta.radius,c.meta.radius,`${city}: the ground and the buildings cover different radii`);
  assert.match(g.meta.source,/OpenStreetMap/);
  assert.ok(g.r.length>40,`${city}: ${(g.r.match(/\|/g)||[]).length+1} streets is not a city`);
  assert.ok(g.g.length>0||g.w.length>0,`${city}: no water and no green anywhere in 700 m`);
 }
});

test('coordinates arrive in metres, not the half-metres they were stored in',()=>{
 /* The harvester writes half-metres to remove a decimal point from sixty
    thousand numbers. A parser that forgets the factor is wrong by 2× — which
    looks like a perfectly plausible city and never throws. So this checks the
    PARSED numbers against the stored meta, not against a vibe. */
 for(const city of GROUND_KEYS){
  const g=S.parseGround(city,GROUND),c=S.parseCity(city,CITYSCAPE);
  assert.ok(g&&c,`${city}: nothing parsed`);
  let maxR=0;
  for(const r of g.roads)for(const p of r.pts)maxR=Math.max(maxR,Math.hypot(p[0],p[1]));
  for(const b of c.buildings)for(const p of b.pts)maxR=Math.max(maxR,Math.hypot(p[0],p[1]));
  // The query box is a SQUARE and the first filter tested it as one, so admitted
  // geometry reaches a corner of that square at 1.41·R per axis — about 2.0·R
  // measured from the centre. The harvester now filters radially at 1.25·R, but
  // this bound stays loose enough to hold the file harvested under the old rule
  // and tight enough to fail on the strays that sat 4832 m out.
  assert.ok(maxR<=g.meta.radius*2.3+2,`${city}: a point sits ${maxR.toFixed(0)} m out, past ${(g.meta.radius*2.3).toFixed(0)} m`);
  assert.ok(maxR>100,`${city}: the largest coordinate is ${maxR.toFixed(1)} m — the half-metre factor was not undone`);
  for(const r of g.roads)assert.ok(r.pts.length>=2&&r.cls>=0&&r.cls<GROUND_ROAD_M.length);
  for(const b of c.buildings)assert.ok(b.pts.length>=3&&b.h>0);
 }
});

test('the shadow has the area the geometry says it has, at every hour of the day',()=>{
 /* THE GUARD THAT MATTERS HERE. The shadow is built by hulling the footprint
    together with the footprint pushed by h / tan(altitude) — and h / tan(45°) is
    40.000000000000014, whose x offset is −4.9e−15. Sort those eight points by x
    and the shadow's left edge sorts BEFORE the plot's own bottom-left corner, so
    the monotone chain starts on the wrong edge and returns a six-vertex polygon
    that is convex-looking, finite, free of NaN, and has an area of 400 where the
    true answer is 500. Every other guard in this file was green while that was
    true. So this compares the EMITTED area against the closed form. */
 const plot=PLATE, base=area(plot);
 const ext=xs=>{const v=xs.map(p=>p[0]);return Math.max(...v)-Math.min(...v)};
 const extY=xs=>{const v=xs.map(p=>p[1]);return Math.max(...v)-Math.min(...v)};
 for(const alt of[10,15,25,35,45,55,70,85]){
  for(const az of[0,45,90,135,180,225,270,315]){
   const sh=S.shadowPolygon(plot,40,alt,az);
   assert.ok(sh,`alt ${alt} az ${az}: no shadow at all`);
   const got=Math.abs(S.ringArea(sh));
   const reach=40/Math.tan(alt*Math.PI/180);
   // A rectangle swept by `reach` perpendicular to one of its own edges grows
   // by exactly reach × the length of that edge. Swept diagonally the added
   // area is larger, so the axis-aligned value is a floor there, not an equality.
   const floor=az%180===0?base+reach*ext(plot):base+reach*extY(plot);
   if(az%90===0)
    assert.ok(Math.abs(got-floor)<0.5,
     `alt ${alt} az ${az}: shadow area ${got.toFixed(1)} m², the closed form says ${floor.toFixed(1)}`);
   else
    assert.ok(got>=floor-0.5,`alt ${alt} az ${az}: shadow area ${got.toFixed(1)} is below the axis-aligned minimum ${floor.toFixed(1)}`);
  }
 }
});

test('the shadow falls away from the sun, and reaches the neighbours it should',()=>{
 const plot=[[-5,-5],[5,-5],[5,5],[-5,5]];
 const at=(x,y)=>({pts:[[x-4,y-4],[x+4,y-4],[x+4,y+4],[x-4,y+4]],h:10});
 const N=at(0,35),Sth=at(0,-35),E=at(35,0),W=at(-35,0);
 const all=[N,Sth,E,W], tag=b=>b===N?'N':b===Sth?'S':b===E?'E':b===W?'W':'?';
 // Azimuth is the bearing OF the sun, 0 = north. A sun in the south (180) puts
 // the shadow to the north. Offsetting towards the sun instead reports zero
 // neighbours overshadowed, which reads as "this tower harms nobody" on the
 // brightest afternoon of the year.
 assert.deepEqual(S.overshadow(plot,40,{altitude:45,azimuth:180},all,null).caught.map(tag),['N']);
 assert.deepEqual(S.overshadow(plot,40,{altitude:45,azimuth:0},all,null).caught.map(tag),['S']);
 assert.deepEqual(S.overshadow(plot,40,{altitude:45,azimuth:90},all,null).caught.map(tag),['W']);
 assert.deepEqual(S.overshadow(plot,40,{altitude:45,azimuth:270},all,null).caught.map(tag),['E']);
 // A low sun reaches much further than a high one.
 const low=S.overshadow(plot,40,{altitude:12,azimuth:180},all,null).reach;
 const high=S.overshadow(plot,40,{altitude:80,azimuth:180},all,null).reach;
 assert.ok(low>high*5,`a 12° sun (${low.toFixed(0)} m) barely out-reaches an 80° one (${high.toFixed(0)} m)`);
 // And the plot itself can be excluded, which is what makes this a per-plot
 // measure rather than a count of the city.
 assert.deepEqual(S.overshadow(plot,40,{altitude:45,azimuth:180},all,b=>b===N).caught.map(tag),[]);
 // Below the horizon there is no finite shadow, and saying so beats a huge one.
 assert.equal(S.overshadow(plot,40,{altitude:0.4,azimuth:180},all,null).reach,0);
});

test('sky view factor is one on open ground and falls as the city closes in',()=>{
 assert.equal(S.skyViewFactor(0,0,[]).svf,1,'an empty site does not see the whole sky?');
 const ring=[];
 for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2,cx=Math.cos(a)*70,cy=Math.sin(a)*70;
  ring.push({h:250,pts:[[cx-9,cy-9],[cx+9,cy-9],[cx+9,cy+9],[cx-9,cy+9]]});
 }
 const city=S.skyViewFactor(0,0,ring).svf;
 assert.ok(city<0.9&&city>0.3,`a ring of sixteen 250 m blocks should leave a middling view, got ${city}`);
 // Lowering the same ring to 10 m must open the sky back up.
 assert.ok(S.skyViewFactor(0,0,ring.map(b=>({...b,h:10}))).svf>city+0.1,'ten-metre neighbours block the same as 250 m ones');
 // A building the observer is standing INSIDE is skipped, or every plot would
 // report that it is in a tunnel.
 const inside={h:400,pts:[[-9,-9],[9,-9],[9,9],[-9,9]]};
 assert.equal(S.skyViewFactor(0,0,[...ring,inside]).svf,city,'the plot’s own building blocked its own sky');
 // And the profile comes back with one value per azimuth, so the section can be
 // drawn from the same numbers the factor was computed from.
 const {skyline}=S.skyViewFactor(0,0,ring);
 assert.equal(skyline.length,72);
 assert.ok(skyline.every(v=>v>=0&&v<=Math.PI/2),'a skyline elevation left the hemisphere');
});

test('the observation point is inside the plot, even when the plot is not convex',()=>{
 /* The area centroid is the obvious choice and it is wrong here: on an L it
    lands in the courtyard, and a sky view factor measured from the courtyard is
    a measurement of nothing at all. */
 const shapes={
  square:[[0,0],[10,0],[10,10],[0,10]],
  L:[[0,0],[20,0],[20,4],[4,4],[4,20],[0,20]],
  U:[[0,0],[20,0],[20,16],[16,16],[16,4],[4,4],[4,16],[0,16]],
  crescent:[[0,0],[24,0],[24,6],[8,6],[8,14],[24,14],[24,20],[0,20]],
 };
 for(const [name,ring] of Object.entries(shapes)){
  const c=S.ringCentroid(ring),o=S.observerPoint(ring);
  assert.ok(S.pointInRing(o[0],o[1],ring),`${name}: the observation point ${JSON.stringify(o.map(v=>+v.toFixed(1)))} is outside the plot`);
  // On the convex shapes the centroid is already right, and must be kept.
  if(name==='square')assert.ok(Math.hypot(o[0]-c[0],o[1]-c[1])<1e-6,'the square is convex and its centroid was abandoned');
 }
 // The centroid genuinely IS outside the concave ones — that is the bug being
 // guarded, so assert it rather than leave it as folklore.
 for(const name of['L','U','crescent'])
  assert.ok(!S.pointInRing(...S.ringCentroid(shapes[name]),shapes[name]),
   `${name}: this shape no longer demonstrates why the centroid is unsafe`);
});

test('frontage counts metres of street edge, not "near a road" yes or no',()=>{
 const plot=[[0,0],[40,0],[40,30],[0,30]];
 // A street just outside the bottom edge fronts essentially all of it, plus the
 // sliver of the two side edges that share the corner — which is what frontage
 // means, and why this is measured in metres rather than answered yes or no.
 const along=S.frontageLength(plot,[[-5,-9],[45,-9]],12);
 assert.ok(along>38&&along<56,`a street along the bottom edge fronts ${along.toFixed(1)} m of a 40 × 30 plot`);
 assert.equal(S.frontageLength(plot,[[-5,300],[45,300]],12),0,'a street 300 m away fronts nothing');
 // A street clipping one corner fronts a slice, not the whole perimeter.
 const corner=S.frontageLength(plot,[[-8,-6],[14,-6]],9);
 assert.ok(corner>0&&corner<along,`a corner street fronts ${corner.toFixed(1)} m against ${along.toFixed(1)} for a full frontage`);
 // And the plot's own perimeter is the ceiling, always.
 assert.ok(S.frontageLength(plot,[[-40,-40],[50,-40]],60)<=S.ringPerimeter(plot)+0.01,
  'frontage exceeded the perimeter it is measured along');
 assert.equal(S.distToPolyline(20,15,[[-5,15],[45,15]]),0,'a point on the centreline is zero from it');
 assert.equal(S.distToPolyline(20,40,[[-5,15],[45,15]]),25,'a point 25 m off the centreline is 25 m from it');
});

test('a plot can actually be chosen, and the facts about it are real',()=>{
 const cityKey='tokyo';
 const city=S.parseCity(cityKey,CITYSCAPE),ground=S.parseGround(cityKey,GROUND);
 const plateArea=area(profile(defaults,0));
 const plots=S.plotCandidates(city,ground,plateArea);
 assert.ok(plots.length>=10,`only ${plots.length} plots in Tokyo are big enough for a ${plateArea.toFixed(0)} m² plate`);
 // Sorted by area, descending, and every one of them is genuinely big enough.
 for(let i=1;i<plots.length;i++)assert.ok(plots[i].area<=plots[i-1].area,'the candidates are not ordered by area');
 for(const p of plots)assert.ok(p.area>=plateArea*0.9,`${p.id}: ${p.area.toFixed(0)} m² plot offered for a ${plateArea.toFixed(0)} m² plate`);
 // And the appraisal of the best one holds together.
 const facts=S.plotFacts(plots[0],{ground,buildings:city.buildings,towerH:stackHeight(defaults),plateArea,sun:{altitude:45,azimuth:180}});
 assert.ok(facts.area>plateArea);
 assert.ok(facts.width>0&&facts.width<=Math.sqrt(facts.area)*2+1,`caliper width ${facts.width.toFixed(1)} m is not a chord of a ${facts.area.toFixed(0)} m² plot`);
 assert.ok(facts.coverage>0&&facts.coverage<=1,'coverage should be a fraction');
 assert.ok(facts.svf>=0&&facts.svf<=1,'sky view factor left 0..1');
 assert.ok(facts.skyline.length===72);
 assert.ok(facts.shadowReach>0,'no shadow reach at a 45° sun');
 assert.ok(facts.nearestRoadDist>=0,'a negative distance to the nearest street');
 assert.ok(facts.frontage>=0&&facts.frontage<=facts.perimeter+0.01,'frontage exceeds the perimeter it is measured along');
 assert.ok(facts.neighbourMax>0,'no neighbours within 140 m of the largest plot in Tokyo');
 assert.ok(facts.eye&&S.pointInRing(facts.eye[0],facts.eye[1],plots[0].ring),'the observation point is outside the plot it describes');
});

test('the landscape draws one amber tower in a grey city, with no NaN and no clipping',()=>{
 const cityKey='tokyo';
 const city=S.parseCity(cityKey,CITYSCAPE),ground=S.parseGround(cityKey,GROUND);
 const plate=profile(defaults,0);
 const plot=S.plotCandidates(city,ground,area(plate))[0];
 const scene=S.makeScene({radius:ground.meta.radius,towerH:stackHeight(defaults)});
 const towerH=stackHeight(defaults);
 const svg=S.landscapeSVG({ground,city,plot,tower:plate,towerH,scene,labels:{aria:'test'}});
 assert.ok(svg.startsWith('<svg viewBox="0 0 '),'no viewBox');
 assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'the landscape carries a NaN');
 // The harvested disc must FIT the box. It used not to: the scale came from
 // min(width,height)/metres, which put a 619 px disc inside a 460 px frame, so
 // most of the landscape was clipped away and the drawing showed a small disc in
 // an empty rectangle. This asserts the disc, not the raw coordinates — geometry
 // beyond it is clipped on purpose and is allowed to fall outside.
 const D=scene.disc;
 assert.ok(D.cx-D.rx>=0&&D.cx+D.rx<=scene.width,
  `the ground spans ${(D.cx-D.rx).toFixed(0)}..${(D.cx+D.rx).toFixed(0)} inside 0..${scene.width}`);
 assert.ok(D.cy-D.ry-towerH*0.96*scene.scale>=0,
  `the tower stands off the top of the frame by ${(D.cy-D.ry-towerH*0.96*scene.scale).toFixed(0)} px`);
 assert.ok(D.cy+D.ry<=scene.height,
  `the near edge of the ground is ${(D.cy+D.ry).toFixed(0)} in a ${scene.height}-tall frame`);
 // The ground is compressed 0.36 vertically, so it is an ELLIPSE. Clipping it
 // with a circle the width of the scene wastes a third of the frame.
 assert.ok(Math.abs(D.ry/D.rx-0.36)<0.01,`the ground ellipse is ${(D.ry/D.rx).toFixed(3)} of its width, expected 0.36`);
 for(const m of svg.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g))
  assert.ok(Number.isFinite(+m[1])&&Number.isFinite(+m[2]),`non-finite coordinate ${m[1]},${m[2]}`);
 // The whole point: amber appears on the tower and the city stays grey.
 assert.ok(svg.includes('fill="#f59e0b"'),'the tower is not amber');
 assert.ok(svg.includes('stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="5 3"'),'the chosen plot is not outlined');
 // Ground context actually made it in — a landscape with no streets on it is a
 // massing model, which is what this work was meant to stop being.
 for(const [name,needle] of [['roads','stroke="#3d4a53"'],['waterways','#1d2f3a'],['ground fill','fill="#111416"']])
  assert.ok(svg.includes(needle),`no ${name} in the drawing`);
 // And the city is not drawn in amber by accident.
 const greys=(svg.match(/#2b3843|#1e2830|#121920|#33414c|#243039/g)||[]).length;
 assert.ok(greys>50,`only ${greys} grey tones — the surrounding city did not draw`);
});

test('the sky section is drawn from the same profile the factor came from',()=>{
 const city=S.parseCity('tokyo',CITYSCAPE);
 const plot={ring:[[-20,-20],[20,-20],[20,20],[-20,20]],cx:0,cy:0};
 const {svf,skyline}=S.skyViewFactor(0,0,city.buildings);
 const svg=S.skyViewSVG({skyline,svf,labels:{title:'sky',value:'51%',aria:'test'}});
 assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
 assert.ok(svg.includes('fill="#f59e0b" fill-opacity=".5"'),'the hidden sky is not drawn');
 // 72 skyline points in, 72 corners out, plus the two ends of the band.
 const corners=(svg.match(/L[\d.]+ [\d.]+/g)||[]).length;
 assert.ok(corners>=72,`the profile drew ${corners} corners for ${skyline.length} skyline samples`);
 assert.ok(svf>0&&svf<=1);
});

test('the site module and its data are inside the release graph',()=>{
 const rel=readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8');
 assert.match(rel,/ground\.data\.js/,'the harvested ground can change without moving a stamp');
 assert.match(rel,/site\.js/,'the site module is not content-pinned');
 // And the context desk has to import it for the pin to mean anything.
 assert.match(read('context.js'),/site\.js\?v=/,'context.js imports site.js without pinning the bytes');
});