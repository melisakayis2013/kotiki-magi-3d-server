/* ============================================================
   КОТИКИ МАГИ 3D — точка входа
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  function fatal(msg) {
    const f = document.getElementById('fatal');
    if (!f) return;
    f.classList.remove('hidden');
    f.innerHTML = '<div><b>Игра не смогла запуститься 😿</b><br>' +
      '<span style="opacity:.8;font-size:.9em">' + msg + '</span>' +
      '<br><br>Чаще всего помогает одно из двух:' +
      '<br>• открыть игру в <b>Chrome</b>, <b>Edge</b> или <b>Safari</b> посвежее;' +
      '<br>• обновить браузер — игре нужен <b>WebGL2</b>, а в старых его нет.' +
      '<br><br><i>Если экран просто чёрный — покажите эту надпись тому, ' +
      'кто прислал игру.</i></div>';
  }

  /**
   * Любая ошибка должна быть видна словами.
   *
   * Раньше поломка после запуска оставляла пустой экран: человек видел,
   * что «игра открылась и пропала», и понять причину было невозможно.
   * Теперь любая ошибка — хоть при загрузке, хоть в середине игры —
   * показывается на экране.
   */
  function ловитьОшибки() {
    let показали = false;
    const показать = (что) => {
      if (показали) return;
      показали = true;
      try { fatal(String(что || 'неизвестная ошибка')); } catch (e) { }
    };
    global.addEventListener('error', (e) => {
      // ошибки загрузки картинок и прочей мелочи не считаем смертельными
      if (e && e.target && e.target !== global) return;
      показать(e && e.message);
    });
    global.addEventListener('unhandledrejection', (e) => {
      показать(e && e.reason && (e.reason.message || e.reason));
    });
  }
  ловитьОшибки();

  function boot() {
    const canvas = document.getElementById('gl');
    const overlay = document.getElementById('fx');
    let game;
    try {
      if (KM.DEVICE) KM.DEVICE.apply();
      game = new KM.Game(canvas, overlay);
      game.showMinimap = true;
      game.ui = new KM.UI(game);
      game.tutorial = new KM.Tutorial(game);
      if (KM.Chat) game.chat = new KM.Chat(game);
      // Язык: что выбрал игрок, а если не выбирал — язык устройства.
      if (KM.I18N) {
        KM.I18N.load();
        document.documentElement.lang = KM.I18N.lang;
      }

      if (KM.Touch) game.touch = new KM.Touch(game);
      if (game.net) {
        game.net.onChange = () => {
          if (game.ui.current === 'server') game.ui.buildServer();
          if (game.ui.current === 'mode') game.ui.buildMode();
          if (game.ui.current === 'servers' && !game.ui.srvEditing) game.ui.buildServers();
          if (game.ui.current === 'talk') game.ui.buildTalk();
          game.ui.netDot();
          game.ui.netDot('#net-dot2');
          game.ui.updateNetBadge();
          game.ui.updateMailBadge();
          if (game.ui.whoOpen) game.ui.buildWho();
        };
        if (game.net.available() && game.net.ready()) game.net.connect();
      }
      game.tut = game.tutorial;
      game.player.applyStats();
      global.KMGAME = game;
    } catch (e) {
      console.error(e);
      fatal(String(e && e.message ? e.message : e));
      return;
    }

    // разблокировка звука по первому действию
    const unlock = () => {
      game.audio.ensure();
      // музыка стартует после первого действия пользователя (требование браузеров)
      // на заставке звучит своя тема — не перебиваем её музыкой меню
      if (game.ui && game.ui.current === 'intro') game.audio.startMusic('intro');
      else if (game.mode === 'menu') game.audio.startMusic('menu');
      else if (game.level) game.audio.startMusic(game.level.info.isBoss ? 'boss' : game.level.biome.track);
    };
    global.addEventListener('pointerdown', unlock, { once: true });
    global.addEventListener('keydown', unlock, { once: true });

    // возвращаем управление, когда мышь освободилась в игре
    game.input.onLockChange = (locked) => {
      if (!locked && game.mode === 'playing') game.ui.pause();
    };

    const fpsEl = document.getElementById('fps');
    if (game.state.data.settings.showFps) fpsEl.classList.remove('hidden');

    let last = performance.now();
    let acc = 0, frames = 0;

    function frame(now) {
      requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;      // защита от «скачков» после сворачивания
      if (dt <= 0) dt = 1 / 60;

      try {
        if (game.ui && game.ui.updateArt) game.ui.updateArt(dt);
      game.update(dt);
        game.render();
      } catch (e) {
        console.error(e);
        game.ui.fatal(e);
        return;
      }
      game.input.endFrame();

      acc += dt; frames++;
      if (acc >= 0.5) {
        const fps = Math.round(frames / acc);
        acc = 0; frames = 0;
        if (game.state.data.settings.showFps) {
          fpsEl.classList.remove('hidden');
          fpsEl.textContent = fps + ' FPS · ' + game.renderer.rw + '×' + game.renderer.rh;
        } else fpsEl.classList.add('hidden');
      }
    }
    requestAnimationFrame(frame);

    // автосохранение
    setInterval(() => { if (game.state) game.state.save(); }, 20000);
    global.addEventListener('beforeunload', () => game.state.save());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
