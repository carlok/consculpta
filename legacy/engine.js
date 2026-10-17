/* ===== Formula engine: expression trees, GLSL codegen, JS evaluation, evolution ===== */
const ENGINE = (() => {
'use strict';
const TAU = Math.PI*2;
const OPS = {
  x:{kind:'leaf'}, y:{kind:'leaf'}, z:{kind:'leaf'}, r:{kind:'leaf'}, num:{kind:'leaf'},
  noise:{kind:'leaf', p:[['f',0.3,4],['s',0,999,1]]},
  fbm:{kind:'leaf', p:[['f',0.3,3],['o',2,4,1],['s',0,999,1]]},
  sin:{kind:'un', p:[['f',0.5,8],['ph',-3.1416,3.1416]]},
  abs:{kind:'un'}, neg:{kind:'un'}, soft:{kind:'un'},
  gauss:{kind:'un', p:[['k',0.5,12]]},
  scale:{kind:'un', p:[['k',-3,3]]},
  add:{kind:'bin'}, sub:{kind:'bin'}, mul:{kind:'bin'}, min:{kind:'bin'}, max:{kind:'bin'},
  smin:{kind:'bin', p:[['k',0.02,0.6]]},
  twist:{kind:'sp', p:[['k',-3,3]]},
  rotx:{kind:'sp', p:[['a',-3.1416,3.1416]]}, roty:{kind:'sp', p:[['a',-3.1416,3.1416]]}, rotz:{kind:'sp', p:[['a',-3.1416,3.1416]]},
  mirx:{kind:'sp'}, miry:{kind:'sp'}, mirz:{kind:'sp'},
  warp:{kind:'sp', p:[['f',0.2,2.5],['m',0.05,1],['s',0,999,1]]},
  zoom:{kind:'sp', p:[['s',0.3,3]]},
};
const NCHILD = {leaf:0, un:1, sp:1, bin:2};
const BY_KIND = {leaf:[], un:[], bin:[], sp:[]};
for (const k in OPS) if (k !== 'num') BY_KIND[OPS[k].kind].push(k);

const LANG = `x, y, z           coordinates; the block spans about -1..1
r                 distance from the centre
0.4               a constant
noise(f, s)       3D simplex noise, frequency f, integer seed s
fbm(f, o, s)      fractal noise with o octaves (2-4)
sin(f, ph, a)     sin(f*a + ph)
abs(a)  neg(a)  soft(a) = a/(1+|a|)
gauss(k, a)       exp(-k*a*a)
scale(k, a)       k*a
add sub mul min max (a, b)
smin(k, a, b)     smooth minimum, blend radius k
twist(k, a)       a, in space twisted about the y axis by k rad per unit
rotx roty rotz (angle, a)   a, in rotated space
mirx miry mirz (a)          a, mirrored across an axis plane
warp(f, m, s, a)  a, in space displaced by noise (frequency f, amount m)
zoom(s, a)        a evaluated at p*s`;

/* ---------- RNG ---------- */
let rnd = Math.random;
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v); };
const pick = a => a[Math.floor(rnd()*a.length)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const round3 = x => Math.round(x*1000)/1000;

/* ---------- Simplex noise: exact port of the Ashima Arts / Gustavson GLSL used in the shader ---------- */
const mod289 = x => x - Math.floor(x*(1/289))*289;
const permute = x => mod289(((x*34) + 10)*x);
function snoise(vx, vy, vz){
  const Cx = 1/6, Cy = 1/3;
  const s = (vx + vy + vz)*Cy;
  let ix = Math.floor(vx + s), iy = Math.floor(vy + s), iz = Math.floor(vz + s);
  const t = (ix + iy + iz)*Cx;
  const x0x = vx - ix + t, x0y = vy - iy + t, x0z = vz - iz + t;
  const gx = x0x >= x0y ? 1 : 0, gy = x0y >= x0z ? 1 : 0, gz = x0z >= x0x ? 1 : 0;
  const lx = 1 - gx, ly = 1 - gy, lz = 1 - gz;
  const i1x = Math.min(gx, lz), i1y = Math.min(gy, lx), i1z = Math.min(gz, ly);
  const i2x = Math.max(gx, lz), i2y = Math.max(gy, lx), i2z = Math.max(gz, ly);
  const X = [x0x, x0x - i1x + Cx, x0x - i2x + Cy, x0x - 0.5];
  const Y = [x0y, x0y - i1y + Cx, x0y - i2y + Cy, x0y - 0.5];
  const Z = [x0z, x0z - i1z + Cx, x0z - i2z + Cy, x0z - 0.5];
  ix = mod289(ix); iy = mod289(iy); iz = mod289(iz);
  const oz = [0, i1z, i2z, 1], oy = [0, i1y, i2y, 1], ox = [0, i1x, i2x, 1];
  const n_ = Math.fround(0.142857142857), nsx = n_*2, nsy = n_*0.5 - 1, nsz = n_;  // float32 like the GPU, so 7*n_ floors to 1
  let sum = 0;
  for (let k = 0; k < 4; k++){
    const p = permute(permute(permute(iz + oz[k]) + iy + oy[k]) + ix + ox[k]);
    const j = p - 49*Math.floor(p*nsz*nsz);
    const x_ = Math.floor(j*nsz), y_ = Math.floor(j - 7*x_);
    const gxk = x_*nsx + nsy, gyk = y_*nsx + nsy;
    const h = 1 - Math.abs(gxk) - Math.abs(gyk);
    const sh = h <= 0 ? -1 : 0;
    let px = gxk + (Math.floor(gxk)*2 + 1)*sh, py = gyk + (Math.floor(gyk)*2 + 1)*sh, pz = h;
    const nrm = 1.79284291400159 - 0.85373472095314*(px*px + py*py + pz*pz);
    px *= nrm; py *= nrm; pz *= nrm;
    let m = Math.max(0.5 - (X[k]*X[k] + Y[k]*Y[k] + Z[k]*Z[k]), 0);
    m = m*m;
    sum += m*m*(px*X[k] + py*Y[k] + pz*Z[k]);
  }
  return 105*sum;
}
function fbmJS(x, y, z, o){
  let a = 1, s = 0, n = 0;
  for (let i = 0; i < o; i++){ s += a*snoise(x, y, z); n += a; x = x*2 + 17.13; y = y*2 + 5.71; z = z*2 + 11.37; a *= 0.5; }
  return s/n;
}
const seedVec = s => [round3((s*0.6180339887 % 1)*40 + 3), round3((s*0.4142135624 % 1)*40 + 5), round3((s*0.7320508076 % 1)*40 + 7)];

/* ---------- Tree utilities ---------- */
const clone = n => JSON.parse(JSON.stringify(n));
function nodes(root){
  const out = [];
  (function walk(n, parent, idx, depth){ out.push({n, parent, idx, depth}); (n.c || []).forEach((c, i) => walk(c, n, i, depth + 1)); })(root, null, 0, 0);
  return out;
}
function depth(n){ return 1 + Math.max(0, ...(n.c || []).map(depth)); }
function cost(n){
  let c = 0;
  if (n.op === 'noise') c = 1; else if (n.op === 'fbm') c = n.p[1]; else if (n.op === 'warp') c = 3;
  return c + (n.c || []).reduce((a, k) => a + cost(k), 0);
}
function size(n){ return 1 + (n.c || []).reduce((a, k) => a + size(k), 0); }
function randParams(op){
  return (OPS[op].p || []).map(([, lo, hi, int]) => int ? Math.floor(lo + rnd()*(hi - lo + 1)) : round3(lo + rnd()*(hi - lo)));
}
function makeLeaf(){
  const u = rnd();
  if (u < 0.30) return {op:'noise', p:randParams('noise')};
  if (u < 0.40) return {op:'fbm', p:[round3(0.4 + rnd()*1.6), 2 + Math.floor(rnd()*2), Math.floor(rnd()*1000)]};
  if (u < 0.70) return {op:pick(['x','y','z'])};
  if (u < 0.85) return {op:'r'};
  return {op:'num', v:round3(-0.8 + rnd()*1.6)};
}
function grow(d){
  if (d <= 0 || rnd() < 0.28) return makeLeaf();
  const u = rnd();
  const kind = u < 0.32 ? 'un' : u < 0.72 ? 'bin' : 'sp';
  const op = pick(BY_KIND[kind]);
  const n = {op, p:randParams(op), c:[]};
  for (let i = 0; i < NCHILD[kind]; i++) n.c.push(grow(d - 1));
  if (!n.p.length) delete n.p;
  return n;
}

/* ---------- Text form ---------- */
function fmtNum(x){ const v = round3(x); return Object.is(v, -0) ? '0' : String(v); }
function print(n){
  if (n.op === 'num') return fmtNum(n.v);
  const parts = (n.p || []).map(fmtNum).concat((n.c || []).map(print));
  return parts.length ? `${n.op}(${parts.join(', ')})` : n.op;
}
function pretty(n, ind = ''){
  const flat = print(n);
  if (flat.length + ind.length <= 64 || !(n.c && n.c.length)) return ind + flat;
  const params = (n.p || []).map(fmtNum);
  const inner = ind + '  ';
  const kids = n.c.map(c => pretty(c, inner));
  return `${ind}${n.op}(${params.length ? params.join(', ') + ',' : ''}\n${kids.join(',\n')})`;
}
function parse(src){
  const toks = [];
  const re = /\s*(?:([A-Za-z_][A-Za-z0-9_]*)|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)|([(),]))/y;
  const s = String(src || '').trim();
  let m, last = 0;
  re.lastIndex = 0;
  while (re.lastIndex < s.length && (m = re.exec(s))){ toks.push(m[1] ? {id:m[1]} : m[2] ? {num:parseFloat(m[2])} : {sym:m[3]}); last = re.lastIndex; }
  if (s.slice(last).trim()) throw new Error(`Unexpected text near "${s.slice(last, last + 12)}"`);
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  function expr(){
    const t = next();
    if (!t) throw new Error('The formula ends too early.');
    if ('num' in t) return {op:'num', v:clamp(round3(t.num), -1.5, 1.5), raw:t.num};
    if (!t.id) throw new Error(`Unexpected "${t.sym}".`);
    const op = t.id.toLowerCase();
    const d = OPS[op];
    if (!d || op === 'num') throw new Error(`Unknown function "${t.id}".`);
    const np = (d.p || []).length, nc = NCHILD[d.kind];
    if (np + nc === 0){
      if (peek() && peek().sym === '(') throw new Error(`${op} takes no arguments.`);
      return {op};
    }
    if (!(peek() && peek().sym === '(')) throw new Error(`${op} needs ${np + nc} arguments.`);
    next();
    const args = [];
    if (!(peek() && peek().sym === ')')){
      for (;;){ args.push(expr()); const sep = next(); if (!sep) throw new Error(`Missing ")" after ${op}(…`); if (sep.sym === ')') break; if (sep.sym !== ',') throw new Error(`Expected "," or ")" in ${op}(…).`); }
    } else next();
    if (args.length !== np + nc){
      const names = (d.p || []).map(q => q[0]).concat(nc === 2 ? ['a','b'] : nc === 1 ? ['a'] : []);
      throw new Error(`${op} takes ${np + nc} arguments: ${op}(${names.join(', ')}).`);
    }
    const n = {op};
    if (np){
      n.p = args.slice(0, np).map((a, j) => {
        if (a.op !== 'num') throw new Error(`Argument ${j + 1} of ${op} must be a number.`);
        const [, lo, hi, int] = d.p[j];
        return int ? clamp(Math.round(a.raw), lo, hi) : round3(clamp(a.raw, lo, hi));
      });
    }
    if (nc) n.c = args.slice(np).map(strip);
    return n;
  }
  const strip = n => { if (n.op === 'num') delete n.raw; return n; };
  const tree = strip(expr());
  if (i < toks.length) throw new Error('Extra text after the formula.');
  return tree;
}

