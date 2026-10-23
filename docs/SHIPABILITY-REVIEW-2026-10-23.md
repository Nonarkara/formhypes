# FormHypes shipability review · 23 October 2026

Scope: `main` at `3f209a8` plus this session's two repairs; the deployed site at
`https://shdt.nonarkara.org`; the release graph, the test suite, the mutation
harness and the live reader journey. Target: a reader can finish the task the
instrument asks of them — choose a scenario, set a brief, adjust a form, compare
equal-area alternatives, inspect what changed, save, reload, export — in the
language they are reading in, on the device they are holding.

This is a concept release. It does not establish structural adequacy, code
compliance, market value, indoor daylight or energy performance.

## What was checked, and how

| Surface | How | Result |
| --- | --- | --- |
| The test suite | `npm test` | 569 green (was 557) |
| The mutation harness | `scripts/probe-shipability.mjs` | 32 of 32 mutants killed (was 20) |
| The release graph | read from `scripts/release-id.mjs` and the emitted tree | 48/48 modules hashed, 127/127 edges versioned, every token equals the hash of the bytes it points at |
| The live journey | the deployed site, driven through CDP, EN | boot → brief → form → compare → apply → save → reload → export, 0 console errors |
| The reader journey in three languages | the deployed site, TH and ZH | 0 console errors; the material names were English |
| The candidate table | 390 / 1024 / 1440, in three languages | the action was off-screen at 390 and 1024 |

## Found

**1. The material names were English on the Thai and Chinese sites.** The
twelve materials are common nouns — a wall of float glass is float glass in
every language — but the name came straight out of the English table in
`dist/materials.js`. Measured on the live site: in Thai the select's first
option read `Float glass, clear`, the note began `Float glass, clear · Sears
Tower 1929`, and all twelve swatches carried English accessible names. In
Chinese the same. English was correct, so the defect was invisible in an
English render and invisible in a source read. The strings existed; they were
the wrong ones.

**2. The explore desk's action was off-screen.** The candidate table is wider
than a phone and scrolls sideways, and the Apply button was the last column.
At 390 it sat **125px past the right edge of the viewport** and the Δ column
was cut mid-token, showing `+U`; at 1024 the button was 62px off and the Δ
column was cut by one pixel. The table needed 487px in a 354px box. The desk's
job is to compare five candidates and apply one; on a phone the reader could
read the money and could not press anything.

**3. The rule that hid two columns was positional.** The two columns that are
identical in every row by construction — gross and rentable — were hidden with
`.console-dock .tablewrap th:nth-child(3)`. A rule that hides by position is a
rule that moves with the columns: the day the order changed, it would have
hidden a column that still carried a value, and nothing would have said so.

**4. The release graph had no guard.** Forty-eight modules and a hundred and
twenty-seven edges were correct by hand. Nothing would have noticed a new
module, or a new import edge, arriving without a version token — which is the
one failure the whole stamping apparatus exists to prevent.

## Changed

**The material names.** Twelve names in three languages now live in the string
table, beside the crowns and the façade families, which is where the house
already keeps a name that has to survive translation. `dist/app.js` reads them
in the select, in the note and in the swatch's accessible name and tooltip.
The private copy of the same list in `dist/quantity.js` is deleted, so the
schedule and the studio cannot disagree about what a material is called. The
new edge — quantity → i18n — is pinned by the stamper, because a schedule whose
header names a cladding differently from the studio is a schedule that
disagrees with the page it was taken from.

**The candidate table.** The columns now read in the order the decision is
made: the candidate, the two money columns, then the drivers that produced
them, then the action. The action is pinned to the right edge of the scroller
with a 1px rule and an opaque ground — no shadow, no blur, no gradient, no
floating panel. The two identical columns are hidden by name.

**The guards.** Twelve new tests in three files, and the mutation harness grown
from twenty probes to thirty-two:

- `tests/material-name.test.mjs` — the twelve names exist in three languages,
  are not the English word in Thai or Chinese, and reach the reader through the
  **shipped** select builder, the **shipped** note and the **shipped**
  schedule.
- `tests/explore-table.test.mjs` — the column order, the column names, the
  hiding by name, and the pinned action read out of the shipped builder and the
  emitted stylesheet.
- `tests/release-graph.test.mjs` — every shipped module is hashed, every edge
  carries a token, the stamper's own lists cover every edge, and every token
  equals the hash of the bytes it points at. A tree that has been edited and
  not stamped now fails the suite, and says so.

## Verified

- **The journey, live.** Boot with 0 console errors; changing the objective;
  setting a brief; changing the family (cross → star moved the contribution
  from $25,865,055 to $20,051,699); the comparison (5 candidates, 176 tested /
  168 feasible / 8 rejected); applying a candidate (the row's $22,013,770
  became the page's); saving a study (shelf 1, "Study saved in this browser");
  reloading the page (the study survived); exporting (OBJ 35,587 bytes, study
  JSON 25,327 bytes, two CSVs, all with real content).
- **The table, in three languages, at three widths.** At 390 and 1024 the
  candidate, the contribution, the delta and the Apply button are all inside
  the viewport, in English, Thai and Chinese. The action sits flush on the
  right edge with its hairline; the columns under it scroll.
- **The release graph.** 48/48 modules hashed by the stamper, 127/127 edges
  carrying a token that equals the hash of the bytes it points at, nothing
  pointing at a file that is not there.
- **The suite and the harness.** 569 tests green; 32 of 32 mutants killed,
  each one breaking a different thing — the select falling back to English, the
  note named in English, the swatch named in English, the schedule named in
  English, a Thai name replaced by the English one, the action column moved,
  the columns losing their names, the hiding by position again, the action
  unpinned, a module shipping unhashed, an import edge left out of the stamp.

## Remaining

- The drivers — roof/twist, corners, height — still scroll sideways at 390.
  In English the roof value is clipped by 4px at the scroll edge. That is a
  scroller's edge, and the alternative was to drop a column, which is not the
  house's trade.
- The candidate name wraps at 390 ("3 / Eight-point" over two lines). The name
  stays whole; the row number wraps with it.
- The brief desk is a separate instrument from the model: it computes a
  scheme's own ledger and an explicit "apply" step. This audit's first reading
  of "changing the brief moved no numbers" was a measurement error — it read
  the model's area instead of the brief's ledger.
- `app.js` and `i18n.js` remain hubs, and the `app.js` identifier assertions
  remain textual. Dr Non's call.
- The main book's tenth page remains Dr Non's call.
- Chen's licensing is unknown and stays deferred. Do not contact him.
- Pre-existing and untouched: the CSP has no `worker-src`; Overpass is
  unreliable; there is no authenticated RHIKNOWBOT session; `_archive/` sits at
  the SHDT root; 25 preview deployments cannot be deleted.

## Three traps in the instrument, recorded

1. **A closed `<details>` reports a stale rect.** Its descendants answer
   `checkVisibility() === false` but still return a non-zero `getBoundingClientRect()`.
   An overlap audit that filters on size alone will invent an overlap that is
   not on the page. Filter with `checkVisibility()`.
2. **`python3 -m http.server` is single-threaded.** Chrome opens six parallel
   module connections, the server keeps one alive, the rest stall, and the page
   reports "Failed to fetch dynamically imported module" — for a site that is
   perfectly fine. The local build was served by a threaded server before it
   could be measured.
3. **`captureBeyondViewport: true` returns the whole page,** not the viewport.
   Read the PNG's own dimensions before calling an image "the first screen".
