import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {defaults, profile, cornerZones, stackHeight} from '../dist/model.js';
import {solarPosition} from '../dist/solar.js';
import {BRIEF_I18N, renderBrief} from '../dist/brief.js';
import {CONTEXT_I18N, renderContext, CONTEXT_SITES, contextShadow} from '../dist/context.js';
import {WALK_I18N, renderWalk} from '../dist/walk.js';

const L = ['en', 'th', 'zh'];
const readDist = f => readFileSync(join(new URL('../dist', import.meta.url).pathname, f), 'utf8');
const CJK = /[㐀-鿿豈-﫿]/;

const MODULES = [
  ['brief', BRIEF_I18N, 'BRIEF_I18N'],
  ['context', CONTEXT_I18N, 'CONTEXT_I18N'],
  ['walk', WALK_I18N, 'WALK_I18N'],
];

test('the three desks are wired into the page and the controller', () => {
  const html = readDist('index.html');
  for (const id of ['briefDesk', 'walkDesk', 'contextDesk'])
    assert.ok(html.includes(`id="${id}"`), `${id} container missing from index.html`);
  const app = readDist('app.js');
  for (const fn of ['renderBrief', 'renderWalk', 'renderContext'])
    assert.match(app, new RegExp(`import \\{[^}]*${fn}[^}]*\\} from`), `${fn} is not imported`);
  assert.match(app, /\['brief',BRIEF_I18N,renderBrief\]/);
  assert.match(app, /\['walk',WALK_I18N,renderWalk\]/);
  assert.match(app, /\['context',CONTEXT_I18N,renderContext\]/);
});

test('each desk translates completely, with no silent Latin fallback in Chinese', () => {
  // Proper nouns quoted from a source are allowed to stay Latin; ordinary words
  // are not. Every exception is named so the list cannot quietly grow.
  const PROPER_NOUN = new Set([
    'u.m2', 'u.m', 'u.pct', 'ty.branch.g', 'ty.setback.g', 'ty.faceted.g', 'ty.skin.g',   // the thesis's own algorithm names
    'ty.branch.s', 'ty.setback.s', 'ty.faceted.s', 'ty.skin.s',
  ]);
  for (const [name, dict] of MODULES) {
    const shape = L.map(l => Object.keys(dict[l]).sort().join('|'));
    assert.ok(shape[0] === shape[1] && shape[1] === shape[2],
      `${name}: en/th/zh key sets differ (${L.map((l, i) => l + '=' + Object.keys(dict[l]).length).join(' ')})`);
    assert.ok(Object.keys(dict.en).length > 30, `${name}: suspiciously few strings`);
    for (const [k, v] of Object.entries(dict.zh)) {
      if (PROPER_NOUN.has(k)) continue;
      assert.ok(/[㐀-鿿]/.test(v), `${name}.${k} zh falls back to Latin: "${v}"`);
      assert.doesNotMatch(v.replace(/\{(?:field|value)\}|taper|family|height|floors|aspect|orientation|twist|profile|geometry\.js|Profile Finding|Points Finding|[A-Za-z]{1,2}(?![A-Za-z])/g, ''), /[A-Za-z]{4,}/,
        `${name}.${k} zh contains a Latin word`);
    }
    for (const l of ['en', 'th'])
      for (const [k, v] of Object.entries(dict[l]))
        assert.ok(!CJK.test(v), `${name}.${k} ${l} contains CJK`);
    for (const l of L)
      for (const [k, v] of Object.entries(dict[l]))
        assert.ok(String(v).trim().length, `${name}.${k}.${l} is empty`);
  }
});

test('no desk may claim compliance, safety or a real-world effect it cannot support', () => {
  // The single most dangerous failure mode for this project is a sentence that
  // reads like a finding. These are the words that would do it.
  const BANNED = [/this (?:model|scheme) (?:is|has been) (?:safe|approved|code.compliant)/i,/guarantees? (?:safety|compliance)/i,/proves? (?:structural|seismic|daylight)/i];
  for (const [name, dict] of MODULES)
    for (const l of L)
      for (const [k, v] of Object.entries(dict[l]))
        for (const rx of BANNED)
          assert.doesNotMatch(v, rx, `${name}.${k}.${l} overclaims: "${v.slice(0, 90)}"`);
});

test('the brief desk shows the FAR arithmetic and all ten thesis massing parameters', () => {
  const en = BRIEF_I18N.en;
  const joined = JSON.stringify(en);
  // Plot, ratio, permitted area, storeys, height — the arithmetic, all named.
  for (const k of Object.keys(en).filter(k => /^far\./.test(k)))
    assert.ok(en[k].trim(), `far.${k} empty`);
  // The thesis's own §4.4 parameter names, so the correspondence is auditable.
  for (const name of ['Vertical Proportion', 'Massing Description', 'Floor Height',
                      'Floor Number', 'Middle Profile Level', 'Middle Profile XScale',
                      'Middle Profile YScale', 'Top Profile XScale', 'Top Profile YScale',
                      'Rotation Angle'])
    assert.ok(joined.includes(name), `thesis parameter "${name}" is missing from the brief desk`);
  // And the four massing types the thesis names in §5.1.1.
  for (const name of ['16-Branch', 'Set-back Corner', 'Multi-Faceted Glass Box', 'Structural Skin'])
    assert.ok(joined.includes(name), `thesis massing type "${name}" is missing`);
});

