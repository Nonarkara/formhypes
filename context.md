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

## 2026-10-18 · Reconcile Explore, interaction and phone efficiency

Invariant: candidates retain the equal-GFA snapshot that produced them; changing the objective changes only scoring. Applying a candidate moves the current-tower reference without changing the comparison set. Geometry/model edits invalidate the run. Regime formulas and all earned drawings, desks, research and three-language content remain.

Design Read: the existing Sketchpad drawing with a readable, operable comparison sheet beside it. Reference remains Sutherland's Sketchpad; the tower dominates. Family bands use the actual desk width, one shared contribution scale and readable labels, with complete 44px row hit areas on phones. The lattice retains every cell with 44px touch height, translated action/geometry/value names and stable keyboard focus. A tablet header rule had overridden the phone layout: the phone now uses 44px for named destinations and language controls plus the persistent 20px area ledger, 64px total in EN/TH/ZH. Decorative top navigation marks hide only on phones; all nine workspace drawings remain.

Search: changing objective during the first sliced run formerly published old scores under the new selector label. Completion now scores the latest objective; completed runs rerank captured metrics, including after Apply. Summaries name the captured rule and explicitly name height/silhouette for City competition. Its prose now says envelope cost is excluded from ranking, consistent with heightPull=1. Candidate evaluation yields after an 8ms budget (one candidate is indivisible). Slider edits no longer build an unused 176/352-candidate plan just to print a count. Local model benchmark: 176 fresh evaluations 291.36ms, cached rerank 0.054ms; this excludes DOM redraw.

Integration: remote PR #2's f988c0d has the identical tree and stable patch id as main's 1f9721b. It contains no unintegrated work. Closed the duplicate PR without merging its old bytes or deleting its branch.

Verification: 277 Node tests pass, including execution of actual controller functions under a deterministic scheduler, fresh-vs-cached scores for all six objectives across all four regimes, cancellation/replacement, captured summary labels and focus restoration. Six deliberate lifecycle/focus mutations fail. Independent review passed screenshots at 1440, 1024 and 390px, plus Thai and Chinese phone layouts. Browser preview confirms no document overflow, 64px phone header, 44px cells and retained family keyboard focus. Shared-memory lesson captured before this entry. Release content stamps include every changed dependency; production closeout requires commit, push, deploy and byte/live checks.

## 2026-10-18 · Shipability contracts and source research

Audited the agent history and compared primary sources for Honeybee/Dragonfly, IFC, SkyscraperSim, val3dity, pymoo, Overture and OpenSees. Findings and pinned repository metadata are in docs/SHIPABILITY-REVIEW-2026-10-18.md. The useful next architecture is shared contracts plus independently checked adapters, with actual human task trials before broader claims.

Implemented shared crown/body rings for outer OBJ and context shadows, outward triangulated export, crown-aware height caps, search floor bounds shared with persistence, complete validated Brief restoration, storage-deletion rollback, a ground cache that survives redraws, and director-approved Civic/Speculative feasible-run normalization. Raw financial calculations remain unchanged. Ranking metadata and three-language explanation expose the rule and its within-run limits. Production deploy rejects dirty trees; pinned read-only CI runs tests, ten focused mutations and stamp reproducibility.

Verified locally: 290 tests, 110 profile/crown/twist meshes, independent prism volumes and 8,160 independently recalculated feasible scores; all ten deliberate contract mutations rejected. Preview browser saved/reloaded GFA242000/plate2400 exactly, downloaded a crown OBJ with maximum Y287.905 matching displayed287.9m, and showed no console errors. Shared-memory lessons captured for search/persistence bounds and mixed-unit normalization. Remaining scope: complete all-desk import packages, calibrated crown economics, external solver/IFC validation and first-time human trials. Conceptual use only; no professional engineering validation claimed.

## 2026-10-18 · Neighbourhood effects design intent

Invariant: all environmental geometry uses the same tower rings and harvested neighbouring footprints; no inferred height or scenario input becomes a measured claim. Design Read: a city-scale axonometric sheet with the proposal legible among real footprint extrusions, followed by its effects and their assumptions. Reference: Ian McHarg's layered site studies, using the existing drafting register. The city drawing is dominant; 2px section structure, fine building edges and amber effect marks have separate roles. Retain all earned desks. Wind is explicit static loading, not CFD; reflection is sampled mirror-ray geometry, not glare intensity or eye hazard.

Implemented Place → Effects with shadow overlap, explicit uniform-wind/base-shear/overturning/constant-EI response and separate inertial loading, plus opaque first-hit specular sample rays. Study JSON/shelf preserve assumptions and teaching provenance. Found the harvester had parsed building:levels as metre height; corrected its unit adapter and refreshed all six cities with timestamps/parser version2. Wall culling now uses the true camera dot product; Neighborhood fits and centers the full context. Explicit tags are labeled recorded, not surveyed.

Verification before production: 299 tests and16 targeted mutations pass; independent analytic/code review passes. Browser: all six scenes, Tokyo16:00 reflected samples161/neighbor hits25, full-day shadow table, teaching study Save→reload→Restore retains wind30m/s and teaching flag, downloaded JSON includes every assumption/method. Independent1440/1024/390 visual review passed after shortening Effects and putting the phone effect drawing first. No console errors. Methods, source links, data limitations and external CFD/glare/structural work still needed are in docs/ENVIRONMENT-STUDIES.md. The fresh city dataset can change skyline-derived scenario identity premiums; the financial formula is unchanged.

## 2026-10-18 · Choice, memory and comparison design intent

Invariant: a pinned comparison reference stays fixed while the current design changes; imported output numbers are never trusted. Design Read: a pair of tower studies on one metre scale, followed by neutral differences and a written decision, so the person can keep a reason rather than just a rank. Reference: a tracing-paper design review, with A/B silhouettes as the dominant element. Preserve the main model and all earned desks. Use the existing 2px section / fine geometry / amber-change hierarchy. New names and notes are plain user text. No human-welfare composite score. Import describes the actual tower/Brief/Effects scope; other desks remain separate. This is a proposed usability improvement, not evidence of superiority from human trials.

## 2026-10-19 · Named decisions and a reusable study loop

Compared Tower-Morphing from the prior source reading and RHIKNOWBOT from current public Home/Features plus the earlier video review. Corrected prior claims that public non-demonstration proved feature absence or that this system was unique. No proprietary source adapted. HUMAN-CENTRED-COMPARISON.md records strengths, evidence limits, the current improvements and a participant trial that could establish a real usability advantage.

Implemented plain-text names/notes, a cloned session reference, shared-metre A/B towers and neutral raw deltas. Both options expose conceptual validity; changed market/regime/city/LED assumptions are named. No human-welfare score. A versioned JSON importer adds to the shelf without changing the current design; validates state/Brief/Effects and ignores supplied metrics. A narrow historicalv3 migration fills five later missing fields; bad supplied values remain invalid. Newv4 exports preserve names/notes. Other desks remain outside the stated import scope.

Verified307 tests and20 targeted mutations; browser export/import retained metadata, malformed1000floorimport left all3studies intact, reload recovery preserved saved named options, and infeasible post crown explicitly reported height failure. Actualequal-area example: cross→oval reduced envelope by10400m² while base-plate daylight proxy fell10.8percentagepoints and scenario contribution fell2.85mUSD/year. This is a tradeoff, not a winning score. Independent1440/1024/390 plusTH/ZH visual review passed after fixing the inherited two-column Studies layout; phone numerical tables checked separately with no overflow. Shared-memory lesson captured for historical format migration. Human participant superiority remains unverified.

