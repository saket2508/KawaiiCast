# 📄 Torrent Streamer App – Product Requirements Document (PRD)

## 🎯 Objective

Build a full-stack torrent streaming web application that allows users to search for torrents and stream selected video files directly in the browser. The app will use HTTP Range streaming with optional in-browser P2P fallback via WebTorrent.

---

## 🧩 Tech Stack

- **Frontend**: Next.js 15 + TailwindCSS
- **Backend**: FastAPI
- **Torrent Engine**: `webtorrent-hybrid` via Node.js subprocess
- **Database**: PostgreSQL
- **Cache**: Redis
- **Deployment**: Docker + Docker Compose

---

## 🔧 Core Features

### 🔍 1. Search

- Input: Text query from user
- Output: List of torrent results (title, size, magnet, seeders)
- API: `GET /api/search?query=...`
- Caching: Redis-based query caching

### ▶️ 2. Stream

- Users can select a result to stream the video
- Torrent downloaded via `webtorrent-hybrid`
- Backend streams `.mp4` using HTTP with Range support
- Fallback option: In-browser WebRTC (optional)

### 🧾 3. Watch History

- Store user’s watched torrents in Postgres
- Fields: `magnet`, `title`, `watched_at`, `session_id`

### 📈 4. Popular Torrents

- Query most-watched torrents based on history

### 🧪 5. Debug Panel (Optional)

- Show peer info, download status, stream buffer info

---

## 🖥️ UI Overview

### `/` - Home Page

- Search bar
- Torrent results
- "Watch" button for each result

### `/watch` - Watch Page

- HTML5 `<video>` player
- Streams from `/api/stream?magnet=...`
- Fallback to WebTorrent in-browser if backend fails (optional)

---

## 🚀 API Endpoints

### `GET /api/search?query=...`

- Returns list of torrent results (from indexer or `torrent-search-api`)
- Cached in Redis for 1 hour

### `GET /api/stream?magnet=...`

- Streams `.mp4` file from torrent in real time
- Supports HTTP `Range` headers for seeking

### `GET /api/history`

- Fetch user’s watched history from Postgres

### `GET /api/popular`

- Fetch popular torrents by watch count

---

## 🛢️ Database Schema

### `watched_torrents`

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| magnet     | TEXT      |
| title      | TEXT      |
| watched_at | TIMESTAMP |
| session_id | TEXT      |

---

## ⚡ Redis Keys

- `search:<query>` → list of torrent results
- `magnet:<hash>` → torrent metadata (optional)

---

## 🔐 Optional Features

- User auth with sessions
- Resume last-watched video
- Upload `.torrent` files
- Subtitle support (`.srt`)
- Download button for files
- P2P-only WebTorrent fallback

---

## 📅 Timeline

| Milestone | Feature Set                      | ETA      |
| --------- | -------------------------------- | -------- |
| Phase 1   | Search + Stream core flow        | 2–3 days |
| Phase 2   | Redis + History + Dockerization  | 2 days   |
| Phase 3   | P2P fallback + optional features | Ongoing  |

---

## ✅ Definition of Done

- User can search torrents and stream video
- Backend streams `.mp4` with HTTP Range support
- Redis and Postgres are integrated
- Project containerized using Docker Compose
- App works locally and ready for VPS deployment
