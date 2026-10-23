import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GROUND,GROUND_KEYS,GROUND_ROAD_M} from '../dist/ground.data.js';
import {CITYSCAPE,CITY_KEYS} from '../dist/cityscape.data.js';
import {defaults,evaluate,profile,area,stackHeight} from '../dist/model.js';
import {renderSite} from '../dist/context.js';
import {t} from '../dist/i18n.js';
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
 // A building due West (-x) must block the exact same sky fraction as an
 // identical building due East (+x), and populate the Western skyline bins
 // (36..71). Because atan2(x,y) is negative for x < 0, a raw `% 72` remainder
 // indexes negative elements on the Float64Array and drops the entire Western
 // hemisphere.
 const eastBlock={h:180,pts:[[30,-10],[50,-10],[50,10],[30,10]]};
 const westBlock={h:180,pts:[[-50,-10],[-30,-10],[-30,10],[-50,10]]};
 const eastRes=S.skyViewFactor(0,0,[eastBlock]);
 const westRes=S.skyViewFactor(0,0,[westBlock]);
 assert.ok(eastRes.svf<1&&westRes.svf<1,'a 180 m block 30 m away must reduce SVF in both hemispheres');
 assert.ok(Math.abs(eastRes.svf-westRes.svf)<1e-12,`West block SVF (${westRes.svf}) differs from East block SVF (${eastRes.svf})`);
 assert.ok(westRes.skyline.slice(36,72).some(v=>v>0),'Western hemisphere block left skyline bins 36..71 empty');
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
 const street=(y,cls)=>[{cls,pts:[[-5,y],[45,y]]}];
 // A street just outside the bottom edge fronts essentially all of it, plus the
 // sliver of the two side edges that share the corner — which is what frontage
 // means, and why this is measured in metres rather than answered yes or no.
 const along=S.frontageLength(plot,street(-9,5),{verge:12});
 assert.ok(along>38&&along<56,`a street along the bottom edge fronts ${along.toFixed(1)} m of a 40 × 30 plot`);
 assert.equal(S.frontageLength(plot,street(300,5),{verge:12}),0,'a street 300 m away fronts nothing');
 // A street clipping one corner fronts a slice, not the whole perimeter.
 const corner=S.frontageLength(plot,[{cls:5,pts:[[-8,-6],[14,-6]]}],{verge:9});
 assert.ok(corner>0&&corner<along,`a corner street fronts ${corner.toFixed(1)} m against ${along.toFixed(1)} for a full frontage`);
 // And the plot's own perimeter is the ceiling, always — including when two
 // streets both reach the same edge, which must be counted once and not twice.
 assert.ok(S.frontageLength(plot,street(-9,5),{verge:60})<=S.ringPerimeter(plot)+0.01,
  'frontage exceeded the perimeter it is measured along');
 assert.ok(S.frontageLength(plot,[...street(-9,5),...street(-11,5)],{verge:6})
   <=S.ringPerimeter(plot)+0.01,'two streets reaching one edge counted it twice');
 assert.equal(S.distToPolyline(20,15,[[-5,15],[45,15]]),0,'a point on the centreline is zero from it');
 assert.equal(S.distToPolyline(20,40,[[-5,15],[45,15]]),25,'a point 25 m off the centreline is 25 m from it');
});

test('the verge is measured from the kerb, not from the middle of the tarmac',()=>{
 /* Both of these sit 14 m from a plot boundary at a 6 m verge. One fronts it
    and one does not, and the only thing that can tell them apart is the WIDTH
    of the carriageway — because a 22 m motorway's kerb is 11 m closer to the
    boundary than a 5 m lane's is.

    The version that shipped measured to the centreline for both, so a 5 m lane
    counted as fronting a plot 14 m away and a 22 m motorway 3 m away counted as
    not fronting it. Both wrong, in opposite directions. */
 const plot=[[0,0],[40,0],[40,30],[0,30]];
 const at=y=>[{cls:0,pts:[[-5,y],[45,y]]}];
 const lane=S.frontageLength(plot,[{cls:7,pts:[[-5,-14],[45,-14]]}],{verge:6});
 const motorway=S.frontageLength(plot,at(-14),{verge:6});
 assert.equal(lane,0,`a 5 m lane 14 m from the boundary should front nothing at a 6 m verge, but fronts ${lane.toFixed(1)} m`);
 assert.ok(motorway>30,`a 22 m motorway 14 m from the boundary reaches the kerb, and fronts ${motorway.toFixed(1)} m`);
 assert.ok(motorway>lane,'the wider carriageway must reach the boundary further out');
});

