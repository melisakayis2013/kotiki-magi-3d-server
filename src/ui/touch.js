/* ============================================================
   КОТИКИ МАГИ 3D — сенсорное управление

   Все касания превращаются в те же самые нажатия, что и с
   клавиатуры: джойстик даёт направление, кнопки «нажимают»
   пробел, Shift, T и прочее. Поэтому остальной игре всё равно,
   играют с телефона или с компьютера.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const $ = (s) => document.querySelector(s);

  // кнопка → клавиша, которую она изображает
  // Главные кнопки всегда под большим пальцем, редкие — в ящичке.
  const MAIN = [
    { act: 'claw', code: null, icon: '🐾', label: 'лапой', big: true },
    { act: 'magic', code: 'KeyT', icon: '✨', label: 'магия', big: true },
    { act: 'jump', code: 'Space', icon: '🦘', label: 'прыжок', big: true },
    { act: 'dash', code: 'ShiftLeft', icon: '💨', label: 'рывок', hold: true },
    { act: 'take', code: 'KeyK', icon: '🖐', label: 'взять' }
  ];
  const MORE = [
    { act: 'next', code: 'Tab', icon: '🔄', label: 'заклинание' },
    { act: 'eat', code: 'KeyR', icon: '🍖', label: 'еда' },
    { act: 'rest', code: 'KeyF', icon: '😴', label: 'отдых', hold: true },
    { act: 'faster', code: 'KeyE', icon: '⏫', label: 'быстрее' },
    { act: 'slower', code: 'KeyQ', icon: '⏬', label: 'медленнее' },
    { act: 'view', code: 'KeyV', icon: '👁', label: 'вид' },
    { act: 'bag', code: 'KeyI', icon: '🎒', label: 'сумка' },
    { act: 'map', code: 'KeyM', icon: '🗺', label: 'карта' },
    { act: 'emote', code: 'KeyY', icon: '🐾', label: 'выходки' }
  ];
  const BUTTONS = MAIN.concat(MORE);

  class Touch {
    constructor(game) {
      this.game = game;
      this.input = game.input;
      this.root = $('#touch');
      this.stick = $('#touch-stick');
      this.knob = $('#touch-knob');
      this.pads = $('#touch-pads');
      this.enabled = false;

      this.moveId = null;       // палец на джойстике
      this.lookId = null;       // палец, крутящий камеру
      this.lookX = 0; this.lookY = 0;
      this.lookMoved = 0;
      this.origin = { x: 0, y: 0 };

      this.buildButtons();
      this.bindStick();
      this.bindLook();

      // ось движения читает игрок вместо WASD
      this.input.axis = { x: 0, z: 0 };
    }

    // ---------- кнопки действий ----------
    buildButtons() {
      this.pads.innerHTML = '';
      const more = document.createElement('div');
      more.className = 'tmore';
      const toggle = document.createElement('button');
      toggle.className = 'tpad tmore-btn';
      toggle.innerHTML = '<span class="ic">⋯</span><span class="lb">ещё</span>';
      toggle.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        more.classList.toggle('open');
        toggle.classList.toggle('on', more.classList.contains('open'));
      });

      for (const b of BUTTONS) {
        const el = document.createElement('button');
        el.className = 'tpad' + (b.big ? ' big' : '') + ' t-' + b.act;
        el.innerHTML = '<span class="ic">' + b.icon + '</span><span class="lb">' + b.label + '</span>';
        el.dataset.act = 'touch-' + b.act;

        const press = (e) => {
          e.preventDefault(); e.stopPropagation();
          el.classList.add('on');
          this.fire(b, true);
        };
        const release = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          el.classList.remove('on');
          this.fire(b, false);
        };
        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', (e) => { if (b.hold) release(e); });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        (MAIN.indexOf(b) >= 0 ? this.pads : more).appendChild(el);
      }
      this.pads.appendChild(toggle);
      this.pads.appendChild(more);
    }

    /** Нажать или отпустить то, что изображает кнопка. */
    fire(b, down) {
      const inp = this.input;
      if (b.act === 'claw') {
        if (down) { inp.mouse.left = true; inp.mouse.leftPressed = true; }
        else inp.mouse.left = false;
        return;
      }
      if (!b.code) return;
      if (down) { inp.down[b.code] = true; inp.pressed[b.code] = true; }
      else { inp.down[b.code] = false; inp.released[b.code] = true; }
      // одиночные нажатия сами отпускаются на следующем кадре
      if (down && !b.hold) {
        setTimeout(() => { inp.down[b.code] = false; }, 60);
      }
    }

    // ---------- джойстик ----------
    bindStick() {
      const R = 58;   // радиус, дальше которого палец не тянет
      const set = (dx, dy) => {
        const d = Math.hypot(dx, dy);
        const k = d > R ? R / d : 1;
        const kx = dx * k, ky = dy * k;
        this.knob.style.transform = 'translate(' + kx + 'px,' + ky + 'px)';
        // мёртвая зона, чтобы кот не дёргался от дрожи пальца
        const dead = 10;
        const m = Math.max(0, (d - dead) / (R - dead));
        const n = d > 0.01 ? m / d : 0;
        this.input.axis.x = kx * n;
        this.input.axis.z = -ky * n;      // вверх по экрану — вперёд
      };
      const reset = () => {
        this.moveId = null;
        this.knob.style.transform = '';
        this.input.axis.x = 0; this.input.axis.z = 0;
      };

      this.stick.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.moveId = e.pointerId;
        const r = this.stick.getBoundingClientRect();
        this.origin.x = r.left + r.width / 2;
        this.origin.y = r.top + r.height / 2;
        this.stick.setPointerCapture(e.pointerId);
        set(e.clientX - this.origin.x, e.clientY - this.origin.y);
      });
      this.stick.addEventListener('pointermove', (e) => {
        if (this.moveId !== e.pointerId) return;
        e.preventDefault();
        set(e.clientX - this.origin.x, e.clientY - this.origin.y);
      });
      const up = (e) => { if (this.moveId === e.pointerId) reset(); };
      this.stick.addEventListener('pointerup', up);
      this.stick.addEventListener('pointercancel', up);
    }

    // ---------- камера и прицел ----------
    bindLook() {
      const zone = $('#touch-look');
      zone.addEventListener('pointerdown', (e) => {
        if (this.lookId !== null) return;
        e.preventDefault();
        this.lookId = e.pointerId;
        this.lookX = e.clientX; this.lookY = e.clientY;
        this.lookMoved = 0;
        zone.setPointerCapture(e.pointerId);
        this.aimAt(e);
      });
      zone.addEventListener('pointermove', (e) => {
        if (this.lookId !== e.pointerId) return;
        e.preventDefault();
        const dx = e.clientX - this.lookX, dy = e.clientY - this.lookY;
        this.lookX = e.clientX; this.lookY = e.clientY;
        this.lookMoved += Math.abs(dx) + Math.abs(dy);
        // на сенсоре палец водит камеру мягче, чем мышь
        this.input.mouse.dx += dx * 1.5;
        this.input.mouse.dy += (this.input.invertY ? -1.5 : 1.5) * dy;
        this.aimAt(e);
      });
      const up = (e) => {
        if (this.lookId !== e.pointerId) return;
        this.lookId = null;
        // короткое касание без ведения = прицел, а не поворот камеры
        if (this.lookMoved < 12) this.aimAt(e);
      };
      zone.addEventListener('pointerup', up);
      zone.addEventListener('pointercancel', up);
      zone.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /** Куда ткнули — туда и полетит магия. */
    aimAt(e) {
      const c = this.game.renderer.canvas || document.getElementById('gl');
      const r = c.getBoundingClientRect();
      this.input.mouse.sx = (e.clientX - r.left) / Math.max(1, r.width);
      this.input.mouse.sy = (e.clientY - r.top) / Math.max(1, r.height);
    }

    // ---------- показ ----------
    setEnabled(v) {
      this.enabled = !!v;
      this.root.classList.toggle('hidden', !this.enabled);
      if (!this.enabled) {
        this.input.axis.x = 0; this.input.axis.z = 0;
        this.knob.style.transform = '';
      }
    }

    /**
     * Показывать пульт только во время игры и только на сенсоре.
     * Пока открыт любой экран — меню, магазин, пауза — пульт убран:
     * иначе прозрачная зона поворота камеры съедала бы нажатия по кнопкам.
     */
    sync() {
      const g = this.game;
      const menuOpen = !g.ui || g.ui.current !== 'none';
      const on = KM.DEVICE.isTouch() && g.mode === 'playing' && !!g.level && !menuOpen;
      if (on !== this.enabled) this.setEnabled(on);
    }
  }

  KM.Touch = Touch;
})(window);
