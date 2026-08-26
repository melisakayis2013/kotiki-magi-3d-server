/* ============================================================
   КОТИКИ МАГИ 3D — комната без сервера

   Когда игроки соединяются напрямую, роль сервера берёт тот,
   кто создал игру. Здесь вся его работа: кто в комнате, кто в
   какой команде, счёт, таймер, пересылка сообщений остальным.

   Это то же самое, что делает server.py, только внутри игры —
   поэтому отдельный компьютер-сервер не нужен вообще.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const MODES = {
    coop: { name: 'Дружная охота', pvp: true, monsters: true, teams: false, goal: 0, time: 0 },
    team: { name: 'Красные против синих', pvp: true, monsters: true, teams: true, goal: 30, time: 900 },
    battle: { name: 'Битва: один победитель', pvp: true, monsters: false, teams: false, goal: 0, time: 300 },
    peace: { name: 'Мирный', pvp: false, monsters: false, teams: false, goal: 0, time: 0 }
  };

  // ============================================================
  //  МАТЧ
  // ============================================================
  class Match {
    constructor(mode) {
      this.mode = MODES[mode] ? mode : 'coop';
      this.cfg = MODES[this.mode];
      this.scores = {};
      this.deaths = {};
      this.teams = {};
      this.teamScore = { red: 0, blue: 0 };
      this.started = 0;
      this.finished = false;
      this.results = null;
    }

    add(nick) {
      if (this.scores[nick] === undefined) this.scores[nick] = 0;
      if (this.deaths[nick] === undefined) this.deaths[nick] = 0;
      if (this.cfg.teams && !this.teams[nick]) {
        let red = 0, blue = 0;
        for (const k in this.teams) { if (this.teams[k] === 'red') red++; else blue++; }
        this.teams[nick] = red <= blue ? 'red' : 'blue';
      }
      if (!this.started && this.cfg.time) this.started = Date.now();
    }

    frag(killer, victim) {
      if (this.finished || !killer || killer === victim) return;
      this.scores[killer] = (this.scores[killer] || 0) + 1;
      this.deaths[victim] = (this.deaths[victim] || 0) + 1;
      const t = this.teams[killer];
      if (this.cfg.teams && t) this.teamScore[t]++;
    }

    timeLeft() {
      if (!this.cfg.time || !this.started) return null;
      return Math.max(0, Math.round(this.cfg.time - (Date.now() - this.started) / 1000));
    }

    checkEnd() {
      if (this.finished) return false;
      if (this.cfg.teams && this.cfg.goal) {
        for (const t of ['red', 'blue']) {
          if (this.teamScore[t] >= this.cfg.goal) { this.finish(); return true; }
        }
      }
      const left = this.timeLeft();
      if (left !== null && left <= 0) { this.finish(); return true; }
      return false;
    }

    finish() {
      this.finished = true;
      const top = Object.keys(this.scores)
        .map(n => ({ nick: n, kills: this.scores[n], deaths: this.deaths[n] || 0, team: this.teams[n] }))
        .sort((a, b) => b.kills - a.kills || a.nick.localeCompare(b.nick));
      this.results = { mode: this.mode, places: top.slice(0, 8) };
      if (this.cfg.teams) {
        const r = this.teamScore.red, b = this.teamScore.blue;
        this.results.teamScore = { red: r, blue: b };
        this.results.winner = r > b ? 'red' : (b > r ? 'blue' : 'draw');
      } else if (top.length) {
        this.results.winner = top[0].nick;
      }
    }

    state() {
      return {
        mode: this.mode, name: this.cfg.name, pvp: this.cfg.pvp,
        monsters: this.cfg.monsters, teams: this.cfg.teams, goal: this.cfg.goal,
        timeLeft: this.timeLeft(), scores: this.scores,
        teamScore: this.cfg.teams ? this.teamScore : null,
        myTeams: this.cfg.teams ? this.teams : null,
        finished: this.finished
      };
    }
  }

  // ============================================================
  //  КОМНАТА
  // ============================================================
  class LocalHub {
    /**
     * @param {object} own    — сам создатель: {id, nick, cat, catName, level}
     * @param {function} toSelf — как отдать сообщение самому себе
     */
    constructor(own, toSelf) {
      this.own = own;
      this.toSelf = toSelf;
      this.clients = new Map();     // id -> {id, nick, ..., send}
      this.nextId = 2;              // 1 занят создателем
      this.match = null;
      this.loc = null;
      this.locName = '';
      this.mode = 'coop';
      this.hostId = own.id;
      this.friendsOf = {};
      this.requests = {};
    }

    all() {
      const out = [this.own];
      for (const c of this.clients.values()) out.push(c);
      return out;
    }

    byNick(nick) {
      const low = String(nick || '').toLowerCase();
      return this.all().find(c => c.nick && c.nick.toLowerCase() === low) || null;
    }

    broadcast(msg, skipId) {
      if (this.own.id !== skipId) this.toSelf(msg);
      for (const c of this.clients.values()) {
        if (c.id !== skipId) { try { c.send(msg); } catch (e) { } }
      }
    }

    to(id, msg) {
      if (id === this.own.id) { this.toSelf(msg); return; }
      const c = this.clients.get(id);
      if (c) { try { c.send(msg); } catch (e) { } }
    }

    onlineList() {
      return this.all().map(c => ({
        id: c.id, nick: c.nick, cat: c.cat, catName: c.catName || 'Кот',
        level: c.level || 1, device: c.device || 'pc',
        loc: c.inRoom ? this.loc : null,
        locName: c.inRoom ? this.locName : null, mode: this.mode
      }));
    }

    // ---------- подключение и уход ----------
    join(info, sendFn) {
      const id = this.nextId++;
      const c = {
        id, nick: String(info.nick || 'Котик').slice(0, 16),
        cat: info.cat || 'muri', catName: info.catName || 'Кот',
        level: info.level || 1, device: info.device || 'pc',
        inRoom: false, send: sendFn
      };
      this.clients.set(id, c);
      c.send({ t: 'welcome', id, nick: c.nick, online: this.onlineList() });
      this.broadcast({ t: 'sys', kind: 'online', nick: c.nick }, id);
      this.broadcast({ t: 'online', list: this.onlineList() });
      this.sendFriends(c.nick);
      return id;
    }

    part(id) {
      const c = this.clients.get(id);
      if (!c) return;
      this.clients.delete(id);
      this.broadcast({ t: 'bye', id });
      if (c.inRoom) this.broadcast({ t: 'sys', kind: 'exit', nick: c.nick });
      this.broadcast({ t: 'sys', kind: 'offline', nick: c.nick });
      this.broadcast({ t: 'online', list: this.onlineList() });
    }

    // ---------- друзья ----------
    friendsList(nick) {
      const online = {};
      this.onlineList().forEach(p => { online[p.nick.toLowerCase()] = p; });
      return (this.friendsOf[nick] || []).map(f => {
        const p = online[f.toLowerCase()];
        return {
          nick: f, online: !!p, loc: p ? p.loc : null,
          locName: p ? p.locName : null, level: p ? p.level : null, seen: 0
        };
      });
    }

    sendFriends(nick) {
      const c = this.byNick(nick);
      if (!c) return;
      this.to(c.id, { t: 'friends', list: this.friendsList(nick), requests: this.requests[nick] || [] });
    }

    link(a, b) {
      for (const pair of [[a, b], [b, a]]) {
        const x = pair[0], y = pair[1];
        if (!this.friendsOf[x]) this.friendsOf[x] = [];
        if (this.friendsOf[x].indexOf(y) < 0) this.friendsOf[x].push(y);
      }
    }

    // ============================================================
    //  РАЗБОР СООБЩЕНИЙ
    // ============================================================
    handle(from, m) {
      const c = from === this.own.id ? this.own : this.clients.get(from);
      if (!c || !m || !m.t) return;

      switch (m.t) {
        case 'hello':                     // создатель уже известен
          break;

        case 'me':
          c.cat = m.cat || c.cat;
          c.catName = m.catName || c.catName;
          c.level = m.level || c.level;
          this.broadcast({ t: 'online', list: this.onlineList() });
          break;

        case 'join': {
          const mode = MODES[m.mode] ? m.mode : 'coop';
          if (!this.match || this.match.mode !== mode) {
            this.match = new Match(mode);
            this.mode = mode;
          }
          this.loc = m.loc;
          this.locName = m.name || '';
          c.inRoom = true;
          this.match.add(c.nick);

          const mates = this.all()
            .filter(o => o.inRoom && o.id !== c.id)
            .map(o => ({ id: o.id, nick: o.nick, cat: o.cat, level: o.level,
              team: this.match.teams[o.nick] }));
          this.to(c.id, {
            t: 'room', loc: m.loc, mode: mode, players: mates,
            team: this.match.teams[c.nick], match: this.match.state()
          });
          this.broadcast({ t: 'joined', id: c.id, nick: c.nick, cat: c.cat,
            level: c.level, team: this.match.teams[c.nick] }, c.id);
          this.broadcast({ t: 'sys', kind: 'enter', nick: c.nick, locName: this.locName }, c.id);
          this.broadcast({ t: 'match', m: this.match.state() });
          // монстров всегда считает создатель игры
          this.broadcast({ t: 'host', host: false, id: this.hostId }, this.hostId);
          this.to(this.hostId, { t: 'host', host: true, id: this.hostId });
          this.broadcast({ t: 'online', list: this.onlineList() });
          break;
        }

        case 'leave':
          c.inRoom = false;
          this.broadcast({ t: 'bye', id: c.id }, c.id);
          this.broadcast({ t: 'sys', kind: 'exit', nick: c.nick }, c.id);
          this.broadcast({ t: 'online', list: this.onlineList() });
          break;

        case 'state':
          m.id = c.id; m.nick = c.nick;
          this.broadcast(m, c.id);
          break;

        case 'kill': case 'chest': case 'cage': case 'portal':
          m.by = c.nick;
          this.broadcast(m, c.id);
          break;

        case 'mon':
          if (c.id !== this.hostId) return;
          this.broadcast({ t: 'mon', a: m.a || [] }, c.id);
          break;

        case 'dmg':
          if (c.id === this.hostId) return;
          this.to(this.hostId, {
            t: 'dmg', i: m.i, n: m.n, el: m.el, kx: m.kx, kz: m.kz, kp: m.kp,
            by: c.nick, byId: c.id
          });
          break;

        case 'mhit':
          if (c.id !== this.hostId) return;
          this.to(m.target, { t: 'mhit', n: m.n, name: m.name, kx: m.kx, kz: m.kz });
          break;

        case 'emote':
          this.broadcast({ t: 'emote', id: c.id, e: m.e }, c.id);
          break;

        case 'fx':
          this.broadcast({ t: 'fx', a: (m.a || []).slice(0, 32) }, c.id);
          break;

        case 'cast':
          m.from = c.id; m.nick = c.nick;
          this.broadcast(m, c.id);
          break;

        case 'pvp':
          this.broadcast({
            t: 'pvp', from: c.id, fromNick: c.nick, target: m.target,
            dmg: m.dmg, el: m.el, kx: m.kx, kz: m.kz
          }, c.id);
          break;

        case 'chat': {
          const msg = m.kind === 'sticker'
            ? { t: 'chat', from: c.nick, kind: 'sticker', cat: m.cat, mood: m.mood }
            : { t: 'chat', from: c.nick, kind: 'text', text: String(m.text || '').slice(0, 140) };
          if (msg.kind === 'text' && !msg.text) return;
          this.broadcast(msg);
          break;
        }

        case 'sys': {
          const killer = String(m.by || '').slice(0, 16);
          this.broadcast({ t: 'sys', kind: 'pvp', nick: c.nick, by: killer });
          if (this.match && !this.match.finished) {
            this.match.frag(killer, c.nick);
            const win = this.byNick(killer);
            if (win) {
              this.to(win.id, { t: 'frag', victim: c.nick,
                kills: this.match.scores[killer] || 0, mode: this.match.mode });
            }
            this.broadcast({ t: 'match', m: this.match.state() });
            if (this.match.checkEnd()) {
              this.broadcast({ t: 'matchend', r: this.match.results });
            }
          }
          break;
        }

        case 'match':
          if (!this.match) return;
          if (this.match.checkEnd()) {
            this.broadcast({ t: 'matchend', r: this.match.results });
          }
          this.to(c.id, { t: 'match', m: this.match.state() });
          break;

        case 'friend': {
          const target = String(m.nick || '').slice(0, 16);
          if (!target || target.toLowerCase() === c.nick.toLowerCase()) {
            this.to(c.id, { t: 'note', msg: 'Себя в друзья добавить не выйдет 🙂', kind: 'warn' });
            return;
          }
          const mine = this.requests[c.nick] || [];
          if (mine.indexOf(target) >= 0) {
            this.requests[c.nick] = mine.filter(x => x !== target);
            this.link(c.nick, target);
            this.to(c.id, { t: 'note', msg: 'Теперь вы друзья с ' + target + '! 🎉', kind: 'good' });
            const o = this.byNick(target);
            if (o) {
              this.to(o.id, { t: 'note', msg: 'Теперь вы друзья с ' + c.nick + '! 🎉', kind: 'good' });
              this.sendFriends(o.nick);
            }
          } else {
            if (!this.requests[target]) this.requests[target] = [];
            if (this.requests[target].indexOf(c.nick) < 0) this.requests[target].push(c.nick);
            this.to(c.id, { t: 'note', msg: 'Заявка отправлена ' + target, kind: 'good' });
            const o = this.byNick(target);
            if (o) {
              this.to(o.id, { t: 'note', msg: c.nick + ' хочет дружить 🐾', kind: 'good' });
              this.sendFriends(o.nick);
            }
          }
          this.sendFriends(c.nick);
          break;
        }

        case 'accept': {
          const frm = String(m.nick || '').slice(0, 16);
          const reqs = this.requests[c.nick] || [];
          if (reqs.indexOf(frm) >= 0) {
            this.requests[c.nick] = reqs.filter(x => x !== frm);
            this.link(c.nick, frm);
            this.to(c.id, { t: 'note', msg: 'Теперь вы друзья с ' + frm + '! 🎉', kind: 'good' });
            const o = this.byNick(frm);
            if (o) {
              this.to(o.id, { t: 'note', msg: c.nick + ' принял вашу заявку 🎉', kind: 'good' });
              this.sendFriends(o.nick);
            }
          }
          this.sendFriends(c.nick);
          break;
        }

        case 'decline':
          this.requests[c.nick] = (this.requests[c.nick] || [])
            .filter(x => x !== String(m.nick || ''));
          this.sendFriends(c.nick);
          break;

        case 'unfriend': {
          const o = String(m.nick || '');
          for (const pair of [[c.nick, o], [o, c.nick]]) {
            const x = pair[0], y = pair[1];
            if (this.friendsOf[x]) this.friendsOf[x] = this.friendsOf[x].filter(v => v !== y);
          }
          this.sendFriends(c.nick);
          const other = this.byNick(o);
          if (other) this.sendFriends(other.nick);
          break;
        }

        case 'invite': {
          const o = this.byNick(m.nick);
          if (!o) {
            this.to(c.id, { t: 'note', msg: m.nick + ' сейчас не в игре', kind: 'warn' });
            return;
          }
          this.to(o.id, { t: 'invite', from: c.nick, loc: m.loc, locName: m.locName });
          this.to(c.id, { t: 'note', msg: 'Приглашение отправлено ' + m.nick, kind: 'good' });
          break;
        }

        case 'ping':
          this.to(c.id, { t: 'pong' });
          break;
      }
    }
  }

  KM.LocalHub = LocalHub;
  KM.LOCAL_MODES = MODES;
})(window);
