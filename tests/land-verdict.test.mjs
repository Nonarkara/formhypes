import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {defaults, evaluate, fitsSquare} from '../dist/model.js';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
// The real controller functions, run against a fixed studio and a fixed land.
const source = app.slice(
  app.indexOf('function landConstraints(){'),
  app.indexOf('\n}', app.indexOf('function landVerdict(){')) + 2);
assert.ok(source.includes('function landVerdict'), 'the land verdict must be found in the controller');

function verdict({plot = 9000, far = 8, cap = 260, gfa = 120000, state = defaults} = {}) {
  const ctx = {
    state, metrics: {gross: evaluate(state).gross},
    getBriefStudy: () => ({inputs: {plot, far, cap, gfa}}),
    briefConstraints: (b) => ({
      plot: b.plot, far: b.far, target: b.target, cap: b.cap,
      allowance: b.plot * b.far, plotHalf: Math.sqrt(b.plot) / 2,
    }),
    fitsSquare, tt: (k, v) => (v ? `${k}:${JSON.stringify(v)}` : k), lang: 'en',
  };
  runInNewContext(source + '\nthis.answer=landVerdict();', ctx);
  return ctx.answer;
}

test('the land says nothing when the land has nothing to say', () => {
  // The default studio on the default land: inside the allowance, on the plot.
  assert.equal(verdict(), null);
});

test('the land names the allowance when the tower is over it', () => {
  const answer = verdict({far: 1});
  assert.ok(answer, 'a tower over the allowance must be reported');
  assert.match(answer, /m\.land\.over/);
  assert.match(answer, /m\.chk\.land/);
});

test('the land names the plot when the tower stands outside it', () => {
  const answer = verdict({plot: 600, far: 8});
  assert.ok(answer);
  assert.match(answer, /m\.land\.out/);
});

test('the land’s own line is separate from the form’s own line', () => {
  // The form check and the land check answer to different questions, and the
  // studio's own comment says so. The land's line must name its subject.
  const answer = verdict({far: 1});
  assert.match(answer, /m\.chk\.land/);
  assert.doesNotMatch(answer, /m\.chk\.form/);
});

test('a land with no allowance and no plot is not a land', () => {
  assert.equal(verdict({plot: 0, far: 0}), null);
});

test('editing the brief moves the land line without a tower edit', () => {
  // The Brief desk's callback is the only thing that runs when the plot or the
  // ratio changes. If it does not repaint the land line, the line is stale
  // until some unrelated tower edit happens to call update().
  const desk = app.slice(app.indexOf('function renderDesks()'), app.indexOf('\n', app.indexOf('function renderDesks()')));
  assert.match(desk, /onInputs:\(\)=>\{[^}]*renderLandCheck\(\)/, 'the brief callback repaints the land line');
});
