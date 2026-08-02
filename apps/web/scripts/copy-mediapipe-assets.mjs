#!/usr/bin/env node
/**
 * Copy MediaPipe wasm + hand landmarker model into Vite public/ before build.
 * Keeps large binaries out of git while ensuring same-origin loads on mobile.
 */
import { cpSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, '..');
const repoRoot = join(webRoot, '../..');
const wasmSrc = join(repoRoot, 'node_modules/@mediapipe/tasks-vision/wasm');
const publicMediapipe = join(webRoot, 'public/mediapipe');
const wasmDest = join(publicMediapipe, 'wasm');
const modelDestDir = join(publicMediapipe, 'models');
const modelDest = join(modelDestDir, 'hand_landmarker.task');
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const modelCache = join(repoRoot, '.cache/mediapipe/hand_landmarker.task');

if (!existsSync(wasmSrc)) {
  console.error('Missing @mediapipe/tasks-vision wasm. Run npm install first.');
  process.exit(1);
}

mkdirSync(wasmDest, { recursive: true });
mkdirSync(modelDestDir, { recursive: true });
mkdirSync(dirname(modelCache), { recursive: true });

for (const name of [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]) {
  cpSync(join(wasmSrc, name), join(wasmDest, name));
}

if (!existsSync(modelCache)) {
  console.log('Downloading hand_landmarker.task …');
  execFileSync('curl', ['-sL', '-o', modelCache, modelUrl], { stdio: 'inherit' });
}
copyFileSync(modelCache, modelDest);

console.log('MediaPipe assets ready at public/mediapipe/');
