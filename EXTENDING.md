# Extending FormHypes

How to change this system without breaking it. Written for the next person who
touches it — which is usually me, a month later, with no memory of it.

The site is plain ES modules served as static files. There is no build step for
the front end and no framework. `npm` runs three things: a stamper, a test
runner, and a deployer. Everything else is a file you edit.

Read this before your first edit. Most of the traps below cost an afternoon.

---

## 1. The shape of the system

One model, many readings of it.

```
dist/model.js      the building: plans, families, profiles, costs   ← the truth
dist/geometry.js   plan maths (areas, perimeters, offsets)
dist/solar.js      sun position, shading, façade exposure
dist/core.js       core section + core arithmetic (lift speed, risers)
dist/core3d.js     core geometry only — no arithmetic
dist/drafting.js   the drawing vocabulary: poché, leaders, dimensions, notes
dist/i18n.js       the interface strings for the desks
dist/reader*.js    the research section (pages, diagrams, sources)
dist/console.js    the bar of workspaces; mounts each one
dist/app.js        the landing page and the 3D view; imports everything
```

**The rule that holds it together: one module per kind of claim.** `core3d.js`
is geometry, `core.js` is arithmetic, `drafting.js` is vocabulary. A module that
does two of those is a module that will be edited by two people at once.

The labs — `lifts.js`, `fire.js`, `wind.js`, `water.js`, `glare.js`, `carbon.js`
— each own their computation, their drawing, their strings and their tests.
**No lab imports another lab.** They meet only through `model.js`. Keep it that
way: a lab that imports another lab is a lab that can no longer be moved.

### The sixteen workspaces

`form` · `brief` · `core` · `lifts` · `fire` · `wind` · `water` · `glare` ·
`carbon` · `detail` · `facade` · `place` · `feng` · `walk` · `compare` ·
`studies`

### The desk modules in the release graph

`structure.js` · `facade.js` · `brief.js` · `walk.js` · `context.js` ·
`explore.js` · `feng.js` · `wind.js` · `water.js` · `glare.js` · `lifts.js` ·
`fire.js` · `carbon.js`

---

## 2. Adding a workspace (a desk on the bar)

A workspace is a panel on the secondary bar. Sixteen exist today.

To add one:

1. **Write the module** `dist/<name>.js`. It exports:
   - the computation, as pure exported functions — no DOM, no globals;
   - `render<Name>Desk({host, state, metrics, lang, changed, apply})`;
   - its own strings, as `<NAME>_TEXT = {en:{…}, th:{…}, zh:{…}}`.
2. **Add it to `WORKSPACES`** in `dist/console.js`. The bar is built from that
   array, and the key is also the tab id (`console-tab-<key>`) and the glyph
   slot in the console rail.
3. **Add a glyph** to the console rail. `tests/desks.test.mjs` asserts every
   workspace has exactly one drawn mark, and that no two share one.
4. **Add the file to `DESKS`** in `scripts/release-id.mjs` — *not* `SHARED`.
   `DESKS` is the list of files that get stamped against their dependencies;
   `SHARED` is for raw-hashed files with no import edges.
5. **Add the import to `IN_APP`** in the same script, if the new module is
   loaded by `app.js`.
6. **Add the CSS** to `dist/console.css` (shared) or a new `dist/<name>.css`
   (add it to `SHARED` and to `IN_HTML` in the same script).
7. **Write the test** `tests/<name>.test.mjs`. It must actually *run* the
   renderer against the DOM stub and read the text back — see
   `tests/desks.test.mjs` for the stub. A test that only checks a name appears
   in a source file proves nothing.

Six files. No refactoring of anything else.

---

## 3. Adding a lab (a workspace that calculates)

Same as above, plus:

- **Draw it.** A lab that prints numbers and no drawing is a calculator, and the
  whole point of this system is that a number you can see is a number you can
  argue with. Use `dist/drafting.js`:
  ```js
  import {sheet,cut,beyond,leader,head,dim,rule,txt,ground,flow} from './drafting.js';
  ```
  `sheet(body, w, h, label)` closes a drawing: it emits the `<svg>`, the
  `<defs>` for the poché patterns, and the annotation layer. Notes are
  **registered** with `txt()` / `leader()` and drawn last, on top, with their
  collisions resolved. Do not write `<text>` yourself.
