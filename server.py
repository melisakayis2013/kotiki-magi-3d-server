# -*- coding: utf-8 -*-
"""
============================================================
 КОТИКИ МАГИ 3D — сервер

 Делает две вещи сразу:
   1. Отдаёт саму игру по http://<адрес>:8765/
   2. Держит многопользовательский режим на ws://<адрес>:8765/ws

 Никаких сторонних библиотек — только то, что уже есть в Python.
 Запускается двойным щелчком по «ИГРАТЬ.bat» или командой:

     python server.py

 Чтобы позвать друга с телефона или другого компьютера, дайте
 ему адрес, который сервер напечатает при запуске. Работать
 будет, пока оба устройства в одной сети Wi-Fi.
============================================================
"""

import base64
import hashlib
import hmac
import signal
import json
import os
import socket
import struct
import sys
import threading
import time
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, 'server_data.json')
# Облачные хостинги (Render, Railway и другие) сами говорят,
# какой порт слушать, — через переменную PORT.
PORT = int(os.environ.get('PORT') or os.environ.get('KMAGI_PORT') or 8765)
# Порт нам назначили снаружи — значит, перебирать соседние нельзя
# и браузер открывать некому.
FIXED_PORT = bool(os.environ.get('PORT') or os.environ.get('KMAGI_PORT'))

# А вот «мы в интернете» — совсем другой вопрос. Раньше это решалось
# по одной переменной PORT, и любой запуск с заданным портом дома
# выдавал себя за хостинг: игра переставала показывать адрес для
# телефона. Поэтому спрашиваем у самих хостингов, по их приметам.
CLOUD = bool(
    os.environ.get('KMAGI_CLOUD')
    or os.environ.get('RENDER') or os.environ.get('RENDER_SERVICE_ID')
    or os.environ.get('DYNO')                      # Heroku
    or os.environ.get('FLY_APP_NAME')              # Fly.io
    or os.environ.get('RAILWAY_ENVIRONMENT')       # Railway
    or os.environ.get('K_SERVICE')                 # Google Cloud Run
    or os.environ.get('WEBSITE_INSTANCE_ID')       # Azure
    or os.environ.get('SPACE_ID')                  # Hugging Face
)
GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'


# ------------------------------------------------------------
#  ПЕЧАТЬ В ОКНО
#  Старые консоли Windows не умеют эмодзи и падают на них.
#  Сервер из-за такой мелочи останавливаться не должен.
# ------------------------------------------------------------
def say(text=''):
    try:
        print(text)
        return
    except Exception:
        pass
    try:
        print(text.encode('ascii', 'replace').decode('ascii'))
    except Exception:
        pass

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}



# ============================================================
#  КУДА КЛАДЁМ ДАННЫЕ
#
#  Дома всё просто: рядом с сервером лежит server_data.json.
#  А на бесплатном хостинге папка стирается при каждом перезапуске —
#  и аккаунты, друзья и переписка пропали бы. Поэтому есть второй
#  вариант: база данных, адрес которой хостинг кладёт в DATABASE_URL.
#
#  Игра сама выбирает: есть DATABASE_URL — пишем в базу, нет — в файл.
#  Больше ничего настраивать не нужно.
# ============================================================
class FileBackend:
    """Обычный файл рядом с сервером. Дома этого достаточно."""

    name = 'файл ' + os.path.basename(DATA_FILE)

    def load(self):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None

    def save(self, data):
        tmp = DATA_FILE + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(tmp, DATA_FILE)      # заменяем разом, чтобы не порвать файл


class PgBackend:
    """
    База данных. Держим всё одной строчкой JSON — данных немного,
    а так не надо ни таблиц под каждую мелочь, ни переездов схемы.
    """

    name = 'база данных'

    def __init__(self, url, driver):
        self.url = url
        self.db = driver
        with self._conn() as c:
            with c.cursor() as cur:
                cur.execute('CREATE TABLE IF NOT EXISTS kmagi (k text PRIMARY KEY, v text)')
            c.commit()

    def _conn(self):
        return self.db.connect(self.url)

    def load(self):
        try:
            with self._conn() as c:
                with c.cursor() as cur:
                    cur.execute("SELECT v FROM kmagi WHERE k = 'data'")
                    row = cur.fetchone()
            return json.loads(row[0]) if row else None
        except Exception:
            traceback.print_exc()
            return None

    def save(self, data):
        текст = json.dumps(data, ensure_ascii=False)
        with self._conn() as c:
            with c.cursor() as cur:
                cur.execute(
                    "INSERT INTO kmagi (k, v) VALUES ('data', %s) "
                    "ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", (текст,))
            c.commit()


def выбрать_хранилище():
    """База, если хостинг её дал; иначе файл."""
    url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
    if url:
        # Драйвер ставится только на хостинге — дома он не нужен и не мешает.
        driver = None
        try:
            import psycopg as driver          # новый
        except Exception:
            try:
                import psycopg2 as driver     # старый, тоже подойдёт
            except Exception:
                driver = None
        if driver is not None:
            try:
                if url.startswith('postgres://'):
                    url = 'postgresql://' + url[len('postgres://'):]
                return PgBackend(url, driver)
            except Exception:
                say('  ! к базе подключиться не вышло — пишем в файл')
                traceback.print_exc()
        else:
            say('  ! DATABASE_URL есть, но драйвера нет — пишем в файл')
            say('    (добавьте psycopg[binary] в requirements.txt)')
    return FileBackend()


