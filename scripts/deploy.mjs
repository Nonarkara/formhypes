// Publish exactly the reviewed commit; ignored checkout files never enter staging.
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {stagePublicCommit} from './public-release.mjs';
import {readCredential,credentialVerdict,CREDENTIAL_COMMAND} from './cloudflare-credential.mjs';
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('Commit the verified release before production deployment; working tree is dirty.');
// The credential is checked before a byte is staged. wrangler reports a dead
// token as a failed request, which reads like a network fault; here it is
// named before the upload starts, with the command that fixes it.
const credential=credentialVerdict(await readCredential());
if(credential.state!=='ok'){
 console.error('This deploy cannot be authorised: '+credential.reason+'.');
 console.error('Re-authorise, then deploy again:');
 console.error('  '+CREDENTIAL_COMMAND);
 process.exit(4);
}
const wrangler=spawnSync('wrangler',['--version'],{encoding:'utf8'});
if(wrangler.error&&wrangler.error.code==='ENOENT'){
 console.error('wrangler is not on PATH. The deployer needs Cloudflare\'s CLI:');
 console.error('  npm install --global wrangler@4');
 process.exit(5);
}
if(wrangler.error||wrangler.status!==0){
 console.error('wrangler could not start. Check the installed CLI before deploying.');
 process.exit(5);
}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const stage=await mkdtemp(join(tmpdir(),'shdt-public-'));
try{
 stagePublicCommit({stage,commit:sha});
 const result=spawnSync('wrangler',['pages','deploy',stage,'--project-name=shdt','--branch=main','--commit-hash='+sha,'--commit-dirty=false'],{stdio:'inherit'});
 if((result.status??1)!==0){
  // The message is printed only when the credential really is the reason, so
  // a deploy that failed for another cause is not sent chasing the wrong fix.
  const after=credentialVerdict(await readCredential());
  if(after.state!=='ok'){
   console.error('');
   console.error('The Cloudflare credential is not usable ('+after.reason+'). Re-authorise, then deploy again:');
   console.error('  '+CREDENTIAL_COMMAND);
  }
 }
 process.exitCode=result.status??1;
}finally{await rm(stage,{recursive:true,force:true})}
