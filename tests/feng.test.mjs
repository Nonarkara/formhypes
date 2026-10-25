import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../dist/model.js';
import {cityData, CITY_KEYS} from '../dist/cityscape.js';
import {PALACE, SHAN, STAR, VERSE, yunjian, EAST_GROUP, zhaiGroup,
        bearingOf, sectorOf, mountainOf, sectorMass, readForm, fengStudy,
        luopanSVG, renderFeng, getFengStudy, FENG_I18N} from '../dist/feng.js';

const read = f => readFileSync(new URL('../dist/', import.meta.url).pathname + f, 'utf8');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
/* The one character each star contributes to the published mnemonic. Two
   characters would let a wrong star hide inside a right one. */
const GLYPH = {shengqi:'生', tianyi:'天', yannian:'延', fuwei:'伏', jueming:'绝', wugui:'五', liusha:'六', huohai:'祸'};

test('the eight stars are derived from the trigrams, and reproduce the published mnemonic exactly', () => {
  // This is the load-bearing guard of the whole module. The stars are computed
  // from the trigram bits by the line-change rule; VERSE is the mnemonic those
  // computations are supposed to agree with. If a bit or a rule branch is
  // wrong, the two disagree here and nowhere else.
  assert.equal(Object.keys(VERSE).length, 8);
  for (const p of PALACE) {
    const i = PALACE.indexOf(p);
    // The mnemonic is the seven palaces CLOCKWISE AFTER the home, which is a
    // rotation of the ring and not the array with a hole in it. Only Kan —
    // the first palace — has those two in the same order, so a filter reads as
    // a failure on six correct lines and passes on the two that happen to line up.
    // The home's own 伏位 is the eighth star and is not in the line at all.
    const all = yunjian(i);
    const got = all.slice(i + 1).concat(all.slice(0, i)).map(s => GLYPH[s.k]).join('');
    assert.equal(got, VERSE[p.k],
    `${p.ro}: derived ${got}, the mnemonic says ${VERSE[p.k]}`);
    assert.equal(VERSE[p.k].length, 7, `${p.ro}: the mnemonic line is not seven palaces`);
  }
});

test('the rule itself is the line-change rule, not a table lookup', () => {
  // Change no line → the home palace's own position. Change one line → the star
  // that line alone names. These are the eight cases of the 爻变口诀.
  const home = PALACE[0];
  const stars = yunjian(0);
  assert.equal(stars[0].k, 'fuwei', 'the home palace is its own 伏位');
  assert.equal(stars.map(s => s.luck).reduce((a, b) => a + b, 0), 4,
    'four auspicious, four inauspicious — and only that division is asserted');
  // Top line alone = 生气, middle alone = 绝命, bottom alone = 祸害.
  for (let i = 1; i < 8; i++) {
    const changed = PALACE[i].bits.map((b, j) => b !== home.bits[j]);
    const n = changed.filter(Boolean).length;
    if (n !== 1) continue;
    const only = changed.findIndex(Boolean);
    const want = ['huohai', 'jueming', 'shengqi'][only];
    assert.equal(stars[i].k, want,
    `${PALACE[i].ro} changes only line ${only}, so it must be ${want}`);
  }
  // The four auspicious stars always land inside the home's own group of four.
  for (let i = 0; i < 8; i++) {
    const homeGroup = zhaiGroup(i);
    const good = yunjian(i).map((s, j) => s.luck ? PALACE[j].k : null).filter(Boolean);
    const want = PALACE.filter(p => zhaiGroup(PALACE.indexOf(p)) === homeGroup).map(p => p.k);
    assert.deepEqual(good, want,
    `${PALACE[i].ro}: the four auspicious palaces are not the ${homeGroup} group`);
    assert.equal(good.length, 4);
  }
  assert.equal(EAST_GROUP.length, 4);
});

test('the twenty-four mountains are twenty-four, fifteen degrees each, and name the right palace', () => {
  assert.equal(SHAN.length, 24);
  SHAN.forEach((m, i) => {
    assert.equal(m.deg, i * 15, `${m.ro} is not at ${i * 15} degrees`);
    assert.equal(m.palace, sectorOf(m.deg), `${m.ro} names the wrong palace`);
    assert.match(m.cn, /^[一-鿿]{1,2}$/, `${m.ro} is not a Chinese mountain name`);
  });
  // A sector is 45 degrees wide, so it is named by three mountains: 子 and its
  // neighbours癸丑 all sit in the north palace, and the 8th mountain of each
  // sector belongs to the sector before it.
  for (const m of SHAN) assert.equal(PALACE[m.palace].deg, Math.round(m.deg / 45) % 8 * 45);
});