## 2026-10-19 · Shippable pass: design slop, structure, three labs

Design:
- The annual contribution now opens the performance rail.
- Rent streams are drawn as lengths.
- Explore runs its search on arrival.
- Feng Shui docks beside the tower.
- Collapsed and empty bands were removed in Place and Walk-in, and the Walk-in legend pairing bug is fixed.
- Desk prose is capped at 68ch.
- Workspace names show on phones (the strip scrolls).
- The Research title is 32px and the studio actions are hidden there.

An independent reviewer (a different model) audited the result at 1440, 1024 and 390 px.

Engine:
- Ranking ties are deterministic.
- Terrace floors pay corner premium only on the plate they keep.
- Stored studies must sit on the slider grid.
- Fuzzed about 30k states: all values finite, and the invariants hold on valid states.

Structure (`structure.js`, at the head of the Core desk):
- Least width by rotating calipers, and slenderness against 432 Park and 111 W 57th.
- A period band from ASCE 7 Ta to EN 46/H.
- Vortex lock-in speed.
- Core share against the 24% benchmark, the diagrid angle against 55–75°, and the sky-lobby threshold.

Labs, each live and animated, with sources and "cannot claim" lines:
- Wind (`wind.js`): EN 1991-1-4 profile and loads, plus vortex shedding at f_s with lock-in.
- Water (`water.js`): roof-tank, booster and hybrid supply with energy and outage resilience, plus storm drainage.
- Glare (`glare.js`): specular reflection over OSM neighbours, using City of London 2017 reflectance and the 50 h/yr criterion.

Labs receive `changed()` and may patch the design. Each lab has its own CSS file, because the CSP forbids inline styles. The canvas rule is scoped to `.viewport>canvas`; a bare `canvas{}` rule pinned the lab canvases over the page. Next lab candidates are vertical transport, fire evacuation, and embodied carbon / premium for height.

## 2026-10-19 · Lifts and evacuation labs, drawing type floor

- **Lifts** (`lifts.js`): CIBSE up-peak round-trip time (probable stops, highest reversal floor, express runs), interval and handling, Barney/Al-Sharif average wait, sky-lobby shuttles snapped to plant levels, destination dispatch and double-deck options, and shaft area per floor band. A seeded simulation with real car kinematics runs in section. The lab defaults to the typical speed for the rise. The Core desk still sizes every tower at a fixed 1.6 m/s; the lab reproduces it at that speed and prints the difference. Making the Core desk speed height-based is open.
- **Evacuation** (`fire.js`): SFPE hydraulic model with per-floor queues merging into the stairs, refuge floors by HK B18 or GB 50016 §5.5.23, phased, simultaneous and evacuation-lift strategies, and reduced-mobility occupants. A Pauls hand check sits beside it. An independent check corrected its citations (Pauls ≤15 storeys, HK gross-area basis and the UC6 interval, GB "public buildings" and "preferably", door flow 1.3). The SFPE chapter number and the travel factors remain unverified in print, and the lab says so.
- **Drawing type:** measured at 1024 px, then lifted to roughly a 10 px floor without collisions. Drafting notes are 7.5 units (8 overlapped in the threshold detail, which the test caught), Walk-in uses sheet units, and the eye-height figure was re-laid.
- **Brief chart:** the allowance bar is now a dimension line with a labelled allowance tick.
- **Edge incident:** Cloudflare's CDG edge served a 520 for one stamped `style.css` URL while every other key served the file, which left the page unstyled for Paris visitors. Re-stamping gave it a new key. If a page is ever unstyled for one region, check the failing URL with an extra query parameter before suspecting the code.

## 2026-10-19 · Carbon and premium-for-height lab

`carbon.js`:
- **Model:** floors, plus gravity (accumulated load over stress), plus lateral (the wind.js overturning moment over the lever arm, drift-limited at H/500), per m² of the model's own GFA. It is an order-of-magnitude scaling law, calibrated so that a Sears-like steel tower lands inside Khan's range.
- **Carbon factors:** IStructE *How to calculate embodied carbon* (2nd ed., 2022), Tables 2.3–2.6, with GGBS share, electric-arc share and transport as controls.
- **Rating:** SCORS bands read from Figure 1 of the 2020 paper. Those bands are per m² of gross internal area; the lab divides by gross floor area, and says so.
- **Reference marks:** Khan's Lehigh figures and SOM's "about 30 psf" for the Hancock Center.
- **Default tower:** 1,631 kg/m², 47% of it lateral, 370 kgCO₂e/m², band F, because the core is the only lever arm. As a diagrid it drops to 237, band C.
- **Verification:** an independent check confirmed the factors, the RIBA and LETI targets and the Hearst Tower figure, and corrected Hancock and the EAF/BOF attribution.
- **Fonts:** `--mono` now falls back to IBM Plex Sans Thai and Noto Sans SC, so Thai and Chinese set in mono never drop to a system face.

## 2026-10-19 · Core desk lift speed

`liftSpeed(rise)` in `core.js` gives about 30 s to the top of the run, in 0.5 m/s steps, never below 1.6 m/s and never above 10 m/s. It is the single speed rule for the Core desk's lift sizing, its section and 3D car animations, the evacuation lifts and the Lifts lab.

The Core desk's round trip now uses CIBSE's split: travel per floor is h/v, and acceleration plus door time is charged once per stop. The old version charged v/a on every floor, which doubled the round trip at about 6 m/s.

The default 48-storey tower now has 3 zones × 5 cars at 6.5 m/s with a 16.8 s interval (it was 18 cars at 1.6 m/s). The Lifts lab reproduces the Core desk's round trip from the t_v and t_s that `liftDesign` returns. The earlier open item ("Core desk fixed 1.6 m/s") is closed.

## 2026-10-20 · Front door: assembly instructions; audit of the audit

**Landing.** The bare address opens `assembly.js` / `assembly.css`, a flat-pack manual in the IKEA instruction grammar:
- cover, tools and ✕/✓/? panels, a parts list (11 plans, 16 desks), eight steps, and an index;
- every tower and plan drawn by the model's own `profile()`, projected axonometrically with back faces removed;
- amber only on Enter, EN/TH/ZH, two-page spreads from 900 px wide and stacked pages below that.

**Routing.**
- `#studio`, `#research`, `?regime`/`objective`/`run` and `?reading`/`chapter` skip the manual.
- `#ws-<key>` opens a workspace, Back returns to the manual, and the wordmark links to `#manual`.
- Tracking parameters (utm, fbclid) still land on the manual.

**Review.** An independent reviewer on a different model audited the landing, and its findings were fixed: a balance instead of a KPI, terse captions, matched ✕/✓/? panels, Thai wording and leading, and 44 px targets. The studio's 64 sub-11 px font rules were raised to 11 px. `404.html` now answers unknown paths with a 404 instead of the SPA's 200. A test syntax-checks every `dist` module; a duplicate `renderManual` declaration once shipped with all tests green.