test('the brief desk offers the three schemes the client actually argues about', () => {
  const joined = JSON.stringify(BRIEF_I18N.en);
  assert.match(joined, /[Cc]urtain[- ]wall/);
  assert.match(joined, /[Pp]odium/);
  assert.match(joined, /[Ss]olid facade|[Dd]epartment/);
});

test('the four pilot sites are real, cited, and replace an existing building', () => {
  const ids = Object.keys(CONTEXT_SITES);
  assert.deepEqual(ids.sort(), ['bangkok', 'hcmc', 'jakarta', 'kl', 'shenzhen']);
  assert.equal(CONTEXT_SITES.shenzhen.floors, 115);
  assert.equal(CONTEXT_SITES.shenzhen.height, 599);
  assert.equal(CONTEXT_SITES.shenzhen.gross, 459525);
  assert.ok(CONTEXT_SITES.shenzhen.height < 650, 'the 660 m redesign is not the completed tower');
  assert.match(CONTEXT_I18N.en.countrySz, /China/);
  assert.match(CONTEXT_I18N.en.neighSz, /Futian/);
  assert.match(CONTEXT_I18N.zh.citySz, /深圳/);
  assert.match(CONTEXT_I18N.th.neighSz, /ฝูเถียน/);
  for (const id of ids) {
    const s = CONTEXT_SITES[id];
    assert.ok(s.bld && s.addr, `${id}: building and street address required`);
    assert.ok(Number.isFinite(s.height) && s.height > 100, `${id}: real height must be given`);
    assert.ok(Number.isFinite(s.floors) && s.floors > 10, `${id}: real storey count required`);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lon),
      `${id}: real coordinates required`);
    assert.ok(Math.abs(s.lat) < 24 && Math.abs(s.lon) < 127, `${id}: coordinates are not in the tropics`);
  }
  // The Empire Tower clear height is a measured Grade A benchmark, not a guess.
  assert.ok(CONTEXT_SITES.bangkok.source.startsWith('https://'));assert.equal(CONTEXT_SITES.bangkok.clearHeight,undefined);
});

test('shadow is computed from real solar geometry and never goes negative', () => {
  for (const id of Object.keys(CONTEXT_SITES)) {
    for (const time of ['09:00', '12:00', '18:00']) {
      const sun = solarPosition({city: id, solarDate: '2026-06-21', solarTime: time});
      const r = contextShadow({city: id, solarDate: '2026-06-21', solarTime: time}, 100);
      assert.ok(Number.isFinite(r.length), `${id} ${time}: shadow length not finite`);
      assert.ok(r.length >= 0, `${id} ${time}: negative shadow length`);
      assert.ok(Number.isFinite(r.azimuth), `${id} ${time}: shadow azimuth missing`);
      if (!sun.aboveHorizon) assert.equal(r.length, 0,
        `${id} ${time}: sun below the horizon must cast no shadow, got ${r.length}`);
    }
  }
  // A 100 m tower at high sun throws a short shadow; at low sun a long one.
  const noon = contextShadow({city: 'bangkok', solarDate: '2026-06-21', solarTime: '12:00'}, 100).length;
  const dawn = contextShadow({city: 'bangkok', solarDate: '2026-06-21', solarTime: '08:00'}, 100).length;
  assert.ok(dawn > noon, 'a lower sun must throw a longer shadow');
});

test('neighbour context is explicitly labelled as unsurveyed', () => {
  const all = L.flatMap(l => Object.values(CONTEXT_I18N[l])).join(' ');
  assert.match(all, /not surveyed|indicative/i);
  assert.match(JSON.stringify(BRIEF_I18N.zh), /假设|示意/, 'zh desks must carry their own assumptions language');
});

test('the walk desk states its perspective construction and its limits', () => {
  const joined = L.map(l => JSON.stringify(WALK_I18N[l])).join(' ');
  assert.match(joined, /one-point|two-point/i);
  assert.match(joined, /1\.60|1\.6/);
  assert.match(joined, /diagrammatic|示意|สมมติ/);
  for (const l of L)
    assert.ok(Object.keys(WALK_I18N[l]).length > 30, `walk.${l} suspiciously few strings`);
});

