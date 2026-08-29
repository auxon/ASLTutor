import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export type { HandLandmarker };

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandPoint = { x: number; y: number; z: number };
export type DetectedHand = {
  image: HandPoint[];
  world: HandPoint[];
};

let landmarkerPromise: Promise<HandLandmarker> | null = null;
let lastVideoTimestamp = -1;

/**
 * Chrome on iOS is WebKit. Its UA contains "Safari" but "CriOS" instead of
 * "Chrome", so MediaPipe treats it as old Safari and calls
 * document.createElement("canvas") instead of OffscreenCanvas. Passing our
 * own canvas skips that path. CPU avoids the GPU WebGL glue that also
 * touches document.
 */
function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function createGlCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(canvas);
  return canvas;
}

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const canvas = createGlCanvas();
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate,
      },
      canvas,
      runningMode: 'VIDEO',
      numHands: 2,
    });
  } catch (err) {
    canvas.remove();
    throw err;
  }
}

export function loadHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = isAppleWebKit()
      ? createLandmarker('CPU').catch(() => createLandmarker('GPU'))
      : createLandmarker('GPU').catch(() => createLandmarker('CPU'));
  }
  return landmarkerPromise;
}

function mapPoints(
  pts: Array<{ x: number; y: number; z: number }> | undefined,
): HandPoint[] {
  return pts?.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })) ?? [];
}

export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number,
): DetectedHand[] {
  if (video.readyState < 2 || video.videoWidth === 0) return [];
  if (timestamp <= lastVideoTimestamp) return [];
  lastVideoTimestamp = timestamp;

  const results = landmarker.detectForVideo(video, timestamp);
  const imageHands = results.landmarks ?? [];
  const worldHands = results.worldLandmarks ?? [];
  return imageHands.map((hand, i) => ({
    image: mapPoints(hand),
    world: mapPoints(worldHands[i]),
  }));
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}