**Audit of the 2026-10-19 shipability report.**
- False: the lift speed rule is about rise/30 s, not √(0.5·H); 38 commits had landed since e8a9237, not 35; there are 16 workspaces, not 15; `width: fit-content` covers only two elements; the "headless CDP audit" has no committed script.
- True: 459 tests, 20/20 mutation probes (they cover the older modules only), gitleaks clean, security headers in place.

**Open.**
- PR #3 (Cursor, per-level quantity schedule, 726 lines) is unreviewed and unmerged.
- The `cursor/shdt-minimax-finish` branch looks superseded.
- 25 old Pages preview deployments could not be deleted: the API refuses aliased ones and the OAuth token can't force it.
- `SHDT/.scratch` (26 MB) and `_archive` sit outside the repo.

## 2026-10-20 · Method drawings, the research reader, and the layout engine's three lies

**The ask.** Dr Non: turn as much of the system into diagrams rather than text; make it ready for all kinds of work; make the research section expansive and clearer about the kinds of work these systems help alleviate; make building like this more interesting, fun and cost-effective; then do a shiftability audit.

**The shiftability audit, delivered.** Verdict: *highly shiftable in principle, blocked in fact.* Scored on loose coupling, pivotability, living with being wrong, and insouciance. What was cleared: the half-landed quantity merge, and the 16-tab bar that hid the last two workspaces at 1366 px (it now wraps on desktop; the phone keeps its sideways scroll because at 374 px the icons are all that fits and a cut-off last label is the signifier). What remains: `app.js` (2,739 lines) and `i18n.js` (1,658 lines) are hubs; 13 identifier assertions in `tests/extensions.test.mjs` and 11 in `tests/desks.test.mjs` are the fragile kind; `_archive` and a 26 MB `.scratch` sit outside the repo.

**The deliverable with teeth.** `EXTENDING.md`: the system shape, a six-file recipe for a workspace, how to add a lab, the drawing rules, the language rules, the guard rules, the command order, the traps, and what is deliberately not finished. `tests/extending.test.mjs` checks it against the live `WORKSPACES`, the release graph's `DESKS` array, the language list and the drafting vocabulary's actual exports — in both directions, so the guide cannot go stale in either direction. Six mutations, six red.

**The research reader, pages seven and eight.**
- Page 7, "The work this is for": six questions (Lifts, Fire, Wind, Water, Glare, Carbon), each naming the desk AND its limit. A new `work` diagram kind: six 44×44 glyphs, a filled amber bar for the two the method answers, an open bracket for the four it bounds.
- Page 8, "Why this way of working": the cheap moment (a question's price depends on WHEN it is asked — the economics is the cost of finding out, not rent or yield), the model answers back (being wrong is still free), and you come to know the building (sixteen readings of one geometry). A new `loop` diagram kind: the tower on the left with an unnumbered width dimension, an arrow to the six desk glyphs, and an amber return path along the bottom carrying the readings back into the shape.
- Both guards render the page through a DOM stub and measure the emitted SVG — glyph positions, the direction of the return path, and that the only text on the sheet is `1 2 3 4 5 6`. Five mutations, five red.

**The method drawings.** Each lab's METHOD became a sheet, because a paragraph cannot show a proportion and the proportional bar is the thing prose can never say. The pattern: a `xxxMethodPayload()` built from the same call that produces the reported number, and a `xxxMethodSVG(payload,{lang})` that only draws. The dense formula paragraph shrinks to a caption; the formula moves into the picture. Lifts (one zone in section, with the round trip split into travel, doors and passengers as a bar), Fire (a stair section with refuge and fire floor, and a bar split by evacuation phase), Carbon (a bar split by gravity, lateral and structure), Wind (the tower with its first mode, the wind profile over the terrain, the slenderness scale, and the lock-in band with the tower's own ratio standing on it). The method prose fell from 393 to 213 characters in English, 374 to 206 in Thai, 226 to 99 in Chinese.

**The layout engine, and the three lies it was telling.** The Thai wind sheet had two labels printed on one another, and chasing it found three separate false beliefs in `dist/drafting.js`:
1. *A note's neighbours were measured from their baselines.* "Below the baseline" of a note that wraps to two lines is inside the note. Targets are now derived from the obstacle's BOX.
2. *The resolver took the first collision and stepped.* A note standing between two others walked in a circle — the step that cleared one landed on the other — until the passes ran out, and it finished exactly where it started. It is now a global search: the note tries every position at which it would stand clear of something and takes the one clear of everything.
3. *A dimension label was modelled as a short wide box above its pivot, while its ink is a narrow strip running downward from that pivot.* The model now contains the real ink, and the guards measure it the same way.
A fourth: every note the layout places is drawn at ty + 2.4, but a dimension label draws ITSELF at its own coordinate. Registering it at the drawn baseline put the model's box 2.4 units off the ink, and the note placed in that 2.4 units of nothing landed on the label. The lifts sheet had the round trip time as a dimension and the passengers bar's label printed through it.
Six mutations of the four fixes, six red.

**What the guards could not see.** A note printed over a DRAWING is invisible to a text-only guard: the people waiting at the lobby are dots, and the lifts sheet's "zone N floors" label was printed straight through them. The label stack now stops short of the lobby floor, and the two labels that name what is below it stand below it. The wind sheet's Chinese terrain note was clipped at the frame edge, because the layout measures a CJK glyph as half an em and the real glyph is a full one — the wind sheet now carries the CJK-width check the lifts sheet already had, and the terrain note is a heading and a value on two lines of the column's own pitch.

**Laws kept.**
- A payload/drawing split is the anti-drift mechanism: the drawing is built from the arithmetic, so it cannot drift from it.
- A guard must measure the emitted artifact. Where the renderer can be driven, render it and measure the markup; where a layout is involved, measure boxes.
- Every guard is mutation-tested, or it is decoration.
- Render the sheet and look at it. Every number was right and the Thai sheet was still wrong.

**Open.** Water and Glare method sheets in flight. `app.js` and `i18n.js` still hubs. The identifier assertions still fragile. PR #3 (quantity, per-level schedule) has passed an independent review and is ready to land whenever Dr Non wants it; it is not merged. Chen's licensing stays deferred and untouched.

## 2026-10-20 · The spatial hallucination massacre, and PR #3 landed

**The ask.** Dr Non: take care of the still-open items; and do a "spatial hallucination massacre" — apply his test ("why is this here, why this size, and why this far from that? — if the answer is merely *the grid put it there*, the layout has failed") to six failure modes: unjustified gaps, orphan elements, scattered actions, false hierarchy, accidental wrapping, spatially expensive information.

**The audit, measured.** `.scratch/spatial2.mjs` measures the live DOM: the first line's character count (the real measure), the void beside it, the number of competing value axes on a panel, and the rows a bar takes at each width. What it found:
- **The book ran to 96–101 characters a line.** `.research-reading>p{max-width:78ch}` in a 1060px page. A `ch` is the width of a ZERO, and a zero is about a third wider than an average character in Plex Sans, so 78ch was 99 characters. Every desk ran to 82. The measure was wrong by a third, site-wide, and nobody could see it because a screenshot of a long line looks like a long line.
- **A 358px hole beside every paragraph** in the book, and 126–179px beside every note in all sixteen workspaces — the prose stopped two-thirds across, while the figures and tables used the whole width. The layout could not explain its own geometry.
- **Two value axes on the brief desk.** The three inputs ended at 1190, 1630 and 1940; the ledger's numbers ended at 1414. "The number" was in one of four places.
- **Three different widths on one tab.** The research title block was 1400px, the book 1060px, the archive 1400px — the book's left edge and its own title block's left edge were 170px apart.
- **The allowance ruler stopped at 360px** in a 614px desk: a scale that did not reach the panel it measured, with its tick pointing at nothing.
- The console bar was clean: one row to 1440, two below, no overflow, all sixteen workspaces present at every width.

