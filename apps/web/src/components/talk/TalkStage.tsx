import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Gauge, RotateCcw } from 'lucide-react';
import type { ASLSignClip } from '@asl/sign-schema';
import type { SignAnimation } from '@asl/sign-schema';
import { useSignPlayerStore } from '@/stores/sign-player-store';
import { glossAtProgress } from './playback';

const SignPlayerCanvas = lazy(() =>
  import('@/components/sign-player/SignPlayerCanvas').then((m) => ({ default: m.SignPlayerCanvas })),
);

const SPEEDS = [0.5, 1, 1.5] as const;

interface TalkStageProps {
  sign: ASLSignClip | null;
  animation: SignAnimation | null;
  parts: SignAnimation[];
  label: string;
  replayKey: number;
}

export function TalkStage({ sign, animation, parts, label, replayKey }: TalkStageProps) {
  const setSign = useSignPlayerStore((s) => s.setSign);
  const setPlaying = useSignPlayerStore((s) => s.setPlaying);
  const setProgress = useSignPlayerStore((s) => s.setProgress);
  const setSpeed = useSignPlayerStore((s) => s.setSpeed);
  const setLoop = useSignPlayerStore((s) => s.setLoop);
  const speed = useSignPlayerStore((s) => s.speed);
  const progress = useSignPlayerStore((s) => s.progress);

  useEffect(() => {
    setSign(sign, animation);
    setLoop(false);
    if (animation) {
      setProgress(0);
      setPlaying(true);
    }
  }, [sign, animation, replayKey, setSign, setLoop, setProgress, setPlaying]);

  const liveGloss = useMemo(
    () => (parts.length > 0 ? glossAtProgress(parts, progress) : label),
    [parts, progress, label],
  );

  const cycleSpeed = () => {
    const index = SPEEDS.findIndex((value) => value === speed);
    const next = SPEEDS[(index + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
  };

  const replay = () => {
    setProgress(0);
    setPlaying(Boolean(animation));
  };

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-border bg-card min-h-[220px] sm:min-h-[280px]"
      aria-label="Signing stage"
    >
      <p className="absolute top-3 left-3 z-10 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Signing stage
      </p>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          type="button"
          onClick={replay}
          className="inline-flex flex-col items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          aria-label="Replay sign"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Replay</span>
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          className="inline-flex flex-col items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          aria-label={`Playback speed ${speed.toFixed(1)} times`}
        >
          <Gauge className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">{speed.toFixed(1)}x</span>
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-[220px] sm:h-[280px] text-sm text-muted-foreground">
            Loading 3D hands…
          </div>
        }
      >
        <SignPlayerCanvas
          animation={animation}
          className="w-full h-[220px] sm:h-[280px]"
        />
      </Suspense>

      {!animation && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tap a pin or type a phrase to play signs here.
          </p>
        </div>
      )}

      {animation && liveGloss && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-background/80 border border-border text-xs font-medium tracking-wide">
          {liveGloss}
        </p>
      )}
    </section>
  );
}