test('the desks agree with the kernel they drive', () => {
  // A desk that contradicts model.js is worse than no desk: it would report a
  // corner count the geometry does not have.
  const p = profile({...defaults, family: 'box'}, 0);
  const star = profile({...defaults, family: 'star'}, 0);
  assert.ok(cornerZones(p, defaults).length <= 4, 'a square plate cannot exceed four corners');
  assert.ok(cornerZones(star, defaults).length > 4, 'the star must beat four corners');
  assert.ok(stackHeight({...defaults, floors: 40}, 40) > 100);
});
// Numerical and geometric regressions target the failure, not just its label.
import {projectedShadow,groundOverlap,shade,rayHitsTriangle} from '../dist/context.js';
import {interior,street} from '../dist/walk.js';
import {schemeResult,fitBriefTower} from '../dist/brief.js';
import {families,grossOf,stack} from '../dist/model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const westSun={aboveHorizon:true,altitude:45,azimuth:270,vector:{east:-Math.SQRT1_2,north:0,up:Math.SQRT1_2}};
const prismState={...defaults,family:'box',span:4,taper:1,twist:0,orientation:0,program:'custom',height:4,floors:24};
test('a narrow neighbour between sampled profiles still intersects the continuous side shadow',()=>{
 assert.equal(groundOverlap(projectedShadow(prismState,westSun),{b:90,d:40,w:2,h:6}),true);
 assert.equal(groundOverlap(projectedShadow(prismState,westSun),{b:270,d:40,w:2,h:6}),false);
});
test('neighbour height affects face exposure while ground overlap stays unchanged',()=>{
 const short=shade(prismState,[westSun],[{b:90,d:40,w:2,h:6}]).rows[0];
 const tall=shade(prismState,[westSun],[{b:90,d:40,w:2,h:1000}]).rows[0];
 near(short.hours,.25);near(tall.hours,.25);near(short.ratio,1);near(tall.ratio,0);near(short.facadeHours,.25*Math.SQRT1_2);
});
test('shadow cache includes the custom level height and night never produces shadow',()=>{
 const ns=[{b:90,d:70,w:2,h:6}];near(shade(prismState,[westSun],ns).rows[0].hours,.25);
 near(shade({...prismState,height:2},[westSun],ns).rows[0].hours,0);
 assert.deepEqual(projectedShadow(prismState,{...westSun,aboveHorizon:false}),[]);
 assert.equal(rayHitsTriangle([0,0,0],[0,0,1],[-1,-1,2],[1,-1,2],[0,1,2]),true);
 assert.equal(rayHitsTriangle([0,0,3],[0,0,1],[-1,-1,2],[1,-1,2],[0,1,2]),false);
});
test('three brief schemes conserve realised plate area and applying the tower conserves its target',()=>{
 const input={gfa:120000,plate:1800,curtain:{pf:1.15,ff:1},solid:{pf:1.5,ff:1.25},podium:{share:.3,floors:6,pf:2,ff:1.5}};
 for(const type of ['curtain','solid','podium']){const r=schemeResult(type,defaults,input);near(r.gfa,r.podiumGfa+r.towerGfa);near(r.towerGfa,r.towerN*r.plate);near(r.podiumGfa,r.podiumN*r.podiumPlate);assert.ok(r.gfa>=input.gfa);const patch=fitBriefTower(defaults,r,type);near(grossOf({...defaults,...patch}),r.towerGfa);near(stackHeight({...defaults,...patch}),patch.floors*patch.height)}
});
test('every perspective family and extreme view generates finite SVG with a real stack height',()=>{
 for(const family of Object.keys(families))for(const floors of [12,70])for(const look of [0,42]){
  const s={...defaults,family,floors,twist:180,program:'custom',height:6};
  for(const view of [interior(s,k=>k),street(s,k=>k,{d:20,look})]){assert.equal(typeof view.svg,'string');assert.doesNotMatch(view.svg,/NaN|undefined|Infinity|d="<path/);assert.ok(view.svg.length>1000)}
  near(interior(s,k=>k).ff,6);
 }
 near(interior({...defaults,program:'mini',height:6},k=>k).ff,4.2);
});

test('every desk import is pinned to the bytes that will reach the browser',async()=>{
 const {createHash}=await import('node:crypto');
 for(const file of ['brief.js','walk.js','context.js'])for(const [,url]of readDist(file).matchAll(/from\s*['"](\.\/[^'"]+)['"]/g)){
  const [path,query]=url.split('?');assert.match(query||'',/^v=[a-f0-9]{10}$/,file+' unpinned import');
  assert.equal(query.slice(2),createHash('sha256').update(readDist(path.slice(2))).digest('hex').slice(0,10),file+' stale import');
 }
});

test('Modulor figure is grounded and uses the same 2.26 m raised-hand scale in every view',async()=>{
 const {MODULOR_CONTOURS,MODULOR_HEIGHT,MODULOR_REACH,modulorPath}=await import('../dist/modulor.js');
 assert.equal(MODULOR_HEIGHT,1.83);assert.equal(MODULOR_REACH,2.26);
 const ys=MODULOR_CONTOURS.flat().map(p=>p[1]);assert.equal(Math.min(...ys),0);assert.equal(Math.max(...ys),2.26);
 for(const scale of [10,26,80]){const d=modulorPath((x,y)=>[100+x*scale,200-y*scale]);assert.ok(d.includes('Z'));assert.ok(!/NaN|Infinity/.test(d));}
 for(const file of ['app.js','walk.js'])assert.match(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),/modulorPath/);
});