test('bearings use the model\'s own convention, and the seams wrap instead of clamping', () => {
  // solar.js puts east on +x and north on +y with a bearing clockwise from north.
  // If the ring disagreed with the sun by one axis, every shadow on the site
  // would be rotated and nothing would say so.
  near(bearingOf(0, 1), 0); near(bearingOf(1, 0), 90);
  near(bearingOf(0, -1), 180); near(bearingOf(-1, 0), 270);
  near(bearingOf(1, 1), 45);
  // A palace is 45 degrees wide and centred on its own direction, so it OWNS the
  // degrees either side: 359 is one degree west of north and is still Kan, not
  // Qian. Getting that backwards would silently swap the home palace of every
  // tower whose bearing sits near a seam.
  assert.equal(sectorOf(0), 0); assert.equal(sectorOf(359), 0); assert.equal(sectorOf(352), 0);
  assert.equal(sectorOf(-45), 7, 'a negative bearing must resolve into the circle, not clamp at zero');
  assert.equal(sectorOf(337), 7, 'Qian owns 337.5 and below');
  // The answer changes at the MIDPOINT of a division, not at its edge.
  assert.equal(sectorOf(22.4), 0); assert.equal(sectorOf(22.6), 1);
  // Zi owns 352.5 to 7.5, so the 24-mountain seam falls between Hai and Zi.
  assert.equal(mountainOf(359), 0); assert.equal(mountainOf(-1), 0); assert.equal(mountainOf(360), 0);
  assert.equal(mountainOf(352.4), 23, 'Hai'); assert.equal(mountainOf(352.6), 0, 'Zi');
  assert.equal(mountainOf(7.4), 0); assert.equal(mountainOf(7.6), 1);
});

test('the form layer measures the harvested buildings and attributes them to real sectors', () => {
  // Four buildings placed at known bearings, with known footprints and heights.
  const sq = (cx, cy, r) => [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]];
  const city = {buildings: [
    {ring: sq(0, 60, 10), h: 40},      // due north, 20x20 = 400 m²
    {ring: sq(0, -60, 5), h: 12},      // due south, 10x10 = 100 m²
    {ring: sq(50, 0, 5), h: 25},      // due east, 100 m²
    {ring: sq(0, 400, 5), h: 7}       // far north, outside the ring
  ]};
  const mass = sectorMass(city, 200);
  assert.equal(mass.buildings, 3, 'the building outside the ring was counted');
  assert.equal(mass.sectors[0].count, 1, 'the north building is not in the north palace');
  near(mass.sectors[0].foot, 400); assert.equal(mass.sectors[0].maxH, 40);
  assert.equal(mass.sectors[4].count, 1); near(mass.sectors[4].foot, 100);
  assert.equal(mass.sectors[2].count, 1); near(mass.sectors[2].foot, 100);
  const total = mass.sectors.reduce((a, s) => a + s.count, 0);
  assert.equal(total, mass.buildings, 'buildings were dropped between the sectors and the total');
  // No city at all is a zeroed measurement, not a thrown error and not a guess.
  const empty = sectorMass(null, 200);
  assert.equal(empty.buildings, 0);
  assert.ok(empty.sectors.every(s => s.count === 0 && s.foot === 0 && s.maxH === 0));
});

