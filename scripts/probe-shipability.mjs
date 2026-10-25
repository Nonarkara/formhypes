// Mutation probes for the contracts found in the 18 October audit.
// Always prove the isolated baseline passes before interpreting a failed mutant.
import {mkdtemp,mkdir,readdir,symlink,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {runProbe} from './probe-process.mjs';
const dir=await mkdtemp(join(tmpdir(),'shdt-contract-mutations-'));
const cases=[
 ['fire boundary-layer count becomes a length','fire.js',"width:fill(c.ctl.widthNote,{boundary","width:fill(c.ctl.widthNote.replace('2 ×',toDisplay(2,'m').toFixed(1)+' ×'),{boundary",'rendered fire references preserve'],
 ['fire specific flow scales as length instead of reciprocal width','fire.js',"r.fsMax/toDisplay(1,'m')","r.fsMax*toDisplay(1,'m')",'rendered fire references preserve'],
 ['compound carbon source factor loses canonical-unit boundary','carbon.js','kgCO₂e/kg wasted (SI)','kgCO₂e/kg wasted','source carbon factors retain explicit SI dimensions'],
 ['modal equivalent mass collapses to roof mass','wind.js','const mE=massWeighted/modeWeight;','const mE=SYSTEM_MASS[system]*1000*area(vortexSection)/storeyHeight;','Scruton equivalent mass follows'],
 ['evacuation drawing ignores its actual destination floor','fire.js','const z=u<T?pos(u):down<0?d:down<T?d-pos(down):0;','const z=0;','evacuation drawing reads actual per-car'],
 ['Thai transport changes grams into kilograms','carbon.js','ที่ {f} กรัมCO₂e/กก./กม.','ที่ {f} กก.CO₂e/กก./กม.','Thai transport labels the same gram factor'],
 ['evacuation drops partial floor trips','fire.js','const count=Math.ceil(u/P-1e-9);','const count=u<P?0:Math.ceil(u/P-1e-9);','evacuation lift trips visit every floor'],
 ['waiting formula extrapolates beyond its source','lifts.js','if(lf>0.8)return null;','/* scope limit removed */','Barney wait approximation has no value'],
 ['tank fills with water still on the roof','water.js','roofVolume,collected:inflow-roofVolume','roofVolume,collected:inflow','storm animation conserves inflow'],
 ['vortex speed uses force-reference width','wind.js','vCrit=bV*n1/st','vCrit=be*n1/st','tapered vortex reference follows'],
 ['unsupported Strouhal values claim code provenance','structure.js',"stBasis:stTabulated?'tabulated':'assumed'","stBasis:'tabulated'",'structure vortex speed uses roof width'],
 ['construction waste omits haul and processing','carbon.js','wf[mat]*(a13+a4)+outbound+processing','wf[mat]*(a13+a4)','A5w includes waste haul and processing'],
 ['enlarged annotations shrink below readable scale','drawing-viewer.js','width*16/Math.min(...sizes)','width*4/Math.min(...sizes)','viewer scale keeps'],
 ['closing a hidden drawing resumes its lab','drawing-viewer.js','source.isConnected&&source.getBoundingClientRect().width>0','source.isConnected','closing clears the copy'],
 ['enlargement removes the original method drawing','drawing-viewer.js','scroll.replaceChildren(copy)','scroll.replaceChildren(svg)','enlarging the method preserves'],
 ['enlarged method viewer never opens','drawing-viewer.js','dialog.showModal();','','enlarging the method preserves'],
 ['ground irradiance loses the receiver projection','glare.js','Math.max(0,-r[2]/length)','1','horizontal receiver conserves'],
 ['cached glare beams lose their direction','glare.js','rho:b.rho,r:b.r','rho:b.rho','cached frames and method contributions'],
 ['glare method uses beam-normal power','glare.js','W:GLARE_DNI*rho*cosGround','W:GLARE_DNI*rho','cached frames and method contributions'],
 ['material assumptions presented as verified','materials.js','verified:false','verified:true','material scenario provenance describes'],
 ['material basis lost from JSON','app.js','materialScenario:materialAssumptions(state),','','the actual study download carries'],
 ['material note promotes an assumption to a published value','i18n.js','This multiplier is an unverified assumption, not a quote.','This multiplier is a published value.','rendered material notes disclose'],
 ['phone view controls cannot open','app.js',"const open=$('viewToolsToggle').getAttribute('aria-expanded')!=='true'",'const open=false','phone view tools are exposed'],
 ['phone view controls remain over the drawing after selection','app.js',"$('viewTools').classList.remove('is-open');",'', 'phone view tools are exposed'],
 ['compass label rows share the same ink','feng.js','f2(ly-5)','f2(ly)','palace names and readings have separate'],
 ['rectangle display edit bypasses canonical conversion','context.js',"const v=fromDisplay(Number(inp.value),'m');",'const v=Number(inp.value);','rectangle controls use'],
 ['crossed outline is accepted for appraisal','context.js',"siteSource==='draw'&&validPlotRing(siteCorners)?","siteSource==='draw'&&siteCorners.length>=3?",'crossed outline shows'],
 ['normal seating ignores concave edge crossings','site.js','const holds=p=>ringContainsRing(ring,plate.map(([x,y])=>[x+p[0],y+p[1]]));','const holds=p=>plate.every(([x,y])=>pointInRing(x+p[0],y+p[1],ring));','containment checks edges'],
 ['the range repeats a unit after a formatted quantity','i18n.js','to {1} across.','to {1} m across.','capped-site range is explained once'],
 ['unknown package version accepted','decisions.js','![3,4].includes(data.version)','false','malformed packages'],
 ['comparison reference drifts to current','decisions.js','before=evaluate(reference.state)','before=evaluate(current.state)','comparison preserves'],
 ['supplied import metrics trusted','decisions.js','state,brief,environment:','state,metrics:data.metrics,brief,environment:','versioned import'],
 ['decision note lost on save','app.js',"note:cleanStudyNote($('studyNote')?.value),brief:",'note:undefined,brief:','actual Save/Reload'],
 ['levels treated as metres','height','const levels=Number',"const bh=Number(tags['building:levels']);if(bh>0)return {h:bh,src:'building:height'};const levels=Number",'OSM storeys'],
 ['wind becomes linear in speed','environment.js','v.speed*v.speed','v.speed','static wind matches'],
 ['mirror reflects toward sun','environment.js','-v+2*d*n[i]','v+2*d*n[i]','mirror law'],
 ['reflection ignores incoming blockers','environment.js','if(all.some(t=>rayTriangle(origin,S,...t.pts)!==null))continue;','','mirror law'],
 ['wall culling loses axis term','environment.js','(b[0]-a[0])*Math.cos(yaw)','0','box presents'],
 ['teaching label vanishes on edit','environment.js','patch,demo=teaching','patch,demo=false','partial edits'],
 ['search creates an unsaveable winner','model.js','Math.min(SCHEMA.floors[2],','Math.min(400,','every search winner'],
 ['height search ignores crown','model.js','+crownOf(s).h','','height alternatives'],
 ['OBJ normals face inward','model.js',"indices.map(i=>i+1).reverse().join(' ')","indices.map(i=>i+1).join(' ')",'all profile/crown'],
 ['custom OBJ loses schedule inputs','model.js','prog.levels(s):prog.floors(s)','prog.levels():prog.floors()','OBJ volume'],
 ['crown omitted from shell','model.js','if(c.h>0){const roof','if(false){const roof','all profile/crown'],
 ['normalization removed','model.js','objective=normalized(rawObjective,range.bMin,range.bMax)','objective=rawObjective','normalized rankings do not'],
 ['infeasible candidate changes scale','model.js','results.filter(x=>x.metrics.valid),ranges','results,ranges','mixed regimes apply'],
 ['Brief lost on save','app.js','brief:getBriefStudy(state).inputs','brief:undefined','actual Save/Reload'],
 ['failed deletion loses a study','app.js','studies.splice(i,0,...removed);','/* rollback removed */','actual Save/Reload'],
 ['crown missing from shadow cache key','context.js','s.program,s.height,s.crown,ns','s.program,s.height,ns','crown changes reach'],
 // The 23 October shipability audit: the material names, the candidate
 // table's reading order, and the release graph itself.
 ['material select falls back to the English table','app.js',"matL[k]=tri('mat.'+k)","matL[k]=MATERIALS[k].label",'the material select is built from the string table'],
 ['the note names the material in English','app.js',"name:tt('mat.'+state.material)",'name:mt.label','the note under the material is headed by the material'],
 ['the swatch is named in English','app.js',"b.setAttribute('aria-label',tt('mat.'+k))","b.setAttribute('aria-label',m.label)",'material swatches remain discoverable'],
 ['the schedule names the material in English','quantity.js',"table['mat.'+(info.mat||'float')]","MATERIALS[info.mat].label",'the quantity schedule names the material'],
 ['a Thai material name is the English name','i18n.js',"'mat.float':'กระจกโฟลตใส'","'mat.float':'Float glass, clear'",'every material is named in all three languages'],
 ['the action column is not last','app.js',"['cand',tt('s.col.candidate'),false],","['apply',tt('s.col.candidate'),false],",'the candidate table reads in decision order'],
 ['the columns lose their names','app.js','class="c-${c}"','class=""','every column carries its own name'],
 ['the identical columns are hidden by position again','console.css','.console-dock .tablewrap .c-gross,.console-dock .tablewrap .c-rentable{display:none}','.console-dock .tablewrap th:nth-child(3),.console-dock .tablewrap td:nth-child(3),.console-dock .tablewrap th:nth-child(4),.console-dock .tablewrap td:nth-child(4){display:none}','the two identical columns are hidden by name'],
 ['the action is not pinned','console.css','position:sticky;right:0;','position:static;','the action is pinned to the right edge'],
 ['a module ships without being hashed','stamper',"'crowns.js','materials.js','details.js',","'crowns.js','details.js',",'every module that ships is hashed'],
 ['an import edge is left out of the stamp','stamper',"'./materials.js','./i18n.js'","'./materials.js'",'the stamper covers every edge'],
 // The reader's own plot: the land decides the size. These six are the
 // defects that made a 52,000 m² outline report a 32 m tower, and each one
 // has to fail a test that reads the panel, not the code.
 ['the range is read off the wrong end of the schema','context.js','const [,lo,hi]=SCHEMA.span;','const [lo,hi]=SCHEMA.span;','the desk prints the widest plate'],
 ['the land is asked for its own size, not the current one','context.js','const land=state.span*fits.k;','const land=state.span;','the desk prints the widest plate'],
 ['the plate shown is the land limit, not the size that can be drawn','context.js','const shown=drawable?set:land;','const shown=land;','the desk prints the widest plate'],
 ['the size adopted is not held inside the instrument range','context.js','const set=Math.max(lo,Math.min(hi,land));','const set=land;','the adopt action applies a size inside the range'],
 ['a plot too small for the instrument is still offered a plate','context.js','const drawable=land>=lo;','const drawable=true;','a plot too small for the instrument offers nothing'],
 ['the plate is sized at half the land','site.js','hi=Math.min(maxScale,extent(ring,0)/extent(plate,0),extent(ring,1)/extent(plate,1))','hi=Math.min(maxScale,extent(ring,0)/extent(plate,0),extent(ring,1)/extent(plate,1))/2','the land decides the size'],
 ['the floor area is priced from the current plate, not the one on the sheet','context.js','area(profile({...state,span:shown,orientation:bearing},0))','area(profile(state,0))','the floor area printed is the area of the plate'],
 // What the reader can put on top, and what the plate is worth.
 ['the figure crown is not in the library','crowns.js',"figure:{label:'Figure on a pedestal'","flatx:{label:'Figure on a pedestal'",'the library offers a figure to put on top'],
 ['the figure is drawn narrower than the pedestal it stands on','crowns.js','{t:1,f:c.foot*1.4}','{t:1,f:c.foot*.2}','the figure is drawn as a figure'],
 ['the money is priced from the current model, not the plate on the land','context.js','evaluate({...state,span:set,orientation:bearing})','evaluate(state)','the sheet states what the plate costs'],
 ['the running cost is never stated','context.js',"kv3(c['m.running'],formatMoney(econ.rent+econ.crownNetRent-econ.contribution,lang));",'','the sheet states what the plate costs'],
 // The chrome around the instrument, measured on the rendered page at 390,
 // 1024 and 1440 in three languages. Each of these is a way the layout can
 // go back to what it was.
 ['the destinations do not fill the header','style.css','.tabs{display:flex;gap:6px;align-self:stretch}','.tabs{display:flex;gap:6px}','destinations fill the header'],
 ['the destinations are a fixed height again','style.css','min-height:auto;height:auto;','min-height:auto;height:46px;','destinations fill the header'],
 ['the strip wraps into a second row again','console.css','.console-nav{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none}','.console-nav{flex-wrap:wrap;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none}','workspace strip does not wrap'],
 ['the strip cannot scroll','console.css','.console-nav{flex-wrap:nowrap;overflow-x:auto;','.console-nav{flex-wrap:nowrap;overflow-x:visible;','workspace strip does not wrap'],
 ['the drawing beside the table loses its floor','console.css','grid-template-columns:minmax(380px,.8fr) minmax(0,1.5fr)','grid-template-columns:minmax(0,.8fr) minmax(0,1.5fr)','drawing beside'],
 ['the table cannot shrink into its column','desks.css','vertical-align:top;overflow-wrap:anywhere}','vertical-align:top}','Feng Shui table'],
 ['the table headings are held on one line again','desks.css','padding:0 8px 4px 4px;font-weight:500}','padding:0 8px 4px 4px;white-space:nowrap;font-weight:500}','Feng Shui table'],
 ['the bar is measured without its own padding','app.js','let need=(parseFloat(bs.paddingLeft)||0)+(parseFloat(bs.borderLeftWidth)||0);','let need=0;','parameters take their own row'],
 ['the gaps between the groups are not room','app.js','-used-hgap*count;','-used-hgap;','parameters take their own row'],
 ['the bar is never moved to its own row','app.js',"h.classList.toggle('bar-row',need>avail);","h.classList.toggle('bar-row',false);",'parameters take their own row'],
 ['the header is never asked','app.js','if(h)fitSiteBar(h);','','header is asked'],
 ['the bar has no rule for a row of its own','console.css','body.is-console header.bar-row .console-site{flex:1 0 100%;order:3;border-left-color:transparent;padding:4px 0 6px}','','placed by a constant width']
];
// The files the mutants are written into. Everything else is symlinked, so a
// mutation cannot leak into the working tree.
const MUTABLE=['app.js','model.js','context.js','environment.js','environment-desk.js','decisions.js',
 'console.css','style.css','desks.css','i18n.js','quantity.js','site.js','crowns.js','feng.js','materials.js','glare.js','drawing-viewer.js','fire.js','lifts.js','water.js','wind.js','structure.js','carbon.js'];
const TESTS=['shipability.test.mjs','environment.test.mjs','decisions.test.mjs',
 'fire-units.test.mjs','services-method-audit.test.mjs','wind.test.mjs','structure.test.mjs','carbon.test.mjs','material-name.test.mjs','material-basis.test.mjs','glare-radiometry.test.mjs','drawing-viewer.test.mjs','explore-table.test.mjs','release-graph.test.mjs','site-plot.test.mjs',
 'crown.test.mjs','chrome-fit.test.mjs','site-display-boundary.test.mjs','plot-fit.test.mjs','view-controls.test.mjs','feng.test.mjs'];
try{
 await mkdir(join(dir,'dist'));await mkdir(join(dir,'tests'));
 await symlink(resolve('node_modules'),join(dir,'node_modules'));

 await mkdir(join(dir,'scripts'));await copyFile('scripts/release-graph.mjs',join(dir,'scripts/release-graph.mjs'));await copyFile('scripts/building-height.mjs',join(dir,'scripts/building-height.mjs'));
 await copyFile('scripts/release-id.mjs',join(dir,'scripts/release-id.mjs'));
 await copyFile('package.json',join(dir,'package.json'));
 for(const t of TESTS)await copyFile('tests/'+t,join(dir,'tests',t));
 // The plot desk's test reads the panel through the shared DOM stub, so the
 // stub has to travel with it.
 await copyFile('tests/desk-dom.mjs',join(dir,'tests','desk-dom.mjs'));
 for(const name of await readdir('dist'))if(!MUTABLE.includes(name))await symlink(resolve('dist',name),join(dir,'dist',name));
 const original={};for(const f of MUTABLE)original[f]=await readFile('dist/'+f,'utf8');
 const stamperOriginal=await readFile('scripts/release-id.mjs','utf8');
 const stage=async(file,before,after)=>{
  for(const [f,s]of Object.entries(original))await writeFile(join(dir,'dist',f),f===file?s.replaceAll(before,after):s);
  await writeFile(join(dir,'scripts/release-id.mjs'),file==='stamper'?stamperOriginal.replace(before,after):stamperOriginal);};
 const heightOriginal=await readFile('scripts/building-height.mjs','utf8');
 const run=pattern=>runProbe(['--test',...(pattern?['--test-name-pattern',pattern]:[]),...TESTS.map(t=>join(dir,'tests',t))]);
 await stage();const baseline=run();if(baseline.status!==0)throw Error('Isolated baseline failed: '+baseline.stdout+baseline.stderr);
 console.log('PASS: isolated baseline');
 for(const [name,file,before,after,pattern]of cases){
  const source=file==='height'?heightOriginal:(file==='stamper'?stamperOriginal:original[file]);
  if(!source.includes(before))throw Error('Missing mutation target: '+name);
  await writeFile(join(dir,'scripts/building-height.mjs'),file==='height'?heightOriginal.replace(before,after):heightOriginal);
  await stage(file,before,after);const result=run(pattern);
  if(result.status===0){console.error('SURVIVED: '+name);process.exitCode=1}else console.log('KILLED: '+name);
 }
}finally{await rm(dir,{recursive:true,force:true})}
