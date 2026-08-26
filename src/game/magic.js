/* ============================================================
   КОТИКИ МАГИ 3D — тучи, облачные платформы и телекинез
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  // ============================================================
  //  ТУЧА  (грозовая или дождевая; может следовать за котом)
  // ============================================================
  class Cloud {
    constructor(game, kind, x, y, z, opts) {
      opts = opts || {};
      this.game = game;
      this.kind = kind;                 // 'storm' | 'rain'
      this.x = x; this.z = z;
      this.baseY = y;
      this.y = y + (opts.height || 7.5);
      this.radius = opts.radius || (kind === 'storm' ? 7 : 6);
      this.life = opts.life || 9;
      this.maxLife = this.life;
      this.dmg = opts.dmg || 30;
      this.heal = opts.heal || 0;
      this.follow = !!opts.follow;
      this.t = 0;
      this.strikeT = 0.6;
      this.tick = 0;
      this.flash = 0;
      this.dead = false;
      this.seed = Math.random() * 6.28;

      // форма тучи — кучка кубиков
      const rng = KM.makeRNG(Math.floor(x * 71 + z * 131 + 5));
      this.puffs = [];
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, r = Math.sqrt(rng()) * this.radius * 0.85;
        this.puffs.push({
          dx: Math.cos(a) * r, dz: Math.sin(a) * r * 0.8,
          dy: (rng() - 0.5) * 1.1,
          s: 1.1 + rng() * 1.5, ph: rng() * 6.28
        });
      }
    }

    update(dt) {
      this.t += dt; this.life -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      this.flash = Math.max(0, this.flash - dt * 3.5);

      const g = this.game, p = g.player;

      // грозовая туча зова бури летит за котом
      if (this.follow) {
        this.x = U.damp(this.x, p.x, 1.6, dt);
        this.z = U.damp(this.z, p.z, 1.6, dt);
        const gh = g.level.groundAt(this.x, this.z);
        if (gh > -900) this.y = U.damp(this.y, gh + 8.5, 2, dt);
      }

      if (this.kind === 'storm') {
        this.strikeT -= dt;
        if (this.strikeT <= 0) {
          this.strikeT = 0.85 + Math.random() * 0.7;
          this.strike();
        }
      } else {
        // ---- дождь ----
        this.tick -= dt;
        const doTick = this.tick <= 0;
        if (doTick) this.tick = 0.5;

        // капли
        const drops = Math.floor(dt * 90);
        for (let i = 0; i < drops; i++) {
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * this.radius;
          const px = this.x + Math.cos(a) * r, pz = this.z + Math.sin(a) * r;
          g.fx.spawn(px, this.y - 1.2, pz, 0, -11, 0, 0.055, 0.75,
            [0.6, 0.85, 1], { g: -3, emis: 0.5, drag: 1, alpha: 0.7 });
        }

        if (doTick) {
          const r2 = this.radius * this.radius;
          // лечит кота и питомцев
          if (U.dist2(this.x, this.z, p.x, p.z) < r2) {
            p.hp = Math.min(p.maxHp, p.hp + this.heal * 0.5);
            p.effects.burn = 0;
            if (Math.random() < 0.4) g.fx.hearts(p.x, p.y + 1, p.z);
          }
          // мочит врагов: замедление и лёгкий урон
          for (const m of g.monsters) {
            if (!m.alive) continue;
            if (U.dist2(this.x, this.z, m.x, m.z) > r2) continue;
            m.effects.slow = Math.max(m.effects.slow, 1.2);
            m.effects.burn = 0;
            m.effects.vuln = Math.max(m.effects.vuln, 1.2);
            if (!this.ghost) m.hurt(this.dmg * 0.25, 'water', true);
          }
          // дождь мочит и чужих котов
          if (!this.ghost) g.splashPeers(this.x, this.baseY, this.z, this.radius, this.dmg * 0.25, 'water');
          // гасит пожары
          for (const z of g.zones) {
            if (z.kind === 'fire' && U.dist2(this.x, this.z, z.x, z.z) < r2) z.life -= 1.6;
          }
        }
      }
    }

    /** Настоящая молния из тучи в цель под ней. */
    strike() {
      const g = this.game;
      const r2 = this.radius * this.radius;
      let target = null, best = 1e9;
      for (const m of g.monsters) {
        if (!m.alive) continue;
        const d = U.dist2(this.x, this.z, m.x, m.z);
        if (d < r2 && d < best) { best = d; target = m; }
      }
      // под тучей может стоять и чужой кот — молния бьёт и в него
      if (g.serverMode && g.net) {
        for (const pr of g.net.peers.values()) {
          if (pr.dead || pr.anim === 'dead') continue;
          const d = U.dist2(this.x, this.z, pr.x, pr.z);
          if (d < r2 && d < best) { best = d; target = { x: pr.x, y: pr.y, z: pr.z, height: 1.2 }; }
        }
      }
      let tx, ty, tz;
      if (target) {
        tx = target.x; ty = target.y + target.height * 0.5; tz = target.z;
      } else {
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * this.radius;
        tx = this.x + Math.cos(a) * r; tz = this.z + Math.sin(a) * r;
        ty = g.level.groundAt(tx, tz);
        if (ty < -900) return;
      }

      this.flash = 1;
      // зигзаг молнии из кубиков
      const seg = 14;
      let px = this.x + (Math.random() - 0.5) * 2, py = this.y - 1, pz = this.z + (Math.random() - 0.5) * 2;
      for (let i = 1; i <= seg; i++) {
        const k = i / seg;
        const nx = U.lerp(px, tx, 0.55) + (Math.random() - 0.5) * 1.5 * (1 - k);
        const ny = U.lerp(py, ty, 0.55);
        const nz = U.lerp(pz, tz, 0.55) + (Math.random() - 0.5) * 1.5 * (1 - k);
        g.fx.spawn(nx, ny, nz, 0, 0, 0, 0.2 - k * 0.09, 0.22, [1, 1, 0.75],
          { g: 0, emis: 1, drag: 1, spin: 0 });
        px = nx; py = ny; pz = nz;
      }
      g.fx.explosion(tx, ty, tz, 14, [1, 0.95, 0.6], 1.1);
      g.fx.ring(tx, g.level.groundAt(tx, tz) + 0.1, tz, 2.6, [1, 0.95, 0.5]);
      g.audio.sfxAt('thunder', tx, ty, tz, 60);
      g.fx.shake(0.28);

      // урон по всем рядом с точкой удара
      for (const m of g.monsters) {
        if (!m.alive) continue;
        const d = U.dist(tx, tz, m.x, m.z);
        if (d > 2.8) continue;
        const inWater = g.zones.some(z => (z.kind === 'water' || z.kind === 'mist') && !z.dead &&
          U.dist2(z.x, z.z, m.x, m.z) < z.radius * z.radius);
        if (!this.ghost) m.hurt(this.dmg * (inWater ? 2 : 1) * (1 - d / 4), 'air', true);
        m.effects.stun = Math.max(m.effects.stun, 0.8);
      }
      // молния лупит по месту удара — котам достаётся так же, как монстрам
      if (!this.ghost) g.splashPeers(tx, ty, tz, 2.8, this.dmg, 'air');
    }

    draw(batch, batchAlpha, t) {
      const fade = U.clamp(this.life / 1.2, 0, 1) * U.clamp(this.t / 0.5, 0, 1);
      const storm = this.kind === 'storm';
      const base = storm ? [0.32, 0.34, 0.44] : [0.62, 0.68, 0.80];
      const lit = this.flash;
      for (const q of this.puffs) {
        const bob = Math.sin(t * 0.9 + q.ph) * 0.22;
        const s = q.s * fade;
        const c = [
          base[0] + lit * 0.75 + Math.sin(q.ph) * 0.03,
          base[1] + lit * 0.75 + Math.sin(q.ph * 1.3) * 0.03,
          base[2] + lit * 0.6
        ];
        batchAlpha.pushBoxY(this.x + q.dx, this.y + q.dy + bob, this.z + q.dz,
          q.ph + t * 0.15, s, s * 0.62, s, c[0], c[1], c[2],
          0.9, lit * 0.9, 0.15, 0, q.ph * 0.1);
      }
      // тёмное брюхо тучи
      batchAlpha.pushBox(this.x, this.y - 0.85, this.z,
        this.radius * 1.7 * fade, 0.7, this.radius * 1.5 * fade,
        base[0] * 0.6 + lit * 0.5, base[1] * 0.6 + lit * 0.5, base[2] * 0.7 + lit * 0.4,
        0.75, lit * 0.7, 0.2, 0, 0);
    }
  }

  // ============================================================
  //  ТЕЛЕКИНЕЗ — поднять врага и швырнуть
  // ============================================================
  class TeleGrab {
    constructor(game, target, dmg) {
      this.game = game;
      this.target = target;
      this.dmg = dmg;
      this.t = 0;
      this.phase = 'lift';       // lift -> hold -> throw
      this.dead = false;
      this.startY = target.y;
      this.thrown = false;
      game.audio.sfxAt('cast', target.x, target.y, target.z, 40);
    }

    update(dt) {
      const m = this.target, g = this.game;
      if (!m || !m.alive) { this.dead = true; return; }
      this.t += dt;

      if (this.phase !== 'throw') {
        m.holdT = 0.25;
        m.vy = 0;
        m.yaw += dt * 5;
        const gh = g.level.groundAt(m.x, m.z);
        const targetY = (gh > -900 ? gh : this.startY) + 3.4;
        m.y = U.damp(m.y, targetY, 5, dt);
        // фиолетовые искры вокруг
        if (Math.random() < dt * 22) {
          const a = Math.random() * 6.28, r = m.radius + 0.5;
          g.fx.spawn(m.x + Math.cos(a) * r, m.y + Math.random() * m.height, m.z + Math.sin(a) * r,
            -Math.cos(a) * 2, 0.5, -Math.sin(a) * 2, 0.09, 0.4, [0.75, 0.4, 1],
            { g: 0, emis: 1, drag: 1 });
        }
        if (this.t > 0.7) {
          // швыряем туда, куда наведён курсор
          const aim = g.getAim();
          let dx = aim.px - m.x, dy = (aim.py + 1) - m.y, dz = aim.pz - m.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const power = 26;
          m.holdT = 0;
          m.vx = dx / d * power; m.vy = Math.max(4, dy / d * power * 0.5 + 5); m.vz = dz / d * power;
          if (!this.ghost) m.hurt(this.dmg, 'arcane', true);
          if (!this.ghost) g.splashPeers(m.x, m.y, m.z, 2.0, this.dmg * 0.8, 'arcane');
          this.phase = 'throw';
          this.thrown = true;
          g.audio.sfxAt('dash', m.x, m.y, m.z, 40);
          g.fx.explosion(m.x, m.y + 0.4, m.z, 12, [0.8, 0.45, 1], 1);
        }
        return;
      }

      // летит — бьёт всех, кого задел, и разбивается о землю
      const gh = g.level.groundAt(m.x, m.z);
      if (this.t > 2.6 || (gh > -900 && m.y <= gh + 0.1 && m.vy <= 0)) {
        g.fx.explosion(m.x, m.y + 0.3, m.z, 18, [0.8, 0.45, 1], 1.3);
        g.fx.shockwave(m.x, gh > -900 ? gh : m.y, m.z, 3.2, [0.9, 0.6, 1]);
        g.audio.sfxAt('hit', m.x, m.y, m.z, 40);
        g.fx.shake(0.25);
        for (const o of g.monsters) {
          if (!o.alive || o === m) continue;
          if (U.dist(o.x, o.z, m.x, m.z) < 3.2) o.hurt(this.dmg * 0.6, 'arcane', true, { x: m.x, z: m.z, p: 8 });
        }
        if (m.alive && !this.ghost) m.hurt(this.dmg * 0.8, 'arcane', true);
        if (!this.ghost) g.splashPeers(m.x, m.y, m.z, 3.2, this.dmg * 0.6, 'arcane');
        if (!this.ghost) g.fx.shockwave(m.x, m.y, m.z, 3.2, [0.7, 0.5, 1]);
        this.dead = true;
      }
    }

    draw(batch, batchAlpha, t) {
      const m = this.target;
      if (!m || !m.alive || this.phase === 'throw') return;
      // кольцо телекинеза вокруг жертвы
      for (let i = 0; i < 12; i++) {
        const a = t * 3 + i * 0.523;
        const r = m.radius + 0.75;
        batchAlpha.pushBoxY(m.x + Math.cos(a) * r, m.y + m.height * 0.5 + Math.sin(a * 2 + t * 2) * 0.4,
          m.z + Math.sin(a) * r, a * 2, 0.13, 0.13, 0.13,
          0.8, 0.45, 1, 0.9, 1, 0, 0, i * 0.1);
      }
    }
  }

  // ============================================================
  //  ОБЛАЧНАЯ ПЛАТФОРМА
  // ============================================================
  function makePlatform(game, x, y, z, r, life) {
    const rng = KM.makeRNG(Math.floor(x * 37 + z * 61 + y * 11));
    const puffs = [];
    for (let i = 0; i < 9; i++) {
      const a = rng() * 6.28, rr = Math.sqrt(rng()) * r * 0.75;
      puffs.push({ dx: Math.cos(a) * rr, dz: Math.sin(a) * rr, dy: (rng() - 0.5) * 0.18, s: r * (0.5 + rng() * 0.4), ph: rng() * 6.28 });
    }
    return { x, y, z, r, h: 0.4, life, maxLife: life, puffs, t: 0 };
  }

  function drawPlatform(pl, batch, batchAlpha, t) {
    const fade = U.clamp(pl.life / 1.0, 0, 1) * U.clamp(pl.t / 0.18, 0, 1);
    for (const q of pl.puffs) {
      const s = q.s * fade;
      const bob = Math.sin(t * 1.8 + q.ph) * 0.05;
      batch.pushBoxY(pl.x + q.dx, pl.y + q.dy + bob, pl.z + q.dz, q.ph,
        s, s * 0.55, s, 0.95, 0.97, 1, 1, 0.25, 0.15, 0, q.ph * 0.1);
    }
    batchAlpha.pushBox(pl.x, pl.y - 0.3, pl.z, pl.r * 2.1 * fade, 0.3, pl.r * 2.1 * fade,
      0.75, 0.82, 0.95, 0.45, 0.1, 0, 0, 0);
  }

  KM.Cloud = Cloud;
  KM.TeleGrab = TeleGrab;
  KM.makePlatform = makePlatform;
  KM.drawPlatform = drawPlatform;
})(window);
