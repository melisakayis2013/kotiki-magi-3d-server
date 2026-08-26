/* ============================================================
   КОТИКИ МАГИ 3D — прогресс, предметы, заклинания, питомцы
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;
  const hex = KM.hex;

  // ------------------------------------------------------------
  //  ЗАКЛИНАНИЯ
  // ------------------------------------------------------------
  const SPELLS = [
    {
      id: 'fire', shape: 'fireball', spin: 9, wobble: 0.09, grav: -1.2, trail: 'ember', impact: 'burst', zoneStyle: 'flames', name: 'Огонь', icon: '🔥', el: 'fire', start: true,
      mana: 8, dmg: 16, cd: 0.55, speed: 17, radius: 2.0, zoneTime: 5.5, zone: 'fire',
      color: hex('#ff7a2a'), color2: hex('#ffd84a'),
      desc: 'Огненный шар. На месте попадания остаётся огонь, который жжёт врагов.'
    },
    {
      id: 'water', shape: 'droplet', spin: 2, stretch: 1.9, grav: -5.5, trail: 'drip', impact: 'splash', zoneStyle: 'puddle', name: 'Вода', icon: '💧', el: 'water', start: true,
      mana: 6, dmg: 11, cd: 0.45, speed: 20, radius: 2.4, zoneTime: 8, zone: 'water',
      color: hex('#3ab0f0'), color2: hex('#c0f0ff'),
      desc: 'Водный снаряд. Оставляет лужу: враги в ней замедлены и хуже сопротивляются магии.'
    },
    {
      id: 'ice', shape: 'shard', spin: 14, stretch: 2.4, grav: -3, trail: 'frost', impact: 'shatter', zoneStyle: 'crystal', name: 'Лёд', icon: '❄️', el: 'ice', start: true,
      mana: 10, dmg: 13, cd: 0.7, speed: 15, radius: 1.6, zoneTime: 9, zone: 'ice',
      color: hex('#9de8ff'), color2: hex('#ffffff'),
      desc: 'Ледяная глыба остаётся стоять на месте. Кто в неё попал — заморожен, медленнее и получает +35% урона.'
    },
    {
      id: 'spark', shape: 'bolt', spin: 0, instant: true, trail: 'arc', impact: 'zap', zoneStyle: 'arcs', name: 'Молния', icon: '⚡', el: 'air', price: 400, lvl: 4,
      mana: 14, dmg: 28, cd: 0.8, speed: 34, radius: 1.4, zoneTime: 1.6, zone: 'spark', chain: 3,
      color: hex('#ffe84a'), color2: hex('#ffffff'),
      desc: 'Молния бьёт мгновенно и перепрыгивает на соседних врагов. В воде урон удваивается.'
    },
    {
      id: 'poison', shape: 'cloud', spin: 1.2, grav: 0.6, drift: 1.4, trail: 'spore', impact: 'bloom', zoneStyle: 'fog', name: 'Ядовитый Туман', icon: '☠️', el: 'nature', price: 650, lvl: 7,
      mana: 16, dmg: 9, cd: 1.1, speed: 13, radius: 3.2, zoneTime: 10, zone: 'poison',
      color: hex('#8ae03a'), color2: hex('#d0ff8a'),
      desc: 'Облако яда, которое долго висит и медленно съедает здоровье врагов.'
    },
    {
      id: 'wind', shape: 'vortex', spin: 22, grav: 0, trail: 'gust', impact: 'blast', zoneStyle: 'swirl', name: 'Вихрь', icon: '🌪️', el: 'air', price: 800, lvl: 10,
      mana: 15, dmg: 18, cd: 0.9, speed: 22, radius: 3.4, zoneTime: 2.5, zone: 'wind', knock: 14,
      color: hex('#c0f0e0'), color2: hex('#ffffff'),
      desc: 'Мощный порыв отбрасывает врагов далеко назад и сбивает их с ног.'
    },
    {
      id: 'shadow', shape: 'blade', spin: 5, stretch: 3.2, grav: 0, trail: 'wisp', impact: 'rift', zoneStyle: 'rift', name: 'Теневой Шип', icon: '🌑', el: 'dark', price: 1100, lvl: 13,
      mana: 20, dmg: 46, cd: 1.0, speed: 28, radius: 1.5, zoneTime: 3, zone: 'shadow', pierce: true,
      color: hex('#a05aff'), color2: hex('#ff5ad0'),
      desc: 'Шип пронзает всех врагов на линии и оставляет пятно тьмы.'
    },
    {
      id: 'heal', shape: 'none', impact: 'bloom', zoneStyle: 'none', name: 'Исцеление', icon: '💚', el: 'light', price: 900, lvl: 12,
      mana: 26, dmg: 0, cd: 4.5, speed: 0, radius: 0, zoneTime: 0, zone: 'heal', heal: 45,
      color: hex('#7aff9a'), color2: hex('#ffffff'),
      desc: 'Тёплый свет восстанавливает здоровье и снимает яд и заморозку.'
    },
    {
      id: 'star', shape: 'star', spin: 7, grav: 0, trail: 'sparkle', impact: 'nova', zoneStyle: 'dust', name: 'Звёздный Луч', icon: '✨', el: 'light', price: 1500, lvl: 16,
      mana: 22, dmg: 54, cd: 0.85, speed: 40, radius: 2.2, zoneTime: 3, zone: 'star', homing: true,
      color: hex('#ffe8a0'), color2: hex('#ffffff'),
      desc: 'Луч сам находит цель и бьёт с небес. Оставляет светящуюся звёздную пыль.'
    },
    {
      id: 'stone', name: 'Камнепад', icon: '🪨', el: 'earth', price: 700, lvl: 6,
      shape: 'boulder', spin: 6, grav: -7, roll: true, rollTime: 2.6, trail: 'dust', zoneStyle: 'rubble',
      mana: 14, dmg: 30, cd: 0.9, speed: 15, radius: 2.4, zoneTime: 6, zone: 'rubble', knock: 11,
      color: hex('#8a7a68'), color2: hex('#c9b894'),
      desc: 'Валун падает и КАТИТСЯ по земле, сминая всех на пути. Оставляет каменное крошево, которое замедляет врагов.'
    },
    {
      id: 'spike', name: 'Каменные Шипы', icon: '⛰️', el: 'earth', price: 950, lvl: 9,
      shape: 'none', instant: 'spikes', zoneStyle: 'spikes',
      mana: 18, dmg: 40, cd: 1.4, speed: 0, radius: 2.2, zoneTime: 5, zone: 'spikes',
      color: hex('#9a8a72'), color2: hex('#dcc9a4'),
      desc: 'От вас к цели из земли вырастает дорожка каменных шипов и подбрасывает всех, кто на неё попал.'
    },
    {
      id: 'quake', name: 'Землетрясение', icon: '🌎', el: 'earth', price: 1700, lvl: 15,
      shape: 'none', instant: 'quake', zoneStyle: 'cracks',
      mana: 34, dmg: 58, cd: 2.8, speed: 0, radius: 7.5, zoneTime: 4.5, zone: 'cracks', stun: 1.7,
      color: hex('#a68c5e'), color2: hex('#ffd06a'),
      desc: 'Земля идёт трещинами во все стороны: всех вокруг оглушает, сбивает с ног и осыпает камнями.'
    },
    {
      id: 'mist', name: 'Туман', icon: '🌫️', el: 'air', price: 800, lvl: 8,
      shape: 'cloud', spin: 0.7, grav: 0, zoneStyle: 'mist',
      mana: 16, dmg: 0, cd: 5, speed: 13, radius: 5.5, zoneTime: 13, zone: 'mist',
      color: hex('#c6d2e0'), color2: hex('#ffffff'),
      desc: 'Густой туман: внутри вас не видно, а монстры слепнут и теряют след.'
    },
    {
      id: 'rain', name: 'Дождевая Туча', icon: '🌧️', el: 'water', price: 1300, lvl: 11,
      shape: 'none', instant: 'cloud', cloudKind: 'rain', cloudLife: 11, heal: 16,
      mana: 30, dmg: 22, cd: 8, speed: 0, radius: 6, zoneTime: 0, zone: 'none',
      color: hex('#7ab0e0'), color2: hex('#d2f0ff'),
      desc: 'Над целью повисает туча и поливает дождём: лечит вас и питомцев, гасит пожары и замедляет врагов.'
    },
    {
      id: 'storm', name: 'Гроза', icon: '⛈️', el: 'air', price: 2400, lvl: 18,
      shape: 'none', instant: 'cloud', cloudKind: 'storm', cloudLife: 9,
      mana: 44, dmg: 48, cd: 9, speed: 0, radius: 7, zoneTime: 0, zone: 'none',
      color: hex('#6a7ad0'), color2: hex('#ffe84a'),
      desc: 'Над целью собирается грозовая туча и снова и снова бьёт НАСТОЯЩИМИ молниями по всем, кто под ней.'
    },
    {
      id: 'telekinesis', name: 'Телекинез', icon: '🌀', el: 'arcane', price: 2000, lvl: 17,
      shape: 'none', instant: 'grab', grabRange: 17,
      mana: 26, dmg: 52, cd: 2.4, speed: 0, radius: 0, zoneTime: 0, zone: 'none',
      color: hex('#b06aff'), color2: hex('#ffd0ff'),
      desc: 'Поднимает врага в воздух силой мысли, крутит его — и швыряет туда, куда вы целитесь.'
    },
    {
      id: 'meteor', shape: 'rock', spin: 4, grav: 0, trail: 'ember', impact: 'crater', zoneStyle: 'flames', name: 'Метеор', icon: '☄️', el: 'fire', price: 2600, lvl: 20,
      mana: 42, dmg: 120, cd: 3.2, speed: 12, radius: 5.5, zoneTime: 7, zone: 'fire', quake: true,
      color: hex('#ff4a2a'), color2: hex('#ffd06a'),
      desc: 'С неба падает пылающая глыба. Огромный урон по площади и долгий пожар.'
    }
  ];
  const SPELL_BY = {}; SPELLS.forEach(s => SPELL_BY[s.id] = s);

  // ------------------------------------------------------------
  //  СПОСОБНОСТИ
  // ------------------------------------------------------------
  const ABILITIES = [
    // --- пассивные ---
    { id: 'dash', name: 'Рывок', icon: '💨', start: true, desc: 'Shift — быстрый рывок вперёд. Тратит энергию.' },
    { id: 'highjump', name: 'Высокий Прыжок', icon: '🦘', price: 300, desc: 'Прыжок становится в 1.5 раза выше.' },
    { id: 'doublejump', name: 'Воздушный Прыжок', icon: '🪽', price: 700, desc: 'Ещё один прыжок в воздухе (всего четыре) и все прыжки в воздухе выше.' },
    { id: 'magnet', name: 'Магнит Монет', icon: '🧲', price: 500, desc: 'Монеты и опыт сами летят к вам с большого расстояния.' },
    { id: 'ghoststep', name: 'Кошачья Скрытность', icon: '👣', price: 950, desc: 'В кустах вас почти невозможно заметить, и вы прячетесь мгновенно.' },
    { id: 'ninelives', name: 'Девять Жизней', icon: '🐈', price: 2200, desc: 'Раз за локацию воскресаете с половиной здоровья.' },
    { id: 'manaflow', name: 'Поток Маны', icon: '🔮', price: 750, desc: 'Мана восстанавливается вдвое быстрее.' },
    { id: 'quickpaws', name: 'Быстрые Лапки', icon: '🐾', price: 600, desc: 'Перезарядка всех заклинаний короче на 20%.' },
    { id: 'clawmaster', name: 'Мастер Когтей', icon: '🐅', price: 1000, desc: 'Удар лапой наносит вдвое больше урона и бьёт дальше.' },
    { id: 'ironfur', name: 'Железная Шёрстка', icon: '🪨', price: 1300, desc: 'Весь получаемый урон снижен на 20%.' },
    { id: 'featherfall', name: 'Кошачья Лапка', icon: '🪶', price: 450, desc: 'Кот всегда приземляется мягко: никакого урона от падения и медленное планирование.' },
    { id: 'wildheart', name: 'Дикое Сердце', icon: '❤️‍🔥', price: 1800, desc: 'Чем меньше здоровья, тем сильнее заклинания (до +50%).' },

    // --- активные: нажимаются клавишей, у каждой своя физика ---
    {
      id: 'shield', name: 'Магический Щит', icon: '🛡️', price: 850,
      active: true, key: 'KeyZ', keyName: 'Z', cd: 14, dur: 5, mana: 15,
      desc: 'Кокон из рун поглощает весь урон, пока держится.'
    },
    {
      id: 'invis', name: 'Плащ Невидимости', icon: '🫥', price: 1400,
      active: true, key: 'KeyX', keyName: 'X', cd: 26, dur: 9, mana: 25,
      desc: 'Кот становится прозрачным. Монстры перестают его видеть и теряют след — можно пройти мимо кого угодно.'
    },
    {
      id: 'haste', name: 'Кошачья Молния', icon: '⚡', price: 1200,
      active: true, key: 'KeyC', keyName: 'C', cd: 22, dur: 9, mana: 20,
      desc: 'Скорость почти вдвое выше, энергия не тратится, а за котом тянется шлейф из призрачных копий.'
    },
    {
      id: 'tornado', name: 'Торнадо', icon: '🌪️', price: 2000,
      active: true, key: 'KeyG', keyName: 'G', cd: 26, dur: 7, mana: 35,
      desc: 'Смерч уходит туда, куда вы целитесь: засасывает врагов внутрь, крутит, подбрасывает в воздух и тащит за собой.'
    },
    {
      id: 'armageddon', name: 'Армагеддон', icon: '☄️', price: 3200,
      active: true, key: 'KeyB', keyName: 'B', cd: 48, dur: 5, mana: 60,
      desc: 'Метеоритный дождь: с неба на выбранную область одна за другой падают горящие глыбы.'
    },
    {
      id: 'cloudwalk', name: 'Облачная Тропа', icon: '☁️', price: 2400,
      active: true, key: 'KeyJ', keyName: 'J', cd: 30, dur: 12, mana: 30,
      desc: 'Под лапами прямо в воздухе возникают облака — можно шагать по небу и мягко парить вниз.'
    },
    {
      id: 'bouncy', name: 'Супер-Прыгучесть', icon: '🦘', price: 1500,
      active: true, key: 'KeyN', keyName: 'N', cd: 24, dur: 12, mana: 20,
      desc: 'Кот становится как мячик: прыгает намного выше и сам отскакивает от земли при приземлении.'
    },
    {
      id: 'stormcall', name: 'Зов Бури', icon: '⛈️', price: 3400,
      active: true, key: 'KeyU', keyName: 'U', cd: 40, dur: 13, mana: 55,
      desc: 'Грозовая туча летит следом за вами и сама бьёт молниями во всех, кто подойдёт близко.'
    },
    {
      id: 'blackhole', name: 'Чёрная Дыра', icon: '🕳️', price: 3800,
      active: true, key: 'KeyH', keyName: 'H', cd: 45, dur: 5, mana: 70,
      desc: 'В точке прицела рождается дыра: стягивает всех врагов к себе, рвёт их на части и схлопывается взрывом.'
    }
  ];
  const ABIL_BY = {}; ABILITIES.forEach(a => ABIL_BY[a.id] = a);

  // ------------------------------------------------------------
  //  НАВЫКИ (за очки уровня)
  // ------------------------------------------------------------
  const SKILLS = [
    { id: 'vitality', name: 'Живучесть', icon: '❤️', max: 20, desc: '+12 к максимальному здоровью за уровень.' },
    { id: 'power', name: 'Сила Магии', icon: '🔮', max: 20, desc: '+7% к урону заклинаний за уровень.' },
    { id: 'claws', name: 'Острые Когти', icon: '🐾', max: 20, desc: '+8% к урону лапой за уровень.' },
    { id: 'stamina', name: 'Выносливость', icon: '⚡', max: 20, desc: '+10 энергии и быстрее отдых.' },
    { id: 'magic', name: 'Мана', icon: '💙', max: 20, desc: '+8 маны и +5% к восстановлению.' },
    { id: 'agility', name: 'Ловкость', icon: '🏃', max: 20, desc: '+2.5% к скорости бега.' },
    { id: 'luck', name: 'Удача', icon: '🍀', max: 20, desc: '+5% монет и шанса редкой добычи.' },
    { id: 'focus', name: 'Сосредоточение', icon: '🎯', max: 20, desc: '-2.5% к перезарядке заклинаний.' }
  ];

  // ------------------------------------------------------------
  //  ПРЕДМЕТЫ
  // ------------------------------------------------------------
  const ITEMS = [
    { id: 'fish', name: 'Рыбка', icon: '🐟', type: 'food', hp: 22, en: 25, price: 18, sell: 6, feed: 12, desc: 'Любимое лакомство котов.' },
    { id: 'milk', name: 'Молоко', icon: '🥛', type: 'food', hp: 14, en: 45, mana: 12, price: 22, sell: 8, feed: 10, desc: 'Восстанавливает силы и немного маны.' },
    { id: 'berry', name: 'Лесная Ягода', icon: '🫐', type: 'food', hp: 10, en: 18, price: 8, sell: 3, feed: 6, desc: 'Растёт в кустах, чуть-чуть лечит.' },
    { id: 'meat', name: 'Кусок Мяса', icon: '🍖', type: 'food', hp: 40, en: 30, price: 45, sell: 16, feed: 22, desc: 'Сытно и полезно.' },
    { id: 'cake', name: 'Тортик', icon: '🍰', type: 'food', hp: 70, en: 60, mana: 20, price: 90, sell: 32, feed: 35, desc: 'Праздничный тортик. Лечит почти всё.' },
    { id: 'treat', name: 'Волшебное Печенье', icon: '🍪', type: 'food', hp: 30, en: 30, mana: 55, price: 70, sell: 26, feed: 40, desc: 'Печенье с маной. Питомцы обожают.' },
    { id: 'potHp', name: 'Зелье Здоровья', icon: '🧪', type: 'potion', hp: 60, price: 60, sell: 22, desc: 'Мгновенно лечит.' },
    { id: 'potMana', name: 'Зелье Маны', icon: '🔵', type: 'potion', mana: 70, price: 65, sell: 24, desc: 'Мгновенно восполняет ману.' },
    { id: 'potEn', name: 'Зелье Бодрости', icon: '🟡', type: 'potion', en: 100, price: 40, sell: 15, desc: 'Полностью восстанавливает энергию.' },
    { id: 'key', name: 'Ключ от Клетки', icon: '🗝️', type: 'key', price: 250, sell: 90, desc: 'Открывает клетку с котом-магом.' },
    { id: 'fang', name: 'Клык Монстра', icon: '🦷', type: 'mat', price: 0, sell: 14, desc: 'Материал. Можно продать в лавке.' },
    { id: 'shard', name: 'Осколок Кристалла', icon: '💎', type: 'mat', price: 0, sell: 40, desc: 'Редкий материал. Дорого стоит.' },
    { id: 'essence', name: 'Эссенция Тьмы', icon: '🕳️', type: 'mat', price: 0, sell: 85, desc: 'Падает с сильных монстров Бездны.' },
    { id: 'egg', name: 'Загадочное Яйцо', icon: '🥚', type: 'special', price: 500, sell: 180, desc: 'Из него вылупляется случайный питомец.' },
    { id: 'scroll', name: 'Свиток Опыта', icon: '📜', type: 'special', price: 200, sell: 70, xp: 150, desc: 'Даёт 150 опыта.' }
  ];
  const ITEM_BY = {}; ITEMS.forEach(i => ITEM_BY[i.id] = i);

  // ------------------------------------------------------------
  //  ПИТОМЦЫ
  // ------------------------------------------------------------
  const PETS = [
    {
      id: 'sparky', name: 'Искорка', model: 'wisp', pal: 'wisp', anim: 'float', flying: true,
      dmg: 7, cd: 1.5, range: 9, price: 400, el: 'air', start: true,
      stages: ['Искорка', 'Огонёк', 'Звёздный Дух'],
      desc: 'Летающий огонёк, стреляет искрами по врагам.'
    },
    {
      id: 'slimey', name: 'Слизнячок', model: 'slime', pal: 'slimeGreen', anim: 'blob',
      dmg: 9, cd: 1.8, range: 2.2, price: 350, el: 'nature',
      stages: ['Слизнячок', 'Слизень-Страж', 'Королевский Слизень'],
      desc: 'Прыгает рядом и бодает врагов. Очень живучий.'
    },
    {
      id: 'batty', name: 'Мышонок', model: 'bat', pal: 'bat', anim: 'bat', flying: true,
      dmg: 6, cd: 0.9, range: 5, price: 450, el: 'dark',
      stages: ['Мышонок', 'Нетопырь', 'Князь Ночи'],
      desc: 'Быстро клюёт врагов и почти не промахивается.'
    },
    {
      id: 'wolfy', name: 'Волчонок', model: 'wolf', pal: 'wolf', anim: 'quad',
      dmg: 13, cd: 1.4, range: 2.4, price: 700, el: 'nature',
      stages: ['Волчонок', 'Волк', 'Лютоволк'],
      desc: 'Верный зверь. Бросается на врагов первым.'
    },
    {
      id: 'spidey', name: 'Паучок', model: 'spider', pal: 'spider', anim: 'spider',
      dmg: 10, cd: 1.2, range: 2.6, price: 650, el: 'nature', poison: true,
      stages: ['Паучок', 'Паук-Охотник', 'Ткач Судьбы'],
      desc: 'Кусает ядом — враги теряют здоровье со временем.'
    },
    {
      id: 'ghosty', name: 'Привиденьице', model: 'ghost', pal: 'ghost', anim: 'float', flying: true,
      dmg: 12, cd: 1.6, range: 8, price: 900, el: 'dark',
      stages: ['Привиденьице', 'Дух', 'Владыка Теней'],
      desc: 'Пролетает сквозь стены и пугает врагов холодом.'
    },
    {
      id: 'golemy', name: 'Каменёк', model: 'golem', pal: 'golem', anim: 'golem',
      dmg: 20, cd: 2.2, range: 2.8, price: 1400, el: 'earth', tank: true,
      stages: ['Каменёк', 'Страж', 'Титан'],
      desc: 'Медленный, но очень сильный. Отвлекает врагов на себя.'
    },
    {
      id: 'impy', name: 'Бесёнок', model: 'imp', pal: 'imp', anim: 'humanoid',
      dmg: 15, cd: 1.3, range: 9, price: 1100, el: 'fire',
      stages: ['Бесёнок', 'Демонёнок', 'Архибес'],
      desc: 'Кидает огненные шарики издалека.'
    },
    {
      id: 'kitty', name: 'Котёнок', model: 'cat', pal: null, anim: 'cat',
      dmg: 14, cd: 1.1, range: 2.5, price: 1600, el: 'light', cat: true,
      stages: ['Котёнок', 'Кот-Ученик', 'Кот-Архимаг'],
      desc: 'Маленький кот-маг. Дерётся лапками и очень милый.'
    },
    {
      id: 'shady', name: 'Тенёк', model: 'shade', pal: 'shade', anim: 'float', flying: true,
      dmg: 26, cd: 1.5, range: 10, price: 2600, el: 'dark',
      stages: ['Тенёк', 'Тень', 'Пожиратель Света'],
      desc: 'Редчайший питомец из Бездны. Наносит огромный урон.'
    }
  ];
  const PET_BY = {}; PETS.forEach(p => PET_BY[p.id] = p);

  // ------------------------------------------------------------
  //  НАГРАДЫ ЗА СПАСЁННЫХ КОТОВ
  // ------------------------------------------------------------
  const CAGE_REWARDS = [
    { type: 'ability', id: 'highjump' },
    { type: 'coins', n: 150 },
    { type: 'spell', id: 'spark' },
    { type: 'ability', id: 'magnet' },
    { type: 'spell', id: 'stone' },
    { type: 'item', id: 'egg', n: 1 },
    { type: 'ability', id: 'doublejump' },
    { type: 'coins', n: 300 },
    { type: 'spell', id: 'poison' },
    { type: 'ability', id: 'manaflow' },
    { type: 'spell', id: 'mist' },
    { type: 'pet', id: 'sparky' },
    { type: 'ability', id: 'shield' },
    { type: 'ability', id: 'invis' },
    { type: 'cat', id: 'sneg' },
    { type: 'spell', id: 'wind' },
    { type: 'coins', n: 500 },
    { type: 'ability', id: 'ghoststep' },
    { type: 'pet', id: 'batty' },
    { type: 'spell', id: 'heal' },
    { type: 'ability', id: 'quickpaws' },
    { type: 'ability', id: 'bouncy' },
    { type: 'spell', id: 'spike' },
    { type: 'cat', id: 'polos' },
    { type: 'item', id: 'egg', n: 2 },
    { type: 'spell', id: 'shadow' },
    { type: 'ability', id: 'clawmaster' },
    { type: 'spell', id: 'rain' },
    { type: 'ability', id: 'haste' },
    { type: 'coins', n: 800 },
    { type: 'pet', id: 'wolfy' },
    { type: 'cat', id: 'dym' },
    { type: 'ability', id: 'ironfur' },
    { type: 'spell', id: 'quake' },
    { type: 'ability', id: 'cloudwalk' },
    { type: 'spell', id: 'star' },
    { type: 'item', id: 'egg', n: 2 },
    { type: 'cat', id: 'plamya' },
    { type: 'ability', id: 'tornado' },
    { type: 'ability', id: 'ninelives' },
    { type: 'pet', id: 'ghosty' },
    { type: 'coins', n: 1200 },
    { type: 'spell', id: 'meteor' },
    { type: 'cat', id: 'prizrak' },
    { type: 'ability', id: 'wildheart' },
    { type: 'spell', id: 'telekinesis' },
    { type: 'ability', id: 'stormcall' },
    { type: 'ability', id: 'blackhole' },
    { type: 'pet', id: 'golemy' },
    { type: 'cat', id: 'zolot' },
    { type: 'spell', id: 'storm' },
    { type: 'ability', id: 'armageddon' },
    { type: 'pet', id: 'shady' },
    { type: 'cat', id: 'void' },
    { type: 'cat', id: 'radug' }
  ];

  // ------------------------------------------------------------
  //  СОСТОЯНИЕ ИГРОКА
  // ------------------------------------------------------------
  const SAVE_KEY = 'kotiki_magi_3d_save_v1';   // старое единое сохранение (переносится в слот 1)

  function defaultSave() {
    return {
      version: 1,
      coins: 60, xp: 0, level: 1, skillPoints: 0,
      skills: { vitality: 0, power: 0, claws: 0, stamina: 0, magic: 0, agility: 0, luck: 0, focus: 0 },
      spells: ['fire', 'water', 'ice'],
      abilities: ['dash'],
      cats: ['muri'], activeCat: 'muri',
      pets: [], equipped: [null, null, null], petUid: 1,
      inventory: [{ id: 'fish', n: 3 }, { id: 'berry', n: 5 }, { id: 'potHp', n: 1 }],
      completed: {},           // index -> {stars, best}
      freedCats: 0,
      settings: { pixel: 3, fov: 70, sens: 100, volume: 70, music: 45, view: 3, invertY: false, showFps: false, camMode: 'drag', musicOn: true,
        spellPos: 'bc', spellCount: 1, spellOpen: true,
        abilPos: 'br', abilCount: 3, abilOpen: true,
        hudScale: 100, hints: 'start' },
      slotName: '', tutorial: { done: false, step: 0 },
      codes: [],               // введённые секретные коды

      accs: [], skins: [], acc: {}, catSkins: {}, petAccs: [],
      stats: { kills: 0, deaths: 0, freed: 0, chests: 0, bosses: 0, playtime: 0, spins: 0, chestsBought: 0, catsFound: 0, pvpWins: 0 }
    };
  }

  class State {
    constructor() {
      this.data = defaultSave();
      this.load();
    }

    slotKey() {
      return (KM.SAVES ? KM.SAVES.KEY(KM.SAVES.currentSlot()) : SAVE_KEY);
    }

    /** Начать новую игру в слоте. */
    newGame(slot, name) {
      if (KM.SAVES) KM.SAVES.setCurrentSlot(slot);
      this.data = defaultSave();
      this.data.slotName = name || ('Игра ' + (slot + 1));
      this.data.tutorial = { done: false, step: 0 };
      this.save();
    }

    /** Переключиться на другой слот. */
    loadSlot(slot) {
      if (KM.SAVES) KM.SAVES.setCurrentSlot(slot);
      this.data = defaultSave();
      this.load();
    }

    load() {
      try {
        let raw = global.localStorage.getItem(this.slotKey());
        // единственное старое сохранение переносим в первый слот —
        // только один раз, иначе каждый новый аккаунт наследовал бы чужой прогресс
        const migrated = global.localStorage.getItem('kmagi_migrated');
        if (!raw && !migrated && (!KM.SAVES || KM.SAVES.currentSlot() === 0)) {
          const old = global.localStorage.getItem(SAVE_KEY);
          if (old) { raw = old; global.localStorage.setItem(this.slotKey(), old); }
        }
        if (raw) {
          const d = JSON.parse(raw);
          const def = defaultSave();
          this.data = Object.assign(def, d);
          this.data.skills = Object.assign(def.skills, d.skills || {});
          this.data.tutorial = Object.assign({ done: false, step: 0 }, d.tutorial || {});
          this.data.accs = d.accs || [];
          this.data.codes = d.codes || [];
          this.data.skins = d.skins || [];
          this.data.acc = d.acc || {};
          this.data.catSkins = d.catSkins || {};
          this.data.petAccs = d.petAccs || [];
          this.data.settings = Object.assign(def.settings, d.settings || {});
          this.data.stats = Object.assign(def.stats, d.stats || {});
          if (!Array.isArray(this.data.equipped)) this.data.equipped = [null, null, null];
          while (this.data.equipped.length < 3) this.data.equipped.push(null);
        }
      } catch (e) { console.warn('Не удалось загрузить сохранение:', e); }
    }

    save() {
      const blob = JSON.stringify(this.data);
      try { global.localStorage.setItem(this.slotKey(), blob); }
      catch (e) { console.warn('Не удалось сохранить:', e); }

      // Аккаунт на сервере — копия прогресса уезжает туда же,
      // чтобы найтись при входе с другого устройства.
      const g = global.KMGAME;
      if (g && g.net && g.net.serverAccount) {
        this._cloudT = this._cloudT || 0;
        const now = Date.now();
        if (now - this._cloudT > 8000) {      // не чаще раза в восемь секунд
          this._cloudT = now;
          g.net.pushSave(KM.SAVES ? KM.SAVES.currentSlot() : 0, blob);
        }
      }
    }

    reset() {
      // сброс прогресса сохраняет название игры и снова включает обучение
      const name = this.data.slotName;
      const st = this.data.settings;
      this.data = defaultSave();
      this.data.slotName = name || '';
      this.data.settings = Object.assign(this.data.settings, st || {});
      this.save();
    }

    // ---------- прогресс ----------
    xpForLevel(l) { return Math.floor(80 * Math.pow(l, 1.42)); }

    addXP(n) {
      const d = this.data;
      d.xp += Math.max(0, Math.round(n));
      let ups = 0;
      while (d.xp >= this.xpForLevel(d.level)) {
        d.xp -= this.xpForLevel(d.level);
        d.level++; d.skillPoints += 2; ups++;
        if (ups > 50) break;
      }
      return ups;
    }

    addCoins(n) { this.data.coins = Math.max(0, this.data.coins + Math.round(n)); }

    // ---------- инвентарь ----------
    invCount(id) { const s = this.data.inventory.find(i => i.id === id); return s ? s.n : 0; }
    addItem(id, n) {
      n = n || 1;
      const s = this.data.inventory.find(i => i.id === id);
      if (s) s.n += n; else this.data.inventory.push({ id, n });
      return true;
    }
    removeItem(id, n) {
      n = n || 1;
      const idx = this.data.inventory.findIndex(i => i.id === id);
      if (idx < 0 || this.data.inventory[idx].n < n) return false;
      this.data.inventory[idx].n -= n;
      if (this.data.inventory[idx].n <= 0) this.data.inventory.splice(idx, 1);
      return true;
    }
    /** Первая еда в инвентаре (для клавиши R). */
    firstFood() {
      const order = ['cake', 'meat', 'treat', 'milk', 'fish', 'berry', 'potHp'];
      for (const id of order) if (this.invCount(id) > 0) return id;
      const f = this.data.inventory.find(i => { const it = ITEM_BY[i.id]; return it && (it.type === 'food' || it.type === 'potion'); });
      return f ? f.id : null;
    }

    // ---------- разблокировки ----------
    hasSpell(id) { return this.data.spells.indexOf(id) >= 0; }
    hasAbility(id) { return this.data.abilities.indexOf(id) >= 0; }
    hasCat(id) { return this.data.cats.indexOf(id) >= 0; }
    unlockSpell(id) { if (!this.hasSpell(id)) { this.data.spells.push(id); return true; } return false; }
    unlockAbility(id) { if (!this.hasAbility(id)) { this.data.abilities.push(id); return true; } return false; }
    unlockCat(id) { if (!this.hasCat(id)) { this.data.cats.push(id); return true; } return false; }

    addPet(id) {
      const def = PET_BY[id];
      if (!def) return null;
      const pet = { uid: this.data.petUid++, id, level: 1, xp: 0, fed: 0, stage: 0, name: def.stages[0] };
      this.data.pets.push(pet);
      // автоматически экипируем в свободный слот
      const free = this.data.equipped.indexOf(null);
      if (free >= 0) this.data.equipped[free] = pet.uid;
      return pet;
    }
    petByUid(uid) { return this.data.pets.find(p => p.uid === uid) || null; }
    equippedPets() {
      return this.data.equipped.map(uid => uid == null ? null : this.petByUid(uid)).filter(Boolean);
    }
    petXpNeed(pet) { return Math.floor(50 * Math.pow(pet.level, 1.32)); }
    addPetXP(pet, n) {
      pet.xp += n;
      let up = 0;
      while (pet.xp >= this.petXpNeed(pet) && pet.level < 40) {
        pet.xp -= this.petXpNeed(pet); pet.level++; up++;
      }
      const def = PET_BY[pet.id];
      const newStage = pet.level >= 25 ? 2 : (pet.level >= 10 ? 1 : 0);
      if (newStage !== pet.stage) { pet.stage = newStage; pet.name = def.stages[newStage]; return { up, evolved: true }; }
      return { up, evolved: false };
    }
    feedPet(pet, itemId) {
      const it = ITEM_BY[itemId];
      if (!it || !it.feed) return null;
      if (!this.removeItem(itemId, 1)) return null;
      pet.fed = (pet.fed || 0) + it.feed;
      return this.addPetXP(pet, it.feed * 3);
    }

    // ---------- локации ----------
    isCompleted(i) { return !!this.data.completed[i]; }
    maxUnlocked() {
      let m = 0;
      for (let i = 0; i < KM.LEVELS; i++) { if (this.data.completed[i]) m = i + 1; }
      return Math.min(99, m);
    }
    isUnlocked(i) { return i <= this.maxUnlocked(); }
    completeLocation(i, stars) {
      const cur = this.data.completed[i];
      if (!cur || cur.stars < stars) this.data.completed[i] = { stars };
      this.save();
    }


    // ------------------------------------------------------------
    //  Персонаж с учётом костюма и аксессуаров
    // ------------------------------------------------------------
    effectiveCat() {
      const d = this.data;
      const base = (KM.CAT_BY && KM.CAT_BY[d.activeCat]) || KM.CATS[0];
      const out = Object.assign({}, base);
      const skinId = (d.catSkins || {})[base.id];
      const skin = skinId && KM.SKIN_BY ? KM.SKIN_BY[skinId] : null;

      out.pal = Object.assign({}, base.pal, skin ? skin.pal : null);
      out.build = Object.assign({}, base.build, skin ? skin.build : null);
      out.skin = skin || null;

      // аксессуары
      const acc = d.acc || {};
      const shapes = {};
      const bon = Object.assign({ hp: 0, dmg: 0, spd: 0, mana: 0 }, base.bonus);
      let gold = base.gold || 0, stealth = base.stealth || 0, luck = 0;
      let jump = 0, feather = false;
      // утепление: у кота своё, плюс костюм и аксессуары
      let warm = base.warm || 0;
      if (skin && skin.warm) warm += skin.warm;
      let coldImmune = !!base.coldImmune, heatImmune = !!base.heatImmune;
      const KEY = { head: 'accH', face: 'accF', neck: 'accN', back: 'accB' };
      for (const slot in KEY) {
        const id = acc[slot];
        const a = id && KM.ACC_BY ? KM.ACC_BY[id] : null;
        if (!a) continue;
        shapes[slot] = a.shape;
        out.pal[KEY[slot] + '1'] = a.c1;
        out.pal[KEY[slot] + '2'] = a.c2 || a.c1;
        const ab = a.bonus || {};
        bon.hp += ab.hp || 0; bon.dmg += ab.dmg || 0;
        bon.spd += ab.spd || 0; bon.mana += ab.mana || 0;
        gold += a.gold || 0; stealth += a.stealth || 0; luck += a.luck || 0;
        jump += a.jump || 0; feather = feather || !!a.feather;
        warm += a.warm || 0;
      }
      out.build.acc = shapes;
      out.bonus = bon;
      out.gold = gold;
      out.stealth = Math.max(0, stealth);
      out.accLuck = luck;
      out.accJump = jump;
      out.accFeather = feather;
      out.warm = warm;
      out.coldImmune = coldImmune;
      out.heatImmune = heatImmune;
      return out;
    }

    /** Надеть/снять аксессуар. */
    equipAcc(slot, id) {
      if (!this.data.acc) this.data.acc = {};
      this.data.acc[slot] = (this.data.acc[slot] === id) ? null : id;
      this.save();
    }
    hasAcc(id) { return (this.data.accs || []).indexOf(id) >= 0; }
    addAcc(id) { if (!this.data.accs) this.data.accs = []; if (!this.hasAcc(id)) { this.data.accs.push(id); return true; } return false; }
    hasSkin(id) { return (this.data.skins || []).indexOf(id) >= 0; }
    addSkin(id) { if (!this.data.skins) this.data.skins = []; if (!this.hasSkin(id)) { this.data.skins.push(id); return true; } return false; }
    setSkin(catId, skinId) {
      if (!this.data.catSkins) this.data.catSkins = {};
      if (skinId) this.data.catSkins[catId] = skinId; else delete this.data.catSkins[catId];
      this.save();
    }

    // ---------- производные характеристики ----------
    stats() {
      const d = this.data, s = d.skills;
      const cat = this.effectiveCat();
      const bon = cat.bonus || {};
      const st = {
        maxHp: 100 + s.vitality * 12 + (d.level - 1) * 6 + (bon.hp || 0),
        maxMana: 60 + s.magic * 8 + (d.level - 1) * 3 + (bon.mana || 0),
        maxEnergy: 100 + s.stamina * 10,
        spellPower: 1 + s.power * 0.07,
        clawPower: 1 + s.claws * 0.08 + (cat.claw || 0),
        speed: 1 + s.agility * 0.025 + (bon.spd || 0),
        manaRegen: 3.2 * (1 + s.magic * 0.05) * (this.hasAbility('manaflow') ? 2 : 1),
        energyRegen: 12 + s.stamina * 1.2,
        cooldown: Math.max(0.3, 1 - s.focus * 0.025) * (this.hasAbility('quickpaws') ? 0.8 : 1) * (1 - (cat.cdr || 0)),
        luck: 1 + s.luck * 0.05 + (cat.gold || 0) + (cat.accLuck || 0),
        flatDmg: bon.dmg || 0,
        stealth: cat.stealth || 0,
        alpha: cat.alpha === undefined ? 1 : cat.alpha,
        glow: cat.glow || 0,
        rainbow: !!cat.rainbow,
        shimmer: !!cat.shimmer,
        aura: cat.aura || null,
        regen: cat.regen || 0,
        warm: cat.warm || 0,
        coldImmune: !!cat.coldImmune,
        heatImmune: !!cat.heatImmune,
        damageTaken: (this.hasAbility('ironfur') ? 0.8 : 1) * (1 - (cat.armor || 0)),
        jump: (this.hasAbility('highjump') ? 1.5 : 1) + (cat.accJump || 0),
        feather: this.hasAbility('featherfall') || !!cat.accFeather,
        cat
      };
      return st;
    }
  }

  KM.SPELLS = SPELLS; KM.SPELL_BY = SPELL_BY;
  KM.ABILITIES = ABILITIES; KM.ABIL_BY = ABIL_BY;
  KM.SKILLS = SKILLS;
  KM.ITEMS = ITEMS; KM.ITEM_BY = ITEM_BY;
  KM.PETS = PETS; KM.PET_BY = PET_BY;
  KM.CAGE_REWARDS = CAGE_REWARDS;
  KM.State = State;
})(window);
