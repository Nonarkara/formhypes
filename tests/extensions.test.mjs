import {alternativesCsv} from '../dist/display-exports.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaults,profile,area,families,evaluate,searchPlan,grossOf,meshOBJ,capex,facadeFamilies,stack} from '../dist/model.js';
import {planLibrary,polyArea,polyPerimeter} from '../dist/geometry.js';
import {cantileverPeriod,quarterWavePeriod,LC,resetGroundForCity,getLocationStudy} from '../dist/location.js';
import {angularGap,PROMPTS,PLAY} from '../dist/play.js';
import {READER,SOURCES,ARTIFACTS} from '../dist/reader-content.js';
import {renderReader} from '../dist/reader.js';
import {t} from '../dist/i18n.js';
import {solarDefaults,solarPosition,cities,facadeExposure} from '../dist/solar.js';
import {CROWNS,CROWNS_KEYS,GARDENS,GARDENS_KEYS,CROWN_RATES,crownMetrics,gardenIndices} from '../dist/crowns.js';
import {DETAILS,DETAIL_KEYS,DETAIL_DRAWS,DETAIL_RATES,DETAIL_BASIS,detailSVG,detailSpec,deflectionAllowance,airBarrier} from '../dist/details.js';
import {MATERIALS} from '../dist/materials.js';
import {getFengStudy as getFengPlayStudy} from '../dist/play.js';
import {getBriefStudy} from '../dist/brief.js';
import {getWalkStudy} from '../dist/walk.js';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
// The yearly flow, written out in full. Every deduction the model applies has
// to appear here, or a guard written against a shorter version of the equation
// will pass while the published sentence has drifted away from the instrument.
const flowOf=m=>m.rent+m.crownNetRent-m.facadeCost-m.structureCost-m.crownReserve-m.gardenReserve-m.detailReserve;