# ============================================================
#  ХРАНИЛИЩЕ ДРУЗЕЙ
# ============================================================
class Store:
    """Друзья и заявки живут в server_data.json, чтобы не пропасть."""

    ПОЛЯ = ('friends', 'requests', 'seen', 'users', 'dm', 'unread', 'счёт')

    def __init__(self):
        self.lock = threading.Lock()
        self.data = {k: {} for k in self.ПОЛЯ}
        self.backend = выбрать_хранилище()
        self.dirty = False          # есть ли несохранённые изменения
        self.last_write = 0.0
        self.load()
        # Пишем не на каждое движение, а раз в несколько секунд:
        # база — не файл, туда лишний раз ходить незачем.
        t = threading.Thread(target=self._flusher, daemon=True)
        t.start()

    def _flusher(self):
        while True:
            time.sleep(3)
            try:
                self.flush()
            except Exception:
                traceback.print_exc()

    def flush(self, force=False):
        """Записать, если есть что."""
        with self.lock:
            if not self.dirty and not force:
                return
            копия = json.loads(json.dumps(self.data))   # снимок, чтобы не держать замок
            self.dirty = False
        try:
            self.backend.save(копия)
            self.last_write = time.time()
        except Exception:
            with self.lock:
                self.dirty = True        # не вышло — попробуем в следующий раз
            traceback.print_exc()

    def load(self):
        d = None
        try:
            d = self.backend.load()
        except Exception:
            traceback.print_exc()

        # Переезд на базу: если в ней пусто, а рядом лежит старый файл —
        # забираем данные оттуда, чтобы ничего не потерялось.
        if not d and not isinstance(self.backend, FileBackend):
            try:
                d = FileBackend().load()
                if d:
                    say('  * данные перенесены из файла в базу')
            except Exception:
                d = None

        if isinstance(d, dict):
            for k in self.ПОЛЯ:
                if isinstance(d.get(k), dict):
                    self.data[k] = d[k]
            if not isinstance(self.backend, FileBackend):
                self.dirty = True        # сразу закрепим в базе

    def save(self):
        """Пометить, что данные изменились. Запишутся через пару секунд."""
        self.dirty = True


    # ------------------------------------------------------------
    #  УЧЁТНЫЕ ЗАПИСИ
    #  Пароль никогда не хранится как есть: только «отпечаток»,
    #  посчитанный с солью. По нему пароль не восстановить.
    # ------------------------------------------------------------
    @staticmethod
    def _hash(password, salt):
        return hashlib.pbkdf2_hmac(
            'sha256', password.encode('utf-8'), salt.encode('utf-8'), 120000).hex()

    @staticmethod
    def _key(nick):
        return (nick or '').strip().lower()

    def user(self, nick):
        return self.data['users'].get(self._key(nick))

    def register(self, nick, password, profile):
        nick = (nick or '').strip()[:16]
        if len(nick) < 3:
            return False, 'Ник не короче трёх букв'
        if len(password or '') < 4:
            return False, 'Пароль не короче четырёх знаков'
        with self.lock:
            if self._key(nick) in self.data['users']:
                return False, 'Такой ник уже занят — придумайте другой'
            salt = os.urandom(12).hex()
            self.data['users'][self._key(nick)] = {
                'nick': nick,
                'salt': salt,
                'hash': self._hash(password, salt),
                'profile': profile or {},
                'saves': {},
                'created': int(time.time()),
                'seen': int(time.time()),
            }
            self.save()
        return True, nick

    def auth(self, nick, password):
        u = self.user(nick)
        if not u:
            return None, 'Такого ника на сервере нет'
        if self._hash(password or '', u['salt']) != u['hash']:
            return None, 'Неверный пароль'
        with self.lock:
            u['seen'] = int(time.time())
            self.save()
        return u, None

    def change_password(self, nick, old, new):
        u, err = self.auth(nick, old)
        if err:
            return False, err
        if len(new or '') < 4:
            return False, 'Новый пароль не короче четырёх знаков'
        with self.lock:
            u['salt'] = os.urandom(12).hex()
            u['hash'] = self._hash(new, u['salt'])
            self.save()
        return True, None

    def put_save(self, nick, slot, blob):
        u = self.user(nick)
        if not u:
            return False
        if len(blob or '') > 400000:          # не даём забить диск
            return False
        with self.lock:
            u['saves'][str(slot)] = blob
            u['seen'] = int(time.time())
            self.save()
        return True

    def get_saves(self, nick):
        u = self.user(nick)
        return (u or {}).get('saves', {})


    # ------------------------------------------------------------
    #  ПЕРЕПИСКА ДРУЗЕЙ
    #  Переписка лежит на сервере, поэтому письмо дойдёт, даже если
    #  друг был не в игре: увидит, когда зайдёт.
    # ------------------------------------------------------------
    DM_KEEP = 200                 # сколько последних сообщений храним на пару

    @staticmethod
    def dm_key(a, b):
        x, y = (a or '').strip().lower(), (b or '').strip().lower()
        return '|'.join(sorted([x, y]))

    def dm_add(self, frm, to, text):
        text = (text or '').strip()[:400]
        if not text:
            return None
        row = {'f': frm, 'x': text, 'ts': int(time.time())}
        with self.lock:
            k = self.dm_key(frm, to)
            log = self.data['dm'].setdefault(k, [])
            log.append(row)
            if len(log) > self.DM_KEEP:
                del log[:-self.DM_KEEP]
            # непрочитанное считаем получателю
            box = self.data['unread'].setdefault(self._key(to), {})
            box[self._key(frm)] = box.get(self._key(frm), 0) + 1
            self.save()
        return row

    def dm_log(self, a, b, limit=80):
        with self.lock:
            return list(self.data['dm'].get(self.dm_key(a, b), []))[-limit:]

    def dm_unread(self, nick):
        with self.lock:
            return dict(self.data['unread'].get(self._key(nick), {}))

    def dm_read(self, nick, other):
        with self.lock:
            box = self.data['unread'].get(self._key(nick))
            if box and box.pop(self._key(other), None) is not None:
                self.save()

    # ------------------------------------------------------------
    #  ПОИСК ИГРОКОВ
    #  Ник помнят не полностью — подсказываем похожие.
    # ------------------------------------------------------------
    def search(self, q, limit=8):
        q = (q or '').strip().lower()
        if not q:
            return []
        известные = {}
        with self.lock:
            for u in self.data['users'].values():
                известные[u['nick'].lower()] = u['nick']
            for n in self.data['seen']:
                известные.setdefault(n.lower(), n)
        оценка = []
        for low, ник in известные.items():
            if low == q:
                вес = 0
            elif low.startswith(q):
                вес = 1
            elif q in low:
                вес = 2
            elif self._close(q, low):
                вес = 3
            else:
                continue
            оценка.append((вес, len(low), ник))
        оценка.sort()
        return [ник for _, _, ник in оценка[:limit]]

    @staticmethod
    def _close(a, b):
        """Одна опечатка: пропущена, лишняя или не та буква."""
        if abs(len(a) - len(b)) > 1 or not a or not b:
            return False
        if len(a) == len(b):
            разниц = sum(1 for x, y in zip(a, b) if x != y)
            return разниц == 1
        коротк, длин = (a, b) if len(a) < len(b) else (b, a)
        for i in range(len(длин)):
            if длин[:i] + длин[i + 1:] == коротк:
                return True
        return False

    # --- друзья ---
    def friends(self, nick):
        return list(self.data['friends'].get(nick, []))

    def requests(self, nick):
        return list(self.data['requests'].get(nick, []))

    def add_request(self, frm, to):
        """Заявка в друзья. Если встречная уже есть — сразу дружба."""
        with self.lock:
            if to == frm:
                return 'self'
            if to in self.data['friends'].get(frm, []):
                return 'already'
            # он уже звал меня? тогда не ждём, а сразу дружим
            mine = self.data['requests'].setdefault(frm, [])
            if to in mine:
                mine.remove(to)
                self._link(frm, to)
                self.save()
                return 'friends'
            theirs = self.data['requests'].setdefault(to, [])
            if frm in theirs:
                return 'pending'
            theirs.append(frm)
            self.save()
            return 'sent'

    def accept(self, nick, frm):
        with self.lock:
            reqs = self.data['requests'].setdefault(nick, [])
            if frm not in reqs:
                return False
            reqs.remove(frm)
            self._link(nick, frm)
            self.save()
            return True

    def decline(self, nick, frm):
        with self.lock:
            reqs = self.data['requests'].setdefault(nick, [])
            if frm in reqs:
                reqs.remove(frm)
                self.save()
                return True
            return False

    def remove_friend(self, nick, other):
        with self.lock:
            for a, b in ((nick, other), (other, nick)):
                lst = self.data['friends'].setdefault(a, [])
                if b in lst:
                    lst.remove(b)
            self.save()

    def _link(self, a, b):
        for x, y in ((a, b), (b, a)):
            lst = self.data['friends'].setdefault(x, [])
            if y not in lst:
                lst.append(y)

    def touch(self, nick):
        with self.lock:
            self.data['seen'][nick] = int(time.time())

    def last_seen(self, nick):
        return self.data['seen'].get(nick, 0)


STORE = Store()




# ============================================================
#  СЧЁТЧИК ПОСЕЩЕНИЙ
#
#  Считаем по дням: сколько раз открыли страницу, сколько раз
#  запустили игру и сколько раз её скачали. Отдельно — сколько
#  это было разных людей.
#
#  Кто именно приходил, мы не храним. От адреса берётся короткий
#  отпечаток, и по нему нельзя узнать ни адрес, ни человека, —
#  он нужен только чтобы не посчитать одного гостя десять раз.
#  Отпечатки старше недели выбрасываются.
# ============================================================
import hashlib


def _сегодня():
    return time.strftime('%Y-%m-%d')


def отметить(вид, адрес):
    """Записать одно посещение."""
    try:
        день = _сегодня()
        отпечаток = hashlib.sha256(
            ('котики' + str(адрес)).encode('utf-8')).hexdigest()[:12]
        with STORE.lock:
            счёт = STORE.data.setdefault('счёт', {})
            д = счёт.setdefault(день, {'страница': 0, 'игра': 0, 'скачали': 0, 'гости': []})
            д[вид] = д.get(вид, 0) + 1
            if отпечаток not in д['гости']:
                д['гости'].append(отпечаток)
            # старше недели не держим
            дни = sorted(счёт.keys())
            while len(дни) > 7:
                счёт.pop(дни.pop(0), None)
            STORE.dirty = True
    except Exception:
        pass          # счётчик не должен ронять сервер


def сводка():
    """Что показать хозяйке сайта."""
    счёт = (STORE.data.get('счёт') or {})
    строки = []
    всего = {'страница': 0, 'игра': 0, 'скачали': 0, 'людей': 0}
    for день in sorted(счёт.keys(), reverse=True):
        д = счёт[день]
        людей = len(д.get('гости') or [])
        строки.append({
            'день': день,
            'страница': д.get('страница', 0),
            'игра': д.get('игра', 0),
            'скачали': д.get('скачали', 0),
            'людей': людей,
        })
        всего['страница'] += д.get('страница', 0)
        всего['игра'] += д.get('игра', 0)
        всего['скачали'] += д.get('скачали', 0)
        всего['людей'] += людей
    return {'дни': строки, 'всего': всего}


