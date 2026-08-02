import { useCallback, useEffect, useRef, useState } from 'react';
import type { Landmark3D, PoseScore } from '@/engine/pose-scorer';
import type { FlatHandPose } from '@/engine/hand-poses';
import {
  scorePose,
  smoothLandmarks,
  extractPrimaryHandLandmarks,
  getTargetPoseForHandshape,
} from '@/engine/pose-scorer';
import { cn } from '@/lib/utils';
import { Camera, CameraOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PracticeCameraProps {
  targetHandshape: string;
  onScore?: (score: PoseScore) => void;
  className?: string;
}

type FacingMode = 'user' | 'environment';

function mapCameraError(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera requires a secure connection (HTTPS).';
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Camera is not supported in this browser.';
  }
  if (!(err instanceof Error)) {
    return 'Camera access denied. Please allow camera access to practice.';
  }
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission denied. Allow camera access in your browser settings and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is in use by another app. Close it and try again.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Could not match the requested camera settings. Try switching cameras.';
    case 'SecurityError':
      return 'Camera access blocked by the browser. Use HTTPS and allow camera permission.';
    case 'AbortError':
      return 'Camera start was interrupted. Please try again.';
    default:
      return err.message || 'Camera access denied. Please allow camera access to practice.';
  }
}

async function requestCameraStream(facingMode: FacingMode): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }
  if (!window.isSecureContext) {
    throw new Error('Camera requires a secure connection (HTTPS).');
  }

  const preferred: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (
      name === 'OverconstrainedError' ||
      name === 'ConstraintNotSatisfiedError' ||
      name === 'NotFoundError' ||
      name === 'DevicesNotFoundError'
    ) {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    throw err;
  }
}

export function PracticeCamera({
  targetHandshape,
  onScore,
  className,
}: PracticeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevLandmarksRef = useRef<Landmark3D[] | null>(null);
  const rafRef = useRef<number>(0);
  const lastScoreTimeRef = useRef(0);
  const inFlightRef = useRef(false);
  const processErrorCountRef = useRef(0);
  const isReadyRef = useRef(false);

  const onScoreRef = useRef(onScore);
  const facingModeRef = useRef<FacingMode>('user');
  const targetPoseRef = useRef<FlatHandPose>(getTargetPoseForHandshape(targetHandshape));

  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<PoseScore | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [canUseCamera] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  );

  const targetPose = getTargetPoseForHandshape(targetHandshape);

  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  useEffect(() => {
    targetPoseRef.current = targetPose;
  }, [targetPose]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    setIsReady(false);
    isReadyRef.current = false;

    const worker = new Worker(
      new URL('../../workers/hand-tracker.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'ready') {
        isReadyRef.current = true;
        setIsReady(true);
        processErrorCountRef.current = 0;
      } else if (data.type === 'error') {
        inFlightRef.current = false;
        // Fatal init failures always surface; detection blips only after repeated failures.
        if (data.fatal || processErrorCountRef.current >= 5) {
          setError(data.message);
        } else {
          processErrorCountRef.current += 1;
        }
      } else if (data.type === 'landmarks') {
        inFlightRef.current = false;
        processErrorCountRef.current = 0;

        const primary = extractPrimaryHandLandmarks(data.hands);
        if (!primary) return;

        const smoothed = smoothLandmarks(primary, prevLandmarksRef.current, 0.3);
        prevLandmarksRef.current = smoothed;

        const now = performance.now();
        if (now - lastScoreTimeRef.current > 200) {
          lastScoreTimeRef.current = now;
          const result = scorePose(
            smoothed,
            targetPoseRef.current,
            facingModeRef.current === 'user',
          );
          setScore(result);
          onScoreRef.current?.(result);
        }
      }
    };

    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      cancelAnimationFrame(rafRef.current);
      inFlightRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    inFlightRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async (mode: FacingMode = facingModeRef.current) => {
    setError(null);
    try {
      // Stop any existing tracks before requesting a new stream (camera switch).
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const stream = await requestCameraStream(mode);
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playErr) {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          video.srcObject = null;
          throw playErr;
        }
      }
      setIsActive(true);
    } catch (err) {
      setIsActive(false);
      setError(mapCameraError(err));
    }
  }, []);

  useEffect(() => {
    if (!isActive || !isReady || !videoRef.current || !workerRef.current) return;

    inFlightRef.current = false;

    const processFrame = () => {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (!video || !worker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (!inFlightRef.current) {
        inFlightRef.current = true;
        createImageBitmap(video)
          .then((bitmap) => {
            if (!workerRef.current) {
              bitmap.close();
              inFlightRef.current = false;
              return;
            }
            workerRef.current.postMessage(
              { type: 'process', bitmap, timestamp: performance.now() },
              [bitmap],
            );
          })
          .catch(() => {
            // Transient mobile Chrome failures (e.g. frame not ready) — retry next rAF.
            inFlightRef.current = false;
          });
      }

      rafRef.current = requestAnimationFrame(processFrame);
    };

    rafRef.current = requestAnimationFrame(processFrame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      inFlightRef.current = false;
    };
  }, [isActive, isReady]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleSwitchCamera = useCallback(() => {
    const next: FacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    const wasActive = !!streamRef.current;
    facingModeRef.current = next;
    setFacingMode(next);
    stopCamera();
    if (wasActive) {
      void startCamera(next);
    }
  }, [startCamera, stopCamera]);

  const scoreColor =
    score && score.overall >= 0.75
      ? 'text-success'
      : score && score.overall >= 0.5
        ? 'text-warning'
        : 'text-muted-foreground';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video max-w-lg">
        <video
          ref={videoRef}
          className={cn('w-full h-full object-cover', facingMode === 'user' && 'scale-x-[-1]')}
          playsInline
          muted
          autoPlay
          aria-label="Webcam feed for sign practice"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Enable your camera to practice signing &ldquo;{targetHandshape}&rdquo;
            </p>
          </div>
        )}

        {score && isActive && (
          <div className="absolute top-3 right-3 bg-background/90 rounded-lg px-3 py-2 text-sm">
            <span className={cn('font-bold text-lg', scoreColor)}>
              {Math.round(score.overall * 100)}%
            </span>
            <span className="text-muted-foreground ml-1">match</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isActive && !isReady && !error && (
        <p className="text-sm text-muted-foreground">Loading hand tracker…</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!isActive ? (
          <Button onClick={() => void startCamera()} disabled={!canUseCamera}>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopCamera}>
            <CameraOff className="h-4 w-4 mr-2" />
            Stop Camera
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleSwitchCamera} disabled={!canUseCamera}>
          Switch camera
        </Button>
      </div>

      {score && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h4 className="font-medium">Feedback</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Handshape</span>
              <div className="font-medium">{Math.round(score.handshape * 100)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Orientation</span>
              <div className="font-medium">{Math.round(score.orientation * 100)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <div className="font-medium">{Math.round(score.location * 100)}%</div>
            </div>
          </div>
          <ul className="space-y-1">
            {score.feedback.map((msg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                {score.overall >= 0.75 ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                )}
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Practice mode uses conservative computer vision feedback. Always compare with the 3D
        reference — scores are guides, not definitive assessments.
      </p>
    </div>
  );
}