/* ---------- GLSL code generation ---------- */
const F = x => { let s = (Math.round(x*10000)/10000).toString(); if (!/[.e]/.test(s)) s += '.0'; return s; };
const V3 = a => `vec3(${a.map(F).join(', ')})`;
function glsl(tree, name){
  const lines = []; let k = 0;
  function g(n, pv){
    const a = () => g(n.c[0], pv), b = () => g(n.c[1], pv);
    const P = n.p || [];
    const emit = e => { const v = 'v' + (k++); lines.push(`float ${v} = ${e};`); return v; };
    const space = e => { const q = 'q' + (k++); lines.push(`vec3 ${q} = ${e};`); return g(n.c[0], q); };
    switch (n.op){
      case 'x': return pv + '.x'; case 'y': return pv + '.y'; case 'z': return pv + '.z';
      case 'r': return `length(${pv})`;
      case 'num': return F(n.v);
      case 'noise': return emit(`snoise(${pv}*${F(P[0])} + ${V3(seedVec(P[1]))} + gMT3)`);
      case 'fbm': return emit(`fbmN(${pv}*${F(P[0])} + ${V3(seedVec(P[2]))} + gMT3, ${P[1]})`);
      case 'sin': { const x = a(); return emit(`sin(${F(P[0])}*${x} + ${F(P[1])})`); }
      case 'abs': { const x = a(); return emit(`abs(${x})`); }
      case 'neg': { const x = a(); return emit(`-(${x})`); }
      case 'soft': { const x = a(); return emit(`${x}/(1.0 + abs(${x}))`); }
      case 'gauss': { const x = a(); return emit(`exp(-${F(P[0])}*${x}*${x})`); }
      case 'scale': { const x = a(); return emit(`${F(P[0])}*${x}`); }
      case 'add': { const x = a(), y = b(); return emit(`${x} + ${y}`); }
      case 'sub': { const x = a(), y = b(); return emit(`${x} - ${y}`); }
      case 'mul': { const x = a(), y = b(); return emit(`${x}*${y}`); }
      case 'min': { const x = a(), y = b(); return emit(`min(${x}, ${y})`); }
      case 'max': { const x = a(), y = b(); return emit(`max(${x}, ${y})`); }
      case 'smin': { const x = a(), y = b(); return emit(`sminF(${x}, ${y}, ${F(P[0])})`); }
      case 'twist': return space(`twistP(${pv}, ${F(P[0])})`);
      case 'rotx': return space(`rotX(${pv}, ${F(P[0])})`);
      case 'roty': return space(`rotY(${pv}, ${F(P[0])})`);
      case 'rotz': return space(`rotZ(${pv}, ${F(P[0])})`);
      case 'mirx': return space(`vec3(abs(${pv}.x), ${pv}.yz)`);
      case 'miry': return space(`vec3(${pv}.x, abs(${pv}.y), ${pv}.z)`);
      case 'mirz': return space(`vec3(${pv}.xy, abs(${pv}.z))`);
      case 'warp': return space(`warpP(${pv}, ${F(P[0])}, ${F(P[1])}, ${V3(seedVec(P[2]))} + gMT3)`);
      case 'zoom': return space(`${pv}*${F(P[0])}`);
    }
    throw new Error('codegen: unknown op ' + n.op);
  }
  const out = g(tree, 'p');
  return `float ${name}(vec3 p){\n  ${lines.join('\n  ')}${lines.length ? '\n  ' : ''}return ${out};\n}`;
}

