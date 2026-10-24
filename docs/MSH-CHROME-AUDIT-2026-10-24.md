# The chrome round · MSH audit of 24 October 2026

Scope: `main` at `201b1ad` plus this round's repairs; the local build served from
`dist/`; the sixteen workspaces of the console, at 390, 1024 and 1440 px, in
English, Thai and Chinese. Target: the instrument's own frame — the header that
carries the studio's parameters, the strip that switches the workspace, and the
desks whose tables have to fit their columns.

This is a concept release. It does not establish structural adequacy, code
compliance, market value, indoor daylight or energy performance.

## What was checked, and how

| Surface | How | Result |
| --- | --- | --- |
| The whole console | a sweep of 16 workspaces × 3 widths × 3 languages, measured in the rendered page | 144 measurements before, 144 after |
| The header's geometry | the header's own box against the boxes of its children | the destinations overran it by 3px |
| The strip | the rows it broke into, and the void beside them | it broke in two |
| The desks | every element wider than the column it sits in | one table wider than its column |
| The headline figure | the bar's contents against the room the header leaves it | 11px short in Thai |

Every number in this document was measured on the page. None was read out of a
source file, and the four defects below were invisible in the source: the CSS
that caused each one said something sensible.

## Found

**1. The header was smaller than its own contents.** The header is 40px of
chrome. Its two destinations — STUDIO and RESEARCH — were a fixed 46px tall,
the height the header had before the compact chrome cut it. They hung three
pixels below the header's rule and lay across the workspace strip underneath,
and the active tab's amber underline sat *on* the header's black rule instead
of above it. Measured: the anchor's box ran from y = −3 to y = 43 in a header
that ends at y = 40. Every width above 900, in every language.

**2. The workspace strip broke in two.** Sixteen workspaces, side by side, need
about 1400px; the band at 1024 has 1000. So the strip wrapped — eleven on the
first row and five on the second in English, ten and six in Thai — and the
five on the second row stood beside roughly 550px of nothing. The strip cost
75px of chrome instead of 37. The law's own note in the stylesheet had said
"Fifteen and an orphan is a row of noise with 1300px of void beside it"; the
same shape was there in every language, only with five orphans instead of one.

**3. The Feng Shui table was wider than the column it sat in.** The table's
headers were held on one line, and the mass cell's `34 · 17,715 m² · 64 m`
could not break, so the table's smallest honest width was 457px. Its column at
1440 is 432px and at 390 it is 354px: at 1440 the last column ran 25px past
the sheet and was cut off the page, and at 390 it ran 103px past. A rule
intended to fix this existed and did not: `console.css` says "Feng Shui table
headers wrap rather than clip", and `desks.css`, loaded after it, held them on
one line anyway.

**4. The headline figure was clipped in Thai.** The header's parameters were
placed by a constant — `max-width: 1439px` — measured from one language. Thai
needs more header than Chinese, and in the difference the bar was squeezed: at
1440 the bar had 587px of the 598 it needed, and `58,981 / 72,000 m²` lost its
unit. The number was read in every language and was wrong in one.

**5. The drawing beside that table had no room for its own tools.** The Feng
Shui layout gave the drawing 348px at 1024 while the floating tool row over
it — View, Neighbourhood, Plan, Core, zoom, wireframe — is 363px wide. The
last tool hung off the edge.

**6. And a defect of this round's own making, found by the evidence.** The
repair for finding 4 decides by measuring the header. A `captureScreenshot`
with a clip resizes the viewport, the resize fires before the layout has
settled, and the measurement taken in that moment removed the bar's own row —
putting the parameters back where they do not fit, with the figure clipped
again. A measurement that changes with the answer it gives can be flipped by a
layout that has not settled. It is fixed by making the measurement independent
of its own answer (the bar's left rule is made transparent rather than
removed, so it occupies its pixel either way) and by measuring again on the
frame after the resize.

## Changed

**The header's destinations fill the header.** The fixed 46px is gone; the
anchors take the header's own height, and the active tab's rule sits above the
header's rule where it belongs.

