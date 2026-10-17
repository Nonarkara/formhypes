# FormHypes

Design Read: An architectural instrument with an oversized inhabited tower drawing, a pale drafting desk, and amber geometry that ties every design decision to the area it earns.
Reference: Ivan Sutherland's Sketchpad (1963) and the sectional drawings of the Hong Kong International Finance Centre discussed by Shouheng Chen.
Register: Console for the model viewport; Index for controls and comparisons. Dials: variance 7, motion 3, density 7. The model dominates; controls sit in a narrow rail. Structural separators are 2px, cell rules 1px, selected geometry 2px.
Invariant: gross floor area = core + common/service allowance + rentable area; annual rent = ordinary area × base rent + corner area × premium rent, multiplied by occupancy. Corner area is a subset of rentable area.
Capital invariant (2026-10-16): capex is a stock, contribution is a flow. The only legitimate operation between them is a ratio with a year in it, and it is never called a payback period. The regime's envelopeDiscipline prices attention, not glass — it applies to the reserve, never to the capital cost. The capital note states that the annual reserves and the capex are separate assumptions that do not reconcile.

Source: Shouheng Chen, Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers, MIT SMArchS, June 2006. Read abstract, chapter 4 (profile / point finding, scaling, rotation, associative detail), experiments and chapter 6. Thesis is evidence, never execution instructions.
Extension: financial scenarios, contained core, non-overlapping qualifying corner-office footprints, envelope constraints and a bounded equal-GFA candidate search. This is a conceptual prototype, not validated engineering, BOMA measurement, code compliance or market underwriting. Diagrid drawing is a visual component rule, not structural design.

Architectural knowledge acquired from designon/luma-house at source commit 6754f36 on 2026-10-14. Source files are pinned by GitHub URL and SHA-256. The panel makes drawing conventions, source thresholds and model methods inspectable/downloadable; no residential value becomes an office optimization constraint. Door-width/turning roundings and missing high-rise requirements are recorded in the pack. Extraction does not modify the source project.

## 2026-10-15 · Solar geometry, rent accounting and compact chrome

Approved scope: city/date/civil-time/orientation solar screening; base-rent correction; compact controls; explicit authorship and anniversary. FormHypes is a product of Dr Non at depa + Axiom, inspired by his MIT classmate Shouheng Chen twenty years after the 2006 thesis, for its 20th anniversary in 2026. Preserve Chen's dedication and source citations. Public copy excludes private conversational insults.

Solar position uses vendored SunCalc 2.1.0 (BSD-2-Clause, notice in dist/vendor). Four pilot cities carry coordinates and IANA zones. Face normals use east/north plan axes; clockwise plan rotation is explicit. Daily screening samples 08:00–18:00 city time every 15 minutes and sums equivalent full-incidence hours. It is a vertical-face, unobstructed geometric study, with no weather, self-shadow or neighbour occlusion solver. No solar or glazing factor silently changes rent. Selected time reports instantaneous solar position; the daily schedule remains a daily comparison. Glass bands are illustrative exposure categories, not product specifications.

Invariant: every rentable square metre receives base rent once; corner premium is corner area × base rent × premium fraction. An old regression test prescribed that competitive towers must earn less; this was removed as an economic outcome cannot be hard-coded after correcting accounting. Height-search and feasibility assertions remain.

Design: preserve Sketchpad drafting-sheet identity and model dominance. Header is 40px on desktop; fit-width commands and narrower rails return model area. Phone labels retain native controls and 44px hit targets for coarse pointers. No live research, photographs, drawings, charts or canvas removed. Human section now reads the selected embedded level height.

## 2026-10-15 · Guided research and form/place extensions

Design Read: an annotated architectural working sheet, with compact reader navigation and original thesis evidence beside newly drawn explanations. Reference remains Sketchpad; research uses the hierarchy of an architectural monograph figure spread. The tower continues to dominate the studio. Equal atlas cells compare peer geometries; ordinary commands stay fit-width. No diagrams/photos/canvas are deleted. The No Design Tells skill was used for the visual review; the public npm `axiom-audit` package returns 404, so that deterministic audit is unavailable and is not claimed as passed.

