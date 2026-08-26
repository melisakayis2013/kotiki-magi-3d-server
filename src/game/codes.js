/* ============================================================
   КОТИКИ МАГИ 3D — секретные коды

   Короткое слово в меню — и посыпались подарки.
   Код можно писать как угодно: большими или маленькими буквами,
   русскими или английскими, с пробелами и дефисами, в любой
   раскладке клавиатуры. Всё это приводится к одному виду.

   Каждый код срабатывает один раз на игру (слот сохранения);
   какие уже введены, лежит в save.codes.
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  // ------------------------------------------------------------
  //  НОРМАЛИЗАЦИЯ ВВОДА
  // ------------------------------------------------------------

  /** Кириллица → латиница: «МУРКА» и «MURKA» — один и тот же код. */
  const TRANSLIT = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'ZH',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C',
    'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SCH', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E',
    'Ю': 'YU', 'Я': 'YA'
  };

  /** Русская раскладка → английская: набрал MURKA, а вышло ЬГКЛФ. */
  const LAYOUT = {
    'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I',
    'Щ': 'O', 'З': 'P', 'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H',
    'О': 'J', 'Л': 'K', 'Д': 'L', 'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B',
    'Т': 'N', 'Ь': 'M'
  };

  function clean(s) {
    return String(s || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '');
  }
  function translit(s) {
    let out = '';
    for (const ch of s) out += (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch);
    return out;
  }
  function layout(s) {
    let out = '';
    for (const ch of s) out += (LAYOUT[ch] !== undefined ? LAYOUT[ch] : ch);
    return out;
  }

  /** Все разумные прочтения введённой строки. */
  function variants(raw) {
    const c = clean(raw);
    if (!c) return [];
    const set = [c, translit(c), layout(c)];
    return set.filter((v, i) => v && set.indexOf(v) === i);
  }

  // ------------------------------------------------------------
  //  ПОМОЩНИКИ ДЛЯ НАГРАД
  // ------------------------------------------------------------
  function allSpells(S) {
    let n = 0;
    for (const sp of KM.SPELLS) if (S.unlockSpell(sp.id)) n++;
    return n;
  }
  function allAbilities(S) {
    let n = 0;
    for (const a of KM.ABILITIES) if (S.unlockAbility(a.id)) n++;
    return n;
  }
  function allCats(S) {
    let n = 0;
    for (const c of KM.CATS) if (S.unlockCat(c.id)) n++;
    return n;
  }
  function allPets(S) {
    let n = 0;
    for (const p of KM.PETS) {
      if (!S.data.pets.some(x => x.id === p.id)) { S.addPet(p.id); n++; }
    }
    return n;
  }
  /** Весь гардероб. Праздничные вещи (цена 0) — только по флагу. */
  function allWardrobe(S, withHoliday) {
    let n = 0;
    for (const a of KM.ACC) {
      if (!withHoliday && !a.price) continue;   // праздничный колпак — только на день рождения
      if (S.addAcc(a.id)) n++;
    }
    for (const sk of KM.SKINS) if (S.addSkin(sk.id)) n++;
    if (!S.data.petAccs) S.data.petAccs = [];
    for (const pa of KM.PET_ACC) {
      if (S.data.petAccs.indexOf(pa.id) < 0) { S.data.petAccs.push(pa.id); n++; }
    }
    return n;
  }
  function maxSkills(S) {
    for (const sk of KM.SKILLS) S.data.skills[sk.id] = sk.max;
  }
  function fillBag(S, n) {
    for (const it of KM.ITEMS) {
      if (it.type === 'food' || it.type === 'potion' || it.id === 'key' || it.id === 'scroll') {
        S.addItem(it.id, n);
      }
    }
  }

  // ------------------------------------------------------------
  //  САМИ КОДЫ
  //  id — латиницей; «МУРКА» приводится к нему автоматически
  // ------------------------------------------------------------
  const CODES = [
    {
      id: 'VSE', ru: 'ВСЁ', alt: ['VSYO', 'ALL', 'VSEVSE'], icon: '🌈', name: 'Всё и сразу',
      hint: 'вообще всё: и прокачка, и локации, и коты, и гардероб',
      run(S) {
        // Этот код просто нажимает все остальные разом. Так он не отстанет
        // от игры: добавится новый кот или локация — они попадут сюда сами.
        const out = ['🌈 <b>Включено всё, что есть в игре.</b>'];

        S.addCoins(10000000);
        out.push('🪙 +10 000 000 монет');

        const было = S.data.level;
        S.data.level = Math.max(S.data.level, 60);
        S.data.xp = 0;
        S.data.skillPoints = 0;
        maxSkills(S);
        out.push('⭐ Уровень <b>' + было + ' → ' + S.data.level + '</b>, все навыки на максимуме');

        out.push('🔮 Заклинания: все ' + KM.SPELLS.length + ' (+' + allSpells(S) + ')');
        out.push('💪 Способности: все ' + KM.ABILITIES.length + ' (+' + allAbilities(S) + ')');
        out.push('🐱 Коты: все ' + KM.CATS.length + ' (+' + allCats(S) + '), включая секретного');
        out.push('🐾 Питомцы: все ' + KM.PETS.length + ' (+' + allPets(S) + ')');
        out.push('🎩 Гардероб: +' + allWardrobe(S, true) +
          ' — костюмы, аксессуары, наряды питомцам и праздничный колпак');

        fillBag(S, 99);
        out.push('🎒 Сумка набита по 99 штук всего');

        for (let i = 0; i < KM.LEVELS; i++) S.data.completed[i] = { stars: 3 };
        out.push('🗺 Все <b>' + KM.LEVELS + ' локаций</b> открыты и пройдены на три звезды');

        S.data.freedCats = Math.max(S.data.freedCats || 0, 40);
        out.push('🔑 Все 40 котов-магов спасены');

        out.push('<i>Открывать больше нечего — остаётся только играть в удовольствие 🐾</i>');
        return out;
      }
    },
    {
      id: 'MURKA', ru: 'МУРКА', icon: '🪙', name: 'Кошелёк Мурки',
      hint: '10 000 000 монет',
      run(S) {
        S.addCoins(10000000);
        return ['🪙 <b>+10 000 000 монет</b> — теперь в магазине можно вообще не смотреть на ценники'];
      }
    },
    {
      id: 'KOTOBOG', ru: 'КОТОБОГ', icon: '👑', name: 'Котобог',
      hint: 'всё разблокировано и прокачено до предела',
      run(S) {
        const out = [];
        S.addCoins(10000000);
        out.push('🪙 +10 000 000 монет');

        // уровень и навыки
        const before = S.data.level;
        S.data.level = Math.max(S.data.level, 60);
        S.data.xp = 0;
        S.data.skillPoints = 0;
        maxSkills(S);
        out.push('⭐ Уровень <b>' + before + ' → ' + S.data.level + '</b>, все 8 навыков на максимуме');

        out.push('✨ Заклинания: +' + allSpells(S) + ' (теперь все ' + KM.SPELLS.length + ')');
        out.push('💪 Способности: +' + allAbilities(S) + ' (теперь все ' + KM.ABILITIES.length + ')');
        out.push('🐱 Коты: +' + allCats(S) + ' (теперь все ' + KM.CATS.length + ')');
        out.push('🐾 Питомцы: +' + allPets(S) + ' (теперь все ' + KM.PETS.length + ')');
        out.push('🎩 Гардероб: +' + allWardrobe(S, true) + ' вещей — все костюмы, аксессуары и наряды питомцам, ' +
          'включая праздничный колпак');

        fillBag(S, 99);
        out.push('🎒 Сумка набита припасами, зельями и ключами');

        S.data.freedCats = Math.max(S.data.freedCats || 0, 40);
        out.push('🔑 Все 40 котов-магов считаются спасёнными');
        out.push('<i>Локации остались непройденными — их приятнее пройти самому. ' +
          'А если хочется и их, есть код ЗВЕЗДА.</i>');
        return out;
      }
    },
    {
      id: 'ZVEZDA', ru: 'ЗВЕЗДА', icon: '⭐', name: 'Звёздный путь',
      hint: 'все локации пройдены на три звезды',
      run(S) {
        for (let i = 0; i < KM.LEVELS; i++) S.data.completed[i] = { stars: 3 };
        return ['⭐ Все <b>' + KM.LEVELS + ' локаций</b> открыты и пройдены на три звезды',
          '<i>Можно зайти в любую и просто погулять.</i>'];
      }
    },
    {
      id: 'MAGIYA', ru: 'МАГИЯ', icon: '🔮', name: 'Книга всех заклинаний',
      hint: 'все заклинания',
      run(S) {
        const n = allSpells(S);
        return ['🔮 Заклинаний открыто: <b>+' + n + '</b> — теперь у вас все ' + KM.SPELLS.length];
      }
    },
    {
      id: 'SILA', ru: 'СИЛА', icon: '💪', name: 'Кошачья сила',
      hint: 'все способности',
      run(S) {
        const n = allAbilities(S);
        return ['💪 Способностей открыто: <b>+' + n + '</b> — теперь у вас все ' + KM.ABILITIES.length];
      }
    },
    {
      id: 'MODA', ru: 'МОДА', icon: '🎩', name: 'Кошачья мода',
      hint: 'весь гардероб: костюмы, аксессуары, наряды питомцам',
      run(S) {
        const n = allWardrobe(S);
        return ['🎩 Вещей в гардеробе: <b>+' + n + '</b>',
          '<i>Праздничный колпак сюда не входит — он только на день рождения.</i>'];
      }
    },
    {
      id: 'DRUZYA', ru: 'ДРУЗЬЯ', icon: '🐾', name: 'Все друзья',
      hint: 'все питомцы',
      run(S) {
        const n = allPets(S);
        return ['🐾 Питомцев прибавилось: <b>+' + n + '</b> — теперь с вами все ' + KM.PETS.length];
      }
    },
    {
      id: 'MYAU', ru: 'МЯУ', icon: '🐈', name: 'Мяу',
      hint: '5000 монет и полная сумка припасов',
      run(S) {
        S.addCoins(5000);
        fillBag(S, 10);
        return ['🪙 +5000 монет', '🎒 По 10 штук каждого припаса, зелья и ключа'];
      }
    },
    {
      id: 'SEKRET', ru: 'СЕКРЕТ', icon: '🌟', name: '???',
      hint: 'самый скрытный кот в игре',
      cat: 'sekret',
      run(S) {
        if (S.unlockCat('sekret')) {
          return ['🌟 Из темноты вышел <b>' + ((KM.CAT_BY.sekret || {}).name || '???') + '</b> — серебристый секретный кот'];
        }
        S.addCoins(50000);
        return ['🌟 Секретный кот у вас уже был — держите <b>+50 000 монет</b>'];
      }
    }
  ];

  const BY_ID = {};
  CODES.forEach(c => {
    BY_ID[c.id] = c;
    // запасные написания: люди пишут «ВСЁ», «ВСЕ», «ALL» — пусть все подходят
    for (const и of (c.alt || [])) BY_ID[и] = c;
  });

  // ------------------------------------------------------------
  //  API
  // ------------------------------------------------------------
  const Codes = {
    LIST: CODES,

    /** Найти код по тому, что напечатал игрок. */
    find(raw) {
      for (const v of variants(raw)) if (BY_ID[v]) return BY_ID[v];
      return null;
    },

    used(state, id) {
      return ((state.data.codes || []).indexOf(id) >= 0);
    },

    /**
     * Применить код.
     * → {ok:false, error} либо {ok:true, code, lines, cat}
     */
    redeem(game, raw) {
      const S = game.state;
      const txt = clean(raw);
      if (!txt) return { ok: false, error: 'Впишите код' };

      const code = this.find(raw);
      if (!code) return { ok: false, error: 'Такого кода нет. Проверьте буквы 🐾' };
      if (this.used(S, code.id)) return { ok: false, error: 'Этот код вы уже вводили' };

      if (!S.data.codes) S.data.codes = [];
      S.data.codes.push(code.id);

      let lines = [];
      try { lines = code.run(S) || []; }
      catch (e) { console.warn('Код сломался:', e); lines = ['Подарки выданы']; }

      S.save();
      return { ok: true, code, lines, cat: code.cat || null };
    }
  };

  KM.CODES = Codes;
})(window);
