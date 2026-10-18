// Stage only public assets; keep checkout caches and metadata off the live host.
import {mkdtemp,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,basename} from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('Commit the verified release before production deployment; working tree is dirty.');
const stage=await mkdtemp(join(tmpdir(),'shdt-public-'));
try{await cp('dist',stage,{recursive:true,filter:path=>!['.wrangler','.DS_Store','.git','.env'].includes(basename(path))});const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();const result=spawnSync('wrangler',['pages','deploy',stage,'--project-name=shdt','--branch=main','--commit-hash='+sha,'--commit-dirty=false'],{stdio:'inherit'});process.exitCode=result.status??1}finally{await rm(stage,{recursive:true,force:true})}
