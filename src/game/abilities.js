/* ============================================================
   КОТИКИ МАГИ 3D — активные способности со своей физикой
   Торнадо, чёрная дыра, метеоритный дождь, невидимость, ускорение
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;
  const TMP = M4.create();

  // ============================================================
  //  ТОРНАДО — идёт вперёд, засасывает и подбрасывает врагов
  // ============================================================
  class Tornado {
    constructor(game, x, z, dx, dz, dmg, life) {
      this.game = game;
      this.x = x; this.z = z;
      this.y = game.level.groundAt(x, z);
      if (this.y < -900) this.y = game.player.y;
      const l = Math.hypot(dx, dz) || 1;
      this.dx = dx / l; this.dz = dz / l;
      this.dmg = dmg;
      this.life = life; this.maxLife = life;
      this.t = 0;
      this.tick = 0;
      this.dead = false;
      this.R = 3.0;          // радиус воронки
      this.pullR = 7.5;      // радиус притяжения
      this.h = 7.5;          // высота столба
      this.speed = 4.2;
      this.spin = 0;
      this.seed = Math.random() * 6.28;
    }

    update(dt) {
      this.t += dt; this.life -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      this.spin += dt * 7;

      // движется вперёд, слегка виляя, и держится земли
      const wig = Math.sin(this.t * 1.3 + this.seed) * 0.35;
      const mx = this.dx + (-this.dz) * wig, mz = this.dz + this.dx * wig;
      const ml = Math.hypot(mx, mz) || 1;
      const nx = this.x + (mx / ml) * this.speed * dt;
      const nz = this.z + (mz / ml) * this.speed * dt;
      const h = this.game.level.groundAt(nx, nz);
      if (h > -900) { this.x = nx; this.z = nz; this.y = U.damp(this.y, h, 8, dt); }
      else { this.dx = -this.dx; this.dz = -this.dz; }

      const grow = U.clamp(this.t / 0.45, 0, 1) * U.clamp(this.life / 0.7, 0, 1);
      const R = this.R * grow;

      // физика всасывания
      this.tick -= dt;
      const hit = this.tick <= 0;
      if (hit) this.tick = 0.35;
      // воронка треплет и котов
      if (hit && !this.ghost) this.game.splashPeers(this.x, this.y + 1, this.z, this.R + 1, this.dmg, 'air');
      for (const m of this.game.monsters) {
        if (!m.alive) continue;
        const dx = this.x - m.x, dz = this.z - m.z;
        const d = Math.hypot(dx, dz);
        if (d > this.pullR * grow) continue;

        const k = 1 - d / (this.pullR * grow);
        // тянет к центру и одновременно закручивает по касательной
        const inx = (dx / (d || 1)), inz = (dz / (d || 1));
        const tgx = -inz, tgz = inx;
        const pull = 9 * k, swirl = 11 * k;
        m.x += (inx * pull + tgx * swirl) * dt;
        m.z += (inz * pull + tgz * swirl) * dt;

        if (d < R * 1.25) {
          // внутри воронки — поднимает и крутит
          m.holdT = 0.2;
          const targetY = this.y + 1.2 + k * this.h * 0.55;
          m.y = U.damp(m.y, targetY, 3.2, dt);
          m.yaw += dt * 9;
          m.vy = 0;
          if (hit && !this.ghost) m.hurt(this.dmg, 'air', true);
          if (!this._peerT) this._peerT = 0;
          if (Math.random() < dt * 5) {
            this.game.fx.spawn(m.x, m.y, m.z, 0, 2, 0, 0.09, 0.4, [0.8, 0.9, 1], { g: 1, emis: 0.5, drag: 1 });
          }
        }
      }

      // игрока слегка подталкивает, но не засасывает
      const p = this.game.player;
      const pd = U.dist(this.x, this.z, p.x, p.z);
      if (pd < this.pullR * grow && pd > 0.1) {
        const k = (1 - pd / (this.pullR * grow)) * 3.5;
        p.vx += ((this.x - p.x) / pd) * k * dt * 6;
        p.vz += ((this.z - p.z) / pd) * k * dt * 6;
      }

      // пыль у основания
      if (Math.random() < dt * 26) {
        const a = Math.random() * 6.28, r = R * (0.6 + Math.random() * 0.6);
        this.game.fx.spawn(this.x + Math.cos(a) * r, this.y + 0.1, this.z + Math.sin(a) * r,
          Math.cos(a + 1.5) * 4, 1.5 + Math.random() * 3, Math.sin(a + 1.5) * 4,
          0.11, 0.7, [0.72, 0.78, 0.86], { g: -2, emis: 0.15, drag: 1.2 });
      }
    }

    draw(batch, batchAlpha, t) {
      const grow = U.clamp(this.t / 0.45, 0, 1) * U.clamp(this.life / 0.7, 0, 1);
      const layers = 11;
      for (let i = 0; i < layers; i++) {
        const f = i / (layers - 1);
        const yy = this.y + f * this.h * grow;
        // воронка: узкая внизу, широкая вверху
        const rad = this.R * grow * (0.22 + f * f * 1.15);
        const cubes = 7 + Math.floor(f * 6);
        for (let k = 0; k < cubes; k++) {
          const a = this.spin * (1.6 - f * 0.7) + k * (6.283 / cubes) + f * 2.2;
          const s = 0.2 + f * 0.24;
          const alpha = (0.5 - f * 0.16) * grow;
          const c = 0.72 + f * 0.2;
          batchAlpha.pushBoxY(
            this.x + Math.cos(a) * rad, yy, this.z + Math.sin(a) * rad,
            a * 2, s, s * 1.5, s,
            c * 0.85, c * 0.92, c, alpha, 0.25, 0, 0, i * 0.1 + k * 0.03);
        }
      }
      // тёмное ядро
      batchAlpha.pushBox(this.x, this.y + this.h * 0.45 * grow, this.z,
        this.R * 0.42 * grow, this.h * 0.9 * grow, this.R * 0.42 * grow,
        0.35, 0.4, 0.48, 0.35 * grow, 0.1, 0, 0, 0);
    }
  }

  // ============================================================
  //  ЧЁРНАЯ ДЫРА — стягивает всех в точку и схлопывается
  // ============================================================
  class BlackHole {
    constructor(game, x, y, z, dmg, life) {
      this.game = game;
      this.x = x; this.y = y + 1.7; this.z = z;
      this.dmg = dmg;
      this.life = life; this.maxLife = life;
      this.t = 0; this.tick = 0;
      this.dead = false;
      this.R = 1.35;
      this.pullR = 13;
      this.collapsed = false;
      this.seed = Math.random() * 6.28;
    }

    update(dt) {
      this.t += dt; this.life -= dt;
      const grow = U.clamp(this.t / 0.35, 0, 1);

      if (this.life <= 0) {
        if (!this.collapsed) this.collapse();
        this.dead = true;
        return;
      }

      this.tick -= dt;
      const hit = this.tick <= 0;
      if (hit) this.tick = 0.3;
      // воронка тянет и грызёт всех, включая котов
      if (hit && !this.ghost) {
        this.game.splashPeers(this.x, this.y, this.z, this.pullR * 0.5, this.dmg, 'dark');
      }

      for (const m of this.game.monsters) {
        if (!m.alive) continue;
        const dx = this.x - m.x, dy = this.y - (m.y + m.height * 0.4), dz = this.z - m.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > this.pullR) continue;
        const k = Math.pow(1 - d / this.pullR, 1.5);
        const pull = (5 + 26 * k) * grow;
        m.holdT = 0.2;
        m.x += (dx / (d || 1)) * pull * dt;
        m.y += (dy / (d || 1)) * pull * dt;
        m.z += (dz / (d || 1)) * pull * dt;
        m.vy = 0;
        m.yaw += dt * 6 * k;
        if (hit && !this.ghost) m.hurt(this.dmg * (0.5 + k), 'dark', true);
        if (Math.random() < dt * 8 * k) {
          this.game.fx.spawn(m.x, m.y + 0.4, m.z, 0, 0, 0, 0.08, 0.35, [0.75, 0.35, 1], { g: 0, emis: 1, drag: 1 });
        }
      }

      // игрока тоже подтягивает, но слабее
      const p = this.game.player;
      const pdx = this.x - p.x, pdz = this.z - p.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd < this.pullR && pd > 0.2) {
        const k = Math.pow(1 - pd / this.pullR, 2) * 6 * grow;
        p.vx += (pdx / pd) * k * dt * 8;
        p.vz += (pdz / pd) * k * dt * 8;
      }

      // засасываемая пыль
      if (Math.random() < dt * 40) {
        const a = Math.random() * 6.28, el = (Math.random() - 0.5) * 2;
        const r = this.pullR * (0.4 + Math.random() * 0.6);
        const px = this.x + Math.cos(a) * r, py = this.y + el * 2.5, pz = this.z + Math.sin(a) * r;
        const dx = this.x - px, dy = this.y - py, dz = this.z - pz;
        const d = Math.hypot(dx, dy, dz) || 1;
        this.game.fx.spawn(px, py, pz, dx / d * 9, dy / d * 9, dz / d * 9,
          0.1, r / 9 + 0.15, [0.6, 0.3, 1], { g: 0, emis: 1, drag: 0.9 });
      }
    }

    collapse() {
      this.collapsed = true;
      const g = this.game;
      g.fx.explosion(this.x, this.y, this.z, 60, [0.75, 0.3, 1], 2.6);
      g.fx.shockwave(this.x, g.level.groundAt(this.x, this.z), this.z, 9, [1, 0.5, 1]);
      g.fx.shake(1.1);
      g.audio.sfxAt('thunder', this.x, this.y, this.z, 45);
      g.audio.sfx('boss');
      for (const m of g.monsters) {
        if (!m.alive) continue;
        const d = Math.hypot(this.x - m.x, this.z - m.z);
        if (d < 10 && !this.ghost) m.hurt(this.dmg * 9 * (1 - d / 10), 'dark', true, { x: this.x, z: this.z, p: 16 });
        if (!this._peersHit && !this.ghost) {
          this._peersHit = true;
          this.game.splashPeers(this.x, this.y, this.z, 10, this.dmg * 9, 'dark');
        }
      }
    }

    draw(batch, batchAlpha, t) {
      const grow = U.clamp(this.t / 0.35, 0, 1) * U.clamp(this.life / 0.4, 0, 1);
      const R = this.R * grow;
      // абсолютно чёрное ядро
      batch.pushBoxY(this.x, this.y, this.z, t * 0.6, R * 1.5, R * 1.5, R * 1.5, 0, 0, 0, 1, 0, 0, 0, 0);
      batch.pushBoxY(this.x, this.y, this.z, -t * 0.9, R * 1.15, R * 1.75, R * 1.15, 0, 0, 0, 1, 0, 0, 0, 0);
      // аккреционный диск — кубики по спирали
      for (let i = 0; i < 34; i++) {
        const f = i / 34;
        const a = t * (2.6 + f * 5) + i * 1.9;
        const r = R * (1.5 + f * 3.4);
        const yy = this.y + Math.sin(a * 0.7 + f * 6) * R * 0.55 * (1 - f);
        const s = 0.2 * (1 - f * 0.55) * grow;
        const c = [0.55 + f * 0.45, 0.15 + f * 0.2, 0.9];
        batchAlpha.pushBoxY(this.x + Math.cos(a) * r, yy, this.z + Math.sin(a) * r,
          a * 3, s, s, s, c[0], c[1], c[2], 0.9 - f * 0.4, 1, 0, 0, i * 0.05);
      }
      // искажающее гало
      batchAlpha.pushBox(this.x, this.y, this.z, R * 5, R * 5, R * 5, 0.25, 0.05, 0.4, 0.28 * grow, 0.4, 0, 0, 0);
    }
  }

  // ============================================================
  //  ПРИМЕНЕНИЕ СПОСОБНОСТЕЙ
  // ============================================================
  function activate(game, def) {
    const p = game.player;
    const aim = game.getAim();
    switch (def.id) {

      case 'shield':
        p.shieldT = def.dur;
        game.fx.ring(p.x, p.y + 0.6, p.z, 2.4, [0.5, 0.9, 1]);
        game.audio.sfx('unlock');
        game.ui.toast('🛡️ Щит поднят!', 'good');
        return true;

      case 'invis':
        p.invisT = def.dur;
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * 6.28;
          game.fx.spawn(p.x + Math.cos(a) * 0.5, p.y + Math.random() * 1.2, p.z + Math.sin(a) * 0.5,
            Math.cos(a) * 2, 1.5, Math.sin(a) * 2, 0.11, 0.7, [0.7, 0.8, 1], { g: 0.5, emis: 0.7, drag: 1 });
        }
        game.audio.sfx('portal');
        game.ui.toast('🫥 Вас больше не видно!', 'good', 2600);
        // все, кто гнался, теряют след
        for (const m of game.monsters) {
          if (m.alive && m.mode === 'chase') { m.mode = 'return'; m.alertT = 0; game.fx.question(m.x, m.y + m.height + 0.3, m.z); }
        }
        return true;

      case 'haste':
        p.hasteT = def.dur;
        game.fx.ring(p.x, p.y + 0.3, p.z, 2.2, [1, 0.95, 0.4]);
        game.audio.sfx('dash');
        game.ui.toast('⚡ Кошачья молния!', 'good');
        return true;

      case 'tornado': {
        let dx = aim.px - p.x, dz = aim.pz - p.z;
        if (Math.hypot(dx, dz) < 0.5) { dx = -Math.sin(p.yaw); dz = -Math.cos(p.yaw); }
        const sx = p.x + (dx / (Math.hypot(dx, dz) || 1)) * 2.5;
        const sz = p.z + (dz / (Math.hypot(dx, dz) || 1)) * 2.5;
        game.tornados.push(new Tornado(game, sx, sz, dx, dz, 14 + game.state.data.level * 1.4, def.dur));
        game.audio.sfx('dash');
        game.fx.shake(0.3);
        game.ui.toast('🌪️ Смерч пошёл!', 'good');
        return true;
      }

      case 'cloudwalk':
        p.cloudT = def.dur;
        p.cloudSpawnT = 0;
        game.platforms.push(KM.makePlatform(game, p.x, p.y - 0.22, p.z, 1.8, def.dur + 3));
        game.audio.sfx('portal');
        game.ui.toast('☁️ Облачная тропа! Прыгайте — облака сами подставятся', 'good', 3000);
        return true;

      case 'bouncy':
        p.bounceT = def.dur;
        game.fx.ring(p.x, p.y + 0.2, p.z, 2, [0.6, 1, 0.8]);
        game.audio.sfx('jump');
        game.ui.toast('🦘 Супер-прыгучесть!', 'good');
        return true;

      case 'stormcall': {
        const gy = game.level.groundAt(p.x, p.z);
        game.clouds.push(new KM.Cloud(game, 'storm', p.x, gy > -900 ? gy : p.y, p.z, {
          life: def.dur, radius: 8, dmg: 34 + game.state.data.level * 1.5, follow: true
        }));
        game.audio.sfx('thunder');
        game.fx.shake(0.4);
        game.ui.toast('⛈️ Буря идёт за вами!', 'bad');
        return true;
      }

      case 'blackhole':
        game.blackholes.push(new BlackHole(game, aim.px, aim.py, aim.pz, 12 + game.state.data.level * 1.2, def.dur));
        game.audio.sfx('portal');
        game.fx.shake(0.5);
        game.ui.toast('🕳️ Чёрная дыра!', 'bad');
        return true;

      case 'armageddon': {
        const n = 16 + Math.floor(game.state.data.level * 0.4);
        const R = 11;
        game.ui.toast('☄️ АРМАГЕДДОН!', 'bad', 3000);
        game.audio.sfx('boss');
        game.fx.shake(0.6);
        for (let i = 0; i < n; i++) {
          game.delay(i * (def.dur / n) + Math.random() * 0.12, () => {
            const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * R;
            const tx = aim.px + Math.cos(a) * r, tz = aim.pz + Math.sin(a) * r;
            const ty = game.level.groundAt(tx, tz);
            if (ty < -900) return;
            game.dropMeteor(tx, ty, tz, 26 + game.state.data.level * 2.2);
          });
        }
        return true;
      }
    }
    return false;
  }

  KM.Tornado = Tornado;
  KM.BlackHole = BlackHole;
  KM.activateAbility = activate;
})(window);
