# WebTorrent Streaming Backend (Node.js)

A high-performance Node.js backend for torrent streaming using WebTorrent directly.

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🐳 Docker

```bash
# Build and run
docker build -t torrent-backend .
docker run -p 8080:8080 torrent-backend
```

## 🔧 API Endpoints

### `GET /health`

Health check with server stats

- **Response**: Server status, active torrents/streams, speeds

### `GET /torrent/info?magnet=<URI>`

Get torrent metadata and file list

- **Response**: Detailed torrent info with file list and stats

### `GET /stream?magnet=<URI>&file_index=<N>`

Stream a specific file from torrent

- **Supports**: HTTP range requests for seeking
- **Response**: Media stream with proper headers

### `DELETE /stream?magnet=<URI>&file_index=<N>`

Stop a specific stream

### `DELETE /torrent?magnet=<URI>`

Remove torrent and stop all related streams

### `GET /streams`

List all active streams

## 🎯 Features

- **Direct WebTorrent**: Native library integration
- **Range Support**: Video seeking and partial content
- **Auto File Detection**: Smart video/audio file identification
- **Memory Management**: Proper torrent and stream cleanup
- **CORS Enabled**: Ready for frontend integration
- **Health Monitoring**: Real-time stats and monitoring
- **Graceful Shutdown**: Clean resource cleanup on exit

## 🛠️ Environment Variables

```bash
PORT=8080                    # Server port (default: 8080)
NODE_ENV=production         # Environment mode

DB_HOST=localhost # Database
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

```

## 🔍 Monitoring

Access health endpoint for real-time monitoring:

```bash
curl http://localhost:8080/health
```

Response includes:

- Active torrents and streams
- Download/upload speeds
- WebTorrent client ratio
- Server status

## 🏗️ Architecture

```
Express Server
    ↓
WebTorrent Client (Native)
    ↓
Torrent Management
    ↓
File Streaming (with Range Support)
```

## 🤝 Development

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Check health
curl http://localhost:8080/health
```

## 📝 TODO

- Organise and clean up controllers/modules code. It can be more readable.
- Fetch season/arc details for specific anime episode.
- Refine torrent search logic. Use multiple sources and include season/arc name in the queries.
- Figure out deployment for personal use.
