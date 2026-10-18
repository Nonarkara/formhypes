# RHIKNOWBOT — what it is, read from its own source material

**Written 2026-10-17. Not a claim about the author's product. A record of what
was observed, how it was observed, and what it means for FormHypes.**

Shouheng Chen's 2006 MIT SMArchS thesis is the common ancestor. FormHypes and
RHIKNOWBOT both descend from it. Before deciding what "better" can mean, the
other product had to be read properly rather than guessed at from its home page.

---

## How this was observed

`rhiknowbot.com` is a React single-page application. Nothing is server-rendered;
a plain `curl` returns an empty `#root`. Three obstacles had to be cleared, and
all three are worth recording because each one would otherwise have produced a
confident wrong answer:

1. **A countdown splash.** First paint is a black screen with a red counter. It
   intercepts every screenshot. Headless capture with `--virtual-time-budget`
   never advances it — the counter sat at 10, then 9, then 6 across runs,
   including at 120 s of virtual time. The splash advances on wall-clock time,
   so it must be waited out in real time. Once Chrome was driven over the
   DevTools Protocol with genuine sleeps, the page appeared after ~20 s.
2. **A minimum viewport.** The desktop app refuses to run below 968 × 550 px.
   The available in-app browser panel is ~815 px wide and cannot render it.
   Screenshots at 1600 × 1000 were required.
3. **No text at all.** See below — this turned out to be a fact about the
   product, not an obstacle.

The nine marketing videos were then downloaded and read as contact sheets, one
frame every 1–6 s depending on length. Each carries the module name, a
paragraph of description and a list of "Key Functions" in the on-screen graphic.
**That on-screen text is the product's only written documentation.**

Sources, all first-party:

- `https://www.rhiknowbot.com/` — marketing
- `https://www.rhiknowbot.com/features` — 24 named commands
- `https://www.rhiknowbot.com/demo` — six named projects
- `https://www.rhiknowbot.com/videos/*.mp4` — nine videos, 28 s to 67 s

Operator: Shouheng Design and Technology Co., Limited, `粤ICP备2021061979号-2`,
`@ 2026`. This is the same firm already credited as 深圳寿恒建筑设计事务所 in the
FormHypes dedication.

---

## What it does

Nine capability families. Every one of them is about **making geometry**.

| Family | What it does, in its own words |
|---|---|
| **Massing** | "Parametric based curve editing… parameters can be updated by double click on the curves, push and pull function… and Boolean operation function in which building blocks can be edited and constructed." Key functions: *Parametric Form, Push & Pull Editing, Boolean Calculation, Automatic Z-Down.* |
| **Morphing** | Loft between top and bottom profiles through parametric controls on heights, rotations and scaling. Surface modes: straight/triangular, rounded, triangular. Key functions: *Morphing Form Editing, Parametric Form, Organic Mode, Creative Mode.* |
| **2D to 3D projection** | Project 2D design patterns onto 3D surfaces. Key functions: *Unlock, Project, Line to Point, Patch Operation, Applied Section.* |
| **Detailed components** | "Define and apply components onto 2D reference surface and the system will automatically project these components onto the 3D surfaces." Key functions: *Define Component, Apply Component, Replace Component, Component Library.* |
| **Parametric design** | Interference, randomisation and 2D patterning driven by spatial relationships with other objects. Key functions: *2D Patterning, Randomized, Effect of Interference.* |
| **City construct** | "Automatic and convenient tool for city road constructs in 3D" — draw an outline, the system produces a detailed model with traffic lights, bus stops, trees, shrubs, asphalt, sidewalk paving and curbs. Plus blocks on selected areas with FAR, building density, plot division. Key functions: *Local / Collector / Arterial Road, Smart Crossing, Plot Division.* |
| **2D and 3D diagrams** | Analytical diagrams on a map base: fill buildings, add circulation arrows, add people and plants, add labels, add textboxes. Key functions: *Diagram Style Icons, Diagram Style Functions.* |
| **Quick render** | Rendering. |
| **Creative booklet** | Lay out design panels in 2D/3D; double-click curves to define text/graph/sheet areas; batch print to the "Tolarh" publishing tool. Key functions: *Booklet Layout, Textblock Image, Layout Text, 3D Effects, Batch Print.* |

Two observations that matter more than the table.

**The component file format is `.SHDT`.** The library is `MyComponent.SHDT`,
`MyComponent-2.SHDT`, `MyComponent-3.SHDT`. The commercial descendant carries the
thesis acronym in its own file extension.

**The idea running through all nine families is accumulation.** Each one ends in
a reusable library — component library, diagram style library, booklet style
library, parametric pattern library. The site's own tagline is *accumulating
design experiences in digital libraries*. That is the thesis's thesis: Chen's
argument was that design knowledge should persist as reusable digital
components, and this product is that argument made commercial.

