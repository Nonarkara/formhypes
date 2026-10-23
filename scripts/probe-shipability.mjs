// Mutation probes for the contracts found in the 18 October audit.
// Always prove the isolated baseline passes before interpreting a failed mutant.
import {mkdtemp,mkdir,readdir,symlink,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'shdt-contract-mutations-'));
const cases=[
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
 ['the floor area is priced from the current plate, not the one on the sheet','context.js','area(profile({...state,span:shown,orientation:bearing},0))','area(profile(state,0))','the floor area printed is the area of the plate']
];
// The files the mutants are written into. Everything else is symlinked, so a
// mutation cannot leak into the working tree.
const MUTABLE=['app.js','model.js','context.js','environment.js','environment-desk.js','decisions.js',
 'console.css','i18n.js','quantity.js','site.js'];
const TESTS=['shipability.test.mjs','environment.test.mjs','decisions.test.mjs',
 'material-name.test.mjs','explore-table.test.mjs','release-graph.test.mjs','site-plot.test.mjs'];
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
 const run=pattern=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),...TESTS.map(t=>join(dir,'tests',t))],{encoding:'utf8'});
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
