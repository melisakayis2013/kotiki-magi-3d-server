/**
 * ЯЗЫКИ
 *
 * Игра написана по-русски, и русский тут — родной язык, а не «один из».
 * Поэтому переводим не по выдуманным ключам, а по самой фразе: в словаре
 * слева стоит русский текст, справа — перевод. Так ничего не потеряется:
 * фразы без перевода просто останутся русскими, а не превратятся
 * в «menu.play.title».
 *
 * Перевод применяется к уже нарисованному экрану: обходим текст и подписи
 * и подменяем те куски, которые знаем. Это позволяет переводить игру,
 * не переписывая пять тысяч мест, где текст создаётся.
 */
(function (global) {
  'use strict';
  const KM = global.KM;

  const КЛЮЧ = 'kmagi_lang';
  const ЯЗЫКИ = ['ru', 'en', 'kk', 'uk', 'tr'];

  const I18N = {
    lang: 'ru',
    dict: { en: {}, kk: {}, uk: {}, tr: {} },

    /** Какой язык у устройства. Возвращает id из списка или 'ru'. */
    detect() {
      const списки = [];
      if (global.navigator) {
        if (navigator.languages && navigator.languages.length) списки.push(...navigator.languages);
        if (navigator.language) списки.push(navigator.language);
      }
      for (const код of списки) {
        const к = String(код).toLowerCase();
        // Казахстан и Украина часто ставят русский интерфейс — уважаем выбор
        if (к.startsWith('ru') || к.startsWith('be')) return 'ru';
        if (к.startsWith('kk')) return 'kk';
        if (к.startsWith('uk')) return 'uk';
        if (к.startsWith('tr')) return 'tr';
        if (к.startsWith('en')) return 'en';
      }
      // Язык устройства нам незнаком — скажем, немецкий или турецкий.
      // Английский такому игроку понятнее русского, пусть и переведён
      // пока не весь. Совсем без языка остаётся только тот, у кого
      // браузер вообще ничего не сообщил.
      return списки.length ? 'en' : 'ru';
    },

    /** Язык, выбранный игроком; если не выбирал — язык устройства. */
    load() {
      let сохранён = null;
      try { сохранён = localStorage.getItem(КЛЮЧ); } catch (e) { }
      this.lang = ЯЗЫКИ.includes(сохранён) ? сохранён : this.detect();
      return this.lang;
    },

    /**
     * Сменить язык. Перевод накладывается на уже нарисованный текст,
     * поэтому вернуться к русскому простым «перевести обратно» нельзя —
     * надо перерисовать экран заново. За это отвечает onChange.
     */
    onChange: null,

    set(lang, запомнить) {
      this.lang = ЯЗЫКИ.includes(lang) ? lang : 'ru';
      if (запомнить !== false) {
        try { localStorage.setItem(КЛЮЧ, this.lang); } catch (e) { }
      }
      if (this.onChange) this.onChange(this.lang);
      else this.applyAll();
      return this.lang;
    },

    // Сколько всего фраз в игре — посчитано по исходникам. Нужно, чтобы
    // показывать честную долю перевода, а не «100%» от собственного словаря.
    ВСЕГО: 1162,

    /** Насколько язык переведён — честно, в долях от всей игры. */
    coverage(lang) {
      if (lang === 'ru') return 100;
      const д = this.dict[lang];
      if (!д) return 0;
      return Math.round(Object.keys(д).length / this.ВСЕГО * 100);
    },

    /** Перевести одну фразу. Не знаем — отдаём как есть. */
    t(фраза) {
      if (this.lang === 'ru' || !фраза) return фраза;
      const д = this.dict[this.lang];
      if (!д) return фраза;
      const s = String(фраза);
      const прямо = д[s];
      if (прямо !== undefined) return прямо;

      // фраза могла обрасти пробелами или переносом
      const чисто = s.trim();
      if (чисто !== s && д[чисто] !== undefined) {
        return s.replace(чисто, д[чисто]);
      }
      return s;
    },

    /**
     * Пройтись по готовому куску страницы и перевести текст.
     *
     * Важная тонкость: рядом с каждым переведённым куском мы запоминаем
     * русский оригинал. Иначе назад к русскому уже не вернуться —
     * английский текст затёр бы русский навсегда. И перевод всегда
     * считается от оригинала, а не от того, что сейчас на экране:
     * так можно переключаться между языками сколько угодно раз.
     */
    apply(корень) {
      корень = корень || document.body;
      const русский = this.lang === 'ru';
      const д = this.dict[this.lang];
      if (!русский && !д) return;

      const обход = document.createTreeWalker(корень, NodeFilter.SHOW_TEXT, null);
      const узлы = [];
      let n;
      while ((n = обход.nextNode())) узлы.push(n);
      for (const узел of узлы) {
        const текущее = узел.nodeValue;
        if (!текущее || текущее.length < 2) continue;
        const оригинал = узел.__ru !== undefined ? узел.__ru : текущее;
        const стало = русский ? оригинал : this.t(оригинал);
        if (стало !== текущее) {
          if (узел.__ru === undefined) узел.__ru = оригинал;
          узел.nodeValue = стало;
        }
      }

      // подписи, подсказки и заглушки полей
      for (const эл of корень.querySelectorAll('[placeholder],[title]')) {
        for (const имя of ['placeholder', 'title']) {
          const текущее = эл.getAttribute(имя);
          if (!текущее) continue;
          const хранилище = '__ru_' + имя;
          const оригинал = эл[хранилище] !== undefined ? эл[хранилище] : текущее;
          const стало = русский ? оригинал : this.t(оригинал);
          if (стало !== текущее) {
            if (эл[хранилище] === undefined) эл[хранилище] = оригинал;
            эл.setAttribute(имя, стало);
          }
        }
      }
    },

    applyAll() { this.apply(document.body); },

    /** Добавить или дополнить словарь языка. */
    add(lang, пары) {
      this.dict[lang] = Object.assign(this.dict[lang] || {}, пары);
    }
  };

  KM.I18N = I18N;
  KM.T = (ф) => I18N.t(ф);
})(this);
