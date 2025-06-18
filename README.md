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

### 2. Start the Database

The application uses a PostgreSQL database running in a Docker container.

```bash
docker-compose up -d
```

This will start the postgres database and it will be listening on port 5432.

### 3. Setup and run the Backend

The backend is a Node.js server.

```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:3001`.

### 4. Setup and run the Frontend

The frontend is a Next.js application.

Open a new terminal window and run the following commands:

```bash
cd frontend
npm install
npm run dev
```

The frontend development server will start on `http://localhost:3000`.

### 5. Open the application

You can now open your browser and navigate to `http://localhost:3000` to use the application.

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