**The fixes.**
- **The book is a spread.** `.research-reading` is two columns of 58ch with a 1px rule between them; the plates cross both and run the full page; the prose fills ≥90% of its column. The legacy reader got the same treatment, and the whole research tab — title block, book, archive — now sits in ONE 1060px frame.
- **One measure for the whole instrument: 32em.** Not 32ch. Thirty-two em is about seventy-two characters at any size, and `em` does not lie about the count the way `ch` does. Every desk, the book, the archive, the manual and the dedication now use it; the only measures left in `ch` are on headings, on a clipped one-line status, and on a mono credit (in a monospaced run a `ch` IS the character count).
- **One value axis on the brief desk.** The fields are a grid whose value column is the desk's own right edge, and the ledger's value column is sized by its content (`table-layout:auto`, `td{width:1px}`) so the numbers right-align on the same edge. The ruler is drawn 560 units wide so it spans the desk at the type size it was drawn, and its allowance tick lands where the allowance actually falls.
- **The excerpt sits on the page's own grid**: the scanned artifact in the first text column, what it says in the second.

**The guards.** `tests/spatial.test.mjs`: five guards that read the emitted stylesheet and compute from it — the spread, the frame, the measure, the value axis, and the ruler (rendered for real, its tick checked against the numbers the desk printed). Sixteen mutations, sixteen red. The mutation harness caught a hole in the guard itself: the column rule was checked on the new book and not on the legacy reader, and the first mutation removed the rule from the reader nobody was checking. Both now.

**PR #3 landed.** The per-level quantity schedule is merged (`cab62e7`). The merge with `-X ours` silently ate three genuine changes — the `d.qty` i18n keys, the `quantity.js` entry in the release graph, and the `howMeasured`/CSV handlers in `app.js` — and every arithmetic test stayed green. All three were found by diffing the branch against the merge result file by file, and re-applied by hand. **A merge is not a merge until the branch's own content has been compared against the result.**

**The drawing-standards audit, closed.** `dist/areasplit.js` and `dist/materials.js` both pass, and the check was to render them, not read them: the area plate is a real 360° pie whose three wedges carry the three fills, whose legend swatches carry the same three fills, and whose angles match the percentages it prints; the material joints are drawn in the material's own ink on the lit faces from `surfacePattern`, which is a property of the material and not a style.

**The identifier assertions, partly converted.** The desks were checked by their import lines and by their entries in a registration array — a desk that threw on its first line and was never opened still passed, because the text was there. They are now checked by RUNNING: each desk renders in all three languages, and the console is asked where it lives. The context-study guards now assert the values the export publishes (the tier says "not safety assessment", the Feng Shui study says "invented-site design prompt") rather than the source line that writes them. The assertions still inside `app.js` stay textual: the export handler is DOM-bound, and making them behavioural means extracting the export — which is the `app.js` hub, and is Dr Non's call.

**Laws kept.** A `ch` is not a character. A guard must measure the emitted artifact, and a guard that has never been seen to fail is decoration. A merge is not a merge until the branch's content has been compared against the result. Render it and look at it.

**Open.** `app.js` (2,739 lines) and `i18n.js` (1,658 lines) are still hubs, and the `app.js` identifier assertions are still textual. The main book's tenth page remains Dr Non's call. Chen's licensing stays deferred and untouched.

## 2026-10-21 · The six method sheets, measured and re-drawn

**The ask.** Dr Non: "Continue, please." The open items were the method sheets of the six labs — the last piece of the method-drawing work, and the piece whose two worker agents had been lost mid-flight. The law for that work was already written down: render the sheet and look at it.

**What looking found.** All eighteen sheets (six labs × EN/TH/ZH) were rendered and measured, and four separate defects were found — none of them caught by the guards that already existed:
- **The Chinese fire sheet was clipping its own numbers.** `最后: 行动不便 · 2:41 · 12%` lost half its percentage and `第二阶段: 出口层 · 2:14 · 10%` lost its percentage entirely. The browser cut them in silence.
- **The lifts sheet printed three labels with a line through them.** "travel 53.9 s (38%)", "doors 63.7 s (45%)" and "people 25.0 s (23%)" each had their own leader struck through the closing characters.
- **The glare sheet did the same to two beam labels**, and its leaders ran off the right edge of the frame.
- **The fire sheet's leader to "fire · level 30" was drawn straight through the number 30.**

**Why they happened, and what fixed them.**
- *A CJK glyph is not .6 em.* `dist/drafting.js` measured every glyph as a Latin one, so every Chinese label was a third wider than the box reserved for it — and the frame grew to fit the wrong width. The vocabulary now counts a CJK glyph at a full em, and wraps by real width rather than by character count. One line in the vocabulary fixed the clipping on every sheet at once.
- *A leader must arrive from outside the label it names.* The lifts and the glare sheets each centred a label on the very thing it named, which leaves the leader no side to arrive from: it came in through the middle of the text. The vocabulary now derives the landing edge from the SOURCE — a source to the left lands on the label's left edge, a source over the label lands on its top edge — and the two sheets put their bar labels in a column to the right of the bar, which is the carbon sheet's and the water sheet's pattern and the reason no leader can cross a label at all.
- *A turned label is a narrow strip, not a wide box.* The layout reserved a box as wide as the text for a vertical dimension's label, whose ink is a cap height wide and runs down the sheet. The frame grew to fit ground that was not there: the fire sheet carried twenty units of empty white on its left edge for the sake of one turned dimension. Fixing the model took the white away.
- *The frame holds the ink, with air around it.* A leader lands three units outside its label and the stroke there is half a unit wide; a frame grown to the note's edge alone put every leader's landing point exactly ON the frame, so the browser clipped the last stroke of every leader on every sheet. The frame now keeps two units of air.

**The guard, and what it cost to find the holes.** `tests/sheets.test.mjs` is CROSS-CUTTING: six labs, three languages, one set of laws — every note inside the frame, every leader inside the frame, no leader crossing any label, no two notes printed on one another, and the measure stated in the guard's own words rather than imported from the drawing it judges. The per-lab guards had each asked the wrong question: the frame GROWS to fit the notes, so "no note is cut off" is true by construction and proves nothing. Four of the six labs had no frame check at all, and the two that did had the frame built from the drawing's own measure — the measure that was wrong.

Three holes in the new guard were found by mutation, and all three were holes in the GUARD:
1. The segment/box test used the segment's MIDPOINT. A leader running through the last character of a label has its midpoint in the white space below it, and the strike went unseen. It is now a real segment/rectangle intersection.
2. A turned label was measured flat, which is the same wrong model the drawing had — so the guard agreed with the drawing and neither noticed the twenty units of white.
3. The guard did not check two NOTES against each other at all, which is why the level numbers were allowed to land on the stair-pitch dimension when they moved.

