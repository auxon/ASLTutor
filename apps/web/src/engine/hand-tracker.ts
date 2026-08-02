import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Keep WASM fileset version in lockstep with the installed JS package
 * (`@mediapipe/tasks-vision` in apps/web/package.json). Mismatched versions
 * hang or fail during FilesetResolver / createFromOptions.
 */
const MEDIAPIPE_VISION_VERSION = '0.10.35';
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VISION_VERSION}/wasm`;

const INIT_TIMEOUT_MS = 45_000;

export type HandLandmarks = Array<Array<{ x: number; y: number; z: number }>>;

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Check your network and try again.`));
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

/**
 * Initialize HandLandmarker on the main thread.
 * CPU-first: GPU-in-worker/WebGL is unreliable on mobile Chrome; main-thread
 * CPU is the most compatible path for practice feedback.
 */
export async function initHandTracker(): Promise<void> {
  if (landmarker) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = withTimeout(
    (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      // Prefer CPU for broad mobile Chrome compatibility. Fall back to GPU if CPU fails.
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
    'Hand tracker download',
  );

  try {
    landmarker = await initPromise;
  } catch (err) {
    initPromise = null;
    landmarker = null;
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
