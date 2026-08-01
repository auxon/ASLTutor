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

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<void> | null = null;

async function initLandmarker(): Promise<void> {
  if (landmarker) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
    );
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  })();

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
      msg.bitmap.close();
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Detection failed',
      } satisfies ErrorMessage);
    }
  }
};

export type { WorkerInMessage, WorkerOutMessage };
