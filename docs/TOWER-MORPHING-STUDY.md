# Tower-Morphing, read from the source

Shouheng Chen sent `TMMethod.cs`, `PageTowerMorphing.xaml` and
`PageTowerMorphing.xaml.cs` directly, with the note that the web-based
Tower-Morphing is "exactly what you are doing, just naming it differently".

Nothing in this repository is copied from that code. This file is a reading of
it, written so the comparison can be argued with rather than admired. The
licensing terms for the source he sent are unknown and have not been
established; that question is open and is the first item in the reply.

---

## What the method actually does

`TMMethod.Morphing` takes a set of grouped construction curves and returns
`List<Brep>`. In order:

1. **`OrganizeCurve`** splits each group of curves into two closed curves —
   sorted by area, so the lower one is the lower one — plus *N* open "middle"
   rails. Every rail must intersect both closed curves, or the method refuses.
2. Curve directions and closed-curve seams are unified against the first rail.
3. Each rail is intersected with the lower and upper closed curves to give a
   point on each.
4. The upper curve is translated up by `height`, then upper and lower are each
   scaled about **their own area centroid** by `firstVolumeScale`.
5. The rails become 3D lines from lower point to upper point. The lower and
   upper closed curves are split at the rail intersection parameters into
   matching segments.
6. The base volume is swept: `Brep.CreateFromSweep(rail_i, rail_{i+1},
   [lowerSeg_i, upperSeg_i])`, one solid per bay, closing back on rail 0.
7. If `numOfSection > 2`, the base volume is cut by horizontal planes at
   `height / (numOfSection - 1)` to recover the intermediate profiles. The
   middle sections are duplicated so the control levels come out evenly spaced.
8. For each of the `numOfSection * 2 - 2` control levels: the level's segments
   are joined into one curve, its **area centroid** is taken, and then

   ```
   r = Transform.Rotation(radians(newRotation[i]), rotateCenters[i]);
   s = Transform.Scale(rotateCenters[i], newScale[i]);
   h = Transform.Translation(0, 0, newHeight[i]);
   ```

   applied in that order, to the segments *and* to the rail points.
9. Rails are rebuilt between consecutive control levels, each band swept, and
   horizontal caps built at the ends.

## The part that matters

Step 8. Every control level gets its **own** rotation, its **own** scale and
its **own** vertical offset, from a per-level table the user types. The
rotation and scale happen about that level's own profile centroid, not about
the tower axis.

The centroid detail is real but it is not the headline. Every plan in
FormHypes' library is normalised so its area centroid sits on the axis
(verified: eleven of eleven families, offset 0.0000 on the unit plan). For
those plans, per-level-centroid scaling and axis scaling coincide at the base.
The centroid would start to matter the moment a profile stops being
centroid-normalised — after a garden setback, or on any plan a user draws.

**The actual gain is per-level freedom.** Chen's tower can bulge at 30 m and
pinch at 90 m, carry a waist, flare a base and taper a top. FormHypes'
`profile(s, t)` is two scalars — `taper` and `twist` — each applied as a
single continuous function of height about the plan centre. Two numbers cannot
express a waist. That is a genuine expressive gap and it should be closed.

## What will not be taken

The third parameter, the per-level vertical offset `newHeight[i]`.

It re-parameterises the stack. After it, level *k* is no longer at
`k × storeyHeight`; levels can cross, bunch and overlap, and the mapping from
*z* to plan is no longer monotone. Everything FormHypes computes depends on
that mapping: the skin area is integrated level by level, the level schedule
counts storeys, gardens and voids, the height graduation is spaced against the
total, and the whole equal-area discipline rests on *z* and plan staying in
step.

His method can afford this because it returns a solid and reports nothing about
it. A tool that also has to price the thing cannot.

This is not a criticism of his method. It is the price of pricing the thing,
and it is the reason the two systems are not the same product despite doing the
same thing.

## Where FormHypes is genuinely ahead

`Morphing` returns `List<Brep>`. That is the whole return value. Given the same
form, FormHypes returns the form *and* the area, the skin, the daylight, the
carbon, the rent, the reserve and the payback — and can be extended to accept
per-level scale and rotation as a third parameterisation while every one of
those numbers survives.

That is the honest basis for "better than his own", and it is a narrower claim
than it sounds. Not: a better Rhino plugin. He has thirty years of NURBS
practice in that file and this is a browser. Rather: a different question.
He built a machine for making forms. The form this system produces can also be
asked what it costs, and what it costs changes what form is worth making.

A browser cannot ship a Rhino, and the honest way to use his method here is not
to reimplement `Brep.CreateFromSweep` — that would be worse at it — but to
adopt the one idea it has that the plan library does not.

## Proposed shape of the work

1. **Per-level scale and rotation**, as a new parameterisation alongside
   `taper`/`twist`: a table of *N* control levels, each with a scale and a
   rotation, interpolated between levels. Vertical offset left out, for the
   reason above, and said out loud in the UI rather than hidden.
2. **Profile area integrated per level**, so bulge and pinch show up honestly
   in GFA, skin and rent rather than only in the picture. This is the part his
   method has no equivalent of, because it never integrates anything.
3. **Feasibility against the same constraints** the model already enforces —
   IBC 504.3 height, envelope-to-floor ratio, core fit — run on the morphed
   stack, not on the ideal one.

Nothing in (1) or (2) requires his code. Both follow from the published
algorithm, and both would be written against this repository's own geometry
module.

## Open questions for him

- **Licensing.** He sent the source directly. Whether it may be read, quoted,
  adapted or redistributed is not established, and the answer changes what can
  ship. This is the first thing to settle.
- **Whether the per-level table is meant to be free**, or constrained to
  preserve the enclosed profile's topology.
- **The sweep methods.** `Morphing` accepts `sweepMethod` 0–4, but the UI
  exposes only four radio buttons, `rdbSweepMethod0..3`, and the descriptive
  strings attached to them are: Straight, Curved, Rounded, Tri, Tri_Flip,
  TopBottom, Multiple, Segmental — eight names for what the method signature
  calls five values, so some are evidently not reachable from this dialog.
  `rdbSweepMethod3` is also the only one that reveals the Flip checkbox
  (`cbFlip`, "Re-triangulated surfaces"). What the other methods actually do
  differently is not legible from the code alone, and the choice visibly
  changes the result.
- **Self-intersecting profiles.** Nothing in `Morphing` appears to prevent a
  control level whose transformed profile crosses itself, and the sweeps would
  produce garbage rather than fail loudly. Worth confirming whether that is
  handled upstream or is simply left to the user.