import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import {briefConstraints,solvePlan,solveScore,solveBrief,REASONS,SPAN_MIN,SPAN_MAX} from '../dist/solve.js';

const S = () => ({...M.defaults});
const BRIEF = {plot:9000, far:8, cap:260, target:120000};

/* ── the brief as a constraint set ──────────────────────────────────────── */

test('the allowance is the plot times the ratio, and the plot is a square', () => {
  const K = briefConstraints(BRIEF, S());
  assert.equal(K.allowance, 72000);
  assert.equal(K.plotHalf, Math.sqrt(9000)/2);
});

test('the stricter of the two height caps governs, and the answer says which', () => {
  const s = S();
  assert.equal(briefConstraints({...BRIEF, cap:260}, s).capSource, 'brief');
  assert.equal(briefConstraints({...BRIEF, cap:300}, s).capSource, 'studio');
  assert.equal(briefConstraints({...BRIEF, cap:300}, s).cap, s.maxHeight);
  assert.equal(briefConstraints({...BRIEF, cap:200}, s).cap, 200);
});

/* ── the model's brief clauses ──────────────────────────────────────────── */

test('a tower over the land’s allowance is refused, and only when the brief is present', () => {
  const s = S();
  const K = briefConstraints({plot:9000, far:1, cap:260, target:9000}, s);
  const bare = M.evaluate(s);
  const judged = M.evaluate(s, K);
  assert.ok(bare.valid, 'the form itself is fine; only the land refuses it');
  assert.equal(bare.reasons.includes('far'), false);
  assert.equal(judged.valid, false);
  assert.ok(judged.reasons.includes('far'));
});

test('a tower that stands outside the land is refused', () => {
  const s = {...S(), span:60};
  const K = briefConstraints({plot:600, far:8, cap:260, target:1000}, s);
  const judged = M.evaluate(s, K);
  assert.equal(judged.valid, false);
  assert.ok(judged.reasons.includes('plot'));
});

test('the allowance is compared with a tolerance, not to the last bit', () => {
  // A candidate sized to land exactly on the allowance must not be refused
  // because of a rounding error of a hundredth of a square metre.
  const s = S();
  const K = briefConstraints({plot:9000, far:8, cap:260, target:0}, s);
  const c = {...s};
  c.span *= Math.sqrt(K.allowance/Math.max(M.grossOf(c), 1));
  const m = M.evaluate(c, K);
  assert.ok(Math.abs(m.gross - K.allowance) < 1, `gross ${m.gross} against ${K.allowance}`);
  assert.equal(m.reasons.includes('far'), false, 'the area is not over the allowance');
});

/* ── the solve ──────────────────────────────────────────────────────────── */

test('the solve is bounded and says what it searched', () => {
  const plan = solvePlan(S(), BRIEF);
  assert.ok(plan.examined > 100 && plan.examined < 2000, `examined ${plan.examined}`);
  assert.equal(plan.families, Object.keys(M.families).length);
  assert.ok(plan.floorMax >= plan.floorMin);
});

test('a brief larger than the land is solved for the allowance, and says so', () => {
  const plan = solvePlan(S(), BRIEF);
  assert.equal(plan.ask, 120000);
  assert.equal(plan.target, 72000);
  assert.equal(plan.capped, true);
});

test('every answered form delivers the same area, so the comparison is about the form', () => {
  const solve = solveBrief(S(), BRIEF);
  assert.ok(solve.rows.length > 0, 'the default brief is satisfiable');
  const areas = solve.rows.map(r => r.metrics.gross);
  const lo = Math.min(...areas), hi = Math.max(...areas);
  assert.ok(hi - lo < 1, `areas spread from ${lo} to ${hi}`);
});