**Eleven mutations, eleven red.** A guard that has never been seen to fail is decoration. The harness is `.scratch/mutate_sheets.mjs`; it breaks one thing at a time — the CJK advance, the leader's landing rule, the frame's air on each side, the CJK punctuation, the lifts label order, a sheet that stops drawing, a leader that lands on the wrong side, the stair-pitch dimension, and three mutations inside the guard itself — and asserts that the suite goes RED each time.

**Laws kept.** A CJK glyph is a full em. A leader arrives from outside the label it names. The frame holds the ink, with air. A guard must model reality in its own words; one that imports the drawing's measure is the drawing agreeing with itself. Render it and look at it — every number was right and four sheets were still wrong.

**Open.** `app.js` and `i18n.js` are still hubs, and the `app.js` identifier assertions are still textual. The main book's tenth page remains Dr Non's call. Chen's licensing stays deferred and untouched. The twelve detail drawings and the core section now sit in a tighter frame — the layout change touches them — and have not been re-audited page by page.

## 2026-10-22 · The twelve detail drawings, and the law that is not about leaders

**The ask.** Dr Non: "Continue, please." The method sheets were done and measured; the twelve detail drawings in `dist/details.js` had been fixed for the seven leader/label crossings that the earlier probe had found, and were waiting to be re-audited. The law for that work was already written down: render the sheet and look at it.

**What looking found.** The seven known crossings were gone, and eleven more were there.
- **Seven leaders still struck their own labels.** The cavity's mineral-wool leader crossed its dimension; the slab's slip-slot leader ran through its own text; the fire detail's smoke seal and slab leaders crossed; the node's "fire stops here" ran into the glass bracket's leader; the screen's blade leader crossed; the threshold's "movement" ran into the waterproofing leader; the aviation "light envelope" sat on the envelope arc.
- **A rule ran through "inside."** The threshold's membrane line crossed the word it was naming.
- **A beyond line ran through "air."** The cavity's cut-plane edge crossed its own label.
- **The top line ran through "polyamide isolator."**
- **The rise arrow ran through "slab, poched concrete."**
- **The roof line ran through "roped access."**
- **The gutter flow ran through "drainage,"** and another through "to the gutter."
- **The glass's own right edge ran through two labels** — "post, poched metal" and "waterproofing already continuous" — because the glass was drawn 10 units wider than the posts it sat between.
- **The slab's plate-deflection arrow started inside the "horizontal load path" dimension label.**
- **The two mast leaders crossed each other.**

**The law this exposed.** Every one of those is the same defect: a drawn line passes through a word. The earlier law was about LEADERS, and it was the wrong law, because the leader was never the thing — the leader was only the case that happened to be lying on screen. The real law is: **no drawn line passes through a label.** A membrane rule, an obstruction arc, a dimension tick, a beyond line, a flow arrow and the glass's own edge are all the same thing. The line's body does not matter; the word does.

**The guard, and the three things it had to get right.**
- **The ink model.** A label's ink is its cap height above the baseline, plus a descender below — but only when the word actually has one. Measuring every word by its full box flags every flow arrow that starts just below the label it names, and a guard that fires on that teaches people to route around it, which is worse than no guard at all. The guard reads the descender out of the word itself (`/[gjpqy]/`).
- **Arcs are sampled, not skipped.** The aviation detail's light envelope is a curve, and a guard that only reads `M`, `L`, `H` and `V` walks straight past it. The guard now samples the arc from its endpoint to its centre.
- **No path-end exemption.** A line that ENDS inside a word is still a line through a word. The exemption was tried, and it hid one real strike — the slab's plate-deflection arrow — so the arrow moved instead, and the exemption was cut.

**Sixteen tests, sixteen mutations, sixteen red.** The law was not reinvented for the second family: `tests/sheets.test.mjs` now guards six method sheets and twelve details with one set of laws, and the harness `.scratch/mutate_sheets.mjs` breaks one thing at a time — including a detail label back onto its line, the obstruction arc back through its label, and three mutations inside the guard itself (the descender, the H/V segments, the arc sampler) — and asserts the suite goes RED each time.

**Laws kept.** No line through a word, whatever the line is. A midpoint test is not a segment intersection. A path's own ends are not exempt. A guard must model reality in its own words. Render it and look at it — the seven known crossings were fixed, and eleven more were found only by looking.

**Open.** `app.js` and `i18n.js` are still hubs, and the `app.js` identifier assertions are still textual. The main book's tenth page remains Dr Non's call. Chen's licensing stays deferred and untouched. Several detail labels still sit ON hatched material — legible, but a separate aesthetic item from the strike law. Dr Non's standing design law, MSH — Massacre Spatial Hallucination — arrived on 2026-10-22 and governs every interface, viewport and visual surface: when you find spatial hallucination, massacre it.

## 2026-10-22 · MSH: the header that ate the number, and the sixteen workspaces

**The ask.** Dr Non pasted the standing design law: **MSH — Massacre Spatial Hallucination**. "When you find SH, massacre." An interface invents a reason for things to occupy space instead of arranging them around how people read, choose and act. The law's section 6 requires evidence at 390, 1024 and 1440 px before a pass may be declared, and section 7 a short report: found, changed, verified, remaining. The law is now `docs/MSH-LAW.md` in this repository.

**How the pass was run.** Five surfaces — the core desk, the lifts desk, the fire desk, the detail desk and the research book — at 390 × 844, 1024 × 768 and 1440 × 900, on the live site, through the CDP harness, with every element's box read back from the rendered page rather than from the source. Each viewport was recorded for chrome cost, task visibility, geometry failures, hierarchy and preservation. Fifteen captures, zero JavaScript errors.

**What the measurement found.**
- **The console header was eating the site's own headline figure.** The header carries the wordmark, the two destinations, the studio's parameters (site area, floor area ratio, city), the languages and four actions. The site bar is the only flexible group in it, so when the line was too short the bar gave way — and what gave way was `58,981 / 72,000 m²`. Measured: at 1440 the bar needed 614px and had 602, so the unit was cut and the figure read `58,981 / 72,000`. At 1400 it had 571, at 1366 it had 544, at 1300 it had 493, at 1250 it had 446, at 1181 it had 377. **On every laptop narrower than 1450 the number was not merely clipped — it was gone entirely.** In English the bar needs 551px, so the same band clipped from 1390 down.
- **The sixteen workspaces broke after fifteen.** At 1440 the nav fitted fifteen on the first row and left `แบบที่เก็บ` alone on a second, with 1300px of void beside it and 38px of chrome that did not need to exist. Thai needs 1292px of the sixteen; a 1366px laptop has 1342.
- **On a phone the seven view tools cut the last label in the middle of a word.** The strip was 377px wide in a 350px box, so `โครงข่าย` was shown as `โครษ`.

**Why it took a measurement to find.** In English the nav fitted on one row and the bar clipped 0px at 1440. Both defects are artefacts of THAI — the longest labels the site ships — and both are invisible in a source read, in an English render, and in a test suite that never opens a page. The chapter that found them was the one that rendered the thing and read its boxes.

