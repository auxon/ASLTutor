import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Self-hosted under /ASLTutor/mediapipe/ so mobile Chrome does not depend on
 * jsDelivr / Google Storage (and so a stale SW CDN cache cannot wedge init).
 */
const WASM_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_ASSET_PATH = `${import.meta.env.BASE_URL}mediapipe/models/hand_landmarker.task`;

const INIT_TIMEOUT_MS = 30_000;

export type HandLandmarks = Array<Array<{ x: number; y: number; z: number }>>;
export type TrackerStatus =
  | 'idle'
  | 'loading-wasm'
  | 'loading-model'
  | 'ready'
  | 'error';

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s. Try Retry, or clear site data for entangleit.com and reload.`,
        ),
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

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

export type InitProgress = (status: TrackerStatus, detail?: string) => void;

/**
 * Initialize HandLandmarker on the main thread with self-hosted assets.
 * CPU-first for mobile Chrome compatibility.
 */
export async function initHandTracker(onProgress?: InitProgress): Promise<void> {
  if (landmarker) {
    onProgress?.('ready');
    return;
  }
  if (initPromise) {
    onProgress?.('loading-model', 'Finishing hand tracker setup…');
    await initPromise;
    onProgress?.('ready');
    return;
  }

  initPromise = withTimeout(
    (async () => {
      onProgress?.('loading-wasm', 'Loading vision engine…');
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      onProgress?.('loading-model', 'Loading hand model…');
      // Prefer CPU for broad mobile Chrome compatibility.
      try {
        return await createLandmarker(vision, 'CPU');
      } catch (cpuErr) {
        try {
          return await createLandmarker(vision, 'GPU');
        } catch {
          throw cpuErr instanceof Error
            ? cpuErr
            : new Error('Failed to initialize hand tracker');
        }
      }
    })(),
    INIT_TIMEOUT_MS,
    'Hand tracker',
  );

  try {
    landmarker = await initPromise;
    onProgress?.('ready');
  } catch (err) {
    initPromise = null;
    landmarker = null;
    onProgress?.('error', err instanceof Error ? err.message : 'Hand tracker failed');
    throw err;
  }
}

export function isHandTrackerReady(): boolean {
  return landmarker != null;
}

/** Run detection against a live video element (VIDEO running mode). */
export function detectHands(
  video: HTMLVideoElement,
  timestampMs: number,
): HandLandmarks {
  if (!landmarker) return [];
  if (video.readyState < 2) return [];

  const results = landmarker.detectForVideo(video, timestampMs);
  return (
    results.landmarks?.map((hand) => hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))) ?? []
  );
}

export function closeHandTracker(): void {
  try {
    landmarker?.close();
  } catch {
    // ignore
  }
  landmarker = null;
  initPromise = null;
}
