/* ============================================================
   КОТИКИ МАГИ 3D — частицы, всплывающие числа, сундуки,
   клетки и порталы
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  const MAXP = 1400;

  class Effects {
    constructor(game) {
      this.game = game;
      this.p = [];
      for (let i = 0; i < MAXP; i++) {
        this.p.push({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: -14, s: 0.1, life: 0, max: 1, r: 1, g2: 1, b: 1, spin: 0, rot: 0, emis: 0.6, alpha: 1, fade: true });
      }
      this.head = 0;
      this.numbers = [];
      this.shakeAmt = 0;
      this.marks = [];   // «!» и «?» над монстрами
    }

    spawn(x, y, z, vx, vy, vz, s, life, col, opt) {
      opt = opt || {};
      let tries = 0, i = this.head;
      while (this.p[i].live && tries < MAXP) { i = (i + 1) % MAXP; tries++; }
      this.head = (i + 1) % MAXP;
      const q = this.p[i];
      q.live = true;
      q.x = x; q.y = y; q.z = z;
      q.vx = vx; q.vy = vy; q.vz = vz;
      q.s = s; q.life = life; q.max = life;
      q.r = col[0]; q.g2 = col[1]; q.b = col[2];
      q.g = opt.g === undefined ? -14 : opt.g;
      q.spin = opt.spin === undefined ? (Math.random() - 0.5) * 8 : opt.spin;
      q.rot = Math.random() * 6.28;
      q.emis = opt.emis === undefined ? 0.55 : opt.emis;
      q.alpha = opt.alpha === undefined ? 1 : opt.alpha;
      q.drag = opt.drag === undefined ? 0.35 : opt.drag;
      q.grow = opt.grow || 0;
      return q;
    }

    // ---------- готовые эффекты ----------
    puff(x, y, z, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = 1 + Math.random() * 2.2;
        this.spawn(x, y + 0.12, z, Math.cos(a) * sp, 1 + Math.random() * 2.4, Math.sin(a) * sp,
          0.09 + Math.random() * 0.1, 0.45 + Math.random() * 0.3, col, { emis: 0.15 });
      }
    }
    trail(x, y, z, col) {
      this.spawn(x, y, z, 0, 0.3, 0, 0.1, 0.28, col, { g: 0, emis: 1, drag: 3, alpha: 0.9 });
    }
    hitSpark(x, y, z) {
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * 6.28, sp = 3 + Math.random() * 4;
        this.spawn(x, y, z, Math.cos(a) * sp, 1 + Math.random() * 4, Math.sin(a) * sp,
          0.07, 0.3, [1, 0.95, 0.5], { emis: 1 });
      }
    }
    explosion(x, y, z, n, col, scale) {
      scale = scale || 1;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = (2.5 + Math.random() * 6) * scale;
        const up = 1.5 + Math.random() * 5;
        this.spawn(x, y, z, Math.cos(a) * sp, up, Math.sin(a) * sp,
          (0.1 + Math.random() * 0.16) * scale, 0.6 + Math.random() * 0.6, col, { emis: 0.35 });
      }
      for (let i = 0; i < n * 0.4; i++) {
        const a = Math.random() * 6.28, sp = (1 + Math.random() * 3) * scale;
        this.spawn(x, y, z, Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp,
          0.14 * scale, 0.9, [1, 1, 1], { emis: 1, g: -4 });
      }
    }
    ring(x, y, z, r, col) {
      const n = Math.max(8, Math.floor(r * 8));
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28;
        this.spawn(x + Math.cos(a) * r * 0.3, y, z + Math.sin(a) * r * 0.3,
          Math.cos(a) * r * 2.4, 1.2, Math.sin(a) * r * 2.4,
          0.11, 0.45, col, { g: -3, emis: 0.9, drag: 2.5 });
      }
    }
    shockwave(x, y, z, r, col) {
      const n = Math.floor(r * 7);
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + Math.random() * 0.2;
        this.spawn(x, y + 0.15, z, Math.cos(a) * r * 2.2, 2 + Math.random() * 2, Math.sin(a) * r * 2.2,
          0.16, 0.6, col, { g: -8, emis: 0.8, drag: 1.6 });
      }
      this.shake(0.5);
    }
    dashBurst(x, y, z, col) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * 6.28;
        this.spawn(x, y + Math.random() * 0.5, z, Math.cos(a) * 2, Math.random() * 1.5, Math.sin(a) * 2,
          0.1, 0.35, col, { g: -2, emis: 0.4, alpha: 0.75 });
      }
    }
    hearts(x, y, z) {
      for (let i = 0; i < 5; i++) {
        this.spawn(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.6, 1.4 + Math.random(), (Math.random() - 0.5) * 0.6,
          0.11, 1.1, [1, 0.42, 0.6], { g: 0.6, emis: 0.7, drag: 0.6, spin: 0 });
      }
    }
    sparkle(x, y, z, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28;
        this.spawn(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 1.2, z + (Math.random() - 0.5) * 0.8,
          Math.cos(a) * 0.8, 1 + Math.random() * 2, Math.sin(a) * 0.8,
          0.08, 0.8, col, { g: 0.5, emis: 1, drag: 0.8 });
      }
    }
    alert(x, y, z) { this.marks.push({ x, y, z, t: 0, life: 1.1, kind: '!' }); }
    question(x, y, z) { this.marks.push({ x, y, z, t: 0, life: 1.1, kind: '?' }); }
    shake(a) { this.shakeAmt = Math.min(1.2, this.shakeAmt + a); }

    damageNumber(x, y, z, n, kind) {
      if (this.numbers.length > 60) this.numbers.shift();
      this.numbers.push({ x, y, z, n, kind, t: 0, life: 1.05, ox: (Math.random() - 0.5) * 0.5 });
    }
    text(x, y, z, str, kind) {
      this.numbers.push({ x, y, z, n: str, kind: kind || 'info', t: 0, life: 1.5, ox: 0, isText: true });
    }

    // ---------- обновление ----------
    update(dt) {
      for (let i = 0; i < MAXP; i++) {
        const q = this.p[i];
        if (!q.live) continue;
        q.life -= dt;
        if (q.life <= 0) { q.live = false; continue; }
        q.vy += q.g * dt;
        const dr = Math.pow(q.drag, dt);
        q.vx *= dr; q.vz *= dr;
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        q.rot += q.spin * dt;
        if (q.grow) q.s += q.grow * dt;
      }
      for (let i = this.numbers.length - 1; i >= 0; i--) {
        const d = this.numbers[i];
        d.t += dt;
        if (d.t >= d.life) this.numbers.splice(i, 1);
      }
      for (let i = this.marks.length - 1; i >= 0; i--) {
        const m = this.marks[i];
        m.t += dt;
        if (m.t >= m.life) this.marks.splice(i, 1);
      }
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    }

    draw(batch, batchAlpha, t) {
      for (let i = 0; i < MAXP; i++) {
        const q = this.p[i];
        if (!q.live) continue;
        const k = q.life / q.max;
        const s = q.s * (0.35 + k * 0.75);
        const a = q.alpha * Math.min(1, k * 2.2);
        const target = a < 0.99 ? batchAlpha : batch;
        target.pushBoxY(q.x, q.y, q.z, q.rot, s, s, s, q.r, q.g2, q.b, a, q.emis, 0, 0, i * 0.01);
      }
      // «!» / «?» над монстрами — из кубиков
      for (const m of this.marks) {
        const k = 1 - m.t / m.life;
        const y = m.y + m.t * 0.8;
        const col = m.kind === '!' ? [1, 0.85, 0.2] : [0.7, 0.85, 1];
        batchAlpha.pushBox(m.x, y + 0.13, m.z, 0.1, 0.26, 0.1, col[0], col[1], col[2], k, 1, 0, 0, 0);
        batchAlpha.pushBox(m.x, y - 0.09, m.z, 0.1, 0.09, 0.1, col[0], col[1], col[2], k, 1, 0, 0, 0);
      }
    }
  }

  // ============================================================
  //  ИНТЕРАКТИВНЫЕ ОБЪЕКТЫ
  // ============================================================
  const TMPM = M4.create();
  let cagedPose = null;

  const WOOD = KM.hex('#8a5a2a');
  const WOOD_D = KM.hex('#5f3d1c');
  const GOLD = KM.hex('#ffcf3a');
  const IRON = KM.hex('#8e97a8');
  const IRON_D = KM.hex('#5c6472');

  function drawChest(batch, batchAlpha, c, t) {
    const open = c.open;                    // 0..1
    const y = c.y;
    const bob = c.opened ? 0 : Math.sin(t * 2 + c.x) * 0.02;
    const yy = y + 0.28 + bob;
    // корпус
    batch.pushBoxY(c.x, yy, c.z, c.r, 0.86, 0.52, 0.62, WOOD[0], WOOD[1], WOOD[2], 1, 0, 0.5, 0, 0);
    batch.pushBoxY(c.x, yy - 0.2, c.z, c.r, 0.9, 0.12, 0.66, WOOD_D[0], WOOD_D[1], WOOD_D[2], 1, 0, 0.55, 0, 0);
    // окантовка
    const cs = Math.cos(c.r), sn = Math.sin(c.r);
    for (const sx of [-0.3, 0.3]) {
      batch.pushBoxY(c.x + cs * sx * 1.0, yy, c.z - sn * sx * 1.0, c.r, 0.1, 0.56, 0.66,
        GOLD[0] * 0.7, GOLD[1] * 0.65, GOLD[2] * 0.3, 1, 0.15, 0.4, 0, 0);
    }
    // крышка
    const ang = -open * 1.9;
    const hy = yy + 0.26;
    const hz = -0.31;
    M4.compose(TMPM, c.x + sn * hz * 0 , hy, c.z, 0, c.r, 0, 1, 1, 1);
    const lidPivotZ = -0.31;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lz = lidPivotZ + (0.31) * ca;
    const ly = (0.31) * -sa;
    const wx = c.x + sn * lz, wz = c.z + cs * lz;
    M4.compose(TMPM, wx, hy + ly + 0.1, wz, ang, c.r, 0, 0.86, 0.22, 0.62);
    batch.pushMat(TMPM, WOOD[0] * 1.1, WOOD[1] * 1.1, WOOD[2] * 1.1, 1, 0, 0.5, 0, 0);
    // замок
    if (!c.opened) {
      batch.pushBoxY(c.x + sn * 0.33, yy + 0.16, c.z + cs * 0.33, c.r, 0.16, 0.2, 0.08,
        GOLD[0], GOLD[1], GOLD[2], 1, 0.35, 0.2, 0, 0);
    } else {
      // сокровища внутри
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + t * 0.5;
        batchAlpha.pushBoxY(c.x + Math.cos(a) * 0.18, yy + 0.18 + Math.sin(t * 3 + i) * 0.05, c.z + Math.sin(a) * 0.18,
          a, 0.1, 0.1, 0.1, GOLD[0], GOLD[1], GOLD[2], 1, 0.9, 0, 0, i);
      }
    }
    // подсветка сундука, который ещё не открыт
    if (!c.opened) {
      const g = 0.4 + Math.sin(t * 3) * 0.15;
      batchAlpha.pushBox(c.x, y + 0.05, c.z, 1.5, 0.06, 1.5, GOLD[0], GOLD[1], GOLD[2], 0.2 * g, 0.9, 0, 0, 0);
    }
  }

  function drawCage(batch, batchAlpha, cage, t, game) {
    if (!cagedPose) cagedPose = new KM.vox.Pose(KM.MODELS.cat);
    const x = cage.x, y = cage.y, z = cage.z;
    const open = cage.open;                 // 0..1
    const pal = KM.CAGED_PALS[cage.palIdx % KM.CAGED_PALS.length];

    // основание
    batch.pushBox(x, y + 0.09, z, 1.7, 0.18, 1.7, IRON_D[0], IRON_D[1], IRON_D[2], 1, 0, 0.6, 0, 0);
    // прутья
    if (open < 0.98) {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28;
        const fly = open * (1.4 + (i % 3) * 0.4);
        const rr = 0.74 + fly * 2.2;
        const yy = y + 1.05 + fly * 2.6;
        const alpha = 1 - open;
        const tgt = open > 0.02 ? batchAlpha : batch;
        tgt.pushBoxY(x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr, a + open * 3,
          0.1, 1.85 * (1 - open * 0.4), 0.1, IRON[0], IRON[1], IRON[2], alpha, 0.05, 0.4, 0, i);
      }
      // верхушка
      const tgt = open > 0.02 ? batchAlpha : batch;
      tgt.pushBox(x, y + 2.02 + open * 3.2, z, 1.7 * (1 - open * 0.5), 0.18, 1.7 * (1 - open * 0.5),
        IRON_D[0], IRON_D[1], IRON_D[2], 1 - open, 0, 0.5, 0, 0);
      tgt.pushBox(x, y + 2.22 + open * 3.4, z, 0.22, 0.3, 0.22, GOLD[0], GOLD[1], GOLD[2], 1 - open, 0.5, 0.2, 0, 0);
      // замок
      if (!cage.opened) {
        batch.pushBox(x, y + 1.0, z + 0.78, 0.26, 0.3, 0.14, GOLD[0], GOLD[1], GOLD[2], 1, 0.4, 0.3, 0, 0);
        const gl = 0.35 + Math.sin(t * 3) * 0.15;
        batchAlpha.pushBox(x, y + 0.04, z, 2.4, 0.06, 2.4, 1, 0.85, 0.35, 0.22 * gl, 0.9, 0, 0, 0);
      }
    }

    // кот внутри
    const s = { t: t + cage.palIdx, walk: t * 4, walkAmt: 0, runAmt: 0, air: false, vy: 0, rest: cage.opened ? 0 : 1, attack: 0, cast: 0, hurt: 0, blink: 0 };
    if (cage.opened) {
      // радостно прыгает
      s.walkAmt = 0.2;
      s.air = (Math.sin(t * 6 + cage.palIdx) > 0.2);
      s.vy = Math.cos(t * 6) * 4;
    }
    KM.anim.cat(cagedPose, s);
    const jump = cage.opened ? Math.max(0, Math.sin(t * 6 + cage.palIdx)) * 0.4 : 0;
    const yawc = cage.opened ? t * 2.2 : Math.sin(t * 0.7) * 0.5;
    M4.trs(TMPM, x, y + 0.18 + jump, z, yawc, 0.72, 0.72, 0.72);
    KM.vox.drawModel(batch, KM.MODELS.cat, TMPM, cagedPose, { pal, alpha: 1, emis: cage.opened ? 0.22 : 0, batchAlpha });

    if (cage.opened) {
      if (Math.random() < 0.25) {
        game.fx.spawn(x + (Math.random() - 0.5) * 1.2, y + 0.6 + Math.random(), z + (Math.random() - 0.5) * 1.2,
          0, 0.8, 0, 0.08, 0.9, [1, 0.9, 0.4], { g: 0.4, emis: 1, drag: 0.8 });
      }
    }
  }

  function drawPortal(batch, batchAlpha, p, t, active) {
    const x = p.x, y = p.y, z = p.z;
    const col = active ? [0.55, 0.95, 1] : [0.4, 0.4, 0.48];
    const gem = active ? [1, 0.95, 0.6] : [0.3, 0.3, 0.36];
    const spin = active ? t * 1.1 : t * 0.15;
    const R = 1.75;
    // основание
    batch.pushBox(x, y + 0.08, z, 3.4, 0.16, 3.4, 0.35, 0.33, 0.42, 1, 0, 0.6, 0, 0);
    batch.pushBox(x, y + 0.2, z, 2.7, 0.12, 2.7, col[0] * 0.6, col[1] * 0.6, col[2] * 0.6, 1, active ? 0.4 : 0, 0.5, 0, 0);
    // арка
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * R;
      const py = y + 1.9 + Math.sin(a) * R;
      if (py < y + 0.25) continue;
      const pulse = active ? 1 + Math.sin(t * 4 - i * 0.5) * 0.18 : 1;
      batch.pushBoxY(px, py, z, a + spin, 0.3 * pulse, 0.3 * pulse, 0.34,
        col[0], col[1], col[2], 1, active ? 0.85 : 0.05, 0.25, 0, i);
    }
    // вихрь внутри
    if (active) {
      for (let i = 0; i < 22; i++) {
        const a = spin * 2.4 + i * 0.71;
        const rr = (i / 22) * R * 0.92;
        const px = x + Math.cos(a) * rr;
        const py = y + 1.9 + Math.sin(a) * rr;
        const s = 0.30 - (i / 22) * 0.18;
        batchAlpha.pushBoxY(px, py, z, a, s, s, 0.12,
          gem[0], gem[1], gem[2], 0.75, 1, 0, 0, i * 0.05);
      }
      for (let i = 0; i < 3; i++) {
        const a = t * (1.3 + i * 0.4) + i * 2;
        batchAlpha.pushBox(x + Math.cos(a) * 2.3, y + 0.6 + Math.sin(t * 2 + i) * 0.6, z + Math.sin(a) * 2.3,
          0.16, 0.16, 0.16, gem[0], gem[1], gem[2], 0.85, 1, 0, 0, i);
      }
    } else {
      // тусклые «спящие» кристаллы
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57;
        batch.pushBox(x + Math.cos(a) * 1.5, y + 0.4, z + Math.sin(a) * 1.5, 0.2, 0.5, 0.2,
          0.3, 0.3, 0.38, 1, 0, 0.4, 0, i);
      }
    }
  }

  KM.Effects = Effects;
  KM.drawChest = drawChest;
  KM.drawCage = drawCage;
  KM.drawPortal = drawPortal;
})(window);
