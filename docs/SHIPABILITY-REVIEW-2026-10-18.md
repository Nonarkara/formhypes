# FormHypes shipability review · 18 October 2026

Scope: audit of main at `0c7e354`, agent history, reproducible cross-surface probes, and primary-source research. Target: a dependable conceptual massing and comparison instrument. A concept release does not establish structural adequacy, code compliance, market value, indoor daylight or energy performance.

## What the agent history teaches

Attribution below distinguishes signed commits from attribution in the director's reports. A passing test count is evidence of that suite, not evidence of domain validity.

| Work stream | Evidence and useful work | Failure mode that remains / lesson |
| --- | --- | --- |
| Codex, signed `f7fafb8`, `9498a5e`, `aeb1129` | Embedded rule kernel, slab/accounting invariants, whole-day solar and base-rent correction | OBJ inherited inward winding and gained no crown when the model grew. Extend cross-surface contracts whenever a feature is added. |
| MiniMax baseline, signed `1290d8b`; later work reported by director | Research, Brief, Walk and context desks; newest ground integration `0c7e354` reuses harvested data correctly | The new Map lives inside drawTower, so its claimed cache dies every frame. Test lifetime across redraws, not the presence of get/set text. |
| Cursor, signed `038fa99`, `2309142`, PR #1 | Contained console, phone workspaces, facade principles and reader framing | CSS layers later overrode the phone header; desk modules own assumptions that Save does not fully capture. Test end-to-end tasks across modules. |
| Claude, signed `649462b`, `e50ebc2`, `e710757` | Storage failures, deep-link validation, cross-desk repairs and CSP | Storage bounds diverge from search bounds: legal inputs produce a 105-floor winner which reload rejects. A shared admissibility contract is needed. |
| GLM, signed `c9584ea`, `717ff19` | Separated capital stock from annual contribution and consolidated crowns/materials/cityscape | Crown economics and geometry use different meanings of foot; model, export and site studies diverge. Keep this calibration issue explicit until resolved. |
| Mimo, signed `203874d`, `e687975` | Recovered deployed work into git, corrected site drawing and ground appraisals | Crown added later never reached the stack-only site and shadow calculations. A view-specific height calculation drifts. |
| Argon 4, attributed in director's report (`1bb3a2e`) | Corrected facade sign, height-cell retention and Apply redraw; translation/sizing repairs | Literal guards were satisfied by comments; some short names diverged. Test behavior and shared identities. |
| Later audit stream (`50cfe2c` through `76fd907`, signatures incomplete) | Projection, live drawings, ground values, Explore full-run figures and inert-objective disclosure | Local fixes can be correct while the workflow is wrong. Color ladders cannot prove geometry coverage, and mutation counts are scoped to chosen mutations. |
| Codex, signed `aa91725` | Cached reranking, first-run objective race, responsive chart, focus and phone header | Preserved an uncalibrated mixed-unit regime score. Explicitly preserving a rule does not establish that the rule is useful. |

## Verified blockers and current-session plan

1. **Search → Apply → Save → Reload:** cap candidate floor counts to the actual shared control/storage range; account for crown height when finding a height-limited floor count. Reproduction before fix: custom 3 m, 70 floors, 350 m cap, competition produces 105 floors / 315 m, then reload discards it.
2. **One outer massing geometry:** retain real slab rings and the existing crown profile rule; use the same rings for OBJ, perspective and shadow height. Fix reflected-axis OBJ winding and triangulate nonplanar side quads and concave caps. Export remains conceptual exterior massing: terraces are area deductions, not coordinated openings; no interior/core/BIM semantics implied.
3. **Study preservation:** capture and validate the complete Brief input object, preserve old plot/FAR saves, and make deletion transactional when storage is unavailable. Geometry saves must not restore another study's target/scheme assumptions.
4. **Ground cache lifetime:** decode once per city across draw calls. Keep the existing harvested geometry, color hierarchy and line widths.
5. **Ranking decision:** civic/speculative weights add unlike units. Default civic has about4.95m USD/year contribution spread versus135m height×identity spread. Investigate normalization and distinguish dimensionless ranking from raw performance. The director approved correcting these rankings during this session. Civic now uses 65% selected objective and 35% total height × distinctiveness; Speculative uses 50/50. Both signals are min–max scaled over the feasible run, with a neutral 0.5 when constant. Pure yield and height-only regimes retain their purpose. The UI and CSV expose ranking method/score; raw financial and geometric measurements are unchanged.

