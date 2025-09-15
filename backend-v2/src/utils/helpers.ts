import type { TorrentFileInfo } from '@types/index';

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getStreamId = (torrentIdentifier: string, fileIndex: number): string => {
  return `${Buffer.from(torrentIdentifier).toString('base64').slice(0, 16)}_${fileIndex}`;
};

export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'wmv', 'flv'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return !!ext && videoExtensions.includes(ext);
};

export const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return !!ext && audioExtensions.includes(ext);
};

const subtitleExt = ['srt', 'ass', 'vtt'];
export const isSubtitleFile = (filename: string): boolean =>
  subtitleExt.includes(filename.split('.').pop()?.toLowerCase() || '');

export const getTorrentId = (input: string | Buffer): string => {
  if (typeof input === 'string' && input.startsWith('magnet:')) {
    return input;
  }
  return `torrent_${Buffer.from(input).toString('base64').slice(0, 32)}`;
};

export const sortFiles = <T extends TorrentFileInfo>(files: T[]): T[] => {
  return files.sort((a, b) => {
    if (a.isPlayable && !b.isPlayable) return -1;
    if (!a.isPlayable && b.isPlayable) return 1;
    return b.size - a.size;
  });
};

export const prepareFileInfo = (torrentFiles: Array<{ name: string; length: number; path: string }>): TorrentFileInfo[] => {
  return torrentFiles.map((file, index) => ({
    index,
    name: file.name,
    size: file.length,
    path: file.path,
    isVideo: isVideoFile(file.name),
    isAudio: isAudioFile(file.name),
    isSubtitle: isSubtitleFile(file.name),
    isPlayable: isVideoFile(file.name) || isAudioFile(file.name),
  }));
};

