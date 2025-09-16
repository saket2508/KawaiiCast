import './shims/env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { corsOptions, createWebTorrentClient } from '@config/webTorrent';
import { startCleanupTimer, stopCleanupTimer } from '@services/cleanupService';
import { destroyAllTorrents } from '@services/torrentManager';
import torrentRoutes from '@routes/torrentRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8081);

const client = createWebTorrentClient();
(app as any).locals.webTorrentClient = client;

client.on('error', (err: any) => {
  console.error('WebTorrent client error:', err);
});

app.use(morgan('combined'));
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/', torrentRoutes);

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully (v2)...');
  try {
    stopCleanupTimer();
  } catch {}
  try {
    destroyAllTorrents();
  } catch {}
  client.destroy(() => {
    console.log('WebTorrent client destroyed (v2)');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend v2 (Bun+TS) on port ${PORT}`);
  try {
    startCleanupTimer();
  } catch {}
});

export default app;
