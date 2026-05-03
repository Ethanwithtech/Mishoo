#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffprobePath = ffprobeStatic.path;

const DEFAULTS = {
  out: 'public/videos/golden-alpha.webm',
  preview: 'public/videos/golden-alpha-preview.png',
  mode: 'auto',
  key: '00ff00',
  similarity: '0.22',
  blend: '0.08',
  fps: '30',
  width: '1920',
  height: '1080',
  crf: '28',
};

function usage() {
  console.log(`Usage:
  npm run video:key -- <input-video> [options]

Options:
  --out <path>          Output transparent WebM path. Default: ${DEFAULTS.out}
  --preview <path>      Preview PNG path. Default: ${DEFAULTS.preview}
  --mode <auto|alpha|chroma|black|white>
                        auto preserves alpha when available, otherwise chroma keys.
  --key <hex>           Chroma key color without #. Default: ${DEFAULTS.key}
  --similarity <n>      Key similarity. Default: ${DEFAULTS.similarity}
  --blend <n>           Edge blend. Default: ${DEFAULTS.blend}
  --fps <n>             Output fps. Default: ${DEFAULTS.fps}
  --width <n>           Output width. Default: ${DEFAULTS.width}
  --height <n>          Output height. Default: ${DEFAULTS.height}
  --crf <n>             VP9 CRF. Lower = higher quality. Default: ${DEFAULTS.crf}

Examples:
  npm run video:key -- dog-greenscreen.mp4 --mode chroma --key 00ff00 --similarity 0.25 --blend 0.10
  npm run video:key -- dog-alpha.mov --mode alpha
  npm run video:key -- dog-black.mov --mode black --similarity 0.12 --blend 0.08
`);
}

function parseArgs(argv) {
  const [input, ...rest] = argv;
  if (!input || input === '-h' || input === '--help') {
    usage();
    process.exit(input ? 0 : 1);
  }

  const options = { ...DEFAULTS, input };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }
    options[key] = value;
    index += 1;
  }

  if (!['auto', 'alpha', 'chroma', 'black', 'white'].includes(options.mode)) {
    throw new Error(`Invalid --mode: ${options.mode}`);
  }

  return options;
}

function probe(input) {
  const output = execFileSync(ffprobePath, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,pix_fmt,width,height,r_frame_rate:stream_tags=alpha_mode',
    '-of', 'json',
    input,
  ], { encoding: 'utf8' });
  return JSON.parse(output).streams?.[0] ?? {};
}

function hasAlpha(stream) {
  const pixFmt = String(stream.pix_fmt || '').toLowerCase();
  const alphaMode = String(stream.tags?.alpha_mode || '');
  return alphaMode === '1' || /yuva|rgba|argb|bgra|gbrap/.test(pixFmt);
}

function ensureParent(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
}

function filterFor(options, alphaAvailable) {
  const base = `fps=${options.fps},scale=${options.width}:${options.height}:flags=lanczos`;

  if (options.mode === 'alpha' || (options.mode === 'auto' && alphaAvailable)) {
    return `${base},format=yuva420p`;
  }

  if (options.mode === 'black') {
    return `${base},colorkey=0x000000:${options.similarity}:${options.blend},format=yuva420p`;
  }

  if (options.mode === 'white') {
    return `${base},colorkey=0xffffff:${options.similarity}:${options.blend},format=yuva420p`;
  }

  return `${base},chromakey=0x${options.key}:${options.similarity}:${options.blend},despill=green,format=yuva420p`;
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const input = resolve(options.input);

  if (!existsSync(input)) {
    throw new Error(`Input video not found: ${input}`);
  }

  ensureParent(options.out);
  ensureParent(options.preview);

  const stream = probe(input);
  const alphaAvailable = hasAlpha(stream);
  const filter = filterFor(options, alphaAvailable);

  console.log('Input:', input);
  console.log('Detected:', {
    codec: stream.codec_name,
    pix_fmt: stream.pix_fmt,
    alpha_mode: stream.tags?.alpha_mode ?? '0',
    width: stream.width,
    height: stream.height,
    fps: stream.r_frame_rate,
  });
  console.log('Mode:', options.mode === 'auto' ? (alphaAvailable ? 'alpha' : 'chroma') : options.mode);
  console.log('Output:', options.out);

  execFileSync(ffmpegPath, [
    '-y',
    '-i', input,
    '-vf', filter,
    '-c:v', 'libvpx-vp9',
    '-b:v', '0',
    '-crf', options.crf,
    '-auto-alt-ref', '0',
    '-an',
    options.out,
  ], { stdio: 'inherit' });

  execFileSync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0xf7efe4:s=${options.width}x${options.height}:d=1`,
    '-ss', '4',
    '-i', options.out,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto',
    '-frames:v', '1',
    '-update', '1',
    options.preview,
  ], { stdio: 'inherit' });

  console.log('Preview:', options.preview);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