test('a plot can actually be chosen, and the facts about it are real',()=>{
 const cityKey='tokyo';
 const city=S.parseCity(cityKey,CITYSCAPE),ground=S.parseGround(cityKey,GROUND);
 const plate=profile(defaults,0),plateArea=area(plate);
 const plots=S.plotCandidates(city,ground,plate);
 assert.ok(plots.length>=10,`only ${plots.length} plots in Tokyo are big enough for a ${plateArea.toFixed(0)} m² plate`);
 // Sorted by area, descending, and every one of them is genuinely big enough.
 for(let i=1;i<plots.length;i++)assert.ok(plots[i].area<=plots[i-1].area,'the candidates are not ordered by area');
 for(const p of plots)assert.ok(p.area>=plateArea*0.9,`${p.id}: ${p.area.toFixed(0)} m² plot offered for a ${plateArea.toFixed(0)} m² plate`);
 // And the appraisal of the best one holds together.
 const facts=S.plotFacts(plots[0],{ground,buildings:city.buildings,towerH:stackHeight(defaults),plate,plateArea,sun:{altitude:45,azimuth:180}});
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
 const plot=S.plotCandidates(city,ground,plate)[0];
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
 // The frame is derived from the drawing, so it is tight at BOTH ends. It used
 // to be a chosen 470 px with the ground fitted inside it, which left 176 px of
 // blank paper under every city — and the CSS sizes the SVG by width, so that
 // slack shipped as visible margin rather than as letterboxing.
 const top=Math.min(D.cy-D.ry,D.cy-towerH*0.96*scene.scale);
 const bottom=scene.height-(D.cy+D.ry);
 assert.ok(top>=scene.margin-1,`the drawing starts ${top.toFixed(0)} px from the top edge`);
 assert.ok(top<=scene.margin+1,`${top.toFixed(0)} px of dead paper above the drawing`);
 assert.ok(bottom>=0,`the near edge of the ground is ${(D.cy+D.ry).toFixed(0)} in a ${scene.height}-tall frame`);
 assert.ok(bottom<=scene.margin+1,`${bottom.toFixed(0)} px of dead paper below the near edge of the ground`);
 assert.ok(scene.height<=470,`the derived frame grew to ${scene.height} px, past the ${470} px cap`);
 // The ground is compressed 0.36 vertically, so it is an ELLIPSE. Clipping it
 // with a circle the width of the scene wastes a third of the frame.
 assert.ok(Math.abs(D.ry/D.rx-0.36)<0.01,`the ground ellipse is ${(D.ry/D.rx).toFixed(3)} of its width, expected 0.36`);
 for(const m of svg.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g))
  assert.ok(Number.isFinite(+m[1])&&Number.isFinite(+m[2]),`non-finite coordinate ${m[1]},${m[2]}`);
 // The whole point: amber appears on the tower and the city stays grey.
 assert.ok(svg.includes('fill="#f59e0b"')||svg.includes('fill="#fbbf24"'),'the tower carries no amber at all');
 assert.ok(svg.includes('stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="5 3"'),'the chosen plot is not outlined');
 // "One amber building in a grey city" is a claim about the WHOLE palette, so
 // it is checked as one: nothing outside the declared tones may appear. The
 // version of this that only looked for a specific amber would have broken the
 // day the light happened to turn both visible walls the same shade — which is
 // what the geometry actually does from this camera.
 const AMBERS=new Set(['#f59e0b','#fbbf24','#b45309']);
 const GREYS=new Set(['#111416','#1a2620','#14212a','#2b343b','#3d4a53','#1d2f3a',
  '#2b3843','#1e2830','#121920','#33414c','#243039','#2c363d','#6c818c']);
 const stray=[...new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map(m=>m[1]))]
  .filter(c=>!AMBERS.has(c)&&!GREYS.has(c));
 assert.deepEqual(stray,[],`the drawing invented colours that are on no palette: ${stray.join(', ')}`);
 // The tower is drawn last, so nothing grey may be laid over it.
 const amberAt=svg.indexOf('fill="#fbbf24"')>-1?svg.indexOf('fill="#fbbf24"'):svg.indexOf('fill="#f59e0b"');
 const outlineAt=svg.indexOf('stroke="#f59e0b" stroke-width="1.4"');
 assert.ok(outlineAt>0,'the plot outline is missing');
 const greyAfter=[...svg.slice(outlineAt).matchAll(/fill="(#[0-9a-f]{6})"/g)].map(m=>m[1])
  .filter(c=>!AMBERS.has(c));
 assert.deepEqual([...new Set(greyAfter)],[],
  `something grey was drawn over the tower: ${[...new Set(greyAfter)].join(', ')}`);
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
 assert.ok(svg.includes('fill="#f59e0b" fill-opacity=".28"'),'the hidden sky is not drawn');
 // 72 skyline points in, 72 corners out, plus the two ends of the band.
 const corners=(svg.match(/L[\d.]+ [\d.]+/g)||[]).length;
 assert.ok(corners>=72,`the profile drew ${corners} corners for ${skyline.length} skyline samples`);
 assert.ok(svf>0&&svf<=1);
});

