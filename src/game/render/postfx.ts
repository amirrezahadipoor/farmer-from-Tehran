/**
 * src/game/render/postfx.ts — پست‌پردازشِ GPU (فازِ ۱ِ انجینِ آرت)
 *
 * فریمِ بومِ دنیای ۲بعدی ← texture ← یک مسیرِ WebGL2 تمام‌صفحه (shaderِ سفارشی):
 *  • کالرگریدِ سینمایی: فلتِ ملایم + کنتراستِ نرم (حسِ فیلم، نه صفحه‌ی وب)
 *  • دیدِ جوی (aerial perspective): محوِ ملایمِ افق (بالای صفحه = دورتر)
 *  • وینیت: تیرگیِ نرمِ گوشه‌ها برای تمرکزِ چشم
 *
 * پیاده‌سازیِ «میکرو انجین» با WebGL2 خام — بدونِ وابستگیِ خارجی:
 * یک برنامه‌ی سه‌خطیِ شیدر + یک مثلثِ تمام‌صفحه. اگر WebGL2 نیست یا هر خطایی
 * رخ داد: `null` برمی‌گردانیم و مسیرِ ۲بعدیِ خالص می‌ماند (بازی هیچ‌گاه نمی‌شکند).
 * سقفِ پسماند: رندررِ نرم‌افزاری (SwiftShader/llvmpipe) تشخیص داده می‌شود و گذار
 * خاموش می‌ماند (پروفایلِ ضعیف ≥ ۴۵ فریم)؛ پرچمِ ?fx=1 برایِ نمونه‌ی اسکرین‌شات.
 * برای فازِ ۲ (رندرِ واقعیِ GPU) می‌توان همین بوم را به PixiJS/SDF منتقل کرد.
 */

const VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  // flip Y so canvas row 0 (top) lands at the top of the screen
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform float uFog;
uniform float uGrade;
void main() {
  vec4 c = texture(uTex, vUv);
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
  fragColor = c;
}`;

export interface PostFX {
  /** بومِ WebGL که فریمِ پردازش‌شده در آن است */
  canvas: HTMLCanvasElement;
  /** texture را از بومِ منبع تازه می‌کند و مسیرِ GPU را اجرا می‌کند */
  present: () => void;
  destroy: () => void;
  /** شدتِ اثرها (۰ = خاموش) — برای تنظیم و تست */
  setGrade: (v: number) => void;
  setFog: (v: number) => void;
}

/** آیا این مرورگر WebGL2 سالم دارد؟ (در محیطِ تست/سرور: همیشه false → مسیرِ ۲بعدی) */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    return typeof gl.getParameter(gl.VERSION) === "string";
  } catch {
    return false;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`شیدر: ${info}`);
  }
  return sh;
}

/** ساختِ پست‌پردازش روی `src` (بومِ آفلاینِ حلقه‌ی بازی). هر شکست → null (سقوطِ نرم به ۲بعدی) */
export async function createPostFX(src: HTMLCanvasElement): Promise<PostFX | null> {
  if (!webgl2Available()) return null;
  let gl: WebGL2RenderingContext;
  const canvas = document.createElement("canvas");
  try {
    gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false })!;
    if (!gl) return null;
    // سقفِ پسماند: روی رندرِ نرم‌افزاری (SwiftShader/llvmpipe) گذارِ GPU به‌جای کمکِ
    // فریم‌نرخ، آن را می‌کَنَد → مسیرِ ۲بعدیِ خالص (قاعده: پروفایلِ ضعیف ≥ ۴۵ فریم).
    // پرچمِ ?fx=1 تشخیص را رد می‌کند (برایِ اسکرین‌شاتِ نمونه روی رندررِ نرم)
    let renderer = "";
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    } catch { /* بی‌صدا */ }
    const forced = typeof location !== "undefined" && /[?&]fx=1\b/.test(location.search);
    if (!forced && /swiftshader|llvmpipe|software/i.test(renderer)) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      throw new Error(`لینک: ${gl.getProgramInfoLog(prog)}`);
    }
    gl.useProgram(prog);
    // مثلثِ تمام‌صفحه (سه راس کافی است)
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // texture از بومِ منبع
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uTex = gl.getUniformLocation(prog, "uTex");
    const uFog = gl.getUniformLocation(prog, "uFog");
    const uGrade = gl.getUniformLocation(prog, "uGrade");
    gl.uniform1i(uTex, 0);
    let fog = 0.42, grade = 1.0;
    gl.uniform1f(uFog, fog);
    gl.uniform1f(uGrade, grade);

    const present = () => {
      const w = src.width, h = src.height;
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    return {
      canvas,
      present,
      destroy: () => {
        try {
          gl.deleteTexture(tex);
          gl.deleteBuffer(buf);
          gl.deleteProgram(prog);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch { /* بی‌صدا */ }
      },
      setGrade: (v) => { grade = v; gl.uniform1f(uGrade, grade); },
      setFog: (v) => { fog = v; gl.uniform1f(uFog, fog); },
    };
  } catch {
    return null;
  }
}