/* ---------- JS evaluation (closures) ---------- */
function js(n){
  const P = n.p || [];
  const A = () => js(n.c[0]), B = () => js(n.c[1]);
  switch (n.op){
    case 'x': return (x) => x;
    case 'y': return (x, y) => y;
    case 'z': return (x, y, z) => z;
    case 'r': return (x, y, z) => Math.sqrt(x*x + y*y + z*z);
    case 'num': { const v = n.v; return () => v; }
    case 'noise': { const f = P[0], [sx, sy, sz] = seedVec(P[1]); return (x, y, z) => snoise(x*f + sx, y*f + sy, z*f + sz); }
    case 'fbm': { const f = P[0], o = P[1], [sx, sy, sz] = seedVec(P[2]); return (x, y, z) => fbmJS(x*f + sx, y*f + sy, z*f + sz, o); }
    case 'sin': { const a = A(), f = P[0], ph = P[1]; return (x, y, z) => Math.sin(f*a(x, y, z) + ph); }
    case 'abs': { const a = A(); return (x, y, z) => Math.abs(a(x, y, z)); }
    case 'neg': { const a = A(); return (x, y, z) => -a(x, y, z); }
    case 'soft': { const a = A(); return (x, y, z) => { const v = a(x, y, z); return v/(1 + Math.abs(v)); }; }
    case 'gauss': { const a = A(), k = P[0]; return (x, y, z) => { const v = a(x, y, z); return Math.exp(-k*v*v); }; }
    case 'scale': { const a = A(), k = P[0]; return (x, y, z) => k*a(x, y, z); }
    case 'add': { const a = A(), b = B(); return (x, y, z) => a(x, y, z) + b(x, y, z); }
    case 'sub': { const a = A(), b = B(); return (x, y, z) => a(x, y, z) - b(x, y, z); }
    case 'mul': { const a = A(), b = B(); return (x, y, z) => a(x, y, z)*b(x, y, z); }
    case 'min': { const a = A(), b = B(); return (x, y, z) => Math.min(a(x, y, z), b(x, y, z)); }
    case 'max': { const a = A(), b = B(); return (x, y, z) => Math.max(a(x, y, z), b(x, y, z)); }
    case 'smin': { const a = A(), b = B(), k = P[0]; return (x, y, z) => { const u = a(x, y, z), v = b(x, y, z); const h = clamp(0.5 + 0.5*(v - u)/k, 0, 1); return v + (u - v)*h - k*h*(1 - h); }; }
    case 'twist': { const a = A(), k = P[0]; return (x, y, z) => { const c = Math.cos(k*y), s = Math.sin(k*y); return a(c*x - s*z, y, s*x + c*z); }; }
    case 'rotx': { const a = A(), c = Math.cos(P[0]), s = Math.sin(P[0]); return (x, y, z) => a(x, c*y - s*z, s*y + c*z); }
    case 'roty': { const a = A(), c = Math.cos(P[0]), s = Math.sin(P[0]); return (x, y, z) => a(c*x + s*z, y, -s*x + c*z); }
    case 'rotz': { const a = A(), c = Math.cos(P[0]), s = Math.sin(P[0]); return (x, y, z) => a(c*x - s*y, s*x + c*y, z); }
    case 'mirx': { const a = A(); return (x, y, z) => a(Math.abs(x), y, z); }
    case 'miry': { const a = A(); return (x, y, z) => a(x, Math.abs(y), z); }
    case 'mirz': { const a = A(); return (x, y, z) => a(x, y, Math.abs(z)); }
    case 'warp': { const a = A(), f = P[0], m = P[1], [sx, sy, sz] = seedVec(P[2]);
      return (x, y, z) => { const qx = x*f + sx, qy = y*f + sy, qz = z*f + sz;
        return a(x + m*snoise(qx, qy, qz), y + m*snoise(qx + 31.4, qy, qz), z + m*snoise(qx, qy + 47.2, qz)); }; }
    case 'zoom': { const a = A(), s = P[0]; return (x, y, z) => a(x*s, y*s, z*s); }
  }
  throw new Error('js: unknown op ' + n.op);
}

