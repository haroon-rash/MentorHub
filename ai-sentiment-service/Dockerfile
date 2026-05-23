FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    HF_HOME=/app/.cache/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download model at build time (optional; speeds cold start)
RUN python -c "from analyzer.sentiment import _get_pipeline; _get_pipeline()"

EXPOSE 8093

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8093", "--workers", "1"]