test('readForm reads the sectors the facing actually points at', () => {
  const sq = (cx, cy, r) => [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]];
  // Heavy to the north and in the corners, nothing at all in front of a due-east
  // seat, so the open court must come back as an actual share of the total.
  const city = {buildings: [
    {ring: sq(0, 60, 10), h: 40},
    {ring: sq(-43, 43, 10), h: 30}, {ring: sq(43, 43, 10), h: 30},
    {ring: sq(-43, -43, 10), h: 30}, {ring: sq(43, -43, 10), h: 30}
  ]};
  const form = readForm(sectorMass(city, 200), 0, 2);
  assert.equal(form.back.built, true);
  assert.equal(form.back.dir, 'N', 'the backing mass is not behind a north seat');
  assert.equal(form.counted, 5);
  // The forward 90 degrees of an east-facing seat are E, NE and SE — and the two
  // corner buildings ARE in it. 800 m² of 2000 is 0.4, not zero, and an earlier
  // version of this test asserted zero and would have "passed" only against a
  // readForm that ignored the corners entirely.
  near(form.front.foot, 0.4, 1e-9);
  assert.equal(form.front.builtFoot, 800);
  assert.equal(form.heaviest.dir, 'N');
  // Four heavy corners leave 0.8 of the footprint in the diagonals, which is not
  // an open set of corners — the reading has to be able to come back "built".
  near(form.corners.foot, 0.8, 1e-9);
  assert.equal(form.corners.open, false);
  // And the opposite site: everything behind, nothing forward or in the corners.
  const open = readForm(sectorMass({buildings:[
    {ring: sq(0, 60, 10), h: 40}, {ring: sq(0, 80, 10), h: 30}]}, 200), 0, 2);
  near(open.front.foot, 0, 1e-9);
  assert.equal(open.corners.open, true);
});

test('the luopan draws north at the top and puts the plot where the model says it is', () => {
  const study = fengStudy({...defaults, orientation: 0}, cityData(defaults.city), null);
  const plan = [[0, 10], [1, 10], [1, 11], [0, 11]];   // ten metres due north
  const svg = luopanSVG({...study, plan, core: 14}, 'en');
  const poly = /<polygon points="([^"]+)"/.exec(svg);
  assert.ok(poly, 'the footprint was not drawn at all');
  // A plot ten metres north sits above the centre. It is not ON it: the ring
  // draws 60 m at R.plan, so 1 m is 0.73 px, and asserting x === 160 would be
  // asserting a rounding that the plan is not obliged to honour.
  const centroid = deg => {
    const n = /<polygon points="([^"]+)"/.exec(
      luopanSVG({...study, plan: [[0, 10], [1, 10], [1, 11], [0, 11]], core: 0}, 'en'))[1]
      .trim().split(/\s+/).map(Number);
    assert.equal(n.length, 8, 'the footprint did not draw as four points');
    return {x: n.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / 4,
            y: n.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / 4};
  };
  const north = centroid(0);
  assert.ok(north.y < 160, 'a plot due north was drawn south of the centre');
  assert.ok(Math.abs(north.x - 160) < 1.5, 'a plot due north drifted sideways');
  // And due east lands to the right of it, not below it.
  const east = /<polygon points="([^"]+)"/.exec(
    luopanSVG({...study, plan: [[10, 0], [11, 0], [11, 1], [10, 1]], core: 0}, 'en'))[1]
    .trim().split(/\s+/).map(Number);
  const ex = east.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / 4;
  const ey = east.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / 4;
  assert.ok(ex > 160, 'a plot due east was not drawn east of the centre');
  assert.ok(Math.abs(ey - 160) < 1.5, 'a plot due east drifted vertically');
});

test('the footprint is placed by the ring\'s mapping and is not turned a second time', () => {
  // profile() has already applied state.orientation. A luopan that rotated the
  // plan again would turn the tower twice, and at bearing zero the older
  // version of this put north below the centre — so this asserts the two
  // renders are identical, which is what "not rotated" means.
  const plan = [[-20, -12], [24, -18], [18, 22], [-16, 14]];
  const at = deg => {
    const st = fengStudy({...defaults, orientation: deg}, cityData(defaults.city), null);
    return /<polygon points="([^"]+)"/.exec(luopanSVG({...st, plan, core: 14}, 'en'))[1];
  };
  assert.equal(at(0), at(90), 'the plot moved when only the sitting bearing changed');
  assert.equal(at(0), at(270));
});

