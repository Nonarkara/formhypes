# Integration review · 25 October 2026

## Work preserved

Reviewed the combined work through `2c208d5`, including the global display preferences, custom plot appraisal, crown/economics and responsive header changes. No open PRs, stashes, secondary worktrees or unique commits in tracked branches remained. PRs #1 and #3 are merged. PR #2 is closed without merging its SHA: all 31 paths are present, and its key modules entered main through `1f9721b`. Its old patch was not replayed over subsequent work.

## Repairs

- Exchange-rate input rejects impossible calendar dates, malformed currency records and duplicate rows; failed refresh preserves the prior dated book atomically. Model calculations remain SI/USD.
- Deployment publishes the recorded Git commit's public tree. Ignored checkout files cannot enter the upload; committed symlinks and private paths are rejected. Disposable fixtures exercised the actual deployer.
- Plot sizing and subsequent drawing use the same complete-edge containment check. Concave notches cannot be crossed between valid vertices. The bounded search avoids an oversized raster; one 40 × 24 m fixture improved from about 9.6 s to a median 0.057 ms.
- Rectangle dimensions show chosen units and convert edits back to metres. Invalid outlines offer correction guidance. Unit suffixes and the capped-range explanation appear once in EN/TH/ZH.
- Mapped building footprints are explicitly distinguished from surveyed land parcels, ownership and permission. The fit result is called a found fitting plate, since position search is heuristic.
- Phone camera controls open on demand and close after selection, returning keyboard focus. All seven tools remain available. Compass names and readings use separate baselines. The plot answer no longer draws a second adjacent divider.

The first three groups were incorporated by the other agent in `7b820e9`; this release completes their integration and the remaining corrections.

## Verification

- 637 tests pass. The main mutation command kills 70/70 mutants (61 integration, 3 release graph, 6 preferences). Seven new mutants cover phone controls, compass baselines, plot unit conversion, invalid outlines, concave reseating and repeated units.
- Real browser: all sixteen workspaces open without errors; EN/TH/ZH at 390, 1024 and 1440 px have no page overflow. Sixteen compass labels have no overlapping measured boxes. Independent saved-image review supplements the browser checks.
- Imperial/THB journey: edit rectangle, apply its plate, save, reload and restore the saved study. Four actual downloads contain data. JSON retains a 62 m span and SI/USD metadata; OBJ declares metres; quantity/candidate CSV headers use feet/ft²/THB.
- Dependency audit reports zero known vulnerabilities. Redacted Gitleaks scan of the four reviewed incoming commits reports no leaks. This is bounded evidence, not a claim that the full history or application has no security defects.
- Release pins are regenerated and checked for idempotence. Release is committed, deployed before push, then verified against public bytes and a live browser.

Screenshots and command logs are retained in `.scratch/shots/integration-2026-10-25/` and `.scratch/integration-*`. Existing evidence and other agents' work are preserved.

## Limits

Plot positioning is a bounded heuristic, not a globally optimal packing solution or planning approval. OSM footprints and inferred heights are contextual data. Wind, shadow and reflection desks retain their stated conceptual methods and exclusions; no engineering certification is implied. Chen's licensing remains deferred.
