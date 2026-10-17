float sdBlock(vec3 p){
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
