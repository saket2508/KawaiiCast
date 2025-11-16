# KawaiiCast

KawaiiCast is a self-hosted, lightweight alternative to Crunchyroll/HiAnime that lets you stream your favorite anime straight from torrent magnet links—no downloads or waiting, just press play.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## Getting Started

Follow these instructions to get the application up and running locally.

### 1. Clone the repository

```bash
git clone <repository-url>
cd KawaiiCast
```

### 2. Start the stack

Spin up PostgreSQL, the Bun/TypeScript backend and the Next.js frontend in one go using Docker Compose:

```bash
docker-compose up
```

Compose will:

- Launch **PostgreSQL 14** (mapped to `localhost:5432`).
- Build & start the **backend-v2** service (Bun + Express, available at `http://localhost:8080`).
- Build & start the **frontend** (Next.js, available at `http://localhost:3000`).

You can follow the combined logs with:

```bash
docker-compose logs -f
```

### 3. Open the application

Once all containers are healthy, open your browser at `http://localhost:3000` to use KawaiiCast.

## 📝 TODO

### Backend

- Add automated integration/e2e coverage for the torrent → stream pipeline so regressions are caught before shipping.
- Expose richer observability (structured logs, `/metrics` or extended `/health`) covering cleanup timers, torrent cache size, etc.
- Layer basic auth/rate-limiting on the API to keep self-hosted instances safe when exposed beyond the LAN.
- Improve torrent search quality (multi-source queries, season/arc metadata) once the new stack stabilises.

### Frontend

- Harden the watch experience with clearer error states/retry flows when torrent info or streams fail.
- Ship the missing “Trending”/“Library” routes plus surfacing of watch-progress data across the UI.
- Add lightweight e2e smoke tests (Playwright/Cypress) that hit a running docker-compose stack.
- Polish playback controls (subtitle selection, quality picker) now that the backend surfaces embedded track info.

> Track each bullet using GitHub Issues so progress on backend-v2 + the Docker stack remains visible.
