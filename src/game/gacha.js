/* ============================================================
   КОТИКИ МАГИ 3D — колесо призов и сундуки
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const WHEEL_PRICE = 250;

  const CHESTS = [
    {
      id: 'wood', name: 'Деревянный Ящик', icon: '📦', price: 500,
      min: 3, max: 6, boost: 0.2,
      desc: 'От 3 до 6 подарков. Внутри в основном припасы и монеты, но иногда везёт.'
    },
    {
      id: 'iron', name: 'Железный Сундук', icon: '🧰', price: 1200,
      min: 5, max: 9, boost: 0.9,
      desc: 'От 5 до 9 подарков и заметно выше шанс на редкое и эпическое.'
    },
    {
      id: 'gold', name: 'Золотой Сундук', icon: '🎁', price: 2800,
      min: 7, max: 12, boost: 2.2,
      desc: 'От 7 до 12 подарков. Часто попадаются эпические и мифические вещи.'
    },
    {
      id: 'magic', name: 'Волшебный Ларец', icon: '🔮', price: 6500,
      min: 10, max: 15, boost: 5.5,
      desc: 'От 10 до 15 подарков и лучшие шансы в игре. Здесь ловят легендарных и мистических котов.'
    }
  ];

  /** Случайная редкость с учётом бонуса ящика и удачи игрока. */
  function rollRarity(boost, luck) {
    boost = boost || 0; luck = luck || 1;
    const R = KM.RARITY;
    let total = 0;
    const w = {};
    for (const id of KM.RARITY_ORDER) {
      const r = R[id];
      // чем выше редкость, тем сильнее на неё влияет бонус сундука
      const mul = 1 + boost * (r.order / 2) + (luck - 1) * r.order * 0.35;
      w[id] = r.weight * mul;
      total += w[id];
    }
    let x = Math.random() * total;
    for (const id of KM.RARITY_ORDER) {
      x -= w[id];
      if (x <= 0) return id;
    }
    return 'common';
  }

  /** Шансы в процентах — для витрины. */
  function chances(boost, luck) {
    const R = KM.RARITY;
    let total = 0; const w = {};
    for (const id of KM.RARITY_ORDER) {
      const r = R[id];
      const mul = 1 + (boost || 0) * (r.order / 2) + ((luck || 1) - 1) * r.order * 0.35;
      w[id] = r.weight * mul; total += w[id];
    }
    const out = {};
    for (const id of KM.RARITY_ORDER) out[id] = w[id] / total * 100;
    return out;
  }

  // ------------------------------------------------------------
  //  ПУЛ ПРИЗОВ
  // ------------------------------------------------------------
  function prizePool(state, rarity) {
    const pool = [];
    const lvl = state.data.level;

    // персонажи этой редкости, которых ещё нет
    const cats = KM.CATS.filter(c => c.rarity === rarity && !state.hasCat(c.id));
    cats.forEach(c => pool.push({ type: 'cat', id: c.id, weight: 10 }));

    // заклинания и способности — начиная с редкого
    const spellsByRar = {
      common: [], rare: ['stone', 'mist'], epic: ['spark', 'spike', 'poison', 'rain'],
      mythic: ['wind', 'heal', 'quake'], legendary: ['shadow', 'star', 'telekinesis'],
      mystic: ['storm', 'meteor'], secret: ['meteor']
    };
    (spellsByRar[rarity] || []).forEach(id => {
      if (!state.hasSpell(id)) pool.push({ type: 'spell', id, weight: 7 });
    });
    const abilByRar = {
      common: [], rare: ['highjump', 'magnet', 'featherfall'],
      epic: ['doublejump', 'quickpaws', 'manaflow', 'bouncy', 'shield'],
      mythic: ['clawmaster', 'ironfur', 'ghoststep', 'invis', 'haste'],
      legendary: ['ninelives', 'wildheart', 'tornado', 'cloudwalk'],
      mystic: ['armageddon', 'blackhole', 'stormcall'], secret: ['blackhole']
    };
    (abilByRar[rarity] || []).forEach(id => {
      if (!state.hasAbility(id)) pool.push({ type: 'ability', id, weight: 7 });
    });

    // питомцы
    const petsByRar = {
      common: ['slimey'], rare: ['sparky', 'batty'], epic: ['spidey', 'wolfy'],
      mythic: ['ghosty', 'impy'], legendary: ['golemy', 'kitty'],
      mystic: ['shady'], secret: ['shady']
    };
    (petsByRar[rarity] || []).forEach(id => pool.push({ type: 'pet', id, weight: 5 }));

    // предметы
    const itemsByRar = {
      common: ['fish', 'berry', 'milk', 'potEn'],
      rare: ['meat', 'potHp', 'potMana', 'fang'],
      epic: ['cake', 'treat', 'shard', 'scroll'],
      mythic: ['egg', 'key', 'essence'],
      legendary: ['egg', 'scroll'], mystic: ['egg'], secret: ['egg']
    };
    (itemsByRar[rarity] || []).forEach(id => {
      const n = rarity === 'common' ? 3 : (rarity === 'rare' ? 2 : 1);
      pool.push({ type: 'item', id, n, weight: 9 });
    });

    // аксессуары и костюмы
    if (KM.ACC) {
      KM.ACC.filter(a => a.rarity === rarity && a.price > 0 && !state.hasAcc(a.id))
        .forEach(a => pool.push({ type: 'acc', id: a.id, weight: 6 }));
    }
    if (KM.SKINS) {
      KM.SKINS.filter(s => s.rarity === rarity && !state.hasSkin(s.id))
        .forEach(s => pool.push({ type: 'skin', id: s.id, weight: 5 }));
    }

    // монеты — всегда есть как запасной вариант
    const base = [120, 320, 700, 1400, 2600, 4500, 9000][KM.RARITY[rarity].order] || 120;
    pool.push({ type: 'coins', n: Math.round(base * (0.75 + Math.random() * 0.5) * (1 + lvl * 0.02)), weight: 8 });

    return pool;
  }

  function pickWeighted(pool) {
    let total = 0;
    for (const p of pool) total += p.weight || 1;
    let x = Math.random() * total;
    for (const p of pool) { x -= (p.weight || 1); if (x <= 0) return p; }
    return pool[pool.length - 1];
  }

  /** Один приз указанной редкости. */
  function rollPrize(state, rarity) {
    const pool = prizePool(state, rarity);
    const p = Object.assign({}, pickWeighted(pool));
    p.rarity = rarity;
    return p;
  }

  /** Выдать приз игроку. Возвращает {icon, title, sub, cat}. */
  function grant(game, prize) {
    const S = game.state;
    switch (prize.type) {
      case 'cat': {
        const c = KM.CAT_BY[prize.id];
        if (S.unlockCat(prize.id)) {
          S.data.stats.catsFound = (S.data.stats.catsFound || 0) + 1;
          return { icon: '🐱', title: c.name, sub: c.desc, cat: c, rarity: prize.rarity };
        }
        const coins = 600;
        S.addCoins(coins);
        return { icon: '🪙', title: c.name + ' — уже есть!', sub: 'Взамен +' + coins + ' монет', rarity: prize.rarity };
      }
      case 'spell': {
        const sp = KM.SPELL_BY[prize.id];
        if (S.unlockSpell(prize.id)) return { icon: sp.icon, title: sp.name, sub: sp.desc, rarity: prize.rarity };
        S.addCoins(400);
        return { icon: '🪙', title: sp.name + ' — уже изучено', sub: 'Взамен +400 монет', rarity: prize.rarity };
      }
      case 'ability': {
        const a = KM.ABIL_BY[prize.id];
        if (S.unlockAbility(prize.id)) return { icon: a.icon, title: a.name, sub: a.desc, rarity: prize.rarity };
        S.addCoins(400);
        return { icon: '🪙', title: a.name + ' — уже открыто', sub: 'Взамен +400 монет', rarity: prize.rarity };
      }
      case 'pet': {
        const d = KM.PET_BY[prize.id];
        S.addPet(prize.id);
        return { icon: '🐾', title: d.name, sub: d.desc, rarity: prize.rarity };
      }
      case 'item': {
        const it = KM.ITEM_BY[prize.id];
        S.addItem(prize.id, prize.n || 1);
        return { icon: it.icon, title: it.name + ' ×' + (prize.n || 1), sub: it.desc, rarity: prize.rarity };
      }
      case 'acc': {
        const a = KM.ACC_BY[prize.id];
        if (a && S.addAcc(prize.id)) {
          if (!S.data.acc) S.data.acc = {};
          if (!S.data.acc[a.slot]) S.data.acc[a.slot] = a.id;   // сразу надеваем свободный слот
          return { icon: a.icon, title: a.name, sub: a.desc, rarity: prize.rarity };
        }
        S.addCoins(350);
        return { icon: '🪙', title: (a ? a.name : 'Аксессуар') + ' — уже есть', sub: 'Взамен +350 монет', rarity: prize.rarity };
      }
      case 'skin': {
        const sk = KM.SKIN_BY[prize.id];
        if (sk && S.addSkin(prize.id)) {
          return { icon: sk.icon, title: sk.name, sub: sk.desc, rarity: prize.rarity };
        }
        S.addCoins(450);
        return { icon: '🪙', title: (sk ? sk.name : 'Костюм') + ' — уже есть', sub: 'Взамен +450 монет', rarity: prize.rarity };
      }
      case 'coins':
      default:
        S.addCoins(prize.n);
        return { icon: '🪙', title: prize.n + ' монет', sub: 'Звонкая монета в копилку', rarity: prize.rarity };
    }
  }

  KM.GACHA = {
    WHEEL_PRICE, CHESTS,
    rollRarity, rollPrize, grant, chances,
    chestById: (id) => CHESTS.find(c => c.id === id)
  };
})(window);
