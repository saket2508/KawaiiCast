# Backend Structure

This document explains the new modular structure of the torrent streamer backend.

## Directory Structure

```
backend/
├── app.js                  # Main application entry point
├── server.js              # OLD monolithic file (can be removed)
├── config/
│   └── webTorrent.js      # WebTorrent and application configuration
├── controllers/
│   ├── torrentController.js # Torrent-related request handlers
│   └── animeController.js   # Anime-related request handlers
├── middleware/
│   └── upload.js          # File upload middleware configuration
├── routes/
│   ├── torrentRoutes.js   # Torrent endpoint definitions
│   └── animeRoutes.js     # Anime endpoint definitions
├── services/
│   ├── database.js        # Database connection and queries
│   ├── anilistService.js  # AniList API integration
│   └── torrentService.js  # Torrent search and management
├── utils/
│   └── helpers.js         # Utility functions and helpers
└── package.json
```

## Components Overview

### 🎯 **app.js** - Main Application

- Express app setup and configuration
- WebTorrent client initialization
- Route registration
- Graceful shutdown handling
- **Lines: ~60** (vs. original 967 lines)

### ⚙️ **config/** - Configuration

- **webTorrent.js**: WebTorrent client configuration, CORS settings, file upload config

### 🎮 **controllers/** - Request Handlers

- **torrentController.js**: All torrent-related operations (info, streaming, management)
- **animeController.js**: All anime-related operations (search, details, episodes)

### 🛣️ **routes/** - Endpoint Definitions

- **torrentRoutes.js**: `/health`, `/torrent/*`, `/stream`, `/streams`
- **animeRoutes.js**: `/api/anime/*`, `/api/torrents/search`

### 🧰 **middleware/** - Custom Middleware

- **upload.js**: Multer configuration for torrent file uploads

### 🔧 **utils/** - Utility Functions

- **helpers.js**: File type detection, byte formatting, ID generation, etc.

### 🗃️ **services/** - Business Logic (existing)

- **database.js**: PostgreSQL connection and query helpers
- **anilistService.js**: AniList API integration
- **torrentService.js**: Torrent search and parsing

## Benefits of New Structure

### 📦 **Modularity**

- Each file has a single responsibility
- Easy to locate and modify specific functionality
- Better code organization and maintainability

### 🧪 **Testability**

- Controllers can be unit tested independently
- Services are easily mockable
- Clear separation of concerns

### 👥 **Team Development**

- Multiple developers can work on different modules
- Reduced merge conflicts
- Easier code reviews

### 🔧 **Maintainability**

- Bug fixes are isolated to specific modules
- New features can be added without touching existing code
- Configuration changes are centralized

## Migration Notes

### ✅ **What Changed**

- Moved from single 967-line file to modular structure
- Separated concerns into logical modules
- Maintained all existing functionality
- Improved code readability and organization

### 🔄 **What Stayed the Same**

- All API endpoints work exactly the same
- Database schema unchanged
- WebTorrent functionality identical
- Environment variables unchanged

### 🗑️ **What to Remove**

- The old `server.js` file can be safely deleted
- No other files need to be removed

## API Endpoints (Unchanged)

### Torrent Operations

- `GET /health` - Health check
- `GET /torrent/info?magnet=` - Get torrent info via magnet
- `POST /torrent/info` - Get torrent info via file upload or JSON
- `GET /stream?magnet=&file_index=` - Stream torrent file
- `DELETE /stream?magnet=&file_index=` - Stop stream
- `GET /streams` - List active streams
- `DELETE /torrent?magnet=` - Remove torrent

### Anime Operations

- `GET /api/anime/search?query=` - Search anime
- `GET /api/anime/trending` - Get trending anime
- `GET /api/anime/popular` - Get popular anime
- `GET /api/anime/:id` - Get anime details
- `GET /api/anime/:id/torrents` - Get torrents for anime
- `GET /api/anime/:id/episodes` - Get episodes with torrents
- `GET /api/torrents/search?query=` - General torrent search

## Running the Application

```bash
# Development
npm run dev

# Production
npm start
```

The application will start on port 8080 (or PORT environment variable) and function identically to the previous version.