**What changed.** Three rules in `dist/console.css`, and nothing else.
1. **Below 1440 the parameters take a row of their own.** The band that did this was 1180; it is now 1439, and the bar grows to the full row and refuses to shrink (`flex:1 0 100%`). A header that costs 38 more pixels is cheaper than a header that eats the answer.
2. **Above 1440 the bar fits on the one line.** Its columns go from 12px to 8px, its left padding from 12px to 8px, and the header's groups from 12px to 10px — 24px, which is exactly what the unit needed.
3. **Above 1360 the nav's buttons give up four pixels a side** and all sixteen land on one row. Below 1360 the bar still wraps, and it wraps onto a second row of six.
4. **On a phone the view tools take two rows** instead of a strip that cuts a word in half.

**Measured after.** At 1440 the chrome is 77px, 8.6% of the viewport, down from 115px and 12.8%. At 1366 it is 132px, 17.2%, down from 22.4% — and the figure is there. At 1024, 170px, 22.1%. At 390, 110px, 13.0%, and no label is cut. The nav is one row at 1366 and 1440 and ten-and-six at 1024, with no orphan at any width.

**The guard.** `tests/spatial.test.mjs` grew one test, and it holds values rather than names: the band that gives the parameters their own row, `flex:1 0 100%`, the 8px column gap, the 8px left padding, the 10px header gap, `overflow-x:visible` on the nav, and the 6px 7px padding above 1360. Nine new mutations in `.scratch/mutate_spatial.mjs` break each of those in turn; **twenty-five mutations, twenty-five red.**

**Laws kept.** Chrome earns its pixels — and a number without its unit is not a number. A large footprint is a prompt to investigate, not a universal numeric failure: the 1024px header is 170px tall and stays that way, because what it holds is content, not filler. Measure in the language the site ships in. Render it and look at it — every number was right and the figure was missing.

**Open.** The 1024px console header is two bands because the parameters need their own row there; it is honest, but it is 95px of chrome and Dr Non may want a different composition. At 1024 the sixteen workspaces still break ten-and-six, which is a wrap, not an orphan, and no label is lost. The detail desk's first screen is still the study form rather than a drawing, and the drawings sit below the fold — that is the desk's flow, not its geometry, and it is Dr Non's call. `app.js` and `i18n.js` are still hubs. Chen's licensing stays deferred and untouched.

## 2026-10-22 · Codex · interaction audit after MSH header pass

- Found: lift population ignored max=200000 and could size millions of simulated cars; material strip hid twelve focusable controls from assistive technology and rebuilt away keyboard focus; wind TH/ZH translated a narrow clear condition into “safe.”
- Changed: validate committed population and cap pure calculation; expose a labelled material group and retain keyed buttons; scope wind labels to outside the lock-in band.
- Verified: 557 tests; five isolated new mutants killed; 20 existing shipability mutants killed. Native browser population rollback and material keyboard identity verified; all sixteen Thai workspaces opened at390/1024/1440 with no page-wide overflow. Independent diff review found no new blocker.
- Remaining: tablet two-band header retained; untranslated material/detail annotation content and phone label reading need dedicated work. No engineering certification claimed. Full evidence in docs/IMPECCABILITY-AUDIT-2026-10-22.md.
- Shared lesson captured first: Scars/Debug-Logs/2026-10-22-audit-interactive-ancestors-and-retained-focus-not-just-button-labels.md.

## 2026-10-23 · Shipability audit: the material names, the action that fell off the screen, and the graph with no guard

**The ask.** A shipability audit. Not a redesign: does the thing ship to a reader who can finish the task, in the language they are reading in, on the device they are holding?

**How it was run.** The deployed site, driven through the CDP harness: the full journey (boot → brief → form → compare → apply → save → reload → export) in EN, and the material names in EN, TH and ZH. The candidate table at 390, 1024 and 1440 in all three languages. The release graph read from the stamper itself. The suite and the mutation harness. Full evidence: `docs/SHIPABILITY-REVIEW-2026-10-23.md`.

**What was found.**
- **The material names were English on the Thai and Chinese sites.** Twelve common nouns read out of the English table: the select's options, the note's opening name, the swatches' accessible names. English was right, so the defect was invisible in an English render.
- **The explore desk's action was off-screen.** The Apply button sat 125px past the right edge of a phone and 62px off at 1024; the Δ column was cut mid-token, showing `+U`. The desk's job is to compare five candidates and apply one, and on a phone the reader could read the money and press nothing.
- **The rule that hid two columns was positional** (`nth-child`), so moving a column would have moved the hiding onto a column that still carried a value.
- **The release graph had no guard.** 48 modules and 127 edges, correct by hand, with nothing to notice a new module or a new import edge arriving unstamped.

**What changed.** The twelve names now live in the string table beside the crowns and the façade families; `app.js` reads them in the select, the note and the swatch; the private duplicate in `quantity.js` is deleted and its new edge pinned by the stamper. The candidate table reads in decision order — candidate, money, delta, drivers — with the action pinned to the right edge of the scroller behind a 1px rule and an opaque ground, and the identical columns hidden by name. Twelve new tests in three files; the mutation harness grown from 20 probes to 32.

**Verified.** 569 tests green. 32 of 32 mutants killed. The journey on the live site: apply took the row's $22,013,770 and made it the page's; the study survived a reload; four exports downloaded with real content; 0 console errors in three languages. The table, in three languages at 390 and 1024: the candidate, the money, the delta and the action are all in view.

**Laws kept.** A name that has to survive translation belongs in the string table, not in the data it names. A column hidden by its position is a column that will hide the wrong one. An action that falls off the edge is an action the reader cannot take. The release graph is not a convention — it is a thing that can be checked, and a thing that can be checked should be.

**Open.** The drivers still scroll sideways at 390 and the roof value is clipped by 4px at the edge; the candidate name wraps. `app.js` and `i18n.js` remain hubs. The main book's tenth page remains Dr Non's call. Chen's licensing stays deferred and untouched. Three instrument traps are recorded in the review: a closed `<details>` reports a stale rect (filter with `checkVisibility()`), `python3 -m http.server` is single-threaded and deadlocks Chrome's parallel module fetches, and `captureBeyondViewport` returns the whole page.

## 2026-10-23 · Codex · the release guard's discovery boundary

- Found: three independently reproduced false-green releases after stamping: double-quoted missing import, an unstamped vendor dependency, and a filename registered only in a comment. Current live pins themselves were correct.
- Changed: development-only syntax parser, recursive shipped-module discovery, importer-relative paths and parsed comment exclusion. Four parser tests and three isolated full-stamp mutation checks; CI installs the locked dependency. Public assets unchanged.
- Verified:573 tests; original3 false-green probes killed independently. Live Thai table at390/1024/1440: pinned Apply in view, no page-wide overflow; keyboard scroll reveals complete driver values; Apply transfers the row's US$23,013,485 to the form desk. Independent code and screenshot review found no blocker.
- Remaining: phone drivers scroll and candidate names wrap; explicit stamper lists retained; no book/licensing changes. Evidence: docs/RELEASE-GUARD-AUDIT-2026-10-23.md.
- Shared lesson captured first: Scars/Debug-Logs/2026-10-23-release-graph-checks-must-parse-imports-and-inspect-nested-shipped-modules.md.

## 2026-10-23 · Global display preferences

