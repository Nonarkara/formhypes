# The sheet's budget — MSH audit of the drawing sheet

**Date:** 2026-10-28 · **Site:** https://shdt.nonarkara.org · **Branch:** `mcode/sheet-text-budget` · **Base:** `c8f5f0b`

## The complaint

> "Too many big texts to see anything."

Sent with a crop of the console's drawing sheet on a phone. The crop is 694 device pixels wide — a 347–390 CSS-pixel viewport at DPR 2 — and it carries the two things that only exist at ≤600px: the collapsed **View controls** button and the **Annual contribution** band. So the surface under complaint is the phone.

## What the sheet is made of

The sheet is one dark field with the tower drawn on it, and paper around it. The paper is the **band**: the in-flow children of `.viewport` — the view foot, the skyline note, the phone's contribution line and the title block. The drawing is clipped to the field above that band (`app.js`, `drawTower`, `footInset`), so the field and the band are the two numbers that matter.

Measured, not estimated: the band is measured across the band's in-flow children — the same measurement the drawing makes before it clips its own ink.

## Before

Live site, console, Form task, English, 900px tall.

| viewport | sheet | band (paper) | **field (drawing)** | field ÷ sheet |
|---|---|---|---|---|
| 390 | 374 × 553 | 126 | **427** | 77% |
| 600 | 584 × 553 | 109 | **444** | 80% |
| 700 | 684 × 398 | 99 | **300** | 75% |
| 1024 | 480 × 773 | 134 | **639** | 83% |
| 1440 | 871 × 823 | 80 | **743** | 90% |

## Three defects

**1 · The sheet named its plan twice.**
The caption above the drawing says `Cruciform / 8 outer corners / 48`. The title block said it again — `A-101 · CRUCIFORM / 8 OUTER CORNERS · 48L` — in a second register, on a second line, in the same words. Two statements of one fact is a second source of truth, and on a phone the second line was a whole row of paper (19px) the drawing could have had.
*Repaired:* the title block carries the sheet's number, `A-101`, and nothing else. The caption names the plan; the block numbers the sheet. The number shares the notice's row instead of taking one of its own.

**2 · The smaller screen gave the drawing more room than the bigger one.**
The phone's form task split the studio `1.45fr / .62fr` — the drawing had 70% of it. A window between 601 and 900 left the same task on the general `1fr / .8fr` — 55%. So a phone gave the tower 427px of field while a 700px window gave it 300px, and the controls got 319px at 700 and 237px at 390. Backwards.
*Repaired:* the narrow window takes the phone's share. The two statements of that share are now one ratio, and a guard holds them equal so they cannot drift apart.

**3 · The sheet's number was pushed onto a row of its own** below 560px, so the title block took two lines on a phone to hold one line of text. *Repaired* with the same change as (1).

## After

| viewport | sheet | band (paper) | **field (drawing)** | field ÷ sheet | change |
|---|---|---|---|---|---|
| 390 | 374 × 553 | 107 | **447** | 81% | +4% |
| 600 | 584 × 553 | 90 | **463** | 84% | +4% |
| 700 | 684 × **502** | 80 | **422** | 84% | **+41%** |
| 1024 | 480 × 773 | 115 | **658** | 85% | +3% |
| 1440 | 871 × 823 | 80 | **743** | 90% | — |

Measured on the built tree in all three languages (English, ไทย, 中文): the title block is one row at 390 and at 700 in every language; the band and the field are identical across the three (the skyline note is 3 lines in English and Thai, 3 in Chinese; the contribution line is one row in all three).

## What was deliberately not changed

* **The phone's contribution band.** It stays on the sheet. The phone's results rail is hidden, so the band is the only place the model answers; it is the one figure every edit moves. Moving it into the controls would have cost the dock exactly what the sheet gained — on a fixed screen, moving text between two panes is a wash.
* **The skyline note's three lines.** It carries the claim, the OpenStreetMap attribution and the caveat about how many buildings have surveyed heights. All three are earned; shortening the sentence to save a line would have made a weaker claim for a smaller sheet.
* **The phone's control panel.** It is 237px and holds the atlas, its caption and the two sliders a reader reaches first. It is sized to its content, and the controls' own content is a scroll of 2130px. The dock was not cut to buy drawing room.
* **The sliders' layout.** Two sliders side by side would have freed 60px more, but the range track is 3px-wide on a 350px phone track; halved, a floor count would land on ±1. A crippled control is not cheaper than a smaller drawing.
* **The atlas's caption.** It names the tile under the reader's finger, and the sheet's caption is a different fact (it also carries the floor count). Removing it would have taken a live affordance for 20px.

## Guards

`tests/sheet-budget.test.mjs` — four guards, each reading the shipped application or the shipped stylesheet:

1. **The sheet names its plan once** — the title block's reference may not restate the family or the floor count, may not be translated text, and must be the sheet number.
2. **The narrow window gives the drawing the same share the phone gives** — the two media blocks' fr ratios must be equal, and the drawing's share must be at least 65% at both widths. This is the drift guard: the ratio is stated in two places and must not come apart.
3. **The sheet's number shares the title block's row** — the narrow title block may not force the number onto a row of its own.
4. **The title block is one line on a phone, in every language** — the notice and the number are counted in *ch* (the width of a "0" in the block's own font), because Thai has no spaces and Chinese may break between any two ideographs, so a character count is a different number in every language. An ideograph is given a full em, everything else the Latin advance. It models the *line count*, not the pixels; the pixels were measured on the rendered sheet.

Four mutants, one for each way this round could have gone back: the title block restates the plan; the narrow window takes the general split; the number takes a row of its own; the notice outgrows the block. All four are killed.

688 tests green; 103 mutation probes, none survived — 94 in the shipability harness, three in the release graph, six in the preferences.

## Evidence

* `.scratch/shots/before/sheet-{390,600,700,1024,1440}.png` — the live sheet, before.
* `.scratch/shots/after/sheet-{390,700}.png` and `shots/{th,zh}/` — the built sheet, after, in three languages.
* The measurements are reproducible: `.scratch/sheet-budget.mjs` against the local server, `.scratch/with-chrome.sh` for the browser.

## Still open

* The compare desk's table still scrolls sideways on a phone and at 1024 in English. That is a decision about what the table carries, and it is Dr Non's.
* The phone's field is 447px of a 553px sheet. The sheet is now 81% drawing; the rest is the page's own chrome (110px) and the parameter rail (237px), both of which earn their pixels.
