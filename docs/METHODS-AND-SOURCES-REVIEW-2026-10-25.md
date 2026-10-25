# Method readability and source review · 25 October 2026

## Scope and preserved work

Continued from `ed0db11`, after the previous integration, material-provenance and glare audits. The current repository still has one checkout, no stashes or open PRs, and no unique commits on the remaining tracked feature branch. Existing preferences, studies, maps, lab drawings and calculations outside the specific corrections below are preserved.

Two independent source reviews covered consequential wind/structural/carbon and water/lifts/fire formulas. A third reviewer inspected the implementation and saved images, then challenged the calculation fixes. This is a bounded review of a conceptual teaching system, not certification or proof that every possible state is defect-free.

## Readable drawings

At 390 px, the five remaining compact method sheets had annotation rectangles only 5.5–10 px high. Their drawing boundaries fit, but their words could not be read. All six labs now share one native vector-drawing dialog. The original overview stays in place; the dialog clones that exact SVG and derives enlargement from its smallest declared annotation. It adds no calculation or alternative result.

The dialog fits the viewport, offers localized instructions and Close, and gives keyboard focus to a scrolling region. Escape returns focus to the command. Closing clears the copied SVG and resumes a previously running owner only when that owner remains connected and visible. Glare retains its existing explicit pause behavior. Figure captions remain the last figure child.

Actual-browser evidence covers six labs × EN/TH/ZH × 390/1024/1440 px. The checks compare the displayed copy with the source, measure dialog containment and text rectangles, check document overflow and verify returned focus. Keyboard ArrowRight/Escape checks cover Water, Fire and Carbon in addition to the prior Glare journey. Images and measurements are retained in `.scratch/shots/methods-2026-10-25/`.

## Calculation and provenance corrections

| Finding | Correction | Executable evidence |
|---|---|---|
| Evacuation lifts rounded trips after combining an entire zone, despite claiming one floor per trip. | Round each floor separately; schedule highest floors first onto the next available car, including its actual travel, doors and passenger transfers. Dispatch remains an explicit scenario assumption. | Ten floors with one passenger each require ten visits. Passenger totals, per-car scheduling and last arrival are checked independently. |
| Fire animation continued showing an average-floor trip after the scheduling repair. | Drawing positions now read actual per-car jobs, floor heights, acceleration, dwell and idle periods. Horizontal shaft spacing remains schematic. | Sample loading and return positions for every scheduled trip. |
| The Barney AWT approximation returned numbers above its stated 80% car-load range. | Return unavailable above 80%, propagate that through aggregation and curves, and explain the missing approximation in all three languages. Simulation remains separate; physical saturation remains distinct. | Fixed 90% group and an actual seven-car design retain unavailable values rather than zero or extrapolated waits. |
| Drainage animation placed the same storm water on the roof and underground. | Track inflow, roof storage and actual collected volume, including drainage after rain stops. Eventual tank-sizing volume stays unchanged. | Inflow equals roof storage plus collection throughout storm and drain-down. |
| Vortex onset used the force reference width at 2H/3. | Use width and wind at maximum modal displacement, the roof in the stated cantilever mode; keep force integration separate. Animation and method labels use the same roof reference. | A 40 m square tapering to 20 m uses 20 m in the vortex equation and retains 26.67 m at the force reference. |
| Unsupported plan-family Strouhal values claimed tabulated provenance; square value was 0.11. | Square is 0.12; only a normal, untwisted sharp square claims the tabulated basis. Other retained values are explicitly assumptions. | Shape, aspect, twist and wind-direction counterexamples exercise provenance. |
| The first vortex correction substituted roof mass for modal equivalent mass. | Integrate mass weighted by the square of the declared mode shape over the existing 48 strips. Uniform floor mass and storey height remain assumptions. | Analytic tapered-square integrals for all three system/mode choices; uniform-section control. |
| A5w omitted waste haul and processing from the cited IStructE equation. | Add explicit 0.005 haul and 0.013 processing kgCO₂e/kg wasted, and expose the accounting terms and defaults. Installed-structure end-of-life remains excluded. | Hand calculations, component sum and rendered-method disclosure. |
| Thai transport text labeled a gram-based factor as kilograms. | Label the actual 0.10749 factor in grams, matching EN/ZH. | Read the Thai SVG output and reject the old kilogram label. |

