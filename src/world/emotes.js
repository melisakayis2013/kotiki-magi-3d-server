/* ============================================================
   КОТИКИ МАГИ 3D — кошачьи выходки

   Нажал кнопку — кот танцует, кланяется, умывается или падает
   на спину. Каждая выходка двигает те же косточки, что и обычная
   анимация, поэтому работает с любым котом и любым костюмом.

   k — сколько прошло от 0 до 1, t — общее время (для дрожаний).
   ============================================================ */
(function (global) {
  'use strict';
  const KM = global.KM;

  /** Плавный вход и выход, чтобы выходка не начиналась рывком. */
  function ease(k) {
    const inK = Math.min(1, k / 0.12);
    const outK = Math.min(1, (1 - k) / 0.12);
    return Math.min(inK, outK);
  }

  const EMOTES = [
    {
      id: 'dance', name: 'Танец', icon: '💃', dur: 3.4, loop: true,
      desc: 'Кот пляшет на задних лапах',
      pose(p, k, t) {
        const e = ease(k), b = t * 7;
        p.move('body', Math.sin(b) * 0.10 * e, (0.30 + Math.abs(Math.sin(b * 2)) * 0.12) * e, 0);
        p.rot('body', -0.75 * e, Math.sin(b) * 0.5 * e, Math.sin(b * 2) * 0.16 * e);
        p.rot('legBL', 0.35 * e + Math.sin(b) * 0.4 * e, 0, 0.2 * e);
        p.rot('legBR', 0.35 * e - Math.sin(b) * 0.4 * e, 0, -0.2 * e);
        p.rot('legFL', (-1.9 + Math.sin(b + 1) * 0.6) * e, -0.5 * e, 0);
        p.rot('legFR', (-1.9 - Math.sin(b + 1) * 0.6) * e, 0.5 * e, 0);
        p.rot('head', 0.15 * e, Math.sin(b * 0.5) * 0.55 * e, Math.sin(b) * 0.22 * e);
        p.rot('tail1', (-1.0 + Math.sin(b) * 0.3) * e, Math.sin(b * 1.3) * 0.7 * e, 0);
        p.rot('tail2', -0.4 * e, Math.sin(b * 1.3 + 0.5) * 0.6 * e, 0);
        p.rot('tail3', -0.3 * e, Math.sin(b * 1.3 + 1.0) * 0.6 * e, 0);
        p.rot('earL', -0.3 * e, 0, -0.35 * e);
        p.rot('earR', -0.3 * e, 0, 0.35 * e);
      }
    },
    {
      id: 'wave', name: 'Привет!', icon: '👋', dur: 2.2,
      desc: 'Садится и машет лапкой',
      pose(p, k, t) {
        const e = ease(k), s = Math.sin(t * 9);
        p.move('body', 0, -0.13 * e, -0.04 * e);
        p.rot('body', -0.28 * e, 0, 0);
        p.rot('legBL', 1.25 * e, 0, 0.12 * e);
        p.rot('legBR', 1.25 * e, 0, -0.12 * e);
        p.rot('legFL', 0.12 * e, 0, 0);
        p.rot('legFR', (-2.2 + s * 0.35) * e, (0.35 + s * 0.45) * e, 0);
        p.rot('head', -0.05 * e, s * 0.14 * e, 0);
        p.rot('tail1', 0.4 * e, (0.8 + s * 0.4) * e, 0);
        p.rot('tail2', 0, 0.5 * e, 0);
        p.rot('earL', 0.1 * e, 0, -0.1 * e);
        p.rot('earR', 0.1 * e, 0, 0.1 * e);
      }
    },
    {
      id: 'bow', name: 'Поклон', icon: '🙇', dur: 2.0,
      desc: 'Кланяется, как настоящий маг',
      pose(p, k) {
        const d = Math.sin(Math.min(1, k * 1.25) * Math.PI);
        p.move('body', 0, -0.10 * d, 0.10 * d);
        p.rot('body', 0.72 * d, 0, 0);
        p.rot('legFL', -0.55 * d, 0, 0);
        p.rot('legFR', -0.55 * d, 0, 0);
        p.rot('legBL', -0.2 * d, 0, 0);
        p.rot('legBR', -0.2 * d, 0, 0);
        p.rot('head', 0.5 * d, 0, 0);
        p.rot('tail1', -1.3 * d, 0, 0);
        p.rot('tail2', -0.6 * d, 0, 0);
        p.rot('tail3', -0.4 * d, 0, 0);
        p.rot('hat', -0.34 - 0.3 * d, 0, 0);
        p.rot('earL', 0.3 * d, 0, -0.2 * d);
        p.rot('earR', 0.3 * d, 0, 0.2 * d);
      }
    },
    {
      id: 'wash', name: 'Умывается', icon: '🧼', dur: 3.2, loop: true,
      desc: 'Вылизывает лапку, как все коты',
      pose(p, k, t) {
        const e = ease(k), s = Math.sin(t * 11);
        p.move('body', 0, -0.13 * e, -0.04 * e);
        p.rot('body', -0.2 * e, 0, 0);
        p.rot('legBL', 1.25 * e, 0, 0.12 * e);
        p.rot('legBR', 1.25 * e, 0, -0.12 * e);
        p.rot('legFR', -1.75 * e, 0.3 * e, 0);
        p.rot('legFL', 0.1 * e, 0, 0);
        p.rot('head', (0.55 + s * 0.16) * e, 0.26 * e, s * 0.08 * e);
        p.scale('eyeL', 1, 0.25 + 0.75 * (1 - e), 1);
        p.scale('eyeR', 1, 0.25 + 0.75 * (1 - e), 1);
        p.rot('tail1', 0.5 * e, 1.0 * e, 0);
        p.rot('tail2', 0, (0.6 + s * 0.1) * e, 0);
        p.rot('earL', -0.2 * e, 0, -0.25 * e);
        p.rot('earR', -0.2 * e, 0, 0.25 * e);
      }
    },
    {
      id: 'stretch', name: 'Потянуться', icon: '🙆', dur: 2.4,
      desc: 'Тянется всем телом и зевает',
      pose(p, k, t) {
        const d = Math.sin(Math.min(1, k * 1.15) * Math.PI);
        p.move('body', 0, -0.16 * d, 0.06 * d);
        p.rot('body', 0.5 * d, 0, 0);
        p.rot('legFL', -1.15 * d, -0.12 * d, 0);
        p.rot('legFR', -1.15 * d, 0.12 * d, 0);
        p.rot('legBL', 0.55 * d, 0, 0.1 * d);
        p.rot('legBR', 0.55 * d, 0, -0.1 * d);
        p.rot('head', -0.5 * d, 0, 0);
        p.scale('mouthL', 1, 1 + d * 2.2, 1);
        p.scale('mouthR', 1, 1 + d * 2.2, 1);
        p.move('mouthL', 0, -0.02 * d, 0);
        p.move('mouthR', 0, -0.02 * d, 0);
        p.scale('eyeL', 1, 1 - d * 0.8, 1);
        p.scale('eyeR', 1, 1 - d * 0.8, 1);
        p.rot('tail1', -1.5 * d, 0, 0);
        p.rot('tail2', -0.7 * d, 0, 0);
        p.rot('tail3', -0.5 * d, 0, 0);
        p.rot('tail4', -0.3 * d, 0, 0);
        p.rot('earL', -0.35 * d, 0, -0.3 * d);
        p.rot('earR', -0.35 * d, 0, 0.3 * d);
      }
    },
    {
      id: 'cheer', name: 'Ура!', icon: '🎉', dur: 2.4, loop: true,
      desc: 'Подпрыгивает от радости',
      pose(p, k, t) {
        const e = ease(k), j = Math.abs(Math.sin(t * 6));
        p.move('body', 0, (0.12 + j * 0.28) * e, 0);
        p.rot('body', -0.4 * e, 0, 0);
        p.rot('legFL', (-2.5 - j * 0.3) * e, -0.35 * e, 0);
        p.rot('legFR', (-2.5 - j * 0.3) * e, 0.35 * e, 0);
        p.rot('legBL', (0.5 - j * 0.6) * e, 0, 0);
        p.rot('legBR', (0.5 - j * 0.6) * e, 0, 0);
        p.rot('head', -0.3 * e, 0, 0);
        p.scale('mouthL', 1.4, 1.6, 1);
        p.scale('mouthR', 1.4, 1.6, 1);
        p.rot('tail1', (-1.2 - j * 0.4) * e, 0, 0);
        p.rot('tail2', -0.5 * e, 0, 0);
        p.rot('earL', -0.45 * e, 0, -0.45 * e);
        p.rot('earR', -0.45 * e, 0, 0.45 * e);
      }
    },
    {
      id: 'lie', name: 'Полежать', icon: '😌', dur: 4.0, loop: true,
      desc: 'Валится на бок и дремлет',
      pose(p, k, t) {
        const e = ease(k), br = Math.sin(t * 1.8) * 0.03;
        p.move('body', 0.12 * e, -0.30 * e + br, 0);
        p.rot('body', 0, 0, (1.35 + br) * e);
        p.rot('legFL', -0.75 * e, 0, -0.4 * e);
        p.rot('legFR', -0.55 * e, 0, -0.3 * e);
        p.rot('legBL', 0.8 * e, 0, 0.3 * e);
        p.rot('legBR', 0.6 * e, 0, 0.2 * e);
        p.rot('head', 0.15 * e, 0.3 * e, 0.9 * e);
        p.scale('eyeL', 1, 0.12 + 0.88 * (1 - e), 1);
        p.scale('eyeR', 1, 0.12 + 0.88 * (1 - e), 1);
        p.rot('tail1', 0.2 * e, (0.9 + Math.sin(t * 2.2) * 0.4) * e, 0);
        p.rot('tail2', 0, 0.6 * e, 0);
        p.rot('tail3', 0, (0.5 + Math.sin(t * 2.2 + 1) * 0.3) * e, 0);
        p.rot('earL', -0.3 * e, 0, -0.3 * e);
        p.rot('earR', -0.3 * e, 0, 0.3 * e);
      }
    },
    {
      id: 'scared', name: 'Испугался', icon: '🙀', dur: 2.2,
      desc: 'Шерсть дыбом, уши прижаты',
      pose(p, k, t) {
        const e = ease(k), sh = Math.sin(t * 26) * 0.035 * e;
        p.move('body', sh, -0.08 * e, -0.12 * e);
        p.rot('body', -0.35 * e, sh, 0);
        p.rot('legFL', -0.5 * e, -0.3 * e, 0);
        p.rot('legFR', -0.5 * e, 0.3 * e, 0);
        p.rot('legBL', 0.35 * e, 0, 0.25 * e);
        p.rot('legBR', 0.35 * e, 0, -0.25 * e);
        p.rot('head', -0.25 * e, sh * 2, 0);
        p.scale('eyeL', 1.5, 1.5, 1);
        p.scale('eyeR', 1.5, 1.5, 1);
        p.rot('earL', -1.0 * e, 0, -0.85 * e);
        p.rot('earR', -1.0 * e, 0, 0.85 * e);
        // хвост трубой
        p.rot('tail1', -1.5 * e, 0, 0);
        p.rot('tail2', -0.3 * e, 0, 0);
        p.scale('tail2', 1 + e * 0.7, 1 + e * 0.7, 1 + e * 0.7);
        p.scale('tail3', 1 + e * 0.8, 1 + e * 0.8, 1 + e * 0.8);
        p.scale('tail4', 1 + e * 0.8, 1 + e * 0.8, 1 + e * 0.8);
      }
    },
    {
      id: 'think', name: 'Задумался', icon: '🤔', dur: 2.8, loop: true,
      desc: 'Лапка у подбородка, хвост качается',
      pose(p, k, t) {
        const e = ease(k), s = Math.sin(t * 1.6);
        p.move('body', 0, -0.13 * e, -0.04 * e);
        p.rot('body', -0.24 * e, 0, 0);
        p.rot('legBL', 1.25 * e, 0, 0.12 * e);
        p.rot('legBR', 1.25 * e, 0, -0.12 * e);
        p.rot('legFR', -2.0 * e, 0.15 * e, 0);
        p.rot('legFL', 0.1 * e, 0, 0);
        p.rot('head', (0.18 + s * 0.06) * e, s * 0.3 * e, 0.16 * e);
        p.rot('tail1', 0.35 * e, s * 0.8 * e, 0);
        p.rot('tail2', 0, s * 0.55 * e, 0);
        p.rot('tail3', 0, Math.sin(t * 1.6 + 0.8) * 0.5 * e, 0);
        p.rot('earL', -0.1 * e, 0, -0.05 * e);
        p.rot('earR', 0.15 * e, 0, 0.3 * e);
      }
    },
    {
      id: 'spin', name: 'Кувырок', icon: '🌀', dur: 1.1,
      desc: 'Крутится через себя',
      pose(p, k) {
        const a = k * Math.PI * 2;
        p.move('body', 0, Math.sin(k * Math.PI) * 0.35, 0);
        p.rot('body', -a, 0, 0);
        p.rot('legFL', -1.55, 0, 0); p.rot('legFR', -1.55, 0, 0);
        p.rot('legBL', 1.5, 0, 0); p.rot('legBR', 1.5, 0, 0);
        p.rot('tail1', -1.1, 0.5, 0); p.rot('tail2', -0.8, 0.4, 0);
        p.rot('tail3', -0.7, 0.4, 0); p.rot('tail4', -0.6, 0.3, 0);
        p.rot('head', 0.42, 0, 0);
        p.rot('earL', -0.5, 0, -0.4); p.rot('earR', -0.5, 0, 0.4);
      }
    },
    {
      id: 'purr', name: 'Мурлыкать', icon: '😽', dur: 3.0, loop: true,
      desc: 'Трётся головой и жмурится',
      pose(p, k, t) {
        const e = ease(k), s = Math.sin(t * 4.5), v = Math.sin(t * 30) * 0.012;
        p.move('body', s * 0.09 * e, -0.12 * e + v, 0);
        p.rot('body', -0.2 * e, s * 0.25 * e, s * 0.12 * e);
        p.rot('legBL', 1.2 * e, 0, 0.12 * e);
        p.rot('legBR', 1.2 * e, 0, -0.12 * e);
        p.rot('legFL', 0.1 * e, 0, 0);
        p.rot('legFR', 0.1 * e, 0, 0);
        p.rot('head', 0.1 * e, s * 0.6 * e, s * 0.35 * e);
        p.scale('eyeL', 1, 0.16 + 0.84 * (1 - e), 1);
        p.scale('eyeR', 1, 0.16 + 0.84 * (1 - e), 1);
        p.rot('tail1', (-0.3 + s * 0.2) * e, s * 0.5 * e, 0);
        p.rot('tail2', -0.2 * e, s * 0.6 * e, 0);
        p.rot('tail3', -0.15 * e, Math.sin(t * 4.5 + 0.7) * 0.6 * e, 0);
        p.rot('earL', 0.2 * e, 0, -0.1 * e);
        p.rot('earR', 0.2 * e, 0, 0.1 * e);
      }
    },
    {
      id: 'tease', name: 'Дразнится', icon: '😜', dur: 2.0,
      desc: 'Показывает язык и вертит хвостом',
      pose(p, k, t) {
        const e = ease(k), s = Math.sin(t * 8);
        p.move('body', 0, 0.04 * e, 0);
        p.rot('body', -0.15 * e, s * 0.3 * e, 0);
        p.rot('legFL', (-1.6 + s * 0.3) * e, -0.4 * e, 0);
        p.rot('legFR', 0.1 * e, 0, 0);
        p.rot('head', -0.12 * e, s * 0.35 * e, 0.2 * e);
        p.scale('mouthL', 1.3, 1.8, 1.6);
        p.scale('mouthR', 1.3, 1.8, 1.6);
        p.move('mouthL', 0, -0.03 * e, 0.05 * e);
        p.move('mouthR', 0, -0.03 * e, 0.05 * e);
        p.scale('eyeL', 1, 0.2 + 0.8 * (1 - e), 1);
        p.rot('tail1', -1.2 * e, s * 0.9 * e, 0);
        p.rot('tail2', -0.4 * e, s * 0.8 * e, 0);
        p.rot('tail3', -0.3 * e, Math.sin(t * 8 + 0.6) * 0.8 * e, 0);
        p.rot('earL', -0.4 * e, 0, -0.5 * e);
        p.rot('earR', 0.25 * e, 0, 0.2 * e);
      }
    },
    {
      id: 'sleep', name: 'Спать', icon: '😴', dur: 5.0, loop: true,
      desc: 'Свернулся клубком и посапывает',
      pose(p, k, t) {
        const e = ease(k), дых = Math.sin(t * 1.6);
        p.move('body', 0, (-0.34 + дых * 0.03) * e, 0);
        p.rot('body', 0.1 * e, 0.5 * e, 0.06 * e);
        p.rot('legBL', 1.5 * e, 0.3 * e, 0.3 * e);
        p.rot('legBR', 1.5 * e, -0.2 * e, -0.3 * e);
        p.rot('legFL', 1.4 * e, 0.4 * e, 0.2 * e);
        p.rot('legFR', 1.4 * e, -0.3 * e, -0.2 * e);
        p.rot('head', (0.55 + дых * 0.04) * e, -0.9 * e, 0.25 * e);
        p.rot('tail1', 0.9 * e, 1.4 * e, 0);
        p.rot('tail2', 0.3 * e, 1.1 * e, 0);
        p.rot('tail3', 0.2 * e, 0.9 * e, 0);
        p.rot('earL', 0.35 * e, 0, -0.5 * e);
        p.rot('earR', 0.35 * e, 0, 0.5 * e);
        p.rot('eyeL', 0, 0, 0); p.rot('eyeR', 0, 0, 0);
      }
    },
    {
      id: 'jumpjoy', name: 'Прыгать', icon: '🤸', dur: 2.6, loop: true,
      desc: 'Скачет от радости',
      pose(p, k, t) {
        const e = ease(k), ф = t * 5.2;
        const прыг = Math.max(0, Math.sin(ф));
        p.move('body', 0, (прыг * 0.55) * e, 0);
        p.rot('body', (-0.2 - прыг * 0.25) * e, 0, Math.sin(ф * 0.5) * 0.1 * e);
        p.rot('legBL', (0.3 - прыг * 0.9) * e, 0, 0.15 * e);
        p.rot('legBR', (0.3 - прыг * 0.9) * e, 0, -0.15 * e);
        p.rot('legFL', (-0.6 - прыг * 1.1) * e, 0, -0.2 * e);
        p.rot('legFR', (-0.6 - прыг * 1.1) * e, 0, 0.2 * e);
        p.rot('head', (-0.25 - прыг * 0.2) * e, 0, 0);
        p.rot('tail1', (-1.1 - прыг * 0.5) * e, Math.sin(ф * 2) * 0.4 * e, 0);
        p.rot('tail2', -0.5 * e, Math.sin(ф * 2 + 0.6) * 0.5 * e, 0);
        p.rot('earL', (-0.35 - прыг * 0.2) * e, 0, -0.2 * e);
        p.rot('earR', (-0.35 - прыг * 0.2) * e, 0, 0.2 * e);
      }
    },
    {
      id: 'sit', name: 'Сидеть', icon: '🐈', dur: 4.5, loop: true,
      desc: 'Сидит столбиком и глядит по сторонам',
      pose(p, k, t) {
        const e = ease(k), гл = Math.sin(t * 0.7);
        p.move('body', 0, -0.16 * e, -0.06 * e);
        p.rot('body', -0.55 * e, 0, 0);
        p.rot('legBL', 1.5 * e, 0, 0.14 * e);
        p.rot('legBR', 1.5 * e, 0, -0.14 * e);
        p.rot('legFL', 0.55 * e, 0, 0.05 * e);
        p.rot('legFR', 0.55 * e, 0, -0.05 * e);
        p.rot('head', (0.05 + Math.sin(t * 1.3) * 0.05) * e, гл * 0.75 * e, гл * 0.1 * e);
        p.rot('tail1', 1.15 * e, Math.sin(t * 1.1) * 0.25 * e, 0);
        p.rot('tail2', 0.35 * e, Math.sin(t * 1.1 + 0.4) * 0.3 * e, 0);
        p.rot('tail3', 0.2 * e, Math.sin(t * 1.1 + 0.8) * 0.35 * e, 0);
        p.rot('earL', Math.sin(t * 2.2) * 0.12 * e, 0, -0.1 * e);
        p.rot('earR', Math.sin(t * 2.2 + 1) * 0.12 * e, 0, 0.1 * e);
      }
    },
    {
      id: 'laugh', name: 'Смеётся', icon: '😹', dur: 2.8, loop: true,
      desc: 'Хохочет так, что трясётся',
      pose(p, k, t) {
        const e = ease(k), см = Math.sin(t * 12);
        p.move('body', 0, (-0.06 + Math.abs(см) * 0.06) * e, 0);
        p.rot('body', (-0.3 + см * 0.12) * e, 0, см * 0.08 * e);
        p.rot('legBL', 0.9 * e, 0, 0.1 * e);
        p.rot('legBR', 0.9 * e, 0, -0.1 * e);
        p.rot('legFL', (-1.2 + см * 0.3) * e, -0.4 * e, 0);
        p.rot('legFR', (-1.2 - см * 0.3) * e, 0.4 * e, 0);
        p.rot('head', (-0.45 + см * 0.18) * e, 0, см * 0.12 * e);
        p.rot('tail1', (-0.6 + см * 0.25) * e, Math.sin(t * 6) * 0.4 * e, 0);
        p.rot('tail2', -0.3 * e, Math.sin(t * 6 + 0.5) * 0.5 * e, 0);
        p.rot('earL', -0.4 * e, 0, -0.3 * e);
        p.rot('earR', -0.4 * e, 0, 0.3 * e);
      }
    },
    {
      id: 'sad', name: 'Грустит', icon: '😿', dur: 3.6, loop: true,
      desc: 'Понурил голову и вздыхает',
      pose(p, k, t) {
        const e = ease(k), вздох = Math.sin(t * 1.1);
        p.move('body', 0, (-0.12 + вздох * 0.03) * e, 0);
        p.rot('body', 0.14 * e, 0, 0);
        p.rot('legBL', 0.5 * e, 0, 0.1 * e);
        p.rot('legBR', 0.5 * e, 0, -0.1 * e);
        p.rot('legFL', 0.25 * e, 0, 0.06 * e);
        p.rot('legFR', 0.25 * e, 0, -0.06 * e);
        p.rot('head', (0.62 + вздох * 0.06) * e, Math.sin(t * 0.5) * 0.12 * e, 0);
        p.rot('tail1', 0.95 * e, 0, 0);
        p.rot('tail2', 0.45 * e, Math.sin(t * 0.9) * 0.1 * e, 0);
        p.rot('tail3', 0.3 * e, 0, 0);
        p.rot('earL', 0.6 * e, 0, -0.55 * e);
        p.rot('earR', 0.6 * e, 0, 0.55 * e);
      }
    },
    {
      id: 'angry', name: 'Сердится', icon: '😾', dur: 2.6, loop: true,
      desc: 'Шипит, выгнув спину дугой',
      pose(p, k, t) {
        const e = ease(k), др = Math.sin(t * 16) * 0.04;
        p.move('body', 0, (0.14 + др) * e, 0);
        p.rot('body', (-0.42 + др) * e, 0, 0);
        p.rot('legBL', (0.2 + др) * e, 0, 0.28 * e);
        p.rot('legBR', (0.2 - др) * e, 0, -0.28 * e);
        p.rot('legFL', (-0.3 + др) * e, 0, -0.3 * e);
        p.rot('legFR', (-0.3 - др) * e, 0, 0.3 * e);
        p.rot('head', (-0.22 + др * 2) * e, 0, 0);
        p.rot('tail1', -1.5 * e, Math.sin(t * 5) * 0.5 * e, 0);
        p.rot('tail2', -0.7 * e, Math.sin(t * 5 + 0.7) * 0.6 * e, 0);
        p.rot('tail3', -0.4 * e, Math.sin(t * 5 + 1.4) * 0.6 * e, 0);
        p.rot('earL', 0.85 * e, 0, -0.8 * e);
        p.rot('earR', 0.85 * e, 0, 0.8 * e);
      }
    },
    {
      id: 'hunt', name: 'Крадётся', icon: '🐈‍⬛', dur: 3.4, loop: true,
      desc: 'Припал к земле и подкрадывается',
      pose(p, k, t) {
        const e = ease(k), ш = Math.sin(t * 2.4);
        p.move('body', 0, -0.3 * e, 0);
        p.rot('body', 0.06 * e, ш * 0.08 * e, 0);
        p.rot('legBL', (0.75 + ш * 0.3) * e, 0, 0.2 * e);
        p.rot('legBR', (0.75 - ш * 0.3) * e, 0, -0.2 * e);
        p.rot('legFL', (0.55 - ш * 0.35) * e, 0, 0.15 * e);
        p.rot('legFR', (0.55 + ш * 0.35) * e, 0, -0.15 * e);
        p.rot('head', -0.18 * e, ш * 0.2 * e, 0);
        p.rot('tail1', (0.5 + Math.sin(t * 3.1) * 0.35) * e, Math.sin(t * 3.1) * 0.8 * e, 0);
        p.rot('tail2', 0.2 * e, Math.sin(t * 3.1 + 0.6) * 0.7 * e, 0);
        p.rot('tail3', 0.1 * e, Math.sin(t * 3.1 + 1.2) * 0.7 * e, 0);
        p.rot('earL', -0.25 * e, 0, -0.15 * e);
        p.rot('earR', -0.25 * e, 0, 0.15 * e);
      }
    },
    {
      id: 'roll', name: 'Валяется', icon: '🙃', dur: 3.8, loop: true,
      desc: 'Катается на спине кверху лапами',
      pose(p, k, t) {
        const e = ease(k), кач = Math.sin(t * 2.2);
        p.move('body', кач * 0.12 * e, -0.34 * e, 0);
        p.rot('body', 0, 0, (2.9 + кач * 0.35) * e);
        p.rot('legBL', (-1.3 + кач * 0.3) * e, 0, 0.4 * e);
        p.rot('legBR', (-1.3 - кач * 0.3) * e, 0, -0.4 * e);
        p.rot('legFL', (-1.5 - кач * 0.4) * e, 0, 0.3 * e);
        p.rot('legFR', (-1.5 + кач * 0.4) * e, 0, -0.3 * e);
        p.rot('head', 0.2 * e, кач * 0.3 * e, 0);
        p.rot('tail1', (0.4 + кач * 0.4) * e, кач * 0.6 * e, 0);
        p.rot('tail2', 0.3 * e, кач * 0.5 * e, 0);
        p.rot('earL', 0.1 * e, 0, -0.2 * e);
        p.rot('earR', 0.1 * e, 0, 0.2 * e);
      }
    },
    {
      id: 'magic', name: 'Колдует', icon: '🪄', dur: 3.0, loop: true,
      desc: 'Водит лапами и творит волшебство',
      pose(p, k, t) {
        const e = ease(k), в = t * 3.4;
        p.move('body', 0, (0.06 + Math.sin(в) * 0.05) * e, 0);
        p.rot('body', -0.62 * e, Math.sin(в * 0.5) * 0.18 * e, 0);
        p.rot('legBL', 1.25 * e, 0, 0.12 * e);
        p.rot('legBR', 1.25 * e, 0, -0.12 * e);
        p.rot('legFL', (-2.1 + Math.sin(в) * 0.5) * e, (-0.6 + Math.cos(в) * 0.4) * e, 0);
        p.rot('legFR', (-2.1 + Math.cos(в) * 0.5) * e, (0.6 - Math.sin(в) * 0.4) * e, 0);
        p.rot('head', (-0.3 + Math.sin(в * 0.7) * 0.12) * e, Math.sin(в * 0.4) * 0.3 * e, 0);
        p.rot('tail1', (-0.9 + Math.sin(в * 0.8) * 0.3) * e, Math.sin(в) * 0.5 * e, 0);
        p.rot('tail2', -0.5 * e, Math.sin(в + 0.5) * 0.6 * e, 0);
        p.rot('tail3', -0.3 * e, Math.sin(в + 1) * 0.6 * e, 0);
        p.rot('earL', -0.45 * e, 0, -0.3 * e);
        p.rot('earR', -0.45 * e, 0, 0.3 * e);
      }
    },
    {
      id: 'headbutt', name: 'Бодается', icon: '🤗', dur: 2.4, loop: true,
      desc: 'Ласково тычется головой, как в хозяина',
      pose(p, k, t) {
        const e = ease(k), т = Math.sin(t * 3.6);
        p.move('body', 0, -0.08 * e, (0.12 + т * 0.14) * e);
        p.rot('body', (-0.1 + т * 0.1) * e, 0, т * 0.2 * e);
        p.rot('legBL', 0.35 * e, 0, 0.12 * e);
        p.rot('legBR', 0.35 * e, 0, -0.12 * e);
        p.rot('legFL', (0.15 - т * 0.2) * e, 0, 0.08 * e);
        p.rot('legFR', (0.15 + т * 0.2) * e, 0, -0.08 * e);
        p.rot('head', (-0.32 + т * 0.22) * e, 0, (0.3 + т * 0.35) * e);
        p.rot('tail1', (-0.5 + т * 0.2) * e, Math.sin(t * 2.4) * 0.45 * e, 0);
        p.rot('tail2', -0.25 * e, Math.sin(t * 2.4 + 0.6) * 0.5 * e, 0);
        p.rot('earL', -0.2 * e, 0, -0.25 * e);
        p.rot('earR', -0.2 * e, 0, 0.25 * e);
      }
    },
    {
      id: 'sneeze', name: 'Чихает', icon: '🤧', dur: 1.8,
      desc: 'Морщится и звонко чихает',
      pose(p, k) {
        const e = ease(k);
        // сначала набирает воздух, потом резко чихает
        const наб = Math.min(1, k / 0.55);
        const чих = k > 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.25) : 0;
        p.move('body', 0, (-0.05 - чих * 0.1) * e, (-наб * 0.08 + чих * 0.2) * e);
        p.rot('body', (-0.15 * наб + чих * 0.45) * e, 0, 0);
        p.rot('legBL', 0.6 * e, 0, 0.1 * e);
        p.rot('legBR', 0.6 * e, 0, -0.1 * e);
        p.rot('legFL', (0.2 - чих * 0.5) * e, 0, 0.1 * e);
        p.rot('legFR', (0.2 - чих * 0.5) * e, 0, -0.1 * e);
        p.rot('head', (-0.5 * наб + чих * 1.15) * e, 0, 0);
        p.rot('tail1', (0.4 - чих * 0.6) * e, 0, 0);
        p.rot('tail2', 0.2 * e, 0, 0);
        p.rot('earL', (0.2 + чих * 0.5) * e, 0, (-0.2 - чих * 0.4) * e);
        p.rot('earR', (0.2 + чих * 0.5) * e, 0, (0.2 + чих * 0.4) * e);
      }
    },
    {
      id: 'proud', name: 'Гордится', icon: '😼', dur: 3.2, loop: true,
      desc: 'Выпятил грудь и важно расхаживает',
      pose(p, k, t) {
        const e = ease(k), ш = Math.sin(t * 2.8);
        p.move('body', 0, (0.08 + Math.abs(ш) * 0.05) * e, 0);
        p.rot('body', -0.3 * e, ш * 0.12 * e, 0);
        p.rot('legBL', (0.15 + ш * 0.45) * e, 0, 0.1 * e);
        p.rot('legBR', (0.15 - ш * 0.45) * e, 0, -0.1 * e);
        p.rot('legFL', (-0.25 - ш * 0.5) * e, 0, 0.08 * e);
        p.rot('legFR', (-0.25 + ш * 0.5) * e, 0, -0.08 * e);
        p.rot('head', -0.42 * e, ш * 0.22 * e, 0);
        p.rot('tail1', -1.45 * e, ш * 0.2 * e, 0);
        p.rot('tail2', -0.35 * e, ш * 0.25 * e, 0);
        p.rot('tail3', -0.15 * e, ш * 0.3 * e, 0);
        p.rot('earL', -0.3 * e, 0, -0.12 * e);
        p.rot('earR', -0.3 * e, 0, 0.12 * e);
      }
    }
  ];

  const BY = {};
  EMOTES.forEach((e, i) => { BY[e.id] = e; e.index = i; });

  KM.EMOTES = EMOTES;
  KM.EMOTE_BY = BY;

  /** Наложить выходку на позу. Возвращает true, если что-то нарисовали. */
  KM.applyEmote = function (pose, id, elapsed, t) {
    const def = BY[id];
    if (!def) return false;
    const k = def.loop
      ? Math.min(1, elapsed / def.dur)
      : Math.min(1, elapsed / def.dur);
    if (k >= 1) return false;
    try { def.pose(pose, k, t); } catch (e) { return false; }
    return true;
  };
})(window);