**The strip is one row.** Between the phone and the laptop the mark sits over
its word, the way the phone has always drawn it, and all sixteen land on ONE
row: 50px of chrome instead of 75, sixteen named workspaces, no void. Above
1360 the side-by-side arrangement still fits all sixteen in a row and is kept.
Below 950 — where sixteen named workspaces cannot share the band at all — the
strip scrolls sideways with the cut-off label as the signifier that there is
more, which is the phone's arrangement. This partly reverses the decision of
22 October, which refused a sideways scroll for the desktop band: the band that
decision protected (1366 and above) is untouched, and the band where the
scroll appears is the one where the alternative was a ragged second row.

**The Feng Shui table fits.** The headings wrap, and the figures may break, so
the table's smallest honest width is now smaller than its column: 432px at
1440, 354px at 390, nothing cut. The dead rule in `console.css` now has the
last word, as it was written to.

**The drawing keeps room for its tools.** The Feng Shui layout gives the
drawing's column a floor of 380px — the tool row is 363px, and a drawing whose
tools are cut off is a drawing the reader cannot operate.

**The parameters are measured, not placed by a constant.** `fitSiteBar` reads
the bar's own contents — whose labels do not wrap, so they cannot shrink and
their widths *are* the bar's honest width — and measures them against the
room the rest of the header leaves, in the language being read. If they do not
fit, the header gives them a row of their own. Nothing is clipped and no width
is guessed: the header either holds the parameters or it moves them down. The
constant is gone.

## Verified

- **The sweep, after.** 144 measurements: 16 workspaces × 3 widths × 3
  languages. The header's overlaps: 4 at 1440 before, 0 after. The strip's
  rows: two before, one after, at every width. The Feng table's overflow:
  25px at 1440 and 103px at 390 before, 0 after. The bar's clip: 11px in
  Thai at 1440 before, 0 after, at every width in every language.
- **The chrome.** At 1024 the console's chrome went from 170px to 127px. At
  390 it is 110px and unchanged. At 1440 it is 77px in English and Chinese
  and 114px in Thai, where the parameters take a row of their own rather than
  losing their unit.
- **The width band.** Measured at 1440, 1400, 1360, 1359, 1300, 1200, 1100,
  1024, 950, 900, 800, 700, 601 and 390 in all three languages: the bar is
  never clipped, the strip is never in two rows, and the parameters take their
  own row in exactly the widths and languages that need them.
- **The suite.** 631 tests green — nine new in `tests/chrome-fit.test.mjs`,
  which reads the shipped stylesheets and *runs* the measurement against four
  measured headers, plus the spatial guard rewritten for the measured rule.
- **The harness.** 54 mutants, all killed. Twelve are new, one for each way
  this round could have gone back: the destinations not filling the header,
  the destinations a fixed height again, the strip wrapping again, the strip
  unable to scroll, the drawing losing its floor, the table unable to shrink,
  the headings held on one line, the bar measured without its own padding,
  the gaps between the groups not counted as room, the bar never moved, the
  header never asked, and the bar with no rule for a row of its own.

## Remaining

- The compare desk's candidate table still needs 574px in a 354px box at 390.
  The driver columns scroll sideways under an action column pinned to the
  right edge, so the reader can read the money and press the button. This is
  the same trade the 23 October audit recorded: a scroller's edge, against
  dropping a column, which is not the house's trade.
- Between 601 and about 950px the workspace strip scrolls sideways. Sixteen
  named workspaces cannot share that band; the cut-off label is the signifier.
- `app.js` and `i18n.js` remain hubs, and the `app.js` identifier assertions
  remain textual. Dr Non's call.
- The main book's tenth page. Dr Non's call.
- Pre-existing and untouched: the CSP has no `worker-src`; Overpass is
  unreliable; there is no authenticated RHIKNOWBOT session; `_archive/` sits at
  the SHDT root; 25 preview deployments cannot be deleted.

## Three traps in the instrument, recorded

1. **A clipped screenshot changes the page it photographs.** A
   `captureScreenshot` with a clip resizes the viewport; the resize fires
   before the layout has settled. A page that decides its layout by measuring
   itself must survive being measured too early — and a screenshot is not
   proof until the state after it has been read.
2. **The rule that fixes a thing can be overruled by the rule that loads
   later.** `console.css` said the Feng Shui headers wrap; `desks.css` loads
   after it and held them on one line. The dead rule looked alive in the file
   it was written in.
3. **A constant measured from one language is a constant measured wrong.**
   1439px was measured in Thai and applied to Chinese, English and every
   future language. A threshold that has to hold for three languages is not a
   threshold; it is a guess with a number in it.
