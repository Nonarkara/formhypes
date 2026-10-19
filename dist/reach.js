/* The reach: how far a tower of a given height lays its shadow across a real
   street grid.

   This is the geometry that makes the plan view worth having. The question a
   plan is asked to answer is not "how tall is it" — the elevation already says
   that — it is "where does that height actually land", and the only honest way
   to draw that is as a distance field measured off the surveyed ground.

   Kept here, pure and separate from the canvas, for the ordinary reason: the
   version inside the drawing function could only be guarded by reading the
   drawing function, and a guard that reads the code it is guarding proves
   nothing about the shape it claims to describe. Every function below is
   total, has no canvas and no globals, and can be checked against a hand
   calculation. */

/* Convex hull, monotone chain, counter-clockwise.

   The shadow of a convex footprint cast along a fixed direction is exactly the
   hull of the footprint and its translate — a "prism" swept along a segment.
   Every footprint this model produces is convex (model.js exports isConvex for
   exactly that reason), so this is the shadow rather than a shape near it.

   Returns a closed list of vertices without repeating the first point, so a
   caller can stroke it without the same corner being laid down twice. */
export function convexHull(pts){
 if(pts.length<3)return pts.slice();
 const q=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lo=[],up=[];
 for(const v of q){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],v)<=0)lo.pop();lo.push(v)}
 for(let i=q.length-1;i>=0;i--){
  const v=q[i];while(up.length>=2&&cross(up[up.length-2],up[up.length-1],v)<=0)up.pop();up.push(v);
 }
 lo.pop();up.pop();
 return lo.concat(up);
}

/* One contour: the footprint swept by the shadow of a point `dist` metres up.
   dx,dy are the light direction already normalised — the caller owns the unit
   vector, so this function cannot quietly disagree with the wall shading about
   where the sun is. */
export function sweptHull(ring,dist,dx,dy){
 if(!ring||ring.length<3||!(dist>0))return ring?ring.slice():[];
 return convexHull(ring.concat(ring.map(([x,y])=>[x+dist*dx,y+dist*dy])));
}

/* The contours to draw for a tower of `ext` metres, nearest first.

   The LAST offset is the true height, not the 50 m multiple it came from. A
   214.4 m tower drew its outer contour at 214.4 m and the label said 250 m,
   which is a drawing disagreeing with its own dimension — the one thing a
   dimension may never do. Callers print `off`, never `step*n`.
   Every offset is a plain number derived from `ext`, never a literal list. */
export function reachSteps(ext,step=50){
 /* The counter is n, not a distance: incrementing it by `step` made
    n*step jump 50 -> 2550 and the loop stopped after one contour, so a
    214 m tower drew two bands instead of five. A guard caught this the day it
    was written, which is the argument for putting the arithmetic somewhere it
    can be read with numbers rather than only as a drawing. */
 const out=[];if(!(ext>0))return out;
 for(let n=1;n*step<ext;n++)out.push(n*step);
 out.push(ext);
 return out;
}

/* Which contours get a printed figure.

   Lettering every band put four labels in a 30 px column near the apex, which
   is an unreadable pile rather than a scale. So a figure every `every`
   metres, and the outermost contour always carries one — it is the number the
   reader came for. A contour within `minGap` of the outer one is dropped, so
   two figures can never land on top of each other: a 214.4 m tower drew its
   200 m and 214 m contours 14 m apart and printed both on the same pixels.

   Returns true for the outer contour. */
export function reachLabelled(off,ext,{every=100,minGap=50}={}){
 if(off>=ext)return true;
 return off%every===0&&(ext-off)>=minGap;
}
/* How far a massing's contact shadow may be offset from its footprint.

   A contact shadow belongs to the building standing on the ground, so it may
   never be longer than that building is wide. Scaling it by height instead —
   the obvious first guess, and what this used to do — means Shenzhen's 599 m
   tower threw a 96 m slab of near-black across the street grid, which is a
   large part of why the floor read as a hole even after the plate had been
   given a visible value: the map was being painted over in black by the
   buildings standing on it.

   Kept pure and beside the sweep so it can be given a number rather than a
   regex. */
export function contactOffset(h,w,d){
 return Math.min(h*.16,Math.max(w,d)*.5);
}