- **Do not hand-write a `?v=` token.** The stamper owns every version string. A
  hand-written token is a token that rots the moment the file it points at is
  edited.
- **Draw the method, not just the answer.** A lab's canvas shows the result.
  The method deserves its own sheet: where the number comes from, and which
  term of the arithmetic dominates. This is what turns a paragraph into a
  picture, and it is the house's standing preference.

---

## 4. The drawing rules

The vocabulary in `dist/drafting.js` is not decoration — it encodes the
difference between a detail and a diagram.

- **Poche.** A section CUTS material. The cut face is filled *by material*:
  concrete is hatched, metal is solid, glass is an outline because a cut pane
  of glass would lie about what glass looks like. `cut()` vs `beyond()`.
- **Leaders.** A label floats nowhere. It sits at the end of a leader that lands
  on the thing it names, with a dot terminator. Use `leader()`, not `txt()`, for
  anything that points at something.
- **Dimensions** terminate in slashes, not arrowheads. `dim()`.
- **The arrowhead belongs to flow** — water, air, smoke — and to nothing else.
  `head()`.
- **Break lines** for anything that continues. `brkV()`.
- **Centre lines** dash-dot, for anything with an axis. `cl()`.
- **Below grade is drawn.** Heavy ground line, earth hatch. `ground()`.

The exports, in full: `sheet`, `cut`, `beyond`, `matOf`, `leader`, `note`,
`txt`, `dim`, `rule`, `flow`, `head`, `brkV`, `cl`, `ground`, `layout`,
`pendingNotes`, `adv`, `FIELD`, `DEFS`.

- `DEFS` is the shared `<defs>` block — the poché pattern definitions. Every
  sheet carries it, and the ids are fixed on purpose: the browser resolving two
  of them to one is the intended behaviour, not a collision.
- `matOf` maps a material key to its fill and stroke. The keys are `metal`,
  `steel`, `wool`, `conc`, `earth`, `seal`, `board`, `glass`, `beyond`, `void`.
- `note` registers a loose note; `layout` is the collision resolver that
  `sheet` runs; `pendingNotes` reports how many notes are registered but not
  yet drawn — a guard can use it to catch an orphan.
- `adv` is the advance width of a string at a given size: `.6 em` a glyph in
  IBM Plex Mono, a full `em` for a CJK glyph, which falls back to Noto Sans
  SC. Measure a label with it rather than counting its characters — a `ch` is
  the width of a zero, and a CJK glyph is not a zero.
- `FIELD` is the standard drawing field size (`250 × 150`).

Colours are CSS variables, never literals: `var(--ink)`, `var(--muted)`,
`var(--faint)`, `var(--accent)` (amber `#f59e0b`), `var(--panel)`.

**House style, everywhere:** no gradients, no rounded corners, no blur, no
box-shadow. 1px and 2px structural rules. Sharp edges. Dark drafting ground.

---

## 5. Languages

Every dict has exactly three keys: `en`, `th`, `zh`.

- **Identical key sets** across the three. A key added to one and not another
  fails `tests/desks.test.mjs`.
- **No value may be empty.**
- **`en` and `th` must contain NO CJK at all.** The guard regex is
  `[㐀-鿿豈-﫿]`. Pushing an English sentence into the Thai dict is a failure.
- **`zh` MUST contain CJK** — unless the key is in the `PROPER_NOUN` allowlist
  in `tests/desks.test.mjs` (Latin names that are not transliterations: model
  names, standard numbers).
- **More than 30 keys per dict.** A dict with twelve keys is a stub.
- **Thai uses IBM Plex Sans Thai.** Never Sarabun. Chinese uses Noto Sans SC.
  On canvas, name the faces explicitly — the mono face first, then the non-looped
  Thai, then the Chinese — or the labels fall back to a looped system face.
- Chinese quotes are 「」. Em-dashes are spaced: ` — `.