# ============================================================
#  РЕЖИМЫ СЕРВЕРА
# ============================================================
MODES = {
    'coop': {
        'name': 'Дружная охота',
        'pvp': True,          # драться можно, но это не главное
        'monsters': True,
        'teams': False,
        'goal': 0,
        'time': 0,
    },
    'team': {
        'name': 'Красные против синих',
        'pvp': True,
        'monsters': True,
        'teams': True,
        'goal': 30,           # чья команда первой наберёт 30
        'time': 900,
    },
    'battle': {
        'name': 'Battle: один победитель',
        'pvp': True,
        'monsters': False,
        'teams': False,
        'goal': 0,
        'time': 300,          # пять минут на всё
    },
    'peace': {
        'name': 'Мирный',
        'pvp': False,
        'monsters': False,
        'teams': False,
        'goal': 0,
        'time': 0,
    },

    # ---- мини-игры ----
    # Футбол и баскетбол делят игроков на команды — этим занимается
    # тот же механизм, что и в «Красные против синих»: сервер сам
    # разводит вошедших поровну и говорит каждому, за кого он играет.
    'football': {
        'name': 'Кошачий футбол',
        'pvp': False, 'monsters': False, 'teams': True, 'goal': 0, 'time': 180,
    },
    'basket': {
        'name': 'Кошачий баскетбол',
        'pvp': False, 'monsters': False, 'teams': True, 'goal': 0, 'time': 120,
    },
    'parkour': {
        'name': 'Небесная тропа',
        'pvp': False, 'monsters': False, 'teams': False, 'goal': 0, 'time': 0,
    },
    'race': {
        'name': 'Кошачьи гонки',
        'pvp': False, 'monsters': False, 'teams': False, 'goal': 0, 'time': 0,
    },
    # Дуэль: двое, три раунда, силы уравнены. Команды нужны, чтобы
    # сервер сам назвал одного рыжим, другого синим — так понятно,
    # кто есть кто, и счёт раундов ведётся по командам.
    'duel': {
        'name': 'Дуэль',
        'pvp': True, 'monsters': False, 'teams': True, 'goal': 0, 'time': 0,
    },
    # Прятки. Драться незачем, команд нет: водящий один, и его роль
    # определяет не сервер, а то, кто в комнате хозяин.
    'hide': {
        'name': 'Прятки',
        'pvp': False, 'monsters': False, 'teams': False, 'goal': 0, 'time': 0,
    },
    # Дом. Комната у каждого своя, поэтому её ключ — не «режим:номер»,
    # а «home:ник». Драк тут нет: в гостях не дерутся.
    'home': {
        'name': 'Дом',
        'pvp': False, 'monsters': False, 'teams': False, 'goal': 0, 'time': 0,
    },
}

# У мини-игр нет обычной локации, поэтому им выданы свои номера.
# Так комната мини-игры ничем не отличается от комнаты локации:
# те же игроки, те же команды, тот же список серверов.
# У пряток четыре площадки, поэтому номеров у них тоже четыре:
# 210 дом, 211 сад, 212 торговый центр, 213 двор.
АРЕНЫ = {'football': 200, 'basket': 201, 'parkour': 202, 'race': 203,
         'duel': 205, 'hide': 210}



# ============================================================
#  СЕРВЕРА В СПИСКЕ
#  «Сервер» для игрока — это комната: название, режим и локация.
#  Постоянные открыты всем и не исчезают. Комнаты игроков живут,
#  пока в них кто-то есть, и хозяин сам решает, кого пускать.
# ============================================================
OPEN_SERVERS = [
    # (название, режим, локация, сколько мест)
    ('Дружная поляна',      'coop',   0,  30),
    ('Тёплые пески',        'coop',   14, 30),
    ('Снежные тропы',       'coop',   27, 30),
    ('Мирный сад',          'peace',  3,  30),
    ('Тихая гавань',        'peace',  41, 30),
    ('Арена котов',         'battle', 12, 16),
    ('Ночная арена',        'battle', 58, 16),
    ('Красные и синие',     'team',   5,  30),
    ('Большая битва',       'team',   33, 30),
    # мини-игры
    # Ключ комнаты — это «режим:номер», поэтому у двух площадок одной
    # игры номера должны быть разные, иначе они слипаются в одну.
    # Какая именно площадка рисуется, решает режим, а не номер.
    ('Футбольное поле',     'football', 200, 10),
    ('Дворовый футбол',     'football', 204, 10),
    ('Баскетбольная площадка', 'basket', 201, 8),
    ('Небесная тропа',      'parkour', 202, 12),
    ('Гоночная трасса',     'race',    203, 8),
    ('Круг чести',          'duel',    205, 2),
    ('Дуэльный камень',     'duel',    206, 2),
    ('Прятки: большой дом',  'hide',   210, 12),
    ('Прятки: сад',          'hide',   211, 12),
    ('Прятки: торговый центр', 'hide', 212, 12),
    ('Прятки: двор',         'hide',   213, 12),
]


def occupied_full(room, занято, c):
    """Мест нет? Тот, кто уже внутри, всегда может вернуться."""
    if занято < room.limit:
        return False
    return c.room != room.key


class Room:
    """Одна строчка в списке серверов."""

    def __init__(self, key, name, mode, loc, limit=30, owner=None, code='',
                 who='all', hidden=False, note=''):
        self.key = key
        self.name = name
        self.mode = mode
        self.loc = loc
        self.limit = max(2, min(30, int(limit or 30)))
        self.owner = owner            # None у постоянных
        self.code = (code or '')[:16]
        self.who = who if who in ('all', 'friends', 'code') else 'all'
        self.hidden = bool(hidden)    # не показывать в общем списке
        self.note = (note or '')[:60]
        self.banned = set()           # кого хозяин выгнал
        self.created = int(time.time())

    def info(self, сколько, друзья):
        return {
            'id': self.key, 'name': self.name, 'mode': self.mode,
            'modeName': MODES.get(self.mode, MODES['coop'])['name'],
            'loc': self.loc, 'players': сколько, 'limit': self.limit,
            'own': self.owner is not None, 'owner': self.owner,
            'locked': self.who != 'all', 'who': self.who,
            'note': self.note, 'friends': друзья,
        }


class Match:
    """Одна комната: режим, счёт, таймер, команды."""

    def __init__(self, key, mode):
        self.key = key
        self.mode = mode
        self.cfg = MODES.get(mode, MODES['coop'])
        self.scores = {}          # ник -> сколько котов одолел
        self.deaths = {}          # ник -> сколько раз одолели его
        self.teams = {}           # ник -> 'red' | 'blue'
        self.team_score = {'red': 0, 'blue': 0}
        self.started = 0
        self.finished = False
        self.results = None

    # ---------- участники ----------
    def add(self, nick):
        self.scores.setdefault(nick, 0)
        self.deaths.setdefault(nick, 0)
        if self.cfg['teams'] and nick not in self.teams:
            red = sum(1 for t in self.teams.values() if t == 'red')
            blue = sum(1 for t in self.teams.values() if t == 'blue')
            self.teams[nick] = 'red' if red <= blue else 'blue'
        if not self.started and self.cfg['time']:
            self.started = time.time()

    def remove(self, nick):
        # счёт не стираем: вдруг вернётся до конца матча
        pass

    def team_of(self, nick):
        return self.teams.get(nick)

    # ---------- очки ----------
    def frag(self, killer, victim):
        if self.finished or killer == victim:
            return
        self.scores[killer] = self.scores.get(killer, 0) + 1
        self.deaths[victim] = self.deaths.get(victim, 0) + 1
        if self.cfg['teams']:
            t = self.teams.get(killer)
            if t:
                self.team_score[t] += 1

    def time_left(self):
        if not self.cfg['time'] or not self.started:
            return None
        return max(0, int(self.cfg['time'] - (time.time() - self.started)))

    def check_end(self):
        """Пора ли объявлять победителя."""
        if self.finished:
            return False
        cfg = self.cfg
        if cfg['teams'] and cfg['goal']:
            for t in ('red', 'blue'):
                if self.team_score[t] >= cfg['goal']:
                    self.finish()
                    return True
        left = self.time_left()
        if left is not None and left <= 0:
            self.finish()
            return True
        return False

    def finish(self):
        self.finished = True
        top = sorted(self.scores.items(), key=lambda kv: (-kv[1], kv[0].lower()))
        self.results = {
            'mode': self.mode,
            'places': [{'nick': n, 'kills': k, 'deaths': self.deaths.get(n, 0),
                        'team': self.teams.get(n)} for n, k in top[:8]],
        }
        if self.cfg['teams']:
            r, b = self.team_score['red'], self.team_score['blue']
            self.results['teamScore'] = dict(self.team_score)
            self.results['winner'] = 'red' if r > b else ('blue' if b > r else 'draw')
        elif top:
            self.results['winner'] = top[0][0]

    def state(self):
        return {
            'mode': self.mode,
            'name': self.cfg['name'],
            'pvp': self.cfg['pvp'],
            'monsters': self.cfg['monsters'],
            'teams': self.cfg['teams'],
            'goal': self.cfg['goal'],
            'timeLeft': self.time_left(),
            'scores': self.scores,
            'teamScore': self.team_score if self.cfg['teams'] else None,
            'myTeams': self.teams if self.cfg['teams'] else None,
            'finished': self.finished,
        }


