/* ============================================================
   КОТИКИ МАГИ 3D — палитры и цвета
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  /** '#rrggbb' -> [r,g,b] в 0..1 */
  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function shade(c, k) { return [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c) {
    const f = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return '#' + f(c[0]) + f(c[1]) + f(c[2]);
  }

  const EYE = hex('#1b1030');
  const SHINE = hex('#ffffff');

  /** Палитры котов-магов в клетках (спасённые). */
  const CAGED_PALS = [
    { fur: hex('#c86ad0'), fur2: hex('#f0c0f5'), ear: hex('#ffb0d8'), eye: hex('#fff06a'), eyeShine: SHINE, nose: hex('#a04a80'), hat: hex('#6a3ac0'), hatBand: hex('#42208a'), gem: hex('#ffe06a'), collar: hex('#8a4aa8'), whisker: hex('#ffffff') },
    { fur: hex('#6ad0c8'), fur2: hex('#c0f5f0'), ear: hex('#b0ffe8'), eye: hex('#ff8a5a'), eyeShine: SHINE, nose: hex('#4a8a80'), hat: hex('#2a8aa0'), hatBand: hex('#1a5a70'), gem: hex('#ffffff'), collar: hex('#3a9a90'), whisker: hex('#ffffff') },
    { fur: hex('#d0b06a'), fur2: hex('#f5e6c0'), ear: hex('#ffd0b0'), eye: hex('#5a8aff'), eyeShine: SHINE, nose: hex('#a08a4a'), hat: hex('#a06a2a'), hatBand: hex('#6a4010'), gem: hex('#8ad0ff'), collar: hex('#8a7a3a'), whisker: hex('#fffbe0') },
    { fur: hex('#8a9ad0'), fur2: hex('#d0daf5'), ear: hex('#c0c8ff'), eye: hex('#ffd06a'), eyeShine: SHINE, nose: hex('#6a7aa0'), hat: hex('#3a4ac0'), hatBand: hex('#20308a'), gem: hex('#ffd06a'), collar: hex('#5a6aa8'), whisker: hex('#ffffff') }
  ];

  KM.hex = hex;
  KM.shade = shade;
  KM.mixc = mixc;
  KM.cssColor = css;
  KM.CAGED_PALS = CAGED_PALS;
})(window);