### The named precedents

The demo page names six projects. Two are buildings: **AF Tower** ("efficient and
automated design procedure") and **WOZOCO** ("creative and intuitive modeling
method"). The other four are high-rise form-making, parametrised 3D posters, and
3D diagrams. These are the author's titles; no identification of the buildings
behind them is asserted here.

---

## What the public material did not establish

The following are limits of the observation, not verified absences from the installed product.

- **Economic analysis was not demonstrated.** The reviewed clips did not show rent, contribution or payback calculations. FAR was shown as an input to a block generator.
- **Environmental analysis was not demonstrated.** The reviewed material did not establish daylight, shadow, carbon or lifecycle analysis. FormHypes now has limited geometric/static screens and scenario quantities; those questions are not broadly solved here either.
- **Consequence reporting was not demonstrated in the reviewed videos.** This makes an instrument for explaining consequences a useful FormHypes direction, without proving the other product cannot do it.
- **Real-site analysis was not established.** City road and block generation were visible; parcel and neighbor-dependent analysis were not established from that material.
- **The reviewed public presentation was English.** Installed-product language support was not tested.
- **No written manual was found on the reviewed public routes.** There may be other documentation or support material. The public Features route is video-led; absence there does not prove absence everywhere.

---

## So what

**The reviewed public workflows emphasize different tasks.**

RHIKNOWBOT is a geometry kernel and environment — a Rhino/Grasshopper-class
tool for making and editing form. It is good at that, and nothing here should
suggest otherwise.

FormHypes is an **instrument**: it takes a form and makes its consequences
legible. Equal-area comparison, named rates on named areas, daylight derived
from the CIE overcast angle rather than asserted, three languages, a real plot in
a real city, and the thesis's own level schedules carried as data rather than
drawn as precedent.

**The gap between them is not a feature list. It is the difference between
producing a form and being able to find out what it costs.** He built the first.
This is FormHypes’ intended territory. The public material does not support a claim of market uniqueness or absence of comparable tools.

### What we should take from it anyway

Three things, in order of value:

1. **The library loop.** His strongest idea is that experience accumulates as
   reusable assets. At the time of the original review, FormHypes recomputed from defaults on every visit;
   a designer's accumulated understanding lives only in the study shelf, and it
   is one-way. This is the single biggest structural idea on offer.
2. **A component is a reusable unit of knowledge.** Already partly true here —
   `MATERIALS`, `facadeFamilies`, `levelPrograms`, `CROWNS` are all component
   libraries in the same spirit. The difference is that his library is
   user-extensible at runtime; ours are authored tables.
3. **Ground the free-floating block.** The reviewed clips emphasize construction tools. FormHypes anchors this proposal to a mapped city context. That can be a useful constraint, but its usability advantage needs testing.

### What we should not do

Do not chase geometry commands. The present browser prototype has a narrower polygon kernel. Additional modelling commands should earn their cost through an observed task failure, while readable consequences remain a concrete design priority.

---

## What this study changed in FormHypes

Recorded here so the reasoning is not lost when the next round starts.

**Crowns and sky terraces were built on the back of this study** — not as
features copied from his videos (he has neither), but because his massing module
motivated us to make quantities visible beside geometry; it does not establish what his full product can measure. A crown spends a real height
allowance; a terrace gives away real rentable area and costs real money to keep
alive. Neither is decoration, and in a product built on honesty both were
obligations rather than options. See `dist/crowns.js`.

The same logic produced the LED advertisement surface as an **explicit switch,
off by default, labelled as marketing income that changes no daylight, no
envelope performance and no height**. He sells a regime — *speculative capital* —
in which the form is the advertisement. FormHypes already models that regime. The
LED surface lets a reader price it instead of only being told about it.

---

## Reproducing this study

```
# The splash advances on wall-clock time, not virtual time.
# Chrome must be at least 968 x 550 for the PC app.
chrome --headless=new --remote-debugging-port=9333 --window-size=1600,1000

# Wait ~20 s of real time, then:
#   /features  → the 24 commands
#   /demo      → the six named projects
#   video[src] → one .mp4 per taxonomy tab
```

The nine taxonomy tabs swap only the hero **video** — durations 28 s, 44 s, 54 s,
19 s — and print **no descriptive text whatsoever**. The feature taxonomy is nine
buttons and a footer. Every word above was read from the videos' own on-screen
captions.

## 18 October 2026 qualification

Current public Home and Features routes were checked again through the real browser. They expose the component/massing/morphing/interference/city/diagram/render/booklet families, with video controls and Sign In. This session did not use the installed software or inspect its private/manual material. Earlier negative-space statements describe the public material observed, not verified absence of product capabilities. Human usability has not been comparatively tested. See HUMAN-CENTRED-COMPARISON.md for the present evidence matrix and changes.
