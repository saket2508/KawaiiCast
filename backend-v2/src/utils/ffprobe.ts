import { execFile } from 'node:child_process';
import { path as ffprobePath } from 'ffprobe-static';
import type { EmbeddedSubInfo } from '@types/index';

const run = (cmd: string, args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr && stderr.trim().length > 0) {
        // ffprobe can write informational messages to stderr; ignore if exit code is 0
      }
      resolve(stdout.toString());
    });
  });

export async function probeEmbeddedSubs(filePath: string): Promise<EmbeddedSubInfo[]> {
  try {
    const args = [
      '-v',
      'error',
      '-select_streams',
      's',
      '-show_entries',
      'stream=index,codec_name:stream_tags=language,title',
      '-of',
      'json',
      filePath,
    ];

    const out = await run(ffprobePath || 'ffprobe', args);
    const parsed = JSON.parse(out) as { streams?: Array<any> };
    const streams = parsed.streams || [];

    return streams.map((s, i) => ({
      streamIndex: typeof s.index === 'number' ? s.index : i,
      codec: s.codec_name,
      language: s.tags?.language,
      title: s.tags?.title,
    }));
  } catch (err) {
    console.error('ffprobe error:', err);
    return [];
  }
}

