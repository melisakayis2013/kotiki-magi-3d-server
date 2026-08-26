/* ============================================================
   КОТИКИ МАГИ 3D — конструктор котов
   Персонажи отличаются не окрасом, а телосложением: ушами,
   хвостом, головным убором, крыльями, аурой и пропорциями.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const V = KM.vox;

  const CACHE = Object.create(null);

  /**
   * cfg: {
   *   head, body, legs, chub   — пропорции (1 = обычные)
   *   ear:  normal|big|round|tuft|horn|fin|long|none
   *   tail: normal|fluffy|thin|fork|wisp|stub|none
   *   hat:  wizard|crown|hood|helm|halo|cap|antler|none
   *   eye:  round|sleepy|star|visor|wide
   *   wings: none|feather|bat|crystal|bug
   *   neck: collar|scarf|bell|chain|none
   *   back: none|pack|book|sword
   *   mane: false|true       — пышный воротник
   * }
   */
  function buildCat(cfg) {
    cfg = cfg || {};
    const key = JSON.stringify(cfg);
    if (CACHE[key]) return CACHE[key];

    const H = cfg.head || 1;        // размер головы
    const B = cfg.body || 1;        // длина корпуса
    const L = cfg.legs || 1;        // длина лап
    const W = cfg.chub || 1;        // «пухлость»
    const ear = cfg.ear || 'normal';
    const tail = cfg.tail || 'normal';
    const hat = cfg.hat || 'wizard';
    const eye = cfg.eye || 'round';
    const wings = cfg.wings || 'none';
    const neck = cfg.neck === undefined ? 'collar' : cfg.neck;
    const back = cfg.back || 'none';

    const P = [];
    const add = (o) => { P.push(o); return o; };

    const legLen = 0.24 * L;
    const hipY = 0.40 * L;
    const bodyW = 0.46 * W, bodyH = 0.34 * W, bodyL = 0.50 * B;

    // ---------- корпус ----------
    add({ name: 'body', pivot: [0, hipY, 0], size: [bodyW, bodyH, bodyL], ck: 'fur' });
    add({ name: 'rump', parent: 'body', pivot: [0, 0.01, -bodyL * 0.52], size: [bodyW * 0.95, bodyH * 0.94, 0.12], ck: 'fur' });
    add({ name: 'belly', parent: 'body', pivot: [0, -bodyH * 0.38, 0.03], size: [bodyW * 0.78, 0.13, bodyL * 0.84], ck: 'fur2' });
    add({ name: 'ruff', parent: 'body', pivot: [0, 0.06, bodyL * 0.5], size: [bodyW * 0.92, bodyH * 0.76, 0.12], ck: 'fur2' });
    if (cfg.mane) {
      add({ name: 'mane', parent: 'body', pivot: [0, 0.10, bodyL * 0.46], size: [bodyW * 1.5, bodyH * 1.6, 0.2], ck: 'fur2' });
    }
    add({ name: 'stripeA', parent: 'body', pivot: [0, bodyH * 0.51, 0.08], size: [bodyW * 0.65, 0.03, 0.08], ck: 'fur2' });
    add({ name: 'stripeB', parent: 'body', pivot: [0, bodyH * 0.51, -0.08], size: [bodyW * 0.52, 0.03, 0.08], ck: 'fur2' });

    // ---------- голова ----------
    const hw = 0.58 * H, hh = 0.48 * H, hd = 0.46 * H;
    const hy = 0.20 * H;             // центр черепа в системе головы
    const front = hy * 0 + 0.02 + hd * 0.5;   // передняя грань черепа по Z
    add({ name: 'head', parent: 'body', pivot: [0, bodyH * 0.56, bodyL * 0.30] });
    add({ name: 'skull', parent: 'head', pivot: [0, hy, 0.02], size: [hw, hh, hd], ck: 'fur' });
    add({ name: 'skullTop', parent: 'head', pivot: [0, hy + hh * 0.46, 0.01], size: [hw * 0.8, 0.08, hd * 0.82], ck: 'fur' });
    add({ name: 'cheekL', parent: 'head', pivot: [-hw * 0.53, hy - hh * 0.1, 0.03], size: [0.09, hh * 0.5, hd * 0.65], ck: 'fur2' });
    add({ name: 'cheekR', parent: 'head', pivot: [hw * 0.53, hy - hh * 0.1, 0.03], size: [0.09, hh * 0.5, hd * 0.65], ck: 'fur2' });
    add({ name: 'blaze', parent: 'head', pivot: [0, hy + hh * 0.42, front * 0.72], size: [0.17, 0.11, 0.21], ck: 'fur2' });
    add({ name: 'muzzle', parent: 'head', pivot: [0, hy - hh * 0.25, front], size: [hw * 0.48, hh * 0.37, 0.12], ck: 'fur2' });
    add({ name: 'nose', parent: 'head', pivot: [0, hy - hh * 0.14, front + 0.07], size: [0.11, 0.08, 0.06], ck: 'nose' });
    add({ name: 'mouthL', parent: 'head', pivot: [-0.052, hy - hh * 0.32, front + 0.055], size: [0.07, 0.032, 0.035], ck: 'nose' });
    add({ name: 'mouthR', parent: 'head', pivot: [0.052, hy - hh * 0.32, front + 0.055], size: [0.07, 0.032, 0.035], ck: 'nose' });

    // ---------- глаза ----------
    const ex = hw * 0.25, ey = hy + hh * 0.12, ez = front + 0.02;
    const eyeShape = {
      round: [0.15, 0.18, 0.05], wide: [0.19, 0.20, 0.05],
      sleepy: [0.16, 0.07, 0.05], star: [0.16, 0.16, 0.05], visor: [0.44, 0.11, 0.06]
    }[eye] || [0.15, 0.18, 0.05];
    if (eye === 'visor') {
      add({ name: 'eyeL', parent: 'head', pivot: [0, ey, ez] });
      add({ name: 'eyeLb', parent: 'eyeL', pivot: [0, 0, 0], size: eyeShape, ck: 'eye', emis: 0.6 });
      add({ name: 'eyeLs', parent: 'eyeL', pivot: [-0.1, 0.02, 0.02], size: [0.09, 0.045, 0.02], ck: 'eyeShine', emis: 0.9 });
      add({ name: 'eyeR', parent: 'head', pivot: [0, ey, ez] });
    } else {
      const mk = (n, sx) => {
        add({ name: n, parent: 'head', pivot: [sx * ex, ey, ez] });
        add({ name: n + 'b', parent: n, pivot: [0, 0, 0], size: eyeShape, ck: 'eye' });
        add({ name: n + 's', parent: n, pivot: [sx * -0.034, 0.048 * (eye === 'sleepy' ? 0.3 : 1), 0.032], size: [0.06, 0.065 * (eye === 'sleepy' ? 0.4 : 1), 0.02], ck: 'eyeShine' });
        add({ name: n + 's2', parent: n, pivot: [sx * 0.036, -0.042, 0.032], size: [0.032, 0.032, 0.02], ck: 'eyeShine' });
        if (eye === 'star') {
          add({ name: n + 'st1', parent: n, pivot: [0, 0, 0.035], size: [0.17, 0.05, 0.02], ck: 'eyeShine', emis: 0.8 });
          add({ name: n + 'st2', parent: n, pivot: [0, 0, 0.035], size: [0.05, 0.17, 0.02], ck: 'eyeShine', emis: 0.8 });
        }
      };
      mk('eyeL', -1); mk('eyeR', 1);
    }

    // ---------- уши ----------
    const earY = hy + hh * 0.42, earZ = 0.06;
    const earDef = {
      normal: { w: 0.20, h: 0.27, d: 0.11, x: 0.37, tilt: 0 },
      big: { w: 0.26, h: 0.40, d: 0.12, x: 0.40, tilt: 0.1 },
      round: { w: 0.24, h: 0.20, d: 0.14, x: 0.40, tilt: 0 },
      tuft: { w: 0.18, h: 0.32, d: 0.10, x: 0.36, tilt: -0.15 },
      long: { w: 0.15, h: 0.52, d: 0.10, x: 0.32, tilt: 0.05 },
      horn: { w: 0.13, h: 0.30, d: 0.13, x: 0.36, tilt: -0.3 },
      fin: { w: 0.10, h: 0.26, d: 0.30, x: 0.40, tilt: 0.2 }
    }[ear];
    if (earDef) {
      const mk = (n, sx) => {
        add({ name: n, parent: 'head', pivot: [sx * hw * earDef.x, earY, earZ] });
        add({ name: n + 'o', parent: n, pivot: [0, earDef.h * 0.5, 0], size: [earDef.w, earDef.h, earDef.d], ck: ear === 'horn' ? 'horn' : 'fur' });
        if (ear !== 'horn' && ear !== 'fin') {
          add({ name: n + 'i', parent: n, pivot: [0, earDef.h * 0.42, 0.02], size: [earDef.w * 0.55, earDef.h * 0.62, earDef.d * 0.5], ck: 'ear' });
        }
        if (ear === 'tuft') {
          add({ name: n + 't', parent: n, pivot: [0, earDef.h * 1.02, 0], size: [0.06, 0.13, 0.06], ck: 'fur2' });
        }
        if (ear === 'horn') {
          add({ name: n + 'h2', parent: n, pivot: [sx * 0.05, earDef.h * 0.95, -0.04], size: [0.09, 0.16, 0.09], ck: 'horn' });
        }
      };
      mk('earL', -1); mk('earR', 1);
    }

    // ---------- усы ----------
    const wz = front + 0.01;
    add({ name: 'whL1', parent: 'head', pivot: [-hw * 0.47, hy - hh * 0.18, wz], size: [0.22, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whL2', parent: 'head', pivot: [-hw * 0.45, hy - hh * 0.30, wz], size: [0.20, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whR1', parent: 'head', pivot: [hw * 0.47, hy - hh * 0.18, wz], size: [0.22, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whR2', parent: 'head', pivot: [hw * 0.45, hy - hh * 0.30, wz], size: [0.20, 0.02, 0.02], ck: 'whisker', ao: 0 });

    // ---------- головной убор ----------
    // если надет аксессуар на голову, базовая шляпа снимается
    const accCfg = cfg.acc || {};
    const hatKind = accCfg.head ? 'none' : hat;
    const topY = hy + hh * 0.5;
    add({ name: 'hat', parent: 'head', pivot: [0, topY, -0.12] });
    switch (hatKind) {
      case 'wizard':
        add({ name: 'hatBrim', parent: 'hat', pivot: [0, 0.025, 0.01], size: [0.56 * H, 0.055, 0.50 * H], ck: 'hat' });
        add({ name: 'hatBand', parent: 'hat', pivot: [0, 0.085, 0], size: [0.36 * H, 0.06, 0.36 * H], ck: 'hatBand' });
        add({ name: 'hat1', parent: 'hat', pivot: [0, 0.155, 0.005], size: [0.32 * H, 0.10, 0.32 * H], ck: 'hat' });
        add({ name: 'hat2', parent: 'hat', pivot: [0, 0.245, 0.02], size: [0.23 * H, 0.09, 0.23 * H], ck: 'hat' });
        add({ name: 'hat3', parent: 'hat', pivot: [0, 0.325, 0.04], size: [0.15 * H, 0.08, 0.15 * H], ck: 'hat' });
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.395, 0.06], size: [0.10, 0.10, 0.10], ck: 'gem', emis: 0.85, ao: 0 });
        break;
      case 'crown':
        add({ name: 'hatBand', parent: 'hat', pivot: [0, 0.06, 0.06], size: [0.48 * H, 0.10, 0.44 * H], ck: 'hat' });
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * 6.283;
          add({
            name: 'crownSpike' + i, parent: 'hat',
            pivot: [Math.cos(a) * 0.19 * H, 0.17, 0.06 + Math.sin(a) * 0.17 * H],
            size: [0.08, 0.14, 0.08], ck: 'hat'
          });
        }
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.20, 0.06], size: [0.11, 0.11, 0.11], ck: 'gem', emis: 0.9, ao: 0 });
        break;
      case 'hood':
        add({ name: 'hoodTop', parent: 'hat', pivot: [0, 0.05, 0.02], size: [0.64 * H, 0.26, 0.60 * H], ck: 'hat' });
        add({ name: 'hoodBack', parent: 'hat', pivot: [0, -0.10, -0.22], size: [0.5 * H, 0.34, 0.22], ck: 'hat' });
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.10, -0.30], size: [0.12, 0.12, 0.12], ck: 'gem', emis: 0.6, ao: 0 });
        break;
      case 'helm':
        add({ name: 'helmTop', parent: 'hat', pivot: [0, 0.06, 0.05], size: [0.62 * H, 0.22, 0.58 * H], ck: 'hat' });
        add({ name: 'helmRidge', parent: 'hat', pivot: [0, 0.20, 0.02], size: [0.09, 0.14, 0.52 * H], ck: 'hatBand' });
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.30, 0.02], size: [0.10, 0.10, 0.10], ck: 'gem', emis: 0.8, ao: 0 });
        break;
      case 'halo':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * 6.283;
          add({
            name: 'halo' + i, parent: 'hat',
            pivot: [Math.cos(a) * 0.26 * H, 0.30, 0.06 + Math.sin(a) * 0.26 * H],
            size: [0.09, 0.05, 0.09], ck: 'gem', emis: 1, ao: 0
          });
        }
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.30, 0.06], size: [0.06, 0.03, 0.06], ck: 'gem', emis: 1, ao: 0 });
        break;
      case 'cap':
        add({ name: 'capTop', parent: 'hat', pivot: [0, 0.06, 0.04], size: [0.56 * H, 0.16, 0.52 * H], ck: 'hat' });
        add({ name: 'capPeak', parent: 'hat', pivot: [0, 0.01, 0.36 * H], size: [0.40 * H, 0.05, 0.26 * H], ck: 'hatBand' });
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.15, 0.04], size: [0.08, 0.08, 0.08], ck: 'gem', emis: 0.5, ao: 0 });
        break;
      case 'antler':
        for (let s = -1; s <= 1; s += 2) {
          add({ name: 'ant' + s, parent: 'hat', pivot: [s * 0.16 * H, 0.14, 0.04], size: [0.06, 0.28, 0.06], ck: 'horn' });
          add({ name: 'ant' + s + 'a', parent: 'hat', pivot: [s * 0.26 * H, 0.26, 0.04], size: [0.16, 0.05, 0.05], ck: 'horn' });
          add({ name: 'ant' + s + 'b', parent: 'hat', pivot: [s * 0.32 * H, 0.36, 0.04], size: [0.05, 0.16, 0.05], ck: 'horn' });
        }
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.22, 0.04], size: [0.07, 0.07, 0.07], ck: 'gem', emis: 0.7, ao: 0 });
        break;
      default:
        add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.08, 0.10], size: [0.001, 0.001, 0.001], ck: 'gem' });
    }

    // ---------- шея ----------
    if (neck === 'collar' || neck === 'bell' || neck === 'chain') {
      add({ name: 'collar', parent: 'body', pivot: [0, bodyH * 0.24, bodyL * 0.44], size: [bodyW * 0.98, 0.07, 0.14], ck: 'collar' });
      add({ name: 'gem', parent: 'body', pivot: [0, bodyH * 0.10, bodyL * 0.58], size: [0.11, 0.11, 0.07], ck: 'gem', emis: 0.9, ao: 0 });
      if (neck === 'bell') {
        add({ name: 'bell', parent: 'body', pivot: [0, bodyH * 0.02, bodyL * 0.58], size: [0.13, 0.13, 0.10], ck: 'metal', emis: 0.25 });
      }
    } else if (neck === 'scarf') {
      add({ name: 'collar', parent: 'body', pivot: [0, bodyH * 0.24, bodyL * 0.42], size: [bodyW * 1.1, 0.14, 0.2], ck: 'collar' });
      add({ name: 'scarfEnd', parent: 'body', pivot: [bodyW * 0.35, -0.04, bodyL * 0.38], size: [0.12, 0.34, 0.1], ck: 'collar', wob: 0.03 });
      add({ name: 'gem', parent: 'body', pivot: [0, bodyH * 0.12, bodyL * 0.55], size: [0.09, 0.09, 0.07], ck: 'gem', emis: 0.8, ao: 0 });
    } else {
      add({ name: 'gem', parent: 'body', pivot: [0, bodyH * 0.10, bodyL * 0.56], size: [0.08, 0.08, 0.06], ck: 'gem', emis: 0.6, ao: 0 });
    }

    // ---------- спина ----------
    if (back === 'pack') {
      add({ name: 'pack', parent: 'body', pivot: [0, bodyH * 0.5, -bodyL * 0.2], size: [bodyW * 0.75, 0.28, 0.24], ck: 'hat' });
      add({ name: 'packStrap', parent: 'body', pivot: [0, bodyH * 0.62, -bodyL * 0.2], size: [bodyW * 0.8, 0.06, 0.28], ck: 'hatBand' });
    } else if (back === 'book') {
      add({ name: 'book', parent: 'body', pivot: [0, bodyH * 0.55, -bodyL * 0.1], size: [0.30, 0.36, 0.09], ck: 'hat' });
      add({ name: 'bookPg', parent: 'body', pivot: [0, bodyH * 0.55, -bodyL * 0.1 + 0.05], size: [0.26, 0.32, 0.03], ck: 'fur2', emis: 0.3 });
    } else if (back === 'sword') {
      add({ name: 'swBlade', parent: 'body', pivot: [0.1, bodyH * 0.75, -bodyL * 0.15], size: [0.09, 0.62, 0.05], ck: 'metal', emis: 0.2 });
      add({ name: 'swGuard', parent: 'body', pivot: [0.1, bodyH * 0.45, -bodyL * 0.15], size: [0.24, 0.06, 0.08], ck: 'hatBand' });
    }

    // ---------- крылья ----------
    if (wings !== 'none') {
      const wingCfg = {
        feather: { seg: 3, w: 0.30, h: 0.22, ck: 'wing' },
        bat: { seg: 2, w: 0.34, h: 0.26, ck: 'wing' },
        crystal: { seg: 3, w: 0.24, h: 0.30, ck: 'gem' },
        bug: { seg: 2, w: 0.26, h: 0.36, ck: 'wing' }
      }[wings] || { seg: 3, w: 0.30, h: 0.22, ck: 'wing' };
      const mk = (n, sx) => {
        add({ name: n, parent: 'body', pivot: [sx * bodyW * 0.45, bodyH * 0.42, -bodyL * 0.05] });
        for (let i = 0; i < wingCfg.seg; i++) {
          add({
            name: n + 'p' + i, parent: n,
            pivot: [sx * (0.16 + i * wingCfg.w * 0.75), 0.06 - i * 0.05, -i * 0.05],
            size: [wingCfg.w, wingCfg.h * (1 - i * 0.16), 0.05],
            ck: wingCfg.ck, alpha: wings === 'bug' ? 0.55 : 1,
            emis: wings === 'crystal' ? 0.5 : 0
          });
        }
      };
      mk('wingL', -1); mk('wingR', 1);
    }

    // ---------- лапы ----------
    const leg = (n, x, z) => {
      add({ name: n, parent: 'body', pivot: [x, -bodyH * 0.35, z] });
      add({ name: n + 'u', parent: n, pivot: [0, -legLen * 0.46, 0], size: [0.15 * W, legLen, 0.15 * W], ck: 'fur' });
      add({ name: n + 'p', parent: n, pivot: [0, -legLen * 1.02, 0.02], size: [0.175 * W, 0.09, 0.20], ck: 'fur2' });
    };
    leg('legFL', -bodyW * 0.32, bodyL * 0.32);
    leg('legFR', bodyW * 0.32, bodyL * 0.32);
    leg('legBL', -bodyW * 0.32, -bodyL * 0.34);
    leg('legBR', bodyW * 0.32, -bodyL * 0.34);

    // ---------- хвост ----------
    if (tail !== 'none') {
      const tcfg = {
        normal: { n: 4, w: 0.13, len: 0.21, taper: 0.9, tipCk: 'fur2' },
        fluffy: { n: 4, w: 0.20, len: 0.19, taper: 0.95, tipCk: 'fur2' },
        thin: { n: 5, w: 0.08, len: 0.19, taper: 0.92, tipCk: 'fur' },
        stub: { n: 2, w: 0.16, len: 0.14, taper: 0.8, tipCk: 'fur2' },
        wisp: { n: 5, w: 0.15, len: 0.20, taper: 0.82, tipCk: 'gem', alpha: 0.75 },
        fork: { n: 3, w: 0.11, len: 0.22, taper: 0.9, tipCk: 'fur2', fork: true }
      }[tail] || { n: 4, w: 0.13, len: 0.21, taper: 0.9, tipCk: 'fur2' };

      let parent = 'body';
      let pv = [0, bodyH * 0.24, -bodyL * 0.54];
      for (let i = 0; i < tcfg.n; i++) {
        const nm = 'tail' + (i + 1);
        add({ name: nm, parent, pivot: pv });
        const w = tcfg.w * Math.pow(tcfg.taper, i);
        const last = i === tcfg.n - 1;
        add({
          name: nm + 'b', parent: nm, pivot: [0, 0.02, -tcfg.len * 0.5],
          size: [w, w, tcfg.len], ck: last ? tcfg.tipCk : 'fur',
          alpha: tcfg.alpha || 1, emis: (last && tail === 'wisp') ? 0.7 : 0
        });
        if (tcfg.fork && last) {
          add({ name: nm + 'f1', parent: nm, pivot: [w * 0.9, 0.02, -tcfg.len * 0.9], size: [w, w, tcfg.len * 0.8], ck: tcfg.tipCk });
          add({ name: nm + 'f2', parent: nm, pivot: [-w * 0.9, 0.02, -tcfg.len * 0.9], size: [w, w, tcfg.len * 0.8], ck: tcfg.tipCk });
        }
        parent = nm;
        pv = [0, 0.03, -tcfg.len * 0.94];
      }
    }


    // ============================================================
    //  АКСЕССУАРЫ
    // ============================================================
    const acc = accCfg;

    // ---- голова ----
    switch (acc.head) {
      case 'tophat':
        add({ name: 'aH1', parent: 'head', pivot: [0, topY + 0.03, 0.02], size: [0.62 * H, 0.05, 0.60 * H], ck: 'accH1' });
        add({ name: 'aH2', parent: 'head', pivot: [0, topY + 0.20, 0.02], size: [0.40 * H, 0.30, 0.40 * H], ck: 'accH1' });
        add({ name: 'aH3', parent: 'head', pivot: [0, topY + 0.10, 0.02], size: [0.42 * H, 0.07, 0.42 * H], ck: 'accH2' });
        break;
      case 'crown2':
        add({ name: 'aH1', parent: 'head', pivot: [0, topY + 0.07, 0.03], size: [0.50 * H, 0.11, 0.46 * H], ck: 'accH1' });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * 6.283;
          add({
            name: 'aHs' + i, parent: 'head',
            pivot: [Math.cos(a) * 0.20 * H, topY + 0.19, 0.03 + Math.sin(a) * 0.18 * H],
            size: [0.07, 0.13, 0.07], ck: 'accH1'
          });
          if (i % 2 === 0) add({
            name: 'aHg' + i, parent: 'head',
            pivot: [Math.cos(a) * 0.20 * H, topY + 0.27, 0.03 + Math.sin(a) * 0.18 * H],
            size: [0.07, 0.07, 0.07], ck: 'accH2', emis: 0.7, ao: 0
          });
        }
        break;
      case 'bow':
        add({ name: 'aH1', parent: 'head', pivot: [-0.15 * H, topY + 0.06, 0.10], size: [0.18, 0.16, 0.08], ck: 'accH1' });
        add({ name: 'aH2', parent: 'head', pivot: [0.15 * H, topY + 0.06, 0.10], size: [0.18, 0.16, 0.08], ck: 'accH1' });
        add({ name: 'aH3', parent: 'head', pivot: [0, topY + 0.06, 0.11], size: [0.10, 0.10, 0.10], ck: 'accH2' });
        break;
      case 'partyhat': {
        // ступенчатый конус: чем выше, тем уже, цвета чередуются полосками
        const steps = 6;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const w = (0.46 - 0.36 * t) * H;
          add({
            name: 'aHp' + i, parent: 'head',
            pivot: [0, topY + 0.02 + i * 0.10, 0.02],
            size: [w, 0.10, w], ck: i % 2 ? 'accH2' : 'accH1'
          });
        }
        add({ name: 'aHtop', parent: 'head', pivot: [0, topY + 0.68, 0.02], size: [0.14, 0.14, 0.14], ck: 'accH2', emis: 0.6, ao: 0 });
        break;
      }
      case 'beanie':
        add({ name: 'aH1', parent: 'head', pivot: [0, topY + 0.02, 0.02], size: [0.62 * H, 0.16, 0.58 * H], ck: 'accH1' });
        add({ name: 'aH2', parent: 'head', pivot: [0, topY + 0.13, 0.02], size: [0.48 * H, 0.10, 0.46 * H], ck: 'accH1' });
        add({ name: 'aH3', parent: 'head', pivot: [0, topY + 0.23, 0.02], size: [0.15, 0.14, 0.15], ck: 'accH2' });
        break;
    }

    // ---- морда ----
    switch (acc.face) {
      case 'shades':
        add({ name: 'aF1', parent: 'head', pivot: [0, ey + 0.01, ez + 0.035], size: [hw * 0.96, 0.13, 0.05], ck: 'accF1' });
        add({ name: 'aF2', parent: 'head', pivot: [0, ey + 0.08, ez + 0.03], size: [hw * 1.0, 0.04, 0.05], ck: 'accF2' });
        break;
      case 'goggles':
        add({ name: 'aF1', parent: 'head', pivot: [0, ey + 0.02, ez + 0.03], size: [hw * 1.02, 0.10, 0.05], ck: 'accF1' });
        add({ name: 'aF2', parent: 'head', pivot: [-ex, ey + 0.02, ez + 0.055], size: [0.16, 0.15, 0.04], ck: 'accF2', emis: 0.35 });
        add({ name: 'aF3', parent: 'head', pivot: [ex, ey + 0.02, ez + 0.055], size: [0.16, 0.15, 0.04], ck: 'accF2', emis: 0.35 });
        add({ name: 'aF4', parent: 'head', pivot: [0, ey + 0.16, ez - 0.06], size: [hw * 1.05, 0.07, hd * 0.9], ck: 'accF1' });
        break;
      case 'eyepatch':
        add({ name: 'aF1', parent: 'head', pivot: [-ex, ey + 0.01, ez + 0.035], size: [0.20, 0.19, 0.04], ck: 'accF1' });
        add({ name: 'aF2', parent: 'head', pivot: [0, ey + 0.12, ez - 0.02], size: [hw * 1.02, 0.035, 0.035], ck: 'accF1' });
        add({ name: 'aF3', parent: 'head', pivot: [-ex, ey + 0.01, ez + 0.06], size: [0.08, 0.08, 0.02], ck: 'accF2', emis: 0.5 });
        break;
      case 'monocle':
        add({ name: 'aF1', parent: 'head', pivot: [ex, ey + 0.01, ez + 0.04], size: [0.20, 0.20, 0.03], ck: 'accF2', alpha: 0.45 });
        add({ name: 'aF2', parent: 'head', pivot: [ex, ey + 0.12, ez + 0.04], size: [0.04, 0.05, 0.03], ck: 'accF1' });
        break;
    }

    // ---- шея ----
    switch (acc.neck) {
      case 'longscarf':
        add({ name: 'aN1', parent: 'body', pivot: [0, bodyH * 0.26, bodyL * 0.42], size: [bodyW * 1.15, 0.16, 0.22], ck: 'accN1' });
        add({ name: 'aN2', parent: 'body', pivot: [bodyW * 0.42, -0.02, bodyL * 0.30], size: [0.14, 0.42, 0.11], ck: 'accN1', wob: 0.045 });
        add({ name: 'aN3', parent: 'body', pivot: [bodyW * 0.42, -0.24, bodyL * 0.26], size: [0.13, 0.12, 0.10], ck: 'accN2', wob: 0.06 });
        break;
      case 'bell2':
        add({ name: 'aN1', parent: 'body', pivot: [0, bodyH * 0.24, bodyL * 0.44], size: [bodyW * 1.02, 0.08, 0.15], ck: 'accN2' });
        add({ name: 'aN2', parent: 'body', pivot: [0, bodyH * 0.04, bodyL * 0.56], size: [0.16, 0.16, 0.13], ck: 'accN1', emis: 0.4 });
        add({ name: 'aN3', parent: 'body', pivot: [0, bodyH * -0.06, bodyL * 0.56], size: [0.06, 0.06, 0.06], ck: 'accN2' });
        break;
      case 'medal':
        add({ name: 'aN1', parent: 'body', pivot: [-0.05, bodyH * 0.26, bodyL * 0.47], size: [0.07, 0.22, 0.05], ck: 'accN2' });
        add({ name: 'aN2', parent: 'body', pivot: [0.05, bodyH * 0.26, bodyL * 0.47], size: [0.07, 0.22, 0.05], ck: 'accN2' });
        add({ name: 'aN3', parent: 'body', pivot: [0, bodyH * 0.06, bodyL * 0.52], size: [0.19, 0.19, 0.06], ck: 'accN1', emis: 0.55 });
        break;
      case 'tie':
        add({ name: 'aN1', parent: 'body', pivot: [0, bodyH * 0.26, bodyL * 0.46], size: [0.14, 0.10, 0.08], ck: 'accN1' });
        add({ name: 'aN2', parent: 'body', pivot: [0, bodyH * 0.02, bodyL * 0.50], size: [0.13, 0.30, 0.06], ck: 'accN1' });
        break;
    }

    // ---- спина ----
    switch (acc.back) {
      case 'cape':
        add({ name: 'aB0', parent: 'body', pivot: [0, bodyH * 0.42, bodyL * 0.24], size: [bodyW * 1.05, 0.09, 0.16], ck: 'accB2' });
        for (let i = 0; i < 4; i++) {
          add({
            name: 'aB' + i, parent: 'body',
            pivot: [0, bodyH * 0.30 - i * 0.20, -bodyL * (0.30 + i * 0.12)],
            size: [bodyW * (1.15 + i * 0.12), 0.24, 0.07],
            ck: i === 3 ? 'accB2' : 'accB1', wob: 0.02 + i * 0.012
          });
        }
        break;
      case 'wings2':
        for (const sx of [-1, 1]) {
          const nm = sx < 0 ? 'aBwL' : 'aBwR';
          add({ name: nm, parent: 'body', pivot: [sx * bodyW * 0.42, bodyH * 0.45, -bodyL * 0.05] });
          for (let i = 0; i < 4; i++) {
            add({
              name: nm + i, parent: nm,
              pivot: [sx * (0.15 + i * 0.21), 0.12 - i * 0.11, -0.06 - i * 0.13],
              size: [0.27, 0.30 - i * 0.05, 0.06],
              ck: i === 0 ? 'accB2' : 'accB1', emis: 0.25
            });
          }
        }
        break;
      case 'pack2':
        add({ name: 'aB1', parent: 'body', pivot: [0, bodyH * 0.52, -bodyL * 0.26], size: [bodyW * 0.82, 0.34, 0.26], ck: 'accB1' });
        add({ name: 'aB2', parent: 'body', pivot: [0, bodyH * 0.68, -bodyL * 0.26], size: [bodyW * 0.86, 0.07, 0.30], ck: 'accB2' });
        add({ name: 'aB3', parent: 'body', pivot: [0, bodyH * 0.40, -bodyL * 0.40], size: [0.14, 0.12, 0.08], ck: 'accB2' });
        break;
      case 'sword2':
        add({ name: 'aB1', parent: 'body', pivot: [0.11, bodyH * 0.80, -bodyL * 0.18], size: [0.10, 0.66, 0.05], ck: 'accB1', emis: 0.2 });
        add({ name: 'aB2', parent: 'body', pivot: [0.11, bodyH * 0.46, -bodyL * 0.18], size: [0.26, 0.07, 0.09], ck: 'accB2' });
        break;
      case 'jetpack':
        add({ name: 'aB1', parent: 'body', pivot: [0, bodyH * 0.45, -bodyL * 0.30], size: [bodyW * 0.72, 0.36, 0.22], ck: 'accB1' });
        add({ name: 'aB2', parent: 'body', pivot: [-bodyW * 0.26, bodyH * 0.20, -bodyL * 0.34], size: [0.13, 0.14, 0.13], ck: 'accB2', emis: 0.9 });
        add({ name: 'aB3', parent: 'body', pivot: [bodyW * 0.26, bodyH * 0.20, -bodyL * 0.34], size: [0.13, 0.14, 0.13], ck: 'accB2', emis: 0.9 });
        add({ name: 'aB4', parent: 'body', pivot: [0, bodyH * 0.68, -bodyL * 0.30], size: [0.10, 0.10, 0.10], ck: 'accB2', emis: 0.6 });
        break;
    }

    const model = V.defineModel(P, {
      height: (hipY + bodyH + hh * 1.3) * (cfg.s || 1),
      radius: 0.34, eye: 0.86, cfg
    });
    CACHE[key] = model;
    return model;
  }

  KM.buildCat = buildCat;
})(window);
