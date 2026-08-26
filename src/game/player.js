/* ============================================================
   КОТИКИ МАГИ 3D — игрок (кот-маг)
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  const SPEED_LEVELS = [
    { name: 'Крадусь', mul: 0.55, drain: 0, icon: '🐾' },
    { name: 'Шаг', mul: 1.0, drain: 0, icon: '🚶' },
    { name: 'Бег', mul: 1.62, drain: 9.5, icon: '🏃' }
  ];

  const GRAVITY = -26;
  const JUMP_V = 8.4;
  const RADIUS = 0.34;
  const STEP_UP = 0.72;
  // где находится голова кота относительно центра модели
  const HEAD_FWD = 0.30;
  const HEAD_UP = 0.88;
  const TMPA = M4.create();
  const TMPB = M4.create();

  class Player {
    constructor(game) {
      this.game = game;
      this.model = KM.MODELS.cat;
      this.pose = new KM.vox.Pose(this.model);
      this.mat = M4.create();

      this.x = 0; this.y = 2; this.z = 0;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.yaw = 0;            // направление взгляда камеры
      this.pitch = -0.18;
      this.facing = 0;         // направление тела (сглаженное)
      this.onGround = false;
      this.speedLevel = 1;
      this.jumpsLeft = 2;

      this.hp = 100; this.maxHp = 100;
      this.mana = 60; this.maxMana = 60;
      this.energy = 100; this.maxEnergy = 100;

      this.walkPhase = 0; this.walkAmt = 0; this.runAmt = 0;
      this.restT = 0; this.idleT = 0;
      this.attackT = 0; this.castT = 0; this.hurtT = 0;
      this.blink = 0; this.blinkTimer = 2;
      this.invuln = 0;
      this.dashCd = 0; this.dashT = 0;
      this.shieldT = 0; this.shieldCd = 0;
      this.spellCd = {};
      this.selectedSpell = 0;
      this.firstPerson = false;
      this.camDist = 5.2; this.camDistWant = 5.2;
      this.hidden = false; this.hideAmt = 0;
      this.inWater = false; this.inLava = false;
      this.dead = false; this.revived = false;
      this.emote = null;        // какая выходка играет
      this.emoteT = 0;          // сколько она уже идёт
      this.effects = { burn: 0, poison: 0, slow: 0, freeze: 0, vuln: 0 };
      this.stepTimer = 0;
      this.footY = 0;
      this.lastDamageSrc = null;
      this.keysHeld = 0;
      this.combatT = 0;
      this.abilityCd = {};
      this.invisT = 0; this.hasteT = 0;
      this.flipT = 0; this.flipDur = 0.62;
      this.ghosts = []; this.ghostT = 0;
      this.mistT = 0; this.bounceT = 0; this.cloudT = 0; this.cloudSpawnT = 0;
      this.climate = 100; this.climateDmgT = 0; this.climateNet = 0;
      this.climateEnv = 0; this.climateHot = false;
    }

    applyStats() {
      const st = this.game.state.stats();
      // у каждого персонажа своя модель
      const m = KM.catModel(st.cat);
      if (m !== this.model) { this.model = m; this.pose = new KM.vox.Pose(m); }
      const hpRatio = this.maxHp ? this.hp / this.maxHp : 1;
      this.maxHp = st.maxHp; this.maxMana = st.maxMana; this.maxEnergy = st.maxEnergy;
      this.hp = Math.min(this.maxHp, Math.max(1, hpRatio * this.maxHp));
      this.st = st;
    }

    resetForLevel(level) {
      this.applyStats();
      this.hp = this.maxHp; this.mana = this.maxMana; this.energy = this.maxEnergy;
      // в командной игре — на своей стороне карты, а не там же, где враги
      const точка = this.game.spawnPoint ? this.game.spawnPoint() : level.spawn;
      this.x = точка.x; this.z = точка.z;
      this.y = (точка.y !== undefined ? точка.y : level.spawn.y) + 0.2;
      this.vx = this.vy = this.vz = 0;
      this.dead = false; this.revived = false;
      this.effects = { burn: 0, poison: 0, slow: 0, freeze: 0, vuln: 0 };
      this.speedLevel = 1;
      this.spellCd = {};
      this.hurtT = 0; this.invuln = 1.2;
      this.keysHeld = 0;
      this.yaw = 0; this.pitch = -0.15;
      this.facing = 0;
      this.abilityCd = {};
      this.invisT = 0; this.hasteT = 0; this.flipT = 0;
      this.ghosts.length = 0;
      this.mistT = 0; this.bounceT = 0; this.cloudT = 0;
      this.climate = 100; this.climateDmgT = 0; this.climateNet = 0; this.climateHot = false;
    }

    // ------------------------------------------------------------
    get eyeY() { return this.y + 0.86; }

    /** Высота земли под окружностью игрока. */
    groundUnder(x, z) {
      const L = this.game.level;
      let m = -9999;
      const r = RADIUS * 0.8;
      const pts = [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]];
      let anySolid = false;
      for (const [dx, dz] of pts) {
        const h = L.groundAt(x + dx, z + dz);
        if (h > -900) { anySolid = true; if (h > m) m = h; }
      }
      return anySolid ? m : -9999;
    }

    /** Верх облачной платформы под лапами (или -9999). */
    platformTop(x, z, feetY) {
      const list = this.game.platforms;
      let best = -9999;
      for (let i = 0; i < list.length; i++) {
        const pl = list[i];
        const dx = x - pl.x, dz = z - pl.z;
        if (dx * dx + dz * dz > pl.r * pl.r) continue;
        const top = pl.y + pl.h * 0.5;
        if (top <= feetY + 0.4 && top > best) best = top;
      }
      return best;
    }

    canStand(x, z, feetY) {
      const g = this.groundUnder(x, z);
      if (g < -900) return true;               // пустота — туда можно упасть
      return g <= feetY + STEP_UP;
    }

    resolveProps(dt) {
      const L = this.game.level;
      const gx = Math.floor(this.x + L.half), gz = Math.floor(this.z + L.half);
      if (gx < 0 || gz < 0 || gx >= L.N || gz >= L.N) return;
      const g2 = this.game;
      if (g2.keepOutOfEnemyBase) g2.keepOutOfEnemyBase(this);
      const list = L.cellCollide[gz * L.N + gx];
      if (!list) return;
      for (const c of list) {
        const dx = this.x - c.x, dz = this.z - c.z;
        const d2 = dx * dx + dz * dz;
        const rr = c.r + RADIUS;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d);
          this.x += (dx / d) * push;
          this.z += (dz / d) * push;
        }
      }
    }

    // ------------------------------------------------------------
    update(dt, input) {
      const g = this.game;
      const L = g.level;
      const st = this.st;
      if (this.dead) { this.updateTimers(dt); return; }

      // ---------- камера (захват курсора или удержание ПКМ) ----------
      if (input.mouse.dx || input.mouse.dy) {
        this.yaw -= input.mouse.dx * input.sensitivity;
        this.pitch -= input.mouse.dy * input.sensitivity;
        this.pitch = U.clamp(this.pitch, -1.35, 1.25);
      }
      if (input.mouse.wheel && !this.firstPerson) {
        this.camDistWant = U.clamp(this.camDistWant + input.mouse.wheel * 0.6, 2.2, 11);
      }
      if (input.justPressed('KeyV')) {
        this.firstPerson = !this.firstPerson;
        g.ui.toast(this.firstPerson ? 'Вид от первого лица' : 'Вид от третьего лица', 'info');
        g.audio.sfx('ui');
      }

      // ---------- уровни скорости (E быстрее / Q медленнее) ----------
      if (input.justPressed('KeyE')) {
        if (this.speedLevel < 2) { this.speedLevel++; g.audio.sfx('ui'); g.ui.flashSpeed(); if (g.tutorial) g.tutorial.event('speed'); }
        else g.ui.toast('Быстрее уже некуда!', 'warn');
      }
      if (input.justPressed('KeyQ')) {
        if (this.speedLevel > 0) { this.speedLevel--; g.audio.sfx('ui'); g.ui.flashSpeed(); if (g.tutorial) g.tutorial.event('speed'); }
      }
      if (this.energy < 3 && this.speedLevel === 2) {
        this.speedLevel = 1;
        g.ui.toast('Кот запыхался! Нужно отдохнуть (F)', 'warn');
      }

      // ---------- ввод движения ----------
      let ix = 0, iz = 0;
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) iz += 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) iz -= 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) ix -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) ix += 1;
      // сенсорный джойстик даёт плавное направление вместо четырёх клавиш
      if (input.axis && (input.axis.x || input.axis.z) && !input._blocked) {
        ix += input.axis.x; iz += input.axis.z;
      }
      const moving = (ix !== 0 || iz !== 0);
      if (moving) { const l = Math.hypot(ix, iz); ix /= l; iz /= l; }

      // ---------- отдых ----------
      this.updateEmote(dt, input);
      const wantRest = input.isDown('KeyF');
      if (moving || this.attackT > 0 || this.castT > 0) this.idleT = 0; else this.idleT += dt;
      const resting = (wantRest && this.onGround) || (this.idleT > 3.5 && this.onGround && this.energy < this.maxEnergy * 0.99);
      this.restT = U.damp(this.restT, resting ? 1 : 0, 9, dt);
      if (this.restT > 0.6) {
        this._purrT = (this._purrT || 0) - dt;
        if (this._purrT <= 0) { this._purrT = 1.6 + Math.random() * 1.2; g.audio.sfx('purr'); }
      } else this._purrT = 0.4;

      // ---------- рывок (Shift) ----------
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.dashT = Math.max(0, this.dashT - dt);
      const wantDash = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      if (wantDash && this.dashCd <= 0 && this.energy >= 22 && !resting) {
        const dirX = moving ? ix : 0, dirZ = moving ? iz : 1;
        const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
        const wx = dirX * c - dirZ * s;
        const wz = -dirX * s - dirZ * c;
        const power = 15.5;
        this.vx = wx * power; this.vz = wz * power;
        this.energy -= 22;
        this.dashCd = 0.85; this.dashT = 0.26;
        this.invuln = Math.max(this.invuln, 0.22);
        g.audio.sfx('dash');
        g.fx.dashBurst(this.x, this.y + 0.35, this.z, this.st.cat.pal.fur);
        g.ui.flashDash();
      }

      // ---------- скорость ----------
      const lvl = SPEED_LEVELS[this.speedLevel];
      let speed = 4.6 * lvl.mul * st.speed;
      if (this.hasteT > 0) speed *= 1.85;
      if (this.effects.slow > 0) speed *= 0.55;
      if (this.effects.freeze > 0) speed *= 0.42;
      if (this.inWater) speed *= 0.62;
      if (resting) speed = 0;

      // энергия
      if (moving && this.onGround && !resting && this.hasteT <= 0) {
        this.energy -= lvl.drain * dt;
      }
      const restBonus = resting ? 3.2 : (moving ? 0.35 : 1.4);
      this.energy += st.energyRegen * restBonus * dt * 0.35;
      this.energy = U.clamp(this.energy, 0, this.maxEnergy);

      // мана / здоровье
      this.mana = Math.min(this.maxMana, this.mana + st.manaRegen * (resting ? 2.5 : 1) * dt);
      if (resting) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.045 * dt);
      if (st.regen) this.hp = Math.min(this.maxHp, this.hp + st.regen * dt);

      // ---------- горизонтальное движение ----------
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      let wx = ix * c - iz * s;
      let wz = -ix * s - iz * c;
      const targetVx = wx * speed, targetVz = wz * speed;
      const accel = this.onGround ? (this.dashT > 0 ? 3 : 15) : 6;
      this.vx = U.damp(this.vx, targetVx, accel, dt);
      this.vz = U.damp(this.vz, targetVz, accel, dt);

      // ---------- прыжок ----------
      if (input.justPressed('Space') && !resting) {
        const bJ = this.bounceT > 0 ? 1.75 : 1;
        const air = this.airJumps();          // сколько прыжков доступно в воздухе
        if (this.onGround) {
          // 1-й прыжок — обычный, доступен всегда
          this.vy = JUMP_V * st.jump * bJ;
          this.onGround = false;
          this.jumpsLeft = air;
          g.audio.sfx('jump');
          if (g.tutorial) g.tutorial.event('jump');
          g.fx.puff(this.x, this.y, this.z, 6, [0.9, 0.9, 0.9]);
        } else if (this.jumpsLeft > 0) {
          const isFlip = (this.jumpsLeft === air);   // первый прыжок в воздухе — САЛЬТО
          this.jumpsLeft--;
          const winged = g.state.hasAbility('doublejump') ? 1.12 : 1;
          if (isFlip) {
            this.vy = JUMP_V * st.jump * 1.02 * bJ * winged;
            this.flipT = this.flipDur;
            g.audio.sfx('dash');
            g.audio.sfx('jump');
            g.fx.ring(this.x, this.y + 0.45, this.z, 1.5, [1, 0.9, 0.5]);
            for (let i = 0; i < 12; i++) {
              const a = i / 12 * 6.283;
              g.fx.spawn(this.x + Math.cos(a) * 0.5, this.y + 0.5, this.z + Math.sin(a) * 0.5,
                Math.cos(a) * 2.5, 0.6, Math.sin(a) * 2.5, 0.09, 0.4,
                this.st.cat.pal.gem, { g: -2, emis: 1, drag: 1.4 });
            }
            g.ui.toast('\u{1F938} \u0421\u0430\u043B\u044C\u0442\u043E!', 'info', 900);
          } else {
            this.vy = JUMP_V * st.jump * 0.88 * bJ * winged;
            g.audio.sfx('jump');
            g.fx.ring(this.x, this.y + 0.2, this.z, 1.1, [0.7, 0.9, 1]);
          }
        }
      }

      // ---------- гравитация и перемещение ----------
      let gmul = 1;
      if (this.cloudT > 0 && this.vy < 0) gmul = 0.32;        // облачная тропа — мягкое парение
      else if (st.feather && this.vy < 0) gmul = 0.62;        // кошачья лапка
      this.vy += GRAVITY * gmul * dt;
      const term = (this.cloudT > 0 || st.feather) ? -11 : -40;
      if (this.vy < term) this.vy = term;

      // облачная тропа: под лапами в воздухе возникают облака
      if (this.cloudT > 0) {
        this.cloudSpawnT -= dt;
        if (this.cloudSpawnT <= 0 && !this.onGround) {
          this.cloudSpawnT = 0.20;
          g.platforms.push(KM.makePlatform(g, this.x, this.y - 0.22, this.z, 1.5, 4.5));
          if (g.platforms.length > 40) g.platforms.shift();
        }
      }

      const nx = this.x + this.vx * dt;
      const nz = this.z + this.vz * dt;
      if (this.canStand(nx, this.z, this.y)) this.x = nx; else this.vx *= 0.2;
      if (this.canStand(this.x, nz, this.y)) this.z = nz; else this.vz *= 0.2;
      this.resolveProps(dt);

      // границы карты
      const lim = L.half - 1.2;
      this.x = U.clamp(this.x, -lim, lim);
      this.z = U.clamp(this.z, -lim, lim);

      this.y += this.vy * dt;
      let ground = this.groundUnder(this.x, this.z);
      const plat = this.platformTop(this.x, this.z, this.y);
      if (plat > -900 && plat > ground) ground = plat;
      if (ground < -900) {
        // падение в пустоту
        if (this.y < -14) {
          this.damage(this.maxHp * 0.22, null, 'бездна');
          this.x = L.spawn.x; this.z = L.spawn.z; this.y = L.spawn.y + 1.5;
          this.vx = this.vy = this.vz = 0;
          g.ui.toast('Ой! Кот провалился в пустоту', 'bad');
        }
        this.onGround = false;
      } else if (this.y <= ground) {
        if (!this.onGround && this.vy < -9) {
          g.audio.sfx('land');
          g.fx.puff(this.x, ground, this.z, 8, [0.85, 0.85, 0.8]);
          if (this.vy < -21 && !st.feather) this.damage(Math.min(35, (-this.vy - 21) * 2.6), null, 'падение');
        }
        this.y = ground;
        if (this.bounceT > 0 && this.vy < -3) {
          // супер-прыгучесть: отскакиваем сами
          this.vy = Math.min(16, -this.vy * 0.82 + 3);
          g.audio.sfx('jump');
          g.fx.ring(this.x, this.y + 0.1, this.z, 1.3, [0.6, 1, 0.8]);
          this.onGround = false;
          this.jumpsLeft = this.airJumps();
          this.footY = ground;
          return;
        }
        this.vy = 0;
        if (!this.onGround) { this.jumpsLeft = this.airJumps(); this.flipT = 0; }
        this.onGround = true;
      } else {
        this.onGround = false;
      }
      this.footY = ground > -900 ? ground : this.y;

      // ---------- вода / лава ----------
      const wasInWater = this.inWater;
      this.inWater = false; this.inLava = false;
      if (L.water) {
        const cellH = L.groundAt(this.x, this.z);
        if (cellH > -900 && cellH < L.water.level && this.y < L.water.level + 0.15) {
          if (L.water.lava) {
            this.inLava = true;
            this.damage(26 * dt, null, 'лава');
            if (Math.random() < dt * 6) g.fx.puff(this.x, this.y + 0.2, this.z, 2, [1, 0.5, 0.1]);
            if (Math.random() < dt * 2.5) g.audio.sfx('sizzle');
          } else {
            this.inWater = true;
            if (Math.random() < dt * 4) g.fx.puff(this.x, L.water.level, this.z, 1, L.water.color);
          }
        }
      }

      if (this.inWater && !wasInWater) g.audio.sfx('splash');

      // ---------- прятки в кустах ----------
      let inBush = false;
      for (const b of L.bushes) {
        if (U.dist2(this.x, this.z, b.x, b.z) < b.r * b.r && Math.abs(this.y - b.y) < 1.6) { inBush = true; break; }
      }
      const slowEnough = Math.hypot(this.vx, this.vz) < (g.state.hasAbility('ghoststep') ? 5.5 : 2.2);
      const shouldHide = inBush && slowEnough;
      if (inBush && !this._wasBush) g.audio.sfx('bush');
      this._wasBush = inBush;
      this.hideAmt = U.damp(this.hideAmt, shouldHide ? 1 : 0, g.state.hasAbility('ghoststep') ? 12 : 4.5, dt);
      this.hidden = this.hideAmt > 0.72 || this.mistT > 0;

      // ---------- боевые действия ----------
      this.handleCombat(dt, input);

      // ---------- анимация ----------
      const hspeed = Math.hypot(this.vx, this.vz);
      const norm = U.clamp(hspeed / 7.4, 0, 1.4);
      this.walkAmt = U.damp(this.walkAmt, this.onGround ? Math.min(1, norm * 1.5) : 0.15, 12, dt);
      this.runAmt = U.damp(this.runAmt, this.speedLevel === 2 && hspeed > 3 ? 1 : 0, 8, dt);
      this.walkPhase += dt * (5.0 + hspeed * 1.5);
      if (this.onGround && hspeed > 1.2 && !resting) {
        this.stepTimer -= dt * (1.2 + hspeed * 0.42);
        if (this.stepTimer <= 0) { this.stepTimer = 1; g.audio.sfx(this.stepSound()); }
      }
      // Поворот тела — ТОЛЬКО от клавиш движения.
      // Камера (ПКМ) крутится сама по себе и кота не разворачивает:
      // стоя на месте, кот смотрит туда же, куда смотрел.
      if (moving && hspeed > 0.4) {
        const want = Math.atan2(this.vx, this.vz);
        this.facing += U.angDiff(this.facing, want) * Math.min(1, dt * 11);
      }

      this.updateTimers(dt);
      this.updateEffects(dt);
      this.updateClimate(dt);

      // камера-дистанция
      this.camDist = U.damp(this.camDist, this.firstPerson ? 0 : this.camDistWant, 10, dt);
    }

    /**
     * Прыжков в воздухе после отрыва от земли.
     * Базово 2 (сальто + ещё один), со способностью «Воздушный Прыжок» — 3.
     */
    airJumps() {
      return this.game.state.hasAbility('doublejump') ? 3 : 2;
    }


    /**
     * Климат: в холодных локациях запас тепла тает, в жарких — запас прохлады.
     * Одежда сдвигает баланс: чем теплее одет — тем дольше держишься на морозе,
     * но тем быстрее перегреваешься в жаре.
     */
    updateClimate(dt) {
      const g = this.game, L = g.level, st = this.st;
      if (!L || !st) return;

      // температура окружения
      let env = L.biome.temp || 0;
      if (this.inWater) env -= 1.6;
      if (this.inLava) env += 3;
      // огонь рядом греет, вода и туман — холодят
      for (const z of g.zones) {
        if (z.dead) continue;
        if (U.dist2(z.x, z.z, this.x, this.z) > z.radius * z.radius) continue;
        if (z.kind === 'fire') env += 2.5;
        else if (z.kind === 'water' || z.kind === 'mist' || z.kind === 'ice') env -= 2.0;
      }
      for (const c of g.clouds) {
        if (c.kind === 'rain' && U.dist2(c.x, c.z, this.x, this.z) < c.radius * c.radius) env -= 1.5;
      }
      // отдых у костра-огонька: сидящий кот мёрзнет медленнее
      const restBonus = this.restT > 0.5 ? 0.8 : 0;

      const warm = st.warm || 0;
      // В холоде тёплая одежда только помогает (перегреться в снегах нельзя),
      // а в жаре она наоборот делает хуже — спасает только лёгкая и холодящая.
      let net;
      if (env < 0) net = Math.min(0, env + warm + restBonus);
      else if (env > 0) net = Math.max(0, env + warm);
      else net = 0;

      this.climateEnv = env;
      this.climateNet = net;

      // иммунитеты
      if ((net < 0 && st.coldImmune) || (net > 0 && st.heatImmune)) net = 0;

      const COMFORT = 1.5;
      // ограничиваем, чтобы шуба на вулкане не убивала мгновенно
      const excess = Math.min(6, Math.abs(net) - COMFORT);
      this.climateHot = net > 0;

      if (excess <= 0) {
        // комфортно — запас восстанавливается
        this.climate = Math.min(100, this.climate + (this.restT > 0.5 ? 34 : 17) * dt);
        this.climateDmgT = 0;
        return;
      }

      // запас тает тем быстрее, чем сильнее перекос
      this.climate -= excess * 1.6 * dt;
      if (this.climate > 0) return;

      this.climate = 0;
      // запас кончился — пошёл урон
      this.climateDmgT -= dt;
      if (this.climateDmgT <= 0) {
        this.climateDmgT = 1;
        this.damage(excess * 2.2, null, this.climateHot ? 'жара' : 'холод', true);
        g.ui.hurtFlash();
        if (Math.random() < 0.6) {
          g.fx.damageNumber(this.x, this.y + 1.1, this.z,
            Math.round(excess * 2.2), this.climateHot ? 'fire' : 'ice');
        }
      }
      // визуальный эффект: пар изо рта или капли пота
      if (Math.random() < dt * 7) {
        const c = this.climateHot ? [1, 0.75, 0.4] : [0.75, 0.9, 1];
        g.fx.spawn(this.x + (Math.random() - 0.5) * 0.4, this.y + 0.85, this.z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.5, this.climateHot ? -1.2 : 0.9, (Math.random() - 0.5) * 0.5,
          0.07, 0.7, c, { g: this.climateHot ? -3 : 0.4, emis: 0.3, drag: 1, alpha: 0.7 });
      }
    }

    /** Звук шага зависит от того, по чему кот идёт. */
    stepSound() {
      const L = this.game.level;
      if (this.inWater) return 'step_water';
      const b = L.biome.id;
      if (b === 'frost') return 'step_snow';
      if (b === 'volcano' || b === 'crystal' || b === 'void' || b === 'desert') return 'step_stone';
      return 'step_grass';
    }

    handleCombat(dt, input) {
      const g = this.game;
      const st = this.st;

      // выбор заклинания цифрами
      const spells = g.state.data.spells;
      for (let i = 0; i < 10; i++) {
        const code = i === 9 ? 'Digit0' : ('Digit' + (i + 1));
        if (input.justPressed(code) && i < spells.length) {
          this.selectedSpell = i;
          g.audio.sfx('ui');
          if (g.tutorial) g.tutorial.event('spell');
          g.ui.updateSpellBar();
        }
      }
      if (input.justPressed('Tab')) {
        this.selectedSpell = (this.selectedSpell + 1) % Math.max(1, spells.length);
        g.audio.sfx('ui');
        if (g.tutorial) g.tutorial.event('spell');
        g.ui.updateSpellBar();
      }

      // перезарядки
      for (const k in this.spellCd) this.spellCd[k] = Math.max(0, this.spellCd[k] - dt);

      // --- мышь ---
      // ПКМ  — вращение камеры (обрабатывается во вводе)
      // ЛКМ  — удар лапой
      // ЛКМ+ПКМ вместе — заклинание
      const mL = input.mouse.left, mR = input.mouse.right;
      const bothNow = mL && mR;
      const bothJust = bothNow && !this._bothPrev;
      this._bothPrev = bothNow;

      // удар лапой (только ЛКМ, без ПКМ)
      if (input.mouse.leftPressed && !mR && this.attackT <= 0 && this.castT <= 0 && this.restT < 0.5) {
        this.attackT = 0.34;
        g.audio.sfx('claw');
        const reach = g.state.hasAbility('clawmaster') ? 2.9 : 2.1;
        const dmg = (14 + st.flatDmg) * st.clawPower * (g.state.hasAbility('clawmaster') ? 2 : 1);
        g.meleeAttack(this, reach, dmg);
        this.combatT = 5;
      }

      // заклинание: обе кнопки мыши или T
      const castNow = bothJust || input.justPressed('KeyT');
      if (castNow && this.castT <= 0 && this.restT < 0.5) {
        this.attackT = 0;   // отменяем начатый замах
        this.castSpell();
      }

      // активные способности (Z X C G B H) — у каждой своя физика
      for (const ab of KM.ABILITIES) {
        if (!ab.active) continue;
        const cd = this.abilityCd[ab.id] || 0;
        if (cd > 0) this.abilityCd[ab.id] = Math.max(0, cd - dt);
        if (!input.justPressed(ab.key)) continue;
        if (!g.state.hasAbility(ab.id)) {
          g.ui.toast('Способность «' + ab.name + '» ещё не открыта', 'warn');
          g.audio.sfx('error');
          continue;
        }
        if ((this.abilityCd[ab.id] || 0) > 0) {
          g.ui.toast(ab.icon + ' ' + ab.name + ' — ещё ' + Math.ceil(this.abilityCd[ab.id]) + ' с', 'warn', 1200);
          g.audio.sfx('error');
          continue;
        }
        if (this.mana < ab.mana) {
          g.ui.toast('Не хватает маны для «' + ab.name + '»', 'warn');
          g.audio.sfx('error');
          continue;
        }
        if (KM.activateAbility(g, ab)) {
          this.mana -= ab.mana;
          this.abilityCd[ab.id] = ab.cd;
          this.castT = 0.42;
          g.ui.updateAbilityBar();
        }
      }
      this.shieldT = Math.max(0, this.shieldT - dt);
      this.invisT = Math.max(0, this.invisT - dt);
      this.hasteT = Math.max(0, this.hasteT - dt);
      this.flipT = Math.max(0, this.flipT - dt);
      this.mistT = Math.max(0, this.mistT - dt);
      this.bounceT = Math.max(0, this.bounceT - dt);
      this.cloudT = Math.max(0, this.cloudT - dt);

      // шлейф призрачных копий при ускорении
      if (this.hasteT > 0) {
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.055;
          this.ghosts.push({ x: this.x, y: this.y, z: this.z, f: this.facing, life: 0.42 });
          if (this.ghosts.length > 9) this.ghosts.shift();
        }
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        this.ghosts[i].life -= dt;
        if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
      }

      // съесть еду (R)
      if (input.justPressed('KeyR')) this.eat();

      // взаимодействие / подобрать (K)
      if (input.justPressed('KeyK')) g.interact();
    }

    castSpell() {
      const g = this.game;
      const st = this.st;
      const ids = g.state.data.spells;
      const id = ids[Math.min(this.selectedSpell, ids.length - 1)];
      const sp = KM.SPELL_BY[id];
      if (!sp) return;
      if ((this.spellCd[id] || 0) > 0) return;
      if (this.mana < sp.mana) {
        g.ui.toast('Не хватает маны!', 'warn');
        g.audio.sfx('error');
        return;
      }
      this.mana -= sp.mana;
      this.spellCd[id] = sp.cd * st.cooldown;
      this.castT = 0.42;
      this.combatT = 5;

      let power = st.spellPower;
      if (g.state.hasAbility('wildheart')) power *= 1 + 0.5 * (1 - this.hp / this.maxHp);

      g.castSpell(this, sp, power);
      g.audio.sfx(sp.el === 'fire' ? 'fire' : sp.el === 'ice' ? 'ice' : sp.el === 'water' ? 'water' : 'cast');
      g.ui.updateSpellBar();
    }

    eat() {
      const g = this.game;
      const id = g.state.firstFood();
      if (!id) { g.ui.toast('В сумке нет еды', 'warn'); g.audio.sfx('error'); return; }
      const it = KM.ITEM_BY[id];
      if (!g.state.removeItem(id, 1)) return;
      if (it.hp) this.hp = Math.min(this.maxHp, this.hp + it.hp);
      if (it.mana) this.mana = Math.min(this.maxMana, this.mana + it.mana);
      if (it.en) this.energy = Math.min(this.maxEnergy, this.energy + it.en);
      this.effects.poison = 0;
      g.audio.sfx('eat');
      g.ui.toast('Съедено: ' + it.name + ' ' + it.icon, 'good');
      g.fx.hearts(this.x, this.y + 1.0, this.z);
      g.ui.updateHud();
      g.state.save();
    }

    /** Начать выходку. Возвращает true, если получилось. */
    playEmote(id) {
      const def = KM.EMOTE_BY && KM.EMOTE_BY[id];
      if (!def || this.dead) return false;
      this.emote = id;
      this.emoteT = 0;
      this._emoteAir = 0;
      this.game.audio.sfx('ui');
      if (this.game.net && this.game.serverMode) this.game.net.sendEmote(id);
      return true;
    }

    stopEmote() { this.emote = null; this.emoteT = 0; }

    /** Выходка идёт, пока кот стоит спокойно. */
    updateEmote(dt, input) {
      if (!this.emote) return;
      const def = KM.EMOTE_BY[this.emote];
      if (!def) { this.stopEmote(); return; }
      this.emoteT += dt;
      const движется = input && (input.isDown('KeyW') || input.isDown('KeyS') ||
        input.isDown('KeyA') || input.isDown('KeyD') ||
        input.isDown('ArrowUp') || input.isDown('ArrowDown') ||
        input.isDown('ArrowLeft') || input.isDown('ArrowRight') ||
        (input.axis && (Math.abs(input.axis.x) > 0.2 || Math.abs(input.axis.z) > 0.2)));
      // Небольшая поблажка по земле: шагая с бугорка, кот на пару кадров
      // отрывается от земли — из-за этого выходка не должна обрываться.
      if (this.onGround) this._emoteAir = 0;
      else this._emoteAir = (this._emoteAir || 0) + dt;

      if (движется || this._emoteAir > 0.25 ||
        this.attackT > 0 || this.castT > 0 || this.hurtT > 0) {
        this.stopEmote();
        return;
      }
      if (this.emoteT >= def.dur) this.stopEmote();
    }

    updateTimers(dt) {
      this.attackT = Math.max(0, this.attackT - dt);
      this.castT = Math.max(0, this.castT - dt);
      this.hurtT = Math.max(0, this.hurtT - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.combatT = Math.max(0, this.combatT - dt);
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) { this.blinkTimer = 2.2 + Math.random() * 3.4; this.blink = 1; }
      this.blink = Math.max(0, this.blink - dt * 7);
    }

    updateEffects(dt) {
      const e = this.effects;
      if (e.burn > 0) { e.burn -= dt; this.damage(9 * dt, null, 'огонь', true); }
      if (e.poison > 0) { e.poison -= dt; this.damage(6 * dt, null, 'яд', true); }
      if (e.slow > 0) e.slow -= dt;
      if (e.freeze > 0) e.freeze -= dt;
      if (e.vuln > 0) e.vuln -= dt;
    }

    damage(n, src, reason, silent) {
      if (this.dead || (this.invuln > 0 && !silent)) return;
      const g = this.game;
      // Своя база — безопасное место: тут кота не достать ничем.
      if (g.inOwnBase && g.inOwnBase(this.x, this.z)) return;
      if (this.shieldT > 0) {
        g.fx.ring(this.x, this.y + 0.8, this.z, 1.4, [0.5, 0.9, 1]);
        return;
      }
      n *= this.st ? this.st.damageTaken : 1;
      this.hp -= n;
      if (!silent) {
        this.hurtT = 0.4;
        this.invuln = 0.55;
        g.audio.sfx('hurt');
        g.ui.hurtFlash();
        g.fx.damageNumber(this.x, this.y + 1.1, this.z, Math.round(n), 'player');
      }
      this.combatT = 5;
      if (this.hp <= 0) {
        this.hp = 0;
        if (g.state.hasAbility('ninelives') && !this.revived) {
          this.revived = true;
          this.hp = this.maxHp * 0.5;
          this.invuln = 2.5;
          g.audio.sfx('unlock');
          g.ui.toast('Девять жизней! Кот вернулся 🐈', 'good');
          g.fx.ring(this.x, this.y + 0.5, this.z, 3, [1, 0.9, 0.4]);
        } else {
          this.dead = true;
          g.onPlayerDeath(reason);
        }
      }
      g.ui.updateHud();
    }

    // ------------------------------------------------------------
    /** Позиция камеры. */
    cameraPos(out) {
      const L = this.game.level;
      if (!L) {
        out.ex = 0; out.ey = 3; out.ez = 7;
        out.tx = 0; out.ty = 1.2; out.tz = 0;
        return out;
      }
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const dirX = -Math.sin(this.yaw) * cp;
      const dirY = sp;
      const dirZ = -Math.cos(this.yaw) * cp;
      const tx = this.x, ty = this.eyeY + (this.firstPerson ? 0 : 0.35), tz = this.z;
      if (this.firstPerson) {
        // камера — в голове кота: голова смещена вперёд от центра тела
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
        out.ex = this.x + fx * HEAD_FWD;
        out.ey = this.y + HEAD_UP;
        out.ez = this.z + fz * HEAD_FWD;
        out.tx = out.ex + dirX; out.ty = out.ey + dirY; out.tz = out.ez + dirZ;
        return out;
      }
      let dist = this.camDist;
      // не даём камере провалиться в землю
      for (let i = 1; i <= 8; i++) {
        const d = dist * i / 8;
        const px = tx - dirX * d, py = ty - dirY * d, pz = tz - dirZ * d;
        const h = L.groundAt(px, pz);
        if (h > -900 && py < h + 0.45) { dist = Math.max(1.4, d - 0.5); break; }
      }
      out.ex = tx - dirX * dist; out.ey = ty - dirY * dist; out.ez = tz - dirZ * dist;
      out.tx = tx; out.ty = ty; out.tz = tz;
      return out;
    }

    /** Куда летит заклинание. */
    aimDir(out) {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      out[0] = -Math.sin(this.yaw) * cp;
      out[1] = sp;
      out[2] = -Math.cos(this.yaw) * cp;
      return out;
    }

    draw(batch, batchAlpha, t) {
      const st = this.st;
      const s = {
        t, walk: this.walkPhase, walkAmt: this.walkAmt, runAmt: this.runAmt,
        air: !this.onGround, vy: this.vy, rest: this.restT,
        attack: this.attackT / 0.34, cast: this.castT / 0.42,
        hurt: this.hurtT / 0.4, blink: this.blink,
        lookX: -this.pitch * 0.5, lookY: 0,
        tuck: this.flipT > 0 ? 1 : 0,
        emote: this.emote, emoteT: this.emoteT
      };
      KM.anim.cat(this.pose, s);

      let pal = st.cat.pal;
      if (st.shimmer) {
        pal = Object.assign({}, pal);
        const k = 0.5 + 0.5 * Math.sin(t * 3);
        const sh = [0.82 + k * 0.18, 0.86 + k * 0.14, 0.95 + k * 0.05];
        pal.fur = sh; pal.fur2 = [1, 1, 1];
        pal.hat = [0.72 + k * 0.2, 0.76 + k * 0.2, 0.88 + k * 0.12];
      } else if (st.rainbow) {
        pal = Object.assign({}, pal);
        const h = (t * 0.4) % 1;
        pal.fur = hsv(h, 0.55, 1);
        pal.fur2 = hsv((h + 0.12) % 1, 0.3, 1);
        pal.hat = hsv((h + 0.5) % 1, 0.6, 0.9);
        pal.gem = hsv((h + 0.25) % 1, 0.4, 1);
      }

      const alpha = st.alpha * (1 - this.hideAmt * 0.55) * (this.invisT > 0 ? 0.22 : 1);
      const flash = this.hurtT > 0 ? [1, 0.35, 0.35, this.hurtT * 1.6] : null;
      const invulnBlink = this.invuln > 0 && Math.floor(t * 14) % 2 === 0 ? 0.45 : 1;

      if (!this.firstPerson) {
        // шлейф из полупрозрачных копий во время ускорения
        for (const gh of this.ghosts) {
          const k = gh.life / 0.42;
          M4.trs(TMPA, gh.x, gh.y, gh.z, gh.f, 1, 1, 1);
          KM.vox.drawModel(batchAlpha, this.model, TMPA, this.pose, {
            pal, alpha: 0.3 * k, emis: 0.5, tint: [1, 0.95, 0.5, 0.5], batchAlpha
          });
        }
        if (this.flipT > 0) {
          // САЛЬТО: полный оборот вокруг собственной оси
          const k = 1 - this.flipT / this.flipDur;
          const ang = k * Math.PI * 2;
          M4.compose(TMPA, this.x, this.y + 0.46, this.z, ang, this.facing, 0, 1, 1, 1);
          M4.compose(TMPB, 0, -0.46, 0, 0, 0, 0, 1, 1, 1);
          M4.mul(this.mat, TMPA, TMPB);
        } else {
          M4.trs(this.mat, this.x, this.y, this.z, this.facing, 1, 1, 1);
        }
        KM.vox.drawModel(batch, this.model, this.mat, this.pose, {
          pal, alpha: alpha * invulnBlink,
          emis: st.glow + (this.castT > 0 ? 0.3 : 0) + (this.hasteT > 0 ? 0.25 : 0),
          tint: flash, batchAlpha
        });
      } else {
        // от первого лица показываем передние лапки
        const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
        const fx = -Math.sin(this.yaw) * cp, fy = sp, fz = -Math.cos(this.yaw) * cp;
        const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        const bx = this.x + fx * 0.6, by = this.eyeY + fy * 0.6 - 0.42, bz = this.z + fz * 0.6;
        const sw = this.attackT > 0 ? Math.sin((1 - this.attackT / 0.34) * Math.PI) : 0;
        const ca = this.castT > 0 ? Math.sin((this.castT / 0.42) * Math.PI) : 0;
        const bob = Math.sin(this.walkPhase) * 0.035 * this.walkAmt;
        for (let i = 0; i < 2; i++) {
          const sgn = i === 0 ? -1 : 1;
          const off = 0.28 * sgn;
          const push = (i === 1 ? sw : 0) * 0.4 + ca * 0.25;
          const px = bx + rx * off + fx * push, py = by + bob * (i ? 1 : -1) + ca * 0.2, pz = bz + rz * off + fz * push;
          batch.pushBoxY(px, py, pz, this.yaw, 0.17, 0.30, 0.17,
            pal.fur[0], pal.fur[1], pal.fur[2], alpha, st.glow, 0.4, 0, i);
          batch.pushBoxY(px + fx * 0.16, py - 0.14, pz + fz * 0.16, this.yaw, 0.19, 0.11, 0.2,
            pal.fur2[0], pal.fur2[1], pal.fur2[2], alpha, st.glow, 0.3, 0, i);
        }
      }

      // аура персонажа
      if (st.aura && Math.random() < 0.35) {
        const AC = {
          fire: [1, 0.5, 0.15], ice: [0.6, 0.9, 1], void: [0.7, 0.3, 1],
          star: [1, 0.92, 0.55], rainbow: [Math.random(), Math.random() * 0.5 + 0.5, 1], spark: [1, 0.95, 0.35]
        };
        const c = AC[st.aura] || [1, 1, 1];
        const a = Math.random() * 6.28;
        this.game.fx.spawn(this.x + Math.cos(a) * 0.45, this.y + Math.random() * 0.9, this.z + Math.sin(a) * 0.45,
          Math.cos(a) * 0.4, 0.9 + Math.random(), Math.sin(a) * 0.4,
          0.08, 0.55, c, { g: st.aura === 'fire' ? 1.5 : 0.4, emis: 1, drag: 1 });
      }

      // щит
      if (this.shieldT > 0) {
        const k = 0.9 + Math.sin(t * 9) * 0.06;
        for (let i = 0; i < 10; i++) {
          const a = t * 1.6 + i * 0.628;
          const yy = this.y + 0.5 + Math.sin(a * 1.7 + i) * 0.55;
          batchAlpha.pushBox(this.x + Math.cos(a) * 0.95 * k, yy, this.z + Math.sin(a) * 0.95 * k,
            0.2, 0.2, 0.2, 0.5, 0.85, 1, 0.5, 0.9, 0, 0, i * 0.1);
        }
      }
    }
  }

  function hsv(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t2 = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t2, p];
      case 1: return [q, v, p];
      case 2: return [p, v, t2];
      case 3: return [p, q, v];
      case 4: return [t2, p, v];
      default: return [v, p, q];
    }
  }

  KM.Player = Player;
  KM.SPEED_LEVELS = SPEED_LEVELS;
})(window);