/* ---------- Scalar genes ---------- */
const lin = (a, b) => g => a + g*(b - a);
const SCALARS = [
  {n:'Iso level', f:lin(-0.25, 0.25)},
  {n:'Thickness', f:lin(0.02, 0.16), dp:3},
  {n:'Surface', f:g => Math.floor(g*2.999), names:['solid','shell','contours']},
  {n:'Contours', f:g => 2 + Math.floor(g*5.999), int:1},
  {n:'Block', f:g => Math.floor(g*2.999), names:['sphere','cube','drum']},
  {n:'Block size', f:lin(0.85, 1.1)},
  {n:'Edge fade', f:lin(0, 1)},
  {n:'a red', f:lin(0.3, 0.7)}, {n:'a green', f:lin(0.3, 0.7)}, {n:'a blue', f:lin(0.3, 0.7)},
  {n:'b red', f:lin(0.15, 0.55)}, {n:'b green', f:lin(0.15, 0.55)}, {n:'b blue', f:lin(0.15, 0.55)},
  {n:'c red', f:lin(0.3, 1.7)}, {n:'c green', f:lin(0.3, 1.7)}, {n:'c blue', f:lin(0.3, 1.7)},
  {n:'d red', f:lin(0, 1)}, {n:'d green', f:lin(0, 1)}, {n:'d blue', f:lin(0, 1)},
  {n:'Hue shift', f:lin(0, 1)},
  {n:'Formula vs depth', f:lin(0, 1)},
  {n:'Color spread', f:lin(0.2, 1.4)},
  {n:'Gloss', f:lin(0, 1)},
  {n:'Light angle', f:g => g*TAU, deg:1},
  {n:'Strands', f:g => g >= 0.75 ? 1 : 0, names:['off','on']},
];
const NS = SCALARS.length;
const DISCRETE = new Set([2, 3, 4, 24]);
const STRANDS_ON = 0.86, STRANDS_OFF = 0.25;
const PALETTE = [7, 18];
const val = (v, i) => SCALARS[i].f(v[i]);
function fmtScalar(i, g){
  const d = SCALARS[i], v = d.f(g);
  if (d.names) return d.names[v];
  if (d.int) return String(v);
  if (d.deg) return Math.round(v*180/Math.PI) + '°';
  return v.toFixed(d.dp || 2);
}

