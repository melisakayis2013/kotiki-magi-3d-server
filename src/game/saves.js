/* ============================================================
   КОТИКИ МАГИ 3D — отдельные игры (слоты сохранений)
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  const SLOTS = 4;
  const KEY = (i) => {
    const acc = (KM.ACCOUNT && KM.ACCOUNT.currentId()) || 'guest';
    return 'kmagi_' + acc + '_slot_' + i;
  };
  const OLD_KEY = (i) => 'kotiki_magi_3d_slot_' + i;
  const CUR = 'kotiki_magi_3d_current_slot';

  function readRaw(i) {
    try { return global.localStorage.getItem(KEY(i)); } catch (e) { return null; }
  }

  /** Короткая сводка по слоту для списка. */
  function summary(i) {
    const raw = readRaw(i);
    if (!raw) return { index: i, empty: true };
    try {
      const d = JSON.parse(raw);
      const done = d.completed ? Object.keys(d.completed).length : 0;
      const stars = d.completed ? Object.values(d.completed).reduce((a, c) => a + (c.stars || 0), 0) : 0;
      const cat = (KM.CAT_BY && KM.CAT_BY[d.activeCat]) || null;
      return {
        index: i, empty: false,
        name: d.slotName || ('Игра ' + (i + 1)),
        level: d.level || 1,
        coins: d.coins || 0,
        done, stars,
        cats: (d.cats || []).length,
        freed: d.freedCats || 0,
        playtime: (d.stats && d.stats.playtime) || 0,
        catName: cat ? cat.name : 'Мури',
        catRarity: cat ? cat.rarity : 'common',
        tutorial: d.tutorial ? !d.tutorial.done : false
      };
    } catch (e) { return { index: i, empty: true }; }
  }

  function currentSlot() {
    try {
      const v = parseInt(global.localStorage.getItem(CUR), 10);
      return isNaN(v) ? 0 : Math.max(0, Math.min(SLOTS - 1, v));
    } catch (e) { return 0; }
  }
  function setCurrentSlot(i) {
    try { global.localStorage.setItem(CUR, String(i)); } catch (e) { }
  }
  function eraseSlot(i) {
    try { global.localStorage.removeItem(KEY(i)); } catch (e) { }
  }

  /** Перенести старые (доаккаунтные) сохранения в первый аккаунт. */
  function migrateOld() {
    try {
      if (global.localStorage.getItem('kmagi_migrated')) return;
      global.localStorage.setItem('kmagi_migrated', '1');
      for (let i = 0; i < SLOTS; i++) {
        const old = global.localStorage.getItem(OLD_KEY(i));
        if (old && !global.localStorage.getItem(KEY(i))) {
          global.localStorage.setItem(KEY(i), old);
        }
      }
      // совсем старое единое сохранение — в первый слот
      const solo = global.localStorage.getItem('kotiki_magi_3d_save_v1');
      if (solo && !global.localStorage.getItem(KEY(0))) {
        global.localStorage.setItem(KEY(0), solo);
      }
    } catch (e) { }
  }

  KM.SAVES = { SLOTS, KEY, CUR, summary, currentSlot, setCurrentSlot, eraseSlot, migrateOld };
})(window);
