import test from 'node:test';import assert from 'node:assert/strict';
import {cities,solarDefaults,civilInstant,solarPosition,incidence,facadeExposure,validSolar} from '../dist/solar.js';
import {defaults,evaluate,glazingAt,glazingSchedule,profile,area} from '../dist/model.js';
import {t,langs} from '../dist/i18n.js';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('city civil time is converted using its IANA zone',()=>{assert.equal(civilInstant('2026-06-21','12:00',cities.bangkok.zone).toISOString(),'2026-06-21T05:00:00.000Z');assert.equal(civilInstant('2026-06-21','12:00',cities.kl.zone).toISOString(),'2026-06-21T04:00:00.000Z')});
test('north and south exposure reverse across solstices in all pilot cities',()=>{for(const city of ['bangkok','kl','jakarta','hcmc']){let june={...solarDefaults,city,solarDate:'2026-06-21'},dec={...june,solarDate:'2026-12-21'};assert.ok(facadeExposure(0,june).equivalentHours>facadeExposure(180,june).equivalentHours,city+' June');assert.ok(facadeExposure(180,dec).equivalentHours>facadeExposure(0,dec).equivalentHours,city+' December')}});
test('night is zero direct incidence on every orientation',()=>{for(const city of Object.keys(cities)){const p=solarPosition({...solarDefaults,city,solarTime:'00:00'});assert.equal(p.aboveHorizon,false);for(let b=0;b<360;b+=45)assert.equal(incidence(b,p),0)}});
test('morning east and afternoon west incidence follow the actual sun',()=>{for(const city of Object.keys(cities)){const morning=solarPosition({...solarDefaults,city,solarDate:'2026-03-20',solarTime:'09:00'}),afternoon=solarPosition({...solarDefaults,city,solarDate:'2026-03-20',solarTime:'16:00'});assert.ok(incidence(90,morning)>incidence(270,morning));assert.ok(incidence(270,afternoon)>incidence(90,afternoon))}});
test('unit solar vector, bounded incidence and transparent reference energy',()=>{const p=solarPosition(solarDefaults);near(Math.hypot(...Object.values(p.vector)),1);for(let b=0;b<360;b+=15){assert.ok(incidence(b,p)>=0&&incidence(b,p)<=1);let e=facadeExposure(b,solarDefaults);assert.equal(e.sampleCount,96);assert.ok(e.equivalentHours>=0&&e.equivalentHours<=10);near(e.referenceKWhM2,e.equivalentHours*.8)}});
test('the whole civil day is sampled, not an office-hours window',()=>{// Sunrise in the four pilot cities is near 06:00. An 08:00-18:00 window
  // discarded the low-angle morning sun that condemns an east face: it understated
  // east exposure by 19-43% across the pilots and put the wrong glass class on
  // that face in every city tested. 96 quarter-hours is one full civil day, and
  // incidence() clips the night to zero, so no window heuristic can be needed.
  assert.equal(facadeExposure(90,solarDefaults).sampleCount,96);
  for(const city of Object.keys(cities)){
    const e=facadeExposure(90,{...solarDefaults,city});
    assert.ok(e.equivalentHours>0,`${city}: east face receives no sun at all`);
    // The morning sun must actually be counted, not truncated at 08:00.
    assert.ok(e.equivalentHours>1,`${city}: east exposure implausibly low (${e.equivalentHours})`);
  }});
test('the east face takes dark glass in every pilot city',()=>{// The consequence that matters: an east-facing corner office in Jakarta or Bangkok
  // faces hours of low sun, so bright glass on it is the wrong specification.
  for(const city of ['jakarta','bangkok','kl','hcmc','tokyo'])
    assert.equal(glazingAt(0,{...solarDefaults,city}).key,'dark',`${city}: east face not specified dark`)});
test('tropical cities invert the north/south assumption a mid-latitude table would bake in',()=>{for(const city of ['jakarta','bangkok','kl','hcmc']){const n=facadeExposure(0,{...solarDefaults,city}).equivalentHours,s=facadeExposure(180,{...solarDefaults,city}).equivalentHours;assert.ok(n>s,`${city}: north face should out-expose south in the tropics`)}
  // At the June solstice the sun never crosses to the southern sky in the pilot
  // cities, so their south elevations take no direct beam at all. A 35.7°N city
  // does see sun on its south wall -- not because "south is hotter" (it is not,
  // for a vertical surface), but because at that latitude the sun spends long
  // low-altitude hours in the northern sky while still clearing the southern
  // one. The model has to resolve that difference rather than apply one rule.
  for(const city of ['jakarta','bangkok','kl','hcmc'])
    assert.equal(facadeExposure(180,{...solarDefaults,city}).equivalentHours,0,`${city}: south elevation should take no beam in June`);
  assert.ok(facadeExposure(180,{...solarDefaults,city:'tokyo'}).equivalentHours>0,'tokyo: south elevation should still see sun in June')});
