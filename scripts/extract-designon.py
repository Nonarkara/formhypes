"""Extract a versioned, read-only reference pack from the named local codebase."""
import os, pathlib, re, json, hashlib, subprocess
# Path to a local checkout of Nonarkara/luma-house (designon).
root=pathlib.Path(os.environ.get('DESIGNON_ROOT','../space'))
destination=pathlib.Path(__file__).resolve().parents[1]/'dist/knowledge'
text=(root/'src/codes/standards.ts').read_text()
catalog=text.split('export const STANDARDS')[1].split('/**')[0]
references=[]
for match in re.finditer(r"'([^']+)':\s*\{(.*?)\n  \}",catalog,re.S):
    ident,body=match.groups()
    row={'id':ident}
    for k in ['ref','name','body']:
        row[k]=re.search(k+r": '([^']*)'",body).group(1)
    row['scope']='internal geometry model' if row['body']=='MODEL' else 'US reference example; adopted edition and project applicability unverified'
    references.append(row)
values=text.split('export const DEFAULT_THRESHOLDS')[1].split('occupantsPerKind')[0]
thresholds=[]
specs={
'minHabitableAreaM2':('m²','IRC-2021-R304.1','Residential habitable room area'),
'minHabitableDimensionM':('m','IRC-2021-R304.2','Residential minimum room width, kitchens excepted'),
'minCeilingHeightM':('m','IRC-2021-R305.1','Residential habitable-space ceiling'),
'minDoorClearWidthM':('m','ADA-404.2.3','Stored door-width comparison; source does not establish modeled width as clear opening'),
'minDoorHeightM':('m','IBC-1010.1.1','Door-height reference, edition not recorded'),
'adaTurningDiameterM':('m','ADA-304.3','Circular turning reference; no fixture or T-turn analysis'),
'kitchenExhaustLs':('L/s','ASHRAE-62.2-KITCHEN','Residential intermittent range-hood exhaust'),
'bathroomExhaustLs':('L/s','ASHRAE-62.2-BATHROOM','Residential intermittent bathroom exhaust')}
for key,(unit,ref,scope) in specs.items():
    value=float(re.search(r'\b'+key+r':\s*([\d.]+)',values).group(1))
    thresholds.append({'key':key,'storedValue':value,'unit':unit,'referenceId':ref,'scope':scope,'officeOptimizerEnforced':False})
