FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN useradd -m -u 10002 siem && chown -R siem:siem /app
USER siem

EXPOSE 8000

# EXACTLY ONE worker: all game state (events, scoreboard, kill queue) lives in
# this process's memory, and gunicorn workers are separate processes that do NOT
# share it — a second worker would hold a divergent copy and split the game.
# Concurrency comes from threads instead; the poll requests are short, so a
# single threaded worker easily serves the whole room.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "16", \
     "--timeout", "60", "--access-logfile", "-", "server:app"]
