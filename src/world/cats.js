/* ============================================================
   КОТИКИ МАГИ 3D — персонажи
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const hex = KM.hex;

  // ------------------------------------------------------------
  //  РЕДКОСТИ
  // ------------------------------------------------------------
  const RARITY = {
    common: { id: 'common', name: 'Обычный', color: '#4ade5a', glow: '#8fffa0', weight: 46, order: 0 },
    rare: { id: 'rare', name: 'Редкий', color: '#4ac8ff', glow: '#a8e8ff', weight: 25, order: 1 },
    epic: { id: 'epic', name: 'Эпический', color: '#a45aff', glow: '#d8b0ff', weight: 14, order: 2 },
    mythic: { id: 'mythic', name: 'Мифический', color: '#ff3a4a', glow: '#ffa0a8', weight: 7.5, order: 3 },
    legendary: { id: 'legendary', name: 'Легендарный', color: '#ffd23a', glow: '#fff0a0', weight: 4.5, order: 4 },
    mystic: { id: 'mystic', name: 'Мистический', color: '#2a4aff', glow: '#8098ff', weight: 2.4, order: 5 },
    secret: { id: 'secret', name: 'СЕКРЕТ', color: '#d8dde8', glow: '#ffffff', weight: 0.6, order: 6, shimmer: true }
  };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'mythic', 'legendary', 'mystic', 'secret'];

  // базовая палитра — недостающие ключи подставляются автоматически
  const BASE_PAL = {
    fur: hex('#c8c8c8'), fur2: hex('#eeeeee'), ear: hex('#ff9ec2'),
    eye: hex('#2ec27e'), eyeShine: hex('#ffffff'), nose: hex('#d4557a'),
    hat: hex('#5b4bd6'), hatBand: hex('#372a9e'), gem: hex('#7ce8ff'),
    collar: hex('#b03a5b'), whisker: hex('#fff3e0'),
    horn: hex('#f0e6d0'), wing: hex('#dfe8ff'), metal: hex('#c8ccd8')
  };

  function P(o) { return Object.assign({}, BASE_PAL, o); }

  // ------------------------------------------------------------
  //  ПЕРСОНАЖИ
  // ------------------------------------------------------------
  const CATS = [
    // ---------------- ОБЫЧНЫЕ ----------------
    {
      id: 'muri', name: 'Мури', rarity: 'common', price: 0, unlocked: true,
      desc: 'Рыжий ученик магии. Верный друг с самого первого дня.',
      build: { ear: 'normal', tail: 'normal', hat: 'wizard', eye: 'round', neck: 'collar' },
      pal: P({ fur: hex('#e8944a'), fur2: hex('#ffd9a8'), eye: hex('#2ec27e'), hat: hex('#5b4bd6'), hatBand: hex('#372a9e'), gem: hex('#7ce8ff'), collar: hex('#b03a5b') }),
      bonus: { hp: 0, dmg: 0, spd: 0, mana: 0 }
    },
    {
      id: 'polos', name: 'Полосатик', rarity: 'common', price: 250,
      desc: 'Быстрый лесной охотник с кисточками на ушах.',
      build: { ear: 'tuft', tail: 'thin', hat: 'cap', eye: 'round', neck: 'collar', legs: 1.1 },
      pal: P({ fur: hex('#8a7a52'), fur2: hex('#ded0a8'), eye: hex('#9de03a'), hat: hex('#3f7a3a'), hatBand: hex('#27512a'), gem: hex('#c6ff7a'), collar: hex('#6b5a34') }),
      bonus: { hp: 0, dmg: 0, spd: 0.12, mana: 0 }
    },
    {
      id: 'molok', warm: 2, name: 'Молочко', rarity: 'common', price: 250,
      desc: 'Пухлый домашний кот. Крепче, чем кажется.',
      build: { ear: 'round', tail: 'stub', hat: 'none', eye: 'sleepy', neck: 'bell', chub: 1.2, legs: 0.85 },
      pal: P({ fur: hex('#fff4e0'), fur2: hex('#ffe4c0'), eye: hex('#6ab0ff'), gem: hex('#ffd66a'), collar: hex('#e07a9a') }),
      bonus: { hp: 25, dmg: 0, spd: -0.05, mana: 0 }
    },
    {
      id: 'ugol', name: 'Уголёк', rarity: 'common', price: 300,
      desc: 'Чёрный как ночь. Магия в его лапах бьёт сильнее.',
      build: { ear: 'normal', tail: 'fluffy', hat: 'wizard', eye: 'round', neck: 'collar' },
      pal: P({ fur: hex('#2f2b45'), fur2: hex('#4a4468'), ear: hex('#b05a86'), eye: hex('#ffb43a'), hat: hex('#7a2fb0'), hatBand: hex('#4d1a75'), gem: hex('#ff9d3a'), collar: hex('#6d2f5a') }),
      bonus: { hp: 0, dmg: 4, spd: 0, mana: 0 }
    },
    {
      id: 'sneg', warm: 3, coldImmune: true, name: 'Снежок', rarity: 'common', price: 300,
      desc: 'Белоснежный маг льда. Мана течёт быстрее.',
      build: { ear: 'round', tail: 'fluffy', hat: 'hood', eye: 'wide', neck: 'scarf' },
      pal: P({ fur: hex('#f2f6ff'), fur2: hex('#d5e2f5'), eye: hex('#3aa6ff'), hat: hex('#2e7fd6'), hatBand: hex('#1d5194'), gem: hex('#c9f4ff'), collar: hex('#3b6fb5') }),
      bonus: { hp: 0, dmg: 0, spd: 0, mana: 25 }
    },

    // ---------------- РЕДКИЕ ----------------
    {
      id: 'dym', name: 'Дымка', rarity: 'rare', price: 600,
      desc: 'Серая тень. Ходит тише всех и лучше прячется в кустах.',
      build: { ear: 'big', tail: 'thin', hat: 'hood', eye: 'sleepy', neck: 'none', chub: 0.92 },
      pal: P({ fur: hex('#8d94a8'), fur2: hex('#c3c9d8'), eye: hex('#c96aff'), hat: hex('#5a5f78'), hatBand: hex('#3a3e52'), gem: hex('#d6a8ff'), collar: hex('#6a5a78') }),
      bonus: { hp: 0, dmg: 0, spd: 0.05, mana: 10 }, stealth: 0.45
    },
    {
      id: 'more', warm: -2, name: 'Морик', rarity: 'rare', price: 700,
      desc: 'Кот приливов с плавниками вместо ушей. В воде как дома.',
      build: { ear: 'fin', tail: 'fork', hat: 'none', eye: 'wide', neck: 'collar' },
      pal: P({ fur: hex('#3aa0b8'), fur2: hex('#a8e8f0'), ear: hex('#7ae0ff'), eye: hex('#ffe86a'), gem: hex('#7affe0'), collar: hex('#2a7a90') }),
      bonus: { hp: 10, dmg: 0, spd: 0.08, mana: 15 }
    },
    {
      id: 'listok', name: 'Листик', rarity: 'rare', price: 700,
      desc: 'Друид с рожками-веточками. Лечится сам собой.',
      build: { ear: 'long', tail: 'fluffy', hat: 'antler', eye: 'round', neck: 'scarf' },
      pal: P({ fur: hex('#6aa84a'), fur2: hex('#c8e8a0'), eye: hex('#ffd06a'), horn: hex('#8a6a3a'), hat: hex('#3a6a2a'), gem: hex('#a8ff6a'), collar: hex('#4a8a3a') }),
      bonus: { hp: 20, dmg: 0, spd: 0, mana: 15 }, regen: 1.6
    },
    {
      id: 'plamya', warm: -3, heatImmune: true, name: 'Пламя', rarity: 'rare', price: 900,
      desc: 'Огненный дух в кошачьей шкуре. Шерсть тлеет угольками.',
      build: { ear: 'tuft', tail: 'fluffy', hat: 'wizard', eye: 'round', neck: 'collar' },
      pal: P({ fur: hex('#ff6a2a'), fur2: hex('#ffc46a'), ear: hex('#ffd08a'), eye: hex('#fff06a'), hat: hex('#b32a12'), hatBand: hex('#7a1a0a'), gem: hex('#fff06a'), collar: hex('#8a2a12') }),
      bonus: { hp: 10, dmg: 6, spd: 0, mana: 0 }, glow: 0.25, aura: 'fire'
    },
    {
      id: 'iney', warm: 3, coldImmune: true, name: 'Иней', rarity: 'rare', price: 900,
      desc: 'Ледяной страж в шлеме. Тяжёлый, но почти неуязвимый.',
      build: { ear: 'round', tail: 'stub', hat: 'helm', eye: 'visor', neck: 'chain', chub: 1.15 },
      pal: P({ fur: hex('#a8d8f0'), fur2: hex('#e8f8ff'), eye: hex('#3affe8'), hat: hex('#5f8fb8'), hatBand: hex('#3a6a8a'), gem: hex('#c0f8ff'), metal: hex('#b8d8e8') }),
      bonus: { hp: 40, dmg: 0, spd: -0.06, mana: 0 }, armor: 0.12, aura: 'ice'
    },

    // ---------------- ЭПИЧЕСКИЕ ----------------
    {
      id: 'prizrak', name: 'Призрак', rarity: 'epic', price: 1400,
      desc: 'Полупрозрачный кот-фантом с хвостом-дымкой. Монстры замечают его позже всех.',
      build: { ear: 'big', tail: 'wisp', hat: 'hood', eye: 'wide', neck: 'none', legs: 0.9 },
      pal: P({ fur: hex('#a8e0ff'), fur2: hex('#dff4ff'), ear: hex('#cfe8ff'), eye: hex('#ffffff'), eyeShine: hex('#8ad4ff'), hat: hex('#5fa8d8'), hatBand: hex('#3d7fa8'), gem: hex('#ffffff'), collar: hex('#4d90b8') }),
      bonus: { hp: -10, dmg: 3, spd: 0.1, mana: 30 }, alpha: 0.62, stealth: 0.6, glow: 0.2
    },
    {
      id: 'zolot', name: 'Златыш', rarity: 'epic', price: 1600,
      desc: 'Золотой кот удачи в короне. Монеты сами тянутся к нему.',
      build: { ear: 'normal', tail: 'fluffy', hat: 'crown', eye: 'round', neck: 'chain' },
      pal: P({ fur: hex('#ffd24a'), fur2: hex('#fff0b0'), ear: hex('#ffb0c8'), eye: hex('#4a2a10'), hat: hex('#c99a1a'), hatBand: hex('#8a660a'), gem: hex('#ffffff'), collar: hex('#a8791a'), metal: hex('#ffd66a') }),
      bonus: { hp: 0, dmg: 0, spd: 0, mana: 0 }, gold: 0.4, glow: 0.15
    },
    {
      id: 'grozzy', name: 'Грозя', rarity: 'epic', price: 1700,
      desc: 'Кот бури с рожками-разрядами. За ним потрескивает воздух.',
      build: { ear: 'horn', tail: 'fork', hat: 'none', eye: 'star', neck: 'collar', legs: 1.1 },
      pal: P({ fur: hex('#4a5a8a'), fur2: hex('#9ab0e8'), eye: hex('#ffe84a'), horn: hex('#ffe84a'), gem: hex('#ffe84a'), collar: hex('#2a3a6a') }),
      bonus: { hp: 0, dmg: 9, spd: 0.08, mana: 10 }, glow: 0.3, aura: 'spark'
    },
    {
      id: 'knizh', name: 'Книжник', rarity: 'epic', price: 1800,
      desc: 'Учёный кот с гримуаром за спиной. Заклинания перезаряжаются быстрее.',
      build: { ear: 'long', tail: 'thin', hat: 'wizard', eye: 'visor', neck: 'scarf', back: 'book' },
      pal: P({ fur: hex('#8a6ac0'), fur2: hex('#d8c8f0'), eye: hex('#6affd0'), hat: hex('#3a2a6a'), hatBand: hex('#241a44'), gem: hex('#6affd0'), collar: hex('#5a3a8a') }),
      bonus: { hp: 0, dmg: 5, spd: 0, mana: 45 }, cdr: 0.12
    },
    {
      id: 'rycar', name: 'Сэр Мурчалот', rarity: 'epic', price: 2000,
      desc: 'Кот-рыцарь с мечом за спиной. Удар лапой у него как удар молота.',
      build: { ear: 'round', tail: 'stub', hat: 'helm', eye: 'visor', neck: 'chain', back: 'sword', chub: 1.15, legs: 1.05 },
      pal: P({ fur: hex('#9aa0b0'), fur2: hex('#d8dce8'), eye: hex('#ff6a4a'), hat: hex('#7a8090'), hatBand: hex('#c9a02a'), gem: hex('#ff8a4a'), metal: hex('#e0e4f0') }),
      bonus: { hp: 45, dmg: 10, spd: -0.04, mana: 0 }, armor: 0.15, claw: 0.35
    },

    // ---------------- МИФИЧЕСКИЕ ----------------
    {
      id: 'demon', warm: -3, heatImmune: true, name: 'Багрян', rarity: 'mythic', price: 2600,
      desc: 'Кот из огненной бездны: рога, перепончатые крылья и очень скверный характер.',
      build: { ear: 'horn', tail: 'fork', hat: 'none', eye: 'star', wings: 'bat', neck: 'chain', chub: 1.05 },
      pal: P({ fur: hex('#b02a2a'), fur2: hex('#ff7a5a'), eye: hex('#ffe03a'), horn: hex('#2a1010'), wing: hex('#6a1a1a'), gem: hex('#ff5a2a'), collar: hex('#5a1010') }),
      bonus: { hp: 20, dmg: 16, spd: 0.05, mana: 10 }, glow: 0.3, aura: 'fire'
    },
    {
      id: 'angel', warm: 2, name: 'Светлана', rarity: 'mythic', price: 2600,
      desc: 'Кошка-хранитель с нимбом и белыми крыльями. Раны затягиваются сами.',
      build: { ear: 'normal', tail: 'fluffy', hat: 'halo', eye: 'wide', wings: 'feather', neck: 'scarf' },
      pal: P({ fur: hex('#fff8e8'), fur2: hex('#ffffff'), ear: hex('#ffd0e0'), eye: hex('#6ac0ff'), wing: hex('#ffffff'), gem: hex('#fff0a0'), hat: hex('#ffe86a'), collar: hex('#ffd8a0') }),
      bonus: { hp: 55, dmg: 0, spd: 0, mana: 35 }, regen: 3.2, glow: 0.35
    },
    {
      id: 'nindzya', name: 'Тень Клинка', rarity: 'mythic', price: 2800,
      desc: 'Кот-ниндзя. Двигается так быстро, что остаётся лишь силуэт.',
      build: { ear: 'big', tail: 'thin', hat: 'hood', eye: 'visor', neck: 'scarf', back: 'sword', legs: 1.15, chub: 0.9 },
      pal: P({ fur: hex('#2a2a3a'), fur2: hex('#4a4a60'), eye: hex('#ff2a5a'), hat: hex('#1a1a26'), hatBand: hex('#ff2a5a'), gem: hex('#ff2a5a'), collar: hex('#c02a4a'), metal: hex('#8a90a0') }),
      bonus: { hp: 0, dmg: 14, spd: 0.24, mana: 0 }, stealth: 0.5, claw: 0.4
    },
    {
      id: 'void', name: 'Пустышка', rarity: 'mythic', price: 3000,
      desc: 'Кот из Бездны. Тела почти нет — только светящиеся глаза и хвост-дымка.',
      build: { ear: 'long', tail: 'wisp', hat: 'none', eye: 'star', neck: 'none', chub: 0.88 },
      pal: P({ fur: hex('#241a3a'), fur2: hex('#3a2a5a'), ear: hex('#7a4aa8'), eye: hex('#ff3a8a'), eyeShine: hex('#ffc0e0'), gem: hex('#ff3a8a'), collar: hex('#4a1a6a') }),
      bonus: { hp: 20, dmg: 10, spd: 0.08, mana: 20 }, alpha: 0.8, glow: 0.35, aura: 'void'
    },

    // ---------------- ЛЕГЕНДАРНЫЕ ----------------
    {
      id: 'radug', coldImmune: true, heatImmune: true, name: 'Радужка', rarity: 'legendary', price: 4000,
      desc: 'Легендарная кошка-волшебница. Шерсть переливается всеми цветами радуги.',
      build: { ear: 'big', tail: 'fluffy', hat: 'crown', eye: 'star', wings: 'crystal', neck: 'scarf' },
      pal: P({ fur: hex('#ff7ad0'), fur2: hex('#9df0ff'), ear: hex('#fff07a'), eye: hex('#7affc0'), hat: hex('#7a5aff'), hatBand: hex('#4a2ad0'), gem: hex('#ffffff'), collar: hex('#ff9ad0'), wing: hex('#c0f0ff') }),
      bonus: { hp: 30, dmg: 12, spd: 0.15, mana: 40 }, rainbow: true, glow: 0.3, aura: 'rainbow'
    },
    {
      id: 'drakon', warm: -2, heatImmune: true, name: 'Драконий Ус', rarity: 'legendary', price: 4400,
      desc: 'Полукот-полудракон: чешуя, рога и крылья. Дышит магией, а не воздухом.',
      build: { ear: 'horn', tail: 'fork', hat: 'antler', eye: 'star', wings: 'bat', neck: 'chain', chub: 1.2, legs: 1.1 },
      pal: P({ fur: hex('#2a8a5a'), fur2: hex('#8affc0'), eye: hex('#ffd23a'), horn: hex('#ffe8a0'), wing: hex('#1a5a3a'), gem: hex('#ffd23a'), collar: hex('#1a5a3a'), metal: hex('#ffd66a') }),
      bonus: { hp: 70, dmg: 20, spd: 0.05, mana: 25 }, armor: 0.14, glow: 0.25, aura: 'fire'
    },
    {
      id: 'zvezda', name: 'Звездочёт', rarity: 'legendary', price: 4600,
      desc: 'Кот, сотканный из ночного неба. В его шерсти видно созвездия.',
      build: { ear: 'long', tail: 'wisp', hat: 'wizard', eye: 'star', neck: 'scarf', back: 'book' },
      pal: P({ fur: hex('#1a1a4a'), fur2: hex('#4a4a9a'), ear: hex('#8a8aff'), eye: hex('#ffe8a0'), eyeShine: hex('#ffffff'), hat: hex('#0a0a2a'), hatBand: hex('#ffd23a'), gem: hex('#ffe8a0'), collar: hex('#2a2a6a') }),
      bonus: { hp: 20, dmg: 18, spd: 0.06, mana: 70 }, cdr: 0.18, glow: 0.4, aura: 'star'
    },

    // ---------------- МИСТИЧЕСКИЕ ----------------
    {
      id: 'chronos', coldImmune: true, heatImmune: true, name: 'Хронокот', rarity: 'mystic', price: 6500,
      desc: 'Кот вне времени. Заклинания у него готовы почти мгновенно.',
      build: { ear: 'fin', tail: 'thin', hat: 'halo', eye: 'visor', wings: 'crystal', neck: 'chain', back: 'book' },
      pal: P({ fur: hex('#2a4aff'), fur2: hex('#8aa0ff'), ear: hex('#c0d0ff'), eye: hex('#ffffff'), hat: hex('#6a8aff'), hatBand: hex('#1a2a8a'), gem: hex('#ffffff'), collar: hex('#1a2a8a'), wing: hex('#a0c0ff'), metal: hex('#d0d8ff') }),
      bonus: { hp: 40, dmg: 22, spd: 0.18, mana: 80 }, cdr: 0.3, glow: 0.45, aura: 'star'
    },
    {
      id: 'kosmo', coldImmune: true, name: 'Космокот', rarity: 'mystic', price: 7000,
      desc: 'Внутри него — целая галактика. Ходит по земле, но душой в космосе.',
      build: { ear: 'big', tail: 'wisp', hat: 'helm', eye: 'star', wings: 'bug', neck: 'scarf', chub: 1.1 },
      pal: P({ fur: hex('#140a2a'), fur2: hex('#5a2a8a'), ear: hex('#ff6ad0'), eye: hex('#7affe0'), hat: hex('#2a1a4a'), hatBand: hex('#7affe0'), gem: hex('#ff6ad0'), collar: hex('#3a1a5a'), wing: hex('#8a6aff') }),
      bonus: { hp: 60, dmg: 26, spd: 0.12, mana: 60 }, glow: 0.5, aura: 'void', gold: 0.3
    },

    // ---------------- СЕКРЕТ ----------------
    {
      id: 'sekret', coldImmune: true, heatImmune: true, name: '???', rarity: 'secret', price: null,
      desc: 'Никто не знает, откуда он взялся. Даже он сам. Серебристый силуэт, который то есть, то нет.',
      build: { ear: 'horn', tail: 'fork', hat: 'crown', eye: 'star', wings: 'crystal', neck: 'chain', back: 'sword', chub: 1.05, legs: 1.1 },
      pal: P({ fur: hex('#d8dde8'), fur2: hex('#ffffff'), ear: hex('#c0c8e0'), eye: hex('#ffffff'), eyeShine: hex('#c0e8ff'), hat: hex('#b8c0d8'), hatBand: hex('#8a94b0'), gem: hex('#ffffff'), collar: hex('#a0a8c0'), horn: hex('#ffffff'), wing: hex('#eef2ff'), metal: hex('#ffffff') }),
      bonus: { hp: 90, dmg: 34, spd: 0.22, mana: 90 },
      shimmer: true, glow: 0.6, armor: 0.2, cdr: 0.2, gold: 0.5, regen: 2, claw: 0.3, aura: 'rainbow'
    },

    // ---------------- ещё обычные и редкие для наполнения барабана ----------------
    {
      id: 'ryzhik', name: 'Рыжик', rarity: 'common', price: 250,
      desc: 'Обычный дворовый кот. Зато очень бодрый.',
      build: { ear: 'normal', tail: 'normal', hat: 'cap', eye: 'round', neck: 'none', legs: 1.05 },
      pal: P({ fur: hex('#d8863a'), fur2: hex('#f5d0a0'), eye: hex('#4ac86a'), hat: hex('#c04a2a'), hatBand: hex('#8a2a10'), gem: hex('#ffd06a'), collar: hex('#a04a2a') }),
      bonus: { hp: 8, dmg: 0, spd: 0.06, mana: 0 }
    },
    {
      id: 'nochka', warm: 1, name: 'Ночка', rarity: 'common', price: 300,
      desc: 'Тихая ночная кошка с большими ушами.',
      build: { ear: 'big', tail: 'thin', hat: 'none', eye: 'wide', neck: 'bell', chub: 0.95 },
      pal: P({ fur: hex('#3a3a5a'), fur2: hex('#6a6a8a'), ear: hex('#c88ab0'), eye: hex('#ffe86a'), gem: hex('#c0a0ff'), collar: hex('#5a3a7a') }),
      bonus: { hp: 0, dmg: 3, spd: 0.04, mana: 8 }, stealth: 0.2
    },
    {
      id: 'pushok', warm: 4, name: 'Пушок', rarity: 'rare', price: 650,
      desc: 'Гигантский пушистый кот. Толстая шерсть держит удар.',
      build: { ear: 'round', tail: 'fluffy', hat: 'none', eye: 'sleepy', neck: 'scarf', chub: 1.35, legs: 0.9, mane: true },
      pal: P({ fur: hex('#c8a878'), fur2: hex('#f0e0c0'), eye: hex('#8ac86a'), gem: hex('#ffd06a'), collar: hex('#8a6a4a') }),
      bonus: { hp: 55, dmg: 0, spd: -0.08, mana: 0 }, armor: 0.14
    },
    {
      id: 'iskorka', name: 'Искорка', rarity: 'rare', price: 800,
      desc: 'Крошечная кошка-фея с прозрачными крылышками.',
      build: { ear: 'long', tail: 'thin', hat: 'none', eye: 'star', wings: 'bug', neck: 'none', chub: 0.8, head: 1.1, legs: 0.85 },
      pal: P({ fur: hex('#ffb0e0'), fur2: hex('#fff0ff'), ear: hex('#ffe0f0'), eye: hex('#7affe0'), wing: hex('#c0f0ff'), gem: hex('#7affe0'), collar: hex('#ff8ac0') }),
      bonus: { hp: -5, dmg: 6, spd: 0.2, mana: 30 }, glow: 0.3, aura: 'star'
    },
    {
      id: 'bandit', name: 'Бандит', rarity: 'epic', price: 1500,
      desc: 'Кот-разбойник с рюкзаком добычи. Находит больше монет.',
      build: { ear: 'tuft', tail: 'fork', hat: 'cap', eye: 'visor', neck: 'scarf', back: 'pack', legs: 1.05 },
      pal: P({ fur: hex('#6a5a4a'), fur2: hex('#c0a888'), eye: hex('#ffd23a'), hat: hex('#3a2a1a'), hatBand: hex('#8a2a2a'), gem: hex('#ffd23a'), collar: hex('#8a2a2a') }),
      bonus: { hp: 15, dmg: 7, spd: 0.1, mana: 0 }, gold: 0.55, stealth: 0.25
    },
    {
      id: 'mumi', warm: -2, name: 'Мумикот', rarity: 'mythic', price: 2700,
      desc: 'Древний кот, обмотанный бинтами. Спал три тысячи лет и всё ещё зол.',
      build: { ear: 'normal', tail: 'stub', hat: 'crown', eye: 'star', neck: 'chain', chub: 1.1 },
      pal: P({ fur: hex('#e0d8b8'), fur2: hex('#fff8e0'), ear: hex('#c8a888'), eye: hex('#3affd0'), hat: hex('#c9a02a'), hatBand: hex('#0a0a1a'), gem: hex('#3affd0'), collar: hex('#8a7a4a'), metal: hex('#ffd66a') }),
      bonus: { hp: 65, dmg: 12, spd: -0.03, mana: 20 }, armor: 0.18, regen: 1.4, glow: 0.2
    }
  ];

  // сортировка по редкости для витрин
  CATS.forEach(c => { c.rar = RARITY[c.rarity] || RARITY.common; });

  KM.RARITY = RARITY;
  KM.RARITY_ORDER = RARITY_ORDER;
  KM.CATS = CATS;
  KM.CAT_BY = {};
  CATS.forEach(c => { KM.CAT_BY[c.id] = c; });

  /** Модель персонажа (строится один раз и кэшируется). */
  KM.catModel = function (cat) {
    if (!cat) cat = CATS[0];
    // buildCat сам кэширует по составу, поэтому скины и аксессуары
    // автоматически дают отдельную модель
    return KM.buildCat(cat.build || {});
  };
})(window);
