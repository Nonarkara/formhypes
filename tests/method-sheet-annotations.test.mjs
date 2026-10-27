import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {windRead,windMethodPayload,windMethodSVG} from '../dist/wind.js';
import {fireRead,fireMethodSVG} from '../dist/fire.js';
import {supplyDesign,waterMethodPayload,waterMethodSVG} from '../dist/water.js';
import {carbonRead,carbonMethodSVG} from '../dist/carbon.js';
import {glareDay,glareMethodPayload,glareMethodSVG} from '../dist/glare.js';
import {liftPlan,liftsMethodPayload,liftsMethodSVG} from '../dist/lifts.js';
import {drawingWidth} from '../dist/drawing-viewer.js';

/* The enlarged method sheets.

   The viewer sizes its copy from the smallest annotation the sheet declares.
   A <text> with no font-size is invisible to that measurement: the viewer
   reads what it can, enlarges to suit, and the annotation that declared
   nothing is left at its natural size — below the sixteen pixels the viewer
   exists to guarantee. Nothing on the page says so.

   The viewer's own test mocks the sheet, and the mock answers any selector
   with one text element of a given size, so it cannot see a sheet that has
   no size to give, and it cannot see a selector that has stopped matching.

   This test reads the six REAL sheets instead, and hands the shipped sizing
   function a view of the real markup. */

const texts = svg => [...svg.matchAll(/<text\b([^>]*)>/g)].map(m => {
  const size = /font-size="([^"]*)"/.exec(m[1]);
  return {size: size ? size[1] : null, attrs: m[1]};
});
const viewBox = svg => (/<svg[^>]*viewBox="([^"]*)"/.exec(svg) || [])[1] || null;

// A view of the emitted markup with the interface the viewer actually uses.
const asElement = svg => {
  const t = texts(svg);
  return {
    getAttribute: key => (key === 'viewBox' ? viewBox(svg) : null),
    querySelectorAll: sel => (sel === 'text'
      ? t.map(x => ({getAttribute: key => (key === 'font-size' ? x.size : null)}))
      : []),
  };
};

function sheets() {
  const tower = {...defaults, program: 'petronas', floors: 48};
  const wind = windRead(tower, {});
  const fire = fireRead(tower, {});
  const water = supplyDesign(defaults, evaluate(defaults), {use: 'residential'});
  const carbonOptions = {concrete: 'C40/50', ggbs: 25, rebarEAF: 56, steelEAF: 46, km: 300, core: defaults.core};
  const carbon = carbonRead({...defaults, system: 'diagrid', floors: 40}, carbonOptions);
  const day = glareDay({...defaults, family: 'cross'}, {city: 'bangkok', date: '2026-06-21'});
  const plan = liftPlan(defaults, {}, evaluate(defaults));
  return [
    ['wind', windMethodSVG(windMethodPayload(wind), {lang: 'en'})],
    ['fire', fireMethodSVG(fire, {lang: 'en'})],
    ['water', waterMethodSVG(waterMethodPayload(water), {lang: 'en'})],
    ['carbon', carbonMethodSVG({h: carbon.here, tower: carbon.hereTw, system: carbon.system, options: carbonOptions}, {lang: 'en'})],
    ['glare', glareMethodSVG(glareMethodPayload(day), {lang: 'en'})],
    ['lifts', liftsMethodSVG(liftsMethodPayload(plan), {lang: 'en'})],
  ];
}

test('every annotation on the six real method sheets declares a size', () => {
  for (const [name, svg] of sheets()) {
    const t = texts(svg);
    assert.ok(t.length > 0, name + ': the sheet carries no annotations at all');
    for (const x of t) {
      const size = parseFloat(x.size);
      assert.ok(Number.isFinite(size) && size > 0,
        name + ': an annotation declares no usable size — "' + x.size + '" in <text' + x.attrs + '>');
    }
  }
});

test('the viewer enlarges the real sheets so the smallest annotation reads', () => {
  for (const [name, svg] of sheets()) {
    const t = texts(svg);
    const min = Math.min(...t.map(x => parseFloat(x.size)));
    const vb = Number(String(viewBox(svg)).split(/[ ,]+/)[2]);
    assert.ok(Number.isFinite(vb) && vb > 0, name + ': the sheet has no usable viewBox');
    const width = drawingWidth(asElement(svg));
    assert.ok(width >= 1000, name + ': the viewer produced no enlargement');
    // The smallest annotation is what the enlargement is set by, so it is the
    // one that has to be legible. Every other annotation is larger.
    assert.ok(min * width / vb >= 16,
      name + ': the smallest annotation reads at ' + (min * width / vb).toFixed(1) + 'px, under sixteen');
  }
});
