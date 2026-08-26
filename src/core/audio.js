/* ============================================================
   КОТИКИ МАГИ 3D — звук
   Настоящие мелодии (нотные партии + точный планировщик),
   позиционные эффекты и голоса монстров. Без единого файла.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  // ------------------------------------------------------------
  //  Ноты
  // ------------------------------------------------------------
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const N = {};
  NAMES.forEach((nm, i) => { for (let o = 0; o < 9; o++) N[nm + o] = 12 * (o + 1) + i; });
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /** [нота|0, длительность в 1/16] -> список событий */
  function seq(pairs) {
    let t = 0; const ev = [];
    for (const [n, d] of pairs) {
      if (n) ev.push({ t, n: (typeof n === 'string' ? N[n] : n), d });
      t += d;
    }
    return { ev, len: t };
  }
  /** аккорд на весь такт */
  function chords(list) {
    let t = 0; const ev = [];
    for (const [notes, d] of list) {
      ev.push({ t, notes: notes.map(x => N[x]), d });
      t += d;
    }
    return { ev, len: t };
  }

  // ============================================================
  //  МЕЛОДИИ
  // ============================================================
  const TRACKS = {

    // «Тема котов-магов» — главное меню. Ля минор, светлая и волшебная.
    // ------------------------------------------------------------
    //  ЗАСТАВКА — главная тема игры.
    //  Восходящая мелодия на колоколе, широкий хор снизу:
    //  должно быть ощущение, что сейчас начнётся приключение.
    // ------------------------------------------------------------
    intro: {
      bpm: 92, swing: 0,
      lead: 'bell',
      mel: seq([
        [0, 4],
        ['C5', 4], ['E5', 4], ['G5', 8],
        ['F5', 4], ['E5', 4], ['D5', 8],
        ['C5', 4], ['E5', 4], ['A5', 8],
        ['G5', 6], ['E5', 2], ['C5', 8],

        ['E5', 4], ['G5', 4], ['C6', 8],
        ['B5', 4], ['A5', 4], ['G5', 8],
        ['A5', 4], ['F5', 4], ['E5', 8],
        ['D5', 6], ['E5', 2], ['C5', 12], [0, 4]
      ]),
      harm: seq([
        [0, 4],
        ['E4', 4], ['G4', 4], ['C5', 8],
        ['A4', 4], ['G4', 4], ['F4', 8],
        ['E4', 4], ['A4', 4], ['C5', 8],
        ['B4', 6], ['G4', 2], ['E4', 8],

        ['G4', 4], ['C5', 4], ['E5', 8],
        ['D5', 4], ['C5', 4], ['B4', 8],
        ['C5', 4], ['A4', 4], ['G4', 8],
        ['F4', 6], ['G4', 2], ['E4', 12], [0, 4]
      ]),
      bass: seq([
        ['C2', 8], ['C2', 8],
        ['A1', 8], ['A1', 8],
        ['F2', 8], ['F2', 8],
        ['G2', 8], ['G2', 8],
        ['C2', 8], ['E2', 8],
        ['A1', 8], ['A1', 8],
        ['F2', 8], ['D2', 8],
        ['G2', 8], ['C2', 8]
      ]),
      pad: chords([
        [['C3', 'E3', 'G3'], 16], [['A2', 'C3', 'E3'], 16],
        [['F2', 'A2', 'C3'], 16], [['G2', 'B2', 'D3'], 16],
        [['C3', 'E3', 'G3'], 16], [['A2', 'C3', 'E3'], 16],
        [['F2', 'A2', 'C3'], 16], [['G2', 'B2', 'D3'], 16]
      ]),
      drum: 'sparse'
    },

    menu: {
      bpm: 104, swing: 0.06,
      lead: 'harp',
      mel: seq([
        ['E5', 4], ['D5', 2], ['C5', 2], ['D5', 4], ['E5', 4],
        ['C5', 6], ['A4', 2], ['B4', 4], [0, 4],
        ['D5', 4], ['C5', 2], ['B4', 2], ['C5', 4], ['D5', 4],
        ['A4', 10], [0, 6],
        ['E5', 4], ['F5', 2], ['E5', 2], ['D5', 4], ['C5', 4],
        ['B4', 6], ['D5', 2], ['C5', 4], ['B4', 4],
        ['A4', 4], ['C5', 2], ['E5', 2], ['G5', 4], ['F5', 4],
        ['E5', 10], [0, 6]
      ]),
      harm: seq([
        ['A4', 4], ['B4', 2], ['A4', 2], ['B4', 4], ['C5', 4],
        ['A4', 6], ['F4', 2], ['G4', 4], [0, 4],
        ['B4', 4], ['A4', 2], ['G4', 2], ['A4', 4], ['B4', 4],
        ['E4', 10], [0, 6],
        ['C5', 4], ['D5', 2], ['C5', 2], ['B4', 4], ['A4', 4],
        ['G4', 6], ['B4', 2], ['A4', 4], ['G4', 4],
        ['E4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 4],
        ['C5', 10], [0, 6]
      ]),
      bass: seq([
        ['A2', 4], ['A2', 4], ['E3', 4], ['A2', 4],
        ['F2', 4], ['F2', 4], ['C3', 4], ['F2', 4],
        ['G2', 4], ['G2', 4], ['D3', 4], ['G2', 4],
        ['A2', 4], ['A2', 4], ['E3', 4], ['A2', 4],
        ['F2', 4], ['F2', 4], ['C3', 4], ['F2', 4],
        ['G2', 4], ['G2', 4], ['D3', 4], ['G2', 4],
        ['A2', 4], ['A2', 4], ['C3', 4], ['E3', 4],
        ['E2', 4], ['E2', 4], ['B2', 4], ['E3', 4]
      ]),
      pad: chords([
        [['A3', 'C4', 'E4'], 16], [['F3', 'A3', 'C4'], 16],
        [['G3', 'B3', 'D4'], 16], [['A3', 'C4', 'E4'], 16],
        [['F3', 'A3', 'C4'], 16], [['G3', 'B3', 'D4'], 16],
        [['A3', 'C4', 'E4'], 16], [['E3', 'G#3', 'B3'], 16]
      ]),
      drum: 'soft'
    },

    // Исследование спокойных биомов. Ре минор, неспешная и любопытная.
    calm: {
      bpm: 92, swing: 0.08,
      lead: 'flute',
      mel: seq([
        ['D5', 4], ['F5', 2], ['E5', 2], ['D5', 4], ['A4', 4],
        ['C5', 6], ['D5', 2], ['E5', 8],
        ['F5', 4], ['E5', 2], ['D5', 2], ['C5', 4], ['A4', 4],
        ['D5', 12], [0, 4],
        ['A4', 4], ['C5', 2], ['D5', 2], ['F5', 4], ['E5', 4],
        ['D5', 6], ['C5', 2], ['A4', 8],
        ['G4', 4], ['A4', 2], ['C5', 2], ['D5', 4], ['C5', 4],
        ['A4', 12], [0, 4]
      ]),
      harm: seq([
        [0, 8], ['A4', 4], ['D5', 4],
        [0, 8], ['C5', 4], ['A4', 4],
        [0, 8], ['A4', 4], ['F4', 4],
        ['A4', 8], [0, 8],
        [0, 8], ['F4', 4], ['A4', 4],
        [0, 8], ['A4', 4], ['F4', 4],
        [0, 8], ['G4', 4], ['A4', 4],
        ['D4', 8], [0, 8]
      ]),
      bass: seq([
        ['D2', 6], ['D2', 2], ['A2', 8],
        ['A#1', 6], ['A#1', 2], ['F2', 8],
        ['F2', 6], ['F2', 2], ['C3', 8],
        ['C2', 6], ['C2', 2], ['G2', 8],
        ['D2', 6], ['D2', 2], ['A2', 8],
        ['A#1', 6], ['A#1', 2], ['F2', 8],
        ['G2', 6], ['G2', 2], ['A#2', 8],
        ['A2', 6], ['A2', 2], ['E3', 8]
      ]),
      pad: chords([
        [['D3', 'F3', 'A3'], 16], [['A#2', 'D3', 'F3'], 16],
        [['F3', 'A3', 'C4'], 16], [['C3', 'E3', 'G3'], 16],
        [['D3', 'F3', 'A3'], 16], [['A#2', 'D3', 'F3'], 16],
        [['G3', 'A#3', 'D4'], 16], [['A2', 'C#3', 'E3'], 16]
      ]),
      drum: 'sparse'
    },

    // Таинственные биомы: топи, кристаллы, грибная роща.
    mystic: {
      bpm: 84, swing: 0,
      lead: 'glass',
      mel: seq([
        ['A4', 8], ['B4', 4], ['C5', 4],
        ['E5', 8], ['D5', 4], ['C5', 4],
        ['B4', 8], ['A4', 4], ['G4', 4],
        ['A4', 12], [0, 4],
        ['C5', 8], ['D5', 4], ['E5', 4],
        ['G5', 8], ['F5', 4], ['E5', 4],
        ['D5', 8], ['C5', 4], ['B4', 4],
        ['A4', 12], [0, 4]
      ]),
      harm: seq([
        ['E4', 16], ['A4', 16], ['D4', 16], ['E4', 16],
        ['G4', 16], ['A#4', 16], ['A4', 16], ['E4', 16]
      ]),
      bass: seq([
        ['A1', 8], ['A2', 8], ['F1', 8], ['F2', 8],
        ['G1', 8], ['G2', 8], ['A1', 8], ['A2', 8],
        ['C2', 8], ['C3', 8], ['D2', 8], ['D3', 8],
        ['E2', 8], ['E3', 8], ['A1', 8], ['A2', 8]
      ]),
      pad: chords([
        [['A3', 'C4', 'E4'], 16], [['F3', 'A3', 'C4'], 16],
        [['G3', 'A#3', 'D4'], 16], [['A3', 'C4', 'E4'], 16],
        [['C4', 'D#4', 'G4'], 16], [['D4', 'F4', 'A4'], 16],
        [['E3', 'G3', 'B3'], 16], [['A3', 'C4', 'E4'], 16]
      ]),
      drum: 'none'
    },

    // Бой. Ми минор, быстрая и напористая.
    battle: {
      bpm: 148, swing: 0,
      lead: 'saw',
      mel: seq([
        ['E5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['D5', 4], ['B4', 4],
        ['C5', 2], ['C5', 2], ['E5', 2], ['C5', 2], ['B4', 4], ['G4', 4],
        ['A4', 2], ['A4', 2], ['C5', 2], ['A4', 2], ['G4', 4], ['E4', 4],
        ['B4', 2], ['D5', 2], ['E5', 2], ['F#5', 2], ['G5', 8],
        ['G5', 2], ['G5', 2], ['B5', 2], ['G5', 2], ['F#5', 4], ['D5', 4],
        ['E5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['D5', 4], ['B4', 4],
        ['C5', 4], ['B4', 4], ['A4', 4], ['G4', 4],
        ['F#4', 8], ['E4', 8]
      ]),
      harm: seq([
        ['B4', 4], ['B4', 4], ['B4', 4], ['B4', 4],
        ['G4', 4], ['G4', 4], ['G4', 4], ['G4', 4],
        ['E4', 4], ['E4', 4], ['E4', 4], ['E4', 4],
        ['F#4', 4], ['F#4', 4], ['F#4', 4], ['F#4', 4],
        ['D5', 4], ['D5', 4], ['D5', 4], ['D5', 4],
        ['B4', 4], ['B4', 4], ['B4', 4], ['B4', 4],
        ['G4', 4], ['G4', 4], ['E4', 4], ['E4', 4],
        ['D#4', 8], ['B3', 8]
      ]),
      bass: seq([
        ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E3', 2], ['E2', 2],
        ['C2', 2], ['C2', 2], ['C2', 2], ['C2', 2], ['C2', 2], ['C2', 2], ['C3', 2], ['C2', 2],
        ['A1', 2], ['A1', 2], ['A1', 2], ['A1', 2], ['A1', 2], ['A1', 2], ['A2', 2], ['A1', 2],
        ['B1', 2], ['B1', 2], ['B1', 2], ['B1', 2], ['B1', 2], ['B1', 2], ['B2', 2], ['B1', 2],
        ['G2', 2], ['G2', 2], ['G2', 2], ['G2', 2], ['G2', 2], ['G2', 2], ['G3', 2], ['G2', 2],
        ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E3', 2], ['E2', 2],
        ['C2', 2], ['C2', 2], ['C2', 2], ['C2', 2], ['A1', 2], ['A1', 2], ['A1', 2], ['A1', 2],
        ['B1', 2], ['B1', 2], ['B1', 2], ['B1', 2], ['B1', 4], ['B2', 4]
      ]),
      pad: chords([
        [['E3', 'G3', 'B3'], 16], [['C3', 'E3', 'G3'], 16],
        [['A2', 'C3', 'E3'], 16], [['B2', 'D#3', 'F#3'], 16],
        [['G3', 'B3', 'D4'], 16], [['E3', 'G3', 'B3'], 16],
        [['C3', 'E3', 'G3'], 8], [['A2', 'C3', 'E3'], 8],
        [['B2', 'D#3', 'F#3'], 16]
      ]),
      drum: 'drive'
    },

    // Босс. До минор, тяжёлая и грозная.
    boss: {
      bpm: 132, swing: 0,
      lead: 'choir',
      mel: seq([
        ['C5', 4], ['C5', 2], ['D#5', 2], ['C5', 4], ['G4', 4],
        ['G#4', 4], ['G4', 2], ['F4', 2], ['D#4', 4], ['C4', 4],
        ['C5', 4], ['D#5', 2], ['F5', 2], ['G5', 4], ['D#5', 4],
        ['D5', 8], ['G4', 8],
        ['C5', 2], ['C5', 2], ['C5', 2], ['D#5', 2], ['F5', 4], ['D#5', 4],
        ['D5', 4], ['C5', 4], ['A#4', 4], ['G4', 4],
        ['G#4', 4], ['A#4', 2], ['C5', 2], ['D5', 4], ['D#5', 4],
        ['C5', 12], [0, 4]
      ]),
      harm: seq([
        ['G4', 8], ['D#4', 8], ['D#4', 8], ['C4', 8],
        ['G4', 8], ['A#4', 8], ['A#4', 8], ['D4', 8],
        ['G4', 8], ['G#4', 8], ['F4', 8], ['D4', 8],
        ['D#4', 8], ['C4', 8], ['G3', 8], ['G4', 8]
      ]),
      bass: seq([
        ['C2', 2], ['C2', 2], ['C2', 2], ['C1', 2], ['C2', 2], ['C2', 2], ['D#2', 2], ['G2', 2],
        ['G#1', 2], ['G#1', 2], ['G#1', 2], ['G#1', 2], ['G1', 2], ['G1', 2], ['G1', 2], ['G2', 2],
        ['C2', 2], ['C2', 2], ['C2', 2], ['C1', 2], ['C2', 2], ['D#2', 2], ['F2', 2], ['G2', 2],
        ['G1', 4], ['G1', 4], ['G1', 4], ['G2', 4],
        ['C2', 2], ['C2', 2], ['C2', 2], ['C1', 2], ['F2', 2], ['F2', 2], ['D#2', 2], ['D2', 2],
        ['A#1', 4], ['A#1', 4], ['G#1', 4], ['G1', 4],
        ['G#1', 2], ['G#1', 2], ['A#1', 2], ['A#1', 2], ['D2', 2], ['D2', 2], ['D#2', 2], ['D#2', 2],
        ['C2', 4], ['C1', 4], ['G1', 4], ['C2', 4]
      ]),
      pad: chords([
        [['C3', 'D#3', 'G3'], 16], [['G#2', 'C3', 'D#3'], 16],
        [['C3', 'D#3', 'G3'], 16], [['G2', 'B2', 'D3'], 16],
        [['C3', 'D#3', 'G3'], 16], [['A#2', 'D3', 'F3'], 16],
        [['G#2', 'C3', 'D#3'], 16], [['C3', 'D#3', 'G3'], 16]
      ]),
      drum: 'heavy'
    }
  };

  // короткие джинглы (играются один раз)
  const JINGLES = {
    victory: { bpm: 132, notes: [['C5', 2], ['E5', 2], ['G5', 2], ['C6', 6], ['G5', 2], ['C6', 10]], voice: 'bell' },
    defeat: { bpm: 100, notes: [['A4', 4], ['G4', 4], ['F4', 4], ['E4', 10]], voice: 'saw' },
    unlock: { bpm: 150, notes: [['G4', 2], ['C5', 2], ['E5', 2], ['G5', 6]], voice: 'bell' },
    levelup: { bpm: 160, notes: [['C5', 2], ['E5', 2], ['G5', 2], ['C6', 4]], voice: 'bell' }
  };

  // ============================================================
  //  ЗВУК
  // ============================================================
  class Audio {
    constructor() {
      this.ctx = null;
      this.master = null; this.sfxGain = null; this.musGain = null;
      this.volume = 0.7; this.musicVolume = 0.45;
      this.muted = false;
      this.enabledMusic = true;
      this.trackName = null;
      this.step = 0; this.nextTime = 0; this.timer = null;
      this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
      this._noise = null;
      this._lastAt = Object.create(null);
    }

    // ---------- инициализация ----------
    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return false;
      const ctx = this.ctx = new AC();

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);

      // мягкий лимитер, чтобы ничего не хрипело
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 18;
      comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
      comp.connect(this.master);
      this.bus = comp;

      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.volume;
      this.sfxGain.connect(comp);

      this.musGain = ctx.createGain();
      this.musGain.gain.value = this.musicVolume;
      this.musGain.connect(comp);

      // эхо для музыки — добавляет «зала»
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.28;
      const fb = ctx.createGain(); fb.gain.value = 0.28;
      const wet = ctx.createGain(); wet.gain.value = 0.3;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      delay.connect(fb); fb.connect(delay);
      delay.connect(lp); lp.connect(wet); wet.connect(this.musGain);
      this.echo = delay;

      // буфер шума для ударных и эффектов
      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;

      return true;
    }

    setMuted(v) { this.muted = v; if (this.master) this.master.gain.value = v ? 0 : 1; }
    setVolume(v) { this.volume = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
    setMusicVolume(v) { this.musicVolume = v; if (this.musGain) this.musGain.gain.value = v; }
    setListener(x, y, z, yaw) { const l = this.listener; l.x = x; l.y = y; l.z = z; l.yaw = yaw; }

    // ---------- низкоуровневые голоса ----------
    _pan(v) {
      const ctx = this.ctx;
      if (!ctx.createStereoPanner) return null;
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, v));
      return p;
    }

    _chain(nodes, dest) {
      for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
      nodes[nodes.length - 1].connect(dest);
    }

    /** Одна нота осциллятором. */
    note(o) {
      if (!this.ensure()) return;
      const ctx = this.ctx;
      const t = o.at !== undefined ? o.at : ctx.currentTime;
      const dur = o.dur || 0.2;
      const dest = o.dest || this.sfxGain;
      const g = ctx.createGain();
      const vol = o.vol === undefined ? 0.2 : o.vol;
      const atk = o.atk === undefined ? 0.006 : o.atk;
      const rel = o.rel === undefined ? Math.min(0.35, dur * 0.7) : o.rel;

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + atk);
      if (o.sus !== undefined) g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * o.sus), t + atk + 0.06);
      g.gain.setValueAtTime(g.gain.value, t + Math.max(atk, dur - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      let last = g;
      if (o.filter) {
        const f = ctx.createBiquadFilter();
        f.type = o.filterType || 'lowpass';
        f.frequency.setValueAtTime(o.filter, t);
        if (o.filterTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.filterTo), t + dur);
        f.Q.value = o.q || 1;
        g.connect(f); last = f;
      }
      if (o.pan !== undefined) {
        const p = this._pan(o.pan);
        if (p) { last.connect(p); last = p; }
      }
      last.connect(dest);
      if (o.echo && this.echo) last.connect(this.echo);

      const oscs = [];
      const mk = (type, detune, mul) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(o.f0 * (mul || 1), t);
        if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 * (mul || 1)), t + dur);
        if (detune) osc.detune.value = detune;
        const gg = ctx.createGain(); gg.gain.value = o.mix || 1;
        osc.connect(gg); gg.connect(g);
        osc.start(t); osc.stop(t + dur + 0.05);
        oscs.push(osc);
      };
      mk(o.type || 'square', 0, 1);
      if (o.type2) mk(o.type2, o.detune || 7, o.mul2 || 1);

      // лёгкое вибрато
      if (o.vib) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = o.vib;
        const amt = ctx.createGain(); amt.gain.value = o.vibAmt || 4;
        lfo.connect(amt);
        oscs.forEach(osc => amt.connect(osc.detune));
        lfo.start(t); lfo.stop(t + dur + 0.05);
      }
      return g;
    }

    /** Шумовой всплеск. */
    noise(o) {
      if (!this.ensure()) return;
      const ctx = this.ctx;
      const t = o.at !== undefined ? o.at : ctx.currentTime;
      const dur = o.dur || 0.12;
      const src = ctx.createBufferSource();
      src.buffer = this._noise;
      src.loop = true;
      if (o.rate) src.playbackRate.value = o.rate;
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.f0 || 900, t);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.f1), t + dur);
      f.Q.value = o.q === undefined ? 1.2 : o.q;
      const g = ctx.createGain();
      const vol = o.vol === undefined ? 0.18 : o.vol;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (o.atk || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let last = g;
      if (o.pan !== undefined) { const p = this._pan(o.pan); if (p) { last.connect(p); last = p; } }
      src.connect(f); f.connect(g);
      last.connect(o.dest || this.sfxGain);
      src.start(t); src.stop(t + dur + 0.03);
    }

    // ============================================================
    //  МУЗЫКА
    // ============================================================
    startMusic(name) {
      if (!this.enabledMusic) return;
      if (!this.ensure()) return;
      if (this.trackName === name && this.timer) return;
      this.stopMusic();
      const tr = TRACKS[name];
      if (!tr) return;
      this.trackName = name;
      this.track = tr;
      this.stepDur = 60 / tr.bpm / 4;      // одна шестнадцатая
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.12;
      this._len = Math.max(tr.mel.len, tr.bass.len, tr.pad.len);
      // плавное появление
      this.musGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.musGain.gain.linearRampToValueAtTime(this.musicVolume, this.ctx.currentTime + 1.2);
      this.timer = setInterval(() => this._schedule(), 35);
      this._schedule();
    }

    stopMusic(fade) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this.trackName = null;
      if (this.ctx && this.musGain && fade !== false) {
        const t = this.ctx.currentTime;
        this.musGain.gain.cancelScheduledValues(t);
        this.musGain.gain.setValueAtTime(this.musGain.gain.value, t);
        this.musGain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
      }
    }

    _schedule() {
      const ctx = this.ctx, tr = this.track;
      if (!ctx || !tr) return;
      const ahead = ctx.currentTime + 0.25;
      let guard = 0;
      while (this.nextTime < ahead && guard++ < 200) {
        this._playStep(this.step % this._len, this.nextTime);
        this.step++;
        this.nextTime += this.stepDur;
      }
    }

    _find(part, s) {
      if (!part) return null;
      const ev = part.ev;
      for (let i = 0; i < ev.length; i++) if (ev[i].t === s) return ev[i];
      return null;
    }

    _playStep(s, at) {
      const tr = this.track, sd = this.stepDur;
      const swing = (tr.swing && (s % 2 === 1)) ? sd * tr.swing : 0;
      const t = at + swing;

      // --- мелодия ---
      const m = this._find(tr.mel, s % tr.mel.len);
      if (m) this._lead(tr.lead, freq(m.n), m.d * sd, t, 0.16);

      // --- второй голос ---
      const h = this._find(tr.harm, s % tr.harm.len);
      if (h) this._lead(tr.lead === 'saw' ? 'saw' : 'soft', freq(h.n), h.d * sd, t, 0.075);

      // --- бас ---
      const b = this._find(tr.bass, s % tr.bass.len);
      if (b && KM.INSTR) {
        KM.INSTR.bass(this, freq(b.n), Math.min(b.d * sd * 0.92, 0.9), t, 0.2, this.musGain);
      }

      // --- аккордовая подложка ---
      const p = this._find(tr.pad, s % tr.pad.len);
      if (p) {
        // подложка — хор: живее и не спорит с ведущим голосом
        p.notes.forEach((n, i) => {
          KM.INSTR.choir(this, freq(n), p.d * sd * 0.96, t, 0.03 - i * 0.004, this.musGain);
        });
      }

      // --- ударные ---
      this._drums(tr.drum, s, t, sd);
    }

    _lead(voice, f, dur, t, vol) {
      const d = Math.min(dur * 0.94, 1.6);
      const I = KM.INSTR;
      const fn = (I && (I[voice] || I.harp));
      if (fn) { fn(this, f, d, t, vol, this.musGain); return; }
      this.note({ at: t, f0: f, dur: d, type: 'triangle', vol: vol * 0.7, dest: this.musGain });
    }

    _drums(kind, s, t, sd) {
      if (!kind || kind === 'none' || !KM.DRUM) return;
      const D = KM.DRUM, g = this.musGain, b = s % 16;
      switch (kind) {
        case 'soft':
          if (b === 0 || b === 10) D.kick(this, t, 0.3, g);
          if (b === 8) D.snare(this, t, 0.13, g);
          if (b % 4 === 2) D.hat(this, t, 0.05, g);
          break;
        case 'sparse':
          if (b === 0) D.kick(this, t, 0.28, g);
          if (b === 8) D.shake(this, t, 0.06, g);
          if (b === 12) D.hat(this, t, 0.04, g);
          break;
        case 'drive':
          if (b === 0 || b === 6 || b === 10) D.kick(this, t, 0.32, g);
          if (b === 4 || b === 12) D.snare(this, t, 0.15, g);
          if (b % 2 === 0) D.hat(this, t, b % 4 === 0 ? 0.07 : 0.04, g);
          if (b === 14) D.open(this, t, 0.05, g);
          break;
        case 'heavy':
          if (b === 0 || b === 3 || b === 8 || b === 11) D.kick(this, t, 0.34, g);
          if (b === 4 || b === 12) D.snare(this, t, 0.17, g);
          if (b % 4 === 2) D.hat(this, t, 0.055, g);
          if (b === 7) D.tom(this, t, 0.12, g);
          if (b === 15) D.open(this, t, 0.06, g);
          break;
      }
    }

    /** Короткий джингл поверх музыки. */
    jingle(name) {
      if (!this.ensure()) return;
      const j = JINGLES[name];
      if (!j) return;
      const sd = 60 / j.bpm / 4;
      let t = this.ctx.currentTime + 0.02;
      for (const [n, d] of j.notes) {
        if (n) {
          const f = freq(N[n]);
          if (j.voice === 'bell') {
            this.note({ at: t, f0: f, dur: d * sd * 1.1, type: 'triangle', type2: 'sine', mul2: 2, mix: 0.8, vol: 0.22, filter: 3600, atk: 0.008, dest: this.sfxGain });
          } else {
            this.note({ at: t, f0: f, dur: d * sd * 1.1, type: 'sawtooth', vol: 0.18, filter: 1800, atk: 0.01, dest: this.sfxGain });
          }
        }
        t += d * sd;
      }
    }

    // ============================================================
    //  ПОЗИЦИОННЫЙ ЗВУК
    // ============================================================
    /** Возвращает {gain, pan} или null, если источник слишком далеко. */
    _spatial(x, z, maxDist) {
      const l = this.listener;
      const dx = x - l.x, dz = z - l.z;
      const dist = Math.hypot(dx, dz);
      const md = maxDist || 34;
      if (dist > md) return null;
      const gain = Math.pow(1 - dist / md, 1.6);
      let pan = 0;
      if (dist > 0.4) {
        const rx = Math.cos(l.yaw), rz = -Math.sin(l.yaw);   // «право» камеры
        pan = (dx * rx + dz * rz) / dist;
        pan *= Math.min(1, dist / 5);
      }
      return { gain, pan, dist };
    }

    /** Не даём одному и тому же звуку тарахтеть каждый кадр. */
    _throttle(key, ms) {
      const now = (this.ctx ? this.ctx.currentTime : 0) * 1000;
      const last = this._lastAt[key] || -1e9;
      if (now - last < ms) return false;
      this._lastAt[key] = now;
      return true;
    }

    // ============================================================
    //  ГОЛОСА МОНСТРОВ
    // ============================================================
    /**
     * voice — 'slime' | 'growl' | 'goblin' | 'bone' | 'screech' |
     *         'chitter' | 'ghost' | 'stone' | 'imp' | 'boss'
     * act   — 'notice' | 'attack' | 'hurt' | 'die' | 'idle'
     */
    monster(voice, act, x, y, z, big) {
      if (!this.ensure()) return;
      const sp = this._spatial(x, z, act === 'idle' ? 22 : 40);
      if (!sp) return;
      if (!this._throttle(voice + act + Math.round(x) + Math.round(z), act === 'idle' ? 900 : 90)) return;

      const V = sp.gain * (act === 'idle' ? 0.35 : 1);
      const lo = big ? 0.55 : 1;          // крупные монстры звучат ниже
      const fn = (KM.VOICES && KM.VOICES[voice]) || (KM.VOICES && KM.VOICES.growl);
      if (!fn) return;
      try {
        fn(this, this.ctx.currentTime, act, { v: V, mix: { pan: sp.pan, dest: this.sfxGain } }, lo);
      } catch (e) { console.warn('голос', voice, e); }
    }

    ambience(biome) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const pan = (Math.random() - 0.5) * 1.4;
      const v = 0.5;
      switch (biome) {
        case 'meadow': case 'sky': {  // птички
          const f = 1500 + Math.random() * 900;
          for (let i = 0; i < 3; i++) {
            this.note({ at: t + i * 0.09, f0: f * (1 + i * 0.12), f1: f * (1.25 + i * 0.1), dur: 0.08, type: 'sine', vol: 0.07 * v, pan, dest: this.sfxGain });
          }
          break;
        }
        case 'forest': {              // шелест листвы + далёкая птица
          this.noise({ at: t, f0: 3400, dur: 1.4, vol: 0.05 * v, type: 'bandpass', q: 0.7, atk: 0.4, pan, dest: this.sfxGain });
          if (Math.random() < 0.5) this.note({ at: t + 0.6, f0: 1100, f1: 1500, dur: 0.14, type: 'sine', vol: 0.05 * v, pan, dest: this.sfxGain });
          break;
        }
        case 'swamp': {               // бульканье и кваканье
          this.note({ at: t, f0: 180, f1: 90, dur: 0.3, type: 'sine', vol: 0.1 * v, filter: 500, pan, dest: this.sfxGain });
          this.noise({ at: t + 0.05, f0: 400, dur: 0.25, vol: 0.06 * v, type: 'lowpass', pan, dest: this.sfxGain });
          break;
        }
        case 'desert': {              // ветер с песком
          this.noise({ at: t, f0: 900, f1: 2200, dur: 2.2, vol: 0.06 * v, type: 'bandpass', q: 0.5, atk: 0.7, pan, dest: this.sfxGain });
          break;
        }
        case 'frost': {               // вьюга
          this.noise({ at: t, f0: 2400, f1: 800, dur: 2.6, vol: 0.07 * v, type: 'bandpass', q: 0.4, atk: 0.9, pan, dest: this.sfxGain });
          break;
        }
        case 'volcano': {             // лава и далёкий гул
          this.noise({ at: t, f0: 260, dur: 1.6, vol: 0.09 * v, type: 'lowpass', q: 0.6, atk: 0.5, pan, dest: this.sfxGain });
          this.note({ at: t, f0: 62, dur: 1.8, type: 'sawtooth', vol: 0.07 * v, filter: 180, atk: 0.6, pan, dest: this.sfxGain });
          break;
        }
        case 'crystal': {             // хрустальные переливы
          const base = [880, 1046, 1318, 1568][Math.floor(Math.random() * 4)];
          this.note({ at: t, f0: base, dur: 1.5, type: 'sine', type2: 'triangle', mul2: 2, mix: 0.4, vol: 0.06 * v, filter: 5000, atk: 0.1, rel: 1.1, pan, dest: this.sfxGain });
          break;
        }
        case 'mushroom': {            // «пшик» спор
          this.noise({ at: t, f0: 1600, f1: 500, dur: 0.5, vol: 0.06 * v, type: 'bandpass', q: 1.4, pan, dest: this.sfxGain });
          this.note({ at: t, f0: 500, f1: 780, dur: 0.3, type: 'sine', vol: 0.05 * v, pan, dest: this.sfxGain });
          break;
        }
        case 'void': {                // шёпот бездны
          this.note({ at: t, f0: 70 + Math.random() * 40, dur: 2.4, type: 'sawtooth', vol: 0.07 * v, filter: 260, atk: 0.9, rel: 1.2, pan, dest: this.sfxGain });
          this.noise({ at: t, f0: 700, f1: 200, dur: 2.0, vol: 0.05 * v, type: 'bandpass', q: 0.6, atk: 0.8, pan, dest: this.sfxGain });
          break;
        }
      }
    }

    // ============================================================
    //  ИГРОВЫЕ ЭФФЕКТЫ
    // ============================================================
    /** Поправка громкости для конкретного звука (и расстояния). */
    _bal(name, dest, dist) {
      const k = ((KM.SOUND_GAIN && KM.SOUND_GAIN[name]) || 1) * (dist === undefined ? 1 : dist);
      if (Math.abs(k - 1) < 0.02) return dest;
      const g = this.ctx.createGain();
      g.gain.value = k;
      g.connect(dest);
      return g;
    }

    sfx(name, param) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const d = this.sfxGain;

      // У каждого звука свой рецепт в банке. Если рецепт есть —
      // играем его; старая ветка ниже осталась как запасная.
      const rec = KM.SOUNDS && KM.SOUNDS[name];
      if (rec) {
        try { rec(this, t, { dest: this._bal(name, d), param }); return; }
        catch (e) { console.warn('звук', name, e); }
      }

      switch (name) {
        case 'jump':
          this.note({ at: t, f0: 380, f1: 760, dur: 0.14, type: 'square', vol: 0.14, filter: 2600, dest: d });
          this.noise({ at: t, f0: 1800, dur: 0.06, vol: 0.05, dest: d });
          break;
        case 'land':
          this.noise({ at: t, f0: 420, f1: 160, dur: 0.11, vol: 0.13, type: 'lowpass', dest: d });
          this.note({ at: t, f0: 140, f1: 70, dur: 0.1, type: 'sine', vol: 0.1, dest: d });
          break;
        case 'step': case 'step_grass':
          this.noise({ at: t, f0: 900 + Math.random() * 500, dur: 0.05, vol: 0.05, type: 'bandpass', q: 1.6, dest: d });
          break;
        case 'step_stone':
          this.noise({ at: t, f0: 2200 + Math.random() * 800, dur: 0.045, vol: 0.055, type: 'bandpass', q: 4, dest: d });
          break;
        case 'step_snow':
          this.noise({ at: t, f0: 4200 + Math.random() * 1400, dur: 0.06, vol: 0.05, type: 'highpass', q: 0.7, dest: d });
          break;
        case 'step_water':
          this.noise({ at: t, f0: 700 + Math.random() * 500, f1: 1800, dur: 0.13, vol: 0.09, type: 'bandpass', q: 0.8, dest: d });
          this.note({ at: t, f0: 320, f1: 620, dur: 0.1, type: 'sine', vol: 0.05, dest: d });
          break;
        case 'splash':
          this.noise({ at: t, f0: 500, f1: 2400, dur: 0.35, vol: 0.15, type: 'bandpass', q: 0.6, dest: d });
          this.note({ at: t, f0: 260, f1: 700, dur: 0.25, type: 'sine', vol: 0.09, dest: d });
          break;
        case 'sizzle':
          this.noise({ at: t, f0: 3800, f1: 1200, dur: 0.4, vol: 0.09, type: 'bandpass', q: 0.7, dest: d });
          break;
        case 'bush':
          this.noise({ at: t, f0: 2600 + Math.random() * 900, dur: 0.22, vol: 0.09, type: 'bandpass', q: 0.9, dest: d });
          break;
        case 'dash':
          this.note({ at: t, f0: 900, f1: 200, dur: 0.22, type: 'sawtooth', vol: 0.13, filter: 2400, filterTo: 500, q: 3, dest: d });
          this.noise({ at: t, f0: 2600, f1: 700, dur: 0.22, vol: 0.1, type: 'bandpass', q: 0.7, dest: d });
          break;
        case 'claw':
          this.noise({ at: t, f0: 3200, f1: 1100, dur: 0.11, vol: 0.15, type: 'bandpass', q: 2.2, dest: d });
          this.note({ at: t, f0: 620, f1: 260, dur: 0.09, type: 'square', vol: 0.07, filter: 2600, dest: d });
          break;
        case 'cast':
          this.note({ at: t, f0: 300, f1: 950, dur: 0.18, type: 'triangle', type2: 'sine', mul2: 2, mix: 0.6, vol: 0.14, filter: 3200, dest: d });
          break;
        case 'fire':
          this.noise({ at: t, f0: 900, f1: 260, dur: 0.36, vol: 0.16, type: 'lowpass', q: 0.8, dest: d });
          this.note({ at: t, f0: 190, f1: 55, dur: 0.34, type: 'sawtooth', vol: 0.11, filter: 700, dest: d });
          break;
        case 'ice':
          this.note({ at: t, f0: 1600, f1: 1050, dur: 0.24, type: 'square', type2: 'sine', mul2: 2, mix: 0.5, vol: 0.11, filter: 6000, dest: d });
          this.noise({ at: t, f0: 6500, dur: 0.16, vol: 0.07, type: 'highpass', dest: d });
          break;
        case 'water':
          this.noise({ at: t, f0: 620, f1: 220, dur: 0.28, vol: 0.12, type: 'lowpass', dest: d });
          this.note({ at: t, f0: 540, f1: 200, dur: 0.24, type: 'sine', vol: 0.09, dest: d });
          break;
        case 'thunder':
          this.noise({ at: t, f0: 3000, f1: 300, dur: 0.5, vol: 0.18, type: 'bandpass', q: 0.5, dest: d });
          this.note({ at: t, f0: 90, f1: 40, dur: 0.6, type: 'sawtooth', vol: 0.14, filter: 300, dest: d });
          break;
        case 'hit':
          this.noise({ at: t, f0: 1400, f1: 500, dur: 0.09, vol: 0.15, dest: d });
          this.note({ at: t, f0: 260, f1: 110, dur: 0.1, type: 'square', vol: 0.1, filter: 1600, dest: d });
          break;
        case 'hurt':
          this.note({ at: t, f0: 460, f1: 140, dur: 0.26, type: 'sawtooth', vol: 0.17, filter: 1600, dest: d, vib: 16, vibAmt: 20 });
          this.noise({ at: t, f0: 700, f1: 240, dur: 0.14, vol: 0.11, type: 'lowpass', dest: d });
          break;
        case 'die':
          this.note({ at: t, f0: 520, f1: 70, dur: 0.7, type: 'square', vol: 0.18, filter: 1400, dest: d, vib: 8, vibAmt: 25 });
          break;
        case 'coin':
          this.note({ at: t, f0: 988, dur: 0.07, type: 'square', vol: 0.11, dest: d });
          this.note({ at: t + 0.06, f0: 1480, dur: 0.13, type: 'square', type2: 'sine', mul2: 2, mix: 0.5, vol: 0.11, dest: d });
          break;
        case 'pickup':
          this.note({ at: t, f0: 700, f1: 1150, dur: 0.11, type: 'triangle', vol: 0.12, dest: d });
          break;
        case 'eat':
          this.noise({ at: t, f0: 420, dur: 0.09, vol: 0.1, type: 'lowpass', dest: d });
          this.noise({ at: t + 0.11, f0: 340, dur: 0.08, vol: 0.08, type: 'lowpass', dest: d });
          this.note({ at: t + 0.2, f0: 420, f1: 660, dur: 0.16, type: 'sine', vol: 0.09, dest: d });
          break;
        case 'levelup': this.jingle('levelup'); break;
        case 'unlock': this.jingle('unlock'); break;
        case 'win': this.jingle('victory'); break;
        case 'lose': this.jingle('defeat'); break;
        case 'cage':
          this.noise({ at: t, f0: 2800, f1: 900, dur: 0.25, vol: 0.16, type: 'bandpass', q: 3, dest: d });
          [660, 880, 1320].forEach((f, i) =>
            this.note({ at: t + 0.09 + i * 0.09, f0: f, dur: 0.2, type: 'triangle', type2: 'sine', mul2: 2, mix: 0.6, vol: 0.13, dest: d }));
          break;
        case 'chest':
          this.noise({ at: t, f0: 500, f1: 900, dur: 0.3, vol: 0.1, type: 'bandpass', q: 2, dest: d });
          this.note({ at: t + 0.12, f0: 880, f1: 1320, dur: 0.22, type: 'triangle', vol: 0.12, dest: d });
          break;
        case 'portal':
          [330, 440, 550, 660, 880].forEach((f, i) =>
            this.note({ at: t + i * 0.07, f0: f, dur: 0.5, type: 'sine', type2: 'triangle', mul2: 2, mix: 0.4, vol: 0.1, atk: 0.03, dest: d }));
          break;
        case 'portalhum':
          this.note({ at: t, f0: 220, dur: 1.2, type: 'sine', vol: 0.045, filter: 900, atk: 0.4, rel: 0.6, dest: d });
          this.note({ at: t, f0: 330, dur: 1.2, type: 'triangle', vol: 0.03, filter: 1400, atk: 0.5, rel: 0.6, dest: d });
          break;
        case 'meow': {
          const f = 460 + Math.random() * 180;
          this.note({ at: t, f0: f, f1: f * 1.55, dur: 0.13, type: 'sawtooth', vol: 0.13, filter: 2300, q: 3, dest: d, vib: 12, vibAmt: 22 });
          this.note({ at: t + 0.13, f0: f * 1.5, f1: f * 0.95, dur: 0.19, type: 'sawtooth', vol: 0.12, filter: 2100, q: 3, dest: d, vib: 10, vibAmt: 18 });
          break;
        }
        case 'purr':
          this.note({ at: t, f0: 58, dur: 0.9, type: 'sawtooth', vol: 0.1, filter: 240, q: 2, atk: 0.15, dest: d, vib: 22, vibAmt: 30 });
          break;
        case 'boss':
          this.note({ at: t, f0: 120, f1: 48, dur: 1.1, type: 'sawtooth', type2: 'square', mul2: 0.5, mix: 0.7, vol: 0.28, filter: 700, filterTo: 260, q: 3, dest: d, vib: 6, vibAmt: 20 });
          this.noise({ at: t, f0: 300, f1: 90, dur: 0.9, vol: 0.16, type: 'lowpass', dest: d });
          break;
        case 'ui': this.note({ at: t, f0: 660, dur: 0.05, type: 'square', vol: 0.08, filter: 3000, dest: d }); break;
        case 'error': this.note({ at: t, f0: 220, f1: 130, dur: 0.17, type: 'square', vol: 0.12, filter: 1200, dest: d }); break;
        case 'buy':
          this.note({ at: t, f0: 700, dur: 0.07, type: 'square', vol: 0.11, dest: d });
          this.note({ at: t + 0.07, f0: 1050, dur: 0.13, type: 'square', vol: 0.11, dest: d });
          break;
        case 'pet':
          this.note({ at: t, f0: 780, f1: 1180, dur: 0.1, type: 'triangle', vol: 0.09, dest: d });
          break;
      }
    }

    /** Эффект в точке мира (с громкостью и панорамой по расстоянию). */
    sfxAt(name, x, y, z, maxDist) {
      if (!this.ensure()) return;
      const sp = this._spatial(x, z, maxDist || 30);
      if (!sp) return;
      const rec = KM.SOUNDS && KM.SOUNDS[name];
      if (rec) {
        try {
          rec(this, this.ctx.currentTime,
            { dest: this._bal(name, this.sfxGain, sp.gain), pan: sp.pan });
          return;
        } catch (e) { console.warn('звук', name, e); }
      }
      this.sfx(name);
    }
  }

  KM.Audio = Audio;
  KM.MUSIC_TRACKS = Object.keys(TRACKS);
})(window);
