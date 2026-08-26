# Запасной способ: если хостинг просит Docker, подойдёт этот файл.
FROM python:3.11-slim
WORKDIR /app

# Сначала только список зависимостей — чтобы при мелкой правке игры
# не пересобирать их заново. Нужны они одному: разговаривать с базой,
# в которой сервер хранит аккаунты и друзей.
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
EXPOSE 8765
CMD ["python", "server.py"]
