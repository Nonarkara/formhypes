# FormHypes

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

## Architectural knowledge from designon

The Architectural Knowledge panel loads a versioned reference pack extracted from `Nonarkara/luma-house` (designon), source commit `6754f36`. It includes 12 reference entries, eight original numeric thresholds, AIA drawing conventions, four building-science methods, source hashes, applicability notes and unresolved source discrepancies. Download JSON from the panel. The original MIT attribution and license are retained.

See `docs/DESIGNON-KNOWLEDGE.md` for the acquisition review and `scripts/extract-designon.py` for reproducible extraction. Source references are available for inspection; residential comparisons and environmental solvers have not been applied to the tower optimizer.

## 15 October 2026: solar and accounting repair

FormHypes is a product of Dr Non at depa + Axiom. It was inspired by his MIT classmate Shouheng Chen's 2006 thesis and built twenty years later, marking its 20th anniversary in 2026. Credits in EN/TH/ZH separate Chen's original idea from Dr Non's system and extensions.

Sun studies use SunCalc 2.1.0, vendored with its BSD-2-Clause notice. City presets: Bangkok, Kuala Lumpur, Jakarta and Ho Chi Minh City, each with latitude, longitude and IANA civil time. The selected instant reports solar altitude/bearing; a daily 08:00–18:00 sequence samples each selected-floor outward face every 15 minutes. Equivalent hours sum positive incidence cosine × interval duration. A 0.8 kW/m² direct-normal irradiance assumption is available as a transparent reference, not measured weather. Categorical exposure bands are screening assumptions; they neither specify a glazing product nor price its market value. These are unobstructed vertical faces: self-shadow, sloping face normals, weather and neighbouring buildings are not modeled. Neighbour shadow impact and the architect brief/city/walk-in pipeline remain future work.

The rent invariant is restored: every rentable square metre receives base rent once. The corner stream is only `cornerArea × occupiedBaseRent × premium`. Identity, column-free and clear-height streams and penalties remain separate named scenario rates. Annual contribution deducts both envelope and structural reserves. It is not NOI or asset valuation. Economic rankings may change after the double-count correction; no test prescribes that a politically competitive tower must earn less.

The desktop header is 40 px, action buttons fit their labels, and narrower side rails return 64 px to the model at a 1280 px viewport. Phone chrome reflows into two compact rows; coarse-pointer targets remain 44 px. The 20th anniversary is stated in the studio and research credits. The human section follows the selected embedded level's actual height.

Verification: 78 Node tests pass, including independent NOAA altitude checks within 1 degree for all four pilot cities, seasonal north/south reversal, east/west timing, night incidence, state validation, rotation, dependency hashes and exact corner accounting. Browser checks cover the city/date/time controls, save/restore and EN/TH/ZH credits at desktop and phone widths. No dependency install or remote analysis API is required.

Deploy with `npm run deploy`. The staging helper excludes `.wrangler`, `.DS_Store`, `.git` and `.env` metadata from public assets. Production is Cloudflare Pages project `shdt` at https://shdt.nonarkara.org; the earlier Sites-hosted URL is a historical prototype, not the canonical release.
