/**
 * ПОМОЩНИК ДЛЯ ОФЛАЙНА
 *
 * Этот файл живёт рядом с игрой и запоминает её у игрока в браузере.
 * Благодаря ему:
 *   • игру можно установить на рабочий стол или на экран телефона —
 *     браузеры предлагают это только тем сайтам, у кого такой помощник есть;
 *   • один раз открыв игру, дальше в неё можно играть без интернета.
 *
 * Как он решает, что отдавать:
 *   • саму страницу игры — сначала пробуем свежую из сети, а если сети
 *     нет, отдаём запомненную. Так обновления доходят сразу, а без сети
 *     игра всё равно открывается;
 *   • картинки, стили и скрипты — сразу из памяти, они меняются редко;
 *   • всё, что начинается с /api/ — только из сети: это разговор
 *     с сервером про друзей и сохранения, запоминать его нельзя.
 */
const КЭШ = 'kmagi-v200';

// На всякий случай просим и «./», и «./index.html»: разные хостинги
// отдают главную страницу по-разному, а запомнить её надо обязательно —
// иначе без интернета игра не откроется.
const СРАЗУ = ['./', './index.html', './igra.html', './manifest.json',
               './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  // Кладём по одному, а не пачкой: если пачкой, то один недоступный
  // файл отменяет всю запись, и офлайна не будет вовсе.
  e.waitUntil(
    caches.open(КЭШ).then((c) => Promise.all(
      СРАЗУ.map((путь) => c.add(путь).catch(() => { }))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  // старые запасы убираем, иначе игра застрянет на прошлой версии
  e.waitUntil(
    caches.keys()
      .then((имена) => Promise.all(
        имена.filter((и) => и !== КЭШ).map((и) => caches.delete(и))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // чужое не трогаем
  if (url.pathname.indexOf('/api/') === 0) return;     // разговор с сервером

  // страница игры: свежая важнее запомненной
  const этоСтраница = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (этоСтраница) {
    e.respondWith(
      fetch(req)
        .then((ответ) => {
          const копия = ответ.clone();
          caches.open(КЭШ).then((c) => c.put(req, копия)).catch(() => { });
          return ответ;
        })
        .catch((беда) => {
        console.error('SW-СБОЙ', req.url, req.mode, req.destination, req.cache, String(beda_msg(беда)));
        return ( caches.match(req).then((c) => c || caches.match('./')))
    );
    return;
  }

  // Всё остальное: сначала память, потом сеть.
  //
  // Здесь важнее всего не сломаться. Если внутри respondWith запрос
  // сорвётся, браузер не пойдёт в сеть сам — он просто не выполнит
  // скрипт, и игра не откроется вовсе: чёрный экран вместо котов.
  // Поэтому на каждый случай есть запасной ход, и в самом конце мы
  // всё равно что-то отдаём.
  e.respondWith(отдать(req));
});


async function отдать(req) {
  try {
    const из_памяти = await caches.match(req);
    if (из_памяти) return из_памяти;
  } catch (e) { /* памяти нет — не беда, сходим в сеть */ }

  try {
    const ответ = await fetch(req);
    if (ответ && ответ.status === 200 && ответ.type === 'basic') {
      const копия = ответ.clone();
      caches.open(КЭШ).then((c) => c.put(req, копия)).catch(() => { });
    }
    return ответ;
  } catch (беда) {
    console.error('SW не смог достать', req.url,
      '| mode=' + req.mode, 'dest=' + req.destination, 'cache=' + req.cache,
      '|', (беда && (беда.message || беда.name)) || беда);

    // Может, прошлая версия этого же файла лежит в памяти — у неё
    // отличается только «?v» в конце. Для офлайна она годится:
    // лучше вчерашняя игра, чем чёрный экран.
    try {
      const прошлая = await caches.match(req, { ignoreSearch: true });
      if (прошлая) return прошлая;
    } catch (e) { /* и этого нет */ }

    return Response.error();
  }
}
