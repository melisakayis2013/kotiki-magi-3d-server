/* ============================================================
   КОТИКИ МАГИ 3D — монстры, боссы, питомцы, снаряды, эффекты
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  const GRAV = -22;
  const TMPP = M4.create();

  // ============================================================
  //  МОНСТР
  // ============================================================
  class Monster {
    constructor(game, def, x, y, z, opts) {
      opts = opts || {};
      this.game = game;
      this.def = def;
      this.isBoss = !!opts.boss;
      this.elite = !!opts.elite;
      this.keyDrop = !!opts.keyDrop || this.isBoss;

      const diff = game.level.info.difficulty;
      const mul = this.isBoss ? 1 : (0.72 + diff * 0.22);
      this.maxHp = Math.round(def.hp * mul * (this.elite ? 2.1 : 1));
      this.hp = this.maxHp;
      this.dmg = def.dmg * (this.isBoss ? 1 : (0.7 + diff * 0.2)) * (this.elite ? 1.4 : 1);
      this.scale = (def.scale || 1) * (this.elite ? 1.35 : 1);

      this.model = KM.MODELS[def.model];
      this.pose = new KM.vox.Pose(this.model);
      this.pal = KM.MPAL[def.pal] || KM.MPAL.wolf;
      this.animFn = KM.anim[def.anim] || KM.anim.quad;
      this.mat = M4.create();

      this.x = x; this.y = y; this.z = z;
      this.homeX = x; this.homeZ = z; this.homeY = y;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.yaw = Math.random() * 6.28;
      this.flying = !!def.flying;
      this.hover = def.hover || 0;

      this.mode = 'live';
      this.sub = 'idle';
      this.subT = Math.random() * 2;
      this.goalX = x; this.goalZ = z;
      this.alertT = 0;
      this.noticeT = 0;
      this.lostT = 0;

      this.attackCd = Math.random() * 1.5;
      this.attackT = 0; this.hurtT = 0;
      this.walkPhase = Math.random() * 6.28; this.walkAmt = 0;
      this.effects = { burn: 0, poison: 0, slow: 0, freeze: 0, vuln: 0, stun: 0 };
      this.dead = false; this.deadT = 0;
      this.onGround = false;
      this.hopT = 0;
      this.chargeT = 0;
      this.bossPhase = 0;
      this.bossAtkT = 2.5;
      this.summoned = 0;
      this.holdT = 0;
      this.blindT = 0;
      this.radius = (this.model.meta.radius || 0.5) * this.scale;
      this.height = (this.model.meta.height || 1.2) * this.scale;
      this.seed = Math.random();
    }

    get alive() { return !this.dead; }

    /**
     * Не мы считаем этого монстра — просто подтягиваемся
     * к присланным координатам, чтобы он двигался плавно.
     */
    updateRemote(dt) {
      if (this.dead) { this.deadT += dt; return; }
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.attackT > 0) this.attackT -= dt;
      const k = Math.min(1, dt * 10);
      const dx = (this.tx === undefined ? this.x : this.tx) - this.x;
      const dz = (this.tz === undefined ? this.z : this.tz) - this.z;
      this.x += dx * k;
      this.y += ((this.ty === undefined ? this.y : this.ty) - this.y) * k;
      this.z += dz * k;
      let dy = (this.tyaw === undefined ? this.yaw : this.tyaw) - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * k;
      // шаги подбираем по скорости, чтобы лапы не скользили
      const spd = Math.hypot(dx, dz) / Math.max(dt, 0.001);
      this.walkAmt += (Math.min(1, spd / 2.5) - this.walkAmt) * Math.min(1, dt * 6);
      this.walkPhase += dt * (2 + spd * 2.2);
    }

    groundHere(x, z) {
      const h = this.game.level.groundAt(x, z);
      return h;
    }

    // ---------- урон ----------
    hurt(n, element, srcIsPlayer, knock) {
      if (this.dead) return 0;
      const g0 = this.game;
      // В совместной игре здоровье монстра ведёт только один компьютер.
      // Остальные просят его посчитать удар и показывают искры у себя.
      if (g0.serverMode && g0.net && !g0.net.isHost && srcIsPlayer) {
        g0.net.reportDamage(this.netIndex, n, element,
          knock ? this.x - knock.x : 0, knock ? this.z - knock.z : 0, knock ? knock.p : 0);
        g0.fx.hitSpark(this.x, this.y + this.height * 0.5, this.z);
        g0.audio.sfxAt('hit', this.x, this.y, this.z, 34);
        return n;
      }
      const def = this.def;
      let dmg = n;
      if (def.resist && def.resist === element) dmg *= 0.45;
      if (def.armor) dmg *= (1 - def.armor);
      if (this.effects.vuln > 0) dmg *= 1.35;
      dmg = Math.max(1, dmg);
      this.hp -= dmg;
      this.hurtT = 0.28;
      const g = this.game;
      g.fx.damageNumber(this.x, this.y + this.height * 0.9, this.z, Math.round(dmg), element || 'hit');
      g.fx.puff(this.x, this.y + this.height * 0.5, this.z, 3, this.pal.main || [1, 1, 1]);
      g.audio.sfxAt('hit', this.x, this.y, this.z, 34);
      g.audio.monster(def.voice, 'hurt', this.x, this.y, this.z, this.isBoss || def.big);
      // разбудить и заставить преследовать
      if (this.mode === 'live') { this.mode = 'chase'; this.noticeT = 0.25; }
      this.alertT = 6;
      if (knock) {
        const d = Math.hypot(this.x - knock.x, this.z - knock.z) || 1;
        this.vx += (this.x - knock.x) / d * knock.p;
        this.vz += (this.z - knock.z) / d * knock.p;
        if (!this.flying) this.vy = Math.max(this.vy, knock.p * 0.25);
      }
      if (this.hp <= 0) this.die(srcIsPlayer);
      return dmg;
    }

    die(byPlayer) {
      if (this.dead) return;
      this.dead = true; this.deadT = 0;
      const g = this.game;
      g.audio.monster(this.def.voice, 'die', this.x, this.y, this.z, this.isBoss || this.def.big);
      if (this.isBoss) g.audio.sfx('boss');
      g.fx.explosion(this.x, this.y + this.height * 0.45, this.z,
        this.isBoss ? 34 : (this.elite ? 16 : 10), this.pal.main || [1, 1, 1], this.isBoss ? 2.4 : 1);
      if (byPlayer !== false) g.onMonsterKilled(this);
    }

    // ---------- ИИ ----------
    update(dt, t) {
      const g = this.game;
      const p = g.targetFor(this);

      if (this.dead) {
        this.deadT += dt;
        return;
      }

      // эффекты
      const e = this.effects;
      if (e.burn > 0) { e.burn -= dt; this.hp -= 11 * dt; if (Math.random() < dt * 5) g.fx.puff(this.x, this.y + 0.4, this.z, 1, [1, 0.5, 0.1]); }
      if (e.poison > 0) { e.poison -= dt; this.hp -= 7 * dt; if (Math.random() < dt * 3) g.fx.puff(this.x, this.y + 0.4, this.z, 1, [0.5, 0.9, 0.2]); }
      if (e.slow > 0) e.slow -= dt;
      if (e.freeze > 0) e.freeze -= dt;
      if (e.vuln > 0) e.vuln -= dt;
      if (e.stun > 0) e.stun -= dt;
      if (this.hp <= 0) { this.die(true); return; }

      this.hurtT = Math.max(0, this.hurtT - dt);
      this.attackT = Math.max(0, this.attackT - dt);
      this.attackCd = Math.max(0, this.attackCd - dt);
      this.alertT = Math.max(0, this.alertT - dt);

      const dxp = p.x - this.x, dzp = p.z - this.z;
      const distP = Math.hypot(dxp, dzp);
      const homeDist = Math.hypot(this.x - this.homeX, this.z - this.homeZ);

      // ---- обнаружение игрока ----
      let detect = this.def.detect * (this.elite ? 1.2 : 1) * (this.isBoss ? 2.5 : 1);
      if (p.dead) detect = 0;
      if (p.invisT > 0) detect *= 0.02;
      if (this.blindT > 0) { detect *= 0.12; this.blindT -= dt; }
      if (p.hidden) detect *= 0.2 * (1 - (p.st ? p.st.stealth : 0));
      else if (p.st && p.st.stealth) detect *= 1 - p.st.stealth * 0.55;
      const pSpeed = Math.hypot(p.vx, p.vz);
      if (pSpeed > 6.5) detect *= 1.35;          // быстрый бег заметен
      else if (pSpeed < 0.5) detect *= 0.8;      // стоящего кота заметить труднее
      if (this.alertT > 0) detect *= 1.8;        // уже настороже

      let speedMul = 1;
      if (e.slow > 0) speedMul *= 0.55;
      if (e.freeze > 0) speedMul *= 0.4;
      if (e.stun > 0) speedMul = 0;

      // ---- машина состояний ----
      if (this.isBoss) {
        this.updateBoss(dt, t, distP, dxp, dzp, speedMul);
      } else {
        switch (this.mode) {
          case 'live': this.behaveLive(dt, t, distP, detect, speedMul); break;
          case 'chase': this.behaveChase(dt, distP, dxp, dzp, detect, homeDist, speedMul); break;
          case 'return': this.behaveReturn(dt, homeDist, speedMul, distP, detect); break;
        }
      }

      this.physics(dt);
      this.animate(dt, t);
    }

    /** Монстр живёт своей жизнью: бродит, щиплет травку, дремлет, оглядывается. */
    behaveLive(dt, t, distP, detect, speedMul) {
      const g = this.game;
      this.subT -= dt;

      if (distP < detect) {
        this.noticeT += dt;
        if (this.noticeT > 0.35) {
          this.mode = 'chase';
          this.alertT = 8;
          this.noticeT = 0;
          g.fx.alert(this.x, this.y + this.height + 0.3, this.z);
          g.audio.monster(this.def.voice, 'notice', this.x, this.y, this.z, this.def.big);
          // стайные монстры зовут соседей
          if (this.def.pack) {
            for (const m of g.monsters) {
              if (m !== this && m.alive && m.mode === 'live' && m.def.pack &&
                U.dist2(m.x, m.z, this.x, this.z) < 144) { m.mode = 'chase'; m.alertT = 8; }
            }
          }
          return;
        }
      } else {
        this.noticeT = Math.max(0, this.noticeT - dt * 0.7);
      }

      // изредка подаёт голос, занимаясь своими делами
      this._idleSnd = (this._idleSnd || 3 + Math.random() * 6) - dt;
      if (this._idleSnd <= 0) {
        this._idleSnd = 5 + Math.random() * 9;
        if (this.sub !== 'sleep') g.audio.monster(this.def.voice, 'idle', this.x, this.y, this.z, this.def.big);
      }

      if (this.subT <= 0) {
        const r = Math.random();
        if (r < 0.34) { this.sub = 'wander'; this.subT = 2 + Math.random() * 3.5; this.pickGoal(); }
        else if (r < 0.55) { this.sub = 'idle'; this.subT = 1.5 + Math.random() * 2.5; }
        else if (r < 0.72) { this.sub = 'look'; this.subT = 1.5 + Math.random() * 2; }
        else if (r < 0.88) { this.sub = 'graze'; this.subT = 2 + Math.random() * 3; }
        else { this.sub = 'sleep'; this.subT = 4 + Math.random() * 5; }
      }

      const spd = this.def.speed * speedMul;
      if (this.sub === 'wander') {
        const dx = this.goalX - this.x, dz = this.goalZ - this.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.8) { this.pickGoal(); }
        else {
          const s = spd * 0.42;
          this.vx = U.damp(this.vx, dx / d * s, 5, dt);
          this.vz = U.damp(this.vz, dz / d * s, 5, dt);
          this.faceDir(dx, dz, dt, 4);
        }
      } else {
        this.vx = U.damp(this.vx, 0, 7, dt);
        this.vz = U.damp(this.vz, 0, 7, dt);
        if (this.sub === 'look') this.yaw += dt * 0.8 * Math.sin(this.seed * 10 + this.subT);
        if (this.sub === 'graze' && Math.random() < dt * 1.5) {
          this.game.fx.puff(this.x + Math.cos(this.yaw) * 0.5, this.y + 0.1, this.z + Math.sin(this.yaw) * 0.5, 1, [0.6, 0.8, 0.4]);
        }
      }

      // прыгучие монстры подпрыгивают, даже гуляя
      if (this.def.hop && this.onGround && this.sub === 'wander') {
        this.hopT -= dt;
        if (this.hopT <= 0) { this.vy = 4.2; this.hopT = 0.9 + Math.random() * 0.5; }
      }
    }

    pickGoal() {
      const a = Math.random() * 6.28;
      const r = 3 + Math.random() * 8;
      this.goalX = this.homeX + Math.cos(a) * r;
      this.goalZ = this.homeZ + Math.sin(a) * r;
    }

    behaveChase(dt, distP, dxp, dzp, detect, homeDist, speedMul) {
      const g = this.game;
      const p = g.targetFor(this);

      // потерял из виду или отбежал слишком далеко от дома
      const leash = this.def.leash * (this.elite ? 1.2 : 1);
      if (p.dead || p.invisT > 0 || distP > detect * 2.0 || homeDist > leash) {
        this.lostT += dt;
        if (this.lostT > 0.9) {
          this.mode = 'return';
          this.lostT = 0;
          g.fx.question(this.x, this.y + this.height + 0.3, this.z);
        }
      } else this.lostT = 0;

      const spd = this.def.speed * speedMul * (this.elite ? 1.05 : 1);
      const atkR = this.def.atkR + this.radius;

      if (this.def.ranged) {
        // держит дистанцию и стреляет
        const want = atkR * 0.6;
        const d = distP || 1;
        let move = 0;
        if (distP > want + 1.5) move = 1;
        else if (distP < want * 0.55) move = -1;
        this.vx = U.damp(this.vx, dxp / d * spd * move, 5, dt);
        this.vz = U.damp(this.vz, dzp / d * spd * move, 5, dt);
        this.faceDir(dxp, dzp, dt, 8);
        if (distP < this.def.atkR && this.attackCd <= 0) {
          this.attackCd = this.def.atkCD;
          this.attackT = 0.45;
          g.audio.monster(this.def.voice, 'attack', this.x, this.y, this.z, this.def.big);
          g.spawnMonsterProjectile(this, this.def.projColor || [1, 0.5, 0.2]);
        }
        return;
      }

      // ближний бой
      if (distP > atkR * 0.85) {
        const d = distP || 1;
        let tx = dxp / d, tz = dzp / d;
        if (this.def.erratic) {
          const w = Math.sin(this.game.time * 3 + this.seed * 10) * 0.5;
          const c = Math.cos(w), s = Math.sin(w);
          const nx = tx * c - tz * s, nz = tx * s + tz * c;
          tx = nx; tz = nz;
        }
        // разбегаются, чтобы не толпиться в одной точке
        const sep = this.separation();
        this.vx = U.damp(this.vx, (tx + sep[0]) * spd, 6, dt);
        this.vz = U.damp(this.vz, (tz + sep[1]) * spd, 6, dt);
        this.faceDir(dxp, dzp, dt, 7);
        if (this.def.hop && this.onGround) {
          this.hopT -= dt;
          if (this.hopT <= 0) { this.vy = 5.4; this.hopT = 0.62; }
        }
        if (this.def.charge && this.attackCd <= 0 && distP < 9 && distP > 3) {
          this.chargeT = 0.7; this.attackCd = 3.4;
        }
        if (this.chargeT > 0) {
          this.chargeT -= dt;
          this.vx = tx * spd * 2.6; this.vz = tz * spd * 2.6;
        }
      } else {
        this.vx = U.damp(this.vx, 0, 9, dt);
        this.vz = U.damp(this.vz, 0, 9, dt);
        this.faceDir(dxp, dzp, dt, 9);
        if (this.attackCd <= 0) {
          this.attackCd = this.def.atkCD;
          this.attackT = 0.45;
          g.audio.monster(this.def.voice, 'attack', this.x, this.y, this.z, this.def.big);
          const self = this;
          g.delay(0.22, () => {
            if (self.dead || p.dead) return;
            if (U.dist(self.x, self.z, p.x, p.z) < atkR + 0.6 && Math.abs(p.y - self.y) < 2.6) {
              g.hurtTarget(p, self.dmg, self.def.name, self.x, self.z);
              if (p.effects) {                      // у чужого кота своих эффектов у нас нет
                if (self.def.poisonOnHit) p.effects.poison = 5;
                if (self.def.slowOnHit) p.effects.slow = 3;
                if (self.def.burnAura) p.effects.burn = 3;
              }
              g.fx.hitSpark(p.x, p.y + 0.7, p.z);
            }
          });
        }
      }
    }

    behaveReturn(dt, homeDist, speedMul, distP, detect) {
      // возвращается к своим делам, но если игрок опять близко — снова заметит
      if (distP < detect * 0.75) { this.mode = 'chase'; this.alertT = 6; return; }
      if (homeDist < 1.6) {
        this.mode = 'live'; this.sub = 'look'; this.subT = 1.5;
        return;
      }
      const dx = this.homeX - this.x, dz = this.homeZ - this.z;
      const d = Math.hypot(dx, dz) || 1;
      const spd = this.def.speed * speedMul * 0.75;
      this.vx = U.damp(this.vx, dx / d * spd, 5, dt);
      this.vz = U.damp(this.vz, dz / d * spd, 5, dt);
      this.faceDir(dx, dz, dt, 5);
      if (this.def.hop && this.onGround) {
        this.hopT -= dt;
        if (this.hopT <= 0) { this.vy = 4.2; this.hopT = 0.9; }
      }
    }

    separation() {
      const g = this.game;
      let sx = 0, sz = 0;
      for (const m of g.monsters) {
        if (m === this || !m.alive) continue;
        const dx = this.x - m.x, dz = this.z - m.z;
        const d2 = dx * dx + dz * dz;
        const rr = (this.radius + m.radius) * 1.2;
        if (d2 < rr * rr && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          sx += dx / d * (1 - d / rr) * 0.9;
          sz += dz / d * (1 - d / rr) * 0.9;
        }
      }
      return [sx, sz];
    }

    faceDir(dx, dz, dt, k) {
      const want = Math.atan2(dx, dz);
      this.yaw += U.angDiff(this.yaw, want) * Math.min(1, dt * k);
    }

    // ---------- БОСС ----------
    updateBoss(dt, t, distP, dxp, dzp, speedMul) {
      const g = this.game;
      const p = g.targetFor(this);
      const def = this.def;
      const hpFrac = this.hp / this.maxHp;
      const phase = hpFrac < 0.35 ? 2 : (hpFrac < 0.7 ? 1 : 0);
      if (phase !== this.bossPhase) {
        this.bossPhase = phase;
        g.audio.sfx('boss');
        g.ui.toast(def.name + ' в ярости!', 'bad');
        g.fx.ring(this.x, this.y + 1, this.z, 6, [1, 0.3, 0.2]);
        g.fx.shake(0.6);
      }
      const rage = 1 + phase * 0.28;

      if (p.dead) {
        this.vx = U.damp(this.vx, 0, 4, dt);
        this.vz = U.damp(this.vz, 0, 4, dt);
        return;
      }

      this.bossAtkT -= dt * rage;
      const spd = def.speed * speedMul * rage;
      const atkR = def.atkR + this.radius;

      if (this.chargeT > 0) {
        this.chargeT -= dt;
        const d = distP || 1;
        this.vx = dxp / d * spd * 3.0;
        this.vz = dzp / d * spd * 3.0;
        this.faceDir(dxp, dzp, dt, 4);
        if (distP < atkR) {
          this.chargeT = 0;
          g.hurtTarget(p, this.dmg * 1.3, def.name, this.x, this.z);
          g.fx.shake(0.4);
        }
        return;
      }

      // выбор атаки
      if (this.bossAtkT <= 0) {
        this.bossAtkT = def.atkCD * 2.2 / rage;
        const list = def.attacks || ['slam'];
        const pick = list[Math.floor(Math.random() * list.length)];
        this.attackT = 0.6;
        g.audio.monster(def.voice, 'attack', this.x, this.y, this.z, true);
        if (pick === 'slam' && distP < atkR + 4) {
          g.delay(0.35, () => {
            if (this.dead) return;
            g.fx.shockwave(this.x, this.y, this.z, atkR + 4, [1, 0.6, 0.2]);
            g.fx.shake(0.5);
            g.audio.sfx('fire');
            if (U.dist(this.x, this.z, p.x, p.z) < atkR + 4) {
              g.hurtTarget(p, this.dmg * 1.1, def.name, this.x, this.z);
              const d = U.dist(this.x, this.z, p.x, p.z) || 1;
              p.vx += (p.x - this.x) / d * 12; p.vz += (p.z - this.z) / d * 12; p.vy = 5;
            }
          });
        } else if (pick === 'charge') {
          this.chargeT = 1.0;
          g.audio.sfx('dash');
        } else if (pick === 'volley') {
          for (let i = 0; i < 5 + phase * 2; i++) {
            g.delay(0.3 + i * 0.11, () => {
              if (this.dead) return;
              g.spawnMonsterProjectile(this, [1, 0.4, 0.7], (Math.random() - 0.5) * 0.4);
            });
          }
          g.audio.sfx('cast');
        } else if (pick === 'summon' && this.summoned < 8 + phase * 3) {
          const n = 2 + phase;
          g.audio.sfx('unlock');
          g.ui.toast(def.name + ' зовёт помощников!', 'warn');
          for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.28, r = 4 + Math.random() * 4;
            const sx = this.x + Math.cos(a) * r, sz = this.z + Math.sin(a) * r;
            const sy = g.level.groundAt(sx, sz);
            if (sy < -900) continue;
            this.summoned++;
            const m = g.spawnMonster(KM.MON[def.summon] || KM.MON.slimeG, sx, sy, sz, { elite: false });
            if (m) { m.mode = 'chase'; m.alertT = 20; g.fx.ring(sx, sy + 0.4, sz, 1.6, [0.8, 0.3, 1]); }
          }
        }
        return;
      }

      // обычное преследование
      if (def.ranged) {
        const want = 8;
        const d = distP || 1;
        const move = distP > want + 2 ? 1 : (distP < want - 2 ? -1 : 0);
        this.vx = U.damp(this.vx, dxp / d * spd * move, 4, dt);
        this.vz = U.damp(this.vz, dzp / d * spd * move, 4, dt);
      } else if (distP > atkR * 0.9) {
        const d = distP || 1;
        this.vx = U.damp(this.vx, dxp / d * spd, 5, dt);
        this.vz = U.damp(this.vz, dzp / d * spd, 5, dt);
      } else {
        this.vx = U.damp(this.vx, 0, 8, dt);
        this.vz = U.damp(this.vz, 0, 8, dt);
        if (this.attackCd <= 0) {
          this.attackCd = def.atkCD;
          this.attackT = 0.5;
          g.delay(0.25, () => {
            if (this.dead || p.dead) return;
            if (U.dist(this.x, this.z, p.x, p.z) < atkR + 1) {
              g.hurtTarget(p, this.dmg, def.name, this.x, this.z);
              g.fx.hitSpark(p.x, p.y + 0.7, p.z);
            }
          });
        }
      }
      this.faceDir(dxp, dzp, dt, 5);
    }

    // ---------- физика ----------
    physics(dt) {
      const L = this.game.level;
      const nx = this.x + this.vx * dt;
      const nz = this.z + this.vz * dt;
      const feet = this.y;

      const okX = this.stepOk(nx, this.z, feet);
      if (okX) this.x = nx; else this.vx *= -0.25;
      const okZ = this.stepOk(this.x, nz, feet);
      if (okZ) this.z = nz; else this.vz *= -0.25;

      // не выходить за карту
      const lim = L.half - 1.5;
      this.x = U.clamp(this.x, -lim, lim);
      this.z = U.clamp(this.z, -lim, lim);

      const g = this.groundHere(this.x, this.z);
      if (this.flying) {
        const target = (g > -900 ? g : this.homeY) + this.hover;
        this.y = U.damp(this.y, target, 3.5, dt);
        this.onGround = false;
      } else if (this.holdT > 0) {
        this.holdT -= dt;
        this.vy = 0;
        this.onGround = false;
      } else {
        this.vy += GRAV * dt;
        this.y += this.vy * dt;
        if (g < -900) {
          if (this.y < -12) { this.x = this.homeX; this.z = this.homeZ; this.y = this.homeY + 1; this.vy = 0; }
          this.onGround = false;
        } else if (this.y <= g) { this.y = g; this.vy = 0; this.onGround = true; }
        else this.onGround = false;
      }
      // трение
      if (this.onGround || this.flying) {
        this.vx *= Math.pow(0.02, dt);
        this.vz *= Math.pow(0.02, dt);
      }
    }

    stepOk(x, z, feet) {
      const h = this.game.level.groundAt(x, z);
      if (h < -900) return this.flying;
      return h <= feet + 1.05;
    }

    animate(dt, t) {
      const hs = Math.hypot(this.vx, this.vz);
      const target = this.sub === 'sleep' && this.mode === 'live' ? 0 : U.clamp(hs / (this.def.speed || 2), 0, 1);
      this.walkAmt = U.damp(this.walkAmt, target, 9, dt);
      this.walkPhase += dt * (4 + hs * 2.2);
    }

    draw(batch, batchAlpha, t) {
      const s = {
        t: t + this.seed * 10, walk: this.walkPhase, walkAmt: this.walkAmt,
        air: !this.onGround, vy: this.vy, rest: 0,
        attack: this.attackT / 0.45, cast: 0, hurt: this.hurtT / 0.28, blink: 0
      };
      if (this.dead) {
        // рассыпается
        const k = U.clamp(1 - this.deadT / 0.6, 0, 1);
        if (k <= 0) return;
        M4.trs(this.mat, this.x, this.y, this.z, this.yaw, this.scale * k, this.scale * k * 0.6, this.scale * k);
        this.animFn(this.pose, s);
        KM.vox.drawModel(batchAlpha, this.model, this.mat, this.pose, {
          pal: this.pal, alpha: k * 0.8, tint: [0.2, 0.2, 0.25, 0.5], batchAlpha
        });
        return;
      }
      this.animFn(this.pose, s);
      M4.trs(this.mat, this.x, this.y, this.z, this.yaw, this.scale, this.scale, this.scale);
      const flash = this.hurtT > 0 ? [1, 1, 1, this.hurtT * 2.6] : null;
      const frozen = this.effects.freeze > 0 ? [0.5, 0.8, 1, 0.55] : null;
      const burning = this.effects.burn > 0 ? [1, 0.45, 0.1, 0.35] : null;
      KM.vox.drawModel(batch, this.model, this.mat, this.pose, {
        pal: this.pal, alpha: 1,
        emis: (this.elite ? 0.18 : 0) + (this.isBoss ? 0.12 : 0),
        tint: flash || frozen || burning, batchAlpha
      });

      // элитная аура
      if (this.elite || this.isBoss) {
        const n = this.isBoss ? 8 : 4;
        for (let i = 0; i < n; i++) {
          const a = t * 1.4 + i * (6.28 / n);
          const r = this.radius + 0.5;
          batchAlpha.pushBox(this.x + Math.cos(a) * r, this.y + 0.35 + Math.sin(t * 2 + i) * 0.3, this.z + Math.sin(a) * r,
            0.14, 0.14, 0.14, 1, 0.75, 0.25, 0.75, 1, 0, 0, i * 0.1);
        }
      }
      // ледяная корка
      if (this.effects.freeze > 0) {
        batchAlpha.pushBox(this.x, this.y + this.height * 0.45, this.z,
          this.radius * 2.4, this.height * 1.05, this.radius * 2.4,
          0.6, 0.85, 1, 0.35, 0.25, 0.2, 0, this.seed);
      }
    }
  }

  // ============================================================
  //  ПИТОМЕЦ
  // ============================================================
  class Pet {
    constructor(game, saveData, slot) {
      this.game = game;
      this.data = saveData;
      this.def = KM.PET_BY[saveData.id];
      this.slot = slot;
      this.model = KM.MODELS[this.def.model];
      this.pose = new KM.vox.Pose(this.model);
      this.pal = this.def.cat ? null : (KM.MPAL[this.def.pal] || KM.MPAL.wisp);
      this.catPal = KM.CAGED_PALS[slot % KM.CAGED_PALS.length];
      this.animFn = KM.anim[this.def.anim] || KM.anim.float;
      this.mat = M4.create();
      this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
      this.yaw = 0;
      this.walkPhase = Math.random() * 6.28; this.walkAmt = 0;
      this.attackCd = Math.random();
      this.attackT = 0;
      this.onGround = false;
      this.seed = Math.random();
      const st = saveData.stage;
      this.scale = (this.def.cat ? 0.55 : 0.62) * (1 + st * 0.28);
      const accB = (saveData.acc && KM.PET_ACC_BY && KM.PET_ACC_BY[saveData.acc]) ? KM.PET_ACC_BY[saveData.acc].dmg : 0;
      this.dmg = this.def.dmg * (1 + (saveData.level - 1) * 0.12) * (1 + st * 0.5) * (1 + accB);
      this.range = this.def.range;
      this.flying = !!this.def.flying;
      this.target = null;
      this.blink = 0; this.blinkT = Math.random() * 4;
    }

    update(dt, t) {
      const g = this.game;
      const p = g.player;
      // позиция следования — по кругу за игроком
      const ang = p.facing + Math.PI + (this.slot - 1) * 0.75;
      const tx = p.x + Math.sin(ang) * 1.9;
      const tz = p.z + Math.cos(ang) * 1.9;

      // ищем цель
      this.attackCd = Math.max(0, this.attackCd - dt);
      this.attackT = Math.max(0, this.attackT - dt);
      if (!this.target || !this.target.alive || U.dist(this.x, this.z, this.target.x, this.target.z) > this.range + 6) {
        this.target = null;
        let best = 1e9;
        for (const m of g.monsters) {
          if (!m.alive) continue;
          const d = U.dist(p.x, p.z, m.x, m.z);
          if (d < 13 && d < best) { best = d; this.target = m; }
        }
      }

      let gx = tx, gz = tz;
      if (this.target) {
        const d = U.dist(this.x, this.z, this.target.x, this.target.z);
        if (d < this.range * 0.9 && this.attackCd <= 0) {
          this.attackCd = this.def.cd;
          this.attackT = 0.4;
          const self = this;
          if (this.range > 4) {
            g.spawnPetProjectile(this, this.target);
          } else {
            g.audio.sfxAt('pet', this.x, this.y, this.z, 20);
            g.delay(0.18, () => {
              if (!self.target || !self.target.alive) return;
              self.target.hurt(self.dmg, self.def.el, true);
              if (self.def.poison) self.target.effects.poison = 4;
              g.fx.hitSpark(self.target.x, self.target.y + 0.5, self.target.z);
            });
          }
        }
        if (d > this.range * 0.7) {
          gx = this.target.x; gz = this.target.z;
        } else { gx = this.x; gz = this.z; }
      }

      const dx = gx - this.x, dz = gz - this.z;
      const d = Math.hypot(dx, dz);
      const far = U.dist(this.x, this.z, p.x, p.z);
      if (far > 22) { this.x = p.x - Math.sin(p.facing) * 1.5; this.z = p.z - Math.cos(p.facing) * 1.5; }
      const spd = d > 6 ? 9 : 5.4;
      if (d > 0.5) {
        this.vx = U.damp(this.vx, dx / d * spd, 6, dt);
        this.vz = U.damp(this.vz, dz / d * spd, 6, dt);
        const want = Math.atan2(dx, dz);
        this.yaw += U.angDiff(this.yaw, want) * Math.min(1, dt * 8);
      } else {
        this.vx = U.damp(this.vx, 0, 8, dt);
        this.vz = U.damp(this.vz, 0, 8, dt);
      }

      this.x += this.vx * dt; this.z += this.vz * dt;
      const gh = g.level.groundAt(this.x, this.z);
      if (this.flying) {
        this.y = U.damp(this.y, (gh > -900 ? gh : p.y) + 1.35 + Math.sin(t * 2 + this.seed * 8) * 0.18, 4, dt);
      } else {
        this.vy += GRAV * dt;
        this.y += this.vy * dt;
        if (gh > -900 && this.y <= gh) { this.y = gh; this.vy = 0; this.onGround = true; }
        else if (gh < -900) { this.x = p.x; this.z = p.z; this.y = p.y + 1; }
        else this.onGround = false;
        // подпрыгнуть на препятствие
        if (this.onGround && d > 1 && Math.hypot(this.vx, this.vz) < 1.2) this.vy = 5;
      }

      const hs = Math.hypot(this.vx, this.vz);
      this.walkAmt = U.damp(this.walkAmt, U.clamp(hs / 5, 0, 1), 9, dt);
      this.walkPhase += dt * (5 + hs * 2);
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinkT = 2 + Math.random() * 3; this.blink = 1; }
      this.blink = Math.max(0, this.blink - dt * 7);
    }

    draw(batch, batchAlpha, t) {
      const s = {
        t: t + this.seed * 6, walk: this.walkPhase, walkAmt: this.walkAmt,
        air: !this.onGround, vy: this.vy, rest: 0,
        attack: this.attackT / 0.4, cast: 0, hurt: 0, blink: this.blink
      };
      this.animFn(this.pose, s);
      M4.trs(this.mat, this.x, this.y, this.z, this.yaw, this.scale, this.scale, this.scale);
      KM.vox.drawModel(batch, this.model, this.mat, this.pose, {
        pal: this.def.cat ? this.catPal : this.pal,
        alpha: 1, emis: this.data.stage * 0.12, batchAlpha
      });
      // наряд питомца
      if (this.data.acc && KM.PET_ACC_BY) {
        const a = KM.PET_ACC_BY[this.data.acc];
        if (a) drawPetAcc(batch, batchAlpha, this, a, t);
      }

      // сердечко над эволюционировавшим питомцем
      if (this.data.stage === 2) {
        const yy = this.y + this.model.meta.height * this.scale + 0.35 + Math.sin(t * 3 + this.seed) * 0.08;
        batchAlpha.pushBox(this.x, yy, this.z, 0.12, 0.12, 0.12, 1, 0.85, 0.3, 0.9, 1, 0, 0, this.seed);
      }
    }
  }

  // ============================================================
  //  СНАРЯДЫ
  // ============================================================
  class Projectile {
    constructor(o) { Object.assign(this, o); this.life = this.life || 3.2; this.t = 0; this.dead = false; this.trail = 0; }
    update(dt, game) {
      this.t += dt; this.life -= dt;
      if (this.life <= 0) { this.onEnd(game, false); return; }

      if (this.homing && this.target && this.target.alive) {
        const dx = this.target.x - this.x, dy = (this.target.y + this.target.height * 0.5) - this.y, dz = this.target.z - this.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        const k = Math.min(1, dt * 6);
        this.dx += (dx / d - this.dx) * k;
        this.dy += (dy / d - this.dy) * k;
        this.dz += (dz / d - this.dz) * k;
        const l = Math.hypot(this.dx, this.dy, this.dz) || 1;
        this.dx /= l; this.dy /= l; this.dz /= l;
      }
      if (this.grav) this.dy += this.grav * dt / this.speed;

      const step = this.speed * dt;
      this.x += this.dx * step; this.y += this.dy * step; this.z += this.dz * step;

      // след
      this.trail -= dt;
      if (this.trail <= 0) {
        this.trail = 0.035;
        game.fx.trail(this.x, this.y, this.z, this.color);
      }

      // столкновение с землёй
      const h = game.level.groundAt(this.x, this.z);
      if (this.roll) {
        // валун не разбивается, а КАТИТСЯ по земле
        if (!this.rolling && h > -900 && this.y <= h + 0.35) {
          this.rolling = true;
          this.rollLeft = this.rollTime || 2.5;
          this.dy = 0;
          this.hitSet = new Set();
          game.fx.shockwave(this.x, h, this.z, 2.2, this.color2 || this.color);
          game.audio.sfxAt('land', this.x, this.y, this.z, 40);
        }
        if (this.rolling) {
          this.rollLeft -= dt;
          // на крутой подъём валун не забирается — рассыпается
          if (h > -900 && this._lastH !== undefined && h > this._lastH + 0.55) { this.onEnd(game, true); return; }
          this._lastH = h;
          if (h > -900) this.y = h + (this.size || 0.3) * 1.1;
          this.dy = 0;
          this.speed = Math.max(0, this.speed - dt * 3);
          if (Math.random() < dt * 30) {
            game.fx.spawn(this.x, this.y - 0.2, this.z, (Math.random() - 0.5) * 3, 1.6, (Math.random() - 0.5) * 3,
              0.1, 0.5, [0.62, 0.56, 0.48], { g: -8, emis: 0, drag: 1.4 });
          }
          // давит всех, кого коснулся
          if (!this.ghost) for (const mm of game.monsters) {
            if (!mm.alive || this.hitSet.has(mm)) continue;
            if (Math.abs(this.y - (mm.y + mm.height * 0.4)) > mm.height + 0.6) continue;
            if (U.dist2(this.x, this.z, mm.x, mm.z) < (mm.radius + 0.7) * (mm.radius + 0.7)) {
              this.hitSet.add(mm);
              mm.hurt(this.dmg, this.element, true, { x: this.x, z: this.z, p: this.knock || 10 });
            }
          }
          // катящийся валун давит и котов
          if (!this.ghost) game.splashPeers(this.x, this.y, this.z, 1.0, this.dmg * 0.5, this.element);
          if (this.rollLeft <= 0 || this.speed < 1.5 || h < -900) { this.onEnd(game, true); return; }
          return;
        }
      }
      if (h > -900 && this.y <= h + 0.12) { this.y = h + 0.05; this.onEnd(game, true); return; }
      if (this.y < -20) { this.dead = true; return; }

      // столкновение с целями
      // Призрачная копия — это чужое заклинание, показанное у нас.
      // Она только светится: урон считает тот, кто её запустил.
      if (this.ghost) return;

      if (this.friendly) {
        // магия достаёт и других котов — дружеская драка
        if (game.serverMode && game.net) {
          for (const p of game.net.peers.values()) {
            if (p.dead || p.anim === 'dead') continue;
            if (Math.abs(this.y - (p.y + 0.55)) > 1.2) continue;
            if (U.dist2(this.x, this.z, p.x, p.z) > 0.9) continue;
            game.hitPeer(p, this.dmg, this.element, this.x, this.z);
            if (!this.pierce && !this.roll) { this.onEnd(game, true); return; }
          }
        }
        for (const m of game.monsters) {
          if (!m.alive) continue;
          const dy = this.y - (m.y + m.height * 0.45);
          if (Math.abs(dy) > m.height * 0.8 + 0.5) continue;
          if (U.dist2(this.x, this.z, m.x, m.z) < (m.radius + 0.42) * (m.radius + 0.42)) {
            this.hitMonster(game, m);
            if (!this.pierce && !this.roll) { this.onEnd(game, true); return; }
            if (!this.hitSet) this.hitSet = new Set();
          }
        }
      } else {
        // снаряд монстра ищет любого кота — и своего, и пришедшего по сети
        for (const p of game.allTargets()) {
          if (Math.abs(this.y - (p.y + 0.55)) >= 1.15) continue;
          if (U.dist2(this.x, this.z, p.x, p.z) >= 0.75) continue;
          game.hurtTarget(p, this.dmg, this.srcName || 'снаряд', this.x, this.z);
          game.fx.hitSpark(p.x, p.y + 0.7, p.z);
          this.onEnd(game, false);
          return;
        }
      }
    }

    hitMonster(game, m) {
      if (this.pierce) {
        if (!this.hitSet) this.hitSet = new Set();
        if (this.hitSet.has(m)) return;
        this.hitSet.add(m);
      }
      m.hurt(this.dmg, this.element, true, this.knock ? { x: this.x, z: this.z, p: this.knock } : null);
      if (this.element === 'fire') m.effects.burn = Math.max(m.effects.burn, 3.5);
      if (this.element === 'ice') { m.effects.freeze = Math.max(m.effects.freeze, 2.6); m.effects.vuln = Math.max(m.effects.vuln, 4); }
      if (this.element === 'water') m.effects.slow = Math.max(m.effects.slow, 3);
      if (this.element === 'nature') m.effects.poison = Math.max(m.effects.poison, 5);
      if (this.element === 'air') m.effects.stun = Math.max(m.effects.stun, 0.7);
    }

    onEnd(game, impact) {
      if (this.dead) return;
      this.dead = true;
      if (this.onImpact) this.onImpact(this, impact);
    }

    /** Матрица, ориентированная вдоль полёта (локальная ось +Z смотрит по dir). */
    _dirMat(out, x, y, z, sx, sy, sz, roll) {
      const yaw = Math.atan2(this.dx, this.dz);
      const pitch = -Math.asin(Math.max(-1, Math.min(1, this.dy)));
      M4.compose(out, x, y, z, pitch, yaw, roll || 0, sx, sy, sz);
      return out;
    }

    /** Базис поперёк направления полёта. */
    _basis() {
      const dx = this.dx, dy = this.dy, dz = this.dz;
      let rx = -dz, rz = dx;
      const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
      return { rx, ry: 0, rz, ux: -rz * dy, uy: rz * dx - rx * dz, uz: rx * dy };
    }

    draw(batch, batchAlpha, t) {
      const c = this.color, c2 = this.color2 || this.color;
      const s = this.size || 0.22;
      const tt = this.t;
      const M = TMPP;
      const x = this.x, y = this.y, z = this.z;

      switch (this.shape) {

        // 🔥 клубок пламени: ядро + пляшущие вокруг угольки
        case 'fireball': {
          const fl = 1 + Math.sin(tt * 34) * 0.18;
          batch.pushBoxY(x, y, z, tt * 9, s * 1.2 * fl, s * 1.2 * fl, s * 1.2 * fl,
            c2[0], c2[1], c2[2], 1, 1, 0, 0, 0);
          for (let i = 0; i < 4; i++) {
            const a = tt * 12 + i * 1.571;
            const r = s * 1.45;
            batchAlpha.pushBoxY(x + Math.cos(a) * r, y + Math.sin(a * 1.4) * r * 0.55, z + Math.sin(a) * r,
              a * 2, s * 0.6, s * 0.6, s * 0.6, c[0], c[1], c[2], 0.85, 1, 0, 0, i);
          }
          batchAlpha.pushBox(x, y, z, s * 3, s * 3, s * 3, c[0], c[1], c[2], 0.2, 1, 0, 0, 0);
          break;
        }

        // 💧 капля: вытянута по полёту и колышется
        case 'droplet': {
          const wob = 1 + Math.sin(tt * 20) * 0.24;
          this._dirMat(M, x, y, z, s * 1.5 / wob, s * 1.5 / wob, s * (this.stretch || 1.9) * wob, 0);
          batch.pushMat(M, c[0], c[1], c[2], 1, 0.8, 0, 0, 0);
          this._dirMat(M, x, y, z, s * 0.7, s * 0.7, s * 0.9, 0);
          batch.pushMat(M, c2[0], c2[1], c2[2], 1, 1, 0, 0, 0);
          for (let i = 1; i <= 3; i++) {
            const k = i * 0.28;
            const q = s * (0.62 - i * 0.14);
            batchAlpha.pushBox(x - this.dx * k, y - this.dy * k + Math.sin(tt * 14 + i) * 0.05, z - this.dz * k,
              q, q, q, c2[0], c2[1], c2[2], 0.55 - i * 0.1, 0.7, 0, 0, i);
          }
          break;
        }

        // ❄️ осколок: длинная грань + два перекрестья, быстро крутится
        case 'shard': {
          const roll = tt * (this.spin || 14);
          this._dirMat(M, x, y, z, s * 0.62, s * 0.62, s * (this.stretch || 2.4), roll);
          batch.pushMat(M, c[0], c[1], c[2], 1, 0.5, 0.15, 0, 0);
          this._dirMat(M, x, y, z, s * 0.34, s * 1.6, s * 0.85, roll + 1.05);
          batchAlpha.pushMat(M, c2[0], c2[1], c2[2], 0.8, 0.65, 0, 0, 0);
          this._dirMat(M, x, y, z, s * 1.6, s * 0.34, s * 0.85, roll - 0.75);
          batchAlpha.pushMat(M, c2[0], c2[1], c2[2], 0.8, 0.65, 0, 0, 0);
          break;
        }

        // ☠️ облако спор: медленно вращающиеся пузыри
        case 'cloud': {
          for (let i = 0; i < 6; i++) {
            const a = tt * 1.8 + i * 1.047;
            const r = s * 1.3 * (0.55 + 0.5 * Math.sin(tt * 2.2 + i));
            const cc = i % 2 ? c : c2;
            batchAlpha.pushBoxY(x + Math.cos(a) * r, y + Math.sin(tt * 1.5 + i) * r * 0.55, z + Math.sin(a) * r,
              a, s * 0.95, s * 0.95, s * 0.95, cc[0], cc[1], cc[2], 0.48, 0.45, 0, 0, i);
          }
          break;
        }

        // 🌪️ вихрь: кольцо кубиков вокруг оси полёта
        case 'vortex': {
          const b = this._basis();
          const roll = tt * (this.spin || 22);
          for (let i = 0; i < 9; i++) {
            const a = roll + i * 0.698;
            const R = s * (1.5 + Math.sin(tt * 6 + i) * 0.35);
            const ca = Math.cos(a) * R, sa = Math.sin(a) * R;
            batchAlpha.pushBoxY(
              x + b.rx * ca + b.ux * sa, y + b.uy * sa, z + b.rz * ca + b.uz * sa,
              a * 2, s * 0.5, s * 0.5, s * 0.5, c[0], c[1], c[2], 0.75, 0.85, 0, 0, i);
          }
          batchAlpha.pushBox(x, y, z, s * 1.1, s * 1.1, s * 1.1, c2[0], c2[1], c2[2], 0.5, 1, 0, 0, 0);
          break;
        }

        // 🌑 теневой клинок: плоское лезвие-крест
        case 'blade': {
          const roll = tt * (this.spin || 5);
          this._dirMat(M, x, y, z, s * 2.4, s * 0.16, s * (this.stretch || 3.2), roll);
          batch.pushMat(M, c[0], c[1], c[2], 1, 0.8, 0, 0, 0);
          this._dirMat(M, x, y, z, s * 0.16, s * 2.4, s * (this.stretch || 3.2), roll);
          batch.pushMat(M, c2[0], c2[1], c2[2], 1, 0.8, 0, 0, 0);
          this._dirMat(M, x, y, z, s * 3.4, s * 3.4, s * 0.5, roll);
          batchAlpha.pushMat(M, c[0], c[1], c[2], 0.22, 1, 0, 0, 0);
          break;
        }

        // ✨ звезда: три перекрещённых луча
        case 'star': {
          const a1 = tt * (this.spin || 7), a2 = tt * (this.spin || 7) * 0.55;
          M4.compose(M, x, y, z, a2, a1, 0, s * 2.6, s * 0.38, s * 0.38); batch.pushMat(M, c[0], c[1], c[2], 1, 1, 0, 0, 0);
          M4.compose(M, x, y, z, a2, a1, 0, s * 0.38, s * 2.6, s * 0.38); batch.pushMat(M, c[0], c[1], c[2], 1, 1, 0, 0, 0);
          M4.compose(M, x, y, z, a2, a1, 0, s * 0.38, s * 0.38, s * 2.6); batch.pushMat(M, c[0], c[1], c[2], 1, 1, 0, 0, 0);
          batch.pushBoxY(x, y, z, a1, s, s, s, c2[0], c2[1], c2[2], 1, 1, 0, 0, 0);
          batchAlpha.pushBox(x, y, z, s * 3.6, s * 3.6, s * 3.6, c[0], c[1], c[2], 0.18, 1, 0, 0, 0);
          break;
        }

        // ☄️ метеор: кувыркающаяся глыба в огненной короне
        case 'rock': {
          const a = tt * (this.spin || 4);
          M4.compose(M, x, y, z, a * 0.7, a, a * 0.4, s * 1.7, s * 1.55, s * 1.7);
          batch.pushMat(M, 0.26, 0.2, 0.19, 1, 0.1, 0.35, 0, 0);
          for (let i = 0; i < 5; i++) {
            const b = a * 1.3 + i * 1.257;
            M4.compose(M, x + Math.cos(b) * s * 1.0, y + Math.sin(b * 0.8) * s * 0.8, z + Math.sin(b) * s * 1.0,
              a * 0.5 + i, b, 0, s * 0.85, s * 0.85, s * 0.85);
            batch.pushMat(M, c[0], c[1], c[2], 1, 0.95, 0.1, 0, i);
          }
          batchAlpha.pushBox(x, y, z, s * 4.4, s * 4.4, s * 4.4, c2[0], c2[1], c2[2], 0.22, 1, 0, 0, 0);
          break;
        }

        // 🪨 валун: гранёный камень, катится по земле
        case 'boulder': {
          const a = tt * (this.spin || 6);
          M4.compose(M, x, y, z, this.rolling ? a * 2.4 : a * 0.7, a * 0.5, a * 0.3,
            s * 2.1, s * 2.0, s * 2.1);
          batch.pushMat(M, c[0], c[1], c[2], 1, 0, 0.45, 0, 0);
          for (let i = 0; i < 4; i++) {
            const b = a * 1.4 + i * 1.571;
            M4.compose(M, x + Math.cos(b) * s * 1.0, y + Math.sin(b * 0.7) * s * 0.9, z + Math.sin(b) * s * 1.0,
              a + i, b, 0, s * 0.9, s * 0.9, s * 0.9);
            batch.pushMat(M, c2[0] * 0.82, c2[1] * 0.82, c2[2] * 0.82, 1, 0, 0.5, 0, i);
          }
          break;
        }

        default: {
          const w = Math.sin(t * 22 + tt * 10) * 0.03;
          batch.pushBoxY(x, y, z, t * 6 + tt * 3, s + w, s + w, s + w, c[0], c[1], c[2], 1, 1, 0, 0, 0);
          batchAlpha.pushBoxY(x, y, z, -t * 4, s * 1.9, s * 1.9, s * 1.9, c2[0], c2[1], c2[2], 0.35, 1, 0, 0, 0);
        }
      }
    }
  }

  // ============================================================
  //  ЗОНЫ (огонь / лужа / лёд / яд ...)
  // ============================================================
  class Zone {
    constructor(o) {
      Object.assign(this, o);
      this.t = 0;
      this.tick = 0;
      this.dead = false;
      this.cubes = [];
      this.color2 = this.color2 || this.color;
      const rng = KM.makeRNG(Math.floor(this.x * 133 + this.z * 977 + 7));
      const n = this.kind === 'ice' ? 7 : (this.kind === 'mist' ? 14 : (this.kind === 'spikes' ? 9 : Math.min(26, Math.floor(this.radius * this.radius * 2.2))));
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, r = Math.sqrt(rng()) * this.radius * 0.92;
        this.cubes.push({
          dx: Math.cos(a) * r, dz: Math.sin(a) * r,
          dy: rng() * (this.kind === 'ice' ? 0.55 : 0.16),
          s: rng() * 0.35 + (this.kind === 'ice' ? 0.4 : 0.28),
          ph: rng() * 6.28
        });
      }
    }
    update(dt, game) {
      this.t += dt;
      if (this.t >= this.life) { this.dead = true; return; }
      this.tick -= dt;
      if (this.tick > 0) return;
      this.tick = 0.4;

      if (this.kind === 'heal') return;
      const r2 = this.radius * this.radius;
      // лужа огня, лёд, шипы — всё это должно доставать и котов
      if (!this.ghost) {
        const EL = { fire: 'fire', water: 'water', ice: 'ice', poison: 'nature',
          shadow: 'dark', star: 'light', spark: 'air', rubble: 'earth',
          spikes: 'earth', cracks: 'earth' };
        const el = EL[this.kind];
        if (el) game.splashPeers(this.x, this.y, this.z, this.radius, this.dps * 0.4, el);
      }

      if (this.ghost) { this.zoneVisualOnly = true; }
      else for (const m of game.monsters) {
        if (!m.alive) continue;
        if (U.dist2(this.x, this.z, m.x, m.z) > r2) continue;
        if (Math.abs(m.y - this.y) > 2.4) continue;
        switch (this.kind) {
          case 'fire': m.hurt(this.dps * 0.4, 'fire', true); m.effects.burn = Math.max(m.effects.burn, 2); break;
          case 'water': m.effects.slow = Math.max(m.effects.slow, 1.2); m.effects.vuln = Math.max(m.effects.vuln, 1.2); m.hurt(this.dps * 0.4, 'water', true); break;
          case 'ice': m.effects.freeze = Math.max(m.effects.freeze, 1.4); m.effects.vuln = Math.max(m.effects.vuln, 2); m.hurt(this.dps * 0.4, 'ice', true); break;
          case 'poison': m.effects.poison = Math.max(m.effects.poison, 3); m.hurt(this.dps * 0.4, 'nature', true); break;
          case 'shadow': m.hurt(this.dps * 0.4, 'dark', true); break;
          case 'star': m.hurt(this.dps * 0.4, 'light', true); break;
          case 'spark': m.hurt(this.dps * 0.4, 'air', true); m.effects.stun = Math.max(m.effects.stun, 0.35); break;
          case 'rubble': m.effects.slow = Math.max(m.effects.slow, 1.4); m.hurt(this.dps * 0.25, 'earth', true); break;
          case 'spikes': m.hurt(this.dps * 0.6, 'earth', true); if (!m.flying) m.vy = Math.max(m.vy, 5); break;
          case 'cracks': m.effects.stun = Math.max(m.effects.stun, 0.5); m.hurt(this.dps * 0.35, 'earth', true); break;
          case 'mist': m.blindT = Math.max(m.blindT, 0.6); break;
          case 'wind': break;
        }
      }
      if (this.kind === 'mist') {
        const p = game.player;
        if (U.dist2(this.x, this.z, p.x, p.z) < r2 && Math.abs(p.y - this.y) < 3) p.mistT = 0.5;
      }
      // лужа воды усиливает молнию — помечаем
      if (this.kind === 'fire' && !this.ghost) {
        const p = game.player;
        if (U.dist2(this.x, this.z, p.x, p.z) < r2 && Math.abs(p.y - this.y) < 2) {
          p.damage(this.dps * 0.25, null, 'огонь', true);
          p.effects.burn = Math.max(p.effects.burn, 1.5);
        }
      }
    }
    draw(batch, batchAlpha, t) {
      const fade = U.clamp((this.life - this.t) / 1.2, 0, 1) * U.clamp(this.t / 0.25, 0, 1);
      const c = this.color, c2 = this.color2 || this.color;
      const X = this.x, Y = this.y, Z = this.z, R = this.radius;

      switch (this.kind) {

        // 🔥 языки пламени пляшут вверх, снизу оранжевые, сверху жёлтые
        case 'fire': {
          for (const q of this.cubes) {
            const ph = t * 7 + q.ph * 6;
            const h = (0.35 + Math.abs(Math.sin(ph)) * 0.85) * fade;
            const w = q.s * (0.75 + Math.sin(ph * 1.7) * 0.22) * fade;
            batchAlpha.pushBoxY(X + q.dx, Y + h * 0.5, Z + q.dz, q.ph + t * 2.5,
              w, h, w, c[0], c[1], c[2], 0.62 * fade, 1, 0, 0, q.ph * 0.1);
            batchAlpha.pushBoxY(X + q.dx, Y + h * 0.92, Z + q.dz, -q.ph - t * 3,
              w * 0.55, h * 0.42, w * 0.55, c2[0], c2[1], c2[2], 0.75 * fade, 1, 0, 0, q.ph * 0.2);
          }
          break;
        }

        // 💧 плоская лужа с расходящимися кругами
        case 'water': {
          for (const q of this.cubes) {
            batchAlpha.pushBoxY(X + q.dx, Y + 0.055, Z + q.dz, q.ph,
              q.s * 2.4 * fade, 0.09, q.s * 2.4 * fade,
              c[0], c[1], c[2], 0.5 * fade, 0.25, 0, 0, q.ph);
          }
          const rr = ((t * 0.7) % 1) * R;
          const n = 16;
          for (let i = 0; i < n; i++) {
            const a = i / n * 6.283;
            batchAlpha.pushBoxY(X + Math.cos(a) * rr, Y + 0.13, Z + Math.sin(a) * rr, a,
              0.17, 0.05, 0.17, c2[0], c2[1], c2[2], 0.42 * (1 - rr / R) * fade, 0.6, 0, 0, i);
          }
          break;
        }

        // ❄️ настоящая глыба льда с шипами — стоит и никуда не девается
        case 'ice': {
          batch.pushBoxY(X, Y + 0.34 * fade, Z, 0.45,
            R * 1.15 * fade, 0.68 * fade, R * 1.15 * fade,
            c[0], c[1], c[2], 1, 0.3, 0.25, 0, 0);
          for (const q of this.cubes) {
            const h = q.s * 3.1 * fade;
            batch.pushBoxY(X + q.dx, Y + h * 0.5, Z + q.dz, q.ph,
              q.s * 0.8, h, q.s * 0.8, c2[0], c2[1], c2[2], 1, 0.45, 0.2, 0, q.ph);
          }
          batchAlpha.pushBox(X, Y + 0.5, Z, R * 2.2 * fade, 1.1 * fade, R * 2.2 * fade,
            c[0], c[1], c[2], 0.16, 0.5, 0, 0, 0);
          break;
        }

        // ☠️ низкий туман, из которого всплывают и лопаются пузыри
        case 'poison': {
          for (const q of this.cubes) {
            const ph = (t * 0.45 + q.ph * 0.16) % 1;
            const yy = Y + ph * 1.5;
            const sc = q.s * (1.1 - ph * 0.55) * fade;
            batchAlpha.pushBoxY(X + q.dx, yy, Z + q.dz, q.ph + t,
              sc, sc, sc, c[0], c[1], c[2], 0.4 * (1 - ph) * fade, 0.4, 0, 0, q.ph);
          }
          batchAlpha.pushBox(X, Y + 0.16, Z, R * 1.9 * fade, 0.28, R * 1.9 * fade,
            c2[0], c2[1], c2[2], 0.2 * fade, 0.35, 0, 0, 0);
          break;
        }

        // ⚡ короткие разряды прыгают по земле
        case 'spark': {
          for (let i = 0; i < 9; i++) {
            const a = t * 11 + i * 0.7;
            const r = ((i % 3) + 1) / 3 * R;
            batchAlpha.pushBoxY(X + Math.cos(a) * r, Y + 0.18 + ((i * 7) % 5) * 0.13, Z + Math.sin(a) * r,
              a * 3, 0.09, 0.34, 0.09, c[0], c[1], c[2], fade, 1, 0, 0, i);
          }
          break;
        }

        // 🌪️ кружащийся мусор
        case 'wind': {
          for (const q of this.cubes) {
            const a = q.ph * 6 + t * 7;
            const r = R * (0.35 + 0.6 * ((q.ph * 3) % 1));
            batchAlpha.pushBoxY(X + Math.cos(a) * r, Y + 0.25 + Math.sin(a * 2 + t * 4) * 0.5, Z + Math.sin(a) * r,
              a * 2, q.s * 0.7, q.s * 0.7, q.s * 0.7, c[0], c[1], c[2], 0.6 * fade, 0.5, 0, 0, q.ph);
          }
          break;
        }

        // 🌑 разлом тьмы: вертикальные пластины
        case 'shadow': {
          for (const q of this.cubes) {
            const h = (0.7 + Math.sin(t * 4.5 + q.ph * 5) * 0.35) * fade;
            batchAlpha.pushBoxY(X + q.dx, Y + h * 0.8, Z + q.dz, q.ph * 4,
              0.13, h * 1.7, q.s * 1.5, c[0], c[1], c[2], 0.7 * fade, 0.85, 0, 0, q.ph);
          }
          batchAlpha.pushBox(X, Y + 0.08, Z, R * 2 * fade, 0.1, R * 2 * fade,
            0.02, 0.0, 0.05, 0.65 * fade, 0, 0, 0, 0);
          break;
        }

        // ✨ мерцающая звёздная пыль
        case 'star': {
          for (const q of this.cubes) {
            const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 4 + q.ph * 9));
            const sc = q.s * 0.55 * tw * fade;
            batchAlpha.pushBoxY(X + q.dx, Y + 0.25 + Math.sin(t * 1.6 + q.ph * 5) * 0.4, Z + q.dz,
              t * 2 + q.ph, sc, sc, sc, c2[0], c2[1], c2[2], tw * fade, 1, 0, 0, q.ph);
          }
          break;
        }

        // 🪨 каменное крошево — замедляет
        case 'rubble': {
          for (const q of this.cubes) {
            const sc = q.s * 1.1 * fade;
            batch.pushBoxY(X + q.dx, Y + sc * 0.32, Z + q.dz, q.ph * 3,
              sc, sc * 0.62, sc, c[0], c[1], c[2], 1, 0, 0.55, 0, q.ph);
          }
          break;
        }

        // ⛰️ каменные шипы — вырастают из земли
        case 'spikes': {
          const up = U.clamp(this.t / 0.25, 0, 1);
          for (const q of this.cubes) {
            const h = q.s * 3.4 * fade * up;
            batch.pushBoxY(X + q.dx, Y + h * 0.45, Z + q.dz, q.ph * 2,
              q.s * 0.85, h, q.s * 0.85, c[0], c[1], c[2], 1, 0, 0.5, 0, q.ph);
            batch.pushBoxY(X + q.dx, Y + h * 0.95, Z + q.dz, q.ph * 2,
              q.s * 0.4, h * 0.35, q.s * 0.4, c2[0], c2[1], c2[2], 1, 0.1, 0.4, 0, q.ph);
          }
          break;
        }

        // 🌎 трещины в земле, из которых сыплется пыль
        case 'cracks': {
          for (const q of this.cubes) {
            const w = q.s * 2.2 * fade;
            batchAlpha.pushBoxY(X + q.dx, Y + 0.05, Z + q.dz, q.ph * 4,
              w, 0.09, w * 0.28, 0.05, 0.03, 0.02, 0.8 * fade, 0, 0, 0, q.ph);
            const rise = ((t * 0.9 + q.ph) % 1);
            batchAlpha.pushBoxY(X + q.dx, Y + rise * 1.1, Z + q.dz, q.ph,
              0.12, 0.12, 0.12, c2[0], c2[1], c2[2], (1 - rise) * 0.6 * fade, 0.5, 0, 0, q.ph);
          }
          break;
        }

        // 🌫️ густой туман — прячет кота и слепит монстров
        case 'mist': {
          for (const q of this.cubes) {
            const bob = Math.sin(t * 0.8 + q.ph) * 0.3;
            const drift = Math.cos(t * 0.5 + q.ph) * 0.5;
            const sc = q.s * 3.2 * fade;
            batchAlpha.pushBoxY(X + q.dx + drift, Y + 0.6 + q.dy + bob, Z + q.dz, q.ph + t * 0.12,
              sc, sc * 0.55, sc, c[0], c[1], c[2], 0.3 * fade, 0.12, 0, 0, q.ph);
          }
          break;
        }

        default: {
          for (const q of this.cubes) {
            const rise = Math.abs(Math.sin(t * 3 + q.ph)) * 0.35;
            const sc = q.s * fade;
            batchAlpha.pushBoxY(X + q.dx, Y + q.dy + rise + sc * 0.4, Z + q.dz, q.ph + t * 1.5,
              sc, sc, sc, c[0], c[1], c[2], 0.62 * fade, 0.7, 0.2, 0, q.ph * 0.15);
          }
        }
      }
    }
  }

  // ============================================================
  //  ПОДБИРАЕМОЕ
  // ============================================================
  class Pickup {
    constructor(o) {
      Object.assign(this, o);
      this.t = Math.random() * 6.28;
      this.dead = false;
      this.vy = 3 + Math.random() * 2;
      this.vx = (Math.random() - 0.5) * 2.5;
      this.vz = (Math.random() - 0.5) * 2.5;
      this.settled = false;
      this.life = 90;
      this.magnet = false;
    }
    update(dt, game) {
      this.t += dt; this.life -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      const p = game.player;
      const d = U.dist(this.x, this.z, p.x, p.z);

      const auto = this.kind === 'coin' || this.kind === 'xp';
      const magR = game.state.hasAbility('magnet') ? 9 : 2.6;
      if (auto && d < magR) this.magnet = true;

      if (this.magnet) {
        const dx = p.x - this.x, dy = (p.y + 0.6) - this.y, dz = p.z - this.z;
        const dd = Math.hypot(dx, dy, dz) || 1;
        const s = 13 * dt;
        this.x += dx / dd * s; this.y += dy / dd * s; this.z += dz / dd * s;
        if (dd < 0.7) { this.collect(game); return; }
        return;
      }

      if (!this.settled) {
        this.vy += GRAV * dt;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        this.vx *= Math.pow(0.1, dt); this.vz *= Math.pow(0.1, dt);
        const g = game.level.groundAt(this.x, this.z);
        if (g > -900 && this.y <= g + 0.25) { this.y = g + 0.25; this.settled = true; }
        if (this.y < -15) this.dead = true;
      }
      // предметы подбираются клавишей K (см. game.interact)
      if (auto && d < 1.1 && Math.abs(this.y - p.y) < 2) this.collect(game);
    }
    collect(game) {
      if (this.dead) return;
      this.dead = true;
      game.collectPickup(this);
    }
    draw(batch, batchAlpha, t) {
      const bob = Math.sin(this.t * 3) * 0.1;
      const spin = this.t * 2.2;
      const fl = this.life < 8 && Math.floor(this.t * 8) % 2 === 0 ? 0.3 : 1;
      if (this.kind === 'coin') {
        batch.pushBoxY(this.x, this.y + bob, this.z, spin, 0.3, 0.3, 0.08,
          1, 0.82, 0.2, fl, 0.75, 0, 0, 0);
        batch.pushBoxY(this.x, this.y + bob, this.z, spin, 0.16, 0.16, 0.1,
          1, 0.95, 0.5, fl, 0.9, 0, 0, 0);
      } else if (this.kind === 'xp') {
        batch.pushBoxY(this.x, this.y + bob, this.z, spin * 1.4, 0.22, 0.22, 0.22,
          0.45, 0.9, 1, fl, 0.95, 0, 0, 0);
      } else if (this.kind === 'key') {
        batch.pushBoxY(this.x, this.y + bob, this.z, spin, 0.12, 0.34, 0.12, 1, 0.85, 0.25, fl, 0.85, 0, 0, 0);
        batch.pushBoxY(this.x, this.y + bob + 0.2, this.z, spin, 0.22, 0.1, 0.22, 1, 0.85, 0.25, fl, 0.85, 0, 0, 0);
        batch.pushBoxY(this.x + 0.09, this.y + bob - 0.14, this.z, spin, 0.16, 0.07, 0.07, 1, 0.85, 0.25, fl, 0.85, 0, 0, 0);
      } else {
        const it = KM.ITEM_BY[this.item];
        const c = itemColor(this.item);
        batch.pushBoxY(this.x, this.y + bob, this.z, spin * 0.6, 0.26, 0.26, 0.26,
          c[0], c[1], c[2], fl, 0.35, 0.3, 0, 0);
        batchAlpha.pushBoxY(this.x, this.y + bob, this.z, spin * 0.6, 0.42, 0.42, 0.42,
          c[0], c[1], c[2], 0.22, 0.6, 0, 0, 0);
      }
    }
  }

  /** Аксессуар на питомце: рисуется поверх модели. */
  function drawPetAcc(batch, batchAlpha, pet, a, t) {
    const h = (pet.model.meta.height || 1.2) * pet.scale;
    const r = (pet.model.meta.radius || 0.4) * pet.scale;
    const x = pet.x, y = pet.y, z = pet.z, yaw = pet.yaw;
    const c = a.c1;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    switch (a.shape) {
      case 'bandana':
        batch.pushBoxY(x + fx * r * 0.5, y + h * 0.52, z + fz * r * 0.5, yaw,
          r * 1.5, 0.09, r * 0.7, c[0], c[1], c[2], 1, 0, 0.4, 0, 0);
        batch.pushBoxY(x + fx * r * 0.45, y + h * 0.40, z + fz * r * 0.45, yaw,
          r * 0.7, 0.16, r * 0.4, c[0], c[1], c[2], 1, 0, 0.4, 0, 1);
        break;
      case 'hat':
        batch.pushBoxY(x, y + h * 1.02, z, yaw, r * 1.5, 0.05, r * 1.5, c[0], c[1], c[2], 1, 0, 0.4, 0, 0);
        batch.pushBoxY(x, y + h * 1.14, z, yaw, r * 0.95, 0.22, r * 0.95, c[0], c[1], c[2], 1, 0, 0.4, 0, 1);
        break;
      case 'bow':
        batch.pushBoxY(x - fz * r * 0.4, y + h * 1.02, z + fx * r * 0.4, yaw, r * 0.6, r * 0.5, 0.07, c[0], c[1], c[2], 1, 0, 0.35, 0, 0);
        batch.pushBoxY(x + fz * r * 0.4, y + h * 1.02, z - fx * r * 0.4, yaw, r * 0.6, r * 0.5, 0.07, c[0], c[1], c[2], 1, 0, 0.35, 0, 1);
        batch.pushBoxY(x, y + h * 1.02, z, yaw, r * 0.3, r * 0.3, 0.09, 1, 1, 1, 1, 0.2, 0.3, 0, 2);
        break;
      case 'collar':
        for (let i = 0; i < 8; i++) {
          const ang = i / 8 * 6.283;
          batch.pushBoxY(x + Math.cos(ang) * r * 0.95, y + h * 0.48, z + Math.sin(ang) * r * 0.95,
            ang, 0.09, 0.09, 0.09, c[0], c[1], c[2], 1, 0.15, 0.3, 0, i);
          batch.pushBoxY(x + Math.cos(ang) * r * 1.15, y + h * 0.52, z + Math.sin(ang) * r * 1.15,
            ang, 0.06, 0.13, 0.06, c[0], c[1], c[2], 1, 0.25, 0.2, 0, i + 8);
        }
        break;
      case 'halo':
        for (let i = 0; i < 10; i++) {
          const ang = t * 1.2 + i / 10 * 6.283;
          batchAlpha.pushBoxY(x + Math.cos(ang) * r * 0.85, y + h * 1.25 + Math.sin(t * 2) * 0.04,
            z + Math.sin(ang) * r * 0.85, ang, 0.08, 0.05, 0.08,
            c[0], c[1], c[2], 0.95, 1, 0, 0, i);
        }
        break;
      case 'horns':
        for (const sx of [-1, 1]) {
          batch.pushBoxY(x - fz * r * 0.45 * sx, y + h * 1.02, z + fx * r * 0.45 * sx, yaw,
            0.09, 0.18, 0.09, c[0], c[1], c[2], 1, 0.1, 0.35, 0, sx);
          batch.pushBoxY(x - fz * r * 0.5 * sx, y + h * 1.16, z + fx * r * 0.5 * sx, yaw,
            0.06, 0.11, 0.06, c[0], c[1], c[2], 1, 0.1, 0.3, 0, sx + 2);
        }
        break;
    }
  }

  function itemColor(id) {
    switch (id) {
      case 'fish': return [0.5, 0.8, 1];
      case 'milk': return [1, 1, 0.95];
      case 'berry': return [0.4, 0.3, 0.9];
      case 'meat': return [0.9, 0.4, 0.35];
      case 'cake': return [1, 0.75, 0.85];
      case 'treat': return [0.9, 0.7, 0.4];
      case 'potHp': return [1, 0.3, 0.4];
      case 'potMana': return [0.3, 0.5, 1];
      case 'potEn': return [1, 0.85, 0.3];
      case 'fang': return [1, 0.97, 0.9];
      case 'shard': return [0.6, 0.9, 1];
      case 'essence': return [0.7, 0.3, 1];
      case 'egg': return [1, 0.95, 0.85];
      case 'scroll': return [0.95, 0.9, 0.7];
      default: return [1, 1, 1];
    }
  }

  KM.Monster = Monster;
  KM.Pet = Pet;
  KM.Projectile = Projectile;
  KM.Zone = Zone;
  KM.Pickup = Pickup;
  KM.itemColor = itemColor;
})(window);
