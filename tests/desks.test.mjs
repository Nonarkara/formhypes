import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {defaults, profile, cornerZones, stackHeight} from '../dist/model.js';
import {solarPosition} from '../dist/solar.js';
import {BRIEF_I18N, renderBrief} from '../dist/brief.js';
import {t} from '../dist/i18n.js';
import {CONTEXT_I18N, renderContext, CONTEXT_SITES, contextShadow} from '../dist/context.js';
import {WALK_I18N, renderWalk} from '../dist/walk.js';
import {FENG_I18N, renderFeng} from '../dist/feng.js';
import {WORKSPACES} from '../dist/console.js';
import {MATERIALS,MATERIAL_KEYS,materialOf,materialEnvelopeCost,surfacePattern} from '../dist/materials.js';

const L = ['en', 'th', 'zh'];
const readDist = f => readFileSync(join(new URL('../dist', import.meta.url).pathname, f), 'utf8');
const CJK = /[㐀-鿿豈-﫿]/;

const MODULES = [
  ['brief', BRIEF_I18N, 'BRIEF_I18N'],
  ['context', CONTEXT_I18N, 'CONTEXT_I18N'],
  ['walk', WALK_I18N, 'WALK_I18N'],
  ['feng', FENG_I18N, 'FENG_I18N'],
];

