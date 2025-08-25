#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

// Configurable expectations
const ROOT = path.resolve(process.cwd());
const REGISTRY_PATH = path.join(ROOT, 'src', 'video', 'registry.ts');
const MEDIA_ROOT = path.join(ROOT, 'media');
const ENCODED_PREFIX = '/media/'; // paths in registry are public web paths

const EXPECTED_CODECS = ['h264', 'hevc', 'av01', 'vp9']; // expandable
const MAX_DIMENSIONS = { width: 3840, height: 2160 }; // guardrail

function log(msg) {
  console.log(msg);
}
function warn(msg) {
  console.warn(msg);
}
function error(msg) {
  console.error(msg);
}

async function loadRegistry() {
  const content = await readFile(REGISTRY_PATH, 'utf8');
  return content;
}

function extractSources(registrySource) {
  // Very lightweight parse: match src: '/media/...*.mp4'
  // Avoid multiline by excluding quotes and whitespace line breaks explicitly
  const regex = /src:\s*['"](\/media\/[A-Za-z0-9_\-./]+\.mp4)['"]/g;
  const sources = new Set();
  let m;
  while ((m = regex.exec(registrySource)) !== null) {
    sources.add(m[1]);
  }
  return Array.from(sources);
}

function webPathToFs(p) {
  if (!p.startsWith('/media/')) return null;
  return path.join(MEDIA_ROOT, p.replace('/media/', ''));
}

function runProbe(file) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file];
    const child = spawn('ffprobe', args, { shell: process.platform === 'win32' });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe JSON for ${file}: ${e.message}`));
        }
      } else {
        reject(new Error(`ffprobe exited ${code} for ${file}: ${err}`));
      }
    });
  });
}

async function validateFile(webPath) {
  const fsPath = webPathToFs(webPath);
  if (!fsPath) {
    return { webPath, ok: false, issues: ['Not under /media/ prefix'] };
  }
  if (!existsSync(fsPath)) {
    return { webPath, ok: false, issues: ['Missing file on disk'] };
  }
  try {
    const meta = await runProbe(fsPath);
    const videoStream = (meta.streams || []).find((s) => s.codec_type === 'video');
    if (!videoStream) {
      return { webPath, ok: false, issues: ['No video stream detected'] };
    }
    const issues = [];
    if (!EXPECTED_CODECS.includes(videoStream.codec_name)) {
      issues.push(`Unexpected codec ${videoStream.codec_name}`);
    }
    if (videoStream.width > MAX_DIMENSIONS.width || videoStream.height > MAX_DIMENSIONS.height) {
      issues.push(
        `Dimensions ${videoStream.width}x${videoStream.height} exceed max ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}`,
      );
    }
    // Optional: ensure even dimensions
    if (videoStream.width % 2 || videoStream.height % 2) {
      issues.push('Dimensions not even (may cause encoder issues)');
    }
    return {
      webPath,
      ok: issues.length === 0,
      issues,
      width: videoStream.width,
      height: videoStream.height,
      codec: videoStream.codec_name,
    };
  } catch (e) {
    return { webPath, ok: false, issues: [e.message] };
  }
}

async function main() {
  // Check ffprobe availability
  const probeCheck = spawn('ffprobe', ['-version'], { shell: process.platform === 'win32' });
  let ffprobeMissing = false;
  await new Promise(
    (res) =>
      probeCheck.on('error', () => {
        ffprobeMissing = true;
        res();
      }) || probeCheck.on('exit', () => res()),
  );
  if (ffprobeMissing) {
    error('ffprobe not found in PATH. Install ffmpeg (which provides ffprobe).');
    error('Windows (winget): winget install --id=Gyan.FFmpeg --source=winget');
    process.exit(2);
  }
  const registrySrc = await loadRegistry();
  const sources = extractSources(registrySrc);
  if (!sources.length) {
    warn('No video sources found in registry. Nothing to validate.');
    return;
  }
  log(`Found ${sources.length} unique video source(s) in registry.`);
  const results = [];
  for (const src of sources) {
    // eslint-disable-next-line no-await-in-loop
    const r = await validateFile(src);
    results.push(r);
    if (r.ok) {
      log(`OK  ${src}  ${r.codec} ${r.width}x${r.height}`);
    } else {
      warn(`ISSUES  ${src}\n  - ${r.issues.join('\n  - ')}`);
    }
  }
  const failed = results.filter((r) => !r.ok);
  log('');
  log(`Summary: ${results.length - failed.length} passing, ${failed.length} failing`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  error(e.stack || e.message);
  process.exit(1);
});
