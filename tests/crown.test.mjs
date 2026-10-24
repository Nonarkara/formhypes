// What the reader can put on top of the building.
//
// The crown library already carried five crowns — a flat roof, a stepped
// setback, a helipad, the Petronas post and an aviation mast — and the studio
// offered all of them. What it did not carry was the type the reader most
// often asks for: a figure, the kind of thing that makes a tower a landmark
// rather than a stack. The Petronas post is there; the statue is not.
//
// These tests pin the new crown as a crown: it is drawn, it is measured, it is
// priced, it is counted against the height allowance, and it is named in all
// three languages. A crown that exists in the table and nowhere else is a
// figure on the roof of the interface and nowhere else.
import test from 'node:test';
import assert from 'node:assert/strict';
import {CROWNS, CROWNS_KEYS, crownPlates, crownOf, crownMetrics, crownHeightTreatment} from '../dist/crowns.js';
import {defaults, evaluate, massingRings} from '../dist/model.js';
import {t} from '../dist/i18n.js';

const CJK = /[㐀-鿿豈-﫿]/;

test('the library offers a figure to put on top, and it is a crown like the rest', () => {
  assert.ok(CROWNS.figure, 'there is no figure crown');
  const f = CROWNS.figure;
  assert.ok(f.h > 0, 'the figure has no height, so it would not be drawn');
  assert.equal(f.draw, 'figure', 'the figure is not drawn as a figure');
  assert.equal(f.use, 'landmark', 'a figure is not an observation deck and not plant');
  assert.ok(f.foot > 0 && f.foot < 1, 'the figure plan is not a fraction of the roof');
  // It is counted in full against the height allowance: it is not occupied, and
  // a noncombustible spire being excluded from the allowance is a local ruling,
  // not a default.
  const treat = crownHeightTreatment({...defaults, crown: 'figure'});
  assert.equal(treat.counted, f.h, 'the figure is not counted in full against the allowance');
  assert.equal(treat.habitable, false, 'a figure is not habitation');
  assert.equal(treat.excluded, false, 'the figure is excluded from the allowance by default');
});

test('the figure is drawn as a figure: wider than the pedestal it stands on', () => {
  /* The first version of this crown was drawn as a plinth, a pedestal, and a
     NARROWER top — which is a mast with a name, and read as one on the
     screen. A figure is wider than the thing it stands on. */
  const plates = crownPlates(CROWNS.figure);
  assert.equal(plates.length, 3, 'the figure is not a plinth, a pedestal and a figure');
  assert.ok(plates[0].t === 0, 'the crown does not start at the roof');
  for (let i = 1; i < plates.length; i++)
    assert.ok(plates[i].t > plates[i - 1].t, 'the crown is not stacked in order');
  const pedestal = plates[1].f, figure = plates[2].f;
  assert.ok(figure > pedestal,
    `the figure is ${figure} wide on a ${pedestal} pedestal, so the drawing reads as a mast`);
  // And it is on the roof, not in the middle of it.
  assert.ok(plates[0].f > plates[1].f, 'the plinth is narrower than the pedestal above it');
});

test('a figure costs money and earns nothing, and says so', () => {
  const m = crownMetrics({...defaults, crown: 'figure'}, 1000);
  assert.equal(m.h, CROWNS.figure.h, 'the crown height is not the one the library states');
  assert.ok(m.capital > 0, 'a figure costs nothing to build');
  assert.ok(m.reserve > 0, 'a figure costs nothing to keep');
  assert.equal(m.observationArea, 0, 'a figure carries an observation deck');
  assert.equal(m.netRent, 0, 'a figure earns rent');
  // And the tower is taller with it on.
  const withFigure = evaluate({...defaults, crown: 'figure'});
  const mast = evaluate({...defaults, crown: 'mast'});
  assert.equal(withFigure.heightTotal - evaluate({...defaults, crown: 'flat'}).heightTotal, CROWNS.figure.h,
    'the figure does not spend the height allowance the floors spend');
  // The flat roof's own plan is the whole roof plate, so a slim crown can
  // carry less capital than it; the figure is measured against the mast,
  // which is the other thing that stands on the roof.
  assert.ok(withFigure.capex > mast.capex, 'the figure costs less capital than a mast');
});

test('the figure is in the model that gets drawn and exported', () => {
  const rings = massingRings({...defaults, crown: 'figure'});
  const crowns = rings.filter(r => r.kind === 'crown');
  assert.ok(crowns.length >= 2, 'the figure is not in the massing rings');
  const top = crowns.at(-1);
  const body = rings.find(r => r.kind === 'body');
  assert.ok(top.z > body.z, 'the figure is not above the roof');
});

test('every crown is named in every language, and the figure is no exception', () => {
  for (const key of CROWNS_KEYS) {
    for (const lang of ['en', 'th', 'zh']) {
      assert.ok(t[lang]['crown.' + key], `the crown "${key}" has no name in ${lang}`);
      assert.ok(t[lang]['crown.reads.' + key], `the crown "${key}" has no note in ${lang}`);
      assert.ok(!CJK.test(t[lang]['crown.' + key]) || lang === 'zh',
        `the crown "${key}" carries CJK in ${lang}`);
    }
  }
  assert.equal(t.en['crown.figure'], 'Figure on a pedestal');
  // The precedents are named, and they are named in the note rather than in
  // the number: the height is FormHypes' own set value.
  assert.match(t.en['crown.reads.figure'], /Rio/);
  assert.match(t.en['crown.reads.figure'], /Volgograd/);
});

test('a crown that is not in the library cannot be chosen', () => {
  assert.equal(crownOf({crown: 'figure'}), CROWNS.figure);
  assert.equal(crownOf({crown: 'nonsense'}), CROWNS.flat, 'a nonsense crown silently became the flat roof');
});
