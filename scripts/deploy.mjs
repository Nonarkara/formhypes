// Publish exactly the reviewed commit; ignored checkout files never enter staging.
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {stagePublicCommit} from './public-release.mjs';
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('Commit the verified release before production deployment; working tree is dirty.');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const stage=await mkdtemp(join(tmpdir(),'shdt-public-'));
try{
 stagePublicCommit({stage,commit:sha});
 const result=spawnSync('wrangler',['pages','deploy',stage,'--project-name=shdt','--branch=main','--commit-hash='+sha,'--commit-dirty=false'],{stdio:'inherit'});
 process.exitCode=result.status??1;
}finally{await rm(stage,{recursive:true,force:true})}
