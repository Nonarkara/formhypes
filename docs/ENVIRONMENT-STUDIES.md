# Building and neighbourhood studies · 18 October 2026

This release repairs the surrounding city geometry and adds **Place → Effects**. The main viewport's **Neighbourhood** switch fits the harvested 700 m radius instead of cropping it around the tower. All existing workspaces remain.

## Why the city looked flat

The wall visibility expression subtracted a camera-axis term; it now uses the outward normal dotted with the actual horizontal view direction. Near buildings also use the same back-to-front ordering as distant ones. More consequentially, the harvester read `building:levels` through the `building:height` branch. Forty storeys became 40 metres and bypassed the intended 3.2 m/storey inference. The parser is now a separately tested adapter: `height`, then `building:height`, then `building:levels × 3.2 m`. Unsupported length units remain unavailable rather than silently treated as metres.

All six cities were harvested again on 18 October 2026. Each snapshot records its timestamp and height parser version 2. Footprints remain mapped OpenStreetMap outlines, not surveyed parcel boundaries. Explicit height tags are recorded values, not independently verified measurements. Missing heights are still omitted; inferred storey heights are identified in tables. Ground roads/water/green remain the preceding snapshot, on the same coordinate origin. OSM geometry can overlap, omit courtyards or contain parts; this is contextual extrusion, not a coordinated city BIM.

The refreshed usable raw ring counts were Bangkok 323, Kuala Lumpur 372, Jakarta 173, Ho Chi Minh City 39, Shenzhen 80 and Tokyo 288. The bundle retains up to 300 per city, and the renderer keeps up to 260 outlines wholly inside the study circle. Counts on screen can therefore be lower. The Effects scene omits any old building containing the origin, placing the proposed tower there.

## Shadows

The selected tower's shared body/crown loft projects onto flat ground using the selected city's solar vector. Morning/noon/afternoon shortcuts and civil date/time controls redraw the result. The full-day calculation uses 96 quarter-hour midpoint samples. Any footprint overlap adds 0.25 h to that building's row; it is not the fraction of a facade shaded, indoor daylight, hours of direct sun at a window, or a rights-to-light result. Block labels join the drawing to the results table.

Other buildings' shadows, terrain, vegetation and weather are not included in the overlap calculation. Solar positions use the existing selected-city reference coordinate; the harvested plot coordinate is printed separately. The map is an opaque massing screen, with no planning pass/fail.

## Wind and lateral forces

The [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/) supplies the dimensional relation `q = 0.5 ρ V²`, `dF = q Cd b(z) dz`. Wind bearing is the direction **from** which wind arrives, clockwise from north. Breadth is measured across the tower perpendicular to this direction, including taper, twist and crown. The load uses a single user-specified speed and drag coefficient over height; density defaults to an explicit 1.225 kg/m³ assumption.

The desk integrates 64 body bands plus crown bands, reporting projected area, base shear and overturning moment. With user effective EI it sums fixed-base Euler–Bernoulli cantilever point-load influence functions; the displacement curve is magnified to fit, with its true millimetre scale printed. An independent static inertial case uses uniform user mass per height and acceleration: `V = μ a H`, `M = μ a H²/2`, `δroof = μ a H⁴/(8 EI)`. It can run without a wind case, and is not added to wind as a load combination. No strength/capacity or structural-system stiffness is inferred from a selected system name.

[Cantilever reference formulas](https://engineering.purdue.edu/~ce474/Docs/DA6-BeamFormulas.pdf) support independent prism test cases. [NIST's wind-method assessment](https://www.nist.gov/publications/assessment-methods-determining-wind-loads-nist-tn-1738) makes clear that pressures, coefficients and wind-tunnel procedures require separate evidence. This implementation has no gust factor, atmospheric boundary layer, shielding, downwash, pedestrian comfort map, torsion, vortex shedding, dynamic amplification, P–Δ, seismic spectrum or design-code verdict. The arrow shows wind direction; it is not CFD.

Wind, Cd, EI, mass and acceleration begin empty. A clearly labeled teaching set is available. Partial edits preserve the teaching flag while invented values remain; Clear or Reset removes it. The label is conservative rather than a claim of per-field source verification.

## Reflected sunlight

For each sunlit triangle on the 16-band body/crown loft, a centroid sample reflects the incoming sun vector by `r = −s + 2(n·s)n`. A triangulated opaque scene blocks incoming sunlight and stops outgoing rays at the first tower, neighboring wall/roof or ground intersection. Rays not intercepted within 1,400 m are marked as escaping. Positive assumed specular fraction changes visual ray weight; it does not change the geometric reflection angle. Zero fraction emits no rays. This assumption is independent of the chosen cladding.

Neighboring hit counts refer to samples, not area or probability. Roof polygons close the opaque scene; crown transition facets participate in loft sampling. Receiver IDs link drawing and table. A Tokyo 16:00 June-solstice preview produced 25 neighboring hits from 161 sunlit samples; that is a reproducible scenario result, not evidence of ocular risk.

[Sandia's SGHAT documentation](https://ip.sandia.gov/opportunity/solar-glare-hazard-analysis-tool-sghat/) distinguishes geometric interception from intensity and eye-hazard assessment. This desk does not model beam spread, surface roughness, glazing optics, multiple reflections, weather, reflected flux, heat concentration or retinal exposure. A missed centroid sample cannot establish absence of glare. No Sandia code or solver is incorporated.

## Preservation and verification

Study JSON and the local study shelf preserve the environment inputs, teaching flag and method descriptions. Old saves restore empty wind assumptions. Input validation rejects nonfinite/out-of-range values before modifying a restored Brief. The new calculations run locally with bounded caches; orbiting reuses reflection/shadow results rather than retracing rays.

Regression checks cover independent prism forces/moment/deflection, speed-squared and stiffness scaling, mass-only inertia, mirror angle conservation, incoming blockage and first-hit receivers, concave roof triangulation, reversed shadows and night, all-six-city elevated side/roof geometry, a full camera orbit and atomic persistence. Six new deliberate mutations cover the parser, camera culling, wind law, mirror law, incoming occlusion and teaching provenance; the existing ten contract mutations remain.

Independent review caught two invalid test fixtures (a nonexistent profile key and a receiver that also blocked incoming sun); the fixtures were corrected to isolate the intended behavior. Two old data guards required tagged heights to outrank inferred heights and a prescribed city coverage ratio. They now check the actual source counts instead. A lot-seating guard confused distance from a lot boundary with distance from the lot; it now recognizes points inside a large lot as zero gap, while preserving the placement, area and overlap assertions.

Visual review at 1440/1024/390 found a clipped English fourth subtab and the phone study image below the first screen. The label is now Effects, phone subnav spacing is reduced, and the study image precedes phone inputs. Neighborhood framing centers unused field space without changing geographic scale.
