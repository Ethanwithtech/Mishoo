import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

const input = process.argv[2] ? resolve(process.argv[2]) : null;
const angleKeysPath = process.argv[3] ? resolve(process.argv[3]) : null;
const outputDir = process.argv[4] ? resolve(process.argv[4]) : resolve('public/desktop-pet');

if (!input || !existsSync(input)) {
  console.error('Usage: npm run direction:audit -- <video> [angle-keys.json] [output-dir]');
  process.exit(1);
}

const probe = JSON.parse(execFileSync(ffprobePath.path, [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=avg_frame_rate,nb_frames:format=duration',
  '-of', 'json',
  input,
], { encoding: 'utf8' }));

const stream = probe.streams?.[0] || {};
const [fpsNumerator, fpsDenominator] = String(stream.avg_frame_rate || '24/1').split('/').map(Number);
const fps = fpsDenominator ? fpsNumerator / fpsDenominator : 24;
const duration = Number(probe.format?.duration || 10);
const totalFrames = Number(stream.nb_frames) || Math.ceil(duration * fps);
const sampleEvery = Math.max(1, Math.round(fps / 6));
const sampleCount = Math.ceil(totalFrames / sampleEvery);
const columns = 8;
const rows = Math.ceil(sampleCount / columns);
const stem = basename(input, extname(input));
const auditDir = resolve('artifacts/direction-audit');
const contactSheet = join(auditDir, `${stem}-contact-sheet.png`);
mkdirSync(auditDir, { recursive: true });

const contactFilter = [
  `select=not(mod(n\\,${sampleEvery}))`,
  'scale=240:-1',
  `drawtext=text='frame %{eif\\:n*${sampleEvery}\\:d}':x=7:y=7:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.68`,
  `tile=${columns}x${rows}:padding=6:margin=6:color=white`,
].join(',');

execFileSync(ffmpegPath, [
  '-y', '-i', input,
  '-vf', contactFilter,
  '-frames:v', '1',
  contactSheet,
], { stdio: 'inherit' });

console.log(`Contact sheet created: ${contactSheet}`);
console.log(`Source: ${totalFrames} frames at approximately ${fps.toFixed(3)} fps; labels are real source frame numbers.`);

if (!angleKeysPath) {
  console.log('Stop here. Inspect the contact sheet, then provide an ANGLE_KEYS JSON to generate the sprite.');
  process.exit(0);
}
if (!existsSync(angleKeysPath)) throw new Error(`Missing ANGLE_KEYS file: ${angleKeysPath}`);

const keys = JSON.parse(readFileSync(angleKeysPath, 'utf8'));
const order = ['center', 'up', 'upRight', 'right', 'downRight', 'down', 'downLeft', 'left', 'upLeft'];
for (const key of order) {
  if (!Number.isInteger(keys[key]) || keys[key] < 0 || keys[key] >= totalFrames) {
    throw new Error(`ANGLE_KEYS.${key} must be a real integer source frame between 0 and ${totalFrames - 1}`);
  }
}

mkdirSync(outputDir, { recursive: true });
const selection = order.map((key) => `eq(n\\,${keys[key]})`).join('+');
const commonKey = `select=${selection},chromakey=0x0047FF:0.12:0.08,scale=512:-1`;
const spritePath = join(outputDir, 'sprite.webp');
const frontPath = join(outputDir, 'framefront.webp');

execFileSync(ffmpegPath, [
  '-y', '-i', input,
  '-vf', `${commonKey},tile=${order.length}x1:padding=0:margin=0:color=black@0`,
  '-frames:v', '1',
  '-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6',
  spritePath,
], { stdio: 'inherit' });

execFileSync(ffmpegPath, [
  '-y', '-i', input,
  '-vf', `select=eq(n\\,${keys.center}),chromakey=0x0047FF:0.12:0.08,scale=512:-1`,
  '-frames:v', '1',
  '-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6',
  frontPath,
], { stdio: 'inherit' });

writeFileSync(join(outputDir, 'angle-keys.json'), `${JSON.stringify({ order, frames: keys }, null, 2)}\n`);
console.log(`Sprite created: ${spritePath}`);
console.log(`Front frame created: ${frontPath}`);
console.log(`Calibration copied: ${join(outputDir, 'angle-keys.json')}`);
