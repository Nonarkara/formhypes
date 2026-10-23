// Run real preference behavior against isolated files; prove the baseline first.
import {mkdtemp,cp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const stage=await mkdtemp(join(tmpdir(),'shdt-preferences-'));
let failed=0;
try{
 await mkdir(join(stage,'tests'));await copyFile('package.json',join(stage,'package.json'));
 await copyFile('tests/preferences.test.mjs',join(stage,'tests/preferences.test.mjs'));
 await cp('dist',join(stage,'dist'),{recursive:true});
 const file=join(stage,'dist/preferences.js'),source=await readFile(file,'utf8');
 const verify=()=>spawnSync(process.execPath,['--test','tests/preferences.test.mjs'],{cwd:stage,encoding:'utf8',timeout:30000});
 const baseline=verify();if(baseline.status!==0)throw Error('Baseline failed: '+baseline.stdout+baseline.stderr);
 const mutations=[
  ['feet treated as metres',"'m':[1/.3048,'ft']","'m':[1,'ft']"],
  ['currency rate ignored',"book.rates[preferences.currency]/factor","1/factor"],
  ['area rate denominator inverted',"book.rates[preferences.currency]/factor","book.rates[preferences.currency]*factor"],
  ['preference persistence omitted',"write(PREF_KEY,preferences)","void 0"],
  ['failed refresh discards dated rates',"if(!response.ok)throw Error('Reference rates unavailable');","if(!response.ok){book={...book,rates:{USD:1,CNY:1}};throw Error('Reference rates unavailable')}"],
  ['temperature difference gains absolute offset',"scale==='F'?value*9/5:value","scale==='F'?value*9/5+32:value"]
 ];
 for(const [name,before,after]of mutations){if(!source.includes(before))throw Error('Mutation target missing: '+name);await writeFile(file,source.replace(before,after));const r=verify();const killed=r.status!==0&&!r.error;console.log((killed?'KILLED: ':'SURVIVED: ')+name);if(!killed)failed++}
}finally{await rm(stage,{recursive:true,force:true})}
process.exitCode=failed?1:0;
