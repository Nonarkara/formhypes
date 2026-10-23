# Release guard audit · 23 October 2026

Baseline `695780f`: 569 tests pass. The material localization and pinned candidate action are present in the live application. This pass preserves those changes and all public assets.

## Found

The release guard's claim was broader than its discovery. An independent reviewer reproduced three false-green releases in isolated copies, each after the real stamper completed:

1. `import "./missing-release-probe.js";` in `play.js` passed all four graph tests. The import readers recognized only single quotes.
2. A new import in `vendor/suncalc.js` and a new `vendor/new-release-probe.js` passed. Changing the new module and stamping again left the app hash unchanged. Discovery visited only top-level JavaScript.
3. A new `comment-probe.js` plus `/* 'comment-probe.js' */` inside SHARED passed. A commented filename counted as executable hash registration.

These are demonstrated gaps in the guard; no stale dependency was found in the current deployed release.

## Changed

- A locked development-only Acorn parser reads imports, re-exports and literal dynamic imports regardless of quoting, while excluding comment/string examples. Computed dynamic imports fail with a specific explanation because their targets cannot be verified statically.
- Module discovery descends into public subfolders, including the existing vendor module. References resolve relative to their importing file; references leaving dist are rejected.
- Stamper-list checks remove comments through the parser before reading registrations.
- CI installs the locked development dependency. The parser is not shipped to browsers.
- Four parser regressions and three full-stamp isolated mutations join the existing guards. `npm run test:mutations` runs both harnesses. No public JS, CSS, HTML, drawing or data file changes in this round.

## Verified

573 tests pass. The three new full-stamp mutations are killed independently by author and reviewer. All 32 existing mutation checks also pass: 35/35 defects are killed across the two harnesses in CI. The graph now discovers 49 modules, including vendor/suncalc.js, and 114 JavaScript dependency edges; HTML asset links are also checked. The previous 48 count described top-level modules only.

Live Thai comparison measurements:

| Viewport | Header + nav | Chrome share | Apply right edge | Page width |
|---|---:|---:|---:|---:|
| 390 × 844 | 109.95 px | 13.0% | 372 px | 390 px |
| 1024 × 768 | 170 px | 22.1% | 997.99 px | 1024 px |
| 1440 × 900 | 77 px | 8.6% | 1414 px | 1440 px |

Keyboard ArrowRight moves the phone scroller through its full 143px range and reveals the complete roof/twist, corner and height values; Apply stays pinned. Applying the first facade-objective candidate transferred its US$23,013,485 contribution to the form desk. One browser click timed out at the transport layer but had completed; reading the resulting form confirmed the value without repeating the action. No captured JavaScript errors.

Screenshots: `.scratch/oct23-codex/table-{390,1024,1440}-th.png`, reviewed independently. Seven design checks: existing content-sized controls, split composition, prose measure, script fonts, functional rules, tower/table hierarchy and chrome footprint are preserved. No new visual treatment or hidden columns were introduced. The screenshots do not establish a complete accessibility or usability audit.

## Remaining

Driver columns still require horizontal scrolling on a phone; candidate names wrap. The brief is a separate instrument with an explicit apply step. The book's tenth page and Chen's licensing remain untouched. The stamper still maintains explicit lists; this repair strengthens detection rather than replacing its architecture. HTML checks cover the current shell's asset attributes; this is not a crawler for arbitrary HTML, CSS or runtime URL construction.

Shared lesson captured before this log: `Scars/Debug-Logs/2026-10-23-release-graph-checks-must-parse-imports-and-inspect-nested-shipped-modules.md`.
