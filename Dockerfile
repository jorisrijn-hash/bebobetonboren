FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Eerst alleen requirements -> betere build-cache
COPY requirements.txt .
RUN pip install -r requirements.txt

# Daarna de rest van de app (de React Bits-bundel staat al in static/bundle/)
COPY . .

# Railway levert $PORT aan. Shell-form zodat ${PORT} expandeert.
CMD gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 app:app
