// Reproduce the three false-green releases in isolated copies, after running
// the real stamper. Failing on an unstamped importer alone is not evidence.
import {mkdtemp,cp,mkdir,copyFile,symlink,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const stage=await mkdtemp(join(tmpdir(),'shdt-release-guards-'));
const run=(args)=>spawnSync(process.execPath,args,{cwd:stage,encoding:'utf8',timeout:30000});
let failed=0;
try{
 await mkdir(join(stage,'tests'));await mkdir(join(stage,'scripts'));
 for(const file of ['package.json','scripts/release-id.mjs','scripts/release-graph.mjs','tests/release-graph.test.mjs'])await copyFile(file,join(stage,file));
 await symlink(resolve('node_modules'),join(stage,'node_modules'));
 const reset=async()=>{await rm(join(stage,'dist'),{recursive:true,force:true});await cp('dist',join(stage,'dist'),{recursive:true,filter:p=>!p.includes('/.wrangler')})};
 const verify=()=>run(['--test','tests/release-graph.test.mjs']);
 const stamp=()=>{const r=run(['scripts/release-id.mjs']);if(r.status!==0)throw Error(r.stdout+r.stderr)};
 await reset();stamp();const baseline=verify();if(baseline.status!==0)throw Error('Baseline failed: '+baseline.stdout+baseline.stderr);
 const mutations=[
  ['double-quoted missing import',async()=>{const file=join(stage,'dist/play.js');await writeFile(file,(await readFile(file,'utf8'))+'\nimport "./missing-release-probe.js";\n')}],
  ['nested dependency',async()=>{const file=join(stage,'dist/vendor/suncalc.js');await writeFile(file,(await readFile(file,'utf8'))+"\nimport './new-release-probe.js';\n");await writeFile(join(stage,'dist/vendor/new-release-probe.js'),'export const probe=1;\n')}],
  ['comment-only hash registration',async()=>{await writeFile(join(stage,'dist/comment-probe.js'),'export const probe=1;\n');const file=join(stage,'scripts/release-id.mjs');await writeFile(file,(await readFile(file,'utf8')).replace('const SHARED = [',"const SHARED = [/* 'comment-probe.js' */"))}],
 ];
 for(const [name,mutate]of mutations){await reset();await mutate();stamp();const result=verify();const killed=result.status!==0&&!result.error;console.log((killed?'KILLED: ':'SURVIVED: ')+name);if(!killed)failed++}
}finally{await rm(stage,{recursive:true,force:true})}
process.exitCode=failed?1:0;