files=['src/codes/standards.ts','src/codes/checkPlan.ts','src/study/geometry.ts','src/study/graphics.ts','src/study/DrawingAnnotations.tsx','src/study/StudySheet.tsx','src/analysis/daylight.ts','src/analysis/windFlow.ts','src/analysis/heatFlow.ts','src/analysis/egress.ts','docs/ARCHITECTURAL-GRAPHICS-REVIEW.md','docs/BUILDING_SCIENCE_USABILITY_AUDIT.md']
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
models=[
{'id':'daylight','title':'Daylight reach','equation':'min(room depth, window head height × 1.5 × (visible transmittance / 0.70))','confidence':'reference heuristic','source':'src/analysis/daylight.ts','limits':'12 × 12 plan samples. The transmittance factor is an implementation heuristic. No lux, glare, sDA or annual daylight validation.','transfer':'Requires actual window geometry, workplanes and obstructions before office evaluation.'},
{'id':'air','title':'Connected airflow','equation':'Q = Cd × Aeq × wind speed × √|ΔCp|; Aeq = 1 / √Σ(1/Ai²)','confidence':'concept model','source':'src/analysis/windFlow.ts','limits':'Uses fixed aperture areas and representative pressure coefficients. Interior open-door paths connect exterior pressure faces. No CFD or high-rise pressure validation.','transfer':'Reuse connectivity and explicit assumptions; replace wind pressure, opening areas and stack effects for a tower.'},
{'id':'heat','title':'Envelope heat','equation':'Conduction = U × area × temperature difference; solar gain = irradiance × glass area × SHGC × incidence','confidence':'steady-state scenario','source':'src/analysis/heatFlow.ts','limits':'Walls, doors and windows only. Excludes roof, floor, infiltration, bridges, internal loads and hourly weather.','transfer':'Requires per-face glazing fractions, assembly inputs and orientation before energy comparison.'},
{'id':'escape','title':'Route connectivity','equation':'Continuous room → door → room graph ending at an exterior door','confidence':'geometry only','source':'src/analysis/egress.ts','limits':'Centerline route approximation. Does not establish legal travel distance, widths, stairs, fire compartments or occupant load.','transfer':'Extend the graph across floors and protected stairs before any high-rise egress evaluation.'}]
graphics={
'book':{'title':'Architectural Graphic Standards, Student Edition, Eleventh Edition','organization':'American Institute of Architects','editor':'Bruce Bassler','publisher':'Wiley','year':2008,'reviewedPrintedPages':['445–446','514–518'],'scope':'Historical drawing conventions; not current building-code authority'},
'physicalScaleEquation':'paper millimetres = model metres × 1000 / scale denominator',
'scales':[50,100,200,500,1000,2000,5000,10000],
'lineWeightsMm':{'dimensionsAndFurniture':0.18,'referenceAndDimensionTicks':0.35},
'wallThicknessAssumptionM':0.15,'floorThicknessAssumptionM':0.1,
'planCutRule':'1.2 m above finished floor, or half room height if shorter',
'rules':['Solid cut faces; lighter furniture and glazing.','Distinguish physical objects from reference symbols.','Centreline dimensions are not finished clearances.','Parallel axonometric camera; north-up top-down plan.','Door arcs are indicative when hinge and swing direction are absent.','Separate view cuts from full physical geometry and shadow casters.','Subtract the union of overlapping openings from wall solids.','Identify sheet, revision, project, location, date/time and scale.','Keep dimensional vector drawings at physical print scale; disable flex shrinking.','Compare June and December 21 at the same scale, location, civil hour and year.','Label solar footprints as walls-only projections; retain explicit exclusions.'],
'sources':['docs/ARCHITECTURAL-GRAPHICS-REVIEW.md','src/study/geometry.ts','src/study/DrawingAnnotations.tsx','src/study/graphics.ts']}
pack={'schemaVersion':1,'title':'designon architectural knowledge','extractedOn':'2026-10-14','status':'source-extracted reference knowledge; no current compliance verification',
'source':{'product':'designon','domain':'https://designon.nonarkara.org','repository':'https://github.com/Nonarkara/luma-house','commit':sha,'files':[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest(),'url':f'https://github.com/Nonarkara/luma-house/blob/{sha}/{p}'} for p in files]},
'references':references,'thresholds':thresholds,'graphics':graphics,'models':models,
'provenanceFindings':[
{'id':'door-width-rounding','note':'Stored minimum door width is 0.81 m; its source comment describes 815 mm. Preserve the stored value for provenance; verify and resolve before enforcement.'},
{'id':'turning-rounding','note':'Stored turning diameter is 1.5 m while its comment also says 60 in. Exact inch conversion is 1.524 m. This pack does not adjudicate the applicable standard.'},
{'id':'ceiling-exceptions','note':'A single residential ceiling value does not encode all room types, exceptions or office applicability.'},
{'id':'legacy-air-score','note':'src/analysis/ventilation.ts contains an opening-count score; the audited Value Lens uses windFlow.ts with a pressure-connected graph. Do not promote the older score as airflow performance.'},
{'id':'unsupported-rules','note':'No commercial office rent standard, high-rise core-sizing rule, office occupant-load pack or rentable-area measurement standard was found in the reviewed standards library.'}],
'officeTransfer':{'enforcedReferenceThresholds':[], 'ready':['Drawing hierarchy and dimensional units','Versioned source and applicability metadata','Explicit scenario equations and confidence labels'], 'requiresOfficeAdaptation':['Room/window geometry and useful occupied daylight','Protected routes and stairs across floors','Commercial ventilation and high-rise wind pressures','Assembly-based hourly energy model','Adopted jurisdiction, occupancy and editions','Professional rentable-area measurement convention']},
'credit':'Non Arkaraprasertkul / Axiom X Co., Ltd. designon code and documentation are MIT-licensed. Book references are credited descriptions, not reproduced book assets.'}
assert len(references)==12 and len(thresholds)==8
(destination/'designon-knowledge.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
(destination/'DESIGNON-LICENSE.txt').write_text((root/'LICENSE').read_text())
print(f'Extracted {len(references)} references, {len(thresholds)} thresholds, {len(models)} model descriptions from {sha[:7]}')
