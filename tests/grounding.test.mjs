/* Why the tower floated.

   Two defects, and the second was the one that mattered.

   The obvious one: drawCity gives every massing a contact shadow and a
   ground-contact stroke, and the tower — the only building the sheet is about
   — had neither. It ended in mid-air with nothing under it.

   The one that actually caused the complaint: in Shenzhen a harvested massing
   599 m tall spans x -32..44, y -11..65. It contains the origin, which is
   precisely where the tower is drawn. Drawing both means the neighbour is
   painted in front of the subject, and the tower rises from inside another
   building. No shadow and no contact line fixes a contradiction about where the
   buildings are.

   These guards cover the geometry as numbers, and the promises the sheet makes
   about what it drew. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ringsIntersect,splitByPlot,skyline,cityData,visibleMassings} from '../dist/cityscape.js';
import {profile,defaults,stack} from '../dist/model.js';
import {contactOffset} from '../dist/reach.js';

const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^\s*\/\/.*$/gm,' ');
const drawTower=()=>{const a=strip(dist('app.js'));const i=a.indexOf('function drawTower(){');return a.slice(i,a.indexOf('\nlet drag=null;',i))};

const SQ=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];

test('two rings intersect when they overlap, contain, or merely touch',()=>{
 assert.ok(ringsIntersect(SQ(-10,-10,10,10),SQ(0,0,20,20)),'overlapping squares');
 assert.ok(ringsIntersect(SQ(-30,-30,30,30),SQ(-5,-5,5,5)),'a small plot inside a large building');
 assert.ok(ringsIntersect(SQ(-5,-5,5,5),SQ(-30,-30,30,30)),'a large plot over a small building');
 assert.ok(ringsIntersect(SQ(-10,-10,10,10),SQ(2,2,4,4)),'a shed wholly inside the plot');
 // Sharing a boundary is NOT standing on the plot. A massing that merely abuts
 // the site line is next door, and deleting it would remove a real neighbour
 // from the drawing and from the rank for no reason a reader could defend.
 // (The first version of this guard asserted the opposite and would have made
 // the sheet quietly cannibalise its own context.)
 assert.ok(!ringsIntersect(SQ(-10,-10,10,10),SQ(10,-10,20,10)),'abutting along an edge is next door, not on the plot');
 assert.ok(!ringsIntersect(SQ(-10,-10,10,10),SQ(-10,-20,10,-10)),'abutting along another edge likewise');
 // The two that must NOT be removed.
 assert.ok(!ringsIntersect(SQ(20,20,30,30),SQ(-10,-10,10,10)),'a building clear of the plot is context');
 assert.ok(!ringsIntersect(SQ(11,11,20,20),SQ(-10,-10,10,10)),'a building one metre past the plot edge is context');
 // A hair over the line does count: 0.01 m of overlap is overlap.
 assert.ok(ringsIntersect(SQ(9.99,9.99,20,20),SQ(-10,-10,10,10)),'a tenth of a metre over the line is still on the plot');
 // Concave plot: a building inside the notch is not on the plot.
 const L=[[0,0],[30,0],[30,10],[10,10],[10,30],[0,30]];
 assert.ok(!ringsIntersect(L,SQ(15,15,25,25)),'a building in the notch of an L-shaped plot is not on it');
 assert.ok(ringsIntersect(L,SQ(2,2,5,5)),'a building in the solid arm is');
});

test('degenerate input is not an intersection',()=>{
 assert.ok(!ringsIntersect(null,SQ(0,0,1,1)));
 assert.ok(!ringsIntersect(SQ(0,0,1,1),null));
 assert.ok(!ringsIntersect([],SQ(0,0,1,1)));
 assert.ok(!ringsIntersect([[0,0],[1,1]],SQ(0,0,1,1)),'two points are not a polygon');
});

test('splitByPlot keeps every massing exactly once',()=>{
 const ring=SQ(-10,-10,10,10);
 const ms=[{ring:SQ(-30,-30,-5,-5),h:10},{ring:SQ(2,2,4,4),h:20},{ring:SQ(50,50,60,60),h:30}];
 const {onPlot,context}=splitByPlot(ms,ring);
 assert.deepEqual(onPlot.map(m=>m.h),[10,20],'the two buildings standing on the plot');
 assert.deepEqual(context.map(m=>m.h),[30],'the one that does not');
 assert.equal(onPlot.length+context.length,ms.length,'nothing is dropped and nothing is doubled');
});

test('the tower stands on ground that is not already occupied by another tower',()=>{
 // The actual bug, as data. At least one city must have had a massing
 // containing the origin, or this whole guard is guarding a condition that
 // never occurs and proves nothing.
 const plot=profile({...defaults});
 let occupied=0;
 for(const key of ['bangkok','shenzhen','tokyo','kl','jakarta','hcmc']){
  const c=cityData(key);if(!c)continue;
  const n=c.buildings.filter(b=>ringsIntersect(b.ring,plot)).length;
  if(n)occupied++;
 }
 assert.ok(occupied>0,'no city has a building on the plot — the defect cannot reproduce');
 // And in the cities that do, that building must be taller than the model,
 // which is exactly why the drawing looked wrong.
 const c=cityData('shenzhen');
 const onPlot=c.buildings.filter(b=>ringsIntersect(b.ring,plot));
 const tall=Math.max(...c.buildings.map(b=>b.h));
 assert.ok(onPlot.length>0&&onPlot.some(b=>b.h>stack({...defaults}).at(-1).h),
  'Shenzhen no longer reproduces: the massing that stood on the plot is gone from the data');
 assert.equal(tall,599,'the harvested Shenzhen tallest is still 599 m — only the drawing changed');
});

test('the rank is taken over the city the tower will actually stand in',()=>{
 // Ranking against a skyline that includes a 599 m building the drawing no
 // longer shows would put "tallest 599 m" on a sheet with no 599 m building in
 // it. The denominator and the headline must both move together.
 const plot=profile({...defaults});
 const before=skyline('shenzhen',200);
 const after=skyline('shenzhen',200,plot);
 assert.ok(before.count>after.count,`the denominator must shrink: ${before.count} -> ${after.count}`);
 assert.equal(before.replaced,0,'no plot means nothing is replaced');
 assert.equal(after.replaced,before.count-after.count,'replaced is the difference it accounts for');
 assert.ok(after.tallest.h<before.tallest.h,
  `the tallest must be recomputed too: ${before.tallest.h} -> ${after.tallest.h}`);
 assert.equal(after.localMax,after.tallest.h,'localMax and tallest must not disagree');
 // The reported rank must not exceed the number it is ranked among.
 assert.ok(after.rank>=1&&after.rank<=after.count,`rank ${after.rank} of ${after.count} is not a rank`);
 // And a city with nothing on the plot is untouched.
 const bk=skyline('bangkok',200,profile({...defaults}));
 assert.equal(bk.replaced,0,'Bangkok has nothing on the plot');
 assert.equal(bk.count,skyline('bangkok',200).count,'so its count is unchanged');
});

test('the sheet states how many buildings it removed',()=>{
 const app=strip(dist('app.js'));
 const i=dist('i18n.js');
 const block=l=>{const s=i.indexOf('const '+l+'={');const r=i.slice(s+8);const n=/^const (en|th|zh)=\{/m.exec(r.slice(1));return n?r.slice(1,n.index+1):r};
 assert.match(app,/if\(sk\.replaced>0\)/,'a removed massing can vanish without a word');
 assert.match(app,/tt\('v\.replaced',\{n:sk\.replaced\}\)/,'the count is not printed');
 for(const l of ['en','th','zh']){
  const m=new RegExp("[\"']v\\.replaced[\"']\\s*:\\s*[\"']([^\"']*)[\"']").exec(block(l));
  assert.ok(m,`v.replaced is missing from ${l}`);
  assert.ok(m[1].includes('{n}'),`v.replaced in ${l} never prints the count: ${m[1]}`);
  assert.ok(/removed|ลบ|移除/.test(m[1]),`v.replaced in ${l} does not say what happened`);
 }
 // Script discipline. "It mentions removal" is satisfied by Thai pasted into
 // the English slot, which is how an English reader gets a sentence they cannot
 // read on the one line that discloses a deletion from the drawing.
 const val=(l)=>new RegExp("[\"']v\\.replaced[\"']\\s*:\\s*[\"']([^\"']*)[\"']").exec(block(l))[1];
 assert.ok(!/[฀-๿]/.test(val('en')),'the English disclosure contains Thai');
 assert.ok(!/[一-鿿]/.test(val('en')),'the English disclosure contains CJK');
 assert.ok(!/[一-鿿]/.test(val('th')),'the Thai disclosure contains CJK');
 assert.ok(!/[A-Za-z]/.test(val('zh')),'the Chinese disclosure fell back to Latin');
 assert.equal(new Set(['en','th','zh'].map(val)).size,3,'the three disclosures must be three different sentences');
});

test('the tower is drawn with a ground contact and a contact shadow',()=>{
 // The first defect, which was real on its own even before the plot clash.
 const b=drawTower();
 assert.ok(/path\(baseRing\.map\(\(\[bx,by\]\)=>\[bx,by,0\]\),null,'#c6d0d4',1\)/.test(b),
  'the tower has no ground-contact stroke, so its walls run into the plate with no edge');
 assert.ok(/contactOffset\(total,/.test(b),
  "the tower's contact shadow is not bounded by its own footprint");
 // The contact must be laid after the body and before the near massings, or
 // the near buildings cover it or the tower covers it.
 const c=b.indexOf("path(baseRing.map(([bx,by])=>[bx,by,0]),null,'#c6d0d4',1)");
 const near=b.indexOf('drawCity(cityNear)');
 const body=b.indexOf('const faces=[]');
 assert.ok(body<c&&c<near,
  'the ground contact is drawn in the wrong order relative to the body and the near massings');
 // And the shadow is measured on the built height, not a storey count.
 assert.ok(!/contactOffset\(state\.height\s*\*/.test(b),
  'the shadow uses floors x floor-to-floor instead of the height actually built');
});

test('the same plot split drives the drawing and the ranking',()=>{
 // One predicate, one outcome. If the drawing and the rank used different
 // tests, the sheet could remove a building and still count it.
 const app=strip(dist('app.js'));
 assert.match(app,/splitByPlot\(massings,profile\(state,0\)\)/);
 assert.match(app,/skyline\(state\.city,metrics\.heightTotal,profile\(state,0\)\)/);
});

test('a tower shadow is never longer than the tower is wide',()=>{
 const plot=profile({...defaults});
 const xs=plot.map(p=>p[0]),ys=plot.map(p=>p[1]);
 const w=Math.max(...xs)-Math.min(...xs),d=Math.max(...ys)-Math.min(...ys);
 const h=stack({...defaults}).at(-1).z+stack({...defaults}).at(-1).h;
 assert.ok(contactOffset(h,w,d)<=Math.max(w,d)/2+1e-9);
 assert.ok(contactOffset(h,w,d)>0,'and it still reads as a shadow rather than nothing');
});