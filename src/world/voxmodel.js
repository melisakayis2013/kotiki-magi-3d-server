/* ============================================================
   КОТИКИ МАГИ 3D — воксельные модели с иерархией и анимацией
   Модель = список деталей-кубов. У каждой детали свой pivot,
   смещение, размер и цвет (или ключ палитры).
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const M4 = KM.M4;

  // Пул матриц, чтобы не выделять память каждый кадр
  const POOL = [];
  for (let i = 0; i < 256; i++) POOL.push(M4.create());
  const TMP_A = M4.create(), TMP_B = M4.create(), TMP_C = M4.create();

  /**
   * part: {
   *   name, parent, pivot:[x,y,z], off:[x,y,z], size:[x,y,z],
   *   ck:'ключПалитры' | color:[r,g,b],
   *   alpha, emis, ao, wob, hideIf:'флаг'
   * }
   */
  function defineModel(parts, meta) {
    const compiled = [];
    const index = Object.create(null);
    parts.forEach((p, i) => {
      const c = {
        name: p.name,
        parentIdx: p.parent === undefined ? -1 : (index[p.parent] === undefined ? -1 : index[p.parent]),
        px: (p.pivot && p.pivot[0]) || 0, py: (p.pivot && p.pivot[1]) || 0, pz: (p.pivot && p.pivot[2]) || 0,
        ox: (p.off && p.off[0]) || 0, oy: (p.off && p.off[1]) || 0, oz: (p.off && p.off[2]) || 0,
        sx: p.size ? p.size[0] : 0, sy: p.size ? p.size[1] : 0, sz: p.size ? p.size[2] : 0,
        ck: p.ck || null,
        color: p.color || null,
        alpha: p.alpha === undefined ? 1 : p.alpha,
        emis: p.emis || 0,
        ao: p.ao === undefined ? 0.45 : p.ao,
        wob: p.wob || 0,
        tag: p.tag || null,
        noDraw: !p.size
      };
      index[p.name] = i;
      compiled.push(c);
    });
    const m = { parts: compiled, index, meta: meta || {} };
    m.height = meta && meta.height ? meta.height : 1;
    return m;
  }

  const STRIDE = 10; // rx,ry,rz, tx,ty,tz, sx,sy,sz, hidden

  /** Поза детали: поворот, сдвиг, масштаб, скрытие. */
  class Pose {
    constructor(model) {
      this.model = model;
      this.n = model.parts.length;
      this.data = new Float32Array(this.n * STRIDE);
      this.reset();
    }
    reset() {
      const d = this.data;
      for (let i = 0; i < this.n; i++) {
        const o = i * STRIDE;
        d[o] = 0; d[o + 1] = 0; d[o + 2] = 0;
        d[o + 3] = 0; d[o + 4] = 0; d[o + 5] = 0;
        d[o + 6] = 1; d[o + 7] = 1; d[o + 8] = 1; d[o + 9] = 0;
      }
    }
    idx(name) { const i = this.model.index[name]; return i === undefined ? -1 : i; }
    rot(name, rx, ry, rz) {
      const i = this.idx(name); if (i < 0) return;
      const o = i * STRIDE; this.data[o] = rx || 0; this.data[o + 1] = ry || 0; this.data[o + 2] = rz || 0;
    }
    addRot(name, rx, ry, rz) {
      const i = this.idx(name); if (i < 0) return;
      const o = i * STRIDE; this.data[o] += rx || 0; this.data[o + 1] += ry || 0; this.data[o + 2] += rz || 0;
    }
    move(name, tx, ty, tz) {
      const i = this.idx(name); if (i < 0) return;
      const o = i * STRIDE; this.data[o + 3] = tx || 0; this.data[o + 4] = ty || 0; this.data[o + 5] = tz || 0;
    }
    scale(name, sx, sy, sz) {
      const i = this.idx(name); if (i < 0) return;
      const o = i * STRIDE; this.data[o + 6] = sx; this.data[o + 7] = sy === undefined ? sx : sy; this.data[o + 8] = sz === undefined ? sx : sz;
    }
    hide(name, v) {
      const i = this.idx(name); if (i < 0) return;
      this.data[i * STRIDE + 9] = v ? 1 : 0;
    }
  }

  /**
   * Нарисовать модель.
   * world  — Float32Array(16) мировая матрица (позиция/поворот/масштаб сущности)
   * pose   — Pose или null
   * opts   — { pal, alpha, emis, tint:[r,g,b,t], batch, batchAlpha }
   */
  function drawModel(batch, model, world, pose, opts) {
    opts = opts || {};
    const pal = opts.pal || model.meta.pal || {};
    const gAlpha = opts.alpha === undefined ? 1 : opts.alpha;
    const gEmis = opts.emis || 0;
    const tint = opts.tint || null;
    const parts = model.parts;
    const pd = pose ? pose.data : null;
    const alphaBatch = opts.batchAlpha || null;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      let rx = 0, ry = 0, rz = 0, tx = 0, ty = 0, tz = 0, sx = 1, sy = 1, sz = 1, hidden = 0;
      if (pd) {
        const o = i * STRIDE;
        rx = pd[o]; ry = pd[o + 1]; rz = pd[o + 2];
        tx = pd[o + 3]; ty = pd[o + 4]; tz = pd[o + 5];
        sx = pd[o + 6]; sy = pd[o + 7]; sz = pd[o + 8]; hidden = pd[o + 9];
      }
      // узел: pivot + поворот + масштаб узла (наследуется детьми)
      M4.compose(TMP_A, p.px + tx, p.py + ty, p.pz + tz, rx, ry, rz, sx, sy, sz);
      const parent = p.parentIdx < 0 ? world : POOL[p.parentIdx];
      M4.mul(POOL[i], parent, TMP_A);
      if (hidden || p.noDraw) continue;

      M4.compose(TMP_B, p.ox, p.oy, p.oz, 0, 0, 0, p.sx, p.sy, p.sz);
      M4.mul(TMP_C, POOL[i], TMP_B);

      let col = p.ck ? (pal[p.ck] || [1, 0, 1]) : p.color;
      let r = col[0], g = col[1], b = col[2];
      if (tint) {
        const t = tint[3];
        r += (tint[0] - r) * t; g += (tint[1] - g) * t; b += (tint[2] - b) * t;
      }
      const a = p.alpha * gAlpha;
      const e = Math.min(1, p.emis + gEmis);
      const target = (a < 0.999 && alphaBatch) ? alphaBatch : batch;
      target.pushMat(TMP_C, r, g, b, a, e, p.ao, p.wob, (i * 0.137) % 1);
    }
  }

  /** Получить мировую позицию детали после последнего drawModel (для эффектов). */
  function partPos(model, name, out) {
    const i = model.index[name];
    if (i === undefined) return null;
    const m = POOL[i];
    out[0] = m[12]; out[1] = m[13]; out[2] = m[14];
    return out;
  }

  KM.vox = { defineModel, Pose, drawModel, partPos };
})(window);
