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

Spin up PostgreSQL, the Express backend and the Next.js frontend in one go using Docker Compose:

```bash
docker-compose up
```

Compose will:

- Launch **PostgreSQL 14** (mapped to `localhost:5432`).
- Build & start the **backend** server (available at `http://localhost:8080`).
- Build & start the **frontend** (available at `http://localhost:3000`).

You can follow the combined logs with:

```bash
docker-compose logs -f
```

### 3. Open the application

Once all containers are healthy, open your browser at `http://localhost:3000` to use KawaiiCast.

## 📝 TODO

### Backend

- Organise and clean up controllers/modules code. It can be more readable.
- Fetch season/arc details for specific anime episode.
- Refine torrent search logic. Use multiple sources and include season/arc name in the queries.
- Figure out deployment for personal use.

### Frontend

- Organise and clean up hooks for fetching anime titles and media playback
- Handle torrent server-side errors with retry logic while fetching magnets & streaming playable files
- Video playback controls UX: show video length, allow user to skip
- Fix `useWatchProgress` hook for saving progress to localstorage.
- Add new routes for trending and library
