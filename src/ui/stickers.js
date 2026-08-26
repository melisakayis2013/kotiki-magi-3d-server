/* ============================================================
   КОТИКИ МАГИ 3D — 2D-стикеры персонажей

   Каждый стикер рисуется на месте из палитры того самого кота,
   которым играют. Никаких картинок — только квадратики, как и
   весь остальной мир игры. Стикер = кот × настроение.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  // ------------------------------------------------------------
  //  НАСТРОЕНИЯ
  // ------------------------------------------------------------
  const MOODS = [
    { id: 'happy', name: 'Радость', tag: '😺' },
    { id: 'love', name: 'Обожаю', tag: '😻' },
    { id: 'angry', name: 'Злюсь', tag: '😾' },
    { id: 'sad', name: 'Грущу', tag: '😿' },
    { id: 'laugh', name: 'Смешно', tag: '😹' },
    { id: 'cool', name: 'Крутой', tag: '😎' },
    { id: 'shock', name: 'Ого!', tag: '🙀' },
    { id: 'sleep', name: 'Сплю', tag: '😴' },
    { id: 'win', name: 'Победа', tag: '🏆' },
    { id: 'help', name: 'Помоги!', tag: '🆘' }
  ];
  const MOOD_BY = {};
  MOODS.forEach(m => { MOOD_BY[m.id] = m; });

  // ------------------------------------------------------------
  //  РИСОВАНИЕ
  // ------------------------------------------------------------
  const CACHE = Object.create(null);

  function c(v) { return KM.cssColor(v); }

  /** Один пиксель-квадратик. */
  function px(x, y, w, h, col, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + col + '"' + (extra || '') + '/>';
  }

  /**
   * Мордочка кота 20×20 «пикселей».
   * pal — палитра персонажа, mood — настроение.
   */
  function face(pal, mood) {
    const fur = c(pal.fur), fur2 = c(pal.fur2), ear = c(pal.ear);
    const eye = c(pal.eye), shine = c(pal.eyeShine), nose = c(pal.nose);
    const hat = c(pal.hat), band = c(pal.hatBand), gem = c(pal.gem);
    const wh = c(pal.whisker);
    let s = '';

    // ---- шляпа мага (над ушами, чтобы их не прятать) ----
    s += px(9, -4, 2, 2, gem);
    s += px(7, -3, 6, 2, hat);
    s += px(5, -1, 10, 2, hat);
    s += px(4, 1, 12, 1, band);

    // ---- уши: ступенчатые треугольники ----
    s += px(2, 4, 4, 2, fur) + px(3, 2, 3, 2, fur) + px(4, 1, 2, 1, fur);
    s += px(3, 4, 2, 1, ear) + px(4, 3, 1, 1, ear);
    s += px(14, 4, 4, 2, fur) + px(14, 2, 3, 2, fur) + px(14, 1, 2, 1, fur);
    s += px(15, 4, 2, 1, ear) + px(15, 3, 1, 1, ear);

    // ---- голова ----
    s += px(3, 6, 14, 11, fur);
    s += px(2, 9, 1, 5, fur);
    s += px(17, 9, 1, 5, fur);
    // светлая мордочка
    s += px(6, 13, 8, 4, fur2);

    // ---- глаза и рот по настроению ----
    const DARK = '#241a33';
    const L = 5, R = 12;         // левый и правый глаз (ширина 3)
    const EY = 9;                // строка глаз
    const openEye = (x) => px(x, EY, 3, 3, eye) + px(x, EY, 1, 1, shine);
    const smileEye = (x) => px(x, EY, 3, 1, DARK) + px(x, EY + 1, 3, 1, eye) + px(x, EY + 1, 1, 1, shine);
    const shutEye = (x) => px(x, EY + 1, 3, 1, DARK);
    const wideEye = (x) => px(x, EY - 1, 3, 5, '#ffffff') + px(x, EY, 3, 3, eye) + px(x, EY, 1, 1, shine);

    let extra = '';
    switch (mood) {
      case 'happy':
        s += smileEye(L) + smileEye(R);
        s += px(8, 15, 1, 1, DARK) + px(9, 16, 2, 1, DARK) + px(11, 15, 1, 1, DARK);
        break;

      case 'love':
        [L, R].forEach(x => {                       // глаза-сердечки
          s += px(x, EY, 1, 2, '#ff4a7a') + px(x + 2, EY, 1, 2, '#ff4a7a');
          s += px(x, EY + 1, 3, 2, '#ff4a7a') + px(x + 1, EY + 3, 1, 1, '#ff4a7a');
          s += px(x, EY, 1, 1, '#ffd0dd');
        });
        s += px(9, 16, 2, 1, DARK);
        extra += px(0, 4, 2, 2, '#ff4a7a') + px(18, 6, 2, 2, '#ff7ac0');
        break;

      case 'angry':
        s += openEye(L) + openEye(R);
        s += px(4, EY - 1, 4, 1, DARK) + px(12, EY - 1, 4, 1, DARK);
        s += px(8, 16, 4, 1, DARK) + px(9, 15, 2, 1, DARK);
        extra += px(18, 4, 1, 3, '#ff5a3a') + px(19, 5, 1, 3, '#ffb03a');
        break;

      case 'sad':
        s += openEye(L) + openEye(R);
        s += px(L, EY - 1, 3, 1, DARK) + px(R, EY - 1, 3, 1, DARK);
        s += px(L + 3, EY + 3, 1, 3, '#6ad0ff');   // слезинка
        s += px(8, 16, 4, 1, DARK) + px(8, 17, 1, 1, DARK) + px(11, 17, 1, 1, DARK);
        break;

      case 'laugh':
        s += px(L, EY, 3, 1, DARK) + px(L + 1, EY + 1, 1, 1, DARK);
        s += px(R, EY, 3, 1, DARK) + px(R + 1, EY + 1, 1, 1, DARK);
        s += px(7, 15, 6, 2, DARK) + px(8, 16, 4, 1, '#ff7a9a');
        extra += px(1, 7, 1, 3, '#6ad0ff') + px(18, 7, 1, 3, '#6ad0ff');
        break;

      case 'cool':
        s += px(3, EY - 1, 14, 4, '#1a1a26');       // тёмные очки
        s += px(4, EY, 5, 2, '#3a4a6a') + px(11, EY, 5, 2, '#3a4a6a');
        s += px(4, EY, 2, 1, '#8ab0e0');
        s += px(8, 15, 1, 1, DARK) + px(9, 16, 3, 1, DARK);
        break;

      case 'shock':
        s += wideEye(L) + wideEye(R);
        s += px(8, 15, 4, 3, DARK) + px(9, 16, 2, 1, '#5a2a3a');
        extra += px(0, 5, 1, 2, '#ffd23a') + px(19, 5, 1, 2, '#ffd23a');
        break;

      case 'sleep':
        s += shutEye(L) + shutEye(R);
        s += px(9, 15, 2, 2, DARK);
        extra += px(17, 3, 3, 1, '#ffffff') + px(18, 4, 1, 1, '#ffffff') + px(17, 5, 3, 1, '#ffffff');
        break;

      case 'win':
        s += smileEye(L) + smileEye(R);
        s += px(8, 15, 4, 2, DARK) + px(9, 16, 2, 1, '#ff7a9a');
        extra += px(0, 3, 3, 1, '#ffd23a') + px(1, 4, 1, 2, '#ffd23a');
        extra += px(17, 3, 3, 1, '#ffd23a') + px(18, 4, 1, 2, '#ffd23a');
        break;

      case 'help':
        s += wideEye(L) + wideEye(R);
        s += px(8, 16, 4, 1, DARK) + px(8, 17, 1, 1, DARK) + px(11, 17, 1, 1, DARK);
        extra += px(18, 3, 2, 3, '#ff4a5a') + px(18, 7, 2, 1, '#ff4a5a');
        break;

      default:
        s += openEye(L) + openEye(R);
        s += px(9, 16, 2, 1, DARK);
    }

    // ---- нос и усы ----
    s += px(9, 14, 2, 1, nose);
    if (mood !== 'cool') {
      s += px(0, 13, 3, 1, wh) + px(0, 15, 3, 1, wh);
      s += px(17, 13, 3, 1, wh) + px(17, 15, 3, 1, wh);
    }

    return s + extra;
  }

  const Stickers = {
    MOODS, MOOD_BY,

    /** Готовый SVG стикера: id кота + настроение. */
    svg(catId, mood, size) {
      const key = catId + '|' + mood + '|' + (size || 0);
      if (CACHE[key]) return CACHE[key];
      const cat = (KM.CAT_BY && KM.CAT_BY[catId]) || KM.CATS[0];
      const dim = size ? ' width="' + size + '" height="' + size + '"' : '';
      const out =
        '<svg viewBox="-1 -5 22 24"' + dim + ' shape-rendering="crispEdges" ' +
        'xmlns="http://www.w3.org/2000/svg" class="stk">' +
        face(cat.pal, mood) + '</svg>';
      CACHE[key] = out;
      return out;
    },

    /** Подпись под стикером. */
    label(catId, mood) {
      const cat = (KM.CAT_BY && KM.CAT_BY[catId]) || KM.CATS[0];
      const m = MOOD_BY[mood] || MOODS[0];
      return cat.name + ' · ' + m.name;
    },

    exists(catId, mood) {
      return !!(KM.CAT_BY && KM.CAT_BY[catId]) && !!MOOD_BY[mood];
    }
  };

  KM.STICKERS = Stickers;
})(window);
