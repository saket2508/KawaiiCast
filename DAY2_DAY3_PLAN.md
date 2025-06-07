# Day 2 & 3 Implementation Plan - Anime Streaming App

## 🎯 Day 2 Checklist (Completed)

### ✅ Morning (4 hours) - Core Frontend Components

- [x] **AnimeCard.tsx** - Reusable anime cards for grid/list view
- [x] **AnimeSearch.tsx** - Search interface with trending anime fallback
- [x] **AnimeDetails.tsx** - Detailed anime page with metadata display
- [x] Backend endpoints integrated and tested

### 🔄 Afternoon (4 hours) - Episode & Torrent Integration

- [ ] **EpisodeList.tsx** - Episode list with torrent search (needs creation)
- [ ] Update main page.tsx to use new anime components
- [ ] Integrate existing torrent streaming with new anime workflow
- [ ] Test complete anime → episode → stream flow

## 🚀 Day 3 Final Implementation (6-8 hours)

### Morning (3 hours): Integration & Workflow

1. **Complete EpisodeList Component**

   ```bash
   # Create the file manually:
   touch frontend/src/components/anime/EpisodeList.tsx
   ```

2. **Update Main Page Router**

   - Replace existing torrent input with anime search
   - Add routing between search, details, and streaming
   - Integrate anime selection → episode selection → streaming

3. **Connect Streaming**
   - Modify existing `useTorrentStream` to accept anime context
   - Add episode tracking and history
   - Test magnet URI → streaming pipeline

### Afternoon (3 hours): Polish & Features

4. **Enhanced Video Player**

   - Add anime/episode context to video player
   - Show episode information during playback
   - Add "Next Episode" functionality

5. **User Experience**
   - Add loading states and error handling
   - Implement basic watch history (session-based)
   - Add keyboard shortcuts (space = play/pause, arrows = seek)

### Final Hour: Testing & Documentation

6. **End-to-End Testing**
   - Test complete workflow: Search → Select → Episode → Stream
   - Verify database caching works correctly
   - Test error scenarios (no torrents, network issues)

## 📋 Implementation Details

### EpisodeList.tsx Structure

```typescript
interface EpisodeListProps {
  animeId: number;
  animeTitle: string;
  totalEpisodes: number;
  onStreamEpisode: (
    magnet: string,
    episodeNumber: number,
    title: string
  ) => void;
}

// Features:
// - Grid of episodes (1, 2, 3...)
// - Click episode → search torrents for that episode
// - Show torrent quality, seeders, file size
// - "Stream" button launches video player
// - Expandable episode cards
```

### Updated Main Page Structure

```typescript
// New state management:
const [currentView, setCurrentView] = useState<
  "search" | "details" | "streaming"
>("search");
const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);

// Views:
// 1. AnimeSearch - home page
// 2. AnimeDetails - anime info + episode list
// 3. VideoPlayer - streaming with episode context
```

### Enhanced Streaming Context

```typescript
interface StreamingContext {
  anime: {
    id: number;
    title: string;
    totalEpisodes: number;
  };
  episode: {
    number: number;
    title: string;
  };
  magnet: string;
}
```

## 🔧 Quick Commands for Day 3

### Start Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Database (if needed)
psql -d anime_streamer
```

### Test API Endpoints

```bash
# Test anime search
curl "http://localhost:8080/api/anime/search?query=naruto"

# Test anime details
curl "http://localhost:8080/api/anime/20"

# Test episode torrents
curl "http://localhost:8080/api/anime/20/torrents?episode=1"
```

### Database Debug Queries

```sql
-- Check cached anime
SELECT COUNT(*) FROM anime;
SELECT title, episodes, year FROM anime LIMIT 5;

-- Check torrent cache
SELECT COUNT(*) FROM episode_torrents;
SELECT anime_id, episode_number, quality, seeders FROM episode_torrents LIMIT 10;
```

## 🎨 UI/UX Enhancements (Time Permitting)

### Advanced Features

- **Search Filters**: Year, genre, status filtering
- **Quality Preference**: Remember user's preferred resolution
- **Auto-Next Episode**: Automatically load next episode when current ends
- **Recent Searches**: Show recently searched anime
- **Bookmarks**: Save favorite anime for quick access

### Performance Optimizations

- **Image Lazy Loading**: Only load visible anime cover images
- **Search Debouncing**: Already implemented (300ms delay)
- **Torrent Caching**: Cache torrent search results for 1 hour
- **Progressive Loading**: Load trending anime while user searches

## 🐛 Known Issues & Solutions

### Potential Problems

1. **Nyaa.si Rate Limiting**: Use delays between torrent searches
2. **Missing Episodes**: Some anime may not have all episodes available
3. **Quality Inconsistency**: Different release groups use different naming
4. **Large Database**: PostgreSQL may grow large with cached data

### Solutions

1. **Caching Strategy**: Cache torrent results to reduce API calls
2. **Graceful Fallbacks**: Show "No torrents found" instead of errors
3. **Quality Normalization**: Parse common quality formats (1080p, 720p, etc.)
4. **Data Cleanup**: Periodic cleanup of old cached torrents

## 📊 Success Metrics

### Day 3 Goals

- [ ] Complete anime search → streaming workflow works end-to-end
- [ ] Episode navigation and selection works smoothly
- [ ] Video streaming integrates properly with anime context
- [ ] Error handling provides good user feedback
- [ ] Performance is acceptable (search < 2s, streaming starts < 5s)

### Optional Enhancements

- [ ] Watch history tracking
- [ ] Next episode auto-suggestion
- [ ] Keyboard shortcuts for video player
- [ ] Mobile-responsive design improvements
- [ ] Loading skeleton screens

## 🚢 Deployment Preparation (After Day 3)

### Production Checklist

- [ ] Add environment variable validation
- [ ] Implement proper error logging
- [ ] Add rate limiting for API endpoints
- [ ] Set up database connection pooling
- [ ] Configure CORS for production domain
- [ ] Add Docker Compose for easy deployment
- [ ] Create backup strategy for PostgreSQL

This should give you a fully functional anime streaming app with professional UX similar to HiAnime!
