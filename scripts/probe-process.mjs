import {spawnSync} from 'node:child_process';

// A failed assertion may include the shipped controller or a rendered desk.
// Keep a bounded diagnostic large enough for that output. Interrupted children
// are infrastructure errors, never evidence that a mutation was caught.
export function runProbe(args,{cwd,timeout=120000}={}){
 const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
 if(r.error||r.signal||r.status===null)throw Error('Probe did not complete: '+(r.error?.code||r.signal||'no exit status'));
 return r;
}
