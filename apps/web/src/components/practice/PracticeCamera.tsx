import { useCallback, useEffect, useRef, useState } from 'react';
import type { Landmark3D, PoseScore } from '@/engine/pose-scorer';
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

  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<PoseScore | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const targetPose = getTargetPoseForHandshape(targetHandshape);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/hand-tracker.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'ready') {
        setIsReady(true);
      } else if (data.type === 'error') {
        setError(data.message);
      } else if (data.type === 'landmarks') {
        const primary = extractPrimaryHandLandmarks(data.hands);
        if (!primary) return;

        const smoothed = smoothLandmarks(primary, prevLandmarksRef.current, 0.3);
        prevLandmarksRef.current = smoothed;

        const now = performance.now();
        if (now - lastScoreTimeRef.current > 200) {
          lastScoreTimeRef.current = now;
          const result = scorePose(smoothed, targetPose, facingMode === 'user');
          setScore(result);
          onScore?.(result);
        }
      }
    };

    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetPose, facingMode, onScore]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Camera access denied. Please allow camera access to practice.',
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (!isActive || !isReady || !videoRef.current || !workerRef.current) return;

    const processFrame = () => {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (!video || !worker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      createImageBitmap(video).then((bitmap) => {
        worker.postMessage(
          { type: 'process', bitmap, timestamp: performance.now() },
          [bitmap],
        );
      });

      rafRef.current = requestAnimationFrame(processFrame);
    };

    rafRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, isReady]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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

      <div className="flex gap-2 flex-wrap">
        {!isActive ? (
          <Button onClick={startCamera} disabled={!isReady}>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopCamera}>
            <CameraOff className="h-4 w-4 mr-2" />
            Stop Camera
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            stopCamera();
            setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
          }}
        >
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
