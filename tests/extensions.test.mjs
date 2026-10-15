import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaults,profile,area,families,evaluate,searchPlan,grossOf,meshOBJ} from '../dist/model.js';
import {planLibrary,polyArea,polyPerimeter} from '../dist/geometry.js';
import {cantileverPeriod,quarterWavePeriod,LC} from '../dist/location.js';
import {angularGap,PROMPTS,PLAY} from '../dist/play.js';
import {READER,SOURCES,ARTIFACTS} from '../dist/reader-content.js';
import {t} from '../dist/i18n.js';
import {solarDefaults,solarPosition,cities,facadeExposure} from '../dist/solar.js';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);

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
test('guided reader has four substantial, fully translated pages and every citation resolves',()=>{
 for(const lang of ['en','th','zh']){
  assert.equal(READER[lang].pages.length,4);assert.equal(READER[lang].nav.length,4);
  for(const p of READER[lang].pages){assert.ok(p.paras.length>=3);assert.ok(p.title&&p.caption&&p.labels.length>=4);
   for(const text of p.paras)for(const [,id]of text.matchAll(/\[([a-z]+)\]/g))assert.ok(SOURCES.some(s=>s.id===id),id);
  }
  assert.deepEqual(Object.keys(LC[lang]),Object.keys(LC.en));assert.deepEqual(Object.keys(PLAY[lang]),Object.keys(PLAY.en));
  for(const f of Object.keys(families))assert.ok(t[lang]['f.'+f]);
 }
 assert.match(READER.en.pages[3].paras[0],/repository abstract/);
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
   const bytes=dist(ref.replace(/^\.\//,''));assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,10),id,ref);
  }
 }
});
test('Tokyo uses its real civil zone and midlatitude solar exposure',()=>{
 assert.equal(cities.tokyo.zone,'Asia/Tokyo');const s={...solarDefaults,city:'tokyo'};
 assert.equal(solarPosition(s).instant,'2026-06-21T03:00:00.000Z');assert.ok(solarPosition(s).altitude>70);
 assert.ok(facadeExposure(180,{...s,solarDate:'2026-12-21'}).equivalentHours>facadeExposure(0,{...s,solarDate:'2026-12-21'}).equivalentHours);
});

test('changing cities discards soil assumptions rather than treating them as regional observations',()=>{
 const src=dist('location.js');assert.match(src,/lastCity!==city/);assert.match(src,/assumptions\.depth='';assumptions\.velocity=''/);
 assert.match(src,/values are invented/);assert.match(LC.en.intro,/percentages below are changes in period only/);
});
test('every new shape has unit-scale area and perimeter, with valid export topology',()=>{
 for(const f of ['triangle','hexagon','oval','petal','pinwheel']){const p=planLibrary[f]();assert.ok(polyArea(p)>.2);assert.ok(polyPerimeter(p)>2);assert.ok(p.every(q=>q.every(Number.isFinite)))}
});

test('JSON study exports retain contextual assumptions and their stated limits',()=>{
 assert.match(dist('app.js'),/contextStudies:\{ground:getLocationStudy\(\),fengShui:getFengStudy\(\)\}/);
 assert.match(dist('location.js'),/not safety assessment/);assert.match(dist('play.js'),/invented-site design prompt/);
});

test('2026-10-15 audit: inherited names, stale search, unknown hashes and failed saves are guarded',()=>{
 const app=dist('app.js');
 assert.ok('constructor' in families&&!Object.hasOwn(families,'constructor'),'plain lookup would accept inherited keys');
 assert.match(app,/Object\.hasOwn\(regimes,/);assert.match(app,/Object\.hasOwn\(objectives,/);
 assert.match(app,/own\(regimes,x\.regime\)/);
 assert.match(app,/function changed\(\)\{\n searchToken\+\+/);
 assert.match(app,/showTab\(h==='research'\?h:'studio',false\)/);
 assert.match(app,/if\(!persist\(\)\)\{studies\.pop\(\);toast\(tt\('s\.saveFail'\)\)/);
 assert.match(app,/filter\(x=>x&&validState\(x\.state\)\)/);
});

test('shared links carry a preview card and the sheet obeys the no-gradient rule on phones',()=>{
 const html=dist('index.html'),css=dist('style.css');
 for(const tag of ['og:title','og:description','og:image','twitter:card'])assert.ok(html.includes(`"${tag}"`),tag);
 assert.match(html,/<link rel="icon"/);
 assert.ok(readFileSync(new URL('../dist/og.jpg',import.meta.url)).length>10000);
 assert.ok(!/gradient\(/.test(css),'house style bans gradients');
 assert.match(css,/@media\(max-width:560px\)\{\.titleblock \.b-cred,\.titleblock \.tb-sheet\{display:none\}/);
});

test('the Method dialog publishes the rent equation the model actually computes, in every language',()=>{
 for(const s of [defaults,{...defaults,family:Object.keys(families)[3],floors:30,twist:40}]){
  const m=evaluate(s),p=m.premiums,base=s.rent*s.occupancy/100;
  near(m.rent,m.rentable*base*(1+p.identity+p.columnFree+p.height-p.lowCeiling-p.depth)+m.cornerArea*base*p.corner,1e-6);
  near(m.contribution,m.rent-m.facadeCost-m.structureCost,1e-6);
 }
 for(const l of ['en','th','zh'])for(const k of ['meth.title1','meth.title2','meth.rent','meth.contrib','meth.limits'])assert.ok(typeof t[l][k]==='string'&&t[l][k].length>3,`${l} ${k}`);
 assert.match(dist('index.html'),/id="methodBtn"/);
 assert.match(dist('app.js'),/\$\('methodBtn'\)\.onclick=\(\)=>\{renderMethod\(\);\$\('method'\)\.showModal\(\)\}/);
 assert.ok(!dist('app.js').includes('obsolescence'),'stale formula text removed');
});
