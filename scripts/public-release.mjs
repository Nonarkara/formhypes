// Build the upload from the recorded commit, never from ignored checkout files.
import {execFileSync} from 'node:child_process';

export function stagePublicCommit({cwd=process.cwd(),stage,commit}){
 const git=args=>execFileSync('git',args,{cwd,maxBuffer:64*1024*1024});
 if(!/^[a-f\d]{40,64}$/.test(commit))throw Error('Public release requires a full commit hash.');
 const entries=git(['ls-tree','-rz',commit,'--','dist']).toString().split('\0').filter(Boolean);
 if(!entries.length)throw Error('No committed public assets.');
 for(const entry of entries){
  const tab=entry.indexOf('\t'),mode=entry.slice(0,6),path=entry.slice(tab+1);
  if(!['100644','100755'].includes(mode))throw Error('Public assets must be regular committed files: '+path);
  if(path.split('/').some(part=>/^(?:\.env(?:\..*)?|\.git|\.scratch|\.openai|\.wrangler|node_modules|\.DS_Store)$/.test(part)))throw Error('Private path in public commit: '+path);
 }
 const archive=git(['archive','--format=tar',commit+':dist']);
 execFileSync('tar',['-xf','-','-C',stage],{input:archive,maxBuffer:1024*1024});
 return entries.length;
}