# ============================================================
#  ИГРОКИ И КОМНАТЫ
# ============================================================
class Hub:
    def __init__(self):
        self.lock = threading.RLock()
        self.clients = {}          # id -> Client
        self.hosts = {}            # комната -> id ведущего
        self.matches = {}          # комната -> Match
        self.rooms = {}            # ключ -> Room
        self.next_id = 1
        self.next_room = 1
        for i, (name, mode, loc, limit) in enumerate(OPEN_SERVERS):
            key = mode + ':' + str(loc)
            self.rooms[key] = Room(key, name, mode, loc, limit)

    def match(self, key, mode=None):
        """Матч этой комнаты. Создаётся при первом входе."""
        with self.lock:
            mt = self.matches.get(key)
            if mt is None and mode:
                mt = Match(key, mode)
                self.matches[key] = mt
            return mt

    def drop_match_if_empty(self, key):
        if key is None:
            return
        if not self.room_members(key):
            with self.lock:
                self.matches.pop(key, None)
                self.hosts.pop(key, None)


    # ------------------------------------------------------------
    #  КАТАЛОГ СЕРВЕРОВ
    # ------------------------------------------------------------
    def room_of(self, key):
        with self.lock:
            return self.rooms.get(key)

    def make_room(self, owner, name, mode, loc, limit, code, who='all',
                  hidden=False, note=''):
        """Комната игрока. Хозяин решает название, режим и вход."""
        with self.lock:
            своих = [r for r in self.rooms.values() if r.owner == owner]
            if len(своих) >= 3:
                return None, 'У вас уже три своих сервера — закройте лишний'
            key = 'p' + str(self.next_room)
            self.next_room += 1
            r = Room(key, name, mode, loc, limit, owner=owner, code=code,
                     who=who, hidden=hidden, note=note)
            self.rooms[key] = r
        return r, None

    def close_room(self, key, who):
        with self.lock:
            r = self.rooms.get(key)
            if not r or r.owner is None or r.owner != who:
                return False
            self.rooms.pop(key, None)
        for c in self.room_members(key):
            c.send({'t': 'note', 'msg': 'Хозяин закрыл этот сервер', 'kind': 'warn'})
        return True

    def sweep_rooms(self):
        """Сервер игрока живёт, пока хозяин в сети — иначе он пропадал бы
        раньше, чем друзья успели прийти."""
        with self.lock:
            в_сети = set(c.nick.lower() for c in self.clients.values() if c.nick)
            занятые = set(c.room for c in self.clients.values() if c.nick and c.room)
            лишние = [k for k, r in self.rooms.items()
                      if r.owner is not None
                      and r.owner.lower() not in в_сети
                      and k not in занятые]
            for k in лишние:
                self.rooms.pop(k, None)
        return bool(лишние)

    def catalog(self, для_кого=None):
        друзья = set(x.lower() for x in STORE.friends(для_кого)) if для_кого else set()
        with self.lock:
            комнаты = list(self.rooms.values())
            люди = [c for c in self.clients.values() if c.nick]
        out = []
        for r in комнаты:
            свои = [c.nick for c in люди if c.room == r.key]
            # скрытый сервер видит только хозяин и его друзья
            if r.hidden and для_кого:
                свой = r.owner and r.owner.lower() == для_кого.lower()
                дружим = r.owner and r.owner.lower() in друзья
                if not свой and not дружим:
                    continue
            out.append(r.info(len(свои),
                              [n for n in свои if n.lower() in друзья]))
        # сначала где есть друзья, потом где живее, потом постоянные
        out.sort(key=lambda r: (not r['friends'], -r['players'], r['own'], r['name']))
        return out

    def send_catalog(self, c):
        c.send({'t': 'servers', 'list': self.catalog(c.nick)})

    def broadcast_catalog(self):
        with self.lock:
            targets = [c for c in self.clients.values() if c.nick]
        for c in targets:
            self.send_catalog(c)

    # ------------------------------------------------------------
    #  ВЕДУЩИЙ КОМНАТЫ
    #  Монстров считает кто-то один, иначе у каждого игрока
    #  они разбегались бы по-своему. Первый вошедший и ведёт.
    # ------------------------------------------------------------
    def host_of(self, loc):
        with self.lock:
            hid = self.hosts.get(loc)
            c = self.clients.get(hid) if hid else None
            if c and c.room == loc and c.nick:
                return c
            return None

    def ensure_host(self, loc):
        """Назначить ведущего, если его нет. Возвращает (ведущий, сменился)."""
        cur = self.host_of(loc)
        if cur:
            return cur, False
        members = self.room_members(loc)
        if not members:
            with self.lock:
                self.hosts.pop(loc, None)
            return None, False
        new = members[0]
        with self.lock:
            self.hosts[loc] = new.id
        return new, True

    def tell_host(self, loc):
        """Сказать всем в комнате, кто теперь ведёт монстров."""
        host, _ = self.ensure_host(loc)
        hid = host.id if host else 0
        for c in self.room_members(loc):
            c.send({'t': 'host', 'host': c.id == hid, 'id': hid})

    def add(self, c):
        with self.lock:
            c.id = self.next_id
            self.next_id += 1
            self.clients[c.id] = c

    def drop(self, c):
        with self.lock:
            self.clients.pop(c.id, None)
        if c.nick:
            room = c.room
            c.room = None
            self.room_send(room, {'t': 'bye', 'id': c.id}, skip=c)
            self.room_send(room, {'t': 'sys', 'kind': 'exit', 'nick': c.nick}, skip=c)
            self.notify({'t': 'sys', 'kind': 'offline', 'nick': c.nick}, skip=c)
            if room is not None:
                with self.lock:
                    if self.hosts.get(room) == c.id:
                        self.hosts.pop(room, None)
                self.tell_host(room)
            self.broadcast_online()

    def by_nick(self, nick):
        low = (nick or '').strip().lower()
        with self.lock:
            for c in self.clients.values():
                if c.nick and c.nick.lower() == low:
                    return c
        return None

    def online_list(self):
        with self.lock:
            out = []
            for c in self.clients.values():
                if not c.nick:
                    continue
                out.append({
                    'id': c.id, 'nick': c.nick, 'cat': c.cat, 'catName': c.cat_name,
                    'level': c.level, 'device': c.device,
                    'loc': c.loc, 'locName': c.room_name, 'mode': c.mode,
                    'room': c.room
                })
            out.sort(key=lambda p: (-p['level'], p['nick'].lower()))
            return out

    def notify(self, msg, skip=None):
        """Сказать всем, кто на сервере (а не только в одной локации)."""
        with self.lock:
            targets = [c for c in self.clients.values() if c.nick and c is not skip]
        for c in targets:
            c.send(msg)

    def broadcast_online(self):
        """Кто-то пришёл, ушёл или сменил сервер — всем свежую картину:
        список игроков, каталог серверов и строчки друзей (там видно,
        на каком сервере друг сейчас)."""
        self.sweep_rooms()
        msg = {'t': 'online', 'list': self.online_list()}
        with self.lock:
            targets = [c for c in self.clients.values() if c.nick]
        for c in targets:
            c.send(msg)
            self.send_catalog(c)
            self.send_friends(c.nick)

    def room_members(self, loc):
        if loc is None:
            return []
        with self.lock:
            return [c for c in self.clients.values() if c.nick and c.room == loc]

    def room_send(self, loc, msg, skip=None):
        for c in self.room_members(loc):
            if c is not skip:
                c.send(msg)

    def send_friends(self, nick):
        c = self.by_nick(nick)
        if not c:
            return
        friends = STORE.friends(nick)
        непрочитанное = STORE.dm_unread(nick)
        online = {p['nick'].lower(): p for p in self.online_list()}
        rows = []
        for f in friends:
            p = online.get(f.lower())
            rows.append({
                'nick': f, 'online': bool(p),
                'loc': p['loc'] if p else None,
                'locName': p['locName'] if p else None,
                'level': p['level'] if p else None,
                'room': p['room'] if p else None,
                'srv': self.room_name_of(p['room']) if p else None,
                'unread': непрочитанное.get(STORE._key(f), 0),
                'seen': STORE.last_seen(f)
            })
        rows.sort(key=lambda r: (not r['online'], r['nick'].lower()))
        c.send({'t': 'friends', 'list': rows, 'requests': STORE.requests(nick),
                'unread': непрочитанное})

    def room_name_of(self, key):
        r = self.room_of(key) if key else None
        return r.name if r else None


HUB = Hub()


# ============================================================
#  WEBSOCKET
# ============================================================
def ws_frame(payload, opcode=0x1):
    """Кадр от сервера — без маски, как требует протокол."""
    if isinstance(payload, str):
        payload = payload.encode('utf-8')
    n = len(payload)
    head = bytes([0x80 | opcode])
    if n < 126:
        head += bytes([n])
    elif n < (1 << 16):
        head += bytes([126]) + struct.pack('>H', n)
    else:
        head += bytes([127]) + struct.pack('>Q', n)
    return head + payload


class Client:
    """Один игрок на другом конце провода."""

    def __init__(self, sock):
        self.sock = sock
        self.id = 0
        self.nick = None
        self.cat = 'muri'
        self.cat_name = 'Мури'
        self.level = 1
        self.device = 'pc'
        self.room = None
        self.room_name = None
        self.place = 'menu'        # где игрок вне общей локации: дом, двор, арена
        self.place_name = None
        self.loc = None
        self.mode = 'coop'
        self.account = None        # ник учётки, если игрок вошёл
        self.tries = 0             # промахи по паролю — чтобы не подбирали
        self.alive = True
        self.slock = threading.Lock()

    def send(self, obj):
        if not self.alive:
            return
        try:
            data = ws_frame(json.dumps(obj, ensure_ascii=False))
            with self.slock:
                self.sock.sendall(data)
        except Exception:
            self.alive = False

    def close(self):
        self.alive = False
        try:
            with self.slock:
                self.sock.sendall(ws_frame(b'', 0x8))
        except Exception:
            pass
        try:
            self.sock.close()
        except Exception:
            pass


