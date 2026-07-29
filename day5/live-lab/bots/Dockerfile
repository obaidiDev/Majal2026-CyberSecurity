# Playwright's image ships Python + Chromium + all the browser deps, so the
# admin (XSS victim) bot needs no browser install step. The shopper bot is pure
# stdlib and rides along in the same image; compose runs each as its own service.
FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# default command is overridden per-service in docker-compose.yml
CMD ["python", "shopper_bot.py"]
