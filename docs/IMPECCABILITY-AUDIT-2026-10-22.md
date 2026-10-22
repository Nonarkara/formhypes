# Interaction audit · 22 October 2026

Baseline: `5cd551c`, 554 tests passing. The previous header and drawing work is retained. This is a bounded release audit, not certification of every engineering assumption or a usability study with participants.

## Found and changed

- **P1: lift population could exhaust the browser.** The number field declared a maximum of 200,000 but its change handler accepted every positive finite number. `liftPlan(defaults,{pop:1e9})` requested 5,018,039 cars; the simulator creates an object per car. The field now checks native validity before refreshing, reports invalid input and restores the previous population. The pure calculation caps population at the same exported limit, including callers outside the interface. Floor geometry and the sizing equations are unchanged.
- **P2: twelve material buttons were hidden from screen readers.** Their individual accessible labels were present, but their ancestor had `aria-hidden=true`. The strip is now an exposed group named by its visible material label.
- **P2: material selection removed keyboard focus.** Every sync replaced all twelve buttons. Space selected a material and left `document.activeElement` at BODY. Existing keyed buttons now survive updates; their selected state updates in place.
- **P2: wind translations overclaimed safety.** English “Clear” became Thai “ปลอดภัย” and Chinese “安全” in both the result and family comparison. All three now say “outside the lock-in band.” The drawing, comparison and result share this scoped wording. No wind formula or threshold was changed.

## Verification

557 tests pass. The three added tests exercise the calculation/input boundary, the actual material synchronisation block, and the translated wind sheet. Five isolated defect reintroductions are killed by `node scripts/probe-impeccability.mjs`, each against a passing isolated baseline. The existing 20 shipability mutations also die. An independent reviewer found no additional blocker in the changed code and targeted tests.

Browser checks reproduced the original material focus failure on production, then verified that Space retained focus on “Reflective coated glass,” with `aria-pressed=true`, in the repaired release. Native input committed 1,000,000,000 people and recovered the previous 3,863. The browser automation's DOM `fill` did not dispatch the committed change reliably; its value alone was not counted as a successful check.

All sixteen Thai workspaces were opened at each viewport below. No document exceeded viewport width; the area figure and m² remained present. These measurements establish page geometry, not the absence of every local text collision.

| Viewport | Header | Workspace nav | Combined chrome |
|---|---:|---:|---:|
| 390 × 844 | 64 px | 45.95 px | 13.0% |
| 1024 × 768 | 95 px | 75 px | 22.1% |
| 1440 × 900 | 40 px | 37 px | 8.6% |

Visual inspection: Thai phone assembly, Chinese tablet wind and Thai desktop wind. The seven design checks: controls fit their content; existing split composition retained; prose measure unchanged; existing script fonts retained; no new ornament; tower and active study remain the focal content; no added chrome. No CSS or drawing geometry was changed. The full area figure and existing drawings, map, city context and sixteen workspaces are preserved.

## Remaining

The tablet header remains two bands. Material names and assembly annotations still contain English in translated views. Small phone drawing labels merit a dedicated magnification/reading study. This pass did not validate the six labs against external professional solvers, remeasure every detail annotation, or conduct a screen-reader user study. No claim of complete impeccability follows from passing tests.

Memory source: `Scars/Debug-Logs/2026-10-22-audit-interactive-ancestors-and-retained-focus-not-just-button-labels.md`.