def read_exact(sock, n):
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def ws_read(sock):
    """Читает один кадр. Возвращает (opcode, bytes) или None."""
    head = read_exact(sock, 2)
    if not head:
        return None
    b0, b1 = head[0], head[1]
    opcode = b0 & 0x0F
    masked = b1 & 0x80
    n = b1 & 0x7F
    if n == 126:
        ext = read_exact(sock, 2)
        if not ext:
            return None
        n = struct.unpack('>H', ext)[0]
    elif n == 127:
        ext = read_exact(sock, 8)
        if not ext:
            return None
        n = struct.unpack('>Q', ext)[0]
    if n > 1 << 20:                     # килобайты, а не мегабайты
        return None
    mask = read_exact(sock, 4) if masked else None
    if masked and mask is None:
        return None
    payload = read_exact(sock, n) if n else b''
    if payload is None:
        return None
    if mask:
        payload = bytes(payload[i] ^ mask[i % 4] for i in range(len(payload)))
    return opcode, payload


# ============================================================
#  ОБРАБОТКА СООБЩЕНИЙ
# ============================================================
def handle_message(c, m):
    t = m.get('t')

    if t == 'reg':
        ok, res = STORE.register(m.get('nick'), m.get('pass'), m.get('profile'))
        if not ok:
            c.send({'t': 'auth', 'ok': False, 'error': res})
            return
        u = STORE.user(res)
        c.account = res
        say('  * новый аккаунт: ' + res)
        c.send({'t': 'auth', 'ok': True, 'nick': u['nick'],
                'profile': u.get('profile', {}), 'saves': u.get('saves', {}),
                'created': True})
        return

    if t == 'auth':
        # Пароль нельзя подбирать бесконечно: после пяти промахов
        # это соединение больше не пускают к проверке.
        if getattr(c, 'tries', 0) >= 5:
            c.send({'t': 'auth', 'ok': False,
                    'error': 'Слишком много попыток. Переоткройте игру и попробуйте снова'})
            return
        u, err = STORE.auth(m.get('nick'), m.get('pass'))
        if err:
            c.tries = getattr(c, 'tries', 0) + 1
            time.sleep(0.4)                       # и не даём перебирать быстро
            c.send({'t': 'auth', 'ok': False, 'error': err})
            return
        c.tries = 0
        c.account = u['nick']
        say('  * вход: ' + u['nick'])
        c.send({'t': 'auth', 'ok': True, 'nick': u['nick'],
                'profile': u.get('profile', {}), 'saves': u.get('saves', {})})
        return

    if t == 'passwd':
        if getattr(c, 'tries', 0) >= 5:
            c.send({'t': 'note', 'msg': 'Слишком много попыток', 'kind': 'warn'})
            return
        ok, err = STORE.change_password(m.get('nick'), m.get('old'), m.get('new'))
        if not ok:
            c.tries = getattr(c, 'tries', 0) + 1
            time.sleep(0.4)
        c.send({'t': 'note', 'msg': ok and 'Пароль изменён 🔑' or err,
                'kind': ok and 'good' or 'warn'})
        return

    if t == 'save':
        if not getattr(c, 'account', None):
            return
        STORE.put_save(c.account, m.get('slot', 0), m.get('data'))
        return

    if t == 'loadsave':
        if not getattr(c, 'account', None):
            return
        c.send({'t': 'saves', 'saves': STORE.get_saves(c.account)})
        return

    if t == 'catroom':
        # Комната кота лежит в профиле игрока. Отдаём её любому,
        # кто спросит по нику: смотреть чужую комнату не опасно,
        # там нет ничего личного — только мебель и рыба на стене.
        кто = str(m.get('nick') or '').strip()[:16]
        u = STORE.user(кто)
        prof = (u.get('profile') or {}) if u else {}
        c.send({'t': 'catroom', 'nick': кто, 'room': prof.get('catroom')})
        return

    if t == 'profile':
        u = STORE.user(getattr(c, 'account', None))
        if u:
            with STORE.lock:
                u['profile'] = m.get('profile') or u.get('profile', {})
                STORE.save()
        return


    if t == 'hello':
        nick = str(m.get('nick') or '').strip()[:16]
        if not nick:
            c.send({'t': 'err', 'msg': 'Нужен ник'})
            return
        old = HUB.by_nick(nick)
        if old and old is not c:
            # Один ник — одно устройство: иначе два кота с одним именем
            # ходили бы по серверу, и никто не понял бы, кто где.
            old.send({'t': 'err', 'msg': 'Этот ник уже играет на другом устройстве',
                      'fatal': True, 'why': 'nick'})
            old.close()
        c.nick = nick
        c.cat = str(m.get('cat') or 'muri')[:32]
        c.cat_name = str(m.get('catName') or 'Кот')[:32]
        c.level = int(m.get('level') or 1)
        c.device = str(m.get('device') or 'pc')[:8]
        STORE.touch(nick)
        say('  + зашёл: ' + nick)
        c.send({'t': 'welcome', 'id': c.id, 'nick': nick, 'online': HUB.online_list(),
                'lan': [] if CLOUD else ['%s:%d' % (ip, RUNNING_PORT) for ip in local_ips()],
                'cloud': CLOUD})
        HUB.notify({'t': 'sys', 'kind': 'online', 'nick': nick}, skip=c)
        HUB.broadcast_online()
        HUB.send_friends(nick)
        return

    if not c.nick:
        return

    if t == 'me':                                   # уровень/кот поменялись
        c.cat = str(m.get('cat') or c.cat)[:32]
        c.cat_name = str(m.get('catName') or c.cat_name)[:32]
        c.level = int(m.get('level') or c.level)
        HUB.broadcast_online()

    elif t == 'join':
        # Дом — особый случай: комната заводится под ник хозяина и
        # живёт, пока в ней кто-то есть. Раньше гость видел только
        # снимок чужой комнаты и был там один.
        дом = str(m.get('home') or '')[:16]
        if дом:
            ключ = 'home:' + дом.lower()
            with HUB.lock:
                if ключ not in HUB.rooms:
                    HUB.rooms[ключ] = Room(ключ, 'Дом: ' + дом, 'home', 300, 8,
                                           owner=дом, who='all', hidden=True)
            m = dict(m)
            m['srv'] = ключ
            srv = ключ
        else:
            srv = str(m.get('srv') or '')[:24]
        room = HUB.room_of(srv) if srv else None
        if room is not None:
            # вход по строчке из списка серверов
            занято = len(HUB.room_members(room.key))
            свой = room.owner and room.owner.lower() == c.nick.lower()
            дружим = room.owner and room.owner.lower() in [
                x.lower() for x in STORE.friends(c.nick)]
            if c.nick.lower() in room.banned:
                c.send({'t': 'joinerr', 'srv': room.key,
                        'msg': 'Хозяин этого сервера вас не пускает'})
                return
            if room.mode == 'home':
                pass                     # дом открыт: кого позвали, тот и зашёл
            elif not свой and not дружим:
                if room.who == 'friends':
                    c.send({'t': 'joinerr', 'srv': room.key,
                            'msg': 'Сюда пускают только друзей хозяина'})
                    return
                if room.who == 'code' and str(m.get('code') or '') != room.code:
                    c.send({'t': 'joinerr', 'srv': room.key,
                            'msg': 'Нужно слово-ключ — спросите у хозяина'})
                    return
            if occupied_full(room, занято, c):
                c.send({'t': 'joinerr', 'srv': room.key,
                        'msg': 'Тут уже полно котов — попробуйте другой сервер'})
                return
            loc, mode, key = room.loc, room.mode, room.key
        else:
            loc = int(m.get('loc', -1))
            # Верхняя граница была 99 — из-за неё тридцать новых локаций
            # нельзя было открыть на сервере вовсе, а мини-играм не
            # хватало номеров.
            if loc < 0 or loc > 999:
                return
            mode = str(m.get('mode') or 'coop')
            if mode not in MODES:
                mode = 'coop'
            key = mode + ':' + str(loc)      # у каждого режима своя комната
        old = c.room
        if old is not None and old != key:
            HUB.room_send(old, {'t': 'bye', 'id': c.id}, skip=c)
            HUB.room_send(old, {'t': 'sys', 'kind': 'exit', 'nick': c.nick}, skip=c)
        c.room = key
        c.loc = loc
        c.mode = mode
        c.room_name = str(m.get('name') or '')[:40]

        mt = HUB.match(key, mode)
        mt.add(c.nick)

        mates = [{'id': o.id, 'nick': o.nick, 'cat': o.cat, 'level': o.level,
                  'team': mt.team_of(o.nick)}
                 for o in HUB.room_members(key) if o is not c]
        c.send({'t': 'room', 'loc': loc, 'mode': mode, 'players': mates,
                'srv': key, 'srvName': HUB.room_name_of(key),
                'team': mt.team_of(c.nick), 'match': mt.state()})
        HUB.room_send(key, {'t': 'joined', 'id': c.id, 'nick': c.nick,
                            'cat': c.cat, 'level': c.level,
                            'team': mt.team_of(c.nick)}, skip=c)
        HUB.room_send(key, {'t': 'sys', 'kind': 'enter', 'nick': c.nick,
                            'locName': c.room_name}, skip=c)
        HUB.room_send(key, {'t': 'match', 'm': mt.state()})
        HUB.tell_host(key)
        if old is not None and old != key:
            HUB.tell_host(old)
            HUB.drop_match_if_empty(old)
        HUB.broadcast_online()

    elif t == 'leave':
        if c.room is not None:
            HUB.room_send(c.room, {'t': 'bye', 'id': c.id}, skip=c)
            HUB.room_send(c.room, {'t': 'sys', 'kind': 'exit', 'nick': c.nick}, skip=c)
        old = c.room
        c.room = None
        c.room_name = None
        c.loc = None
        if old is not None:
            with HUB.lock:
                if HUB.hosts.get(old) == c.id:
                    HUB.hosts.pop(old, None)
            HUB.tell_host(old)
            HUB.drop_match_if_empty(old)
        HUB.broadcast_online()

    elif t == 'state':
        if c.room is None:
            return
        m['id'] = c.id
        m['nick'] = c.nick
        HUB.room_send(c.room, m, skip=c)

    elif t in ('kill', 'chest', 'cage', 'portal'):
        if c.room is None:
            return
        m['by'] = c.nick
        HUB.room_send(c.room, m, skip=c)

    elif t == 'chat':
        if c.room is None:
            return
        kind = m.get('kind')
        if kind == 'sticker':
            msg = {'t': 'chat', 'from': c.nick, 'kind': 'sticker',
                   'cat': str(m.get('cat') or 'muri')[:32],
                   'mood': str(m.get('mood') or 'happy')[:16]}
        else:
            text = str(m.get('text') or '').strip()[:140]
            if not text:
                return
            msg = {'t': 'chat', 'from': c.nick, 'kind': 'text', 'text': text}
        HUB.room_send(c.room, msg)

    elif t == 'mon':
        # снимок монстров от ведущего — всем остальным в комнате
        if c.room is None or HUB.host_of(c.room) is not c:
            return
        HUB.room_send(c.room, {'t': 'mon', 'a': m.get('a') or []}, skip=c)

    elif t == 'dmg':
        # «я попал по монстру» — считает всегда только ведущий
        if c.room is None:
            return
        host = HUB.host_of(c.room)
        if host and host is not c:
            host.send({'t': 'dmg', 'i': int(m.get('i', -1)),
                       'n': float(m.get('n') or 0),
                       'el': str(m.get('el') or 'physical')[:16],
                       'kx': float(m.get('kx') or 0), 'kz': float(m.get('kz') or 0),
                       'kp': float(m.get('kp') or 0),
                       'by': c.nick, 'byId': c.id})

    elif t == 'mhit':
        # монстр ударил игрока — ведущий сообщает пострадавшему
        if c.room is None or HUB.host_of(c.room) is not c:
            return
        with HUB.lock:
            target = HUB.clients.get(int(m.get('target', 0)))
        if target and target.room == c.room:
            target.send({'t': 'mhit', 'n': float(m.get('n') or 0),
                         'name': str(m.get('name') or 'монстр')[:32],
                         'kx': float(m.get('kx') or 0), 'kz': float(m.get('kz') or 0)})

    elif t == 'emote':
        # кошачья выходка — видно всем в локации
        if c.room is None:
            return
        HUB.room_send(c.room, {'t': 'emote', 'id': c.id,
                               'e': str(m.get('e') or '')[:16]}, skip=c)

    elif t == 'fx':
        # видимые эффекты — всем в локации
        if c.room is None:
            return
        arr = m.get('a') or []
        if len(arr) > 32:
            arr = arr[:32]
        HUB.room_send(c.room, {'t': 'fx', 'a': arr}, skip=c)

    elif t == 'cast':
        # заклинание видно всем в локации
        if c.room is None:
            return
        m['from'] = c.id
        m['nick'] = c.nick
        HUB.room_send(c.room, m, skip=c)

    elif t == 'pvp':
        # драка котов: удар летит всей комнате, применяет его только тот, в кого попали
        if c.room is None:
            return
        HUB.room_send(c.room, {
            't': 'pvp', 'from': c.id, 'fromNick': c.nick,
            'target': int(m.get('target', 0)),
            'dmg': max(0, min(400, float(m.get('dmg') or 0))),
            'el': str(m.get('el') or 'physical')[:16],
            'kx': float(m.get('kx') or 0), 'kz': float(m.get('kz') or 0)
        }, skip=c)

    elif t == 'sys':
        # проигравший в драке сам сообщает об этом комнате
        if c.room is None:
            return
        killer = str(m.get('by') or '')[:16]
        HUB.room_send(c.room, {'t': 'sys', 'kind': 'pvp',
                               'nick': c.nick, 'by': killer})
        mt = HUB.match(c.room)
        if mt and not mt.finished:
            mt.frag(killer, c.nick)
            # награду начисляет себе сам победитель
            win = HUB.by_nick(killer)
            if win:
                win.send({'t': 'frag', 'victim': c.nick,
                          'kills': mt.scores.get(killer, 0), 'mode': mt.mode})
            HUB.room_send(c.room, {'t': 'match', 'm': mt.state()})
            if mt.check_end():
                HUB.room_send(c.room, {'t': 'matchend', 'r': mt.results})

    elif t == 'game':
        # весточка по правилам мини-игры — остальным в комнате.
        # Сервер в правила не вникает, только передаёт и подписывает,
        # от кого пришло: подделать чужое имя так нельзя.
        if c.room is None:
            return
        HUB.room_send(c.room, {'t': 'game', 'from': c.nick, 'd': m.get('d')}, skip=c)

    elif t == 'servers':
        HUB.send_catalog(c)

    elif t == 'mkroom':
        name = str(m.get('name') or '').strip()[:24] or (c.nick + ' зовёт')
        mode = str(m.get('mode') or 'coop')
        if mode not in MODES:
            mode = 'coop'
        loc = int(m.get('loc') or 0)
        # До 999, а не до 99: выше сотни живут новые локации и площадки
        # мини-игр. Со старой границей свой футбольный сервер молча
        # превращался в обычную локацию номер 99.
        loc = max(0, min(999, loc))
        r, err = HUB.make_room(c.nick, name, mode, loc,
                               m.get('limit') or 30, str(m.get('code') or ''),
                               who=str(m.get('who') or 'all'),
                               hidden=bool(m.get('hidden')),
                               note=str(m.get('note') or ''))
        if err:
            c.send({'t': 'note', 'msg': err, 'kind': 'warn'})
            return
        say('  * новый сервер: ' + name + ' (' + c.nick + ')')
        c.send({'t': 'roomok', 'id': r.key, 'name': r.name,
                'mode': r.mode, 'loc': r.loc})
        HUB.broadcast_catalog()

    elif t == 'kick':
        # хозяин выгоняет со своего сервера
        комната = HUB.room_of(str(m.get('id') or ''))
        кого = str(m.get('nick') or '')[:16]
        if not комната or комната.owner != c.nick or not кого:
            return
        комната.banned.add(кого.lower())
        гость = HUB.by_nick(кого)
        if гость and гость.room == комната.key:
            гость.send({'t': 'note', 'msg': 'Хозяин попросил вас уйти с сервера',
                        'kind': 'warn'})
            гость.send({'t': 'kicked', 'srv': комната.key})
        c.send({'t': 'note', 'msg': кого + ' больше сюда не зайдёт', 'kind': 'good'})
        HUB.broadcast_catalog()

    elif t == 'rmroom':
        if HUB.close_room(str(m.get('id') or ''), c.nick):
            c.send({'t': 'note', 'msg': 'Ваш сервер закрыт', 'kind': 'good'})
        HUB.broadcast_catalog()

    elif t == 'place':
        # Игрок сообщает, где он вне общей локации: дома, во дворе,
        # на арене. Без этого друг всегда выглядел «в меню», и прийти
        # к нему было некуда.
        c.place = str(m.get('kind') or 'menu')[:16]
        c.place_name = str(m.get('name') or '')[:40] or None

    elif t == 'follow':
        # «в гости»: сервер всегда отвечает, где друг, — даже если
        # прийти туда нельзя. Тогда игра предложит зайти к нему домой.
        ник = str(m.get('nick') or '')[:16]
        друг = HUB.by_nick(ник)
        свои = [x.lower() for x in STORE.friends(c.nick)]
        if not друг:
            c.send({'t': 'goto', 'ok': False, 'why': 'offline', 'nick': ник})
            return
        if друг.nick.lower() not in свои:
            c.send({'t': 'goto', 'ok': False, 'why': 'notfriend', 'nick': друг.nick})
            return
        if друг.room is None:
            c.send({'t': 'goto', 'ok': False, 'why': друг.place or 'menu',
                    'nick': друг.nick, 'placeName': друг.place_name})
            return
        r = HUB.room_of(друг.room)
        c.send({'t': 'goto', 'ok': True, 'srv': друг.room, 'loc': друг.loc,
                'mode': друг.mode, 'name': r.name if r else None,
                'nick': друг.nick})

    elif t == 'find':
        c.send({'t': 'found', 'q': str(m.get('q') or ''),
                'list': STORE.search(m.get('q'), 8)})

    elif t == 'dm':
        кому = str(m.get('to') or '')[:16]
        свои = [x.lower() for x in STORE.friends(c.nick)]
        if кому.lower() not in свои:
            c.send({'t': 'note', 'msg': 'Писать можно только друзьям', 'kind': 'warn'})
            return
        row = STORE.dm_add(c.nick, кому, m.get('x'))
        if not row:
            return
        c.send({'t': 'dm', 'with': кому, 'row': row, 'mine': True})
        друг = HUB.by_nick(кому)
        if друг:
            друг.send({'t': 'dm', 'with': c.nick, 'row': row, 'mine': False})
            HUB.send_friends(друг.nick)

    elif t == 'dmlog':
        ник = str(m.get('nick') or '')[:16]
        STORE.dm_read(c.nick, ник)
        c.send({'t': 'dmlog', 'with': ник, 'list': STORE.dm_log(c.nick, ник)})
        HUB.send_friends(c.nick)

    elif t == 'dmread':
        STORE.dm_read(c.nick, str(m.get('nick') or '')[:16])
        HUB.send_friends(c.nick)

    elif t == 'friend':
        target = str(m.get('nick') or '').strip()[:16]
        if not target:
            return
        res = STORE.add_request(c.nick, target)
        words = {
            'self': 'Себя в друзья добавить не выйдет 🙂',
            'already': target + ' уже у вас в друзьях',
            'pending': 'Заявка уже отправлена, ждём ответа',
            'sent': 'Заявка отправлена ' + target,
            'friends': 'Теперь вы друзья с ' + target + '! 🎉'
        }
        c.send({'t': 'note', 'msg': words.get(res, 'Готово'),
                'kind': 'good' if res in ('sent', 'friends') else 'warn'})
        HUB.send_friends(c.nick)
        other = HUB.by_nick(target)
        if other:
            if res == 'sent':
                other.send({'t': 'note', 'msg': c.nick + ' хочет дружить 🐾', 'kind': 'good'})
            elif res == 'friends':
                other.send({'t': 'note', 'msg': 'Теперь вы друзья с ' + c.nick + '! 🎉', 'kind': 'good'})
            HUB.send_friends(other.nick)

    elif t == 'accept':
        frm = str(m.get('nick') or '')[:16]
        if STORE.accept(c.nick, frm):
            c.send({'t': 'note', 'msg': 'Теперь вы друзья с ' + frm + '! 🎉', 'kind': 'good'})
            other = HUB.by_nick(frm)
            if other:
                other.send({'t': 'note', 'msg': c.nick + ' принял вашу заявку 🎉', 'kind': 'good'})
                HUB.send_friends(other.nick)
        HUB.send_friends(c.nick)

    elif t == 'decline':
        STORE.decline(c.nick, str(m.get('nick') or '')[:16])
        HUB.send_friends(c.nick)

    elif t == 'unfriend':
        other_nick = str(m.get('nick') or '')[:16]
        STORE.remove_friend(c.nick, other_nick)
        HUB.send_friends(c.nick)
        o = HUB.by_nick(other_nick)
        if o:
            HUB.send_friends(o.nick)

    elif t == 'invite':
        target = str(m.get('nick') or '')[:16]
        o = HUB.by_nick(target)
        if not o:
            c.send({'t': 'note', 'msg': target + ' сейчас не в сети', 'kind': 'warn'})
            return
        o.send({'t': 'invite', 'from': c.nick,
                'loc': int(m.get('loc', 0)), 'locName': str(m.get('locName') or '')[:40],
                'srv': str(m.get('srv') or '')[:24],
                'srvName': str(m.get('srvName') or '')[:40],
                'mode': str(m.get('mode') or 'coop')[:12]})
        c.send({'t': 'note', 'msg': 'Приглашение отправлено ' + target, 'kind': 'good'})

    elif t == 'match':
        if c.room is None:
            return
        mt = HUB.match(c.room)
        if mt:
            if mt.check_end():
                HUB.room_send(c.room, {'t': 'matchend', 'r': mt.results})
            c.send({'t': 'match', 'm': mt.state()})

    elif t == 'ping':
        c.send({'t': 'pong'})


