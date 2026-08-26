/* ============================================================
   КОТИКИ МАГИ 3D — большая картина

   Живой холст: коты в ряд, у каждого своя стихия и своё сияние,
   вокруг летят искры, вспыхивают молнии, падают метеоры.
   Рисуется теми же квадратиками и теми же палитрами, что и вся
   игра, — поэтому картинка выглядит как сама игра, а не как
   чужая иллюстрация.

   Используется на заставке при запуске и на экране загрузки.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  // какие коты стоят на картине и какой стихией машут
  const HEROES = [
    { cat: 'plamya', el: 'fire' },      // Пламя
    { cat: 'iney', el: 'ice' },         // Иней
    { cat: 'grozzy', el: 'spark' },     // Грозный
    { cat: 'void', el: 'shadow' },      // Пустотный
    { cat: 'zvezda', el: 'star' },      // Звёздный
    { cat: 'more', el: 'water' },       // Морской
    { cat: 'radug', el: 'light' },      // Радужка
    { cat: 'sekret', el: 'shadow' }     // СЕКРЕТ
  ];

  const EL = {
    fire: { a: '#ff7a2a', b: '#ffd84a', name: 'огонь' },
    ice: { a: '#9de8ff', b: '#ffffff', name: 'лёд' },
    spark: { a: '#ffe84a', b: '#fff9c0', name: 'молния' },
    shadow: { a: '#a05aff', b: '#ff5ad0', name: 'тьма' },
    star: { a: '#ffe8a0', b: '#ffffff', name: 'звёзды' },
    light: { a: '#7aff9a', b: '#ffffff', name: 'свет' },
    water: { a: '#3ab0f0', b: '#c0f0ff', name: 'вода' },
    earth: { a: '#c9a86a', b: '#ffe0a0', name: 'земля' }
  };

  function css(c) { return KM.cssColor(c); }

  class KeyArt {
    constructor(canvas) {
      this.cv = canvas;
      this.cx = canvas.getContext('2d');
      this.t = 0;
      this.sparks = [];
      this.bolts = [];
      this.meteors = [];
      this.heroes = this.pickHeroes();
      this.seed = 1234;
    }

    /** Берём тех котов, что есть в игре; недостающих заменяем. */
    pickHeroes() {
      const out = [];
      const all = KM.CATS || [];
      for (const h of HEROES) {
        const cat = KM.CAT_BY && KM.CAT_BY[h.cat];
        if (cat) out.push({ cat, el: h.el });
      }
      // добираем до восьми любыми яркими котами
      let i = 0;
      while (out.length < 8 && i < all.length) {
        const c = all[i++];
        if (!out.some(o => o.cat.id === c.id)) {
          const els = Object.keys(EL);
          out.push({ cat: c, el: els[out.length % els.length] });
        }
      }
      return out.slice(0, 8);
    }

    rnd() {
      this.seed = (this.seed * 1103515245 + 12345) & 0x7FFFFFFF;
      return this.seed / 0x7FFFFFFF;
    }

    resize() {
      const cv = this.cv;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = cv.clientWidth || 960, h = cv.clientHeight || 460;
      if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) {
        cv.width = Math.floor(w * dpr);
        cv.height = Math.floor(h * dpr);
      }
      this.W = cv.width; this.H = cv.height;
      this.S = this.H / 460;          // масштаб под высоту
    }

    // ------------------------------------------------------------
    //  КОТ ЦЕЛИКОМ, СБОКУ
    // ------------------------------------------------------------
    drawCat(pal, x, y, s, phase, el) {
      const c = this.cx;
      const P = (px, py, w, h, col) => {
        c.fillStyle = col;
        c.fillRect(Math.round(x + px * s), Math.round(y + py * s),
          Math.ceil(w * s), Math.ceil(h * s));
      };
      const fur = css(pal.fur), fur2 = css(pal.fur2), ear = css(pal.ear);
      const eye = css(pal.eye), nose = css(pal.nose), wh = css(pal.whisker);
      const hat = css(pal.hat), band = css(pal.hatBand), gem = css(pal.gem);
      const dark = '#241a33';

      const bob = Math.sin(phase) * 1.4;            // дышит
      const tw = Math.sin(phase * 1.3);             // хвост ходит
      const up = Math.sin(phase * 1.15) * 2.5;      // лапа с магией качается

      // ---------- хвост: дуга вверх за спиной ----------
      const T = [[-7, -13], [-9, -18], [-9, -24], [-7, -29], [-4, -32]];
      T.forEach((q, i) => {
        P(q[0] + tw * (0.4 + i * 0.35), q[1] + bob * 0.5, 4, 5, i > 2 ? fur2 : fur);
      });

      // ---------- лапы ----------
      P(0, -8, 5, 8, fur);
      P(6, -8, 5, 8, fur);
      P(12, -8, 5, 8, fur);
      P(0, -2, 5, 2, dark);
      P(12, -2, 5, 2, dark);

      // ---------- тело ----------
      P(-1, -24 + bob, 19, 17, fur);
      P(2, -15 + bob, 13, 8, fur2);

      // ---------- поднятая лапа тянется к шару ----------
      const uy = bob + up;
      P(15, -32 + uy, 5, 10, fur);        // плечо
      P(18, -38 + uy, 5, 7, fur);         // предплечье
      P(22, -46 + uy, 5, 8, fur);         // кисть
      P(23, -50 + uy, 4, 4, fur2);        // подушечки

      // ---------- голова ----------
      const hy = -44 + bob;
      P(2, hy, 18, 17, fur);
      P(1, hy + 5, 1, 7, fur);
      P(20, hy + 5, 1, 7, fur);
      P(6, hy + 10, 11, 7, fur2);

      // уши: ступенчатые треугольники
      P(2, hy - 4, 5, 4, fur); P(3, hy - 7, 3, 3, fur); P(4, hy - 9, 2, 2, fur);
      P(3, hy - 4, 3, 2, ear); P(4, hy - 6, 1, 2, ear);
      P(15, hy - 4, 5, 4, fur); P(16, hy - 7, 3, 3, fur); P(16, hy - 9, 2, 2, fur);
      P(16, hy - 4, 3, 2, ear); P(17, hy - 6, 1, 2, ear);

      // остроконечная шляпа мага
      P(1, hy - 6, 20, 2, band);
      P(3, hy - 11, 16, 5, hat);
      P(6, hy - 16, 10, 5, hat);
      P(9, hy - 20, 4, 4, hat);
      P(10, hy - 24, 2, 4, gem);

      // глаза — крупные, чтобы кот смотрел на игрока
      P(5, hy + 4, 4, 5, dark);
      P(13, hy + 4, 4, 5, dark);
      P(6, hy + 5, 3, 3, eye); P(6, hy + 5, 1, 1, '#fff');
      P(14, hy + 5, 3, 3, eye); P(14, hy + 5, 1, 1, '#fff');

      // нос, рот, усы
      P(10, hy + 11, 3, 2, nose);
      P(9, hy + 14, 2, 1, dark); P(12, hy + 14, 2, 1, dark);
      P(-3, hy + 9, 5, 1, wh); P(-3, hy + 12, 5, 1, wh);
      P(20, hy + 9, 5, 1, wh); P(20, hy + 12, 5, 1, wh);

      // ---------- магия: над лапой, в стороне от морды ----------
      const e = EL[el] || EL.fire;
      this.drawSpell(x + 27 * s, y + (-57 + bob + up) * s, s, e, phase);
    }

    /** Комок стихии над лапой. */
    drawSpell(x, y, s, e, phase) {
      const c = this.cx;
      const r = (8 + Math.sin(phase * 3) * 1.8) * s;
      const gr = c.createRadialGradient(x, y, 0, x, y, r * 2.4);
      gr.addColorStop(0, e.b);
      gr.addColorStop(0.35, e.a);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.85;
      c.fillStyle = gr;
      c.beginPath(); c.arc(x, y, r * 2.4, 0, 6.283); c.fill();
      c.globalAlpha = 1;
      // ядро квадратиками — как всё в игре
      c.fillStyle = e.b;
      c.fillRect(x - r * 0.5, y - r * 0.5, r, r);
      c.fillStyle = e.a;
      for (let i = 0; i < 4; i++) {
        const a = phase * 2 + i * 1.57;
        c.fillRect(x + Math.cos(a) * r * 1.5 - r * 0.22,
          y + Math.sin(a) * r * 1.5 - r * 0.22, r * 0.45, r * 0.45);
      }
    }

    // ------------------------------------------------------------
    //  КАДР
    // ------------------------------------------------------------
    draw(dt) {
      this.resize();
      const c = this.cx, W = this.W, H = this.H, S = this.S;
      this.t += dt;
      const t = this.t;

      // ---- небо ----
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#160a34');
      sky.addColorStop(0.45, '#3a1d6e');
      sky.addColorStop(1, '#7a4ec0');
      c.fillStyle = sky;
      c.fillRect(0, 0, W, H);

      // ---- луна ----
      const mx = W * 0.82, my = H * 0.2, mr = 44 * S;
      const mg = c.createRadialGradient(mx, my, 0, mx, my, mr * 3);
      mg.addColorStop(0, 'rgba(255,240,200,.55)');
      mg.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = mg;
      c.beginPath(); c.arc(mx, my, mr * 3, 0, 6.283); c.fill();
      c.fillStyle = '#fff4d0';
      c.fillRect(mx - mr / 2, my - mr / 2, mr, mr);

      // ---- звёзды ----
      this.seed = 20250825;
      for (let i = 0; i < 90; i++) {
        const sx = this.rnd() * W, sy = this.rnd() * H * 0.65;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + i));
        c.fillStyle = 'rgba(255,255,255,' + (tw * 0.8).toFixed(2) + ')';
        const q = (1 + this.rnd() * 2) * S;
        c.fillRect(sx, sy, q, q);
      }

      // ---- дальние горы ----
      c.fillStyle = '#2a1a52';
      for (let i = 0; i < 7; i++) {
        const bx = (i / 6) * W;
        const bh = (70 + ((i * 37) % 60)) * S;
        c.beginPath();
        c.moveTo(bx - 130 * S, H * 0.72);
        c.lineTo(bx, H * 0.72 - bh);
        c.lineTo(bx + 130 * S, H * 0.72);
        c.fill();
      }

      // ---- земля ----
      const gy = H * 0.72;
      c.fillStyle = '#1d1140';
      c.fillRect(0, gy, W, H - gy);
      c.fillStyle = '#2c1c5c';
      c.fillRect(0, gy, W, 10 * S);

      // ---- метеоры ----
      if (Math.random() < dt * 1.6) {
        this.meteors.push({ x: Math.random() * W, y: -30, v: 260 + Math.random() * 260, life: 3 });
      }
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.x += m.v * dt * 0.55; m.y += m.v * dt; m.life -= dt;
        if (m.y > gy || m.life <= 0) { this.meteors.splice(i, 1); continue; }
        c.strokeStyle = 'rgba(255,190,120,.75)';
        c.lineWidth = 3 * S;
        c.beginPath();
        c.moveTo(m.x, m.y);
        c.lineTo(m.x - 26 * S, m.y - 46 * S);
        c.stroke();
        c.fillStyle = '#ffd8a0';
        c.fillRect(m.x - 3 * S, m.y - 3 * S, 6 * S, 6 * S);
      }

      // ---- коты в ряд ----
      const n = this.heroes.length;
      const step = W / (n + 0.6);
      for (let i = 0; i < n; i++) {
        const h = this.heroes[i];
        const x = step * (i + 0.8) - 12 * S;
        const s = S * (1.75 + (i % 2 ? 0 : 0.22));
        const y = gy + (i % 2 ? 10 * S : 0);
        // сияние под ногами
        const e = EL[h.el] || EL.fire;
        const gl = c.createRadialGradient(x + 10 * s, y, 0, x + 10 * s, y, 46 * s);
        gl.addColorStop(0, e.a + 'aa');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gl;
        c.beginPath(); c.ellipse(x + 10 * s, y, 46 * s, 13 * s, 0, 0, 6.283); c.fill();
        this.drawCat(h.cat.pal, x, y, s, t * 2.2 + i * 0.9, h.el);
      }

      // ---- искры вокруг ----
      if (this.sparks.length < 70) {
        for (let k = 0; k < 3; k++) {
          const i = Math.floor(Math.random() * n);
          const e = EL[this.heroes[i].el] || EL.fire;
          this.sparks.push({
            x: step * (i + 0.8) + 38 * S, y: gy - 96 * S,
            vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 110,
            life: 1 + Math.random(), col: Math.random() < 0.5 ? e.a : e.b,
            s: (2 + Math.random() * 3) * S
          });
        }
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.life -= dt;
        if (p.life <= 0) { this.sparks.splice(i, 1); continue; }
        c.globalAlpha = Math.min(1, p.life);
        c.fillStyle = p.col;
        c.fillRect(p.x, p.y, p.s, p.s);
      }
      c.globalAlpha = 1;

      // ---- молнии между котами ----
      if (Math.random() < dt * 0.9 && n > 1) {
        const a = Math.floor(Math.random() * n);
        let b = Math.floor(Math.random() * n);
        if (b === a) b = (a + 1) % n;
        this.bolts.push({ a, b, life: 0.22 });
      }
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const bo = this.bolts[i];
        bo.life -= dt;
        if (bo.life <= 0) { this.bolts.splice(i, 1); continue; }
        const x1 = step * (bo.a + 0.8) + 38 * S, x2 = step * (bo.b + 0.8) + 38 * S;
        const y1 = gy - 98 * S, y2 = gy - 98 * S;
        c.strokeStyle = 'rgba(255,235,140,' + (bo.life * 4).toFixed(2) + ')';
        c.lineWidth = 3 * S;
        c.beginPath();
        c.moveTo(x1, y1);
        const steps = 6;
        for (let k = 1; k <= steps; k++) {
          const kk = k / steps;
          c.lineTo(x1 + (x2 - x1) * kk + (Math.random() - 0.5) * 26 * S,
            y1 + (y2 - y1) * kk + (Math.random() - 0.5) * 30 * S);
        }
        c.stroke();
      }

      // ---- лёгкая виньетка ----
      const vg = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(8,4,20,.75)');
      c.fillStyle = vg;
      c.fillRect(0, 0, W, H);
    }
  }

  KM.KeyArt = KeyArt;
  KM.KEYART_EL = EL;
})(window);