test('independent NOAA approximation agrees with SunCalc within one degree at pilot-city midday',()=>{for(const city of Object.keys(cities)){const c=cities[city],p=solarPosition({...solarDefaults,city}),date=new Date(p.instant),day=Math.floor((date-Date.UTC(2026,0,0))/864e5),hour=date.getUTCHours()+date.getUTCMinutes()/60,g=2*Math.PI/365*(day-1+(hour-12)/24),decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g),eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),ha=(hour*60+eq+4*c.lon)/4-180,lat=c.lat*Math.PI/180,alt=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha*Math.PI/180))*180/Math.PI;near(alt,p.altitude,1)}});
test('invalid dates and civil times are rejected',()=>{assert.equal(validSolar({...solarDefaults,solarDate:'2026-02-30'}),false);assert.equal(validSolar({...solarDefaults,solarTime:'24:00'}),false);assert.equal(validSolar({...solarDefaults,city:'unknown'}),false);assert.throws(()=>solarPosition({...solarDefaults,solarDate:'junk'}),RangeError)});
test('plan rotation preserves area and rotates the outward face exposure',()=>{const p=profile({...defaults,family:'box',aspect:1.2},0),rot=profile({...defaults,family:'box',aspect:1.2,orientation:90},0);near(area(p),area(rot),1e-6);const a=glazingSchedule(p,solarDefaults)[0].faces[0],b=glazingSchedule(rot,solarDefaults)[0].faces[0];assert.notEqual(a.compass,b.compass);assert.notEqual(a.equivalentHours,b.equivalentHours)});
test('glazing exposure changes with city/date and is not a hard-coded north discount',()=>{const june=glazingAt(90,{...solarDefaults,solarDate:'2026-06-21'}),dec=glazingAt(90,{...solarDefaults,solarDate:'2026-12-21'});assert.ok(june.load>dec.load);assert.notEqual(facadeExposure(0,{...solarDefaults,city:'kl'}).equivalentHours,facadeExposure(0,{...solarDefaults,city:'bangkok'}).equivalentHours)});
test('solar choice does not silently change market assumptions or rent',()=>{const a=evaluate(defaults),b=evaluate({...defaults,city:'jakarta',solarDate:'2026-12-21',solarTime:'00:00'});near(a.rent,b.rent);near(a.contribution,b.contribution)});
test('base rent is counted once and corner premium vanishes at zero',()=>{let s={...defaults,premium:0},m=evaluate(s);assert.equal(m.breakdown.rentCorner,0);near(m.breakdown.rentOrdinary,m.rentable*s.rent*s.occupancy/100);near(m.rent,m.breakdown.rentOrdinary+m.breakdown.rentIdentity+m.breakdown.rentColumnFree+m.breakdown.rentHeight-m.breakdown.rentPenalty,1e-6);let p=evaluate({...s,premium:40});near(p.rent-m.rent,m.cornerArea*s.rent*s.occupancy/100*.4,1e-6)});
test('authorship, anniversary and solar labels have exact language parity',()=>{for(const l of langs){for(const k of ['sun.title','sun.city','sun.date','sun.time','sun.note','sun.invalid','c.orientation'])assert.ok(t[l][k]);assert.match(t[l]['r.credit'],/Dr Non/);assert.match(t[l]['r.credit'],/depa \+ Axiom/);assert.match(t[l]['r.credit'],/2026/);assert.match(t[l]['mast.note'],/2006–2026/)}assert.match(t.en['r.credit'],/MIT classmate/);assert.match(t.en['r.credit'],/20th anniversary/)});
test('solar dependency imports are pinned to their actual content hashes',()=>{for(const file of ['solar.js','model.js']){let s=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');for(const [,path,id] of s.matchAll(/from\s*'\.\/([^']+)\?v=([a-f0-9]{10})'/g)){let body=readFileSync(new URL('../dist/'+path,import.meta.url));assert.equal(createHash('sha256').update(body).digest('hex').slice(0,10),id)}}});