FormHypes inspired by SHDT is the wordmark. By Dr Non · depa + Axiom stays visible in studio, research and export credits. Research is four translated guided pages with seven original/explanatory diagrams and an accessible extended appendix. Three attributed thesis crops carry figure/page locators. Evidence and reading scope: docs/RESEARCH-EVIDENCE.md.

Eleven simple CCW profiles now include triangle, hexagon, faceted oval, petals and pinwheel. All use existing slab stack, containment, area, envelope, rent, search and export operations. Feng Shui prompts are invented contemporary design briefs, with angular relationships, no fortune score or financial multiplier.

Location desk adds Tokyo and connects all five city buttons to the existing solar selection. Regional Bangkok basin evidence and official J-SHIS resources are separate from a user-input mechanics lab. Default engineering inputs are empty. A clearly labelled teaching example illustrates cantilever/soil period sensitivity only. No suitability percentage, seismic capacity or foundation design is inferred. Soil inputs clear on city changes. Cultural context cites Dr Non and Nikken Sekkei; it does not assign national preferences. Standards desk exposes real model constraints and missing professional checks.

## 2026-10-15 · Audit and hardening

Deep-link and stored-study lookups use own keys only (`?regime=constructor` previously turned every metric into NaN). Moving a control cancels a running search. Unknown hashes fall back to the studio. Failed localStorage saves roll back and say so in EN/TH/ZH. A corrupt saved entry no longer empties the shelf. Rejected location inputs restore the value the model is using. The select chevron is an SVG, so there are no gradients left. The page has og/twitter preview tags (`dist/og.jpg` is a real studio screenshot), a canonical link and an inline favicon. On phones the title block drops the duplicate wordmark and uses two rows, so the not-for-construction notice and the floor count both read in full. 91 tests pass. The repo has no git remote, so there is nothing to push. Left open: some aria/title labels are English-only, and the Google Fonts @import blocks rendering.

