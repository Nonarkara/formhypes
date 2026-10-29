# Solving the brief — the land as a constraint set

**Date:** 2026-10-29 · **Site:** https://shdt.nonarkara.org · **Branch:** `main` · **Base:** `b796944`

## The complaint

Not a message this time. A gap, found by reading the code against the studio's own promise.

The studio's promise is in its name and its lede: *Design the form. Read its value.* The studio could do the second half with some precision. The first half it could not do at all.

The Brief desk asked for a plot, a floor area ratio, a height cap and an area, and it answered with arithmetic: the permitted area is the plot times the ratio, the shortfall is the difference, the headroom is the cap minus the height. Every one of those numbers was correct and none of them ever reached the model. The model's own feasibility — core, envelope, height, levels — was geometry against the studio's assumptions, and the two never met.

So the studio could tell you what a form earns, and could not tell you whether the land would carry it. It ranked candidates that no plot would permit. It could not tell you that the brief you had written was larger than the land you had drawn, because it had never put the two on the same page.

The gap was visible in one number. The default land is 9,000 m² at a ratio of 8, so it carries 72,000 m². Set the ratio to 1 and the studio's own search — 176 candidates, ranked and offered with an **Apply** button — returned every one of them as feasible, each one six and a half times over the allowance, and said nothing about it. The only sign was a red figure in the header, which no reader of a candidate table would connect to the row under their finger.

## What was built

**The brief became a constraint set.** `dist/solve.js` reads the Brief desk's four numbers as clauses: the plot carries `plot × FAR`; the land is a square of side `√plot`; the height cap is the stricter of the brief's cap and the studio's own; the area asked for is the target. `evaluate()` takes those clauses as an optional second argument and refuses a form that breaks one, with two new reasons — `far` (over the allowance) and `plot` (outside the land) — sitting beside the four the model already had.

**The studio can now say no.** Two lines, two subjects, as the studio's own comment has always insisted: the form check reads *Form check · within envelope, height, core and level schedule*, and the land's own line appears beside it only when the land has something to say — *Land check · over the allowance by 13,019 m²*. The land's line is hidden otherwise, because a line that appears only when something is wrong is a line that earns its space.

**The candidate search respects the land.** The run captures the land's clauses once, at the start, and scores every candidate against them. The summary says how many the land refused and why, and when the land refuses everything the desk says so in words and points at the Brief desk, rather than showing an empty table.

**And the Brief desk can now solve it.** A fourth tab, *Solve the brief*, reads the brief as clauses and answers the question the brief actually asks: on this land, at this ratio, under this cap — what can be built here, and which of those is worth building?

## The answer it gives

The default brief asks for 120,000 m² on a plot that carries 72,000 m². The solve says so first, in its own words, before it searches anything:

> Your brief asks for 120,000 m². This plot allows 72,000 m² at floor area ratio 8. The solve below is for the allowance — the most this land can carry.

That is the capability: the studio can now tell the architect their brief is larger than their land, and what the land will carry instead.

It then searches a stated space — eleven plan families, every storey count the height cap allows, the roof scale and twist as the reader has them — and answers with one row per family: the best storey count that family can reach with its height and rentable area beneath the name, then its annual contribution and the difference against the reader's own plan at the same brief. Three columns, not eight: every row delivers the same gross area, so repeating it down a column spent the phone's width on a number that never changed. Every row delivers the same area, so the contribution column is the value of the form and not of its size. The refusals are counted against the first clause each candidate failed, and the numbers add up to the number refused.

A form the land refuses can score higher — it is a bigger, better tower that the land will not carry — and the solver does not offer it. That is the point of a constraint.

## The bounds, stated

