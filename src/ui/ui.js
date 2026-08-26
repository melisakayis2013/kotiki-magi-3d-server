/* ============================================================
   КОТИКИ МАГИ 3D — интерфейс
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const U = KM.U;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  /** Праздничная скидка на неделе дня рождения. */
  function px(n) {
    if (!n) return n;
    const A = KM.ACCOUNT, acc = A && A.current();
    if (acc && A.isBirthdayWeek(acc)) return Math.max(1, Math.round(n * 0.7));
    return n;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return m + ':' + String(ss).padStart(2, '0');
  }

  /** <details> с заголовком — прячем редкие настройки. */
  function more_summary(box, text) {
    const sm = document.createElement('summary');
    sm.textContent = text;
    box.appendChild(sm);
  }

  class UI {
    constructor(game) {
      this.game = game;
      this.state = game.state;
      this.current = 'menu';
      this.shopTab = 'items';
      this.petPick = null;
      this._cache = {};
      this.minimap = true;
      this.bind();
      this.initBars();
      this.showIntro();
    }

    // ============================================================
    //  НАВИГАЦИЯ
    // ============================================================
    show(name) {
      $$('.screen').forEach(s => s.classList.remove('active'));
      const map = {
        menu: '#scr-menu', locations: '#scr-locations', shop: '#scr-shop', pets: '#scr-pets',
        skills: '#scr-skills', cats: '#scr-cats', inv: '#scr-inv', settings: '#scr-settings',
        help: '#scr-help', pause: '#scr-pause', win: '#scr-win', lose: '#scr-lose',
        gacha: '#scr-gacha', slots: '#scr-slots',
        login: '#scr-login', signup: '#scr-signup',
        profile: '#scr-profile', birthday: '#scr-birthday', code: '#scr-code',
        match: '#scr-match', intro: '#scr-intro', direct: '#scr-direct',
        servers: '#scr-servers', talk: '#scr-talk', edit: '#scr-edit',
        server: '#scr-server', mode: '#scr-mode',
        loading: '#scr-loading', none: null
      };
      this.current = name;
      const sel = map[name];
      if (sel) $(sel).classList.add('active');

      const inGame = this.game.mode === 'playing' || this.game.mode === 'paused';
      const blocked = name !== 'none';
      this.game.input.setBlocked(blocked);
      if (blocked) this.game.input.exitLock();

      if (name === 'menu' && this.game.audio.ctx) this.game.audio.startMusic('menu');

      switch (name) {
        case 'menu': this.buildMenu(); break;
        case 'locations': this.buildLocations(); break;
        case 'shop': this.buildShop(); break;
        case 'pets': this.buildPets(); break;
        case 'skills': this.buildSkills(); break;
        case 'cats': this.buildCats(); break;
        case 'inv': this.buildInventory(); break;
        case 'settings': this.buildSettings(); break;
        case 'help': this.buildHelp(); break;
        case 'gacha': this.buildGacha(); break;
        case 'slots': this.buildSlots(); break;
        case 'login': this.buildLogin(); break;
        case 'signup': this.buildSignup(); break;
        case 'profile': this.buildProfile(); break;
        case 'birthday': this.buildBirthday(); break;
        case 'code': this.buildCode(); break;
        case 'server': this.buildServer(); break;
        case 'servers': this.buildServers(); break;
        case 'talk': this.buildTalk(); break;
        case 'edit': this.buildEditProfile(); break;
        case 'direct': this.buildDirect(); break;
        case 'mode': this.buildMode(); break;
      }
      // 3D-предпросмотр персонажа держим только на экране котов
      if (name !== 'cats' && this.game.showcase &&
        !(this.prizeQueue && this.prizeQueue.length)) this.game.clearShowcase();
      this.refreshCoins();
      // экран нарисован — теперь переводим то, что знаем
      if (KM.I18N) KM.I18N.applyAll();
    }

    back() {
      this.game.audio.sfx('ui');
      if (this.game.mode === 'paused') this.show('pause');
      else this.show('menu');
    }

    resume() {
      this.game.audio.sfx('ui');
      this.game.mode = 'playing';
      this.show('none');
      this.game.input.setBlocked(false);
      if (this.game.input.camMode === 'lock') this.game.input.requestLock();
      this.updateHud();
      this.updateSpellBar();
    }

    pause() {
      if (this.game.mode !== 'playing') return;
      this.game.mode = 'paused';
      this.game.audio.sfx('ui');
      this.show('pause');
    }

    bind() {
      const g = this.game;

      // Палец против мыши. Иногда мобильный браузер «проглатывает» click —
      // например, если что-то рядом перехватило нажатие. Поэтому на сенсоре
      // считаем нажатием отпускание пальца, а следующий click пропускаем,
      // чтобы кнопка не сработала дважды.
      const отПальца = (цель) => {
        const b = цель && цель.closest && цель.closest('[data-act]');
        if (!b || b.disabled) return;
        if (this._tapped === b) return;          // уже сработало
        this._tapped = b;
        setTimeout(() => { if (this._tapped === b) this._tapped = null; }, 700);
        this.doAct(b);
      };

      document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse') return;
        отПальца(e.target);
      }, true);

      // Запасной путь для браузеров постарше: там современных «указателей»
      // может не быть вовсе, и кнопки просто не нажимались бы. Повторное
      // срабатывание не страшно — его ловит та же пометка _tapped.
      document.addEventListener('touchend', (e) => {
        const t = e.changedTouches && e.changedTouches[0];
        const цель = t ? document.elementFromPoint(t.clientX, t.clientY) : e.target;
        отПальца(цель);
      }, true);

      document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (this._tapped === b) { this._tapped = null; return; }  // уже сработало от пальца
        this.doAct(b);
      });

      this.bindRest();

      // Сменили язык — перерисовываем экран целиком. Иначе к русскому
      // не вернуться: перевод накладывается поверх уже готового текста.
      if (KM.I18N) {
        KM.I18N.onChange = () => {
          const был = this.current;
          this.show(был === 'none' ? 'none' : был);
          if (был === 'none') { this.updateHud(); KM.I18N.applyAll(); }
        };
      }
    }

    /** Что делает кнопка. Общий путь и для мыши, и для пальца. */
    doAct(b) {
      const g = this.game;
      {
        const act = b.dataset.act;
        g.audio.ensure();
        switch (act) {
          case 'play': g.audio.sfx('ui'); this.show('locations'); break;
          case 'shop': g.audio.sfx('ui'); this.show('shop'); break;
          case 'pets': g.audio.sfx('ui'); this.show('pets'); break;
          case 'skills': g.audio.sfx('ui'); this.show('skills'); break;
          case 'cats': g.audio.sfx('ui'); this.show('cats'); break;
          case 'inv': g.audio.sfx('ui'); this.show('inv'); break;
          case 'settings': g.audio.sfx('ui'); this.show('settings'); break;
          case 'help': g.audio.sfx('ui'); this.show('help'); break;
          case 'gacha': g.audio.sfx('ui'); this.show('gacha'); break;
          case 'slots': g.audio.sfx('ui'); this.show('slots'); break;
          case 'profile': g.audio.sfx('ui'); this.show('profile'); break;
          case 'tologin': g.audio.sfx('ui'); this.loginPick = null; this.show('login'); break;
          case 'bdclaim': this.claimBirthday(); break;
          case 'code': this.applyCode(); break;
          case 'introgo': this.leaveIntro(); break;
          case 'fullscreen': KM.DEVICE.goFullscreen(); break;
          case 'server': g.audio.sfx('ui'); if (g.net) g.net.connect(); this.show('server'); break;
          case 'servers':
            g.audio.sfx('ui');
            if (g.net) { g.net.connect(); g.net.askServers(); }
            this.show('servers');
            break;
          case 'direct': g.audio.sfx('ui'); this.show('direct'); break;
          case 'back': this.back(); break;
          case 'resume': this.resume(); break;
          case 'pausebtn': this.pause(); break;
          case 'invgame': this.openInventory(); break;
          case 'helpgame': if (g.mode === 'playing') g.mode = 'paused'; g.audio.sfx('ui'); this.show('help'); break;
          case 'quit': g.audio.sfx('ui'); g.quitToMenu(); this.show('menu'); break;
          case 'retry': g.audio.sfx('ui'); this.startLevel(g.levelIndex); break;
          case 'next': g.audio.sfx('ui'); this.startLevel(g.levelIndex + 1); break;
          case 'tolocs': g.audio.sfx('ui'); g.quitToMenu(); this.show('locations'); break;
          case 'reset':
            this.ask({
              title: '⚠ СБРОС ПРОГРЕССА',
              text: 'Стереть весь прогресс этой игры?<br>Уровень, монеты, коты и открытые локации пропадут.<br><b>Это нельзя отменить.</b>',
              ok: 'Стереть', danger: true
            }, (yes) => {
              if (!yes) return;
              this.state.reset(); g.player.applyStats(); this.show('menu');
              this.toast('Прогресс сброшен', 'warn');
            });
            break;
        }
      }
    }

    /** Остальные привязки: колесо выходок, поля ввода, горячие клавиши. */
    bindRest() {
      const g = this.game;

      this.bindWho();

      // кошачьи выходки
      const et = $('#emote-toggle');
      if (et) et.onclick = () => { g.audio.sfx('ui'); this.setEmoteWheel(!this.emoteOpen); };
      global.addEventListener('keydown', (e) => {
        if (g.mode !== 'playing' || this.current !== 'none') return;
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (e.code === 'KeyY') { e.preventDefault(); this.setEmoteWheel(!this.emoteOpen); return; }
        if (!this.emoteOpen) return;
        if (e.code === 'Escape') { this.setEmoteWheel(false); return; }
        const m = /^Digit([1-9])$/.exec(e.code);
        if (m) {
          e.preventDefault();
          const def = KM.EMOTES[+m[1] - 1];
          if (def) this.playEmote(def.id);
        }
      });

      // секретный код: Enter применяет, клавиши не улетают в игру
      const codeInput = $('#code-input');
      if (codeInput) {
        codeInput.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') this.applyCode();
        });
        codeInput.addEventListener('input', () => {
          const m = $('#code-msg');
          m.textContent = ''; m.className = 'code-msg';
        });
      }

      // вкладки сервера
      const stabs = $('#server-tabs');
      if (stabs) stabs.addEventListener('click', (e) => {
        const t = e.target.closest('.tab');
        if (!t) return;
        this.serverTab = t.dataset.tab;
        g.audio.sfx('ui');
        this.buildServer();
      });

      // вкладки магазина
      $('#shop-tabs').addEventListener('click', (e) => {
        const t = e.target.closest('.tab');
        if (!t) return;
        this.shopTab = t.dataset.tab;
        $$('#shop-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
        g.audio.sfx('ui');
        this.buildShop();
      });

      global.addEventListener('resize', () => this.resize());
      this.resize();
    }

    resize() {
      const o = this.game.overlay;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      o.width = Math.floor(o.clientWidth * dpr);
      o.height = Math.floor(o.clientHeight * dpr);
      this.game.renderer.resize();
    }

    // ============================================================
    //  ЗАПУСК УРОВНЯ
    // ============================================================
    startLevel(index, server) {
      if (index >= KM.LEVELS) { this.show('menu'); return; }
      if (this._loading) return;              // защита от повторного запуска
      const g = this.game;
      if (server !== undefined) g.serverMode = !!server && !!(g.net && g.net.status === 'online');
      if (KM.DEVICE.isTouch()) KM.DEVICE.goFullscreen();   // телефону нужен весь экран
      g.audio.ensure();
      this._loading = true;
      // отменяем таймеры прошлой загрузки, чтобы экраны не накладывались
      (this._loadT || []).forEach(clearTimeout);
      this._loadT = [];
      this.show('loading');
      const bar = $('#scr-loading .loading-bar i');
      bar.style.width = '10%';
      $('#scr-loading .loading-text').textContent = KM.locationInfo(index).fullName + '…';
      const tips = this.loadingTips();
      $('#scr-loading .loading-tip').textContent = '💡 ' + tips[Math.floor(Math.random() * tips.length)];
      const done = () => { this._loading = false; this._loadT = []; };
      this._loadT.push(setTimeout(() => {
        bar.style.width = '55%';
        this._loadT.push(setTimeout(() => {
          try {
            g.loadLevel(index);
            bar.style.width = '100%';
            this._loadT.push(setTimeout(() => {
              this.show('none');
              g.input.setBlocked(false);
              if (g.input.camMode === 'lock') g.input.requestLock();
              done();
            }, 160));
          } catch (err) {
            console.error(err);
            done();
            this.fatal(err);
          }
        }, 40));
      }, 90));
    }

    fatal(err) {
      const f = $('#fatal');
      f.classList.remove('hidden');
      f.innerHTML = '<div><b>Ой! Что-то сломалось 😿</b>' +
        String(err && err.message ? err.message : err) +
        '<br><br>Попробуйте обновить страницу (F5).</div>';
    }

    // ============================================================
    //  ГЛАВНОЕ МЕНЮ
    // ============================================================
    buildMenu() {
      const d = this.state.data;
      const done = Object.keys(d.completed).length;
      const stars = Object.values(d.completed).reduce((a, c) => a + (c.stars || 0), 0);
      $('#menu-stats').innerHTML =
        '<b style="color:var(--cyan)">' + (d.slotName || 'Игра 1') + '</b><br>' +
        'Уровень <b>' + d.level + '</b> · Монет <b>' + d.coins + '</b> · ' +
        'Локаций пройдено <b>' + done + '/' + KM.LEVELS + '</b> · Звёзд <b>' + stars + '/' + (KM.LEVELS * 3) + '</b><br>' +
        'Персонажей открыто <b>' + d.cats.length + '/' + KM.CATS.length + '</b> · ' +
        'Освобождено котов-магов <b>' + d.freedCats + '/40</b> · ' +
        'Побеждено монстров <b>' + d.stats.kills + '</b> · Боссов <b>' + d.stats.bosses + '/10</b><br>' +
        'В игре <b>' + fmtTime(d.stats.playtime) + '</b>';
    }

    // ============================================================
    //  ЛОКАЦИИ
    // ============================================================
    buildLocations() {
      const wrap = $('#loc-list');
      wrap.innerHTML = '';
      const S = this.state;
      const maxU = S.maxUnlocked();

      for (let r = 0; r < KM.REGIONS; r++) {
        const biome = KM.BIOMES[r];
        const region = el('div', 'region');
        let doneN = 0;
        for (let k = 0; k < 10; k++) if (S.isCompleted(r * 10 + k)) doneN++;
        const head = el('div', 'region-head',
          '<h3>' + (r + 1) + '. ' + biome.name.toUpperCase() + '</h3>' +
          '<span class="prog">' + climateTag(biome) + ' · ' + doneN + '/10 · Босс: ' + KM.BOSSES[r].name + '</span>');
        region.appendChild(head);

        const grid = el('div', 'loc-grid');
        for (let k = 0; k < 10; k++) {
          const i = r * 10 + k;
          const info = KM.locationInfo(i);
          const comp = S.data.completed[i];
          const unlocked = i <= maxU;
          const cls = ['loc'];
          if (info.isBoss) cls.push('boss');
          if (comp) cls.push('done');
          else if (unlocked) cls.push('open');
          if (!unlocked) cls.push('locked');

          const tile = el('div', cls.join(' '));
          tile.innerHTML =
            (info.isBoss ? '<span class="crown">👑</span>' : '') +
            '<span class="n">' + (i + 1) + '</span>' +
            '<span class="st">' + (comp ? '★'.repeat(comp.stars) + '☆'.repeat(3 - comp.stars) : (unlocked ? '' : '🔒')) + '</span>';
          const T = info.biome.temp || 0;
          const clim = T <= -3 ? '🥶 очень холодно' : (T < 0 ? '❄️ прохладно' :
            (T >= 3 ? '🥵 очень жарко' : (T > 0 ? '🔥 тепло' : '🙂 комфортно')));
          tile.title = info.fullName +
            '\nКлимат: ' + clim + ' (' + (T > 0 ? '+' : '') + T + ')' +
            '\nМонстров: ' + info.monsterCount +
            (info.cages ? '\nКлеток с котами: ' + info.cages : '') +
            '\nСундуков: ' + info.chests +
            '\nНаграда: ' + info.reward + ' монет';
          if (unlocked) {
            tile.addEventListener('click', () => { this.game.audio.sfx('ui'); this.askMode(i); });
          }
          grid.appendChild(tile);
        }
        region.appendChild(grid);
        wrap.appendChild(region);
      }
    }

    // ============================================================
    //  МАГАЗИН
    // ============================================================
    /** Плашка «праздничная неделя» для магазина. */
    bdBanner() {
      const A = KM.ACCOUNT, acc = A && A.current();
      if (!acc || !A.isBirthdayWeek(acc)) return null;
      const d = A.daysToBirthday(acc);
      return el('div', 'bd-sale', '🎂 <b>ПРАЗДНИЧНАЯ НЕДЕЛЯ, ' + acc.nick + '</b> — скидка <b>30%</b> на всё' +
        (d === 0 ? ' · сегодня твой день рождения!' : (d > 300 ? ' · праздник только что был' : ' · до праздника ' + d + ' дн.')));
    }

    buildShop() {
      const S = this.state, g = this.game;
      const box = $('#shop-list');
      box.innerHTML = '';
      const sale = this.bdBanner(); if (sale) box.appendChild(sale);
      const cards = el('div', 'cards');
      const buy = (cost, ok, label) => {
        if (S.data.coins < cost) { g.audio.sfx('error'); this.toast('Не хватает монет!', 'warn'); return; }
        S.addCoins(-cost); ok(); S.save();
        g.audio.sfx('buy'); this.toast('Куплено: ' + label, 'good');
        this.buildShop(); this.refreshCoins(); this.updateHud();
      };

      if (this.shopTab === 'items') {
        for (const it of KM.ITEMS) {
          if (!it.price) continue;
          const c = el('div', 'card');
          c.innerHTML =
            '<div class="ico">' + it.icon + '</div><div class="info">' +
            '<div class="nm">' + it.name + '</div>' +
            '<div class="ds">' + it.desc + '</div>' +
            '<div class="row"><span class="price">🪙 ' + px(it.price) + '</span>' +
            '<span class="tag-lock">в сумке: ' + S.invCount(it.id) + '</span></div></div>';
          const b1 = el('button', 'btn btn-sm', 'Купить');
          const b10 = el('button', 'btn btn-sm', '×5');
          b1.onclick = () => buy(px(it.price), () => S.addItem(it.id, 1), it.name);
          b10.onclick = () => buy(px(it.price) * 5, () => S.addItem(it.id, 5), it.name + ' ×5');
          c.querySelector('.row').append(b1, b10);
          cards.appendChild(c);
        }
      }

      if (this.shopTab === 'spells') {
        for (const sp of KM.SPELLS) {
          const owned = S.hasSpell(sp.id);
          const lvlOk = !sp.lvl || S.data.level >= sp.lvl;
          const c = el('div', 'card' + (owned ? ' owned' : (lvlOk ? '' : ' locked')));
          c.innerHTML =
            '<div class="ico">' + sp.icon + '</div><div class="info">' +
            '<div class="nm">' + sp.name + '</div>' +
            '<div class="ds">' + sp.desc + '<br>Урон ' + sp.dmg + ' · Мана ' + sp.mana + ' · КД ' + sp.cd + 'с</div>' +
            '<div class="row"></div></div>';
          const row = c.querySelector('.row');
          if (owned) row.innerHTML = '<span class="tagline">✔ Изучено</span>';
          else if (!lvlOk) row.innerHTML = '<span class="tag-lock">🔒 Нужен уровень ' + sp.lvl + '</span>';
          else if (!sp.price) row.innerHTML = '<span class="tag-lock">Только за спасение кота-мага</span>';
          else {
            row.innerHTML = '<span class="price">🪙 ' + px(sp.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Изучить');
            b.onclick = () => buy(px(sp.price), () => { S.unlockSpell(sp.id); this.updateSpellBar(); }, sp.name);
            row.appendChild(b);
          }
          cards.appendChild(c);
        }
      }

      if (this.shopTab === 'abils') {
        for (const a of KM.ABILITIES) {
          const owned = S.hasAbility(a.id);
          const c = el('div', 'card' + (owned ? ' owned' : ''));
          c.innerHTML =
            '<div class="ico">' + a.icon + '</div><div class="info">' +
            '<div class="nm">' + a.name + '</div><div class="ds">' + a.desc + '</div>' +
            '<div class="row"></div></div>';
          const row = c.querySelector('.row');
          if (owned) row.innerHTML = '<span class="tagline">✔ Открыто</span>';
          else if (!a.price) row.innerHTML = '<span class="tag-lock">Награда за кота-мага</span>';
          else {
            row.innerHTML = '<span class="price">🪙 ' + px(a.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Открыть');
            b.onclick = () => buy(px(a.price), () => { S.unlockAbility(a.id); g.player.applyStats(); }, a.name);
            row.appendChild(b);
          }
          cards.appendChild(c);
        }
      }

      if (this.shopTab === 'pets') {
        for (const p of KM.PETS) {
          const have = S.data.pets.filter(x => x.id === p.id).length;
          const c = el('div', 'card' + (have ? ' owned' : ''));
          c.innerHTML =
            '<div class="ico">' + petEmoji(p) + '</div><div class="info">' +
            '<div class="nm">' + p.name + (have ? ' ×' + have : '') + '</div>' +
            '<div class="ds">' + p.desc + '<br>Урон ' + p.dmg + ' · Дальность ' + p.range + 'м</div>' +
            '<div class="row"><span class="price">🪙 ' + px(p.price) + '</span></div></div>';
          const b = el('button', 'btn btn-sm', 'Купить');
          b.onclick = () => buy(px(p.price), () => S.addPet(p.id), p.name);
          c.querySelector('.row').appendChild(b);
          cards.appendChild(c);
        }
      }

      if (this.shopTab === 'cats') {
        for (const cat of KM.CATS) {
          const owned = S.hasCat(cat.id);
          const active = S.data.activeCat === cat.id;
          const c = el('div', 'card' + (owned ? ' owned' : ''));
          c.innerHTML =
            '<div class="ico" style="background:' + KM.cssColor(cat.pal.fur) + '">🐱</div><div class="info">' +
            '<div class="nm">' + cat.name + (active ? ' <span class="tagline">(выбран)</span>' : '') + '</div>' +
            '<div class="ds">' + cat.desc + '<br>' + bonusText(cat) + '</div>' +
            '<div class="row"></div></div>';
          const row = c.querySelector('.row');
          if (owned) {
            const b = el('button', 'btn btn-sm' + (active ? '' : ' btn-good'), active ? 'Выбран' : 'Играть за него');
            b.disabled = active;
            b.onclick = () => {
              S.data.activeCat = cat.id; S.save(); g.player.applyStats();
              g.audio.sfx('buy'); this.toast('Теперь вы играете за ' + cat.name, 'good');
              this.buildShop(); this.updateHud();
            };
            row.appendChild(b);
          } else if (cat.price) {
            row.innerHTML = '<span class="price">🪙 ' + px(cat.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Купить');
            b.onclick = () => {
              if (S.data.coins < px(cat.price)) { g.audio.sfx('error'); this.toast('Не хватает монет!', 'warn'); return; }
              S.addCoins(-px(cat.price));
              S.save();
              this.refreshCoins();
              this.revealCat(cat.id, 'shop');     // тот же экран, что и из сундука
            };
            row.appendChild(b);
          } else {
            row.innerHTML = '<span class="tag-lock">🔒 Только из колеса удачи или сундука</span>';
          }
          cards.appendChild(c);
        }
      }


      // ---------------- НАБОРЫ ----------------
      if (this.shopTab === 'packs') {
        box.appendChild(el('div', 'help-p',
          'В наборе сразу несколько подарков, и каждый показывается на большом экране. ' +
          'Выгоднее, чем покупать по отдельности.'));
        for (const pk of KM.PACKS) {
          const c = el('div', 'card');
          let what = [];
          if (pk.rarities) what.push(pk.rarities.map(r =>
            '<span style="color:' + KM.RARITY[r].color + '">' + KM.RARITY[r].name + '</span>').join(' + ') + ' кот');
          if (pk.accs) what.push(pk.accs + ' аксессуар' + (pk.accs > 1 ? 'а' : ''));
          if (pk.skins) what.push(pk.skins + ' костюм');
          if (pk.extra) what.push('припасы');
          c.innerHTML =
            '<div class="ico">' + pk.icon + '</div><div class="info">' +
            '<div class="nm">' + pk.name + '</div>' +
            '<div class="ds">' + pk.desc + '</div>' +
            '<div class="chest-odds">Внутри: ' + what.join(' · ') + '</div>' +
            '<div class="row"><span class="price">🪙 ' + px(pk.price) + '</span></div></div>';
          const b = el('button', 'btn btn-sm btn-good', 'Открыть');
          b.onclick = () => this.buyPack(pk);
          c.querySelector('.row').appendChild(b);
          cards.appendChild(c);
        }
      }

      // ---------------- КОСТЮМЫ ----------------
      if (this.shopTab === 'skins') {
        box.appendChild(el('div', 'help-p',
          'Костюм меняет окрас и детали конкретного кота. Надеть его можно на экране «Коты».'));
        for (const sk of KM.SKINS) {
          const cat = KM.CAT_BY[sk.cat];
          const has = S.hasSkin(sk.id);
          const R = KM.RARITY[sk.rarity];
          const worn = (S.data.catSkins || {})[sk.cat] === sk.id;
          const c = el('div', 'card' + (has ? ' owned' : ''));
          c.style.boxShadow = '0 0 0 2px #000,0 0 0 4px ' + (has ? R.color : '#3a2d78');
          c.innerHTML =
            '<div class="ico" style="background:' + KM.cssColor(sk.pal.fur) + '">' + sk.icon + '</div>' +
            '<div class="info"><div class="nm">' + sk.name + (worn ? ' <span class="tagline">★ надет</span>' : '') + '</div>' +
            '<div class="ds" style="color:' + R.color + ';font-weight:800;font-size:11.5px">' + R.name +
            ' · для кота «' + (cat ? cat.name : '?') + '»</div>' +
            '<div class="ds">' + sk.desc + '</div><div class="row"></div></div>';
          const row = c.querySelector('.row');
          if (has) {
            const b = el('button', 'btn btn-sm' + (worn ? '' : ' btn-good'), worn ? 'Снять' : 'Надеть');
            b.onclick = () => {
              if (!S.hasCat(sk.cat)) { this.toast('Сначала нужен кот «' + cat.name + '»', 'warn'); g.audio.sfx('error'); return; }
              S.setSkin(sk.cat, worn ? null : sk.id);
              S.data.activeCat = sk.cat;
              g.player.applyStats(); g.audio.sfx('buy');
              this.toast(worn ? 'Костюм снят' : ('Надет костюм «' + sk.name + '»'), 'good');
              this.buildShop(); this.updateHud();
            };
            row.appendChild(b);
          } else {
            row.innerHTML = '<span class="price">🪙 ' + px(sk.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Купить');
            b.onclick = () => buy(px(sk.price), () => S.addSkin(sk.id), sk.name);
            row.appendChild(b);
          }
          cards.appendChild(c);
        }
      }

      // ---------------- АКСЕССУАРЫ ----------------
      if (this.shopTab === 'accs') {
        box.appendChild(el('div', 'help-p',
          'Аксессуары видно на коте и они дают бонусы. По одному на каждое место: ' +
          'голова, морда, шея и спина. Надеваются кнопкой прямо здесь.'));
        for (const slot of KM.ACC_SLOTS) {
          const list = KM.ACC.filter(a => a.slot === slot.id);
          if (!list.length) continue;
          box.appendChild(el('div', 'help-note', slot.icon + ' ' + slot.name.toUpperCase()));
          const grp = el('div', 'cards');
          for (const a of list) {
            const has = S.hasAcc(a.id);
            const worn = (S.data.acc || {})[a.id ? a.slot : ''] === a.id;
            const R = KM.RARITY[a.rarity];
            const c = el('div', 'card' + (has ? ' owned' : ''));
            c.style.boxShadow = '0 0 0 2px #000,0 0 0 4px ' + (has ? R.color : '#3a2d78');
            c.innerHTML =
              '<div class="ico" style="background:' + KM.cssColor(a.c1) + '">' + a.icon + '</div>' +
              '<div class="info"><div class="nm">' + a.name + (worn ? ' <span class="tagline">★ надет</span>' : '') + '</div>' +
              '<div class="ds" style="color:' + R.color + ';font-weight:800;font-size:11.5px">' + R.name + '</div>' +
              '<div class="ds">' + a.desc + '<br>' + accBonusText(a) + '</div><div class="row"></div></div>';
            const row = c.querySelector('.row');
            if (has) {
              const b = el('button', 'btn btn-sm' + (worn ? '' : ' btn-good'), worn ? 'Снять' : 'Надеть');
              b.onclick = () => {
                S.equipAcc(a.slot, a.id);
                g.player.applyStats(); g.audio.sfx('buy');
                this.toast(worn ? 'Снято: ' + a.name : 'Надето: ' + a.icon + ' ' + a.name, 'good');
                this.buildShop(); this.updateHud();
              };
              row.appendChild(b);
            } else if (!a.price) {
              row.innerHTML = '<span class="tag-lock">🎂 Только в день рождения</span>';
            } else {
              row.innerHTML = '<span class="price">🪙 ' + px(a.price) + '</span>';
              const b = el('button', 'btn btn-sm', 'Купить');
              b.onclick = () => buy(px(a.price), () => S.addAcc(a.id), a.name);
              row.appendChild(b);
            }
            grp.appendChild(c);
          }
          box.appendChild(grp);
        }
      }

      // ---------------- АКСЕССУАРЫ ПИТОМЦАМ ----------------
      if (this.shopTab === 'petaccs') {
        box.appendChild(el('div', 'help-p',
          'Наряды для питомцев: видно на них в бою и добавляют урона. ' +
          'Надеть можно на экране «Питомцы».'));
        for (const a of KM.PET_ACC) {
          const has = (S.data.petAccs || []).indexOf(a.id) >= 0;
          const R = KM.RARITY[a.rarity];
          const c = el('div', 'card' + (has ? ' owned' : ''));
          c.style.boxShadow = '0 0 0 2px #000,0 0 0 4px ' + (has ? R.color : '#3a2d78');
          c.innerHTML =
            '<div class="ico" style="background:' + KM.cssColor(a.c1) + '">' + a.icon + '</div>' +
            '<div class="info"><div class="nm">' + a.name + '</div>' +
            '<div class="ds" style="color:' + R.color + ';font-weight:800;font-size:11.5px">' + R.name + '</div>' +
            '<div class="ds">' + a.desc + '<br><span style="color:var(--mint)">+' +
            Math.round(a.dmg * 100) + '% к урону питомца</span></div>' +
            '<div class="row"></div></div>';
          const row = c.querySelector('.row');
          if (has) row.innerHTML = '<span class="tagline">✔ Куплено — наденьте в «Питомцах»</span>';
          else {
            row.innerHTML = '<span class="price">🪙 ' + px(a.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Купить');
            b.onclick = () => buy(px(a.price), () => {
              if (!S.data.petAccs) S.data.petAccs = [];
              if (S.data.petAccs.indexOf(a.id) < 0) S.data.petAccs.push(a.id);
            }, a.name);
            row.appendChild(b);
          }
          cards.appendChild(c);
        }
      }

      if (this.shopTab === 'sell') {
        const items = S.data.inventory.filter(i => { const it = KM.ITEM_BY[i.id]; return it && it.sell; });
        if (!items.length) box.appendChild(el('div', 'empty-note', 'Продавать пока нечего 🐾'));
        for (const slot of items) {
          const it = KM.ITEM_BY[slot.id];
          const c = el('div', 'card');
          c.innerHTML =
            '<div class="ico">' + it.icon + '</div><div class="info">' +
            '<div class="nm">' + it.name + ' ×' + slot.n + '</div>' +
            '<div class="ds">' + it.desc + '</div>' +
            '<div class="row"><span class="price">🪙 ' + it.sell + ' за штуку</span></div></div>';
          const b1 = el('button', 'btn btn-sm', 'Продать 1');
          const ball = el('button', 'btn btn-sm', 'Продать всё');
          b1.onclick = () => { S.removeItem(it.id, 1); S.addCoins(it.sell); S.save(); g.audio.sfx('coin'); this.buildShop(); this.refreshCoins(); };
          ball.onclick = () => { const n = slot.n; S.removeItem(it.id, n); S.addCoins(it.sell * n); S.save(); g.audio.sfx('coin'); this.buildShop(); this.refreshCoins(); };
          c.querySelector('.row').append(b1, ball);
          cards.appendChild(c);
        }
      }

      box.appendChild(cards);
    }

    // ============================================================
    //  ВНУТРИИГРОВЫЕ ОКНА (вместо prompt/confirm — их блокируют браузеры)
    // ============================================================
    ask(opt, cb) {
      const m = $('#modal');
      const inp = $('#mo-input');
      $('#mo-title').textContent = opt.title || 'Вопрос';
      $('#mo-text').innerHTML = opt.text || '';
      const okBtn = $('#mo-ok'), cancelBtn = $('#mo-cancel');
      okBtn.textContent = opt.ok || 'Хорошо';
      okBtn.className = 'btn ' + (opt.danger ? 'btn-danger' : 'btn-good');
      cancelBtn.textContent = opt.cancel || 'Отмена';

      const hasInput = opt.input !== undefined;
      inp.type = opt.password ? 'password' : 'text';
      inp.style.display = hasInput ? '' : 'none';
      if (hasInput) inp.value = opt.input || '';

      m.classList.remove('hidden');
      this.game.input.setBlocked(true);
      if (hasInput) setTimeout(() => { inp.focus(); inp.select(); }, 30);

      const close = (result) => {
        m.classList.add('hidden');
        okBtn.onclick = null; cancelBtn.onclick = null; inp.onkeydown = null;
        this.game.input.setBlocked(this.current !== 'none');
        this.game.audio.sfx('ui');
        if (cb) cb(result);
      };
      okBtn.onclick = () => close(hasInput ? (inp.value || opt.input || '') : true);
      cancelBtn.onclick = () => close(null);
      inp.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') okBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      };
    }

    /** Купить набор: несколько подарков подряд. */
    buyPack(pk) {
      const g = this.game, S = this.state;
      if (S.data.coins < px(pk.price)) { this.toast('Не хватает монет!', 'warn'); g.audio.sfx('error'); return; }
      S.addCoins(-px(pk.price));
      const prizes = [];
      (pk.rarities || []).forEach(r => prizes.push(KM.GACHA.rollPrize(S, r)));
      for (let i = 0; i < (pk.accs || 0); i++) {
        const pool = KM.ACC.filter(a => a.price > 0 && !S.hasAcc(a.id));
        if (pool.length) {
          const a = pool[Math.floor(Math.random() * pool.length)];
          prizes.push({ type: 'acc', id: a.id, rarity: a.rarity });
        } else prizes.push({ type: 'coins', n: 500, rarity: 'rare' });
      }
      for (let i = 0; i < (pk.skins || 0); i++) {
        const pool = KM.SKINS.filter(s => !S.hasSkin(s.id));
        if (pool.length) {
          const sk = pool[Math.floor(Math.random() * pool.length)];
          prizes.push({ type: 'skin', id: sk.id, rarity: sk.rarity });
        } else prizes.push({ type: 'coins', n: 700, rarity: 'epic' });
      }
      (pk.extra || []).forEach(e => prizes.push(Object.assign({ rarity: 'common' }, e)));
      prizes.sort((a, b) => KM.RARITY[a.rarity].order - KM.RARITY[b.rarity].order);
      S.data.stats.packsBought = (S.data.stats.packsBought || 0) + 1;
      S.save();
      g.audio.sfx('chest');
      this.showPrizes(prizes, 'shop');
    }

    /** Выдать персонажа ВСЕГДА через торжественный экран. */
    revealCat(catId, back) {
      const c = KM.CAT_BY[catId];
      if (!c) return;
      this.showPrizes([{ type: 'cat', id: catId, rarity: c.rarity }], back || this.current);
    }

    // ============================================================
    //  ЗАСТАВКА И БОЛЬШАЯ КАРТИНА
    // ============================================================
    /** Подсказки, которые крутятся на загрузке. */
    loadingTips() {
      return [
        'Shift — рывок. Тратит энергию, но спасает от когтей.',
        'Пробел трижды: прыжок, сальто, ещё прыжок.',
        'Лёд не просто бьёт — замороженный получает на 35% больше урона.',
        'Молния в воде бьёт вдвое сильнее. Сначала лужа, потом искра.',
        'Монстры вдалеке живут своей жизнью. Подкрадитесь — не заметят.',
        'F — отдых. Кот восстанавливает силы вдвое быстрее сидя.',
        'В кустах можно спрятаться. Совсем.',
        'Y — кошачьи выходки. Танец, поклон, кувырок.',
        'Тёплая шапка в снегах важнее лишнего заклинания.',
        'На сервере монстры слабее, а добитые кем-то падают у всех.',
        'Ключи от клеток выпадают из сундуков и крупных монстров.',
        'Enter в игре — чат. Там же стикеры ваших котов.'
      ];
    }

    /** Заставка при запуске: картина, название, музыка. */
    showIntro() {
      const g = this.game;
      this.introDone = false;
      if (KM.KeyArt && !this.introArt) {
        const cv = $('#intro-art');
        if (cv) this.introArt = new KM.KeyArt(cv);
      }
      this.show('intro');

      // Браузер включает звук только после действия игрока. Поэтому
      // ПЕРВОЕ касание запускает тему, а уводит с заставки уже второе
      // или кнопка — иначе музыку никто бы не услышал.
      this.introHeard = false;
      const start = () => {
        g.audio.ensure();
        g.audio.startMusic('intro');
        this.introHeard = true;
        const h = $('#scr-intro .intro-hint');
        if (h) h.textContent = 'нажмите ещё раз или кнопку «▶ НАЧАТЬ»';
      };
      global.addEventListener('pointerdown', start, { once: true });
      global.addEventListener('keydown', start, { once: true });

      // Если человек не понял, что надо нажать, — уводим сами через
      // двенадцать секунд. Иначе заставка выглядит как «игра открылась
      // и не открывается», а на самом деле она просто ждёт касания.
      clearTimeout(this._introT);
      this._introT = setTimeout(() => {
        if (this.current === 'intro') this.leaveIntro();
      }, 12000);

      // щелчок по заставке: первый — включает тему, следующий — вперёд
      const go = (e) => {
        if (this.current !== 'intro') return;
        e.preventDefault();
        if (!this.introHeard) { start(); return; }
        this.leaveIntro();
      };
      $('#scr-intro').addEventListener('pointerdown', go);
      $('#scr-intro').addEventListener('keydown', go);
      global.addEventListener('keydown', (e) => {
        if (this.current !== 'intro') return;
        if (e.code !== 'Enter' && e.code !== 'Space') return;
        e.preventDefault();
        if (!this.introHeard) { start(); return; }
        this.leaveIntro();
      });
    }

    /** Уходим с заставки к аккаунту или в меню. */
    leaveIntro() {
      clearTimeout(this._introT);
      if (this.introDone) return;
      if (!this.introHeard) {          // кнопкой — сперва тоже включаем тему
        this.game.audio.ensure();
        this.game.audio.startMusic('intro');
        this.introHeard = true;
        return;
      }
      this.introDone = true;
      const g = this.game;
      g.audio.ensure();
      g.audio.sfx('unlock');
      g.audio.startMusic('menu');      // тема заставки уступает место меню
      this.bootAccount();
    }

    /** Картина живёт каждый кадр, пока её видно. */
    updateArt(dt) {
      const d = Math.min(0.05, dt);
      if (this.current === 'intro' && this.introArt) {
        try { this.introArt.draw(d); } catch (e) { }
      }
      if (this.current === 'loading') {
        if (KM.KeyArt && !this.loadArt) {
          const cv = $('#load-art');
          if (cv) this.loadArt = new KM.KeyArt(cv);
        }
        if (this.loadArt) { try { this.loadArt.draw(d); } catch (e) { } }
      }
    }

    // ============================================================
    //  «КТО ИГРАЕТ» — маленькая вкладка прямо в бою
    //  Чтобы не уходить из игры ради списка и заявок в друзья.
    // ============================================================
    bindWho() {
      const g = this.game;
      const tg = $('#who-toggle');
      if (!tg) return;
      tg.onclick = () => { g.audio.sfx('ui'); this.setWho(!this.whoOpen); };
      $('#who-close').onclick = () => { g.audio.sfx('ui'); this.setWho(false); };

      const inp = $('#who-nick'), send = $('#who-send');
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') send.click();
      });
      inp.addEventListener('focus', () => g.input.setBlocked(true));
      inp.addEventListener('blur', () => {
        if (this.current === 'none' && !this.whoOpen) g.input.setBlocked(false);
      });
      send.onclick = () => {
        const v = inp.value.trim();
        if (v.length < 3) { this.toast('Ник короче трёх букв не бывает', 'warn'); return; }
        g.net.addFriend(v);
        inp.value = '';
        g.audio.sfx('ui');
      };
    }

    setWho(v) {
      this.whoOpen = !!v;
      $('#who-panel').classList.toggle('open', this.whoOpen);
      $('#who-toggle').classList.toggle('on', this.whoOpen);
      if (this.whoOpen) this.buildWho();
      else {
        $('#who-nick').blur();
        if (this.current === 'none') this.game.input.setBlocked(false);
      }
    }

    /** Список тех, кто сейчас в игре, и кнопка «в друзья». */
    buildWho() {
      const g = this.game, n = g.net;
      const list = $('#who-panel .wp-list');
      list.innerHTML = '';
      const online = (n && n.online) || [];
      if (!online.length) {
        list.appendChild(el('div', 'wp-empty', 'Пока никого. Позовите друга — ' +
          'меню «🎮 Играть вдвоём».'));
        return;
      }
      const друзья = new Set(((n && n.friends) || []).map(f => f.nick.toLowerCase()));
      for (const p of online) {
        const свой = p.nick === n.nick;
        const друг = друзья.has(p.nick.toLowerCase());
        const team = n.match && n.match.myTeams && n.match.myTeams[p.nick];
        const row = el('div', 'wp-row');
        row.innerHTML =
          '<span class="nm' + (свой ? ' me' : '') + (team ? ' ' + team : '') + '">' +
          p.nick + '</span>' +
          '<span class="k">\u2694 ' + (n.killsOf ? n.killsOf(p.nick) : 0) + '</span>';
        if (!свой) {
          const b = el('button', 'ab' + (друг ? ' done' : ''), друг ? '🐾' : '➕');
          b.title = друг ? 'уже друг' : 'добавить в друзья';
          if (!друг) {
            b.onclick = () => { g.audio.sfx('ui'); n.addFriend(p.nick); b.className = 'ab done'; b.textContent = '🐾'; };
          }
          row.appendChild(b);
        }
        list.appendChild(row);
      }

      // заявки, если есть
      const заявки = (n && n.requests) || [];
      for (const nick of заявки) {
        const row = el('div', 'wp-row');
        row.innerHTML = '<span class="nm">' + nick + ' хочет дружить</span>';
        const ok = el('button', 'ab', '✔');
        ok.onclick = () => { g.audio.sfx('buy'); n.acceptFriend(nick); this.buildWho(); };
        row.appendChild(ok);
        list.appendChild(row);
      }
    }

    /** Кнопку видно только в совместной игре. */
    syncWho() {
      const g = this.game, n = g.net;
      // Раньше вкладка появлялась только в серверном режиме — и в одиночной
      // игре её было не открыть, хотя посмотреть, кто в сети, хочется всегда.
      const want = !!(g.level && g.mode === 'playing' &&
        this.current === 'none' && n && n.status === 'online');
      const tg = $('#who-toggle');
      if (!tg) return;
      if (want !== this._whoShown) {
        this._whoShown = want;
        tg.classList.toggle('gone', !want);
        if (!want) this.setWho(false);
      }
      if (!want) return;
      const cnt = ((n.online || []).length) || 1;
      const b = tg.querySelector('.cnt');
      if (b.textContent !== String(cnt)) {
        b.textContent = cnt;
        if (this.whoOpen) this.buildWho();
      }
    }

    // ============================================================
    //  АККАУНТ НА СЕРВЕРЕ
    //  Ник и пароль лежат у сервера, а не на устройстве. Поэтому
    //  в свой аккаунт можно войти хоть с телефона друга, и там
    //  окажется весь ваш прогресс.
    // ============================================================
    /** Блок «войти по нику и паролю» на экране входа. */
    cloudBlock(box) {
      const g = this.game, n = g.net;
      const есть = n && n.status === 'online';

      box.appendChild(el('div', 'help-note', 'АККАУНТ НА СЕРВЕРЕ'));
      box.appendChild(el('div', 'acc-note',
        есть
          ? 'Такой аккаунт живёт <b>на сервере</b>, а не на этом устройстве. Войти в него ' +
            'можно откуда угодно — с другого компьютера, с телефона, у друга в гостях. ' +
            'Прогресс приедет вместе с вами.'
          : '<b style="color:#ffcf6a">Сервер сейчас недоступен.</b><br>' +
            'Аккаунты на сервере работают, только когда есть связь. Пока можно играть ' +
            'с обычным аккаунтом — он хранится на этом устройстве.'));

      if (!есть) {
        // Связи нет — тянемся к серверу гостем. Аккаунт для этого не нужен:
        // как раз тот случай, когда игрок пришёл к другу с пустыми руками.
        if (!n || !n.available()) return;

        const ждёт = el('div', 'dwait', '⏳ Связываемся с сервером…');
        const кнопка = el('button', 'btn', '🔌 Попробовать ещё раз');
        кнопка.style.display = 'none';
        кнопка.onclick = () => { g.audio.sfx('ui'); this.cloudConnect(); };
        box.append(ждёт, кнопка);

        this.cloudConnect = () => {
          ждёт.style.display = '';
          кнопка.style.display = 'none';
          if (n.status !== 'connecting') n.connect(true, true);
          clearInterval(this._cloudPoll);
          let ждём = 0;
          this._cloudPoll = setInterval(() => {
            if (n.status === 'online') {
              clearInterval(this._cloudPoll);
              if (this.current === 'login') this.buildLogin();
              else if (this.current === 'signup') this.buildSignup();
            } else if (++ждём > 50) {                    // десять секунд — хватит ждать
              clearInterval(this._cloudPoll);
              ждёт.style.display = 'none';
              кнопка.style.display = '';
            }
          }, 200);
        };
        this.cloudConnect();
        return;
      }
      clearInterval(this._cloudPoll);

      const f = this.cloudForm || (this.cloudForm = { nick: '', pass: '' });
      const row = (label, key, ph, type) => {
        const r = el('div', 'form-row');
        r.innerHTML = '<label>' + label + '</label>';
        const i = el('input', 'f-input');
        i.type = type || 'text'; i.placeholder = ph; i.value = f[key] || ''; i.maxLength = 32;
        i.oninput = () => { f[key] = i.value; };
        i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') inBtn.click(); };
        r.appendChild(i);
        box.appendChild(r);
      };
      row('Ник', 'nick', 'ваш ник на сервере');
      row('Пароль', 'pass', 'пароль', 'password');

      const err = el('div', 'f-err');
      const acts = el('div', 'drow');

      const inBtn = el('button', 'btn btn-good', '🔑 Войти');
      inBtn.onclick = () => {
        err.textContent = '';
        inBtn.disabled = true; inBtn.textContent = 'входим…';
        n.authorize(f.nick, f.pass, (r) => {
          inBtn.disabled = false; inBtn.textContent = '🔑 Войти';
          if (!r.ok) { err.textContent = r.error; g.audio.sfx('error'); return; }
          this.afterCloudLogin(r);
        });
      };

      const regBtn = el('button', 'btn', '✨ Завести новый');
      regBtn.onclick = () => {
        err.textContent = '';
        const A = KM.ACCOUNT;
        const e1 = A.checkNick ? null : null;
        if ((f.nick || '').trim().length < 3) { err.textContent = 'Ник не короче трёх букв'; return; }
        if ((f.pass || '').length < 4) { err.textContent = 'Пароль не короче четырёх знаков'; return; }
        regBtn.disabled = true; regBtn.textContent = 'заводим…';
        const cur = A.current();
        const profile = {
          name: cur ? cur.name : f.nick, region: cur ? cur.region : 'other',
          lang: cur ? cur.lang : 'ru', avatar: cur ? cur.avatar : 'muri',
          birth: cur ? cur.birth : { d: 1, m: 1, y: 2015 }
        };
        n.register(f.nick, f.pass, profile, (r) => {
          regBtn.disabled = false; regBtn.textContent = '✨ Завести новый';
          if (!r.ok) { err.textContent = r.error; g.audio.sfx('error'); return; }
          this.afterCloudLogin(r);
        });
      };

      acts.append(inBtn, regBtn);
      box.appendChild(acts);
      box.appendChild(err);
    }

    /** Вошли на сервер: подставляем аккаунт и тянем сохранение. */
    afterCloudLogin(r) {
      const g = this.game, n = g.net, A = KM.ACCOUNT, S = this.state;
      n.serverAccount = r.nick;

      const prof = r.profile || {};
      A.useServer({
        nick: r.nick, name: prof.name || r.nick,
        region: prof.region || 'other', lang: prof.lang || 'ru',
        avatar: prof.avatar || 'muri',
        birth: prof.birth || { d: 1, m: 1, y: 2015 }
      });

      // Прогресс приезжает с сервера. Кладём его в слот и перечитываем
      // обычным путём — тогда сработают все проверки и старые сохранения
      // дополнятся тем, чего в них не хватает.
      const saves = r.saves || {};
      const slot = KM.SAVES.currentSlot();
      const blob = saves[String(slot)] || saves['0'];
      let ok = false;
      if (blob) {
        try {
          JSON.parse(blob);                       // сначала убеждаемся, что это не мусор
          localStorage.setItem(KM.SAVES.KEY(slot), blob);
          S.load();
          ok = true;
          this.toast('Прогресс загружен с сервера ☁', 'good', 3000);
        } catch (e) {
          this.toast('Сохранение с сервера не прочиталось', 'warn');
        }
      }
      if (!ok) {
        // На сервере прогресса нет. Слот у каждого аккаунта свой, поэтому
        // чужого сюда не попадёт; если что-то своё уже лежит — берём его,
        // а иначе начинаем с чистого листа.
        let своё = null;
        try { своё = localStorage.getItem(KM.SAVES.KEY(slot)); } catch (e) { }
        if (своё) S.load();
        else S.newGame(slot, 'Игра ' + r.nick);
      }

      const acc = A.current();
      if (!KM.DEVICE.get() && acc && acc.device) KM.DEVICE.set(acc.device);
      S.data.settings = KM.DEVICE.tune(S.data.settings);
      g.applySettings();
      g.player.applyStats();
      this.updateSpellBar();
      n.hello();                                  // теперь сервер знает наш ник
      n.pushSave(slot, JSON.stringify(S.data));

      g.audio.sfx('unlock');
      this.bigMessage(r.created ? '☁ Аккаунт создан' : '☁ С возвращением, ' + r.nick,
        'Теперь в него можно войти с любого устройства');
      if (acc && A.birthdayPending(acc)) { this.show('birthday'); return; }
      this.show('menu');
    }

    // ============================================================
    //  ПЕРЕПИСКА С ДРУГОМ
    //  Письма лежат на сервере, поэтому дойдут, даже если друга
    //  сейчас нет в игре: увидит, когда зайдёт.
    // ============================================================
    /** Открыть переписку с этим другом. */
    talkTo(nick) {
      const n = this.net();
      this.talkWith = nick;
      if (n) { n.openTalk(nick); n.markRead(nick); }
      this.show('talk');
    }

    buildTalk() {
      const g = this.game, n = this.net();
      const ник = this.talkWith;
      $('#talk-title').textContent = '✉ ' + (ник || 'ПЕРЕПИСКА');

      const друг = ((n && n.friends) || []).find(f => f.nick === ник);
      const где = $('#talk-where');
      if (друг && друг.online) {
        где.innerHTML = друг.srv
          ? '<b style="color:var(--mint)">● ' + друг.srv + '</b>'
          : '<b style="color:var(--mint)">● в игре</b>';
      } else {
        где.innerHTML = '<span style="color:var(--dim)">○ не в игре</span>';
      }

      this.drawTalk();

      if (!this._talkBound) {
        this._talkBound = true;
        const inp = $('#talk-input'), go = $('#talk-go');
        const send = () => {
          const t = inp.value.trim();
          if (!t || !this.talkWith) return;
          n.write(this.talkWith, t);
          inp.value = '';
          g.audio.sfx('ui');
        };
        go.onclick = send;
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') send();
        });
        // письмо пришло, пока смотрим — дорисовываем
        n && (n.onTalk = (с_кем) => {
          if (this.current === 'talk' && с_кем === this.talkWith) this.drawTalk();
          if (this.current === 'server' && this.serverTab === 'friends') this.buildServer();
          this.updateMailBadge();
        });
      }
      setTimeout(() => $('#talk-input').focus(), 60);
    }

    drawTalk() {
      const n = this.net();
      const log = $('#talk-log');
      log.innerHTML = '';
      const письма = (n && n.talks.get(this.talkWith)) || [];
      if (!письма.length) {
        log.appendChild(el('div', 'empty-note',
          'Тут пока пусто. Напишите первое письмо 🐾'));
        return;
      }
      let прошлыйДень = '';
      for (const row of письма) {
        const d = new Date((row.ts || 0) * 1000);
        const день = d.toLocaleDateString('ru-RU');
        if (день !== прошлыйДень) {
          прошлыйДень = день;
          log.appendChild(el('div', 'talk-day', день));
        }
        const мой = row.f === (n && n.nick);
        const b = el('div', 'talk-msg' + (мой ? ' mine' : ''));
        b.innerHTML = '<div class="x"></div>' +
          '<div class="tm">' + d.toLocaleTimeString('ru-RU',
            { hour: '2-digit', minute: '2-digit' }) + '</div>';
        b.querySelector('.x').textContent = row.x;
        log.appendChild(b);
      }
      log.scrollTop = log.scrollHeight;
    }

    /** Сколько писем не прочитано — показываем в меню. */
    updateMailBadge() {
      const n = this.net();
      const b = $('#mail-badge');
      if (!b) return;
      const сколько = n ? n.unreadTotal() : 0;
      b.textContent = сколько > 9 ? '9+' : String(сколько);
      b.classList.toggle('hidden', !сколько);
    }

    // ============================================================
    //  ПОИСК ИГРОКА ПО НИКУ
    //  Ник помнят не полностью — сервер подсказывает похожие.
    // ============================================================
    /** Поле ввода ника с выпадающими подсказками. */
    nickField(box, onPick, ph) {
      const g = this.game, n = this.net();
      const обёртка = el('div', 'nick-find');
      const row = el('div', 'form-row');
      row.innerHTML = '<label>Ник</label>';
      const inp = el('input', 'f-input');
      inp.placeholder = ph || 'начните вводить ник';
      inp.maxLength = 16;
      inp.autocomplete = 'off';
      const btn = el('button', 'btn btn-good', '➕');
      row.append(inp, btn);
      обёртка.appendChild(row);

      const меню = el('div', 'nick-hints');
      обёртка.appendChild(меню);

      const рисовать = (список) => {
        меню.innerHTML = '';
        if (!список.length) { меню.classList.remove('open'); return; }
        меню.classList.add('open');
        const друзья = new Set(((n && n.friends) || []).map(f => f.nick.toLowerCase()));
        const в_сети = new Set(((n && n.online) || []).map(p => p.nick.toLowerCase()));
        for (const ник of список) {
          const low = ник.toLowerCase();
          const it = el('div', 'nick-hint');
          it.innerHTML = '<span class="n">' + ник + '</span>' +
            (друзья.has(low) ? '<span class="tag friend">🐾 друг</span>'
              : (в_сети.has(low) ? '<span class="tag on">● в игре</span>' : ''));
          it.onclick = () => {
            g.audio.sfx('hint');
            inp.value = ник;
            меню.classList.remove('open');
            onPick(ник);
          };
          меню.appendChild(it);
        }
      };

      inp.oninput = () => {
        const q = inp.value.trim();
        if (q.length < 2) { рисовать([]); return; }
        n && n.findNicks(q, (было, список) => {
          if (inp.value.trim() !== было) return;      // ответ опоздал
          рисовать(список);
        });
      };
      inp.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') btn.click();
        if (e.key === 'Escape') меню.classList.remove('open');
      };
      btn.onclick = () => {
        const v = inp.value.trim();
        if (v.length < 3) { this.toast('Ник короче трёх букв не бывает', 'warn'); return; }
        меню.classList.remove('open');
        onPick(v);
        inp.value = '';
      };

      box.appendChild(обёртка);
      return inp;
    }

    // ============================================================
    //  ВЫБОР СЕРВЕРА
    //  Игроку не нужны адреса: он видит названия и просто заходит.
    //  Постоянные сервера открыты всем, сервера игроков — на усмотрение
    //  того, кто их создал.
    // ============================================================
    buildServers() {
      const g = this.game, n = this.net();
      this.srvEditing = false;
      if (this.current !== 'servers') this.pickLoc = null;
      const box = $('#servers-body');
      box.innerHTML = '';
      this.netDot('#net-dot2');

      if (!n || !n.available()) {
        box.appendChild(el('div', 'acc-note',
          '<b style="color:#ff8a9a">Сервера сейчас недоступны.</b><br>' +
          'Нужен интернет — или свой сервер, его поднимает <b>ИГРАТЬ.bat</b>.'));
        return;
      }

      // ---- без ника на сервер не пускают ----
      // Раньше тут был тупик: игра писала «войдите в аккаунт» и на этом
      // всё заканчивалось — ни поиска сервера, ни кнопки, куда нажать.
      // Особенно обидно на телефоне, где обычно жмут «просто играть».
      if (!KM.ACCOUNT.current()) {
        box.appendChild(el('div', 'acc-note',
          '<b>Чтобы играть с другими, нужен ник.</b><br>' +
          'По нику вас узнаю́т друзья, и он подписывает вашего кота в чате. ' +
          'Это быстро — ник, пароль и всё.'));

        const зав = el('button', 'btn btn-big btn-good', '🐾 Завести аккаунт');
        зав.onclick = () => { g.audio.sfx('ui'); this.show('signup'); };
        box.appendChild(зав);

        const вх = el('button', 'btn', '🔑 У меня уже есть');
        вх.onclick = () => { g.audio.sfx('ui'); this.loginPick = null; this.show('login'); };
        box.appendChild(вх);

        box.appendChild(el('div', 'hint',
          'Играть одному можно и без аккаунта — но тогда вас не видно ' +
          'ни друзьям, ни на серверах.'));

        // Связь всё равно поднимаем — гостем. Тогда на экране входа сразу
        // заработают поля «аккаунт на сервере».
        if (n.available() && n.status !== 'online' && n.status !== 'connecting') {
          n.findServer(true);
        }
        if (n.status === 'error') this.fileWarning(box);
        return;
      }

      // ---- ещё ищем или не нашли ----
      if (n.status !== 'online') {
        if (n.status === 'error') this.fileWarning(box);
        const s2 = el('div', 'acc-note');
        s2.innerHTML = n.status === 'connecting'
          ? '<b>' + (n.reason || 'Подключаемся…') + '</b><br>' +
            'Игра сама обходит известные сервера — адрес вводить не нужно.'
          : '<b style="color:#ff8a9a">' + (n.reason || 'Связи нет') + '</b>';
        box.appendChild(s2);
        this.serversReport(box);

        const b = el('button', 'btn btn-big', '🔌 Искать сервера');
        b.onclick = () => {
          g.audio.sfx('ui');
          n.setHost('');                     // забываем прошлый адрес и ищем заново
          n.findServer(!KM.ACCOUNT.current(), () => this.buildServers());
          this.buildServers();
        };
        box.appendChild(b);

        // Домашний компьютер мог сменить номер — обойдём соседей.
        if (KM.SERVERS && KM.SERVERS.neighbours && KM.SERVERS.neighbours().length) {
          const дом = el('button', 'btn', '🏠 Поискать по всей домашней сети');
          const ход = el('div', 'hint', '');
          дом.onclick = () => {
            g.audio.sfx('ui');
            дом.disabled = true;
            this.srvEditing = true;          // не перерисовывать, пока ищем
            n.scanHome((сделано, всего) => {
              ход.innerHTML = 'Смотрим соседей: <b>' + сделано + '</b> из ' + всего + '…';
            }).then((нашли) => {
              this.srvEditing = false;
              дом.disabled = false;
              if (!нашли) {
                ход.innerHTML = '<b style="color:#ff8a9a">В домашней сети сервера нет.</b> ' +
                  'Проверьте, открыт ли <b>ИГРАТЬ.bat</b> на том компьютере ' +
                  'и в одном ли вы Wi-Fi.';
                return;
              }
              ход.innerHTML = 'Нашли: <b>' + нашли + '</b>';
              n.setHost(нашли);
              n.connect(true);
              setTimeout(() => this.buildServers(), 900);
            });
          };
          box.append(дом, ход);
          box.appendChild(el('div', 'hint',
            'Это на случай, если сервер дома работает, но переехал на другой номер. ' +
            'Поиск занимает несколько секунд.'));
        }

        this.serversAdvanced(box);
        return;
      }

      if (!n.servers.length) n.askServers();

      // Пришли сюда из выбора локации — показываем только подходящие
      if (this.pickLoc != null) { this.buildPickServer(box); return; }

      const свои = n.servers.filter(s2 => s2.own);
      const общие = n.servers.filter(s2 => !s2.own);

      box.appendChild(el('div', 'acc-note',
        'Выбирайте любой сервер и заходите — адрес вводить не нужно, игра нашла его сама' +
        (n.foundName ? ' (<b>' + n.foundName + '</b>)' : '') + '.<br>' +
        'Постоянные сервера <b>открыты всем</b>. Сервера игроков создают сами игроки — ' +
        'кого пускать, решает хозяин.'));

      this.phonePanel(box);

      box.appendChild(el('div', 'help-note', 'ОТКРЫТЫ ВСЕМ'));
      for (const srv of общие) box.appendChild(this.serverRow(srv));

      box.appendChild(el('div', 'help-note', 'СЕРВЕРА ИГРОКОВ'));
      if (!свои.length) {
        box.appendChild(el('div', 'empty-note',
          'Пока никто не создал свой сервер. Можно быть первым 🐾'));
      }
      for (const srv of свои) box.appendChild(this.serverRow(srv));

      const mk = el('button', 'btn btn-big btn-good', '✨ Создать свой сервер');
      mk.onclick = () => { g.audio.sfx('ui'); this.makeServerAsk(); };
      box.appendChild(mk);

      const мой = n.myRoom;
      if (мой) {
        this.myServerPanel(box);
        const off = el('button', 'btn btn-danger', '✖ Закрыть мой сервер «' + мой.name + '»');
        off.onclick = () => {
          g.audio.sfx('ui');
          n.closeServer(мой.id);
          setTimeout(() => this.buildServers(), 300);
        };
        box.appendChild(off);
      }

      this.serversAdvanced(box);
    }

    /**
     * Игру открыли как файл с диска. Такому файлу браузер часто запрещает
     * связываться с домашним сервером — и человек видит только «нет связи».
     * Поэтому предлагаем открыть ту же игру прямо с компьютера: одно
     * нажатие, и всё работает, потому что игра приезжает с сервера.
     */
    /** Игру запустили как файл с диска, а не открыли с сервера. */
    isFileMode() { return location.protocol === 'file:'; }

    fileWarning(box) {
      const g = this.game, n = this.net();
      if (!this.isFileMode()) return false;
      const адреса = (KM.SERVER_LIST || []).slice();
      if (!адреса.length) return false;

      box.appendChild(el('div', 'help-note', '📂 ИГРА ОТКРЫТА ИЗ ФАЙЛА'));
      box.appendChild(el('div', 'acc-note',
        'Файл лежит у вас на диске, а сервер — на компьютере. Некоторые браузеры ' +
        '<b>запрещают файлу</b> связываться с домашней сетью, и тогда серверов не видно, ' +
        'хотя они работают.<br>' +
        'Самый надёжный путь — открыть ту же игру <b>прямо с компьютера</b>. ' +
        'Прогресс и аккаунт останутся теми же.'));

      for (const адрес of адреса) {
        const полный = 'http://' + адрес + '/';
        const b = el('button', 'btn btn-big btn-good', '🚀 Открыть с компьютера');
        b.onclick = () => {
          g.audio.sfx('server');
          location.href = полный;
        };
        box.appendChild(b);
        const сам = el('div', 'phone-row');
        сам.innerHTML = '<span class="a">' + полный + '</span>';
        const cp = el('button', 'btn btn-sm', '📋 Скопировать');
        cp.onclick = () => {
          const ta = document.createElement('textarea');
          ta.value = полный;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          let ок = false;
          try { ок = document.execCommand('copy'); } catch (e) { }
          document.body.removeChild(ta);
          if (!ок && navigator.clipboard) navigator.clipboard.writeText(полный);
          g.audio.sfx('buy');
          this.toast('Адрес скопирован', 'good', 3000);
        };
        сам.appendChild(cp);
        box.appendChild(сам);
      }

      box.appendChild(el('div', 'hint',
        'Чтобы это сработало, на компьютере должен быть открыт <b>ИГРАТЬ.bat</b>, ' +
        'а телефон — в том же Wi-Fi. Играть одному файл умеет и без всего этого.'));
      return true;
    }

    // ============================================================
    //  НАСТРОЙКА ПРОФИЛЯ
    //  Имя, картинка, цвет, рассказ о себе и снимки из игры.
    //  Всё, кроме снимков, уезжает на сервер — чтобы друзья видели.
    // ============================================================
    buildEditProfile() {
      const g = this.game, A = KM.ACCOUNT, n = this.net();
      const acc = A.current();
      const box = $('#edit-body');
      box.innerHTML = '';
      if (!acc) { box.appendChild(el('div', 'empty-note', 'Сначала войдите в аккаунт')); return; }

      // ---------- картинка ----------
      box.appendChild(el('div', 'help-note', '🖼 КАРТИНКА ПРОФИЛЯ'));
      const шапка = el('div', 'ep-head');
      const ава = el('div', 'ep-ava');
      const рисоватьАву = () => {
        ава.innerHTML = '';
        if (acc.pic) {
          const im = document.createElement('img');
          im.src = acc.pic;
          ава.appendChild(im);
        } else {
          const cat = KM.CAT_BY[acc.avatar] || KM.CATS[0];
          ава.style.background = KM.cssColor(cat.pal.fur);
          ава.textContent = '🐱';
        }
      };
      рисоватьАву();
      шапка.appendChild(ава);

      const действия = el('div', 'ep-acts');
      const выбрать = el('button', 'btn btn-good', '📁 Выбрать картинку');
      const файл = el('input', 'hidden-file');
      файл.type = 'file';
      файл.accept = 'image/*';
      файл.style.display = 'none';
      файл.onchange = () => {
        const f = файл.files && файл.files[0];
        if (!f) return;
        выбрать.disabled = true; выбрать.textContent = 'уменьшаем…';
        A.shrink(f, 128, 0.72).then((данные) => {
          выбрать.disabled = false; выбрать.textContent = '📁 Выбрать картинку';
          A.update(acc.id, { pic: данные });
          acc.pic = данные;
          рисоватьАву();
          this.pushProfile();
          g.audio.sfx('buy');
          this.toast('Картинка обновлена 🖼', 'good');
        }).catch((e) => {
          выбрать.disabled = false; выбрать.textContent = '📁 Выбрать картинку';
          this.toast('Не вышло: ' + e.message, 'bad', 3500);
        });
        файл.value = '';
      };
      выбрать.onclick = () => { g.audio.sfx('ui'); файл.click(); };
      действия.append(выбрать, файл);

      const снимок = el('button', 'btn', '📸 Снимок из игры');
      снимок.onclick = () => {
        const кадр = this.grabShot(256);
        if (!кадр) { this.toast('Снимок делается во время игры', 'warn', 3200); return; }
        A.update(acc.id, { pic: кадр });
        acc.pic = кадр;
        рисоватьАву();
        this.pushProfile();
        g.audio.sfx('buy');
      };
      действия.appendChild(снимок);

      if (acc.pic) {
        const убрать = el('button', 'btn btn-danger', '✖ Убрать картинку');
        убрать.onclick = () => {
          A.update(acc.id, { pic: '' });
          acc.pic = '';
          рисоватьАву();
          this.pushProfile();
          g.audio.sfx('ui');
          this.buildEditProfile();
        };
        действия.appendChild(убрать);
      }
      шапка.appendChild(действия);
      box.appendChild(шапка);

      // ---------- имя ----------
      box.appendChild(el('div', 'help-note', '✏️ КАК ВАС ЗОВУТ'));
      const строка = el('div', 'form-row');
      строка.innerHTML = '<label>Имя</label>';
      const имя = el('input', 'f-input');
      имя.value = acc.name || acc.nick;
      имя.maxLength = 20;
      имя.onkeydown = (e) => e.stopPropagation();
      const сохр = el('button', 'btn btn-good', 'Сохранить');
      сохр.onclick = () => {
        const v = имя.value.trim();
        if (v.length < 2) { this.toast('Имя короче двух букв не бывает', 'warn'); return; }
        A.update(acc.id, { name: v });
        acc.name = v;
        this.pushProfile();
        g.audio.sfx('buy');
        this.toast('Имя изменено', 'good');
      };
      строка.append(имя, сохр);
      box.appendChild(строка);
      box.appendChild(el('div', 'hint',
        'Ник менять нельзя — по нему вас узнаю́т друзья. А имя это то, ' +
        'как вас зовут по-настоящему, и его можно поменять когда угодно.'));

      // ---------- цвет ----------
      box.appendChild(el('div', 'help-note', '🎨 ЦВЕТ ИМЕНИ И ЧАТА'));
      const цвета = el('div', 'ep-colors');
      for (const c of A.COLORS) {
        const т = el('button', 'ep-color' + (acc.color === c.id ? ' sel' : ''));
        т.style.background = c.css;
        т.title = c.name;
        т.onclick = () => {
          A.update(acc.id, { color: c.id });
          acc.color = c.id;
          this.pushProfile();
          g.audio.sfx('ui');
          this.buildEditProfile();
        };
        цвета.appendChild(т);
      }
      box.appendChild(цвета);
      const образец = el('div', 'ep-sample');
      образец.innerHTML = '<span style="color:' + A.colorCss(acc.color) + '">' +
        acc.nick + '</span>: так будет выглядеть ваше имя в чате 🐾';
      box.appendChild(образец);

      // ---------- о себе ----------
      box.appendChild(el('div', 'help-note', '📖 О СЕБЕ'));
      const рассказ = el('textarea', 'ep-bio');
      рассказ.value = acc.bio || '';
      рассказ.maxLength = 240;
      рассказ.placeholder = 'Любимый кот, любимая магия, что угодно…';
      рассказ.onkeydown = (e) => e.stopPropagation();
      box.appendChild(рассказ);
      const счёт = el('div', 'hint', '');
      const обновитьСчёт = () => {
        счёт.textContent = рассказ.value.length + ' из 240 знаков';
      };
      обновитьСчёт();
      рассказ.oninput = обновитьСчёт;
      box.appendChild(счёт);
      const сохрБио = el('button', 'btn btn-good', '💾 Сохранить рассказ');
      сохрБио.onclick = () => {
        A.update(acc.id, { bio: рассказ.value.trim() });
        acc.bio = рассказ.value.trim();
        this.pushProfile();
        g.audio.sfx('buy');
        this.toast('Сохранено', 'good');
      };
      box.appendChild(сохрБио);

      // ---------- снимки ----------
      box.appendChild(el('div', 'help-note', '📸 СНИМКИ ИЗ ИГРЫ'));
      box.appendChild(el('div', 'acc-note',
        'Снимок делается прямо во время игры — кнопка <b>📷</b> рядом с чатом ' +
        'или клавиша <b>P</b>. Здесь они хранятся, до восьми штук.'));

      const снимки = A.gallery.list(acc.id);
      if (!снимки.length) {
        box.appendChild(el('div', 'empty-note', 'Пока ни одного снимка'));
      } else {
        const сетка = el('div', 'ep-shots');
        снимки.forEach((ш, i) => {
          const карт = el('div', 'ep-shot');
          const im = document.createElement('img');
          im.src = ш.src;
          карт.appendChild(im);
          const низ = el('div', 'sh-bar');
          низ.textContent = new Date(ш.t).toLocaleDateString('ru-RU');
          const уд = el('button', 'sh-del', '✖');
          уд.onclick = () => {
            A.gallery.remove(acc.id, i);
            g.audio.sfx('ui');
            this.buildEditProfile();
          };
          низ.appendChild(уд);
          карт.appendChild(низ);
          сетка.appendChild(карт);
        });
        box.appendChild(сетка);
      }

      const добавить = el('button', 'btn', '📁 Добавить картинку в снимки');
      const файл2 = el('input', '');
      файл2.type = 'file'; файл2.accept = 'image/*'; файл2.style.display = 'none';
      файл2.onchange = () => {
        const f = файл2.files && файл2.files[0];
        if (!f) return;
        A.shrink(f, 320, 0.7).then((данные) => {
          const беда = A.gallery.add(acc.id, данные, '');
          if (беда) { this.toast(беда, 'warn', 4000); return; }
          g.audio.sfx('buy');
          this.buildEditProfile();
        }).catch((e) => this.toast('Не вышло: ' + e.message, 'bad'));
        файл2.value = '';
      };
      добавить.onclick = () => { g.audio.sfx('ui'); файл2.click(); };
      box.append(добавить, файл2);

      box.appendChild(el('div', 'hint',
        'Видео сюда, к сожалению, не поместится: даже короткий ролик весит ' +
        'больше, чем браузер разрешает хранить игре. Снимки — помещаются.'));
    }

    /** Снять то, что сейчас на экране игры. Вернёт картинку или null. */
    grabShot(сторона) {
      const g = this.game;
      const холст = g.renderer && g.renderer.canvas;
      if (!холст || !g.level) return null;
      try {
        const k = Math.min(1, (сторона || 320) / Math.max(холст.width, холст.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(холст.width * k));
        c.height = Math.max(1, Math.round(холст.height * k));
        c.getContext('2d').drawImage(холст, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.72);
      } catch (e) { return null; }
    }

    /** Сделать снимок и положить в галерею. */
    takeShot() {
      const A = KM.ACCOUNT, acc = A.current();
      if (!acc) { this.toast('Снимки хранятся в аккаунте', 'warn'); return; }
      const кадр = this.grabShot(320);
      if (!кадр) { this.toast('Снимок делается во время игры', 'warn'); return; }
      const беда = A.gallery.add(acc.id, кадр, this.game.level ? this.game.level.info.fullName : '');
      this.game.audio.sfx(беда ? 'error' : 'buy');
      this.toast(беда || '📸 Снимок сохранён — он в Профиле', беда ? 'warn' : 'good', 3000);
    }

    /** Отправить внешность профиля на сервер, чтобы друзья её видели. */
    pushProfile() {
      const A = KM.ACCOUNT, acc = A.current(), n = this.net();
      if (!acc || !n || n.status !== 'online') return;
      n.pushProfile({
        name: acc.name, region: acc.region, lang: acc.lang, avatar: acc.avatar,
        birth: acc.birth, color: acc.color || 'gold',
        bio: (acc.bio || '').slice(0, 240),
        pic: acc.pic || ''
      });
    }

    /** Адрес, который надо открыть на телефоне. */
    phonePanel(box) {
      const g = this.game, n = this.net();
      const адреса = (n && n.lan) || [];
      if (n && n.cloud) {
        box.appendChild(el('div', 'acc-note',
          '📱 Сервер живёт <b>в интернете</b> — с телефона просто откройте игру, ' +
          'всё найдётся само.'));
        return;
      }
      if (!адреса.length) return;

      box.appendChild(el('div', 'help-note', '📱 ИГРАТЬ С ТЕЛЕФОНА'));
      box.appendChild(el('div', 'acc-note',
        'Наберите этот адрес в браузере телефона — откроется та же игра, ' +
        'и вы окажетесь на одном сервере. Телефон должен быть в <b>том же Wi-Fi</b>.'));

      for (const адрес of адреса) {
        const полный = 'http://' + адрес + '/';
        const row = el('div', 'phone-row');
        row.innerHTML = '<span class="a">' + полный + '</span>';
        const cp = el('button', 'btn btn-sm btn-good', '📋 Скопировать');
        cp.onclick = () => {
          const ta = document.createElement('textarea');
          ta.value = полный;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          let ок = false;
          try { ок = document.execCommand('copy'); } catch (e) { }
          document.body.removeChild(ta);
          if (!ок && navigator.clipboard) navigator.clipboard.writeText(полный);
          g.audio.sfx('buy');
          this.toast('Адрес скопирован — отправьте его себе на телефон', 'good', 3500);
        };
        row.appendChild(cp);
        box.appendChild(row);
      }

      box.appendChild(el('div', 'hint',
        'Адрес работает, пока на этом компьютере открыт сервер. ' +
        'Если номер поменяется, игра найдёт его сама — кнопка ' +
        '«🏠 Поискать по всей домашней сети».'));
    }

    /** Разбор: куда игра стучалась и что ответило. */
    serversReport(box) {
      const n = this.net();
      const отчёт = n && n.report;
      if (!отчёт || !отчёт.length) return;

      box.appendChild(el('div', 'help-note', 'КУДА ИГРА СТУЧАЛАСЬ'));
      const список = el('div', 'diag');
      for (const r of отчёт) {
        const row = el('div', 'diag-row' + (r.ok ? ' ok' : ''));
        row.innerHTML =
          '<span class="s">' + (r.ok ? '\u2713' : '\u2717') + '</span>' +
          '<span class="h">' + r.host + '</span>' +
          '<span class="n">' + r.name + '</span>';
        список.appendChild(row);
      }
      box.appendChild(список);

      const домашний = отчёт.filter(r => /^(\d+\.){3}\d+:/.test(r.host));
      const сайт = отчёт.find(r => r.name === 'Этот сайт');
      let совет;
      if (сайт && !сайт.ok) {
        совет = 'Страница открылась, но сервер не отвечает. Похоже, ' +
          '<b>окно ИГРАТЬ.bat закрыли</b> — откройте его снова.';
      } else if (домашний.length && !домашний.some(r => r.ok)) {
        совет = 'Домашний компьютер не отзывается. Обычно причина одна из трёх:<br>' +
          '1) на компьютере <b>не открыт ИГРАТЬ.bat</b>;<br>' +
          '2) телефон в <b>другой сети</b> — не в том же Wi-Fi (или на мобильном интернете);<br>' +
          '3) у компьютера <b>сменился номер</b> — нажмите «🏠 Поискать по всей домашней сети».';
      } else {
        совет = 'Ни один адрес не отозвался. Проверьте, открыт ли <b>ИГРАТЬ.bat</b> ' +
          'и в одном ли вы Wi-Fi.';
      }
      box.appendChild(el('div', 'acc-note', совет));
    }

    /** Мой сервер: позвать друзей и навести порядок. */
    myServerPanel(box) {
      const g = this.game, n = this.net();
      const мой = n.myRoom;
      if (!мой) return;
      const строка = (n.servers || []).find(s2 => s2.id === мой.id);

      box.appendChild(el('div', 'help-note', '👑 ВАШ СЕРВЕР'));
      box.appendChild(el('div', 'acc-note',
        '<b>' + мой.name + '</b>' +
        (строка ? ' · котов внутри: <b>' + строка.players + '</b>/' + строка.limit : '') +
        '<br>Позовите друзей — им придёт приглашение прямо в игру.'));

      // друзья в сети — каждого можно позвать
      const друзья = (n.friends || []).filter(f => f.online);
      if (!друзья.length) {
        box.appendChild(el('div', 'empty-note', 'Никого из друзей сейчас нет в игре'));
      } else {
        for (const f of друзья) {
          const тут = f.room === мой.id;
          const row = el('div', 'wp-row');
          row.innerHTML = '<span class="nm">' + f.nick + '</span>' +
            (тут ? '<span class="k">уже тут</span>' : '');
          if (!тут) {
            const b = el('button', 'ab', '📨 Позвать');
            b.onclick = () => {
              g.audio.sfx('ui');
              n.invite(f.nick, мой.id);
              b.textContent = '✓ позвали';
              b.className = 'ab done';
            };
            row.appendChild(b);
          } else {
            const b = el('button', 'ab', '🚪');
            b.title = 'попросить уйти';
            b.onclick = () => {
              this.ask({
                title: '🚪 ВЫГНАТЬ', danger: true, ok: 'Выгнать',
                text: 'Попросить <b>' + f.nick + '</b> уйти с вашего сервера?<br>' +
                  'Обратно он уже не зайдёт.'
              }, (да) => { if (да) n.kickFrom(мой.id, f.nick); });
            };
            row.appendChild(b);
          }
          box.appendChild(row);
        }
      }

      // и все, кто сейчас на сервере, но не друг
      const чужие = (n.online || []).filter(p => p.room === мой.id && p.nick !== n.nick &&
        !(n.friends || []).some(f => f.nick === p.nick));
      for (const p of чужие) {
        const row = el('div', 'wp-row');
        row.innerHTML = '<span class="nm">' + p.nick + '</span>';
        const добавить = el('button', 'ab', '➕');
        добавить.title = 'в друзья';
        добавить.onclick = () => { g.audio.sfx('ui'); n.addFriend(p.nick); };
        const выгнать = el('button', 'ab', '🚪');
        выгнать.title = 'попросить уйти';
        выгнать.onclick = () => {
          this.ask({
            title: '🚪 ВЫГНАТЬ', danger: true, ok: 'Выгнать',
            text: 'Попросить <b>' + p.nick + '</b> уйти?'
          }, (да) => { if (да) n.kickFrom(мой.id, p.nick); });
        };
        row.append(добавить, выгнать);
        box.appendChild(row);
      }
    }

    /** Серверы именно для выбранной локации и режима. */
    buildPickServer(box) {
      const g = this.game, n = this.net();
      const i = this.pickLoc, режим = this.pickMode || 'coop';
      const инфо = KM.locationInfo(i);
      const мд = this.serverModes().find(m => m.id === режим) || { name: режим, icon: '🐾' };

      box.appendChild(el('div', 'acc-note',
        '<b>' + инфо.fullName + '</b> · ' + мд.icon + ' ' + мд.name + '<br>' +
        'Выберите, к кому присоединиться. Если никого нет — откройте свой сервер ' +
        'и позовите друзей.'));

      const подходят = n.servers.filter(s2 => s2.loc === i && s2.mode === режим);
      const друзья = подходят.filter(s2 => (s2.friends || []).length);
      const прочие = подходят.filter(s2 => !(s2.friends || []).length);

      if (друзья.length) {
        box.appendChild(el('div', 'help-note', '🐾 ТУТ ВАШИ ДРУЗЬЯ'));
        for (const srv of друзья) box.appendChild(this.serverRow(srv));
      }
      if (прочие.length) {
        box.appendChild(el('div', 'help-note', 'СЕРВЕРЫ ЗДЕСЬ'));
        for (const srv of прочие) box.appendChild(this.serverRow(srv));
      }
      if (!подходят.length) {
        box.appendChild(el('div', 'empty-note',
          'Здесь пока никого. Можно начать первым 🐾'));
      }

      box.appendChild(el('div', 'help-note', 'ИЛИ'));

      const сам = el('button', 'btn btn-big btn-good', '▶ Играть здесь');
      сам.onclick = () => {
        g.audio.sfx('server');
        g.netMode = режим;
        g.netServer = режим + ':' + i;      // постоянный сервер этой локации
        g.netCode = '';
        this.pickLoc = null;
        this.startLevel(i, true);
      };
      box.appendChild(сам);

      const мой = el('button', 'btn', '✨ Открыть свой сервер здесь');
      мой.onclick = () => {
        g.audio.sfx('ui');
        this.srvForm = Object.assign(this.srvForm || {}, {
          name: (KM.ACCOUNT.current() ? KM.ACCOUNT.current().nick : 'Кот') + ' зовёт',
          mode: режим, loc: i, limit: 30, code: '', who: 'all'
        });
        this.pickLoc = null;
        this.makeServerAsk();
      };
      box.appendChild(мой);

      const назад = el('button', 'btn', '← К выбору режима');
      назад.onclick = () => {
        g.audio.sfx('ui');
        this.pickLoc = null;
        this.modeIndex = i;
        this.show('mode');
      };
      box.appendChild(назад);
    }

    /** Одна строчка списка. */
    serverRow(srv) {
      const g = this.game, n = this.net();
      const ЗНАЧКИ = { coop: '🐾', team: '🔴', battle: '⚔', peace: '🌿' };
      const тут = srv.id === n.srv;
      const полно = srv.players >= srv.limit;

      const row = el('div', 'srv-row' + (тут ? ' here' : '') + (полно ? ' full' : ''));
      const info = KM.locationInfo(srv.loc);
      row.innerHTML =
        '<div class="ic">' + (ЗНАЧКИ[srv.mode] || '🐾') + '</div>' +
        '<div class="info">' +
        '<div class="nm">' + srv.name +
        (srv.locked ? ' <span class="lock">🔒</span>' : '') +
        (тут ? ' <span class="badge-here">вы тут</span>' : '') + '</div>' +
        '<div class="ds">' + srv.modeName + ' · ' + info.fullName +
        (srv.own ? ' · хозяин <b>' + srv.owner + '</b>' : '') +
        (srv.note ? '<br><span style="color:var(--mint)">' + srv.note + '</span>' : '') +
        (srv.who === 'friends' ? ' <span class="lock">🐾 только друзья</span>' : '') +
        (srv.friends && srv.friends.length
          ? '<br><b style="color:var(--mint)">🐾 тут ваши друзья: ' + srv.friends.join(', ') + '</b>'
          : '') +
        '</div></div>' +
        '<div class="cnt"><b>' + srv.players + '</b><span>/' + srv.limit + '</span></div>';

      row.onclick = () => {
        if (полно && !тут) { this.toast('Тут уже полно котов', 'warn'); return; }
        g.audio.sfx('server');
        if (srv.locked && !(srv.friends || []).length && srv.owner !== n.nick) {
          this.ask({
            title: '🔒 СЛОВО-КЛЮЧ', ok: 'Войти', input: '',
            text: 'Сервер <b>' + srv.name + '</b> закрыт.<br>Спросите слово-ключ у хозяина.'
          }, (code) => { if (code !== null) this.enterServer(srv, code); });
          return;
        }
        this.enterServer(srv, '');
      };
      return row;
    }

    /** Пойти на выбранный сервер. */
    enterServer(srv, code) {
      const g = this.game;
      g.netMode = srv.mode;
      g.netServer = srv.id;
      g.netCode = code || '';
      this.startLevel(srv.loc, true);
    }

    /** Спросить, каким будет свой сервер. */
    makeServerAsk() {
      const g = this.game, n = this.net();
      this.srvEditing = true;              // пока настраиваем — не перерисовывать
      const box = $('#servers-body');
      box.innerHTML = '';
      box.appendChild(el('div', 'help-note', 'ВАШ СОБСТВЕННЫЙ СЕРВЕР'));
      box.appendChild(el('div', 'acc-note',
        'Здесь всё решаете вы: название, во что играть, где и кого пускать. ' +
        'Сервер живёт, пока в нём кто-то есть, и виден всем в списке.'));

      const f = this.srvForm || (this.srvForm = {
        name: (KM.ACCOUNT.current() ? KM.ACCOUNT.current().nick : 'Кот') + ' зовёт',
        mode: 'coop', loc: 0, limit: 30, code: '', who: 'all', hidden: false, note: ''
      });
      if (!f.who) f.who = 'all';

      const поле = (label, key, ph, max) => {
        const r = el('div', 'form-row');
        r.innerHTML = '<label>' + label + '</label>';
        const i = el('input', 'f-input');
        i.value = f[key]; i.placeholder = ph; i.maxLength = max || 24;
        i.oninput = () => { f[key] = i.value; };
        i.onkeydown = (e) => e.stopPropagation();
        r.appendChild(i);
        box.appendChild(r);
      };
      поле('Название', 'name', 'как назовём');

      box.appendChild(el('div', 'help-note', 'ВО ЧТО ИГРАЕМ'));
      for (const md of this.serverModes()) {
        const c = el('div', 'mode-card' + (f.mode === md.id ? ' sel' : ''));
        c.innerHTML = '<div class="ic">' + md.icon + '</div><div class="info">' +
          '<div class="nm">' + md.name + '</div><div class="ds">' + md.desc + '</div></div>';
        c.onclick = () => { g.audio.sfx('ui'); f.mode = md.id; this.makeServerAsk(); };
        box.appendChild(c);
      }

      box.appendChild(el('div', 'help-note', 'ГДЕ'));
      const где = el('div', 'form-row');
      где.innerHTML = '<label>Локация</label>';
      const sel = el('select', 'f-input');
      const d = this.state.data;
      const открытые = [];
      for (let i = 0; i < KM.LEVELS; i++) {
        if (i === 0 || d.completed[i - 1] || d.unlocked >= i) открытые.push(i);
      }
      for (const i of (открытые.length ? открытые : [0])) {
        const o = document.createElement('option');
        o.value = i; o.textContent = KM.locationInfo(i).fullName;
        if (i === f.loc) o.selected = true;
        sel.appendChild(o);
      }
      sel.onchange = () => { f.loc = parseInt(sel.value, 10) || 0; };
      где.appendChild(sel);
      box.appendChild(где);

      box.appendChild(el('div', 'help-note', 'КОГО ПУСКАТЬ'));
      const ДОСТУП = [
        { id: 'all', ic: '🌍', nm: 'Всех подряд', ds: 'Любой кот увидит сервер в списке и зайдёт.' },
        { id: 'friends', ic: '🐾', nm: 'Только друзей', ds: 'Зайдут лишь те, с кем вы дружите. Остальных не пустит.' },
        { id: 'code', ic: '🔒', nm: 'По слову-ключу', ds: 'Нужно знать слово. Друзья заходят и без него.' }
      ];
      for (const д of ДОСТУП) {
        const c = el('div', 'mode-card' + (f.who === д.id ? ' sel' : ''));
        c.innerHTML = '<div class="ic">' + д.ic + '</div><div class="info">' +
          '<div class="nm">' + д.nm + '</div><div class="ds">' + д.ds + '</div></div>';
        c.onclick = () => { g.audio.sfx('ui'); f.who = д.id; this.makeServerAsk(); };
        box.appendChild(c);
      }
      if (f.who === 'code') поле('Слово-ключ', 'code', 'придумайте слово', 16);

      const скрыт = el('div', 'form-row');
      скрыт.innerHTML = '<label>В списке</label>';
      const пер = el('button', 'btn' + (f.hidden ? '' : ' btn-good'),
        f.hidden ? '🙈 Не показывать' : '👁 Показывать всем');
      пер.onclick = () => { g.audio.sfx('ui'); f.hidden = !f.hidden; this.makeServerAsk(); };
      скрыт.appendChild(пер);
      box.appendChild(скрыт);
      box.appendChild(el('div', 'hint',
        f.hidden
          ? 'Скрытый сервер не виден в общем списке — только вам и вашим друзьям. ' +
            'Удобно, когда хотите поиграть своей компанией.'
          : 'Сервер видно всем в списке. Кого пускать — решает настройка выше.'));

      поле('Подпись', 'note', 'например, «новичкам рады»', 60);

      const мест = el('div', 'form-row');
      мест.innerHTML = '<label>Мест</label>';
      const li = el('input', 'f-input');
      li.type = 'number'; li.min = 2; li.max = 30; li.value = f.limit;
      li.oninput = () => { f.limit = Math.max(2, Math.min(30, parseInt(li.value, 10) || 30)); };
      li.onkeydown = (e) => e.stopPropagation();
      мест.appendChild(li);
      box.appendChild(мест);

      const go = el('button', 'btn btn-big btn-good', '🚀 Открыть сервер');
      go.onclick = () => {
        if (!(f.name || '').trim()) { this.toast('Придумайте название', 'warn'); return; }
        g.audio.sfx('server');
        n.makeServer(f);
        setTimeout(() => {
          if (n.myRoom) {
            this.toast('Сервер «' + n.myRoom.name + '» открыт 🌍', 'good', 3500);
            this.buildServers();
          } else this.buildServers();
        }, 400);
      };
      box.appendChild(go);

      const back = el('button', 'btn', '← К списку');
      back.onclick = () => { g.audio.sfx('ui'); this.buildServers(); };
      box.appendChild(back);
    }

    /** Ручной адрес — на самый крайний случай. */
    serversAdvanced(box) {
      const g = this.game, n = this.net();
      const более = el('details', 'srv-more');
      more_summary(более, 'Вписать адрес вручную');
      const cur = n.customHost();
      const row = el('div', 'form-row');
      row.innerHTML = '<label>Адрес</label>';
      const inp = el('input', 'f-input');
      inp.placeholder = 'например, kotiki-server.onrender.com';
      inp.value = cur || '';
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') save.click(); };
      const save = el('button', 'btn btn-good', 'Готово');
      save.onclick = () => {
        g.audio.sfx('ui');
        n.setHost(inp.value);
        if (!inp.value) n.findServer(!KM.ACCOUNT.current(), () => this.buildServers());
        setTimeout(() => this.buildServers(), 500);
      };
      row.append(inp, save);
      более.appendChild(row);
      более.appendChild(el('div', 'hint',
        'Обычно сюда лезть не нужно: игра ищет сервера сама. Поле пригодится, ' +
        'если друг поднял свой сервер и дал вам адрес. Пустое поле — искать самой.'));
      box.appendChild(более);
    }

    // ============================================================
    //  ИГРА ВДВОЁМ ПО КОДУ
    //  Никакого сервера: браузеры соединяются напрямую.
    // ============================================================
    buildDirect() {
      const g = this.game, n = g.net;
      const box = $('#direct-body');
      box.innerHTML = '';
      const d = n.startDirect();

      if (!d || !d.supported()) {
        box.appendChild(el('div', 'acc-note',
          '<b style="color:#ff8a9a">Этот браузер не умеет прямые соединения.</b><br>' +
          'Попробуйте Chrome, Edge или Firefox посвежее.'));
        return;
      }

      box.appendChild(el('div', 'acc-note',
        'Здесь можно играть вместе <b>без всякого сервера</b>: браузеры соединяются ' +
        'напрямую. Ничей компьютер держать включённым не нужно — только ваши двое.<br>' +
        'Обменяться кодами надо один раз, дальше играете сколько хотите.'));

      // ---- уже в игре ----
      if (d.connected()) { this.buildDirectLive(box, d); return; }

      // комната создана, но друг ещё не пришёл
      if (d.hosting && d.hosting() && this.directCode) {
        box.appendChild(el('div', 'dwait', '⏳ Комната открыта, ждём друга…'));
      }

      const mode = this.directMode || null;
      if (!mode) {
        const a = el('div', 'mode-card');
        a.innerHTML = '<div class="ic">📨</div><div class="info">' +
          '<div class="nm">Создать игру</div>' +
          '<div class="ds">Вы получите код и отправите его другу. ' +
          'Монстров и правила будет считать ваш компьютер.</div></div>';
        a.onclick = () => { g.audio.sfx('ui'); this.directMode = 'host'; this.buildDirect(); };
        box.appendChild(a);

        const b = el('div', 'mode-card');
        b.innerHTML = '<div class="ic">🔗</div><div class="info">' +
          '<div class="nm">Присоединиться</div>' +
          '<div class="ds">Друг прислал код — вставьте его сюда ' +
          'и отправьте ответный код обратно.</div></div>';
        b.onclick = () => { g.audio.sfx('ui'); this.directMode = 'guest'; this.buildDirect(); };
        box.appendChild(b);
        return;
      }

      if (mode === 'host') this.buildDirectHost(box, d);
      else this.buildDirectGuest(box, d);

      const back = el('button', 'btn', '← Другой способ');
      back.onclick = () => {
        g.audio.sfx('ui');
        this.directMode = null;
        this.directCode = null;
        n.stopDirect();
        this.buildDirect();
      };
      box.appendChild(back);
    }

    /** Шаг с кодом: показать, скопировать. */
    codeStep(num, title, desc, code, done) {
      const st = el('div', 'dstep' + (done ? ' done' : ''));
      st.innerHTML = '<div class="num">' + (done ? '✓' : num) + '</div>' +
        '<div class="body"><div class="ttl">' + title + '</div>' +
        '<div class="ds">' + desc + '</div></div>';
      const body = st.querySelector('.body');
      if (code !== undefined) {
        const ta = el('textarea', 'dcode');
        ta.readOnly = true;
        ta.value = code;
        ta.onclick = () => ta.select();
        body.appendChild(ta);
        const row = el('div', 'drow');
        const cp = el('button', 'btn btn-sm btn-good', '📋 Скопировать код');
        cp.onclick = () => {
          ta.select();
          let ok = false;
          try { ok = document.execCommand('copy'); } catch (e) { }
          if (!ok && navigator.clipboard) {
            navigator.clipboard.writeText(code).then(
              () => this.toast('Код скопирован — отправьте другу', 'good'),
              () => this.toast('Скопируйте вручную: код выделен', 'warn'));
          } else {
            this.toast(ok ? 'Код скопирован — отправьте другу' : 'Код выделен, нажмите Ctrl+C',
              ok ? 'good' : 'warn');
          }
          this.game.audio.sfx('buy');
        };
        row.appendChild(cp);
        body.appendChild(row);
      }
      return st;
    }

    /** Поле, куда вставляют чужой код. */
    pasteStep(num, title, desc, btnText, onGo) {
      const st = el('div', 'dstep');
      st.innerHTML = '<div class="num">' + num + '</div>' +
        '<div class="body"><div class="ttl">' + title + '</div>' +
        '<div class="ds">' + desc + '</div></div>';
      const body = st.querySelector('.body');
      const ta = el('textarea', 'dcode');
      ta.placeholder = 'вставьте код сюда…';
      ta.onkeydown = (e) => e.stopPropagation();
      body.appendChild(ta);
      const row = el('div', 'drow');
      const go = el('button', 'btn btn-sm btn-good', btnText);
      go.onclick = () => onGo(ta.value, go, st);
      row.appendChild(go);
      body.appendChild(row);
      return st;
    }

    // ---------- создатель ----------
    buildDirectHost(box, d) {
      const g = this.game;
      box.appendChild(el('div', 'help-note', 'ВЫ СОЗДАЁТЕ ИГРУ'));

      if (!this.directCode) {
        const st = el('div', 'dstep');
        st.innerHTML = '<div class="num">1</div><div class="body">' +
          '<div class="ttl">Получить код</div>' +
          '<div class="ds">Нажмите — игра придумает код, который надо отдать другу.</div></div>';
        const b = el('button', 'btn btn-sm btn-good', '✨ Создать код');
        b.onclick = async () => {
          b.disabled = true;
          b.textContent = 'готовим…';
          try {
            this.directCode = await d.createInvite();
            this.buildDirect();
          } catch (e) {
            b.disabled = false;
            b.textContent = '✨ Создать код';
            this.toast('Не вышло: ' + e.message, 'bad', 4000);
          }
        };
        st.querySelector('.body').appendChild(b);
        box.appendChild(st);
        return;
      }

      if (d.reachable === false) {
        box.appendChild(el('div', 'acc-note',
          '<b style="color:#ffcf6a">Внешний адрес не нашёлся.</b><br>' +
          'Такой код сработает только внутри вашего Wi-Fi. Для друга из другого ' +
          'города нажмите «Создать код» ещё раз — иногда сеть отвечает не сразу.'));
      }
      box.appendChild(this.codeStep(1, 'Отправьте другу этот код',
        'Скопируйте и киньте любым способом — в мессенджере, почтой, как угодно. ' +
        (d.reachable ? 'Код годится и для друга из другого города.' : ''),
        this.directCode, true));

      box.appendChild(this.pasteStep(2, 'Вставьте ответный код',
        'Друг вставит ваш код у себя и получит ответный. Его — сюда.',
        '🎮 Соединиться',
        async (val, btn) => {
          if (!val.trim()) { this.toast('Вставьте ответный код', 'warn'); return; }
          btn.disabled = true;
          btn.textContent = 'соединяем…';
          try {
            await d.acceptAnswer(val);
            this.toast('Ждём друга…', 'good');
            setTimeout(() => this.buildDirect(), 1200);
          } catch (e) {
            btn.disabled = false;
            btn.textContent = '🎮 Соединиться';
            this.toast('Код не подошёл: ' + e.message, 'bad', 4000);
          }
        }));
    }

    // ---------- гость ----------
    buildDirectGuest(box, d) {
      box.appendChild(el('div', 'help-note', 'ВЫ ПРИСОЕДИНЯЕТЕСЬ'));

      if (!this.directCode) {
        box.appendChild(this.pasteStep(1, 'Вставьте код друга',
          'Тот самый код, который вам прислали.',
          '🔗 Принять',
          async (val, btn) => {
            if (!val.trim()) { this.toast('Вставьте код', 'warn'); return; }
            btn.disabled = true;
            btn.textContent = 'готовим ответ…';
            try {
              this.directCode = await d.joinByCode(val);
              this.buildDirect();
            } catch (e) {
              btn.disabled = false;
              btn.textContent = '🔗 Принять';
              this.toast('Код не подошёл: ' + e.message, 'bad', 4000);
            }
          }));
        return;
      }

      box.appendChild(this.codeStep(1, 'Код принят', 'Отлично, теперь ответный код.', undefined, true));
      box.appendChild(this.codeStep(2, 'Отправьте этот ответ другу',
        'Скопируйте и пришлите обратно. Как только он вставит его у себя — играем.',
        this.directCode, false));

      const w = el('div', 'dwait', '⏳ Ждём, пока друг вставит ответ…');
      box.appendChild(w);
    }

    // ---------- соединились ----------
    buildDirectLive(box, d) {
      const g = this.game, n = g.net;
      box.appendChild(el('div', 'help-note', 'ВЫ НА СВЯЗИ'));

      const info = el('div', 'dstep done');
      info.innerHTML = '<div class="num">✓</div><div class="body">' +
        '<div class="ttl">' + (d.role === 'host' ? 'Вы создатель игры' : 'Вы присоединились') + '</div>' +
        '<div class="ds">Котов на связи: <b>' + d.playersCount() + '</b>.' +
        (d.role === 'host'
          ? ' Монстров и счёт считает ваш компьютер.'
          : ' Правила считает тот, кто создал игру.') +
        '</div></div>';
      box.appendChild(info);

      const peers = el('div', 'dpeers');
      for (const p of (n.online || [])) {
        const row = el('div', 'dpeer');
        row.innerHTML = '🐱 <b>' + p.nick + '</b> · уровень ' + (p.level || 1) +
          (p.nick === n.nick ? ' · это вы' : '');
        peers.appendChild(row);
      }
      box.appendChild(peers);

      box.appendChild(el('div', 'acc-note',
        'Теперь идите в <b>▶ ИГРАТЬ</b>, выберите локацию и режим — и окажетесь там вместе. ' +
        'Работают все режимы, чат, стикеры, драки и выходки.'));

      const play = el('button', 'btn btn-big btn-good', '▶ ИГРАТЬ ВМЕСТЕ');
      play.onclick = () => { g.audio.sfx('ui'); this.show('locations'); };
      box.appendChild(play);

      if (d.role === 'host') {
        const more = el('button', 'btn', '➕ Позвать ещё одного');
        more.onclick = async () => {
          this.directMode = 'host';
          this.directCode = null;
          try {
            this.directCode = await d.createInvite();
            this.buildDirect();
          } catch (e) { this.toast('Не вышло: ' + e.message, 'bad'); }
        };
        box.appendChild(more);
      }

      const off = el('button', 'btn btn-danger', '✖ Разорвать связь');
      off.onclick = () => {
        g.audio.sfx('ui');
        g.quitToMenu();
        n.stopDirect();
        this.directMode = null;
        this.directCode = null;
        this.buildDirect();
      };
      box.appendChild(off);
    }

    // ============================================================
    //  РЕЖИМЫ СЕРВЕРА
    // ============================================================
    /** Четыре разных способа сыграть вместе. */
    serverModes() {
      return [
        { id: 'coop', icon: '🤝', name: 'Дружная охота',
          desc: 'Вместе бьём монстров и проходим локацию. Драться между собой можно, ' +
                'но главное — портал. Монстры <b>слабее</b>, а сбитые кем-то падают у всех.' },
        { id: 'team', icon: '🚩', name: 'Красные против синих',
          desc: 'Сервер делит всех на две команды. Кто первым наберёт <b>30 побед</b> — ' +
                'тот и выиграл. По своим удары не проходят. Монстры на месте.' },
        { id: 'battle', icon: '⚔️', name: 'Битва: один победитель',
          desc: 'Все против всех, <b>пять минут</b>. Монстров нет — только коты. ' +
                'В конце показываются первое, второе и третье места. ' +
                'Опыт и монеты <b>в полтора раза больше</b>.' },
        { id: 'peace', icon: '🕊', name: 'Мирный',
          desc: 'Ни монстров, ни драк. Просто гуляем, болтаем, показываем выходки ' +
                'и разглядываем интересные места.' }
      ];
    }

    /** Табло матча поверх игры. */
    updateMatchHud() {
      const box = $('#match-hud');
      if (!box) return;
      const g = this.game, n = g.net;
      const m = n && n.match;
      const on = !!(g.serverMode && g.level && m && g.mode === 'playing' && this.current === 'none');
      box.classList.toggle('hidden', !on);
      if (!on) return;

      $('#match-hud .mh-name').textContent = m.name || '';

      const tEl = $('#match-hud .mh-timer');
      if (m.timeLeft === null || m.timeLeft === undefined) {
        tEl.textContent = '';
        tEl.classList.remove('hot');
      } else {
        const mm = Math.floor(m.timeLeft / 60), ss = m.timeLeft % 60;
        tEl.textContent = mm + ':' + String(ss).padStart(2, '0');
        tEl.classList.toggle('hot', m.timeLeft <= 30);
      }

      const teams = $('#match-hud .mh-teams');
      teams.classList.toggle('hidden', !m.teams);
      if (m.teams && m.teamScore) {
        $('#match-hud .mh-red b').textContent = m.teamScore.red || 0;
        $('#match-hud .mh-blue b').textContent = m.teamScore.blue || 0;
        $('#match-hud .mh-goal').textContent = 'до ' + (m.goal || 30);
      }

      const rows = Object.keys(m.scores || {})
        .map(nick => ({ nick, k: m.scores[nick], team: m.myTeams && m.myTeams[nick] }))
        .sort((a, b) => b.k - a.k || a.nick.localeCompare(b.nick))
        .slice(0, 6);
      $('#match-hud .mh-board').innerHTML = rows.map(r =>
        '<div class="mh-row' + (r.nick === n.nick ? ' me' : '') +
        (r.team ? ' ' + r.team : '') + '">' +
        '<span class="n">' + r.nick + '</span><span class="k">' + r.k + '</span></div>').join('');
    }

    /** Матч закончился — показываем места и вручаем призы. */
    showMatchEnd(r) {
      const g = this.game, n = g.net;
      if (!r) { this.show('menu'); return; }
      this.matchResult = r;

      const box = $('#match-body');
      box.innerHTML = '';
      const me = n.nick;
      const mine = (r.places || []).findIndex(p => p.nick === me);
      const place = mine + 1;

      const b = el('div', 'win-banner');
      if (r.teamScore) {
        const w = r.winner;
        const won = w === n.team;
        b.innerHTML = '<div class="ic">' + (w === 'draw' ? '🤝' : (won ? '🏆' : '🚩')) + '</div>' +
          '<div class="tx">' + (w === 'draw' ? 'НИЧЬЯ'
            : (w === 'red' ? '<span class="team-red">КРАСНЫЕ ПОБЕДИЛИ</span>'
                           : '<span class="team-blue">СИНИЕ ПОБЕДИЛИ</span>')) + '</div>' +
          '<div class="sub">🔴 ' + (r.teamScore.red || 0) + ' — ' +
          (r.teamScore.blue || 0) + ' 🔵' +
          (won ? ' · вы в победившей команде!' : '') + '</div>';
      } else {
        const champ = r.winner === me;
        b.innerHTML = '<div class="ic">' +
          (champ ? '🏆' : (place === 2 ? '🥈' : (place === 3 ? '🥉' : '⚔️'))) + '</div>' +
          '<div class="tx">' + (champ ? 'ВЫ ПОБЕДИЛИ!'
            : (r.winner ? 'ПОБЕДИЛ ' + r.winner.toUpperCase() : 'МАТЧ ОКОНЧЕН')) + '</div>' +
          '<div class="sub">' + (place > 0 ? 'Ваше место: ' + place : 'Вы не набрали побед') + '</div>';
      }
      box.appendChild(b);

      const MED = ['🥇', '🥈', '🥉'];
      (r.places || []).forEach((p, i) => {
        const row = el('div', 'place' + (i < 3 ? ' p' + (i + 1) : '') + (p.nick === me ? ' me' : ''));
        row.innerHTML =
          '<div class="num">' + (MED[i] || (i + 1)) + '</div>' +
          '<div class="who"><div class="nm' + (p.team ? ' team-' + p.team : '') + '">' + p.nick +
          (p.nick === me ? ' <span class="tagline">это вы</span>' : '') + '</div>' +
          '<div class="ds">одолел котов: ' + p.kills + ' · сам падал: ' + (p.deaths || 0) + '</div></div>' +
          '<div class="cnt">' + p.kills + '</div>';
        box.appendChild(row);
      });

      const prize = this.matchPrize(r, place);
      if (prize.length) {
        box.appendChild(el('div', 'help-note', 'ВАША НАГРАДА'));
        const btn = el('button', 'btn btn-big btn-good', '🎁 Забрать награду');
        btn.onclick = () => { g.audio.sfx('ui'); this.showPrizes(prize, 'menu'); };
        box.appendChild(btn);
      } else {
        const btn = el('button', 'btn btn-big', '🐾 В меню');
        btn.onclick = () => { g.audio.sfx('ui'); this.show('menu'); };
        box.appendChild(btn);
      }

      const conf = $('#match-confetti');
      conf.innerHTML = '';
      const honor = place > 0 && place <= 3;
      if (honor) {
        const cols = ['#ffd23a', '#ff7ac0', '#6ae0ff', '#6ae0a8', '#a45aff'];
        for (let i = 0; i < 40; i++) {
          const c = document.createElement('i');
          c.style.left = (Math.random() * 100) + '%';
          c.style.background = cols[i % cols.length];
          c.style.animationDuration = (2.4 + Math.random() * 3) + 's';
          c.style.animationDelay = (-Math.random() * 4) + 's';
          conf.appendChild(c);
        }
      }

      g.quitToMenu();
      g.audio.jingle(honor ? 'victory' : 'defeat');
      $('#match-title').textContent = (r.mode === 'team' ? 'ИТОГИ СРАЖЕНИЯ' : 'ИТОГИ БИТВЫ');
      this.show('match');
    }

    /** Что дают за место. Победителю — крупно. */
    matchPrize(r, place) {
      const S = this.state;
      const out = [];
      const byTeam = !!r.teamScore;
      const won = byTeam ? (r.winner === this.game.net.team) : (place === 1);

      if (byTeam) {
        if (r.winner === 'draw') {
          out.push({ type: 'coins', n: 1500, rarity: 'rare' });
        } else if (won) {
          out.push({ type: 'coins', n: 6000, rarity: 'legendary' });
          out.push(KM.GACHA.rollPrize(S, 'epic'));
          out.push(KM.GACHA.rollPrize(S, 'mythic'));
        } else {
          out.push({ type: 'coins', n: 1200, rarity: 'common' });
        }
      } else if (place === 1) {
        out.push({ type: 'coins', n: 10000, rarity: 'legendary' });
        out.push(KM.GACHA.rollPrize(S, 'mythic'));
        out.push(KM.GACHA.rollPrize(S, 'legendary'));
        out.push({ type: 'item', id: 'scroll', n: 3, rarity: 'epic' });
      } else if (place === 2) {
        out.push({ type: 'coins', n: 5000, rarity: 'mythic' });
        out.push(KM.GACHA.rollPrize(S, 'epic'));
      } else if (place === 3) {
        out.push({ type: 'coins', n: 2500, rarity: 'epic' });
        out.push(KM.GACHA.rollPrize(S, 'rare'));
      } else if (place > 0) {
        out.push({ type: 'coins', n: 800, rarity: 'common' });
      }
      if (out.length) S.save();
      return out;
    }

    // ============================================================
    //  КОШАЧЬИ ВЫХОДКИ
    // ============================================================
    buildEmotes() {
      const g = this.game;
      const grid = $('#emote-grid');
      if (!grid || grid.children.length) return;
      KM.EMOTES.forEach((e, i) => {
        const b = el('button', 'ew-btn');
        b.title = e.desc;
        b.innerHTML = (i < 9 ? '<span class="num">' + (i + 1) + '</span>' : '') +
          '<span class="ic">' + e.icon + '</span><span class="nm">' + e.name + '</span>';
        b.onclick = () => this.playEmote(e.id);
        grid.appendChild(b);
      });
    }

    playEmote(id) {
      this.game.player.playEmote(id);
      this.setEmoteWheel(false);
    }

    setEmoteWheel(v) {
      const w = $('#emote-wheel');
      if (!w) return;
      this.emoteOpen = !!v;
      this.buildEmotes();
      w.classList.toggle('open', this.emoteOpen);
      $('#emote-toggle').classList.toggle('on', this.emoteOpen);
    }

    /** Кнопку выходок видно только во время игры. */
    syncEmotes() {
      const g = this.game;
      const want = g.mode === 'playing' && !!g.level && this.current === 'none';
      if (want === this._emoteShown) return;
      this._emoteShown = want;
      $('#emote-toggle').classList.toggle('gone', !want);
      if (!want) this.setEmoteWheel(false);
    }

    // ============================================================
    //  СЕРВЕР, ДРУЗЬЯ И СОВМЕСТНАЯ ИГРА
    // ============================================================
    net() { return this.game.net; }

    /** Экран «как играем»: вместе или одному. */
    askMode(index) {
      this.modeIndex = index;
      this.show('mode');
    }

    buildMode() {
      const g = this.game, n = this.net();
      const i = this.modeIndex || 0;
      const info = KM.locationInfo(i);
      $('#mode-title').textContent = info.fullName.toUpperCase();
      const box = $('#mode-body');
      box.innerHTML = '';

      const online = n && n.status === 'online';
      const here = online ? n.online.filter(p => p.loc === i && p.nick !== n.nick) : [];

      // ---- на сервере: четыре разных режима ----
      if (!online) {
        const off = el('div', 'mode-card off');
        off.innerHTML =
          '<div class="ic">🌐</div>' +
          '<div class="info"><div class="nm">Игра на сервере</div>' +
          '<div class="ds"><b style="color:#ff8a9a">' +
          (n && n.reason ? n.reason : 'Сервер не подключён') + '</b><br>' +
          'Сервер — это окно, которое открывает <b>ИГРАТЬ.bat</b>.</div></div>';
        const b = el('button', 'btn btn-sm',
          KM.ACCOUNT.current() ? '🔌 Подключиться' : '🐾 Завести аккаунт');
        b.onclick = (e) => {
          e.stopPropagation();
          g.audio.sfx('ui');
          if (!KM.ACCOUNT.current()) { this.show('signup'); return; }
          if (!n) return;
          if (n.url()) n.connect(true); else n.findServer(false);
        };
        off.querySelector('.info').appendChild(b);
        box.appendChild(off);
      } else {
        box.appendChild(el('div', 'help-note', 'ИГРАТЬ ВМЕСТЕ'));
        for (const md of this.serverModes()) {
          const тут = here.filter(p => (p.mode || 'coop') === md.id);
          const c = el('div', 'mode-card');
          c.innerHTML =
            '<div class="ic">' + md.icon + '</div>' +
            '<div class="info"><div class="nm">' + md.name + '</div>' +
            '<div class="ds">' + md.desc + '<br>' +
            (тут.length
              ? '<b style="color:var(--mint)">Уже здесь: ' + тут.map(p => p.nick).join(', ') + '</b>'
              : '<span style="opacity:.7">Пока никого — можно позвать друга</span>') +
            '</div></div>';
          c.onclick = () => {
            g.audio.sfx('ui');
            g.netMode = md.id;
            // Не бросаем сразу в игру: сперва показываем, какие тут есть
            // серверы — можно зайти к людям, а можно открыть свой.
            this.pickLoc = i;
            this.pickMode = md.id;
            if (n) n.askServers();
            this.show('servers');
          };
          box.appendChild(c);
        }
        box.appendChild(el('div', 'help-note', 'ИЛИ САМОМУ'));
      }

      // ---- одному ----
      const c2 = el('div', 'mode-card');
      c2.innerHTML =
        '<div class="ic">🐾</div>' +
        '<div class="info"><div class="nm">Играть одному</div>' +
        '<div class="ds">Тихо, спокойно и без интернета. Обычная сложность.</div></div>';
      c2.onclick = () => { g.audio.sfx('ui'); g.netMode = 'coop'; this.startLevel(i, false); };
      box.appendChild(c2);

      box.appendChild(el('div', 'acc-note',
        'Прогресс <b>один и тот же</b> в обоих режимах: монеты, уровень, коты и открытые ' +
        'локации сохраняются одинаково. Режим — это только про то, играете вы вместе или сами.'));
    }

    // ---------- экран сервера ----------
    buildServer() {
      const n = this.net(), g = this.game;
      const box = $('#server-body');
      box.innerHTML = '';
      this.serverTab = this.serverTab || 'online';
      $$('#server-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.serverTab));
      this.netDot();

      if (!n) { box.appendChild(el('div', 'empty-note', 'Сеть недоступна')); return; }

      if (!KM.ACCOUNT.current()) {
        box.appendChild(el('div', 'acc-note',
          '<b>Друзья появляются у того, у кого есть ник.</b><br>' +
          'Заведите аккаунт — и вас можно будет найти, позвать и написать вам.'));
        const зав = el('button', 'btn btn-big btn-good', '🐾 Завести аккаунт');
        зав.onclick = () => { g.audio.sfx('ui'); this.show('signup'); };
        const вх = el('button', 'btn', '🔑 У меня уже есть');
        вх.onclick = () => { g.audio.sfx('ui'); this.loginPick = null; this.show('login'); };
        box.append(зав, вх);
        return;
      }

      // состояние связи
      if (n.status !== 'online') {
        const s = el('div', 'acc-note');
        s.innerHTML = n.status === 'connecting'
          ? '<b>' + (n.reason || 'Подключаемся к серверу…') + '</b><br>' +
            'Игра сама обходит известные сервера — адрес вводить не нужно.'
          : '<b style="color:#ff8a9a">' + (n.reason || 'Сервер не подключён') + '</b><br>' +
            'Нужен интернет — или свой сервер, его поднимает <b>ИГРАТЬ.bat</b>.';
        box.appendChild(s);
        const b = el('button', 'btn btn-big', '🔌 Попробовать снова');
        b.onclick = () => {
          g.audio.sfx('ui');
          if (n.url()) n.connect(true);
          else n.findServer(false, () => this.buildServer());
          this.buildServer();
        };
        box.appendChild(b);
        return;
      }

      // Куда мы подключены — просто для сведения. Менять адрес незачем:
      // выбор серверов живёт на своём экране, а адрес игра находит сама.
      const где = el('div', 'hint');
      где.innerHTML = 'Вы на связи' + (n.foundName ? ' через <b>' + n.foundName + '</b>' : '') +
        '. Выбрать, где играть, можно в меню — <b>🌍 Сервера</b>.';
      box.appendChild(где);

      if (this.serverTab === 'online') this.buildServerOnline(box);
      else if (this.serverTab === 'friends') this.buildServerFriends(box);
      else this.buildServerAdd(box);
    }

    playerRow(p, opts) {
      const n = this.net();
      const cat = KM.CAT_BY[p.cat] || KM.CATS[0];
      const row = el('div', 'acc-row');
      row.style.cursor = 'default';
      const where = p.online === false
        ? '<span style="color:var(--dim)">не в сети</span>'
        : (p.loc != null && p.loc >= 0
          ? '🌍 ' + (p.locName || ('локация ' + (p.loc + 1)))
          : '🏠 в меню');
      row.innerHTML =
        '<div class="ico" style="background:' + KM.cssColor(cat.pal.fur) + '">🐱</div>' +
        '<div class="info"><div class="nm">' + p.nick +
        (p.nick === n.nick ? ' <span class="tagline">это вы</span>' : '') + '</div>' +
        '<div class="ds">' + (p.level ? 'уровень ' + p.level + ' · ' : '') + where + '</div></div>';
      const acts = el('div', 'row-acts');
      (opts || []).forEach(o => {
        const b = el('button', 'btn btn-sm' + (o.good ? ' btn-good' : (o.danger ? ' btn-danger' : '')), o.label);
        b.onclick = o.click;
        acts.appendChild(b);
      });
      row.appendChild(acts);
      return row;
    }

    buildServerOnline(box) {
      const n = this.net(), g = this.game;
      const list = n.online || [];
      box.appendChild(el('div', 'acc-note',
        'Все, кто сейчас в игре на этом сервере. Можно позвать в друзья прямо отсюда — ' +
        'даже если человек в другой локации.'));
      if (!list.length) { box.appendChild(el('div', 'empty-note', 'Пока никого нет')); return; }
      const friends = new Set((n.friends || []).map(f => f.nick.toLowerCase()));
      for (const p of list) {
        const mine = p.nick === n.nick;
        const isFriend = friends.has(p.nick.toLowerCase());
        const acts = [];
        if (!mine && !isFriend) {
          acts.push({ label: '➕ В друзья', good: true, click: () => { g.audio.sfx('ui'); n.addFriend(p.nick); } });
        }
        if (!mine && g.level) {
          acts.push({ label: '📨 Позвать', click: () => { g.audio.sfx('ui'); n.invite(p.nick); } });
        }
        if (isFriend) acts.push({ label: '🐾 друг', click: () => { this.serverTab = 'friends'; this.buildServer(); } });
        box.appendChild(this.playerRow(p, acts));
      }
    }

    buildServerFriends(box) {
      const n = this.net(), g = this.game;

      if ((n.requests || []).length) {
        box.appendChild(el('div', 'help-note', 'ЗАЯВКИ В ДРУЗЬЯ'));
        for (const nick of n.requests) {
          box.appendChild(this.playerRow({ nick, online: undefined, loc: null }, [
            { label: '✔ Принять', good: true, click: () => { g.audio.sfx('buy'); n.acceptFriend(nick); } },
            { label: '✖', danger: true, click: () => { g.audio.sfx('ui'); n.declineFriend(nick); } }
          ]));
        }
      }

      box.appendChild(el('div', 'help-note', 'ДРУЗЬЯ'));
      const list = n.friends || [];
      if (!list.length) {
        box.appendChild(el('div', 'empty-note',
          'Друзей пока нет. Загляните во вкладку «Кто играет» или добавьте по нику.'));
        return;
      }
      for (const f of list) {
        const acts = [];
        const писем = n.unreadOf(f.nick);
        acts.push({
          label: писем ? '✉ ' + писем : '✉',
          good: !!писем,
          click: () => { g.audio.sfx('ui'); this.talkTo(f.nick); }
        });
        if (f.online && g.level) acts.push({ label: '📨 Позвать сюда', good: true, click: () => { g.audio.sfx('ui'); n.invite(f.nick); } });
        if (f.online && f.room) {
          // Уйти к другу можно и посреди игры — просто перенесёмся к нему.
          acts.push({
            label: '🌍 К нему', good: true,
            click: () => { g.audio.sfx('server'); this.joinFriend(f.nick); }
          });
        }
        acts.push({ label: '✖', danger: true, click: () => {
          this.ask({ title: '🐾 ДРУЗЬЯ', text: 'Убрать <b>' + f.nick + '</b> из друзей?', ok: 'Убрать', danger: true },
            (yes) => { if (yes) n.removeFriend(f.nick); });
        } });
        box.appendChild(this.playerRow(f, acts));
      }
    }

    buildServerAdd(box) {
      const n = this.net(), g = this.game;
      box.appendChild(el('div', 'acc-note',
        'Начните вводить ник — игра подскажет похожие. Заявка улетит, даже если ' +
        'друг сейчас не в игре: увидит, когда зайдёт.'));

      this.nickField(box, (ник) => {
        g.audio.sfx('ui');
        n.addFriend(ник);
      }, 'например, КотоМастер');

      box.appendChild(el('div', 'hint',
        'Не помните ник целиком? Впишите первые буквы — подсказки появятся сами. ' +
        'Игра ищет и среди тех, кто сейчас не в игре.'));
    }

    /** Прийти к другу на его сервер. */
    joinFriend(nick) {
      const n = this.net();
      n.goToFriend(nick, (m) => {
        if (!m || !m.srv) return;
        if (!this.state.isUnlocked(m.loc)) {
          this.toast('Эта локация вам ещё не открыта', 'warn', 3500);
          return;
        }
        const g = this.game;
        g.netMode = m.mode || 'coop';
        g.netServer = m.srv;
        g.netCode = '';
        this.toast('Идём к ' + m.nick + (m.name ? ' на «' + m.name + '»' : ''), 'good', 3000);
        this.startLevel(m.loc, true);
      });
    }

    /** Кружок «сеть жива» в шапке. */
    netDot(sel) {
      const d = $(sel || '#net-dot');
      if (!d) return;
      const n = this.net();
      const st = n ? n.status : 'off';
      d.className = 'net-dot ' + st;
      d.textContent = st === 'online' ? ('● в сети · ' + (n.online || []).length)
        : (st === 'connecting' ? '● подключаемся…' : '● нет связи');
    }

    /** Значок «кто рядом» во время игры. */
    updateNetBadge() {
      const b = $('#net-badge');
      if (!b) return;
      const n = this.net();
      const on = n && this.game.serverMode && this.game.level;
      b.classList.toggle('hidden', !on);
      if (!on) return;
      const names = Array.from(n.peers.values()).map(p => p.nick);
      b.innerHTML = '<b>🌐 На сервере</b>' +
        (names.length ? '<span>рядом: ' + names.join(', ') + '</span>' : '<span>вы тут одни</span>');
    }

    /** Пришло приглашение от друга. */
    serverInvite(m) {
      const g = this.game;
      g.audio.sfx('unlock');
      this.ask({
        title: '📨 ПРИГЛАШЕНИЕ',
        text: '<b>' + m.from + '</b> зовёт играть вместе:<br><b style="color:var(--gold)">' +
          (m.srvName ? m.srvName + '</b><br><span style="color:var(--dim)">' +
            (m.locName || ('локация ' + (m.loc + 1))) + '</span>'
            : (m.locName || ('локация ' + (m.loc + 1))) + '</b>') +
          '<br>Идём?',
        ok: '🌐 Идём!', cancel: 'Не сейчас'
      }, (yes) => {
        if (!yes) return;
        if (!this.state.isUnlocked(m.loc)) { this.toast('Эта локация вам ещё не открыта 😿', 'warn', 3200); return; }
        // идём именно на тот сервер, откуда позвали, а не просто в локацию
        g.netServer = m.srv || null;
        g.netMode = m.mode || g.netMode || 'coop';
        g.netCode = m.code || '';
        this.startLevel(m.loc, true);
      });
    }

    // ============================================================
    //  УСТРОЙСТВО
    // ============================================================
    /** Ряд с выбором устройства — одинаковый на входе, при регистрации и в настройках. */
    deviceRow(current, onPick) {
      const g = this.game;
      const wrap = el('div', 'dev-row');
      for (const k of KM.DEVICE.KINDS) {
        const b = el('div', 'dev-card' + (current === k.id ? ' on' : ''));
        b.innerHTML = '<div class="ic">' + k.icon + '</div><div class="nm">' + k.name + '</div>' +
          '<div class="ds">' + k.desc + '</div>';
        b.onclick = () => { g.audio.sfx('ui'); onPick(k.id); };
        wrap.appendChild(b);
      }
      return wrap;
    }

    /** Применить устройство ко всей игре. */
    setDevice(id) {
      const g = this.game, S = this.state;
      KM.DEVICE.set(id);
      S.data.settings = KM.DEVICE.tune(S.data.settings, id);
      S.save();
      g.applySettings();
      if (g.touch) g.touch.sync();
      this.applyHudLayout();
      this.resize();
      const acc = KM.ACCOUNT && KM.ACCOUNT.current();
      if (acc) KM.ACCOUNT.update(acc.id, { device: id });
      this.toast('Управление настроено: ' + KM.DEVICE.name(id), 'good', 2600);
    }

    // ============================================================
    //  СЕКРЕТНЫЕ КОДЫ
    // ============================================================
    /** Игрок нажал «Применить» в меню. */
    applyCode() {
      const g = this.game;
      const inp = $('#code-input');
      const msg = $('#code-msg');
      const res = KM.CODES.redeem(g, inp.value);

      if (!res.ok) {
        msg.textContent = res.error;
        msg.className = 'code-msg bad';
        g.audio.sfx('error');
        inp.select();
        return;
      }

      inp.value = '';
      msg.textContent = '';
      msg.className = 'code-msg';
      g.audio.jingle('victory');

      // всё могло измениться: характеристики, панели, монеты
      g.player.applyStats();
      this.updateSpellBar();
      this.updateHud();
      this.refreshCoins();

      if (this.game.net) this.game.net.refreshMe();
      this.codeResult = res;
      this.show('code');
    }

    buildCode() {
      const res = this.codeResult;
      const box = $('#code-body');
      box.innerHTML = '';
      if (!res) { this.show('menu'); return; }
      const c = res.code;

      const head = el('div', 'code-head',
        '<div class="ic">' + c.icon + '</div>' +
        '<div class="nm">' + c.name + '</div>' +
        '<div class="sub">код <b>' + c.ru + '</b> · ' + c.id + '</div>');
      box.appendChild(head);

      for (const line of res.lines) {
        const m = line.match(/^(\S+)\s([\s\S]*)$/);
        const p = el('div', 'code-prize');
        if (m && /^\p{Extended_Pictographic}/u.test(m[1])) {
          p.innerHTML = '<i>' + m[1] + '</i><span>' + m[2] + '</span>';
        } else {
          p.innerHTML = '<i>✦</i><span>' + line + '</span>';
        }
        box.appendChild(p);
      }

      // если выпал кот — покажем его вживую
      if (res.cat && KM.CAT_BY[res.cat]) {
        const b = el('button', 'btn btn-big', '🐱 Посмотреть кота');
        b.onclick = () => { this.game.audio.sfx('ui'); this.revealCat(res.cat, 'menu'); };
        box.appendChild(b);
      }

      const ok = el('button', 'btn btn-big btn-good', '🐾 Отлично!');
      ok.onclick = () => { this.game.audio.sfx('ui'); this.codeResult = null; this.show('menu'); };
      box.appendChild(ok);

      // конфетти
      const conf = $('#code-confetti');
      conf.innerHTML = '';
      const cols = ['#ffd23a', '#ff7ac0', '#6ae0ff', '#6ae0a8', '#a45aff'];
      for (let i = 0; i < 34; i++) {
        const s = document.createElement('i');
        s.style.left = (Math.random() * 100) + '%';
        s.style.background = cols[i % cols.length];
        s.style.animationDuration = (2.2 + Math.random() * 2.6) + 's';
        s.style.animationDelay = (-Math.random() * 3) + 's';
        conf.appendChild(s);
      }
    }

    // ============================================================
    //  АККАУНТЫ
    // ============================================================
    /** Что показать при запуске игры. */
    bootAccount() {
      const A = KM.ACCOUNT;
      let st;
      try { st = A.startupState(); } catch (e) { st = { screen: 'signup' }; }
      if (st.screen === 'auto') {
        A.resume(st.account.id);
        this.afterLogin(st.account);
        return;
      }
      this.loginNote = st.reason || '';
      this.loginRelogin = !!st.relogin;
      this.show(st.screen === 'signup' ? 'signup' : 'login');
    }

    /** Общий вход: подхватываем сохранения аккаунта и проверяем праздник. */
    afterLogin(acc) {
      const g = this.game, S = this.state;
      KM.SAVES.migrateOld();
      S.loadSlot(KM.SAVES.currentSlot());
      if (!KM.DEVICE.get() && acc.device) KM.DEVICE.set(acc.device);
      S.data.settings = KM.DEVICE.tune(S.data.settings);
      g.applySettings();
      g.player.applyStats();
      this.updateSpellBar();
      if (g.net && g.net.available()) g.net.connect(true);   // на сервер — уже под своим ником
      this.toast('С возвращением, ' + acc.nick + '! 🐾', 'good', 2600);
      if (KM.ACCOUNT.birthdayPending(acc)) { this.show('birthday'); return; }
      this.show('menu');
    }

    // ---------- экран входа ----------
    buildLogin() {
      const A = KM.ACCOUNT, g = this.game;
      const box = $('#login-body');
      box.innerHTML = '';
      const list = A.list();

      box.appendChild(el('div', 'acc-note',
        (this.loginNote ? '<b>' + this.loginNote + '</b><br>' : '') +
        'Аккаунты бывают двух видов. <b>На устройстве</b> — интернет не нужен, игра работает ' +
        'офлайн, но прогресс живёт только здесь. <b>На сервере</b> — войти можно с любого ' +
        'устройства, и прогресс едет за вами.'));

      if (!list.length) box.appendChild(el('div', 'empty-note', 'На этом устройстве ещё нет аккаунтов'));

      for (const a of list) {
        const cat = KM.CAT_BY[a.avatar] || KM.CATS[0];
        const days = Math.floor((Date.now() - (a.lastLogin || 0)) / 86400000);
        const bd = A.daysToBirthday(a);
        const row = el('div', 'acc-row' + (this.loginPick === a.id ? ' sel' : ''));
        row.innerHTML =
          '<div class="ico" style="background:' + KM.cssColor(cat.pal.fur) + '">🐱</div>' +
          '<div class="info"><div class="nm">' + a.nick +
          (a.isServer ? ' <span class="srv-badge">☁ на сервере</span>' : '') +
          (bd === 0 ? ' <span class="bd-badge">🎂 сегодня ДР!</span>' : '') + '</div>' +
          '<div class="ds">' + a.name + ' · ' + A.regionName(a.region) + ' · ' + A.langName(a.lang) + '<br>' +
          (days <= 0 ? 'заходил сегодня' : ('не заходил ' + days + ' дн.')) + '</div></div>';
        row.onclick = () => { this.loginPick = a.id; g.audio.sfx('ui'); this.buildLogin(); };
        box.appendChild(row);

        if (this.loginPick === a.id) {
          const form = el('div', 'form-row');
          form.innerHTML = '<label>Пароль</label>';
          const inp = el('input', 'f-input');
          inp.type = 'password'; inp.placeholder = 'введите пароль';
          const err = el('div', 'f-err');
          const btn = el('button', 'btn btn-good', 'Войти');
          btn.onclick = () => {
            // Серверный аккаунт проверяет сервер: пароля от него на устройстве нет.
            if (a.isServer) {
              const n = g.net;
              if (!n || n.status !== 'online') {
                err.textContent = 'Нет связи с сервером — этот аккаунт живёт там';
                g.audio.sfx('error');
                return;
              }
              err.textContent = '';
              btn.disabled = true; btn.textContent = 'входим…';
              n.authorize(a.nick, inp.value, (r) => {
                btn.disabled = false; btn.textContent = 'Войти';
                if (!r.ok) { err.textContent = r.error; g.audio.sfx('error'); return; }
                this.afterCloudLogin(r);
              });
              return;
            }
            const r = A.login(a.id, inp.value);
            if (!r.ok) { err.textContent = r.error; g.audio.sfx('error'); return; }
            g.audio.sfx('unlock');
            this.afterLogin(r.account);
          };
          inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') btn.click(); };
          form.append(inp, btn);
          box.append(form, err);
          setTimeout(() => inp.focus(), 40);
        }
      }

      box.appendChild(el('div', 'help-note', 'НА ЧЁМ ИГРАЕТЕ'));
      box.appendChild(this.deviceRow(KM.DEVICE.get() || KM.DEVICE.guess(), (id) => {
        this.setDevice(id); this.buildLogin();
      }));

      this.cloudBlock(box);

      const add = el('button', 'btn btn-big', '✨ Создать новый аккаунт');
      add.style.marginTop = '14px';
      add.onclick = () => { g.audio.sfx('ui'); this.show('signup'); };
      box.appendChild(add);
    }

    // ---------- создание аккаунта ----------
    buildSignup() {
      const A = KM.ACCOUNT, g = this.game;
      const box = $('#signup-body');
      box.innerHTML = '';
      $('#scr-signup .btn-back').classList.toggle('hidden', A.list().length === 0);

      const f = this.signupData || (this.signupData = {
        nick: '', pass: '', pass2: '', name: '',
        region: 'ru', lang: 'ru', avatar: 'muri', d: 1, m: 1, y: 2014
      });

      // Друг, которому скинули игру, должен просто нажать и играть.
      // Анкета — для тех, кто хочет праздник в день рождения и свой ник.
      const quick = el('div', 'quick-play');
      quick.innerHTML =
        '<div class="qp-ic">🐾</div>' +
        '<div class="qp-tx"><b>Первый раз?</b><br>' +
        'Можно сразу начать играть — аккаунт заведёте потом, когда захотите.</div>';
      const qb = el('button', 'btn btn-big btn-good', '▶ ПРОСТО ИГРАТЬ');
      qb.onclick = () => this.playAsGuest();
      quick.appendChild(qb);
      box.appendChild(quick);

      if (!KM.ACCOUNT.storageWorks()) {
        box.appendChild(el('div', 'acc-note',
          '<b style="color:#ffcf6a">Этот браузер не даёт игре ничего сохранять.</b><br>' +
          'Играть можно, но прогресс пропадёт при закрытии. Чтобы он сохранялся, ' +
          'откройте игру через <b>ИГРАТЬ.bat</b> или разрешите сайту хранить данные.'));
      }

      this.cloudBlock(box);

      box.appendChild(el('div', 'help-note', 'ИЛИ АККАУНТ ТОЛЬКО НА ЭТОМ УСТРОЙСТВЕ'));
      box.appendChild(el('div', 'acc-note',
        'Аккаунт нужен, чтобы игры разных людей не перепутались на одном устройстве, ' +
        'и чтобы друзья узнавали вас по нику. Всё хранится <b>локально</b>.<br>' +
        '<b>Дату рождения</b> мы спрашиваем ради праздника: в этот день вас ждёт целая вечеринка ' +
        'с подарками, редким котом и скидками в магазине.'));

      const textRow = (label, key, ph, type) => {
        const r = el('div', 'form-row');
        r.innerHTML = '<label>' + label + '</label>';
        const i = el('input', 'f-input');
        i.type = type || 'text'; i.placeholder = ph; i.value = f[key] || ''; i.maxLength = 32;
        i.oninput = () => { f[key] = i.value; };
        i.onkeydown = (e) => e.stopPropagation();
        r.appendChild(i);
        box.appendChild(r);
      };
      const segRow = (label, key, opts, hint) => {
        const r = el('div', 'form-row');
        r.innerHTML = '<label>' + label + '</label>';
        const w = el('div', 'f-sel');
        opts.forEach(o => {
          const b = el('button', (f[key] === o.id ? 'on' : '') + (o.ready === false ? ' soon' : ''),
            (o.flag ? o.flag + ' ' : '') + o.name + (o.ready === false ? ' (скоро)' : ''));
          b.onclick = () => { f[key] = o.id; g.audio.sfx('ui'); this.buildSignup(); };
          w.appendChild(b);
        });
        r.appendChild(w);
        box.appendChild(r);
        if (hint) { const h = el('div', 'form-row'); h.appendChild(el('div', 'hint', hint)); box.appendChild(h); }
      };

      textRow('Ник в игре', 'nick', 'например, КотоМастер');
      textRow('Пароль', 'pass', 'не короче 4 символов', 'password');
      textRow('Повторите пароль', 'pass2', 'ещё раз', 'password');
      textRow('Как вас зовут', 'name', 'имя или прозвище');
      segRow('Регион', 'region', A.REGIONS);


      const dr = el('div', 'form-row');
      dr.innerHTML = '<label>Дата рождения</label>';
      const wrap = el('div', 'f-date');
      const mkSel = (key, from, to, fmt) => {
        const sel = document.createElement('select');
        for (let v = from; v <= to; v++) {
          const o = document.createElement('option');
          o.value = v; o.textContent = fmt ? fmt(v) : v;
          if (f[key] === v) o.selected = true;
          sel.appendChild(o);
        }
        sel.onchange = () => { f[key] = +sel.value; };
        return sel;
      };
      const nowY = new Date().getFullYear();
      wrap.append(mkSel('d', 1, 31), mkSel('m', 1, 12, (v) => A.MONTHS[v - 1]), mkSel('y', 1930, nowY));
      dr.appendChild(wrap);
      box.appendChild(dr);
      const bdHint = el('div', 'form-row');
      bdHint.appendChild(el('div', 'hint', 'В этот день игра устроит вечеринку: подарки, призы, сюрпризы и супер-акции.'));
      box.appendChild(bdHint);

      // на чём играем
      const dv = el('div', 'form-row');
      dv.innerHTML = '<label>На чём играете</label>';
      box.appendChild(dv);
      box.appendChild(this.deviceRow(f.device || (f.device = KM.DEVICE.get() || KM.DEVICE.guess()),
        (id) => { f.device = id; this.setDevice(id); this.buildSignup(); }));

      const av = el('div', 'form-row');
      av.innerHTML = '<label>Аватар</label>';
      const avw = el('div', 'f-sel');
      KM.CATS.filter(c => c.rarity === 'common').forEach(c => {
        const b = el('button', f.avatar === c.id ? 'on' : '', '🐱 ' + c.name);
        b.onclick = () => { f.avatar = c.id; g.audio.sfx('ui'); this.buildSignup(); };
        avw.appendChild(b);
      });
      av.appendChild(avw);
      box.appendChild(av);

      const err = el('div', 'f-err');
      box.appendChild(err);

      const go = el('button', 'btn btn-big', '🐾 Создать и играть');
      go.onclick = () => {
        if (f.pass !== f.pass2) { err.textContent = 'Пароли не совпадают'; g.audio.sfx('error'); return; }
        const r = A.create({
          nick: f.nick, pass: f.pass, name: f.name, region: f.region,
          lang: f.lang, avatar: f.avatar, device: f.device, birth: { d: f.d, m: f.m, y: f.y }
        });
        if (!r.ok) { err.textContent = r.error; g.audio.sfx('error'); return; }
        const nick = r.account.nick;
        this.signupData = null;
        g.audio.jingle('victory');
        KM.SAVES.migrateOld();
        KM.SAVES.setCurrentSlot(0);
        if (KM.SAVES.summary(0).empty) this.state.newGame(0, 'Игра ' + nick);
        this.afterLogin(r.account);
        this.bigMessage('🐾 Добро пожаловать, ' + nick + '!', 'Обучение подскажет всё по ходу дела');
      };
      box.appendChild(go);
    }

    /** Быстрый старт без анкеты — для того, кому просто скинули игру. */
    playAsGuest() {
      const g = this.game;
      const A = KM.ACCOUNT;
      g.audio.ensure();
      g.audio.sfx('unlock');

      // придумываем ник, чтобы не спрашивать
      const имена = ['Котик', 'Мурлыка', 'Пушистик', 'Лапка', 'Усатик',
        'Мяушка', 'Хвостик', 'Полосатик'];
      let nick = имена[Math.floor(Math.random() * имена.length)];
      const занято = A.list().map(a => a.nick.toLowerCase());
      let n = 2;
      while (занято.indexOf(nick.toLowerCase()) >= 0) nick = имена[0] + ' ' + (n++);

      const acc = A.guest(nick);
      KM.SAVES.migrateOld();
      KM.SAVES.setCurrentSlot(0);
      if (KM.SAVES.summary(0).empty) this.state.newGame(0, 'Игра ' + acc.nick);
      this.afterLogin(acc);

      if (!A.storageWorks()) {
        this.toast('Прогресс не сохранится — браузер не разрешает', 'warn', 4000);
      }
      this.bigMessage('\U0001F43E Привет, ' + acc.nick + '!', 'Обучение подскажет всё по ходу дела');
    }

    // ---------- профиль ----------
    buildProfile() {
      const A = KM.ACCOUNT, g = this.game;
      const acc = A.current();
      const box = $('#profile-body');
      box.innerHTML = '';
      if (!acc) {
        box.appendChild(el('div', 'empty-note', 'Вы играете без аккаунта'));
        const b = el('button', 'btn btn-big', '🐾 Войти или создать аккаунт');
        b.onclick = () => { g.audio.sfx('ui'); this.loginPick = null; this.show('login'); };
        box.appendChild(b);
        return;
      }

      const cat = KM.CAT_BY[acc.avatar] || KM.CATS[0];
      const bd = A.daysToBirthday(acc);
      const age = A.age(acc);
      const d = this.state.data;

      const head = el('div', 'acc-row');
      head.style.cursor = 'default';
      head.innerHTML =
        (acc.pic
          ? '<div class="ico pic"><img src="' + acc.pic + '" alt=""></div>'
          : '<div class="ico" style="background:' + KM.cssColor(cat.pal.fur) + '">🐱</div>') +
        '<div class="info"><div class="nm" style="color:' + A.colorCss(acc.color) + '">' + acc.nick +
        (bd === 0 ? ' <span class="bd-badge">🎂 сегодня ДР!</span>' : '') + '</div>' +
        '<div class="ds">' + acc.name + ' · ' + A.regionName(acc.region) + ' · ' + A.langName(acc.lang) +
        ' · ' + KM.DEVICE.name(KM.DEVICE.get() || 'pc') + '<br>' +
        'День рождения: <b style="color:var(--gold)">' + A.birthText(acc) + '</b>' +
        (age !== null ? ' · сейчас ' + age : '') + '<br>' +
        (bd === 0 ? '<b style="color:var(--pink)">Праздник сегодня!</b>'
          : 'До праздника: <b style="color:var(--pink)">' + bd + ' дн.</b>') +
        (A.isBirthdayWeek(acc) ? ' · <b style="color:var(--mint)">скидка 30% в магазине!</b>' : '') +
        (acc.bio ? '<br><i style="color:var(--text);opacity:.85">' + acc.bio + '</i>' : '') +
        '</div></div>';
      box.appendChild(head);

      if (acc.isServer) {
        box.appendChild(el('div', 'acc-note',
          '☁ <b>Это аккаунт на сервере.</b> В него можно войти с любого устройства — ' +
          'прогресс хранится не здесь, а на сервере и едет за вами.' +
          (g.net && g.net.serverAccount === acc.nick
            ? ''
            : '<br><b style="color:#ffcf6a">Сейчас связи с сервером нет</b>, ' +
              'играете по последнему сохранению с этого устройства.')));
      }

      box.appendChild(el('div', 'help-p',
        'Уровень <b>' + d.level + '</b> · монет <b>' + d.coins + '</b> · ' +
        'котов <b>' + (d.cats || []).length + '/' + KM.CATS.length + '</b> · ' +
        'локаций <b>' + Object.keys(d.completed || {}).length + '/' + KM.LEVELS + '</b> · ' +
        'спасено котов-магов <b>' + (d.freedCats || 0) + '</b><br>' +
        'Аккаунт создан: ' + new Date(acc.created).toLocaleDateString('ru-RU')));

      box.appendChild(el('div', 'help-note', 'ДЕЙСТВИЯ'));
      const row = el('div', 'acc-actions');

      const bEdit = el('button', 'btn btn-good', '🎨 Изменить профиль');
      bEdit.onclick = () => { g.audio.sfx('ui'); this.show('edit'); };

      const bSlots = el('button', 'btn', '💾 Мои игры');
      bSlots.onclick = () => { g.audio.sfx('ui'); this.show('slots'); };

      const bPass = el('button', 'btn', '🔑 Сменить пароль');
      bPass.onclick = () => acc.isServer ? this.changeCloudPassword(acc) : this.changePassword(acc);

      const bSwitch = el('button', 'btn', '🔄 Другой аккаунт');
      bSwitch.onclick = () => {
        g.quitToMenu();
        if (g.net) g.net.disconnect();
        A.logout();
        this.loginNote = 'Выберите аккаунт';
        this.loginPick = null;
        this.show('login');
      };

      const bOut = el('button', 'btn btn-danger', '🚪 Выйти из аккаунта');
      bOut.onclick = () => {
        this.ask({
          title: '🚪 ВЫХОД', ok: 'Выйти', danger: true,
          text: acc.isServer
            ? 'Выйти из аккаунта <b>' + acc.nick + '</b>?<br>' +
              'С этого устройства он будет убран — как раз то, что нужно, если вы ' +
              'играли у друга. Прогресс лежит на сервере, войдёте снова по нику и паролю.'
            : 'Выйти из аккаунта <b>' + acc.nick + '</b>?<br>Прогресс сохранится, войти можно будет снова.'
        }, (yes) => {
          if (!yes) return;
          g.quitToMenu();
          if (acc.isServer) {
            // последний раз отправляем прогресс и стираем следы с устройства
            if (g.net && g.net.serverAccount === acc.nick) {
              g.net.pushSave(KM.SAVES.currentSlot(), JSON.stringify(this.state.data));
            }
            A.remove(acc.id);
          }
          if (g.net) { g.net.serverAccount = null; g.net.disconnect(); }
          A.logout();
          this.loginNote = 'Выберите аккаунт';
          this.loginPick = null;
          this.show(A.list().length ? 'login' : 'signup');
        });
      };

      const bDel = el('button', 'btn btn-danger', '🗑 Удалить аккаунт');
      bDel.onclick = () => {
        this.ask({
          title: '🗑 УДАЛЕНИЕ АККАУНТА', ok: 'Удалить навсегда', danger: true,
          text: acc.isServer
            ? 'Убрать аккаунт <b>' + acc.nick + '</b> с этого устройства?<br>' +
              'На сервере он останется — войти снова можно по нику и паролю.'
            : 'Удалить аккаунт <b>' + acc.nick + '</b> вместе со всеми его играми?<br><b>Это нельзя отменить.</b>'
        }, (yes) => {
          if (!yes) return;
          g.quitToMenu();
          if (g.net) g.net.disconnect();
          A.remove(acc.id);
          this.loginNote = 'Аккаунт удалён';
          this.loginPick = null;
          this.show(A.list().length ? 'login' : 'signup');
        });
      };

      row.append(bEdit, bSlots, bPass, bSwitch, bOut, bDel);
      box.appendChild(row);
    }

    /** Пароль серверного аккаунта меняет сам сервер. */
    changeCloudPassword(acc) {
      const g = this.game, n = g.net;
      if (!n || n.status !== 'online') {
        this.toast('Пароль меняется только при связи с сервером', 'warn', 3500);
        return;
      }
      this.ask({ title: '🔑 ПАРОЛЬ', text: 'Введите <b>текущий</b> пароль:', input: '', password: true, ok: 'Дальше' }, (old) => {
        if (old === null) return;
        this.ask({ title: '🔑 НОВЫЙ ПАРОЛЬ', text: 'Придумайте новый пароль (от 4 знаков):', input: '', password: true, ok: 'Сменить' }, (np) => {
          if (np === null) return;
          if ((np || '').length < 4) { this.toast('Пароль не короче четырёх знаков', 'warn'); g.audio.sfx('error'); return; }
          n.changeServerPassword(acc.nick, old, np);   // ответ придёт запиской от сервера
        });
      });
    }

    changePassword(acc) {
      const A = KM.ACCOUNT;
      this.ask({ title: '🔑 ПАРОЛЬ', text: 'Введите <b>текущий</b> пароль:', input: '', password: true, ok: 'Дальше' }, (old) => {
        if (old === null) return;
        if (!A.login(acc.id, old).ok) { this.toast('Неверный пароль', 'bad'); this.game.audio.sfx('error'); return; }
        this.ask({ title: '🔑 НОВЫЙ ПАРОЛЬ', text: 'Придумайте новый пароль (от 4 символов):', input: '', password: true, ok: 'Сменить' }, (np) => {
          if (np === null) return;
          const e = A.checkPass(np);
          if (e) { this.toast(e, 'warn'); this.game.audio.sfx('error'); return; }
          A.setPassword(acc.id, np);
          this.toast('Пароль изменён 🔑', 'good');
          this.game.audio.sfx('buy');
        });
      });
    }

    // ---------- день рождения ----------
    buildBirthday() {
      const A = KM.ACCOUNT;
      const acc = A.current();
      const age = A.age(acc);
      $('#scr-birthday .bd-name').textContent = acc ? acc.nick : '';
      $('#scr-birthday .bd-text').innerHTML =
        (age !== null ? 'Тебе сегодня <b style="color:var(--gold)">' + age + '</b>! ' : '') +
        'Все котики-маги собрались, чтобы тебя поздравить 🎉<br>' +
        'Для тебя приготовлены подарки, редкий кот и <b>скидка 30% в магазине</b> на всю праздничную неделю.';
      $('#scr-birthday .bd-list').innerHTML =
        '<div class="bd-gift">🪙 5000 монет</div>' +
        '<div class="bd-gift">🐱 Редкий кот</div>' +
        '<div class="bd-gift">🎂 Праздничный колпак</div>' +
        '<div class="bd-gift">🎁 Два золотых сундука</div>' +
        '<div class="bd-gift">📜 Свитки опыта</div>' +
        '<div class="bd-gift">💸 Скидка 30%</div>';
      const conf = $('#scr-birthday .bd-confetti');
      if (conf.children.length < 40) {
        conf.innerHTML = '';
        const cols = ['#ffd23a', '#ff7ac0', '#6ae0ff', '#6ae0a8', '#a45aff', '#ff6a4a'];
        for (let i = 0; i < 46; i++) {
          const c = document.createElement('i');
          c.style.left = (Math.random() * 100) + '%';
          c.style.background = cols[i % cols.length];
          c.style.animationDuration = (2.4 + Math.random() * 3) + 's';
          c.style.animationDelay = (-Math.random() * 4) + 's';
          conf.appendChild(c);
        }
      }
    }

    claimBirthday() {
      const A = KM.ACCOUNT, g = this.game, S = this.state;
      const acc = A.current();
      if (!acc) { this.show('menu'); return; }
      A.markBirthdayClaimed(acc);

      const prizes = [
        { type: 'coins', n: 5000, rarity: 'legendary' },
        { type: 'item', id: 'scroll', n: 3, rarity: 'epic' },
        { type: 'item', id: 'cake', n: 5, rarity: 'common' },
        { type: 'acc', id: 'bdhat', rarity: 'legendary' }
      ];
      const rar = ['epic', 'mythic', 'legendary'][Math.floor(Math.random() * 3)];
      prizes.push(KM.GACHA.rollPrize(S, rar));
      const chest = KM.GACHA.chestById('gold');
      const luck = S.stats().luck;
      for (let i = 0; i < 2; i++) {
        const n = chest.min + Math.floor(Math.random() * (chest.max - chest.min + 1));
        for (let k = 0; k < n; k++) prizes.push(KM.GACHA.rollPrize(S, KM.GACHA.rollRarity(chest.boost, luck)));
      }
      prizes.sort((a, b) => KM.RARITY[a.rarity].order - KM.RARITY[b.rarity].order);
      g.audio.jingle('victory');
      this.showPrizes(prizes, 'menu');
    }

    // ============================================================
    //  СЛОТЫ СОХРАНЕНИЙ
    // ============================================================
    buildSlots() {
      const g = this.game, S = this.state;
      const box = $('#slot-list');
      box.innerHTML = '';
      box.appendChild(el('div', 'help-p',
        'Каждая игра сохраняется отдельно. Можно начать заново с обучением, ' +
        'не потеряв старый прогресс.'));
      const cur = KM.SAVES.currentSlot();

      for (let i = 0; i < KM.SAVES.SLOTS; i++) {
        const s = KM.SAVES.summary(i);
        const row = el('div', 'slot-row' + (i === cur ? ' active' : '') + (s.empty ? ' empty' : ''));
        if (s.empty) {
          row.innerHTML =
            '<div class="ico">➕</div><div class="info">' +
            '<div class="nm">Пустой слот ' + (i + 1) + '</div>' +
            '<div class="ds">Начните новую игру: обучение, подсказки и стрелки помогут освоиться.</div></div>';
          const b = el('button', 'btn btn-sm btn-good', '▶ Новая игра');
          b.onclick = () => this.startNewGame(i);
          row.appendChild(b);
        } else {
          const rc = KM.RARITY[s.catRarity] || KM.RARITY.common;
          row.innerHTML =
            '<div class="ico" style="color:' + rc.color + '">🐱</div><div class="info">' +
            '<div class="nm">' + s.name + (i === cur ? ' <span class="tagline">(текущая)</span>' : '') + '</div>' +
            '<div class="ds">Уровень <b style="color:var(--gold)">' + s.level + '</b> · ' +
            'локаций ' + s.done + '/' + KM.LEVELS + ' · ★ ' + s.stars + '<br>' +
            'кот: <b style="color:' + rc.color + '">' + s.catName + '</b> · котов ' + s.cats +
            ' · спасено ' + s.freed + ' · 🪙 ' + s.coins +
            (s.tutorial ? ' · <span style="color:var(--mint)">обучение идёт</span>' : '') + '</div></div>';
          const b1 = el('button', 'btn btn-sm' + (i === cur ? '' : ' btn-good'), i === cur ? 'Играем' : 'Продолжить');
          b1.disabled = i === cur;
          b1.onclick = () => this.switchSlot(i);
          const b2 = el('button', 'btn btn-sm btn-danger', '🗑');
          b2.title = 'Удалить эту игру';
          b2.onclick = () => {
            this.ask({
              title: '🗑 УДАЛИТЬ ИГРУ',
              text: 'Удалить «<b>' + s.name + '</b>»?<br>Уровень ' + s.level + ', ' + s.done +
                ' локаций и ' + s.cats + ' котов будут потеряны.<br><b>Это нельзя отменить.</b>',
              ok: 'Удалить', danger: true
            }, (yes) => {
              if (!yes) return;
              KM.SAVES.eraseSlot(i);
              if (i === cur) { S.loadSlot(i); g.player.applyStats(); }
              g.audio.sfx('error');
              this.buildSlots(); this.buildMenu();
            });
          };
          row.append(b1, b2);
        }
        box.appendChild(row);
      }
    }

    startNewGame(slot) {
      this.ask({
        title: '▶ НОВАЯ ИГРА',
        text: 'Как назовём это приключение?',
        input: 'Игра ' + (slot + 1), ok: 'Начать'
      }, (name) => {
        if (name === null) return;
        this._startNewGame(slot, (name || '').trim().slice(0, 22) || ('Игра ' + (slot + 1)));
      });
    }

    _startNewGame(slot, name) {
      const g = this.game, S = this.state;
      g.quitToMenu();
      S.newGame(slot, name);
      g.player.applyStats();
      if (g.tutorial) g.tutorial.reset();
      g.audio.sfx('unlock');
      this.toast('Новая игра «' + name + '» создана!', 'good', 2600);
      this.bigMessage('🐾 Новое приключение', 'Обучение подскажет всё по ходу дела');
      this.show('locations');
    }

    switchSlot(slot) {
      const g = this.game, S = this.state;
      g.quitToMenu();
      S.loadSlot(slot);
      g.applySettings();
      g.player.applyStats();
      if (g.tutorial) g.tutorial.reset();
      g.audio.sfx('ui');
      this.toast('Загружена игра «' + (S.data.slotName || ('Игра ' + (slot + 1))) + '»', 'good');
      this.buildSlots();
      this.buildMenu();
    }

    // ============================================================
    //  КОЛЕСО УДАЧИ И СУНДУКИ
    // ============================================================
    wheelSlices() {
      if (this._slices) return this._slices;
      // 24 сектора, доля каждой редкости — по её реальному шансу
      const counts = { common: 10, rare: 6, epic: 3, mythic: 2, legendary: 1, mystic: 1, secret: 1 };
      const bag = [];
      for (const id in counts) for (let i = 0; i < counts[id]; i++) bag.push(id);
      // раскидываем редкие подальше друг от друга
      const order = ['common', 'rare', 'common', 'epic', 'common', 'rare', 'common', 'mythic',
        'common', 'rare', 'common', 'epic', 'legendary', 'rare', 'common', 'mythic',
        'common', 'rare', 'common', 'epic', 'common', 'mystic', 'common', 'secret'];
      this._slices = order;
      return order;
    }

    buildGacha() {
      const g = this.game, S = this.state;
      const box = $('#gacha-body');
      box.innerHTML = '';

      // легенда редкостей
      const leg = el('div', 'rar-legend');
      KM.RARITY_ORDER.forEach(id => {
        const r = KM.RARITY[id];
        const c = el('span', 'rar-chip');
        c.innerHTML = '<i style="background:' + r.color + '"></i>' + r.name;
        c.style.color = r.color;
        leg.appendChild(c);
      });
      box.appendChild(leg);

      // ---- колесо ----
      const slices = this.wheelSlices();
      const step = 360 / slices.length;
      let stops = [];
      slices.forEach((id, i) => {
        const c = KM.RARITY[id].color;
        stops.push(c + ' ' + (i * step).toFixed(2) + 'deg ' + ((i + 1) * step).toFixed(2) + 'deg');
      });
      const wrap = el('div', 'wheel-wrap');
      const outer = el('div', 'wheel-outer');
      const wheel = el('div', 'wheel');
      wheel.style.background = 'conic-gradient(' + stops.join(',') + ')';
      wheel.style.transform = 'rotate(' + (this._wheelRot || 0) + 'deg)';
      outer.appendChild(el('div', 'wheel-pin'));
      outer.appendChild(wheel);
      outer.appendChild(el('div', 'wheel-hub', '🎰'));
      wrap.appendChild(outer);

      const btn = el('button', 'btn btn-big', '🎰 Крутить — ' + px(KM.GACHA.WHEEL_PRICE) + ' 🪙');
      btn.onclick = () => this.spinWheel(wheel, btn);
      wrap.appendChild(btn);
      wrap.appendChild(el('div', 'help-p',
        'Одна прокрутка — <b>' + px(KM.GACHA.WHEEL_PRICE) + ' монет</b>. Выпасть может персонаж, заклинание, ' +
        'способность, питомец, предметы или монеты. Навык «Удача» повышает шанс на редкое.'));
      box.appendChild(wrap);

      // ---- сундуки ----
      box.appendChild(el('div', 'help-note', 'СУНДУКИ И ЯЩИКИ'));
      const cards = el('div', 'cards');
      for (const ch of KM.GACHA.CHESTS) {
        const odds = KM.GACHA.chances(ch.boost, S.stats().luck);
        let oddsHtml = '';
        ['epic', 'mythic', 'legendary', 'mystic', 'secret'].forEach(id => {
          oddsHtml += '<span style="color:' + KM.RARITY[id].color + '">' + KM.RARITY[id].name + ' ' +
            odds[id].toFixed(odds[id] < 1 ? 2 : 1) + '%</span> · ';
        });
        const c = el('div', 'card chest-card');
        c.innerHTML =
          '<div class="ico">' + ch.icon + '</div><div class="info">' +
          '<div class="nm">' + ch.name + '</div>' +
          '<div class="ds">' + ch.desc + '</div>' +
          '<div class="chest-odds">' + oddsHtml.slice(0, -3) + '</div>' +
          '<div class="row"><span class="price">🪙 ' + px(ch.price) + '</span></div></div>';
        const b = el('button', 'btn btn-sm btn-good', 'Открыть');
        b.onclick = () => this.openChest(ch);
        c.querySelector('.row').appendChild(b);
        cards.appendChild(c);
      }
      box.appendChild(cards);
    }

    spinWheel(wheel, btn) {
      const g = this.game, S = this.state;
      if (this._spinning) return;
      if (S.data.coins < px(KM.GACHA.WHEEL_PRICE)) {
        this.toast('Не хватает монет!', 'warn'); g.audio.sfx('error'); return;
      }
      S.addCoins(-px(KM.GACHA.WHEEL_PRICE));
      this.refreshCoins();
      this._spinning = true;
      btn.disabled = true;

      const rarity = KM.GACHA.rollRarity(0.25, S.stats().luck);
      const slices = this.wheelSlices();
      const idx = [];
      slices.forEach((id, i) => { if (id === rarity) idx.push(i); });
      const pick = idx.length ? idx[Math.floor(Math.random() * idx.length)] : 0;
      const step = 360 / slices.length;
      const center = pick * step + step / 2;
      const base = (this._wheelRot || 0);
      const target = base + (360 - ((base + center) % 360)) + 360 * 5;
      this._wheelRot = target;
      wheel.style.transform = 'rotate(' + target + 'deg)';

      g.audio.sfx('ui');
      let ticks = 0;
      const tick = setInterval(() => { g.audio.sfx('ui'); if (++ticks > 22) clearInterval(tick); }, 170);

      setTimeout(() => {
        clearInterval(tick);
        this._spinning = false;
        btn.disabled = false;
        S.data.stats.spins = (S.data.stats.spins || 0) + 1;
        const prize = KM.GACHA.rollPrize(S, rarity);
        S.save();
        this.showPrizes([prize], 'gacha');
      }, 4400);
    }

    openChest(ch) {
      const g = this.game, S = this.state;
      if (S.data.coins < px(ch.price)) { this.toast('Не хватает монет!', 'warn'); g.audio.sfx('error'); return; }
      S.addCoins(-px(ch.price));
      const n = ch.min + Math.floor(Math.random() * (ch.max - ch.min + 1));
      const luck = S.stats().luck;
      const prizes = [];
      for (let i = 0; i < n; i++) {
        prizes.push(KM.GACHA.rollPrize(S, KM.GACHA.rollRarity(ch.boost, luck)));
      }
      // самое ценное показываем последним
      prizes.sort((a, b) => KM.RARITY[a.rarity].order - KM.RARITY[b.rarity].order);
      S.data.stats.chestsBought = (S.data.stats.chestsBought || 0) + 1;
      S.save();
      g.audio.sfx('chest');
      this.showPrizes(prizes, 'gacha');
    }

    // ============================================================
    //  ЭКРАН НАГРАДЫ
    // ============================================================
    showPrizes(list, back) {
      if (!list || !list.length) return;
      this.prizeQueue = list.slice();
      this.prizeTotal = list.length;
      this.prizeShown = 0;
      this.prizeBack = back || this.current;
      // если показ случился прямо в игре — ставим её на паузу
      this.prizeResume = (this.game.mode === 'playing');
      if (this.prizeResume) this.game.mode = 'paused';
      this.show('none');
      this.game.input.setBlocked(true);
      const rv = $('#reveal');
      rv.classList.remove('hidden');
      if (!this._revealWired) {
        this._revealWired = true;
        rv.addEventListener('click', () => this.nextPrize());
      }
      this.nextPrize();
    }

    nextPrize() {
      const g = this.game;
      const rv = $('#reveal');
      if (this._revealBusy) return;
      if (!this.prizeQueue || !this.prizeQueue.length) {
        this.prizeQueue = null;
        rv.classList.add('hidden');
        g.clearShowcase();
        this.state.save();
        if (this.prizeResume) { this.prizeResume = false; this.resume(); }
        else this.show(this.prizeBack || 'menu');
        return;
      }
      const prize = this.prizeQueue.shift();
      this.prizeShown++;
      const res = KM.GACHA.grant(g, prize);
      const R = KM.RARITY[res.rarity] || KM.RARITY.common;

      rv.style.setProperty('--rv', R.color);
      $('.rv-rarity').textContent = R.name;
      $('.rv-name').textContent = res.title;
      $('.rv-desc').textContent = res.sub || '';
      $('.rv-queue').textContent = this.prizeTotal > 1 ? (this.prizeShown + ' / ' + this.prizeTotal) : '';

      // перезапуск анимаций
      ['.rv-rarity', '.rv-name', '.rv-desc', '.rv-hint'].forEach(sel => {
        const n = rv.querySelector(sel);
        n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
      });
      const burst = rv.querySelector('.rv-burst');
      burst.classList.remove('go'); void burst.offsetWidth;
      setTimeout(() => burst.classList.add('go'), 950);

      // иконка или 3D-персонаж
      let icon = rv.querySelector('.rv-icon');
      if (!icon) { icon = el('div', 'rv-icon'); rv.appendChild(icon); }
      if (res.cat) {
        icon.style.display = 'none';
        g.showCharacter(res.cat, { rarity: res.rarity, reveal: true });
      } else {
        g.clearShowcase();
        icon.style.display = '';
        icon.textContent = res.icon;
      }
      this.refreshCoins();
      this.updateHud();

      // пару мгновений нельзя проматывать, чтобы увидеть эффект
      this._revealBusy = true;
      clearTimeout(this._revealT);
      this._revealT = setTimeout(() => { this._revealBusy = false; }, 1250);
    }

    // ============================================================
    //  ПИТОМЦЫ
    // ============================================================
    buildPets() {
      const S = this.state, g = this.game;
      const slots = $('#pet-slots');
      slots.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const uid = S.data.equipped[i];
        const pet = uid == null ? null : S.petByUid(uid);
        const s = el('div', 'slot' + (pet ? ' filled' : ''));
        if (pet) {
          const def = KM.PET_BY[pet.id];
          const need = S.petXpNeed(pet);
          s.innerHTML =
            '<span class="x">✖</span>' +
            '<div class="em">' + petEmoji(def) + '</div>' +
            '<div class="nm">' + pet.name + '</div>' +
            '<div class="lv">Ур. ' + pet.level + ' · ' + ['I', 'II', 'III'][pet.stage] + '</div>' +
            '<div class="petbar"><i style="width:' + Math.round(pet.xp / need * 100) + '%"></i></div>';
          s.onclick = () => {
            S.data.equipped[i] = null; S.save(); g.audio.sfx('ui'); this.buildPets();
          };
        } else {
          s.innerHTML = '<div class="em">➕</div><div class="empty">Слот ' + (i + 1) + '<br>пусто</div>';
          s.onclick = () => { this.toast('Выберите питомца из списка ниже', 'info'); };
        }
        slots.appendChild(s);
      }

      const box = $('#pet-list');
      box.innerHTML = '';
      if (!S.data.pets.length) {
        box.appendChild(el('div', 'empty-note',
          'У вас пока нет питомцев 🥚<br><br>Их можно купить в магазине, получить из яйца или в награду за спасение кота-мага.'));
        return;
      }
      const cards = el('div', 'cards');
      for (const pet of S.data.pets) {
        const def = KM.PET_BY[pet.id];
        if (!def) continue;
        const equipped = S.data.equipped.indexOf(pet.uid) >= 0;
        const need = S.petXpNeed(pet);
        const c = el('div', 'card' + (equipped ? ' owned' : ''));
        const dmg = Math.round(def.dmg * (1 + (pet.level - 1) * 0.12) * (1 + pet.stage * 0.5));
        c.innerHTML =
          '<div class="ico">' + petEmoji(def) + '</div><div class="info">' +
          '<div class="nm">' + pet.name + ' <span class="tag-lock">(' + def.name + ')</span></div>' +
          '<div class="ds">Уровень <b style="color:var(--gold)">' + pet.level + '</b> · Стадия ' + ['I', 'II', 'III'][pet.stage] +
          ' · Урон ' + dmg + '<br>Опыт: ' + Math.floor(pet.xp) + '/' + need +
          (pet.stage < 2 ? ' · Эволюция на ' + (pet.stage === 0 ? 10 : 25) + ' ур.' : ' · Максимум!') + '</div>' +
          '<div class="row"></div></div>';
        const row = c.querySelector('.row');
        const bEq = el('button', 'btn btn-sm' + (equipped ? '' : ' btn-good'), equipped ? 'Снять' : 'Взять с собой');
        bEq.onclick = () => {
          if (equipped) S.data.equipped[S.data.equipped.indexOf(pet.uid)] = null;
          else {
            const free = S.data.equipped.indexOf(null);
            if (free < 0) { this.toast('Все 3 слота заняты!', 'warn'); g.audio.sfx('error'); return; }
            S.data.equipped[free] = pet.uid;
          }
          S.save(); g.audio.sfx('ui'); this.buildPets();
        };
        const bFeed = el('button', 'btn btn-sm', '🍖 Покормить');
        bFeed.onclick = () => this.feedMenu(pet);
        const bAcc = el('button', 'btn btn-sm', '🎀 Наряд');
        bAcc.onclick = () => this.petAccMenu(pet);
        row.append(bEq, bFeed, bAcc);
        if (pet.acc && KM.PET_ACC_BY[pet.acc]) {
          const a = KM.PET_ACC_BY[pet.acc];
          const tag = el('span', 'tagline', a.icon + ' ' + a.name);
          row.appendChild(tag);
        }
        cards.appendChild(c);
      }
      box.appendChild(cards);
    }

    /** Выбор наряда для питомца. */
    petAccMenu(pet) {
      const S = this.state, g = this.game;
      const owned = (S.data.petAccs || []);
      if (!owned.length) {
        this.toast('Нарядов пока нет — купите их в магазине, вкладка «🐾 Питомцам»', 'warn', 3000);
        g.audio.sfx('error');
        return;
      }
      // перебираем по кругу: нет наряда -> первый -> второй -> ... -> нет
      const list = [null].concat(owned);
      const cur = list.indexOf(pet.acc || null);
      const next = list[(cur + 1) % list.length];
      pet.acc = next || null;
      S.save();
      const a = next ? KM.PET_ACC_BY[next] : null;
      g.audio.sfx('buy');
      this.toast(a ? ('На ' + pet.name + ' надето: ' + a.icon + ' ' + a.name) : ('Наряд снят с ' + pet.name), 'good');
      // пересобираем питомцев в бою
      g.pets.forEach(p => { if (p.data === pet) { p.dmg = p.def.dmg * (1 + (pet.level - 1) * 0.12) * (1 + pet.stage * 0.5) * (1 + (a ? a.dmg : 0)); } });
      this.buildPets();
    }

    feedMenu(pet) {
      const S = this.state, g = this.game;
      const foods = S.data.inventory.filter(i => { const it = KM.ITEM_BY[i.id]; return it && it.feed; });
      if (!foods.length) { this.toast('Нет еды для питомца 🍽️', 'warn'); g.audio.sfx('error'); return; }
      const f = foods[0];
      const res = S.feedPet(pet, f.id);
      if (!res) return;
      g.audio.sfx('eat');
      this.toast(pet.name + ' съел ' + KM.ITEM_BY[f.id].icon + ' ' + KM.ITEM_BY[f.id].name + ' (+' + (KM.ITEM_BY[f.id].feed * 3) + ' опыта)', 'good');
      if (res.evolved) {
        g.audio.sfx('levelup');
        this.bigMessage('✨ Эволюция!', pet.name + ' стал сильнее!');
      }
      S.save();
      this.buildPets();
    }

    // ============================================================
    //  НАВЫКИ
    // ============================================================
    buildSkills() {
      const S = this.state, g = this.game;
      $('#t-sp').textContent = S.data.skillPoints;
      const box = $('#skill-list');
      box.innerHTML = '';
      for (const sk of KM.SKILLS) {
        const lvl = S.data.skills[sk.id] || 0;
        const row = el('div', 'skill');
        let pips = '';
        for (let i = 0; i < sk.max; i++) pips += '<span class="pip' + (i < lvl ? ' on' : '') + '"></span>';
        row.innerHTML =
          '<div class="ico">' + sk.icon + '</div><div class="info">' +
          '<div class="nm">' + sk.name + ' <span style="color:var(--gold)">' + lvl + '/' + sk.max + '</span></div>' +
          '<div class="ds">' + sk.desc + '</div>' +
          '<div class="pips">' + pips + '</div></div>';
        const b = el('button', 'btn btn-sm' + (S.data.skillPoints > 0 && lvl < sk.max ? ' btn-good' : ''), '＋');
        b.disabled = S.data.skillPoints <= 0 || lvl >= sk.max;
        b.onclick = () => {
          if (S.data.skillPoints <= 0 || S.data.skills[sk.id] >= sk.max) return;
          S.data.skills[sk.id]++; S.data.skillPoints--;
          S.save(); g.player.applyStats(); g.audio.sfx('levelup');
          this.buildSkills(); this.updateHud();
        };
        row.appendChild(b);
        box.appendChild(row);
      }
      if (S.data.skillPoints > 0) {
        box.insertBefore(el('div', 'help-p',
          '<b>У вас ' + S.data.skillPoints + ' свободных очков!</b> Очки даются за каждый новый уровень.'), box.firstChild);
      }
    }

    // ============================================================
    //  КОТЫ
    // ============================================================
    buildCats() {
      const S = this.state, g = this.game;
      const box = $('#cat-list');
      box.innerHTML = '';

      // показываем выбранного кота в 3D слева
      const preview = (cat) => {
        this.previewCat = cat;
        g.showCharacter(cat, { reveal: false, side: 'left', rarity: cat.rarity });
      };
      const startCat = KM.CAT_BY[S.data.activeCat] || KM.CATS[0];
      preview(this.previewCat && S.hasCat(this.previewCat.id) ? this.previewCat : startCat);

      // группируем по редкости
      const owned = KM.CATS.filter(c => S.hasCat(c.id)).length;
      box.appendChild(el('div', 'help-p',
        'Открыто <b>' + owned + ' из ' + KM.CATS.length + '</b> персонажей. ' +
        'Нажмите на карточку, чтобы рассмотреть кота вблизи.'));

      for (const rid of KM.RARITY_ORDER) {
        const list = KM.CATS.filter(c => c.rarity === rid);
        if (!list.length) continue;
        const R = KM.RARITY[rid];
        const head = el('div', 'help-note', R.name.toUpperCase() +
          ' <span style="color:var(--dim);font-size:12px">(' +
          list.filter(c => S.hasCat(c.id)).length + '/' + list.length + ')</span>');
        head.style.color = R.color;
        box.appendChild(head);

        const cards = el('div', 'cards');
        for (const cat of list) {
          const has = S.hasCat(cat.id);
          const active = S.data.activeCat === cat.id;
          const c = el('div', 'card' + (has ? ' owned' : ' locked'));
          c.style.boxShadow = '0 0 0 2px #000,0 0 0 4px ' + (has ? R.color : '#3a2d78');
          c.innerHTML =
            '<div class="ico" style="background:' + KM.cssColor(cat.pal.fur) + ';color:' + KM.cssColor(cat.pal.hat) + '">' +
            (has ? '🐱' : '❔') + '</div>' +
            '<div class="info"><div class="nm">' + (has ? cat.name : '???') +
            (active ? ' <span class="tagline">★ выбран</span>' : '') + '</div>' +
            '<div class="ds" style="color:' + R.color + ';font-weight:800;font-size:11.5px">' + R.name + '</div>' +
            '<div class="ds">' + (has ? cat.desc + '<br>' + bonusText(cat) : 'Ещё не открыт') + '</div>' +
            '<div class="row"></div></div>';
          c.onclick = () => { if (has) { preview(cat); g.audio.sfx('ui'); } };
          const row = c.querySelector('.row');
          if (has) {
            const b = el('button', 'btn btn-sm' + (active ? '' : ' btn-good'), active ? 'Выбран' : 'Выбрать');
            b.disabled = active;
            b.onclick = (e) => {
              e.stopPropagation();
              S.data.activeCat = cat.id; S.save(); g.player.applyStats();
              g.audio.sfx('buy'); this.toast('Теперь вы играете за ' + cat.name + ' 🐱', 'good');
              preview(cat);
              this.buildCats(); this.updateHud();
            };
            row.appendChild(b);
          } else if (cat.price) {
            row.innerHTML = '<span class="price">🪙 ' + px(cat.price) + '</span>';
            const b = el('button', 'btn btn-sm', 'Купить');
            b.onclick = (e) => {
              e.stopPropagation();
              if (S.data.coins < px(cat.price)) { g.audio.sfx('error'); this.toast('Не хватает монет!', 'warn'); return; }
              S.addCoins(-px(cat.price)); S.save(); this.refreshCoins();
              this.revealCat(cat.id, 'cats');
            };
            row.appendChild(b);
          } else {
            row.innerHTML = '<span class="tag-lock">🔒 Только из колеса или сундука</span>';
          }
          cards.appendChild(c);
        }
        box.appendChild(cards);
      }
    }

    // ============================================================
    //  СУМКА
    // ============================================================
    buildInventory() {
      const S = this.state, g = this.game;
      const box = $('#inv-list');
      box.innerHTML = '';
      if (!S.data.inventory.length) {
        box.appendChild(el('div', 'empty-note', 'Сумка пуста 🎒<br><br>Ищите сундуки и бейте монстров!'));
        return;
      }
      const grid = el('div', 'inv-grid');
      for (const slot of S.data.inventory) {
        const it = KM.ITEM_BY[slot.id];
        if (!it) continue;
        const s = el('div', 'islot');
        s.innerHTML = '<div class="em">' + it.icon + '</div><div class="nm">' + it.name + '</div><div class="n">' + slot.n + '</div>';
        s.title = it.desc;
        s.onclick = () => {
          if (it.type === 'food' || it.type === 'potion') {
            if (!S.removeItem(it.id, 1)) return;
            const p = g.player;
            if (it.hp) p.hp = Math.min(p.maxHp, p.hp + it.hp);
            if (it.mana) p.mana = Math.min(p.maxMana, p.mana + it.mana);
            if (it.en) p.energy = Math.min(p.maxEnergy, p.energy + it.en);
            g.audio.sfx('eat');
            this.toast('Использовано: ' + it.icon + ' ' + it.name, 'good');
          } else if (it.id === 'scroll') {
            if (!S.removeItem(it.id, 1)) return;
            const ups = S.addXP(it.xp);
            g.audio.sfx('levelup');
            this.toast('+' + it.xp + ' опыта' + (ups ? ' · Новый уровень!' : ''), 'good');
            g.player.applyStats();
          } else if (it.id === 'egg') {
            if (!S.removeItem(it.id, 1)) return;
            const pool = KM.PETS.filter(p => p.price <= 1200);
            const pick = pool[Math.floor(Math.random() * pool.length)];
            S.addPet(pick.id);
            g.audio.sfx('unlock');
            this.bigMessage('🥚 Яйцо треснуло!', 'Из него вылупился ' + pick.name + '!');
          } else if (it.type === 'mat') {
            this.toast('Это материал — продайте его в магазине 💰', 'info');
            return;
          } else if (it.id === 'key') {
            this.toast('Ключи открывают клетки с котами-магами 🗝️', 'info');
            return;
          }
          S.save();
          this.buildInventory(); this.updateHud();
        };
        grid.appendChild(s);
      }
      box.appendChild(grid);
      box.appendChild(el('div', 'help-p',
        'Нажмите на предмет, чтобы использовать. В игре: <kbd>R</kbd> — быстро съесть еду, <kbd>K</kbd> — подобрать предмет.'));
    }

    openInventory() {
      if (this.game.mode === 'playing') this.game.mode = 'paused';
      this.game.audio.sfx('ui');
      this.show('inv');
    }

    // ============================================================
    //  НАСТРОЙКИ
    // ============================================================
    buildSettings() {
      const S = this.state, g = this.game;
      const s = S.data.settings;
      const box = $('#settings-list');
      box.innerHTML = '';

      // ---------- язык ----------
      box.appendChild(el('div', 'set-note', 'ЯЗЫК'));
      const яз = el('div', 'lang-row');
      const ГОТОВ = { ru: 'полностью', en: 'интерфейс', tr: 'интерфейс', kk: 'скоро', uk: 'скоро' };
      for (const l of KM.ACCOUNT.LANGS) {
        const текущий = KM.I18N && KM.I18N.lang === l.id;
        const b2 = el('button', 'lang-btn' + (текущий ? ' sel' : ''));
        const доля = KM.I18N ? KM.I18N.coverage(l.id) : 0;
        b2.innerHTML = '<span class="fl">' + l.flag + '</span>' +
          '<span class="nm">' + l.name + '</span>' +
          '<span class="st"><i>' + (ГОТОВ[l.id] || '') + '</i>' +
          (l.id !== 'ru' && доля ? '<b> · ' + доля + '%</b>' : '') + '</span>';
        b2.onclick = () => {
          g.audio.sfx('ui');
          if (KM.I18N) KM.I18N.set(l.id);
          document.documentElement.lang = l.id;
          const acc = KM.ACCOUNT.current();
          if (acc) KM.ACCOUNT.update(acc.id, { lang: l.id });
          this.buildSettings();
        };
        яз.appendChild(b2);
      }
      box.appendChild(яз);
      box.appendChild(el('div', 'hint',
        'Игра сама выбирает язык вашего устройства при первом запуске. ' +
        'Русский переведён полностью — он родной. Английский покрывает интерфейс: ' +
        'непереведённые места останутся русскими, и это видно честно. ' +
        'Казахский и украинский пока ждут перевода.'));

      const slider = (label, key, min, max, step, suffix, apply) => {
        const row = el('div', 'set');
        row.innerHTML = '<label>' + label + '</label>';
        const inp = el('input');
        inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = s[key];
        const val = el('span', 'val', s[key] + (suffix || ''));
        inp.oninput = () => {
          s[key] = +inp.value; val.textContent = inp.value + (suffix || '');
          apply && apply(+inp.value); S.save();
        };
        row.append(inp, val);
        box.appendChild(row);
      };

      const seg = (label, key, opts, apply) => {
        const row = el('div', 'set');
        row.innerHTML = '<label>' + label + '</label>';
        const wrap = el('div', 'seg');
        opts.forEach(o => {
          const b = el('button', s[key] === o.v ? 'on' : '', o.t);
          b.dataset.v = String(o.v);
          b.onclick = () => {
            s[key] = o.v; S.save(); apply && apply(o.v);
            Array.from(wrap.children).forEach(c => c.classList.remove('on'));
            b.classList.add('on');
            g.audio.sfx('ui');
          };
          wrap.appendChild(b);
        });
        row.appendChild(wrap);
        box.appendChild(row);
      };

      box.appendChild(el('div', 'help-note', 'КАРТИНКА'));
      slider('Размер пикселя (крупнее = ретро и быстрее)', 'pixel', 1, 6, 1, '×', (v) => { g.renderer.pixelScale = v; g.renderer.resize(); });
      slider('Угол обзора', 'fov', 55, 100, 1, '°', (v) => { g.fov = v * Math.PI / 180; });
      seg('Вид по умолчанию', 'view', [{ v: 3, t: 'От третьего лица' }, { v: 1, t: 'От первого лица' }], (v) => { g.player.firstPerson = v === 1; });

      box.appendChild(el('div', 'help-note', 'УПРАВЛЕНИЕ'));
      slider('Чувствительность мыши', 'sens', 20, 250, 5, '%', (v) => { g.input.sensitivity = 0.0022 * (v / 100); });
      seg('Инверсия оси Y', 'invertY', [{ v: false, t: 'Выкл' }, { v: true, t: 'Вкл' }], (v) => { g.input.invertY = v; });
      seg('Вращение камеры', 'camMode', [{ v: 'drag', t: 'Правой кнопкой' }, { v: 'lock', t: 'Захват мыши' }], (v) => {
        g.input.camMode = v;
        if (v !== 'lock') g.input.exitLock();
        this.toast(v === 'drag' ? 'Камера: держите ПКМ и ведите мышь' : 'Камера: курсор захватывается, мышь вращает обзор', 'info', 2600);
      });

      box.appendChild(el('div', 'help-note', 'ЗВУК'));
      slider('Громкость эффектов', 'volume', 0, 100, 5, '%', (v) => g.audio.setVolume(v / 100));
      slider('Громкость музыки', 'music', 0, 100, 5, '%', (v) => g.audio.setMusicVolume(v / 100));
      seg('Музыка', 'musicOn', [{ v: true, t: 'Вкл' }, { v: false, t: 'Выкл' }], (v) => {
        g.audio.enabledMusic = v;
        if (!v) g.audio.stopMusic();
        else g.audio.startMusic(g.level ? (g.level.info.isBoss ? 'boss' : g.level.biome.track) : 'menu');
      });

      box.appendChild(el('div', 'help-note', 'РАСПОЛОЖЕНИЕ ПАНЕЛЕЙ'));
      box.appendChild(el('div', 'help-p',
        'Панели можно свернуть прямо в игре кнопкой <b>▼</b> под ними, ' +
        'а листать — стрелками <b>◀ ▶</b> или колесом мыши поверх панели.'));

      const POSES = [
        { v: 'bc', t: 'Снизу по центру' }, { v: 'bl', t: 'Снизу слева' },
        { v: 'br', t: 'Снизу справа' }, { v: 'lm', t: 'Слева' }, { v: 'rm', t: 'Справа' }
      ];
      const COUNTS = [
        { v: 1, t: '1' }, { v: 3, t: '3' }, { v: 5, t: '5' }, { v: 0, t: 'Все' }
      ];
      const relayout = () => { this.applyHudLayout(); this.updateSpellBar(true); this.updateAbilityBar(true); };

      seg('Панель заклинаний', 'spellPos', POSES, relayout);
      seg('Видно заклинаний сразу', 'spellCount', COUNTS, relayout);
      seg('Панель способностей', 'abilPos', POSES, relayout);
      seg('Видно способностей сразу', 'abilCount', COUNTS, relayout);
      slider('Размер панелей', 'hudScale', 60, 140, 5, '%', relayout);
      seg('Подсказка по управлению', 'hints', [
        { v: 'start', t: 'В начале уровня' }, { v: 'always', t: 'Всегда' }, { v: 'never', t: 'Никогда' }
      ], relayout);

      box.appendChild(el('div', 'help-note', 'ПРОЧЕЕ'));
      seg('Счётчик FPS', 'showFps', [{ v: false, t: 'Выкл' }, { v: true, t: 'Вкл' }], (v) => {
        $('#fps').classList.toggle('hidden', !v);
      });

      const dz = el('div', 'set');
      dz.innerHTML = '<label style="color:var(--red)">Опасная зона</label>';
      const rb = el('button', 'btn btn-sm btn-danger', 'Сбросить весь прогресс');
      rb.dataset.act = 'reset';
      dz.appendChild(rb);
      box.appendChild(dz);
    }

    // ============================================================
    //  УПРАВЛЕНИЕ
    // ============================================================
    buildHelp() {
      const box = $('#help-body');
      const keys = [
        ['W A S D', 'Ходить (относительно камеры)'],
        ['ПКМ + мышь', 'Вращать камеру (кот стоит на месте)'],
        ['ЛКМ + ПКМ', 'МАГИЯ — применить заклинание'],
        ['Shift', 'Рывок вперёд (тратит энергию)'],
        ['E', 'Увеличить скорость (3 уровня)'],
        ['Q', 'Уменьшить скорость'],
        ['Space', 'Прыжок → сальто → ещё прыжок (со способностью — четвёртый)'],
        ['F', 'Отдых — кот садится и восстанавливает силы'],
        ['ЛКМ', 'Удар лапой (ближний бой)'],
        ['T', 'Применить заклинание (то же, что две кнопки мыши)'],
        ['1…0', 'Выбрать заклинание'],
        ['Tab', 'Следующее заклинание'],
        ['R', 'Съесть еду из сумки'],
        ['K', 'Подобрать / открыть сундук / клетку / войти в портал'],
        ['I', 'Сумка'],
        ['V', 'Первое / третье лицо'],
        ['Z', 'Магический щит'],
        ['X', 'Плащ невидимости'],
        ['C', 'Кошачья молния (ускорение)'],
        ['G', 'Торнадо'],
        ['B', 'Армагеддон (метеоритный дождь)'],
        ['H', 'Чёрная дыра'],
        ['J', 'Облачная тропа (ходьба по небу)'],
        ['N', 'Супер-прыгучесть'],
        ['U', 'Зов бури (туча идёт за вами)'],
        ['M', 'Показать / скрыть миникарту'],
        ['Колесо мыши', 'Приблизить камеру'],
        ['Esc', 'Пауза']
      ];
      let html = '<div class="keys-grid">';
      for (const [k, d] of keys) html += '<div class="krow"><span class="k"><kbd>' + k + '</kbd></span><span class="d">' + d + '</span></div>';
      html += '</div>';

      html += '<div class="help-note">МЫШЬ</div>' +
        '<div class="help-p"><b>Правая кнопка</b> — держите и ведите мышь, чтобы крутить камеру. ' +
        'Кот при этом <b>не разворачивается</b> — он поворачивается только от клавиш движения. ' +
        '<b>Левая кнопка</b> — удар лапой. <b>Обе кнопки сразу</b> — заклинание! ' +
        'Если удобнее классическое управление, включите в настройках «Вращение камеры → Захват мыши».</div>' +
        '<div class="help-note">ЦЕЛЬ МЫШЬЮ</div>' +
        '<div class="help-p">Магия летит <b>точно туда, куда наведён курсор</b> — на земле видно светящуюся метку. ' +
        'Метеор, торнадо, чёрная дыра и армагеддон бьют по этой же точке.</div>' +
        '<div class="help-note">ПАНЕЛИ ЗАКЛИНАНИЙ И СПОСОБНОСТЕЙ</div>' +
        '<div class="help-p">Внизу экрана — маленький квадратик с текущим заклинанием. ' +
        'Кнопка <b>▼</b> под ним разворачивает панель, <b>▲</b> сворачивает обратно. ' +
        'Листать заклинания можно стрелками <b>◀ ▶</b>, <b>колесом мыши поверх панели</b>, ' +
        'клавишей <kbd>Tab</kbd> или цифрами <kbd>1</kbd>…<kbd>0</kbd>.<br>' +
        'В <b>Настройках</b> можно выбрать, где панели стоят (снизу слева / по центру / справа, ' +
        'сбоку слева или справа), сколько ячеек видно сразу (1, 3, 5 или все) и какого они размера.</div>' +
        '<div class="help-note">ЖАРА И ХОЛОД</div>' +
        '<div class="help-p">У каждой локации свой климат. В <b>Снегах</b> и <b>Бездне</b> кот мёрзнет, ' +
        'в <b>Пустыне</b> и на <b>Вулкане</b> — перегревается. Слева вверху горит ряд значков: ' +
        '🔥 — запас тепла, 💧 — запас прохлады. Когда значки погаснут, начнёт капать урон.<br>' +
        '<b>Одежда решает всё:</b> Шуба, Тёплая Шапка и Шарф дают утепление и спасают на морозе, ' +
        'но на вулкане в них станет только хуже. Для жары есть Панама, Ледяной Амулет и Плащ-Ветерок.<br>' +
        'Помогает и магия: встаньте в <b>огонь</b>, чтобы согреться, или в <b>лужу, туман и дождь</b>, чтобы остыть. ' +
        'Отдых (<kbd>F</kbd>) восстанавливает запас вдвое быстрее. А некоторые коты — Снежок, Иней, Пламя, ' +
        'Багрян и легендарные — вообще не боятся своей стихии.</div>' +
        '<div class="help-note">СТИХИИ</div>' +
        '<div class="help-p"><b>🪨 Земля:</b> Камнепад катит валун по земле, Каменные Шипы растут дорожкой ' +
        'и подбрасывают врагов, Землетрясение оглушает всех вокруг.<br>' +
        '<b>🌫️ Воздух:</b> Туман прячет вас и слепит монстров, Гроза вешает тучу, которая бьёт настоящими молниями.<br>' +
        '<b>🌧️ Вода:</b> Дождевая Туча лечит вас и питомцев, гасит пожары и мочит врагов.<br>' +
        '<b>🌀 Разум:</b> Телекинез поднимает врага в воздух и швыряет его туда, куда вы целитесь.</div>' +
        '<div class="help-note">СПОСОБНОСТИ</div>' +
        '<div class="help-p">Кроме атакующей магии есть усиления: <b>🫥 Плащ невидимости</b> (монстры теряют вас из виду), ' +
        '<b>⚡ Кошачья молния</b> (двойная скорость без траты энергии), <b>🛡️ Щит</b>, ' +
        '<b>☁️ Облачная тропа</b> (под лапами в воздухе возникают облака — можно шагать по небу), ' +
        '<b>🦘 Супер-прыгучесть</b> (кот прыгает как мячик и сам отскакивает), ' +
        '<b>⛈️ Зов бури</b> (туча летит следом и бьёт молниями), ' +
        'а также <b>🌪️ Торнадо</b>, <b>☄️ Армагеддон</b> и <b>🕳️ Чёрная дыра</b> — у каждой своя физика.</div>' +
        '<div class="help-note">КАК ПРОЙТИ ЛОКАЦИЮ</div>' +
        '<div class="help-p">Победите <b>всех монстров</b>. Если на локации есть <b>клетки с котами-магами</b> — освободите их всех. ' +
        'Только тогда <b>портал проснётся</b>, и вы сможете уйти дальше.</div>' +
        '<div class="help-note">КЛЮЧИ ОТ КЛЕТОК</div>' +
        '<div class="help-p">Ключ можно найти <b>в сундуке</b> или выбить из <b>крупных и элитных монстров</b> (со звёздочкой ★). ' +
        'С босса всегда падают ключи на все оставшиеся клетки.</div>' +
        '<div class="help-note">МОНСТРЫ</div>' +
        '<div class="help-p">Если вы далеко — монстры <b>живут своей жизнью</b>: бродят, щиплют траву, дремлют и осматриваются. ' +
        'Подойдёте близко — заметят (над головой появится «!») и побегут за вами. ' +
        'Убежите далеко или спрячетесь — они <b>потеряют интерес</b> («?») и вернутся к своим делам.</div>' +
        '<div class="help-note">ПРЯТКИ</div>' +
        '<div class="help-p">Зайдите в <b>куст</b> и двигайтесь медленно — монстры почти перестанут вас замечать. ' +
        'Способность «Кошачья скрытность» позволяет прятаться даже на бегу.</div>' +
        '<div class="help-note">ЗАКЛИНАНИЯ</div>' +
        '<div class="help-p"><b>🔥 Огонь</b> — оставляет пожар на земле. <b>💧 Вода</b> — лужа замедляет врагов и делает их уязвимее ' +
        '(а молния в луже бьёт вдвое сильнее). <b>❄️ Лёд</b> — глыба остаётся стоять, замораживает и добавляет врагам +35% получаемого урона.</div>';
      box.innerHTML = html;
    }

    // ============================================================
    //  HUD
    // ============================================================
    showHud(v) { $('#hud').classList.toggle('hidden', !v); }

    refreshCoins() {
      const c = this.state.data.coins;
      $$('.c-coins').forEach(e => e.textContent = c);
    }

    updateHud() {
      const g = this.game, p = g.player, S = this.state;
      const st = S.stats();
      $('#t-coins').textContent = S.data.coins;
      $('#t-keys').textContent = S.invCount('key');
      $('#hud-cat-icon').textContent = '🐱';
      $('#hud-cat-icon').parentElement.style.background =
        'linear-gradient(180deg,' + KM.cssColor(st.cat.pal.fur) + ',' + KM.cssColor(st.cat.pal.hat) + ')';
      this.refreshCoins();
      this.updateHudLight(true);
      this.updateSpellBar();
      this.updateAbilityBar();
    }

    updateHudLight(force) {
      const g = this.game, p = g.player, S = this.state;
      if (!p.st) return;
      const c = this._cache;

      const hp = Math.max(0, Math.round(p.hp)), mhp = Math.round(p.maxHp);
      const mp = Math.round(p.mana), mmp = Math.round(p.maxMana);
      const en = Math.round(p.energy), men = Math.round(p.maxEnergy);
      if (force || c.hp !== hp || c.mhp !== mhp) {
        c.hp = hp; c.mhp = mhp;
        $('#b-hp').style.width = (hp / mhp * 100) + '%';
        $('#t-hp').textContent = hp + '/' + mhp;
      }
      if (force || c.mp !== mp) {
        c.mp = mp;
        $('#b-mana').style.width = (mp / mmp * 100) + '%';
        $('#t-mana').textContent = mp + '/' + mmp;
      }
      if (force || c.en !== en) {
        c.en = en;
        $('#b-energy').style.width = (en / men * 100) + '%';
        $('#t-energy').textContent = en + '/' + men;
      }
      const lvl = S.data.level, xp = Math.floor(S.data.xp), need = S.xpForLevel(lvl);
      if (force || c.xp !== xp || c.lvl !== lvl) {
        c.xp = xp; c.lvl = lvl;
        $('#b-xp').style.width = (xp / need * 100) + '%';
        $('#t-xp').textContent = 'Ур. ' + lvl + ' — ' + xp + '/' + need;
      }
      const keys = S.invCount('key');
      if (force || c.keys !== keys) { c.keys = keys; $('#t-keys').textContent = keys; }
      const coins = S.data.coins;
      if (force || c.coins !== coins) { c.coins = coins; $('#t-coins').textContent = coins; }

      // строка состояний
      const sp = KM.SPEED_LEVELS[p.speedLevel];
      const tags = [];
      tags.push(['st-speed', sp.icon + ' ' + sp.name + ' (' + (p.speedLevel + 1) + '/3)']);
      if (p.restT > 0.4) tags.push(['st-rest', '😴 Отдых']);
      if (p.hidden) tags.push(['st-hide', '🌿 Скрыт']);
      if (p.dashCd > 0.02) tags.push(['st-dash', '💨 Рывок ' + p.dashCd.toFixed(1) + 'с']);
      if (p.effects.burn > 0) tags.push(['st-burn', '🔥 Горит']);
      if (p.effects.freeze > 0) tags.push(['st-freeze', '❄️ Заморожен']);
      if (p.effects.poison > 0) tags.push(['st-poison', '☠️ Отравлен']);
      if (p.shieldT > 0) tags.push(['st-freeze', '🛡️ Щит ' + p.shieldT.toFixed(1) + 'с']);
      if (p.invisT > 0) tags.push(['st-hide', '🫥 Невидимость ' + p.invisT.toFixed(1) + 'с']);
      if (p.hasteT > 0) tags.push(['st-dash', '⚡ Ускорение ' + p.hasteT.toFixed(1) + 'с']);
      const key = tags.map(t => t[1]).join('|');
      if (key !== c.tags) {
        c.tags = key;
        const box = $('#hud-status');
        box.innerHTML = '';
        for (const [cls, txt] of tags) box.appendChild(el('div', 'st-tag ' + cls, txt));
      }

      $('#hide-vignette').style.opacity = p.hideAmt * 0.75;
      this.updateAbilityBar();
      this.updateClimateHud();

      // подсказка по управлению скрывается через 18 секунд
      const hints = S.data.settings.hints || 'start';
      const hc = $('#hud-controls');
      if (hints === 'never') hc.classList.add('faded');
      else if (hints === 'always') hc.classList.remove('faded');
      else hc.classList.toggle('faded', this.game.levelTime > 18);

      this.updateSpellBar();
      this.refreshSpellCd();
    }

    // ============================================================
    //  КОМПАКТНЫЕ ПАНЕЛИ ЗАКЛИНАНИЙ И СПОСОБНОСТЕЙ
    // ============================================================
    initBars() {
      const g = this.game;
      const skeleton =
        '<div class="bar-body">' +
          '<button class="bar-nav prev" data-dir="-1" title="Листать назад">◀</button>' +
          '<div class="bar-view"></div>' +
          '<button class="bar-nav next" data-dir="1" title="Листать вперёд">▶</button>' +
        '</div>' +
        '<div class="bar-foot">' +
          '<span class="bar-label"></span>' +
          '<button class="bar-toggle" title="Свернуть / развернуть">▼</button>' +
        '</div>';

      this.spellWrap = $('#spellwrap');
      this.abilWrap = $('#abilwrap');
      this.spellWrap.innerHTML = skeleton;
      this.abilWrap.innerHTML = skeleton;
      this.abilOffset = 0;
      this._spellKey = ''; this._abilKey = '';

      const wire = (wrap, kind) => {
        wrap.addEventListener('click', (e) => {
          const nav = e.target.closest('.bar-nav');
          if (nav) { this.scrollBar(kind, +nav.dataset.dir); return; }
          const tg = e.target.closest('.bar-toggle');
          if (tg) { this.toggleBar(kind); return; }
          const tile = e.target.closest('.tile');
          if (tile && kind === 'spell') {
            g.player.selectedSpell = +tile.dataset.i;
            g.audio.sfx('ui');
            this.updateSpellBar(true);
          }
        });
        wrap.addEventListener('wheel', (e) => {
          e.preventDefault(); e.stopPropagation();
          this.scrollBar(kind, Math.sign(e.deltaY));
        }, { passive: false });
        wrap.addEventListener('contextmenu', (e) => e.stopPropagation());
      };
      wire(this.spellWrap, 'spell');
      wire(this.abilWrap, 'abil');
      this.applyHudLayout();
    }

    /** Листание панели. */
    scrollBar(kind, dir) {
      const g = this.game;
      if (kind === 'spell') {
        const n = this.state.data.spells.length;
        if (!n) return;
        g.player.selectedSpell = ((g.player.selectedSpell + dir) % n + n) % n;
        g.audio.sfx('ui');
        if (g.tutorial) g.tutorial.event('spell');
        this.updateSpellBar(true);
      } else {
        const list = KM.ABILITIES.filter(a => a.active && this.state.hasAbility(a.id));
        const vis = this.visibleCount('abil', list.length);
        const max = Math.max(0, list.length - vis);
        this.abilOffset = U.clamp(this.abilOffset + dir, 0, max);
        g.audio.sfx('ui');
        this.updateAbilityBar(true);
      }
    }

    toggleBar(kind) {
      const s = this.state.data.settings;
      if (kind === 'spell') s.spellOpen = !s.spellOpen;
      else s.abilOpen = !s.abilOpen;
      this.state.save();
      this.game.audio.sfx('ui');
      this.applyHudLayout();
      this.updateSpellBar(true);
      this.updateAbilityBar(true);
    }

    visibleCount(kind, total) {
      const s = this.state.data.settings;
      const open = kind === 'spell' ? s.spellOpen !== false : s.abilOpen !== false;
      if (!open) return 1;
      // внимание: 0 означает «показать все», поэтому нельзя писать (x || 1)
      let c = kind === 'spell' ? s.spellCount : s.abilCount;
      if (c === undefined || c === null) c = kind === 'spell' ? 1 : 3;
      return c === 0 ? total : Math.min(c, total);
    }

    /** Позиции, масштаб и свёрнутость панелей. */
    applyHudLayout() {
      const s = this.state.data.settings;
      const hud = $('#hud');
      hud.style.setProperty('--hud-scale', (s.hudScale || 100) / 100);
      const set = (wrap, pos, open) => {
        if (!wrap) return;
        wrap.className = 'hudbar pos-' + (pos || 'bc') + (open ? '' : ' collapsed');
        const tg = wrap.querySelector('.bar-toggle');
        if (tg) tg.textContent = open ? '▼' : '▲';
      };
      set(this.spellWrap, s.spellPos, s.spellOpen !== false);
      set(this.abilWrap, s.abilPos, s.abilOpen !== false);
    }

    /** Панель заклинаний: показываем окно вокруг выбранного. */
    updateSpellBar(force) {
      if (!this.spellWrap) return;
      const S = this.state, p = this.game.player;
      const ids = S.data.spells;
      const sel = Math.min(p.selectedSpell || 0, Math.max(0, ids.length - 1));
      const vis = this.visibleCount('spell', ids.length);
      const start = U.clamp(sel - Math.floor(vis / 2), 0, Math.max(0, ids.length - vis));
      const key = ids.join(',') + '|' + sel + '|' + vis + '|' + start;
      if (!force && key === this._spellKey) return;
      this._spellKey = key;

      const view = this.spellWrap.querySelector('.bar-view');
      view.innerHTML = '';
      for (let k = 0; k < vis; k++) {
        const i = start + k;
        const sp = KM.SPELL_BY[ids[i]];
        if (!sp) continue;
        const d = el('div', 'tile' + (i === sel ? ' sel' : ''));
        d.dataset.i = i;
        d.dataset.id = sp.id;
        d.title = sp.name + ' — ' + sp.desc;
        d.innerHTML = '<span class="k">' + (i < 10 ? (i === 9 ? 0 : i + 1) : '') + '</span>' +
          sp.icon + '<span class="cost">' + sp.mana + '</span><div class="cd"></div>';
        view.appendChild(d);
      }
      const cur = KM.SPELL_BY[ids[sel]];
      this.spellWrap.querySelector('.bar-label').textContent =
        (cur ? cur.name : '') + '  ' + (sel + 1) + '/' + ids.length;
      this.refreshSpellCd();
    }

    refreshSpellCd() {
      if (!this.spellWrap) return;
      const p = this.game.player;
      const tiles = this.spellWrap.querySelectorAll('.tile');
      for (const node of tiles) {
        const sp = KM.SPELL_BY[node.dataset.id];
        if (!sp) continue;
        const cd = (p.spellCd && p.spellCd[sp.id]) || 0;
        const full = sp.cd * (p.st ? p.st.cooldown : 1);
        node.querySelector('.cd').style.transform = 'scaleY(' + (full > 0 ? U.clamp(cd / full, 0, 1) : 0) + ')';
        node.classList.toggle('no-mana', p.mana < sp.mana);
      }
    }

    /** Панель активных способностей. */
    updateAbilityBar(force) {
      if (!this.abilWrap) return;
      const S = this.state, p = this.game.player;
      const list = KM.ABILITIES.filter(a => a.active && S.hasAbility(a.id));
      this.abilWrap.style.display = list.length ? '' : 'none';
      if (!list.length) return;
      const vis = this.visibleCount('abil', list.length);
      this.abilOffset = U.clamp(this.abilOffset, 0, Math.max(0, list.length - vis));
      const key = list.map(a => a.id).join(',') + '|' + vis + '|' + this.abilOffset;
      if (force || key !== this._abilKey) {
        this._abilKey = key;
        const view = this.abilWrap.querySelector('.bar-view');
        view.innerHTML = '';
        for (let k = 0; k < vis; k++) {
          const a = list[this.abilOffset + k];
          if (!a) continue;
          const d = el('div', 'tile');
          d.dataset.id = a.id;
          d.title = a.name + ' [' + a.keyName + ']\n' + a.desc +
            '\nМана: ' + a.mana + ' · Перезарядка: ' + a.cd + ' с';
          d.innerHTML = '<span class="k">' + a.keyName + '</span>' + a.icon +
            '<span class="cdn"></span><div class="cd"></div>';
          view.appendChild(d);
        }
        this.abilWrap.querySelector('.bar-label').textContent =
          'Способности ' + (this.abilOffset + 1) + '–' + Math.min(list.length, this.abilOffset + vis) + '/' + list.length;
      }
      for (const node of this.abilWrap.querySelectorAll('.tile')) {
        const a = KM.ABIL_BY[node.dataset.id];
        if (!a) continue;
        const cd = p.abilityCd ? (p.abilityCd[a.id] || 0) : 0;
        node.querySelector('.cd').style.transform = 'scaleY(' + (cd / a.cd) + ')';
        node.querySelector('.cdn').textContent = cd > 0 ? Math.ceil(cd) : '';
        const on = (a.id === 'shield' && p.shieldT > 0) ||
                   (a.id === 'invis' && p.invisT > 0) ||
                   (a.id === 'haste' && p.hasteT > 0) ||
                   (a.id === 'bouncy' && p.bounceT > 0) ||
                   (a.id === 'cloudwalk' && p.cloudT > 0);
        node.classList.toggle('on', on);
        node.classList.toggle('ready', !on && cd <= 0 && p.mana >= a.mana);
      }
    }


    /** Индикатор тепла/прохлады. */
    updateClimateHud() {
      const g = this.game, p = g.player;
      const box = $('#climate');
      if (!box) return;
      if (!g.level || !p.st) { box.classList.add('hidden'); return; }
      box.classList.remove('hidden');

      const net = p.climateNet || 0;
      const hot = net > 0;
      const excess = Math.abs(net) - 1.5;
      const warm = p.st.warm || 0;
      const immune = (net < 0 && p.st.coldImmune) || (net > 0 && p.st.heatImmune);

      // сколько значков горит — сколько запаса осталось
      const N = 6;
      const filled = immune ? N : Math.max(0, Math.min(N, Math.ceil(p.climate / 100 * N)));
      const icon = immune ? '🛡️' : (hot ? '💧' : '🔥');
      let html = '';
      for (let i = 0; i < N; i++) html += '<span class="' + (i < filled ? '' : 'off') + '">' + icon + '</span>';

      const key = html + net.toFixed(1) + warm + immune + filled;
      if (key !== this._climKey) {
        this._climKey = key;
        box.querySelector('.cl-icons').innerHTML = html;
        let label;
        if (immune) {
          label = '<b>' + (hot ? 'Не боится жары' : 'Не боится холода') + '</b>';
        } else if (excess <= 0) {
          label = 'Комфортно · утепление <b>' + (warm >= 0 ? '+' : '') + warm + '</b>';
        } else if (hot) {
          label = '<b style="color:#ff9a3a">Жарко!</b> нужна лёгкая одежда · утепление <b>' + (warm >= 0 ? '+' : '') + warm + '</b>';
        } else {
          label = '<b style="color:#8ad8ff">Холодно!</b> нужна тёплая одежда · утепление <b>' + (warm >= 0 ? '+' : '') + warm + '</b>';
        }
        box.querySelector('.cl-label').innerHTML = label;
        box.classList.toggle('cold', !immune && !hot && excess > 0);
        box.classList.toggle('hot', !immune && hot && excess > 0);
      }
      box.classList.toggle('danger', !immune && excess > 0 && p.climate <= 0);
    }

    updateObjectives() {
      const g = this.game;
      if (!g.level) return;
      const L = g.level;
      const alive = g.monsters.filter(m => m.alive).length;
      const total = g.totalMonsters;
      const cagesLeft = L.cages.filter(c => !c.opened).length;
      const chestsLeft = L.chests.filter(c => !c.opened).length;
      let html = '<div class="obj-title">ЗАДАЧИ ЛОКАЦИИ</div>';
      html += '<div class="obj' + (alive === 0 ? ' done' : '') + '"><span>👹 Монстры</span><b>' +
        (total - alive) + '/' + total + '</b></div>';
      if (L.cages.length) {
        html += '<div class="obj' + (cagesLeft === 0 ? ' done' : '') + '"><span>🐱 Спасти котов</span><b>' +
          (L.cages.length - cagesLeft) + '/' + L.cages.length + '</b></div>';
      }
      html += '<div class="obj' + (chestsLeft === 0 ? ' done' : '') + '"><span>📦 Сундуки</span><b>' +
        (L.chests.length - chestsLeft) + '/' + L.chests.length + '</b></div>';
      html += '<div class="obj' + (L.portal && L.portal.active ? ' done' : '') + '"><span>✨ Портал</span><b>' +
        (L.portal && L.portal.active ? 'открыт' : 'спит') + '</b></div>';
      $('#objectives').innerHTML = html;
    }

    toggleMinimap() {
      this.minimap = !this.minimap;
      this.game.showMinimap = this.minimap;
      this.toast(this.minimap ? 'Миникарта включена' : 'Миникарта выключена', 'info', 1200);
    }

    // ============================================================
    //  ЭФФЕКТЫ ИНТЕРФЕЙСА
    // ============================================================
    toast(msg, kind, ms) {
      const box = $('#toasts');
      const t = el('div', 'toast ' + (kind || 'info'), KM.I18N ? KM.I18N.t(msg) : msg);
      box.appendChild(t);
      while (box.children.length > 5) box.removeChild(box.firstChild);
      setTimeout(() => {
        t.classList.add('fade');
        setTimeout(() => t.remove(), 420);
      }, ms || 2000);
    }

    bigMessage(title, sub) {
      const b = $('#bigmsg');
      b.querySelector('h3').textContent = title;
      b.querySelector('p').textContent = sub || '';
      b.classList.remove('hidden');
      const inner = b.querySelector('.bm-inner');
      inner.style.animation = 'none';
      void inner.offsetWidth;
      inner.style.animation = '';
      clearTimeout(this._bmT);
      this._bmT = setTimeout(() => b.classList.add('hidden'), 2600);
    }

    hurtFlash() {
      const v = $('#hurt-vignette');
      v.style.transition = 'none';
      v.style.opacity = '0.85';
      void v.offsetWidth;
      v.style.transition = 'opacity .45s';
      v.style.opacity = '0';
    }

    flashSpeed() {
      const t = document.querySelector('#hud-status .st-speed');
      if (t) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
    }
    flashDash() { }

    // ============================================================
    //  ИТОГИ
    // ============================================================
    showVictory(d) {
      const box = $('#win-body');
      box.innerHTML =
        '<div style="text-align:center;font-size:19px;color:var(--cyan);font-weight:800">' + d.name + '</div>' +
        '<div class="stars">' + '★'.repeat(d.stars) + '<span style="opacity:.3">' + '★'.repeat(3 - d.stars) + '</span></div>' +
        '<div class="result-rows">' +
        '<div class="rrow"><span>🪙 Собрано монет</span><b>' + d.coins + '</b></div>' +
        '<div class="rrow"><span>🎁 Награда за локацию</span><b>+' + d.bonus + '</b></div>' +
        '<div class="rrow"><span>✨ Опыт</span><b>' + d.xp + '</b></div>' +
        '<div class="rrow"><span>📦 Сундуки</span><b>' + d.chests + '</b></div>' +
        (d.cages !== '0/0' ? '<div class="rrow"><span>🐱 Коты спасены</span><b>' + d.cages + '</b></div>' : '') +
        '<div class="rrow"><span>⏱ Время</span><b>' + fmtTime(d.time) + '</b></div>' +
        '</div>';
      const row = el('div', 'panel-body col');
      row.style.padding = '0';
      if (d.next) {
        const b = el('button', 'btn btn-big', '▶ Следующая локация');
        b.dataset.act = 'next';
        row.appendChild(b);
      }
      const b2 = el('button', 'btn', '🗺 К списку локаций'); b2.dataset.act = 'tolocs';
      const b3 = el('button', 'btn', '🛒 В магазин'); b3.dataset.act = 'shop';
      const b4 = el('button', 'btn btn-ghost', '🏠 Главное меню'); b4.dataset.act = 'quit';
      row.append(b2, b3, b4);
      box.appendChild(row);
      this.show('win');
      this.game.mode = 'won';
      this.game.audio.stopMusic();
      this.game.audio.jingle('victory');
    }

    showDefeat(reason) {
      const box = $('#lose-body');
      box.innerHTML =
        '<div class="death-reason">Кота одолело: <b style="color:var(--red)">' + reason + '</b><br>' +
        'Не расстраивайтесь — попробуйте ещё раз! Улучшите навыки, купите зелья или возьмите питомцев посильнее.</div>';
      const b1 = el('button', 'btn btn-big', '↻ Попробовать снова'); b1.dataset.act = 'retry';
      const b2 = el('button', 'btn', '⭐ Улучшить навыки'); b2.dataset.act = 'skills';
      const b3 = el('button', 'btn', '🛒 В магазин'); b3.dataset.act = 'shop';
      const b4 = el('button', 'btn btn-ghost', '🗺 К списку локаций'); b4.dataset.act = 'tolocs';
      box.append(b1, b2, b3, b4);
      this.game.audio.stopMusic();
      this.game.audio.jingle('defeat');
      this.show('lose');
    }
  }

  function accBonusText(a) {
    const b = a.bonus || {}; const parts = [];
    if (b.hp) parts.push('+' + b.hp + ' здоровья');
    if (b.mana) parts.push('+' + b.mana + ' маны');
    if (b.dmg) parts.push('+' + b.dmg + ' к урону');
    if (b.spd) parts.push('+' + Math.round(b.spd * 100) + '% скорости');
    if (a.gold) parts.push('+' + Math.round(a.gold * 100) + '% монет');
    if (a.luck) parts.push('+' + Math.round(a.luck * 100) + '% удачи');
    if (a.stealth) parts.push((a.stealth > 0 ? '+' : '') + Math.round(a.stealth * 100) + '% скрытности');
    if (a.jump) parts.push('+' + Math.round(a.jump * 100) + '% к прыжку');
    if (a.feather) parts.push('мягкое приземление');
    if (a.warm > 0) parts.push('<span style="color:#ff9a3a">🔥 утепление +' + a.warm + '</span>');
    if (a.warm < 0) parts.push('<span style="color:#8ad8ff">💧 охлаждение ' + a.warm + '</span>');
    return parts.length ? '<span style="color:var(--mint)">' + parts.join(' · ') + '</span>'
      : '<span style="color:var(--dim)">только красота</span>';
  }

  function climateTag(b) {
    const t = b.temp || 0;
    if (t <= -3) return '<span style="color:#8ad8ff">🥶 ' + (b.climateNote || 'мороз') + '</span>';
    if (t < 0) return '<span style="color:#a8d8ff">❄️ ' + (b.climateNote || 'прохладно') + '</span>';
    if (t >= 3) return '<span style="color:#ff9a3a">🥵 ' + (b.climateNote || 'жара') + '</span>';
    if (t > 0) return '<span style="color:#ffc46a">🔥 ' + (b.climateNote || 'тепло') + '</span>';
    return '<span style="color:var(--mint)">🙂 ' + (b.climateNote || 'комфортно') + '</span>';
  }

  function bonusText(cat) {
    const b = cat.bonus || {};
    const parts = [];
    if (b.hp) parts.push((b.hp > 0 ? '+' : '') + b.hp + ' здоровья');
    if (b.mana) parts.push('+' + b.mana + ' маны');
    if (b.dmg) parts.push('+' + b.dmg + ' к урону');
    if (b.spd) parts.push('+' + Math.round(b.spd * 100) + '% скорости');
    if (cat.stealth) parts.push('скрытность ' + Math.round(cat.stealth * 100) + '%');
    if (cat.gold) parts.push('+' + Math.round(cat.gold * 100) + '% монет');
    if (cat.alpha && cat.alpha < 1) parts.push('полупрозрачный');
    if (cat.rainbow) parts.push('радужное сияние');
    if (cat.warm > 0) parts.push('🔥 утепление +' + cat.warm);
    if (cat.warm < 0) parts.push('💧 охлаждение ' + cat.warm);
    if (cat.coldImmune) parts.push('не боится холода');
    if (cat.heatImmune) parts.push('не боится жары');
    return parts.length ? '<span style="color:var(--mint)">' + parts.join(' · ') + '</span>' : '<span style="color:var(--dim)">без бонусов</span>';
  }

  function petEmoji(def) {
    const m = {
      sparky: '✨', slimey: '🟢', batty: '🦇', wolfy: '🐺', spidey: '🕷️',
      ghosty: '👻', golemy: '🗿', impy: '👹', kitty: '🐈', shady: '🌑'
    };
    return m[def.id] || '🐾';
  }

  KM.UI = UI;
})(window);
