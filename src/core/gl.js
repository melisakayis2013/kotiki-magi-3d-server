/* ============================================================
   КОТИКИ МАГИ 3D — рендерер
   Всё рисуется инстансированными кубами. Сцена рендерится
   в низкое разрешение и растягивается NEAREST -> пиксельный вид.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const M4 = KM.M4;

  const FLOATS_PER_INST = 24; // mat4(16) + color rgba(4) + params vec4(4)

  // ---------- Геометрия единичного куба ----------
  function buildCube() {
    const faces = [
      { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
      { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
      { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
      { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }
    ];
    const verts = [], idx = [];
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    faces.forEach((f, fi) => {
      corners.forEach(([a, b]) => {
        for (let k = 0; k < 3; k++) {
          verts.push(f.n[k] * 0.5 + f.u[k] * (a - 0.5) + f.v[k] * (b - 0.5));
        }
        verts.push(f.n[0], f.n[1], f.n[2]);
        // "теневой" вес: нижние вершины чуть темнее -> дешёвое АО
        verts.push(b === 0 && f.n[1] === 0 ? 1 : 0);
      });
      const o = fi * 4;
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    });
    return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
  }

  // ---------- Шейдеры ----------
  const VS_SCENE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in float aAO;
layout(location=3) in mat4 iMat;      // 3,4,5,6
layout(location=7) in vec4 iColor;    // rgb + alpha
layout(location=8) in vec4 iParam;    // x: emissive, y: ao-сила, z: колыхание, w: сид

uniform mat4 uViewProj;
uniform float uTime;

out vec3 vNormal;
out vec4 vColor;
out vec4 vParam;
out float vAO;
out float vDist;
out vec3 vWorld;

void main(){
  vec4 wp = iMat * vec4(aPos, 1.0);
  // лёгкое колыхание (трава, листва, призраки)
  if (iParam.z > 0.001) {
    float ph = uTime * 1.7 + iParam.w * 6.283 + wp.x * 0.35 + wp.z * 0.35;
    wp.x += sin(ph) * iParam.z * max(aPos.y + 0.5, 0.0);
    wp.z += cos(ph * 0.83) * iParam.z * max(aPos.y + 0.5, 0.0);
  }
  vWorld = wp.xyz;
  vNormal = normalize(mat3(iMat) * aNormal);
  vColor = iColor;
  vParam = iParam;
  vAO = aAO;
  gl_Position = uViewProj * wp;
  vDist = gl_Position.w;
}`;

  const FS_SCENE = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec4 vColor;
in vec4 vParam;
in float vAO;
in float vDist;
in vec3 vWorld;

uniform vec3 uLightDir;
uniform vec3 uSun;
uniform vec3 uAmbTop;
uniform vec3 uAmbBot;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform float uLevels;

// Фонарик кота: пятно света, которое ездит вместе с ним.
// Нужен в пещерах, где своего света нет вовсе.
uniform vec3 uLampPos;
uniform vec3 uLampColor;
uniform vec2 uLampParam;      // x — далеко ли светит, y — насколько ярко

out vec4 outColor;

void main(){
  vec3 n = normalize(vNormal);
  float ndl = max(dot(n, uLightDir), 0.0);
  // ступенчатое (тунельно-пиксельное) освещение
  float steps = 4.0;
  ndl = floor(ndl * steps + 0.35) / steps;
  vec3 amb = mix(uAmbBot, uAmbTop, n.y * 0.5 + 0.5);
  vec3 lit = vColor.rgb * (amb + uSun * ndl);
  lit *= 1.0 - vAO * vParam.y;
  lit = mix(lit, vColor.rgb * 1.6 + vec3(0.15), vParam.x);

  // свет фонарика — до тумана, иначе он светил бы сквозь темноту
  if (uLampParam.y > 0.0) {
    vec3 toLamp = uLampPos - vWorld;
    float lampDist = length(toLamp);
    float spot = 1.0 - clamp(lampDist / max(uLampParam.x, 0.001), 0.0, 1.0);
    spot *= spot;
    // то, что повёрнуто к фонарю, светится ярче
    float face = max(dot(n, normalize(toLamp + vec3(0.0, 0.35, 0.0))), 0.0) * 0.65 + 0.35;
    lit += vColor.rgb * uLampColor * spot * face * uLampParam.y;
  }

  float f = clamp((vDist - uFogRange.x) / max(uFogRange.y - uFogRange.x, 0.001), 0.0, 1.0);
  f = f * f * (1.0 - vParam.x * 0.7);
  lit = mix(lit, uFogColor, f);

  // квантование палитры -> ретро
  lit = floor(lit * uLevels + 0.5) / uLevels;
  outColor = vec4(lit, vColor.a);
}`;

  const ZERO3 = new Float32Array([0, 0, 0]);
  const ZERO2 = new Float32Array([0, 0]);

  const VS_FULL = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS_SKY = `#version 300 es
precision highp float;
in vec2 vUV;
uniform vec3 uTop;
uniform vec3 uBot;
uniform float uLevels;
uniform float uTime;
out vec4 outColor;
void main(){
  float t = vUV.y;
  vec3 c = mix(uBot, uTop, pow(t, 0.75));
  // пиксельные "звёзды"/крапинки на верхней части
  vec2 g = floor(vUV * vec2(160.0, 100.0));
  float h = fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453);
  if (h > 0.9975 && t > 0.45) c += vec3(0.35) * (0.5 + 0.5 * sin(uTime * 2.0 + h * 30.0));
  c = floor(c * uLevels + 0.5) / uLevels;
  outColor = vec4(c, 1.0);
}`;

  const FS_POST = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uVignette;
uniform float uFlash;
uniform vec3 uFlashColor;
out vec4 outColor;
void main(){
  vec3 c = texture(uTex, vUV).rgb;
  float d = distance(vUV, vec2(0.5));
  c *= 1.0 - smoothstep(0.42, 0.95, d) * uVignette;
  c = mix(c, uFlashColor, uFlash);
  outColor = vec4(c, 1.0);
}`;

  // ---------- Утилиты компиляции ----------
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Shader: ' + gl.getShaderInfoLog(s) + '\n' + src);
    }
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Link: ' + gl.getProgramInfoLog(p));
    }
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  // ---------- Набор инстансов ----------
  class Batch {
    constructor(cap) {
      this.cap = cap;
      this.data = new Float32Array(cap * FLOATS_PER_INST);
      this.count = 0;
      this.dirty = true;
      this.vbo = null;
      this.vao = null;
    }
    clear() { this.count = 0; this.dirty = true; }
    /** Добавить куб по матрице. */
    pushMat(m, r, g, b, a, emis, ao, wob, seed) {
      if (this.count >= this.cap) return;
      const d = this.data, o = this.count * FLOATS_PER_INST;
      d[o] = m[0]; d[o + 1] = m[1]; d[o + 2] = m[2]; d[o + 3] = m[3];
      d[o + 4] = m[4]; d[o + 5] = m[5]; d[o + 6] = m[6]; d[o + 7] = m[7];
      d[o + 8] = m[8]; d[o + 9] = m[9]; d[o + 10] = m[10]; d[o + 11] = m[11];
      d[o + 12] = m[12]; d[o + 13] = m[13]; d[o + 14] = m[14]; d[o + 15] = m[15];
      d[o + 16] = r; d[o + 17] = g; d[o + 18] = b; d[o + 19] = a === undefined ? 1 : a;
      d[o + 20] = emis || 0; d[o + 21] = ao === undefined ? 0.45 : ao;
      d[o + 22] = wob || 0; d[o + 23] = seed || 0;
      this.count++; this.dirty = true;
    }
    /** Быстрый путь для осепараллельных кубов (террейн, частицы). */
    pushBox(x, y, z, sx, sy, sz, r, g, b, a, emis, ao, wob, seed) {
      if (this.count >= this.cap) return;
      const d = this.data, o = this.count * FLOATS_PER_INST;
      d[o] = sx; d[o + 1] = 0; d[o + 2] = 0; d[o + 3] = 0;
      d[o + 4] = 0; d[o + 5] = sy; d[o + 6] = 0; d[o + 7] = 0;
      d[o + 8] = 0; d[o + 9] = 0; d[o + 10] = sz; d[o + 11] = 0;
      d[o + 12] = x; d[o + 13] = y; d[o + 14] = z; d[o + 15] = 1;
      d[o + 16] = r; d[o + 17] = g; d[o + 18] = b; d[o + 19] = a === undefined ? 1 : a;
      d[o + 20] = emis || 0; d[o + 21] = ao === undefined ? 0.45 : ao;
      d[o + 22] = wob || 0; d[o + 23] = seed || 0;
      this.count++; this.dirty = true;
    }
    /** Куб с поворотом вокруг Y. */
    pushBoxY(x, y, z, ry, sx, sy, sz, r, g, b, a, emis, ao, wob, seed) {
      if (this.count >= this.cap) return;
      const c = Math.cos(ry), s = Math.sin(ry);
      const d = this.data, o = this.count * FLOATS_PER_INST;
      d[o] = c * sx; d[o + 1] = 0; d[o + 2] = -s * sx; d[o + 3] = 0;
      d[o + 4] = 0; d[o + 5] = sy; d[o + 6] = 0; d[o + 7] = 0;
      d[o + 8] = s * sz; d[o + 9] = 0; d[o + 10] = c * sz; d[o + 11] = 0;
      d[o + 12] = x; d[o + 13] = y; d[o + 14] = z; d[o + 15] = 1;
      d[o + 16] = r; d[o + 17] = g; d[o + 18] = b; d[o + 19] = a === undefined ? 1 : a;
      d[o + 20] = emis || 0; d[o + 21] = ao === undefined ? 0.45 : ao;
      d[o + 22] = wob || 0; d[o + 23] = seed || 0;
      this.count++; this.dirty = true;
    }
  }

  // ---------- Рендерер ----------
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', {
        antialias: false, alpha: false, depth: true,
        powerPreference: 'high-performance', preserveDrawingBuffer: false
      });
      if (!gl) throw new Error('WebGL2 не поддерживается этим браузером.');
      this.gl = gl;

      this.pixelScale = 3;
      this.levels = 22.0;
      this.vignette = 0.55;
      this.flash = 0;
      this.flashColor = [1, 1, 1];

      this.progScene = program(gl, VS_SCENE, FS_SCENE);
      this.progSky = program(gl, VS_FULL, FS_SKY);
      this.progPost = program(gl, VS_FULL, FS_POST);

      // геометрия куба
      const cube = buildCube();
      this.cubeVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVBO);
      gl.bufferData(gl.ARRAY_BUFFER, cube.verts, gl.STATIC_DRAW);
      this.cubeIBO = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.idx, gl.STATIC_DRAW);
      this.cubeIndexCount = cube.idx.length;

      // полноэкранный треугольник-квад
      this.quadVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.quadVAO = gl.createVertexArray();
      gl.bindVertexArray(this.quadVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
      gl.bindVertexArray(null);

      this.viewProj = M4.create();
      this.proj = M4.create();
      this.view = M4.create();

      this.fbo = null; this.tex = null; this.rbo = null;
      this.rw = 0; this.rh = 0;
      this.resize();
    }

    /** Создать VAO для набора инстансов. */
    prepare(batch) {
      const gl = this.gl;
      if (batch.vao) return;
      batch.vbo = gl.createBuffer();
      batch.vao = gl.createVertexArray();
      gl.bindVertexArray(batch.vao);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVBO);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIBO);

      gl.bindBuffer(gl.ARRAY_BUFFER, batch.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, batch.data.byteLength, gl.DYNAMIC_DRAW);
      const stride = FLOATS_PER_INST * 4;
      for (let i = 0; i < 4; i++) {
        const loc = 3 + i;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, i * 16);
        gl.vertexAttribDivisor(loc, 1);
      }
      gl.enableVertexAttribArray(7);
      gl.vertexAttribPointer(7, 4, gl.FLOAT, false, stride, 64);
      gl.vertexAttribDivisor(7, 1);
      gl.enableVertexAttribArray(8);
      gl.vertexAttribPointer(8, 4, gl.FLOAT, false, stride, 80);
      gl.vertexAttribDivisor(8, 1);

      gl.bindVertexArray(null);
    }

    resize() {
      const gl = this.gl;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.floor(this.canvas.clientWidth * dpr));
      const h = Math.max(180, Math.floor(this.canvas.clientHeight * dpr));
      this.canvas.width = w; this.canvas.height = h;
      const rw = Math.max(160, Math.floor(w / this.pixelScale));
      const rh = Math.max(90, Math.floor(h / this.pixelScale));
      if (rw === this.rw && rh === this.rh && this.fbo) return;
      this.rw = rw; this.rh = rh;

      if (this.fbo) { gl.deleteFramebuffer(this.fbo); gl.deleteTexture(this.tex); gl.deleteRenderbuffer(this.rbo); }
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, rw, rh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.rbo = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbo);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, rw, rh);

      this.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rbo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    setCamera(fov, near, far, ex, ey, ez, tx, ty, tz) {
      M4.perspective(this.proj, fov, this.rw / this.rh, near, far);
      M4.lookAt(this.view, ex, ey, ez, tx, ty, tz, 0, 1, 0);
      M4.mul(this.viewProj, this.proj, this.view);
      this.camPos = [ex, ey, ez];
    }

    beginScene(env, time) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.rw, this.rh);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      // небо
      gl.disable(gl.DEPTH_TEST);
      const s = this.progSky;
      gl.useProgram(s.p);
      gl.uniform3fv(s.u.uTop, env.skyTop);
      gl.uniform3fv(s.u.uBot, env.skyBot);
      gl.uniform1f(s.u.uLevels, this.levels);
      gl.uniform1f(s.u.uTime, time);
      gl.bindVertexArray(this.quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const p = this.progScene;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uViewProj, false, this.viewProj);
      gl.uniform3fv(p.u.uLightDir, env.lightDir);
      gl.uniform3fv(p.u.uSun, env.sun);
      gl.uniform3fv(p.u.uAmbTop, env.ambTop);
      gl.uniform3fv(p.u.uAmbBot, env.ambBot);
      gl.uniform3fv(p.u.uFogColor, env.fogColor);
      gl.uniform2fv(p.u.uFogRange, env.fogRange);
      gl.uniform1f(p.u.uLevels, this.levels);
      gl.uniform1f(p.u.uTime, time);
      const l = env.lamp;
      gl.uniform3fv(p.u.uLampPos, l ? l.pos : ZERO3);
      gl.uniform3fv(p.u.uLampColor, l ? l.color : ZERO3);
      gl.uniform2fv(p.u.uLampParam, l ? l.param : ZERO2);
    }

    draw(batch, transparent) {
      if (!batch.count) return;
      const gl = this.gl;
      this.prepare(batch);
      if (batch.dirty) {
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.data, 0, batch.count * FLOATS_PER_INST);
        batch.dirty = false;
      }
      if (transparent) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
      } else {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
      }
      gl.bindVertexArray(batch.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, this.cubeIndexCount, gl.UNSIGNED_SHORT, 0, batch.count);
      gl.bindVertexArray(null);
      if (transparent) { gl.depthMask(true); gl.disable(gl.BLEND); }
    }

    endScene() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      const p = this.progPost;
      gl.useProgram(p.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.uniform1i(p.u.uTex, 0);
      gl.uniform2f(p.u.uRes, this.rw, this.rh);
      gl.uniform1f(p.u.uVignette, this.vignette);
      gl.uniform1f(p.u.uFlash, this.flash);
      gl.uniform3fv(p.u.uFlashColor, this.flashColor);
      gl.bindVertexArray(this.quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    }
  }

  KM.Batch = Batch;
  KM.Renderer = Renderer;
  KM.FLOATS_PER_INST = FLOATS_PER_INST;
})(window);