* A **bounded search**, not an optimiser: eleven families × the storey counts the cap allows, 528 candidates for the default brief, in about a second.
* The **plot is a square** of the area the reader typed. The studio draws it that way already; the solve reads it the way it is drawn.
* The **floor area ratio is a scenario**, not a code. Nothing on the tab is a compliance check, and the tab says so.
* The **envelope and the span control are the studio's own**, and a form the studio's span control cannot hold is refused with that reason.
* The **roof scale and the twist are held** as the reader has them. The solve finds the form; the Explore desk explores the shape variations of it.

## The model, made fast enough to answer

The solver needed a few hundred full evaluations, and a full evaluation was 28 ms — the studio's own 176-candidate search took five seconds warm, and the first one after a page load cost more in JIT than the search itself.

Four hot paths were rewritten to stop allocating: the skin integration built a two-element array for every sample and read its edge out of an object every sample; the daylight quadrature called `Math.hypot` eight thousand times per evaluation to produce a number nobody read; the corner-zone test allocated a closure per segment test; the plan rebuild used `map` over destructured pairs. The arithmetic is the same expression in the same order, and the proof is a test rather than a promise:

`tests/model-identity.test.mjs` keeps the replaced code verbatim as an oracle and compares it against the current code over 256 plans including the awkward ones — a plan barely larger than its core, a frontage wider than the plan — and over a 55-state recorded run that fixes the studio's answers to fifteen digits. **Zero differences.** The warm search went from 5,000 ms to 1,400 ms; a single evaluation from 28 ms to 5.5 ms.

## Evidence

| check | result |
|---|---|
| Full suite | **722 / 722 pass** (693 before; 29 added) |
| Identity against the replaced code | 0 differences over 256 plans and 55 recorded states |
| Mutation probes | 113 / 113 killed (shipability, release graph, preferences), including 7 new ones for the land's clauses |
| Release graph | every module hashed, every import edge tokenised and content-derived |
| Translation | EN/TH/ZH key sets equal; no Latin fallback in Chinese |
| Browser | the solve tab rendered and run at 390 / 1024 / 1440 in EN, TH and ZH |

## What this is not

It is not a compliance check, and it does not read a building code. The ratio and the plot are the brief's own assumptions; the studio's envelope and span control are the studio's own. It does not replace survey, geotechnical advice, or an architect's judgement about what a client will actually build. It is the studio doing the arithmetic it was already doing — and, for the first time, refusing to give an answer the land will not accept.

## Audit of the handover (2026-10-29, second reader)

The first author ran out of budget before shipping. A second reader took the uncommitted tree and checked it, not the report: the suite was re-run (721 green), the 113 mutation probes were re-run from scratch (all killed), and the Solve tab was opened in a browser at 390 and 1440 px. Three defects survived the first pass, each found by looking at the rendered page or at the call path, not by the suite:

1. **The land line went stale.** `#landCheck` was painted only inside `update()`. The Brief desk's own callback (`onInputs`) repaints the console and the tower but never calls `update()`, so lowering the floor area ratio to 1 left the header's land check silent until an unrelated tower edit. Fixed with `renderLandCheck()`, called from `update()` and from the callback; guarded by a test that reads the callback. Checked live: FAR 8 → 1 gives "Land check · over the allowance by 49,981 m²" at once.
2. **The Solve table was spatial hallucination on a phone.** Eight columns in 390 px: "STOREYS" wrapped one letter per line, values ran together (`33146 m72,000 m²56,892`), rows were 90 px tall for four numbers. Gross area is identical on every row by construction, so one column carried a constant. Now three columns (plan with its facts beneath, contribution with its delta beneath, Use); header on one line; the tab label shortened from "Solve the brief" to "Solve" so it stops clipping.
3. **Thai strings** that were wrong or garbled: "ห้องโจทย์หน้าต่างหา…" (not a sentence), "ยืนอยู่นอกผัง" (buildings stand ตั้งอยู่), "ผังที่ดิน" for a plot.

Known and left: the candidate search captures the land once at its start, by design; editing the brief afterwards does not invalidate a finished run's table until it is re-run.