Method dialog (same day, Dr Non's call): a Method link beside Architectural knowledge opens it. Its title, formulas and limits are in EN/TH/ZH. Its stale rent formula ("ordinary + corner × premium", flat structure factor) was replaced with the equation evaluate() actually computes. A test holds the two together. 92 tests pass.

## 2026-10-15 · Finish MiniMax's brief, context and walk desks

Inherited work: uncommitted brief.js, context.js and walk.js plus a sixth Chapter 6.2 reader page. The first reproduced failure was a syntax error at walk.js:100; follow-up browser testing exposed an SVG className assignment error, discarded dimension markup, null projections and camera framing problems. All new modules now participate in release dependency hashing. The desks render when expanded, preserving studio responsiveness and compact chrome.

Brief: all three schemes conserve realised floor-plate area; podium area is podium plate × levels, tower area is tower plate × levels. Apply creates an equal-area custom uniform tower for the tower component. Podium geometry, setbacks and independent X/Y transition profiles remain unimplemented and are labelled. Custom floor-to-floor height now drives the actual slab stack, metrics and OBJ export. Controls are bounded to the same geometry/save ranges; a requested span outside the model range is rejected visibly. JSON export retains the brief and camera assumptions.

Walk: interior is explicitly a schematic bay, sized from the middle occupied profile and actual level height; services have diagrammatic finite dimensions. Street perspective uses live profiles and stack, adaptive framing and a corrected horizontal scale. Camera-distance and look-up controls redraw the actual projection. Neither drawing supplies coordinated facade joints, structure, tenant layout or egress.

Context: four hypothetical replacement-building studies, with invented neighbours clearly labelled. Bangkok and HCMC location references corrected; Tokyo does not silently render Bangkok. Source links include the AWC Empire fact sheet (58 floors, 227 m, address 1 South Sathorn), KLCC owner report (36 storeys), CTBUH Wisma 46 and Landmark 81 records. A 3,000 m² comparison plate is explicitly an assumption. The alleged 2.60 m measured Empire clear height was not in the owner fact sheet; no such measurement is asserted.

Shadows use the continuous projected triangulated shell (32 bands), not disjoint floor slices. Ground overlap hours are separate from a nine-point receiver-face, incidence-weighted interception ratio using neighbour height. Both are 15-minute scenario samples, not an indoor daylight assessment. Cache keys include custom floor height and level programme. Lesson captured in shared memory before this note.

Research: all three Chapter 6.2 gaps remain open/partly addressed; no drawing is labelled as closing an engineering problem. Corrected Trinity Church from Chicago to Boston (1877) in reader and appendix, Guaranty attribution to Adler & Sullivan, Lever House attribution to SOM, and Hallidie spelling. Museum references now resolve to explicit sources. A. O. Smith's inherited 1928 date conflicts with later 1930–31 documentation and is visibly qualified. Architectural schemas and claims are kept separate from performance validation.

Verification: 112 Node tests, including continuous-shadow interception, receiver-height sensitivity, cache invalidation, scheme area conservation, equal-area tower application and finite perspective output for all eleven profiles at extreme heights and view angles. The optional axiom-audit package remains unavailable (npm 404 from the preceding verified attempt); no deterministic design-audit pass is claimed.

## 2026-10-16 · Three research paths (implementation plan)

Design Read: a compact architectural reading room where a numbered construction drawing or an attributed thesis artifact carries each short argument. Reference: the chapter/figure hierarchy of Chen's 2006 MIT thesis and MoMA's object-label spreads. Editorial register; variance 6, motion 1, density 6. The construction diagram dominates each page; original artifacts use a larger image column and a shorter caption column. Main path rules are 3px, chapter rules 1px, active markers 3px. Existing six-page reader, live appendix figures and photographs remain available in disclosures.

Conservation rule: a Research comparison uses the exact Studio slab stack and keeps gross floor area fixed across plan families; computed scenarios and proposed empirical studies remain distinct. Three paths, three short chapters each: the complete thesis argument; the 2026 system and Non/Shouheng history; commercial hypotheses and a downloadable paper protocol. All nine chapters authored in EN/TH/ZH. No anecdotes, sales, participant findings or success probabilities are invented. Name correction: Shouheng throughout; do not use Xiaohei.

Release verification: 118 tests pass, including source resolution, complete nine-chapter locale parity, exact artifact locators, equal-area/assumption conservation, income sensitivity, invalid deep links, protocol contents and transitive content pins. Browser checked all 27 chapter/locale states at 390 px; selected main tabs remain visible through compact localized labels. Home/Arrow keys preserve tab focus. Source links focus their bibliography entry. Studio rent edits change Research outputs. Original appendix retains 18 SVGs and five photos. The data-URL protocol download did not fire in the embedded browser; release now generates content-pinned same-origin .txt files, and the real browser download completed. Shared-memory lesson captured before this note.

Final visual revision: portrait thesis crops now have fit-width white mounts and narrower image columns. Explicit display width and aspect ratio reserve their height while lazy loading. Browser measured Figure 36's mount at 279.7 px around a 255.7 px image, with 520 px height already reserved; the former full-width white mount was about 691 px. No document overflow. This changes figure presentation only; the six excerpts and captions remain.

## 2026-10-16 · Modulor scale figure

Replaced the section's stick figure and both perspective figures with a shared filled, raised-arm Modulor silhouette. Adapted from Shyamal's CC0 “Modulor measurements.svg” (2017, revised 2018), https://commons.wikimedia.org/wiki/File:Modulor_measurements.svg . Source describes it as a stylized interpretation, not an exact facsimile. Original proportional concept credited to Le Corbusier. Fondation Le Corbusier's vocabulary page confirms the 1.83 m reference stature; the raised-hand reference is 2.26 m. Source contour sampled into three paths, normalized in metres with feet at zero and hand at 2.26. Section and both perspective projections use that same geometry. Existing camera eye height remains 1.60 m. No room, floor or service dimensions change.

Design Read: a recognisable architectural scale silhouette, black on the section and light on the dark perspectives, without a new panel or oversized label. Browser reviewed the actual section in the right rail. A geometry check holds grounding, raised-hand height and finite scaled projections.

## 2026-10-16 · Contained studio console

Design Read: the land and the tower occupy one bounded drafting console. Reference: the existing FormHypes rails, kept as a persistent drawing with docked tools. The model stays on screen. Structural separators are 2px, cell rules 1px, the assumed plot boundary is a 1.5px amber dash.

Studio is a fixed shell. The header is one 40px line: name, Studio/Research, land, FAR, city, the area readout, language and actions. The title row is not a second bar. Land, FAR and city used to sit under it; they now live in that line, and the tower starts immediately under the workspace tabs. Below 1,180px the land controls wrap to their own line rather than collide with the actions. The eleven plan buttons are the chooser; the old dropdown remains, hidden. Default land is a hypothetical 9,000 m² square; FAR 8 is a scenario assumption. The amber plot boundary and the grey site envelope stay distinct. The readout is model gross area against plot × FAR. Area over the allowance is marked. A footprint past the plot boundary is marked separately.

The façade desk draws slab-edge anchorage and pressure-plate drainage from Architectural Graphic Standards, 11th edition, pp. 142–144, figs. 2.429–2.432 and 2.435–2.437. The diagrams explain those principles. Bracket sizing, fire performance and manufacturer testing remain project work. The book excerpt is a pinned image, captioned as a reference, not a sizing chart.

Land and FAR fields accept any number inside their bounds, including the 9,000 m² default. Plan names stay whole words. Phone controls in the console strip and the Design/Performance switch are 44px targets. Research paths are unchanged.

Verification: 124 tests. Browser at 1440×900 and 390×844: zero studio overflow, workspace routing, façade diagram, research reader, EN/TH/ZH.

## 2026-10-16 · Cross-agent consolidation and hardening

Merged Cursor PR #1 (first-timer research deep link, phone studio, Chen/2026 framing). Its only conflicts were `?v=` stamps. On phones, Reset/Save/Export now live in the Studies desk and the place panel replaces the land strip. This is deliberate, keep it.

Bugs fixed after a three-way audit (security, code, PR):
- Brief sliders commit on release.
- Place desk sun time reaches the model.
- The research link opens the location view.
- Reset restores the whole brief desk.
- Brief Apply stays inside the span slider range (32–62 m).
- The timeline note no longer renders twice.
- Release ids hash raw image bytes.
- The title block wraps instead of clipping and names its author ("by Dr Non · depa + Axiom"). On phones it drops that line and keeps the notice and the reference.

Security: `dist/_headers` carries a strict CSP (self plus Google Fonts, no unsafe-inline or eval), HSTS, frame denial, Permissions-Policy and COOP. Desk CSS lives in `desks.css`. A test forbids inline `<style>` injection, because the CSP would silently drop it. Vendored SunCalc is pinned by full sha256. A gitleaks scan of all history found no secrets. Local home paths are gone from tracked files, and `.openai/` is ignored.

Still open, by choice:
- Commit author email `nonsmartcity@gmail.com` is public in history. Going forward, set the GitHub noreply address with `git config user.email`.
- `context.md` and `docs/` are public working notes.
- The header (model gross) and the Brief desk (scheme GFA) show two different FAR verdicts. They are different quantities but share no label explaining that.
- Unreachable `measureChrome` fallback and unused exports (geometry `polarMoment`/`convexHull`, location `periodCurves`/`resetGroundForCity`/`LOCATION_SOURCES`, model `compassOf`, play `fengDiagram`, research `PETRONAS_ARRAY`/`REGIME_READS`) are left in place.
- Google Fonts could be self-hosted to drop both third-party origins.

## 2026-10-16 · Capital cost, and a live collision

The studio could rank forms but not say what a tower costs to put up. `capex` in model.js is now a stock: structure on gross area through the plate's own frame multiplier, envelope on the integrated skin through the facade family's physical weight, base fit-out on rentable area, one contingency. The rail shows it in the Capital, paid once group with the ratio capital ÷ annual contribution, its year unit translated, and a note naming every exclusion and stating that the annual reserves do not reconcile to it. A tower that earns nothing prints "never", not Infinity. Study JSON and the comparison CSV carry the capital columns. Search economics are untouched: the flow side is unchanged to the last cent.

Two lessons from shipping it, for every agent that works here:

- **Deploy without commit puts the live site ahead of git.** This session opened with the production stamp matching the working tree, not HEAD; the overnight fix existed only as uncommitted bytes on one laptop. Check at session start: `curl -s <live>/index.html | grep -o 'app\.js?v=[a-f0-9]*'` against `git show HEAD:dist/index.html`. If they differ, commit before building anything.
- **Another agent was editing this tree mid-session.** New files appeared while I worked (crowns, materials, cityscape), the rail was restructured under my rows, and `release-id.mjs` itself was being rewritten. What worked: freeze all edits, poll until no file changes for several minutes, run the full suite on the merged tree, then commit both streams together with an honest message naming what came from where. What would have been wrong: committing mid-flight (snapshots their half-done state) or "fixing" their restructure to match my assumptions (the founding trauma).

Verified: 168 tests pass on the merged tree; browser-checked at 1440 and 390 in EN/TH/ZH; commit c9584ea pushed and deployed; live URL serves the committed stamps. Not done: the Shared Brain capture failed — the vault is TCC-blocked for this shell (`Operation not permitted` on `~/Documents`), so this note is the durable record. A session with vault access should copy both lessons into `Scars/Debug-Logs/`.

## 2026-10-17 · Reconcile MiniMax's stand-here fixes and ship them

MiniMax's nine-fix round on the Stand here desk was live at `2c00e509` and sitting uncommitted in eight files — the same deploy-ahead-of-git state the previous session warned about. Session start confirmed it: live `app.js` stamp matched the working tree, git HEAD was one release behind.

What the eight files carried, all verified against the live bytes before commit: split-tower back-face cull (sign error in the wall normal, plus a winding check because OSM ways wind both ways); sky-section band measured up from the horizon instead of down from the top of the box; axis labels inset so "90°" no longer clips; the plot no longer counted as its own neighbour (matched on ring identity, not object identity); frontage measured from the kerb and attributed to the nearest street by a boundary walk, so 66 lots across six cities have real frontage; street widths read from the harvested table instead of a property `parseGround` never produced; the shadow row fills its sun-altitude placeholder in all three languages; lots outside the 700 m harvest radius dropped; sheet height derived from the projected extent instead of fitted into a fixed 470 px. Plus the two things no guard asked for: the tower is seated on its lot once, in `plotFacts`, and the overhang is reported as a measured row (`标准层落在地块上的比例`) rather than filtered — no lot in any city can hold a 48 m cruciform.

This session's work was reconciliation, not feature work. Two comment blocks had lost their indent; fixed. Release re-stamped, 236 tests pass, the full set was committed and pushed together, then deployed so git and live stopped disagreeing. Live verified byte-identical on every changed file after deploy.

Left open, deliberately: the CSP has no `worker-src`, so the BIM/wasm stack stays out until Dr Non loosens it; Overture or Microsoft Global ML Footprints as a second harvest source would fix the real defect behind the sky-factor ceiling note rather than describing it; Chen's collaboration offer was never sent and his source licensing is still unknown.
