# Contained architectural console · 16 October 2026

## Decisions and authorized scope
The user requests a viewport-contained Studio, land and city first, visible plan icons, tabbed parameters/studies, and a referenced curtain-wall assembly desk. Research retains its reading paths. Default land is an explicitly hypothetical 9,000 m² square in Bangkok; FAR 8 is a scenario assumption. A plot boundary and buildable-envelope boundary remain distinct.

## Sacred items
Keep the live tower, plan, Modulor section, brief calculations, saved studies, search, solar/ground/context drawings, photographs and Research. Reparent existing desks; do not replace their earned content. No file shrinks by 30%. Existing geometry and financial invariants remain unchanged.

## Proposed changes
- Add console.js / console.css: fixed Studio shell; persistent model and internally scrolling task dock; land/city strip; workspace tabs; mobile Design/Performance panel switch. Existing DOM ids and listeners survive.
- app.js: initialize console, synchronize changes, route Research actions into the proper workspace, size canvas to its actual slot, draw the assumed land boundary.
- brief.js: expose validated plot/FAR setters and group its seven sections into three compact tabs.
- Expose the existing eleven real plan buttons, with the dropdown retained as a hidden compatibility control.
- Add facade.js: live storey/lean context, slab-edge anchorage and pressure-plate drainage diagrams with keyed explanations and EN/TH/ZH copy.
- release-id.mjs: pin the new dependencies; tests cover parameter conservation, routing, source locators and console viewport behavior.

## References and verification
Console pattern: existing FormHypes side rails and QGIS-style persistent drawing with docked tools. Design Read: the land and tower occupy one bounded drafting console, with compact task tabs and a detail drawing as the focus of the assembly desk. Main divisions 2px, cell rules 1px, selected form 2px amber. No new cards, shadows or gradients.
Curtain-wall source: user-supplied Architectural Graphic Standards, 11th edition, printed pp. 142–144 (PDF pp. 162–164), figs. 2.429–2.432 and 2.435–2.437. Page 144 rendered and visually checked. Source covers attachment/anchorage, fixed/slip allowance, pressure-plate mullion, thermal isolator, gaskets, pressure chamber and weeps. The new diagrams explain these principles; structural sizing, firestop specifications and product testing remain project work.
Verify model invariants/tests, all workspaces and controls in a real browser, EN/TH/ZH at desktop/phone sizes, zero Studio document overflow, live deployment and public asset bytes.
