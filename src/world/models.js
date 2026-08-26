/* ============================================================
   КОТИКИ МАГИ 3D — модели существ (всё из кубиков)
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const V = KM.vox;
  const hex = KM.hex;

  const MODELS = {};

  // ============================================================
  //  КОТ-МАГ  (главный герой, спасённые коты, коты-NPC)
  // ============================================================
  function makeCat() {
    const P = [];
    const add = (o) => { P.push(o); return o; };

    // --- корпус: маленький и круглый, голова большая (чиби-пропорции) ---
    add({ name: 'body', pivot: [0, 0.40, 0], off: [0, 0, 0], size: [0.46, 0.34, 0.50], ck: 'fur' });
    add({ name: 'rump', parent: 'body', pivot: [0, 0.01, -0.26], size: [0.44, 0.32, 0.12], ck: 'fur' });
    add({ name: 'belly', parent: 'body', pivot: [0, -0.13, 0.03], size: [0.36, 0.13, 0.42], ck: 'fur2' });
    add({ name: 'ruff', parent: 'body', pivot: [0, 0.06, 0.25], size: [0.42, 0.26, 0.12], ck: 'fur2' });
    add({ name: 'stripeA', parent: 'body', pivot: [0, 0.175, 0.08], size: [0.30, 0.03, 0.08], ck: 'fur2' });
    add({ name: 'stripeB', parent: 'body', pivot: [0, 0.175, -0.08], size: [0.24, 0.03, 0.08], ck: 'fur2' });

    // --- ГОЛОВА (крупная и круглая) ---
    add({ name: 'head', parent: 'body', pivot: [0, 0.19, 0.15] });
    add({ name: 'skull', parent: 'head', pivot: [0, 0.20, 0.02], size: [0.58, 0.48, 0.46], ck: 'fur' });
    add({ name: 'skullTop', parent: 'head', pivot: [0, 0.42, 0.01], size: [0.46, 0.08, 0.38], ck: 'fur' });
    add({ name: 'cheekL', parent: 'head', pivot: [-0.305, 0.15, 0.03], size: [0.09, 0.24, 0.30], ck: 'fur2' });
    add({ name: 'cheekR', parent: 'head', pivot: [0.305, 0.15, 0.03], size: [0.09, 0.24, 0.30], ck: 'fur2' });
    add({ name: 'blaze', parent: 'head', pivot: [0, 0.40, 0.175], size: [0.17, 0.11, 0.21], ck: 'fur2' });
    add({ name: 'muzzle', parent: 'head', pivot: [0, 0.08, 0.245], size: [0.28, 0.18, 0.12], ck: 'fur2' });
    add({ name: 'nose', parent: 'head', pivot: [0, 0.135, 0.315], size: [0.11, 0.08, 0.06], ck: 'nose' });
    add({ name: 'mouthL', parent: 'head', pivot: [-0.052, 0.05, 0.30], size: [0.07, 0.032, 0.035], ck: 'nose' });
    add({ name: 'mouthR', parent: 'head', pivot: [0.052, 0.05, 0.30], size: [0.07, 0.032, 0.035], ck: 'nose' });

    // большие круглые глаза с бликами
    add({ name: 'eyeL', parent: 'head', pivot: [-0.148, 0.255, 0.248] });
    add({ name: 'eyeLb', parent: 'eyeL', pivot: [0, 0, 0], size: [0.15, 0.18, 0.05], ck: 'eye' });
    add({ name: 'eyeLs', parent: 'eyeL', pivot: [-0.034, 0.048, 0.032], size: [0.06, 0.065, 0.02], ck: 'eyeShine' });
    add({ name: 'eyeLs2', parent: 'eyeL', pivot: [0.036, -0.042, 0.032], size: [0.032, 0.032, 0.02], ck: 'eyeShine' });
    add({ name: 'eyeR', parent: 'head', pivot: [0.148, 0.255, 0.248] });
    add({ name: 'eyeRb', parent: 'eyeR', pivot: [0, 0, 0], size: [0.15, 0.18, 0.05], ck: 'eye' });
    add({ name: 'eyeRs', parent: 'eyeR', pivot: [0.034, 0.048, 0.032], size: [0.06, 0.065, 0.02], ck: 'eyeShine' });
    add({ name: 'eyeRs2', parent: 'eyeR', pivot: [-0.036, -0.042, 0.032], size: [0.032, 0.032, 0.02], ck: 'eyeShine' });

    // ушки — торчат сквозь шляпу
    add({ name: 'earL', parent: 'head', pivot: [-0.218, 0.38, 0.075] });
    add({ name: 'earLo', parent: 'earL', pivot: [0, 0.135, 0], size: [0.20, 0.27, 0.11], ck: 'fur' });
    add({ name: 'earLi', parent: 'earL', pivot: [0, 0.115, 0.058], size: [0.11, 0.18, 0.05], ck: 'ear' });
    add({ name: 'earR', parent: 'head', pivot: [0.218, 0.38, 0.075] });
    add({ name: 'earRo', parent: 'earR', pivot: [0, 0.135, 0], size: [0.20, 0.27, 0.11], ck: 'fur' });
    add({ name: 'earRi', parent: 'earR', pivot: [0, 0.115, 0.058], size: [0.11, 0.18, 0.05], ck: 'ear' });

    // усы
    add({ name: 'whL1', parent: 'head', pivot: [-0.27, 0.115, 0.255], size: [0.22, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whL2', parent: 'head', pivot: [-0.26, 0.05, 0.255], size: [0.20, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whR1', parent: 'head', pivot: [0.27, 0.115, 0.255], size: [0.22, 0.02, 0.02], ck: 'whisker', ao: 0 });
    add({ name: 'whR2', parent: 'head', pivot: [0.26, 0.05, 0.255], size: [0.20, 0.02, 0.02], ck: 'whisker', ao: 0 });

    // --- шляпа мага: сдвинута назад, ушки проходят сквозь поля ---
    add({ name: 'hat', parent: 'head', pivot: [0, 0.425, -0.12] });
    add({ name: 'hatBrim', parent: 'hat', pivot: [0, 0.025, 0.01], size: [0.56, 0.055, 0.50], ck: 'hat' });
    add({ name: 'hatBand', parent: 'hat', pivot: [0, 0.085, 0], size: [0.36, 0.06, 0.36], ck: 'hatBand' });
    add({ name: 'hat1', parent: 'hat', pivot: [0, 0.155, 0.005], size: [0.32, 0.10, 0.32], ck: 'hat' });
    add({ name: 'hat2', parent: 'hat', pivot: [0, 0.245, 0.02], size: [0.23, 0.09, 0.23], ck: 'hat' });
    add({ name: 'hat3', parent: 'hat', pivot: [0, 0.325, 0.04], size: [0.15, 0.08, 0.15], ck: 'hat' });
    add({ name: 'hatTip', parent: 'hat', pivot: [0, 0.395, 0.06], size: [0.10, 0.10, 0.10], ck: 'gem', emis: 0.85, ao: 0 });

    // --- ошейник с камнем ---
    add({ name: 'collar', parent: 'body', pivot: [0, 0.08, 0.22], size: [0.44, 0.07, 0.14], ck: 'collar' });
    add({ name: 'gem', parent: 'body', pivot: [0, 0.035, 0.30], size: [0.11, 0.11, 0.07], ck: 'gem', emis: 0.9, ao: 0 });

    // --- короткие пухлые лапки ---
    const leg = (n, x, z) => {
      add({ name: n, parent: 'body', pivot: [x, -0.12, z] });
      add({ name: n + 'u', parent: n, pivot: [0, -0.11, 0], size: [0.15, 0.24, 0.15], ck: 'fur' });
      add({ name: n + 'p', parent: n, pivot: [0, -0.245, 0.02], size: [0.175, 0.09, 0.20], ck: 'fur2' });
    };
    leg('legFL', -0.145, 0.16);
    leg('legFR', 0.145, 0.16);
    leg('legBL', -0.145, -0.17);
    leg('legBR', 0.145, -0.17);

    // --- пушистый хвост ---
    add({ name: 'tail1', parent: 'body', pivot: [0, 0.08, -0.27] });
    add({ name: 'tail1b', parent: 'tail1', pivot: [0, 0.03, -0.10], size: [0.13, 0.13, 0.21], ck: 'fur' });
    add({ name: 'tail2', parent: 'tail1', pivot: [0, 0.05, -0.20] });
    add({ name: 'tail2b', parent: 'tail2', pivot: [0, 0.02, -0.09], size: [0.115, 0.115, 0.19], ck: 'fur' });
    add({ name: 'tail3', parent: 'tail2', pivot: [0, 0.04, -0.18] });
    add({ name: 'tail3b', parent: 'tail3', pivot: [0, 0.02, -0.085], size: [0.105, 0.105, 0.18], ck: 'fur' });
    add({ name: 'tail4', parent: 'tail3', pivot: [0, 0.03, -0.16] });
    add({ name: 'tail4b', parent: 'tail4', pivot: [0, 0.02, -0.08], size: [0.125, 0.125, 0.17], ck: 'fur2' });

    return V.defineModel(P, { height: 1.15, radius: 0.34, eye: 0.86 });
  }

  // ============================================================
  //  Обобщённые конструкторы монстров
  // ============================================================

  /** Четвероногий зверь (волк, кабан, ящер...). */
  function makeQuad(c) {
    const P = [];
    const A = (o) => P.push(o);
    const bw = c.bw, bh = c.bh, bl = c.bl;
    A({ name: 'body', pivot: [0, c.legLen + bh / 2, 0], size: [bw, bh, bl], ck: 'main' });
    A({ name: 'back', parent: 'body', pivot: [0, bh * 0.5, -bl * 0.1], size: [bw * 0.8, bh * 0.28, bl * 0.75], ck: 'dark' });
    A({ name: 'belly', parent: 'body', pivot: [0, -bh * 0.42, 0], size: [bw * 0.8, bh * 0.25, bl * 0.8], ck: 'light' });
    A({ name: 'head', parent: 'body', pivot: [0, bh * 0.28, bl * 0.5] });
    A({ name: 'skull', parent: 'head', pivot: [0, 0.02, c.headL * 0.35], size: [c.headW, c.headH, c.headL], ck: 'main' });
    A({ name: 'snout', parent: 'head', pivot: [0, -c.headH * 0.22, c.headL * 0.85], size: [c.headW * 0.55, c.headH * 0.45, c.headL * 0.5], ck: 'light' });
    A({ name: 'nose', parent: 'head', pivot: [0, -c.headH * 0.14, c.headL * 1.08], size: [c.headW * 0.22, c.headH * 0.18, 0.05], ck: 'dark' });
    A({ name: 'eyeL', parent: 'head', pivot: [-c.headW * 0.28, c.headH * 0.18, c.headL * 0.72], size: [0.08, 0.09, 0.04], ck: 'eye', emis: c.eyeGlow || 0 });
    A({ name: 'eyeR', parent: 'head', pivot: [c.headW * 0.28, c.headH * 0.18, c.headL * 0.72], size: [0.08, 0.09, 0.04], ck: 'eye', emis: c.eyeGlow || 0 });
    if (c.fangs) {
      A({ name: 'fangL', parent: 'head', pivot: [-c.headW * 0.16, -c.headH * 0.40, c.headL * 0.92], size: [0.05, 0.10, 0.05], ck: 'bone' });
      A({ name: 'fangR', parent: 'head', pivot: [c.headW * 0.16, -c.headH * 0.40, c.headL * 0.92], size: [0.05, 0.10, 0.05], ck: 'bone' });
    }
    if (c.ears) {
      A({ name: 'earL', parent: 'head', pivot: [-c.headW * 0.32, c.headH * 0.55, 0.02], size: [0.11, 0.15, 0.05], ck: 'dark' });
      A({ name: 'earR', parent: 'head', pivot: [c.headW * 0.32, c.headH * 0.55, 0.02], size: [0.11, 0.15, 0.05], ck: 'dark' });
    }
    if (c.horns) {
      A({ name: 'hornL', parent: 'head', pivot: [-c.headW * 0.34, c.headH * 0.6, 0.05], size: [0.08, 0.22, 0.08], ck: 'bone' });
      A({ name: 'hornR', parent: 'head', pivot: [c.headW * 0.34, c.headH * 0.6, 0.05], size: [0.08, 0.22, 0.08], ck: 'bone' });
    }
    const leg = (n, x, z) => {
      P.push({ name: n, parent: 'body', pivot: [x, -bh * 0.45, z] });
      P.push({ name: n + 'u', parent: n, pivot: [0, -c.legLen * 0.45, 0], size: [c.legW, c.legLen * 0.9, c.legW], ck: 'main' });
      P.push({ name: n + 'p', parent: n, pivot: [0, -c.legLen * 0.92, 0.02], size: [c.legW * 1.2, c.legLen * 0.2, c.legW * 1.35], ck: 'dark' });
    };
    leg('legFL', -bw * 0.35, bl * 0.31);
    leg('legFR', bw * 0.35, bl * 0.31);
    leg('legBL', -bw * 0.35, -bl * 0.31);
    leg('legBR', bw * 0.35, -bl * 0.31);
    A({ name: 'tail1', parent: 'body', pivot: [0, bh * 0.2, -bl * 0.52] });
    A({ name: 'tail1b', parent: 'tail1', pivot: [0, 0, -0.12], size: [0.11, 0.11, 0.26], ck: 'main' });
    A({ name: 'tail2', parent: 'tail1', pivot: [0, 0, -0.24] });
    A({ name: 'tail2b', parent: 'tail2', pivot: [0, 0, -0.10], size: [0.10, 0.10, 0.22], ck: 'dark' });
    return V.defineModel(P, { height: c.legLen + bh + c.headH * 0.6, radius: Math.max(bw, bl) * 0.55, kind: 'quad' });
  }

  /** Гуманоид (гоблин, скелет, имп, орк...). */
  function makeHumanoid(c) {
    const P = [];
    const A = (o) => P.push(o);
    const hipY = c.legLen;
    A({ name: 'body', pivot: [0, hipY + c.torsoH / 2, 0], size: [c.torsoW, c.torsoH, c.torsoD], ck: 'main' });
    A({ name: 'belt', parent: 'body', pivot: [0, -c.torsoH * 0.42, 0], size: [c.torsoW * 1.05, c.torsoH * 0.16, c.torsoD * 1.05], ck: 'dark' });
    A({ name: 'chest', parent: 'body', pivot: [0, c.torsoH * 0.1, c.torsoD * 0.5], size: [c.torsoW * 0.7, c.torsoH * 0.5, 0.06], ck: 'light' });
    A({ name: 'head', parent: 'body', pivot: [0, c.torsoH * 0.5 + c.headH * 0.42, 0] });
    A({ name: 'skull', parent: 'head', pivot: [0, 0, 0], size: [c.headW, c.headH, c.headW * 0.92], ck: 'skin' });
    A({ name: 'jaw', parent: 'head', pivot: [0, -c.headH * 0.42, c.headW * 0.18], size: [c.headW * 0.7, c.headH * 0.22, c.headW * 0.6], ck: 'skin' });
    A({ name: 'eyeL', parent: 'head', pivot: [-c.headW * 0.24, c.headH * 0.1, c.headW * 0.47], size: [0.09, 0.08, 0.04], ck: 'eye', emis: c.eyeGlow || 0 });
    A({ name: 'eyeR', parent: 'head', pivot: [c.headW * 0.24, c.headH * 0.1, c.headW * 0.47], size: [0.09, 0.08, 0.04], ck: 'eye', emis: c.eyeGlow || 0 });
    if (c.ears) {
      A({ name: 'earL', parent: 'head', pivot: [-c.headW * 0.55, c.headH * 0.05, -0.02], size: [0.14, 0.09, 0.06], ck: 'skin' });
      A({ name: 'earR', parent: 'head', pivot: [c.headW * 0.55, c.headH * 0.05, -0.02], size: [0.14, 0.09, 0.06], ck: 'skin' });
    }
    if (c.horns) {
      A({ name: 'hornL', parent: 'head', pivot: [-c.headW * 0.34, c.headH * 0.55, -0.02], size: [0.07, 0.20, 0.07], ck: 'bone' });
      A({ name: 'hornR', parent: 'head', pivot: [c.headW * 0.34, c.headH * 0.55, -0.02], size: [0.07, 0.20, 0.07], ck: 'bone' });
    }
    if (c.teeth) {
      A({ name: 'toothL', parent: 'head', pivot: [-c.headW * 0.15, -c.headH * 0.36, c.headW * 0.42], size: [0.05, 0.09, 0.04], ck: 'bone' });
      A({ name: 'toothR', parent: 'head', pivot: [c.headW * 0.15, -c.headH * 0.36, c.headW * 0.42], size: [0.05, 0.09, 0.04], ck: 'bone' });
    }
    const arm = (n, sx) => {
      P.push({ name: n, parent: 'body', pivot: [sx * (c.torsoW * 0.5 + c.armW * 0.5), c.torsoH * 0.34, 0] });
      P.push({ name: n + 'u', parent: n, pivot: [0, -c.armLen * 0.45, 0], size: [c.armW, c.armLen * 0.92, c.armW], ck: 'main' });
      P.push({ name: n + 'h', parent: n, pivot: [0, -c.armLen * 0.95, 0], size: [c.armW * 1.25, c.armW * 1.15, c.armW * 1.25], ck: 'skin' });
    };
    arm('armL', -1); arm('armR', 1);
    const leg = (n, sx) => {
      P.push({ name: n, parent: 'body', pivot: [sx * c.torsoW * 0.26, -c.torsoH * 0.5, 0] });
      P.push({ name: n + 'u', parent: n, pivot: [0, -c.legLen * 0.45, 0], size: [c.legW, c.legLen * 0.9, c.legW], ck: 'main' });
      P.push({ name: n + 'f', parent: n, pivot: [0, -c.legLen * 0.94, 0.04], size: [c.legW * 1.15, c.legLen * 0.16, c.legW * 1.5], ck: 'dark' });
    };
    leg('legL', -1); leg('legR', 1);
    if (c.weapon) {
      A({ name: 'wpn', parent: 'armR', pivot: [0, -c.armLen * 1.05, 0.06] });
      A({ name: 'wpnH', parent: 'wpn', pivot: [0, -0.12, 0], size: [0.06, 0.28, 0.06], ck: 'wood' });
      A({ name: 'wpnB', parent: 'wpn', pivot: [0, -0.32, 0], size: [0.16, 0.18, 0.16], ck: 'metal' });
      A({ name: 'wpnS', parent: 'wpn', pivot: [0, -0.44, 0], size: [0.08, 0.08, 0.08], ck: 'metal', emis: c.wpnGlow || 0 });
    }
    return V.defineModel(P, { height: hipY + c.torsoH + c.headH, radius: c.torsoW * 0.62, kind: 'humanoid' });
  }

  /** Слизень / желе. */
  function makeBlob(c) {
    const P = [];
    const A = (o) => P.push(o);
    A({ name: 'body', pivot: [0, c.r * 0.75, 0], size: [c.r * 1.6, c.r * 1.4, c.r * 1.6], ck: 'main', alpha: c.alpha || 0.86 });
    A({ name: 'core', parent: 'body', pivot: [0, -c.r * 0.15, 0], size: [c.r * 0.7, c.r * 0.6, c.r * 0.7], ck: 'core', emis: 0.5 });
    A({ name: 'top', parent: 'body', pivot: [0, c.r * 0.72, 0], size: [c.r * 1.0, c.r * 0.3, c.r * 1.0], ck: 'main', alpha: c.alpha || 0.86 });
    A({ name: 'eyeL', parent: 'body', pivot: [-c.r * 0.34, c.r * 0.22, c.r * 0.76], size: [0.13, 0.15, 0.06], ck: 'eye' });
    A({ name: 'eyeR', parent: 'body', pivot: [c.r * 0.34, c.r * 0.22, c.r * 0.76], size: [0.13, 0.15, 0.06], ck: 'eye' });
    A({ name: 'shL', parent: 'body', pivot: [-c.r * 0.38, c.r * 0.28, c.r * 0.80], size: [0.05, 0.05, 0.03], ck: 'shine' });
    A({ name: 'shR', parent: 'body', pivot: [c.r * 0.30, c.r * 0.28, c.r * 0.80], size: [0.05, 0.05, 0.03], ck: 'shine' });
    A({ name: 'mouth', parent: 'body', pivot: [0, -c.r * 0.12, c.r * 0.78], size: [0.16, 0.06, 0.04], ck: 'eye' });
    A({ name: 'dropL', parent: 'body', pivot: [-c.r * 0.6, -c.r * 0.5, c.r * 0.3], size: [c.r * 0.3, c.r * 0.5, c.r * 0.3], ck: 'main', alpha: c.alpha || 0.86 });
    A({ name: 'dropR', parent: 'body', pivot: [c.r * 0.62, -c.r * 0.5, -c.r * 0.28], size: [c.r * 0.28, c.r * 0.45, c.r * 0.28], ck: 'main', alpha: c.alpha || 0.86 });
    return V.defineModel(P, { height: c.r * 1.6, radius: c.r * 0.85, kind: 'blob' });
  }

  /** Летающий дух / огонёк / призрак. */
  function makeFloater(c) {
    const P = [];
    const A = (o) => P.push(o);
    A({ name: 'body', pivot: [0, c.y, 0], size: [c.r * 1.2, c.r * 1.25, c.r * 1.1], ck: 'main', alpha: c.alpha === undefined ? 1 : c.alpha, emis: c.emis || 0 });
    A({ name: 'hood', parent: 'body', pivot: [0, c.r * 0.55, -0.02], size: [c.r * 1.3, c.r * 0.45, c.r * 1.2], ck: 'dark', alpha: c.alpha === undefined ? 1 : c.alpha });
    A({ name: 'eyeL', parent: 'body', pivot: [-c.r * 0.26, c.r * 0.12, c.r * 0.56], size: [0.09, 0.10, 0.05], ck: 'eye', emis: 0.9 });
    A({ name: 'eyeR', parent: 'body', pivot: [c.r * 0.26, c.r * 0.12, c.r * 0.56], size: [0.09, 0.10, 0.05], ck: 'eye', emis: 0.9 });
    // «хвост» духа — сужающиеся кубики
    for (let i = 0; i < 4; i++) {
      const s = 1 - i * 0.2;
      A({
        name: 'tail' + i, parent: 'body', pivot: [0, -c.r * (0.6 + i * 0.34), 0],
        size: [c.r * 1.0 * s, c.r * 0.34, c.r * 0.9 * s], ck: 'main',
        alpha: (c.alpha === undefined ? 1 : c.alpha) * (0.85 - i * 0.18), emis: (c.emis || 0) * 0.6, wob: 0.02
      });
    }
    // орбитальные искры
    for (let i = 0; i < 3; i++) {
      A({ name: 'orb' + i, parent: 'body', pivot: [0, 0, 0] });
      A({ name: 'orb' + i + 'b', parent: 'orb' + i, pivot: [c.r * 1.15, 0, 0], size: [0.09, 0.09, 0.09], ck: 'spark', emis: 1, ao: 0 });
    }
    if (c.arms) {
      A({ name: 'armL', parent: 'body', pivot: [-c.r * 0.72, c.r * 0.05, 0] });
      A({ name: 'armLb', parent: 'armL', pivot: [-0.06, -c.r * 0.35, 0.02], size: [c.r * 0.28, c.r * 0.7, c.r * 0.28], ck: 'main', alpha: c.alpha === undefined ? 1 : c.alpha });
      A({ name: 'armR', parent: 'body', pivot: [c.r * 0.72, c.r * 0.05, 0] });
      A({ name: 'armRb', parent: 'armR', pivot: [0.06, -c.r * 0.35, 0.02], size: [c.r * 0.28, c.r * 0.7, c.r * 0.28], ck: 'main', alpha: c.alpha === undefined ? 1 : c.alpha });
    }
    return V.defineModel(P, { height: c.y + c.r, radius: c.r * 0.8, kind: 'float', flying: true });
  }

  /** Летучая мышь. */
  function makeBat(c) {
    const P = [];
    const A = (o) => P.push(o);
    A({ name: 'body', pivot: [0, c.y, 0], size: [0.26, 0.30, 0.34], ck: 'main' });
    A({ name: 'head', parent: 'body', pivot: [0, 0.16, 0.10] });
    A({ name: 'skull', parent: 'head', pivot: [0, 0, 0], size: [0.28, 0.24, 0.26], ck: 'main' });
    A({ name: 'earL', parent: 'head', pivot: [-0.09, 0.19, -0.01], size: [0.08, 0.20, 0.05], ck: 'dark' });
    A({ name: 'earR', parent: 'head', pivot: [0.09, 0.19, -0.01], size: [0.08, 0.20, 0.05], ck: 'dark' });
    A({ name: 'eyeL', parent: 'head', pivot: [-0.07, 0.03, 0.14], size: [0.07, 0.07, 0.04], ck: 'eye', emis: 0.8 });
    A({ name: 'eyeR', parent: 'head', pivot: [0.07, 0.03, 0.14], size: [0.07, 0.07, 0.04], ck: 'eye', emis: 0.8 });
    A({ name: 'fangL', parent: 'head', pivot: [-0.05, -0.13, 0.11], size: [0.04, 0.07, 0.04], ck: 'bone' });
    A({ name: 'fangR', parent: 'head', pivot: [0.05, -0.13, 0.11], size: [0.04, 0.07, 0.04], ck: 'bone' });
    const wing = (n, sx) => {
      P.push({ name: n, parent: 'body', pivot: [sx * 0.13, 0.06, 0] });
      P.push({ name: n + 'a', parent: n, pivot: [sx * 0.17, 0.02, 0], size: [0.34, 0.20, 0.05], ck: 'wing' });
      P.push({ name: n + 'b', parent: n, pivot: [sx * 0.42, -0.02, -0.02] });
      P.push({ name: n + 'c', parent: n + 'b', pivot: [sx * 0.17, -0.03, 0], size: [0.34, 0.16, 0.05], ck: 'wing' });
    };
    wing('wingL', -1); wing('wingR', 1);
    A({ name: 'feetL', parent: 'body', pivot: [-0.07, -0.18, -0.02], size: [0.06, 0.10, 0.06], ck: 'dark' });
    A({ name: 'feetR', parent: 'body', pivot: [0.07, -0.18, -0.02], size: [0.06, 0.10, 0.06], ck: 'dark' });
    return V.defineModel(P, { height: c.y + 0.3, radius: 0.3, kind: 'bat', flying: true });
  }

  /** Паук. */
  function makeSpider(c) {
    const P = [];
    const A = (o) => P.push(o);
    A({ name: 'body', pivot: [0, c.legLen * 0.9, 0], size: [c.r * 1.5, c.r * 1.1, c.r * 1.7], ck: 'main' });
    A({ name: 'abdo', parent: 'body', pivot: [0, c.r * 0.15, -c.r * 1.2], size: [c.r * 1.6, c.r * 1.4, c.r * 1.5], ck: 'dark' });
    A({ name: 'mark', parent: 'abdo', pivot: [0, c.r * 0.6, 0.02], size: [c.r * 0.5, c.r * 0.12, c.r * 0.8], ck: 'mark', emis: 0.4 });
    A({ name: 'head', parent: 'body', pivot: [0, 0, c.r * 0.9] });
    A({ name: 'skull', parent: 'head', pivot: [0, 0, 0], size: [c.r * 1.0, c.r * 0.8, c.r * 0.7], ck: 'main' });
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? -1 : 1;
      const ox = (i % 2) * 0.5;
      A({
        name: 'e' + i, parent: 'head',
        pivot: [sx * c.r * (0.16 + ox * 0.28), c.r * (0.18 - ox * 0.26), c.r * 0.38],
        size: [0.07 - ox * 0.02, 0.07 - ox * 0.02, 0.04], ck: 'eye', emis: 0.85
      });
    }
    A({ name: 'fangL', parent: 'head', pivot: [-c.r * 0.2, -c.r * 0.4, c.r * 0.32], size: [0.06, 0.14, 0.06], ck: 'bone' });
    A({ name: 'fangR', parent: 'head', pivot: [c.r * 0.2, -c.r * 0.4, c.r * 0.32], size: [0.06, 0.14, 0.06], ck: 'bone' });
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const k = i % 4;
      const n = 'leg' + i;
      P.push({ name: n, parent: 'body', pivot: [side * c.r * 0.7, -c.r * 0.2, (1.5 - k) * c.r * 0.45] });
      P.push({ name: n + 'a', parent: n, pivot: [side * c.legLen * 0.32, c.legLen * 0.16, 0], size: [c.legLen * 0.66, 0.075, 0.075], ck: 'main' });
      P.push({ name: n + 'b', parent: n, pivot: [side * c.legLen * 0.62, c.legLen * 0.3, 0] });
      P.push({ name: n + 'c', parent: n + 'b', pivot: [side * c.legLen * 0.16, -c.legLen * 0.34, 0], size: [0.07, c.legLen * 0.72, 0.07], ck: 'dark' });
    }
    return V.defineModel(P, { height: c.legLen * 1.5, radius: c.r * 1.4, kind: 'spider' });
  }

  /** Голем / каменный страж — плавающие блоки. */
  function makeGolem(c) {
    const P = [];
    const A = (o) => P.push(o);
    const s = c.s;
    A({ name: 'body', pivot: [0, s * 1.35, 0], size: [s * 1.5, s * 1.5, s * 1.1], ck: 'main' });
    A({ name: 'core', parent: 'body', pivot: [0, 0, s * 0.56], size: [s * 0.45, s * 0.45, s * 0.12], ck: 'core', emis: 0.95 });
    A({ name: 'plateA', parent: 'body', pivot: [0, s * 0.62, 0], size: [s * 1.7, s * 0.3, s * 1.25], ck: 'dark' });
    A({ name: 'plateB', parent: 'body', pivot: [0, -s * 0.62, 0], size: [s * 1.3, s * 0.28, s * 1.0], ck: 'dark' });
    A({ name: 'head', parent: 'body', pivot: [0, s * 1.1, 0] });
    A({ name: 'skull', parent: 'head', pivot: [0, 0, 0], size: [s * 0.9, s * 0.75, s * 0.85], ck: 'main' });
    A({ name: 'eyeL', parent: 'head', pivot: [-s * 0.22, s * 0.06, s * 0.44], size: [0.11, 0.09, 0.05], ck: 'eye', emis: 1 });
    A({ name: 'eyeR', parent: 'head', pivot: [s * 0.22, s * 0.06, s * 0.44], size: [0.11, 0.09, 0.05], ck: 'eye', emis: 1 });
    A({ name: 'crown', parent: 'head', pivot: [0, s * 0.5, 0], size: [s * 1.0, s * 0.2, s * 0.95], ck: 'dark' });
    const arm = (n, sx) => {
      P.push({ name: n, parent: 'body', pivot: [sx * s * 1.15, s * 0.42, 0] });
      P.push({ name: n + 'a', parent: n, pivot: [sx * s * 0.15, -s * 0.5, 0], size: [s * 0.55, s * 0.9, s * 0.55], ck: 'main' });
      P.push({ name: n + 'f', parent: n, pivot: [sx * s * 0.2, -s * 1.15, 0], size: [s * 0.75, s * 0.6, s * 0.7], ck: 'dark' });
    };
    arm('armL', -1); arm('armR', 1);
    const leg = (n, sx) => {
      P.push({ name: n, parent: 'body', pivot: [sx * s * 0.42, -s * 0.75, 0] });
      P.push({ name: n + 'a', parent: n, pivot: [0, -s * 0.3, 0], size: [s * 0.5, s * 0.6, s * 0.5], ck: 'main' });
      P.push({ name: n + 'f', parent: n, pivot: [0, -s * 0.62, s * 0.06], size: [s * 0.6, s * 0.22, s * 0.7], ck: 'dark' });
    };
    leg('legL', -1); leg('legR', 1);
    // парящие осколки
    for (let i = 0; i < 4; i++) {
      A({ name: 'shard' + i, parent: 'body', pivot: [0, s * 0.3, 0] });
      A({
        name: 'shard' + i + 'b', parent: 'shard' + i,
        pivot: [s * (1.5 + (i % 2) * 0.35), s * ((i - 1.5) * 0.4), 0],
        size: [s * 0.3, s * 0.3, s * 0.3], ck: 'core', emis: 0.55
      });
    }
    return V.defineModel(P, { height: s * 3.0, radius: s * 1.0, kind: 'golem' });
  }

  // ============================================================
  //  Конкретные монстры
  // ============================================================
  const P_ = {
    slimeGreen: { main: hex('#68d84a'), core: hex('#d8ff8a'), eye: hex('#1a2a10'), shine: hex('#ffffff') },
    slimeBlue: { main: hex('#4ab0e8'), core: hex('#c0f0ff'), eye: hex('#0a1830'), shine: hex('#ffffff') },
    slimePurple: { main: hex('#a05ae0'), core: hex('#f0c0ff'), eye: hex('#1a0a2a'), shine: hex('#ffffff') },
    slimeLava: { main: hex('#ff6a2a'), core: hex('#ffe86a'), eye: hex('#2a0a00'), shine: hex('#ffffff') },
    wolf: { main: hex('#6b6f80'), dark: hex('#3f4352'), light: hex('#b8bcc8'), eye: hex('#ffd23a'), bone: hex('#fff8e0') },
    wolfIce: { main: hex('#a8d8f0'), dark: hex('#5f8fb8'), light: hex('#e8f8ff'), eye: hex('#3affe8'), bone: hex('#ffffff') },
    boar: { main: hex('#8a6a4a'), dark: hex('#5a4230'), light: hex('#c8a888'), eye: hex('#ff6a3a'), bone: hex('#fff0d0') },
    goblin: { main: hex('#4a7a3a'), dark: hex('#2d4a22'), light: hex('#7aa85a'), skin: hex('#7fbf5a'), eye: hex('#ffde3a'), bone: hex('#fffbe0'), wood: hex('#6a4a2a'), metal: hex('#9aa0b0') },
    skeleton: { main: hex('#e8e2cc'), dark: hex('#9a9480'), light: hex('#fffaf0'), skin: hex('#f2ecd8'), eye: hex('#ff3a3a'), bone: hex('#ffffff'), wood: hex('#5a4030'), metal: hex('#b0b6c4') },
    imp: { main: hex('#c8402a'), dark: hex('#8a2418'), light: hex('#ff8a5a'), skin: hex('#e05a3a'), eye: hex('#ffe03a'), bone: hex('#ffe8c0'), wood: hex('#4a2a1a'), metal: hex('#ff8a2a') },
    orc: { main: hex('#5a7a4a'), dark: hex('#38502e'), light: hex('#8aa87a'), skin: hex('#7a9a5a'), eye: hex('#ff5a2a'), bone: hex('#fff0d0'), wood: hex('#5a3a20'), metal: hex('#8a90a0') },
    wisp: { main: hex('#7ae0ff'), dark: hex('#3a90c0'), eye: hex('#ffffff'), spark: hex('#ffffff') },
    shade: { main: hex('#3a2a5a'), dark: hex('#1a1030'), eye: hex('#ff3a8a'), spark: hex('#c86aff') },
    ghost: { main: hex('#cfe8ff'), dark: hex('#8ab8e0'), eye: hex('#5a90ff'), spark: hex('#ffffff') },
    bat: { main: hex('#4a3a5a'), dark: hex('#2a1e38'), wing: hex('#6a4a7a'), eye: hex('#ff5a3a'), bone: hex('#fff0e0') },
    batFire: { main: hex('#7a2a1a'), dark: hex('#4a1408'), wing: hex('#c8482a'), eye: hex('#ffd03a'), bone: hex('#fff0e0') },
    spider: { main: hex('#3a2f3f'), dark: hex('#241c28'), mark: hex('#ff4a6a'), eye: hex('#ff2a4a'), bone: hex('#fff0e0') },
    spiderIce: { main: hex('#5a7a9a'), dark: hex('#38506a'), mark: hex('#8af0ff'), eye: hex('#8af0ff'), bone: hex('#ffffff') },
    golem: { main: hex('#7a7266'), dark: hex('#4e4840'), core: hex('#ffb43a'), eye: hex('#ffd86a') },
    golemCrystal: { main: hex('#8a6ac0'), dark: hex('#5a3f8a'), core: hex('#8af0ff'), eye: hex('#c0f8ff') },
    golemVoid: { main: hex('#2a1e42'), dark: hex('#160e26'), core: hex('#ff3a8a'), eye: hex('#ff6aa8') },
    mush: { main: hex('#e05a8a'), dark: hex('#a03a60'), light: hex('#ffc0d8'), skin: hex('#f0d8b0'), eye: hex('#3a2a10'), bone: hex('#fffbe0'), wood: hex('#8a6a4a'), metal: hex('#c0e05a') },
    sand: { main: hex('#d8b878'), dark: hex('#a8884a'), light: hex('#f0e0b8'), skin: hex('#e0c890'), eye: hex('#5a3a10'), bone: hex('#fffbe0'), wood: hex('#8a6a3a'), metal: hex('#c0a060') }
  };

  MODELS.cat = makeCat();
  MODELS.slime = makeBlob({ r: 0.42 });
  MODELS.slimeBig = makeBlob({ r: 0.62 });
  MODELS.wolf = makeQuad({ bw: 0.44, bh: 0.42, bl: 0.86, legLen: 0.44, legW: 0.15, headW: 0.36, headH: 0.34, headL: 0.34, fangs: true, ears: true });
  MODELS.boar = makeQuad({ bw: 0.56, bh: 0.50, bl: 0.90, legLen: 0.34, legW: 0.16, headW: 0.42, headH: 0.36, headL: 0.34, fangs: true, horns: false, ears: true });
  MODELS.goblin = makeHumanoid({ torsoW: 0.40, torsoH: 0.42, torsoD: 0.28, headW: 0.36, headH: 0.34, armW: 0.13, armLen: 0.40, legW: 0.14, legLen: 0.34, ears: true, teeth: true, weapon: true });
  MODELS.skeleton = makeHumanoid({ torsoW: 0.34, torsoH: 0.46, torsoD: 0.20, headW: 0.32, headH: 0.32, armW: 0.10, armLen: 0.46, legW: 0.11, legLen: 0.46, teeth: true, weapon: true, eyeGlow: 1 });
  MODELS.imp = makeHumanoid({ torsoW: 0.32, torsoH: 0.34, torsoD: 0.24, headW: 0.32, headH: 0.30, armW: 0.11, armLen: 0.32, legW: 0.11, legLen: 0.26, horns: true, teeth: true, eyeGlow: 0.8 });
  MODELS.orc = makeHumanoid({ torsoW: 0.62, torsoH: 0.62, torsoD: 0.40, headW: 0.46, headH: 0.42, armW: 0.20, armLen: 0.56, legW: 0.20, legLen: 0.46, teeth: true, weapon: true, horns: true });
  MODELS.wisp = makeFloater({ r: 0.30, y: 1.05, emis: 0.75 });
  MODELS.shade = makeFloater({ r: 0.42, y: 1.15, alpha: 0.72, arms: true });
  MODELS.ghost = makeFloater({ r: 0.40, y: 1.10, alpha: 0.55, arms: true, emis: 0.15 });
  MODELS.bat = makeBat({ y: 1.25 });
  MODELS.spider = makeSpider({ r: 0.34, legLen: 0.52 });
  MODELS.golem = makeGolem({ s: 0.42 });

  // Боссы — те же схемы, но крупнее и с короной/рогами
  MODELS.bossQuad = makeQuad({ bw: 0.9, bh: 0.86, bl: 1.6, legLen: 0.8, legW: 0.28, headW: 0.66, headH: 0.62, headL: 0.62, fangs: true, ears: true, horns: true, eyeGlow: 0.9 });
  MODELS.bossHuman = makeHumanoid({ torsoW: 0.9, torsoH: 0.92, torsoD: 0.56, headW: 0.62, headH: 0.58, armW: 0.28, armLen: 0.80, legW: 0.28, legLen: 0.68, horns: true, teeth: true, weapon: true, eyeGlow: 1, wpnGlow: 0.9 });
  MODELS.bossGolem = makeGolem({ s: 0.78 });
  MODELS.bossBlob = makeBlob({ r: 1.05 });
  MODELS.bossFloat = makeFloater({ r: 0.78, y: 1.9, arms: true, emis: 0.35 });
  MODELS.bossSpider = makeSpider({ r: 0.66, legLen: 1.0 });

  // ============================================================
  //  Анимации
  // ============================================================
  const anim = {};

  /** Кот: ходьба, бег, прыжок, отдых, удар, каст. */
  anim.cat = function (pose, s) {
    pose.reset();

    // кошачья выходка перебивает обычную анимацию целиком
    if (s.emote && KM.applyEmote && KM.applyEmote(pose, s.emote, s.emoteT || 0, s.t)) {
      if (s.blink > 0) {
        const bb = 1 - s.blink;
        pose.scale('eyeL', 1, Math.max(0.08, bb), 1);
        pose.scale('eyeR', 1, Math.max(0.08, bb), 1);
      }
      return;
    }

    const t = s.t, w = s.walk, amt = s.walkAmt, run = s.runAmt || 0;
    const sw = 0.62 * amt + 0.35 * run;

    if (s.rest > 0.02) {
      // сидит и отдыхает
      const k = s.rest;
      const br = Math.sin(t * 2.2) * 0.02 * k;
      pose.move('body', 0, -0.13 * k + br, -0.04 * k);
      pose.rot('body', -0.22 * k, 0, 0);
      pose.rot('legBL', 1.25 * k, 0, 0.12 * k);
      pose.rot('legBR', 1.25 * k, 0, -0.12 * k);
      pose.rot('legFL', 0.12 * k, 0, 0);
      pose.rot('legFR', 0.12 * k, 0, 0);
      pose.rot('head', 0.10 * k + Math.sin(t * 1.6) * 0.05, Math.sin(t * 0.7) * 0.12, 0);
      // хвост обвивает лапки
      pose.rot('tail1', 0.5 * k, 1.0 * k, 0);
      pose.rot('tail2', 0, 0.6 * k + Math.sin(t * 1.5) * 0.08, 0);
      pose.rot('tail3', 0, 0.6 * k + Math.sin(t * 1.5 + 0.6) * 0.1, 0);
      pose.rot('tail4', 0, 0.5 * k, 0);
      // глаза прикрыты
      const close = 0.18 + 0.82 * (1 - k);
      pose.scale('eyeL', 1, close, 1);
      pose.scale('eyeR', 1, close, 1);
      pose.rot('earL', -0.25 * k, 0, -0.2 * k);
      pose.rot('earR', -0.25 * k, 0, 0.2 * k);
      pose.rot('hat', -0.34, 0, 0);
      return;
    }

    // корпус: покачивание
    const bob = Math.abs(Math.sin(w)) * (0.035 + 0.03 * run) * amt;
    pose.move('body', Math.sin(w) * 0.02 * amt, bob + Math.sin(t * 2.6) * 0.008, 0);
    pose.rot('body', -0.06 * run - (s.air ? 0.12 : 0), Math.sin(w) * 0.07 * amt, Math.sin(w) * 0.05 * amt);

    // лапы (диагональная походка)
    if (s.air) {
      const up = KM.U.clamp(s.vy * 0.16, -0.8, 0.8);
      pose.rot('legFL', -0.7 - up, 0, 0);
      pose.rot('legFR', -0.7 - up, 0, 0);
      pose.rot('legBL', 0.75 + up, 0, 0);
      pose.rot('legBR', 0.75 + up, 0, 0);
      pose.rot('tail1', -0.5, 0, 0);
      pose.rot('tail2', -0.35, 0, 0);
      pose.rot('tail3', -0.25, 0, 0);
    } else {
      pose.rot('legFL', Math.sin(w) * sw, 0, 0);
      pose.rot('legBR', Math.sin(w) * sw * 0.85, 0, 0);
      pose.rot('legFR', Math.sin(w + Math.PI) * sw, 0, 0);
      pose.rot('legBL', Math.sin(w + Math.PI) * sw * 0.85, 0, 0);
      // хвост плавно колышется
      const ts = Math.sin(t * 2.0 + w * 0.4);
      pose.rot('tail1', -0.55 - 0.25 * amt, ts * (0.20 + 0.25 * amt), 0);
      pose.rot('tail2', -0.18, ts * 0.26, 0);
      pose.rot('tail3', -0.10, Math.sin(t * 2.0 + 0.7) * 0.28, 0);
      pose.rot('tail4', 0.05, Math.sin(t * 2.0 + 1.4) * 0.3, 0);
    }

    // голова
    pose.rot('head', Math.sin(w * 2) * 0.035 * amt + (s.lookX || 0) * 0.35, (s.lookY || 0) * 0.5, Math.sin(w) * 0.05 * amt);
    // шляпа сидит на затылке и слегка покачивается
    pose.rot('hat', -0.34 + Math.sin(t * 2.4) * 0.03 * (0.3 + amt), Math.sin(t * 1.7) * 0.04, Math.sin(w) * 0.05 * amt);

    // ушки
    const ej = Math.sin(t * 7 + 1) * 0.06 * (0.3 + amt);
    pose.rot('earL', -0.06 + ej, 0, -0.14 - ej);
    pose.rot('earR', -0.06 - ej, 0, 0.14 + ej);

    // моргание
    if (s.blink > 0) {
      const b = 1 - s.blink;
      pose.scale('eyeL', 1, Math.max(0.08, b), 1);
      pose.scale('eyeR', 1, Math.max(0.08, b), 1);
    }

    // удар лапой
    if (s.attack > 0) {
      const a = s.attack;                    // 1 -> 0
      const sw2 = Math.sin((1 - a) * Math.PI);
      pose.addRot('legFR', -1.9 * sw2, 0.5 * sw2, 0);
      pose.addRot('body', 0, -0.28 * sw2, 0);
      pose.addRot('head', 0.12 * sw2, -0.3 * sw2, 0);
    }
    // каст заклинания
    if (s.cast > 0) {
      const c = s.cast;
      const lift = Math.sin(c * Math.PI);
      pose.addRot('legFL', -1.5 * lift, -0.2 * lift, 0);
      pose.addRot('legFR', -1.5 * lift, 0.2 * lift, 0);
      pose.addRot('body', -0.18 * lift, 0, 0);
      pose.addRot('head', -0.2 * lift, 0, 0);
      pose.scale('hatTip', 1 + lift * 0.9, 1 + lift * 0.9, 1 + lift * 0.9);
      pose.scale('gem', 1 + lift * 0.6, 1 + lift * 0.6, 1 + lift * 0.6);
    }
    // сальто — кот поджимает лапки и хвост в комочек
    if (s.tuck) {
      pose.rot('legFL', -1.55, 0, 0); pose.rot('legFR', -1.55, 0, 0);
      pose.rot('legBL', 1.5, 0, 0); pose.rot('legBR', 1.5, 0, 0);
      pose.rot('tail1', -1.1, 0.5, 0); pose.rot('tail2', -0.8, 0.4, 0);
      pose.rot('tail3', -0.7, 0.4, 0); pose.rot('tail4', -0.6, 0.3, 0);
      pose.rot('head', 0.42, 0, 0);
      pose.rot('earL', -0.5, 0, -0.4); pose.rot('earR', -0.5, 0, 0.4);
    }
    if (s.hurt > 0) {
      pose.addRot('body', 0.25 * s.hurt, 0, 0.2 * s.hurt);
      pose.addRot('head', 0.3 * s.hurt, 0, 0);
      pose.rot('earL', -0.9, 0, -0.7);
      pose.rot('earR', -0.9, 0, 0.7);
    }
  };

  anim.quad = function (pose, s) {
    pose.reset();
    const t = s.t, w = s.walk, amt = s.walkAmt;
    const sw = 0.75 * amt;
    pose.move('body', 0, Math.abs(Math.sin(w)) * 0.05 * amt, 0);
    pose.rot('body', 0, Math.sin(w) * 0.06 * amt, Math.sin(w) * 0.05 * amt);
    pose.rot('legFL', Math.sin(w) * sw, 0, 0);
    pose.rot('legBR', Math.sin(w) * sw, 0, 0);
    pose.rot('legFR', Math.sin(w + Math.PI) * sw, 0, 0);
    pose.rot('legBL', Math.sin(w + Math.PI) * sw, 0, 0);
    pose.rot('head', Math.sin(t * 1.5) * 0.08 - 0.1 * amt, Math.sin(t * 0.8) * 0.2 * (1 - amt), 0);
    pose.rot('tail1', 0.3, Math.sin(t * 3) * 0.35, 0);
    pose.rot('tail2', 0.1, Math.sin(t * 3 + 0.8) * 0.35, 0);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.addRot('body', -0.3 * a, 0, 0);
      pose.addRot('head', 0.5 * a, 0, 0);
      pose.addRot('legFL', -1.2 * a, 0, 0);
      pose.addRot('legFR', -1.2 * a, 0, 0);
    }
    if (s.hurt > 0) pose.addRot('body', 0.3 * s.hurt, 0, 0.25 * s.hurt);
  };

  anim.humanoid = function (pose, s) {
    pose.reset();
    const t = s.t, w = s.walk, amt = s.walkAmt;
    const sw = 0.85 * amt;
    pose.move('body', 0, Math.abs(Math.sin(w)) * 0.05 * amt, 0);
    pose.rot('body', 0.06 * amt, Math.sin(w) * 0.12 * amt, 0);
    pose.rot('legL', Math.sin(w) * sw, 0, 0);
    pose.rot('legR', Math.sin(w + Math.PI) * sw, 0, 0);
    pose.rot('armL', Math.sin(w + Math.PI) * sw * 0.8, 0, 0.14);
    pose.rot('armR', Math.sin(w) * sw * 0.8, 0, -0.14);
    pose.rot('head', Math.sin(t * 1.7) * 0.06, Math.sin(t * 0.9) * 0.25 * (1 - amt * 0.7), 0);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.rot('armR', -2.5 * a, 0, -0.2);
      pose.addRot('body', 0, -0.4 * a, 0);
    }
    if (s.cast > 0) {
      const c = Math.sin(s.cast * Math.PI);
      pose.rot('armL', -2.2 * c, 0, 0.4);
      pose.rot('armR', -2.2 * c, 0, -0.4);
    }
    if (s.hurt > 0) { pose.addRot('body', 0.35 * s.hurt, 0, 0); pose.addRot('head', 0.4 * s.hurt, 0, 0); }
  };

  anim.blob = function (pose, s) {
    pose.reset();
    const t = s.t;
    const hop = Math.max(0, Math.sin(s.walk));
    const sq = 1 + Math.sin(t * 3.4) * 0.06 - hop * 0.14 * s.walkAmt;
    pose.scale('body', 1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    pose.move('body', 0, hop * 0.28 * s.walkAmt, 0);
    pose.rot('body', 0, Math.sin(t * 1.2) * 0.1, Math.sin(t * 1.7) * 0.05);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.scale('body', 1 + a * 0.3, 1 - a * 0.25, 1 + a * 0.3);
    }
    if (s.hurt > 0) pose.scale('body', 1 + s.hurt * 0.3, 1 - s.hurt * 0.3, 1 + s.hurt * 0.3);
  };

  anim.float = function (pose, s) {
    pose.reset();
    const t = s.t;
    pose.move('body', Math.sin(t * 0.9) * 0.06, Math.sin(t * 1.4) * 0.12, Math.cos(t * 0.8) * 0.05);
    pose.rot('body', Math.sin(t * 0.7) * 0.06, Math.sin(t * 0.5) * 0.2, Math.sin(t * 1.1) * 0.07);
    for (let i = 0; i < 3; i++) pose.rot('orb' + i, 0, t * (1.6 + i * 0.4) + i * 2.1, t * 0.7);
    for (let i = 0; i < 4; i++) pose.rot('tail' + i, 0, 0, Math.sin(t * 2.2 - i * 0.6) * 0.14);
    pose.rot('armL', Math.sin(t * 1.6) * 0.3 - 0.2, 0, 0.3);
    pose.rot('armR', Math.sin(t * 1.6 + 1) * 0.3 - 0.2, 0, -0.3);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.rot('armL', -1.8 * a, 0, 0.5);
      pose.rot('armR', -1.8 * a, 0, -0.5);
      pose.scale('body', 1 + a * 0.2, 1 + a * 0.2, 1 + a * 0.2);
    }
    if (s.hurt > 0) pose.scale('body', 1 + s.hurt * 0.25, 1 - s.hurt * 0.2, 1 + s.hurt * 0.25);
  };

  anim.bat = function (pose, s) {
    pose.reset();
    const t = s.t;
    const f = Math.sin(t * 13);
    pose.move('body', 0, Math.sin(t * 6) * 0.06, 0);
    pose.rot('body', 0.2 + Math.sin(t * 6) * 0.08, 0, 0);
    pose.rot('wingL', 0, 0, -f * 0.9 - 0.2);
    pose.rot('wingR', 0, 0, f * 0.9 + 0.2);
    pose.rot('wingLb', 0, 0, -f * 0.6);
    pose.rot('wingRb', 0, 0, f * 0.6);
    pose.rot('head', Math.sin(t * 2) * 0.1, Math.sin(t * 1.3) * 0.2, 0);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.addRot('body', 0.6 * a, 0, 0);
      pose.addRot('head', 0.4 * a, 0, 0);
    }
    if (s.hurt > 0) pose.addRot('body', 0.5 * s.hurt, 0, 0.4 * s.hurt);
  };

  anim.spider = function (pose, s) {
    pose.reset();
    const t = s.t, w = s.walk, amt = 0.35 + s.walkAmt;
    pose.move('body', 0, Math.abs(Math.sin(w * 2)) * 0.05 * s.walkAmt, 0);
    for (let i = 0; i < 8; i++) {
      const ph = w * 1.6 + i * 1.05 + (i < 4 ? 0 : Math.PI);
      pose.rot('leg' + i, 0, Math.sin(ph) * 0.42 * amt, Math.sin(ph * 0.5) * 0.2 * amt);
      pose.rot('leg' + i + 'b', 0, 0, Math.cos(ph) * 0.3 * amt);
    }
    pose.rot('head', Math.sin(t * 2) * 0.06, 0, 0);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.addRot('body', -0.4 * a, 0, 0);
      pose.rot('fangL', 0, 0, 0.6 * a); pose.rot('fangR', 0, 0, -0.6 * a);
    }
    if (s.hurt > 0) pose.move('body', 0, -0.08 * s.hurt, 0);
  };

  anim.golem = function (pose, s) {
    pose.reset();
    const t = s.t, w = s.walk, amt = s.walkAmt;
    pose.move('body', 0, Math.abs(Math.sin(w)) * 0.07 * amt + Math.sin(t * 1.1) * 0.02, 0);
    pose.rot('body', 0, Math.sin(w) * 0.1 * amt, 0);
    pose.rot('legL', Math.sin(w) * 0.6 * amt, 0, 0);
    pose.rot('legR', Math.sin(w + Math.PI) * 0.6 * amt, 0, 0);
    pose.rot('armL', Math.sin(w + Math.PI) * 0.4 * amt, 0, 0.2);
    pose.rot('armR', Math.sin(w) * 0.4 * amt, 0, -0.2);
    pose.rot('head', 0, Math.sin(t * 0.6) * 0.3 * (1 - amt), 0);
    for (let i = 0; i < 4; i++) pose.rot('shard' + i, 0, t * 0.9 + i * 1.57, Math.sin(t + i) * 0.4);
    if (s.attack > 0) {
      const a = Math.sin((1 - s.attack) * Math.PI);
      pose.rot('armL', -2.4 * a, 0, 0.3);
      pose.rot('armR', -2.4 * a, 0, -0.3);
      pose.addRot('body', -0.3 * a, 0, 0);
    }
    if (s.hurt > 0) pose.addRot('body', 0.2 * s.hurt, 0, 0.15 * s.hurt);
  };

  KM.MODELS = MODELS;
  KM.MPAL = P_;
  KM.anim = anim;
  KM.makeQuad = makeQuad;
  KM.makeHumanoid = makeHumanoid;
  KM.makeBlob = makeBlob;
  KM.makeFloater = makeFloater;
})(window);