test('eleven distinct simple CCW plan families survive arbitrary aspect and rotation',()=>{
 assert.equal(Object.keys(families).length,11);assert.deepEqual(Object.keys(families),Object.keys(planLibrary));
 const signatures=new Set();
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const family of Object.keys(families)){
  const raw=planLibrary[family]();signatures.add(raw.map(p=>p.map(n=>n.toFixed(5)).join(',')).join(' '));
  for(const aspect of [.65,1,1.5])for(const orientation of [0,35,180]){
   const s={...defaults,family,aspect,orientation},p=profile(s,.5);
   near(area(p),area(profile({...s,orientation:0},.5)),1e-6);
   let signed=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];signed+=a[0]*b[1]-a[1]*b[0];
    for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;const c=p[j],d=p[(j+1)%p.length];assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8),family+' self intersection')}
   }assert.ok(signed>0,family+' CCW');
  }
  const m=evaluate({...defaults,family});near(m.gross,m.core+m.common+m.rentable,1e-6);assert.ok(Number.isFinite(m.facade));assert.ok(meshOBJ({...defaults,family}).includes('\nf '));
 }
 assert.equal(signatures.size,11);
});
test('new profiles are included in the equal-GFA search and all prompts use real families',()=>{
 const s={...defaults,floors:24},search=searchPlan(s);assert.equal(new Set(search.list.map(s=>s.family)).size,11);
 for(const candidate of search.list)near(grossOf(candidate),search.target,1e-5);
 for(const p of PROMPTS){assert.ok(p.family in families);assert.ok(Number.isFinite(evaluate({...s,...p}).rent))}
});
test('cantilever mechanics obey independently known dimensional scalings, never suitability',()=>{
 const base=cantileverPeriod(100,400000,6e13);near(base,1.7870188*10000*Math.sqrt(400000/6e13),1e-6);
 near(cantileverPeriod(200,400000,6e13),4*base);near(cantileverPeriod(100,400000,24e13),base/2);
 near(cantileverPeriod(100,1600000,6e13),base*2);
 for(const value of [0,-1,NaN,Infinity]){assert.equal(cantileverPeriod(value,400000,6e13),null);assert.equal(quarterWavePeriod(30,value),null)}
 near(quarterWavePeriod(30,150),.8);near(quarterWavePeriod(60,150),1.6);
});
test('Feng Shui geometry is an angular relationship, not a rent multiplier',()=>{
 near(angularGap(0,360),0);near(angularGap(355,5),10);near(angularGap(180,0),180);
 assert.match(dist('play.js'),/No effect on rent/);assert.doesNotMatch(dist('model.js'),/feng|suitability/i);
});
test('guided reader has eight substantial, fully translated pages and every citation resolves',()=>{
 for(const lang of ['en','th','zh']){
  assert.equal(READER[lang].pages.length,8);assert.equal(READER[lang].nav.length,8);
  for(const p of READER[lang].pages){assert.ok(p.paras.length>=3);assert.ok(p.title&&p.caption&&p.labels.length>=3);
   for(const text of p.paras)for(const [,id]of text.matchAll(/\[([a-z]+)\]/g))assert.ok(SOURCES.some(s=>s.id===id),id);
  }
  // Find pages by what they are, not by position -- appending a page must not
  // silently re-point every assertion at the wrong one.
  const tl=READER[lang].pages.find(p=>p.diagram==='timeline');
  assert.ok(tl,lang+' is missing the museum-run page');
  assert.equal(tl.labels.length,7);
  // "these are schematic drawings, not measured elevations" has to be said in
  // each language's own word -- asserting the English one against Thai and
  // Chinese would push the copy back into Latin fallback.
  assert.match(tl.caption,{en:/schematic/,th:/ภาพร่าง/,zh:/示意图/}[lang],lang+' caption must disclaim the scale');
  assert.deepEqual(Object.keys(LC[lang]),Object.keys(LC.en));assert.deepEqual(Object.keys(PLAY[lang]),Object.keys(PLAY.en));
  for(const f of Object.keys(families))assert.ok(t[lang]['f.'+f]);
 }
 assert.match(READER.en.pages[3].paras[0],/repository abstract/);
 // Seven stops, in order, and the two corrections that matter are stated rather
 // than assumed: Home Insurance was not a true skeleton, and Richardson did not
 // invent one either.
 const tlEn=READER.en.pages.find(p=>p.diagram==='timeline');
 assert.deepEqual(tlEn.labels.map(l=>/(1884|1894|1896|1909|1918|1928|1952)/.exec(l)[0]),
  ['1884','1894','1896','1909','1918','1928','1952']);
 assert.match(tlEn.paras[1],/more than a century/);
 assert.match(tlEn.paras[2],/Boston in 1877/);assert.match(tlEn.paras[3],/1928 date conflicts/);
 // Page six is Chapter 6.2: the thesis's own list of what it could not do. All
 // three gaps must be named, the third must NOT be claimed as solved, and the
 // "screening not certification" limit must survive editing.
 const gaps=READER.en.pages.find(p=>p.diagram==='gaps');
 assert.ok(gaps,'the Chapter 6.2 gaps page is missing');
 assert.equal(gaps.labels.length,3);
 assert.match(gaps.paras[0],/connections between the skins and the structure/);
 assert.match(gaps.paras[0],/structural and ecological performance/);
 assert.match(gaps.paras[0],/\[chen\]/);
 assert.match(gaps.paras[3],/instrumented without being solved/);
 assert.match(gaps.labels[2],/INSTRUMENTED, NOT SOLVED/);
 // The diagram must draw the third gap as open, not closed: an amber filled bar
 // on all three would claim a certification this project never makes.
 const rjs=dist('reader.js');
 assert.match(rjs,/if\(kind==='gaps'\)/);
 assert.doesNotMatch(gaps.paras.join(' ')+gaps.labels.join(' '), /closed by drawing|closed by computation/i);
 assert.match(rjs,/const S=\[\{m:false\},\{m:false\},\{m:false\}\]/);
 assert.ok(SOURCES.some(s=>s.author==='Non Arkaraprasertkul'&&s.year==='2007'));
});
test('all thesis excerpts exist with exact figure and page locators',()=>{
 assert.deepEqual(ARTIFACTS.map(a=>[a.figure,a.page]),[[34,41],[36,43],[76,94]]);
 for(const a of ARTIFACTS){const bytes=readFileSync(new URL('../dist/'+a.src,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length>4000)}
 const html=dist('index.html');for(const id of ['reader','researchAppendix','rBody','locationDesk','feng','atlas','tower','plan','human'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/>inspired by <i>SHDT/);assert.match(t.en['mast.note'],/By Dr Non/);
});
test('new modules and artifact URLs are content pinned',()=>{
 for(const file of ['app.js','reader.js','reader-content.js']){
  const text=dist(file);
  for(const [,ref,id]of text.matchAll(/["']((?:\.\/)?(?:research\/artifacts\/)?[\w.-]+\.(?:js|png))\?v=([a-f0-9]{10})["']/g)){
   const bytes=readFileSync(new URL('../dist/'+ref.replace(/^\.\//,''),import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,10),id,ref);
  }
 }
});
test('Tokyo uses its real civil zone and midlatitude solar exposure',()=>{
 assert.equal(cities.tokyo.zone,'Asia/Tokyo');const s={...solarDefaults,city:'tokyo'};
 assert.equal(solarPosition(s).instant,'2026-06-21T03:00:00.000Z');assert.ok(solarPosition(s).altitude>70);
 assert.ok(facadeExposure(180,{...s,solarDate:'2026-12-21'}).equivalentHours>facadeExposure(0,{...s,solarDate:'2026-12-21'}).equivalentHours);
});

test('changing cities discards soil assumptions rather than treating them as regional observations',()=>{
 // The behaviour, not the source text. The study says which city it is about
 // and carries no soil depth it was not given, and the teaching values are
 // DECLARED to be invented — in the sentence the reader sees.
 resetGroundForCity('bangkok');
 const bangkok=getLocationStudy();
 assert.equal(bangkok.city,'bangkok');
 assert.equal(bangkok.assumptions.depth,'');
 assert.equal(bangkok.assumptions.velocity,'');
 resetGroundForCity('tokyo');
 assert.equal(getLocationStudy().city,'tokyo');
 assert.match(LC.en.example,/values are invented/);
 assert.match(LC.en.intro,/percentages below are changes in period only/);
});
test('every new shape has unit-scale area and perimeter, with valid export topology',()=>{
 for(const f of ['triangle','hexagon','oval','petal','pinwheel']){const p=planLibrary[f]();assert.ok(polyArea(p)>.2);assert.ok(polyPerimeter(p)>2);assert.ok(p.every(q=>q.every(Number.isFinite)))}
});

test('JSON study exports retain contextual assumptions and their stated limits',()=>{
 // The export carries the context studies, and each one states its own limit
 // in the tier it publishes. The VALUES are checked; the code that writes
 // them into the JSON is not, because the export handler lives in the
 // controller and is not importable.
 const loc=getLocationStudy();
 assert.ok(loc.assumptions&&loc.units&&loc.method,'the location study carries no assumptions');
 assert.match(loc.tier,/not safety assessment/);
 const feng=getFengPlayStudy();
 assert.match(feng.tier,/invented-site design prompt/);
 const brief=getBriefStudy(defaults);
 assert.ok(brief.inputs&&brief.tier,'the brief study carries no inputs or no tier');
 const walk=getWalkStudy();
 assert.match(walk.tier,/not coordinated interior/);
});

test('2026-10-15 audit: inherited names, stale search, unknown hashes and failed saves are guarded',()=>{
 const app=dist('app.js');
 assert.ok('constructor' in families&&!Object.hasOwn(families,'constructor'),'plain lookup would accept inherited keys');
 assert.match(dist('research-reader.js'),/Object\.hasOwn\(regimes,/);assert.match(app,/Object\.hasOwn\(objectives,/);
 assert.match(app,/own\(regimes,x\.regime\)/);
 assert.match(app,/function changed\(\)\{\n searchToken\+\+/);
 assert.match(app,/showTab\(h==='research'\|\|h==='manual'\?h:\(h\?'studio':'manual'\),false\)/); // unknown hash -> studio, empty -> manualassert.match(app,/entryTab\(location\.search,location\.hash\)/);
 assert.match(app,/if\(!persist\(\)\)\{studies\.pop\(\);toast\(tt\('s\.saveFail'\)\)/);
 assert.match(app,/filter\(x=>x&&validState\(x\.state\)\)/);
});

test('shared links carry a preview card and the sheet obeys the no-gradient rule on phones',()=>{
 const html=dist('index.html'),css=dist('style.css');
 for(const tag of ['og:title','og:description','og:image','twitter:card'])assert.ok(html.includes(`"${tag}"`),tag);
 assert.match(html,/<link rel="icon"/);
 assert.ok(readFileSync(new URL('../dist/og.jpg',import.meta.url)).length>10000);
 assert.ok(!/gradient\(/.test(css),'house style bans gradients');
 assert.match(css,/@media\(max-width:560px\)\{\.titleblock \.b-cred,\.titleblock \.tb-sheet,\.titleblock \.tb-by\{display:none\}/);
 assert.match(html,/class="tb-by" data-i18n="tb.by"/,'the studio sheet names its author');
});

test('the Method dialog publishes the rent equation the model actually computes, in every language',()=>{
 for(const s of [defaults,{...defaults,family:Object.keys(families)[3],floors:30,twist:40}]){
  const m=evaluate(s),p=m.premiums,base=s.rent*s.occupancy/100;
  near(m.rent,m.rentable*base*(1+p.identity+p.columnFree+p.height-p.lowCeiling-p.depth)+m.cornerArea*base*p.corner,1e-6);
  near(m.contribution,flowOf(m),1e-6);
 }
 for(const l of ['en','th','zh'])for(const k of ['meth.title1','meth.title2','meth.rent','meth.contrib','meth.limits'])assert.ok(typeof t[l][k]==='string'&&t[l][k].length>3,`${l} ${k}`);
 // The dialog publishes the equation in prose. Every term the model subtracts
 // must be named there, or the published sentence quietly stops matching the
 // instrument that produced the number underneath it.
 for(const l of ['en','th','zh'])for(const w of {en:['crown upkeep','garden upkeep','maintenance access'],th:['เชิงญาย','สวนลอยฟ้า','บำรุง'],zh:['塔冠维护','花园维护','维护通道']}[l])assert.ok(t[l]['meth.contrib'].includes(w),`${l} meth.contrib omits ${w}`);
 assert.match(dist('index.html'),/id="methodBtn"/);
 assert.match(dist('app.js'),/\$\('methodBtn'\)\.onclick=\(\)=>\{renderMethod\(\);\$\('method'\)\.showModal\(\)\}/);
 assert.ok(!dist('app.js').includes('obsolescence'),'stale formula text removed');
});

test('hygiene: vendored SunCalc is byte-pinned and the site ships its security headers',()=>{
 const sha=createHash('sha256').update(readFileSync(new URL('../dist/vendor/suncalc.js',import.meta.url))).digest('hex');
 assert.equal(sha,'65169cd1f50e6d1020d0672778fb544ebd2b799d5dc1d5fe90054e7392a27eda','vendored SunCalc changed: review the diff, then update this pin');
 const h=dist('_headers');
 for(const d of ["script-src 'self'","frame-ancestors 'none'","object-src 'none'"])assert.ok(h.includes(d),d);
 assert.ok(!/unsafe-(inline|eval)/.test(h),'no unsafe CSP sources');
 const tracked=['docs/DESIGNON-KNOWLEDGE.md','scripts/extract-designon.py'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 for(const s of tracked)assert.ok(!s.includes('/Users/'),'no local home paths in public files');
});

test('no module injects inline styles, which the strict CSP would block',()=>{
 for(const f of ['app.js','brief.js','walk.js','console.js','context.js','facade.js','research-reader.js','reader.js','location.js','play.js'])
  assert.ok(!/(?:createElement|\bel)\(['"]style['"]\)|setAttribute\(['"]style['"]|style="/.test(dist(f)),f);
 assert.match(dist('index.html'),/href="desks\.css\?v=[a-f0-9]{10}"/);
});

/* The capital stock is a different quantity from the annual flow. These tests
   hold the separation: the arithmetic must close, the rate must apply to the
   area it names, and nothing may quietly turn one into the other. */

test('capital cost closes from its four named areas and one contingency',()=>{
 for(const s of [defaults,{...defaults,family:'star',floors:30,twist:45,system:'diagrid',skin:'diagrid'},
                 {...defaults,family:'oval',core:9,common:6,regime:'civic'},
                 {...defaults,crown:'post'},{...defaults,crown:'mast'}]){
  const m=evaluate(s);
  near(m.capex,(m.capexStructure+m.capexEnvelope+m.capexFitout+m.crownCapital+m.detailCapital)*(1+capex.contingency),1e-6);
  // Each rate applies to the area it is named after, and to nothing else.
  near(m.capexStructure,m.gross*capex.structure*m.structureMultiplier,1e-6);
  near(m.capexEnvelope,m.facade*capex.envelope*facadeFamilies[s.skin].envelope*MATERIALS[s.material].envelope,1e-6);
  near(m.capexFitout,m.rentable*capex.fitout,1e-6);
  near(m.crownCapital,m.crownPlan*CROWN_RATES.steel,1e-6);
  near(m.capexPerM2,m.capex/m.gross,1e-9);
 }
});

test('the capital stock and the annual flow are never summed, and the ratio carries its year',()=>{
 const m=evaluate(defaults);
 // The ratio is capital divided by a yearly figure, so it is a count of years.
 near(m.payback,m.capex/m.contribution,1e-9);
 assert.ok(m.capex>0&&m.contribution>0);
 // Nothing in the flow side may have absorbed a capital-sized number.
 near(m.contribution,flowOf(m),1e-6);
 // A building that earns nothing has no payback period. Infinity states that;
 // NaN would render as an empty cell and read as a missing figure.
 const dead=evaluate({...defaults,rent:20});
 assert.ok(dead.contribution<0,'this rent must actually lose money');
 assert.equal(dead.payback,Infinity);
 assert.ok(Number.isFinite(dead.capex)&&dead.capex>0,'the capital cost is still owed when the rent is not');
});

test('design decisions move the capital cost the way they move the reserve',()=>{
 const s=defaults;
 const frame=Object.fromEntries(['column-grid','outrigger','diagrid'].map(k=>[k,evaluate({...s,system:k})]));
 assert.ok(frame.diagrid.capexStructure>frame['column-grid'].capexStructure,'the column-free frame costs more to build');
 assert.ok(frame.diagrid.capexStructure>frame.outrigger.capexStructure);
 // The outrigger is NOT guaranteed to cost more than the interior grid. Its 12 m
 // bay is wider than the grid's 8.5 m, and on a plate this size the perimeter term
 // it removes costs more than the extra slab it spans, so it comes out cheaper.
 // Hold that open rather than asserting an ordering the model does not have.
 assert.ok(frame.outrigger.structureMultiplier!==frame['column-grid'].structureMultiplier);
 // The plate's own perimeter is paid for once as well as yearly: a spiky plan of
 // the same gross area must cost more to build than a compact one.
 const spiky=evaluate({...s,family:'star'}),compact=evaluate({...s,family:'oval'});
 assert.ok(spiky.capexStructure>compact.capexStructure);
 assert.ok(spiky.capexPerM2>compact.capexPerM2);
 // A heavier skin is priced once, on the same integrated surface the reserve uses.
 const glassy=evaluate({...s,skin:'diagrid'}),plain=evaluate({...s,skin:'vertical-mech'});
 assert.ok(glassy.capexEnvelope>plain.capexEnvelope);
 near(glassy.capexEnvelope/plain.capexEnvelope,facadeFamilies.diagrid.envelope/facadeFamilies['vertical-mech'].envelope,1e-9);
 // The regime's envelopeDiscipline is about how much attention a market pays to
 // the skin, not what the skin costs to hang. Speculation must not make glass cheap.
 const speculative=evaluate({...s,regime:'speculative'}),yielding=evaluate({...s,regime:'yield'});
 near(speculative.capexEnvelope,yielding.capexEnvelope);
 assert.notEqual(speculative.facadeCost,yielding.facadeCost,'the reserve still follows the regime');
});

/* ── the detail library ─────────────────────────────────────────────────────
   A detail answers "how is this face held on?", which is a different question
   from "what is it made of". The two are charged on the same square metre, so
   the failure mode is not a missing number — it is the same metre charged
   twice. These guards hold the separation. */

test('each detail is charged on exactly the area it is named after, and no other',()=>{
 for(const k of DETAIL_KEYS){
  const d=DETAILS[k],basis=DETAIL_BASIS[d.system];
  assert.ok(basis,d.system+' names no area');
  const m=evaluate({...defaults,detail:k});
  near(m.detailArea,basis==='facade'?m.facade:basis==='crownPlan'?m.crownPlan:m.gardenArea,1e-6);
  assert.equal(m.detailBasis,basis);
 }
 // The three bases really are three different areas on a tower that has all three.
 const m=evaluate({...defaults,crown:'post',garden:'half'});
 assert.equal(new Set([m.facade,m.crownPlan,m.gardenArea]).size,3,'facade, crown plan and terrace must not coincide');
});

test('the material and the detail never both multiply the same square metre',()=>{
 const s=defaults;
 const glass=evaluate({...s,material:'float'}),granite=evaluate({...s,material:'granite'});
 // The envelope reserve follows the material — that is the one figure it owns.
 assert.ok(granite.facadeCost!==glass.facadeCost,'the envelope reserve must follow the material');
 // The detail line must not. If it moved, the same integrated skin area would
 // be charged at the product of two coefficients the reader already has on screen.
 near(granite.detailReserve,glass.detailReserve,1e-9);
 near(granite.detailCapital,glass.detailCapital,1e-9);
 // And a detail is not free: it has to be able to move its own line.
 const cheap=evaluate({...s,detail:'firestop'}),dear=evaluate({...s,detail:'outrigger-joint'});
 assert.ok(dear.detailReserve>cheap.detailReserve);
 near(cheap.detailReserve/dear.detailReserve,
  (DETAIL_RATES.assembly*DETAILS.firestop.cost*DETAIL_RATES.retest/DETAILS.firestop.cycle+DETAIL_RATES.access*DETAILS.firestop.access)
  /(DETAIL_RATES.assembly*DETAILS['outrigger-joint'].cost*DETAIL_RATES.retest/DETAILS['outrigger-joint'].cycle+DETAIL_RATES.access*DETAILS['outrigger-joint'].access),1e-9);
});

test('assembly is a stock and requalification is a flow, never added together',()=>{
 const m=evaluate(defaults);
 const d=DETAILS[m.detailKey];
 // The two figures exist separately on the model, and the flow is the smaller
 // one. Adding a paid-once assembly cost to a yearly reserve is the mistake this
 // split exists to prevent: it inflates the wall by a number that means nothing.
 assert.ok(m.detailCapital>m.detailReserve,'assembly labour is paid once and must exceed the annual figure');
 assert.ok(m.detailReserve>0&&m.detailCapital>0);
 // Each closes on its own arithmetic.
 near(m.detailCapital,m.detailArea*DETAIL_RATES.assembly*d.cost,1e-6);
 near(m.detailReserve,m.detailArea*(DETAIL_RATES.assembly*d.cost*DETAIL_RATES.retest/Math.max(1,d.cycle)
  +DETAIL_RATES.access*d.access),1e-6);
 // The capital figure reaches the capex total and the reserve reaches the flow —
 // each through exactly one door, so neither is silently routed into the other.
 near(m.capex,(m.capexStructure+m.capexEnvelope+m.capexFitout+m.crownCapital+m.detailCapital)*(1+capex.contingency),1e-6);
 near(m.contribution,flowOf(m),1e-6);
});

test('a detail whose area is zero costs nothing, and the list says why',()=>{
 /* The honest zero is a terrace detail on a tower with no terrace. The first
    draft of this test looked for a flat crown instead and assumed its plan area
    was zero — it is not: the roof plate is a real few hundred square metres.
    A second draft used the key 'whole', which does not exist, so gardenOf()
    silently read it as 'none' and the assertion passed while testing nothing. */
 const bare=evaluate({...defaults,garden:'none',detail:'balustrade'});
 near(bare.gardenArea,0,1e-9);near(bare.detailArea,0,1e-9);
 near(bare.detailReserve,0,1e-9);near(bare.detailCapital,0,1e-9);
 // Give it a terrace and the same detail suddenly costs real money: same detail,
 // different area, which is the whole basis discipline in one comparison.
 assert.ok(GARDENS_KEYS.includes('half')&&GARDENS_KEYS.includes('full'));
 const planted=evaluate({...defaults,garden:'half',detail:'balustrade'});
 assert.ok(planted.gardenArea>0&&planted.detailReserve>0);
 // A whole-floor setback is not the absence of a terrace — it is the largest
 // terrace there is. Every 13th floor fully open: the most area given away, the
 // most sky gained, and the most upkeep. The sequence has to be monotone, and the
 // balustrade has to follow the same area it is charged on.
 const levels=['quarter','half','full'].map(g=>evaluate({...defaults,garden:g,detail:'balustrade'}));
 assert.ok(levels[0].gardenArea<levels[1].gardenArea&&levels[1].gardenArea<levels[2].gardenArea);
 assert.ok(levels[0].gardenReserve<levels[1].gardenReserve&&levels[1].gardenReserve<levels[2].gardenReserve);
 for(const m of levels)near(m.detailArea,m.gardenArea,1e-6);
 // And a crown detail is charged against the roof plate, not the skin.
 const crown=evaluate({...defaults,detail:'parapet-coping'}),env=evaluate({...defaults,detail:'drained-cavity'});
 assert.ok(crown.detailArea<env.detailArea,'the roof plate is smaller than the skin');
});

test('the deflection convention matches the hand calculation on both sides of the threshold',()=>{
 // L/175 up to 4.1 m, L/240 plus 6.4 mm beyond, twice that for a cantilever.
 // The first version of this returned L/175 plus 6.4 mm past the threshold: both
 // halves were quoted correctly in the same file and still disagreed.
 near(deflectionAllowance(1),1000/175,1e-9);
 near(deflectionAllowance(4.1),4100/175,1e-9);
 near(deflectionAllowance(6),6000/240+6.4,1e-9);
 near(deflectionAllowance(3,true),2*3000/175,1e-9);
 near(deflectionAllowance(6,true),2*(6000/240+6.4),1e-9);
 // The spec figure is computed for this building's floor-to-floor height, which
 // is a real span of the wall. It is NOT the plate's plan dimension: a 48 m
 // plate is not a 48 m curtain wall, and L/240 of that is 206 mm of nonsense.
 const wide=detailSpec({detail:'slab-edge',height:6}),narrow=detailSpec({detail:'slab-edge',height:3});
 assert.ok(wide.deflection>narrow.deflection);
 near(wide.deflection,deflectionAllowance(6),1e-9);
 near(wide.span,6,1e-9);
 const plate=detailSpec({detail:'slab-edge',height:4.1,span:48});
 near(plate.deflection,deflectionAllowance(4.1),1e-9,'the plate span must not reach the deflection figure');
 // Every displayed number carries the standard it is measured against.
 for(const d of [wide,narrow]){
  assert.match(d.airStandard,/ASTM E2357/);assert.match(d.uStandard,/EN 673/);assert.match(d.deflectStandard,/ASTM E330/);
 }
});

test('the air figure is reported against the cited limit, and meets says what it means',()=>{
 for(const k of DETAIL_KEYS){
  const a=airBarrier({detail:k}),m=evaluate({...defaults,detail:k});
  near(m.airRate,a.rate,1e-9);
  assert.equal(a.limit,0.20,'the code limit being tested against is part of the claim');
  assert.equal(a.meets,a.rate<=0.20,'meets must be the comparison it claims to be');
  assert.equal(a.permeance,a.rate<0.02,'the E2178 material threshold is a different test from the E2357 assembly limit');
 }
 // No detail in the library is an air-permeable material; the distinction is
 // kept because it is the distinction the two standards actually draw.
 assert.ok(DETAIL_KEYS.every(k=>!airBarrier({detail:k}).permeance));
});

test('every detail is drawn, every drawing belongs to a detail, and the section is house style',()=>{
 for(const k of DETAIL_KEYS)assert.ok(DETAIL_DRAWS.includes(DETAILS[k].draw),k+' has no section');
 assert.equal(new Set(DETAIL_DRAWS).size,DETAIL_KEYS.length,'no drawing without a detail behind it');
 for(const k of DETAIL_DRAWS){
  const svg=detailSVG(k);
  assert.match(svg,/^<svg /,k);
  assert.ok(!/NaN|undefined|null/.test(svg),k+' emitted a broken path');
  assert.ok(!/gradient|rx=|ry=|filter=/.test(svg),k+' broke the no-gradient sharp-corner rule');
 }
 // An unknown key must still return a drawing rather than an empty box.
 assert.match(detailSVG('not-a-detail'),/^<svg /);
});

test('every detail is named and explained in all three languages',()=>{
 for(const k of DETAIL_KEYS){
  for(const l of ['en','th','zh']){
   assert.ok(t[l]['dt.'+k],`${l} omits the label for ${k}`);
   assert.ok(t[l]['dt.note.'+k],`${l} omits the reading for ${k}`);
   // No Latin fallback in Chinese. Units and proper nouns are exempt; a whole
   // English sentence is not.
   if(l==='zh')assert.ok(!/[A-Za-z]{4,}\s+[A-Za-z]{4,}/.test(t[l]['dt.note.'+k]),k+' left an English sentence in the ZH note');
  }
 }
 for(const l of ['en','th','zh'])for(const g of ['envelope','crown','terrace'])assert.ok(t[l]['dt.grp.'+g],`${l} omits the ${g} group heading`);
 // The group heading is what tells the reader why picking a crown detail on a
 // flat roof costs nothing, so it has to exist in all three.
 assert.equal(['envelope','crown','terrace'].filter(g=>DETAIL_KEYS.some(k=>DETAILS[k].system===g)).length,3);
});

test('the capital figure is published with its exclusions, in every language',()=>{
 for(const l of ['en','th','zh'])for(const k of ['m.capex','m.capexPerM2','m.capexRatio','m.capexRatioNone','m.capexNote','m.yr'])
  assert.ok(typeof t[l][k]==='string'&&t[l][k].length>0,`${l} ${k}`);
 // The year unit on the ratio must translate; a literal 'yr' in Thai is an
 // English word wearing a Thai sentence.
 assert.match(dist('app.js'),/tt\('m\.yr'\)/,'the year unit is hardcoded, not translated');
 assert.notEqual(t.th['m.yr'],t.en['m.yr']);
 // The ratio must not be sold as a payback period. It is a capital stock divided
 // by a flow that omits operating cost, financing and tax.
 assert.doesNotMatch(t.en['m.capexRatio'],/payback|years|yr/i,'the ratio label must carry no time claim');
 assert.match(t.en['m.capexNote'],/not a payback period/,'the note must disclaim the payback reading');
 assert.match(t.th['m.capexNote'],/ไม่ใช่ระยะคืนทุน/);
 assert.match(t.zh['m.capexNote'],/不是回收年限/);
 // The note has to name what is left out, or the number reads as a budget.
 for(const w of ['land','financing','tax','fit-out'])assert.ok(t.en['m.capexNote'].toLowerCase().includes(w),`the capital note omits ${w}`);
 const html=dist('index.html');
 for(const id of ['capex','capexPerM2','capexRatio'])
  assert.match(html,new RegExp(`id="${id}"`),`${id} is not in the metrics rail`);
 assert.match(html,/data-i18n="m\.capexNote"/);
 const app=dist('app.js');
 assert.match(app,/Number\.isFinite\(metrics\.payback\)\?metrics\.payback\.toFixed\(1\)/,'an unrepayable tower must not print Infinity');
 assert.match(app,/capex:'USD paid once'/,'the study export must declare the capital unit');
 const metrics=evaluate(defaults),csv=alternativesCsv([{state:defaults,metrics,score:0}], 'contribution').split('\n'),headers=csv[0].split(','),values=csv[1].split(',');
 assert.equal(Number(values[headers.indexOf('capex_usd')]),Number(metrics.capex.toFixed(2)),'the comparison CSV omits or corrupts capital');
 assert.equal(Number(values[headers.indexOf('capex_usd_per_gross_m2')]),Number(metrics.capexPerM2.toFixed(2)),'capital intensity must be declared per gross area');
});

/* ── the crown and the terraces ────────────────────────────────────────────
   Both features exist to be caught out. A crown that draws for free and a
   garden that costs nothing are the two ways this module could lie, so the
   guards below are written to fail on exactly those.                        */

test('a crown spends real height and can make the tower illegal',()=>{
 const s={...defaults,led:false};
 const flat=evaluate({...s,crown:'flat'});
 near(flat.crownHeight,0,1e-9);
 // Height is not a property of the floors alone. A crown is added to it and the
 // allowance is tested against the sum, so drawing a crown cannot quietly make
 // an over-height tower look legal.
 for(const k of CROWNS_KEYS){
  const m=evaluate({...s,crown:k});
  near(m.heightTotal,m.height+CROWNS[k].h,1e-9);
  near(m.heightHeadroom,s.maxHeight-m.heightTotal,1e-9);
  assert.equal(m.valid,!(m.heightTotal>s.maxHeight),`${k} validity must follow height+crown`);
 }
 // The Petronas-scale post is taller than this tower's allowance on its own.
 // The model must say so rather than clamp the crown to fit.
 const post=evaluate({...s,crown:'post'});
 assert.ok(post.heightTotal>s.maxHeight&&!post.valid);
 assert.ok(post.heightHeadroom<0);
 assert.ok(post.reasons.includes('height'));
});

test('the taller the crown, the more of the allowance it eats',()=>{
 const s={...defaults,led:false};
 // Sorted by height, not by key order: the selector is grouped by idea, not by
 // size, and asserting against an arbitrary order would test the table's
 // layout rather than the model's arithmetic.
 const byHeight=[...CROWNS_KEYS].sort((a,b)=>CROWNS[a].h-CROWNS[b].h);
 const heads=byHeight.map(k=>evaluate({...s,crown:k}).heightHeadroom);
 for(let i=1;i<heads.length;i++)
  assert.ok(heads[i]<=heads[i-1]+1e-9,`${byHeight[i]} is taller than ${byHeight[i-1]} but has more headroom`);
 assert.ok(heads[0]>heads[heads.length-1],'the set must not be flat');
 assert.ok(heads[heads.length-1]<heads[0]);
});

test('a crown earns nothing it cannot pay for, and a mast earns nothing at all',()=>{
 const s={...defaults,led:false};
 // Plant and aviation crowns are pure cost. Only the observation deck carries
 // its own rate, and it is a rate an order of magnitude below office rent.
 for(const k of CROWNS_KEYS){
  const m=evaluate({...s,crown:k});
  if(CROWNS[k].use==='observation'){assert.ok(m.observationRent>0);near(m.observationRent,m.observationArea*CROWN_RATES.observation,1e-6)}
  else near(m.observationRent,0,1e-9);
  near(m.ledRent,0,1e-9);
 }
 // A crown is real steel and it is really maintained.
 for(const k of CROWNS_KEYS){
  const m=evaluate({...s,crown:k});
  near(m.crownReserve,m.crownPlan*CROWNS[k].h*CROWN_RATES.linear,1e-6);
  assert.ok(m.crownCapital>=0);
 }
});

test('the LED surface is a marketing surface: income and running cost, no performance claim',()=>{
 const s={...defaults,crown:'mast'};
 const off=evaluate({...s,led:false});
 const on=evaluate({...s,led:true});
 near(on.ledRent,on.ledArea*CROWN_RATES.advert,1e-6);
 near(on.ledCost,on.ledArea*CROWN_RATES.advertRun,1e-6);
 assert.ok(on.ledArea>0&&off.ledArea===0);
 // It must not touch height, plate, rent or daylight. A media facade is hung on
 // a building that already exists; it is not an architectural move.
 near(on.heightTotal,off.heightTotal,1e-9);
 near(on.gross,off.gross,1e-9);
 near(on.rent,off.rent,1e-9);
 near(on.daylitFraction,off.daylitFraction,1e-12);
 near(on.rentable,off.rentable,1e-9);
 // And it is not free money either: the power bill is charged against the income.
 near(on.contribution,off.contribution+on.ledRent-on.ledCost,1e-6);
});

test('a sky garden gives away area and is charged for the area it gives away',()=>{
 const s={...defaults,crown:'flat',led:false};
 const none=evaluate({...s,garden:'none'});
 near(none.gardenArea,0,1e-9);
 near(none.gardenReserve,0,1e-9);
 let prevArea=-1,prevGross=Infinity,prevContrib=Infinity;
 for(const g of GARDENS_KEYS){
  const m=evaluate({...s,garden:g});
  const frac=GARDENS[g].frac;
  // Monotone: more terrace, less of everything.
  assert.ok(m.gardenArea>=prevArea-1e-9,`${g}: garden area fell`);
  assert.ok(m.gross<=prevGross+1e-9,`${g}: gross rose`);
  assert.ok(m.contribution<=prevContrib+1e-9,`${g}: contribution rose`);
  prevArea=m.gardenArea;prevGross=m.gross;prevContrib=m.contribution;
  // Charged on a measured area, at the stated rate.
  near(m.gardenReserve,m.gardenArea*CROWN_RATES.garden,1e-6);
  if(g!=='none')assert.ok(m.gardenArea>0,`${g} must actually open a floor`);
 }
 // The ratio test, measured against the real plates rather than an average
 // one: the tower tapers, so a terrace high up sits on a smaller plate than a
 // terrace low down. Getting the fraction backwards would triple the loss and
 // still look plausible, so this is where that inversion would be caught.
 const q=evaluate({...s,garden:'quarter'});
 const st=stack({...s,garden:'quarter'});
 const total=st.reduce((a,l)=>a+l.h,0);
 let expect=0;
 for(const l of st)if(l.garden!=null&&l.garden>0)expect+=area(profile({...s,garden:'quarter'},l.z/total))*l.garden;
 near(q.gardenArea,expect,1e-6);
 assert.ok(expect>0,'the guard must be measuring something');
});

test('a whole-floor setback stops the plate and still has to be kept alive',()=>{
 const s={...defaults,crown:'flat',led:false};
 const m=evaluate({...s,garden:'full'});
 assert.ok(m.gardenLevels>0,'there must be at least one level that earns nothing');
 assert.equal(m.gardenLevels,gardenIndices({...s,garden:'full'}).length);
 // This is the line the whole feature exists to make: the level that earns
 // nothing is the level that still costs money every year.
 assert.ok(m.gardenReserve>0,'a garden that earns nothing must still be paid for');
 assert.ok(m.contribution<evaluate({...s,garden:'none'}).contribution);
 // Garden levels must not be counted as services voids — that would relabel a
 // terrace as a machine room.
 const plain=evaluate({...s,garden:'none'});
 assert.equal(m.voidLevels,plain.voidLevels);
});

test('the level schedule keeps every storey, garden or not',()=>{
 const s={...defaults,crown:'flat'};
 const plain=stack({...s,garden:'none'});
 for(const g of GARDENS_KEYS){
  const withG=stack({...s,garden:g});
  // A terrace takes area out of a floor, never a floor out of the building.
  // Losing storeys here would quietly change the height of every tower with a
  // garden, which is not what a terrace does.
  assert.equal(withG.length,plain.length,`${g} changed the number of levels`);
  assert.ok(Math.abs(withG.reduce((a,l)=>a+l.h,0)-plain.reduce((a,l)=>a+l.h,0))<1e-9,
   `${g} changed the building height`);
 }
});

test('the reader says what the desks are for, and puts each boundary on the same line as its answer',()=>{
 // The bar has sixteen labels and not one of them is a verb, so the reader has
 // to answer "what is this for" in words — and every answer has to carry the
 // line it does not cross, in the same breath, or the page reads as marketing.
 for(const lang of ['en','th','zh']){
  const w=READER[lang].pages.find(p=>p.diagram==='work');
  assert.ok(w,lang+' is missing the what-this-is-for page');
  assert.equal(w.labels.length,6,lang+': six questions, one per drawn glyph');
  assert.equal(w.paras.length,3);
  // Every question names the desk that answers it and the limit it stops at.
  // Threshold scales with script density: Chinese carries the same answer and the
  // same boundary in about half the characters English needs. A flat 60 could
  // only be satisfied by padding one script, which is the same mis-calibration
  // the desk render floor had.
  const MIN={en:60,th:50,zh:26}[lang];
  for(let i=0;i<w.labels.length;i++){
   const l=w.labels[i];
   assert.ok(l.length>MIN,`${lang} label ${i} is too thin to carry an answer and a boundary (${l.length})`);
   assert.match(l,/—|,|·|：|:|:/,`${lang} label ${i} does not separate the desk from the limit`);
  }
  // The boundary vocabulary must be present in every language, in its own script.
  const LIMIT={en:/screening|not a |never /i,th:/ไม่ใช่|เป็นการคัดกรอง/,zh:/不是|是筛查/};
  assert.match(w.labels.join(' '),LIMIT[lang],lang+': no label states a limit');
 }
 // English specifically: the six questions, and the two/四 split the drawing shows.
 const we=READER.en.pages.find(p=>p.diagram==='work');
 for(const q of ['Lifts','Fire','Wind','Water','Glare','Carbon'])
  assert.ok(we.labels.some(l=>l.includes(q)),`the ${q} desk is not named on the purpose page`);
 assert.match(we.paras[2],/screening|not a |never /i,'page 7 does not say what the group does not do');
 assert.match(we.paras[1],/one model|sixteen readings/,'page 7 does not say the desks share one model');
 // The drawing must mark exactly two as answered and four as bounded: a tool
 // that closed all six would be claiming six certifications.
 const rjs=dist('reader.js');
 const block=rjs.slice(rjs.indexOf("kind==='work'"),rjs.indexOf("kind==='timeline'"));
 assert.equal((block.match(/fill="#f59e0b"\/>`/g)||[]).length,1,'the work diagram must fill exactly one status bar per glyph');
 assert.equal((block.match(/i<2/g)||[]).length,1,'the answered/bounded split must be a single rule');
 assert.ok(block.includes('v-6h32v6'),'the bounded glyph must draw an open bracket, not a bar');
});

/* ── the reader, rendered ───────────────────────────────────────────────────
   A DOM stub just big enough for the reader, and a helper that renders a page
   and hands back the SVG it actually emitted.

   The point is that the page-eight guard measures the DRAWING rather than
   matching reader.js as text. A page that says "the readings go back into the
   shape" and then draws a straight line is a page that lies, and only the
   emitted markup can tell the difference. */
function stubNode(tag){
  const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_h:'',
    className:'',id:'',htmlFor:'',type:'',value:'',tabIndex:-1,
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    querySelector(sel){const t=String(sel).toUpperCase();for(const c of walk(this))if(c.tagName===t)return c;return null},closest(){return null},focus(){},click(){},scrollIntoView(){},
    appendChild(c){this.childNodes.push(c);return c},
    get children(){return this.childNodes},
    append(...cs){for(const c of cs)this.childNodes.push(c)},
    replaceChildren(){this.childNodes=[]},
    contains(){return false},
    setAttribute(k,v){this.attrs[k]=v},
    getAttribute(k){return this.attrs[k]},
    addEventListener(){},removeEventListener(){},
    get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
    set textContent(v){this._t=String(v);this.childNodes=[]},
    get innerHTML(){return this._h},
    set innerHTML(v){this._h=String(v)}};
  return n;
}
const walk=(n,out=[])=>{for(const c of (n.childNodes||[])){out.push(c);walk(c,out)}return out};
/* Render the reader and return the SVG markup emitted for the page whose
   diagram kind is `kind`. The page is selected by what it IS, not by its
   position: the nav button is matched on the page's own title, so inserting a
   page later cannot silently re-point this guard at the wrong drawing. */
function readerSVG(lang,kind){
  const host=stubNode('div');
  const real=globalThis.document;
  globalThis.document={
    createElement:t=>stubNode(t),
    createElementNS:(ns,t)=>stubNode(t),
    createTextNode:t=>{const n=stubNode('#text');n.textContent=t;return n},
    getElementById:()=>null};
  try{
    renderReader(lang,host);
    const nav=host.childNodes[0];
    // nav[i] and pages[i] are the same page -- renderReader's own button handler
    // sets current=i -- so the page's own index is the button to press. The page
    // is still located by what it IS (its diagram kind), never by a fixed
    // position, so inserting a page later cannot re-point this at the wrong one.
    const idx=READER[lang].pages.findIndex(p=>p.diagram===kind);
    assert.ok(idx>=0,`the ${lang} reader has no ${kind} page`);
    const btn=nav.childNodes[idx];
    assert.ok(btn&&btn.onclick,`the ${lang} nav has no button for the ${kind} page`);
    btn.onclick();
    const fig=walk(host).find(n=>n.className==='reader-diagram');
    assert.ok(fig,`the ${lang} ${kind} page emitted no diagram`);
    return fig.childNodes[0].innerHTML;
  } finally{globalThis.document=real}
}

test('the reader says why working this way is worth it, and the drawing is a loop',()=>{
 // Page seven answers "what is this for". Page eight owes the reader the next
 // question, which is the one that decides whether any of it gets used: what
 // does this cost me? Three claims, and none of them is about the building's
 // economics — page three covered that, and it is a different subject.
 for(const lang of ['en','th','zh']){
  const w=READER[lang].pages.find(p=>p.diagram==='loop');
  assert.ok(w,lang+' is missing the why-this-way page');
  assert.equal(w.labels.length,6,lang+': six desks, one per drawn glyph');
  assert.equal(w.paras.length,3,lang+': three claims');
 }
 const we=READER.en.pages.find(p=>p.diagram==='loop');
 assert.match(we.paras[0],/when you ask it/i,'page 8 does not say a question costs what it costs depending on WHEN');
 assert.match(we.paras[1],/answers back|wrong about/i,'page 8 does not say the model answers back');
 assert.match(we.paras[2],/know the building/i,'page 8 does not say you come to know the building');
 for(const q of ['Lifts','Fire','Wind','Water','Glare','Carbon'])
  assert.ok(we.labels.some(l=>l.includes(q)),`the ${q} desk is not named on the loop page`);
 // The Thai and Chinese have to carry the same three claims in their own script.
 assert.match(READER.th.pages.find(p=>p.diagram==='loop').paras[0],/เมื่อไร/,'the Thai page does not say WHEN');
 assert.match(READER.th.pages.find(p=>p.diagram==='loop').paras[1],/ตอบกลับมา/,'the Thai page does not say the model answers back');
 assert.match(READER.zh.pages.find(p=>p.diagram==='loop').paras[0],/什么时候问/,'the Chinese page does not say WHEN');
 assert.match(READER.zh.pages.find(p=>p.diagram==='loop').paras[1],/回答你/,'the Chinese page does not say the model answers back');

 // The drawing is the argument, so measure it.
 const svg=readerSVG('en','loop');
 assert.ok(svg.includes('<svg'),'the loop page drew no svg');
 assert.equal((svg.match(/<g transform="translate/g)||[]).length,6,'the loop must draw the six desks');
 assert.ok(svg.includes('stroke="#f59e0b" stroke-width="2"'),'the loop has no amber return path');
 // The return path must actually RETURN: it starts at the last desk on the
 // right and ends back at the tower on the left, travelling leftwards.
 const m=/d="M(\d+) ([\d.]+)V([\d.]+)H(\d+)V([\d.]+)"[^>]*stroke="#f59e0b"/.exec(svg);
 assert.ok(m,'the amber path does not run back along the bottom');
 assert.ok(+m[4]<+m[1],'the return path does not travel back towards the shape');
 assert.ok(+m[3]>+m[2],'the return path does not drop below the spine before travelling back');
 // The shape is drawn on the LEFT of the desks, and its width is dimensioned
 // but not numbered — the width is still open, which is why the questions are
 // still cheap to ask.
 const tower=svg.indexOf('<rect x="34"');
 assert.ok(tower>=0,'the loop draws no tower');
 assert.ok(tower<svg.indexOf('<g transform="translate'),'the tower must come before the desks, not after them');
 assert.ok(/M30 32H78/.test(svg),'the open width dimension is missing');
 // Every text on the sheet is a desk number and nothing else. If the open
 // dimension had been given a number, this list would be longer than six.
 const texts=[...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(x=>x[1]);
 assert.deepEqual(texts,['1','2','3','4','5','6'],'the loop sheet must carry the six desk numbers and nothing else');
 // The same six glyphs as the page before, so a reader recognises them.
 const work=readerSVG('en','work');
 assert.equal((work.match(/<g transform="translate/g)||[]).length,6,'the work page must draw six desks too');
 assert.equal((svg.match(/<g transform="translate/g)||[]).length,(work.match(/<g transform="translate/g)||[]).length,
  'the loop and the work page must show the same number of desks');
});
