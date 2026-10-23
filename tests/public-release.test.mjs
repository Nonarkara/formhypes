import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {stagePublicCommit} from '../scripts/public-release.mjs';
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),'shdt-public-test-')),cwd=join(root,'repo'),stage=join(root,'stage');
 await mkdir(cwd);await mkdir(stage);await mkdir(join(cwd,'dist'));
 const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Release fixture');git('config','user.email','fixture@example.invalid');
 const commit=()=>{git('add','.');git('commit','-qm','Public fixture');return git('rev-parse','HEAD')};
 try{await fn({cwd,stage,git,commit})}finally{await rm(root,{recursive:true,force:true})}
}
test('release staging publishes committed bytes and excludes ignored or subsequently changed checkout content',()=>fixture(async({cwd,stage,git,commit})=>{
 await writeFile(join(cwd,'.gitignore'),'dist/.scratch/\ndist/.env.production\n');
 await writeFile(join(cwd,'dist/index.html'),'Reviewed public bytes');const sha=commit();
 await mkdir(join(cwd,'dist/.scratch'));await writeFile(join(cwd,'dist/.scratch/private.txt'),'Synthetic private fixture');
 await writeFile(join(cwd,'dist/.env.production'),'SYNTHETIC_ONLY=true');
 assert.equal(git('status','--porcelain'),'');
 await writeFile(join(cwd,'dist/index.html'),'Later checkout edit');
 assert.equal(stagePublicCommit({cwd,stage,commit:sha}),1);
 assert.deepEqual(await readdir(stage),['index.html']);assert.equal(await readFile(join(stage,'index.html'),'utf8'),'Reviewed public bytes');
}));
test('a committed symlink cannot expose content outside the public tree',()=>fixture(async({cwd,stage,commit})=>{
 await writeFile(join(cwd,'private.txt'),'Synthetic fixture');await symlink('../private.txt',join(cwd,'dist/exposed.txt'));
 assert.throws(()=>stagePublicCommit({cwd,stage,commit:commit()}),/regular committed files/);
 assert.deepEqual(await readdir(stage),[]);
}));
test('a private path committed by mistake blocks staging before any upload',()=>fixture(async({cwd,stage,commit})=>{
 await writeFile(join(cwd,'dist/index.html'),'Public');await writeFile(join(cwd,'dist/.env.production'),'SYNTHETIC_ONLY=true');
 assert.throws(()=>stagePublicCommit({cwd,stage,commit:commit()}),/Private path/);assert.deepEqual(await readdir(stage),[]);
}));
