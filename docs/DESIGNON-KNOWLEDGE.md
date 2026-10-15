# Architectural knowledge acquired from designon

Source: `/Users/nonarkara/Projects/space`, repository `Nonarkara/luma-house`, clean source commit `6754f369dc8cfd79bd642e5e0dd8751f7a867b4a`, extracted 14 October 2026. The project's current CLAUDE.md identifies this tree as designon.nonarkara.org. Each reviewed file is pinned by GitHub URL and SHA-256 in `dist/knowledge/designon-knowledge.json`.

## Acquired knowledge

| Layer | What was extracted | Use in FormHypes |
|---|---|---|
| Drawing conventions | AIA Architectural Graphic Standards, Student Edition, 11th ed. (2008), reviewed printed pp. 445–446 and 514–518; solid cuts, line weights, centreline dimensions, parallel views, scale and sheet identification | Available as drawing guidance in the knowledge panel. Physical print conventions require a future sheet exporter. |
| Reference standards | Twelve catalogue entries: IRC, IBC, ADA, ASHRAE and three internal MODEL labels | Preserved as source references with scope; no imported residential threshold is enforced by the office optimizer. |
| Stored thresholds | Eight numeric comparisons for residential room area/width/height, doors, turning and kitchen/bathroom exhaust | Preserved exactly for provenance; not asserted as adopted local law or commercial office requirements. |
| Building science | Daylight reach, pressure-connected airflow, steady-state envelope heat and room-door route connectivity | Equations, confidence and missing inputs recorded. These solvers have not been ported into the tower engine. |
| Decision method | Show consequence where the design changes; explain the equation, value, confidence and next move | Supports the existing spatial performance view and future scenario comparisons. |

## Important source findings

- `minDoorClearWidthM` is stored as 0.81 m, while its comment describes 815 mm. Treat this as an unresolved source discrepancy before enforcement.
- Turning diameter is stored as 1.5 m; its comment also says 60 in (exact conversion 1.524 m). Preserve the original and verify the applicable reference before selecting a threshold.
- Residential ceiling checks and ASHRAE 62.2 examples need office-specific applicability and exception handling.
- The older `ventilation.ts` opening-count score is weaker than the audited `windFlow.ts` pressure-connected model. Use the latter approach for any adaptation.
- The reviewed standards catalogue supplies no high-rise stair/core sizing, office occupant-load pack, office rent standard or rentable-area measurement convention. Those remain acquisition and implementation work.

## Boundaries

The knowledge panel presents source-derived references. It does not label the current tower compliant or change its area, corner-office or financial formulas. Commercial use requires a jurisdiction, building occupancy, adopted editions and the geometry those checks actually need. Environmental heuristics must remain separately labeled from validated simulation. Book graphics are not reproduced. Source code/documentation attribution and MIT license are preserved in `dist/knowledge/DESIGNON-LICENSE.txt`.

Regenerate the pack with `python3 scripts/extract-designon.py` against the named local source checkout. Review differences before applying any rule. This is a reproducible extraction, not a self-updating standards feed.
