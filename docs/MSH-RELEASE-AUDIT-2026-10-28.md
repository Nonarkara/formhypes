# Release audit · 28 October 2026

Scope: MiniMax/MCode work through `f866521`, including the earlier `fc9da28`
control/auth changes, and this round's narrow comparison and camera-tool fixes.
No geometry, financial or engineering formula changed in this round.

## Reconciliation

The checkout began clean on `mcode/sheet-text-budget`, equal to origin/main.
All local branches were ancestors of HEAD; no stash, extra worktree or open PR
contained unique work. Preserve the accumulated implementations. The changes
below supersede the compare-table scrolling limitations recorded in
`MSH-COMPARE-TABLE-REVIEW-2026-10-26.md` and
`MSH-SHEET-BUDGET-2026-10-28.md` for the measured narrow desks.

## Found and changed

* Apply was outside the phone: x481–549 against a390px viewport and354px desk.
  Two frozen table edges had previously covered drivers; unpinning the action
  merely moved it off-screen. Below600px **actual desk width**, existing native
  table rows now compose identity/action, money/change, then all drivers. All
  values, translations, headings and the normalized score remain. The wide
  desktop retains its table. No alternative calculation or duplicate action.
* Expanded phone camera controls wrapped six-and-one. Four view modes now
  share the first row; zoom and wireframe share the second. Buttons keep their
  intrinsic widths and44px targets; the toolbar occupies205–257px rather than
 350px. Its92px height is earned by two rows, not an inflated empty box.
* Credential fixtures inherited the operator's Cloudflare authentication and
  failed in a legitimately authenticated environment. They now isolate all six
  supported credential aliases. A synthetic ambient-token reproduction passes
 5/5; no real credential was copied into a fixture.

## Rendered evidence and budgets

Saved in `.scratch/shots/audit-2026-10-28/`. Measurements come from the browser;
`control-fit.mjs` validates receipts and does not render a browser itself.

| Surface | Cases | Result |
|---|---|---|
| Four lab choice groups | four × three languages × three widths |36 receipts pass; complete labels, one selection, intrinsic widths |
| Candidate decisions | yield and civic × three languages × three widths |18 receipts pass; no horizontal scroll, clipped cell or overlap |
| First narrow candidate |390×844 and1024×900 |143.69px; identity, action and money together; first decision visible |
| Wide candidate row |1440×900 |41px; all columns retained |
| Actual working viewport |1280×720 |first candidate y271–414, Apply x1186–1254; no horizontal scroll |
| Settings |three languages × three widths |nine contained dialogs; no internal clipping/scroll |
| Console bars |sixteen workspaces × three languages × three widths |144 states; no measured text clipping/document overflow; no page errors |
| Expanded camera tools |three languages at390×844 |four-and-three grouping; every target at least44×44px |

MiniMax's Form changes remain: the plan is named once, the sheet number shares
its notice row, and the601–900px Form split matches the phone's drawing share.
Independent screenshot review confirms readable qualifications and a dominant
tower at390/1024/1440. At390×844 the drawing field is about407px; the earlier
447px figure belongs to a900px-high phone test. The footer is counted once.
The700px header also exposes controls hidden on the phone; matching the grid
ratio does not prove strictly increasing physical drawing height at every
breakpoint. Source guards are not a universal rendered monotonicity claim.

Budgets reject the old failures: restoring lift stretch produces174.52px On
instead of37.31px and fails the same label-plus-padding gate. Disabling the
candidate container query restores181px overflow and the off-screen action;
the same decision gate fails. Both mutations were local and restored.

The seven design rules: (1) stretched controls and off-screen decisions repaired;
(2) no orphan camera control; (3) existing prose measures retained; (4) fonts
unchanged; (5) no ornament introduced; (6) drawing/money retain priority;
(7) no extra reading band or action duplicate. This is the inspected scope,
not a declaration that every possible state is flawless.

## Verification and independent review

* 693 full-suite tests pass on the restored final public tree.
* 105 standard mutation probes killed, plus the newly added camera-tool mutant
 killed in an isolated fixture after its baseline passed:106 total. The updated
 standard harness includes that case for subsequent runs.
* Apply updates the actual phone contribution to the candidate's $23,013,485.
 Explicit Save survives reload and restores that figure; the audit fixture was
 removed. Unsaved editing is not automatically restored on reload.
* The stamper is idempotent; the release graph, clean-tree deploy boundary and
 fixture authentication checks pass. No new dependency or external API added.
* A fresh independent reviewer inspected Form, all18 candidate screenshots,
 Settings and all three expanded-tool screenshots. Its ambient-auth finding
 was fixed; score coverage was added, and deleting score yields45 gate failures.
 No confirmed visual/code blocker remains in that reviewed scope.

Physical touch hardware and a real screen reader were not exercised. Measured
browser pointer mode was fine; compact Apply remains32px and camera targets44px.
The native table/heading structure appears in the browser accessibility tree.
Deployment and live-byte results are reported separately after this audit commit.