/* ---------- Analysis: normalisation, step bound, degenerate rejection ---------- */
function sdBlock(x, y, z, bound, s){
  if (bound === 0) return Math.sqrt(x*x + y*y + z*z) - s;
  if (bound === 1){
    const qx = Math.abs(x) - s*0.74, qy = Math.abs(y) - s*0.74, qz = Math.abs(z) - s*0.74;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox*ox + oy*oy + oz*oz) + Math.min(Math.max(qx, qy, qz), 0) - s*0.08;
  }
  const dx = Math.abs(Math.hypot(x, z)) - s*0.82, dy = Math.abs(y) - s*0.78;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - s*0.04;
}
const SC = [Math.cos(0.9), Math.sin(0.9), Math.cos(1.3), Math.sin(1.3)];
function strandP(x, y, z){
  const x1 = SC[0]*x - SC[1]*y, y1 = SC[1]*x + SC[0]*y, z1 = z;
  return [x1 + 0.37, SC[2]*y1 - SC[3]*z1 - 0.61, SC[3]*y1 + SC[2]*z1 + 0.23];
}
const statCache = new Map();
function stats(g){
  const bound = val(g.v, 4), bs = val(g.v, 5);
  const key = print(g.t) + '|' + print(g.c) + '|' + bound + '|' + bs.toFixed(3);
  if (statCache.has(key)) return statCache.get(key);
  const Ft = js(g.t), Fc = js(g.c);
  const r = mulberry32(1234567);
  const pts = [];
  for (let tries = 0; pts.length < 520 && tries < 6000; tries++){
    const x = (r()*2 - 1)*1.15*bs, y = (r()*2 - 1)*1.15*bs, z = (r()*2 - 1)*1.15*bs;
    const b = sdBlock(x, y, z, bound, bs);
    if (b < 0) pts.push([x, y, z, b]);
  }
  const vals = pts.map(p => Ft(p[0], p[1], p[2]));
  let mean = 0; vals.forEach(v => mean += v); mean /= vals.length;
  let vr = 0; vals.forEach(v => vr += (v - mean)*(v - mean)); const sd = Math.sqrt(vr/vals.length);
  const cvals = pts.slice(0, 200).map(p => Fc(p[0], p[1], p[2]));
  let cm = 0; cvals.forEach(v => cm += v); cm /= cvals.length;
  let cv = 0; cvals.forEach(v => cv += (v - cm)*(v - cm)); const csd = Math.sqrt(cv/cvals.length);
  let out;
  if (!(sd > 1e-5) || !isFinite(sd) || !isFinite(mean)){ out = {ok:false, why:'flat'}; }
  else {
    const ns = 0.25/sd;
    const grads = [];
    const h = 0.004;
    for (let i = 0; i < 180; i++){
      const [x, y, z] = pts[i];
      const gx = Ft(x + h, y, z) - Ft(x - h, y, z), gy = Ft(x, y + h, z) - Ft(x, y - h, z), gz = Ft(x, y, z + h) - Ft(x, y, z - h);
      grads.push(Math.sqrt(gx*gx + gy*gy + gz*gz)/(2*h)*ns);
    }
    grads.sort((a, b) => a - b);
    const q = grads[Math.floor(grads.length*0.98)] || 0;
    const L = Math.max(0.35, q*1.45);
    out = {ok:L < 45, why:L < 45 ? '' : 'too fine', mean, ns, L,
           n:pts.map((p, i) => { const q = strandP(p[0], p[1], p[2]); return [(vals[i] - mean)*ns, p[3], (Ft(q[0], q[1], q[2]) - mean)*ns]; }),
           cmean:cm, cns:csd > 1e-5 && isFinite(csd) ? 0.5/csd : 0};
  }
  statCache.set(key, out);
  if (statCache.size > 400) statCache.delete(statCache.keys().next().value);
  return out;
}
function occupancy(g, st){
  const iso = val(g.v, 0), thk = val(g.v, 1), mode = val(g.v, 2), bands = val(g.v, 3), bs = val(g.v, 5), fade = val(g.v, 6);
  const strands = val(g.v, 24) === 1, ts = thk*1.5;
  let inside = 0;
  for (const [n0, b, n2] of st.n){
    const rr = clamp(1 + b/(0.6*bs), 0, 1);
    const n = n0 - fade*0.8*rr*rr;
    if (strands){ if (Math.hypot(n - iso, n2 - iso) < ts) inside++; }
    else if (mode === 0 ? n > iso : mode === 1 ? Math.abs(n - iso) < thk : Math.abs(Math.sin((n - iso)*bands*TAU)) < thk*4) inside++;
  }
  return inside/st.n.length;
}
function viable(g){
  if (size(g.t) > 34 || depth(g.t) > 10 || cost(g.t) > 9) return {ok:false, why:'too big'};
  if (size(g.c) > 12 || cost(g.c) > 3) return {ok:false, why:'colour too big'};
  const st = stats(g);
  if (!st.ok) return st;
  const occ = occupancy(g, st), mode = val(g.v, 2);
  const ok = val(g.v, 24) === 1 ? occ > 0.006 && occ < 0.4 : mode === 0 ? occ > 0.02 && occ < 0.72 : occ > 0.012 && occ < 0.8;
  return {ok, why:ok ? '' : occ <= 0.02 ? 'empty' : 'solid block', occ};
}
function fitIso(g){
  const st = stats(g);
  if (!st.ok) return false;
  if (viable(g).ok) return true;
  if (val(g.v, 24) === 1){
    let best = null, bestErr = 1e9;
    for (let a = 0; a <= 8; a++) for (let b = 0; b <= 6; b++){
      g.v[0] = 0.3 + a*0.05; g.v[1] = 0.1 + b*0.12;
      const err = Math.abs(occupancy(g, st) - 0.02);
      if (err < bestErr){ bestErr = err; best = [g.v[0], g.v[1]]; }
    }
    g.v[0] = best[0]; g.v[1] = best[1];
    return viable(g).ok;
  }
  const target = val(g.v, 2) === 0 ? 0.16 : 0.1;
  let best = null, bestErr = 1e9;
  for (let k = 0; k <= 20; k++){
    g.v[0] = k/20;
    const occ = occupancy(g, st), err = Math.abs(occ - target);
    if (err < bestErr){ bestErr = err; best = k/20; }
  }
  g.v[0] = best;
  return viable(g).ok;
}
function uniforms(g){
  const st = stats(g); const v = i => val(g.v, i);
  const fade = v(6), bs = v(5);
  const G = (st.ok ? st.L : 2) + fade*2.7/bs;
  return new Float32Array([
    v(0), v(1), v(2), v(3),
    v(4), bs, fade, v(22),
    v(7), v(8), v(9), v(23),
    v(10), v(11), v(12), v(19),
    v(13), v(14), v(15), v(20),
    v(16), v(17), v(18), v(21),
    st.ok ? st.mean : 0, st.ok ? st.ns : 1, G, 0,
    st.ok ? st.cmean : 0, st.ok ? st.cns : 0, v(24), 0,
  ]);
}

