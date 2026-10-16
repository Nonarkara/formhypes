/* The select arrow is drawn at calc(100% - 5px) and is 8px wide, so it occupies
   the rightmost 13px of the control. Six pixels of right padding let the longest
   option — "Pressure-equalised drained cavity" — run straight underneath it.
   It only shows up on the longest labels, which is why it survived: every
   shorter select looked fine. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('the select arrow never sits on top of the option text',()=>{
 const css=dist('style.css');
 // Anchored, or it matches `button,input,select{font:inherit}` three lines up
 // and reports that a rule with no padding failed to declare padding.
 const rule=/^select\{([^}]*)\}/m.exec(css);
 assert.ok(rule,'the base select rule is missing');
 const body=rule[1];
 const pad=/padding:([\d.]+)px ([\d.]+)px ([\d.]+)px ([\d.]+)px/.exec(body);
 assert.ok(pad,'the base select rule sets no shorthand padding');
 const right=Number(pad[2]);
 // background-position right offset + background-size width, less a hair.
 const pos=/background-position:calc\(100% - ([\d.]+)px\)/.exec(body);
 const size=/background-size:([\d.]+)px/.exec(body);
 assert.ok(pos&&size,'the arrow is positioned or sized somewhere unexpected');
 const arrowNeeds=Number(pos[1])+Number(size[1]);
 assert.ok(right>=arrowNeeds,
  `a ${right}px right padding cannot clear an arrow needing ${arrowNeeds}px — long labels run under it`);
 // No other select rule may set a right padding that puts the text back under
 // the arrow. Rules that set none of their own inherit the base 18px, which is
 // fine; the only thing worth forbidding is one that lowers it on purpose.
 for(const m of css.matchAll(/(?:^|[,}\s])select\{([^}]*)\}/gm)){
  const pr=/padding-right:\s*([\d.]+)px/.exec(m[1]);
  if(pr)assert.ok(Number(pr[1])>=arrowNeeds,
   `a select rule sets ${pr[1]}px right padding against an arrow needing ${arrowNeeds}px`);
 }
});