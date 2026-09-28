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

export interface PostFX {
  /** بومِ WebGL که فریمِ پردازش‌شده در آن است */
  canvas: HTMLCanvasElement;
  /** texture را از بومِ منبع تازه می‌کند و مسیرِ GPU را اجرا می‌کند */
  present: () => void;
  destroy: () => void;
  /** شدتِ اثرها (۰ = خاموش) — برای تنظیم و تست */
  setGrade: (v: number) => void;
  setFog: (v: number) => void;
  setWaterMask: (cv: HTMLCanvasElement) => void;
  update: (u: { time: number; part: [number, number, number]; ox: number; oy: number; k: number; sw: number; sh: number; dark: number; dusk: number; cloud: number; skyT: number; lutV: number }) => void;
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

/**
 * C/T1: آیا WebGL روی رندررِ نرم‌افزاری است؟ (SwiftShader/llvmpipe/ANGLE Software)
 * حلقه‌ی بازی با این کفِ رزولوشن را انتخاب می‌کند: روی GPU واقعی تیز (۰.۹)،
 * روی نرم‌افزاری روان (۰.۷۲) — هر دو از راهِ سازگارسازی خودکار به همان مقصد می‌رسند.
 */
export function isSoftwareGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    return /swiftshader|llvmpipe|software/i.test(r);
  } catch {
    return false;
  }
}

import { BRIGHT, BLUR, FRAG, VERT, buildLutCanvas } from "./fxgl";

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
    const forced = typeof location !== "undefined" && /[?&]fx=1\b/.test(location.search);
    if (!forced && isSoftwareGL()) return null;
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
    const linkProg = (fsSrc: string) => {
      const pr = gl.createProgram();
      if (!pr) return null;
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;
      gl.attachShader(pr, vs);
      gl.attachShader(pr, fs);
      gl.linkProgram(pr);
      return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
    };
    const brightProg = linkProg(BRIGHT);
    const blurProg = linkProg(BLUR);
    if (!brightProg || !blurProg) return null;
    const mkTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const bA = mkTex(), bB = mkTex();
    const fA = gl.createFramebuffer(), fB = gl.createFramebuffer();
    const ltex = mkTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildLutCanvas());
    const uBloom = gl.getUniformLocation(prog, "uBloom");
    const uLutRow = gl.getUniformLocation(prog, "uLutRow");
    const uLut = gl.getUniformLocation(prog, "uLut");
    const brTex = brightProg ? gl.getUniformLocation(brightProg, "uTex") : null;
    const blTex = gl.getUniformLocation(blurProg, "uTex");
    const blDir = gl.getUniformLocation(blurProg, "uDir");
    gl.uniform1i(uBloom, 2);
    gl.uniform1i(uLut, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, ltex);
    gl.activeTexture(gl.TEXTURE0);
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
    const uWaterTex = gl.getUniformLocation(prog, "uWaterTex");
    const uWaterOn = gl.getUniformLocation(prog, "uWaterOn");
    const uPart = gl.getUniformLocation(prog, "uPart");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uCam = gl.getUniformLocation(prog, "uCam");
    const uScreen = gl.getUniformLocation(prog, "uScreen");
    const uSky = gl.getUniformLocation(prog, "uSky");
    gl.uniform1i(uTex, 0);
    gl.uniform1i(uWaterTex, 1);
    let fog = 0.42, grade = 1.0;
    gl.uniform1f(uFog, fog);
    gl.uniform1f(uGrade, grade);
    const wtex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, wtex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.activeTexture(gl.TEXTURE0);

    const attach = (f: WebGLFramebuffer | null, t: WebGLTexture | null, w: number, h: number) => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    };
    let hw = 0, hh = 0;
    const present = () => {
      const w = src.width, h = src.height;
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      const nw = Math.max(2, w >> 1), nh = Math.max(2, h >> 1);
      if (brightProg && gl.getProgramParameter(brightProg, gl.LINK_STATUS)) {
        if (nw !== hw || nh !== hh) { hw = nw; hh = nh; attach(fA, bA, hw, hh); attach(fB, bB, hw, hh); }
        gl.useProgram(brightProg);
        gl.uniform1i(brTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fA);
        gl.viewport(0, 0, hw, hh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.useProgram(blurProg);
        gl.uniform1i(blTex, 0);
        gl.bindTexture(gl.TEXTURE_2D, bA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fB);
        gl.uniform2f(blDir, 1 / hw, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, bB);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fA);
        gl.uniform2f(blDir, 0, 1 / hh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, bA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    return {
      canvas,
      present,
      destroy: () => {
        try {
          gl.deleteTexture(tex);
          gl.deleteTexture(wtex);
          gl.deleteTexture(bA);
          gl.deleteTexture(bB);
          gl.deleteTexture(ltex);
          gl.deleteFramebuffer(fA);
          gl.deleteFramebuffer(fB);
          gl.deleteBuffer(buf);
          gl.deleteProgram(prog);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch { /* بی‌صدا */ }
      },
      setGrade: (v) => { grade = v; gl.uniform1f(uGrade, grade); },
      setFog: (v) => { fog = v; gl.uniform1f(uFog, fog); },
      setWaterMask: (cv) => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, wtex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.uniform1f(uWaterOn, 1);
        gl.activeTexture(gl.TEXTURE0);
      },
      update: (u) => {
        gl.uniform3f(uPart, u.part[0], u.part[1], u.part[2]);
        gl.uniform1f(uTime, u.time);
        gl.uniform4f(uCam, u.ox, u.oy, u.k, 0);
        gl.uniform2f(uScreen, u.sw, u.sh);
        gl.uniform4f(uSky, u.dark, u.dusk, u.cloud, u.skyT);
        gl.uniform1f(uLutRow, u.lutV);
      },
    };
  } catch {
    return null;
  }
}
