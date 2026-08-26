/* ============================================================
   КОТИКИ МАГИ 3D — голоса монстров и инструменты музыки

   Десять монстров говорят десятью разными способами: слизень
   булькает, скелет стучит костями, призрак шелестит, каменный
   голем гудит. Ни один не сделан так же, как другой.

   Инструменты музыки тоже настоящие разные: щипковая арфа,
   FM-колокол, форманты хора, шумовые барабаны.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const S = () => KM.Synth;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ============================================================
  //  ГОЛОСА МОНСТРОВ
  //  act: 'idle' | 'notice' | 'attack' | 'hurt' | 'die'
  // ============================================================
  const VOICES = {

    /** Слизень — влажное бульканье, никаких нот. */
    slime(A, t, act, o, lo) {
      const die = act === 'die', up = act === 'notice';
      const n = die ? 6 : (up ? 4 : 2);
      for (let i = 0; i < n; i++) {
        S().fm(A, {
          at: t + i * 0.07, f0: rnd(120, 260) * lo,
          f1: die ? 60 * lo : rnd(180, 380) * lo,
          ratio: 0.5, index: 200, indexTo: 0.1,
          dur: 0.16, vol: 0.13 * o.v, ...o.mix
        });
      }
      S().grains(A, { at: t, f0: 600 * lo, n: 8, dur: die ? 0.5 : 0.24,
        q: 1.5, vol: 0.08 * o.v, ...o.mix });
    },

    /** Волк — рык через горло. */
    growl(A, t, act, o, lo) {
      const die = act === 'die', up = act === 'notice', atk = act === 'attack';
      if (up) {
        S().formant(A, { at: t, vowel: 'u', vowel2: 'o', f0: 180 * lo, f1: 320 * lo,
          dur: 0.7, vol: 0.17 * o.v, wave: 'sawtooth', vib: 6, vibAmt: 30, ...o.mix });
      } else if (atk) {
        S().formant(A, { at: t, vowel: 'a', f0: 260 * lo, f1: 120 * lo,
          dur: 0.22, vol: 0.2 * o.v, wave: 'sawtooth', vib: 30, vibAmt: 40, ...o.mix });
        S().grains(A, { at: t, f0: 1600, n: 5, dur: 0.12, vol: 0.09 * o.v, ...o.mix });
      } else {
        S().formant(A, { at: t, vowel: 'grr', f0: (die ? 150 : 110) * lo,
          f1: (die ? 50 : 85) * lo, dur: die ? 0.8 : 0.32,
          vol: 0.18 * o.v, wave: 'sawtooth', vib: 26, vibAmt: 22, breath: true, ...o.mix });
      }
    },

    /** Гоблин — визгливая скороговорка. */
    goblin(A, t, act, o, lo) {
      const die = act === 'die';
      const n = die ? 5 : 3;
      for (let i = 0; i < n; i++) {
        S().formant(A, {
          at: t + i * 0.075, vowel: i % 2 ? 'i' : 'e',
          f0: rnd(300, 460) * lo, f1: die ? 140 * lo : rnd(280, 520) * lo,
          dur: 0.1, vol: 0.13 * o.v, wave: 'square', q: 12, ...o.mix
        });
      }
    },

    /** Скелет — стук костей, тона почти нет. */
    bone(A, t, act, o, lo) {
      const die = act === 'die';
      const n = die ? 9 : 4;
      for (let i = 0; i < n; i++) {
        S().thump(A, {
          at: t + i * 0.045 + rnd(0, 0.02),
          f0: rnd(600, 1400) * lo, f1: rnd(200, 400) * lo,
          dur: 0.05, drop: 0.25, wave: 'triangle',
          vol: 0.11 * o.v, click: 1.5, clickF: rnd(2600, 4800), ...o.mix
        });
      }
    },

    /** Летучая тварь — ультразвуковой писк. */
    screech(A, t, act, o, lo) {
      const die = act === 'die';
      S().formant(A, { at: t, vowel: 'i', f0: 900 * lo,
        f1: die ? 300 * lo : 1500 * lo, dur: die ? 0.4 : 0.15,
        vol: 0.11 * o.v, wave: 'sawtooth', q: 18, vib: 40, vibAmt: 70, ...o.mix });
      S().whoosh(A, { at: t, f0: 4000, f1: 7000, dur: 0.12, q: 12, vol: 0.05 * o.v, ...o.mix });
    },

    /** Паук — сухая трескотня. */
    chitter(A, t, act, o, lo) {
      const n = act === 'die' ? 10 : (act === 'notice' ? 6 : 4);
      for (let i = 0; i < n; i++) {
        S().grains(A, { at: t + i * 0.035, f0: rnd(3000, 5200) * lo,
          n: 2, dur: 0.02, q: 14, vol: 0.09 * o.v, ...o.mix });
      }
      if (act === 'die') {
        S().whoosh(A, { at: t, f0: 2400, f1: 400, dur: 0.4, q: 3, vol: 0.06 * o.v, ...o.mix });
      }
    },

    /** Призрак — шелест без тела. */
    ghost(A, t, act, o, lo) {
      const die = act === 'die';
      S().whoosh(A, { at: t, f0: die ? 1800 : 500, f1: die ? 200 : 1600,
        dur: die ? 0.9 : 0.55, q: 2.5, vol: 0.1 * o.v, atk: 0.1, ...o.mix });
      S().formant(A, { at: t, vowel: 'u', vowel2: 'i', f0: 220 * lo,
        f1: die ? 90 * lo : 300 * lo, dur: die ? 0.9 : 0.5,
        vol: 0.08 * o.v, wave: 'sine', breath: true, atk: 0.12, q: 4, ...o.mix });
    },

    /** Каменный голем — низкий гул и осыпь щебня. */
    stone(A, t, act, o, lo) {
      const die = act === 'die';
      S().thump(A, { at: t, f0: 80 * lo, f1: 28 * lo, dur: die ? 0.9 : 0.35,
        vol: 0.2 * o.v, click: 0.5, clickF: 600, ...o.mix });
      S().grains(A, { at: t, f0: 800, n: die ? 16 : 6, dur: die ? 0.8 : 0.3,
        q: 2, vol: 0.11 * o.v, ...o.mix });
    },

    /** Бесёнок — металлический хохоток. */
    imp(A, t, act, o, lo) {
      const die = act === 'die';
      const n = die ? 5 : 3;
      for (let i = 0; i < n; i++) {
        S().fm(A, {
          at: t + i * 0.09, f0: rnd(500, 800) * lo,
          f1: die ? 200 * lo : rnd(400, 900) * lo,
          ratio: 3.14, index: 400, indexTo: 0.1,
          dur: 0.12, vol: 0.1 * o.v, ...o.mix
        });
      }
    },

    /** Босс — вся мощь разом. */
    boss(A, t, act, o, lo) {
      const die = act === 'die';
      S().thump(A, { at: t, f0: 58 * lo, f1: 20 * lo, dur: die ? 1.4 : 0.7,
        vol: 0.22 * o.v, click: 0, ...o.mix });
      S().formant(A, { at: t, vowel: 'grr', vowel2: 'o', f0: 70 * lo,
        f1: die ? 30 * lo : 100 * lo, dur: die ? 1.4 : 0.8,
        vol: 0.18 * o.v, wave: 'sawtooth', vib: 7, vibAmt: 35, breath: true, ...o.mix });
      S().metal(A, { at: t + 0.1, f0: 180, hp: 1400, hpTo: 350,
        dur: die ? 1.2 : 0.6, vol: 0.07 * o.v, ...o.mix });
    }
  };

  // ============================================================
  //  ИНСТРУМЕНТЫ МУЗЫКИ
  //  Каждый устроен по-своему, а не «та же волна другой нотой».
  // ============================================================
  const INSTR = {

    /** Арфа — щипковая струна. Тёплая, живая. */
    harp(A, f, dur, t, vol, dest) {
      S().pluck(A, { at: t, f0: f, decay: Math.min(1.1, dur * 1.3), bright: 0.7,
        dur: Math.min(1.6, dur * 1.5), vol, dest, echo: true });
    },

    /** Колокольчик — FM с быстро гаснущей модуляцией. */
    bell(A, f, dur, t, vol, dest) {
      S().fm(A, { at: t, f0: f, ratio: 3.51, index: f * 1.4, indexTo: 0.02,
        dur: Math.min(1.8, dur * 1.6), vol, atk: 0.003, dest, echo: true });
    },

    /** Стекло — негармоничные призвуки. */
    glass(A, f, dur, t, vol, dest) {
      S().chime(A, { at: t, f0: f, dur: Math.min(1.6, dur * 1.5), vol: vol * 0.9,
        parts: [1, 2.76, 5.4], dest, echo: true });
    },

    /** Флейта — чистый тон с придыханием. */
    flute(A, f, dur, t, vol, dest) {
      S().formant(A, { at: t, vowel: 'u', f0: f, dur: dur, vol: vol * 1.2,
        wave: 'sine', breath: true, rich: 1.6, q: 3, atk: 0.05,
        vib: 5, vibAmt: 6, dest, echo: true });
    },

    /** Хор — форманты гласной «а», как поют. */
    choir(A, f, dur, t, vol, dest) {
      S().formant(A, { at: t, vowel: 'o', vowel2: 'a', f0: f, dur: dur,
        vol: vol * 1.1, wave: 'sawtooth', q: 5, atk: 0.18, rich: 0.8,
        vib: 4.5, vibAmt: 8, dest, echo: true });
    },

    /** Пила — резкий ведущий голос для боя. */
    saw(A, f, dur, t, vol, dest) {
      S().fm(A, { at: t, f0: f, ratio: 1.005, index: 30, indexTo: 0.5,
        carrier: 'sawtooth', modWave: 'sawtooth',
        dur: Math.min(1.2, dur), vol: vol * 0.8, atk: 0.006, dest, echo: true });
    },

    /** Мягкий подголосок. */
    soft(A, f, dur, t, vol, dest) {
      S().fm(A, { at: t, f0: f, ratio: 2, index: 25, indexTo: 0.05,
        dur: Math.min(1.2, dur), vol, atk: 0.02, dest, echo: true });
    },

    /** Бас — синус с подщелчком. */
    bass(A, f, dur, t, vol, dest) {
      S().thump(A, { at: t, f0: f * 1.6, f1: f, dur: Math.min(0.9, dur),
        drop: 0.12, wave: 'triangle', vol, click: 0.25, clickF: 900, dest });
    }
  };

  // ============================================================
  //  БАРАБАНЫ — настоящие шумовые, а не ноты
  // ============================================================
  const DRUM = {
    kick(A, t, v, dest) {
      S().thump(A, { at: t, f0: 150, f1: 40, dur: 0.26, drop: 0.22,
        vol: v, click: 0.55, clickF: 1200, dest });
    },
    snare(A, t, v, dest) {
      S().grains(A, { at: t, f0: 2000, n: 10, dur: 0.09, q: 1.2, vol: v * 0.9, dest });
      S().thump(A, { at: t, f0: 240, f1: 170, dur: 0.09, wave: 'triangle',
        vol: v * 0.5, click: 0, dest });
    },
    hat(A, t, v, dest) {
      S().metal(A, { at: t, f0: 420, hp: 8000, dur: 0.04, vol: v, q: 0.5, dest });
    },
    open(A, t, v, dest) {
      S().metal(A, { at: t, f0: 420, hp: 7000, dur: 0.24, vol: v, q: 0.5, dest });
    },
    shake(A, t, v, dest) {
      S().grains(A, { at: t, f0: 5600, n: 9, dur: 0.1, q: 6, vol: v, dest });
    },
    tom(A, t, v, dest) {
      S().thump(A, { at: t, f0: 260, f1: 110, dur: 0.2, wave: 'sine',
        vol: v, click: 0.3, clickF: 900, dest });
    }
  };

  KM.VOICES = VOICES;
  KM.INSTR = INSTR;
  KM.DRUM = DRUM;
})(window);
