import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {runProbe} from '../scripts/probe-process.mjs';

test('a completed failing probe retains diagnostics larger than the old one-MiB limit',()=>{
 const args=['-e',"process.stdout.write('x'.repeat(2*1024*1024),()=>process.exit(1))"];
 const limited=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:1024*1024});
 assert.equal(limited.error?.code,'ENOBUFS');
 assert.notEqual(limited.status,0,'the old status-only check would count this interrupted process');
 const r=runProbe(args);
 assert.equal(r.status,1);
 assert.equal(r.stdout.length,2*1024*1024);
 assert.equal(r.error,undefined);
});

test('a timed-out probe is an execution error, not a caught mutation',()=>{
 assert.throws(()=>runProbe(['-e','setTimeout(()=>{},10000)'],{timeout:50}),/did not complete: ETIMEDOUT/);
});

test('a signalled probe is an execution error, not a caught mutation',()=>{
 assert.throws(()=>runProbe(['-e',"process.kill(process.pid,'SIGTERM')"]),/did not complete: SIGTERM/);
});