Approved: one saved Settings entry for metric/imperial and currency, independent of language/studies. Model geometry and finance remain SI/USD; display controls convert both directions. Canonical JSON/OBJ retain SI/USD/metres; JSON records preferences/rate metadata separately. CSVs follow selected units/currency. Frankfurter dated offline snapshot plus explicit validated refresh; failed refresh retains prior rates. No temperature selector without temperature readings.
Evidence: 593 tests, 40 baseline-proven mutations; real Settings EN/TH/ZH and 390/1024/1440, all workspaces imperial/THB, reload persistence, successful rate refresh, downloaded canonical JSON. Independent review closed live Research conversion, Chinese adjacent-unit parsing and status-contrast gaps. Detailed review: docs/DISPLAY-PREFERENCES-REVIEW-2026-10-23.md. Shared lesson captured before this record.

## 2026-10-23 · MCode · The reader's own plot, and the number that was read off the wrong end

**The ask.** People buy land before they design the building. So the site has to let the reader state their own plot — punch in a rectangle, or draw corners on the map — work out how big that plot is, and simulate what can be built on it. The land decides the shape and the form; the synthesis follows afterwards.

**What shipped.** The stand-here desk now offers three ways to state a plot — a surveyed lot from the OpenStreetMap harvest, a typed rectangle, or an outline drawn on the map — and all three arrive as a ring, so there is one appraisal path and not two that agree only sometimes. A click on the landscape becomes a point on the ground through the scene's own inverse projection, so a corner lands where it was clicked; the arrow keys move the last corner along the screen's axes; clicking the first corner takes the last one back. The desk then answers the only question that matters: **the largest plate this plot takes**, with the floor area that plate carries and a "Use this plate" action that sets the model's span and bearing to the land's own.

**The defect, and what it cost.** The fitted plate was wrong, and it was wrong in the direction that hides a failure. `SCHEMA.span` is `[key, min, max, step, unit]`, so index 1 is the *smallest* plate this instrument draws and index 2 the widest. The search was capped with index 1, so it stopped at the instrument's minimum: a 52,000 m² outline was told it carried a 32 m tower. The note under it printed "—–32 m", because index 0 is the key and not a number, and the range was destructured as `[lo,hi]`, which took the key and the minimum — so the size the adopt button applied was `NaN`. Three index errors in one block, and not one of them visible: the geometry was right, the fit was right, the drawing was right.

**What changed.** The land's limit is now found unbounded, and the instrument's range is a separate fact printed under it: what the LAND takes is the answer; what this INSTRUMENT can draw is stated beside it. A plot larger than the instrument's range says so and offers the nearest size in range; a plot smaller than the instrument's smallest plate says that too and offers nothing, because a button that offers a tower which cannot stand is a lie the reader can act on. The heading now agrees across EN, TH and ZH — the English and Thai read "a fitting plate found for this plot" while the Chinese read "the largest plate this plot can bear", which is a different claim.

**The spatial pass.** The desk panel measures 354–614 px in the console, so the sheet always stacks, and a chart of the sky standing between the reader's own drawing and the numbers that answer it is a spatial hallucination: the sheet asked "what does this land take?" and made the reader scroll past a chart to find out. The sky chart is now the last thing on the sheet, and the answer comes before the fact rows that contextualise it. Evidence at 390, 1024 and 1440 in all three languages: no horizontal scroll, nothing clipped, no console errors.

**Verified.** 613 tests green (eleven new ones in `tests/site-plot.test.mjs`, reading the panel rather than the code). Twelve new mutants in the shipability harness, all killed — including the index error, the unbounded land, the clamped size, the too-small plot and the floor area priced from the wrong plate.

**Laws kept.** A land that carries a tower and an instrument that can draw one are two facts, and joining them at the wrong end of the range hides the failure instead of reporting it. A test that checks the code calls the right function cannot see an index error; the panel has to be read. A supporting drawing does not stand between a drawing and its answer. A button that offers a building which cannot stand is a lie the reader can act on.

## 2026-10-24 · MCode · A figure on top, and what the land is worth

**The ask.** Think about the real value for a person using the system: learning how to build a skyscraper, but also someone who wants to *propose* a building — and a designer who wants to take it away. Include the option for what goes on top: a rod, something that makes it look very tall, the Petronas spire, the Burj Khalifa's advertisement. And the feasibility question: what it makes money back against what it takes to get it off the ground, so forms and functions can be proposed that fit with how the numbers pay off.

**What the survey found.** Most of the machinery was already there and, in places, better than the ask assumed. The crown library carried a flat roof, a stepped setback, a rooftop helipad, the Petronas post and an aviation mast, and the studio offered every one of them, drawn in the tower, in the 3D view and in the exported OBJ, priced in the capital stock, and named in all three languages. The LED advertising surface was a switch of its own, with media income and media running cost, exactly as the Burj's facade is. The export was already four files: OBJ, JSON with every metric and how it was measured, the candidate search as CSV, and the per-level area and façade schedule. The capital cost, the capital per square metre and the capital-over-contribution ratio were already computed and printed.

**What was genuinely missing, and what I built.**

*A figure on top.* The type the reader most often asks for was not in the library: a figure — the thing that makes a tower a landmark rather than a stack. It is now a crown like the rest, 38 m of it, with Christ the Redeemer in Rio (1931) and the Motherland Calls at Volgograd (1967) named as the precedents and the height stated as FormHypes' own set value, not a measurement of either building. It costs capital and upkeep, it earns nothing, and it is counted in full against the height allowance.

The first drawing of it was wrong in the way that matters: a plinth, a pedestal, and a narrower top — which is a mast with a name, and read as one on the screen. A figure is wider than the thing it stands on. Fixed, and the tower now carries a slender pedestal with a form above it that reads as a figure at a glance.

*The money on the land.* The land decides the size; the money says what that size is worth. The sheet now states, for the plate the land takes: the capital paid once, the annual gross rent, the annual running cost, the annual contribution, and the capital over the contribution — with the note that the ratio is not a payback period, because land, podium, fit-out, plant, fees, financing and tax are not in it. The figures are the model's own, computed for the plate the sheet names, so the sheet cannot show one tower and price another. A plot too small for the smallest plate states no money at all, because there is no building to price.

*And the desk's numbers now follow the reader's units.* The rail, the drawings and the exports all follow the saved unit and currency preference; this desk did not. A reader who had set imperial was told the plot was 10,800 m² on a sheet where every other number was in feet. A number the reader has to convert by hand is a number they cannot use.

**Verified.** 622 tests green — six new crown guards and two new feasibility guards, and the money guard compares the capital printed on the panel with the model's own capital for the plate the panel names. Four new mutants, all killed: the figure removed from the library, the figure drawn narrower than its pedestal, the money priced from the current model instead of the plate on the land, and the running cost never stated. Evidence at 390, 1024 and 1440 in EN, TH and ZH: no horizontal scroll, nothing clipped, no console errors, and the feasibility figures read in all three languages.

**Laws kept.** A crown that exists in a table and nowhere else is a figure on the roof of the interface and nowhere else. A figure wider than the thing it stands on, or it is a mast. A sheet that shows one building and prices another is two buildings. Money paid once and money earned yearly meet only in a ratio that carries a year in it, and that ratio is not a payback period. A number the reader has to convert by hand is a number they cannot use.

## 2026-10-24 · MCode · The chrome measured, and the number that was read off one language

**The ask.** "Continue. I think I see less and less special hallucination, which is good, so make sure you keep up with that."

