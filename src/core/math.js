/* ============================================================
   КОТИКИ МАГИ 3D — математика (mat4, vec3, RNG, шум)
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM || (global.KM = {});

  // ---------- Mat4 (column-major, как в WebGL) ----------
  const M4 = {
    create() { const o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; },

    identity(o) {
      o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
      o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0;
      o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
      return o;
    },

    copy(o, a) { o.set(a); return o; },

    mul(o, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      o[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      o[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      o[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      o[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return o;
    },

    /** Собрать матрицу: T(px,py,pz) * Ry(ry) * Rx(rx) * Rz(rz) * S(sx,sy,sz) */
    compose(o, px, py, pz, rx, ry, rz, sx, sy, sz) {
      const cx = Math.cos(rx), sX = Math.sin(rx);
      const cy = Math.cos(ry), sY = Math.sin(ry);
      const cz = Math.cos(rz), sZ = Math.sin(rz);
      const m00 = cy * cz + sY * sX * sZ;
      const m01 = -cy * sZ + sY * sX * cz;
      const m02 = sY * cx;
      const m10 = cx * sZ;
      const m11 = cx * cz;
      const m12 = -sX;
      const m20 = -sY * cz + cy * sX * sZ;
      const m21 = sY * sZ + cy * sX * cz;
      const m22 = cy * cx;
      o[0] = m00 * sx; o[1] = m10 * sx; o[2] = m20 * sx; o[3] = 0;
      o[4] = m01 * sy; o[5] = m11 * sy; o[6] = m21 * sy; o[7] = 0;
      o[8] = m02 * sz; o[9] = m12 * sz; o[10] = m22 * sz; o[11] = 0;
      o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
      return o;
    },

    /** Быстрый путь: только позиция + поворот вокруг Y + масштаб. */
    trs(o, px, py, pz, ry, sx, sy, sz) {
      const c = Math.cos(ry), s = Math.sin(ry);
      o[0] = c * sx; o[1] = 0; o[2] = -s * sx; o[3] = 0;
      o[4] = 0; o[5] = sy; o[6] = 0; o[7] = 0;
      o[8] = s * sz; o[9] = 0; o[10] = c * sz; o[11] = 0;
      o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
      return o;
    },

    perspective(o, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
      o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
      o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
      return o;
    },

    lookAt(o, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
      let zx = ex - cx, zy = ey - cy, zz = ez - cz;
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len; zy /= len; zz /= len;
      let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
      len = Math.hypot(xx, xy, xz);
      if (len < 1e-6) { xx = 1; xy = 0; xz = 0; } else { xx /= len; xy /= len; xz /= len; }
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
      o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
      o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
      o[12] = -(xx * ex + xy * ey + xz * ez);
      o[13] = -(yx * ex + yy * ey + yz * ez);
      o[14] = -(zx * ex + zy * ey + zz * ez);
      o[15] = 1;
      return o;
    },

    /** Проекция мировой точки на экран. out = [x, y, visible] в NDC-пикселях. */
    project(vp, x, y, z, out) {
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.0001) { out[2] = 0; return out; }
      out[0] = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw;
      out[1] = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw;
      out[2] = 1;
      return out;
    }
  };

  // ---------- Утилиты ----------
  const U = {
    clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth: (t) => t * t * (3 - 2 * t),
    /** Плавное приближение независимо от FPS. */
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    /** Кратчайшая разница углов. */
    angDiff(a, b) {
      let d = (b - a) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; },
    dist(ax, az, bx, bz) { return Math.sqrt(U.dist2(ax, az, bx, bz)); }
  };

  // ---------- Детерминированный RNG (mulberry32) ----------
  function makeRNG(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    return r;
  }

  // ---------- Value noise / fBm ----------
  function makeNoise(seed) {
    const perm = new Uint8Array(512);
    const rnd = makeRNG(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    function grad(hash, x, y) {
      switch (hash & 3) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        default: return -x - y;
      }
    }
    function noise2(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = U.smooth(xf), v = U.smooth(yf);
      const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
      const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
      const x1 = U.lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const x2 = U.lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return U.lerp(x1, x2, v) * 0.7;
    }
    function fbm(x, y, oct, lac, gain) {
      oct = oct || 4; lac = lac || 2; gain = gain || 0.5;
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < oct; i++) {
        sum += noise2(x * freq, y * freq) * amp;
        norm += amp; amp *= gain; freq *= lac;
      }
      return sum / norm;
    }
    return { noise2, fbm };
  }

  KM.M4 = M4;
  KM.U = U;
  KM.makeRNG = makeRNG;
  KM.makeNoise = makeNoise;
})(window);
