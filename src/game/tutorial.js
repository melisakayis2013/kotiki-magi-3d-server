/* ============================================================
   КОТИКИ МАГИ 3D — обучение
   Подсказки появляются от действий игрока и ведут стрелками
   к нужным целям. Заканчивается на 5-м уровне.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const M4 = KM.M4;

  const END_LEVEL = 5;

  /**
   * Шаги обучения. Каждый показывается один раз.
   * check(g) — когда показать; done(g) — когда считать пройденным;
   * target(g) — куда указывать стрелкой (мировая точка) или null.
   */
  const STEPS = [
    {
      id: 'move', title: 'Первые шаги',
      text: 'Нажимайте <b>W A S D</b>, чтобы ходить. Держите <b>правую кнопку мыши</b> и ведите мышь — так крутится камера.',
      check: (g) => g.mode === 'playing' && g.levelTime > 1.2,
      done: (g) => g.tut.moved > 5
    },
    {
      id: 'camera', title: 'Осмотрись',
      text: 'Кот поворачивается только от клавиш движения. Камера ходит сама по себе — покрутите её правой кнопкой.',
      check: (g) => g.tut.step > 0,
      done: (g) => g.tut.looked > 2.5
    },
    {
      id: 'speed', title: 'Три скорости',
      text: '<b>E</b> — быстрее, <b>Q</b> — медленнее. На бегу тратится энергия. <b>Shift</b> — рывок вперёд.',
      check: (g) => g.tut.step > 1,
      done: (g) => g.tut.speedChanged
    },
    {
      id: 'jump', title: 'Прыжок',
      text: 'Пробел — прыжок. Нажмите ещё раз в воздухе — кот сделает <b>сальто</b>, и ещё раз — третий прыжок!',
      check: (g) => g.tut.step > 2,
      done: (g) => g.tut.jumped
    },
    {
      id: 'monster', title: 'Первый враг',
      text: 'Видите монстра? Бейте <b>левой кнопкой</b> вблизи или жмите <b>обе кнопки мыши</b> для магии. ' +
        'Магия летит туда, куда наведён курсор.',
      check: (g) => g.tut.step > 3,
      done: (g) => g.tut.killed > 0,
      target: (g) => {
        let best = null, bd = 1e9;
        for (const m of g.monsters) {
          if (!m.alive) continue;
          const d = U.dist2(m.x, m.z, g.player.x, g.player.z);
          if (d < bd) { bd = d; best = m; }
        }
        return best ? { x: best.x, y: best.y + best.height + 0.6, z: best.z } : null;
      }
    },
    {
      id: 'spell', title: 'Смена заклинания',
      text: 'Внизу экрана — квадратик с текущим заклинанием. Листайте стрелками <b>◀ ▶</b>, колесом мыши ' +
        'или клавишами <b>1…0</b>. У каждой магии своя стихия и свой след на земле.',
      check: (g) => g.tut.step > 4,
      done: (g) => g.tut.spellSwitched
    },
    {
      id: 'chest', title: 'Сундук',
      text: 'Подойдите к сундуку и нажмите <b>K</b>. В сундуках лежат монеты, еда и <b>ключи от клеток</b>.',
      check: (g) => g.tut.step > 5 && g.level && g.level.chests.some(c => !c.opened),
      done: (g) => g.tut.chestOpened,
      target: (g) => {
        const c = g.level && g.level.chests.find(x => !x.opened);
        return c ? { x: c.x, y: c.y + 1.2, z: c.z } : null;
      }
    },
    {
      id: 'bush', title: 'Прятки',
      text: 'Зайдите в <b>куст</b> и двигайтесь медленно — монстры перестанут вас замечать и потеряют след.',
      check: (g) => g.tut.step > 6 && g.level && g.level.bushes.length > 0,
      done: (g) => g.tut.hid,
      target: (g) => {
        if (!g.level) return null;
        let best = null, bd = 1e9;
        for (const b of g.level.bushes) {
          const d = U.dist2(b.x, b.z, g.player.x, g.player.z);
          if (d < bd) { bd = d; best = b; }
        }
        return best ? { x: best.x, y: best.y + 1.4, z: best.z } : null;
      }
    },
    {
      id: 'rest', title: 'Отдых',
      text: 'Кончилась энергия? Нажмите <b>F</b> — кот сядет, замурлычет и восстановит силы. ' +
        '<b>R</b> — съесть еду из сумки, <b>I</b> — открыть сумку.',
      check: (g) => g.tut.step > 7,
      done: (g) => g.tut.rested > 1.5
    },
    {
      id: 'portal', title: 'Дальше!',
      text: 'Победите <b>всех монстров</b> — и портал проснётся. Если есть клетки с котами-магами, ' +
        'сначала освободите всех. Потом идите к порталу и нажмите <b>K</b>.',
      check: (g) => g.tut.step > 8,
      done: (g) => g.tut.finished,
      target: (g) => {
        const p = g.level && g.level.portal;
        return p ? { x: p.x, y: p.y + 3.2, z: p.z } : null;
      }
    },
    {
      id: 'shop', title: 'Растём',
      text: 'За монеты в <b>Магазине</b> покупают заклинания и способности, в <b>Навыках</b> тратят очки уровня, ' +
        'а на <b>Колесе удачи</b> ловят редких котов. Обучение закончится на 5-м уровне.',
      check: (g) => g.tut.step > 9,
      done: (g) => g.state.data.level >= 2
    }
  ];

  class Tutorial {
    constructor(game) {
      this.game = game;
      this.reset();
      this.el = document.getElementById('tut');
      this.cardEl = null;
      this.shownAt = 0;
    }

    reset() {
      this.step = 0;
      this.moved = 0; this.looked = 0; this.rested = 0;
      this.killed = 0;
      this.speedChanged = false; this.jumped = false; this.spellSwitched = false;
      this.chestOpened = false; this.hid = false; this.finished = false;
      this.active = false;
      this.current = null;
      this.arrow = null;
    }

    get data() {
      const d = this.game.state.data;
      if (!d.tutorial) d.tutorial = { done: false, step: 0 };
      return d.tutorial;
    }

    /** Обучение идёт, пока игрок не достиг 5-го уровня. */
    get enabled() {
      const d = this.data;
      if (d.done) return false;
      if (this.game.state.data.level >= END_LEVEL) { this.complete(); return false; }
      return true;
    }

    complete() {
      const d = this.data;
      if (d.done) return;
      d.done = true;
      this.game.state.save();
      this.hide();
      this.game.ui.bigMessage('🎓 Обучение пройдено!', 'Дальше — только приключения');
      this.game.audio.jingle('victory');
    }

    /** Событие от игры. */
    event(name, value) {
      if (!this.enabled) return;
      switch (name) {
        case 'move': this.moved += value || 0; break;
        case 'look': this.looked += value || 0; break;
        case 'rest': this.rested += value || 0; break;
        case 'speed': this.speedChanged = true; break;
        case 'jump': this.jumped = true; break;
        case 'kill': this.killed++; break;
        case 'spell': this.spellSwitched = true; break;
        case 'chest': this.chestOpened = true; break;
        case 'hide': this.hid = true; break;
        case 'finish': this.finished = true; break;
      }
    }

    update(dt) {
      const g = this.game;
      g.tut = this;
      if (!this.enabled || g.mode !== 'playing') { this.hide(); return; }

      // текущий шаг пройден?
      if (this.current && this.current.done(g)) {
        this.game.audio.sfx('pickup');
        this.step++;
        this.data.step = this.step;
        this.current = null;
        this.hide();
        this.nextAt = g.time + 0.9;
        g.state.save();
        return;
      }
      if (this.current) { this.updateArrow(); return; }

      if (this.nextAt && g.time < this.nextAt) return;
      const s = STEPS[this.step];
      if (!s) { this.complete(); return; }
      if (!s.check(g)) return;
      this.current = s;
      this.show(s);
    }

    show(s) {
      if (!this.el) this.el = document.getElementById('tut');
      if (!this.el) return;
      this.el.innerHTML =
        '<div class="tut-card"><h4>🐾 ' + s.title + '</h4><p>' + s.text + '</p>' +
        '<div class="go">Шаг ' + (this.step + 1) + ' из ' + STEPS.length + '</div></div>';
      this.cardEl = this.el.querySelector('.tut-card');
      this.arrow = null;
      this.game.audio.sfx('ui');
    }

    hide() {
      if (this.el && this.el.innerHTML) this.el.innerHTML = '';
      this.cardEl = null; this.arrow = null;
    }

    /** Стрелка-указатель к цели шага. */
    updateArrow() {
      const s = this.current, g = this.game;
      if (!s || !s.target || !this.el) return;
      const pt = s.target(g);
      if (!pt) { if (this.arrow) { this.arrow.remove(); this.arrow = null; } return; }
      if (!this.arrow) {
        this.arrow = document.createElement('div');
        this.arrow.className = 'tut-arrow';
        this.arrow.textContent = '⬇';
        this.el.appendChild(this.arrow);
      }
      const out = this._p || (this._p = [0, 0, 0]);
      M4.project(g.renderer.viewProj, pt.x, pt.y, pt.z, out);
      const W = g.overlay.clientWidth, H = g.overlay.clientHeight;
      if (out[2]) {
        const sx = (out[0] * 0.5 + 0.5) * W, sy = (1 - (out[1] * 0.5 + 0.5)) * H;
        if (sx > 10 && sx < W - 10 && sy > 10 && sy < H - 10) {
          this.arrow.style.left = sx + 'px';
          this.arrow.style.top = sy + 'px';
          this.arrow.textContent = '⬇';
          return;
        }
      }
      // цель за кадром — рисуем стрелку у края экрана в её сторону
      const dx = pt.x - g.player.x, dz = pt.z - g.player.z;
      const rel = Math.atan2(dx, dz) - (g.player.yaw + Math.PI);
      const ex = W / 2 + Math.sin(rel) * (W * 0.36);
      const ey = H / 2 - Math.cos(rel) * (H * 0.30);
      this.arrow.style.left = U.clamp(ex, 30, W - 30) + 'px';
      this.arrow.style.top = U.clamp(ey, 30, H - 30) + 'px';
      this.arrow.textContent = ['⬆', '↗', '➡', '↘', '⬇', '↙', '⬅', '↖'][
        (Math.round(rel / (Math.PI / 4)) + 8) % 8];
    }
  }

  KM.Tutorial = Tutorial;
  KM.TUT_STEPS = STEPS;
  KM.TUT_END_LEVEL = END_LEVEL;
})(window);
