// Release checks read JavaScript syntax, including nested modules. This module
// runs only in Node; the parser is never part of the public application.
import {parse} from 'acorn';
import {readdirSync} from 'node:fs';
import {join,posix} from 'node:path';

export function moduleFiles(root,prefix=''){
 return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(entry=>{
  if(entry.name.startsWith('.'))return [];
  const file=posix.join(prefix,entry.name);
  return entry.isDirectory()?moduleFiles(root,file):/\.[cm]?js$/.test(entry.name)?[file]:[];
 }).sort();
}
const ast=source=>parse(source,{ecmaVersion:'latest',sourceType:'module'});
function walk(node,visit){
 if(!node||typeof node!=='object')return;
 if(node.type)visit(node);
 for(const value of Object.values(node)){
  if(Array.isArray(value))for(const child of value)walk(child,visit);
  else if(value&&typeof value==='object')walk(value,visit);
 }
}
export function moduleImports(source){
 const refs=[];
 walk(ast(source),node=>{
  if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)&&node.source){
   if(typeof node.source.value!=='string')throw Error('Computed dynamic import cannot be verified by the release graph; use a literal module URL.');
   refs.push(node.source.value);
  }
 });
 return refs.filter(ref=>/^(?:\.\.?\/|\/|knowledge\/)/.test(ref));
}
export function withoutComments(source){
 const comments=[];
 parse(source,{ecmaVersion:'latest',sourceType:'module',onComment:comments});
 let clean=source;
 for(const c of comments.reverse())clean=clean.slice(0,c.start)+clean.slice(c.start,c.end).replace(/[^\n]/g,' ')+clean.slice(c.end);
 return clean;
}
export function edgeTarget(from,ref){
 const file=ref.split(/[?#]/)[0];
 const target=file.startsWith('/')?file.slice(1):posix.join(posix.dirname(from),file);
 if(target==='..'||target.startsWith('../'))throw Error('Release reference leaves dist: '+from+' -> '+ref);
 return target;
}