test('the three desks are wired into the page and the controller', () => {
  const html = readDist('index.html');
  for (const id of ['briefDesk', 'walkDesk', 'contextDesk', 'fengshuiDesk'])
    assert.ok(html.includes(`id="${id}"`), `${id} container missing from index.html`);
  const app = readDist('app.js');
  for (const fn of ['renderBrief', 'renderWalk', 'renderContext', 'renderFeng'])
    assert.match(app, new RegExp(`import \\{[^}]*${fn}[^}]*\\} from`), `${fn} is not imported`);
  assert.match(app, /\['brief',BRIEF_I18N,renderBrief\]/);
  assert.match(app, /\['walk',WALK_I18N,renderWalk\]/);
  assert.match(app, /\['fengshui',FENG_I18N,renderFeng\]/);
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

test('both "does this fit the plot" verdicts name what they actually measured',()=>{
 // Two instruments answer the same question with two different numbers: the
 // studio header measures the generated form against envelope, height, core and
 // levels; the Brief desk measures area against the FAR allowance. Before each
 // one named its subject, the site read as contradicting itself. Assert both
 // labels exist, differ, are actually rendered, and that the area check states
 // the scope of its own measurement.
 const app=readDist('app.js'),brief=readDist('brief.js');
 for(const l of L){
  assert.ok(t[l]['m.chk.form']?.trim(),`${l}: the form check measures something but never names it`);
  assert.ok(BRIEF_I18N[l]['st.subj.area']?.trim(),`${l}: the area check measures something but never names it`);
  assert.notEqual(t[l]['m.chk.form'],BRIEF_I18N[l]['st.subj.area'],`${l}: both checks carry the same label`);
  assert.ok(BRIEF_I18N[l]['st.scope'].length>60,`${l}: the area check states no scope`);
 }
 assert.match(app,/tt\('m\.chk\.form'\)\+' · '/,'the form label is not rendered');
 assert.match(brief,/c\['st\.subj\.area'\]/,'the area label is not rendered');
 assert.match(brief,/el\('p',c\['st\.scope'\],'br-note'\)/,'the scope note is not rendered');
});

/* A DOM small enough to read. The desk renderers were never invoked by the
   suite — only the string "renderBrief" was checked in app.js — so a desk
   could throw on the first line of its body and all 127 tests would stay
   green. This stub runs them for real and reads the text back out. */
function stubNode(tag){
  const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_h:'',
    className:'',id:'',htmlFor:'',type:'',value:'',
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    querySelector(){return null},closest(){return null},focus(){},click(){},
    appendChild(c){this.childNodes.push(c);return c},
    get children(){return this.childNodes},
    append(...cs){for(const c of cs)this.childNodes.push(c)},
    replaceChildren(){this.childNodes=[]},
    contains(){return false},
    setAttribute(k,v){this.attrs[k]=v},
    getAttribute(k){return this.attrs[k]},
    addEventListener(){},removeEventListener(){},
    checkValidity(){return true},reportValidity(){return true},
    get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
    set textContent(v){this._t=String(v);this.childNodes=[]},
    get innerHTML(){return this._h},
    set innerHTML(v){this._h=String(v)}};
  return n;
}
function deskText(render,id,lang,override){
  const host=stubNode('div');
  const real=globalThis.document;
  globalThis.document={
    createElement:t=>stubNode(t),
    createElementNS:(ns,t)=>stubNode(t),
    createTextNode:t=>{const n=stubNode('#text');n.textContent=t;return n},
    createDocumentFragment:()=>stubNode('#fragment'),
    getElementById:k=>k===id?host:null,
    activeElement:{id:''}};
  try{render({lang,state:override||defaults,changed(){},onInputs(){}});return host.textContent}
  finally{globalThis.document=real}
}

test('every desk renderer actually runs and produces text, not just a name in app.js',()=>{
 for(const [id,fn]of [['briefDesk',renderBrief],['walkDesk',renderWalk],['contextDesk',renderContext],['fengshuiDesk',renderFeng]])
  for(const lang of L){
   const out=deskText(fn,id,lang);
   // The floor is measured against the desk's OWN dictionary rather than a
   // fixed character count. A fixed count is calibrated to English, and a
   // correct, complete Chinese render is legitimately about half the length
   // of the same text — so the old 800 could only ever be satisfied by
   // padding one script. What must hold is that the desk showed its reader
   // its own words.
   const dict={briefDesk:BRIEF_I18N,walkDesk:WALK_I18N,contextDesk:CONTEXT_I18N,fengshuiDesk:FENG_I18N}[id];
   const own=Object.values(dict[lang]).join('').length;
   assert.ok(out.length>own*0.9,`${id}/${lang}: rendered ${out.length} chars of its own ${own} — the renderer is not really running`);
   assert.ok(out.length>400,`${id}/${lang}: rendered only ${out.length} chars`);
   assert.doesNotMatch(out,/undefined|NaN|\[object Object\]/,`${id}/${lang}: rendered junk into the page`);
  }
});

test('the brief desk states its area verdict and its scope, in the language asked for',()=>{
 for(const lang of L){
  const out=deskText(renderBrief,'briefDesk',lang);
  assert.ok(out.includes(BRIEF_I18N[lang]['st.subj.area']),`${lang}: the area check is not in the rendered desk`);
  assert.ok(out.includes(BRIEF_I18N[lang]['st.scope']),`${lang}: the scope note is not in the rendered desk`);
  // A key present in the table but dropped at render time is the silent
  // regression this desk already suffered once, in the other direction.
  assert.ok(out.includes(BRIEF_I18N[lang]['st.fits'])||out.includes(BRIEF_I18N[lang]['st.over'])
    ||out.includes(BRIEF_I18N[lang]['st.plotSmall']),`${lang}: no area verdict reached the page`);
 }
});

test('the Shenzhen notes moved into the Place desk instead of vanishing with the banner',()=>{
 // place.caution and place.gift used to live in a band above every tab. The
 // band is gone; the two sentences are about the city, so they must now
 // render on the site they qualify — and nowhere else.
 for(const l of L){
  assert.ok(CONTEXT_I18N[l].shenzhenCaution?.trim(),`${l}: shenzhenCaution missing`);
  assert.ok(CONTEXT_I18N[l].shenzhenGift?.trim(),`${l}: shenzhenGift missing`);
 }
 assert.match(CONTEXT_I18N.en.shenzhenCaution,/660/);
 assert.match(CONTEXT_I18N.en.shenzhenGift,/Xiaohei/);
 assert.match(CONTEXT_I18N.zh.shenzhenGift,/小黑/);
 const out=deskText(renderContext,'contextDesk','en',{...defaults,city:'shenzhen'});
 // The {0} is filled with the completed height, so match the filled sentence
 // and the number separately — asserting on the raw template would pass on a
 // table and fail on a page.
 assert.match(out,/The 660 m scheme is a different proposal/, 'the 660 m caution does not render on the Shenzhen site');
 assert.match(out,/Completed height is 599 m/, 'the completed height is not filled into the caution');
 assert.ok(out.includes(CONTEXT_I18N.en.shenzhenGift),'the Chen gift line does not render on the Shenzhen site');
 // And it must not leak onto any other site.
 const bkk=deskText(renderContext,'contextDesk','en',{...defaults,city:'bangkok'});
 assert.doesNotMatch(bkk,/Xiaohei|660 m scheme/,'Shenzhen notes leaked onto another site');
});

test('the performance rail leads with drawings and keeps the schedule on demand',()=>{
 const html=readDist('index.html');
 // A rail that prints its figures before the first drawing reads as a
 // template. The two drawings an architect reads off a sheet come first.
 assert.ok(html.indexOf('id="premiumPanel"')<html.indexOf('id="contribution"'),
  'the rent scales must sit above the headline figure');
 assert.ok(html.indexOf('id="plan"')<html.indexOf('id="annualRent"'),
  'the level plan must sit above the figures');
 // Then the figures, grouped, opened by the reader rather than printed.
 for(const g of ['grpArea','grpForm','grpSkin','grpCapital'])
  assert.match(html,new RegExp(`<details class="railgroup" id="${g}">`),`${g} is not collapsible`);
 assert.doesNotMatch(html,/<details class="railgroup"[^>]*\sopen/,
  'a rail group ships expanded — the schedule is on demand, not on the page');
 // Every figure keeps exactly one home; moving one must not duplicate it.
 const ids=[...html.matchAll(/<dd id="([A-Za-z]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'a rail figure is declared twice');
});

test('every workspace is named by a drawing, and the word is kept for the reader',()=>{
 const app=readDist('console.js');
 assert.ok(WORKSPACES.includes('feng'),'the Feng Shui desk must be on the bar');
 // A strip of words is a menu; marks are an instrument panel. The keys are read
 // from WORKSPACES rather than typed here, because a hardcoded list silently
 // stops covering the workspaces added after it was written — which is exactly
 // how two tools end up sharing one mark and nobody notices.
 const alt=WORKSPACES.join('|');
 const marks=[...app.matchAll(new RegExp('^\\s*('+alt+'):\'([^\']+)\'','gm'))].map(m=>m[2]);
 assert.equal(marks.length,WORKSPACES.length,'every workspace needs exactly one drawn mark');
 assert.equal(new Set(marks).size,WORKSPACES.length,'two workspaces share one mark — the strip cannot be read');
 for(const m of marks)assert.doesNotMatch(m,/NaN|undefined/);
 // The word does not vanish with the pixels: it stays for the accessibility
 // tree and the hover title, in all three languages.
 assert.match(app,/<svg class="wg"[^>]*aria-hidden="true"/,'the mark is not hidden from assistive tech');
 assert.match(app,/<span class="wt">'\+c\.work\[i\]/,'the translated label left the page');
 assert.match(app,/b\.title=c\.work\[i\]/,'no hover name on the mark');
});

test('twelve materials, each with the properties that move a figure',()=>{
 const keys=MATERIAL_KEYS;
 assert.equal(keys.length,12,'the brief was a dozen materials');
 for(const k of keys){
  const m=MATERIALS[k];
  assert.ok(m.label?.trim()&&m.thesis?.trim(),`${k}: no name or precedent`);
  assert.ok(m.vt>=0&&m.vt<=1,`${k}: visible transmittance out of range`);
  assert.ok(m.shgc>=0&&m.shgc<=1,`${k}: solar heat gain out of range`);
  assert.ok(m.upkeep>0&&m.cycle>0&&m.carbon>0,`${k}: a physical property is missing or not positive`);
  assert.ok(m.envelope>0,`${k}: no cost coefficient — it would move no figure`);
  assert.match(m.fill,/^#[0-9a-f]{6}$/i,`${k}: no colour, so the tower cannot wear it`);
 }
 // Opaque is opaque: a material that passes no light may not claim to.
 for(const k of keys)if(MATERIALS[k].draw!=='curtain'&&MATERIALS[k].draw!=='cell')
  assert.equal(MATERIALS[k].vt,0,`${k}: an opaque wall that still admits light`);
 // The overlay moves the envelope reserve and scales with its own rate.
 const base=100000;
 assert.equal(materialEnvelopeCost(base,{material:'float'}),base,'the baseline must be the baseline');
 for(const k of keys){
  const got=materialEnvelopeCost(base,{material:k});
  assert.ok(Math.abs(got-base*MATERIALS[k].envelope)<1e-6,`${k}: reserve does not follow its coefficient`);
  assert.ok(got>=0,`${k}: a negative envelope reserve`);
 }
 // Cheapest and dearest must not be the same material.
 const costs=keys.map(k=>MATERIALS[k].envelope);
 assert.ok(Math.max(...costs)/Math.min(...costs)>1.4,'the materials barely differ — the choice is decoration');
 // Each surface pattern draws something, and no two patterns are identical.
 const pats=keys.map(k=>JSON.stringify(surfacePattern({material:k})));
 assert.ok(pats.every(p=>p!=='[]'),'a material draws no surface at all');
 assert.equal(new Set(pats).size>=4,true,'every material draws the same surface');
 // The model has to know the key, or a saved study silently loses its wall.
 assert.ok(Object.hasOwn(MATERIALS,defaults.material),'the default state names no real material');
});

test('the crown, the terrace and the LED surface are reachable and are stated in all three languages',()=>{
 const app=readDist('app.js');
 // Reachability. A control that is not wired is a control that lies about
 // existing, and this file has already lost one feature that way before.
 for(const id of ['crown','garden','led'])
  assert.ok(app.includes(`'${id}'`)||app.includes(`"${id}"`),`${id} must be wired in app.js`);
 assert.ok(readDist('index.html').includes('id="crown"')&&readDist('index.html').includes('id="garden"')&&readDist('index.html').includes('id="led"'),
  'all three controls must exist in the markup');
 // Every reading the model produces needs a name in every language. No key may
 // fall back to English in Thai or Chinese.
 for(const key of ['c.crown','c.garden','c.led','rail.g.top','m.crownHeight','m.towerHeight',
   'm.crownReserve','m.crownCapital','m.gardenArea','m.gardenReserve','m.ledIncome','m.ledOff',
   'm.ledNote','m.ledOffNote']){
  for(const lang of ['en','th','zh'])
   assert.ok(t[lang][key],`${lang} is missing ${key}`);
 }
 for(const k of ['flat','stepped','helipad','post','mast']){
  for(const lang of ['en','th','zh']){
   assert.ok(t[lang]['crown.'+k],`${lang} is missing crown.${k}`);
   assert.ok(t[lang]['crown.reads.'+k],`${lang} is missing crown.reads.${k}`);
  }
 }
 for(const k of ['none','quarter','half','full']){
  for(const lang of ['en','th','zh']){
   assert.ok(t[lang]['garden.'+k],`${lang} is missing garden.${k}`);
   assert.ok(t[lang]['garden.reads.'+k],`${lang} is missing garden.reads.${k}`);
  }
 }
 // The LED note is where the honesty lives. If either language drops it, the
 // advertising income would read as performance income.
 assert.match(t.en['m.ledNote'],/advertising/i);
 assert.match(t.en['m.ledNote'],/no daylight/i);
 assert.match(t.th['m.ledNote'],/โฆษณา/);
 assert.match(t.zh['m.ledNote'],/广告/);
 assert.match(t.zh['m.ledNote'],/不改变采光/);
});

test('no Latin word leaks into the Chinese or Thai crown and terrace copy',()=>{
 // Units and proper nouns are allowed; ordinary English words are not. A
 // missing translation that falls through to English is invisible in a test
 // suite and obvious to a reader.
 const allowed=/\b(m²|m3|m|USD|LED|GFA|FAR|Petronas|Kuala Lumpur|Hong Kong|Chicago|Haussmannian)\b/g;
 for(const lang of ['th','zh']){
  for(const key of ['c.crown','c.garden','c.led','rail.g.top','m.crownHeight','m.towerHeight',
    'm.crownReserve','m.crownCapital','m.gardenArea','m.gardenReserve','m.ledIncome','m.ledOff',
    'm.ledNote','m.ledOffNote',...['flat','stepped','helipad','post','mast'].map(k=>'crown.'+k),
    ...['none','quarter','half','full'].map(k=>'garden.'+k)]){
   const s=t[lang][key];if(!s)continue;
   const leftover=s.replace(allowed,'').match(/[A-Za-z]{4,}/g);
   assert.ok(!leftover,`${lang} ${key} leaks Latin: ${leftover&&leftover.join(' ')}`);
  }
 }
});

test('the isometric view measures the crown, not just the roof',()=>{
 const app=readDist('app.js');
 // The scale, the dimension line and the graduations must all be driven by the
 // extent that includes the crown. A drawing that stops at the roof while the
 // rail reports a taller building disagrees with its own figures.
 assert.ok(/ext=total\+chH/.test(app),'the drawing needs a crown-inclusive extent');
 assert.ok(app.includes('ext*.96*scale'),'the dimension must be graduated to the crown');
 assert.ok(app.includes('m<=ext'),'graduations must run to the crown');
 assert.ok(/heightLabel'\)\.textContent=metrics\.heightTotal/.test(app),
  'the header height must include the crown');
 // And the crown must be drawn from the same table the numbers come from.
 assert.ok(app.includes('crownPlates(crown)'),'the crown must be drawn from crownPlates');
});

test('on a phone, nothing in the header may change the page height',()=>{
 const css=readDist('console.css');
 // The bug: the plot ledger was display:none on a phone until the scheme crossed
 // the FAR allowance, then display:flex. Widening the base span made the header
 // grow 62px and shoved the hero down the page — every time the reader crossed
 // the limit. A warning must not move the drawing under a thumb that is dragging
 // the very slider that caused it.
 assert.ok(!/\.console-site:has\(\.console-flag\)/.test(css),
  'the ledger must never be shown conditionally — that is what resized the page');
 // The note carries the second copy of the sentence and is re-shown by a
 // compound selector that outranks a bare class, so hiding it needs both.
 assert.ok(/\.console-site-note,\s*\.console-site-note\.console-flag\{display:none\}/.test(css),
  'the breach note must stay hidden on a phone, matched at the same specificity');
 // The ledger is a fixed-height status line on a phone.
 const phone=css.slice(css.indexOf('@media(max-width:600px)'));
 const bar=phone.match(/(^|\n)\s*\.console-site\{[^}]*\}/);
 assert.ok(bar,'the phone rule for the ledger is missing');
 assert.ok(/height:\s*20px/.test(bar[0]),`the phone ledger must have a fixed height, got: ${bar[0]}`);
 // And the header band itself must not be free to grow on a phone.
 assert.ok(!/@media\(max-width:600px\)\{[^}]*header\{[^}]*height:auto/.test(css),
  'the phone header must not be height:auto');
});

test('the sheet bottom band is one in-flow stack, not elements with guessed offsets',()=>{
 const css=readDist('style.css'),consoleCss=readDist('console.css');
 // The bug: the phone readout sat at a hard-coded bottom while the title block
 // beneath it grew from one line to two on a narrow sheet, so the contribution
 // figure was printed straight through "Concept prototype — not for
 // construction". A fixed offset cannot know a sibling's height.
 assert.ok(!/body\.is-console \.phone-readout\{[^}]*position:\s*absolute/.test(css),
  'the phone readout must not be positioned by a guessed offset');
 assert.ok(!/phone-readout\{bottom:/.test(consoleCss),
  'console.css must not re-add a bottom offset to the phone readout');
 // In flow means not out of flow — NOT "static". The band is position:relative so
 // it paints above the absolute canvas, and relative is still in flow. Pinning
 // this to the literal string "static" is what let the band become invisible
 // behind the drawing while this test went on passing.
 for(const sel of ['.viewport>.viewfoot','.viewport>.skyline-readout','.viewport>.titleblock']){
  const scoped=[...css.matchAll(/([^{}]*\.viewport[^{}]*)\{([^}]*)\}/g)]
   .filter(m=>m[1].includes('>')&&m[1].includes(sel));
  assert.ok(scoped.length,`no .viewport rule targets ${sel}`);
  const pos=[...scoped.map(m=>/position:\s*([a-z]+)/.exec(m[2])).filter(Boolean)];
  assert.ok(pos.length,`${sel} sets no position at all`);
  assert.ok(!['absolute','fixed'].includes(pos[pos.length-1][1]),
   `${sel} is ${pos[pos.length-1][1]} — the band would stop stacking and go back to colliding`);
 }
 // And the drawing must read that band rather than assume a height for it.
 const app=readDist('app.js');
 assert.ok(app.includes('footInset'),'the canvas must measure the bottom band');
 // The same correction here: the predicate has to accept relative, or it finds
 // nothing and footInset silently becomes zero.
 assert.ok(/!\['absolute','fixed'\]\.includes\(getComputedStyle\(c\)\.position\)/.test(app),
  'the band measurement must skip out-of-flow children, not only accept static ones');
 assert.ok(!/ctx\.fillText\(num\(landArea\)/.test(app)||/H-footInset-14/.test(app),
  'the land-area annotation must be anchored to the measured band');
 // Horizontally it must clear the sibling it shares the corner with — that
 // label's width is set by the language, so a constant cleared it in English and
 // not in Thai.
 //
 // Vertically it used to be required to measure `.viewfoot`'s own row, and this
 // assertion enforced that. It was wrong, and enforcing it kept a real defect
 // alive: the console hides .viewfoot on a narrow screen, so its rectangle
 // collapses to zero, the expression goes negative, and the Math.max floor
 // silently became the anchor — throwing the triad into the top-left corner with
 // X printed across the View button. Measuring one row is not measuring the
 // band; it is measuring an element that can be absent. footInset is derived
 // from every in-flow child, so it is correct whether or not any one of them is
 // on screen. The horizontal label is still cleared, but only when it exists.
 /* The anchor is measured ONCE and both the triad and the plan's scale bar
   read it. The previous assertion required the declaration to sit immediately
   before the triad's strokeStyle, which was only ever true by accident of
   layout: the moment a second thing needed the same anchor, that adjacency
   became a lie about what the guard was protecting. What has to hold is that
   the anchor is derived from the measured label and band edge, and that
   there is exactly one of it — two copies would drift, and this is the same
   bug the layout measurement was written to end. */
 const all=[...app.matchAll(/const origin=\[([^\]]*)\];/g)];
 assert.equal(all.length,1,'the sheet anchor must be measured once, not copied per drawing');
 const triad=all[0];
 assert.ok(/labelLeft/.test(triad[1])&&/fieldBottom/.test(triad[1]),
  `the triad must be placed against the measured view foot label and the band `+
  `edge, got ${triad[1]}`);
 assert.ok(/labelLeft-vpRect\.left-40/.test(triad[1]),
  'the anchor no longer clears the view foot label horizontally');
 assert.ok(!/footR/.test(triad[1]),
  'the triad must not take its vertical placement from a single band row — '+
  'that row is display:none on a narrow screen, where a Math.max floor becomes '+
  'the anchor and lands the triad on the view tools');
 assert.ok(!/W-60/.test(triad[1]),
  'the triad must measure the view foot label, not sit at a fixed width — that '+
  'offset only clears in one of the three languages');
 assert.ok(/viewfoot span|footEl\.querySelectorAll\('span'\)/.test(app),
  'the triad must read the view foot label it has to clear');
 assert.ok(/footEl&&getComputedStyle\(footEl\)\.display!=='none'/.test(app),
  'the view foot label may only be measured when it is actually displayed');
 // And it still has to clear the band: the land-area label proves footInset is
 // still measured and still used, rather than quietly replaced.
 assert.ok(/H-footInset-14/.test(app),'the land-area label must still clear the measured band');
});

test('the storey datum is knocked out of the drawing and never crosses the dimension',()=>{
 const app=readDist('app.js');
 // Amber text on a curtain wall is not a label. It needs a plate.
 assert.ok(/ctx\.fillStyle='#111416';\s*ctx\.fillRect\(lx-3/.test(app),
  'the storey datum needs a knockout plate in the sheet ground colour');
 // And it must measure itself rather than start at a clamped x and run right.
 assert.ok(app.includes('ctx.measureText(label)'),'the datum must measure its own width');
 assert.ok(!/Math\.min\(pp\[0\]\+12,W-92\)/.test(app),
  'the clamped-start datum is the bug that crossed the dimension gutter');
 // The height graduation adapts to the space, so labels never pile up.
 assert.ok(/const step=dimH<190\?200:dimH<420\?100:50;/.test(app),
  'the height graduation must adapt to a short sheet');
});

/* Walking in means four independent placements, and each one has to reach the
   geometry — not just the slider label.

   The failure this guards is specific and was already paid for once: the camera
   took a lateral offset for the drawing while `elev` and `mpp` still divided by
   the on-axis distance `d`. The picture moved and the numbers did not, so the
   caption reported the angle to a corner the reader was no longer standing
   opposite. These assertions are on the emitted function, because that is where
   the lie lived. */
test('standing off the axis changes the measurement, and turning does not',()=>{
 const s={...defaults,floors:24,program:'custom',height:4};
 const at=(over)=>street(s,k=>k,{d:46,look:16,across:0,turn:0,...over});
 const axis=at({});
 // Stepping sideways increases the true distance to the corner, so the angle it
 // subtends must fall. Unchanged numbers here are the bug, not a rounding.
 assert.ok(at({across:24}).elev<axis.elev,'standing 24 m across did not reduce the subtended angle');
 // And it is symmetric: the same distance either way is the same distance.
 near(at({across:24}).elev,at({across:-24}).elev);
 assert.ok(at({across:24}).mpp!==axis.mpp,'the near-corner scale did not follow the reader');
 // Turning rotates the view; it does not walk the reader anywhere.
 near(at({turn:25}).elev,axis.elev);
 near(at({turn:25}).total,axis.total);
 // And the four stay independent: changing one must not move another's value.
 near(at({turn:25}).elev,at({across:0,turn:-25}).elev);
 // Distance still works the way it did before any of this.
 near(street(s,k=>k,{d:46,look:16}).elev,axis.elev);
 // And the drawing itself has to follow the reader. The numbers above can stay
 // correct while the picture quietly stops moving — which is what happens if the
 // projector forgets the offset but the measurement keeps it — so assert on the
 // emitted SVG, not on a derived value.
 assert.notEqual(at({across:24}).svg,axis.svg,'the drawing does not move when the reader steps across the road');
 assert.notEqual(at({turn:25}).svg,axis.svg,'the drawing does not turn when the reader turns');
 assert.notEqual(street(s,k=>k,{d:60,look:16}).svg,axis.svg,'the drawing does not change with distance');
});

test('the street frame never reports a lens no drawing could have',()=>{
 const s={...defaults,floors:24,program:'custom',height:4};
 for(const turn of [-25,0,25])for(const across of [-24,0,24])for(const look of [0,42]){
  const v=street(s,k=>k,{d:46,look,across,turn});
  assert.ok(Number.isFinite(v.lens)&&v.lens>0,`lens ${v.lens} at turn ${turn} across ${across}`);
  // The cap stated in the note. A fisheye number here is a claim the geometry
  // cannot support, and turning used to produce exactly that.
  assert.ok(v.lens<=110+1e-9,`lens ${v.lens.toFixed(1)}° exceeds the stated 110° cap (turn ${turn}, across ${across})`);
 }
});
