import { lazy, Suspense, useEffect } from 'react';
import { Play, Pause, RotateCcw, Repeat, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSignPlayerStore, type CameraPreset } from '@/stores/sign-player-store';
import { HANDshape_LABELS } from '@asl/sign-schema';
import type { ASLSignClip, SignAnimation } from '@asl/sign-schema';

const SignPlayerCanvas = lazy(() =>
  import('./SignPlayerCanvas').then((m) => ({ default: m.SignPlayerCanvas })),
);

interface SignPlayerControlsProps {
  sign: ASLSignClip | null;
  className?: string;
}

const SPEEDS = [0.25, 0.5, 1] as const;

const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'free', label: 'Free' },
];

export function SignPlayerControls({ sign, className }: SignPlayerControlsProps) {
  const {
    isPlaying,
    speed,
    loop,
    progress,
    cameraPreset,
    showLeftHand,
    showRightHand,
    setPlaying,
    setSpeed,
    setLoop,
    setProgress,
    setCameraPreset,
    toggleHand,
  } = useSignPlayerStore();

  const handshape = sign?.handshapes.right ?? sign?.handshapes.left ?? '';
  const handshapeLabel = HANDshape_LABELS[handshape] ?? '';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="space-y-2">
        <label htmlFor="timeline" className="sr-only">
          Sign animation timeline
        </label>
        <input
          id="timeline"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => {
            setProgress(Number(e.target.value) / 1000);
            setPlaying(false);
          }}
          className="w-full h-2 rounded-full appearance-none bg-secondary accent-primary cursor-pointer"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={`Animation progress ${Math.round(progress * 100)} percent`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress * (sign?.duration ?? 1) * 10) / 10}s</span>
          <span>{sign?.duration ?? 0}s</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setPlaying(!isPlaying)}
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setProgress(0);
            setPlaying(false);
          }}
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
          aria-label="Reset to start"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setLoop(!loop)}
          className={cn(
            'inline-flex items-center justify-center h-10 w-10 rounded-lg transition-opacity',
            loop ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground',
          )}
          aria-label={loop ? 'Disable loop' : 'Enable loop'}
          aria-pressed={loop}
        >
          <Repeat className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-border mx-1" aria-hidden="true" />

        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={cn(
              'px-3 h-8 rounded-md text-sm font-medium transition-colors',
              speed === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
            aria-label={`${s}x speed`}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Camera view
        </p>
        <div className="flex gap-2 flex-wrap">
          {CAMERA_PRESETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCameraPreset(id)}
              className={cn(
                'px-3 h-8 rounded-md text-sm transition-colors',
                cameraPreset === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={cameraPreset === id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => toggleHand('left')}
          className={cn(
            'inline-flex items-center gap-2 px-3 h-8 rounded-md text-sm',
            showLeftHand ? 'bg-secondary text-foreground' : 'bg-secondary/50 text-muted-foreground',
          )}
          aria-pressed={showLeftHand}
        >
          <Hand className="h-4 w-4" /> Left
        </button>
        <button
          type="button"
          onClick={() => toggleHand('right')}
          className={cn(
            'inline-flex items-center gap-2 px-3 h-8 rounded-md text-sm',
            showRightHand ? 'bg-secondary text-foreground' : 'bg-secondary/50 text-muted-foreground',
          )}
          aria-pressed={showRightHand}
        >
          <Hand className="h-4 w-4" /> Right
        </button>
      </div>

      {sign && handshape && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{sign.gloss}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
              {sign.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{sign.english.join(', ')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Handshape:</span>{' '}
              <strong>{handshape}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Orientation:</span>{' '}
              {sign.palmOrientation}
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span> {sign.location}
            </div>
            <div>
              <span className="text-muted-foreground">Movement:</span> {sign.movement}
            </div>
          </div>
          {handshapeLabel && (
            <p className="text-sm border-t border-border pt-2 text-muted-foreground">
              {handshapeLabel}
            </p>
          )}
          {sign.nmm && (
            <div className="text-sm border-t border-border pt-2">
              <span className="font-medium">Non-manual markers: </span>
              {[sign.nmm.brows, sign.nmm.mouth, sign.nmm.head].filter(Boolean).join('; ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SignPlayerProps {
  sign: ASLSignClip | null;
  animation: SignAnimation | null;
  className?: string;
}

export function SignPlayer({ sign, animation, className }: SignPlayerProps) {
  const setSign = useSignPlayerStore((s) => s.setSign);

  useEffect(() => {
    setSign(sign, animation);
    return () => useSignPlayerStore.getState().reset();
  }, [sign, animation, setSign]);

  return (
    <div className={cn('grid lg:grid-cols-5 gap-4', className)}>
      <div className="lg:col-span-3 rounded-xl overflow-hidden border border-border bg-card min-h-[320px] lg:min-h-[480px]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full min-h-[320px] text-muted-foreground">
              Loading 3D hands…
            </div>
          }
        >
          <SignPlayerCanvas
            animation={animation}
            className="w-full h-full min-h-[320px] lg:min-h-[480px]"
          />
        </Suspense>
      </div>
      <div className="lg:col-span-2">
        <SignPlayerControls sign={sign} />
      </div>
    </div>
  );
}
