/* ============================================================
   КОТИКИ МАГИ 3D — сеть

   Разговаривает с server.py по WebSocket. Если сервер не запущен
   (или игра открыта прямо из файла), просто молчит — одиночный
   режим от этого не страдает.

   Мир на всех клиентах генерируется по одному и тому же зерну,
   поэтому монстры, сундуки и клетки у всех совпадают. Достаточно
   сообщить «монстр номер 7 повержен» — и он упадёт у всех.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const RETRY = [1000, 2000, 4000, 8000, 15000];
  const SERVER_KEY = 'kmagi_server';        // куда ходить за друзьями
  const AUTO_KEY = 'kmagi_server_auto';     // нашли сами или вписал игрок
  const SEND_HZ = 12;

  class Net {
    constructor(game) {
      this.game = game;
      this.ws = null;
      this.status = 'off';       // off | connecting | online | error
      this.reason = '';
      this.id = 0;
      this.nick = null;
      this.online = [];          // все, кто сейчас в сети
      this.friends = [];
      this.requests = [];
      this.peers = new Map();    // id -> {nick, cat, level, x,y,z,yaw, ...}
      this.room = null;
      this.mode = 'coop';       // режим комнаты
      this.team = null;         // 'red' | 'blue' в командном режиме
      this.match = null;        // счёт, таймер, состояние
      this.isHost = false;      // мы ли считаем монстров в этой локации
      this.hostId = 0;
      this._monT = 0;
      this.invites = [];
      this.tries = 0;
      this._sendT = 0;
      this._timer = null;
      this.onChange = null;      // интерфейс перерисовывается
      this.direct = null;        // прямая игра, когда сервера нет вовсе
      this.serverAccount = null; // ник, под которым вошли на сервер
      this.servers = [];         // список серверов, куда можно зайти
      this.srv = null;           // на каком сервере сейчас играем
      this.srvName = null;
      this.myRoom = null;        // свой сервер, если игрок его создал
      this.talks = new Map();    // ник -> переписка
      this.unread = {};          // ник -> сколько непрочитанных
      this.onTalk = null;        // пришло письмо
      this._probe = null;        // поиск живого адреса
    }

    // ============================================================
    //  АДРЕС СЕРВЕРА
    //  Игру можно открыть по-разному, и сервер каждый раз разный:
    //    • запустили ИГРАТЬ.bat  — сервер тут же, на этом компьютере;
    //    • открыли скачанный файл — своего сервера нет, нужен чужой;
    //    • выложили игру в интернет — сервер живёт отдельно.
    //  Поэтому адрес можно задать вручную и он запоминается.
    // ============================================================
    /** Что игрок вписал в настройках (или что зашито при сборке). */
    customHost() {
      let v = null;
      try { v = global.localStorage.getItem(SERVER_KEY); } catch (e) { }
      if (!v && KM.SERVER_HOST) v = KM.SERVER_HOST;
      return (v || '').trim() || null;
    }

    /** Запомнить адрес сервера. Пустая строка — вернуться к своему. */
    /**
     * @param v     адрес; пусто — забыть и искать самой
     * @param авто  адрес найден игрой, а не вписан руками. Такой не жалко
     *              забыть, если он перестал отвечать: вдруг сервер переехал
     *              в интернет, и надо перестать долбиться в старый.
     */
    setHost(v, авто) {
      v = (v || '').trim();
      try {
        if (v) {
          global.localStorage.setItem(SERVER_KEY, v);
          global.localStorage.setItem(AUTO_KEY, авто ? '1' : '0');
        } else {
          global.localStorage.removeItem(SERVER_KEY);
          global.localStorage.removeItem(AUTO_KEY);
        }
      } catch (e) { }
      this.disconnect();
      if (this.ready() && this.available()) this.connect(true);
      this.changed();
    }

    /**
     * Приводим что угодно к адресу вида ws://дом:порт/ws
     * Игрок может вписать «kotiki.onrender.com», «https://…», «ws://…»
     * или просто «192.168.1.6:8765» — разберёмся со всеми.
     */
    wsUrl(raw) {
      if (raw) {
        // защищённость: сначала смотрим, что человек написал сам
        let secure = null;
        if (/^(https|wss):\/\//i.test(raw)) secure = true;
        else if (/^(http|ws):\/\//i.test(raw)) secure = false;

        let h = raw.replace(/^[a-z]+:\/\//i, '')   // убираем схему
          .replace(/\/+$/, '')                      // хвостовые слэши
          .replace(/\/ws$/i, '');                   // и /ws, если дописали

        if (secure === null) {
          // схемы нет — угадываем. Домашние адреса без шифрования,
          // а настоящий домен в интернете почти всегда по https.
          const local = /^(localhost|127\.|192\.168\.|10\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(h);
          const hasPort = /:\d+$/.test(h);
          secure = !local && !hasPort;
        }
        return (secure ? 'wss://' : 'ws://') + h + '/ws';
      }

      return null;
    }

    /** Адрес, по которому играем сейчас. */
    url() {
      const raw = this.customHost();
      if (raw) return this.wsUrl(raw);
      const l = global.location;
      if (l.protocol === 'file:') return null;      // из файла своего сервера нет
      const proto = l.protocol === 'https:' ? 'wss:' : 'ws:';
      return proto + '//' + l.host + '/ws';
    }

    // ============================================================
    //  САМ НАЙДЁТ СЕРВЕР
    //  Игроку незачем знать адреса. Игра обходит все известные,
    //  берёт первый отозвавшийся и запоминает его.
    // ============================================================
    /** Постучаться по одному адресу. Отвечает host или null. */
    _knock(host, ms) {
      return new Promise((res) => {
        const адрес = this.wsUrl(host);
        if (!адрес) { res(null); return; }
        let ws = null, всё = false;
        const конец = (ok) => {
          if (всё) return;
          всё = true;
          try { if (ws) { ws.onopen = ws.onerror = ws.onclose = null; ws.close(); } } catch (e) { }
          res(ok ? host : null);
        };
        try { ws = new WebSocket(адрес); }
        catch (e) { конец(false); return; }
        ws.onopen = () => конец(true);
        ws.onerror = () => конец(false);
        ws.onclose = () => конец(false);
        setTimeout(() => конец(false), ms || 4000);
      });
    }


    /**
     * Обойти всю домашнюю сеть. Нужно, когда роутер выдал компьютеру
     * другой номер и вшитый адрес перестал совпадать.
     * Стучимся пачками, чтобы не завалить телефон сотней соединений.
     */
    scanHome(onStep) {
      const адреса = (KM.SERVERS && KM.SERVERS.neighbours) ? KM.SERVERS.neighbours() : [];
      if (!адреса.length) return Promise.resolve(null);
      this._stopScan = false;
      const ПАЧКА = 24;
      let сделано = 0;

      const пачка = (i) => {
        if (this._stopScan || i >= адреса.length) return Promise.resolve(null);
        const часть = адреса.slice(i, i + ПАЧКА);
        return Promise.all(часть.map(h => this._knock(h, 1400))).then((ответы) => {
          сделано += часть.length;
          if (onStep) onStep(сделано, адреса.length);
          const нашли = ответы.find(Boolean);
          if (нашли) return нашли;
          return пачка(i + ПАЧКА);
        });
      };
      return пачка(0);
    }

    stopScan() { this._stopScan = true; }

    /** Обойти все известные адреса и подключиться к живому. */
    findServer(гость, cb) {
      if (this._probe) return;                       // уже ищем
      const список = (KM.SERVERS ? KM.SERVERS.candidates(this.customHost()) : []);
      if (!список.length) {
        this.status = 'error';
        this.reason = 'Пока не известно ни одного сервера. Свой поднимает ИГРАТЬ.bat.';
        this.changed();
        if (cb) cb(null);
        return;
      }
      this._probe = true;
      this.status = 'connecting';
      this.reason = 'Ищем сервер…';
      this.changed();

      Promise.all(список.map(c => this._knock(c.host))).then((ответы) => {
        this._probe = null;
        // Что вышло по каждому адресу — чтобы «нет связи» перестало быть
        // загадкой и человек видел, куда игра вообще стучалась.
        this.report = список.map((c, i) => ({
          host: c.host, name: c.name, ok: !!ответы[i]
        }));
        const живой = ответы.find(Boolean);
        if (!живой) {
          this.status = 'error';
          this.reason = 'Ни один сервер не отозвался. Проверьте интернет — ' +
            'или запустите ИГРАТЬ.bat, чтобы поднять свой.';
          this.changed();
          if (cb) cb(null);
          return;
        }
        // адрес, который сработал, запоминаем: в следующий раз сразу туда
        const нашли = список.find(c => c.host === живой);
        this.foundName = нашли ? нашли.name : живой;
        this.report = null;                  // нашли — разбор больше не нужен
        if (!this.customHost() || this.customHost() !== живой) this.setHost(живой, true);
        this.status = 'off';
        this.connect(true, гость);
        if (cb) cb(живой);
      });
    }

    available() {
      if (this.url() || this.isDirect()) return true;
      // адреса нет, но есть куда постучаться — значит, связь возможна
      return !!(KM.SERVERS && KM.SERVERS.candidates(null).length);
    }

    /** На сервер выходим под ником аккаунта — значит, аккаунт нужен. */
    ready() { return !!(KM.ACCOUNT && KM.ACCOUNT.current()); }

    // ---------- соединение ----------
    /**
     * @param force  начать заново, не считая прошлых неудач
     * @param гость  соединиться без аккаунта — только чтобы войти по нику
     *               и паролю. Иначе получалась ловушка: аккаунт на сервере
     *               нельзя открыть без связи, а связь просила аккаунт.
     */
    connect(force, гость) {
      if (this.ws && (this.status === 'online' || this.status === 'connecting')) return;
      const url = this.url();
      if (!url) {
        // Адреса нет — не заставляем игрока его вписывать, ищем сами.
        this.findServer(гость);
        return;
      }
      if (!гость && !this.ready()) {
        this.status = 'error';
        this.reason = 'Сначала войдите в аккаунт — по нику вас узна́ют друзья.';
        this.changed();
        return;
      }
      if (force) this.tries = 0;
      this.status = 'connecting';
      this.reason = '';
      this.changed();

      let ws;
      try { ws = new WebSocket(url); }
      catch (e) {
        this.fail('Не получилось открыть соединение');
        return;
      }
      this.ws = ws;

      // Свой срок ожидания. Без него браузер может молча ждать ответа
      // от мёртвого адреса добрую минуту — а игрок сидит и смотрит
      // на «подключаемся…», не понимая, что происходит.
      clearTimeout(this._openTimer);
      this._openTimer = setTimeout(() => {
        if (this.ws === ws && ws.readyState !== 1) {
          try { ws.close(); } catch (e) { }
          this.ws = null;
          this.fail('Сервер не отвечает');
        }
      }, 7000);

      ws.onopen = () => {
        clearTimeout(this._openTimer);
        this.tries = 0;
        this.status = 'online';
        this.reason = '';
        this.hello();
        this.changed();
      };
      ws.onclose = () => {
        clearTimeout(this._openTimer);
        if (this.ws !== ws) return;
        this.ws = null;
        this.peers.clear();
        this.online = [];
        if (this.status !== 'error') this.fail('Связь с сервером потеряна');
      };
      ws.onerror = () => { /* onclose всё равно придёт */ };
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        this.handle(m);
      };
    }

    fail(why) {
      this.status = 'error';
      this.reason = why;
      this.changed();
      clearTimeout(this._timer);
      if (!this.ready()) return;      // без аккаунта ломиться некуда
      // Три раза подряд не достучались до адреса, который нашли сами?
      // Возможно, сервер переехал — например, из дома в интернет.
      // Забываем старый и ищем заново, иначе игра будет вечно стучаться
      // в пустоту и никогда не найдёт новый.
      let сами = false;
      try { сами = global.localStorage.getItem(AUTO_KEY) === '1'; } catch (e) { }
      if (сами && this.tries >= 3 && this.customHost()) {
        this.tries = 0;
        this.setHost('');
        this.findServer(false);
        return;
      }

      // тихо пробуем ещё раз — вдруг сервер просто перезапускают
      const wait = RETRY[Math.min(this.tries, RETRY.length - 1)];
      this.tries++;
      this._timer = setTimeout(() => {
        if (this.status === 'error') this.connect();
      }, wait);
    }

    disconnect() {
      clearTimeout(this._timer);
      clearTimeout(this._openTimer);
      this.tries = 0;
      const ws = this.ws;
      this.ws = null;
      this.status = 'off';
      this.reason = '';
      this.peers.clear();
      this.online = [];
      this.room = null;
      if (ws) { try { ws.close(); } catch (e) { } }
      this.changed();
    }

    send(o) {
      // играем напрямую — отдаём создателю игры, а не серверу
      if (this.direct && this.direct.connected()) return this.direct.send(o);
      if (!this.ws || this.ws.readyState !== 1) return false;
      try { this.ws.send(JSON.stringify(o)); return true; }
      catch (e) { return false; }
    }

    // ============================================================
    //  ПРЯМАЯ ИГРА
    // ============================================================
    /** Завести прямую игру (создатель или гость). */
    startDirect() {
      if (!this.direct && KM.Direct) {
        this.direct = new KM.Direct(this.game);
        this.direct.onChange = () => this.changed();
      }
      return this.direct;
    }

    /** Связь появилась — для игры это то же самое, что сервер. */
    onDirectOpen() {
      if (this.ws) this.disconnect();
      clearTimeout(this._timer);
      this.status = 'online';
      this.reason = '';
      this.tries = 0;
      this.changed();
    }

    onDirectClose() {
      if (this.direct && this.direct.connected()) return;
      this.status = 'error';
      this.reason = 'Связь с другом прервалась';
      this.peers.clear();
      this.online = [];
      this.room = null;
      this.changed();
    }

    /** Играем ли мы сейчас напрямую. */
    isDirect() { return !!(this.direct && this.direct.connected()); }

    stopDirect() {
      if (this.direct) this.direct.stop();
      this.direct = null;
      this.status = 'off';
      this.peers.clear();
      this.online = [];
      this.room = null;
      this.changed();
    }

    changed() { if (this.onChange) this.onChange(this); }

    // ---------- представляемся ----------
    hello() {
      if (this.isDirect()) return;      // напрямую знакомство уже прошло
      const acc = KM.ACCOUNT && KM.ACCOUNT.current();
      if (!acc) return;
      const S = this.game.state;
      const cat = S.effectiveCat();
      this.nick = acc.nick;
      this.send({
        t: 'hello', nick: this.nick,
        cat: S.data.activeCat, catName: cat.name,
        level: S.data.level,
        device: KM.DEVICE ? KM.DEVICE.kind().id : 'pc'
      });
    }

    /** Сообщить серверу, что уровень или кот поменялись. */
    refreshMe() {
      if (this.status !== 'online') return;
      const S = this.game.state;
      this.send({ t: 'me', cat: S.data.activeCat, catName: S.effectiveCat().name, level: S.data.level });
    }

    // ---------- комната (локация) ----------
    joinRoom(index, name, mode, srv, code) {
      if (this.status !== 'online') return;
      this.room = index;
      this.mode = mode || 'coop';
      this.team = null;
      this.match = null;
      this.isHost = false;
      this.hostId = 0;
      this.peers.clear();
      this.send({ t: 'join', loc: index, name: name || '', mode: this.mode,
                  srv: srv || '', code: code || '' });
    }
    leaveRoom() {
      this.room = null;
      this.team = null;
      this.match = null;
      this.isHost = false;
      this.hostId = 0;
      this.peers.clear();
      if (this.game.chat) this.game.chat.clearBubbles();
      if (this.status === 'online') this.send({ t: 'leave' });
      this.changed();
    }

    // ---------- друзья ----------
    addFriend(nick) { this.send({ t: 'friend', nick }); }
    acceptFriend(nick) { this.send({ t: 'accept', nick }); }
    declineFriend(nick) { this.send({ t: 'decline', nick }); }
    removeFriend(nick) { this.send({ t: 'unfriend', nick }); }
    /** Позвать друга к себе: и в локацию, и на тот же сервер. */
    invite(nick, srv) {
      const L = this.game.level;
      const комната = srv || this.srv;
      const строка = (this.servers || []).find(x => x.id === комната);
      this.send({
        t: 'invite', nick,
        loc: строка ? строка.loc : (L ? L.index : (this.room || 0)),
        locName: L ? L.info.name : '',
        srv: комната || '',
        srvName: строка ? строка.name : (this.srvName || ''),
        mode: строка ? строка.mode : this.mode
      });
    }

    // ---------- входящие ----------
    handle(m) {
      const g = this.game, ui = g.ui;
      switch (m.t) {
        case 'welcome':
          this.lan = m.lan || [];          // адреса для телефона
          this.cloud = !!m.cloud;          // сервер живёт в интернете
          this.id = m.id;
          this.nick = m.nick;
          this.online = m.list || m.online || [];
          this.changed();
          break;

        case 'online':
          this.online = m.list || [];
          this.changed();
          break;

        case 'friends':
          this.unread = m.unread || {};
          this.friends = m.list || [];
          this.requests = m.requests || [];
          this.changed();
          break;

        case 'room':
          this.srv = m.srv || null;
          this.srvName = m.srvName || null;
          this.peers.clear();
          for (const p of (m.players || [])) this.peer(p.id, p);
          this.team = m.team || null;
          this.mode = m.mode || this.mode;
          if (m.match) this.setMatch(m.match);
          this.changed();
          break;

        case 'match':
          this.setMatch(m.m);
          break;

        case 'matchend':
          this.match = this.match || {};
          this.match.finished = true;
          if (g.ui && g.ui.showMatchEnd) g.ui.showMatchEnd(m.r);
          break;

        case 'frag':
          g.rewardFrag(m);
          break;

        case 'joined': {
          const pj = this.peer(m.id, m);
          if (m.team) pj.team = m.team;
        }
          if (ui) ui.toast('🌐 ' + m.nick + ' пришёл сюда', 'good', 2200);
          this.changed();
          break;

        case 'bye': {
          const p = this.peers.get(m.id);
          this.peers.delete(m.id);
          if (p && ui && g.level) ui.toast('🌐 ' + p.nick + ' ушёл', 'warn', 1800);
          this.changed();
          break;
        }

        case 'state': {
          const p = this.peer(m.id, m);
          p.tx = m.x; p.ty = m.y; p.tz = m.z;
          p.tyaw = m.yaw;
          p.anim = m.anim || 'idle';
          p.hp = m.hp; p.maxHp = m.maxHp;
          p.speed = m.sp || 0;
          p.pets = m.pt || [];
          if (m.at && p.atk <= 0) p.atk = 0.34;      // замах лапой
          if (m.ct && p.cast <= 0) p.cast = 0.42;    // взмах магии
          p.rest = m.rt ? 1 : 0;
          p.t = 0;
          break;
        }

        case 'kill':
          g.netKill(m.i, m.by);
          break;
        case 'chest':
          g.netChest(m.i, m.by);
          break;
        case 'cage':
          g.netCage(m.i, m.by);
          break;

        case 'chat': {
          const msg = m.kind === 'sticker'
            ? { kind: 'sticker', cat: m.cat, mood: m.mood }
            : { kind: 'text', text: m.text };
          if (g.chat) g.chat.say(m.from, msg, m.from === this.nick);
          break;
        }

        case 'sys':
          this.systemLine(m);
          break;

        case 'host': {
          const was = this.isHost;
          this.isHost = !!m.host;
          this.hostId = m.id || 0;
          // новый ведущий подхватывает монстров с того места, где их видел
          if (this.isHost && !was && g.chat && g.level) {
            g.chat.event('🎲', 'Теперь монстров считает ваш компьютер', 'join');
          }
          break;
        }

        case 'mon':
          g.applyMonsterSnapshot(m.a || []);
          break;

        case 'cast':
          g.playRemoteCast(m);
          break;

        case 'fx':
          g.playRemoteEffects(m.a || []);
          break;

        case 'emote': {
          const p = this.peers.get(m.id);
          if (p) { p.emote = m.e; p.emoteT = 0; }
          break;
        }

        case 'dmg':
          g.applyRemoteDamage(m);
          break;

        case 'mhit':
          g.takeMonsterHit(m);
          break;

        case 'pvp':
          if (m.target === this.id) g.takePvp(m);
          else g.showPvpHit(m);
          break;

        case 'servers':
          this.servers = m.list || [];
          this.changed();
          break;

        case 'roomok':
          this.myRoom = { id: m.id, name: m.name, mode: m.mode, loc: m.loc };
          this.changed();
          break;

        case 'kicked':
          if (this.game.level) this.game.quitToMenu();
          break;

        case 'joinerr':
          this.game.ui.toast(m.msg, 'warn', 4000);
          this.changed();
          break;

        case 'goto':
          // сервер подсказал, где друг — идём туда
          if (this._gotoCb) { const cb = this._gotoCb; this._gotoCb = null; cb(m); }
          break;

        case 'found':
          if (this._findCb) this._findCb(m.q, m.list || []);
          break;

        case 'dm': {
          const лог = this.talks.get(m.with) || [];
          лог.push(m.row);
          if (лог.length > 200) лог.splice(0, лог.length - 200);
          this.talks.set(m.with, лог);
          if (!m.mine) this._newLetter(m.with, m.row);
          if (this.onTalk) this.onTalk(m.with, m.row, !!m.mine);
          this.changed();
          break;
        }

        case 'dmlog':
          this.talks.set(m.with, m.list || []);
          if (this.onTalk) this.onTalk(m.with, null, false);
          this.changed();
          break;

        case 'note':
          if (ui) ui.toast(m.msg, m.kind || 'good', 3000);
          this.changed();
          break;

        case 'auth':
          if (this._authCb) { const cb = this._authCb; this._authCb = null; cb(m); }
          break;

        case 'saves':
          if (this._savesCb) { const cb = this._savesCb; this._savesCb = null; cb(m.saves || {}); }
          break;

        case 'invite':
          this.invites.push({ from: m.from, loc: m.loc, locName: m.locName, t: Date.now() });
          if (ui) ui.serverInvite(m);
          this.changed();
          break;

        case 'err':
          if (ui) ui.toast(m.msg, 'bad', 4000);
          if (m.fatal) { this.status = 'error'; this.reason = m.msg; this.changed(); }
          break;
      }
    }

    /** Событие сервера — строчкой в чат. */
    systemLine(m) {
      const chat = this.game.chat;
      if (!chat) return;
      switch (m.kind) {
        case 'online': chat.event('🌐', m.nick + ' зашёл на сервер', 'join'); break;
        case 'offline': chat.event('🌙', m.nick + ' ушёл с сервера', 'leave'); break;
        case 'enter': chat.event('➡️', m.nick + ' пришёл сюда', 'join'); break;
        case 'exit': chat.event('⬅️', m.nick + ' покинул локацию', 'leave'); break;
        case 'pvp': chat.event('⚔️', (m.by || 'кто-то') + ' победил ' + m.nick + ' в дружеской драке', 'pvp'); break;
      }
    }

    /** Ударить другого кота. */
    reportPvp(peer, dmg, el, kx, kz) {
      if (this.room === null) return;
      this.send({
        t: 'pvp', target: peer.id, dmg: Math.round(dmg),
        el: el || 'physical', kx: +kx.toFixed(2), kz: +kz.toFixed(2)
      });
    }

    /** Сказать комнате, что нас одолели. */
    reportDefeat(byNick) {
      if (this.room === null) return;
      this.send({ t: 'sys', kind: 'pvp', by: byNick });
    }

    /** Найти или завести запись о другом игроке. */
    peer(id, src) {
      let p = this.peers.get(id);
      if (!p) {
        p = {
          id, nick: src.nick || '?', cat: src.cat || 'muri', level: src.level || 1,
          dead: false, invisT: 0, hideAmt: 0, radius: 0.34, height: 1.2,
          isPeer: true, hp: 100, maxHp: 100,
          x: src.x || 0, y: src.y || 0, z: src.z || 0, yaw: src.yaw || 0,
          tx: src.x || 0, ty: src.y || 0, tz: src.z || 0, tyaw: src.yaw || 0,
          anim: 'idle', speed: 0, hp: 100, maxHp: 100, t: 0, phase: Math.random() * 6.28,
          atk: 0, cast: 0, rest: 0, pets: [], emote: null, emoteT: 0
        };
        this.peers.set(id, p);
      }
      if (src.nick) p.nick = src.nick;
      if (src.cat) p.cat = src.cat;
      if (src.level) p.level = src.level;
      return p;
    }

    // ---------- каждый кадр ----------
    update(dt) {
      // плавно подтягиваем чужих котов к присланным координатам
      for (const p of this.peers.values()) {
        const k = Math.min(1, dt * 9);
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
        p.z += (p.tz - p.z) * k;
        let d = p.tyaw - p.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        p.yaw += d * k;
        p.t += dt;
        p.phase += dt * (1 + p.speed * 1.6);
        if (p.atk > 0) p.atk -= dt;
        if (p.cast > 0) p.cast -= dt;
        if (p.emote) {
          p.emoteT += dt;
          const def = KM.EMOTE_BY && KM.EMOTE_BY[p.emote];
          if (!def || p.emoteT >= def.dur || p.speed > 0.6) p.emote = null;
        }
      }

      // свои координаты — 12 раз в секунду, чаще незачем
      if (this.status !== 'online' || this.room === null) return;
      this._sendT -= dt;
      if (this._sendT > 0) return;
      this._sendT = 1 / SEND_HZ;

      const pl = this.game.player;
      if (!pl) return;
      this.send({
        t: 'state',
        x: +pl.x.toFixed(2), y: +pl.y.toFixed(2), z: +pl.z.toFixed(2),
        yaw: +pl.facing.toFixed(2),
        anim: pl.dead ? 'dead' : (pl.onGround ? (pl.hspeed > 0.4 ? 'run' : 'idle') : 'air'),
        hp: Math.round(pl.hp), maxHp: Math.round(pl.maxHp),
        sp: +Math.min(3, pl.hspeed).toFixed(2),
        at: pl.attackT > 0 ? 1 : 0,
        ct: pl.castT > 0 ? 1 : 0,
        rt: pl.restT > 0.5 ? 1 : 0,
        // питомцы бегают рядом — их тоже должно быть видно всем
        pt: this.game.pets.slice(0, 3).map(q => [
          q.data.id, q.data.stage | 0,
          +q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), +q.yaw.toFixed(2)
        ])
      });
    }

    // ---------- события мира ----------
    reportKill(i) { if (this.room !== null) this.send({ t: 'kill', i }); }
    reportChest(i) { if (this.room !== null) this.send({ t: 'chest', i }); }
    reportCage(i) { if (this.room !== null) this.send({ t: 'cage', i }); }

    /** Обновить состояние матча и раскрасить команды. */
    setMatch(m) {
      if (!m) return;
      this.match = m;
      if (m.myTeams) {
        for (const p of this.peers.values()) {
          if (m.myTeams[p.nick]) p.team = m.myTeams[p.nick];
        }
        if (m.myTeams[this.nick]) this.team = m.myTeams[this.nick];
      }
      if (this.game.ui && this.game.ui.updateMatchHud) this.game.ui.updateMatchHud();
      this.changed();
    }

    /** Сколько котов одолел этот игрок. */
    killsOf(nick) {
      return (this.match && this.match.scores && this.match.scores[nick]) || 0;
    }

    /** Свои ли это — в командном режиме по своим не бьют. */
    isAlly(peer) {
      if (!this.match || !this.match.teams) return false;
      return !!(this.team && peer && peer.team && peer.team === this.team);
    }

    /** Разрешены ли драки в этом режиме. */
    pvpAllowed() {
      return !this.match || this.match.pvp !== false;
    }

    // ============================================================
    //  АККАУНТ НА СЕРВЕРЕ
    //  Ник и пароль хранятся у сервера, поэтому в свой аккаунт
    //  можно войти с любого устройства — хоть с чужого телефона.
    // ============================================================
    /** Завести учётку. cb({ok, error, nick, profile, saves}) */
    register(nick, pass, profile, cb) {
      if (this.status !== 'online') { cb({ ok: false, error: 'Нет связи с сервером' }); return; }
      this._authCb = cb;
      this.send({ t: 'reg', nick, pass, profile });
    }

    /** Войти по нику и паролю. */
    authorize(nick, pass, cb) {
      if (this.status !== 'online') { cb({ ok: false, error: 'Нет связи с сервером' }); return; }
      this._authCb = cb;
      this.send({ t: 'auth', nick, pass });
    }

    changeServerPassword(nick, oldPass, newPass) {
      this.send({ t: 'passwd', nick, old: oldPass, new: newPass });
    }

    /** Отдать сохранение серверу. */
    pushSave(slot, blob) {
      if (!this.serverAccount || this.status !== 'online') return;
      this.send({ t: 'save', slot, data: blob });
    }

    /** Забрать сохранения с сервера. */
    pullSaves(cb) {
      if (!this.serverAccount || this.status !== 'online') { cb({}); return; }
      this._savesCb = cb;
      this.send({ t: 'loadsave' });
    }

    pushProfile(profile) {
      if (!this.serverAccount || this.status !== 'online') return;
      this.send({ t: 'profile', profile });
    }


    // ============================================================
    //  СПИСОК СЕРВЕРОВ
    //  Игроку не нужно знать адресов: он видит названия и заходит.
    // ============================================================
    /** Попросить свежий список. */
    askServers() {
      if (this.status !== 'online') return;
      this.send({ t: 'servers' });
    }

    /** Зайти на сервер из списка. */
    joinServer(srv, code) {
      if (this.status !== 'online') return false;
      this.send({ t: 'join', srv: srv.id, code: code || '', name: srv.name });
      return true;
    }

    /** Свой сервер: хозяин сам решает название, режим и слово-ключ. */
    makeServer(cfg) {
      if (this.status !== 'online') return;
      this.send({
        t: 'mkroom', name: cfg.name, mode: cfg.mode, loc: cfg.loc,
        limit: cfg.limit, code: cfg.code || '',
        who: cfg.who || 'all', hidden: !!cfg.hidden, note: cfg.note || ''
      });
    }

    closeServer(id) {
      this.send({ t: 'rmroom', id });
      if (this.myRoom && this.myRoom.id === id) this.myRoom = null;
    }

    /** Хозяин просит игрока уйти со своего сервера. */
    kickFrom(id, nick) { this.send({ t: 'kick', id, nick }); }

    /** Спросить у сервера, где друг, и прийти туда. cb({srv, loc, mode}) */
    goToFriend(nick, cb) {
      if (this.status !== 'online') return;
      this._gotoCb = cb;
      this.send({ t: 'follow', nick });
    }

    // ============================================================
    //  ПЕРЕПИСКА С ДРУЗЬЯМИ
    //  Письма лежат на сервере, поэтому дойдут, даже если друг
    //  был не в игре — увидит, когда зайдёт.
    // ============================================================
    write(to, text) {
      text = (text || '').trim();
      if (!text || this.status !== 'online') return;
      this.send({ t: 'dm', to, x: text.slice(0, 400) });
    }

    /** Открыть переписку: сервер пришлёт всё, что было. */
    openTalk(nick) {
      if (this.status !== 'online') return;
      this.send({ t: 'dmlog', nick });
    }

    markRead(nick) {
      if (this.status !== 'online') return;
      this.unread[String(nick || '').toLowerCase()] = 0;
      this.send({ t: 'dmread', nick });
    }

    unreadOf(nick) {
      return this.unread[String(nick || '').toLowerCase()] || 0;
    }

    unreadTotal() {
      let n = 0;
      for (const k in this.unread) n += this.unread[k] || 0;
      return n;
    }

    /** Письмо пришло — показать, даже если игрок в бою. */
    _newLetter(from, row) {
      const ui = this.game.ui;
      const k = String(from || '').toLowerCase();
      this.unread[k] = (this.unread[k] || 0) + 1;
      if (ui.talkWith && ui.talkWith.toLowerCase() === k) {
        this.markRead(from);              // читаем прямо сейчас
        return;
      }
      this.game.audio.sfx('letter');
      ui.toast('✉ ' + from + ': ' + row.x.slice(0, 40) +
        (row.x.length > 40 ? '…' : ''), 'good', 5000);
      const chat = this.game.chat;
      if (chat) chat.event('✉', 'Письмо от ' + from, 'join');
    }

    // ============================================================
    //  ПОИСК ИГРОКОВ ПО НИКУ
    //  Ник помнят не полностью — сервер подскажет похожие.
    // ============================================================
    findNicks(q, cb) {
      this._findCb = cb;
      if (this.status !== 'online' || !(q || '').trim()) { cb(q, []); return; }
      clearTimeout(this._findT);
      this._findT = setTimeout(() => this.send({ t: 'find', q }), 180);
    }

    /** Показать всем свою выходку. */
    sendEmote(id) {
      if (this.room === null || this.status !== 'online') return;
      this.send({ t: 'emote', e: id });
    }

    /** Ведущий рассылает состояние монстров. */
    sendMonsters(arr) {
      if (!this.isHost || this.room === null) return;
      this.send({ t: 'mon', a: arr });
    }

    /** «Я попал по монстру» — считает ведущий. */
    reportDamage(i, n, el, kx, kz, kp) {
      if (this.room === null || this.isHost) return;
      this.send({ t: 'dmg', i, n: Math.round(n), el: el || 'physical',
        kx: +(kx || 0).toFixed(2), kz: +(kz || 0).toFixed(2), kp: kp || 0 });
    }

    /** Ведущий сообщает игроку, что по нему попал монстр. */
    reportMonsterHit(peerId, n, name, kx, kz) {
      if (!this.isHost || this.room === null) return;
      this.send({ t: 'mhit', target: peerId, n: Math.round(n), name: name || 'монстр',
        kx: +(kx || 0).toFixed(2), kz: +(kz || 0).toFixed(2) });
    }

    /** Сколько котов рядом — для надписи в углу. */
    roomCount() { return this.peers.size + 1; }
  }

  KM.Net = Net;
})(window);