**The method.** Not a reading of the source — a sweep. Sixteen workspaces × three widths (390, 1024, 1440) × three languages, measured in the rendered page: chrome cost, the rows the strip breaks into, every element wider than the column it sits in, every control overlapping another. 144 measurements before, 144 after. Four defects, and not one of them visible in the CSS that caused it — each rule said something sensible.

**What was wrong.**

*The header was smaller than its own contents.* The header is 40px of chrome; its two destinations were a fixed 46px — the height the header had before the compact chrome cut it. They hung three pixels below the header's rule and lay across the workspace strip underneath, and the active tab's amber underline sat *on* the header's black rule instead of above it. Every width above 900, every language.

*The strip broke in two.* Sixteen workspaces side by side need about 1400px; the band at 1024 has 1000. So it wrapped: eleven on the first row, five on the second, the five beside roughly 550px of nothing. 75px of chrome instead of 37. The stylesheet's own note had called that shape "a row of noise with 1300px of void beside it" — it was there in every language, only with five orphans instead of one.

*The Feng Shui table was wider than its column.* Its headers were held on one line and its mass cell could not break, so its smallest honest width was 457px against a 432px column at 1440 and 354px at 390: at 1440 the last column ran 25px past the sheet and was cut off the page; at 390 it ran 103px past. And the rule that was written to fix it — "Feng Shui table headers wrap rather than clip" — was overruled by the stylesheet that loads after it.

*The headline figure was clipped in Thai.* The header's parameters were placed by a constant, `max-width: 1439px`, measured from one language. Thai needs more header than Chinese, and in the difference the bar was squeezed: at 1440 it had 587px of the 598 it needed, and `58,981 / 72,000 m²` lost its unit. The number was read in every language and was wrong in one.

**What changed.** The destinations fill the header instead of overrunning it. The strip is one row between the phone and the laptop — the mark over its word, the way the phone has always drawn it — so all sixteen land on one row: 50px of chrome instead of 75, sixteen named workspaces, no void. The Feng table fits its column: the headings wrap and the figures break. The drawing beside it keeps a 380px floor, because the tool row over it is 363px wide and a drawing whose tools are cut off cannot be operated. And the constant is gone: `fitSiteBar` reads the bar's own contents — whose labels do not wrap, so their widths are the bar's honest width — and measures them against the room the rest of the header leaves, in the language being read. The header either holds the parameters or it moves them to a row of their own. Nothing is clipped and no width is guessed.

**And a defect of this round's own making, found by the evidence.** The repair decides by measuring the header. A screenshot with a clip resizes the viewport, the resize fires before the layout has settled, and the measurement taken in that moment removed the bar's own row — putting the parameters back where they do not fit, with the figure clipped again. A measurement that changes with the answer it gives can be flipped by a layout that has not settled. Fixed twice over: the bar's left rule is made transparent rather than removed, so it occupies its pixel either way and the measurement no longer depends on its own answer; and the header is measured again on the frame after a resize. It is recorded here because the evidence caught it, not because it was looked for.

**Verified.** 631 tests green — nine new in `tests/chrome-fit.test.mjs`, which reads the shipped stylesheets and *runs* the measurement against four measured headers. 54 mutants in the shipability harness, all killed, twelve of them new: one for each way this round could have gone back. Measured after: the header's overlaps 4 → 0; the strip's rows two → one at every width; the Feng table's overflow 25px → 0 at 1440 and 103px → 0 at 390; the bar's clip 11px → 0 at every width in every language. The chrome at 1024 fell from 170px to 127px. The width band measured at fourteen widths from 1440 to 390 in all three languages.

**Laws kept.** A container smaller than its own contents clips, and the rule that says otherwise is the rule that causes it. A row of five beside half a screen of nothing is noise, whatever its width. A table whose smallest honest width is larger than its column is a table that cuts off its own last column. A threshold that has to hold for three languages is not a threshold; it is a guess with a number in it — so the page is asked. And a measurement that changes with the answer it gives can be flipped by a layout that has not settled, which is why the screenshot had to be read after it, not before.

**An operation, recorded because it will happen again.** The deploy was blocked by a Cloudflare credential, not by the code: wrangler's stored OAuth token had expired, and `wrangler login` gives a person about sixty seconds to press Allow before it gives up — it timed out twice while the link was still travelling to the browser. The fix is the same flow with a callback that waits: authorisation code with PKCE, wrangler's own public client, its own redirect URI and its own token endpoint, with the token written into wrangler's config in wrangler's format. No scope is widened beyond wrangler's own. The lesson is not about Cloudflare: a deploy that needs a human in the loop should give that human a window long enough to use, and the agent should not spend a person's consent twice on a race it cannot win.

## 2026-10-25 · Combined release audit

Reconciled incoming commits through `2c208d5`, all PRs and tracked branches; no unique branch/stash/worktree work remained. Closed PR #2's SHA is not merged, but all 31 paths and its evolved modules are present. Preserve the current implementations.

Verified rate-cache boundary and commit-only deploy staging fixes landed through `7b820e9`. Completed whole-edge concave plot containment on the normal drawing path, imperial rectangle editing, invalid-outline guidance and truthful footprint/fit provenance. Phone camera tools open on demand; compass labels have separate baselines; adjacent plot dividers are reduced to one. 637 tests and 70 mutation probes pass; actual browser checks cover all sixteen workspaces, three scripts and three widths, Apply/save/reload and four downloads. Review and limits: `docs/INTEGRATION-REVIEW-2026-10-25.md`. Verified memory lessons live in SecondBrain's 2026-10-24 debug notes for clean-Git deployment staging and whole-plot containment.

## 2026-10-25 · Material provenance audit

Removed unsupported material-to-building associations (including Sears Tower1929), stopped displaying unused carbon/maintenance inputs as product results and marked all twelve coefficient presets scenario-2026. The actual model applies the coefficient to annual envelope reserve AND envelope capital cost; JSON now records both effects and the unverified baseline. Source disclosure links product-rating methodology and an actual EPD without claiming they validate the presets. No financial calculations or material options changed. Three new behavior tests cover model effects, translated notes and the actual download; 640 tests pass. Scope/evidence and still-open goal acceptance: `docs/MATERIAL-PROVENANCE-REVIEW-2026-10-25.md`. Verified lesson: `Scars/Debug-Logs/2026-10-25-a-material-palette-is-not-product-provenance.md`.

## 2026-10-25 · Reflected irradiance on the actual receiver

Glare previously added DNI×reflectance on beam-normal planes while presenting horizontal-ground results. Independent mirror conservation repro confirmed a factor-of-two error at downward cosine0.5. Cell/peak selection, cached frames and the method diagram now include the ground cosine; no second mirror-incidence factor is added. The lab states its fixed DNI and reflectance assumptions, and links the inspected NASA/PAN references. The compact method remains; a native enlarged vector viewer makes phone annotations readable, supports keyboard panning and Escape/focus return, and preserves the overview. The annual 50-hour exposure contour is explicitly distinguished from sensitive-receptor discomfort-glare guidance. 646 tests pass, including six new independent radiometry/viewer/criterion checks; prior drawing guards retained. Evidence and remaining acceptance work: `docs/GLARE-RADIOMETRY-REVIEW-2026-10-25.md`.
