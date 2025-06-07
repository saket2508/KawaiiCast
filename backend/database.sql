-- Anime Streaming Database Schema
-- Minimal schema for 3-day implementation

-- Core anime information
CREATE TABLE anime (
    id INTEGER PRIMARY KEY,
    anilist_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    description TEXT,
    cover_image VARCHAR(500),
    banner_image VARCHAR(500),
    episodes INTEGER,
    status VARCHAR(50),
    year INTEGER,
    genres TEXT,
    score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Episode tracking
CREATE TABLE anime_episodes (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES anime(id),
    episode_number INTEGER NOT NULL,
    title VARCHAR(500),
    air_date DATE,
    UNIQUE(anime_id, episode_number)
);

-- Cached torrent results
CREATE TABLE episode_torrents (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES anime(id),
    episode_number INTEGER,
    title VARCHAR(500),
    magnet_uri TEXT NOT NULL,
    size_bytes BIGINT,
    seeders INTEGER DEFAULT 0,
    quality VARCHAR(50),
    release_group VARCHAR(100),
    cached_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(anime_id, episode_number, magnet_uri)
);

-- Simple watch tracking (session-based for now)
CREATE TABLE watch_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    anime_id INTEGER REFERENCES anime(id),
    episode_number INTEGER,
    watched_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_anime_title ON anime(title);
CREATE INDEX idx_anime_anilist ON anime(anilist_id);
CREATE INDEX idx_episode_torrents_anime ON episode_torrents(anime_id, episode_number);
CREATE INDEX idx_watch_history_session ON watch_history(session_id); 