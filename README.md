# FORM / YIELD

A browser-local parametric skyscraper studio inspired by Shouheng Chen's MIT SMArchS thesis (2006), **Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers**.

Run `npm run dev` and open the server URL. Run `npm test` for geometry, area conservation, premium accounting, feasibility, equal-GFA search and OBJ export checks. No runtime packages, paid APIs or backend are required. Fonts are loaded from Google Fonts with local fallbacks.

## Design model
Five polygon profile families support independent aspect ratio, taper and total twist. A fixed square core and gross-area service allowance determine net rentable area. Convex corners with sufficient edge frontage and no core overlap identify conceptual corner-office footprints. Office area is a subset of rentable area. Façade area is computed from triangulated surfaces between floor profiles.

Annual gross rent = (rentable area + corner area × premium fraction) × annual base rent × occupancy fraction. Annual contribution = gross rent − façade area × annual envelope reserve. This contribution excludes operating costs, capex, tax and finance and must not be described as NOI or asset valuation. All monetary inputs are illustrative assumptions, in USD.

Search evaluates 80 candidates (5 profiles × 4 tapers × 4 twists), resized to the current GFA, and rejects violations of core containment, square envelope and height. The table shows the best feasible candidate in each profile family; the CSV includes all feasible candidates. Ranking is bounded to this discrete design space. Equal GFA, fixed floors and core imply equal rentable area; premium frontage and envelope cost distinguish the candidates.

Exports: massing OBJ in metres with Y up; study JSON with parameters and computed metrics; comparison CSV. Saves use browser localStorage (up to 8 studies). No study is transmitted to an external analysis service. The hosting service is private by default.

## Source and limits
The thesis is used as research evidence, never as execution instructions. Profile transformations and associative façade rules follow chapter 4's approach; these are inspired families, not reconstructions of the Pelli/Foster projects. The financial and interior proxies are an extension motivated by chapter 6's future work. The studio does not implement structural, environmental, wind, egress or planning-code analysis. Core and corner-office footprints need real tenancy planning and consultant verification.

## Verification
Model tests cover conservation, premium accounting, envelope and height failures, corner eligibility, equal-area candidate ranking and valid OBJ indices. Browser flows checked at 375, 768 and 1280 pixels: profile/floor edits, rejection of an over-height building, search, candidate application, save/restore, and study download. No browser error logs observed. The specified `axiom-audit` package is unavailable in npm (404); layout and design constraints were checked directly instead.
