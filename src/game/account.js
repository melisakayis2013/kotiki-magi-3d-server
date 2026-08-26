/* ============================================================
   КОТИКИ МАГИ 3D — аккаунты игроков

   Аккаунты хранятся НА УСТРОЙСТВЕ (localStorage). Интернет не нужен:
   игра полностью офлайновая, поэтому «облачного» входа тут нет.
   Структура сделана так, чтобы позже можно было подключить сервер —
   достаточно заменить load/save на сетевые запросы.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const STORE = 'kotiki_magi_3d_accounts_v1';
  const RELOGIN_DAYS = 30;          // не играл больше месяца — нужен повторный вход
  const DAY = 24 * 60 * 60 * 1000;

  // ------------------------------------------------------------
  //  РЕГИОНЫ И ЯЗЫКИ
  // ------------------------------------------------------------
  const REGIONS = [
    { id: 'ru', name: 'Россия', flag: '🇷🇺' },
    { id: 'by', name: 'Беларусь', flag: '🇧🇾' },
    { id: 'kz', name: 'Казахстан', flag: '🇰🇿' },
    { id: 'ua', name: 'Украина', flag: '🇺🇦' },
    { id: 'eu', name: 'Европа', flag: '🇪🇺' },
    { id: 'asia', name: 'Азия', flag: '🌏' },
    { id: 'am', name: 'Америка', flag: '🌎' },
    { id: 'other', name: 'Другой регион', flag: '🌍' }
  ];

  const LANGS = [
    { id: 'ru', name: 'Русский', flag: '🇷🇺', ready: true },
    { id: 'en', name: 'English', flag: '🇬🇧', ready: false },
    { id: 'kk', name: 'Қазақша', flag: '🇰🇿', ready: false },
    { id: 'uk', name: 'Українська', flag: '🇺🇦', ready: false },
    { id: 'tr', name: 'Türkçe', flag: '🇹🇷', ready: false }
  ];

  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  // ------------------------------------------------------------
  //  ХРАНИЛИЩЕ
  // ------------------------------------------------------------
  function read() {
    try {
      const raw = global.localStorage.getItem(STORE);
      if (!raw) return { accounts: {}, lastActive: null };
      const d = JSON.parse(raw);
      if (!d.accounts) d.accounts = {};
      return d;
    } catch (e) { return { accounts: {}, lastActive: null }; }
  }
  function write(d) {
    try { global.localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { }
  }

  /**
   * Простое перемешивание пароля. Это НЕ криптография —
   * оно лишь мешает случайно подсмотреть пароль в хранилище браузера.
   * Настоящая защита возможна только с сервером.
   */
  function hash(pass, salt) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    const s = salt + '|' + pass + '|котики';
    for (let round = 0; round < 512; round++) {
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i) + round;
        h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
        h2 = (h2 + Math.imul(c ^ h1, 2246822519)) >>> 0;
      }
    }
    return (h1 >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36);
  }

  function makeSalt() {
    let s = '';
    for (let i = 0; i < 12; i++) s += Math.floor(Math.random() * 36).toString(36);
    return s;
  }

  // ------------------------------------------------------------
  //  API
  // ------------------------------------------------------------
