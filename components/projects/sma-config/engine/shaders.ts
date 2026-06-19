// All GLSL ES 3.00 shaders for the Physarum simulation.
//
// The model follows Jeff Jones' agent-based slime mould (Physarum polycephalum):
// each agent senses the pheromone trail ahead/left/right, rotates toward the
// strongest, steps forward, and deposits more trail. The trail map then
// diffuses and decays. Emergent transport networks appear — the look that
// Casey Reas (Process/Substrate) and Raven Kwok explore.
//
// The engine is generalized to support up to three species, encoded in the
// R/G/B channels of the trail map. Single-species versions simply use R.
// Agent state texture: rgba = (x, y, heading, species[0..2]).

// Fullscreen triangle — no vertex buffer needed, indexed by gl_VertexID.
export const FULLSCREEN_VERT = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Maps a species index (0/1/2) to an R/G/B channel selector.
const SPECIES_MASK = /* glsl */ `
vec3 speciesMask(float s) {
  return s < 0.5 ? vec3(1.0, 0.0, 0.0)
       : s < 1.5 ? vec3(0.0, 1.0, 0.0)
                 : vec3(0.0, 0.0, 1.0);
}`;

// Pass 1 — sense & move. One fragment per agent texel.
export const UPDATE_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uAgents;
uniform sampler2D uTrail;
uniform vec2  uRes;
uniform float uSensorAngle; // radians
uniform float uSensorDist;  // px
uniform float uTurnSpeed;   // radians
uniform float uStepSize;    // px
uniform float uFrame;
uniform float uAvoid;       // cross-species repulsion 0..1
uniform vec2  uMouse;       // cursor px (y-up): a sense-only scent, never deposited
uniform float uMouseStr;    // attraction strength (0 = off)
uniform float uMouseRad;    // px
out vec4 outState;
${SPECIES_MASK}
float senseAt(vec2 pos, vec3 mask) {
  // toroidal sampling keeps the world seamless
  vec3 t = texture(uTrail, fract(pos / uRes)).rgb;
  float s = dot(t, mask) - uAvoid * dot(t, 1.0 - mask);
  // touch: agents steer toward the cursor without anything visible being drawn
  if (uMouseStr > 0.0) {
    float d = distance(pos, uMouse);
    s += exp(-(d * d) / (2.0 * uMouseRad * uMouseRad)) * uMouseStr * 3.0;
  }
  return s;
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uAgents, coord, 0);
  vec2 pos = s.xy;
  float angle = s.z;
  float sp = s.w;
  vec3 mask = speciesMask(sp);

  float f = senseAt(pos + vec2(cos(angle), sin(angle)) * uSensorDist, mask);
  float l = senseAt(pos + vec2(cos(angle + uSensorAngle), sin(angle + uSensorAngle)) * uSensorDist, mask);
  float r = senseAt(pos + vec2(cos(angle - uSensorAngle), sin(angle - uSensorAngle)) * uSensorDist, mask);

  float rnd = hash(pos + uFrame);
  if (f > l && f > r) {
    // keep heading
  } else if (f < l && f < r) {
    angle += (rnd < 0.5 ? -1.0 : 1.0) * uTurnSpeed;
  } else if (r > l) {
    angle -= uTurnSpeed;
  } else if (l > r) {
    angle += uTurnSpeed;
  }

  vec2 npos = mod(pos + vec2(cos(angle), sin(angle)) * uStepSize, uRes);
  outState = vec4(npos, angle, sp);
}`;

// Pass 2 — deposit. One POINT per agent, splat into its species' channel.
export const DEPOSIT_VERT = /* glsl */ `#version 300 es
uniform sampler2D uAgents;
uniform float uAgentTexW;
uniform vec2  uRes;
flat out vec3 vMask;
${SPECIES_MASK}
void main() {
  int id = gl_VertexID;
  int w = int(uAgentTexW);
  ivec2 coord = ivec2(id % w, id / w);
  vec4 st = texelFetch(uAgents, coord, 0);
  vMask = speciesMask(st.w);
  vec2 clip = (st.xy / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

export const DEPOSIT_FRAG = /* glsl */ `#version 300 es
precision highp float;
flat in vec3 vMask;
uniform float uDeposit;
out vec4 outColor;
void main() { outColor = vec4(vMask * uDeposit, 0.0); }`;

// Optional pass — food. Additive gaussian blobs at up to MAX_FOOD points.
// Used for the cursor (Living Ink) and for the audio spectrum (Resonator).
export const MAX_FOOD = 48;
export const FOOD_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2  uRes;
uniform int   uCount;
uniform vec3  uPoints[${MAX_FOOD}]; // x, y (px, y-up), strength
uniform float uRadius;              // px
out vec4 outColor;
void main() {
  vec2 p = vUv * uRes;
  float g = 0.0;
  for (int i = 0; i < ${MAX_FOOD}; i++) {
    if (i >= uCount) break;
    float d = distance(p, uPoints[i].xy);
    g += exp(-(d * d) / (2.0 * uRadius * uRadius)) * uPoints[i].z;
  }
  outColor = vec4(g, g, g, 0.0); // feed every species
}`;

// Pass 3 — diffuse (3x3 blur) + decay, per channel.
export const DECAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTrail;
uniform vec2  uRes;
uniform float uDecay;
uniform float uDiffuse;
out vec4 outColor;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 sz = ivec2(uRes);
  vec3 sum = vec3(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      ivec2 q = (c + ivec2(dx, dy) + sz) % sz;
      sum += texelFetch(uTrail, q, 0).rgb;
    }
  }
  vec3 blur = sum / 9.0;
  vec3 orig = texelFetch(uTrail, c, 0).rgb;
  vec3 v = mix(orig, blur, uDiffuse) * uDecay;
  outColor = vec4(v, 1.0);
}`;

// Pass 4 — display. Mode 0: 3-stop palette on R. Mode 1: additive RGB species.
export const DISPLAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTrail;
uniform int   uMode;
uniform vec3  uBg, uLo, uHi;
uniform vec3  uColR, uColG, uColB;
uniform float uIntensity, uGamma;
out vec4 frag;
void main() {
  vec3 t = texture(uTrail, vUv).rgb * uIntensity;
  vec3 col;
  if (uMode == 0) {
    float v = pow(clamp(t.r, 0.0, 1.0), uGamma);
    col = mix(uBg, uLo, smoothstep(0.0, 0.5, v));
    col = mix(col, uHi, smoothstep(0.5, 1.0, v));
  } else {
    t = pow(clamp(t, 0.0, 1.0), vec3(uGamma));
    col = uBg + t.r * uColR + t.g * uColG + t.b * uColB;
  }
  frag = vec4(col, 1.0);
}`;
