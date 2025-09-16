import express from 'express';
import { upload } from '@middleware/upload';
import * as torrentController from '@controllers/torrentController';

const router = express.Router();

router.get('/health', torrentController.getHealth);

router.post('/torrent/info', upload.single('torrent'), torrentController.postTorrentInfo);

router.get('/stream', torrentController.streamTorrent);
router.delete('/stream', torrentController.stopStream);

// Monitoring and management
router.get('/streams', torrentController.listStreams);
router.get('/torrents', torrentController.listTorrents);
router.delete('/torrent', torrentController.removeTorrent);

export default router;
