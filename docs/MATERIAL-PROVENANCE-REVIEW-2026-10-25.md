# Material provenance review · 25 October 2026

## Found

The material catalogue presented twelve unsourced building associations as `thesis` provenance. Its header called numeric presets published ranges without providing a bibliography. The reader saw carbon and maintenance numbers, although those fields do not calculate material performance anywhere in the model. The old explanation also claimed the material only changed the envelope reserve; `evaluate()` applies its coefficient to envelope capital cost as well.

The baseline's “Sears Tower 1929” is contradicted by primary evidence. The other associations have not been established as evidence for these presets. Names or a building photograph cannot validate a product rating or financial coefficient.

## Sources actually inspected

- [SOM, Willis Tower](https://www.som.com/projects/willis-tower-formerly-sears-tower/): the narrative dates completion to 1973, while its metadata lists 1974. Its skin description names black aluminium and bronze-tinted glass. Neither supports a 1929 clear-float-glass preset. This review does not resolve SOM's internal date difference or use the building as a source for optical/carbon values.
- [Pilkington, Invention of Float Glass](https://www.pilkington.com/en-us/united-states-and-canada/about-us/pilkington-history/invention-of-float-glass): development began in 1952 and the process was announced in January 1959. Historical context only; no preset performance values adopted.
- [ENERGY STAR, Independently Tested and Certified Energy Performance](https://www.energystar.gov/independently-tested-and-certified-energy-performance): explains NFRC product ratings and the meanings of SHGC and visible transmittance. This is methodology context, not evidence that a generic material name has a particular rating or that this tower is certified.
- [Vitro flat-glass EPD, SCS-EPD-08776](https://www.vitroglazings.com/media/nf0nm25r/epd-flat-glass-products.pdf), version 12 March 2024: cover and printed pp. 1–5 inspected. Declared basis is a metric tonne; the assessment covers A1–A3 and leaves later stages undeclared. It identifies applicable products and comparability limits. It cannot be pasted into kgCO₂e/m² of a complete façade without product/quantity and scope reconciliation. No carbon factor is adopted from this EPD.

Search snippets exposed the AGC EPD and NFRC technical-documents page, but direct retrieval failed (503/403). They are not relied on for this change. Vitro's marketing example contains suspect units, so the primary EPD itself is the linked evidence.

## Changed

All twelve choices remain. Their numeric presets and calculation results are preserved, and their basis is explicitly `scenario-2026`. Unsupported building associations are removed. The visible note states that the envelope reserve and capital coefficient is unverified. Carbon, optical and maintenance pseudo-results no longer appear as product performance.

A native disclosure provides the product-rating and EPD references in EN/TH/ZH and explicitly says those references do not validate the presets. Schematic surface patterns and opaque/glazed quantity grouping are retained. Legacy numeric fields are marked inactive assumptions in source; they do not become new performance results.

JSON records the selected key, coefficient, baseline, verification status and affected financial calculations. This metadata explains the exported result; it does not select a product or import an EPD.

## Verification

640 tests pass. Three new behavioral tests run the actual model for all twelve choices, render the actual material note in all three languages and execute the actual JSON download handler. They verify both reserve and envelope capital consequences, unchanged area/rent and the exported assumption. Three added mutations remove the qualification, falsify verification status and drop the JSON basis.

Real browser: select photovoltaic glass; reserve/capital coefficient 1.55 and changed contribution are visible. Actual JSON download retains SI/USD and records `verified:false`, null product/EPD and the selected coefficient. Expanded disclosure checked at 390 × 844, 1024 × 900 and 1440 × 900 in EN/TH/ZH: no page overflow or clipped disclosure text. No browser errors. Independent review found no actionable defects in five representative saved screenshots and confirmed the capital-cost correction.

Screenshots: `.scratch/shots/integration-2026-10-25/materials/`. Test and mutation logs: `.scratch/material-*`. No CSS changes, removed material choices or changed financial assumptions.

## Goal completion remains unproven

The standing objective remains a shipable professional system with no spatial hallucination, coherent behavior, sound CSS and verifiable research. This round substantiates the material surface and export; it is not proof for every surface or claim.

Remaining acceptance work: audit the numerical and historical claims in other labs against their exact sources and units; exercise their expanded/error states and source disclosures across scripts and widths; reconcile any remaining mismatch between stated method, rendered drawing and actual computation. The earlier integration review supplies specific geometry and release evidence, not blanket research validation. Conceptual method limits must remain visible rather than being mistaken for engineering validation.