**Threshold floors scale with script density.** Chinese carries the same answer
in about half the characters English needs, so a flat floor can only be
satisfied by padding one script. The reader's floors are `{en:60, th:50, zh:26}`.
Use the same shape when you add one.

---

## 6. The guard rules

A test is worth writing only if it would fail when the thing is wrong.

- **A guard must read the emitted artifact.** Assert on the SVG string, the
  rendered DOM, the computed number — not on the presence of an identifier in a
  source file. `"includes('export function foo')"` proves the word is on the
  page.
- **Prefer numeric assertions over textual ones.** If the drawing shows a
  number, extract it from the markup and compare it to the value the module
  computed. That is the assertion that catches a drawing drifting away from the
  arithmetic.
- **Mutation-test every new guard.** Put the defect back and watch it go red.
  `.scratch/mutate_*.mjs` is where these live. A guard that has never been red
  is a guess.
- **Find things by what they are, not by position.** `READER[lang].pages.find(p
  => p.diagram==='work')`, never `pages[6]`. Inserting a page later must not
  silently re-point every assertion at the wrong one.
- **Existing identifier-style assertions are a known debt.** There are some in
  `tests/extensions.test.mjs` and `tests/desks.test.mjs`. Do not add more.

---

## 7. The commands, and the order they must run in

Run `npm ci --ignore-scripts` after cloning or updating the lockfile. Acorn is
a locked development dependency for the release-graph guard; it adds no bytes
to the public application. CI installs it before running the checks.

```bash
node scripts/release-id.mjs      # 1. stamp every ?v= token
npm test                         # 2. every test file in tests/
node scripts/deploy.mjs          # 3. deploy (refuses a dirty working tree)
git push origin main             # 4. push — deploy does NOT push
```

`npm run deploy` = stamp → test → deploy. It does not push, and it **refuses
to deploy a dirty tree**.

**Stamp before deploy, always.** Cloudflare Pages serves assets with a
four-hour cache and the HTML with no cache. Without a version token a returning
visitor gets the new shell driving four-hour-old JavaScript. The stamp is what
stops the freshness window from being load-bearing.

**Deploy before push, and push after.** A pushed commit that was never
deployed is a lie in the history.

---

## 8. The traps

- **A half-landed merge.** A feature staged but not wired passes the eye and
  fails five unrelated tests. `git status` before you start; if a test fails
  for a reason you did not cause, look at what is staged.
- **A stale stamp.** Chrome serves the old bytes until the stamper runs. If a
  change does not appear on the site, run the stamper before you debug
  anything else.
- **A dirty tree.** The deployer rejects it. Commit or stash first.
- **Heredocs.** `cat > file <<'EOF'` for multi-line JavaScript ships as comment
  syntax and silently produces an empty file. Write real files.
- **Broken Python quoting.** `open(p, encoding='utf-8'')` — the extra quote is
  not a typo you can survive.
- **Relative import spacing.** The house style is `import{a}from'./x.js'` with no
  spaces. The guard regex is `\bfrom\s*['"]`, and a grep for `from './x.js'`
  misses the house form.
- **The green window.** A test that renders nothing because the DOM stub was not
  installed will pass. Check that the render actually produced text.
- **PNG bytes hashed as text.** A UTF-8 decode of a PNG collapses invalid runs
  to U+FFFD, so an edited image can keep its hash. The stamper hashes the raw
  bytes for this reason — don't "simplify" it.

---

## 9. What is deliberately not finished

- **Chen's licensing.** His 2006 thesis is read, never copied. The commercial
  terms are Dr Non's decision and are not settled. **Do not contact him.**
- **The Skyscraper Economy Lab.** Gated on a sourced cost-versus-height curve.
  Not started, deliberately.
- **Mobile.** Landscape laptop first. Equal area is the standing priority.
- **CSP `worker-src`.** Not set, by decision.
- **Identifier-style assertions** in two test files, listed above.

---

*Maintained by hand. `tests/extending.test.mjs` checks the parts of this file
that can go stale — the workspace list, the release graph, the language list —
and fails if they drift apart.*
