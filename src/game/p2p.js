/* ============================================================
   КОТИКИ МАГИ 3D — игра напрямую, без сервера

   Два браузера умеют разговаривать друг с другом сами. Нужно
   один раз обменяться «кодом знакомства» — дальше данные ходят
   между компьютерами напрямую, минуя чей-либо сервер.

   Как это выглядит для игроков:
     1. Первый жмёт «Создать игру» и получает КОД.
        Кидает его другу как угодно — хоть в мессенджере.
     2. Друг вставляет код и получает ОТВЕТНЫЙ КОД.
        Присылает обратно.
     3. Первый вставляет ответ — играем.

   Ни хостинга, ни аккаунтов, ни чужого компьютера.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  // Публичные STUN помогают двум домашним компьютерам найти друг
  // друга через интернет. Без них игра всё равно работает в одной
  // сети Wi-Fi.
  const ICE = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // ------------------------------------------------------------
  //  КОД ЗНАКОМСТВА
  // ------------------------------------------------------------
  function pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unpack(code) {
    let s = String(code || '').trim().replace(/\s+/g, '');
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /** Выкидываем из описания соединения всё, без чего можно обойтись. */
  function trimSdp(sdp) {
    return sdp.split('\r\n').filter(l =>
      !(l.startsWith('a=extmap') || l.startsWith('a=rtcp-fb') ||
        l.startsWith('a=rtpmap') || l.startsWith('a=fmtp') ||
        l.startsWith('a=ssrc') || l.startsWith('a=msid'))
    ).join('\r\n');
  }

  // ============================================================
  //  ОДНО СОЕДИНЕНИЕ
  // ============================================================
  class Link {
    constructor(onMessage, onOpen, onClose) {
      this.pc = new RTCPeerConnection({ iceServers: ICE });
      this.ch = null;
      this.onMessage = onMessage;
      this.onOpen = onOpen;
      this.onClose = onClose;
      this.open = false;
      this.dead = false;
      this.pc.onconnectionstatechange = () => {
        const st = this.pc.connectionState;
        if (st === 'failed' || st === 'closed' || st === 'disconnected') this.die();
      };
    }

    bindChannel(ch) {
      this.ch = ch;
      ch.onopen = () => { this.open = true; if (this.onOpen) this.onOpen(this); };
      ch.onclose = () => this.die();
      ch.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch (err) { return; }
        if (this.onMessage) this.onMessage(m, this);
      };
    }

    /** Ждём, пока браузер соберёт все пути к нам. */
    /**
     * Дождаться, пока браузер узнает свои сетевые адреса.
     *
     * Обмен кодами одноразовый: что не попало в код — потеряно навсегда.
     * Поэтому обязательно дожидаемся ВНЕШНЕГО адреса (srflx) — без него
     * друг из другого города просто не найдёт нас: в коде будут только
     * домашние адреса, бесполезные снаружи. Раньше ждали три секунды
     * и уходили с пустыми руками.
     */
    gathered() {
      const pc = this.pc;
      const внешний = () => {
        const sdp = pc.localDescription ? pc.localDescription.sdp : '';
        return /typ srflx|typ relay/.test(sdp);
      };
      if (pc.iceGatheringState === 'complete') return Promise.resolve(внешний());
      return new Promise(res => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(долго); clearInterval(смотрим);
          res(внешний());
        };
        // ждём до восьми секунд: домашние сети бывают неторопливыми
        const долго = setTimeout(finish, 8000);
        // как только внешний адрес найден — можно не ждать остальных
        const смотрим = setInterval(() => { if (внешний()) finish(); }, 250);
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') finish();
        });
      });
    }

    send(obj) {
      if (!this.open || !this.ch || this.ch.readyState !== 'open') return false;
      try { this.ch.send(JSON.stringify(obj)); return true; }
      catch (e) { return false; }
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      this.open = false;
      try { this.pc.close(); } catch (e) { }
      if (this.onClose) this.onClose(this);
    }
  }

  // ============================================================
  //  ПРЯМАЯ ИГРА
  // ============================================================
  class Direct {
    constructor(game) {
      this.game = game;
      this.role = null;           // 'host' | 'guest'
      this.links = [];            // у создателя — по связи на каждого гостя
      this.hub = null;            // комната, если мы создатель
      this.reachable = null;      // попал ли внешний адрес в наш код
      this.guestLink = null;      // у гостя — единственная связь
      this.pending = null;        // соединение, которое сейчас настраиваем
      this.onChange = null;
    }

    supported() { return typeof RTCPeerConnection !== 'undefined'; }
    changed() { if (this.onChange) this.onChange(this); }

    myInfo() {
      const S = this.game.state;
      const acc = KM.ACCOUNT && KM.ACCOUNT.current();
      const cat = S.effectiveCat();
      return {
        nick: acc ? acc.nick : (S.data.slotName || 'Котик'),
        cat: S.data.activeCat, catName: cat.name, level: S.data.level,
        device: KM.DEVICE ? KM.DEVICE.kind().id : 'pc'
      };
    }

    // ---------------- СОЗДАТЬ ИГРУ ----------------
    async createInvite() {
      if (!this.supported()) throw new Error('Браузер не умеет прямые соединения');
      this.role = 'host';
      this.ensureHub();

      const link = new Link(
        (m, l) => { if (l.playerId) this.hub.handle(l.playerId, m); },
        (l) => this.onGuestOpen(l),
        (l) => this.onGuestClose(l)
      );
      link.bindChannel(link.pc.createDataChannel('kmagi', { ordered: true }));

      await link.pc.setLocalDescription(await link.pc.createOffer());
      this.reachable = await link.gathered();

      this.pending = link;
      this.changed();
      return pack({ v: 1, r: 'o', s: trimSdp(link.pc.localDescription.sdp) });
    }

    /** Создатель вставляет ответный код друга. */
    async acceptAnswer(code) {
      const link = this.pending;
      if (!link) throw new Error('Сначала создайте игру');
      const d = unpack(code);
      if (d.r !== 'a') throw new Error('Это не ответный код');
      await link.pc.setRemoteDescription({ type: 'answer', sdp: d.s });
      link.guestInfo = d.p || {};
      this.pending = null;
      this.links.push(link);
      this.changed();
    }

    // ---------------- ПРИСОЕДИНИТЬСЯ ----------------
    async joinByCode(code) {
      if (!this.supported()) throw new Error('Браузер не умеет прямые соединения');
      const d = unpack(code);
      if (d.r !== 'o') throw new Error('Это не код приглашения');

      this.role = 'guest';
      const net = this.game.net;
      const link = new Link(
        (m) => net.handle(m),
        () => { this.changed(); net.onDirectOpen(); },
        () => { this.guestLink = null; this.changed(); net.onDirectClose(); }
      );
      link.pc.ondatachannel = (e) => link.bindChannel(e.channel);
      await link.pc.setRemoteDescription({ type: 'offer', sdp: d.s });
      await link.pc.setLocalDescription(await link.pc.createAnswer());
      this.reachable = await link.gathered();

      this.guestLink = link;
      this.changed();
      return pack({ v: 1, r: 'a', s: trimSdp(link.pc.localDescription.sdp), p: this.myInfo() });
    }

    // ---------------- ХОЗЯЙСТВО ----------------
    ensureHub() {
      if (this.hub) return this.hub;
      const me = this.myInfo();
      const own = {
        id: 1, nick: me.nick, cat: me.cat, catName: me.catName,
        level: me.level, device: me.device, inRoom: false
      };
      const net = this.game.net;
      this.hub = new KM.LocalHub(own, (msg) => net.handle(msg));
      net.onDirectOpen();
      net.handle({ t: 'welcome', id: 1, nick: me.nick, online: this.hub.onlineList() });
      return this.hub;
    }

    onGuestOpen(link) {
      const info = link.guestInfo || {};
      link.playerId = this.hub.join(info, (msg) => link.send(msg));
      this.changed();
      if (this.game.ui) {
        this.game.ui.toast('🎮 ' + (info.nick || 'Игрок') + ' подключился!', 'good', 3000);
      }
    }

    onGuestClose(link) {
      const i = this.links.indexOf(link);
      if (i >= 0) this.links.splice(i, 1);
      if (link.playerId && this.hub) this.hub.part(link.playerId);
      this.changed();
    }

    /** Отправить сообщение «на сервер». */
    send(obj) {
      if (this.role === 'host') {
        if (!this.hub) return false;
        this.hub.handle(1, obj);
        return true;
      }
      return this.guestLink ? this.guestLink.send(obj) : false;
    }

    connected() {
      // Раньше хозяин считался соединённым просто потому, что у него есть
      // комната — даже когда к нему никто не пришёл. Теперь честно:
      // соединение есть, если хотя бы один канал открыт.
      if (this.role === 'host') return this.links.some(l => l.open);
      return !!(this.guestLink && this.guestLink.open);
    }

    /** Комната создана и ждёт гостей (даже если их пока нет). */
    hosting() { return this.role === 'host' && !!this.hub; }

    playersCount() {
      if (this.role === 'host') return 1 + this.links.filter(l => l.open).length;
      return this.connected() ? 2 : 0;
    }

    stop() {
      this.links.forEach(l => l.die());
      if (this.pending) this.pending.die();
      if (this.guestLink) this.guestLink.die();
      this.links = [];
      this.pending = null;
      this.guestLink = null;
      this.hub = null;
      this.role = null;
      this.changed();
    }
  }

  KM.Direct = Direct;
  KM.p2pPack = pack;
  KM.p2pUnpack = unpack;
})(window);