test('the seat needle reaches exactly the bearing the study reports', () => {
  // The needle is the whole 坐向 question: one line out to the mountain the
  // tower sits on. Read the endpoint out of the emitted path.
  const SEAT_R = 114, FACE_R = 56;          // R.shanOut - 4 and R.palIn - 6
  // f2() prints a rounded NUMBER, so 46 is "46" and not "46.00" — formatting
  // the expectation with toFixed(2) looks for a string the drawing never emits.
  const at = (deg, r) => { const a = deg * Math.PI / 180;
    return `L${Math.round((160 + Math.sin(a) * r) * 100) / 100} ${Math.round((160 - Math.cos(a) * r) * 100) / 100}`; };
  for (const deg of [0, 45, 90, 180, 270, 315]) {
    const st = fengStudy({...defaults, orientation: deg}, cityData(defaults.city), null);
    const svg = luopanSVG({...st, core: 0}, 'en');
    assert.ok(svg.includes(at(st.sitDeg, SEAT_R)), `the seat needle does not reach ${st.sitDeg} degrees`);
    assert.ok(svg.includes(at(st.faceDeg, FACE_R)), `the facing needle does not reach ${st.faceDeg} degrees`);
  }
});

test('the study is a pure function of the state and the harvested city, and nothing else', () => {
  const city = cityData(defaults.city);
  const a = fengStudy(defaults, city, null);
  const b = fengStudy(defaults, city, null);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  // Turning the tower four palaces around turns the ring with it — the seat is
  // state.orientation, read once, and there is no second bearing anywhere.
  const rotated = fengStudy({...defaults, orientation: (defaults.orientation + 180) % 360}, city, null);
  assert.equal(rotated.homeIdx, (a.homeIdx + 4) % 8);
  assert.equal(rotated.faceIdx, (a.faceIdx + 4) % 8);
  // ...and nothing about the money moved.
  assert.deepEqual(fengStudy({...defaults, orientation: 137}, city, null).mass.buildings, a.mass.buildings);
  assert.ok(!Object.keys(a).some(k => /rent|cost|capex|revenue|contribution|yield|margin/i.test(k)),
    'the study grew a financial field');
});

test('the measured ring is the harvest radius, and never runs past the data', () => {
  // An earlier version measured span x 4, about 192 m, on the reasoning that a
  // ring scaled to the building is the ring that matters. This site is drawn as a
  // tower in a cleared plot, so that ring measured one building in Bangkok and
  // reported an empty plot in every configuration — a reading that was true and
  // carried no information. The guard now pins the ring to the harvest.
  const c = cityData(defaults.city);
  const st = fengStudy(defaults, c, null);
  assert.equal(st.mass.radius, c.radius, 'the ring is not the radius the harvest actually covers');
  assert.ok(st.mass.buildings > 20, `the ring measured ${st.mass.buildings} buildings — it is not reading the city`);
  // Measuring past the harvest would report absence of data as absence of
  // buildings, which is the quiet way for this desk to lie.
  for (const key of CITY_KEYS) {
    const city = cityData(key);
    const s = fengStudy({...defaults, city:key}, city, null);
    assert.ok(s.mass.radius <= city.radius, `${key}: measured beyond the data`);
    assert.equal(s.mass.buildings, s.mass.sectors.reduce((a, q) => a + q.count, 0),
      `${key}: buildings were lost between the sectors and the total`);
  }
  // No city is a zeroed measurement, not a borrowed one from the last city.
  const none = fengStudy(defaults, null, null);
  assert.equal(none.mass.buildings, 0);
  assert.equal(none.mass.radius, 0);
  // And the sentence that reports an empty sector names the ring it measured.
  for (const l of ['en', 'th', 'zh']) {
    assert.equal((FENG_I18N[l].none.match(/\{0\}/g) || []).length, 1,
      `${l}: the "nothing built" sentence must interpolate the measured ring`);
    assert.doesNotMatch(FENG_I18N[l].none, /\b240\b|\b192\b/, `${l}: a stale fixed radius is back in the copy`);
  }
  assert.ok(FENG_I18N.en.none.replace('{0}', String(c.radius)).includes(String(c.radius)));
});

test('the desk shows the stars it derived, and every element word it names', () => {
  // A study that computes eight stars and prints eight dashes has passed every
  // arithmetic guard in this file. The reader has to be able to see them.
  const out = deskText(renderFeng, 'fengshuiDesk', 'en');
  for (const s of Object.values(STAR)) {
    assert.ok(out.includes(s.cn), `the derived star ${s.cn} is never printed`);
    assert.ok(out.includes(FENG_I18N.en[s.k]), `${s.k} has no gloss in the page`);
  }
  for (const e of ['water', 'earth', 'wood', 'fire', 'metal'])
    assert.ok(out.includes(FENG_I18N.en[e]), `the element ${e} is never printed`);
  for (const m of SHAN) assert.ok(m.cn.length, 'a mountain has no name to draw');
  assert.ok(out.includes(String(fengStudy(defaults, cityData(defaults.city), null).mass.buildings))
    || /buildings/.test(out), 'the desk never says how much it measured');
});