/* ---------- Evolution ---------- */
const reflect = x => { x = Math.abs(x) % 2; return x > 1 ? 2 - x : x; };
function cloneG(g){ return {t:clone(g.t), c:clone(g.c), v:g.v.slice()}; }
function mutateParams(n, amt){
  if (n.op === 'num'){ n.v = clamp(round3(n.v + gauss()*0.35*amt), -1.5, 1.5); return true; }
  const spec = OPS[n.op].p; if (!spec) return false;
  const j = Math.floor(rnd()*spec.length); const [, lo, hi, int] = spec[j];
  if (int) n.p[j] = clamp(n.p[j] + (rnd() < 0.5 ? -1 : 1)*(rnd() < 0.7 ? 1 : Math.ceil(rnd()*(hi - lo))), lo, hi);
  else n.p[j] = round3(clamp(n.p[j] + gauss()*(hi - lo)*0.12*amt, lo, hi));
  return true;
}
function treeOp(root, kind, amt){
  const list = nodes(root);
  const it = pick(list);
  const replace = repl => { if (!it.parent) return repl; it.parent.c[it.idx] = repl; return root; };
  const n = it.n;
  switch (kind){
    case 'tweak': {
      const cands = list.filter(e => e.n.op === 'num' || OPS[e.n.op].p);
      if (!cands.length) return treeOp(root, 'graft', amt);
      mutateParams(pick(cands).n, amt); return root;
    }
    case 'swap': {
      const k = OPS[n.op].kind;
      if (k === 'leaf') return replace(makeLeaf());
      const op = pick(BY_KIND[k].filter(o => o !== n.op));
      const m = {op, c:n.c}; const p = randParams(op); if (p.length) m.p = p;
      return replace(m);
    }
    case 'graft': return replace(grow(1 + Math.floor(rnd()*2)));
    case 'wrap': {
      if (rnd() < 0.5){
        const kind2 = rnd() < 0.5 ? 'un' : 'sp';
        const op = pick(BY_KIND[kind2]); const m = {op, c:[n]}; const p = randParams(op); if (p.length) m.p = p;
        return replace(m);
      }
      const op = pick(BY_KIND.bin); const other = grow(Math.floor(rnd()*2));
      const m = {op, c:rnd() < 0.5 ? [n, other] : [other, n]}; const p = randParams(op); if (p.length) m.p = p;
      return replace(m);
    }
    case 'hoist': {
      const inner = list.filter(e => e.n.c && e.n.c.length);
      if (!inner.length) return treeOp(root, 'tweak', amt);
      const e = pick(inner); const child = pick(e.n.c);
      if (!e.parent) return child;
      e.parent.c[e.idx] = child; return root;
    }
  }
  return root;
}
function pickOp(sz){
  const big = sz > 22;
  const w = big ? {tweak:0.35, swap:0.15, graft:0.12, wrap:0.06, hoist:0.32} : {tweak:0.34, swap:0.16, graft:0.2, wrap:0.2, hoist:0.1};
  let u = rnd();
  for (const k in w){ if ((u -= w[k]) < 0) return k; }
  return 'tweak';
}
function mutateScalars(v, rate, strength = 1){
  const p = (0.06 + rate*0.3)*strength, sigma = 0.03 + rate*0.16;
  for (let i = 0; i < NS; i++){
    if (rnd() < (DISCRETE.has(i) ? p*0.3 : p)) v[i] = reflect(v[i] + gauss()*sigma);
  }
}
function mutate(g, rate){
  for (let attempt = 0; attempt < 14; attempt++){
    const h = cloneG(g);
    const nOps = 1 + Math.floor(rnd()*(1 + rate*2.2));
    let label = '';
    for (let k = 0; k < nOps; k++){
      if (rnd() < 0.82){
        const op = pickOp(size(h.t)); h.t = treeOp(h.t, op, 0.5 + rate); if (!label) label = op;
      } else {
        const op = rnd() < 0.6 ? 'tweak' : pickOp(size(h.c)); h.c = treeOp(h.c, op, 0.5 + rate); if (!label) label = 'colour';
      }
    }
    mutateScalars(h.v, rate);
    if (rnd() < 0.08){ h.v[24] = val(h.v, 24) ? STRANDS_OFF : STRANDS_ON; label = 'strands'; if (!viable(h).ok) fitIso(h); }
    if (label !== 'strands' && print(h.t) === print(g.t) && print(h.c) === print(g.c)) continue;
    if (viable(h).ok) return {g:h, label};
  }
  const h = cloneG(g); mutateScalars(h.v, Math.max(rate, 0.5), 2);
  return {g:h, label:'palette'};
}
function crossover(a, b){
  for (let attempt = 0; attempt < 14; attempt++){
    const h = cloneG(a);
    const donor = pick(nodes(b.t)).n;
    const list = nodes(h.t); const e = pick(list);
    if (!e.parent) h.t = clone(donor); else e.parent.c[e.idx] = clone(donor);
    if (rnd() < 0.5) for (let i = PALETTE[0]; i <= PALETTE[1]; i++) h.v[i] = b.v[i];
    if (rnd() < 0.3) h.c = clone(b.c);
    if (print(h.t) === print(a.t)) continue;
    if (viable(h).ok) return h;
  }
  return null;
}
const BANK = [
  'warp(0.5, 0.6, 3, fbm(1, 2, 7))',
  'twist(1.4, add(sin(4, 0, x), noise(1.2, 9)))',
  'mirx(smin(0.25, gauss(5, sub(y, scale(0.5, noise(1, 2)))), noise(1.6, 8)))',
  'max(noise(1.3, 21), neg(abs(sin(3, 0.4, r))))',
  'rotz(0.6, mul(fbm(1.1, 3, 5), soft(scale(2, y))))',
  'warp(1.2, 0.3, 14, sub(abs(noise(0.9, 4)), 0.2))',
  'miry(twist(-2, min(sin(5, 0, x), noise(1.4, 31))))',
  'zoom(1.3, add(noise(1, 12), scale(0.6, sin(2.5, 1, add(x, z)))))',
];
function randomScalars(){
  const v = Array.from({length:NS}, () => rnd());
  v[2] = rnd() < 0.7 ? 0.1 : rnd();
  v[6] = 0.45 + rnd()*0.55;
  v[24] = rnd() < 0.15 ? STRANDS_ON : STRANDS_OFF;
  return v;
}
function randomGenome(){
  for (let attempt = 0; attempt < 60; attempt++){
    const fromBank = rnd() < 0.5;
    const g = {t:fromBank ? parse(pick(BANK)) : grow(3 + Math.floor(rnd()*2)), c:grow(Math.floor(rnd()*2)), v:randomScalars()};
    if (cost(g.c) > 3) g.c = {op:'noise', p:randParams('noise')};
    let h = g;
    if (fromBank){ const m = mutate(g, 0.4); h = m.g; }
    const vb = viable(h);
    if (vb.ok) return h;
    if (val(h.v, 24) === 1 && fitIso(h)) return h;
    // nudge iso toward a workable occupancy before giving up on this tree
    for (let k = 0; k < 6 && !viable(h).ok; k++){ h.v[0] = rnd(); h.v[2] = 0.1; }
    if (viable(h).ok) return h;
  }
  return startGenome();
}
function startGenome(){
  return {t:parse('warp(0.5, 0.6, 3, fbm(1, 2, 7))'), c:parse('noise(0.9, 11)'),
    v:[0.6, 0.2143, 0.1667, 0.4167, 0.1667, 0.6, 0.8,
       0.5, 0.5, 0.5, 0.825, 0.675, 0.625, 0.5, 0.5, 0.5, 0, 0.15, 0.2,
       0, 0.7, 0.583, 0.6, 0.1114, STRANDS_OFF]};
}

