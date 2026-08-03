import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = join(root, 'dist');
const outRoot = join(root, 'dist-browsers');
const publicDownloads = join(root, 'public/downloads');
const distDownloads = join(dist, 'downloads');
const windowsExeName = 'Mishoo-0.2.0-Windows-x64.exe';
const windowsExe = join(root, 'release', windowsExeName);

if (!existsSync(dist)) {
  throw new Error('Missing dist/. Run `pnpm run build` first.');
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

function copyDist(target) {
  const targetDir = join(outRoot, target);
  cpSync(dist, targetDir, { recursive: true });
  // Website download files must not be nested inside extension store packages.
  rmSync(join(targetDir, 'downloads'), { recursive: true, force: true });
  return targetDir;
}

function readManifest(dir) {
  return JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
}

function writeManifest(dir, manifest) {
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function zipDir(dir, zipName) {
  const zipPath = join(outRoot, zipName);
  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-qr', zipPath, '.'], { cwd: dir, stdio: 'inherit' });
  return zipPath;
}

// Chrome package: Manifest V3 service worker.
const chromeDir = copyDist('chrome');
const chromeZip = zipDir(chromeDir, 'mishoo-chrome-extension.zip');

// Edge package: the same MV3 extension, with an Edge-specific name to avoid users mixing packages.
const edgeDir = copyDist('edge');
const edgeManifest = readManifest(edgeDir);
edgeManifest.name = 'Mishoo / 咪咻 for Edge';
writeManifest(edgeDir, edgeManifest);
const edgeZip = zipDir(edgeDir, 'mishoo-edge-extension.zip');

// Firefox package: Firefox MV3 currently works better with an extension page for ESM background code.
const firefoxDir = copyDist('firefox');
const firefoxManifest = readManifest(firefoxDir);
firefoxManifest.name = 'Mishoo / 咪咻 for Firefox';
firefoxManifest.background = {
  page: 'extension/firefox-background.html',
};
firefoxManifest.browser_specific_settings = {
  gecko: {
    id: 'mishoo@chili-king.ai',
    strict_min_version: '109.0',
  },
};
writeManifest(firefoxDir, firefoxManifest);
mkdirSync(join(firefoxDir, 'extension'), { recursive: true });
writeFileSync(
  join(firefoxDir, 'extension/firefox-background.html'),
  '<!doctype html><meta charset="utf-8"><script type="module" src="../assets/mishoo-background.js"></script>\n',
);
const firefoxZip = zipDir(firefoxDir, 'mishoo-firefox-extension.zip');

// Put browser packages on the website as direct downloads.
rmSync(publicDownloads, { recursive: true, force: true });
rmSync(distDownloads, { recursive: true, force: true });
mkdirSync(publicDownloads, { recursive: true });
mkdirSync(distDownloads, { recursive: true });
for (const [source, fileName] of [
  [chromeZip, 'mishoo-chrome-extension.zip'],
  [edgeZip, 'mishoo-edge-extension.zip'],
  [firefoxZip, 'mishoo-firefox-extension.zip'],
]) {
  copyFileSync(source, join(publicDownloads, fileName));
  copyFileSync(source, join(distDownloads, fileName));
}
if (existsSync(windowsExe)) {
  copyFileSync(windowsExe, join(publicDownloads, windowsExeName));
  copyFileSync(windowsExe, join(distDownloads, windowsExeName));
}

// Keep a root-level Chrome zip/folder for the existing installation guide.
copyFileSync(chromeZip, join(root, 'mishoo-chrome-extension.zip'));
rmSync(join(root, 'mishoo-chrome-extension'), { recursive: true, force: true });
cpSync(chromeDir, join(root, 'mishoo-chrome-extension'), { recursive: true });

writeFileSync(
  join(outRoot, 'SAFARI_README.md'),
  `# Safari distribution note\n\nSafari Web Extensions need an Xcode/macOS app wrapper and App Store or signed direct distribution. Use the Chrome/Edge web extension code as the source, then convert/package it with Apple's Safari Web Extension tooling in Xcode.\n`,
);

console.log('Created browser packages:');
console.log(`- ${chromeZip}`);
console.log(`- ${edgeZip}`);
console.log(`- ${firefoxZip}`);
console.log(`- ${join(outRoot, 'SAFARI_README.md')}`);
console.log(`Copied website downloads to ${publicDownloads} and ${distDownloads}`);
console.log('Updated root Chrome folder/zip for local loading.');
