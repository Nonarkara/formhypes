# Glare radiometry and readable drawing · 25 October 2026

## Confirmed defect

The lab projected reflected beam footprints onto horizontal ground, but accumulated `DNI × Σρ`, which is a sum of irradiances on different beam-normal planes. The method payload and diagram agreed with that calculation, so the existing consistency guards could not detect the physical error. “A surface facing them” did not resolve the problem when several rays arrived from different directions.

An independent reviewer reproduced a one-square-metre vertical mirror under a downward ray with vertical component −0.5. With unit reflectance and DNI 800 W/m², the old result was 800 W/m² over a 1.73205 m² horizontal footprint: 1,385.64 W received, although the mirror intercepted only 692.82 W. Correct horizontal irradiance is 400 W/m². Two symmetric rays also showed that no single planar receiver can face both beams normally.

## Source and derivation

[NASA POWER, Derived Parameters: DNI](https://power.larc.nasa.gov/docs/methodology/energy-fluxes/derived-parameters/) defines the reference plane as perpendicular to the ray and relates horizontal direct irradiance to its zenith cosine. Applying that receiver projection to reflected directions is our derivation:

```
E_horizontal = DNI × Σ [ρ_i × max(0, −r_i,z / |r_i|)]
```

This is not a NASA building-validation procedure. No additional mirror-incidence factor belongs in that expression: mirror interception already determines the projected footprint. The independent conservation identity is received irradiance times horizontal footprint area equals DNI times reflectance times mirror area times mirror-incidence cosine.

[City of London, Solar Glare Planning Advice Note, July 2017](https://newsite.cityoflondon.gov.uk/assets/Services-Environment/solar-glare-planning-advice-note.pdf) remains the existing reflectance-curve/methodology reference. Cover, contents and introductory discussion were retrieved this round; a later fetch timed out. No claim is made that the entire planning method or all the lab's historical examples were revalidated. The angle-dependent extension is explicitly an illustrative broadband assumption, rather than a measured product spectrum. Both primary references are now reachable from the lab.

## Changed

Cell contributions and peak/convergence ranking include the ground cosine. Cached frames carry reflected directions. The diagram retains raw reflectance, adds each receiver cosine and weights its bar by actual ground contribution. Its formula, sum, reference DNI units and the EN/TH/ZH readouts now specify the same horizontal receiver. The cosine is computed once per beam, outside the raster callback.

The lab labels its fixed 800 W/m² DNI and broadband reflectance as assumptions. These are incident reflected irradiance estimates, not absorbed heat, temperature, disability-glare or eye-safety results. All lofted skin facets use the selected reflectance; no verified product or glazing fraction is modeled.

An independent visual review found that the overview's phone annotations needed enlargement. A native dialog now shows a copy of the same vector drawing at 1000 px, with a focusable scroll viewport and translated instruction. The compact overview remains in place. Opening pauses the animation; Close and Escape return to the opener. Missing results disable enlargement.

## Verification

645 tests pass. Five new tests check exact mirror-power conservation, mixed-direction overlap, a ground-peak ranking reversal, cached frame/payload direction and non-destructive enlargement. Existing diagram-number, proportional-bar, multilingual, collision and frame-boundary tests remain. Mutation probes cover omitted receiver projection, lost frame direction, beam-normal method contributions, removed overview and a viewer that never opens.

A comparison against the prior committed module, with default state, explicit ρ=0.13 and the same geometry/sampling, found:

| Scenario | Previous peak W/m² | Corrected W/m² | Duration raster / overlap count |
|---|---:|---:|---|
| Bangkok, 21 June | 1,155.4 | 1,130.4 | Identical |
| Bangkok, 21 December | 769.2 | 612.2 | Identical |
| Tokyo, 21 June | 1,131.9 | 1,101.1 | Identical |

These are sensitivity examples under a fixed irradiance assumption, not city weather predictions.

Real browser: overview and enlarged method at 390 × 844, 1024 × 900 and 1440 × 900 in EN/TH/ZH. No document overflow, clipped method labels or browser errors. Enlarged modal stays within viewport; measured text rectangles are 19–21 px high. Keyboard ArrowRight pans 662 px on phone; Escape closes and restores focus to the enlargement command. Source SVG stays present. Independent source/test and saved-image review found no remaining issue in this change.

Evidence: `.scratch/glare-*` and `.scratch/shots/integration-2026-10-25/glare/`. Verified lesson: SecondBrain `Scars/Debug-Logs/2026-10-25-beam-normal-irradiance-cannot-be-summed-as-horizontal-ground-irradiance.md`.

## Standing goal

This closes the confirmed receiver-plane defect and the reviewed drawing-readability failure. Full system completion is still unproven. Remaining work includes source-by-source checks in the other labs, their expanded/error states and method-drawing readability, and reconciliation of any other mismatch between claims, calculations and rendered evidence. Existing conceptual exclusions remain in force.