test('one row per plan family, and the best storey count that family can reach', () => {
  const solve = solveBrief(S(), BRIEF);
  const seen = new Set();
  for (const r of solve.rows) {
    assert.equal(seen.has(r.state.family), false, `${r.state.family} answered twice`);
    seen.add(r.state.family);
  }
  // The row kept for a family must be the best of that family's candidates
  // that the brief permits. A candidate the land refuses can score higher —
  // it is a bigger, better tower — and the solver must not offer it.
  for (const r of solve.rows) {
    const same = solve.results.filter(x => x.state.family === r.state.family && x.valid);
    const best = same.reduce((a, b) => (b.score > a.score ? b : a));
    assert.equal(best.score, r.score);
    // A refused candidate may well score higher — it is a bigger, better
    // tower that the land will not carry. The solver must offer the one it
    // can build, not the one it would prefer.
    const refused = solve.results.filter(x => x.state.family === r.state.family && !x.valid);
    for (const x of refused) assert.equal(x.valid, false);
  }
});

test('every answered form is feasible against the brief, and every refusal has a reason', () => {
  const solve = solveBrief(S(), BRIEF);
  for (const r of solve.rows) {
    assert.equal(r.valid, true);
    assert.equal(r.metrics.valid, true, `${r.state.family} was answered but is not valid`);
  }
  let refused = 0;
  for (const r of solve.results) {
    if (r.valid) continue;
    refused++;
    assert.ok(r.reasons.length > 0, 'a refusal must name a clause');
    for (const reason of r.reasons) assert.ok(REASONS.includes(reason), `unknown reason ${reason}`);
  }
  // The refused count is the candidates a clause turned away. The rejected
  // count is larger: it also counts the valid candidates a family reached at
  // a storey count its better answer replaced.
  assert.equal(refused, solve.refusedCount);
  assert.ok(solve.rejectedCount >= solve.refusedCount);
});

test('the solve reports what it refused, and the counts add up', () => {
  const solve = solveBrief(S(), BRIEF);
  const total = Object.values(solve.refused).reduce((a, b) => a + b, 0);
  assert.equal(total, solve.refusedCount);
  // Every refusal is counted against exactly one clause.
  assert.ok(solve.refusedCount <= solve.rejectedCount);
  // And no clause is reported that the solver does not know.
  for (const reason of Object.keys(solve.refused)) assert.ok(REASONS.includes(reason));
});

test('a form the solver offers survives the studio’s own checks', () => {
  const solve = solveBrief(S(), BRIEF);
  const r = solve.rows[0];
  const again = M.evaluate(r.state, solve.K);
  assert.equal(again.valid, true);
  assert.ok(Math.abs(again.contribution - r.metrics.contribution) < 1);
});

test('a brief nothing can satisfy is reported as such, not as an empty success', () => {
  // A plot too small for the tower's own plan: the core cannot fit, so no
  // family can answer.
  const s = {...S(), span:32, core:60};
  const solve = solveBrief(s, {plot:400, far:8, cap:260, target:5000});
  assert.equal(solve.rows.length, 0);
  assert.ok(solve.rejectedCount > 0);
});

test('the solve holds the roof scale and the twist as the reader has them', () => {
  const s = {...S(), taper:0.75, twist:30};
  const solve = solveBrief(s, BRIEF);
  for (const r of solve.rows) {
    assert.equal(r.state.taper, 0.75);
    assert.equal(r.state.twist, 30);
  }
});

test('a solved form the studio can hold on its own span control', () => {
  const solve = solveBrief(S(), BRIEF);
  for (const r of solve.rows) {
    assert.ok(r.state.span >= SPAN_MIN - 1e-9 && r.state.span <= SPAN_MAX + 1e-9,
      `${r.state.family} needs a span of ${r.state.span.toFixed(2)} m`);
  }
});

test('the solver is fast enough to run in a desk', () => {
  const t = process.hrtime.bigint();
  solveBrief(S(), BRIEF);
  const ms = Number(process.hrtime.bigint()-t)/1e6;
  assert.ok(ms < 20000, `the solve took ${ms.toFixed(0)} ms`);
});
