this.RENDER=(function(){var e=[.7,.38,3.35],t=1.25;function n(e){return Math.min(8,Math.max(t,e))}var r=`//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20201014 (stegu)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
  }
`,i=`#define ISO     P[0].x
#define THK     P[0].y
#define MODE    P[0].z
#define BANDS   P[0].w
#define BOUND   P[1].x
#define BSIZE   P[1].y
#define FADE    P[1].z
#define GLOSS   P[1].w
#define PAL_A   P[2].xyz
#define LANG    P[2].w
#define PAL_B   P[3].xyz
#define CSHIFT  P[3].w
#define PAL_C   P[4].xyz
#define CMIX    P[4].w
#define PAL_D   P[5].xyz
#define CSPREAD P[5].w
#define NMEAN   P[6].x
#define NSCALE  P[6].y
#define GRAD    P[6].z
#define CMEAN   P[7].x
#define CSCALE  P[7].y
#define STRANDS P[7].z

vec3 gMT3 = vec3(0.0);

float fbmN(vec3 p, int o){
  float a = 1.0, s = 0.0, n = 0.0;
  for (int i = 0; i < 4; i++){
    if (i >= o) break;
    s += a*snoise(p); n += a;
    p = p*2.0 + vec3(17.13, 5.71, 11.37);
    a *= 0.5;
  }
  return s/n;
}
float sminF(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0 - h); }
vec3 twistP(vec3 p, float k){ float c = cos(k*p.y), s = sin(k*p.y); return vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z); }
vec3 rotX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }
vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rotZ(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z); }
vec3 strandP(vec3 p){ return rotX(rotZ(p, 0.9), 1.3) + vec3(0.37, -0.61, 0.23); }
vec3 warpP(vec3 p, float f, float m, vec3 o){
  vec3 q = p*f + o;
  return p + m*vec3(snoise(q), snoise(q + vec3(31.4, 0.0, 0.0)), snoise(q + vec3(0.0, 47.2, 0.0)));
}
`,a=`float sdBlock(vec3 p){
  float s = BSIZE;
  if (BOUND < 0.5) return length(p) - s;
  if (BOUND < 1.5){
    vec3 q = abs(p) - vec3(s*0.74);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - s*0.08;
  }
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(s*0.82, s*0.78);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - s*0.04;
}

float field(vec3 p, out float nv){
  nv = 0.0;
  float b = sdBlock(p);
  if (b > 0.12) return b;
  float rr = clamp(1.0 + b/(0.6*BSIZE), 0.0, 1.0);
  float n = (tree(p) - NMEAN)*NSCALE - FADE*0.8*rr*rr;
  nv = n;
  float d;
  if (STRANDS > 0.5){
    float n2 = (tree(strandP(p)) - NMEAN)*NSCALE;
    d = (length(vec2(n - ISO, n2 - ISO)) - THK*1.5)/(GRAD*1.42);
  }
  else if (MODE < 0.5) d = (ISO - n)/GRAD;
  else if (MODE < 1.5) d = (abs(n - ISO) - THK)/GRAD;
  else { float k = BANDS*6.2831853; d = (abs(sin((n - ISO)*k)) - THK*4.0)/(GRAD*k); }
  return -sminF(-d, -b, 0.03);
}

vec2 hitSphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r*r;
  float h = b*b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

float march(vec3 ro, vec3 rd, out float nv){
  nv = 0.0;
  vec2 tb = hitSphere(ro, rd, BSIZE*1.4 + 0.05);
  if (tb.y < 0.0) return -1.0;
  float t = max(tb.x, 0.0);
  float tp = t;
  bool hit = false;
  for (int i = 0; i < MAXSTEPS; i++){
    float d = field(ro + rd*t, nv);
    if (d < 0.0){ hit = true; break; }
    if (d < 0.0004) return t;
    tp = t;
    t += max(d*0.9, 0.0025);
    if (t > tb.y) break;
  }
  if (!hit) return -1.0;
  float lo = tp, hi = t, nvb = nv;
  for (int k = 0; k < 6; k++){
    float m = 0.5*(lo + hi);
    float nm;
    if (field(ro + rd*m, nm) < 0.0){ hi = m; nvb = nm; } else lo = m;
  }
  nv = nvb;
  return hi;
}

vec3 calcNormal(vec3 p){
  vec3 n = vec3(0.0);
  float nv;
  for (int i = 0; i < 4; i++){
    vec3 e = 0.5773*(2.0*vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e*field(p + 0.0015*e, nv);
  }
  return normalize(n);
}

float occlusion(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0, nv;
  for (int i = 0; i < 4; i++){
    float h = 0.015 + 0.06*float(i);
    occ += (h - field(p + n*h, nv))*sca;
    sca *= 0.8;
  }
  return clamp(1.0 - 1.6*occ, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02, nv;
  for (int i = 0; i < 20; i++){
    float h = field(ro + rd*t, nv);
    res = min(res, 8.0*h/t);
    if (res < 0.01) break;
    t += clamp(h, 0.02, 0.2);
    if (t > 2.6) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 pal(float t){ return PAL_A + PAL_B*cos(6.2831853*(PAL_C*t + PAL_D)); }

vec3 render(vec2 fc, vec2 res, vec3 cam, vec3 bg, float mt){
  gMT3 = vec3(0.0, 0.0, mt);
  vec2 uv = (2.0*fc - res)/min(res.x, res.y);
  vec3 ro = cam.z*vec3(sin(cam.x)*cos(cam.y), sin(cam.y), cos(cam.x)*cos(cam.y));
  vec3 ww = normalize(-ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x*uu + uv.y*vv + 2.2*ww);
  vec3 back = bg*(1.0 - 0.07*dot(uv, uv));
  float nv;
  float t = march(ro, rd, nv);
  if (t < 0.0) return back;
  vec3 p = ro + rd*t;
  vec3 n = calcNormal(p);
  float ao = occlusion(p, n);
  vec3 L = normalize(vec3(cos(LANG), 0.85, sin(LANG)));
  float sh = softShadow(p + n*0.004, L);
  float cv = CSCALE > 0.0 ? clamp((ctree(p) - CMEAN)*CSCALE, -1.5, 1.5) : 0.0;
  float ct = CSHIFT + CSPREAD*mix(0.6*length(p)/BSIZE, cv + 0.5, CMIX) + 0.12*(1.0 - ao);
  if (MODE > 1.5 && STRANDS < 0.5) ct += floor((nv - ISO)*BANDS*2.0 + 0.5)*0.137;
  vec3 alb = pow(clamp(pal(ct), 0.0, 1.0), vec3(2.2));
  float dif = clamp(dot(n, L), 0.0, 1.0)*sh;
  float amb = 0.55 + 0.45*n.y;
  float fre = pow(clamp(1.0 + dot(n, rd), 0.0, 1.0), 3.0);
  vec3 hv = normalize(L - rd);
  float spe = pow(clamp(dot(n, hv), 0.0, 1.0), mix(10.0, 120.0, GLOSS))*GLOSS*dif;
  vec3 bgl = pow(bg, vec3(2.2));
  vec3 lin = 2.1*dif*vec3(1.0, 0.95, 0.88)
           + 0.6*amb*ao*mix(vec3(0.75, 0.82, 1.0), bgl, 0.35)
           + 0.25*fre*ao;
  vec3 c = alb*lin + spe*vec3(1.1);
  c += alb*0.12*ao*clamp(0.5 - 0.5*dot(n, L), 0.0, 1.0);
  c = c*(2.51*c + 0.03)/(c*(2.43*c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
}
`,o=`#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;function s(){return{prelude:i,scene:a,noise:r}}function c(){return o}function l(e,t,n){let{maxSteps:o}=n;return`#version 300 es
precision highp float;
uniform vec4 P[8];
uniform vec2 uRes;
uniform vec2 uOff;
uniform float uFlip;
uniform vec3 uCam;
uniform vec3 uBg;
uniform float uMT;
out vec4 outColor;
#define MAXSTEPS ${o}
${`${r}\n${i}\n${e.glsl(t.t,`tree`)}\n${e.glsl(t.c,`ctree`)}\n${a}`}
void main(){
  vec2 fc = uFlip > 0.5 ? vec2(uOff.x + gl_FragCoord.x, uRes.y - (uOff.y + gl_FragCoord.y)) : gl_FragCoord.xy;
  outColor = vec4(render(fc, uRes, uCam, uBg, uMT), 1.0);
}`}function u(e){return`// Consculpta export
const vec4 P[8] = vec4[8](
${e.uniformRows}
);
const vec3 BG = vec3(${e.bg});
#define MORPH ${e.morph}
#define MAXSTEPS 160
${e.noise}
${e.prelude}
${e.treeGlsl}
${e.colorGlsl}
${e.scene}
void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 m = iMouse.z > 0.0 ? iMouse.xy/iResolution.xy - 0.5 : vec2(0.0);
  vec3 cam = vec3(${e.camExpr});
  fragColor = vec4(render(fragCoord, iResolution.xy, cam, BG, iTime*MORPH), 1.0);
}`}function d(e){let{engine:t,canvas:n}=e,r=e.coarsePointer?96:120,i=c(),a={gl:null,vs:null,vao:null,par:null,fbo:null,tex:null,fw:0,fh:0,cache:new Map,tick:0,info:``,bg:[.82,.85,.81]},o=new WeakMap,s=e=>t.print(e.t)+`#`+t.print(e.c),u=e=>{let n=o.get(e);return n||(n=t.uniforms(e),o.set(e,n)),n};function d(){let e=n.getContext(`webgl2`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:`high-performance`});if(!e)return!1;a.gl=e,a.par=e.getExtension(`KHR_parallel_shader_compile`),a.vs=e.createShader(e.VERTEX_SHADER),e.shaderSource(a.vs,i),e.compileShader(a.vs),a.vao=e.createVertexArray(),a.fbo=e.createFramebuffer(),a.tex=e.createTexture(),a.fw=0,a.fh=0,a.cache=new Map;try{let t=e.getExtension(`WEBGL_debug_renderer_info`);a.info=t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):e.getParameter(e.RENDERER)}catch{a.info=``}return!0}function f(e){let n=a.gl;if(!n)throw Error(`WebGL not initialised`);let i=s(e),o=a.cache.get(i);if(o)return o.used=++a.tick,o;let c=n.createShader(n.FRAGMENT_SHADER);n.shaderSource(c,l(t,e,{maxSteps:r})),n.compileShader(c);let u=n.createProgram();if(n.attachShader(u,a.vs),n.attachShader(u,c),n.linkProgram(u),o={key:i,prog:u,fs:c,state:`pending`,used:++a.tick,err:``},a.cache.set(i,o),a.cache.size>30){let e=[...a.cache.values()].filter(e=>e!==o&&e.state!==`pending`).sort((e,t)=>e.used-t.used);for(let t of e.slice(0,a.cache.size-30))n.deleteProgram(t.prog),n.deleteShader(t.fs),a.cache.delete(t.key)}return o}function p(e){if(e.state!==`pending`)return e.state===`ready`;let t=a.gl;if(!t||a.par&&!t.getProgramParameter(e.prog,a.par.COMPLETION_STATUS_KHR))return!1;if(!t.getProgramParameter(e.prog,t.LINK_STATUS))return e.state=`error`,e.err=t.getShaderInfoLog(e.fs)||t.getProgramInfoLog(e.prog)||`link failed`,console.warn(`shader error`,e.err),!1;let n=n=>t.getUniformLocation(e.prog,n);return e.loc={P:n(`P`),res:n(`uRes`),off:n(`uOff`),flip:n(`uFlip`),cam:n(`uCam`),bg:n(`uBg`),mt:n(`uMT`)},e.state=`ready`,!0}function m(e,t){let n=a.gl;n&&(a.fw!==e||a.fh!==t)&&(n.bindTexture(n.TEXTURE_2D,a.tex),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,e,t,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.bindFramebuffer(n.FRAMEBUFFER,a.fbo),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,a.tex,0),a.fw=e,a.fh=t)}function h(e,t,n){let r=a.gl;r&&(n.fbo?(m(n.w,n.h),r.bindFramebuffer(r.FRAMEBUFFER,a.fbo)):r.bindFramebuffer(r.FRAMEBUFFER,null),r.viewport(0,0,n.w,n.h),r.useProgram(e.prog),r.bindVertexArray(a.vao),r.uniform4fv(e.loc.P,u(t)),r.uniform2f(e.loc.res,n.fullW||n.w,n.fullH||n.h),r.uniform2f(e.loc.off,n.offX||0,n.offY||0),r.uniform1f(e.loc.flip,+!!n.fbo),r.uniform3f(e.loc.cam,n.cam[0],n.cam[1],n.cam[2]),r.uniform3f(e.loc.bg,a.bg[0],a.bg[1],a.bg[2]),r.uniform1f(e.loc.mt,n.mt),r.drawArrays(r.TRIANGLES,0,3))}function g(e,t){let n=a.gl;if(!n)return new Uint8Array;let r=new Uint8Array(e*t*4);return n.readPixels(0,0,e,t,n.RGBA,n.UNSIGNED_BYTE,r),n.bindFramebuffer(n.FRAMEBUFFER,null),r}function _(e,t){let n=g(e,t);return new ImageData(new Uint8ClampedArray(n.buffer),e,t)}function v(e){a.bg=e}function y(e){return l(t,e,{maxSteps:r})}return{init:d,programFor:f,ready:p,drawWith:h,readRaw:g,readFBO:_,setBackground:v,fragmentSourceFor:y,get gl(){return a.gl},get info(){return a.info},get maxSteps(){return r}}}var f=(()=>{let e=new Uint32Array(256);for(let t=0;t<256;t++){let n=t;for(let e=0;e<8;e++)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e})();function p(e,t,n){let r=4294967295;for(let i=t;i<n;i++)r=f[(r^e[i])&255]^r>>>8;return(r^4294967295)>>>0}function m(e,t){let n=new Uint8Array(12+t.length),r=new DataView(n.buffer);r.setUint32(0,t.length);for(let t=0;t<4;t++)n[4+t]=e.charCodeAt(t);return n.set(t,8),r.setUint32(8+t.length,p(n,4,8+t.length)),n}function h(e,t){let n=new CompressionStream(`deflate`),r=n.writable.getWriter(),i=new Uint8Array(13),a=new DataView(i.buffer);a.setUint32(0,e),a.setUint32(4,t),i[8]=8,i[9]=2;let o=[new Uint8Array([137,80,78,71,13,10,26,10]),m(`IHDR`,i)],s=(async()=>{let e=n.readable.getReader();for(;;){let{value:t,done:n}=await e.read();if(n)break;o.push(m(`IDAT`,t))}})();return s.catch(()=>{}),{write:e=>r.write(e),async close(){return await r.close(),await s,o.push(m(`IEND`,new Uint8Array)),new Blob(o,{type:`image/png`})},abort(){try{r.abort()}catch{}}}}function g(e,t,n){let r=t*3,i=new Uint8Array(n*(r+1));for(let t=0;t<n;t++){let n=t*(r+1),a=t*r;i[n]=1,i[n+1]=e[a],i[n+2]=e[a+1],i[n+3]=e[a+2];for(let t=3;t<r;t++)i[n+1+t]=e[a+t]-e[a+t-3]&255}return i}function _(e,t,n){for(let r=0;r<e.length;r++){let r=e.shift();if(!r)return!1;let i=t.programFor(r.g);if(!t.ready(i)){if(i&&typeof i==`object`&&`state`in i&&i.state===`error`){n.paintError(r.canvas,r.size);continue}return e.push(r),!1}let a=r.size;t.drawWith(i,r.g,{fbo:!0,w:a,h:a,cam:n.cam,mt:n.morphT});let o=t.readFBO(a,a);return r.canvas.width!==a&&(r.canvas.width=r.size,r.canvas.height=r.size),r.canvas.getContext(`2d`)?.putImageData(o,0,0),r.canvas.dataset.done=String(n.litterId),!0}return!1}function v(e,t,n){let r=e.filter(e=>e.key!==t);return r.push(n),r}function y(e,t,n=256){let r=Math.ceil(e/n),i=Math.ceil(t/n);return{cols:r,rows:i,total:r*i,tileSize:n}}function b(e,t,n){let r=e%t,i=Math.floor(e/t);return{col:r,row:i,ox:r*n,oy:i*n}}function x(e,t,n,r,i,a,o,s,c,l,u){let d=u*u;for(let a=0;a<r;a++)for(let r=0;r<n;r++){let n=0,f=0,p=0;for(let i=0;i<u;i++)for(let o=0;o<u;o++){let s=((a*u+i)*t+r*u+o)*4;n+=e[s],f+=e[s+1],p+=e[s+2]}n=n/d+.5|0,f=f/d+.5|0,p=p/d+.5|0;let m=(a*o+i+r)*3;s[m]=n,s[m+1]=f,s[m+2]=p;let h=(a*l+r)*4;c[h]=n,c[h+1]=f,c[h+2]=p,c[h+3]=255}}var S={createRenderer:d,THUMB_CAM:e,ZMIN:t,ZMAX:8,clampZoom:n,SNAP_TILE_SIZE:256,snapTileGrid:y,snapTileOrigin:b,boxFilterTile:x,pngStream:h,filterRows:g,getSharedGlslBlocks:s,buildShadertoyExport:u,processThumbQueue:_,enqueueThumb:v};return typeof globalThis<`u`&&(globalThis.RENDER=S),S})();