/* ============================================================
   КОТИКИ МАГИ 3D — на чём играем

   Игрок сам выбирает устройство при создании аккаунта или входе.
   Компьютер — всё как было. Телефон и планшет — крупный интерфейс
   и сенсорное управление вместо клавиатуры.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const STORE = 'kmagi_device';

  const KINDS = [
    {
      id: 'pc', name: 'Компьютер', icon: '💻',
      desc: 'Клавиатура и мышь. Всё как обычно.',
      touch: false, hudScale: 100, pixel: 3
    },
    {
      id: 'tablet', name: 'Планшет', icon: '📱',
      desc: 'Экранные кнопки под палец, панели компактнее.',
      touch: true, hudScale: 92, pixel: 3
    },
    {
      id: 'phone', name: 'Телефон', icon: '📲',
      desc: 'Джойстик под большим пальцем, мелкие панели, ничего лишнего.',
      touch: true, hudScale: 72, pixel: 4
    }
  ];
  const BY = {};
  KINDS.forEach(k => { BY[k.id] = k; });

  /** На чём игрок скорее всего сидит — чтобы подставить вариант по умолчанию. */
  function guess() {
    const t = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in global;
    const w = Math.min(global.screen.width || 1920, global.screen.height || 1080);
    const ua = String(navigator.userAgent || '');
    const phoneUA = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua);
    const tabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    if (phoneUA) return 'phone';
    if (tabletUA) return 'tablet';
    if (t && w <= 500) return 'phone';
    if (t && w <= 900) return 'tablet';
    return 'pc';
  }

  const Device = {
    KINDS, BY,
    guess,

    /** Что выбрано сейчас (устройство запоминается отдельно от аккаунта). */
    get() {
      let id = null;
      try { id = global.localStorage.getItem(STORE); } catch (e) { }
      return BY[id] ? id : null;
    },

    kind() { return BY[this.get() || guess()] || BY.pc; },
    isTouch() { return !!this.kind().touch; },
    isPhone() { return this.kind().id === 'phone'; },

    set(id) {
      if (!BY[id]) return false;
      try { global.localStorage.setItem(STORE, id); } catch (e) { }
      this.apply(id);
      return true;
    },

    /** Разложить интерфейс под устройство. */
    apply(id) {
      const k = BY[id || this.get() || guess()] || BY.pc;
      const b = document.body;
      b.dataset.device = k.id;
      b.classList.toggle('touch-mode', !!k.touch);
      if (this.onChange) this.onChange(k);
      return k;
    },

    /** Настройки игры, которые стоит подкрутить под устройство. */
    tune(settings, id) {
      const k = BY[id || this.get() || guess()] || BY.pc;
      const s = Object.assign({}, settings);
      s.hudScale = k.hudScale;
      s.pixel = Math.max(s.pixel || 3, k.pixel);
      if (k.touch) {
        s.camMode = 'drag';        // захват курсора на сенсоре не работает
        s.spellCount = 1;
        s.abilCount = 2;
        s.showFps = false;
      }
      return s;
    },

    name(id) { const k = BY[id]; return k ? k.icon + ' ' + k.name : '💻 Компьютер'; },

    // ------------------------------------------------------------
    //  ГОРИЗОНТАЛЬНЫЙ ЭКРАН
    // ------------------------------------------------------------
    /** Телефон стоит вертикально? Тогда играть неудобно. */
    isPortrait() {
      if (!this.isTouch()) return false;
      const w = global.innerWidth, h = global.innerHeight;
      return h > w * 1.05;
    },

    /** Развернуть на весь экран и попросить альбомную ориентацию. */
    goFullscreen() {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      const done = () => {
        const so = global.screen && global.screen.orientation;
        if (so && so.lock) { try { so.lock('landscape').catch(() => { }); } catch (e) { } }
      };
      if (req && !document.fullscreenElement) {
        const p = req.call(el);
        if (p && p.then) p.then(done).catch(() => { }); else done();
      } else done();
    },

    /** Показать или спрятать просьбу повернуть телефон. */
    checkRotate(playing) {
      const box = document.getElementById('rotate');
      if (!box) return;
      const show = !!playing && this.isPortrait();
      box.classList.toggle('show', show);
    }
  };

  KM.DEVICE = Device;
})(window);
