/* ============================================================
   КОТИКИ МАГИ 3D — гардероб: наборы, скины и аксессуары
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const hex = KM.hex;

  // ============================================================
  //  АКСЕССУАРЫ ДЛЯ КОТА
  //  slot: head | face | neck | back
  //  shape — форма, которую строит конструктор модели
  // ============================================================
  const ACC = [
    // ---------- голова ----------
    {
      id: 'tophat', warm: 1, name: 'Цилиндр', icon: '🎩', slot: 'head', shape: 'tophat',
      rarity: 'rare', price: 700, c1: hex('#1a1a26'), c2: hex('#b03a5b'),
      desc: 'Настоящий джентльменский цилиндр с алой лентой.',
      bonus: { mana: 12 }
    },
    {
      id: 'goldcrown', warm: 0, name: 'Корона Удачи', icon: '👑', slot: 'head', shape: 'crown2',
      rarity: 'epic', price: 1600, c1: hex('#ffd23a'), c2: hex('#ff5a8a'),
      desc: 'Тяжёлая корона с рубинами. Монеты сами тянутся к владельцу.',
      bonus: {}, gold: 0.25
    },
    {
      id: 'bow', warm: 0, name: 'Розовый Бантик', icon: '🎀', slot: 'head', shape: 'bow',
      rarity: 'common', price: 250, c1: hex('#ff7ac0'), c2: hex('#ffd0e8'),
      desc: 'Милейший бантик. Ничего не даёт, кроме обаяния… и капельки удачи.',
      bonus: {}, luck: 0.08
    },
    {
      id: 'bdhat', warm: 1, name: 'Праздничный Колпак', icon: '🎂', slot: 'head', shape: 'partyhat',
      rarity: 'legendary', price: 0, c1: hex('#ff4a8a'), c2: hex('#ffd23a'),
      desc: 'Полосатый колпак с помпоном. Выдаётся только на день рождения — купить его нельзя.',
      bonus: { hp: 30, mana: 30 }, luck: 0.2, gold: 0.2
    },
    {
      id: 'beanie', warm: 4, name: 'Тёплая Шапка', icon: '🧢', slot: 'head', shape: 'beanie',
      rarity: 'common', price: 300, c1: hex('#4a7ad0'), c2: hex('#ffffff'),
      desc: 'Вязаная шапка с помпоном. В снегах — незаменима.',
      bonus: { hp: 15 }
    },

    // ---------- морда ----------
    {
      id: 'shades', warm: -1, name: 'Тёмные Очки', icon: '🕶️', slot: 'face', shape: 'shades',
      rarity: 'rare', price: 800, c1: hex('#14141c'), c2: hex('#3a3a4a'),
      desc: 'Кот в тёмных очках выглядит так круто, что монстры теряются.',
      bonus: {}, stealth: 0.18
    },
    {
      id: 'goggles', warm: 0, name: 'Лётные Очки', icon: '🥽', slot: 'face', shape: 'goggles',
      rarity: 'rare', price: 850, c1: hex('#8a6a3a'), c2: hex('#8ad8ff'),
      desc: 'Кожаные очки авиатора. В них не страшно падать с высоты.',
      bonus: { spd: 0.06 }
    },
    {
      id: 'eyepatch', warm: 0, name: 'Пиратская Повязка', icon: '🏴‍☠️', slot: 'face', shape: 'eyepatch',
      rarity: 'epic', price: 1300, c1: hex('#14141c'), c2: hex('#c9a02a'),
      desc: 'Одним глазом видно ровно столько, сколько нужно, чтобы бить точнее.',
      bonus: { dmg: 8 }
    },

    // ---------- шея ----------
    {
      id: 'longscarf', warm: 3, name: 'Длинный Шарф', icon: '🧣', slot: 'neck', shape: 'longscarf',
      rarity: 'common', price: 350, c1: hex('#d03a4a'), c2: hex('#ffd23a'),
      desc: 'Развевается на бегу. Очень красиво и чуть-чуть греет.',
      bonus: { hp: 10, spd: 0.04 }
    },
    {
      id: 'goldbell', warm: 0, name: 'Золотой Колокольчик', icon: '🔔', slot: 'neck', shape: 'bell2',
      rarity: 'rare', price: 900, c1: hex('#ffd23a'), c2: hex('#c9971a'),
      desc: 'Звенит на каждом шагу. Монстры слышат — зато мана течёт быстрее.',
      bonus: { mana: 25 }, stealth: -0.1
    },
    {
      id: 'medal', warm: 0, name: 'Медаль Героя', icon: '🎖️', slot: 'neck', shape: 'medal',
      rarity: 'mythic', price: 2600, c1: hex('#ffd23a'), c2: hex('#3a5ad0'),
      desc: 'Награда за спасённых котов. Придаёт сил в бою.',
      bonus: { dmg: 14, hp: 25 }
    },

    // ---------- спина ----------
    {
      id: 'cape', warm: 2, name: 'Геройский Плащ', icon: '🦸', slot: 'back', shape: 'cape',
      rarity: 'epic', price: 1500, c1: hex('#c02a3a'), c2: hex('#ffd23a'),
      desc: 'Развевается даже без ветра. С ним бегается заметно веселее.',
      bonus: { spd: 0.12, hp: 20 }
    },
    {
      id: 'satchel', warm: 0, name: 'Рюкзак Искателя', icon: '🎒', slot: 'back', shape: 'pack2',
      rarity: 'rare', price: 950, c1: hex('#8a6a3a'), c2: hex('#5a4020'),
      desc: 'В нём всегда найдётся место ещё для одной находки.',
      bonus: {}, luck: 0.25
    },
    {
      id: 'angelwings', warm: -1, name: 'Ангельские Крылья', icon: '🪽', slot: 'back', shape: 'wings2',
      rarity: 'legendary', price: 3600, c1: hex('#ffffff'), c2: hex('#ffe8a0'),
      desc: 'Настоящие перьевые крылья. Прыжки становятся выше, а падения — мягче.',
      bonus: { mana: 20 }, jump: 0.25, feather: true
    },
    {
      id: 'panama', warm: -2, name: 'Панама от Солнца', icon: '👒', slot: 'head', shape: 'beanie',
      rarity: 'common', price: 320, c1: hex('#f0e0a0'), c2: hex('#c9a02a'),
      desc: 'Широкая соломенная панама. В пустыне и на вулкане спасает от жары.',
      bonus: { spd: 0.03 }
    },
    {
      id: 'iceamulet', warm: -4, name: 'Ледяной Амулет', icon: '🧊', slot: 'neck', shape: 'medal',
      rarity: 'epic', price: 1800, c1: hex('#8ae8ff'), c2: hex('#2a6a9a'),
      desc: 'Внутри вечная льдинка. Держит прохладу даже в жерле вулкана.',
      bonus: { mana: 18 }
    },
    {
      id: 'breezecloak', warm: -3, name: 'Плащ-Ветерок', icon: '🌬️', slot: 'back', shape: 'cape',
      rarity: 'rare', price: 1100, c1: hex('#a8e8f0'), c2: hex('#ffffff'),
      desc: 'Лёгкая ткань, которая всё время обдувает кота прохладой.',
      bonus: { spd: 0.08 }
    },
    {
      id: 'furcoat', warm: 5, name: 'Шуба', icon: '🧥', slot: 'back', shape: 'cape',
      rarity: 'rare', price: 1200, c1: hex('#8a6a4a'), c2: hex('#f0e0c8'),
      desc: 'Толстая меховая шуба. В снегах — лучший друг, в вулкане — злейший враг.',
      bonus: { hp: 30 }
    },
    {
      id: 'mittens', warm: 3, name: 'Тёплый Шарф-Труба', icon: '🧶', slot: 'neck', shape: 'longscarf',
      rarity: 'common', price: 400, c1: hex('#c94a6a'), c2: hex('#ffd0a0'),
      desc: 'Вязаный шарф-хомут. Простой, но очень тёплый.',
      bonus: { hp: 12 }
    },
    {
      id: 'jetpack', warm: 1, name: 'Волшебный Ранец', icon: '🚀', slot: 'back', shape: 'jetpack',
      rarity: 'mythic', price: 2800, c1: hex('#8a90a0'), c2: hex('#ff7a2a'),
      desc: 'Пыхает магическим пламенем. Кот прыгает выше и бегает быстрее.',
      bonus: { spd: 0.15 }, jump: 0.2
    }
  ];

  // ============================================================
  //  АКСЕССУАРЫ ДЛЯ ПИТОМЦЕВ
  // ============================================================
  const PET_ACC = [
    { id: 'p_bandana', name: 'Бандана', icon: '🔻', rarity: 'common', price: 200, shape: 'bandana', c1: hex('#d03a4a'), desc: 'Красная бандана — питомец сразу выглядит бывалым.', dmg: 0.08 },
    { id: 'p_hat', name: 'Крошечная Шляпка', icon: '🎩', rarity: 'rare', price: 500, shape: 'hat', c1: hex('#2a2a40'), desc: 'Малюсенький цилиндр. Очень солидно.', dmg: 0.12 },
    { id: 'p_bow', name: 'Бантик', icon: '🎀', rarity: 'common', price: 200, shape: 'bow', c1: hex('#ff7ac0'), desc: 'Питомец с бантиком дерётся веселее.', dmg: 0.08 },
    { id: 'p_collar', name: 'Шипастый Ошейник', icon: '⛓️', rarity: 'rare', price: 600, shape: 'collar', c1: hex('#9aa0b0'), desc: 'Строгий ошейник с шипами. Урон заметно выше.', dmg: 0.2 },
    { id: 'p_halo', name: 'Нимб', icon: '😇', rarity: 'epic', price: 1400, shape: 'halo', c1: hex('#ffe86a'), desc: 'Светящееся кольцо над головой питомца.', dmg: 0.28 },
    { id: 'p_horns', name: 'Рожки', icon: '😈', rarity: 'epic', price: 1400, shape: 'horns', c1: hex('#c02a2a'), desc: 'Маленькие бесовские рожки. Питомец стал злее.', dmg: 0.32 }
  ];

  // ============================================================
  //  СКИНЫ (костюмы) — меняют окрас и детали конкретного кота
  // ============================================================
  const P = (o) => Object.assign({
    fur: hex('#c8c8c8'), fur2: hex('#eeeeee'), ear: hex('#ff9ec2'),
    eye: hex('#2ec27e'), eyeShine: hex('#ffffff'), nose: hex('#d4557a'),
    hat: hex('#5b4bd6'), hatBand: hex('#372a9e'), gem: hex('#7ce8ff'),
    collar: hex('#b03a5b'), whisker: hex('#fff3e0'),
    horn: hex('#f0e6d0'), wing: hex('#dfe8ff'), metal: hex('#c8ccd8')
  }, o);

  const SKINS = [
    {
      id: 'muri_pirate', cat: 'muri', name: 'Мури — Пират', icon: '🏴‍☠️',
      rarity: 'rare', price: 900, desc: 'Полосатая тельняшка, треуголка и раздвоенный хвост.',
      build: { hat: 'cap', tail: 'fork', ear: 'tuft' },
      pal: P({ fur: hex('#c97a3a'), fur2: hex('#f0e0d0'), hat: hex('#1a1a26'), hatBand: hex('#c9a02a'), gem: hex('#c9a02a'), collar: hex('#1a3a6a'), eye: hex('#6ae0a8') })
    },
    {
      id: 'muri_gold', cat: 'muri', name: 'Мури — Золотой', icon: '✨',
      rarity: 'epic', price: 1800, desc: 'Мури, облитый чистым золотом. Даже усы блестят.',
      build: { hat: 'crown', tail: 'fluffy' },
      pal: P({ fur: hex('#ffcf4a'), fur2: hex('#fff0b0'), hat: hex('#c9971a'), hatBand: hex('#8a660a'), gem: hex('#ffffff'), collar: hex('#a8791a'), eye: hex('#4a2a10'), whisker: hex('#fffbe0') })
    },
    {
      id: 'sneg_newyear', warm: 3, cat: 'sneg', name: 'Снежок — Новогодний', icon: '🎄',
      rarity: 'rare', price: 900, desc: 'Красный колпак, шарф и рожки-веточки. С праздником!',
      build: { hat: 'antler', neck: 'scarf', tail: 'fluffy' },
      pal: P({ fur: hex('#ffffff'), fur2: hex('#e8f4ff'), hat: hex('#d03a3a'), hatBand: hex('#ffffff'), horn: hex('#3a7a3a'), gem: hex('#ffd23a'), collar: hex('#d03a3a'), eye: hex('#3aa6ff') })
    },
    {
      id: 'ugol_neon', cat: 'ugol', name: 'Уголёк — Неон', icon: '🌃',
      rarity: 'epic', price: 1900, desc: 'Кислотные полосы, визор и светящийся хвост.',
      build: { eye: 'visor', tail: 'wisp', ear: 'big' },
      pal: P({ fur: hex('#14141f'), fur2: hex('#2a2a3a'), ear: hex('#ff2a8a'), eye: hex('#3affe8'), eyeShine: hex('#ffffff'), hat: hex('#1a1a2a'), hatBand: hex('#3affe8'), gem: hex('#ff2a8a'), collar: hex('#3affe8') })
    },
    {
      id: 'plamya_ash', warm: -3, cat: 'plamya', name: 'Пламя — Пепел', icon: '🌋',
      rarity: 'epic', price: 2000, desc: 'Погасший огонь: угольная шерсть и тлеющие трещины.',
      build: { ear: 'horn', tail: 'fork' },
      pal: P({ fur: hex('#2a1a18'), fur2: hex('#ff5a2a'), ear: hex('#ff8a4a'), eye: hex('#ffd23a'), horn: hex('#1a0e0c'), hat: hex('#3a1a10'), hatBand: hex('#ff5a2a'), gem: hex('#ffd23a'), collar: hex('#5a2010') })
    },
    {
      id: 'dym_ninja', warm: -1, cat: 'dym', name: 'Дымка — Тень', icon: '🥷',
      rarity: 'epic', price: 1700, desc: 'Полностью чёрный костюм и алый шарф.',
      build: { hat: 'hood', neck: 'scarf', tail: 'thin', eye: 'visor' },
      pal: P({ fur: hex('#1e1e2a'), fur2: hex('#33334a'), eye: hex('#ff2a5a'), hat: hex('#12121c'), hatBand: hex('#ff2a5a'), gem: hex('#ff2a5a'), collar: hex('#c02a4a') })
    },
    {
      id: 'zolot_royal', cat: 'zolot', name: 'Златыш — Королевский', icon: '👑',
      rarity: 'legendary', price: 3200, desc: 'Пурпурная мантия, корона и перьевые крылья.',
      build: { hat: 'crown', wings: 'feather', neck: 'scarf', tail: 'fluffy' },
      pal: P({ fur: hex('#ffd24a'), fur2: hex('#fff4c8'), hat: hex('#ffd23a'), hatBand: hex('#6a1a8a'), gem: hex('#ff5a8a'), collar: hex('#6a1a8a'), wing: hex('#fff0c0'), eye: hex('#6a1a8a') })
    },
    {
      id: 'prizrak_deep', warm: -2, cat: 'prizrak', name: 'Призрак — Глубина', icon: '🌊',
      rarity: 'epic', price: 1900, desc: 'Призрак цвета морской бездны, с плавниками.',
      build: { ear: 'fin', tail: 'wisp' },
      pal: P({ fur: hex('#2a6a8a'), fur2: hex('#8ae0ff'), ear: hex('#7affe0'), eye: hex('#c0ffff'), hat: hex('#1a4a6a'), hatBand: hex('#0a2a3a'), gem: hex('#7affe0'), collar: hex('#1a4a6a') })
    },
    {
      id: 'radug_mono', cat: 'radug', name: 'Радужка — Монохром', icon: '⚫',
      rarity: 'legendary', price: 3400, desc: 'Радужка без единого цвета — только чёрное и белое. И это красиво.',
      build: { hat: 'crown', wings: 'crystal', tail: 'fluffy' },
      pal: P({ fur: hex('#f0f0f4'), fur2: hex('#1a1a1e'), ear: hex('#8a8a90'), eye: hex('#1a1a1e'), hat: hex('#1a1a1e'), hatBand: hex('#f0f0f4'), gem: hex('#ffffff'), collar: hex('#1a1a1e'), wing: hex('#d0d0d8') })
    },
    {
      id: 'demon_ice', warm: 4, cat: 'demon', name: 'Багрян — Ледяной', icon: '🧊',
      rarity: 'mythic', price: 2900, desc: 'Демон, вмёрзший в лёд. Рога и крылья стали хрустальными.',
      build: { ear: 'horn', wings: 'crystal', tail: 'fork' },
      pal: P({ fur: hex('#3a6a9a'), fur2: hex('#c0f0ff'), eye: hex('#ffffff'), horn: hex('#c0f0ff'), wing: hex('#a8e0ff'), gem: hex('#ffffff'), collar: hex('#1a3a5a') })
    }
  ];

  // ============================================================
  //  НАБОРЫ ПЕРСОНАЖЕЙ
  // ============================================================
  const PACKS = [
    {
      id: 'starter', name: 'Набор Новичка', icon: '🎁', price: 900,
      desc: 'Три обычных кота сразу и немного припасов. Дешевле, чем поодиночке.',
      rarities: ['common', 'common', 'common'],
      extra: [{ type: 'item', id: 'potHp', n: 3 }, { type: 'coins', n: 200 }]
    },
    {
      id: 'element', name: 'Набор Стихий', icon: '🔥', price: 2600,
      desc: 'Два редких и один эпический кот. Для тех, кто хочет разнообразия.',
      rarities: ['rare', 'rare', 'epic'],
      extra: [{ type: 'item', id: 'egg', n: 1 }]
    },
    {
      id: 'wardrobe', name: 'Набор Модника', icon: '🧣', price: 2200,
      desc: 'Три случайных аксессуара и один костюм. Наряжаемся!',
      accs: 3, skins: 1
    },
    {
      id: 'hero', name: 'Геройский Набор', icon: '🦸', price: 5200,
      desc: 'Эпический и мифический коты, аксессуар и приличная горсть монет.',
      rarities: ['epic', 'mythic'], accs: 1,
      extra: [{ type: 'coins', n: 800 }]
    },
    {
      id: 'legend', name: 'Легендарный Набор', icon: '🌟', price: 11000,
      desc: 'Гарантированно легендарный кот, ещё мифический, два аксессуара и костюм.',
      rarities: ['mythic', 'legendary'], accs: 2, skins: 1,
      extra: [{ type: 'item', id: 'egg', n: 2 }]
    }
  ];

  const ACC_BY = {}; ACC.forEach(a => ACC_BY[a.id] = a);
  const PET_ACC_BY = {}; PET_ACC.forEach(a => PET_ACC_BY[a.id] = a);
  const SKIN_BY = {}; SKINS.forEach(s => SKIN_BY[s.id] = s);
  const PACK_BY = {}; PACKS.forEach(p => PACK_BY[p.id] = p);

  KM.ACC = ACC; KM.ACC_BY = ACC_BY;
  KM.PET_ACC = PET_ACC; KM.PET_ACC_BY = PET_ACC_BY;
  KM.SKINS = SKINS; KM.SKIN_BY = SKIN_BY;
  KM.PACKS = PACKS; KM.PACK_BY = PACK_BY;
  KM.ACC_SLOTS = [
    { id: 'head', name: 'Голова', icon: '🎩' },
    { id: 'face', name: 'Морда', icon: '🕶️' },
    { id: 'neck', name: 'Шея', icon: '🧣' },
    { id: 'back', name: 'Спина', icon: '🦸' }
  ];
})(window);
