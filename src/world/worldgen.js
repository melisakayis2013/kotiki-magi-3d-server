/* ============================================================
   КОТИКИ МАГИ 3D — генерация локаций
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;

  const N = 76;              // размер сетки
  const HALF = N / 2;
  const STEP = 0.5;          // квантование высоты -> ступенчатый рельеф

  function q(v) { return Math.round(v / STEP) * STEP; }

  // ------------------------------------------------------------
  //  ГЕНЕРАЦИЯ
  // ------------------------------------------------------------
  function generateLevel(index) {
    const info = KM.locationInfo(index);
    const b = info.biome;
    const rng = KM.makeRNG(1337 + index * 7919);
    const noise = KM.makeNoise(index * 104729 + 17);

    const height = new Float32Array(N * N);
    const solid = new Uint8Array(N * N);
    const shade = new Uint8Array(N * N);   // индекс оттенка травы

    const arenaR = info.isBoss ? 17 : 0;
    // площадка появления всегда поднята над жидкостью биома
    const liquid = b.water ? b.water.level : -999;
    const spawnH = b.water ? Math.max(0.5, b.water.level + 0.8) : 0.5;

    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const i = z * N + x;
        const wx = x - HALF + 0.5, wz = z - HALF + 0.5;
        const d = Math.hypot(wx, wz);

        // маска: острова или замкнутая арена
        let alive = true;
        if (b.islands) {
          const m = noise.fbm(x * 0.045 + 100, z * 0.045 + 100, 3);
          const edge = 1 - U.clamp((d - 12) / 24, 0, 1);
          alive = (m * 0.5 + 0.5) * 0.55 + edge * 0.7 > 0.52;
          if (d < 11) alive = true;                        // центральный остров
          if (Math.abs(wx) < 2.2 && d < 30) alive = true;  // мосты-перешейки
          if (Math.abs(wz) < 2.2 && d < 30) alive = true;
        } else {
          alive = d < HALF - 2.5;
        }
        solid[i] = alive ? 1 : 0;
        if (!alive) { height[i] = -999; continue; }

        let h = noise.fbm(x * b.freq, z * b.freq, 4) * b.amp;
        h += noise.fbm(x * b.freq * 2.7 + 50, z * b.freq * 2.7 + 50, 2) * b.amp * 0.35;

        // ровная площадка у спавна — обязательно СУША, выше воды и лавы
        const dSpawn = Math.hypot(wx, wz + 26);
        if (dSpawn < 9) h = U.lerp(h, spawnH, U.clamp((9 - dSpawn) / 5.5, 0, 1));

        // арена босса — плоский круг в центре
        if (arenaR > 0) {
          const arenaH = b.water ? Math.max(1.0, b.water.level + 0.8) : 1.0;
          if (d < arenaR) h = U.lerp(h, arenaH, U.clamp((arenaR - d) / 5, 0, 1));
          else if (d < arenaR + 4) h = U.lerp(h, arenaH + (d - arenaR) * 0.6, 0.6);
        }

        // скальные стены по краю (не для островов)
        if (!b.islands) {
          const edge = U.clamp((d - (HALF - 11)) / 8, 0, 1);
          h = U.lerp(h, h + 13, edge * edge);
        }

        height[i] = q(h);
        const s = noise.fbm(x * 0.19 + 7, z * 0.19 + 7, 2) * 0.5 + 0.5;
        shade[i] = Math.min(3, Math.floor(s * 4 + rng() * 0.6));
      }
    }

    const level = {
      index, info, biome: b, N, half: HALF,
      height, solid, shade,
      water: b.water ? { level: b.water.level, color: b.water.color, alpha: b.water.alpha, lava: !!b.water.lava } : null,
      props: [], bushes: [], colliders: [],
      chests: [], cages: [], monsterSpawns: [], boss: null,
      spawn: { x: 0, z: -26 }, portal: null,
      bases: null,                 // базы команд в режиме «красные против синих»
      cellCollide: null
    };

    const hAtCell = (x, z) => {
      if (x < 0 || z < 0 || x >= N || z >= N) return -999;
      const i = z * N + x;
      return solid[i] ? height[i] : -999;
    };
    level.hAtCell = hAtCell;

    // ---------- размещение объектов ----------
    const occupied = new Uint8Array(N * N);
    const waterLevel = level.water ? level.water.level : -999;

    function tryPlace(minDistFromSpawn, avoidWater, avoidArena, tries) {
      for (let t = 0; t < (tries || 40); t++) {
        const x = rng.int(4, N - 5), z = rng.int(4, N - 5);
        const i = z * N + x;
        if (!solid[i] || occupied[i]) continue;
        const h = height[i];
        if (avoidWater && h < waterLevel + 0.3) continue;
        const wx = x - HALF + 0.5, wz = z - HALF + 0.5;
        if (Math.hypot(wx, wz + 26) < (minDistFromSpawn || 0)) continue;
        if (avoidArena && arenaR > 0 && Math.hypot(wx, wz) < arenaR + 2) continue;
        if (h > 9) continue; // не на отвесных скалах
        occupied[i] = 1;
        return { x: wx, z: wz, y: h, gx: x, gz: z };
      }
      return null;
    }
    level.tryPlace = tryPlace;

    // портал — на противоположной стороне от спавна
    for (let t = 0; t < 200; t++) {
      const ang = rng.range(-0.9, 0.9);
      const r = 24 + rng() * 6;
      const wx = Math.sin(ang) * r, wz = 20 + Math.cos(ang) * 6;
      const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
      if (gx < 3 || gz < 3 || gx >= N - 3 || gz >= N - 3) continue;
      const i = gz * N + gx;
      if (!solid[i] || height[i] < waterLevel + 0.4 || height[i] > 8) continue;
      level.portal = { x: wx, y: height[i], z: wz, active: false, spin: 0 };
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const j = (gz + dz) * N + (gx + dx);
        if (j >= 0 && j < N * N) { occupied[j] = 1; height[j] = height[i]; }
      }
      break;
    }
    if (!level.portal) level.portal = { x: 0, y: hAtCell(HALF, HALF + 20), z: 20, active: false, spin: 0 };


    // ============================================================
    //  ЗАСТРОЙКА
    //  Дома нельзя разбрасывать как кусты: получится свалка.
    //  Поэтому город растёт кварталами вдоль улиц, а кафе и пирамиды
    //  ставятся штучно, на ровном месте и подальше друг от друга.
    // ============================================================
    /** Занять место под постройку и вернуть точку — или null. */

    /**
     * Преграды постройки. У зданий с входом ставим не один круг на всё
     * здание, а цепочку кружков вдоль стен — и оставляем пропуск там,
     * где дверь. Тогда сквозь стену не пройти, а войти можно.
     */
    function стеныПреграды(kind, wx, wz, s2, радиус, высота) {
      const З = KM.world.ЗДАНИЯ && KM.world.ЗДАНИЯ[kind];
      if (!З) {                                   // не здание — обычный круг
        level.colliders.push({ x: wx, z: wz, r: радиус * 0.85, h: высота });
        return;
      }
      const W = (З.W || 0) * s2, D = (З.D || З.W || 0) * s2;
      const дверь = (З.дверь || 0) * s2;
      const R = 0.42;                             // толщина «кирпичика» преграды
      const шаг = 0.62;

      // передняя стена с проёмом посередине
      const рядX = (z0, пропуск) => {
        const n = Math.max(2, Math.ceil(W / шаг));
        for (let i = 0; i <= n; i++) {
          const x0 = wx - W / 2 + (W * i) / n;
          if (пропуск && Math.abs(x0 - wx) < дверь / 2 + R * 0.4) continue;
          level.colliders.push({ x: x0, z: z0, r: R, h: высота });
        }
      };
      const рядZ = (x0) => {
        const n = Math.max(2, Math.ceil(D / шаг));
        for (let i = 0; i <= n; i++) {
          level.colliders.push({ x: x0, z: wz - D / 2 + (D * i) / n, r: R, h: высота });
        }
      };
      рядX(wz - D / 2, true);     // фасад с дверью
      рядX(wz + D / 2, false);    // задняя стена
      рядZ(wx - W / 2);
      рядZ(wx + W / 2);

      // У пирамиды стены толстые: за фасадом идёт коридор, а за ним зал.
      // Ставим и стены зала, и бока коридора — иначе кот пройдёт сквозь камень.
      if (kind === 'pyramid') {
        const ЗАЛ = W * 0.62;
        const тол = (W - ЗАЛ) / 2;
        const ряд = (от, до, x0, z0, вдольX) => {
          const дл = Math.abs(до - от);
          const n = Math.max(1, Math.ceil(дл / шаг));
          for (let i = 0; i <= n; i++) {
            const t = от + (до - от) * i / n;
            level.colliders.push({
              x: вдольX ? t : x0, z: вдольX ? z0 : t, r: R, h: высота
            });
          }
        };
        // стены зала: передняя с проёмом, остальные сплошные
        const зп = wz - ЗАЛ / 2, зз = wz + ЗАЛ / 2;
        ряд(wx - ЗАЛ / 2, wx - дверь / 2 - R, 0, зп, true);
        ряд(wx + дверь / 2 + R, wx + ЗАЛ / 2, 0, зп, true);
        ряд(wx - ЗАЛ / 2, wx + ЗАЛ / 2, 0, зз, true);
        ряд(зп, зз, wx - ЗАЛ / 2, 0, false);
        ряд(зп, зз, wx + ЗАЛ / 2, 0, false);
        // бока коридора от фасада до зала
        for (let j = 0; j < 2; j++) {
          const x0 = wx + (j ? 1 : -1) * (дверь / 2 + R);
          ряд(wz - W / 2, зп, x0, 0, false);
        }
      }
    }

    /** Поискать место для постройки: несколько попыток по кругу. */
    function ставимГде(kind, попыток, s2, радиус, высота, допуск, откуда) {
      const R = откуда || (HALF - радиус - 6);
      for (let t = 0; t < попыток; t++) {
        const ang = rng.range(0, Math.PI * 2);
        const д = Math.sqrt(rng()) * R;
        const место = ставим(kind, Math.cos(ang) * д, Math.sin(ang) * д,
          s2, радиус, высота, допуск);
        if (место) return место;
      }
      return null;
    }

    function ставим(kind, wx, wz, s2, радиус, высота, допуск) {
      const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
      const R = Math.ceil(радиус);
      if (gx < R + 2 || gz < R + 2 || gx >= N - R - 2 || gz >= N - R - 2) return null;
      const i = gz * N + gx;
      if (!solid[i]) return null;
      // не лезем на площадку появления и на арену босса
      if (Math.hypot(wx, wz + 26) < 11 + радиус) return null;
      if (arenaR && Math.hypot(wx, wz) < arenaR + 4) return null;

      // Всё пятно должно быть сушей и никем не занято. Неровность нас
      // не пугает: землю под постройкой мы всё равно выровняем — так же,
      // как выравнивают площадку под настоящий дом.
      let низ = height[i], верх = height[i];
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const j = (gz + dz) * N + (gx + dx);
          if (j < 0 || j >= N * N || !solid[j] || occupied[j]) return null;
          низ = Math.min(низ, height[j]);
          верх = Math.max(верх, height[j]);
        }
      }
      if (верх - низ > (допуск || 4.5)) return null;   // отвесный склон — всё же мимо
      if (верх > 9) return null;                  // и не на вершине скалы

      // площадка: ровная и обязательно выше воды
      let уровень = (низ + верх) * 0.5;
      if (b.water) уровень = Math.max(уровень, b.water.level + 0.6);

      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const j = (gz + dz) * N + (gx + dx);
          occupied[j] = 1;
          height[j] = уровень;
        }
      }

      // Вокруг площадки — пологий подход. Без него получалась отвесная
      // ступенька: постройку видно, а войти нельзя — кот упирается в обрыв.
      const СКАТ = 4;
      for (let dz = -R - СКАТ; dz <= R + СКАТ; dz++) {
        for (let dx = -R - СКАТ; dx <= R + СКАТ; dx++) {
          const далеко = Math.max(Math.abs(dx), Math.abs(dz));
          if (далеко <= R) continue;                 // это уже сама площадка
          const jx = gx + dx, jz = gz + dz;
          if (jx < 1 || jz < 1 || jx >= N - 1 || jz >= N - 1) continue;
          const j = jz * N + jx;
          if (!solid[j]) continue;
          const t = (далеко - R) / (СКАТ + 1);       // 0 у площадки, 1 у края
          const плавно = t * t * (3 - 2 * t);        // мягкая дуга, без излома
          height[j] = уровень + (height[j] - уровень) * плавно;
        }
      }
      level.props.push({ kind, x: wx, y: уровень, z: wz, s: s2, r: 0, seed: rng() });
      стеныПреграды(kind, wx, wz, s2, радиус, высота);
      return { x: wx, y: уровень, z: wz };
    }

    if (b.town) {
      // Город: кварталы по сетке, между ними улицы. Кот ходит по улицам,
      // а дома стоят рядами — как в настоящем городке.
      // Кафе ставим первым: это сердце города, ему лучшее место.
      const кафе = ставимГде('cafe', 40, 1.15, 4.4, 4.5, 5.0, 16);
      if (кафе) {
        for (let k = 0; k < 4; k++) {
          const ang = k / 4 * Math.PI * 2 + 0.4;
          ставим('bench', кафе.x + Math.cos(ang) * 8, кафе.z + Math.sin(ang) * 8,
            1, 1.2, 1.2);
          ставим('lantern', кафе.x + Math.cos(ang + 0.8) * 10,
            кафе.z + Math.sin(ang + 0.8) * 10, 1.05, 0.9, 4);
        }
      }
      const ШАГ = 13;             // ширина квартала вместе с улицей
      const дома = [];
      for (let cz = -2; cz <= 2; cz++) {
        for (let cx = -2; cx <= 2; cx++) {
          const бx = cx * ШАГ, бz = cz * ШАГ;
          if (Math.hypot(бx, бz) > HALF - 12) continue;
          // по два дома на квартал, по краям от улицы
          for (let k = 0; k < 2; k++) {
            const дx = бx + (k ? 3.4 : -3.4) + rng.range(-0.8, 0.8);
            const дz = бz + rng.range(-1.4, 1.4);
            const дом = ставим('house', дx, дz, rng.range(0.95, 1.25), 3.6, 6.0);
            if (дом) дома.push(дом);
          }
          // фонарь на углу — вечером город светится
          const фx = бx + ШАГ * 0.5, фz = бz + ШАГ * 0.5;
          ставим('lantern', фx, фz, rng.range(0.95, 1.15), 0.8, 4);
        }
      }
      // ещё одно кафе на окраине — городу двух не жалко
      ставимГде('cafe', 30, 1.0, 4.4, 4.5, 5.0);
      // заборчики и скамейки между домами
      for (const д of дома) {
        for (let t = 0; t < 3; t++) {
          const ang = rng.range(0, Math.PI * 2);
          if (ставим('fence', д.x + Math.cos(ang) * 5.2, д.z + Math.sin(ang) * 5.2,
            1, 1.0, 1.2)) break;
        }
      }
      for (let k = 0; k < 6; k++) ставимГде('bench', 12, 1, 1.2, 1.2);
    } else if (b.id === 'pyramid') {
      // Пирамиды: они огромные, поэтому и неровность им нипочём —
      // площадку под собой пирамида всё равно выравнивает.
      let больших = 0;
      for (let k = 0; k < 4; k++) {
        if (ставимГде('pyramid', 60, rng.range(1.0, 1.5), 7.4, 12, 12)) больших++;
      }
      if (!больших) ставим('pyramid', 0, 6, 1.1, 7.4, 12, 99);   // хоть одна да будет
      for (let k = 0; k < 12; k++) ставимГде('obelisk', 20, rng.range(0.8, 1.3), 1.6, 8, 6);
      ставимГде('cafe', 25, 1.0, 4.4, 4.5, 6);                   // привал у пирамид
    } else if (b.id === 'cave') {
      // Пещеры: каменные зубы по всему полу.
      for (let k = 0; k < 60; k++) ставимГде('stalagmite', 8, rng.range(0.7, 1.6), 1.2, 3.5, 6);
    } else if (b.temp >= -1 && b.temp <= 1 && !info.isBoss) {
      // Мирные края: одинокое кафе у дороги и пара домиков.
      // Приятно, когда посреди леса вдруг попадается жильё.
      if (rng.chance(0.8)) {
        const к = ставимГде('cafe', 45, 1.0, 4.4, 4.5, 5.0);
        if (к) {
          ставим('lantern', к.x + 7, к.z, 1, 0.9, 4);
          ставим('bench', к.x - 6, к.z + 2, 1, 1.2, 1.2);
        }
      }
      const домиков = rng.int(2, 4);
      for (let k = 0; k < домиков; k++) {
        const д = ставимГде('house', 30, rng.range(0.85, 1.1), 3.6, 6.0, 4.5);
        if (д) ставим('fence', д.x + 5.4, д.z, 1, 1.0, 1.2);
      }
    }

    // деревья / кусты / камни / кристаллы / грибы / цветы / трава / факелы
    const P = b.props;
    const addProp = (kind, count, opts) => {
      opts = opts || {};
      for (let k = 0; k < count; k++) {
        const p = tryPlace(opts.minSpawn || 5, opts.avoidWater !== false, true, 22);
        if (!p) continue;
        const prop = {
          kind, x: p.x, y: p.y, z: p.z,
          s: rng.range(opts.smin || 0.85, opts.smax || 1.25),
          r: rng.range(0, Math.PI * 2), seed: rng()
        };
        level.props.push(prop);
        if (kind === 'bush') {
          level.bushes.push({ x: p.x, y: p.y, z: p.z, r: 1.15 * prop.s });
        } else if (opts.collide) {
          level.colliders.push({ x: p.x, z: p.z, r: opts.collide * prop.s, h: opts.ch || 3 });
        }
      }
    };

    addProp('tree', P.tree, { collide: 0.42, smin: 0.8, smax: 1.5, minSpawn: 6 });
    addProp('bush', P.bush, { smin: 0.9, smax: 1.5, minSpawn: 4 });
    addProp('rock', P.rock, { collide: 0.55, smin: 0.7, smax: 1.7, avoidWater: false });
    addProp('crystal', P.crystal, { collide: 0.36, smin: 0.7, smax: 1.8, avoidWater: false });
    addProp('mushroom', P.mushroom, { smin: 0.6, smax: 1.9 });
    addProp('flower', P.flower, { smin: 0.8, smax: 1.3 });
    addProp('grass', P.grass, { smin: 0.7, smax: 1.4 });
    addProp('torch', P.torch, { smin: 0.9, smax: 1.1, minSpawn: 10 });


    // сундуки
    for (let k = 0; k < info.chests; k++) {
      const p = tryPlace(14, true, info.isBoss, 60);
      if (p) level.chests.push({ x: p.x, y: p.y, z: p.z, r: rng.range(0, 6.28), opened: false, open: 0, tier: info.isBoss ? 2 : (k === 0 ? 1 : 0) });
    }

    // клетки с котами-магами
    for (let k = 0; k < info.cages; k++) {
      let p = null;
      if (info.isBoss) {
        const ang = (k / info.cages) * Math.PI * 2 + 0.6;
        const wx = Math.cos(ang) * (arenaR - 4), wz = Math.sin(ang) * (arenaR - 4);
        const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
        if (gx > 2 && gz > 2 && gx < N - 3 && gz < N - 3 && solid[gz * N + gx]) {
          p = { x: wx, z: wz, y: height[gz * N + gx] };
        }
      }
      if (!p) p = tryPlace(18, true, false, 80);
      if (p) {
        level.cages.push({
          x: p.x, y: p.y, z: p.z, opened: false, open: 0,
          palIdx: (index * 3 + k) % KM.CAGED_PALS.length,
          rewardIdx: (index * 3 + k)
        });
      }
    }

    // точки появления монстров (с постепенным ослаблением требований,
    // чтобы на островах и в Бездне их всё равно было нужное количество)
    const monsterList = b.monsters;
    const relax = [
      { d: 16, water: true, tries: 80 },
      { d: 12, water: true, tries: 120 },
      { d: 10, water: false, tries: 160 },
      { d: 8, water: false, tries: 300 }
    ];
    for (let k = 0; k < info.monsterCount; k++) {
      let p = null;
      for (const r of relax) {
        p = tryPlace(r.d, r.water, info.isBoss, r.tries);
        if (p) break;
      }
      if (!p) continue;
      const type = monsterList[rng.int(0, monsterList.length - 1)];
      const elite = !info.isBoss && rng.chance(0.16 + index * 0.002);
      level.monsterSpawns.push({ x: p.x, y: p.y, z: p.z, type, elite });
    }
    // гарантируем хотя бы одного «большого» монстра с ключом на уровнях с клетками
    if (info.cages > 0 && !info.isBoss) {
      const p = tryPlace(18, true, false, 80);
      if (p) level.monsterSpawns.push({ x: p.x, y: p.y, z: p.z, type: monsterList[monsterList.length - 1], elite: true, keyDrop: true });
    }

    if (info.isBoss) {
      level.boss = { x: 0, y: hAtCell(HALF, HALF) , z: 0, def: info.boss };
      // колонны вокруг арены
      for (let k = 0; k < 10; k++) {
        const ang = k / 10 * Math.PI * 2;
        const wx = Math.cos(ang) * (arenaR + 1.5), wz = Math.sin(ang) * (arenaR + 1.5);
        const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
        if (gx < 2 || gz < 2 || gx >= N - 2 || gz >= N - 2) continue;
        level.props.push({ kind: 'pillar', x: wx, y: height[gz * N + gx], z: wz, s: 1, r: 0, seed: rng() });
        level.colliders.push({ x: wx, z: wz, r: 0.8, h: 6 });
      }
    }

    // ============================================================
    //  БАЗЫ КОМАНД
    //  В режиме «красные против синих» команды начинают с разных концов
    //  карты. База — это ровная площадка, куда чужим хода нет: там кот
    //  переводит дух после поражения и его нельзя задеть.
    //  Считаем их всегда: расположение зависит только от локации,
    //  поэтому у всех игроков базы окажутся в одном и том же месте.
    // ============================================================
    (function базы() {
      const R = 10;                       // радиус безопасной зоны
      const далеко = HALF - R - 4;
      const углы = [Math.PI * 1.5, Math.PI * 0.5];   // север и юг — напротив друг друга
      const имена = ['red', 'blue'];
      const итог = {};
      for (let i = 0; i < 2; i++) {
        // ищем ровное место в нужной стороне карты
        let лучшее = null;
        for (let t = 0; t < 90; t++) {
          const угол = углы[i] + rng.range(-0.5, 0.5);
          const д = далеко - t * 0.18;
          const wx = Math.cos(угол) * д, wz = Math.sin(угол) * д;
          const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
          if (gx < R + 2 || gz < R + 2 || gx >= N - R - 2 || gz >= N - R - 2) continue;
          if (!solid[gz * N + gx]) continue;
          let низ = 1e9, верх = -1e9, суша = true;
          for (let dz = -R; dz <= R; dz += 2) {
            for (let dx = -R; dx <= R; dx += 2) {
              if (dx * dx + dz * dz > R * R) continue;
              const j = (gz + dz) * N + (gx + dx);
              if (j < 0 || j >= N * N || !solid[j]) { суша = false; break; }
              низ = Math.min(низ, height[j]);
              верх = Math.max(верх, height[j]);
            }
            if (!суша) break;
          }
          if (!суша) continue;
          лучшее = { wx, wz, gx, gz, низ, верх };
          break;
        }
        if (!лучшее) {
          const wx = Math.cos(углы[i]) * далеко, wz = Math.sin(углы[i]) * далеко;
          лучшее = { wx, wz, gx: Math.floor(wx + HALF), gz: Math.floor(wz + HALF),
                     низ: 0.5, верх: 0.5 };
        }

        // ровняем площадку и делаем пологий подход, как под постройками
        let уровень = (лучшее.низ + лучшее.верх) * 0.5;
        if (b.water) уровень = Math.max(уровень, b.water.level + 0.8);
        const СКАТ = 5;
        for (let dz = -R - СКАТ; dz <= R + СКАТ; dz++) {
          for (let dx = -R - СКАТ; dx <= R + СКАТ; dx++) {
            const jx = лучшее.gx + dx, jz = лучшее.gz + dz;
            if (jx < 1 || jz < 1 || jx >= N - 1 || jz >= N - 1) continue;
            const j = jz * N + jx;
            if (!solid[j]) continue;
            const д = Math.hypot(dx, dz);
            if (д <= R) { height[j] = уровень; occupied[j] = 1; continue; }
            if (д > R + СКАТ) continue;
            const t = (д - R) / СКАТ;
            const плавно = t * t * (3 - 2 * t);
            height[j] = уровень + (height[j] - уровень) * плавно;
          }
        }
        итог[имена[i]] = { x: лучшее.wx, y: уровень, z: лучшее.wz, r: R };
      }
      level.bases = итог;
    })();

    // ускоренный поиск столкновений: сетка ячеек
    const cc = new Array(N * N);
    for (const c of level.colliders) {
      const gx = Math.floor(c.x + HALF), gz = Math.floor(c.z + HALF);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const jx = gx + dx, jz = gz + dz;
        if (jx < 0 || jz < 0 || jx >= N || jz >= N) continue;
        const j = jz * N + jx;
        (cc[j] || (cc[j] = [])).push(c);
      }
    }
    level.cellCollide = cc;

    // высота земли в точке (максимум под «лапами»)
    level.groundAt = function (wx, wz) {
      const gx = Math.floor(wx + HALF), gz = Math.floor(wz + HALF);
      return hAtCell(gx, gz);
    };
    level.spawn.y = level.groundAt(0, -26);
    if (level.spawn.y < -900) level.spawn.y = spawnH;
    if (b.water && level.spawn.y < b.water.level + 0.4) level.spawn.y = b.water.level + 0.8;
    return level;
  }

  // ------------------------------------------------------------
  //  ПОСТРОЕНИЕ СТАТИЧЕСКОЙ ГЕОМЕТРИИ
  // ------------------------------------------------------------
  function buildStatic(level, opaque, alpha) {
    const b = level.biome;
    const H = level.height, S = level.solid, SH = level.shade;
    const rng = KM.makeRNG(level.index * 7717 + 3);
    opaque.clear(); alpha.clear();

    const jitter = () => (rng() - 0.5) * 0.045;

    // --- рельеф ---
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const i = z * N + x;
        if (!S[i]) continue;
        const h = H[i];
        const wx = x - HALF + 0.5, wz = z - HALF + 0.5;
        let mn = h;
        for (let k = 0; k < 4; k++) {
          const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
          const nz = z + (k === 2 ? 1 : k === 3 ? -1 : 0);
          const nh = (nx < 0 || nz < 0 || nx >= N || nz >= N) ? h - 8 : (S[nz * N + nx] ? H[nz * N + nx] : h - 10);
          if (nh < mn) mn = nh;
        }
        const gc = b.ground[SH[i]];
        const j = jitter();
        // верхний слой
        opaque.pushBox(wx, h - 0.25, wz, 1, 0.5, 1,
          gc[0] + j, gc[1] + j, gc[2] + j, 1, 0, 0.5, 0, rng());
        // тело столба (земля/камень)
        const depth = h - mn;
        if (depth > 0.5) {
          const d = Math.min(depth, 14);
          const isRock = d > 2.5;
          const cc = isRock ? b.rock : b.dirt;
          const j2 = jitter();
          opaque.pushBox(wx, h - 0.5 - d / 2, wz, 1, d, 1,
            cc[0] + j2, cc[1] + j2, cc[2] + j2, 1, 0, 0.6, 0, rng());
        }
      }
    }

    // --- вода / лава ---
    if (level.water) {
      const w = level.water;
      const lv = w.level;
      const emis = w.lava ? 0.85 : 0;
      for (let z = 0; z < N; z++) {
        for (let x = 0; x < N; x++) {
          const i = z * N + x;
          if (!S[i] || H[i] >= lv) continue;
          const wx = x - HALF + 0.5, wz = z - HALF + 0.5;
          const t = ((x * 7 + z * 13) % 5) * 0.012;
          alpha.pushBox(wx, lv - 0.1, wz, 1, 0.2, 1,
            w.color[0] + t, w.color[1] + t, w.color[2] + t, w.alpha, emis, 0.2, 0, rng());
        }
      }
    }

    // --- декорации ---
    for (const p of level.props) drawProp(opaque, alpha, p, b, rng);
  }

  // ------------------------------------------------------------
  //  ДЕКОРАЦИИ
  // ------------------------------------------------------------
  function drawProp(op, al, p, b, rng) {
    const s = p.s, x = p.x, y = p.y, z = p.z;
    const seed = p.seed;
    switch (p.kind) {
      case 'tree': tree(op, x, y, z, s, b, seed, rng); break;
      case 'bush': bush(op, x, y, z, s, b, seed); break;
      case 'rock': rock(op, x, y, z, s, b, seed); break;
      case 'crystal': crystal(op, x, y, z, s, b, seed); break;
      case 'mushroom': mushroom(op, x, y, z, s, b, seed); break;
      case 'flower': flower(op, x, y, z, s, b, seed); break;
      case 'grass': grassTuft(op, x, y, z, s, b, seed); break;
      case 'torch': torch(op, x, y, z, s, b, seed); break;
      case 'pillar': pillar(op, x, y, z, s, b, seed); break;
      case 'house': house(op, x, y, z, s, b, seed); break;
      case 'cafe': cafe(op, x, y, z, s, b, seed); break;
      case 'lantern': lantern(op, x, y, z, s, b, seed); break;
      case 'bench': bench(op, x, y, z, s, b, seed); break;
      case 'pyramid': pyramid(op, x, y, z, s, b, seed); break;
      case 'obelisk': obelisk(op, x, y, z, s, b, seed); break;
      case 'stalagmite': stalagmite(op, x, y, z, s, b, seed); break;
      case 'fence': fence(op, x, y, z, s, b, seed); break;
    }
  }

  const LEAF = {
    round: [KM.hex('#4fbf46'), KM.hex('#3fa338'), KM.hex('#67d45c')],
    pine: [KM.hex('#2f7a34'), KM.hex('#26622b'), KM.hex('#3d9440')],
    snowpine: [KM.hex('#e8f4ff'), KM.hex('#cfe4f5'), KM.hex('#a8cde8')],
    dead: [KM.hex('#5a4a3a'), KM.hex('#463828'), KM.hex('#6a5a46')],
    cactus: [KM.hex('#4a9a5a'), KM.hex('#3d8049'), KM.hex('#5cb06c')],
    crystal: [KM.hex('#8a7aff'), KM.hex('#6a5ae0'), KM.hex('#b0a0ff')],
    mushtree: [KM.hex('#e05a9a'), KM.hex('#b8407a'), KM.hex('#ff7ab8')]
  };
  const BARK = KM.hex('#6a4a30');
  const BARK_DARK = KM.hex('#4a3220');

  function tree(op, x, y, z, s, b, seed, rng) {
    const style = b.treeStyle || 'round';
    const leaves = LEAF[style] || LEAF.round;
    const th = (style === 'pine' || style === 'snowpine') ? 2.2 * s : 1.6 * s;
    const tw = 0.32 * s;
    const bark = style === 'dead' ? BARK_DARK : BARK;

    // ствол
    const seg = Math.max(2, Math.round(th / 0.6));
    for (let i = 0; i < seg; i++) {
      const hh = th / seg;
      const lean = Math.sin(seed * 20 + i) * 0.04 * s;
      op.pushBox(x + lean * i, y + hh * (i + 0.5), z + lean * i * 0.6, tw, hh * 1.02, tw,
        bark[0], bark[1], bark[2], 1, 0, 0.55, 0, seed);
    }

    if (style === 'cactus') {
      const c = leaves[0];
      op.pushBox(x, y + th * 0.9, z, 0.5 * s, th * 1.9, 0.5 * s, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
      op.pushBox(x - 0.42 * s, y + th * 1.1, z, 0.42 * s, 0.28 * s, 0.28 * s, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
      op.pushBox(x - 0.6 * s, y + th * 1.45, z, 0.26 * s, 0.7 * s, 0.26 * s, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
      op.pushBox(x + 0.42 * s, y + th * 1.35, z, 0.42 * s, 0.26 * s, 0.26 * s, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
      op.pushBox(x + 0.6 * s, y + th * 1.7, z, 0.26 * s, 0.62 * s, 0.26 * s, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
      return;
    }
    if (style === 'dead') {
      for (let i = 0; i < 4; i++) {
        const a = seed * 30 + i * 1.7;
        const bx = x + Math.cos(a) * 0.4 * s, bz = z + Math.sin(a) * 0.4 * s;
        op.pushBox(bx, y + th * (0.8 + i * 0.12), bz, 0.5 * s, 0.13 * s, 0.13 * s,
          bark[0], bark[1], bark[2], 1, 0, 0.5, 0, seed + i);
      }
      return;
    }
    if (style === 'crystal') {
      const c = leaves[0];
      for (let i = 0; i < 5; i++) {
        const a = seed * 40 + i * 1.26;
        op.pushBox(x + Math.cos(a) * 0.35 * s, y + th + 0.35 * s + i * 0.16 * s, z + Math.sin(a) * 0.35 * s,
          0.26 * s, (0.8 - i * 0.1) * s, 0.26 * s, c[0], c[1], c[2], 1, 0.6, 0.2, 0, seed + i);
      }
      return;
    }
    if (style === 'mushtree') {
      const c = leaves[0], c2 = leaves[2];
      op.pushBox(x, y + th + 0.25 * s, z, 2.3 * s, 0.5 * s, 2.3 * s, c[0], c[1], c[2], 1, 0.12, 0.5, 0, seed);
      op.pushBox(x, y + th + 0.62 * s, z, 1.5 * s, 0.35 * s, 1.5 * s, c[0], c[1], c[2], 1, 0.12, 0.5, 0, seed);
      op.pushBox(x, y + th + 0.88 * s, z, 0.8 * s, 0.24 * s, 0.8 * s, c2[0], c2[1], c2[2], 1, 0.2, 0.4, 0, seed);
      for (let i = 0; i < 5; i++) {
        const a = seed * 25 + i * 1.26;
        op.pushBox(x + Math.cos(a) * 0.85 * s, y + th + 0.05 * s, z + Math.sin(a) * 0.85 * s,
          0.3 * s, 0.16 * s, 0.3 * s, c2[0], c2[1], c2[2], 1, 0.3, 0.3, 0, seed + i);
      }
      return;
    }

    // лиственная / хвойная крона из кубиков
    if (style === 'pine' || style === 'snowpine') {
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const w = (2.1 - t * 0.42) * s;
        const c = leaves[t % leaves.length];
        const j = (rng() - 0.5) * 0.05;
        op.pushBox(x, y + th * 0.55 + t * 0.55 * s, z, w, 0.55 * s, w,
          c[0] + j, c[1] + j, c[2] + j, 1, 0, 0.55, 0.012, seed + t);
      }
      op.pushBox(x, y + th * 0.55 + tiers * 0.5 * s, z, 0.3 * s, 0.45 * s, 0.3 * s,
        leaves[0][0], leaves[0][1], leaves[0][2], 1, 0, 0.5, 0.02, seed);
    } else {
      // «шарик» из кубиков
      const R = 1.35 * s;
      const cy = y + th + R * 0.55;
      const step = 0.62 * s;
      for (let ix = -2; ix <= 2; ix++) {
        for (let iy = -1; iy <= 2; iy++) {
          for (let iz = -2; iz <= 2; iz++) {
            const dx = ix * step, dy = iy * step * 0.85, dz = iz * step;
            const d = Math.hypot(dx, dy * 1.15, dz);
            if (d > R) continue;
            if (d > R * 0.72 && ((ix + iy + iz + Math.floor(seed * 10)) % 3 === 0)) continue;
            const c = leaves[(Math.abs(ix + iy * 2 + iz * 3) + Math.floor(seed * 7)) % leaves.length];
            const j = (rng() - 0.5) * 0.06;
            op.pushBox(x + dx, cy + dy, z + dz, step * 1.04, step * 0.92, step * 1.04,
              c[0] + j, c[1] + j, c[2] + j, 1, 0, 0.5, 0.014, seed + ix * 0.1 + iz * 0.03);
          }
        }
      }
    }
  }

  function bush(op, x, y, z, s, b, seed) {
    const leaves = LEAF[b.treeStyle] || LEAF.round;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = seed * 30 + i * 1.4;
      const r = 0.36 * s * (i === 0 ? 0 : 1);
      const c = leaves[i % leaves.length];
      const j = ((i * 37 + seed * 100) % 10) * 0.008 - 0.04;
      op.pushBox(x + Math.cos(a) * r, y + 0.32 * s + (i % 2) * 0.16 * s, z + Math.sin(a) * r,
        0.72 * s, 0.6 * s, 0.72 * s, c[0] + j, c[1] + j, c[2] + j, 1, 0, 0.45, 0.03, seed + i * 0.2);
    }
    // ягодки — заметно, что тут можно спрятаться
    for (let i = 0; i < 3; i++) {
      const a = seed * 50 + i * 2.1;
      op.pushBox(x + Math.cos(a) * 0.4 * s, y + 0.55 * s, z + Math.sin(a) * 0.4 * s,
        0.1 * s, 0.1 * s, 0.1 * s, 1, 0.35, 0.45, 1, 0.25, 0.2, 0.03, seed + i);
    }
  }

  function rock(op, x, y, z, s, b, seed) {
    const c = b.rock;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = seed * 40 + i * 2.2;
      const r = i === 0 ? 0 : 0.3 * s;
      const sz = (0.75 - i * 0.16) * s;
      const j = (i * 0.03) - 0.03;
      op.pushBox(x + Math.cos(a) * r, y + sz * 0.42 + i * 0.14 * s, z + Math.sin(a) * r,
        sz, sz * 0.85, sz, c[0] + j, c[1] + j, c[2] + j, 1, 0, 0.6, 0, seed + i);
    }
  }

  function crystal(op, x, y, z, s, b, seed) {
    const cols = [KM.hex('#8ae8ff'), KM.hex('#c08aff'), KM.hex('#ff8ad0'), KM.hex('#8affc0')];
    const c = cols[Math.floor(seed * 4) % 4];
    for (let i = 0; i < 3; i++) {
      const a = seed * 60 + i * 2.1;
      const hgt = (1.1 - i * 0.28) * s;
      op.pushBox(x + Math.cos(a) * 0.22 * s, y + hgt * 0.5, z + Math.sin(a) * 0.22 * s,
        0.26 * s, hgt, 0.26 * s, c[0], c[1], c[2], 1, 0.75, 0.2, 0, seed + i);
    }
  }

  function mushroom(op, x, y, z, s, b, seed) {
    const caps = [KM.hex('#e04a5a'), KM.hex('#e0a84a'), KM.hex('#8a5ae0'), KM.hex('#4ae0c0')];
    const c = caps[Math.floor(seed * 4) % 4];
    const stem = KM.hex('#f0e8d0');
    const hgt = 0.45 * s;
    op.pushBox(x, y + hgt * 0.5, z, 0.16 * s, hgt, 0.16 * s, stem[0], stem[1], stem[2], 1, 0, 0.5, 0, seed);
    op.pushBox(x, y + hgt + 0.10 * s, z, 0.62 * s, 0.2 * s, 0.62 * s, c[0], c[1], c[2], 1, 0.18, 0.4, 0, seed);
    op.pushBox(x, y + hgt + 0.24 * s, z, 0.34 * s, 0.12 * s, 0.34 * s, c[0], c[1], c[2], 1, 0.18, 0.4, 0, seed);
    op.pushBox(x + 0.14 * s, y + hgt + 0.16 * s, z + 0.16 * s, 0.09 * s, 0.09 * s, 0.09 * s, 1, 1, 1, 1, 0.3, 0.2, 0, seed);
  }

  function flower(op, x, y, z, s, b, seed) {
    const cols = [KM.hex('#ff6a9a'), KM.hex('#ffd84a'), KM.hex('#8ab0ff'), KM.hex('#ff8a4a'), KM.hex('#ffffff')];
    const c = cols[Math.floor(seed * 5) % 5];
    const g = KM.hex('#4a9a3a');
    op.pushBox(x, y + 0.16 * s, z, 0.05 * s, 0.32 * s, 0.05 * s, g[0], g[1], g[2], 1, 0, 0.4, 0.05, seed);
    op.pushBox(x, y + 0.36 * s, z, 0.17 * s, 0.1 * s, 0.17 * s, c[0], c[1], c[2], 1, 0.12, 0.3, 0.05, seed);
    op.pushBox(x, y + 0.40 * s, z, 0.07 * s, 0.07 * s, 0.07 * s, 1, 0.95, 0.4, 1, 0.3, 0.2, 0.05, seed);
  }

  function grassTuft(op, x, y, z, s, b, seed) {
    const c = b.ground[0];
    for (let i = 0; i < 3; i++) {
      const a = seed * 25 + i * 2.1;
      op.pushBox(x + Math.cos(a) * 0.13 * s, y + 0.17 * s, z + Math.sin(a) * 0.13 * s,
        0.07 * s, 0.36 * s, 0.07 * s, c[0] * 0.85, c[1] * 1.05, c[2] * 0.8, 1, 0, 0.35, 0.07, seed + i);
    }
  }

  // ============================================================
  //  ПОСТРОЙКИ
  //  Дома, кафе, фонари, пирамиды. Всё из тех же кубиков, что и лес,
  //  просто расставлено по-человечески.
  //
  //  Важно про размеры: pushBox принимает ПОЛНЫЕ ширину/высоту/глубину,
  //  а кубик стоит серединой в заданной точке. Значит стена, которая
  //  должна закрыть дом шириной W, сама должна быть шириной W —
  //  и стоять на W/2 от середины.
  // ============================================================

  // Размеры зданий держим в одном месте: по ним и рисуем, и ставим
  // преграды. Иначе стена нарисована в одном месте, а не пускает в другом.
  const ЗДАНИЯ = {
    house:   { W: 6.4, D: 5.6, H: 3.0, дверь: 1.6 },
    cafe:    { W: 7.0, D: 5.2, H: 2.9, дверь: 1.8 },
    pyramid: { W: 11.0, дверь: 2.0 }
  };

  /** Палитра домика: у каждого свой цвет, но всегда приятный. */
  function houseColors(seed) {
    const СТЕНЫ = [
      [0.93, 0.84, 0.68], [0.86, 0.70, 0.58], [0.78, 0.84, 0.90],
      [0.92, 0.78, 0.80], [0.80, 0.88, 0.76], [0.95, 0.90, 0.70]
    ];
    const КРЫШИ = [
      [0.72, 0.28, 0.24], [0.35, 0.42, 0.62], [0.45, 0.55, 0.35],
      [0.62, 0.38, 0.55], [0.40, 0.36, 0.34], [0.74, 0.50, 0.22]
    ];
    const i = Math.floor(Math.abs(seed) * 997) % СТЕНЫ.length;
    const j = Math.floor(Math.abs(seed) * 613) % КРЫШИ.length;
    return { wall: СТЕНЫ[i], roof: КРЫШИ[j] };
  }

  /** Тёмный вариант цвета — для боковых стен, чтобы был объём. */
  function тень(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }

  /**
   * Коробка дома с дверным проёмом в передней стене.
   * Передняя стена разрезана на две части и перемычку сверху —
   * получается настоящий вход, в который можно войти.
   */
  function стены(op, x, y, z, W, D, H, c, seed, дверь) {
    const Т = 0.34;                       // толщина стены
    const тыл = тень(c, 0.94), бок = тень(c, 0.88);
    const пр = дверь || 0;                // ширина проёма
    const ВД = H * 0.72;                  // высота двери

    if (пр > 0) {
      const бока = (W - пр) / 2;
      for (let i = 0; i < 2; i++) {
        op.pushBox(x + (i ? 1 : -1) * (пр + бока) / 2, y + H / 2, z - D / 2,
          бока, H, Т, c[0], c[1], c[2], 1, 0, 0.5, 0, seed + i);
      }
      // перемычка над дверью
      op.pushBox(x, y + ВД + (H - ВД) / 2, z - D / 2, пр, H - ВД, Т,
        c[0], c[1], c[2], 1, 0, 0.5, 0, seed + 2);
    } else {
      op.pushBox(x, y + H / 2, z - D / 2, W, H, Т, c[0], c[1], c[2], 1, 0, 0.5, 0, seed);
    }

    op.pushBox(x, y + H / 2, z + D / 2, W, H, Т, тыл[0], тыл[1], тыл[2], 1, 0, 0.5, 0, seed + 3);
    op.pushBox(x - W / 2, y + H / 2, z, Т, H, D, бок[0], бок[1], бок[2], 1, 0, 0.55, 0, seed + 4);
    op.pushBox(x + W / 2, y + H / 2, z, Т, H, D, бок[0], бок[1], бок[2], 1, 0, 0.55, 0, seed + 5);
  }

  /** Пол внутри: доски или плитка, чтобы не стоять на голой земле. */
  function пол(op, x, y, z, W, D, c, seed) {
    op.pushBox(x, y + 0.06, z, W - 0.4, 0.12, D - 0.4,
      c[0], c[1], c[2], 1, 0, 0.35, 0, seed);
  }

  /** Тёплая лампа под потолком — внутри должно быть уютно. */
  function лампа(op, x, y, z, s, seed) {
    op.pushBox(x, y - 0.18 * s, z, 0.1 * s, 0.36 * s, 0.1 * s,
      0.3, 0.26, 0.22, 1, 0, 0.4, 0, seed);
    op.pushBox(x, y - 0.46 * s, z, 0.62 * s, 0.3 * s, 0.62 * s,
      1, 0.93, 0.68, 1, 0.95, 0.05, 0, seed + 1);
  }

  /** Столик со стульями — общая мебель для дома и кафе. */
  function столик(op, x, y, z, s, seed, стульев) {
    op.pushBox(x, y + 0.86 * s, z, 1.25 * s, 0.14 * s, 1.25 * s,
      0.72, 0.56, 0.38, 1, 0, 0.4, 0, seed);
    op.pushBox(x, y + 0.42 * s, z, 0.22 * s, 0.88 * s, 0.22 * s,
      0.5, 0.38, 0.26, 1, 0, 0.4, 0, seed + 1);
    op.pushBox(x, y + 0.08 * s, z, 0.7 * s, 0.16 * s, 0.7 * s,
      0.5, 0.38, 0.26, 1, 0, 0.4, 0, seed + 2);
    for (let i = 0; i < (стульев || 2); i++) {
      const a2 = i / (стульев || 2) * Math.PI * 2 + 0.6;
      const сx = x + Math.cos(a2) * 1.15 * s, сz = z + Math.sin(a2) * 1.15 * s;
      op.pushBox(сx, y + 0.5 * s, сz, 0.6 * s, 0.13 * s, 0.6 * s,
        0.66, 0.5, 0.34, 1, 0, 0.4, 0, seed + 10 + i);
      op.pushBox(сx, y + 0.24 * s, сz, 0.18 * s, 0.48 * s, 0.18 * s,
        0.5, 0.38, 0.26, 1, 0, 0.4, 0, seed + 20 + i);
      op.pushBox(сx - Math.cos(a2) * 0.26 * s, y + 0.78 * s, сz - Math.sin(a2) * 0.26 * s,
        0.6 * s, 0.55 * s, 0.14 * s, 0.6, 0.45, 0.3, 1, 0, 0.4, 0, seed + 30 + i);
    }
  }

  /** Ступенчатая крыша: слои сужаются кверху и лежат друг на друге. */
  function крыша(op, x, y, z, W, D, слоёв, шаг, c, seed) {
    for (let i = 0; i < слоёв; i++) {
      const k = 1 - i / слоёв;
      const w = W * k + 0.5, d = D * k + 0.5;
      if (w < 0.4 || d < 0.4) break;
      const т = 1 - i * 0.05;
      op.pushBox(x, y + шаг / 2 + i * шаг, z, w, шаг, d,
        c[0] * т, c[1] * т, c[2] * т, 1, 0, 0.5, 0, seed + i);
    }
  }

  /** Жилой домик: вход, обстановка, окошки, двускатная крыша. */
  function house(op, x, y, z, s, b, seed) {
    const c = houseColors(seed);
    const З = ЗДАНИЯ.house;
    const W = З.W * s, D = З.D * s, H = З.H * s, дверь = З.дверь * s;

    стены(op, x, y, z, W, D, H, c.wall, seed, дверь);
    пол(op, x, y, z, W, D, [0.58, 0.42, 0.28], seed + 60);

    // окна по бокам — светятся, и внутри от них светлее
    for (let i = 0; i < 2; i++) {
      op.pushBox(x + (i ? 1 : -1) * (W / 2 + 0.02), y + H * 0.6, z,
        0.14, 0.85 * s, 1.3 * s, 1, 0.88, 0.5, 1, 0.85, 0.1, 0, seed + 10 + i);
    }
    op.pushBox(x, y + H * 0.6, z + D / 2 + 0.02, 1.4 * s, 0.85 * s, 0.14,
      1, 0.88, 0.5, 1, 0.85, 0.1, 0, seed + 12);

    // ---- обстановка ----
    лампа(op, x, y + H - 0.1 * s, z, s, seed + 70);
    столик(op, x + W * 0.16, y, z + D * 0.12, s * 0.95, seed + 80, 2);

    // кроватка у стены
    const кx = x - W * 0.26, кz = z - D * 0.2;
    op.pushBox(кx, y + 0.3 * s, кz, 1.5 * s, 0.4 * s, 2.2 * s,
      0.45, 0.34, 0.24, 1, 0, 0.4, 0, seed + 90);
    op.pushBox(кx, y + 0.58 * s, кz + 0.1 * s, 1.4 * s, 0.24 * s, 1.9 * s,
      0.85, 0.5, 0.55, 1, 0, 0.3, 0, seed + 91);
    op.pushBox(кx, y + 0.72 * s, кz - 0.82 * s, 1.0 * s, 0.26 * s, 0.5 * s,
      0.98, 0.96, 0.9, 1, 0.1, 0.25, 0, seed + 92);

    // коврик посередине
    op.pushBox(x, y + 0.14, z, 2.2 * s, 0.05, 1.6 * s,
      0.72, 0.3, 0.32, 1, 0, 0.25, 0, seed + 95);

    // печка в углу с живым огоньком
    const пx = x + W * 0.3, пz = z + D * 0.3;
    op.pushBox(пx, y + 0.7 * s, пz, 1.1 * s, 1.4 * s, 1.0 * s,
      0.44, 0.4, 0.42, 1, 0, 0.55, 0, seed + 100);
    op.pushBox(пx, y + 0.45 * s, пz - 0.52 * s, 0.6 * s, 0.5 * s, 0.12 * s,
      1, 0.6, 0.2, 1, 0.95, 0.05, 0.02, seed + 101);

    // полочка с горшочком
    op.pushBox(x - W * 0.32, y + 1.75 * s, z + D * 0.28, 1.2 * s, 0.14 * s, 0.5 * s,
      0.6, 0.45, 0.3, 1, 0, 0.4, 0, seed + 110);
    op.pushBox(x - W * 0.32, y + 2.0 * s, z + D * 0.28, 0.4 * s, 0.36 * s, 0.4 * s,
      0.5, 0.7, 0.4, 1, 0.1, 0.3, 0.03, seed + 111);

    крыша(op, x, y + H, z, W, D, 5, 0.34 * s, c.roof, seed + 30);

    const вк = y + H + 5 * 0.34 * s;
    op.pushBox(x + W * 0.26, вк - 0.3 * s, z - D * 0.2, 0.5 * s, 1.2 * s, 0.5 * s,
      0.42, 0.34, 0.32, 1, 0, 0.5, 0, seed + 40);
  }

  /** Кафе: заходи и садись. Внутри столики, витрина и лампы. */
  function cafe(op, x, y, z, s, b, seed) {
    const стена = [0.95, 0.92, 0.84];
    const З = ЗДАНИЯ.cafe;
    const W = З.W * s, D = З.D * s, H = З.H * s, дверь = З.дверь * s;

    стены(op, x, y, z, W, D, H, стена, seed, дверь);
    пол(op, x, y, z, W, D, [0.78, 0.72, 0.62], seed + 60);

    // шахматная плитка у входа — сразу видно, что это кафе
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        if ((i + j) % 2) continue;
        op.pushBox(x - W * 0.28 + i * 0.55 * s, y + 0.14, z - D * 0.28 + j * 0.55 * s,
          0.52 * s, 0.06, 0.52 * s, 0.3, 0.28, 0.3, 1, 0, 0.3, 0, seed + 61 + i * 2 + j);
      }
    }

    // витрина в боковой стене
    op.pushBox(x - W / 2 - 0.02, y + H * 0.58, z, 0.16, H * 0.45, D * 0.6,
      1, 0.9, 0.62, 1, 0.75, 0.1, 0, seed + 3);

    // прилавок у задней стены и пирожные на нём
    const пz = z + D * 0.3;
    op.pushBox(x, y + 0.55 * s, пz, W * 0.62, 1.1 * s, 0.75 * s,
      0.55, 0.36, 0.24, 1, 0, 0.45, 0, seed + 4);
    op.pushBox(x, y + 1.16 * s, пz, W * 0.66, 0.12 * s, 0.85 * s,
      0.72, 0.56, 0.38, 1, 0, 0.35, 0, seed + 5);
    for (let i = 0; i < 3; i++) {
      op.pushBox(x - W * 0.18 + i * W * 0.18, y + 1.35 * s, пz, 0.34 * s, 0.28 * s, 0.34 * s,
        i === 1 ? 0.95 : 0.9, i === 1 ? 0.55 : 0.8, i === 1 ? 0.6 : 0.5,
        1, 0.2, 0.25, 0, seed + 6 + i);
    }

    // два столика внутри и лампы над ними
    столик(op, x - W * 0.22, y, z - D * 0.1, s * 0.9, seed + 80, 2);
    столик(op, x + W * 0.26, y, z - D * 0.04, s * 0.9, seed + 120, 3);
    лампа(op, x - W * 0.22, y + H - 0.1 * s, z - D * 0.1, s * 0.9, seed + 160);
    лампа(op, x + W * 0.26, y + H - 0.1 * s, z - D * 0.04, s * 0.9, seed + 170);

    // цветок в углу
    op.pushBox(x + W * 0.38, y + 0.3 * s, z + D * 0.32, 0.5 * s, 0.6 * s, 0.5 * s,
      0.6, 0.4, 0.3, 1, 0, 0.4, 0, seed + 180);
    op.pushBox(x + W * 0.38, y + 0.85 * s, z + D * 0.32, 0.7 * s, 0.7 * s, 0.7 * s,
      0.35, 0.68, 0.34, 1, 0.05, 0.3, 0.04, seed + 181);

    крыша(op, x, y + H, z, W, D, 3, 0.3 * s, [0.62, 0.5, 0.44], seed + 20);

    // навес в красно-белую полоску над входом
    const полос = 7;
    for (let i = 0; i < полос; i++) {
      const красн = i % 2 === 0;
      const шир = W / полос;
      op.pushBox(x - W / 2 + шир * (i + 0.5), y + H + 0.15 * s, z - D / 2 - 0.85 * s,
        шир, 0.28 * s, 1.7 * s,
        красн ? 0.85 : 0.96, красн ? 0.26 : 0.94, красн ? 0.26 : 0.9,
        1, 0, 0.35, 0, seed + 30 + i);
    }

    // и столик на улице, под навесом
    столик(op, x + W * 0.62, y, z - D * 0.62, s, seed + 200, 2);
  }

  /** Уличный фонарь: столб и тёплый огонёк наверху. */
  function lantern(op, x, y, z, s, b, seed) {
    const м = [0.24, 0.24, 0.28];
    const Н = 4.2 * s;                     // высота столба
    op.pushBox(x, y + 0.15 * s, z, 0.7 * s, 0.3 * s, 0.7 * s, м[0], м[1], м[2], 1, 0, 0.5, 0, seed);
    op.pushBox(x, y + Н / 2, z, 0.26 * s, Н, 0.26 * s, м[0], м[1], м[2], 1, 0, 0.5, 0, seed + 1);
    // голова фонаря
    op.pushBox(x, y + Н + 0.35 * s, z, 0.72 * s, 0.7 * s, 0.72 * s,
      1, 0.92, 0.62, 1, 0.95, 0.05, 0, seed + 2);
    op.pushBox(x, y + Н + 0.8 * s, z, 0.9 * s, 0.24 * s, 0.9 * s,
      м[0], м[1], м[2], 1, 0, 0.4, 0, seed + 3);
  }

  /** Скамейка — просто чтобы город был живым. */
  function bench(op, x, y, z, s, b, seed) {
    const д = [0.68, 0.5, 0.32];
    const Ш = 2.2 * s;
    op.pushBox(x, y + 0.5 * s, z, Ш, 0.18 * s, 0.8 * s, д[0], д[1], д[2], 1, 0, 0.4, 0, seed);
    op.pushBox(x, y + 0.86 * s, z - 0.34 * s, Ш, 0.6 * s, 0.16 * s,
      д[0] * 0.92, д[1] * 0.92, д[2] * 0.92, 1, 0, 0.4, 0, seed + 1);
    for (let i = 0; i < 2; i++) {
      op.pushBox(x + (i ? 0.9 : -0.9) * s, y + 0.25 * s, z, 0.2 * s, 0.5 * s, 0.7 * s,
        0.3, 0.3, 0.34, 1, 0, 0.45, 0, seed + 2 + i);
    }
  }

  /**
   * Пирамида: снаружи ступенчатая гора, внутри — зал с саркофагом.
   * Нижние слои делаем полыми: кольцо стен вместо цельной плиты,
   * а в передней стене — проход внутрь.
   */
  function pyramid(op, x, y, z, s, b, seed) {
    const к = b.rock;
    const ОСН = ЗДАНИЯ.pyramid.W * s;
    const дверь = ЗДАНИЯ.pyramid.дверь * s;
    const слоёв = 9, шаг = 1.05 * s;
    const полых = 3;                       // сколько нижних слоёв внутри пустые
    const ЗАЛ = ОСН * 0.62;                // ширина внутреннего зала

    for (let i = 0; i < слоёв; i++) {
      const w = ОСН * (1 - i / слоёв);
      if (w < 0.5) break;
      const t = i / слоёв;
      const цв = [к[0] * (1 - t * 0.18), к[1] * (1 - t * 0.16), к[2] * (1 - t * 0.2)];
      const yc = y + шаг / 2 + i * шаг;

      if (i < полых) {
        const т = (w - ЗАЛ) / 2;
        if (i === 0) {
          // в самом низу — проход внутрь
          const бока = (w - дверь) / 2;
          for (let j = 0; j < 2; j++) {
            op.pushBox(x + (j ? 1 : -1) * (дверь + бока) / 2, yc, z - w / 2 + т / 2,
              бока, шаг, т, цв[0], цв[1], цв[2], 1, 0, 0.6, 0, seed + i * 10 + j);
          }
        } else {
          op.pushBox(x, yc, z - w / 2 + т / 2, w, шаг, т,
            цв[0], цв[1], цв[2], 1, 0, 0.6, 0, seed + i * 10);
        }
        op.pushBox(x, yc, z + w / 2 - т / 2, w, шаг, т,
          цв[0], цв[1], цв[2], 1, 0, 0.6, 0, seed + i * 10 + 2);
        op.pushBox(x - w / 2 + т / 2, yc, z, т, шаг, ЗАЛ,
          цв[0], цв[1], цв[2], 1, 0, 0.62, 0, seed + i * 10 + 3);
        op.pushBox(x + w / 2 - т / 2, yc, z, т, шаг, ЗАЛ,
          цв[0], цв[1], цв[2], 1, 0, 0.62, 0, seed + i * 10 + 4);
      } else {
        op.pushBox(x, yc, z, w, шаг, w, цв[0], цв[1], цв[2], 1, 0, 0.6, 0, seed + i * 10);
      }
    }

    // ---- зал внутри ----
    op.pushBox(x, y + 0.07, z, ЗАЛ - 0.3, 0.14, ЗАЛ - 0.3,
      к[0] * 0.8, к[1] * 0.8, к[2] * 0.78, 1, 0, 0.4, 0, seed + 200);

    // саркофаг посередине
    op.pushBox(x, y + 0.45 * s, z, 1.5 * s, 0.9 * s, 2.6 * s,
      0.85, 0.68, 0.26, 1, 0.15, 0.45, 0, seed + 210);
    op.pushBox(x, y + 0.98 * s, z, 1.65 * s, 0.24 * s, 2.75 * s,
      1, 0.82, 0.3, 1, 0.35, 0.3, 0, seed + 211);
    op.pushBox(x, y + 1.16 * s, z - 0.7 * s, 0.6 * s, 0.16 * s, 0.6 * s,
      0.3, 0.85, 0.95, 1, 0.7, 0.2, 0, seed + 212);

    // чаши с огнём по углам — внутри должно быть видно
    for (let j = 0; j < 4; j++) {
      const a2 = j / 4 * Math.PI * 2 + Math.PI / 4;
      const оx = x + Math.cos(a2) * ЗАЛ * 0.34, оz = z + Math.sin(a2) * ЗАЛ * 0.34;
      op.pushBox(оx, y + 0.35 * s, оz, 0.3 * s, 0.7 * s, 0.3 * s,
        0.35, 0.3, 0.28, 1, 0, 0.5, 0, seed + 220 + j);
      op.pushBox(оx, y + 0.78 * s, оz, 0.6 * s, 0.26 * s, 0.6 * s,
        0.4, 0.35, 0.32, 1, 0, 0.4, 0, seed + 230 + j);
      op.pushBox(оx, y + 1.0 * s, оz, 0.42 * s, 0.34 * s, 0.42 * s,
        1, 0.65, 0.22, 1, 1, 0.05, 0.03, seed + 240 + j);
    }

    // золотые кучки у задней стены
    for (let j = 0; j < 3; j++) {
      op.pushBox(x + (j - 1) * ЗАЛ * 0.26, y + 0.2 * s, z + ЗАЛ * 0.34,
        0.7 * s, 0.34 * s, 0.5 * s, 1, 0.84, 0.32, 1, 0.4, 0.25, 0, seed + 250 + j);
    }

    // золотая верхушка
    op.pushBox(x, y + шаг * слоёв + 0.4 * s, z, 1.2 * s, 1.2 * s, 1.2 * s,
      1, 0.82, 0.28, 1, 0.55, 0.15, 0, seed + 260);
  }

  /** Обелиск — высокий столб с рунами. */
  function obelisk(op, x, y, z, s, b, seed) {
    const к = b.rock;
    const слоёв = 7, шаг = 0.85 * s;
    op.pushBox(x, y + 0.2 * s, z, 1.7 * s, 0.4 * s, 1.7 * s, к[0], к[1], к[2], 1, 0, 0.6, 0, seed);
    for (let i = 0; i < слоёв; i++) {
      const w = (1.3 - i * 0.09) * s;
      op.pushBox(x, y + 0.4 * s + шаг / 2 + i * шаг, z, w, шаг, w,
        к[0], к[1], к[2], 1, 0, 0.55, 0, seed + 1 + i);
    }
    const вх = y + 0.4 * s + шаг * слоёв;
    op.pushBox(x, вх + 0.4 * s, z, 0.6 * s, 0.9 * s, 0.6 * s,
      1, 0.8, 0.3, 1, 0.6, 0.1, 0, seed + 20);
    // руны прижаты к столбу: столб кверху сужается, значит и руна
    // должна съезжать вместе с ним, иначе повиснет в воздухе
    for (let i = 0; i < 3; i++) {
      const слой = i * 2;                       // на каком слое столба сидит руна
      const шир = (1.3 - слой * 0.09) * s;
      op.pushBox(x, y + 0.4 * s + шаг * (слой + 0.5), z - шир / 2 + 0.02,
        шир * 0.5, шаг * 0.5, 0.12,
        0.5, 0.9, 1, 1, 0.7, 0.05, 0, seed + 30 + i);
    }
  }

  /** Сталагмит — каменный зуб, растёт с пола пещеры. */
  function stalagmite(op, x, y, z, s, b, seed) {
    const к = b.rock;
    const слоёв = 5, шаг = 0.62 * s;
    for (let i = 0; i < слоёв; i++) {
      const w = (1.5 - i * 0.28) * s;
      if (w < 0.15) break;
      op.pushBox(x, y + шаг / 2 + i * шаг, z, w, шаг, w,
        к[0] * (1 - i * 0.05), к[1] * (1 - i * 0.05), к[2],
        1, 0, 0.65, 0, seed + i);
    }
  }

  /** Заборчик вокруг домов. */
  function fence(op, x, y, z, s, b, seed) {
    const д = [0.72, 0.58, 0.4];
    const Ш = 2.4 * s;
    for (let i = -2; i <= 2; i++) {
      op.pushBox(x + i * (Ш / 5), y + 0.5 * s, z, 0.2 * s, 1.0 * s, 0.2 * s,
        д[0], д[1], д[2], 1, 0, 0.4, 0, seed + i + 2);
    }
    op.pushBox(x, y + 0.75 * s, z, Ш, 0.16 * s, 0.14 * s,
      д[0] * 0.95, д[1] * 0.95, д[2] * 0.95, 1, 0, 0.4, 0, seed + 8);
  }

  function torch(op, x, y, z, s, b, seed) {
    const w = KM.hex('#5a4230');
    for (let i = 0; i < 3; i++) {
      op.pushBox(x, y + 0.3 + i * 0.42, z, 0.14 * s, 0.44, 0.14 * s, w[0], w[1], w[2], 1, 0, 0.55, 0, seed);
    }
    op.pushBox(x, y + 1.52, z, 0.24, 0.24, 0.24, 1, 0.65, 0.2, 1, 0.95, 0.1, 0.03, seed);
    op.pushBox(x, y + 1.72, z, 0.14, 0.2, 0.14, 1, 0.9, 0.4, 1, 1, 0.05, 0.06, seed + 1);
    op.pushBox(x, y + 1.86, z, 0.08, 0.12, 0.08, 1, 1, 0.75, 1, 1, 0, 0.08, seed + 2);
  }

  function pillar(op, x, y, z, s, b, seed) {
    const c = b.rock;
    for (let i = 0; i < 8; i++) {
      const w = i === 0 ? 1.5 : (i === 7 ? 1.4 : 1.05);
      op.pushBox(x, y + 0.35 + i * 0.7, z, w, 0.7, w, c[0], c[1], c[2], 1, 0, 0.6, 0, seed + i);
    }
    const gc = b.ground[2];
    op.pushBox(x, y + 5.9, z, 0.5, 0.5, 0.5, gc[0], gc[1], gc[2], 1, 0.7, 0.2, 0, seed);
  }

  KM.world = { generateLevel, buildStatic, N, HALF, ЗДАНИЯ };
})(window);
