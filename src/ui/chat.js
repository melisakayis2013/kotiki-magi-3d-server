/* ============================================================
   КОТИКИ МАГИ 3D — чат

   Полупрозрачное окошко в углу: можно открыть, можно закрыть.
   Умеет обычные сообщения, смайлики и 2D-стикеры персонажей.
   Всё сказанное всплывает облачком над головой кота, а рядом
   идёт лента событий: кто пришёл, кто ушёл, кто кого одолел.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const $ = (s) => document.querySelector(s);
  const MAX_LINES = 60;
  const BUBBLE_TIME = 5.5;        // сколько секунд висит облачко
  const MAX_LEN = 120;

  // быстрые смайлики под рукой
  const EMOJI = [
    '😺', '😻', '😹', '😾', '🙀', '😿', '😼', '🐾',
    '❤️', '✨', '🔥', '❄️', '⚡', '🌈', '⭐', '💥',
    '👍', '👋', '🎉', '🎁', '🗝️', '🪙', '🍰', '🐟',
    '😂', '😅', '🤔', '😱', '😎', '🥳', '😴', '🆘'
  ];

  class Chat {
    constructor(game) {
      this.game = game;
      this.lines = [];
      this.open = false;
      this.tab = 'emoji';        // emoji | stickers
      this.stickerCat = null;
      this.bubbles = new Map();  // ключ игрока -> облачко
      this.unread = 0;

      this.root = $('#chat');
      this.log = $('#chat-log');
      this.input = $('#chat-input');
      this.panel = $('#chat-extra');
      this.bubbleLayer = $('#bubbles');
      this.bind();
      this.setOpen(false);
    }

    // ------------------------------------------------------------
    //  ОКНО
    // ------------------------------------------------------------
    bind() {
      const g = this.game;

      $('#chat-toggle').onclick = () => { g.audio.sfx('ui'); this.setOpen(!this.open); };
      $('#chat-close').onclick = () => { g.audio.sfx('ui'); this.setOpen(false); };

      $('#chat-send').onclick = () => this.sendText();
      this.input.addEventListener('keydown', (e) => {
        e.stopPropagation();                       // буквы не должны уходить в игру
        if (e.key === 'Enter') this.sendText();
        if (e.key === 'Escape') { this.input.blur(); this.setOpen(false); }
      });
      this.input.addEventListener('focus', () => g.input.setBlocked(true));
      this.input.addEventListener('blur', () => {
        if (g.ui.current === 'none') g.input.setBlocked(false);
      });

      // вкладки: смайлики / стикеры
      $('#chat-tabs').addEventListener('click', (e) => {
        const t = e.target.closest('.ctab');
        if (!t) return;
        this.tab = t.dataset.tab;
        g.audio.sfx('ui');
        this.buildExtra();
      });

      // Enter открывает чат прямо во время игры
      global.addEventListener('keydown', (e) => {
        if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
        if (g.mode !== 'playing' || g.ui.current !== 'none') return;
        if (document.activeElement === this.input) return;
        e.preventDefault();
        this.setOpen(true);
        this.input.focus();
      });
    }

    setOpen(v) {
      this.open = !!v;
      this.root.classList.toggle('open', this.open);
      $('#chat-toggle').classList.toggle('hidden', this.open);
      if (this.open) {
        this.unread = 0;
        this.badge();
        this.buildExtra();
        this.log.scrollTop = this.log.scrollHeight;
      } else {
        this.input.blur();
        if (this.game.ui.current === 'none') this.game.input.setBlocked(false);
      }
    }

    badge() {
      const b = $('#chat-toggle .cnt');
      b.textContent = this.unread > 9 ? '9+' : String(this.unread);
      b.classList.toggle('hidden', this.unread === 0);
    }

    // ------------------------------------------------------------
    //  ОТПРАВКА
    // ------------------------------------------------------------
    canSend() {
      const n = this.game.net;
      return !!(n && n.status === 'online' && n.room !== null);
    }

    sendText() {
      const text = this.input.value.trim().slice(0, MAX_LEN);
      this.input.value = '';
      if (!text) return;
      if (!this.canSend()) { this.note('Чат работает в игре на сервере'); return; }
      this.game.net.send({ t: 'chat', kind: 'text', text });
      this.game.audio.sfx('ui');
    }

    sendSticker(catId, mood) {
      if (!this.canSend()) { this.note('Чат работает в игре на сервере'); return; }
      this.game.net.send({ t: 'chat', kind: 'sticker', cat: catId, mood });
      this.game.audio.sfx('ui');
    }

    sendEmoji(e) {
      if (!this.canSend()) { this.note('Чат работает в игре на сервере'); return; }
      this.game.net.send({ t: 'chat', kind: 'text', text: e });
      this.game.audio.sfx('ui');
    }

    // ------------------------------------------------------------
    //  ЛЕНТА
    // ------------------------------------------------------------
    /** Сообщение от игрока. */
    say(from, msg, mine) {
      this.push({ kind: 'say', from, msg, mine });
      this.bubble(from, msg);
      if (!mine) {
        if (!this.open) { this.unread++; this.badge(); }
        this.game.audio.sfx('ui');
      }
    }

    /** Событие мира: пришёл, ушёл, кого-то одолел. */
    event(icon, text, tone) {
      this.push({ kind: 'event', icon, text, tone: tone || '' });
    }

    /** Подсказка только себе, на сервер не уходит. */
    note(text) {
      this.push({ kind: 'note', text });
      if (!this.open) this.setOpen(true);
    }

    push(line) {
      line.t = Date.now();
      this.lines.push(line);
      if (this.lines.length > MAX_LINES) this.lines.shift();
      this.render(line);
    }

    render(line) {
      const el = document.createElement('div');
      if (line.kind === 'say') {
        el.className = 'cline' + (line.mine ? ' mine' : '');
        el.innerHTML = '<b>' + esc(line.from) + '</b>' + this.body(line.msg);
      } else if (line.kind === 'note') {
        el.className = 'cline note';
        el.innerHTML = '<i>' + esc(line.text) + '</i>';
      } else {
        el.className = 'cline event ' + line.tone;
        el.innerHTML = '<span class="ic">' + line.icon + '</span>' + esc(line.text);
      }
      const atBottom = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 40;
      this.log.appendChild(el);
      while (this.log.children.length > MAX_LINES) this.log.removeChild(this.log.firstChild);
      if (atBottom) this.log.scrollTop = this.log.scrollHeight;
    }

    /** Тело сообщения: текст или стикер. */
    body(msg) {
      if (msg.kind === 'sticker') {
        return '<span class="cstk">' + KM.STICKERS.svg(msg.cat, msg.mood) + '</span>';
      }
      return '<span class="ctext">' + esc(msg.text || '') + '</span>';
    }

    // ------------------------------------------------------------
    //  ОБЛАЧКО НАД ГОЛОВОЙ
    // ------------------------------------------------------------
    bubble(nick, msg) {
      let b = this.bubbles.get(nick);
      if (!b) {
        const el = document.createElement('div');
        el.className = 'bubble';
        this.bubbleLayer.appendChild(el);
        b = { el, life: 0 };
        this.bubbles.set(nick, b);
      }
      b.el.innerHTML = msg.kind === 'sticker'
        ? KM.STICKERS.svg(msg.cat, msg.mood)
        : esc(String(msg.text || '').slice(0, 60));
      b.el.classList.toggle('sticker', msg.kind === 'sticker');
      b.el.classList.remove('pop'); void b.el.offsetWidth; b.el.classList.add('pop');
      b.life = BUBBLE_TIME;
    }

    /** Чат нужен только в совместной игре — в одиночной прятать. */
    sync() {
      const g = this.game;
      const want = !!(g.serverMode && g.level && g.mode === 'playing' && g.ui.current === 'none');
      if (want === this._shown) return;
      this._shown = want;
      $('#chat-toggle').classList.toggle('gone', !want);
      this.root.classList.toggle('gone', !want);
      if (!want) { this.setOpen(false); this.clearBubbles(); }
    }

    /** Каждый кадр: подтащить облачка к головам. */
    update(dt) {
      this.sync();
      if (!this.bubbles.size) return;
      const g = this.game;
      const M4 = KM.M4, vp = g.renderer.viewProj, pr = g._proj;
      const o = g.overlay;
      const W = o.clientWidth, H = o.clientHeight;
      const n = g.net;

      for (const [nick, b] of this.bubbles) {
        b.life -= dt;
        if (b.life <= 0) {
          b.el.remove();
          this.bubbles.delete(nick);
          continue;
        }
        // чьё это облачко: своё или чужое
        let x, y, z, found = false;
        if (n && nick === n.nick) {
          x = g.player.x; y = g.player.y + 1.55; z = g.player.z; found = true;
        } else if (n) {
          for (const p of n.peers.values()) {
            if (p.nick === nick) { x = p.x; y = p.y + 1.55; z = p.z; found = true; break; }
          }
        }
        if (!found || !g.level) { b.el.style.display = 'none'; continue; }

        M4.project(vp, x, y, z, pr);
        if (!pr[2]) { b.el.style.display = 'none'; continue; }
        const sx = (pr[0] * 0.5 + 0.5) * W, sy = (1 - (pr[1] * 0.5 + 0.5)) * H;
        b.el.style.display = '';
        b.el.style.left = Math.round(sx) + 'px';
        b.el.style.top = Math.round(sy) + 'px';
        b.el.style.opacity = b.life < 1 ? String(b.life) : '1';
      }
    }

    clearBubbles() {
      for (const [, b] of this.bubbles) b.el.remove();
      this.bubbles.clear();
    }

    // ------------------------------------------------------------
    //  СМАЙЛИКИ И СТИКЕРЫ
    // ------------------------------------------------------------
    buildExtra() {
      const box = this.panel;
      box.innerHTML = '';
      document.querySelectorAll('#chat-tabs .ctab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === this.tab));

      if (this.tab === 'emoji') {
        const grid = document.createElement('div');
        grid.className = 'emoji-grid';
        for (const e of EMOJI) {
          const b = document.createElement('button');
          b.className = 'emo';
          b.textContent = e;
          b.onclick = () => this.sendEmoji(e);
          grid.appendChild(b);
        }
        box.appendChild(grid);
        return;
      }

      // ---- стикеры: сперва выбираем кота ----
      const S = this.game.state;
      const owned = (S.data.cats || []).filter(id => KM.CAT_BY[id]);
      if (!owned.length) owned.push('muri');
      if (!this.stickerCat || owned.indexOf(this.stickerCat) < 0) {
        this.stickerCat = S.data.activeCat && owned.indexOf(S.data.activeCat) >= 0
          ? S.data.activeCat : owned[0];
      }

      const cats = document.createElement('div');
      cats.className = 'stk-cats';
      for (const id of owned) {
        const cat = KM.CAT_BY[id];
        const b = document.createElement('button');
        b.className = 'stk-cat' + (id === this.stickerCat ? ' on' : '');
        b.title = cat.name;
        b.innerHTML = KM.STICKERS.svg(id, 'happy');
        b.onclick = () => { this.stickerCat = id; this.game.audio.sfx('ui'); this.buildExtra(); };
        cats.appendChild(b);
      }
      box.appendChild(cats);

      const grid = document.createElement('div');
      grid.className = 'stk-grid';
      for (const m of KM.STICKERS.MOODS) {
        const b = document.createElement('button');
        b.className = 'stk-btn';
        b.title = KM.STICKERS.label(this.stickerCat, m.id);
        b.innerHTML = KM.STICKERS.svg(this.stickerCat, m.id) +
          '<span class="nm">' + m.name + '</span>';
        b.onclick = () => this.sendSticker(this.stickerCat, m.id);
        grid.appendChild(b);
      }
      box.appendChild(grid);
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  KM.Chat = Chat;
})(window);
