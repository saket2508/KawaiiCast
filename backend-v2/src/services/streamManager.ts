import rangeParser from 'range-parser';
import mime from 'mime-types';
import { STREAM_STATES, activeStreams, cleanupAttempts } from '@utils/constants';
import { addTrackedEventListener, createActivityTracker, createStreamInfo, getCleanupStats, formatStreamData } from '@utils/streamUtils';
import { getStreamId } from '@utils/helpers';
import { performStreamCleanup, isCleanupTimerRunning } from '@services/cleanupService';

export const createVideoStream = async ({
  torrentIdentifier,
  fileIndex,
  file,
  req,
  res,
}: {
  torrentIdentifier: string;
  fileIndex: number;
  file: any; // WebTorrent file object
  req: any;
  res: any;
}) => {
  const streamId = getStreamId(torrentIdentifier, fileIndex);
  const streamInfo = createStreamInfo(torrentIdentifier, fileIndex, file);
  activeStreams.set(streamId, streamInfo);

  try {
    const range = req.headers.range as string | undefined;
    const fileSize = file.length as number;
    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const ranges: any = rangeParser(fileSize, range);
      if (ranges && ranges.length > 0 && ranges.type === 'bytes') {
        start = ranges[0].start;
        end = ranges[0].end;
      }
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    const headers: Record<string, any> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };

    if (range) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      res.status(206);
    } else {
      res.status(200);
    }
    res.set(headers);

    const stream = file.createReadStream({ start, end });
    streamInfo.stream = stream;
    streamInfo.state = STREAM_STATES.ACTIVE;

    const dataListener = createActivityTracker(streamId, activeStreams);
    const streamErrorListener = async (err: any) => {
      console.error(`Stream error for ${streamId}:`, err);
      streamInfo.errors.push({ type: 'stream_error', error: String(err?.message || err), timestamp: Date.now() });
      await performStreamCleanup(streamId, 'stream_error');
      if (!res.headersSent) {
        try {
          res.status(500).json({ error: 'Stream error', details: String(err?.message || err) });
        } catch {}
      }
    };
    const requestCloseListener = async () => {
      console.log(`Client disconnected for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'client_disconnect');
    };
    const requestAbortListener = async () => {
      console.log(`Request aborted for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'request_aborted');
    };
    const responseFinishListener = async () => {
      console.log(`Response finished for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'response_finished');
    };
    const responseErrorListener = async (err: any) => {
      console.error(`Response error for ${streamId}:`, err);
      streamInfo.errors.push({ type: 'response_error', error: String(err?.message || err), timestamp: Date.now() });
      await performStreamCleanup(streamId, 'response_error');
    };

    addTrackedEventListener(streamInfo, stream, 'data', dataListener);
    addTrackedEventListener(streamInfo, stream, 'error', streamErrorListener);
    addTrackedEventListener(streamInfo, req, 'close', requestCloseListener);
    addTrackedEventListener(streamInfo, req, 'aborted', requestAbortListener);
    addTrackedEventListener(streamInfo, res, 'finish', responseFinishListener);
    addTrackedEventListener(streamInfo, res, 'error', responseErrorListener);

    stream.pipe(res);
    console.log(`✓ Stream started successfully: ${streamId} (${file.name})`);
  } catch (err: any) {
    console.error(`Failed to create stream for ${torrentIdentifier}_${fileIndex}:`, err);
    streamInfo.errors.push({ type: 'creation_error', error: String(err?.message || err), timestamp: Date.now() });
    await performStreamCleanup(getStreamId(torrentIdentifier, fileIndex), 'creation_failed');
    throw err;
  }
};

export const stopStream = async (streamId: string) => {
  if (!activeStreams.has(streamId)) return { success: false, reason: 'not_found' } as const;
  console.log(`Manual stop requested for stream: ${streamId}`);
  return await performStreamCleanup(streamId, 'manual_stop');
};

export const getStreamsInfo = () => {
  const now = Date.now();
  const streams = Array.from(activeStreams.entries())
    .map(([id, info]) => formatStreamData(id, info, now))
    .sort((a, b) => b.startTime - a.startTime);
  const stats = getCleanupStats(cleanupAttempts);
  return { activeStreams: activeStreams.size, streams, cleanup: { timerRunning: isCleanupTimerRunning() }, stats };
};

export const getActiveStreamCount = (): number => activeStreams.size;
