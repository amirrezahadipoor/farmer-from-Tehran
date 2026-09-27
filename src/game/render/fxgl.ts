export const VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  // flip Y so canvas row 0 (top) lands at the top of the screen
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform sampler2D uWaterTex;
uniform float uFog;
uniform float uGrade;
uniform float uWaterOn;
uniform vec3 uPart;
uniform float uTime;
uniform sampler2D uBloom;
uniform sampler2D uLut;
uniform float uLutRow;
uniform vec4 uCam;
uniform vec2 uScreen;
uniform vec4 uSky;
void main() {
  vec4 c = texture(uTex, vUv);
  if (c.a < 0.02) {
    float t = 1.0 - vUv.y;
    vec3 zen = mix(vec3(0.24, 0.48, 0.85), vec3(0.03, 0.05, 0.13), uSky.x);
    vec3 hor = mix(vec3(0.72, 0.87, 0.98), vec3(0.07, 0.10, 0.20), uSky.x);
    vec3 sky = mix(hor, zen, smoothstep(0.15, 0.85, t));
    sky = mix(sky, vec3(1.0, 0.52, 0.22) * (0.35 + 0.65 * (1.0 - t)), uSky.y * 0.55 * (1.0 - t));
    vec2 g = floor(vUv * vec2(90.0, 60.0));
    float st = fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453);
    float tw = 0.5 + 0.5 * sin(uSky.w * (1.5 + st * 2.5) + st * 40.0);
    float star = step(0.9975, st) * tw * uSky.x;
    vec2 cp = vUv * vec2(3.2, 2.1) + vec2(uSky.w * 0.008, 0.0);
    float n = 0.0;
    n += 0.55 * (0.5 + 0.5 * sin(cp.x * 3.1 + sin(cp.y * 2.7) * 1.7));
    n += 0.30 * (0.5 + 0.5 * sin(cp.x * 6.7 + 1.3 + sin(cp.y * 5.3 + 0.7) * 1.4));
    n += 0.15 * (0.5 + 0.5 * sin(cp.x * 13.3 + 2.1 + sin(cp.y * 11.1) * 1.2));
    float cloud = smoothstep(1.0 - uSky.z * 0.75, 1.35 - uSky.z * 0.5, n) * smoothstep(0.05, 0.35, t) * (1.0 - uSky.x * 0.85);
    sky = mix(sky, vec3(0.97, 0.98, 1.0), cloud * 0.85);
    sky += vec3(star);
    c = vec4(sky, 1.0);
  }
  vec2 px = vUv * uScreen;
  vec2 world = (px - uCam.xy) / uCam.z;
  vec2 muv = vec2((world.x + 1584.0) / 3168.0, (world.y + 792.0) / 1584.0);
  float m = step(0.5, texture(uWaterTex, muv).r) * uWaterOn;
  if (m > 0.0) {
    float t = uTime;
    float w1 = sin(world.x * 0.09 + t * 1.6) * sin(world.y * 0.12 - t * 1.1);
    float w2 = sin((world.x + world.y) * 0.055 + t * 0.8);
    float caust = smoothstep(0.45, 0.95, 0.5 + 0.5 * (w1 * 0.6 + w2 * 0.4));
    float spec = smoothstep(0.9, 1.0, 0.5 + 0.5 * sin(world.x * 0.33 - t * 2.7) * sin(world.y * 0.41 + t * 2.1));
    vec2 cell = fract(world * 0.06) - 0.5;
    float ripple = uPart.x * max(sin(length(cell) * 34.0 - t * 5.0), 0.0) * smoothstep(0.5, 0.12, length(cell)) * 0.5;
    vec3 add = vec3(0.06, 0.26, 0.32) * caust + vec3(0.85, 0.95, 1.0) * spec * 0.30 + vec3(0.30, 0.45, 0.50) * ripple;
    c.rgb = mix(c.rgb, c.rgb * 0.86 + add, m);
  }
  vec3 part = vec3(0.0);
  if (uPart.x > 0.0) {
    vec2 rp = vec2(vUv.x * 46.0, vUv.y * 9.0 - uTime * 2.6);
    vec2 gi = floor(rp);
    vec2 gf = fract(rp);
    float rn = fract(sin(dot(gi, vec2(41.7, 67.3))) * 43758.5453);
    float lx = 0.15 + 0.7 * fract(rn * 7.31);
    float streak = step(0.42, rn) * smoothstep(0.10, 0.02, abs(gf.x - lx)) * smoothstep(0.85, 0.15, gf.y) * smoothstep(0.05, 0.25, gf.y);
    part += vec3(0.72, 0.85, 1.0) * streak * 0.40 * uPart.x;
  }
  if (uPart.y > 0.0) {
    vec2 sp = vec2(vUv.x * 60.0 + sin(uTime * 0.7 + vUv.y * 9.0) * 0.6, vUv.y * 34.0 - uTime * 0.55);
    vec2 gi = floor(sp);
    vec2 gf = fract(sp);
    float rn = fract(sin(dot(gi, vec2(13.7, 91.1))) * 43758.5453);
    float d = length(gf - vec2(0.2 + 0.6 * fract(rn * 3.7), 0.2 + 0.6 * fract(rn * 5.3)));
    part += vec3(1.0) * step(0.55, rn) * smoothstep(0.16, 0.05, d) * 0.55 * uPart.y;
  }
  if (uPart.z > 0.0) {
    float yw = sin(vUv.y * 90.0 + uTime * 1.6 + sin(vUv.x * 7.0 + uTime) * 2.0);
    part += vec3(1.0, 0.7, 0.3) * smoothstep(0.96, 1.0, yw) * 0.10 * uPart.z;
  }
  c.rgb += part;
  c.rgb = vec3(
    texture(uLut, vec2((clamp(c.r, 0.0, 1.0) * 31.0 + 0.5) / 32.0, uLutRow)).r,
    texture(uLut, vec2((clamp(c.g, 0.0, 1.0) * 31.0 + 0.5) / 32.0, uLutRow)).g,
    texture(uLut, vec2((clamp(c.b, 0.0, 1.0) * 31.0 + 0.5) / 32.0, uLutRow)).b);
  vec2 aoStep = vec2(3.0 / uScreen.x, 3.0 / uScreen.y);
  float lw = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float lav = 0.0;
  lav += dot(texture(uTex, vUv + vec2(aoStep.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  lav += dot(texture(uTex, vUv - vec2(aoStep.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  lav += dot(texture(uTex, vUv + vec2(0.0, aoStep.y)).rgb, vec3(0.299, 0.587, 0.114));
  lav += dot(texture(uTex, vUv - vec2(0.0, aoStep.y)).rgb, vec3(0.299, 0.587, 0.114));
  lav *= 0.25;
  c.rgb *= 1.0 - smoothstep(0.04, 0.24, lav - lw) * 0.20;
  c.rgb += texture(uBloom, vUv).rgb * 0.55;
  // 1) filmic grade: soft desaturation + gentle contrast
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = mix(c.rgb, vec3(l), 0.06 * uGrade);
  c.rgb = (c.rgb - 0.5) * (1.0 + 0.12 * uGrade) + 0.5;
  // 2) aerial perspective: far (top of screen) fades to soft haze
  float f = (1.0 - smoothstep(0.05, 0.55, vUv.y)) * uFog;
  c.rgb = mix(c.rgb, vec3(0.76, 0.84, 0.92), f * 0.30);
  // 3) vignette: soft corners to focus the eye
  vec2 q = vUv - 0.5;
  c.rgb *= 1.0 - dot(q, q) * 0.42 * uGrade;
  c.rgb += (fract(sin(dot(vUv * uScreen + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;
  fragColor = c;
}`;

export const BRIGHT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
void main() {
  vec4 c = texture(uTex, vUv);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  fragColor = vec4(c.rgb * smoothstep(0.62, 0.95, l), 1.0);
}`;

export const BLUR = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 s = texture(uTex, vUv).rgb * 0.227;
  s += (texture(uTex, vUv + uDir * 1.384).rgb + texture(uTex, vUv - uDir * 1.384).rgb) * 0.316;
  s += (texture(uTex, vUv + uDir * 3.230).rgb + texture(uTex, vUv - uDir * 3.230).rgb) * 0.070;
  fragColor = vec4(s, 1.0);
}`;

export function buildLutCanvas(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 32;
  cv.height = 10;
  const ctx = cv.getContext("2d");
  if (!ctx) return cv;
  const img = ctx.createImageData(32, 10);
  if (!img) return cv;
  const rows = [
    (ch: number, v: number) => (ch === 1 ? Math.min(1, v * 1.06 + 0.02) : v * 1.02),
    (ch: number, v: number) => Math.min(1, v * 1.05 + 0.03 - ch * 0.004),
    (ch: number, v: number) => (ch === 0 ? Math.min(1, v * 1.1 + 0.02) : ch === 2 ? v * 0.9 : v),
    (ch: number, v: number) => (ch === 2 ? Math.min(1, v * 1.1 + 0.02) : ch === 0 ? v * 0.92 : v * 0.98 + 0.01),
    (ch: number, v: number) => v * 0.85 + (ch === 2 ? 0.06 : 0.02),
  ];
  for (let r = 0; r < 5; r++) for (let dup = 0; dup < 2; dup++) for (let x = 0; x < 32; x++) {
    const i = ((r * 2 + dup) * 32 + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.round(255 * Math.max(0, rows[r](ch, x / 31)));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