No live drawing, research figure or control is removed. No engine replacement, paid API, new live data dependency or security-policy relaxation is required for these repairs. Validate with executable workflow regressions, geometry topology/orientation checks, release graph checks, browser EN/TH/ZH review and committed production-byte verification.

## Primary-source research and what to borrow

All links accessed 18 October 2026. Repository revisions and detected licenses are in `shipability-repos-2026-10-18.json`; these are source snapshots, not compatibility conclusions. No third-party source code is copied in this session.

| System | Primary evidence | Application to FormHypes | Adoption decision |
| --- | --- | --- | --- |
| Honeybee Core | [model checks](https://www.ladybug.tools/honeybee-core/docs/honeybee.model.html#honeybee.model.Model.check_all), [repository](https://github.com/ladybug-tools/honeybee-core) | Geometry/adjacency checks and explicit model schema before simulation. Keep a structured validity report separate from a renderer. Radiance/energy are extensions, not claims conferred by having a mesh. | Borrow contracts now. A future exporter needs rooms, boundary conditions, apertures, units and tolerance before an analysis run. |
| Dragonfly Core | [building API](https://www.ladybug.tools/dragonfly-core/docs/dragonfly.building.html), [repository](https://github.com/ladybug-tools/dragonfly-core) | Building/story/room abstraction suited to larger models; repeated stories can be represented economically. | Preserve the real irregular Chen schedule; only compress identical stories, never flatten refuge/mechanical levels. Future analysis adapter, not a browser rewrite. |
| IfcOpenShell | [geometry creation and units](https://docs.ifcopenshell.org/ifcopenshell-python/geometry_creation.html), [repository](https://github.com/IfcOpenShell/IfcOpenShell) | Units, placements, representations and products are explicit. A geometric OBJ is not an IFC model. | Local/offline IFC export later, with storeys and named quantities; independently reopen/check the result. |
| That Open web-ifc | [runtime/build outputs](https://github.com/ThatOpen/engine_web-ifc#build-files) | Browser and Node IFC reading/writing through WASM; multithreaded build adds a worker. | Useful future interchange viewer. Current CSP does not permit this execution stack; do not add it just to improve an image. Model correctness comes first. |
| SkyscraperSim | [project](https://github.com/eventhorizon5/skyscraper) | Explicit floor, elevator and door behavior in an interactive building simulator. | Borrow the separation of operational behavior from massing. Current animated lift is a diagram, not a traffic/service analysis. Not a structural-analysis engine. |
| val3dity | [validator](https://github.com/tudelft3d/val3dity) | Independent validation of 3D primitives, including OBJ input. A watertight mesh and normative 3D validity are different checks. | Add an external fixture validation stage later; now test manifold edge counts, orientation and analytic dimensions independently of drawing code. No claim of val3dity execution is made. |
| pymoo | [normalization and decision making](https://pymoo.org/getting_started/part_3.html) | Objectives on different scales can dominate comparisons. Decision preferences should follow comparable objectives and retain the underlying measurements. | Prefer normalized scores and a Pareto view over pretending USD+metres is a calibrated utility. The existing 176/352-candidate search is small enough to enumerate; a genetic optimizer is not the first need. |
| Overture Buildings | [schema](https://docs.overturemaps.org/schema/reference/buildings/building/) | Footprints, optional height/floors, building parts and property-level sources. Missing height is still missing. | Future offline second-source harvest with stable IDs, provenance, deduplication and explicit height inference. Do not claim complete 3D coverage from 2D footprints. |
| OpenSees | [source project](https://github.com/OpenSees/OpenSees) | A separate structural-analysis system, not a shape renderer. | Future professional model/benchmark adapter only. Current period sensitivity must not become a capacity/safety verdict. |
| buildingSMART validation | [scope](https://dev.validate.buildingsmart.org/) | Syntax, schema and normative rules are distinct validation layers. | IFC conformance would still not establish engineering correctness or local approval. |

Chen's [MIT thesis record](https://dspace.mit.edu/entities/publication/9e8d7dfe-e1b3-47bb-92cb-f2b4c004b558) describes conceptual design through embedded conventions and transformations. This supports FormHypes' early-design purpose; it does not validate the 2026 financial assumptions. The [Georgia Tech floorplate study](https://repository.gatech.edu/entities/publication/1dc9c5b2-a361-462d-9a84-33ddd5182fa3) also treats layout/circulation as a problem to model, supporting a future tenant-layout study rather than assuming corner count alone predicts commercial quality.

## What would make the next release useful to a person

A first-time architect should complete: choose a scenario → set an explicit brief → adjust a form → compare equal-area alternatives → inspect what changed → save → reload → export the same design. A reviewer should recover the assumptions and identify scenario outputs without reading source code.

The release gate should include a small reference pack: rectangular prism with known volume/skin; tapered prism; twisted nonplanar sides; all 11 profiles; every crown; a terrace; a nonuniform schedule; night/solstice solar cases; six mapped cities; an infeasible design; blocked storage; a restored old save. Test geometry, accounting, persistence and visible states separately. Continue narrow mutation tests, but publish which failures they target.

## Sequenced work after the contract repairs

1. Add an input-complete, versioned study package and import workflow with schema migration; include selected site/camera/analysis assumptions and code/data revisions. Brief persistence is only the first slice.
2. Expose tradeoffs and objective components/Pareto alternatives; calibrate rent, identity, construction and maintenance with project evidence. Separate arithmetic accuracy from predictive validity.
3. Add a staged independent geometry validator and IFC/Honeybee adapters. Gate each adapter on a round-trip fixture, units, coordinate origin, and retained schedule/quantities.
4. Benchmark actual interaction tasks on a phone and desktop with first-time people. Measure completion, undo/recovery, focus, frame latency and reproducibility; do not infer usability from screenshots alone.
5. Add analysis only when needed inputs exist: climate/material/occupancy and boundary conditions for energy/daylight; members/masses/stiffness/damping/loading for structural work. Any solver output needs a comparison benchmark and a stated model scope.

Bias check: the convenient response is to adopt a larger 3D/BIM stack because the view feels insufficient. The evidence currently favors correcting the shared data/geometry contracts first. This conclusion would change if user studies show that inability to exchange IFC or run a specific validated analysis is the dominant task failure after persistence and geometry agree.


## Implemented verification and remaining scope

The session added shared body/crown rings, triangular outward OBJ export (including custom schedules), crown-aware shadows and perspective height, supported-range search floors, full validated Brief persistence, deletion rollback, a persistent per-city ground cache, and the approved ranking normalization. A production deploy now refuses uncommitted working trees. A GitHub workflow runs the Node suite, focused contract mutations and release-pin reproducibility with pinned official actions and read-only repository permissions.

The test pack includes 110 profile/crown/twist meshes, independent prism volumes for all profiles, search-to-reload admissibility, exact full-Brief restoration, malformed-input atomicity, blocked deletion, cache lifetime, crown/shadow cache changes, feasible-set normalization and monetary-unit invariance. Test counts and actual CI/browser/live outcomes are recorded in the session closeout; a workflow file alone is not a CI pass.

Still explicit: the Stand Here drawing uses a footprint extrusion at total building height rather than a detailed crown silhouette. Crown economics use a scenario area coefficient while drawn crown profiles use linear scale factors; those quantities need calibration before quantity takeoff. No external val3dity, IFC, Radiance, EnergyPlus or OpenSees run was performed. Full reproducibility still needs import/migration of a package containing all desk assumptions and selected site, beyond the tower-plus-Brief shelf repaired here. Professional validation, empirical market calibration, and first-time human task trials remain release gates for claims beyond conceptual use.

Local verification: 290 tests pass; all ten targeted contract mutations are rejected. Independent review recalculated 8,160 feasible scores and checked 110 profile/crown/twist meshes. Browser preview round-tripped Brief GFA 242,000 m² and plate 2,400 m² through Save/reload/Restore. An actual downloaded post-crown OBJ reaches 287.905 m, matching the displayed 287.9 m. Responsive EN/TH/ZH evidence is retained in the session; these are agent observations, not first-time user trials.
