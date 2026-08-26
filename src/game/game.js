/* ============================================================
   КОТИКИ МАГИ 3D — игровой движок: уровни, бой, рендер
   ============================================================ */
(function (global) {
  'use strict';

  // Общая добыча: сколько получает каждый, кто был рядом с монстром.
  const SHARE_RANGE = 34;      // дальше — уже не «вместе охотились»
  const SHARE_PART = 0.7;      // добившему достаётся полная, остальным чуть меньше

  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  const CAP_STATIC = 60000;
  const CAP_STATIC_A = 12000;
  const CAP_DYN = 24000;
  const CAP_DYN_A = 16000;

  class Game {
    constructor(canvas, overlay) {
      this.canvas = canvas;
      this.overlay = overlay;
      this.octx = overlay.getContext('2d');
      this.renderer = new KM.Renderer(canvas);
      this.input = new KM.Input(canvas);
      this.audio = new KM.Audio();
      this.state = new KM.State();
      this.fx = new KM.Effects(this);

      this.staticBatch = new KM.Batch(CAP_STATIC);
      this.staticAlpha = new KM.Batch(CAP_STATIC_A);
      this.dyn = new KM.Batch(CAP_DYN);
      this.dynAlpha = new KM.Batch(CAP_DYN_A);

      this.player = new KM.Player(this);
      this.monsters = [];
      this.pets = [];
      this.projectiles = [];
      this.zones = [];
      this.pickups = [];
      this.timers = [];
      this.tornados = [];
      this.blackholes = [];
      this.clouds = [];
      this.platforms = [];
      this.grabs = [];

      this.level = null;
      this.mode = 'menu';       // menu | playing | paused | dead | won
      this.time = 0;
      this.levelTime = 0;
      this.cam = { ex: 0, ey: 0, ez: 0, tx: 0, ty: 0, tz: 0 };
      this.env = {
        skyTop: [0, 0, 0], skyBot: [0, 0, 0], fogColor: [0, 0, 0], fogRange: [20, 70],
        sun: [0.6, 0.6, 0.5], ambTop: [0.4, 0.45, 0.5], ambBot: [0.2, 0.22, 0.26],
        lightDir: [0.42, 0.78, 0.32],
        // Фонарик кота: в пещерах он единственный источник света.
        lamp: {
          pos: new Float32Array([0, 0, 0]),
          color: new Float32Array([1, 0.86, 0.6]),
          param: new Float32Array([0, 0])      // далеко ли светит, насколько ярко
        }
      };
      this.lampOn = false;
      this._tmpDir = [0, 0, 0];
      this._ray = { ex: 0, ey: 0, ez: 0, dx: 0, dy: 0, dz: 1 };
      this._aimPt = { x: 0, y: 0, z: 0, dist: 0 };
      this._proj = [0, 0, 0];
      this.hint = null;
      this.hintTarget = null;
      this.fpsT = 0; this.fpsN = 0; this.fps = 0;
      this.applySettings();
      this.tutorial = null;   // создаётся после UI
      this.net = KM.Net ? new KM.Net(this) : null;
      this.touch = null;      // сенсорный пульт, создаётся после UI
      this.chat = null;       // чат, создаётся после UI
      this.serverMode = false;
      this.netMode = 'coop';   // coop | team | battle | peace
      this.netServer = null;   // выбранный сервер из списка
      this.netCode = '';       // слово-ключ, если сервер закрыт
    }

    applySettings() {
      const s = this.state.data.settings;
      this.renderer.pixelScale = s.pixel;
      this.renderer.resize();
      this.input.sensitivity = 0.0022 * (s.sens / 100);
      this.input.invertY = !!s.invertY;
      this.input.camMode = s.camMode || 'drag';
      if (this.input.camMode !== 'lock') this.input.exitLock();
      this.audio.setVolume(s.volume / 100);
      this.audio.setMusicVolume(s.music / 100);
      this.audio.enabledMusic = s.musicOn !== false;
      this.fov = (s.fov || 70) * Math.PI / 180;
      if (this.ui && this.ui.applyHudLayout) this.ui.applyHudLayout();
      if (this.touch) this.touch.sync();
      this.player.firstPerson = s.view === 1;
    }

    delay(t, fn) { this.timers.push({ t, fn }); }

    // ============================================================
    //  ЗАГРУЗКА УРОВНЯ
    // ============================================================
    loadLevel(index) {
      this.showcase = null;          // витрина не должна оставаться поверх игры
      this.renderer.flash = 0;
      this.levelIndex = index;
      const level = KM.world.generateLevel(index);
      this.level = level;
      const b = level.biome;

      // В командном бою портала нет вовсе: цель там не «дойти и уйти»,
      // а победить другую команду. Портал только сбивал бы с толку —
      // и мог оказаться прямо у чужой базы. В остальных режимах он на месте.
      if (this.serverMode && this.netMode === 'team') level.portal = null;

      // окружение
      this.env.skyTop = b.skyTop; this.env.skyBot = b.skyBot;
      this.env.fogColor = b.fog; this.env.fogRange = b.fogRange;
      this.env.sun = b.sun; this.env.ambTop = b.ambTop; this.env.ambBot = b.ambBot;
      const la = 0.9 + index * 0.03;
      this.env.lightDir = norm3([Math.cos(la) * 0.45, 0.82, Math.sin(la) * 0.35]);

      // темно ли тут настолько, что без фонарика не обойтись
      this.lampOn = !!b.dark;
      const lamp = this.env.lamp;
      const свет = b.lamp || {};
      lamp.color[0] = свет.color ? свет.color[0] : 1.0;
      lamp.color[1] = свет.color ? свет.color[1] : 0.86;
      lamp.color[2] = свет.color ? свет.color[2] : 0.6;
      lamp.param[0] = свет.range || 15;
      lamp.param[1] = this.lampOn ? (свет.power || 1.15) : 0;

      KM.world.buildStatic(level, this.staticBatch, this.staticAlpha);

      // сущности
      this.monsters.length = 0;
      this.projectiles.length = 0;
      this.zones.length = 0;
      this.pickups.length = 0;
      this.timers.length = 0;
      this.tornados.length = 0;
      this.blackholes.length = 0;
      this.clouds.length = 0;
      this.platforms.length = 0;
      this.grabs.length = 0;
      // В battle и мирном режиме монстров не бывает. Смотрим на выбранный
      // режим, а не на ответ сервера: ответ придёт уже после загрузки.
      const withMonsters = !this.serverMode ||
        (this.netMode !== 'battle' && this.netMode !== 'peace');
      if (withMonsters) {
        for (const sp of level.monsterSpawns) {
          const def = KM.MON[sp.type];
          if (def) this.spawnMonster(def, sp.x, sp.y, sp.z, { elite: sp.elite, keyDrop: sp.keyDrop });
        }
      }
      if (level.boss && withMonsters) {
        const m = new KM.Monster(this, level.boss.def, level.boss.x, level.boss.y, level.boss.z, { boss: true });
        m.netIndex = this.monsters.length;
        this.applyCoop(m);
        this.monsters.push(m);
        this.bossRef = m;
      } else this.bossRef = null;

      // питомцы
      this.pets.length = 0;
      const eq = this.state.equippedPets();
      eq.forEach((pd, i) => {
        const p = new KM.Pet(this, pd, i);
        p.x = level.spawn.x + (i - 1) * 1.2;
        p.z = level.spawn.z - 1.2;
        p.y = level.spawn.y + 0.5;
        this.pets.push(p);
      });

      this.player.resetForLevel(level);
      this.totalMonsters = this.monsters.length;
      this.chestsOpened = 0;
      this.cagesOpened = 0;
      this.levelTime = 0;
      this.coinsEarned = 0;
      this.xpEarned = 0;
      this.mode = 'playing';

      this.audio.startMusic(level.info.isBoss ? 'boss' : (b.track || 'calm'));
      this.ambT = 2 + Math.random() * 3;
      this.portalHumT = 0;
      this.ui.showHud(true);
      this.ui.updateHud();
      this.ui.updateSpellBar();
      this.ui.updateObjectives();
      this.ui.toast(level.info.fullName, 'info', 2600);
      if (this.serverMode && this.net) {
        this.net.joinRoom(level.index, level.info.name, this.netMode || 'coop',
                          this.netServer, this.netCode);
        this.netCode = '';                 // слово-ключ нужно только на входе
        const NM = { coop: '🤝 Дружная охота', team: '🚩 Красные против синих',
          battle: '⚔️ Битва: один победитель', peace: '🕊 Мирный' };
        this.ui.toast('🌐 ' + (NM[this.netMode] || NM.coop), 'good', 3200);
      }
      if (this.lampOn) {
        this.delay(0.9, () => {
          this.ui.toast('🔦 Темно! Кот зажёг фонарик — видно только рядом', 'info', 4200);
        });
      }
      if (level.info.isBoss) {
        this.delay(1.2, () => { this.audio.sfx('boss'); this.ui.toast('⚠ Логово босса: ' + level.info.boss.name, 'bad', 3600); });
      }
    }





    // ============================================================
    //  ОБЩИЕ ЭФФЕКТЫ
    //  Всё, что видно одному, должно быть видно всем: снаряды,
    //  лужи огня, торнадо, чёрные дыры, тучи с молниями.
    //  Рассылаем каждый новый эффект, а чужие показываем
    //  «призраками» — они светятся, но урон не считают, иначе
    //  здоровье монстров разъехалось бы у всех по-разному.
    // ============================================================
    _packFx(e) {
      const skip = { game: 1, target: 1, hitSet: 1, cubes: 1, _shared: 1, drops: 1,
        onImpact: 1, onEnd: 1, pose: 1, model: 1, mat: 1, dead: 1, t: 1, trail: 1 };
      const o = {};
      for (const k in e) {
        if (!Object.prototype.hasOwnProperty.call(e, k) || skip[k]) continue;
        const v = e[k];
        if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') o[k] = v;
        else if (Array.isArray(v) && v.length <= 4 && v.every(x => typeof x === 'number')) o[k] = v;
      }
      return o;
    }

    /** Раз в кадр: разослать всё, что появилось у нас нового. */
    shareNewEffects() {
      const n = this.net;
      if (!this.serverMode || !n || n.room === null || n.status !== 'online') return;
      const list = [];
      const scan = (arr, tag, pack) => {
        for (const e of arr) {
          if (e._shared || e.ghost) continue;
          e._shared = true;
          if (list.length < 24) list.push([tag, pack(e)]);
        }
      };
      scan(this.projectiles, 'p', (e) => this._packFx(e));
      scan(this.zones, 'z', (e) => this._packFx(e));
      scan(this.tornados, 't', (e) => [+e.x.toFixed(2), +e.z.toFixed(2),
        +e.dx.toFixed(3), +e.dz.toFixed(3), +e.life.toFixed(1)]);
      scan(this.blackholes, 'b', (e) => [+e.x.toFixed(2), +(e.y - 1.7).toFixed(2),
        +e.z.toFixed(2), +e.life.toFixed(1)]);
      scan(this.clouds, 'c', (e) => [e.kind, +e.x.toFixed(2), +e.baseY.toFixed(2),
        +e.z.toFixed(2), +(e.y - e.baseY).toFixed(2), +e.radius.toFixed(1), +e.life.toFixed(1)]);
      if (list.length) n.send({ t: 'fx', a: list });
    }

    /** Показать чужие эффекты у себя — только вид, без урона. */
    playRemoteEffects(list) {
      if (!this.level) return;
      for (const [tag, d] of list) {
        try {
          if (tag === 'p') {
            const o = Object.assign({}, d, { ghost: true, dmg: 0, _shared: true });
            o.onImpact = (pr) => this.fx.explosion(pr.x, pr.y, pr.z, 8, o.color || [1, 1, 1], 0.7);
            this.projectiles.push(new KM.Projectile(o));
          } else if (tag === 'z') {
            this.zones.push(new KM.Zone(Object.assign({}, d, { ghost: true, dps: 0, _shared: true })));
          } else if (tag === 't') {
            const tr = new KM.Tornado(this, d[0], d[1], d[2], d[3], 0, d[4]);
            tr.ghost = true; tr._shared = true;
            this.tornados.push(tr);
          } else if (tag === 'b') {
            const bh = new KM.BlackHole(this, d[0], d[1], d[2], 0, d[3]);
            bh.ghost = true; bh._shared = true;
            this.blackholes.push(bh);
          } else if (tag === 'c') {
            const cl = new KM.Cloud(this, d[0], d[1], d[2], d[3],
              { height: d[4], radius: d[5], life: d[6], dmg: 0, heal: 0 });
            cl.ghost = true; cl._shared = true;
            this.clouds.push(cl);
          }
        } catch (e) { console.warn('чужой эффект не показался', tag, e); }
      }
    }

    // ============================================================
    //  ОБЩИЕ МОНСТРЫ
    //  Считает их всегда один компьютер — «ведущий». Остальные
    //  получают готовые координаты, поэтому у всех игроков
    //  монстры стоят в одних и тех же местах.
    // ============================================================
    /** Все коты в локации: свой и чужие. */
    allTargets() {
      const out = [];
      if (!this.player.dead) out.push(this.player);
      if (this.serverMode && this.net) {
        for (const p of this.net.peers.values()) {
          if (!p.dead && p.anim !== 'dead') out.push(p);
        }
      }
      return out;
    }

    /** Кого этот монстр видит ближе всего. */
    targetFor(m) {
      const list = this.allTargets();
      if (list.length < 2) return list[0] || this.player;
      let best = list[0], bd = Infinity;
      for (const t of list) {
        if (t.invisT > 0) continue;                 // невидимку не замечают
        const d = (t.x - m.x) * (t.x - m.x) + (t.z - m.z) * (t.z - m.z);
        if (d < bd) { bd = d; best = t; }
      }
      return best;
    }

    /** Ударить кота, за которого мы не отвечаем. */
    hurtTarget(target, n, name, kx, kz) {
      if (target === this.player) {
        this.player.damage(n, null, name);
        return;
      }
      if (this.net && this.net.isHost) {
        this.net.reportMonsterHit(target.id, n, name, kx, kz);
        this.fx.hitSpark(target.x, target.y + 0.7, target.z);
      }
    }

    /** По нам попал монстр, которого считает другой компьютер. */
    takeMonsterHit(m) {
      const pl = this.player;
      if (pl.dead || this.mode !== 'playing') return;
      pl.damage(m.n, null, m.name);
      pl.vx += (m.kx || 0) * 3;
      pl.vz += (m.kz || 0) * 3;
      this.ui.updateHud();
    }

    /** Пришёл чужой удар по монстру — считаем его у себя. */
    applyRemoteDamage(m) {
      if (!this.net || !this.net.isHost) return;
      const mon = this.monsters[m.i];
      if (!mon || mon.dead) return;
      const knock = m.kp ? { x: mon.x - m.kx, z: mon.z - m.kz, p: m.kp } : null;
      mon.hurt(m.n, m.el, true, knock);
      if (mon.dead) {
        // добычу получает тот, кто добил
        this.net.send({ t: 'kill', i: m.i, by: m.by });
        if (this.chat) this.chat.event('⚔', m.by + ' одолел: ' + mon.def.name, 'kill');
      }
    }

    /** Ведущий собирает и шлёт состояние монстров. */
    sendMonsterSnapshot(dt) {
      const n = this.net;
      if (!n || !n.isHost || n.room === null || !this.level) return;
      this._monT = (this._monT || 0) - dt;
      if (this._monT > 0) return;
      this._monT = 1 / 9;                    // девять раз в секунду хватает
      const a = [];
      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        a.push([
          i,
          +m.x.toFixed(2), +m.y.toFixed(2), +m.z.toFixed(2),
          +m.yaw.toFixed(2), Math.round(m.hp),
          m.dead ? 1 : 0, m.attackT > 0 ? 1 : 0,
          m.mode === 'chase' ? 1 : (m.mode === 'return' ? 2 : 0),
          m.sub === 'graze' ? 1 : (m.sub === 'sleep' ? 2 : 0)
        ]);
      }
      n.sendMonsters(a);
    }

    /** Не мы ведущие — принимаем готовое состояние. */
    applyMonsterSnapshot(a) {
      if (!this.level || !this.monsters.length) return;
      for (const row of a) {
        const m = this.monsters[row[0]];
        if (!m) continue;
        m.tx = row[1]; m.ty = row[2]; m.tz = row[3]; m.tyaw = row[4];
        const hp = row[5], isDead = !!row[6];
        if (hp < m.hp && !isDead) m.hurtT = 0.28;
        m.hp = hp;
        if (row[7] && m.attackT <= 0) m.attackT = 0.4;
        m.mode = row[8] === 1 ? 'chase' : (row[8] === 2 ? 'return' : 'live');
        m.sub = row[9] === 1 ? 'graze' : (row[9] === 2 ? 'sleep' : 'idle');
        if (isDead && !m.dead) {
          m.hp = 0;
          m.die(false);
          this.ui.updateObjectives();
          this.checkComplete();
        }
      }
    }

    // ============================================================
    //  ДРУЖЕСКИЕ ДРАКИ
    //  Коты не убивают друг друга: проигравший просто отдыхает
    //  пару секунд и возвращается целым.
    // ============================================================
    /** Найти чужих котов в зоне удара. */
    peersInReach(x, z, y, reach, fx, fz, minDot) {
      const out = [];
      if (!this.serverMode || !this.net) return out;
      for (const p of this.net.peers.values()) {
        if (p.anim === 'dead' || p.down) continue;
        const dx = p.x - x, dz = p.z - z;
        const d = Math.hypot(dx, dz);
        if (d > reach + 0.5) continue;
        if (Math.abs(p.y - y) > 2.4) continue;
        if (fx !== undefined) {
          const dot = (dx / (d || 1)) * fx + (dz / (d || 1)) * fz;
          if (dot < (minDot === undefined ? 0.25 : minDot)) continue;
        }
        out.push(p);
      }
      return out;
    }


    /**
     * Задеть чужих котов в круге — ровно тем же, чем задело монстров.
     * Всё, что сносит здоровье монстру, должно сносить и коту.
     */
    splashPeers(x, y, z, radius, dmg, element) {
      if (!this.serverMode || !this.net || !dmg || dmg <= 0) return 0;
      let n = 0;
      const R = radius + 0.4;
      for (const p of this.net.peers.values()) {
        if (p.dead || p.anim === 'dead') continue;
        if (Math.abs(p.y - y) > radius + 1.6) continue;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d > R) continue;
        // с краю задевает слабее, в середине — полностью
        const k = 1 - Math.min(1, d / R) * 0.5;
        this.hitPeer(p, dmg * k, element, x, z);
        n++;
      }
      return n;
    }

    /** Мы попали по другому коту. */
    hitPeer(p, dmg, el, fromX, fromZ) {
      const n = this.net;
      if (!n || !n.pvpAllowed()) return;      // мирный сервер — драк нет
      if (n.isAlly(p)) return;                // по своим не бьём
      const d = Math.hypot(p.x - fromX, p.z - fromZ) || 1;
      this.net.reportPvp(p, dmg, el, (p.x - fromX) / d, (p.z - fromZ) / d);
      this.fx.hitSpark(p.x, p.y + 0.7, p.z);
      this.fx.damageNumber(p.x, p.y + 1.2, p.z, Math.round(dmg), el || 'hit');
      this.audio.sfxAt('hit', p.x, p.y, p.z, 30);
    }


    /**
     * Мы одолели другого кота. Опыт и монеты — как за крупного монстра,
     * и тем больше, чем выше уровень побеждённого.
     */
    rewardFrag(m) {
      const S = this.state, st = S.stats();
      const lvl = S.data.level;
      const xp = Math.round((40 + lvl * 6) * (this.net && this.net.mode === 'battle' ? 1.5 : 1));
      const coins = Math.round((55 + lvl * 8) * st.luck *
        (this.net && this.net.mode === 'battle' ? 1.5 : 1));

      const ups = S.addXP(xp);
      S.addCoins(coins);
      S.data.stats.pvpWins = (S.data.stats.pvpWins || 0) + 1;
      S.save();

      this.fx.text(this.player.x, this.player.y + 1.8, this.player.z,
        '+' + xp + ' опыта', 'info');
      this.audio.sfx('coin');
      this.ui.toast('⚔️ Победа над ' + m.victim + '! +' + xp + ' опыта, +' + coins + ' 🪙',
        'good', 2600);
      if (this.chat) {
        this.chat.event('⚔️', 'Вы одолели ' + m.victim + ' · всего побед: ' + (m.kills || 1), 'pvp');
      }
      if (ups > 0) {
        this.audio.jingle('levelup');
        this.ui.bigMessage('⭐ Уровень ' + S.data.level + '!', 'Кот стал сильнее');
      }
      this.player.applyStats();
      this.ui.updateHud();
      this.ui.refreshCoins && this.ui.refreshCoins();
      if (this.net) this.net.refreshMe();
    }

    /** По нам попал другой кот. */
    takePvp(m) {
      const pl = this.player;
      if (pl.dead || this.mode !== 'playing' || pl._pvpDown) return;
      if (pl.invuln > 0 || pl.shieldT > 0) return;

      // Драка дружеская: до нуля здоровье не доводим никогда,
      // иначе это была бы настоящая смерть с потерей уровня.
      let dmg = Math.max(1, Math.round(m.dmg * 0.35));
      dmg = Math.min(dmg, Math.max(0, pl.hp - 1));
      if (dmg > 0) pl.damage(dmg, null, m.fromNick);

      pl.vx += (m.kx || 0) * 5;
      pl.vz += (m.kz || 0) * 5;
      this.fx.hitSpark(pl.x, pl.y + 0.7, pl.z);
      if (pl.hp <= 1 && !pl._pvpDown) {
        pl._pvpDown = true;
        pl.hp = 1;
        pl.invuln = Math.max(pl.invuln, 3.2);
        this.net.reportDefeat(m.fromNick);
        if (this.chat) this.chat.event('⚔️', m.fromNick + ' победил вас в дружеской драке', 'pvp');
        this.ui.toast('⚔️ ' + m.fromNick + ' вас одолел — отдышитесь', 'warn', 2600);
        this.delay(2.4, () => {
          pl.hp = pl.maxHp;
          pl._pvpDown = false;
          this.ui.updateHud();
          if (this.chat) this.chat.event('💚', 'Вы снова в строю', 'join');
        });
      }
      this.ui.updateHud();
    }

    /** Чужой удар по кому-то другому — просто искры, чтобы было видно. */
    showPvpHit(m) {
      if (!this.net) return;
      const p = this.net.peers.get(m.target);
      if (!p) return;
      this.fx.hitSpark(p.x, p.y + 0.7, p.z);
    }

    // ============================================================
    //  СЕРВЕРНЫЙ РЕЖИМ
    //  Мир у всех одинаковый (одно зерно), поэтому достаточно
    //  сказать «монстр номер 7 повержен» — он упадёт у всех.
    // ============================================================
    /** Насколько легче на сервере. */
    coopScale() {
      if (!this.serverMode) return 1;
      const mates = this.net ? Math.min(4, this.net.peers.size) : 0;
      return 0.62 - mates * 0.04;      // монстры слабее, и чем больше друзей, тем сильнее
    }

    /** Приглушить монстра, если играем вместе. */
    applyCoop(m) {
      if (!this.serverMode) return;
      const k = this.coopScale();
      m.maxHp = Math.max(1, m.maxHp * k);
      m.hp = m.maxHp;
      m.dmg = (m.dmg || 0) * k;
    }

    netKill(i, by) {
      const m = this.monsters[i];
      if (!m || m.dead) return;
      if (this.chat && by) this.chat.event('⚔', by + ' одолел: ' + m.def.name, 'kill');
      m.hp = 0;
      m.die(false);                    // свою награду убийца уже посчитал у себя
      this.fx.text(m.x, m.y + m.height, m.z, by ? ('⚔ ' + by) : '⚔', 'info');
      this.shareLoot(m, by);
      this.ui.updateObjectives();
      this.checkComplete();
    }

    /**
     * Охотились вместе — и добыча общая. Монеты и опыт достаются каждому,
     * кто был рядом, и ни у кого не отнимаются: это не делёж одной кучки,
     * а своя доля каждому. Тем, кто далеко, ничего не падает — иначе
     * можно было бы стоять у портала и богатеть.
     */
    shareLoot(m, by) {
      if (!this.serverMode || !this.player || this.player.dead) return;
      const p = this.player;
      const далеко = Math.hypot(p.x - m.x, p.z - m.z) > SHARE_RANGE;
      if (далеко) return;

      const st = this.state.stats();
      const xp = Math.round(m.def.xp * (m.elite ? 2.2 : 1) * SHARE_PART);
      const coins = Math.round(m.def.coins * (m.elite ? 2.4 : 1) * st.luck * SHARE_PART);
      if (xp <= 0 && coins <= 0) return;

      this.xpEarned += xp;
      this.coinsEarned += coins;
      const монеток = Math.min(6, 1 + Math.floor(coins / 8));
      for (let i = 0; i < монеток; i++) {
        this.pickups.push(new KM.Pickup({
          kind: 'coin', x: m.x, y: m.y + 0.5, z: m.z,
          value: Math.ceil(coins / монеток)
        }));
      }
      this.pickups.push(new KM.Pickup({ kind: 'xp', x: m.x, y: m.y + 0.5, z: m.z, value: xp }));
      this.fx.text(m.x, m.y + m.height * 0.6, m.z, 'общая добыча', 'good');
    }

    netChest(i, by) {
      const c = this.level && this.level.chests[i];
      if (!c || c.opened) return;
      if (this.chat && by) this.chat.event('📦', by + ' открыл сундук', 'loot');
      c.opened = true;
      this.audio.sfxAt('chest', c.x, c.y, c.z, 40);
      this.fx.sparkle(c.x, c.y + 0.6, c.z, 14, [1, 0.85, 0.3]);
      if (by) this.fx.text(c.x, c.y + 1.2, c.z, '📦 ' + by, 'info');
      this.ui.updateObjectives();
    }

    netCage(i, by) {
      const c = this.level && this.level.cages[i];
      if (!c || c.opened) return;
      if (this.chat && by) this.chat.event('🔓', by + ' освободил кота-мага', 'loot');
      c.opened = true;
      this.audio.sfxAt('cage', c.x, c.y, c.z, 40);
      this.fx.sparkle(c.x, c.y + 1, c.z, 18, [1, 0.9, 0.5]);
      if (by) this.fx.text(c.x, c.y + 1.6, c.z, '🔓 ' + by, 'info');
      this.ui.updateObjectives();
      this.checkComplete();
    }

    /** Другие коты в этой же локации. */
    drawPeers(batch, batchAlpha, t) {
      if (!this.net || !this.net.peers.size) return;
      const M4 = KM.M4;
      if (!this._peerPose) {
        this._peerPose = new KM.vox.Pose(KM.MODELS.cat);
        this._peerMat = M4.create();
      }
      for (const p of this.net.peers.values()) {
        if (p.anim === 'dead') continue;
        const cat = KM.CAT_BY[p.cat] || KM.CATS[0];
        const model = KM.catModel(cat);
        const pose = this._peerPose.model === model ? this._peerPose : (this._peerPose = new KM.vox.Pose(model));
        const run = p.anim === 'run' ? 1 : 0;
        KM.anim.cat(pose, {
          t, walk: p.phase, walkAmt: run, runAmt: Math.min(1, p.speed / 2.4),
          air: p.anim === 'air', vy: 0,
          rest: p.rest ? 1 : 0,
          attack: Math.max(0, p.atk / 0.34),      // те же движения, что у своего кота
          cast: Math.max(0, p.cast / 0.42),
          hurt: 0, blink: 0, lookX: 0, lookY: 0, tuck: 0,
          emote: p.emote, emoteT: p.emoteT
        });
        M4.trs(this._peerMat, p.x, p.y, p.z, p.yaw, 1, 1, 1);
        KM.vox.drawModel(batch, model, this._peerMat, pose, {
          pal: cat.pal, alpha: 1, emis: 0.06, batchAlpha
        });

        this.drawPeerPets(p, batch, batchAlpha, t);
      }
    }

    /** Питомцы соседа. Держим по одному «чучелу» на слот и двигаем его. */
    drawPeerPets(p, batch, batchAlpha, t) {
      const list = p.pets;
      if (!list || !list.length) return;
      if (!p._petObjs) p._petObjs = [];
      for (let i = 0; i < list.length; i++) {
        const row = list[i];
        const def = KM.PET_BY[row[0]];
        if (!def) continue;
        let obj = p._petObjs[i];
        if (!obj || obj.data.id !== row[0] || obj.data.stage !== row[1]) {
          try {
            obj = new KM.Pet(this, { id: row[0], stage: row[1], level: 1, uid: -1 - i, acc: null }, i);
          } catch (e) { continue; }
          p._petObjs[i] = obj;
        }
        obj.x = row[2]; obj.y = row[3]; obj.z = row[4]; obj.yaw = row[5];
        obj.walkPhase += t * 0;                       // фазу двигаем ниже
        obj.walkPhase = (obj.walkPhase + 0.08) % 6.28;
        obj.walkAmt = 0.7;
        obj.attackT = 0;
        try { obj.draw(batch, batchAlpha, t); } catch (e) { }
      }
    }

    spawnMonster(def, x, y, z, opts) {
      if (this.monsters.length > 90) return null;
      const m = new KM.Monster(this, def, x, y, z, opts);
      m.netIndex = this.monsters.length;
      this.applyCoop(m);
      this.monsters.push(m);
      return m;
    }

    // ============================================================
    //  ПРИЦЕЛ (луч из камеры через курсор мыши)
    // ============================================================
    /** Направление взгляда через точку курсора. */
    aimRay(out) {
      const cam = this.cam;
      let fx = cam.tx - cam.ex, fy = cam.ty - cam.ey, fz = cam.tz - cam.ez;
      const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
      let rx = -fz, rz = fx;
      const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
      const m = this.input.mouse;
      const ndcX = (m.sx === undefined ? 0.5 : m.sx) * 2 - 1;
      const ndcY = 1 - (m.sy === undefined ? 0.5 : m.sy) * 2;
      const th = Math.tan(this.fov / 2);
      const asp = this.renderer.rw / this.renderer.rh;
      const hx = ndcX * th * asp, hy = ndcY * th;
      let dx = fx + rx * hx + ux * hy;
      let dy = fy + uy * hy;
      let dz = fz + rz * hx + uz * hy;
      const l = Math.hypot(dx, dy, dz) || 1;
      out.ex = cam.ex; out.ey = cam.ey; out.ez = cam.ez;
      out.dx = dx / l; out.dy = dy / l; out.dz = dz / l;
      return out;
    }

    /** Точка, куда наведён курсор: монстр, земля или «далеко впереди». */
    aimPoint(out) {
      const r = this.aimRay(this._ray);
      const MAX = 70;
      let best = MAX;

      // монстры — попадание по сфере
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const ox = m.x - r.ex, oy = (m.y + m.height * 0.5) - r.ey, oz = m.z - r.ez;
        const tca = ox * r.dx + oy * r.dy + oz * r.dz;
        if (tca < 0.5 || tca > best) continue;
        const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
        const rad = m.radius + 0.5;
        if (d2 > rad * rad) continue;
        best = tca - Math.sqrt(Math.max(0, rad * rad - d2));
      }
      // земля
      for (let d = 0.6; d < best; d += 0.32) {
        const x = r.ex + r.dx * d, y = r.ey + r.dy * d, z = r.ez + r.dz * d;
        const h = this.level.groundAt(x, z);
        if (h > -900 && y <= h + 0.06) { best = d; break; }
        if (y < -22) { best = d; break; }
      }
      out.x = r.ex + r.dx * best;
      out.y = r.ey + r.dy * best;
      out.z = r.ez + r.dz * best;
      out.dist = best;
      return out;
    }

    /** Полный набор для заклинания: откуда, куда и в каком направлении. */
    getAim() {
      const pt = this.aimPoint(this._aimPt);
      const p = this.player;
      let hx = pt.x - p.x, hz = pt.z - p.z;
      const hl = Math.hypot(hx, hz) || 1;
      const ox = p.x + (hx / hl) * 0.42;
      const oy = p.y + 0.78;
      const oz = p.z + (hz / hl) * 0.42;
      let dx = pt.x - ox, dy = pt.y - oy, dz = pt.z - oz;
      const l = Math.hypot(dx, dy, dz) || 1;
      return { ox, oy, oz, dx: dx / l, dy: dy / l, dz: dz / l, px: pt.x, py: pt.y, pz: pt.z, dist: pt.dist };
    }

    // ============================================================
    //  БОЙ
    // ============================================================
    meleeAttack(player, reach, dmg) {
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      let hit = 0;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const dx = m.x - player.x, dz = m.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + m.radius) continue;
        if (Math.abs(m.y - player.y) > 2.4) continue;
        const dot = (dx / (d || 1)) * fx + (dz / (d || 1)) * fz;
        if (dot < 0.25) continue;
        m.hurt(dmg, 'physical', true, { x: player.x, z: player.z, p: 5 });
        this.fx.hitSpark(m.x, m.y + m.height * 0.5, m.z);
        hit++;
      }
      // тот же удар достаёт и других котов — дружеская драка
      for (const p of this.peersInReach(player.x, player.z, player.y, reach, fx, fz)) {
        this.hitPeer(p, dmg, 'physical', player.x, player.z);
        hit++;
      }

      // взмах когтей — след из кубиков
      for (let i = 0; i < 8; i++) {
        const a = player.yaw + Math.PI + (i - 3.5) * 0.16;
        this.fx.spawn(
          player.x - Math.sin(a) * reach * 0.7,
          player.y + 0.6 + (i % 2) * 0.14,
          player.z - Math.cos(a) * reach * 0.7,
          0, 0.6, 0, 0.09, 0.18, [1, 1, 0.9], { g: 0, emis: 1, drag: 1 });
      }
      if (!hit) this.audio.sfx('step');
    }

    castSpell(player, sp, power) {
      const aim = this.getAim();
      // своё заклинание показываем всем в локации
      this.shareCast(sp, power, aim);
      const dir = [aim.dx, aim.dy, aim.dz];
      const ox = aim.ox, oy = aim.oy, oz = aim.oz;
      const dmg = sp.dmg * power + (player.st ? player.st.flatDmg : 0);

      this.fx.sparkle(ox, oy, oz, 6, sp.color);

      // ---- исцеление ----
      if (sp.zone === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + sp.heal * power);
        player.effects.poison = 0; player.effects.burn = 0; player.effects.freeze = 0;
        this.fx.hearts(player.x, player.y + 1, player.z);
        this.fx.ring(player.x, player.y + 0.2, player.z, 2.2, sp.color);
        this.audio.sfx('unlock');
        this.ui.updateHud();
        return;
      }

      // ---- молния: мгновенно, с переходом на соседей ----
      if (sp.id === 'spark') {
        const hitPt = this.raycast(ox, oy, oz, dir[0], dir[1], dir[2], 26);
        let target = this.pickTarget(ox, oy, oz, dir, 26);
        const chain = sp.chain || 3;
        let from = { x: ox, y: oy, z: oz };
        const hitOnes = new Set();
        for (let c = 0; c < chain; c++) {
          if (!target) break;
          hitOnes.add(target);
          const inWater = this.zones.some(z => z.kind === 'water' && !z.dead &&
            U.dist2(z.x, z.z, target.x, target.z) < z.radius * z.radius);
          const bolt = dmg * (inWater ? 2 : 1) * (1 - c * 0.18);
          target.hurt(bolt, 'air', true);
          target.effects.stun = Math.max(target.effects.stun, 0.6);
          this.splashPeers(target.x, target.y, target.z, 1.6, bolt, 'air');
          this.lightningBolt(from, target);
          from = { x: target.x, y: target.y + target.height * 0.5, z: target.z };
          // следующий
          let best = null, bd = 9;
          for (const m of this.monsters) {
            if (!m.alive || hitOnes.has(m)) continue;
            const d = U.dist(m.x, m.z, target.x, target.z);
            if (d < bd) { bd = d; best = m; }
          }
          target = best;
        }
        if (hitOnes.size === 0 && hitPt) {
          this.lightningBolt({ x: ox, y: oy, z: oz }, { x: hitPt[0], y: hitPt[1], z: hitPt[2], height: 0 });
          this.addZone(sp, hitPt[0], hitPt[1], hitPt[2], dmg);
        }
        this.fx.shake(0.12);
        return;
      }

      // ---- мгновенные заклинания земли, туч и телекинеза ----
      if (sp.instant === 'spikes') {
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const k = i / steps;
          const sx = U.lerp(player.x, aim.px, k);
          const sz = U.lerp(player.z, aim.pz, k);
          this.delay((i - 1) * 0.06, () => {
            const gy = this.level.groundAt(sx, sz);
            if (gy < -900) return;
            this.aoe(sx, gy, sz, sp.radius, dmg, 'earth', 6);
            for (const m of this.monsters) {
              if (m.alive && !m.flying && U.dist(m.x, m.z, sx, sz) < sp.radius) m.vy = Math.max(m.vy, 7);
            }
            this.zones.push(new KM.Zone({
              kind: 'spikes', x: sx, y: gy + 0.02, z: sz, radius: sp.radius,
              life: sp.zoneTime, dps: dmg * 0.3, color: sp.color, color2: sp.color2, emis: 0.1
            }));
            if (this.zones.length > 34) this.zones.shift();
            this.fx.puff(sx, gy + 0.3, sz, 6, sp.color);
            this.audio.sfxAt('hit', sx, gy, sz, 34);
          });
        }
        this.fx.shake(0.25);
        this.audio.sfx('fire');
        return;
      }

      if (sp.instant === 'quake') {
        const gy = this.level.groundAt(aim.px, aim.pz);
        const cy = gy > -900 ? gy : aim.py;
        this.fx.shockwave(aim.px, cy, aim.pz, sp.radius, sp.color2);
        this.fx.shake(1.0);
        this.audio.sfx('boss');
        for (let ring = 0; ring < 3; ring++) {
          this.delay(ring * 0.12, () => {
            this.fx.ring(aim.px, cy + 0.2, aim.pz, sp.radius * (0.5 + ring * 0.35), sp.color);
          });
        }
        this.aoe(aim.px, cy, aim.pz, sp.radius, dmg, 'earth', 10);
        for (const m of this.monsters) {
          if (!m.alive) continue;
          if (U.dist(m.x, m.z, aim.px, aim.pz) > sp.radius) continue;
          m.effects.stun = Math.max(m.effects.stun, sp.stun || 1.5);
          if (!m.flying) m.vy = Math.max(m.vy, 6);
        }
        this.addZone(sp, aim.px, cy, aim.pz, dmg);
        return;
      }

      if (sp.instant === 'cloud') {
        const gy = this.level.groundAt(aim.px, aim.pz);
        this.clouds.push(new KM.Cloud(this, sp.cloudKind, aim.px, gy > -900 ? gy : aim.py, aim.pz, {
          life: sp.cloudLife, radius: sp.radius, dmg: dmg, heal: sp.heal || 0
        }));
        this.audio.sfx(sp.cloudKind === 'storm' ? 'thunder' : 'water');
        this.ui.toast(sp.icon + ' ' + sp.name + ' собирается над целью', 'info', 1600);
        return;
      }

      if (sp.instant === 'grab') {
        const target = this.pickTarget(ox, oy, oz, dir, sp.grabRange || 16) ||
          this.nearestMonster(aim.px, aim.pz, 5);
        if (!target) {
          this.ui.toast('Некого поднимать — наведите на монстра', 'warn');
          this.audio.sfx('error');
          player.mana += sp.mana;
          return;
        }
        if (target.isBoss) {
          this.ui.toast('Босса не поднять — слишком тяжёлый!', 'warn');
          target.hurt(dmg * 0.5, 'arcane', true);
          return;
        }
        this.grabs.push(new KM.TeleGrab(this, target, dmg));
        return;
      }

      // ---- метеор: падает с неба на точку прицела ----
      if (sp.id === 'meteor') {
        const pt = [aim.px, aim.py, aim.pz];
        const self = this;
        this.projectiles.push(new KM.Projectile({
          x: pt[0], y: pt[1] + 22, z: pt[2], dx: 0, dy: -1, dz: 0,
          speed: sp.speed * 2.2, dmg, element: sp.el, friendly: true,
          color: sp.color, color2: sp.color2, size: 0.8, life: 4,
          shape: sp.shape, spin: sp.spin, trailKind: sp.trail,
          onImpact: (pr) => {
            self.fx.explosion(pr.x, pr.y + 0.4, pr.z, 40, sp.color, 2.2);
            self.fx.shockwave(pr.x, pr.y, pr.z, sp.radius, sp.color2);
            self.fx.shake(0.9);
            self.audio.sfx('fire');
            self.aoe(pr.x, pr.y, pr.z, sp.radius, dmg, sp.el, 14);
            self.addZone(sp, pr.x, pr.y, pr.z, dmg);
          }
        }));
        return;
      }

      // ---- обычный снаряд ----
      const self = this;
      const target = sp.homing ? this.pickTarget(ox, oy, oz, dir, 30) : null;
      this.projectiles.push(new KM.Projectile({
        x: ox, y: oy, z: oz, dx: dir[0], dy: dir[1], dz: dir[2],
        speed: sp.speed, dmg, element: sp.el, friendly: true,
        color: sp.color, color2: sp.color2,
        size: sp.id === 'ice' ? 0.3 : (sp.id === 'stone' ? 0.34 : 0.24),
        shape: sp.shape, spin: sp.spin, stretch: sp.stretch, trailKind: sp.trail,
        pierce: !!sp.pierce, homing: !!sp.homing, target,
        roll: !!sp.roll, rollTime: sp.rollTime || 2.5,
        knock: sp.knock || 0,
        grav: sp.grav || 0,
        drift: sp.drift || 0,
        life: 3.4,
        onImpact: (pr) => {
          self.fx.explosion(pr.x, pr.y, pr.z, 10, sp.color, 0.8);
          self.aoe(pr.x, pr.y, pr.z, sp.radius, dmg * 0.6, sp.el, sp.knock || 0);
          self.addZone(sp, pr.x, pr.y, pr.z, dmg);
          if (sp.knock) self.fx.shockwave(pr.x, pr.y, pr.z, sp.radius, sp.color2);
        }
      }));
    }

    /** Уронить один метеор в точку (используется Армагеддоном). */
    dropMeteor(tx, ty, tz, dmg) {
      const self = this;
      const col = [1, 0.42, 0.18], col2 = [1, 0.85, 0.35];
      this.projectiles.push(new KM.Projectile({
        x: tx + (Math.random() - 0.5) * 3, y: ty + 26, z: tz + (Math.random() - 0.5) * 3,
        dx: 0, dy: -1, dz: 0, speed: 30, dmg, element: 'fire', friendly: true,
        color: col, color2: col2, size: 0.55, life: 4,
        shape: 'rock', spin: 5, trailKind: 'ember',
        onImpact: (pr) => {
          self.fx.explosion(pr.x, pr.y + 0.3, pr.z, 26, col, 1.7);
          self.fx.shockwave(pr.x, pr.y, pr.z, 4.2, col2);
          self.fx.shake(0.45);
          self.audio.sfxAt('fire', pr.x, pr.y, pr.z, 45);
          self.aoe(pr.x, pr.y, pr.z, 4.2, dmg, 'fire', 9);
          self.zones.push(new KM.Zone({
            kind: 'fire', x: pr.x, y: pr.y + 0.05, z: pr.z, radius: 3,
            life: 5, dps: dmg * 0.2, color: col, color2: col2, emis: 0.8
          }));
          if (self.zones.length > 30) self.zones.shift();
        }
      }));
    }

    lightningBolt(a, b) {
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = U.lerp(a.x, b.x, k) + (Math.random() - 0.5) * 0.7;
        const y = U.lerp(a.y, b.y + (b.height || 0) * 0.5, k) + (Math.random() - 0.5) * 0.7;
        const z = U.lerp(a.z, b.z, k) + (Math.random() - 0.5) * 0.7;
        this.fx.spawn(x, y, z, 0, 0, 0, 0.15, 0.16, [1, 0.95, 0.5], { g: 0, emis: 1, drag: 1 });
      }
      this.audio.sfx('ice');
    }

    aoe(x, y, z, r, dmg, el, knock) {
      if (r <= 0) return;
      const r2 = r * r;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (U.dist2(x, z, m.x, m.z) > r2) continue;
        if (Math.abs(m.y - y) > r + 1.5) continue;
        m.hurt(dmg, el, true, knock ? { x, z, p: knock } : null);
        if (el === 'fire') m.effects.burn = Math.max(m.effects.burn, 3);
        if (el === 'ice') { m.effects.freeze = Math.max(m.effects.freeze, 2.4); m.effects.vuln = Math.max(m.effects.vuln, 4); }
      }
      this.splashPeers(x, y, z, r, dmg, el);
    }

    addZone(sp, x, y, z, dmg) {
      if (!sp.zoneTime || sp.zone === 'heal') return;
      if (this.zones.length > 26) this.zones.shift();
      this.zones.push(new KM.Zone({
        kind: sp.zone, x, y: y + 0.05, z, radius: sp.radius,
        life: sp.zoneTime, dps: Math.max(3, dmg * 0.28),
        color: sp.color, color2: sp.color2, emis: sp.zone === 'ice' ? 0.35 : 0.75
      }));
    }

    /** Луч до земли/препятствия. */
    raycast(ox, oy, oz, dx, dy, dz, maxD) {
      const step = 0.4;
      for (let d = 0.5; d < maxD; d += step) {
        const x = ox + dx * d, y = oy + dy * d, z = oz + dz * d;
        const h = this.level.groundAt(x, z);
        if (h > -900 && y <= h + 0.1) return [x, h + 0.05, z];
        if (y < -18) return null;
      }
      return null;
    }

    /** Ближайший монстр вдоль луча (для самонаводящихся заклинаний). */
    pickTarget(ox, oy, oz, dir, maxD) {
      let best = null, bestScore = -1;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const dx = m.x - ox, dy = (m.y + m.height * 0.5) - oy, dz = m.z - oz;
        const d = Math.hypot(dx, dy, dz);
        if (d > maxD || d < 0.1) continue;
        const dot = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / d;
        if (dot < 0.72) continue;
        const score = dot - d / maxD * 0.35;
        if (score > bestScore) { bestScore = score; best = m; }
      }
      return best;
    }

    nearestMonster(x, z, maxR) {
      let best = null, bd = maxR * maxR;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const d = U.dist2(x, z, m.x, m.z);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    }

    /** Разослать своё заклинание, чтобы его увидели все. */
    shareCast(sp, power, aim) {
      const n = this.net;
      if (!n || !this.serverMode || n.room === null) return;
      n.send({
        t: 'cast', sp: sp.id, pw: +power.toFixed(2),
        ox: +aim.ox.toFixed(2), oy: +aim.oy.toFixed(2), oz: +aim.oz.toFixed(2),
        dx: +aim.dx.toFixed(3), dy: +aim.dy.toFixed(3), dz: +aim.dz.toFixed(3),
        px: +aim.px.toFixed(2), py: +aim.py.toFixed(2), pz: +aim.pz.toFixed(2)
      });
    }

    /**
     * Показать заклинание, которое запустил другой кот.
     *
     * Нарочно НЕ прогоняем его через настоящий castSpell: тогда снаряд
     * второй раз посчитал бы урон монстрам, и здоровье разъехалось бы.
     * Здесь только зрелище — летит, светится, взрывается. Урон считает
     * тот, кто заклинание запустил, и присылает его отдельно.
     */
    playRemoteCast(m) {
      const sp = KM.SPELL_BY[m.sp];
      if (!sp || !this.level) return;
      const self = this;

      this.fx.sparkle(m.ox, m.oy, m.oz, 6, sp.color);
      this.audio.sfxAt(sp.el === 'fire' ? 'fire' : sp.el === 'ice' ? 'ice'
        : sp.el === 'water' ? 'water' : 'cast', m.ox, m.oy, m.oz, 44);

      // мгновенные заклинания рисуем сразу в точке попадания
      if (sp.instant || sp.id === 'spark' || sp.zone === 'heal' || !sp.speed) {
        if (sp.id === 'spark') {
          this.lightningBolt({ x: m.ox, y: m.oy, z: m.oz },
            { x: m.px, y: m.py, z: m.pz, height: 0 });
        } else if (sp.zone === 'heal') {
          this.fx.hearts(m.ox, m.oy, m.oz);
          this.fx.ring(m.ox, m.oy - 0.7, m.oz, 2.2, sp.color);
        } else {
          this.fx.explosion(m.px, m.py + 0.2, m.pz, 12, sp.color, 1);
          this.fx.ring(m.px, m.py + 0.1, m.pz, sp.radius || 2, sp.color2 || sp.color);
        }
        return;
      }

      // обычный снаряд — точная копия по виду, но безобидная
      this.projectiles.push(new KM.Projectile({
        ghost: true,
        x: m.ox, y: m.oy, z: m.oz, dx: m.dx, dy: m.dy, dz: m.dz,
        speed: sp.speed, dmg: 0, element: sp.el, friendly: true,
        color: sp.color, color2: sp.color2,
        size: sp.id === 'ice' ? 0.3 : (sp.id === 'stone' ? 0.34 : 0.24),
        shape: sp.shape, spin: sp.spin, stretch: sp.stretch, trailKind: sp.trail,
        roll: !!sp.roll, rollTime: sp.rollTime || 2.5,
        grav: sp.grav || 0, drift: sp.drift || 0, life: 3.4,
        onImpact: (pr) => {
          self.fx.explosion(pr.x, pr.y, pr.z, 10, sp.color, 0.8);
          if (sp.knock) self.fx.shockwave(pr.x, pr.y, pr.z, sp.radius, sp.color2);
        }
      }));
    }

    spawnMonsterProjectile(mon, color, spread) {
      const p = this.player;
      const sy = mon.y + mon.height * 0.6;
      let dx = p.x - mon.x, dy = (p.y + 0.7) - sy, dz = p.z - mon.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      dx /= d; dy /= d; dz /= d;
      if (spread) { dx += (Math.random() - 0.5) * spread; dz += (Math.random() - 0.5) * spread; }
      const l = Math.hypot(dx, dy, dz) || 1;
      const self = this;
      this.projectiles.push(new KM.Projectile({
        x: mon.x, y: sy, z: mon.z, dx: dx / l, dy: dy / l, dz: dz / l,
        speed: 12, dmg: mon.dmg * 0.85, friendly: false, srcName: mon.def.name,
        color, color2: [1, 1, 1], size: 0.2, life: 4,
        onImpact: (pr) => { self.fx.explosion(pr.x, pr.y, pr.z, 6, color, 0.6); }
      }));
      this.audio.sfx('cast');
    }

    spawnPetProjectile(pet, target) {
      const sy = pet.y + 0.4;
      let dx = target.x - pet.x, dy = (target.y + target.height * 0.5) - sy, dz = target.z - pet.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const self = this;
      const col = pet.def.el === 'fire' ? [1, 0.5, 0.2] : pet.def.el === 'dark' ? [0.7, 0.4, 1] : [0.5, 0.9, 1];
      this.projectiles.push(new KM.Projectile({
        x: pet.x, y: sy, z: pet.z, dx: dx / d, dy: dy / d, dz: dz / d,
        speed: 18, dmg: pet.dmg, element: pet.def.el, friendly: true,
        color: col, color2: [1, 1, 1], size: 0.16, life: 2.2,
        onImpact: (pr) => { self.fx.explosion(pr.x, pr.y, pr.z, 5, col, 0.5); }
      }));
    }

    // ============================================================
    //  СОБЫТИЯ
    // ============================================================
    onMonsterKilled(m) {
      if (this.serverMode && this.net) {
        this.net.reportKill(m.netIndex);
        if (this.chat) this.chat.event('⚔', 'Вы одолели: ' + m.def.name, 'kill');
      }
      const st = this.state.stats();
      this.state.data.stats.kills++;
      if (this.tutorial) this.tutorial.event('kill');

      const xp = Math.round(m.def.xp * (m.elite ? 2.2 : 1) * (m.isBoss ? 1 : 1));
      const coins = Math.round(m.def.coins * (m.elite ? 2.4 : 1) * st.luck);
      this.xpEarned += xp; this.coinsEarned += coins;

      // монеты и опыт
      const nCoins = Math.min(9, 1 + Math.floor(coins / 8));
      for (let i = 0; i < nCoins; i++) {
        this.pickups.push(new KM.Pickup({ kind: 'coin', x: m.x, y: m.y + 0.5, z: m.z, value: Math.ceil(coins / nCoins) }));
      }
      this.pickups.push(new KM.Pickup({ kind: 'xp', x: m.x, y: m.y + 0.5, z: m.z, value: xp }));

      // добыча
      const luck = st.luck;
      if (Math.random() < 0.28 * luck) this.dropItem(m.x, m.y, m.z, 'fang');
      if (Math.random() < 0.12 * luck) this.dropItem(m.x, m.y, m.z, Math.random() < 0.5 ? 'berry' : 'fish');
      if (m.elite && Math.random() < 0.4 * luck) this.dropItem(m.x, m.y, m.z, 'shard');
      if (m.def.big && Math.random() < 0.18 * luck) this.dropItem(m.x, m.y, m.z, 'meat');
      if (this.level.biome.id === 'void' && Math.random() < 0.3 * luck) this.dropItem(m.x, m.y, m.z, 'essence');

      // ключи от клеток — с крупных монстров и босса
      const needKeys = this.level.cages.filter(c => !c.opened).length;
      if (needKeys > 0) {
        if (m.isBoss) {
          for (let i = 0; i < needKeys; i++) this.pickups.push(new KM.Pickup({ kind: 'key', x: m.x + (i - 1) * 0.8, y: m.y + 0.8, z: m.z }));
        } else if (m.keyDrop || (m.def.big && Math.random() < 0.45) || (m.elite && Math.random() < 0.35)) {
          this.pickups.push(new KM.Pickup({ kind: 'key', x: m.x, y: m.y + 0.6, z: m.z }));
        }
      }

      if (m.isBoss) {
        this.state.data.stats.bosses++;
        this.ui.toast('🏆 ' + m.def.name + ' повержен!', 'good', 3500);
        this.audio.sfx('win');
        this.fx.shake(1);
        this.dropItem(m.x + 1, m.y, m.z, 'egg');
        this.dropItem(m.x - 1, m.y, m.z, 'cake');
      }

      // опыт питомцам
      for (const pet of this.pets) {
        const res = this.state.addPetXP(pet.data, Math.ceil(xp * 0.6));
        if (res.evolved) {
          this.ui.toast('✨ ' + pet.data.name + ' эволюционировал!', 'good', 3200);
          this.audio.sfx('levelup');
          this.fx.ring(pet.x, pet.y + 0.5, pet.z, 2, [1, 0.9, 0.4]);
          pet.scale = (pet.def.cat ? 0.55 : 0.62) * (1 + pet.data.stage * 0.28);
          const ab = (pet.data.acc && KM.PET_ACC_BY[pet.data.acc]) ? KM.PET_ACC_BY[pet.data.acc].dmg : 0;
          pet.dmg = pet.def.dmg * (1 + (pet.data.level - 1) * 0.12) * (1 + pet.data.stage * 0.5) * (1 + ab);
        }
      }

      this.ui.updateObjectives();
      this.checkComplete();
    }

    dropItem(x, y, z, id) {
      this.pickups.push(new KM.Pickup({ kind: 'item', item: id, x, y: y + 0.5, z }));
    }

    collectPickup(p) {
      const st = this.state.stats();
      if (p.kind === 'coin') {
        this.state.addCoins(p.value);
        this.audio.sfx('coin');
        this.fx.damageNumber(p.x, p.y, p.z, '+' + p.value, 'coin');
      } else if (p.kind === 'xp') {
        const ups = this.state.addXP(p.value);
        this.audio.sfx('pickup');
        this.fx.damageNumber(p.x, p.y, p.z, '+' + p.value + ' XP', 'xp');
        if (ups > 0) {
          this.audio.sfx('levelup');
          this.ui.toast('⭐ Уровень ' + this.state.data.level + '! +' + (ups * 2) + ' очка навыков', 'good', 3200);
          this.fx.ring(this.player.x, this.player.y + 0.3, this.player.z, 3, [1, 0.9, 0.3]);
          this.player.applyStats();
          this.player.hp = this.player.maxHp;
          this.player.mana = this.player.maxMana;
        }
      } else if (p.kind === 'key') {
        this.player.keysHeld++;
        this.state.addItem('key', 1);
        this.audio.sfx('unlock');
        this.ui.toast('🗝️ Получен ключ от клетки!', 'good');
      } else {
        this.state.addItem(p.item, 1);
        const it = KM.ITEM_BY[p.item];
        this.audio.sfx('pickup');
        this.ui.toast('Получено: ' + it.icon + ' ' + it.name, 'info');
      }
      this.ui.updateHud();
      this.state.save();
    }

    /** Клавиша K — подобрать / открыть / войти в портал. */
    interact() {
      const p = this.player;
      const L = this.level;
      let acted = false;

      // предметы рядом
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind === 'coin' || pk.kind === 'xp') continue;
        if (U.dist(pk.x, pk.z, p.x, p.z) < 2.0 && Math.abs(pk.y - p.y) < 2.4) {
          pk.collect(this); acted = true;
        }
      }
      if (acted) return;

      // сундук
      for (const c of L.chests) {
        if (c.opened) continue;
        if (U.dist(c.x, c.z, p.x, p.z) < 2.4 && Math.abs(c.y - p.y) < 2.5) {
          this.openChest(c); return;
        }
      }

      // клетка
      for (const c of L.cages) {
        if (c.opened) continue;
        if (U.dist(c.x, c.z, p.x, p.z) < 2.8 && Math.abs(c.y - p.y) < 3) {
          this.openCage(c); return;
        }
      }

      // портал
      if (L.portal && U.dist(L.portal.x, L.portal.z, p.x, p.z) < 2.6) {
        if (L.portal.active) this.finishLevel();
        else {
          this.audio.sfx('error');
          this.ui.toast('Портал спит. Победите всех монстров' + (L.cages.length ? ' и освободите котов' : '') + '!', 'warn');
        }
        return;
      }

      // кустик — собрать ягодку
      for (const b of L.bushes) {
        if (b.picked) continue;
        if (U.dist(b.x, b.z, p.x, p.z) < b.r + 0.4 && Math.abs(b.y - p.y) < 2) {
          b.picked = true;
          this.state.addItem('berry', 1);
          this.audio.sfx('pickup');
          this.fx.puff(b.x, b.y + 0.6, b.z, 4, [0.4, 0.8, 0.3]);
          this.ui.toast('🫐 Сорвана лесная ягода', 'info');
          this.ui.updateHud();
          return;
        }
      }

      this.audio.sfx('error');
    }

    openChest(c) {
      c.opened = true;
      if (this.serverMode && this.net) this.net.reportChest(this.level.chests.indexOf(c));
      this.chestsOpened++;
      this.state.data.stats.chests++;
      this.audio.sfx('chest');
      this.fx.sparkle(c.x, c.y + 0.6, c.z, 22, [1, 0.85, 0.3]);
      this.fx.ring(c.x, c.y + 0.3, c.z, 1.6, [1, 0.9, 0.4]);

      const st = this.state.stats();
      const idx = this.levelIndex;
      const coins = Math.round((30 + idx * 9) * (1 + c.tier * 0.8) * st.luck);
      for (let i = 0; i < 6 + c.tier * 3; i++) {
        this.pickups.push(new KM.Pickup({ kind: 'coin', x: c.x, y: c.y + 0.7, z: c.z, value: Math.ceil(coins / (6 + c.tier * 3)) }));
      }
      // предметы
      const pool = ['fish', 'berry', 'milk', 'potHp', 'potMana', 'meat', 'potEn'];
      const rare = ['cake', 'treat', 'shard', 'scroll', 'egg'];
      const n = 1 + c.tier + (Math.random() < 0.4 * st.luck ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const id = (Math.random() < 0.25 * st.luck + c.tier * 0.15) ? rare[Math.floor(Math.random() * rare.length)] : pool[Math.floor(Math.random() * pool.length)];
        this.dropItem(c.x + (Math.random() - 0.5) * 1.2, c.y, c.z + (Math.random() - 0.5) * 1.2, id);
      }
      // ключ из сундука
      const needKeys = this.level.cages.filter(cc => !cc.opened).length;
      if (needKeys > 0 && Math.random() < 0.55 + c.tier * 0.2) {
        this.pickups.push(new KM.Pickup({ kind: 'key', x: c.x, y: c.y + 0.8, z: c.z }));
      }
      this.ui.toast('📦 Сундук открыт!', 'good');
      if (this.tutorial) this.tutorial.event('chest');
      this.ui.updateObjectives();
    }

    openCage(cage) {
      if (this.state.invCount('key') <= 0) {
        this.audio.sfx('error');
        this.ui.toast('🗝️ Нужен ключ! Ищите сундуки или бейте крупных монстров', 'warn', 3000);
        return;
      }
      this.state.removeItem('key', 1);
      this.player.keysHeld = Math.max(0, this.player.keysHeld - 1);
      cage.opened = true;
      if (this.serverMode && this.net) this.net.reportCage(this.level.cages.indexOf(cage));
      this.cagesOpened++;
      this.state.data.stats.freed++;
      this.state.data.freedCats++;
      this.audio.sfx('cage');
      this.delay(0.35, () => this.audio.sfx('meow'));
      this.fx.explosion(cage.x, cage.y + 1.2, cage.z, 24, [0.85, 0.85, 0.95], 1.2);
      this.fx.sparkle(cage.x, cage.y + 1, cage.z, 26, [1, 0.9, 0.5]);

      // награда
      const r = KM.CAGE_REWARDS[cage.rewardIdx % KM.CAGE_REWARDS.length];
      this.giveReward(r, cage);
      this.ui.updateObjectives();
      this.checkComplete();
      this.state.save();
    }

    giveReward(r, at) {
      const S = this.state;
      let msg = '';
      switch (r.type) {
        case 'ability':
          if (S.unlockAbility(r.id)) { const a = KM.ABIL_BY[r.id]; msg = 'Новая способность: ' + a.icon + ' ' + a.name; }
          else { S.addCoins(200); msg = 'Уже есть — держите 200 монет!'; }
          break;
        case 'spell':
          if (S.unlockSpell(r.id)) { const s = KM.SPELL_BY[r.id]; msg = 'Новое заклинание: ' + s.icon + ' ' + s.name; this.ui.updateSpellBar(); }
          else { S.addCoins(250); msg = 'Уже есть — держите 250 монет!'; }
          break;
        case 'cat': {
          const c = KM.CAT_BY[r.id];
          if (!S.hasCat(r.id)) {
            // персонаж всегда выдаётся через торжественный экран
            this.delay(1.1, () => this.ui.revealCat(r.id, 'none'));
            this.audio.sfx('unlock');
            this.ui.bigMessage('🐱 Кот-маг освобождён!', 'Он привёл с собой друга…');
            return;
          }
          S.addCoins(400);
          msg = c.name + ' уже есть — держите 400 монет!';
          break;
        }
        case 'pet': {
          const p = S.addPet(r.id);
          msg = p ? ('Новый питомец: ' + KM.PET_BY[r.id].name + '!') : 'Питомец не найден';
          break;
        }
        case 'coins': S.addCoins(r.n); msg = '+' + r.n + ' монет'; break;
        case 'item': S.addItem(r.id, r.n || 1); msg = 'Получено: ' + KM.ITEM_BY[r.id].icon + ' ' + KM.ITEM_BY[r.id].name + ' ×' + (r.n || 1); break;
      }
      this.audio.sfx('unlock');
      this.ui.bigMessage('🐱 Кот-маг освобождён!', msg);
      this.ui.updateHud();
    }

    checkComplete() {
      const L = this.level;
      const monsLeft = this.monsters.filter(m => m.alive).length;
      const cagesLeft = L.cages.filter(c => !c.opened).length;
      if (monsLeft === 0 && cagesLeft === 0 && L.portal && !L.portal.active) {
        L.portal.active = true;
        this.audio.sfx('portal');
        this.ui.toast('✨ Портал открылся! Идите к нему (K)', 'good', 4200);
        this.fx.ring(L.portal.x, L.portal.y + 0.5, L.portal.z, 4, [0.6, 1, 1]);
      }
    }

    finishLevel() {
      if (this.mode !== 'playing') return;
      if (this.tutorial) this.tutorial.event('finish');
      this.mode = 'won';
      const L = this.level;
      const info = L.info;
      let stars = 1;
      if (L.cages.length === 0 || this.cagesOpened === L.cages.length) stars = 2;
      if (this.chestsOpened === L.chests.length && stars === 2) stars = 3;

      const bonus = Math.round(info.reward * (1 + stars * 0.25));
      this.state.addCoins(bonus);
      this.state.addXP(Math.round(info.reward * 0.6));
      this.state.completeLocation(this.levelIndex, stars);
      this.audio.sfx('win');
      this.audio.stopMusic();
      this.input.exitLock();
      this.ui.showVictory({
        name: info.fullName, stars, bonus,
        coins: this.coinsEarned, xp: this.xpEarned,
        chests: this.chestsOpened + '/' + L.chests.length,
        cages: this.cagesOpened + '/' + L.cages.length,
        time: this.levelTime,
        next: this.levelIndex + 1 < KM.LEVELS
      });
    }


    // ============================================================
    //  БАЗЫ КОМАНД
    //  «Красные против синих»: каждая команда начинает у себя,
    //  возвращается туда после поражения и чувствует себя там
    //  в безопасности. Чужому в эту зону хода нет.
    // ============================================================
    /** Идёт ли сейчас командная игра. */
    teamMatch() {
      return !!(this.serverMode && this.netMode === 'team' &&
        this.level && this.level.bases);
    }

    /** За какую команду играет кот. */
    myTeam() {
      return (this.net && this.net.team) || null;
    }

    /** База команды. Без команды — ничего. */
    baseOf(team) {
      if (!this.level || !this.level.bases || !team) return null;
      return this.level.bases[team] || null;
    }

    /** Точка, где кот появляется и возрождается. */
    spawnPoint() {
      const L = this.level;
      if (!L) return { x: 0, y: 1, z: 0 };
      if (this.teamMatch()) {
        const б = this.baseOf(this.myTeam());
        if (б) {
          // не в самой середине, а чуть в стороне — чтобы коты не толкались
          const a = Math.random() * Math.PI * 2, д = Math.random() * б.r * 0.5;
          return { x: б.x + Math.cos(a) * д, y: б.y, z: б.z + Math.sin(a) * д };
        }
      }
      return { x: L.spawn.x, y: L.spawn.y, z: L.spawn.z };
    }

    /** Кот внутри своей безопасной зоны? */
    inOwnBase(x, z) {
      if (!this.teamMatch()) return false;
      const б = this.baseOf(this.myTeam());
      if (!б) return false;
      return Math.hypot(x - б.x, z - б.z) < б.r;
    }

    /**
     * Не пускаем в чужую базу: у самой границы кота мягко выталкивает,
     * будто там стоит стена. Своих зона пропускает свободно.
     */
    keepOutOfEnemyBase(p) {
      if (!this.teamMatch()) return;
      const своя = this.myTeam();
      for (const имя of ['red', 'blue']) {
        if (имя === своя) continue;
        const б = this.level.bases[имя];
        if (!б) continue;
        const dx = p.x - б.x, dz = p.z - б.z;
        const д = Math.hypot(dx, dz);
        if (д >= б.r || д < 1e-4) continue;
        const толчок = (б.r - д);
        p.x += (dx / д) * толчок;
        p.z += (dz / д) * толчок;
        p.vx *= 0.2; p.vz *= 0.2;
        this._baseWarn = (this._baseWarn || 0) - 1;
        if (this._baseWarn <= 0) {
          this._baseWarn = 90;              // не чаще полутора секунд
          this.ui.toast('🛡 Это база чужой команды — туда нельзя', 'warn', 2200);
          this.audio.sfx('error');
        }
      }
    }

    /** Возрождение в командной игре — вместо экрана поражения. */
    respawnInBase() {
      const p = this.player;
      const точка = this.spawnPoint();
      p.x = точка.x; p.z = точка.z; p.y = точка.y + 0.4;
      p.vx = p.vy = p.vz = 0;
      p.hp = p.maxHp; p.mana = p.maxMana; p.energy = p.maxEnergy;
      p.dead = false; p.revived = false;
      p.invuln = 3.0;                        // пара секунд неприкосновенности
      p.effects = { burn: 0, poison: 0, slow: 0, freeze: 0, vuln: 0 };
      this.mode = 'playing';
      this.audio.sfx('unlock');
      this.fx.ring(p.x, p.y + 0.4, p.z, 3.5, this.myTeam() === 'red' ? [1, 0.5, 0.5] : [0.5, 0.7, 1]);
      this.ui.show('none');
      this.ui.showHud(true);
      this.ui.updateHud();
      this.ui.toast('🐾 Кот вернулся в бой', 'good', 2200);
      if (this.net) this.net.refreshMe();
    }

    /** Нарисовать купола баз — видно, где чья земля. */
    drawBases() {
      if (!this.teamMatch()) return;
      const своя = this.myTeam();
      const t = this.time;
      for (const имя of ['red', 'blue']) {
        const б = this.level.bases[имя];
        if (!б) continue;
        const мой = имя === своя;
        const c = имя === 'red' ? [1, 0.32, 0.34] : [0.36, 0.6, 1];
        const я = мой ? 0.85 : 0.5;

        // круг из столбиков по краю — «полоски» границы
        const шт = 40;
        for (let i = 0; i < шт; i++) {
          const a = i / шт * Math.PI * 2 + t * 0.12;
          const x = б.x + Math.cos(a) * б.r, z = б.z + Math.sin(a) * б.r;
          const h = б.y + 0.6 + Math.sin(t * 2 + i * 0.7) * 0.12;
          this.dynAlpha.pushBox(x, h, z, 0.34, 1.5, 0.34,
            c[0], c[1], c[2], 0.5, я, 0, 0, i);
        }
        // подсветка земли внутри
        const колец = 3;
        for (let k = 1; k <= колец; k++) {
          const r = б.r * (k / колец) * 0.92;
          const шт2 = 10 + k * 8;
          for (let i = 0; i < шт2; i++) {
            const a = i / шт2 * Math.PI * 2 - t * 0.08 * k;
            this.dynAlpha.pushBox(б.x + Math.cos(a) * r, б.y + 0.08, б.z + Math.sin(a) * r,
              0.5, 0.08, 0.5, c[0], c[1], c[2], 0.34, я * 0.7, 0, 0, k * 40 + i);
          }
        }
        // столб света в середине — видно издалека
        this.dynAlpha.pushBox(б.x, б.y + 4, б.z, 0.9, 8, 0.9,
          c[0], c[1], c[2], 0.16, я * 0.8, 0, 0, 7);
      }
    }

    onPlayerDeath(reason) {
      this.state.data.stats.deaths++;
      this.audio.sfx('die');
      this.fx.explosion(this.player.x, this.player.y + 0.5, this.player.z, 20, [1, 0.8, 0.8], 1);

      // В командной игре поражение — не конец, а короткая передышка:
      // кот приходит в себя на своей базе и возвращается в бой.
      if (this.teamMatch()) {
        this.mode = 'dead';
        this.ui.toast('😿 Кота одолели — возвращаемся на базу…', 'bad', 2600);
        this.delay(3, () => this.respawnInBase());
        this.state.save();
        return;
      }

      this.audio.stopMusic();
      this.mode = 'dead';
      this.input.exitLock();
      this.delay(0.9, () => this.ui.showDefeat(reason || 'монстры'));
      this.state.save();
    }

    quitToMenu() {
      if (this.chat) { this.chat.clearBubbles(); this.chat.setOpen(false); }
      if (this.net) this.net.leaveRoom();
      this.serverMode = false;
      this.mode = 'menu';
      this.audio.stopMusic();
      this.audio.startMusic('menu');
      this.input.exitLock();
      this.state.save();
      this.ui.showHud(false);
      if (this.tutorial) this.tutorial.hide();
      this.level = null;
      this.monsters.length = 0;
      this.pets.length = 0;
      this.projectiles.length = 0;
      this.zones.length = 0;
      this.pickups.length = 0;
      this.timers.length = 0;
      this.tornados.length = 0;
      this.blackholes.length = 0;
      this.clouds.length = 0;
      this.platforms.length = 0;
      this.grabs.length = 0;
    }

    // ============================================================
    //  ОБНОВЛЕНИЕ
    // ============================================================
    update(dt) {
      this.time += dt;
      const input = this.input;

      // таймеры
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const t = this.timers[i];
        t.t -= dt;
        if (t.t <= 0) { this.timers.splice(i, 1); try { t.fn(); } catch (e) { console.error(e); } }
      }

      if (this.net) this.net.update(dt);
      this.shareNewEffects();
      if (this.chat) this.chat.update(dt);
      if (this.touch) this.touch.sync();
      if (this.ui && this.ui.syncEmotes) this.ui.syncEmotes();
      if (this.ui && this.ui.updateMatchHud) this.ui.updateMatchHud();
      if (this.ui && this.ui.syncWho) this.ui.syncWho();
      this._matchT = (this._matchT || 0) - dt;
      if (this._matchT <= 0 && this.serverMode && this.net && this.net.room !== null) {
        this._matchT = 1;                     // раз в секунду просим свежий счёт
        this.net.send({ t: 'match' });
      }
      KM.DEVICE.checkRotate(this.mode === 'playing' && this.ui && this.ui.current === 'none');
      if (this.showcase) this.showcase.t += dt;
      if (this.mode !== 'playing') { this.fx.update(dt); return; }
      this.levelTime += dt;
      this.state.data.stats.playtime += dt;

      if (input.justPressed('Escape')) { this.ui.pause(); return; }
      if (input.justPressed('KeyI')) { this.ui.openInventory(); return; }
      if (input.justPressed('KeyM')) { this.ui.toggleMinimap(); }
      if (input.justPressed('KeyP')) { this.ui.takeShot(); }

      this.player.update(dt, input);
      const watching = this.serverMode && this.net && !this.net.isHost;
      if (watching) { for (const m of this.monsters) m.updateRemote(dt); }
      else { for (const m of this.monsters) m.update(dt, this.time); }
      this.sendMonsterSnapshot(dt);
      for (const p of this.pets) p.update(dt, this.time);

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.update(dt, this);
        if (pr.dead) this.projectiles.splice(i, 1);
      }
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.update(dt, this);
        if (z.dead) this.zones.splice(i, 1);
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        p.update(dt, this);
        if (p.dead) this.pickups.splice(i, 1);
      }
      for (let i = this.tornados.length - 1; i >= 0; i--) {
        this.tornados[i].update(dt);
        if (this.tornados[i].dead) this.tornados.splice(i, 1);
      }
      for (let i = this.blackholes.length - 1; i >= 0; i--) {
        this.blackholes[i].update(dt);
        if (this.blackholes[i].dead) this.blackholes.splice(i, 1);
      }
      for (let i = this.clouds.length - 1; i >= 0; i--) {
        this.clouds[i].update(dt);
        if (this.clouds[i].dead) this.clouds.splice(i, 1);
      }
      for (let i = this.grabs.length - 1; i >= 0; i--) {
        this.grabs[i].update(dt);
        if (this.grabs[i].dead) this.grabs.splice(i, 1);
      }
      for (let i = this.platforms.length - 1; i >= 0; i--) {
        const pl = this.platforms[i];
        pl.t += dt; pl.life -= dt;
        if (pl.life <= 0) this.platforms.splice(i, 1);
      }
      // убираем окончательно исчезнувших монстров
      for (let i = this.monsters.length - 1; i >= 0; i--) {
        if (this.monsters[i].dead && this.monsters[i].deadT > 1.4) this.monsters.splice(i, 1);
      }

      // анимация сундуков/клеток/портала
      const L = this.level;
      for (const c of L.chests) c.open = U.damp(c.open, c.opened ? 1 : 0, 7, dt);
      for (const c of L.cages) c.open = U.damp(c.open, c.opened ? 1 : 0, 3.2, dt);
      if (L.portal) L.portal.spin += dt;

      // звук: где «уши» игрока
      this.audio.setListener(this.player.x, this.player.y, this.player.z, this.player.yaw);

      // случайные звуки окружения по биому
      this.ambT -= dt;
      if (this.ambT <= 0) {
        this.ambT = 4 + Math.random() * 7;
        this.audio.ambience(L.biome.id);
      }
      // гудение открытого портала
      if (L.portal && L.portal.active) {
        const dp = U.dist(L.portal.x, L.portal.z, this.player.x, this.player.z);
        if (dp < 22) {
          this.portalHumT -= dt;
          if (this.portalHumT <= 0) { this.portalHumT = 1.1; this.audio.sfxAt('portalhum', L.portal.x, L.portal.y, L.portal.z, 22); }
        }
      }

      // обучение
      if (this.tutorial) {
        const sp = Math.hypot(this.player.vx, this.player.vz);
        if (sp > 1) this.tutorial.event('move', sp * dt);
        if (Math.abs(this.input.mouse.dx) + Math.abs(this.input.mouse.dy) > 0) this.tutorial.event('look', dt * 3);
        if (this.player.restT > 0.5) this.tutorial.event('rest', dt);
        if (this.player.hidden) this.tutorial.event('hide');
        this.tutorial.update(dt);
      }

      this.fx.update(dt);
      this.updateMusicMood();
      this.updateHint();
      this.ui.updateHudLight();
    }

    /** Переключение спокойной темы на боевую, когда монстры рядом. */
    updateMusicMood() {
      if (!this.level) return;
      const boss = this.level.info.isBoss;
      let fighting = false;
      for (const m of this.monsters) {
        if (m.alive && m.mode === 'chase' && U.dist2(m.x, m.z, this.player.x, this.player.z) < 400) { fighting = true; break; }
      }
      const want = boss ? 'boss' : (fighting ? 'battle' : (this.level.biome.track || 'calm'));
      this._moodT = (this._moodT || 0) - 1;
      if (want !== this.audio.trackName && this._moodT <= 0) {
        this._moodT = 180;           // не дёргаем тему чаще раза в 3 секунды
        this.audio.startMusic(want);
      }
    }

    updateHint() {
      const p = this.player, L = this.level;
      let best = null, bd = 3.0;
      const chk = (x, z, y, text, dist) => {
        const d = U.dist(x, z, p.x, p.z);
        if (d < (dist || 2.4) && Math.abs(y - p.y) < 3 && d < bd) { bd = d; best = text; }
      };
      for (const c of L.chests) if (!c.opened) chk(c.x, c.z, c.y, '[K] Открыть сундук 📦');
      for (const c of L.cages) if (!c.opened) chk(c.x, c.z, c.y, this.state.invCount('key') > 0 ? '[K] Освободить кота-мага 🗝️' : '🔒 Нужен ключ от клетки', 2.8);
      for (const pk of this.pickups) {
        if (pk.dead || pk.kind === 'coin' || pk.kind === 'xp') continue;
        const nm = pk.kind === 'key' ? 'ключ 🗝️' : (KM.ITEM_BY[pk.item] ? KM.ITEM_BY[pk.item].icon + ' ' + KM.ITEM_BY[pk.item].name : 'предмет');
        chk(pk.x, pk.z, pk.y, '[K] Подобрать ' + nm, 2.0);
      }
      if (L.portal) {
        chk(L.portal.x, L.portal.z, L.portal.y,
          L.portal.active ? '[K] Войти в портал ✨' : '💤 Портал спит', 2.8);
      }
      if (!best) {
        for (const b of L.bushes) {
          if (b.picked) continue;
          chk(b.x, b.z, b.y, '[K] Сорвать ягоду 🫐', b.r + 0.4);
        }
      }
      if (!best && p.hidden) best = '🌿 Вы спрятались в кустах';
      this.hint = best;
    }

    // ============================================================
    //  РЕНДЕР
    // ============================================================
    // ============================================================
    //  ВИТРИНА ПЕРСОНАЖА (выдача приза и выбор кота)
    // ============================================================
    /** opts: { rarity, reveal, side } */
    showCharacter(cat, opts) {
      opts = opts || {};
      const model = KM.catModel(cat);
      this.showcase = {
        cat, model,
        pose: new KM.vox.Pose(model),
        mat: M4.create(),
        rarity: opts.rarity || cat.rarity || 'common',
        reveal: opts.reveal !== false,
        side: opts.side || 'center',
        t: 0, flashed: false
      };
      if (!this.scB) { this.scB = new KM.Batch(3000); this.scA = new KM.Batch(1500); }
    }
    clearShowcase() { this.showcase = null; }

    renderShowcase() {
      const sc = this.showcase, r = this.renderer, t = sc.t;
      const R = KM.RARITY[sc.rarity] || KM.RARITY.common;
      let col = KM.hex(R.color);
      if (R.shimmer) {
        const k = 0.5 + 0.5 * Math.sin(t * 3.2);
        col = [0.75 + k * 0.25, 0.80 + k * 0.2, 0.92 + k * 0.08];
      }
      const revealed = !sc.reveal || t > 1.05;

      // при выдаче приза фон заливается цветом редкости,
      // а в спокойном предпросмотре — тёмный фиолетовый с лёгким оттенком
      const env = sc.reveal ? {
        skyTop: [col[0] * 0.10, col[1] * 0.10, col[2] * 0.14],
        skyBot: [col[0] * 0.42, col[1] * 0.42, col[2] * 0.5],
        fogColor: [col[0] * 0.2, col[1] * 0.2, col[2] * 0.26],
        fogRange: [22, 60],
        sun: [0.75, 0.74, 0.8], ambTop: [0.5, 0.5, 0.6], ambBot: [0.28, 0.28, 0.36],
        lightDir: [0.35, 0.85, 0.4]
      } : {
        skyTop: [0.05 + col[0] * 0.03, 0.04 + col[1] * 0.03, 0.11 + col[2] * 0.04],
        skyBot: [0.13 + col[0] * 0.10, 0.10 + col[1] * 0.10, 0.26 + col[2] * 0.10],
        fogColor: [0.10 + col[0] * 0.05, 0.08 + col[1] * 0.05, 0.20 + col[2] * 0.05],
        fogRange: [16, 44],
        sun: [0.78, 0.76, 0.84], ambTop: [0.48, 0.47, 0.60], ambBot: [0.26, 0.25, 0.35],
        lightDir: [0.35, 0.85, 0.4]
      };

      const off = sc.side === 'left' ? -1.35 : (sc.side === 'right' ? 1.35 : 0);
      const spin = revealed ? 0.55 + t * 0.5 : 0.55;
      const camR = 4.6;
      const ang = sc.side === 'center' ? Math.sin(t * 0.35) * 0.35 : 0.25;
      r.setCamera(0.6, 0.05, 90,
        off + Math.sin(ang) * camR, 1.35, Math.cos(ang) * camR,
        off, 0.72, 0);

      const B = this.scB, BA = this.scA;
      B.clear(); BA.clear();

      // пьедестал
      const pk = Math.min(1, t / 0.35);
      B.pushBox(off, -0.22 * pk, 0, 2.3 * pk, 0.44, 2.3 * pk,
        col[0] * 0.45, col[1] * 0.45, col[2] * 0.5, 1, 0.25, 0.4, 0, 0);
      B.pushBox(off, 0.04, 0, 1.7 * pk, 0.1, 1.7 * pk, col[0], col[1], col[2], 1, 0.85, 0.2, 0, 1);

      // столбы света
      const rays = sc.reveal ? (revealed ? 16 : 9) : 6;
      for (let i = 0; i < rays; i++) {
        const a = t * (revealed ? 0.8 : 1.6) + i * (6.283 / rays);
        const rr = revealed ? 1.5 + Math.sin(t * 2 + i) * 0.3 : 1.1;
        const h = revealed ? 4.5 + Math.sin(t * 3 + i * 1.4) * 1.4 : 7;
        BA.pushBoxY(off + Math.cos(a) * rr, h * 0.5, Math.sin(a) * rr, a,
          0.16, h, 0.16, col[0], col[1], col[2],
          sc.reveal ? (revealed ? 0.28 : 0.45) : 0.16, 1, 0, 0, i);
      }

      // сам персонаж
      const rise = sc.reveal ? Math.min(1, t / 0.9) : 1;
      const y = (1 - rise) * -1.4;
      const grow = revealed ? 1 + Math.max(0, 0.25 - (t - 1.05)) * 1.6 : 0.9 + rise * 0.1;
      KM.anim.cat(sc.pose, {
        t: t + 3, walk: t * 3, walkAmt: revealed ? 0.25 : 0,
        runAmt: 0, air: false, vy: 0, rest: 0,
        attack: 0, cast: revealed && t < 1.6 ? (1.6 - t) / 0.55 : 0,
        hurt: 0, blink: 0, lookX: 0.02, lookY: Math.sin(t * 0.7) * 0.25
      });
      M4.trs(sc.mat, off, 0.09 + y, 0, spin, grow, grow, grow);

      if (!revealed) {
        // силуэт: чёрная фигура в ореоле
        const dark = {};
        for (const k in sc.cat.pal) dark[k] = [0.02, 0.02, 0.05];
        KM.vox.drawModel(B, sc.model, sc.mat, sc.pose, { pal: dark, alpha: 1, emis: 0, batchAlpha: BA });
      } else {
        if (!sc.flashed) {
          sc.flashed = true;
          this.renderer.flash = 1;
          this.renderer.flashColor = [col[0], col[1], col[2]];
          this.audio.sfx('unlock');
          if (KM.RARITY[sc.rarity].order >= 3) this.audio.jingle('victory');
        }
        let pal = sc.cat.pal;
        if (sc.cat.shimmer) {
          pal = Object.assign({}, pal);
          const k = 0.5 + 0.5 * Math.sin(t * 3);
          pal.fur = [0.82 + k * 0.18, 0.86 + k * 0.14, 0.95 + k * 0.05];
          pal.fur2 = [1, 1, 1];
        } else if (sc.cat.rainbow) {
          pal = Object.assign({}, pal);
          const h = (t * 0.4) % 1;
          pal.fur = hsvColor(h, 0.55, 1);
          pal.fur2 = hsvColor((h + 0.12) % 1, 0.3, 1);
        }
        KM.vox.drawModel(B, sc.model, sc.mat, sc.pose, {
          pal, alpha: sc.cat.alpha === undefined ? 1 : sc.cat.alpha,
          emis: (sc.cat.glow || 0) + Math.max(0, 0.5 - (t - 1.05)), batchAlpha: BA
        });
        // искры вокруг
        for (let i = 0; i < 18; i++) {
          const a = t * 1.3 + i * 0.349;
          const rr = 1.2 + ((i * 7) % 5) * 0.22;
          const yy = 0.2 + ((t * 0.7 + i * 0.21) % 1.8);
          BA.pushBoxY(off + Math.cos(a) * rr, yy, Math.sin(a) * rr, a * 2,
            0.1, 0.1, 0.1, col[0], col[1], col[2], 0.9, 1, 0, 0, i);
        }
      }

      this.renderer.flash = Math.max(0, this.renderer.flash - 0.045);
      r.beginScene(env, t);
      r.draw(B, false);
      r.draw(BA, true);
      r.endScene();
      this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }

    // ---------- живая сцена в главном меню ----------
    buildMenuScene() {
      if (this.menuBatch) return;
      this.menuBatch = new KM.Batch(3000);
      this.menuStatic = new KM.Batch(3000);
      this.menuAlpha = new KM.Batch(1200);
      this.menuPose = new KM.vox.Pose(KM.MODELS.cat);
      this.menuMat = M4.create();
      this.menuBlink = 0; this.menuBlinkT = 2;
      this.menuEnv = {
        skyTop: KM.hex('#2a1a5a'), skyBot: KM.hex('#7a5ad0'),
        fogColor: KM.hex('#4a3a8a'), fogRange: [16, 46],
        sun: [0.72, 0.62, 0.78], ambTop: [0.46, 0.42, 0.62], ambBot: [0.24, 0.20, 0.34],
        lightDir: norm3([0.4, 0.8, 0.45])
      };

      // парящий островок из кубиков
      const S = this.menuStatic;
      const rng = KM.makeRNG(20250825);
      const grass = [KM.hex('#63bf4a'), KM.hex('#57ad42'), KM.hex('#75cc58')];
      const dirt = KM.hex('#8a6a42');
      for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
          const d = Math.hypot(x, z);
          if (d > 4.6) continue;
          const h = Math.round((rng() * 0.6 - 0.3) * 2) * 0.25;
          const g = grass[Math.floor(rng() * 3)];
          S.pushBox(x, h - 0.25, z, 1, 0.5, 1, g[0], g[1], g[2], 1, 0, 0.5, 0, rng());
          const deep = 1.2 + (4.6 - d) * 0.7 + rng();
          S.pushBox(x, h - 0.5 - deep / 2, z, 1 - (d > 3.6 ? 0.2 : 0), deep, 1 - (d > 3.6 ? 0.2 : 0),
            dirt[0], dirt[1], dirt[2], 1, 0, 0.6, 0, rng());
        }
      }
      // цветочки и трава
      for (let i = 0; i < 26; i++) {
        const a = rng() * 6.28, r2 = rng() * 4.0;
        const x = Math.cos(a) * r2, z = Math.sin(a) * r2;
        if (Math.hypot(x, z) > 4.2) continue;
        const cols = [[1, 0.42, 0.6], [1, 0.85, 0.3], [0.55, 0.7, 1], [1, 1, 1]];
        const c = cols[Math.floor(rng() * 4)];
        S.pushBox(x, 0.16, z, 0.05, 0.32, 0.05, 0.3, 0.6, 0.25, 1, 0, 0.4, 0.05, rng());
        S.pushBox(x, 0.36, z, 0.16, 0.1, 0.16, c[0], c[1], c[2], 1, 0.2, 0.3, 0.05, rng());
      }
      // деревце
      const bark = KM.hex('#6a4a30');
      for (let i = 0; i < 3; i++) S.pushBox(2.6, 0.3 + i * 0.6, -2.2, 0.3, 0.6, 0.3, bark[0], bark[1], bark[2], 1, 0, 0.55, 0, i);
      for (let ix = -1; ix <= 1; ix++) for (let iy = 0; iy <= 1; iy++) for (let iz = -1; iz <= 1; iz++) {
        const c = grass[(Math.abs(ix + iy + iz)) % 3];
        S.pushBox(2.6 + ix * 0.62, 2.3 + iy * 0.58, -2.2 + iz * 0.62, 0.64, 0.6, 0.64,
          c[0] * 0.9, c[1] * 1.05, c[2] * 0.85, 1, 0, 0.5, 0.015, ix + iz);
      }
    }

    renderMenu() {
      const r = this.renderer, t = this.time;
      this.buildMenuScene();
      const a = t * 0.22;
      const dist = 11.5;
      r.setCamera(this.fov * 0.95, 0.08, 140,
        Math.sin(a) * dist, 5.4 + Math.sin(t * 0.5) * 0.4, Math.cos(a) * dist,
        0, 0.6, 0);

      this.menuBatch.clear();
      this.menuAlpha.clear();

      // кот сидит и помахивает хвостом
      this.menuBlinkT -= 1 / 60;
      if (this.menuBlinkT <= 0) { this.menuBlinkT = 2 + Math.random() * 3; this.menuBlink = 1; }
      this.menuBlink = Math.max(0, this.menuBlink - 0.12);
      const st = this.state.stats();
      KM.anim.cat(this.menuPose, {
        t, walk: t * 2, walkAmt: 0, runAmt: 0, air: false, vy: 0,
        rest: 0.85 + Math.sin(t * 0.7) * 0.1, attack: 0,
        cast: Math.max(0, Math.sin(t * 0.42)) * 0.5, hurt: 0, blink: this.menuBlink,
        lookX: Math.sin(t * 0.6) * 0.12, lookY: Math.sin(t * 0.33) * 0.3
      });
      M4.trs(this.menuMat, 0, 0.25, 0, Math.PI + Math.sin(t * 0.3) * 0.5, 1.55, 1.55, 1.55);
      KM.vox.drawModel(this.menuBatch, KM.MODELS.cat, this.menuMat, this.menuPose, {
        pal: st.cat.pal, alpha: st.alpha, emis: st.glow, batchAlpha: this.menuAlpha
      });

      // парящие кубики-искры вокруг
      for (let i = 0; i < 26; i++) {
        const ang = t * (0.3 + (i % 5) * 0.07) + i * 0.72;
        const rad = 3.4 + (i % 4) * 1.15;
        const yy = 0.9 + Math.sin(t * 0.8 + i) * 1.5 + (i % 3) * 0.5;
        const s = 0.12 + (i % 3) * 0.05;
        const c = i % 3 === 0 ? [1, 0.85, 0.35] : (i % 3 === 1 ? [0.55, 0.9, 1] : [1, 0.5, 0.8]);
        this.menuAlpha.pushBoxY(Math.cos(ang) * rad, yy, Math.sin(ang) * rad, ang * 2,
          s, s, s, c[0], c[1], c[2], 0.9, 1, 0, 0, i * 0.1);
      }
      // «пыль» под островом
      for (let i = 0; i < 14; i++) {
        const ang = -t * 0.4 + i * 0.45;
        const rad = 1.2 + (i % 5) * 0.6;
        this.menuAlpha.pushBox(Math.cos(ang) * rad, -2.2 - (i % 6) * 0.8 - Math.sin(t + i) * 0.3, Math.sin(ang) * rad,
          0.2, 0.2, 0.2, 0.5, 0.4, 0.8, 0.5, 0.5, 0, 0, i);
      }

      r.beginScene(this.menuEnv, t);
      r.draw(this.menuStatic, false);
      r.draw(this.menuBatch, false);
      r.draw(this.menuAlpha, true);
      r.endScene();
      this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }

    render() {
      const r = this.renderer;
      const p = this.player;
      const t = this.time;

      if (this.showcase && !this.level) { this.renderShowcase(); return; }
      if (!this.level) { this.renderMenu(); return; }

      // фонарик едет вместе с котом
      if (this.lampOn) {
        const lamp = this.env.lamp;
        lamp.pos[0] = p.x;
        lamp.pos[1] = p.y + 1.1;
        lamp.pos[2] = p.z;
        // живой огонёк: чуть подрагивает, будто пламя
        const дрожь = 1 + Math.sin(t * 11.3) * 0.035 + Math.sin(t * 4.1) * 0.025;
        const b2 = this.level.biome.lamp || {};
        lamp.param[1] = (b2.power || 1.15) * дрожь;
      }

      p.cameraPos(this.cam);
      // тряска экрана
      if (this.fx.shakeAmt > 0.001) {
        const s = this.fx.shakeAmt * 0.32;
        this.cam.ex += (Math.random() - 0.5) * s;
        this.cam.ey += (Math.random() - 0.5) * s;
        this.cam.ez += (Math.random() - 0.5) * s;
      }
      r.setCamera(this.fov, 0.08, 240,
        this.cam.ex, this.cam.ey, this.cam.ez,
        this.cam.tx, this.cam.ty, this.cam.tz);

      this.dyn.clear();
      this.dynAlpha.clear();

      // сущности
      if (this.mode !== 'menu') {
        this.drawBases();
        p.draw(this.dyn, this.dynAlpha, t);
        this.drawPeers(this.dyn, this.dynAlpha, t);
        for (const m of this.monsters) m.draw(this.dyn, this.dynAlpha, t);
        for (const pet of this.pets) pet.draw(this.dyn, this.dynAlpha, t);
        for (const pr of this.projectiles) pr.draw(this.dyn, this.dynAlpha, t);
        for (const z of this.zones) z.draw(this.dyn, this.dynAlpha, t);
        for (const pk of this.pickups) pk.draw(this.dyn, this.dynAlpha, t);
        for (const tr of this.tornados) tr.draw(this.dyn, this.dynAlpha, t);
        for (const bh of this.blackholes) bh.draw(this.dyn, this.dynAlpha, t);
        for (const cl of this.clouds) cl.draw(this.dyn, this.dynAlpha, t);
        for (const gr of this.grabs) gr.draw(this.dyn, this.dynAlpha, t);
        for (const pl of this.platforms) KM.drawPlatform(pl, this.dyn, this.dynAlpha, t);

        const L = this.level;
        for (const c of L.chests) KM.drawChest(this.dyn, this.dynAlpha, c, t);
        for (const c of L.cages) KM.drawCage(this.dyn, this.dynAlpha, c, t, this);
        if (L.portal) KM.drawPortal(this.dyn, this.dynAlpha, L.portal, t, L.portal.active);

        // тени-пятна под существами
        this.blob(p.x, p.footY, p.z, 0.5);
        for (const m of this.monsters) if (m.alive && !m.flying) this.blob(m.x, this.level.groundAt(m.x, m.z), m.z, m.radius * 1.1);
        for (const pet of this.pets) this.blob(pet.x, this.level.groundAt(pet.x, pet.z), pet.z, 0.3);

        // светящаяся метка там, куда наведён курсор
        if (this.mode === 'playing') {
          const ids = this.state.data.spells;
          const sp = KM.SPELL_BY[ids[Math.min(p.selectedSpell, ids.length - 1)]];
          const col = sp ? sp.color : [1, 0.9, 0.4];
          const pt = this.aimPoint(this._aimPt);
          const gh = this.level.groundAt(pt.x, pt.z);
          const my = (gh > -900 && Math.abs(gh - pt.y) < 1.5) ? gh + 0.06 : pt.y;
          for (let i = 0; i < 10; i++) {
            const a = t * 1.4 + i * 0.628;
            this.dynAlpha.pushBoxY(pt.x + Math.cos(a) * 0.55, my, pt.z + Math.sin(a) * 0.55, a,
              0.12, 0.05, 0.12, col[0], col[1], col[2], 0.85, 1, 0, 0, i);
          }
          this.dynAlpha.pushBox(pt.x, my, pt.z, 0.14, 0.05, 0.14, 1, 1, 1, 0.9, 1, 0, 0, 0);
        }

        this.fx.draw(this.dyn, this.dynAlpha, t);
      }

      r.beginScene(this.env, t);
      r.draw(this.staticBatch, false);
      r.draw(this.dyn, false);
      r.draw(this.staticAlpha, true);
      r.draw(this.dynAlpha, true);
      r.endScene();

      this.drawOverlay();
    }

    blob(x, y, z, rad) {
      if (y < -900) return;
      this.dynAlpha.pushBox(x, y + 0.03, z, rad * 2, 0.04, rad * 2, 0, 0, 0, 0.28, 0, 0, 0, 0);
    }

    // ---------- 2D-оверлей: полоски здоровья, цифры урона, миникарта ----------
    drawOverlay() {
      const c = this.octx;
      const W = this.overlay.width, H = this.overlay.height;
      c.clearRect(0, 0, W, H);
      if (this.mode === 'menu') return;
      const vp = this.renderer.viewProj;
      const pr = this._proj;

      c.imageSmoothingEnabled = false;
      c.textAlign = 'center';

      // полоски здоровья монстров
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const d = U.dist(m.x, m.z, this.player.x, this.player.z);
        if (d > 34) continue;
        if (m.hp >= m.maxHp && m.mode === 'live' && !m.isBoss) continue;
        M4.project(vp, m.x, m.y + m.height * 1.12 + 0.25, m.z, pr);
        if (!pr[2]) continue;
        const sx = (pr[0] * 0.5 + 0.5) * W, sy = (1 - (pr[1] * 0.5 + 0.5)) * H;
        const w = m.isBoss ? 130 : (m.elite ? 66 : 48);
        const h = m.isBoss ? 9 : 6;
        const frac = U.clamp(m.hp / m.maxHp, 0, 1);
        c.fillStyle = 'rgba(0,0,0,0.62)';
        c.fillRect(sx - w / 2 - 2, sy - h - 2, w + 4, h + 4);
        c.fillStyle = m.isBoss ? '#ff3a5a' : (m.elite ? '#ff9a2a' : '#6ae04a');
        c.fillRect(sx - w / 2, sy - h, w * frac, h);
        c.fillStyle = 'rgba(255,255,255,0.28)';
        c.fillRect(sx - w / 2, sy - h, w * frac, 2);
        if (m.isBoss || m.elite) {
          c.font = 'bold ' + (m.isBoss ? 15 : 11) + 'px "Trebuchet MS", sans-serif';
          c.fillStyle = m.isBoss ? '#ffd0d8' : '#ffd8a0';
          c.fillText((m.elite && !m.isBoss ? '★ ' : '') + m.def.name, sx, sy - h - 6);
        }
        // индикатор состояния
        if (m.mode === 'live' && !m.isBoss) {
          c.font = '13px sans-serif';
          c.fillStyle = 'rgba(255,255,255,0.75)';
          c.fillText(m.sub === 'sleep' ? '💤' : (m.sub === 'graze' ? '🌿' : ''), sx, sy - h - 8);
        }
      }

      // ники и здоровье других игроков
      if (this.net && this.net.peers.size) {
        for (const pp of this.net.peers.values()) {
          M4.project(vp, pp.x, pp.y + 1.5, pp.z, pr);
          if (!pr[2]) continue;
          const sx = (pr[0] * 0.5 + 0.5) * W, sy = (1 - (pr[1] * 0.5 + 0.5)) * H;
          const frac = U.clamp((pp.hp || 0) / (pp.maxHp || 100), 0, 1);
          c.fillStyle = 'rgba(0,0,0,0.6)';
          c.fillRect(sx - 26, sy - 6, 52, 6);
          c.fillStyle = '#6ae0ff';
          c.fillRect(sx - 25, sy - 5, 50 * frac, 4);
          c.font = 'bold 13px "Trebuchet MS", sans-serif';
          c.fillStyle = '#0a0618';
          c.fillText(pp.nick, sx + 1, sy - 11);
          c.fillStyle = pp.team === 'red' ? '#ff9a9a'
            : (pp.team === 'blue' ? '#9ac4ff' : '#9ad8ff');
          c.fillText(pp.nick + (this.net && this.net.killsOf(pp.nick)
            ? '  \u2694' + this.net.killsOf(pp.nick) : ''), sx, sy - 12);
        }
      }

      // всплывающие числа
      for (const d of this.fx.numbers) {
        M4.project(vp, d.x + d.ox, d.y + d.t * 1.4, d.z, pr);
        if (!pr[2]) continue;
        const sx = (pr[0] * 0.5 + 0.5) * W, sy = (1 - (pr[1] * 0.5 + 0.5)) * H;
        const k = 1 - d.t / d.life;
        c.globalAlpha = Math.min(1, k * 2.4);
        const styles = {
          player: ['#ff4a5a', 20], hit: ['#ffffff', 18], fire: ['#ff8a2a', 18],
          ice: ['#9de8ff', 18], water: ['#5ac0ff', 18], air: ['#ffe84a', 18],
          nature: ['#9de04a', 18], dark: ['#c08aff', 18], light: ['#ffeeaa', 18],
          physical: ['#ffffff', 18], coin: ['#ffd23a', 17], xp: ['#7ae0ff', 17], info: ['#ffffff', 17]
        };
        const s = styles[d.kind] || styles.hit;
        c.font = 'bold ' + Math.round(s[1] * (1 + k * 0.25)) + 'px "Trebuchet MS", sans-serif';
        c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.8)';
        c.strokeText(d.n, sx, sy);
        c.fillStyle = s[0];
        c.fillText(d.n, sx, sy);
        c.globalAlpha = 1;
      }

      // подсказка взаимодействия
      if (this.hint) {
        c.font = 'bold 20px "Trebuchet MS", sans-serif';
        const w = c.measureText(this.hint).width;
        c.fillStyle = 'rgba(10,8,20,0.72)';
        c.fillRect(W / 2 - w / 2 - 16, H * 0.70 - 20, w + 32, 34);
        c.strokeStyle = 'rgba(255,220,120,0.7)'; c.lineWidth = 2;
        c.strokeRect(W / 2 - w / 2 - 16, H * 0.70 - 20, w + 32, 34);
        c.fillStyle = '#ffe8a0';
        c.fillText(this.hint, W / 2, H * 0.70 + 4);
      }

      // прицел
      if (this.mode === 'playing') {
        const m = this.input.mouse;
        const cx = this.input.locked ? W / 2 : (m.sx === undefined ? 0.5 : m.sx) * W;
        const cy = this.input.locked ? H / 2 : (m.sy === undefined ? 0.5 : m.sy) * H;
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx - 9, cy); c.lineTo(cx - 3, cy);
        c.moveTo(cx + 3, cy); c.lineTo(cx + 9, cy);
        c.moveTo(cx, cy - 9); c.lineTo(cx, cy - 3);
        c.moveTo(cx, cy + 3); c.lineTo(cx, cy + 9);
        c.stroke();
        c.fillStyle = 'rgba(255,220,120,0.9)';
        c.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }

      if (this.showMinimap !== false) this.drawMinimap(c, W, H);
    }

    drawMinimap(c, W, H) {
      const L = this.level;
      const size = Math.round(Math.min(W, H) * 0.18);
      const pad = 18;
      const x0 = pad, y0 = H - size - pad;
      const half = L.half;
      const sc = size / (half * 2);

      c.save();
      c.fillStyle = 'rgba(12,10,22,0.66)';
      c.fillRect(x0, y0, size, size);
      c.strokeStyle = 'rgba(255,220,140,0.55)'; c.lineWidth = 2;
      c.strokeRect(x0, y0, size, size);
      c.beginPath(); c.rect(x0, y0, size, size); c.clip();

      const w2s = (wx, wz) => [x0 + (wx + half) * sc, y0 + (wz + half) * sc];

      // портал
      if (L.portal) {
        const [px, py] = w2s(L.portal.x, L.portal.z);
        c.fillStyle = L.portal.active ? '#5ef0ff' : '#5a5a68';
        c.beginPath(); c.arc(px, py, 5, 0, 6.28); c.fill();
      }
      // сундуки
      for (const ch of L.chests) {
        if (ch.opened) continue;
        const [px, py] = w2s(ch.x, ch.z);
        c.fillStyle = '#ffd23a'; c.fillRect(px - 3, py - 3, 6, 6);
      }
      // клетки
      for (const cg of L.cages) {
        const [px, py] = w2s(cg.x, cg.z);
        c.fillStyle = cg.opened ? '#6ae04a' : '#d06aff';
        c.fillRect(px - 3, py - 3, 6, 6);
      }
      // монстры
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const [px, py] = w2s(m.x, m.z);
        c.fillStyle = m.isBoss ? '#ff2a4a' : (m.mode === 'chase' ? '#ff6a4a' : '#c8583a');
        const s = m.isBoss ? 6 : (m.elite ? 4 : 3);
        c.fillRect(px - s / 2, py - s / 2, s, s);
      }
      // питомцы
      for (const pet of this.pets) {
        const [px, py] = w2s(pet.x, pet.z);
        c.fillStyle = '#7affc0'; c.fillRect(px - 2, py - 2, 4, 4);
      }
      // игрок
      const [ppx, ppy] = w2s(this.player.x, this.player.z);
      c.save();
      c.translate(ppx, ppy);
      c.rotate(-this.player.yaw + Math.PI);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2); c.lineTo(-5, 5);
      c.closePath(); c.fill();
      c.restore();
      c.restore();
    }
  }

  function hsvColor(h, s, v) {
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

  function norm3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  KM.Game = Game;
})(window);