test('the module reaches the ring through the release graph and not around it', () => {
  const app = read('app.js'), rel = readFileSync(new URL('../scripts/release-id.mjs', import.meta.url).pathname, 'utf8');
  assert.match(app, /import \{FENG_I18N, renderFeng,getFengStudy\} from '\.\/feng\.js\?v=[0-9a-f]{10}'/);
  assert.ok(rel.includes("'feng.js'"), 'feng.js is not stamped, so its bytes can change silently');
  assert.ok(rel.includes("'./feng.js'"), 'feng.js is not in the list stamped INTO app.js');
  const ids = read('feng.js');
  assert.match(ids, /from '\.\/model\.js\?v=[0-9a-f]{10}'/, 'feng.js imports an unstamped module');
  assert.match(ids, /from '\.\/cityscape\.js\?v=[0-9a-f]{10}'/);
});

test('the playground in the Form desk keeps its own name and does not own the new one', () => {
  // #fengTitle is the playground's. The desk took its own namespace because a
  // duplicate id makes getElementById return whichever came first — so one of
  // the two Feng Shui panels renders and never updates.
  const html = read('index.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id in index.html');
  for (const id of ['fengshuiPanel', 'fengshuiTitle', 'fengshuiDesk']) assert.ok(ids.includes(id));
  assert.ok(ids.includes('fengTitle'), 'the playground lost its title id');
});