An imperial browser journey also exposed mixed-expression conversion errors. Fire reference text now converts physical quantities before composing the finished sentence: the two boundary layers remain a dimensionless count, mean and uncertainty both convert, and specific flow uses reciprocal width. Pauls’ formula density stays explicitly SI. Published carbon transport and waste coefficients are also explicitly SI, rather than letting a generic label formatter alter only part of a compound unit. Rendered EN/TH/ZH tests cover those paths.

Unverified stair travel multipliers are now identified as scenario assumptions in the visible control and source notes. Refuge capacity explicitly identifies the combined HK area/GB density assumption. Neither was silently retuned. An initial suspicion about concrete GGBS factors was disproved by the 2022 source edition, so those factors remain unchanged.

## Sources and limits

- [EN 1991-1-4:2005](https://www.phd.eng.br/wp-content/uploads/2015/12/en.1991.1.4.2005.pdf), E.1.3.1, Table E.1, Figure E.1 and F.4/F.14. The standard itself was inspected as a PDF and extracted text; square graph and table images were checked. Local evidence: `/tmp/formyield-audit-wind.pdf`, accompanying text and figure images. The host is a reproduction of the primary standard.
- [IStructE, How to calculate embodied carbon, second edition, 2022](https://www.egbc.ca/getmedia/a7603519-43cc-4795-8558-6960b2b7b5d1/HTCEC-2nd-edition.pdf), Eq. 2.3, Table 2.7, Eq. 2.8 and worked example p.46. Inspected PDF and extracted text retained at `/tmp/formyield-audit-ec.pdf` and `.txt`. These are generic defaults for construction waste, not supplier EPDs.
- [G. C. Barney, Uppeak Revisited](https://liftescalatorlibrary.org/paper_indexing/papers/00000286.pdf), Eq. 4. The primary paper's indexed extraction states the 50–80% approximation and excludes higher loads. Direct PDF retrieval timed out; no claim of PDF-page inspection is made for this source.
- [HK Buildings Department, Code of Practice for Fire Safety in Buildings 2011](https://www.bd.gov.hk/doc/en/about-us/fs_code2011.pdf), B18. The interface distinguishes its refuge-area rule from the density borrowed for the scenario.

Wind remains a static-load and resonance-screening model with assumed damping/mass, without a stiffness solution, CFD or wind-tunnel results. Carbon remains an order-of-magnitude structural model with no foundations or A5a site activities. Fire remains an evacuation scenario without a tenability calculation, and lifts remain a simplified traffic model. Source alignment improves those claims; it does not widen their applicability.

## Release verification

The final suite passes 666 tests. Existing spatial guards remain unchanged: they caught an added wind note and the longer Thai carbon notes exceeding their frames. Wind gained the space required by its additional reference line; Carbon derives its frame height from the populated annotation columns. All 54 final browser combinations fit, preserve the exact source SVG, return focus and avoid document overflow; enlarged annotation rectangles are at least 21 px high. Nine additional imperial Fire states retain correct boundary counts, uncertainty and reciprocal flow. The actual evacuation-lift scenario and unavailable AWT copy work without browser errors.

Independent source, code and saved-image review found no further confirmed issue in these changes. Dependency audit reports zero known vulnerabilities. The release graph includes both shared viewer assets and every new import edge. All 92 mutation probes pass (83 main, three release-graph, six preferences), with a passing isolated baseline and normal child exits. A redacted Gitleaks scan of the staged change reports no leaks. Release stamping is idempotent. Deployment uses the committed public tree, then push and live asset/browser verification; command logs and live proof are retained under `.scratch/methods-*` and the screenshot directory above.

Verified memory: `Scars/Debug-Logs/2026-10-25-vortex-reference-width-and-modal-equivalent-mass-need-different-spatial-references.md`; per-floor trip-rounding lesson was captured separately by its implementing agent.
