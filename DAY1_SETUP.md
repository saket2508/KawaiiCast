# Day 1 Setup - Anime Streaming Backend

## 🔧 Required Dependencies Installation

```bash
cd backend
npm install
```

## 📊 Database Setup (Docker)

### 1. Start PostgreSQL with Docker

**Prerequisites:** Make sure Docker Desktop is running.

```bash
# From the project root directory
docker-compose up -d postgres
```

This will:

- Pull PostgreSQL 14 image
- Create the `anime_streamer` database
- Create the `anime_user` with password `your_password`
- Automatically run the database schema from `database.sql`
- Make PostgreSQL available on `localhost:5432`

### 2. Verify Database Setup

```bash
# Test connection
psql -h localhost -p 5432 -U anime_user -d anime_streamer -c "SELECT version();"

# List tables
psql -h localhost -p 5432 -U anime_user -d anime_streamer -c "\dt"
```

### 3. Stop/Start Database

```bash
# Stop the database
docker-compose stop postgres

# Start the database
docker-compose start postgres

# View logs
docker-compose logs postgres
```

## 🔑 Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=anime_streamer
DB_USER=anime_user
DB_PASSWORD=your_password

# Server Configuration
PORT=8080
NODE_ENV=development
```

## 🚀 Test the Backend

```bash
# Start the server
npm run dev

# Test endpoints
curl http://localhost:8080/health
curl "http://localhost:8080/api/anime/trending"
curl "http://localhost:8080/api/anime/search?query=naruto"
```

## 📝 Day 1 Endpoints Available

- `GET /health` - Server health check
- `GET /api/anime/search?query=<title>` - Search anime
- `GET /api/anime/trending` - Get trending anime
- `GET /api/anime/popular` - Get popular anime
- `GET /api/anime/:id` - Get anime details
- `GET /api/anime/:id/torrents` - Search torrents for anime
- `GET /api/anime/:id/episodes` - Get episodes with torrents
- `GET /api/torrents/search?query=<title>` - General torrent search

## 🎯 Next Steps (Day 2)

- Frontend redesign with anime search
- Episode selection interface
- Integration with existing torrent streaming
- UI components for anime metadata display

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL container is running
docker ps | grep anime_streamer_db

# Check container logs
docker-compose logs postgres

# Restart the database container
docker-compose restart postgres

# Reset database (this will delete all data!)
docker-compose down
docker volume rm torrent-streamer_postgres_data
docker-compose up -d postgres
```

### Port Conflicts

- Change PORT in .env file if 8080 is in use
- Restart the server after changes

### API Rate Limiting

- AniList has no rate limits but be respectful
- Nyaa searches are cached in database to reduce load
