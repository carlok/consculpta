#define ISO     P[0].x
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