def ws_loop(sock):
    c = Client(sock)
    HUB.add(c)
    try:
        while c.alive:
            frame = ws_read(sock)
            if frame is None:
                break
            opcode, payload = frame
            if opcode == 0x8:                       # закрытие
                break
            if opcode == 0x9:                       # ping → pong
                with c.slock:
                    sock.sendall(ws_frame(payload, 0xA))
                continue
            if opcode != 0x1:
                continue
            try:
                m = json.loads(payload.decode('utf-8'))
            except Exception:
                continue
            if isinstance(m, dict):
                handle_message(c, m)
    except (ConnectionResetError, ConnectionAbortedError, OSError):
        pass
    except Exception:
        traceback.print_exc()
    finally:
        if c.nick:
            STORE.touch(c.nick)
            say('  - вышел: ' + c.nick)
        c.alive = False
        HUB.drop(c)
        try:
            sock.close()
        except Exception:
            pass


# ============================================================
#  HTTP
# ============================================================
class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'KotikiMagi/1.0'

    def log_message(self, fmt, *args):
        pass                                        # не засоряем окно

    def do_GET(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]

        # --- многопользовательский режим ---
        if path == '/ws':
            key = self.headers.get('Sec-WebSocket-Key')
            up = (self.headers.get('Upgrade') or '').lower()
            if not key or up != 'websocket':
                self.send_error(400, 'not a websocket')
                return
            accept = base64.b64encode(
                hashlib.sha1((key + GUID).encode('ascii')).digest()).decode('ascii')
            resp = ('HTTP/1.1 101 Switching Protocols\r\n'
                    'Upgrade: websocket\r\n'
                    'Connection: Upgrade\r\n'
                    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n')
            self.wfile.write(resp.encode('ascii'))
            self.wfile.flush()
            self.close_connection = True
            sock = self.connection
            try:
                sock.settimeout(None)
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            except Exception:
                pass
            ws_loop(sock)
            return

        # --- сколько народу заходило ---
        if path == '/api/gosti':
            с = сводка()
            стр = ['<!doctype html><meta charset="utf-8">',
                   '<title>Гости — Котики Маги 3D</title>',
                   '<style>body{background:#0b0720;color:#f4ecff;'
                   'font-family:"Trebuchet MS",sans-serif;padding:24px;line-height:1.6}'
                   'h1{color:#ffd166}table{border-collapse:collapse;margin-top:14px}'
                   'td,th{padding:8px 14px;border:1px solid #3a2d78;text-align:left}'
                   'th{background:#1b1240;color:#6ae0ff}'
                   '.b{font-size:30px;color:#ffd166}</style>',
                   '<h1>🐾 Кто заходил</h1>']
            в = с['всего']
            стр.append('<p>За последнюю неделю:</p>')
            стр.append('<p><span class="b">%d</span> разных людей &nbsp; '
                       '<span class="b">%d</span> раз открывали страницу &nbsp; '
                       '<span class="b">%d</span> раз запускали игру &nbsp; '
                       '<span class="b">%d</span> раз скачали</p>'
                       % (в['людей'], в['страница'], в['игра'], в['скачали']))
            стр.append('<table><tr><th>День</th><th>Людей</th><th>Страница</th>'
                       '<th>Играли</th><th>Скачали</th></tr>')
            for д in с['дни']:
                стр.append('<tr><td>%s</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td></tr>'
                           % (д['день'], д['людей'], д['страница'], д['игра'], д['скачали']))
            стр.append('</table>')
            стр.append('<p style="opacity:.6;margin-top:18px">Считается неделя. '
                       'Кто именно приходил, не сохраняется.</p>')
            body = ''.join(стр).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return

        # --- сервер жив? ---
        if path == '/api/status':
            body = json.dumps({
                'ok': True, 'online': len(HUB.online_list()),
                'players': HUB.online_list()
            }, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return

        # ------------------------------------------------------------
        #  ЗАПАСНАЯ КОПИЯ
        #  Все аккаунты, друзья и переписка одним файлом. Открывается
        #  только со словом-ключом, которое задаёт хозяин сервера
        #  (переменная KMAGI_ADMIN). Без него ход закрыт совсем —
        #  иначе чужие пароли утекли бы первому встречному.
        # ------------------------------------------------------------
        if path == '/api/backup':
            ключ = os.environ.get('KMAGI_ADMIN') or ''
            дано = ''
            if '?' in self.path:
                from urllib.parse import parse_qs
                дано = (parse_qs(self.path.split('?', 1)[1]).get('key') or [''])[0]
            if not ключ:
                self.send_error(404)
                return
            # сравниваем байтами: compare_digest не берёт русские буквы,
            # а слово-ключ вполне может быть русским
            if not hmac.compare_digest(дано.encode('utf-8'), ключ.encode('utf-8')):
                time.sleep(0.5)
                self.send_error(403, 'no')
                return
            STORE.flush(True)
            with STORE.lock:
                тело = json.dumps(STORE.data, ensure_ascii=False, indent=1).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Disposition',
                             'attachment; filename="kmagi-backup.json"')
            self.send_header('Content-Length', str(len(тело)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(тело)
            return

        # --- файлы игры ---
        self.serve_file(path)

    def do_HEAD(self):
        self.serve_file(self.path.split('?', 1)[0], head=True)

    def serve_file(self, path, head=False):
        from urllib.parse import unquote
        rel = unquote(path).lstrip('/')
        if rel == '':
            rel = 'index.html'
        # что именно открыли — для счётчика
        if not head:
            вид = {'index.html': 'страница', 'igra.html': 'игра',
                   'kotiki-magi-3d.html': 'скачали'}.get(rel)
            if вид:
                отметить(вид, self.client_address[0] if self.client_address else '?')
        full = os.path.normpath(os.path.join(ROOT, rel))
        if not full.startswith(ROOT) or not os.path.isfile(full):
            self.send_error(404, 'not found')
            return
        ext = os.path.splitext(full)[1].lower()
        try:
            with open(full, 'rb') as f:
                body = f.read()
        except OSError:
            self.send_error(404, 'not found')
            return
        self.send_response(200)
        self.send_header('Content-Type', MIME.get(ext, 'application/octet-stream'))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        if not head:
            self.wfile.write(body)


class Server(ThreadingHTTPServer):
    daemon_threads = True

    # Windows по SO_REUSEADDR разрешает ВТОРОМУ серверу сесть на уже
    # занятый порт. Тогда два процесса делят один адрес, и подключения
    # раскидывает между ними как попало: часть игроков попадает в один
    # мир, часть в другой — хотя все выбирали «тот же самый сервер».
    # Ловилось это тяжело: снаружи всё выглядит правильно.
    # Поэтому на Windows порт просим монопольно, и второй запуск честно
    # спотыкается. На Linux SO_REUSEADDR так не делает и нужен для
    # быстрых перезапусков — там оставляем как было.
    allow_reuse_address = (os.name != 'nt')

    def server_bind(self):
        искл = getattr(socket, 'SO_EXCLUSIVEADDRUSE', None)
        if искл is not None:
            try:
                self.socket.setsockopt(socket.SOL_SOCKET, искл, 1)
            except OSError:
                pass
        ThreadingHTTPServer.server_bind(self)


class Server6(Server):
    """
    Слушает и IPv6, и IPv4 одной розеткой.

    Браузер, набирая «localhost», сначала пробует IPv6 (::1). Если сервер
    сидит только на IPv4, первая попытка обрывается с ошибкой в консоли,
    и лишь вторая попадает куда надо. Двойной стек убирает эту заминку.
    """
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        Server.server_bind(self)


def local_ips():
    out = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        out.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in out and not ip.startswith('127.'):
                out.append(ip)
    except Exception:
        pass
    return out


RUNNING_PORT = PORT          # какой порт заняли на самом деле


def уже_работает(port):
    """
    На этом порту уже сидят наши «Котики»?

    Нужно, чтобы второй запуск не поднимал рядом ещё один сервер. Два
    сервера — это два разных мира: игроки заходят «на один и тот же»
    и не видят друг друга. Лучше просто открыть тот, что уже работает.
    """
    try:
        import urllib.request
        with urllib.request.urlopen(
                'http://127.0.0.1:%d/api/status' % port, timeout=1.5) as r:
            return json.loads(r.read().decode('utf-8')).get('ok') is True
    except Exception:
        return False


def start_server():
    """Занять порт. Дома, если 8765 занят, берём следующий свободный;
    в облаке порт назначен хостингом, перебирать нельзя."""
    last = None
    span = 1 if FIXED_PORT else 12
    for port in range(PORT, PORT + span):
        # сперва пробуем двойной стек, потом обычный IPv4
        for cls, addr in ((Server6, ('::', port)), (Server, ('0.0.0.0', port))):
            try:
                srv = cls(addr, Handler)
                globals()['RUNNING_PORT'] = port
                return srv, port
            except OSError as e:
                last = e
    raise last


APP_BROWSERS = [
    r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe',
    r'%PROGRAMFILES%\Google\Chrome\Application\chrome.exe',
    r'%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe',
    r'%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe',
    r'%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe',
]


def find_app_browser():
    """Найти Chrome или Edge — они умеют открывать окно без панелей."""
    for pat in APP_BROWSERS:
        path = os.path.expandvars(pat)
        if '%' not in path and os.path.isfile(path):
            return path
    return None


def wait_port(port):
    for _ in range(40):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.4):
                return True
        except OSError:
            time.sleep(0.15)
    return False


def open_browser(port, app_mode=False):
    """Открыть игру, когда сервер уже точно слушает порт."""
    url = 'http://localhost:%d/index.html' % port
    wait_port(port)

    # Режим приложения: отдельное окно без адресной строки и вкладок,
    # со своим значком на панели задач — выглядит как настоящая программа.
    if app_mode:
        exe = find_app_browser()
        if exe:
            import subprocess
            profile = os.path.join(ROOT, '.окно')
            try:
                subprocess.Popen([
                    exe,
                    '--app=' + url,
                    '--user-data-dir=' + profile,
                    '--window-size=1280,760',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-features=Translate',
                ])
                return
            except Exception:
                pass

    try:
        webbrowser.open(url)
    except Exception:
        say('  Откройте в браузере: ' + url)


def main():
    # окно должно принимать русские буквы и эмодзи
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    # Хостинг перед перезапуском вежливо просит закрыться. Успеваем
    # дописать данные — иначе потеряли бы последние секунды игры.
    def прощаемся(_sig, _frm):
        say('')
        say('  Сохраняю и выключаюсь…')
        try:
            STORE.flush(True)
        except Exception:
            traceback.print_exc()
        os._exit(0)

    for имя in ('SIGTERM', 'SIGINT'):
        сиг = getattr(signal, имя, None)
        if сиг is not None:
            try:
                signal.signal(сиг, прощаемся)
            except Exception:
                pass

    # Дома: если сервер уже запущен, второй не нужен — открываем тот.
    if not FIXED_PORT and not CLOUD and уже_работает(PORT):
        say('')
        say('  🐱  Сервер «Котиков» уже запущен на этом компьютере.')
        say('  Второй поднимать не надо: это был бы отдельный мир,')
        say('  и вы бы не увидели друг друга. Открываю тот, что есть.')
        say('')
        say('  Адрес:  http://localhost:%d/' % PORT)
        say('')
        if os.environ.get('KMAGI_NOBROWSER') != '1':
            open_browser(PORT, '--app' in sys.argv)
        try:
            input('  Нажмите Enter, чтобы закрыть это окно...')
        except Exception:
            pass
        return

    try:
        srv, port = start_server()
    except Exception as e:
        say('')
        say('  Не получилось запустить сервер: %s' % e)
        say('  Скорее всего, порт занят другой программой.')
        say('  Закройте лишние окна «Котиков» и попробуйте снова.')
        say('')
        try:
            input('  Нажмите Enter, чтобы закрыть окно...')
        except Exception:
            pass
        return

    if CLOUD:
        say('')
        say('  КОТИКИ МАГИ 3D — сервер в интернете')
        say('  Слушаю порт %d. Адрес выдаёт хостинг.' % port)
        say('  Работает круглосуточно, ничей компьютер не нужен.')
        say('')
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            STORE.flush(True)
        return

    say('')
    say('  🐱  КОТИКИ МАГИ 3D — сервер запущен')
    say('  ' + '-' * 52)
    say('  На этом компьютере:        http://localhost:%d/' % port)
    ips = local_ips()
    if ips:
        for ip in ips:
            say('  С телефона в той же сети:  http://%s:%d/' % (ip, port))
        say('')
        say('  Если с телефона не открывается — Windows спрашивал про')
        say('  «разрешить доступ к сети», нужно было нажать «Разрешить».')
    say('  ' + '-' * 52)
    say('  Сервер и друзья работают, пока открыто это окно.')
    say('  Закрыть — Ctrl+C или просто закройте окно.')
    say('')

    app_mode = '--app' in sys.argv
    if not FIXED_PORT and os.environ.get('KMAGI_NOBROWSER') != '1':
        threading.Thread(target=open_browser, args=(port, app_mode), daemon=True).start()

    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        say('')
        say('  Сервер остановлен. Пока! 🐾')
    finally:
        STORE.flush(True)


if __name__ == '__main__':
    main()
