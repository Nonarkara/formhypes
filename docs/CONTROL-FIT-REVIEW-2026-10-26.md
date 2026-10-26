# Control fit and incoming-work review · 26 October 2026

Status: implementation and code checks complete; rendered acceptance incomplete. This is not a shipped-release receipt.

## Confirmed defects and changes

The Wind, Lifts, Evacuation and Carbon desks grow every segmented button to fill its row. On the live phone layout, the Lifts “On” label measured 15.31 px inside a 174.52 px button. The repaired control measures 37.31 px: the same label, 20 px horizontal padding and two border pixels. No font or label was reduced. All choices, selected-state bindings, explanatory notes, drawings and calculations remain.

The four segmented groups now keep intrinsic widths, wrap when needed, and use 32 px targets on coarse pointers with their existing gaps. Isolated actions and range controls retain their 44 px touch rules. Fine-pointer desktop controls retain their existing smaller targets. Settings and drawing dialogs were inspected initially; no corresponding stretch defect was confirmed there.

The incoming table draft prevented candidate-name fragmentation and froze the identity column, but moved Apply beyond the phone viewport: its button began at x522.62 in a 390 px viewport. The combined implementation preserves the named candidate column and its readable names, restores a named right-pinned Apply column, and reduces table-cell side padding to reserve space for the two money columns. Rendered acceptance of that combination is still required; passing the stylesheet guard does not prove visibility.

The incoming deployment drafts are preserved and repaired. Their initial credential preflight ignored valid environment credentials and Wrangler’s platform configuration location. The initial callback checked OAuth state without enforcing it and reported success before credential exchange/save. The revised flow validates state, method and exact callback path; binds to loopback; bounds waits; validates the returned credential; writes privately and atomically; and reports success after save. Environment aliases, complete API-key/email pairs, legacy config API tokens and OAuth precedence match the installed Wrangler behavior. Fixtures replace all external I/O. No real authorization exchange was performed in this audit.

## Checks completed

- Full code suite: 676 tests pass. Final focused validator and auth checks also pass.
- Four isolated CSS regression mutations complete normally with exit 1 after a passing baseline. Each restores growth in one of the four stylesheets. These are stylesheet guards, not rendered mutation proof.
- Twelve English browser measurements cover four labs at 390, 1024 and 1440 px. Measured button widths equal label plus padding/borders and no label clipping was recorded. The first receipt predates pointer-mode recording and therefore does not pass the final complete-matrix validator.
- Independent review found and closed two guard/tooling gaps: empty/zero-sized controls and missing flags could pass the receipt checker; legacy Wrangler API tokens were rejected. The checker now requires known group/control inventories, positive text bounds, explicit flags and measured pointer mode. A subsequent review correctly distinguished fine-pointer desktop targets from touch targets.

Evidence is retained under `.scratch/shots/control-fit-2026-10-26/`, `.scratch/control-fit-full.txt` and `.scratch/control-fit-css-mutants.json`. Before screenshots include the phone and desktop Lifts bars and the incoming table draft.

## Required before deployment

1. Complete fresh EN/TH/ZH measurements with pointer mode at all three widths; run `node scripts/control-fit.mjs <receipt.json>` against the complete 36-state receipt.
2. Capture repaired screenshots at 390/1024/1440 and obtain independent visual review. Measure the table’s candidate, contribution, delta and Apply boxes and hit targets; scroll to read each driver completely.
3. Restore one old growing CSS rule locally and require the same rendered check to fail; restore the repair and verify it again.
4. Complete release probes, commit/release-pin verification, deployment, push and custom-domain byte/browser verification.

Browser verification was interrupted by connector timeouts. Native-browser fallback encountered other concurrent browser work, so the unfinished states were not counted as passes. Production deployment is held until this evidence is available.