/* ---------- Encoding ---------- */
function encode(g){
  const json = JSON.stringify({f:print(g.t), c:print(g.c), v:g.v.map(x => Math.round(clamp(x, 0, 1)*4095).toString(16).padStart(3, '0')).join('')});
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'nsb3.' + b64;
}
function decode(s){
  const m = /^nsb3\.([A-Za-z0-9_-]+)$/.exec(String(s || '').trim());
  if (!m) return null;
  try {
    let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!/^[0-9a-f]+$/i.test(o.v) || o.v.length % 3 || o.v.length > NS*3 || o.v.length < 24*3) return null;
    const v = []; for (let i = 0; i < o.v.length/3; i++) v.push(parseInt(o.v.substr(i*3, 3), 16)/4095);
    while (v.length < NS) v.push(STRANDS_OFF);
    return {t:parse(o.f), c:parse(o.c), v};
  } catch (e) { return null; }
}
function tag(g){
  const s = encode(g); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-4);
}
function palCSS(v){
  const stops = [];
  for (let k = 0; k <= 16; k++){
    const t = k/16;
    const c = [0, 1, 2].map(j => clamp(val(v, 7 + j) + val(v, 10 + j)*Math.cos(TAU*(val(v, 13 + j)*t + val(v, 16 + j))), 0, 1));
    stops.push(`rgb(${c.map(x => Math.round(x*255)).join(',')}) ${(t*100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
function paletteToGenes(p, v){
  const rows = [['a', 7, 0.3, 0.7], ['b', 10, 0.15, 0.55], ['c', 13, 0.3, 1.7], ['d', 16, 0, 1]];
  for (const [k, base, lo, hi] of rows){
    const arr = p && p[k];
    if (!Array.isArray(arr) || arr.length !== 3) continue;
    arr.forEach((x, j) => { const n = Number(x); if (isFinite(n)) v[base + j] = clamp((clamp(n, lo, hi) - lo)/(hi - lo), 0, 1); });
  }
}

return {OPS, LANG, SCALARS, NS, val, fmtScalar, snoise, seedVec, parse, print, pretty, glsl, js, stats, viable, uniforms,
        mutate, crossover, fitIso, randomGenome, startGenome, cloneG, encode, decode, tag, palCSS, paletteToGenes, size, cost, depth,
        grow, strandP, setRandom:f => { rnd = f; }, mulberry32};
})();
if (typeof module !== 'undefined') module.exports = ENGINE;
