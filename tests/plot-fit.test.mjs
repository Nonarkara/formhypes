import test from 'node:test';
import assert from 'node:assert/strict';
import {rectangleRing,plateThatFits,plateOnPlot,ringContainsRing,validPlotRing,ringArea} from '../dist/site.js';

test('a fitting plate is contained geometrically, not certified by a raster sample',()=>{
 const lot=rectangleRing(0,0,10,10),fit=plateThatFits(rectangleRing(0,0,1,1),{ring:lot});
 assert.ok(fit.whole);assert.ok(fit.placed.holds);assert.ok(fit.k<=10+1e-7);
 assert.ok(Math.abs(ringArea(fit.plate))<=100+1e-6);assert.ok(ringContainsRing(lot,fit.placed.pts));
});
test('sizing is bounded by the plot and preserves a plate too small for the instrument range',()=>{
 const fit=plateThatFits(rectangleRing(0,0,48,48),{ring:rectangleRing(0,0,40,24)});
 assert.ok(fit.whole);assert.ok(Math.abs(fit.k*48-24)<1e-6);assert.ok(ringContainsRing(rectangleRing(0,0,40,24),fit.placed.pts));
});
test('containment checks edges across a concave notch, not just vertices',()=>{
 const lot=[[0,0],[10,0],[10,10],[6,10],[6,4],[4,4],[4,10],[0,10]];
 assert.equal(validPlotRing(lot),true);
 assert.equal(ringContainsRing(lot,[[1,8],[9,8],[9,9],[1,9]]),false);
 assert.equal(ringContainsRing(lot,[[0,0],[10,0],[10,3],[0,3]]),true);
 const fit=plateThatFits(rectangleRing(0,0,1,1),{ring:lot});assert.ok(fit.whole);assert.ok(ringContainsRing(lot,fit.placed.pts));
 const reseated=plateOnPlot(fit.plate,{ring:lot});assert.ok(reseated.holds);assert.ok(ringContainsRing(lot,reseated.pts));
});
test('crossed, degenerate and nonfinite outlines cannot receive a sizing verdict',()=>{
 for(const ring of [[[0,0],[10,10],[0,10],[10,0]],[[0,0],[1,0],[2,0]],[[0,0],[10,0],[10,10],[0,0]],[[0,0],[NaN,1],[1,0]]]){
  assert.equal(validPlotRing(ring),false);assert.equal(plateThatFits(rectangleRing(0,0,1,1),{ring}),null);
 }
});
