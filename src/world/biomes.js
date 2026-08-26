/* ============================================================
   КОТИКИ МАГИ 3D — биомы и таблица монстров
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const hex = KM.hex;

  // ------------------------------------------------------------
  //  МОНСТРЫ
  // ------------------------------------------------------------
  const MON = {
    slimeG: {
      id: 'slimeG', name: 'Слизень', model: 'slime', pal: 'slimeGreen', anim: 'blob',
      hp: 26, dmg: 6, speed: 1.5, detect: 11, leash: 20, atkR: 1.5, atkCD: 1.5,
      xp: 8, coins: 4, scale: 1, hop: true
    },
    slimeB: {
      id: 'slimeB', name: 'Водный слизень', model: 'slime', pal: 'slimeBlue', anim: 'blob',
      hp: 34, dmg: 8, speed: 1.7, detect: 12, leash: 22, atkR: 1.5, atkCD: 1.4,
      xp: 11, coins: 6, scale: 1.05, hop: true, resist: 'water'
    },
    slimeP: {
      id: 'slimeP', name: 'Магический слизень', model: 'slimeBig', pal: 'slimePurple', anim: 'blob',
      hp: 62, dmg: 12, speed: 1.5, detect: 13, leash: 24, atkR: 1.8, atkCD: 1.5,
      xp: 22, coins: 13, scale: 1.1, hop: true, big: true
    },
    slimeL: {
      id: 'slimeL', name: 'Лавовый слизень', model: 'slimeBig', pal: 'slimeLava', anim: 'blob',
      hp: 78, dmg: 17, speed: 1.8, detect: 14, leash: 24, atkR: 1.8, atkCD: 1.3,
      xp: 30, coins: 18, scale: 1.1, hop: true, big: true, resist: 'fire', burnAura: true
    },
    wolf: {
      id: 'wolf', name: 'Волк', model: 'wolf', pal: 'wolf', anim: 'quad',
      hp: 40, dmg: 11, speed: 3.5, detect: 16, leash: 30, atkR: 1.7, atkCD: 1.1,
      xp: 16, coins: 8, scale: 1, pack: true
    },
    wolfIce: {
      id: 'wolfIce', name: 'Ледяной волк', model: 'wolf', pal: 'wolfIce', anim: 'quad',
      hp: 58, dmg: 15, speed: 3.8, detect: 17, leash: 32, atkR: 1.7, atkCD: 1.0,
      xp: 24, coins: 13, scale: 1.05, pack: true, resist: 'ice', slowOnHit: true
    },
    boar: {
      id: 'boar', name: 'Кабан', model: 'boar', pal: 'boar', anim: 'quad',
      hp: 66, dmg: 16, speed: 2.6, detect: 12, leash: 26, atkR: 1.8, atkCD: 1.6,
      xp: 22, coins: 12, scale: 1.05, charge: true, big: true
    },
    goblin: {
      id: 'goblin', name: 'Гоблин', model: 'goblin', pal: 'goblin', anim: 'humanoid',
      hp: 34, dmg: 9, speed: 2.8, detect: 15, leash: 28, atkR: 1.6, atkCD: 1.2,
      xp: 13, coins: 9, scale: 1
    },
    orc: {
      id: 'orc', name: 'Орк', model: 'orc', pal: 'orc', anim: 'humanoid',
      hp: 96, dmg: 21, speed: 2.4, detect: 15, leash: 28, atkR: 2.0, atkCD: 1.7,
      xp: 38, coins: 24, scale: 1, big: true
    },
    skeleton: {
      id: 'skeleton', name: 'Скелет', model: 'skeleton', pal: 'skeleton', anim: 'humanoid',
      hp: 44, dmg: 13, speed: 2.5, detect: 16, leash: 30, atkR: 1.7, atkCD: 1.1,
      xp: 18, coins: 11, scale: 1, resist: 'ice'
    },
    imp: {
      id: 'imp', name: 'Бесёнок', model: 'imp', pal: 'imp', anim: 'humanoid',
      hp: 30, dmg: 10, speed: 3.2, detect: 17, leash: 30, atkR: 8, atkCD: 1.8,
      xp: 17, coins: 12, scale: 1, ranged: true, projColor: [1, 0.4, 0.15], resist: 'fire'
    },
    bat: {
      id: 'bat', name: 'Мышь-нетопырь', model: 'bat', pal: 'bat', anim: 'bat',
      hp: 20, dmg: 7, speed: 4.0, detect: 14, leash: 26, atkR: 1.4, atkCD: 0.9,
      xp: 10, coins: 6, scale: 1, flying: true, hover: 1.4, erratic: true
    },
    batFire: {
      id: 'batFire', name: 'Пепельный нетопырь', model: 'bat', pal: 'batFire', anim: 'bat',
      hp: 32, dmg: 12, speed: 4.4, detect: 15, leash: 28, atkR: 1.4, atkCD: 0.8,
      xp: 18, coins: 11, scale: 1.05, flying: true, hover: 1.6, erratic: true, resist: 'fire'
    },
    spider: {
      id: 'spider', name: 'Паук', model: 'spider', pal: 'spider', anim: 'spider',
      hp: 38, dmg: 12, speed: 3.4, detect: 15, leash: 26, atkR: 1.7, atkCD: 1.0,
      xp: 16, coins: 10, scale: 1, poisonOnHit: true
    },
    spiderIce: {
      id: 'spiderIce', name: 'Морозный паук', model: 'spider', pal: 'spiderIce', anim: 'spider',
      hp: 54, dmg: 15, speed: 3.2, detect: 15, leash: 26, atkR: 1.7, atkCD: 1.0,
      xp: 24, coins: 15, scale: 1.05, resist: 'ice', slowOnHit: true
    },
    wisp: {
      id: 'wisp', name: 'Блуждающий огонёк', model: 'wisp', pal: 'wisp', anim: 'float',
      hp: 26, dmg: 9, speed: 2.9, detect: 16, leash: 30, atkR: 9, atkCD: 2.0,
      xp: 15, coins: 10, scale: 1, flying: true, hover: 1.2, ranged: true, projColor: [0.5, 0.9, 1]
    },
    shade: {
      id: 'shade', name: 'Тень', model: 'shade', pal: 'shade', anim: 'float',
      hp: 62, dmg: 18, speed: 3.0, detect: 18, leash: 34, atkR: 2.0, atkCD: 1.2,
      xp: 32, coins: 20, scale: 1, flying: true, hover: 0.9, phase: true, big: true
    },
    ghost: {
      id: 'ghost', name: 'Привидение', model: 'ghost', pal: 'ghost', anim: 'float',
      hp: 44, dmg: 14, speed: 2.6, detect: 17, leash: 30, atkR: 1.9, atkCD: 1.3,
      xp: 24, coins: 15, scale: 1, flying: true, hover: 1.0, phase: true
    },
    golem: {
      id: 'golem', name: 'Каменный страж', model: 'golem', pal: 'golem', anim: 'golem',
      hp: 130, dmg: 24, speed: 1.7, detect: 13, leash: 24, atkR: 2.4, atkCD: 2.0,
      xp: 48, coins: 32, scale: 1, big: true, armor: 0.25
    },
    golemC: {
      id: 'golemC', name: 'Кристальный страж', model: 'golem', pal: 'golemCrystal', anim: 'golem',
      hp: 170, dmg: 28, speed: 1.9, detect: 14, leash: 26, atkR: 2.4, atkCD: 1.9,
      xp: 62, coins: 42, scale: 1.05, big: true, armor: 0.3
    },
    golemV: {
      id: 'golemV', name: 'Страж Бездны', model: 'golem', pal: 'golemVoid', anim: 'golem',
      hp: 220, dmg: 34, speed: 2.1, detect: 16, leash: 28, atkR: 2.5, atkCD: 1.8,
      xp: 88, coins: 60, scale: 1.1, big: true, armor: 0.35
    },
    mushman: {
      id: 'mushman', name: 'Грибник', model: 'goblin', pal: 'mush', anim: 'humanoid',
      hp: 50, dmg: 13, speed: 2.2, detect: 13, leash: 24, atkR: 1.6, atkCD: 1.3,
      xp: 20, coins: 13, scale: 1.1, poisonOnHit: true
    },
    sandman: {
      id: 'sandman', name: 'Песчаный воин', model: 'skeleton', pal: 'sand', anim: 'humanoid',
      hp: 56, dmg: 15, speed: 2.7, detect: 15, leash: 28, atkR: 1.7, atkCD: 1.1,
      xp: 22, coins: 15, scale: 1.05
    }
  };

  // ------------------------------------------------------------
  //  БОССЫ (по одному на регион)
  // ------------------------------------------------------------
  const BOSSES = [
    { id: 'b1', name: 'Жирный Слизнекороль', model: 'bossBlob', pal: 'slimeGreen', anim: 'blob', hp: 420, dmg: 20, speed: 1.9, scale: 1.25, atkR: 3.2, atkCD: 1.6, xp: 260, coins: 220, attacks: ['slam', 'summon'], summon: 'slimeG' },
    { id: 'b2', name: 'Вожак Стаи Клык', model: 'bossQuad', pal: 'wolf', anim: 'quad', hp: 560, dmg: 26, speed: 4.4, scale: 1.15, atkR: 2.8, atkCD: 1.2, xp: 340, coins: 280, attacks: ['charge', 'summon'], summon: 'wolf' },
    { id: 'b3', name: 'Болотная Матка', model: 'bossSpider', pal: 'spider', anim: 'spider', hp: 700, dmg: 30, speed: 3.2, scale: 1.1, atkR: 3.0, atkCD: 1.3, xp: 430, coins: 350, attacks: ['volley', 'summon'], summon: 'spider' },
    { id: 'b4', name: 'Царь Песков', model: 'bossHuman', pal: 'sand', anim: 'humanoid', hp: 860, dmg: 35, speed: 3.0, scale: 1.1, atkR: 3.2, atkCD: 1.4, xp: 540, coins: 430, attacks: ['slam', 'volley'], summon: 'sandman' },
    { id: 'b5', name: 'Ледяной Владыка', model: 'bossQuad', pal: 'wolfIce', anim: 'quad', hp: 1020, dmg: 40, speed: 4.2, scale: 1.2, atkR: 3.0, atkCD: 1.2, xp: 660, coins: 520, attacks: ['charge', 'volley'], summon: 'wolfIce' },
    { id: 'b6', name: 'Магмовый Титан', model: 'bossGolem', pal: 'golem', anim: 'golem', hp: 1280, dmg: 46, speed: 2.3, scale: 1.15, atkR: 3.6, atkCD: 1.8, xp: 800, coins: 640, attacks: ['slam', 'summon'], summon: 'slimeL', armor: 0.3 },
    { id: 'b7', name: 'Кристальный Архонт', model: 'bossGolem', pal: 'golemCrystal', anim: 'golem', hp: 1520, dmg: 52, speed: 2.6, scale: 1.2, atkR: 3.6, atkCD: 1.7, xp: 960, coins: 760, attacks: ['volley', 'slam'], summon: 'golemC', armor: 0.32 },
    { id: 'b8', name: 'Королева Спор', model: 'bossHuman', pal: 'mush', anim: 'humanoid', hp: 1780, dmg: 58, speed: 3.2, scale: 1.2, atkR: 3.4, atkCD: 1.4, xp: 1120, coins: 880, attacks: ['volley', 'summon'], summon: 'mushman' },
    { id: 'b9', name: 'Небесный Странник', model: 'bossFloat', pal: 'wisp', anim: 'float', hp: 2050, dmg: 64, speed: 3.6, scale: 1.15, atkR: 10, atkCD: 1.5, xp: 1300, coins: 1000, attacks: ['volley', 'summon'], summon: 'wisp', ranged: true, flying: true, hover: 1.6 },
    { id: 'b10', name: 'Пустотный Пожиратель', model: 'bossGolem', pal: 'golemVoid', anim: 'golem', hp: 2600, dmg: 76, speed: 2.9, scale: 1.3, atkR: 4.0, atkCD: 1.5, xp: 1700, coins: 1400, attacks: ['slam', 'volley', 'summon'], summon: 'golemV', armor: 0.35 },
    { id: 'b11', name: 'Ворчун с Крыш', model: 'bossHuman', pal: 'goblin', anim: 'humanoid', hp: 1180, dmg: 42, speed: 4.6, scale: 1.1, atkR: 3.0, atkCD: 1.1, xp: 880, coins: 700, attacks: ['charge', 'summon'], summon: 'goblin' },
    { id: 'b12', name: 'Хозяин Тьмы', model: 'bossSpider', pal: 'spider', anim: 'spider', hp: 1680, dmg: 55, speed: 3.6, scale: 1.2, atkR: 3.4, atkCD: 1.3, xp: 1150, coins: 900, attacks: ['volley', 'summon'], summon: 'bat', armor: 0.25 },
    { id: 'b13', name: 'Фараон Мурмиас', model: 'bossHuman', pal: 'sand', anim: 'humanoid', hp: 2050, dmg: 62, speed: 3.2, scale: 1.25, atkR: 3.6, atkCD: 1.4, xp: 1400, coins: 1120, attacks: ['slam', 'volley', 'summon'], summon: 'sandman', armor: 0.3 }
  ];

  // ------------------------------------------------------------
  //  БИОМЫ
  // ------------------------------------------------------------
  const BIOMES = [
    {
      id: 'meadow', temp: 0, climateNote: 'Тепло и приятно', name: 'Солнечные Луга',
      skyTop: hex('#4aa8e8'), skyBot: hex('#bfe8ff'), fog: hex('#bfe8ff'), fogRange: [28, 78],
      sun: [0.62, 0.60, 0.50], ambTop: [0.48, 0.52, 0.58], ambBot: [0.24, 0.26, 0.30],
      ground: [hex('#63bf4a'), hex('#57ad42'), hex('#75cc58'), hex('#4f9c3c')],
      dirt: hex('#8a6a42'), rock: hex('#9aa0a8'),
      water: { level: 0.9, color: hex('#3aa8e0'), alpha: 0.62 },
      amp: 3.2, freq: 0.055, flatSpawn: true,
      props: { tree: 46, bush: 40, rock: 16, flower: 90, grass: 150, mushroom: 4, crystal: 0, torch: 3 },
      treeStyle: 'round', monsters: ['slimeG', 'bat', 'goblin', 'boar'],
      music: { root: 65.4, mood: 'calm' }
    },
    {
      id: 'forest', temp: 0, climateNote: 'Прохладная тень', name: 'Шёпот-Лес',
      skyTop: hex('#2f6f9a'), skyBot: hex('#8fc8b0'), fog: hex('#7ab89c'), fogRange: [20, 58],
      sun: [0.52, 0.55, 0.42], ambTop: [0.36, 0.44, 0.40], ambBot: [0.18, 0.22, 0.20],
      ground: [hex('#3f7a38'), hex('#356b30'), hex('#4a8c40'), hex('#2d5c2a')],
      dirt: hex('#5f4630'), rock: hex('#7a8078'),
      water: { level: 0.7, color: hex('#2f8ab0'), alpha: 0.6 },
      amp: 4.6, freq: 0.062, props: { tree: 120, bush: 66, rock: 20, flower: 40, grass: 130, mushroom: 26, crystal: 0, torch: 6 },
      treeStyle: 'pine', monsters: ['wolf', 'spider', 'goblin', 'bat', 'slimeG'],
      music: { root: 61.7, mood: 'calm' }
    },
    {
      id: 'swamp', temp: -1, climateNote: 'Сыро и зябко', name: 'Топи Тумана',
      skyTop: hex('#3a4a3a'), skyBot: hex('#7a8a62'), fog: hex('#6a7a58'), fogRange: [12, 44],
      sun: [0.40, 0.44, 0.34], ambTop: [0.30, 0.36, 0.30], ambBot: [0.16, 0.20, 0.16],
      ground: [hex('#4a5a34'), hex('#3f4e2c'), hex('#586a3e'), hex('#354224')],
      dirt: hex('#42361f'), rock: hex('#6a7060'),
      water: { level: 1.5, color: hex('#4a7a3a'), alpha: 0.72 },
      amp: 2.4, freq: 0.07, props: { tree: 70, bush: 80, rock: 14, flower: 20, grass: 90, mushroom: 50, crystal: 0, torch: 10 },
      treeStyle: 'dead', monsters: ['spider', 'slimeB', 'ghost', 'mushman', 'wolf'],
      music: { root: 58.3, mood: 'calm' }
    },
    {
      id: 'desert', temp: 3, climateNote: 'Палящее солнце', name: 'Пески Забвения',
      skyTop: hex('#e8a84a'), skyBot: hex('#ffe8b0'), fog: hex('#f0d49a'), fogRange: [30, 88],
      sun: [0.78, 0.70, 0.52], ambTop: [0.56, 0.52, 0.44], ambBot: [0.30, 0.27, 0.22],
      ground: [hex('#e0c078'), hex('#d4b268'), hex('#eccf8c'), hex('#c8a45c')],
      dirt: hex('#b08a4a'), rock: hex('#b0a080'),
      water: null,
      amp: 4.0, freq: 0.045, props: { tree: 14, bush: 22, rock: 40, flower: 8, grass: 30, mushroom: 0, crystal: 6, torch: 8 },
      treeStyle: 'cactus', monsters: ['sandman', 'skeleton', 'spider', 'boar', 'imp'],
      music: { root: 69.3, mood: 'calm' }
    },
    {
      id: 'frost', temp: -5, climateNote: 'Лютый мороз', name: 'Вечные Снега',
      skyTop: hex('#6a9ad8'), skyBot: hex('#dff0ff'), fog: hex('#d8ecff'), fogRange: [22, 66],
      sun: [0.66, 0.70, 0.80], ambTop: [0.50, 0.56, 0.66], ambBot: [0.28, 0.32, 0.40],
      ground: [hex('#e8f2ff'), hex('#d8e8fa'), hex('#f4faff'), hex('#c8dcf0')],
      dirt: hex('#8aa0b8'), rock: hex('#9aaabb'),
      water: { level: 0.8, color: hex('#7ad0f0'), alpha: 0.55 },
      amp: 5.4, freq: 0.05, props: { tree: 54, bush: 26, rock: 28, flower: 10, grass: 40, mushroom: 0, crystal: 12, torch: 8 },
      treeStyle: 'snowpine', monsters: ['wolfIce', 'spiderIce', 'skeleton', 'batFire', 'golem'],
      music: { root: 73.4, mood: 'calm' }
    },
    {
      id: 'volcano', temp: 5, climateNote: 'Обжигающий жар', name: 'Огненные Недра',
      skyTop: hex('#5a1a12'), skyBot: hex('#e8622a'), fog: hex('#8a3018'), fogRange: [16, 52],
      sun: [0.70, 0.42, 0.26], ambTop: [0.42, 0.28, 0.22], ambBot: [0.26, 0.14, 0.12],
      ground: [hex('#4a3a38'), hex('#3d2f2e'), hex('#5a4642'), hex('#332827')],
      dirt: hex('#2f2422'), rock: hex('#6a5a56'),
      water: { level: 1.2, color: hex('#ff7a2a'), alpha: 0.85, lava: true },
      amp: 5.8, freq: 0.06, props: { tree: 10, bush: 12, rock: 46, flower: 6, grass: 20, mushroom: 0, crystal: 10, torch: 16 },
      treeStyle: 'dead', monsters: ['slimeL', 'imp', 'batFire', 'golem', 'orc'],
      music: { root: 51.9, mood: 'battle' }
    },
    {
      id: 'crystal', temp: -2, climateNote: 'Холод пещер', name: 'Кристальные Пещеры',
      skyTop: hex('#241a4a'), skyBot: hex('#6a4ac0'), fog: hex('#3a2a6a'), fogRange: [18, 56],
      sun: [0.48, 0.44, 0.72], ambTop: [0.36, 0.34, 0.56], ambBot: [0.20, 0.18, 0.34],
      ground: [hex('#4a3a72'), hex('#3f3062'), hex('#5a4a86'), hex('#342a56')],
      dirt: hex('#2a2044'), rock: hex('#6a5a9a'),
      water: { level: 0.9, color: hex('#7a6aff'), alpha: 0.6 },
      amp: 6.2, freq: 0.058, props: { tree: 8, bush: 18, rock: 30, flower: 14, grass: 30, mushroom: 8, crystal: 70, torch: 14 },
      treeStyle: 'crystal', monsters: ['golemC', 'wisp', 'spiderIce', 'shade', 'skeleton'],
      music: { root: 82.4, mood: 'calm' }
    },
    {
      id: 'mushroom', temp: 1, climateNote: 'Влажно и тепло', name: 'Грибная Роща',
      skyTop: hex('#5a2a6a'), skyBot: hex('#e88ac0'), fog: hex('#c07aa8'), fogRange: [20, 60],
      sun: [0.62, 0.48, 0.60], ambTop: [0.44, 0.36, 0.48], ambBot: [0.24, 0.20, 0.28],
      ground: [hex('#6a4a7a'), hex('#5c4068'), hex('#7a588c'), hex('#4e3658')],
      dirt: hex('#3f2c4a'), rock: hex('#8a7a96'),
      water: { level: 0.9, color: hex('#c86ad0'), alpha: 0.6 },
      amp: 4.2, freq: 0.065, props: { tree: 30, bush: 44, rock: 16, flower: 40, grass: 90, mushroom: 110, crystal: 8, torch: 10 },
      treeStyle: 'mushtree', monsters: ['mushman', 'slimeP', 'spider', 'ghost', 'shade'],
      music: { root: 77.8, mood: 'calm' }
    },
    {
      id: 'sky', temp: -2, climateNote: 'Ледяной ветер высоты', name: 'Небесные Острова',
      skyTop: hex('#2a6ad8'), skyBot: hex('#c0e8ff'), fog: hex('#cfe8ff'), fogRange: [34, 100],
      sun: [0.74, 0.74, 0.68], ambTop: [0.56, 0.60, 0.68], ambBot: [0.30, 0.34, 0.40],
      ground: [hex('#7ad0a8'), hex('#68bd96'), hex('#8ee0ba'), hex('#58a882')],
      dirt: hex('#b0a888'), rock: hex('#c0c8d0'),
      water: null, islands: true,
      amp: 3.4, freq: 0.06, props: { tree: 40, bush: 30, rock: 18, flower: 60, grass: 100, mushroom: 6, crystal: 20, torch: 6 },
      treeStyle: 'round', monsters: ['wisp', 'batFire', 'ghost', 'golemC', 'orc'],
      music: { root: 87.3, mood: 'calm' }
    },
    {
      id: 'void', temp: -1, climateNote: 'Мертвящий холод Бездны', name: 'Бездна',
      skyTop: hex('#0a0614'), skyBot: hex('#2a1042'), fog: hex('#140a24'), fogRange: [14, 48],
      sun: [0.42, 0.30, 0.58], ambTop: [0.26, 0.20, 0.38], ambBot: [0.14, 0.10, 0.22],
      ground: [hex('#2a1e42'), hex('#221838'), hex('#362a52'), hex('#1a1230')],
      dirt: hex('#150e28'), rock: hex('#4a3a6a'),
      water: { level: 0.8, color: hex('#ff3a8a'), alpha: 0.5 },
      amp: 6.6, freq: 0.055, islands: true,
      props: { tree: 12, bush: 20, rock: 34, flower: 10, grass: 24, mushroom: 10, crystal: 44, torch: 20 },
      treeStyle: 'dead', monsters: ['golemV', 'shade', 'ghost', 'imp', 'orc'],
      music: { root: 49.0, mood: 'boss' }
    },
    {
      id: 'city', temp: 0, climateNote: 'Уютно, как дома', name: 'Кошачий Город',
      skyTop: hex('#3f7fc4'), skyBot: hex('#d8c8a8'), fog: hex('#cfc4b0'), fogRange: [34, 92],
      sun: [0.66, 0.62, 0.52], ambTop: [0.52, 0.54, 0.58], ambBot: [0.28, 0.29, 0.32],
      ground: [hex('#8d8a82'), hex('#7f7c74'), hex('#98958c'), hex('#74716a')],
      dirt: hex('#6a6058'), rock: hex('#a8a49a'),
      water: null,
      amp: 1.1, freq: 0.03, flatSpawn: true, town: true,
      props: { tree: 22, bush: 14, rock: 4, flower: 40, grass: 40, mushroom: 0, crystal: 0, torch: 0 },
      treeStyle: 'round', monsters: ['goblin', 'imp', 'slimeG', 'bat'],
      music: { root: 73.4, mood: 'calm' }
    },
    {
      id: 'cave', temp: -3, climateNote: 'Промозгло и темно', name: 'Глубокие Пещеры',
      skyTop: hex('#0a0810'), skyBot: hex('#141020'), fog: hex('#0b0912'), fogRange: [6, 24],
      sun: [0.05, 0.05, 0.07], ambTop: [0.09, 0.09, 0.13], ambBot: [0.04, 0.04, 0.06],
      ground: [hex('#4a4450'), hex('#413c48'), hex('#544e5c'), hex('#38333f')],
      dirt: hex('#332e3a'), rock: hex('#5e5768'),
      water: { level: 0.6, color: hex('#2a4a6a'), alpha: 0.7 },
      amp: 5.4, freq: 0.07,
      dark: true, lamp: { range: 17, power: 1.5, color: [1, 0.84, 0.55] },
      props: { tree: 0, bush: 0, rock: 46, flower: 0, grass: 0, mushroom: 30, crystal: 34, torch: 22 },
      treeStyle: 'round', monsters: ['bat', 'spider', 'skeleton', 'golem', 'shade'],
      music: { root: 51.9, mood: 'dark' }
    },
    {
      id: 'pyramid', temp: 4, climateNote: 'Сухой жар песков', name: 'Пирамиды Песка',
      skyTop: hex('#e0a860'), skyBot: hex('#f4dcae'), fog: hex('#e8cf9e'), fogRange: [26, 84],
      sun: [0.78, 0.68, 0.48], ambTop: [0.56, 0.50, 0.40], ambBot: [0.30, 0.26, 0.20],
      ground: [hex('#dcc286'), hex('#cfb277'), hex('#e6d097'), hex('#c2a468')],
      dirt: hex('#a8875a'), rock: hex('#c8ab72'),
      water: null,
      amp: 3.0, freq: 0.04, flatSpawn: true,
      props: { tree: 4, bush: 8, rock: 24, flower: 0, grass: 18, mushroom: 0, crystal: 0, torch: 10 },
      treeStyle: 'round', monsters: ['sandman', 'skeleton', 'spider', 'imp', 'golem'],
      music: { root: 58.3, mood: 'epic' }
    }
  ];

  // ---- голоса монстров (по модели) и музыкальные темы биомов ----
  const VOICE_BY_MODEL = {
    slime: 'slime', slimeBig: 'slime', bossBlob: 'slime',
    wolf: 'growl', boar: 'growl', bossQuad: 'growl',
    goblin: 'goblin', orc: 'goblin', bossHuman: 'goblin',
    skeleton: 'bone', imp: 'imp', bat: 'screech',
    spider: 'chitter', bossSpider: 'chitter',
    wisp: 'ghost', shade: 'ghost', ghost: 'ghost', bossFloat: 'ghost',
    golem: 'stone', bossGolem: 'stone'
  };
  Object.keys(MON).forEach(k => { MON[k].voice = MON[k].voice || VOICE_BY_MODEL[MON[k].model] || 'growl'; });
  BOSSES.forEach(b => { b.voice = VOICE_BY_MODEL[b.model] || 'boss'; b.big = true; });

  const TRACK_BY_BIOME = {
    meadow: 'calm', forest: 'calm', sky: 'calm',
    swamp: 'mystic', crystal: 'mystic', mushroom: 'mystic',
    desert: 'calm', frost: 'mystic',
    volcano: 'battle', void: 'battle',
    city: 'calm', cave: 'mystic', pyramid: 'mystic'
  };
  BIOMES.forEach(b => { b.track = TRACK_BY_BIOME[b.id] || 'calm'; });

  KM.MON = MON;
  KM.BOSSES = BOSSES;
  KM.BIOMES = BIOMES;

  /** Данные локации по её номеру. */
  // Локаций ровно столько, сколько краёв: по десять на каждый.
  KM.REGIONS = BIOMES.length;
  KM.LEVELS = BIOMES.length * 10;

  KM.locationInfo = function (i) {
    const region = Math.floor(i / 10);
    const b = BIOMES[region];
    const inRegion = i % 10;
    const isBoss = inRegion === 9;
    const hasCages = isBoss || inRegion === 4;
    const diff = 1 + i * 0.135 + region * 0.35;
    return {
      index: i, region, biome: b, isBoss, hasCages,
      cages: isBoss ? 3 : (hasCages ? 1 : 0),
      name: b.name + ' ' + (inRegion + 1),
      fullName: isBoss ? ('Логово: ' + BOSSES[region].name) : (b.name + ' — ' + (inRegion + 1)),
      difficulty: diff,
      monsterCount: isBoss ? (5 + Math.floor(region * 0.8)) : (6 + Math.floor(inRegion * 0.6) + Math.floor(region * 0.7)),
      boss: isBoss ? BOSSES[region] : null,
      chests: isBoss ? 3 : (1 + (inRegion % 3 === 2 ? 1 : 0)),
      reward: Math.floor(40 + i * 12 + (isBoss ? 300 : 0))
    };
  };
})(window);
