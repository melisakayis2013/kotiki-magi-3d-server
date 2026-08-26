/* ============================================================
   КОТИКИ МАГИ 3D — ввод
   Используем event.code (физическая клавиша), поэтому русская
   и английская раскладки работают одинаково.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  class Input {
    constructor(canvas) {
      this.canvas = canvas;
      this.down = Object.create(null);      // code -> true
      this.pressed = Object.create(null);   // нажатие в этом кадре
      this.released = Object.create(null);
      this.mouse = { dx: 0, dy: 0, sx: 0.5, sy: 0.5, left: false, right: false, leftPressed: false, rightPressed: false, wheel: 0 };
      this.locked = false;
      this.enabled = true;
      this.sensitivity = 0.0022;
      this.invertY = false;
      this.camMode = 'lock';  // 'lock' — захват курсора, 'drag' — вращение правой кнопкой
      this._blocked = false;  // true, когда открыто меню

      const keyDown = (e) => {
        if (e.code === 'F5' || e.code === 'F12' || (e.ctrlKey && e.code === 'KeyR')) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
        if (e.repeat) return;
        this.down[e.code] = true;
        this.pressed[e.code] = true;
      };
      const keyUp = (e) => {
        this.down[e.code] = false;
        this.released[e.code] = true;
      };
      global.addEventListener('keydown', keyDown);
      global.addEventListener('keyup', keyUp);
      global.addEventListener('blur', () => { this.down = Object.create(null); this.mouse.left = this.mouse.right = false; });

      canvas.addEventListener('mousedown', (e) => {
        if (this._blocked) return;
        if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
        if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
        // в режиме «захват мыши» первый клик захватывает курсор;
        // в режиме «правая кнопка» курсор остаётся видимым
        if (this.camMode === 'lock' && !this.locked && this.enabled) this.requestLock();
      });
      global.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.left = false;
        if (e.button === 2) this.mouse.right = false;
      });
      // контекстное меню мешает вращать камеру правой кнопкой
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('contextmenu', (e) => { if (!this._blocked) e.preventDefault(); });
      canvas.addEventListener('wheel', (e) => {
        if (this._blocked) return;
        e.preventDefault();
        this.mouse.wheel += Math.sign(e.deltaY);
      }, { passive: false });

      global.addEventListener('mousemove', (e) => {
        if (this._blocked) return;
        // положение курсора в долях канваса — по нему целится магия
        if (!this.locked) {
          const r = this.canvas.getBoundingClientRect();
          this.mouse.sx = (e.clientX - r.left) / Math.max(1, r.width);
          this.mouse.sy = (e.clientY - r.top) / Math.max(1, r.height);
        } else { this.mouse.sx = 0.5; this.mouse.sy = 0.5; }
        // камера вращается либо при захваченном курсоре,
        // либо при удержании ПРАВОЙ кнопки мыши
        if (!this.locked && !this.mouse.right) return;
        this.mouse.dx += e.movementX || 0;
        this.mouse.dy += (this.invertY ? -1 : 1) * (e.movementY || 0);
      });

      document.addEventListener('pointerlockchange', () => {
        this.locked = document.pointerLockElement === canvas;
        if (this.onLockChange) this.onLockChange(this.locked);
      });
    }

    setBlocked(v) { this._blocked = v; }
    requestLock() {
      if (this._blocked) return;
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { });
    }
    exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

    isDown(code) { return !this._blocked && !!this.down[code]; }
    justPressed(code) { return !!this.pressed[code]; }
    anyDown(codes) { for (const c of codes) if (this.isDown(c)) return true; return false; }

    /** Вызывать в конце кадра. */
    endFrame() {
      this.pressed = Object.create(null);
      this.released = Object.create(null);
      this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
      this.mouse.leftPressed = false; this.mouse.rightPressed = false;
    }
  }

  KM.Input = Input;
})(window);
