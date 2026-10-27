# The compare desk · MSH audit of 26 October 2026

Scope: `main` at `fc4219b` (Codex's lab corrections) and the work stacked on it
this round; the deployed site, then the local tree. Target: the candidate
table on the Explore desk — the instrument the reader uses to compare five
candidates and apply one — at 390, 1024 and 1440 px, in English, Thai and
Chinese.

This is a concept release. It does not establish structural adequacy, code
compliance, market value, indoor daylight or energy performance.

## What was checked, and how

| Surface | How | Result |
| --- | --- | --- |
| The whole console | a sweep of 16 workspaces × 3 widths × 3 languages on the deployed build | 144 measurements; 6 flags, 5 of them the deliberate screen-reader clip |
| The compare table | the geometry of every column, read from the rendered page | the candidate column was 28px wide in Chinese |
| The pinned action | the overlap of the pinned column against the text beside it | the height was under the button |
| The lab corrections | an independent review of ten numbered claims against the primary sources | PASS, with eight findings |
| The guards | the mutation harness, every mutant timed and named | 99 probes, none survived |

Every number below was measured on the page. None was read out of a source
file. Both defects were invisible in the CSS that caused them: a rule that
says `white-space` nothing, and a rule that says `position:sticky`.

## Found

**1. The candidate's name was written down the page, one character to a line.**
Chinese may break between any two ideographs, so a cell that may wrap has a
minimum width of a single character. The table therefore handed the candidate
column **28px** — "十字" was drawn as 十 / 字, "八边形" as 八 / 边 / 形 — and in
English "Eight-point" broke at its hyphen. The Thai column was 54px and two
lines. The column was not too small because the content was too long: the
content is an index and a family name, and the column had room for one
character of it.

**2. The pinned action stood on the drivers.** The Apply column was pinned to
the right edge of the scroller. A pin slides left by exactly the table's
overflow, so it stands on the column beside it. In Thai and Chinese at a desk
width, the **height — "214 m" — was under the button**, and a reader could
press a candidate whose numbers they had never seen. The candidate was frozen
at the left as well, which moved the hiding rather than ending it: at the far
end of the scroll the money column went under the name. Two frozen ends hide a
column at each end.

**3. A citation named a paragraph that does not exist.** `dist/wind.js` cited
"EN 1991-1-4 E.1.2(3)" for the criterion that vortex effects need not be
examined when `v_crit > 1.25·v_m`. The standard the file itself cites
(BS EN 1991-1-4:2005+A1:2010, read at `/tmp/formyield-audit-wind.txt`) has
**E.1.2(1) and E.1.2(2) only**, and the expression is numbered **(E.1)**. The
substance was right; the paragraph number was not.

**4. The viewer's own test could not see a sheet that said nothing.** The
enlarged method sheets are sized from the smallest annotation the sheet
declares. A `<text>` with no `font-size` is invisible to that measurement, so
the viewer enlarges to suit the annotations it *can* read and leaves the
silent one below sixteen pixels — the thing the viewer exists to prevent, with
nothing on the page saying so. The test mocked the sheet with an object that
answers any selector with one text element of a given size, so it could not
see a missing size, and could not see a selector that had stopped matching.
All six real sheets do declare their sizes; nothing protected that.

**5. A deploy could not be re-authorised by the next person.** The working
Cloudflare OAuth flow — PKCE, wrangler's own public client, its own redirect,
its own token endpoint, with a callback that waits long enough for a person to
use — existed only in a gitignored scratch directory. A fresh checkout had no
path to a working deploy at all, and `wrangler login` gives about sixty
seconds to press Allow, which is not a window a person can use.

## Changed

| What | Before | After |
| --- | --- | --- |
| The candidate cell | may wrap; 28px in Chinese, 4 lines | `white-space:nowrap`; 59–82px, one line, in all three languages |
| The pinned action | `position:sticky;right:0` over the drivers | the end of the row; no column is covered at either end of the scroll |
| The candidate column | not frozen | frozen at the left, with a hairline and its own ground, so the row keeps its name |
| The citation | "E.1.2(3)" | "E.1.2(2)", checked against the standard |
| The Structure desk | claimed a tabulated St without saying the wind was normal | says so, in English, Thai and Chinese |
| A dead export | `ST_TABULATED`, referenced nowhere | removed |
| The method sheets | unguarded against a silent annotation | guarded against the six real sheets, and the shipped sizing function is run on them |
| The deploy | failed inside wrangler with a request error | refuses before staging a byte, names the reason, and gives the command that fixes it |
| The mutation harness | an interrupted run ended the suite with no verdict | every mutant is timed and named; a hang is reported as a hang, never as a pass |

## Verified

**Measured, in the rendered page, at 390, 1024 and 1440 px, in English, Thai
and Chinese.**

- No candidate label is broken anywhere: the maximum line count across every
  row of every table is **1**, in all nine combinations.
- **No data column is covered.** The overlap between the action column and the
  height's text is **0px** at the default scroll position in all nine
  combinations, and 0px at the far end as well, where the candidate's name,
  the height and the button are all fully visible together.
- The table still scrolls, and it must: seven numeric columns need 418px
  against a 354px column in Chinese and 521px in English. This is the last
  horizontal scroll in the product, and it is not removable without dropping a
  measure.

**The labs.** An independent reviewer checked the ten numbered claims of
`fc4219b` against the code, against nineteen scripts written from the source
rather than from the author's tests, and against the primary publications —
EN 1991-1-4 (the standard's own text and rendered figures), the IStructE
embodied-carbon handbook, and Barney's *Uppeak Revisited*. **Verdict: PASS.**
Nine claims hold outright; the tenth holds on substance with a wrong file
attribution in the review document, not in the code. No claim was false.

**The suite.** 684 tests green. The mutation harness kills every mutant it
carries — the three new ones for the table, plus the one that makes a method
annotation declare no size — and reports each with its wall clock.

## Remaining

- **The compare table still scrolls sideways on a phone and at a desk width.**
  It has to: the money columns alone need more than the column they are in.
  Removing the scroll means changing what the table carries, which is a
  decision about the instrument and not a repair of its layout. Dr Non's call.
- **The comparison between two candidates is still a table.** Nothing here
  says the table is the right instrument for a phone; it says the table is
  honest now that it stops hiding a column.
- **A muted AWT stays muted.** When one group is above the 80% car load the
  CIBSE approximation covers and another group's queue never clears, the row
  reads "saturated" and does not also read "unavailable". Saturation is the
  stronger statement — the wait is unbounded whatever the approximation says —
  so the number is `Infinity` and the fact is not lost. Left as it is, now
  written down in the code.
- **EN 1991-1-4:2005 before A1 could not be obtained**, so the paragraph
  numbering of the original edition is unverified. The edition the code cites
  was read.