test('an open sky draws an empty band, and a walled one draws a full box',()=>{
 /* The band was traced from the TOP of the frame down to the skyline and closed
    on the top line. When the skyline is flat — an open horizon — that path dives
    to the floor at the first sample, runs along it, and climbs back, which is a
    full-height rectangle. So the desk printed "99% of the sky still visible"
    next to a solid wall of amber.

    Two objects that agree with each other and are both wrong, and the guard that
    should have caught it read the PERCENTAGE rather than the shape.

    The shape is the claim here. Both ends are asserted, because a fix that
    only empties the open case could do it by never drawing the band at all. */
 const N=72;
 const open=new Float64Array(N);                       // nothing above the horizon
 const walled=new Float64Array(N).fill(Math.PI/2);    // 90° of mass in every bearing

 // Pull the band's own coordinates back out of the emitted path.
 const bandOf=svg=>{
  const m=/d="([^"]+)" fill="#f59e0b" fill-opacity="\.28"/.exec(svg);
  assert.ok(m,'no hidden-sky band in the section');
  return [...m[1].matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(q=>[+q[1],+q[2]]);
 };
 const HZ=svg=>{                                     // the horizon line, by its stroke
  const m=/x1="([\d.]+)" y1="([\d.]+)" x2="[\d.]+" y2="\2" stroke="#6c818c"/.exec(svg);
  assert.ok(m,'the section has no horizon line');
  return +m[2]};

 // An open horizon: a band with no height. Tolerance is one pixel on a 106 px
 // plot, which is looser than the one-decimal precision of what was emitted.
 const flat=bandOf(S.skyViewSVG({skyline:open,svf:1,labels:{}}));
 assert.ok(flat.length>=3,`the open-sky band drew ${flat.length} points`);
 const hzOpen=HZ(S.skyViewSVG({skyline:open,svf:1,labels:{}}));
 const openHeight=flat.reduce((a,p)=>Math.max(a,hzOpen-p[1]),0);
 assert.ok(openHeight<=1.5,
  `an open horizon fills ${openHeight.toFixed(1)} px of the band — a full box, for a sky with nothing in it`);

 // A walled one: the whole box. This is the other half, so that "passes" cannot
 // be achieved by simply never drawing the band.
 const full=bandOf(S.skyViewSVG({skyline:walled,svf:0.5,labels:{}}));
 const hzWall=HZ(S.skyViewSVG({skyline:walled,svf:0.5,labels:{}}));
 const wallHeight=full.reduce((a,p)=>Math.max(a,p[1]),0)-Math.min(...full.map(p=>p[1]));
 assert.ok(wallHeight>80,`a walled horizon drew a ${wallHeight.toFixed(1)} px band — the band never grows`);
 assert.ok(wallHeight>openHeight*10,'the band does not respond to the skyline it is supposed to be showing');

 // And the two cases must disagree by more than a rounding error, on the same
 // section: that is the whole property the desk is making a claim about.
 assert.ok(wallHeight-openHeight>80,'the band cannot tell an open sky from a walled one');
});

test('the sky section axis is inside its own box',()=>{
 /* The elevation labels were anchored `end` at x = L − 2, two pixels inside the
    left edge, so "90°" ran off the front of the viewBox and was clipped away.
    The reader was left with a partial scale and no way to tell it was partial.

    The check that matters is not "is the anchor inside the box" — a
    right-anchored label sits INSIDE the box and still runs off the left of it,
    which is exactly what the shipped version did and what a first draft of this
    guard called fine. The check is whether the anchor leaves enough of the box
    for the label to occupy: at 9.5 px monospace, "90°" is about 17 px wide. So
    every right-anchored label must sit at least 20 px in from the edge, and the
    geometry must stay inside the viewBox the section declares. */
 const city=S.parseCity('tokyo',CITYSCAPE);
 const {svf,skyline}=S.skyViewFactor(0,0,city.buildings);
 const svg=S.skyViewSVG({skyline,svf,labels:{title:'sky',value:'51%',aria:'test'}});
 const vb=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
 assert.ok(vb,'the section declares no viewBox');
 const W=+vb[1],H=+vb[2];
 const rightAnchored=[...svg.matchAll(/x="(-?[\d.]+)"[^>]*text-anchor="end"/g)].map(m=>+m[1]);
 assert.ok(rightAnchored.length>=3,`the section has ${rightAnchored.length} right-anchored labels`);
 for(const x of rightAnchored)
  assert.ok(x>=20,`a right-anchored label at x=${x} leaves under 20 px for its own text — "90°" runs off the left of the box`);
 for(const m of svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)){
  assert.ok(+m[1]>=0&&+m[1]<=W&&+m[2]>=0&&+m[2]<=H,
   `the section draws at ${m[1]},${m[2]} which is outside the ${W}×${H} it declares`);
 }
 // The scale has to be legible: 0° at the horizon, 90° at the top of the box.
 for(const a of['0°','30°','60°','90°'])
  assert.ok(svg.includes(`>${a}</text>`),`the elevation scale is missing ${a}`);
 assert.ok(/y1="([\d.]+)"[^>]*stroke="#6c818c"/.test(svg),'no horizon to read 0° against');
});

