FROM python:3.10-slim

# Install dependencies
RUN apt update && apt install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt install -y nodejs && \
    npm install -g webtorrent-cli && \
    pip install fastapi "uvicorn[standard]" && \
    apt clean

WORKDIR /app
COPY . /app

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
