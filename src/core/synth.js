/* ============================================================
   КОТИКИ МАГИ 3D — голоса синтезатора

   Раньше почти всё в игре звучало одним и тем же способом:
   пара осцилляторов и фильтр. Поэтому и удар, и монета, и
   мелодия были «одним звуком на разной высоте».

   Здесь собраны РАЗНЫЕ способы получить звук — они устроены
   по-разному внутри, поэтому и слышатся по-разному:

     pluck   — настоящая щипковая струна (модель Карплуса—Стронга)
     fm      — частотная модуляция: колокол, металл, дудка
     thump   — удар: резкий скат высоты плюс щелчок
     formant — голос: шум через горловые резонаторы (мяу, рык)
     whoosh  — свист воздуха: шум через скользящий фильтр
     chime   — стекло и лёд: негармоничные призвуки
     grains  — шелест: россыпь крошечных шумовых крупинок
     metal   — тарелка: гроздь квадратов с кольцевой модуляцией
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  // ------------------------------------------------------------
  //  ЩИПКОВАЯ СТРУНА
  //  Кольцо задержки, по которому бегает затухающий шум.
  //  Именно так звучит настоящая струна, а не осциллятор.
  // ------------------------------------------------------------
  const PLUCK_CACHE = Object.create(null);

  function pluckBuffer(ctx, freq, bright, decay) {
    const key = Math.round(freq) + '|' + Math.round(bright * 20) + '|' + Math.round(decay * 20);
    if (PLUCK_CACHE[key]) return PLUCK_CACHE[key];

    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const len = Math.min(sr * 2.2, Math.round(sr * (0.35 + decay * 1.6)));
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    // затравка: шум, приглушённый по яркости
    const ring = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) {
      const white = Math.random() * 2 - 1;
      prev = prev + (white - prev) * clamp(bright, 0.05, 1);
      ring[i] = prev;
    }

    // бег по кольцу со сглаживанием — струна теряет верхи и затихает
    const damp = clamp(0.5 + bright * 0.48, 0.5, 0.995);
    const loss = clamp(1 - 0.5 / (decay * sr / N), 0.9, 0.9995);
    let idx = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      out[i] = cur;
      const filtered = cur * damp + last * (1 - damp);
      last = cur;
      ring[idx] = filtered * loss;
      idx = (idx + 1) % N;
    }
    // мягкий хвост, чтобы не щёлкало на обрыве
    const fade = Math.min(len, Math.round(sr * 0.05));
    for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;

    PLUCK_CACHE[key] = buf;
    return buf;
  }

  // ------------------------------------------------------------
  //  ФОРМАНТЫ — «горло»
  //  Три полосовых резонатора превращают жужжание в голос.
  //  Наборы взяты из того, как звучат разные гласные.
  // ------------------------------------------------------------
  const FORMANTS = {
    a: [800, 1150, 2900],      // «а» — открытый крик
    e: [500, 1750, 2450],      // «э» — писк
    i: [320, 2200, 3000],      // «и» — тонкий визг
    o: [500, 900, 2400],       // «о» — округлый вой
    u: [320, 800, 2300],       // «у» — глухой гул
    miu: [700, 1300, 2600],    // кошачье «мяу»
    grr: [280, 700, 1900]      // рычание
  };

  const Synth = {
    // ----------------------------------------------------------
    /** Общая обвязка: громкость, панорама, куда подключить. */
    _out(A, o, t, dur) {
      const ctx = A.ctx;
      const g = ctx.createGain();
      const vol = o.vol === undefined ? 0.2 : o.vol;
      const atk = o.atk === undefined ? 0.004 : o.atk;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + atk);
      g.gain.setValueAtTime(Math.max(0.0002, vol), t + Math.max(atk, dur * (o.hold === undefined ? 0.25 : o.hold)));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      let last = g;
      if (o.pan !== undefined) {
        const p = A._pan(o.pan);
        if (p) { last.connect(p); last = p; }
      }
      last.connect(o.dest || A.sfxGain);
      if (o.echo && A.echo) last.connect(A.echo);
      return g;
    },

    // ----------------------------------------------------------
    /** Щипок струны: арфа, гитара, цимбалы. */
    pluck(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const f = Math.max(30, o.f0 || 440);
      const decay = o.decay === undefined ? 0.5 : o.decay;
      const buf = pluckBuffer(ctx, f, o.bright === undefined ? 0.5 : o.bright, decay);
      const dur = Math.min(buf.duration, o.dur || buf.duration);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = this._out(A, o, t, dur);
      let node = src;
      if (o.filter) {
        const bq = ctx.createBiquadFilter();
        bq.type = 'lowpass';
        bq.frequency.setValueAtTime(o.filter, t);
        if (o.filterTo) bq.frequency.exponentialRampToValueAtTime(Math.max(80, o.filterTo), t + dur);
        bq.Q.value = o.q || 0.7;
        src.connect(bq); node = bq;
      }
      node.connect(g);
      src.start(t); src.stop(t + dur + 0.05);
    },

    // ----------------------------------------------------------
    /** Частотная модуляция: колокол, металл, электропианино. */
    fm(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.4;
      const f = o.f0 || 440;
      const ratio = o.ratio === undefined ? 2 : o.ratio;
      const index = o.index === undefined ? 200 : o.index;

      const car = ctx.createOscillator();
      car.type = o.carrier || 'sine';
      car.frequency.setValueAtTime(f, t);
      if (o.f1) car.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + dur);

      const mod = ctx.createOscillator();
      mod.type = o.modWave || 'sine';
      mod.frequency.setValueAtTime(f * ratio, t);
      if (o.ratio1) mod.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.ratio1), t + dur);

      // глубина модуляции падает — так звучит затухающий колокол
      const md = ctx.createGain();
      md.gain.setValueAtTime(index, t);
      md.gain.exponentialRampToValueAtTime(Math.max(0.01, index * (o.indexTo === undefined ? 0.02 : o.indexTo)), t + dur);

      mod.connect(md); md.connect(car.frequency);
      const g = this._out(A, o, t, dur);
      car.connect(g);
      mod.start(t); mod.stop(t + dur + 0.05);
      car.start(t); car.stop(t + dur + 0.05);
    },

    // ----------------------------------------------------------
    /** Удар: резкий скат высоты плюс щелчок сверху. */
    thump(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.22;
      const f0 = o.f0 || 160, f1 = o.f1 || f0 * 0.28;

      const osc = ctx.createOscillator();
      osc.type = o.wave || 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(18, f1), t + dur * (o.drop || 0.5));

      const g = this._out(A, o, t, dur);
      osc.connect(g);
      osc.start(t); osc.stop(t + dur + 0.05);

      // щелчок в самом начале — от него удар «читается» как удар
      if (o.click !== 0) {
        const n = ctx.createBufferSource();
        n.buffer = A._noise; n.loop = true;
        const bq = ctx.createBiquadFilter();
        bq.type = 'bandpass';
        bq.frequency.value = o.clickF || 2400;
        bq.Q.value = 0.8;
        const cg = ctx.createGain();
        const cv = (o.vol === undefined ? 0.2 : o.vol) * (o.click === undefined ? 0.5 : o.click);
        cg.gain.setValueAtTime(cv, t);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        n.connect(bq); bq.connect(cg);
        let last = cg;
        if (o.pan !== undefined) { const p = A._pan(o.pan); if (p) { last.connect(p); last = p; } }
        last.connect(o.dest || A.sfxGain);
        n.start(t); n.stop(t + 0.08);
      }
    },

    // ----------------------------------------------------------
    /** Голос: жужжание через горловые резонаторы. Мяу, рык, визг. */
    formant(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.4;
      const F = FORMANTS[o.vowel] || FORMANTS.a;
      const F2 = o.vowel2 ? (FORMANTS[o.vowel2] || F) : null;
      const shift = o.shift || 1;

      // источник — пилообразная волна с богатым спектром
      const src = ctx.createOscillator();
      src.type = o.wave || 'sawtooth';
      src.frequency.setValueAtTime(o.f0 || 300, t);
      if (o.f1) src.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + dur * (o.bend || 1));
      if (o.f2) src.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + dur);

      // немного шума в горле — живее
      let breath = null;
      if (o.breath) {
        breath = ctx.createBufferSource();
        breath.buffer = A._noise; breath.loop = true;
      }

      const g = this._out(A, o, t, dur);

      // три резонатора параллельно — они и делают «голос»
      for (let i = 0; i < 3; i++) {
        const bq = ctx.createBiquadFilter();
        bq.type = 'bandpass';
        bq.frequency.setValueAtTime(F[i] * shift, t);
        if (F2) bq.frequency.linearRampToValueAtTime(F2[i] * shift, t + dur * 0.7);
        bq.Q.value = o.q || (6 + i * 3);
        const bg = ctx.createGain();
        bg.gain.value = [1, 0.55, 0.28][i] * (o.rich === undefined ? 1 : o.rich);
        src.connect(bq);
        if (breath) breath.connect(bq);
        bq.connect(bg); bg.connect(g);
      }

      // дрожание голоса
      if (o.vib) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = o.vib;
        const amt = ctx.createGain(); amt.gain.value = o.vibAmt || 20;
        lfo.connect(amt); amt.connect(src.detune);
        lfo.start(t); lfo.stop(t + dur + 0.05);
      }

      src.start(t); src.stop(t + dur + 0.05);
      if (breath) { breath.start(t); breath.stop(t + dur + 0.05); }
    },

    // ----------------------------------------------------------
    /** Свист воздуха: шум через скользящий резонанс. */
    whoosh(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.3;
      const src = ctx.createBufferSource();
      src.buffer = A._noise; src.loop = true;
      src.playbackRate.value = o.rate || 1;

      const bq = ctx.createBiquadFilter();
      bq.type = o.type || 'bandpass';
      bq.frequency.setValueAtTime(o.f0 || 400, t);
      bq.frequency.exponentialRampToValueAtTime(Math.max(60, o.f1 || 3000), t + dur);
      bq.Q.value = o.q === undefined ? 4 : o.q;

      const g = this._out(A, o, t, dur);
      src.connect(bq); bq.connect(g);
      src.start(t); src.stop(t + dur + 0.05);
    },

    // ----------------------------------------------------------
    /** Стекло и лёд: призвуки, не кратные основному тону. */
    chime(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.9;
      const f = o.f0 || 1200;
      // именно негармоничные отношения дают «стеклянность»
      const parts = o.parts || [1, 2.76, 5.4, 8.93];
      const g = this._out(A, o, t, dur);
      parts.forEach((r, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * r, t);
        const pg = ctx.createGain();
        const v = 1 / (i + 1.4);
        pg.gain.setValueAtTime(v, t);
        // верхние призвуки гаснут раньше — как у настоящего стекла
        pg.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - i * 0.18));
        osc.connect(pg); pg.connect(g);
        osc.start(t); osc.stop(t + dur + 0.05);
      });
    },

    // ----------------------------------------------------------
    /** Шелест: россыпь крошечных шумовых крупинок. */
    grains(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.25;
      const n = o.n || 9;
      const vol = o.vol === undefined ? 0.1 : o.vol;
      for (let i = 0; i < n; i++) {
        const at = t + Math.random() * dur * 0.9;
        const src = ctx.createBufferSource();
        src.buffer = A._noise; src.loop = true;
        src.playbackRate.value = 0.7 + Math.random() * 1.2;
        const bq = ctx.createBiquadFilter();
        bq.type = 'bandpass';
        bq.frequency.value = (o.f0 || 2600) * (0.55 + Math.random() * 1.3);
        bq.Q.value = o.q === undefined ? 5 : o.q;
        const g = ctx.createGain();
        const gv = vol * (0.4 + Math.random() * 0.9) / Math.sqrt(n);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gv, at + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.02 + Math.random() * 0.04);
        src.connect(bq); bq.connect(g);
        let last = g;
        if (o.pan !== undefined) { const p = A._pan(o.pan); if (p) { last.connect(p); last = p; } }
        last.connect(o.dest || A.sfxGain);
        src.start(at); src.stop(at + 0.12);
      }
    },

    // ----------------------------------------------------------
    /** Металл и тарелки: гроздь квадратов на несоизмеримых частотах. */
    metal(A, o) {
      const ctx = A.ctx;
      if (!ctx) return;
      const t = o.at === undefined ? ctx.currentTime : o.at;
      const dur = o.dur || 0.3;
      const base = o.f0 || 320;
      const RAT = [1, 1.4142, 1.6818, 1.9569, 2.5029, 2.6633];

      const g = this._out(A, o, t, dur);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(o.hp || 3000, t);
      if (o.hpTo) hp.frequency.exponentialRampToValueAtTime(Math.max(200, o.hpTo), t + dur);
      hp.connect(g);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = o.bp || 6500;
      bp.Q.value = o.q === undefined ? 0.6 : o.q;
      bp.connect(hp);

      RAT.forEach(r => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = base * r;
        const og = ctx.createGain();
        og.gain.value = 0.16;
        osc.connect(og); og.connect(bp);
        osc.start(t); osc.stop(t + dur + 0.05);
      });
    }
  };

  KM.Synth = Synth;
  KM.FORMANTS = FORMANTS;
})(window);