test('the extrusion keeps the walls that face the camera and drops the ones behind',()=>{
 /* A building is a roof cap plus only the walls turned towards the reader.

    The cull shipped as `n.x·v.x − n.y·v.y`. On a box that still draws exactly two
    walls — so the guard that counted walls passed, and the count was the only
    thing anyone checked. But the sign threw away the term that decides which
    side is near: what survived was one near wall and one FAR wall, and the
    tower read on screen as a slab with a slot cut through it.

    So this does not count. It reads the emitted path data, inverts the
    projection to recover each point's DEPTH, and asks the only question that
    distinguishes a correct cull from a plausible one: is every wall that was
    drawn standing in front of the building it belongs to? A far wall answers no.

    Depth is recovered from screen y at a known storey height, because that is
    the same arithmetic the renderer did — but backwards, off the drawing, with
    no access to the footprint it was handed. */
 const square=[[-20,-20],[20,-20],[20,20],[-20,20]];
 const scene=S.makeScene({towerH:120});
 const city={buildings:[{h:120,pts:square}]};
 const svg=S.landscapeSVG({ground:null,city,plot:null,tower:square,towerH:120,
  scene,labels:{aria:'cull'}});

 // The roof is the one light-amber cap; the walls are the two darker ambers.
 const caps=[...svg.matchAll(/<path d="([^"]+)" fill="#fbbf24"\/>/g)];
 assert.equal(caps.length,1,`expected one roof cap, found ${caps.length}`);
 const walls=[...svg.matchAll(/<path d="([^"]+)" fill="#(?:f59e0b|b45309)"\/>/g)];
 assert.ok(walls.length>=1,'the tower drew no walls at all');

 const pts=d=>[...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
 // Invert the projection: Y = cy − (z·0.96 − ry·0.36)·scale, so ry falls out of
 // the screen y once the storey height is known.
 const depth=(Y,z)=>(scene.cy-Y)/scene.scale-z*0.96;
 const roofDepth=pts(caps[0][1]).reduce((a,p)=>a+depth(p[1],120),0)/pts(caps[0][1]).length;

 for(const w of walls){
  const p=pts(w[1]);
  assert.equal(p.length,4,`a wall is not a quad: ${w[1].slice(0,60)}`);
  // The base is the lower pair on screen: the roof is drawn at z=120 and the
  // wall hangs DOWN from it, so the two largest Y are the ground.
  const base=p.sort((a,b)=>a[1]-b[1]).slice(2).map(q=>depth(q[1],0));
  assert.equal(base.length,2,`a wall has ${base.length} base corners, not 2`);
  const d=base.reduce((a,b)=>a+b,0)/2;
  // Tolerance is in METRES and is looser than the emitted precision: coordinates
  // are written to one decimal of a pixel, so half a metre here is many times
  // the noise floor and still far tighter than a whole wall of a 40 m block.
  assert.ok(d<=roofDepth+0.5,
   `a wall stands ${(d-roofDepth).toFixed(1)} m BEHIND the roof centre — it faces away from the camera and should have been culled`);
 }
});

test('a lot is never appraised against the building standing on it',()=>{
 /* Lots are cut out of the harvested footprint list, and a lot's `ring` is that
    building's own array of points. But the lot handed downstream is a new
    wrapper object, so `filter(b=>b!==lot)` removed nothing and
    `skip(b=>b===lot)` never fired.

    The consequence was that every plot measured itself. On Bangkok's largest
    lot the desk reported "tallest neighbour 40 m" — and the plot's own existing
    building was 40 m tall — for a site whose real neighbours top out at 20 m.
    The height ratio was doubled by the same mistake.

    Asserted on a fixture built so the ONLY thing that can produce a high
    neighbour figure is the building standing on the lot: one 200 m building at
    the origin, and four 12 m sheds around it. A real-city version of this test
    cannot work, because on real data the tallest thing near a lot is usually
    some other building entirely and the assertion proves nothing. */
 const square=[[-30,-30],[30,-30],[30,30],[-30,30]];
 const shed=(x,y)=>[[x-8,y-8],[x+8,y-8],[x+8,y+8],[x-8,y+8]];
 const buildings=[{h:200,pts:square},
  {h:12,pts:shed(70,0)},{h:12,pts:shed(-70,0)},{h:12,pts:shed(0,70)},{h:12,pts:shed(0,-70)}];
 const PL=[[-8,-8],[8,-8],[8,8],[-8,8]];
 const plot=S.plotCandidates({buildings},null,PL)[0];
 assert.ok(plot,`the fixture produced ${S.plotCandidates({buildings},null,PL).length} lots`);
 assert.equal(plot.existing,200,'the fixture is not exercising what it claims to');

 const facts=S.plotFacts(plot,{ground:null,buildings,towerH:220,plate:PL,plateArea:3000,
  sun:{altitude:55,azimuth:180}});
 assert.equal(facts.neighbourMax,12,
  `this lot has a 200 m building standing on it and reports a ${facts.neighbourMax} m tallest neighbour — it is measuring itself`);
 assert.equal(facts.neighbourCount,4,`expected the four sheds, counted ${facts.neighbourCount}`);
 // The sky view factor must not be blocked by the building being replaced
 // either: 200 m at 70 m away would put the skyline at 70° in four bearings.
 assert.ok(facts.skyline.every(a=>a<Math.atan2(12,40)),
  'the plot is blocking its own sky view factor');
 assert.ok(facts.svf>0.99,`the sky view factor is ${facts.svf.toFixed(4)} around four 12 m sheds`);
 // And the shadow of the replacement tower catches the shed due north of the
 // lot — 220 m at 55° throws 154 m — and nothing else. It cannot catch the lot's
 // own building, because that building is the lot. With it left in the list its
 // centroid sits at the origin, inside the shadow polygon, and this reads 2
 // instead of 1: the plot reports its own roof as having been overshadowed by
 // the building being planned to replace it.
 assert.equal(facts.shadowCaught,1,
  `the replacement tower's 154 m shadow catches ${facts.shadowCaught} roofs — one to the north, and not the lot's own`);
});

test('every lot offered is on ground the drawing actually covers',()=>{
 /* The landscape clips to the harvest ellipse. A lot whose centroid is outside
    it is land the reader cannot see, offered as though it were there. Seven of
    Bangkok's twenty-one candidates sat beyond the 700 m radius — including the
    largest, which is exactly the one the picker opened on.

    A tool that offers ground it cannot draw has answered the question already,
    and did it with the one lot most likely to be picked. */
 const plate=profile(defaults,0);
 for(const cityKey of CITY_KEYS){
  const city=S.parseCity(cityKey,CITYSCAPE),ground=S.parseGround(cityKey,GROUND,GROUND_ROAD_M);
  const R=ground.meta.radius;
  const plots=S.plotCandidates(city,ground,plate);
  assert.ok(plots.length>0,`${cityKey}: no lot is offered at all`);
  const outside=plots.filter(p=>Math.hypot(p.cx,p.cy)>R);
  assert.deepEqual(outside.map(p=>p.id),[],
   `${cityKey}: ${outside.length} of ${plots.length} lots sit beyond the ${R} m harvest radius and cannot be drawn`);
 }
});

test('streets are drawn at their own widths, not at one width for all of them',()=>{
 /* parseGround was asked for `ground.roadW`, a property it had never produced,
    so every street fell through to an 8 m default and a 22 m motorway came out
    exactly as wide as the service lane beside it. The whole reason a street is
    drawn as a cased ribbon rather than a line is that the width says something.

    Asserted on the emitted stroke widths, and against the harvested table, so
    the drawing cannot quietly agree with itself while both are wrong. */
 const ground=S.parseGround('bangkok',GROUND,GROUND_ROAD_M);
 assert.deepEqual(ground.roadW,GROUND_ROAD_M,'the parsed ground does not carry the harvested width table');
 const city=S.parseCity('bangkok',CITYSCAPE);
 const scene=S.makeScene({radius:ground.meta.radius,towerH:220});
 const svg=S.landscapeSVG({ground,city,plot:null,tower:null,towerH:220,scene,labels:{aria:'w'}});
 // Carriageway strokes are the ROADFILL tone; collect the widths it was given.
 const widths=new Set([...svg.matchAll(/stroke="#3d4a53" stroke-width="([\d.]+)"/g)].map(m=>+m[1]));
 assert.ok(widths.size>=3,`every street drew at the same width — ${widths.size} distinct carriageway widths in a city with an eight-class road hierarchy`);
 const widest=Math.max(...widths),narrowest=Math.min(...widths);
 assert.ok(widest>narrowest*1.8,`the widest street is ${widest.toFixed(1)} px and the narrowest ${narrowest.toFixed(1)} px — the hierarchy is not legible`);
 // The widest ribbon must be the widest CLASS ACTUALLY HARVESTED here, not the
 // widest in the table and not whichever street happened to be drawn last.
 // Bangkok has no motorway inside the harvest radius, so the top class present
 // is a trunk road — expecting the motorway here would be asserting a fact about
 // this city that is not true of it.
 const present=[...new Set(ground.roads.map(r=>r.cls))].sort((a,b)=>a-b);
 assert.ok(present.length>=3,`only ${present.length} street classes in the harvest`);
 const expectFor=cls=>GROUND_ROAD_M[cls]*scene.scale*0.55;
 assert.ok(Math.abs(widest-expectFor(present[0]))<0.6,
  `the widest carriageway is ${widest.toFixed(2)} px; class ${present[0]} (${GROUND_ROAD_M[present[0]]} m) at this scale should be ${expectFor(present[0]).toFixed(2)} px`);
 assert.ok(Math.abs(narrowest-expectFor(present[present.length-1]))<0.6,
  `the narrowest carriageway is ${narrowest.toFixed(2)} px; class ${present[present.length-1]} (${GROUND_ROAD_M[present[present.length-1]]} m) at this scale should be ${expectFor(present[present.length-1]).toFixed(2)} px`);
});

test('the shadow row names the sun it was computed for',()=>{
 /* `st.shadow` ships as "Shadow at {0}° sun" in all three languages, and the
    renderer passed the raw label to the DOM instead of the translated one, so
    the placeholder was never filled. A shadow length printed without the sun
    that casts it is not a measurement, it is a number. */
 const ctx=read('context.js');
 assert.match(ctx,/txt\(c\['st\.shadow'\],/,
  'the shadow label is written straight into the DOM, so its {0} placeholder never gets the sun altitude');
 for(const lang of['en','th','zh']){
  assert.match(t[lang]['st.shadow'],/\{0\}/,`st.shadow in ${lang} no longer carries a placeholder, so the guard above proves nothing`);
 }
});

test('the building stands on the lot it was put on',()=>{
 /* The plate is defined at the origin, because it is a module-level idea of a
    floor. The lot is a real footprint a few hundred metres from the survey
    centre. So the drawing stood the amber tower at the middle of the map and
    outlined the chosen lot somewhere else entirely — on Shenzhen they were a
    block apart, and the desk is called "Stand here".

    Checked on geometry, because that is what the drawing is made of: the seat
    must be ON the lot, and the plate must be the plate merely moved — same
    area, same orientation, not shrunk to fit. Shrinking the building until it
    fits would make the overhang question disappear and with it the finding. */
 const plate=profile(defaults,0),plateArea=area(plate);
 assert.ok(plate.length>=3,'the plate has no footprint to place');
 const before=Math.abs(S.ringArea(plate));
 for(const cityKey of CITY_KEYS){
  const ground=S.parseGround(cityKey,GROUND,GROUND_ROAD_M),city=S.parseCity(cityKey,CITYSCAPE);
  const plots=S.plotCandidates(city,ground,plate);
  for(const p of plots.slice(0,6)){
   const placed=S.plateOnPlot(plate,p);
   // The seat itself must be on the lot, wherever the survey centre is.
   assert.ok(S.pointInRing(placed.origin[0],placed.origin[1],p.ring),
    `${cityKey}/${p.id}: the tower is seated ${Math.hypot(placed.origin[0],placed.origin[1]).toFixed(0)} m from the origin, outside the lot`);
   assert.ok(Math.hypot(placed.origin[0],placed.origin[1])>1||p.ring.some(q=>Math.abs(q[0])<1),
    `${cityKey}/${p.id}: the plate was not moved onto the lot`);
   // Moved, never resized.
   const after=Math.abs(S.ringArea(placed.pts));
   assert.ok(Math.abs(before-after)<0.01,`${cityKey}/${p.id}: placing the plate changed its area`);
   // And the overhang is measured, not asserted away.
   assert.ok(placed.fit>=0&&placed.fit<=1,`${cityKey}/${p.id}: fit ${placed.fit} is not a fraction`);
   // The plate must reach the lot: a seat on the ring with the building nowhere
   // near it would pass the centroid test and still be floating.
   const gap=Math.min(...plate.map(([x,y])=>
    S.pointInRing(x+placed.origin[0],y+placed.origin[1],p.ring)?0:S.distToRing(x+placed.origin[0],y+placed.origin[1],p.ring)));
   assert.ok(gap<40,`${cityKey}/${p.id}: the nearest point of the plate is ${gap.toFixed(0)} m from the lot`);
  }
 }
 // The unplaced plate is the thing that was wrong; it must still be the origin,
 // so that "placed" means something rather than the source having drifted.
 assert.ok(plate.every(([x,y])=>Math.abs(x)<40&&Math.abs(y)<40),
  'the plate is no longer defined at the origin, so plateOnPlot proves nothing');
});

test('the fit fraction is measured, and is not quietly reported as whole',()=>{
 /* A plate of exactly the lot's own shape, seated on it, must report a fit of
    one — otherwise the fraction is not measuring anything. And a plate twice
    the size of the lot must report less than one, or the overhang is being
    hidden rather than shown.

    This is the row that stops the landscape from being a picture of a building
    hanging over its own site with nothing said about it. */
 const square=[[-25,-25],[25,-25],[25,25],[-25,25]];
 const own=S.plateOnPlot(square,{ring:[[-26,-26],[26,-26],[26,26],[-26,26]]});
 assert.ok(own.fit>0.99,`a plate comfortably inside its lot reports a fit of ${own.fit.toFixed(3)}, not 1`);

 // A lot covering exactly the western half of a square plate must report
 // exactly one half. This is the fraction the LABEL claims — how much of the
 // plate is standing on the lot — and not its reverse, which is a different
 // number and would read as "the plate covers half the lot".
 //
 // Measured on fitOf directly rather than through plateOnPlot, because seating
 // is a separate job: plateOnPlot SLIDES the plate to the best seat it can find,
 // so a deliberately half-covered lot is slid away from before it is measured.
 // Testing the two through each other tests neither.
 assert.ok(Math.abs(S.fitOf(square,[[-26,-26],[0,-26],[0,26],[-26,26]])-0.5)<0.001,
  `a lot covering the western half of the plate gives a fit of ${S.fitOf(square,[[-26,-26],[0,-26],[0,26],[-26,26]]).toFixed(4)}, not 0.5`);
 // And the reverse fraction — how much of the LOT the plate covers — is a
 // different number and must not be what gets reported. Here the lot sits wholly
 // inside the plate, so the two are as far apart as they get: 0.33 one way,
 // 1.00 the other. A guard that cannot tell them apart is not guarding.
 const innerRing=[[-26,-26],[-10,-26],[-10,26],[-26,26]];
 const inner=S.fitOf(square,innerRing);
 // Tolerance is one 1 m column of a 50 m plate, which is 2%. The continuous
 // answer is 0.32 and the sampled one lands on the nearest column boundary;
 // anything tighter would be asserting the grid away rather than measuring it.
 assert.ok(Math.abs(inner-0.32)<0.03,
  `a lot wholly inside the plate should give a fit of about 0.32, not ${inner.toFixed(3)}`);
 // This ring is the separator for the two fractions, and it is the ring's
 // geometry that separates them rather than a second computation: the lot sits
 // entirely within the plate, so the reverse question — how much of the LOT the
 // plate covers — is 1.00 by definition, while the question the label asks is
 // 0.32. A fitOf that answered the other one would return 1 here.

 const big=[[-50,-50],[50,-50],[50,50],[-50,50]];
 const over=S.plateOnPlot(big,{ring:[[-25,-25],[25,-25],[25,25],[-25,25]]});
 assert.ok(over.holds===false,'a 100 m plate claims to fit a 50 m lot');
 assert.ok(over.fit>0.2&&over.fit<0.4,
  `a 100 m plate on a 50 m lot is a quarter of it, and fitOf says ${over.fit.toFixed(3)}`);

 // The real cruciform against a real harvested lot, as a last sanity check that
 // the fraction lands in a plausible band rather than at either extreme.
 const city=S.parseCity('bangkok',CITYSCAPE),ground=S.parseGround('bangkok',GROUND,GROUND_ROAD_M);
 const lot=S.plotCandidates(city,ground,profile(defaults,0))[0];
 const real=S.plateOnPlot(profile(defaults,0),lot);
 assert.ok(real.fit>0&&real.fit<1,
  `the largest Bangkok lot reports a fit of ${real.fit.toFixed(3)} — the overhang is being hidden`);
});

test('a crescent lot still gets the building centred on something solid',()=>{
 /* The centroid of an L-shaped footprint lands in the courtyard. The seat must
    not — and when nothing holds the plate, the fallback is the centroid only if
    the centroid is itself on the lot, which on a crescent it is not. */
 const L=[[0,0],[60,0],[60,20],[20,20],[20,60],[0,60]];
 assert.ok(!S.pointInRing(...S.ringCentroid(L),L),'this shape no longer has an outside centroid');
 const placed=S.plateOnPlot([[-8,-8],[8,-8],[8,8],[-8,8]],{ring:L});
 assert.ok(S.pointInRing(placed.origin[0],placed.origin[1],L),
  'the building is seated in the courtyard');
 assert.equal(placed.holds,true,'a 16 m plate fits easily on a 60 × 20 arm');
});
test('the drawing is fluid, so it cannot overflow the panel it sits in',()=>{
 /* `.st-fig` was `flex:0 0 auto` with the SVG at a fixed 760px and
    `max-width:100%`. That is circular: an auto flex basis takes its width from
    its content, so the figure was already 760px wide and the percentage
    resolved against that. The drawing overflowed its panel at every desktop
    width — this panel measures 414 to 614px inside the console — and wrap then
    pushed the number rail into a narrow ribbon underneath with two thirds of the
    sheet blank. The reader saw an unbalanced page; the cause was a circle.

    Asserted on the shipped CSS: a figure with no basis, or an SVG with a fixed
    pixel width, is the two ways back into it. */
 const css=read('desks.css');
 // Anchored to the start of a line, not to "after a closing brace": the rule
 // being looked for here can sit directly under a comment, which is exactly
 // where an explanatory one goes.
 const rule=sel=>{
  const m=new RegExp('^\\s*'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','m').exec(css);
  assert.ok(m,`no rule for ${sel} in desks.css`);
  return m[1];
 };
 const fig=rule('.st-figcol'),svg=rule('.st-fig svg'),body=rule('.st-body');
 assert.match(fig,/flex:\s*1 1/,`the figure column has no flex basis (${fig.trim()}) — max-width on its child cannot constrain it`);
 assert.doesNotMatch(svg,/width:\s*\d+px/,
  `the SVG is at a fixed pixel width (${svg.trim()}); it must fill its figure instead`);
 assert.match(svg,/width:\s*100%/,'the SVG does not fill its figure');
 // And the numbers must be held apart from the drawing, not stacked under it
 // by accident: an explicit rail against the far edge with a rule between.
 assert.match(body,/justify-content:\s*space-between/,
  'the body does not push the two instruments to opposite edges');
 const side=rule('.st-side');
 assert.match(side,/border-left:\s*1px solid/,`the number rail has no rule separating it from the drawing (${side.trim()})`);
 // And when it stacks, the rule has to turn, or it hangs off the drawing's edge.
 // The stacking rule is a CONTAINER query, not a media query: inside the console
// this panel is 414..614px on a desktop viewport and 864px on a narrow one,
// because the console's own rail comes and goes. A viewport query keys off the
// wrong number and gets it exactly backwards.
 assert.match(css,/#siteDesk\{[^}]*container-type:\s*inline-size/,
  'the desk panel is not a query container, so the layout cannot react to its own width');
 const narrow=/@container\s*\(max-width:\s*680px\)\{([\s\S]*?)\n\}/.exec(css);
 assert.ok(narrow,'there is no container query for the stand-here desk');
 assert.match(narrow[1],/border-left:\s*0/,'the stacked layout keeps a vertical rule that now dangles');
 assert.match(narrow[1],/border-top:\s*1px solid/,'the stacked layout draws no rule between the two instruments');
 assert.match(narrow[1],/\.st-side\{[^}]*flex:\s*1 1 100%/,
  'the number rail keeps its 250px when it wraps, so it stands in a ribbon beside a full-width picture');
 // The number pairs are boxed, so a grid column cannot split one.
 const ctx=read('context.js');
 assert.match(ctx,/row\.className='st-row'/,`the label and its number are appended unwrapped (${/row\.className/.test(ctx)?'':''})`);
 const desk=read('desks.css');
 assert.match(desk,/\.st-rows\{[^}]*display:grid/,
  'the fact rows are not a grid, so they stack into a ribbon under a wide drawing');
 // And both drawings live in the figure column. Side by side a 2.6:1 landscape
 // is short and a ten-row rail is tall, so the landscape alone left the bottom
 // left of the sheet empty — the same imbalance one level down. Stacked in the
 // column the two are about half the height of the rail beside them.
 const col=rule('.st-figcol');
 assert.match(col,/flex-direction:\s*column/,'the figure column does not stack its two drawings');
 const ctxSite=read('context.js');
 /* THE SKY CHART IS THE LAST THING ON THE SHEET.
    It used to be appended to the figure column, on the reasoning that a
    supporting chart should sit beside the numbers rather than under them. But
    the desk panel in the console is 354..614px wide — measured, not assumed —
    so the sheet always stacks, and "beside" never happens: the chart stood
    between the reader's own drawing and the numbers that answer it. The
    sheet asked "what does this land take?" and made the reader scroll past a
    chart of the sky to find out. */
 assert.match(ctxSite,/if\(skyBlock\)body\.append\(skyBlock\)/,
  'the sky section is not the last thing on the sheet');
 assert.doesNotMatch(ctxSite,/figCol\.append\(sky\)/,
  'the sky section is in the figure column, so it stands between the drawing and the numbers');
 assert.match(ctxSite,/body\.append\(figCol\)/,'the figure column is never appended to the body');
 assert.doesNotMatch(ctxSite,/host\.append\(sky\)/,
  'the sky section is appended to the desk host, which puts it back below the number rail');
 // And the answer comes before the context: the reader drew a plot and asked
 // what it takes. Eleven rows of context first makes the answer a hunt.
 const takesAt=ctxSite.indexOf('side.append(block)');
 // The desk above also appends a dl, so the fact rows are looked for after
 // the answer, not from the top of the file.
 const factsAt=takesAt>0?ctxSite.indexOf('side.append(dl)',takesAt):-1;
 assert.ok(takesAt>0&&factsAt>0,'the sheet appends neither the answer nor the facts');
 assert.ok(takesAt<factsAt,'the fact rows come before the answer they contextualise');
});

test('the site module and its data are inside the release graph',()=>{
 const rel=readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8');
 assert.match(rel,/ground\.data\.js/,'the harvested ground can change without moving a stamp');
 assert.match(rel,/site\.js/,'the site module is not content-pinned');
 // And the context desk has to import it for the pin to mean anything.
 assert.match(read('context.js'),/site\.js\?v=/,'context.js imports site.js without pinning the bytes');
});
test('the stand-here desk renders, and does not render into a caught exception',()=>{
 /* renderContext calls renderSite inside a try/catch so that one broken desk
    cannot take down the other two. That is correct, and it hid this: the desk
    threw `f2 is not defined` on its third statement — f2 lives in site.js and
    was never in context.js's scope — the catch turned it into a console.warn,
    and the panel sat empty on the live site through two deploys and 222 green
    tests. Nothing looked at the PANEL.

    So this calls it and reads the output back. The stub is deliberately small:
    it supports exactly what renderSite touches, and anything new it starts
    touching will throw here rather than on the live page. */
 const stub=tag=>{
  const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_h:'',
  className:'',id:'',type:'',value:'',options:[],parent:null,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelector(){return null},querySelectorAll(){return []},closest(){return null},
  focus(){},click(){},addEventListener(){},removeEventListener(){},
  appendChild(c){c.parent=this;this.childNodes.push(c);if(this.tagName==='SELECT')this.options.push(c);return c},
  get children(){return this.childNodes},
  append(...cs){for(const c of cs){c.parent=this;this.childNodes.push(c);if(this.tagName==='SELECT')this.options.push(c)}},
  replaceChildren(){this.childNodes=[];if(this.tagName==='SELECT')this.options=[]},
  contains(){return false},
  setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},
  get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
  set textContent(v){this._t=String(v);this.childNodes=[]},
  get innerHTML(){return this._h},
  set innerHTML(v){this._h=String(v)}};
  return n};

 const hosts={};
 for(const id of['siteDesk','contextDesk','sitePanel'])hosts[id]=stub('div');
 const warns=[];
 const real=globalThis.document,realWarn=console.warn;
 globalThis.document={
  createElement:t=>stub(t),
  createElementNS:(ns,t)=>stub(t),
  createTextNode:t=>{const n=stub('#text');n.textContent=t;return n},
  createDocumentFragment:()=>stub('#frag'),
  getElementById:k=>hosts[k]||null,
  activeElement:{id:''}};
 console.warn=(...a)=>{warns.push(a.map(String).join(' '));};
 try{
  renderSite({lang:'en',state:{...defaults,city:'tokyo'},changed(){}});
 }finally{globalThis.document=real;console.warn=realWarn}

 assert.deepEqual(warns,[],'the stand-here desk threw and the catch swallowed it: '+warns.join(' | '));
 const walk=(n,out=[])=>{out.push(n);for(const c of n.childNodes)walk(c,out);return out};
 const nodes=walk(hosts.siteDesk);
 assert.ok(nodes.length>8,`the desk produced ${nodes.length} nodes — it rendered nothing`);
 const html=nodes.map(n=>n._h).join('');
 assert.match(html,/^<svg viewBox="0 0 [\d.]+ [\d.]+"/,'no landscape drawing in the desk');
 assert.ok(html.includes('#f59e0b'),'the tower is not amber in the rendered desk');
 // Every plot the picker offers must be reachable and named.
 const select=nodes.find(n=>n.tagName==='SELECT');
 assert.ok(select,`no plot picker: the desk offers ${nodes.map(n=>n.tagName).filter(t=>t==='SELECT').length} selects`);
 assert.ok(select.options.length>=10,`only ${select.options.length} lots offered`);
 for(const o of select.options)assert.ok(o.textContent.trim().length>3,'an unnamed lot in the picker');
 // And the facts are printed, not merely computed.
 const text=hosts.siteDesk.textContent;
 for(const k of['st.area','st.sky','st.frontage']){
  const label=t.en[k];
  assert.ok(text.includes(label),`the desk never printed "${label}"`);
 }
});

test('every desk panel in the markup is registered, or it can never render',()=>{
 /* renderDesks() draws a panel only when the panel is OPEN, and only panels
    named in its DESKS array ever get a `toggle` listener that calls it. The
    stand-here desk shipped with a panel, a renderer, a full set of translations
    and a toolbar button, and was absent from that array — so opening it ran
    nothing and the panel sat empty. Nothing in the suite looked at a panel that
    had no registry entry.

    The rule this encodes: a <details> that holds a desk must be in DESKS. */
 const html=read('index.html'),app=read('app.js');
 const desk=/const DESKS=(\[\[[\s\S]*?\]\])/.exec(app);
 assert.ok(desk,'the DESKS registry is gone from app.js');
 const registered=[...desk[1].matchAll(/\['(\w+)'/g)].map(m=>m[1]);
 const panels=[...html.matchAll(/<details id="(\w+Panel)"/g)].map(m=>m[1]);
 // premiumPanel is an inline panel the studio owns, not a desk.
 const isDesk=p=>new RegExp(`id="${p.replace(/Panel$/,'')}Desk"`).test(html);
 const unregistered=panels.filter(p=>isDesk(p)&&!registered.includes(p.replace(/Panel$/,'')));
 assert.deepEqual(unregistered,[],`these panels hold a desk but are not in DESKS, so nothing ever renders them: ${unregistered.join(', ')}`);
 // And each registered desk must actually have a renderer and a title element.
 for(const key of registered){
  assert.match(html,new RegExp(`id="${key}Title"`),`${key} is registered but has no ${key}Title to write into`);
  assert.match(html,new RegExp(`id="${key}Desk"|id="${key}Figure"`),`${key} is registered but has nothing to draw into`);
 }
});
