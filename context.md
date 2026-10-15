# FormHypes

Design Read: An architectural instrument with an oversized inhabited tower drawing, a pale drafting desk, and amber geometry that ties every design decision to the area it earns.
Reference: Ivan Sutherland's Sketchpad (1963) and the sectional drawings of the Hong Kong International Finance Centre discussed by Shouheng Chen.
Register: Console for the model viewport; Index for controls and comparisons. Dials: variance 7, motion 3, density 7. The model dominates; controls sit in a narrow rail. Structural separators are 2px, cell rules 1px, selected geometry 2px.
Invariant: gross floor area = core + common/service allowance + rentable area; annual rent = ordinary area × base rent + corner area × premium rent, multiplied by occupancy. Corner area is a subset of rentable area.

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
