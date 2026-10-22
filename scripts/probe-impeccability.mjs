// Isolated mutations for the 22 October interaction audit. Never edits the checkout.
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,symlinkSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const cases=[
 ['hidden swatches','dist/index.html','id="matStrip" role="group"','id="matStrip" aria-hidden="true" role="group"','material swatches','tests/shipability.test.mjs'],
 ['replace focused swatch','dist/app.js',"const strip=$('matStrip');","const strip=$('matStrip');strip.replaceChildren();",'material swatches','tests/shipability.test.mjs'],
 ['unbounded calculation','dist/lifts.js','clamp(fin(o.pop,0)>0?Math.round(o.pop):popDefault,1,LIFT_POP_MAX)','fin(o.pop,0)>0?o.pop:popDefault','population is bounded','tests/lifts.test.mjs'],
 ['unchecked input','dist/lifts.js','!inp.checkValidity()||!Number.isFinite(inp.valueAsNumber)','false','population is bounded','tests/lifts.test.mjs'],
 ['unearned safety','dist/wind.js',"clear:'นอกช่วงล็อก: v_crit","clear:'ปลอดภัย: v_crit",'clear wind status','tests/wind.test.mjs'],
];
const stage=mkdtempSync(join(tmpdir(),'shdt-impeccability-'));
let failed=0;
try{
 mkdirSync(join(stage,'dist'));mkdirSync(join(stage,'tests'));
 const files=new Set(cases.map(c=>c[1]));
 for(const name of readdirSync('dist')){
  const file='dist/'+name;
  if(files.has(file))copyFileSync(file,join(stage,file));
  else symlinkSync(resolve(file),join(stage,file));
 }
 copyFileSync('package.json',join(stage,'package.json'));
 symlinkSync(resolve('scripts'),join(stage,'scripts'));
 for(const test of new Set(cases.map(c=>c[5])))copyFileSync(test,join(stage,test));
 const run=(pattern,test)=>spawnSync(process.execPath,['--test','--test-name-pattern='+pattern,join(stage,test)],{encoding:'utf8',timeout:30000});
 for(const [name,file,from,to,pattern,test] of cases){
  const target=join(stage,file),original=readFileSync(target,'utf8');
  if(!original.includes(from))throw Error('mutation target missing: '+name);
  const baseline=run(pattern,test);
  if(baseline.status!==0)throw Error('Baseline failed: '+baseline.stdout+baseline.stderr);
  try{
   writeFileSync(target,original.replace(from,to));
   const result=run(pattern,test),killed=result.status!==0&&!result.error;
   console.log(name+': '+(killed?'KILLED':'SURVIVED'));
   if(!killed)failed++;
  }finally{writeFileSync(target,original)}
 }
}finally{rmSync(stage,{recursive:true,force:true})}
process.exitCode=failed?1:0;
