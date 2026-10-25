import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const target=node=>node?.type==='CallExpression'&&node.callee?.name==='$'?node.arguments[0]?.value:null;
const handlers=ast.body.filter(n=>{
 const e=n.expression;
 return e?.type==='AssignmentExpression'&&target(e.left?.object)==='viewToolsToggle'||e?.type==='CallExpression'&&target(e.callee?.object)==='viewTools'&&e.callee?.property?.name==='addEventListener';
});
function setup(mobile){
 const classes=new Set(),events={},attrs={'aria-expanded':'false'};let focused=false;
 const button={getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v,focus:()=>focused=true};
 const group={classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k)},remove:k=>classes.delete(k)},addEventListener:(name,fn)=>events[name]=fn};
 assert.equal(handlers.length,2,'actual event wiring must exist, outside comments');
 const ctx=vm.createContext({$:id=>({viewToolsToggle:button,viewTools:group})[id],matchMedia:()=>({matches:mobile})});
 for(const node of handlers)vm.runInContext(source.slice(node.start,node.end),ctx);
 return {button,classes,attrs,events,focused:()=>focused};
}
test('phone view tools are exposed on request and focus returns after selecting a view',()=>{
 const ui=setup(true);ui.button.onclick();assert.equal(ui.attrs['aria-expanded'],'true');assert.ok(ui.classes.has('is-open'));
 ui.events.click({target:{closest:()=>({})}});assert.equal(ui.attrs['aria-expanded'],'false');assert.equal(ui.classes.has('is-open'),false);assert.equal(ui.focused(),true);
});
test('desktop view actions do not move keyboard focus to the phone-only command',()=>{
 const ui=setup(false);ui.events.click({target:{closest:()=>({})}});assert.equal(ui.focused(),false);
});
