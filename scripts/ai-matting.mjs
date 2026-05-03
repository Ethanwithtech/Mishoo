#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const DEFAULTS = {
  out: 'public/videos/golden-alpha.webm',
  preview: 'public/videos/golden-alpha-preview.png',
  venv: '.mishoo-video-env',
  model: 'u2net',
  fps: '30',
  crf: '28',
  install: 'true',
};

function usage() {
  console.log(`Usage:
  npm run video:ai -- <input-video> [options]

This runs open-source AI background removal through backgroundremover.
The first real run creates a local Python virtualenv, installs PyTorch CPU wheels,
installs backgroundremover, downloads the U2Net model, then exports WebM with alpha.

Options:
  --out <path>       Output WebM path. Default: ${DEFAULTS.out}
  --preview <path>   Preview PNG path. Default: ${DEFAULTS.preview}
  --venv <path>      Python virtualenv path. Default: ${DEFAULTS.venv}
  --model <name>     backgroundremover model. Default: ${DEFAULTS.model}
                     Common values: u2net, u2netp, u2net_human_seg
  --fps <n>          Output fps passed to backgroundremover. Default: ${DEFAULTS.fps}
  --crf <n>          Recompression CRF when normalizing output. Default: ${DEFAULTS.crf}
  --skip-install     Do not create venv or install dependencies.

Examples:
  npm run video:ai -- dog.mp4
  npm run video:ai -- dog.mov --model u2netp
  npm run video:ai -- dog.mp4 --out public/videos/golden-alpha.webm
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
    if (token === '--skip-install') {
      options.install = 'false';
      continue;
    }
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

  return options;
}

function runCommand(command, args, extra = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: extra.env ?? process.env,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function commandOutput(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function findPython() {
  for (const command of ['python3', 'python']) {
    const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return command;
  }
  throw new Error('Python was not found. Install Python 3 first.');
}

function venvPython(venvDir) {
  return process.platform === 'win32'
    ? join(venvDir, 'Scripts', 'python.exe')
    : join(venvDir, 'bin', 'python');
}

function venvBinary(venvDir, name) {
  return process.platform === 'win32'
    ? join(venvDir, 'Scripts', `${name}.exe`)
    : join(venvDir, 'bin', name);
}

function ensureParent(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
}

function ensureVenv(options) {
  const venvDir = resolve(options.venv);
  const pythonInVenv = venvPython(venvDir);

  if (!existsSync(pythonInVenv)) {
    if (options.install === 'false') {
      throw new Error(`Virtualenv not found: ${venvDir}. Run without --skip-install first.`);
    }
    const python = findPython();
    runCommand(python, ['-m', 'venv', venvDir]);
  }

  if (options.install !== 'false') {
    runCommand(pythonInVenv, ['-m', 'pip', 'install', '--upgrade', 'pip']);
    runCommand(pythonInVenv, [
      '-m', 'pip', 'install',
      'torch', 'torchvision',
      '--index-url', 'https://download.pytorch.org/whl/cpu',
    ]);
    runCommand(pythonInVenv, ['-m', 'pip', 'install', '--upgrade', 'backgroundremover']);
  }

  return { venvDir, pythonInVenv, backgroundremover: venvBinary(venvDir, 'backgroundremover') };
}

function preview(output, preview) {
  const size = commandOutput(ffmpegPath, [
    '-v', 'error',
    '-i', output,
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=s=x:p=0',
  ]).split('\n')[0] || '1920x1080';

  runCommand(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0xf7efe4:s=${size}:d=1`,
    '-ss', '4',
    '-i', output,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto',
    '-frames:v', '1',
    '-update', '1',
    preview,
  ]);
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const input = resolve(options.input);
  const output = resolve(options.out);
  const previewPath = resolve(options.preview);

  if (!existsSync(input)) {
    throw new Error(`Input video not found: ${input}`);
  }

  ensureParent(output);
  ensureParent(previewPath);

  const { venvDir, backgroundremover } = ensureVenv(options);
  const env = {
    ...process.env,
    PATH: `${dirname(ffmpegPath)}:${process.env.PATH ?? ''}`,
  };

  if (!existsSync(backgroundremover)) {
    throw new Error(`backgroundremover executable not found in ${venvDir}. Dependency install may have failed.`);
  }

  console.log('\nAI matting input:', input);
  console.log('AI matting output:', output);
  console.log('Model:', options.model);

  runCommand(backgroundremover, [
    '-i', input,
    '-tv',
    '--alpha-codec', 'libvpx-vp9',
    '-m', options.model,
    '-fr', options.fps,
    '-o', output,
  ], { env });

  preview(output, previewPath);
  console.log('\nDone. Preview:', previewPath);
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
