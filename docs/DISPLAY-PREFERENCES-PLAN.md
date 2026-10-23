# Global display preferences · proposed implementation

Status: approved by Dr Non and implemented on 23 October 2026. Verification: DISPLAY-PREFERENCES-REVIEW-2026-10-23.md.

## User task and design read

Set familiar units and currency once, then read and edit the same building throughout the system without repeatedly configuring individual desks. A compact Settings dialog follows the existing export dialog, with content-sized labelled fields; the tower remains the dominant element outside the dialog. Reference: the system preferences panel of a technical drafting instrument, using the existing FormHypes dialog vocabulary.

## Critical decisions

- One Settings entry accessible on phone and desktop, outside the sixteen workspace tabs.
- Metric or imperial display; USD, CNY, THB and other currencies available from the reference-rate source. Language and number formatting remain independent of unit and currency choices.
- Defaults preserve today's metric/USD experience. Preferences persist in this browser and survive reload, study import, reset and workspace changes. A separate explicit action restores display defaults.
- Currency amounts are converted from the model's USD basis, with source, date and an approximate-conversion explanation in Settings. Use a bundled dated reference-rate snapshot for offline availability; explicit refresh may use Frankfurter's public API. A failed refresh retains the last labelled rate and never silently relabels USD as another currency.
- No temperature control yet: no actual Celsius/Fahrenheit readings exist. Temperature-dependent units, such as U-values, must still convert correctly when used in imperial display. Quoted source standards and research retain their original units and attribution.

## Sacred items and invariants

- Underlying geometry, simulation and finance stay in their current SI/USD basis. Preference changes preserve state and computed metrics exactly.
- Preserve every drawing, map, lab, study, chart, input and export. No file shrinks by more than30%; no typography reduction or clipped values to accommodate longer units.
- A value, its unit, its input bounds and its step must describe the same quantity. Compound rates convert both numerator and denominator, e.g. selected currency per ft² per year.
- Canonical JSON/OBJ remain explicitly labelled SI/USD for reliable import and geometry interchange; JSON records the chosen display preferences separately. Reader-oriented CSV exports use explicit selected unit/currency headers, with conversion metadata.

## Proposed changes

- NEW `dist/preferences.js`: validated preference storage, shared unit/currency conversions and number formatting; separate absolute temperature and temperature-difference conversions for future readings.
- NEW `dist/settings.js`: translated accessible dialog, currency choices and source/date/status, keyboard close/focus return and explicit display reset.
- NEW bundled exchange-rate snapshot and refresh helper, with input validation, timeout, labelled stale cache and failure recovery; CSP permits only the selected source if browser refresh is enabled.
- MODIFY `dist/index.html`, `style.css`, `console.css`, `app.js`, `i18n.js`: Settings entry and dialog; saved startup preferences; main controls, money/area/height readouts, search and study comparison use shared formatting.
- MODIFY display paths in `console.js`, `brief.js`, `decisions.js`, `environment-desk.js`, `structure.js`, `facade.js`, `walk.js`, `context.js`, `core.js`, `details.js`, `lifts.js`, `fire.js`, `wind.js`, `water.js`, `glare.js`, `carbon.js`, `quantity.js` as needed for their actual quantities. Keep pure model equations and source citations intact. Include canvas/SVG labels and technical compound units.
- MODIFY `scripts/release-id.mjs`: register new modules, assets and dependency edges; retain release graph validation.
- ADD behavioral conversion/persistence/export/failure tests and isolated mutation probes.

## Verification

- Exact length/area/volume/force/pressure/speed/mass and compound-rate conversions; input round trips; currency rate validation and cache failures.
- Preference changes leave canonical study state, metrics, ranking and raw geometry unchanged. CSV values match declared headers; canonical exports still reload correctly.
- Settings is reachable and operable with keyboard and on390px screens. Persist through reload and changing workspaces, language, saved study and reset.
- Inspect all affected displays in EN/TH/ZH; record390×844,1024×768 and1440×900 screenshots, chrome footprint, text fit, task visibility and independent review.
- Full tests, mutations and reproducible release pins; commit, deploy, push and verify public bytes plus live preference journeys.

## Reference

Frankfurter official documentation: https://frankfurter.dev/ — daily reference rates, currency catalogue, dated responses and cacheable observations. Currency conversion is a display preference, not a local construction-price or rental-market adjustment.
