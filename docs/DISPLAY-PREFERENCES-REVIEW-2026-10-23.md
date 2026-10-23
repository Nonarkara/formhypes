# Display preferences · 23 October 2026

One global Settings command, outside the workspace list, controls metric/imperial units and currency. It saves to this browser independently of the building, studies and language. Defaults remain metric/USD. The existing Manual command is inside Settings.

## What changes

Controls convert displayed values, bounds, steps and edited values back to canonical inputs. Main metrics, tower/plan/core/detail drawings, six labs, Brief, Façade, Walk-in, Effects, comparison charts, the live Research experiment and reader-oriented CSVs follow the selected units/currency. Effects also converts air density, flexural rigidity and mass per height. US gallons and short tons are explicit.

Reference-rate conversion retains the original USD construction/rent price basis. It is not local market pricing. Settings shows the source and the selected currency's rate date. A bundled Frankfurter snapshot works offline; Refresh rates replaces it only after validation. Failure keeps the dated prior rates. Preferences and cached rates use separate storage keys.

JSON remains SI/USD and records display preferences plus the selected exchange-rate provenance separately. OBJ remains in metres. Alternatives CSV headers name the selected units/currency and include the rate/source/date. Quantity CSV converts before its existing rounding/balancing, preserving printed column totals. Export copy explains these distinctions in EN/TH/ZH.

No temperature selector is shown: there are no actual temperature readings. Absolute-temperature and temperature-difference helpers are tested separately for future readings. Imperial thermal transmittance already uses Fahrenheit-based units. Historical quotations, source standards and downloaded research protocol retain original units.

## Findings corrected during verification

- A Unicode-letter boundary missed Chinese prose touching a numeric unit. Both `100 米处` and `1,400米追踪范围` now convert, while formula identifiers remain intact.
- The live Research table/chart had remained SI/USD; its converted values, axes and labels now have an executable three-language render test.
- Rent and structural-grid choice labels had retained metric units; they now track the actual controls.
- Large baht values crowded the phone comparison table. Currency is named in the header, compact amounts fit the rows, and exact values remain in accessible names/titles.
- Settings status text was faint amber on paper. Independent visual review measured 1.78:1; the corrected status uses ink.
- The plan's overall dimension had been using screen-scaled pixels as metres. It now divides by the drawing scale before formatting.

## Evidence

- `npm test`: 593 passed, zero failed.
- `npm run test:mutations`: 40 isolated mutations killed, including six new conversion/persistence/failure probes. Each preference probe runs after a passing copied baseline. Do not count the earlier lab probe attempt with missing fixture dependencies; it was withdrawn.
- Independent review reproduced and closed the Chinese conversion and Research gaps, checked conversion geometry invariants, and reviewed Settings screenshots at 390/1024/1440.
- Real browser: all sixteen workspaces opened under imperial/THB without console errors; Settings inspected in EN/TH/ZH, CNY selection worked, reload retained preferences, and explicit rate refresh succeeded.
- Downloaded JSON under imperial/CNY still declared metres/m²/USD, span 48 and height 214.405, with separate imperial/CNY display metadata and the selected dated rate.
- Phone comparison inspected in English and Thai: contribution, delta and Apply fit. Settings prose, selects, source, date and actions fit all three viewport sizes.
- Thai chrome (unchanged footprint): 110/844 px at 390, 170/768 at 1024, 77/900 at 1440. No document horizontal overflow at those widths.

The remaining 1024px two-band header is the pre-existing layout. Long comparison drivers can still scroll. Historical source text intentionally retains its original units.

Shared verified lesson: SecondBrain/Scars/Debug-Logs/2026-10-23-chinese-prose-can-touch-a-numeric-unit.md. Source: Frankfurter official documentation, https://frankfurter.dev/.
