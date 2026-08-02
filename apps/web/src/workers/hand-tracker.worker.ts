/// <reference lib="webworker" />

import {
  HandLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

export interface LandmarkMessage {
  type: 'landmarks';
  hands: Array<Array<{ x: number; y: number; z: number }>>;
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  /** True for init failures that should always surface in the UI. */
  fatal?: boolean;
}

export interface ReadyMessage {
  type: 'ready';
}

export interface InitMessage {
  type: 'init';
}

export interface ProcessMessage {
  type: 'process';
  bitmap: ImageBitmap;
  timestamp: number;
}

type WorkerInMessage = InitMessage | ProcessMessage;
type WorkerOutMessage = LandmarkMessage | ErrorMessage | ReadyMessage;

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<void> | null = null;

async function createLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: 'GPU' | 'CPU',
): Promise<HandLandmarker> {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 2,
  });
}

async function initLandmarker(): Promise<void> {
  if (landmarker) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    try {
      landmarker = await createLandmarker(vision, 'GPU');
    } catch {
      // WebGL-in-worker often fails on Android Chrome — fall back to CPU.
      landmarker = await createLandmarker(vision, 'CPU');
    }
  })().catch((err) => {
    // Allow a later init retry after a hard failure.
    initPromise = null;
    throw err;
  });

  return initPromise;
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === 'init') {
    try {
      await initLandmarker();
      self.postMessage({ type: 'ready' } satisfies ReadyMessage);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to init MediaPipe',
        fatal: true,
      } satisfies ErrorMessage);
    }
    return;
  }

  if (msg.type === 'process') {
    try {
      if (!landmarker) await initLandmarker();
      if (!landmarker) throw new Error('Landmarker not initialized');

      const results = landmarker.detectForVideo(msg.bitmap, msg.timestamp);
      msg.bitmap.close();

      const hands =
        results.landmarks?.map((hand) =>
          hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
        ) ?? [];

      self.postMessage({
        type: 'landmarks',
        hands,
        timestamp: msg.timestamp,
      } satisfies LandmarkMessage);
    } catch (err) {
      try {
        msg.bitmap.close();
      } catch {
        // Bitmap may already be closed.
      }
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Detection failed',
        fatal: false,
      } satisfies ErrorMessage);
    }
  }
};

export type { WorkerInMessage, WorkerOutMessage };
