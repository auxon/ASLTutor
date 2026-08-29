import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export type { HandLandmarker };

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandPoint = { x: number; y: number; z: number };
export type DetectedHands = HandPoint[][];

/**
 * MediaPipe Tasks Vision touches `document` while loading WASM (script tags /
 * canvas). That throws "Can't find variable: document" in a Worker (Safari)
 * and "document is not defined" elsewhere. Keep this on the window thread.
 */
let landmarkerPromise: Promise<HandLandmarker> | null = null;
let lastVideoTimestamp = -1;

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 2,
  });
}

export function loadHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker('GPU').catch(() => createLandmarker('CPU'));
  }
  return landmarkerPromise;
}

export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number,
): DetectedHands {
  if (video.readyState < 2 || video.videoWidth === 0) return [];
  if (timestamp <= lastVideoTimestamp) return [];
  lastVideoTimestamp = timestamp;

  const results = landmarker.detectForVideo(video, timestamp);
  return (
    results.landmarks?.map((hand) => hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))) ??
    []
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}
