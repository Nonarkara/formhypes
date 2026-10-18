// Mutation probes for the contracts found in the 18 October audit.
// Always prove the isolated baseline passes before interpreting a failed mutant.
import {mkdtemp,mkdir,readdir,symlink,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'shdt-contract-mutations-'));
const cases=[
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
 ['crown missing from shadow cache key','context.js','s.program,s.height,s.crown,ns','s.program,s.height,ns','crown changes reach']
];
try{
 await mkdir(join(dir,'dist'));await mkdir(join(dir,'tests'));
 await mkdir(join(dir,'scripts'));await copyFile('scripts/building-height.mjs',join(dir,'scripts/building-height.mjs'));
 await copyFile('tests/environment.test.mjs',join(dir,'tests/environment.test.mjs'));
 await copyFile('package.json',join(dir,'package.json'));await copyFile('tests/shipability.test.mjs',join(dir,'tests/shipability.test.mjs'));
 for(const name of await readdir('dist'))if(!['app.js','model.js','context.js','environment.js','environment-desk.js'].includes(name))await symlink(resolve('dist',name),join(dir,'dist',name));
 const original={};for(const f of ['app.js','model.js','context.js','environment.js','environment-desk.js'])original[f]=await readFile('dist/'+f,'utf8');
 const stage=async(file,before,after)=>{for(const [f,s]of Object.entries(original))await writeFile(join(dir,'dist',f),f===file?s.replaceAll(before,after):s)};
 const heightOriginal=await readFile('scripts/building-height.mjs','utf8');
 const run=pattern=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),join(dir,'tests/shipability.test.mjs'),join(dir,'tests/environment.test.mjs')],{encoding:'utf8'});
 await stage();const baseline=run();if(baseline.status!==0)throw Error('Isolated baseline failed: '+baseline.stdout+baseline.stderr);
 console.log('PASS: isolated baseline');
 for(const [name,file,before,after,pattern]of cases){
  if(!(file==='height'?heightOriginal:original[file]).includes(before))throw Error('Missing mutation target: '+name);
  await writeFile(join(dir,'scripts/building-height.mjs'),file==='height'?heightOriginal.replace(before,after):heightOriginal);
  await stage(file,before,after);const result=run(pattern);
  if(result.status===0){console.error('SURVIVED: '+name);process.exitCode=1}else console.log('KILLED: '+name);
 }
}finally{await rm(dir,{recursive:true,force:true})}