// ============================================================
  //  КАРТИНКИ ПРОФИЛЯ
  //  Снимки из игры весят много, поэтому лежат отдельным ключом,
  //  а не внутри аккаунта: иначе каждый вход тащил бы их целиком.
  // ============================================================
  const ГАЛ_КЛЮЧ = 'kmagi_gallery_';

  /** Уменьшить картинку, чтобы она поместилась в память браузера. */
  function ужать(файл, сторона, качество) {
    return new Promise((готово, беда) => {
      const rd = new FileReader();
      rd.onerror = () => беда(new Error('файл не прочитался'));
      rd.onload = () => {
        const im = new Image();
        im.onerror = () => беда(new Error('это не картинка'));
        im.onload = () => {
          const k = Math.min(1, сторона / Math.max(im.width, im.height));
          const w = Math.max(1, Math.round(im.width * k));
          const h = Math.max(1, Math.round(im.height * k));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(im, 0, 0, w, h);
          готово(c.toDataURL('image/jpeg', качество || 0.72));
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(файл);
    });
  }

  const GALLERY = {
    МАКС: 8,                                  // больше восьми снимков не храним

    list(id) {
      try { return JSON.parse(localStorage.getItem(ГАЛ_КЛЮЧ + id) || '[]'); }
      catch (e) { return []; }
    },

    /** Добавить снимок. Возвращает текст ошибки или null. */
    add(id, dataURL, подпись) {
      const было = this.list(id);
      было.unshift({ src: dataURL, note: (подпись || '').slice(0, 80), t: Date.now() });
      while (было.length > this.МАКС) было.pop();
      try {
        localStorage.setItem(ГАЛ_КЛЮЧ + id, JSON.stringify(было));
        return null;
      } catch (e) {
        return 'Памяти браузера не хватило — удалите пару старых снимков';
      }
    },

    remove(id, i) {
      const было = this.list(id);
      было.splice(i, 1);
      try { localStorage.setItem(ГАЛ_КЛЮЧ + id, JSON.stringify(было)); } catch (e) { }
    },

    clear(id) { try { localStorage.removeItem(ГАЛ_КЛЮЧ + id); } catch (e) { } }
  };

  const Account = {
    REGIONS, LANGS, MONTHS, RELOGIN_DAYS,

    /** Все аккаунты этого устройства, свежие сверху. */
    list() {
      const d = read();
      return Object.keys(d.accounts)
        .map(id => d.accounts[id])
        .sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
    },

    get(id) {
      const found = read().accounts[id];
      if (found) return found;
      // гость, которого некуда было записать
      if (this._memory && this._memory.id === id) return this._memory;
      return null;
    },
    currentId() { return this._cur || null; },
    current() { return this._cur ? this.get(this._cur) : null; },

    /** Проверка ника: 3–16 символов, буквы/цифры/подчёркивание. */
    checkNick(nick) {
      nick = (nick || '').trim();
      if (nick.length < 3) return 'Ник должен быть не короче 3 символов';
      if (nick.length > 16) return 'Ник не длиннее 16 символов';
      if (!/^[\wА-Яа-яЁё\- ]+$/.test(nick)) return 'Только буквы, цифры, пробел, дефис и _';
      const d = read();
      for (const id in d.accounts) {
        if (d.accounts[id].nick.toLowerCase() === nick.toLowerCase()) {
          return 'Такой ник на этом устройстве уже есть';
        }
      }
      return null;
    },

    checkPass(p) {
      if (!p || p.length < 4) return 'Пароль не короче 4 символов';
      if (p.length > 32) return 'Пароль не длиннее 32 символов';
      return null;
    },

    /** Создать аккаунт. Возвращает {ok, error, account}. */
    create(o) {
      const e1 = this.checkNick(o.nick); if (e1) return { ok: false, error: e1 };
      const e2 = this.checkPass(o.pass); if (e2) return { ok: false, error: e2 };
      if (!o.name || !o.name.trim()) return { ok: false, error: 'Напишите, как вас зовут' };
      if (!o.region) return { ok: false, error: 'Выберите регион' };
      if (!o.lang) return { ok: false, error: 'Выберите язык' };
      const bd = o.birth || {};
      if (!bd.d || !bd.m || !bd.y) return { ok: false, error: 'Укажите дату рождения' };
      const now = new Date();
      if (bd.y > now.getFullYear() || bd.y < 1920) return { ok: false, error: 'Проверьте год рождения' };
      const dim = new Date(bd.y, bd.m, 0).getDate();
      if (bd.d > dim) return { ok: false, error: 'В этом месяце столько дней нет' };

      const d = read();
      const id = 'acc_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
      const salt = makeSalt();
      const acc = {
        id, nick: o.nick.trim(), name: o.name.trim().slice(0, 24),
        salt, pass: hash(o.pass, salt),
        region: o.region, lang: o.lang,
        birth: { d: +bd.d, m: +bd.m, y: +bd.y },
        avatar: o.avatar || 'muri',
        device: o.device || 'pc',
        created: Date.now(), lastLogin: Date.now(),
        lastBirthdayYear: 0,
        playtime: 0
      };
      d.accounts[id] = acc;
      d.lastActive = id;
      write(d);
      this._cur = id;
      return { ok: true, account: acc };
    },

    /** Вход по паролю. */
    login(id, pass) {
      const d = read();
      const a = d.accounts[id];
      if (!a) return { ok: false, error: 'Аккаунт не найден' };
      if (hash(pass || '', a.salt) !== a.pass) return { ok: false, error: 'Неверный пароль' };
      a.lastLogin = Date.now();
      d.lastActive = id;
      write(d);
      this._cur = id;
      return { ok: true, account: a };
    },

    /** Вход без проверки — когда сессия ещё свежая. */
    resume(id) {
      const d = read();
      const a = d.accounts[id];
      if (!a) return false;
      a.lastLogin = Date.now();
      d.lastActive = id;
      write(d);
      this._cur = id;
      return true;
    },

    logout() { this._cur = null; },

    /**
     * Подставить аккаунт, полученный с сервера. Пароля у нас нет —
     * его знает только сервер, поэтому локально ничего не проверяем.
     */
    useServer(info) {
      const id = 'srv_' + this._key(info.nick);
      const acc = {
        id, nick: info.nick, name: info.name || info.nick,
        salt: '', pass: '',
        region: info.region || 'other', lang: info.lang || 'ru',
        birth: info.birth || { d: 1, m: 1, y: 2015 },
        avatar: info.avatar || 'muri',
        created: Date.now(), lastLogin: Date.now(),
        lastBirthdayYear: 0, playtime: 0,
        isServer: true
      };
      if (this.storageWorks()) {
        const d = read();
        const был = d.accounts[id];
        if (был) acc.lastBirthdayYear = был.lastBirthdayYear || 0;
        d.accounts[id] = acc;
        d.lastActive = id;
        write(d);
      } else {
        this._memory = acc;
      }
      this._cur = id;
      return acc;
    },

    _key(nick) { return String(nick || '').trim().toLowerCase(); },


  /** Работает ли сохранение в этом браузере. */
    storageWorks() {
      if (this._sw !== undefined) return this._sw;
      try {
        const k = '__kmagi_test';
        global.localStorage.setItem(k, '1');
        const ok = global.localStorage.getItem(k) === '1';
        global.localStorage.removeItem(k);
        this._sw = ok;
      } catch (e) { this._sw = false; }
      return this._sw;
    },

    /**
     * Быстрый вход без анкеты — чтобы друг, которому скинули игру,
     * мог просто нажать и играть. Аккаунт можно завести потом.
     */
    guest(nick) {
      const id = 'guest_' + Date.now().toString(36);
      const acc = {
        id, nick: (nick || 'Котик').slice(0, 16), name: 'Гость',
        salt: '', pass: '', region: 'other', lang: 'ru',
        birth: { d: 1, m: 1, y: 2015 }, avatar: 'muri',
        created: Date.now(), lastLogin: Date.now(),
        lastBirthdayYear: new Date().getFullYear(),   // без праздника у гостя
        playtime: 0, isGuest: true
      };
      if (this.storageWorks()) {
        const d = read();
        d.accounts[id] = acc;
        d.lastActive = id;
        write(d);
      } else {
        // писать некуда — держим в памяти, игра всё равно запустится
        this._memory = acc;
      }
      this._cur = id;
      this._guestAcc = acc;
      return acc;
    },

    /** Заменить пароль (новая соль каждый раз). */
    setPassword(id, pass) {
      const d = read();
      const a = d.accounts[id];
      if (!a) return false;
      a.salt = makeSalt();
      a.pass = hash(pass, a.salt);
      write(d);
      return true;
    },

    update(id, patch) {
      const d = read();
      if (!d.accounts[id]) return;
      Object.assign(d.accounts[id], patch);
      write(d);
    },

    remove(id) {
      const d = read();
      delete d.accounts[id];
      if (d.lastActive === id) d.lastActive = null;
      write(d);
      if (this._cur === id) this._cur = null;
      // чистим сохранения этого аккаунта
      try {
        for (let i = 0; i < 8; i++) global.localStorage.removeItem('kmagi_' + id + '_slot_' + i);
      } catch (e) { }
    },

    /** Нужен ли экран входа при запуске. */
    startupState() {
      const d = read();
      const ids = Object.keys(d.accounts);
      if (!ids.length) return { screen: 'signup', reason: 'Первый запуск — создайте аккаунт' };
      const a = d.accounts[d.lastActive];
      if (!a) return { screen: 'login', reason: 'Выберите аккаунт' };
      const away = Date.now() - (a.lastLogin || 0);
      if (away > RELOGIN_DAYS * DAY) {
        return {
          screen: 'login', relogin: true, account: a,
          reason: 'Вас не было ' + Math.floor(away / DAY) + ' дней — войдите заново'
        };
      }
      return { screen: 'auto', account: a };
    },

    // ------------------------------------------------------------
    //  ДЕНЬ РОЖДЕНИЯ
    // ------------------------------------------------------------
    /** Сегодня ли день рождения. */
    isBirthday(acc, when) {
      if (!acc || !acc.birth) return false;
      const n = when || new Date();
      return n.getDate() === acc.birth.d && (n.getMonth() + 1) === acc.birth.m;
    },

    /** Сколько дней до дня рождения. */
    daysToBirthday(acc, when) {
      if (!acc || !acc.birth) return null;
      const n = when || new Date();
      const y = n.getFullYear();
      let next = new Date(y, acc.birth.m - 1, acc.birth.d);
      const today = new Date(y, n.getMonth(), n.getDate());
      if (next < today) next = new Date(y + 1, acc.birth.m - 1, acc.birth.d);
      return Math.round((next - today) / DAY);
    },

    /** Идёт ли праздничная неделя (день рождения ±3 дня). */
    isBirthdayWeek(acc, when) {
      const d = this.daysToBirthday(acc, when);
      if (d === null) return false;
      return d <= 3 || d >= 362;
    },

    /** Подарки ещё не получены в этом году? */
    birthdayPending(acc, when) {
      if (!this.isBirthday(acc, when)) return false;
      const y = (when || new Date()).getFullYear();
      return (acc.lastBirthdayYear || 0) < y;
    },

    markBirthdayClaimed(acc, when) {
      const y = (when || new Date()).getFullYear();
      this.update(acc.id, { lastBirthdayYear: y });
      acc.lastBirthdayYear = y;
    },

    /** Сколько лет исполняется. */
    age(acc, when) {
      if (!acc || !acc.birth) return null;
      const n = when || new Date();
      let a = n.getFullYear() - acc.birth.y;
      const m = n.getMonth() + 1;
      if (m < acc.birth.m || (m === acc.birth.m && n.getDate() < acc.birth.d)) a--;
      return a;
    },

    regionName(id) { const r = REGIONS.find(x => x.id === id); return r ? r.flag + ' ' + r.name : '🌍 —'; },
    langName(id) { const l = LANGS.find(x => x.id === id); return l ? l.flag + ' ' + l.name : '🇷🇺 Русский'; },
    birthText(acc) {
      if (!acc || !acc.birth) return '—';
      return acc.birth.d + ' ' + MONTHS[acc.birth.m - 1] + ' ' + acc.birth.y;
    }
  };

  Account.gallery = GALLERY;
  Account.shrink = ужать;

  /** Цвета для ника и чата — из готового набора, чтобы всегда читалось. */
  Account.COLORS = [
    { id: 'gold', name: 'Золотой', css: '#ffd23a' },
    { id: 'mint', name: 'Мятный', css: '#8ae0a8' },
    { id: 'sky', name: 'Небесный', css: '#8fe0ff' },
    { id: 'pink', name: 'Розовый', css: '#ff9ac0' },
    { id: 'lilac', name: 'Сиреневый', css: '#c0a4ff' },
    { id: 'coral', name: 'Коралловый', css: '#ff9a7a' },
    { id: 'lime', name: 'Лаймовый', css: '#d4e85a' },
    { id: 'ice', name: 'Ледяной', css: '#e8f4ff' }
  ];
  Account.colorCss = function (id) {
    const c = Account.COLORS.find(x => x.id === id);
    return c ? c.css : '#ffd23a';
  };

  KM.ACCOUNT = Account;
})(window);