test('every class the stylesheet targets is a class the desk actually sets', () => {
  // The DOM stub reads textContent, and textContent said the right thing: a
  // container whose class name was passed into el()'s TEXT argument renders as
  // a correctly-shaped div that carries no class, no styles and no hooks. It
  // survived every guard in this file and was found by opening the page.
  // So the stylesheet and the render are pinned to each other from both sides.
  const css = read('desks.css').slice(read('desks.css').indexOf('#fengshuiDesk'));
  const needed = new Set([...css.matchAll(/#fengshuiDesk\s+\.([a-z][a-z0-9-]*)/g)].map(m => m[1]));
  assert.ok(needed.size > 8, `only ${needed.size} classes read out of the stylesheet — the anchor moved`);
  const produced = renderedClasses(renderFeng, 'fengshuiDesk', 'en');
  const missing = [...needed].filter(c => !produced.has(c));
  assert.deepEqual(missing, [], `the stylesheet targets classes the desk never sets: ${missing.join(', ')}`);
  // ...and the other direction, so a renamed class cannot leave dead rules behind.
  const dead = [...produced].filter(c => c.startsWith('feng-') && !needed.has(c));
  assert.deepEqual(dead, [], `the desk sets classes the stylesheet does not use: ${dead.join(', ')}`);
});

test('the desk is a real tree: head, one grid of two columns, the table and the sources inside the right column', () => {
  const t = tree(renderFeng, 'fengshuiDesk', 'en');
  // The bottom strip is gone: sources and the study note live inside the right
  // column so the two columns end at the same height. The assertion encodes
  // the argument — columns balance, the desk is one block.
  assert.deepEqual(t.classes, ['feng-head', 'feng-grid'],
    'the desk is a head plus one two-column grid; the dead strip underneath is gone');
  const grid = t.by.class['feng-grid'][0].children;
  assert.deepEqual(grid.map(n => n.cls), ['feng-pane', 'feng-side']);
  // The instrument and its readings are in the left column; the eight palaces in
  // the right. Putting the reading before its numbers is how a conclusion
  // arrives ahead of its evidence.
  assert.ok(t.by.class['feng-lpbox'].length === 1, 'the luopan is not in the desk');
  assert.equal(t.by.class['feng-table'].length, 1);
  assert.equal(t.by.class['feng-forms'].length, 1);
  // Sources now live in the right column under the FACES card, not at the
  // bottom of the desk — one .feng-srcbox still carries exactly one ordered list.
  assert.equal(t.by.class['feng-src'].length, 1);
  assert.equal(t.by.class['feng-srcbox'].length, 1);
  assert.ok(t.by.class['feng-faces'].length === 1, 'the FACES card is missing from the right column');
  assert.ok(t.by.class['feng-ctl'].length === 1, 'there is no control on this desk');
  const table = t.by.class['feng-table'][0];
  assert.equal(table.children.filter(n => n.tag === 'THEAD').length, 1);
  const body = table.children.find(n => n.tag === 'TBODY');
  assert.ok(body, 'the table has no body');
  assert.equal(body.children.length, 8, 'the eight palaces are not eight rows');
});

test('the FACES card names the facing palace and quotes the facing sector, not the home', () => {
  // The FACES card is the half of 坐向 the table does not show: the direction
  // the building's front looks toward. Reading the HOME here is the failure
  // mode of the whole card — same row twice, one answer. Drive the actual
  // render so the assertion reads the emitted text, not a string the test
  // built itself and could quietly disagree with.
  for (const deg of [0, 90, 180, 270]) {
    const st = fengStudy({...defaults, orientation: deg}, cityData(defaults.city), null);
    const {host, seen} = (() => { let host, seen;
      withDom('fengshuiDesk', (h, s) => { host = h; seen = s;
        renderFeng({lang:'en',state:{...defaults,orientation:deg},changed(){}}); });
      return {host, seen}; })();
    const findCls = (root, cls) => { const w = n => n.className===cls ? n : (n.childNodes||[]).reduce((a,c)=>a||w(c), null); return w(root); };
    const card = findCls(host, 'feng-faces');
    assert.ok(card, `${deg}°: the FACES card is missing`);
    const txt = card.textContent;
    assert.ok(txt.includes(st.faceMountain.cn), `${deg}°: FACES does not name ${st.faceMountain.cn}`);
    assert.ok(txt.includes(st.stars[st.faceIdx].cn), `${deg}°: FACES does not quote the facing star`);
    if (st.homeIdx !== st.faceIdx)
      assert.ok(!txt.includes(st.stars[st.homeIdx].cn),
        `${deg}°: FACES reads the home star ${st.stars[st.homeIdx].cn}`);
    const fsect = st.mass.sectors[st.faceIdx];
    // The mass line is "N buildings · FOO m² · HH m" with a thousands
    // separator on the area. The trailing "buildings" is the i18n plural, not
    // a separator, so the substring check stops at the formatted area.
    if (fsect.count) {
      const nf = new Intl.NumberFormat(undefined, {useGrouping: true});
      assert.ok(txt.includes(nf.format(fsect.foot) + ' m²'),
        `${deg}°: FACES omits the facing sector's area (count ${fsect.count}, foot ${fsect.foot})`);
    }
  }
});

test('the desk measures this plot — its own city lookup, not a null one', () => {
  // renderFeng looks the harvested city up itself, and it once indexed
  // cityData instead of calling it. The result was a desk that rendered
  // perfectly, passed every guard in this file, and measured nothing at all:
  // "0 buildings", "nothing built", every sector empty. Nothing below reads the
  // study object directly, so the only way to see it is to read the page.
  const st = fengStudy(defaults, cityData(defaults.city), null);
  assert.ok(st.mass.buildings > 20, 'the harvest itself is too thin to be a useful guard');
  const out = deskText(renderFeng, 'fengshuiDesk', 'en');
  assert.ok(out.includes(String(st.mass.buildings)),
    'the desk never prints how many buildings it measured');
  assert.ok(out.includes(String(st.mass.radius)),
    'the desk never prints the ring it measured');
  assert.ok(!out.includes(FENG_I18N.en.none.replace('{0}', String(st.mass.radius))),
    'the desk calls this ring empty while the harvest has buildings standing in it');
});

test('the tier string is guarded as well — it is the sentence that travels in the export', () => {
  // desks.test.mjs bans overclaiming inside the i18n dictionaries. This string is
  // not in a dictionary: it is written straight into the study JSON, where the
  // reader of the file has no desk and no footnote to go back to. A mutation
  // that rewrote it into "that improves the outlook" passed every other guard,
  // because no other guard reads it.
  const CLAIM = [/\b(?:guarantee|guarantees|prove|proves|improves?|increases?|raises?|boosts?|ensures?|certif)/i,
                 /\b(?:is|are|will be) (?:safe|approved|compliant|beneficial|lucky|better)\b/i];
  const NEGATED = /\bno\b[^.]*\b(?:claim|effect|outcome|rent|safety|prediction)\b/i;
  for (const [name, st] of [
    ['fengStudy', fengStudy(defaults, cityData(defaults.city), null)],
    ['getFengStudy', getFengStudy(defaults, cityData(defaults.city))]]) {
    assert.equal(typeof st?.tier, 'string', `${name}: no tier`);
    assert.ok(st.tier.length > 20, `${name}: the tier says too little to be a limit`);
    for (const rx of CLAIM)
      assert.doesNotMatch(st.tier, rx, `${name}.tier claims an effect: "${st.tier}"`);
    assert.match(st.tier, NEGATED, `${name}.tier does not say what it has no effect on`);
  }
});

/* A DOM small enough to read, from desks.test.mjs. It records the class of every
   node it builds, because textContent alone cannot tell a styled column from an
   unstyled one. */
function stub(tag, seen) {
  const n = {tagName:String(tag || '').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_h:'',
    className:'',id:'',htmlFor:'',type:'',value:'',
    get className(){return this._c},
    set className(v){this._c=String(v);if(this._c)seen&&seen.add(this._c)},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    querySelector(){return null},closest(){return null},focus(){},click(){},
    appendChild(c){this.childNodes.push(c);return c},
    get children(){return this.childNodes},
    append(...cs){for(const c of cs)this.childNodes.push(c)},
    replaceChildren(...args){this.childNodes=[...args];return this},
    contains(){return false},
    setAttribute(k,v){this.attrs[k]=v},
    getAttribute(k){return this.attrs[k]},
    addEventListener(){},removeEventListener(){},
    checkValidity(){return true},reportValidity(){return true},
    get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
    set textContent(v){this._t=String(v);this.childNodes=[]},
    get innerHTML(){return this._h},
    set innerHTML(v){this._h=String(v);
      // Injected markup carries its own classes — the luopan sets .feng-lp on
      // the <svg> it hands back as a string, and a stub that ignored that would
      // report a class the desk really does produce as missing.
      for(const [,c] of String(v).matchAll(/class="([^"]+)"/g)) for(const n of c.split(/\s+/)) seen&&seen.add(n)}};
  return n;
}
function withDom(id, fn) {
  const host = stub('div'), seen = new Set(), real = globalThis.document;
  globalThis.document = {
    createElement:t=>stub(t,seen), createElementNS:(ns,t)=>stub(t,seen),
    createTextNode:t=>{const n=stub('#text',seen);n.textContent=t;return n},
    createDocumentFragment:()=>stub('#fragment',seen),
    getElementById:k=>k===id?host:null, activeElement:{id:''}};
  try { return fn(host, seen); } finally { globalThis.document = real; }
}
const deskText = (render,id,lang) => withDom(id, host => { render({lang,state:defaults,changed(){},onInputs(){}}); return host.textContent; });
const renderedClasses = (render,id,lang) => withDom(id, (host, seen) => { render({lang,state:defaults,changed(){},onInputs(){}}); return seen; });

/* The same tree, read structurally: the host's own children plus an index by
   class name, so a guard can ask what shape the desk came out in and not only
   what it said. */
function tree(render,id,lang) {
  return withDom(id, host => {
    render({lang,state:defaults,changed(){},onInputs(){}});
    const by = {class:{}};
    const walk = n => { const r = {tag:n.tagName, cls:n.className, children:n.childNodes.map(walk)};
      if (r.cls) (by.class[r.cls] ||= []).push(r); return r; };
    const top = host.childNodes.map(walk);
    return {classes: top.map(r => r.cls), by, top};
  });
}
test('palace names and readings have separate ink baselines at every compass bearing',()=>{
 const st=fengStudy({...defaults,orientation:0},cityData(defaults.city),null);
 for(const lang of ['en','th','zh']){
  const labels=[...luopanSVG(st,lang).matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(m=>({size:Number(m[1].match(/font-size="([\d.]+)"/)?.[1]),y:Number(m[1].match(/\by="([\d.-]+)"/)?.[1])})).filter(n=>n.size===8||n.size===6.5);
  assert.equal(labels.length,16);
  for(let i=0;i<labels.length;i+=2)assert.ok(Math.abs(labels[i].y-labels[i+1].y)>=(labels[i].size+labels[i+1].size)/2,lang+' palace '+i/2+' label overlap');
 }
});
