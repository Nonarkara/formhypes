import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{runInNewContext}from'node:vm';
import*as M from'../dist/model.js';import{SCHEMA}from'../dist/schema.js';import{MATERIALS}from'../dist/materials.js';import{CROWNS,GARDENS}from'../dist/crowns.js';import{DETAILS}from'../dist/details.js';import{validSolar,solarDefaults}from'../dist/solar.js';
import{getBriefStudy,normalizeBriefInputs,restoreBriefInputs}from'../dist/brief.js';import{getEnvironmentStudy}from'../dist/environment.js';
import{parseStudyPackage,compareStudies,comparisonSVG,cleanStudyName,cleanStudyNote,DECISION_I18N}from'../dist/decisions.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),ctx={families:M.families,levelPrograms:M.levelPrograms,facadeFamilies:M.facadeFamilies,systems:M.systems,regimes:M.regimes,MATERIALS,CROWNS,GARDENS,DETAILS,schema:SCHEMA,validSolar,solarDefaults};
runInNewContext(app.slice(app.indexOf('const own='),app.indexOf('// The rebrand')),ctx);
const make=(patch={})=>({version:4,study:{name:'Courtyard option',note:'Review access with occupants'},state:{...M.defaults,...patch},contextStudies:{brief:getBriefStudy(M.defaults),environment:getEnvironmentStudy()},metrics:{contribution:999999999}});
test('versioned import round-trips named inputs and ignores supplied computed metrics',()=>{
 const doc=make(),study=parseStudyPackage(JSON.stringify(doc),ctx.validState);assert.equal(study.name,doc.study.name);assert.equal(study.note,doc.study.note);assert.deepEqual(study.state,doc.state);assert.deepEqual(study.brief,doc.contextStudies.brief.inputs);assert.deepEqual(study.environment.inputs,doc.contextStudies.environment.inputs);assert.ok(!Object.hasOwn(study,'metrics'));
 doc.version=3;delete doc.study;assert.equal(parseStudyPackage(JSON.stringify(doc),ctx.validState).name,'');
});
test('malformed packages cannot change the current Brief or enter an unsafe state',()=>{
 const initial=getBriefStudy(M.defaults).inputs;
 const bad=[{...make(),contextStudies:undefined},{...make(),study:{name:42}},{...make(),version:99},{...make(),state:{...M.defaults,family:'constructor'}},{...make(),state:{...M.defaults,floors:18.5}},{...make(),state:{...M.defaults,led:'false'}},{...make(),state:{...M.defaults,span:1e9}},{...make(),state:{...M.defaults,objective:'constructor'}},{...make(),contextStudies:{brief:{inputs:{plot:-1}}}},{...make(),contextStudies:{environment:{inputs:{speed:500}}}},{...make(),state:{...M.defaults,unknown:1}}];
 for(const doc of bad)assert.throws(()=>parseStudyPackage(JSON.stringify(doc),ctx.validState));assert.throws(()=>parseStudyPackage('broken',ctx.validState));assert.throws(()=>parseStudyPackage(' '.repeat(1048577),ctx.validState));assert.deepEqual(getBriefStudy(M.defaults).inputs,initial);
});
test('comparison preserves the reference, counts numeric deltas, and reveals changed area and city',()=>{
 const reference=parseStudyPackage(JSON.stringify(make()),ctx.validState),copy=structuredClone(reference),current=parseStudyPackage(JSON.stringify(make({floors:60,city:'tokyo'})),ctx.validState),c=compareStudies(reference,current);
 assert.equal(c.before.heightTotal,M.evaluate(reference.state).heightTotal);assert.ok(c.after.heightTotal>c.before.heightTotal);assert.equal(c.sameArea,false);assert.equal(c.sameCity,false);for(const row of c.rows){assert.equal(row.delta,row.after-row.before);assert.ok(Number.isFinite(row.before)&&Number.isFinite(row.after))}assert.deepEqual(reference,copy);
 const same=compareStudies(reference,reference);assert.equal(same.sameArea,true);assert.equal(same.sameCity,true);assert.ok(same.rows.every(r=>r.delta===0));
});
test('comparison figures share one metre scale and reach both actual crown heights',()=>{
 const a={...M.defaults,crown:'flat'},b={...M.defaults,crown:'post'},svg=comparisonSVG(a,b);for(const s of [a,b])assert.ok(svg.includes(M.massingRings(s).at(-1).z.toFixed(1)+' m'));assert.ok(!svg.includes('NaN'));assert.equal((svg.match(/<svg/g)||[]).length,1);
});
test('Brief normalization validates a candidate without mutating the active desk',()=>{
 const before=getBriefStudy(M.defaults).inputs,normalized=normalizeBriefInputs({plot:12345,gfa:240000});assert.equal(normalized.plot,12345);assert.deepEqual(getBriefStudy(M.defaults).inputs,before);assert.equal(normalizeBriefInputs({plot:-1}),false);assert.deepEqual(getBriefStudy(M.defaults).inputs,before);
});
test('notes remain plain bounded text and all three languages name the same comparison fields',()=>{
 assert.equal(cleanStudyName('  A\n B  '),'A B');assert.equal(cleanStudyName('x'.repeat(90)).length,80);assert.equal(cleanStudyNote('x'.repeat(1300)).length,1200);assert.equal(cleanStudyName('<script>literal</script>'),'<script>literal</script>');for(const c of Object.values(DECISION_I18N)){assert.deepEqual(Object.keys(c),Object.keys(DECISION_I18N.en));assert.ok(Object.values(c).every(x=>typeof x==='string'&&x.length>0))}
});


test('historical version3 files migrate only absent later fields; invalid supplied values still fail',()=>{
 const doc=make();doc.version=3;for(const k of ['material','crown','garden','led','detail'])delete doc.state[k];delete doc.contextStudies.environment;
 const restored=parseStudyPackage(JSON.stringify(doc),ctx.validState);assert.equal(restored.state.crown,'flat');assert.equal(restored.state.led,false);assert.equal(restored.environment.inputs.speed,'');
 doc.state.crown='constructor';assert.throws(()=>parseStudyPackage(JSON.stringify(doc),ctx.validState));
});
test('equal area does not hide edited rates or an infeasible reference',()=>{
 const reference={state:{...M.defaults,crown:'post'}},current={state:{...M.defaults,rent:900}};const c=compareStudies(reference,current);assert.equal(c.before.valid,false);assert.ok(c.before.reasons.includes('height'));assert.deepEqual(c.scenarioChanges,[{key:'rent',before:650,after:900}]);assert.equal(c.sameArea,true);
});
