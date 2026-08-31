import { useRef, useState } from 'react';
import { SignPlayer } from '@/components/sign-player';
import { PracticeCamera } from '@/components/practice/PracticeCamera';
import { CompareShareButton } from '@/components/practice/CompareShareButton';
import { CameraGate } from '@/components/billing/CameraGate';
import { dictionary, getSignById, getAnimationBySignId } from '@/data/content';
import { getReviewQueue } from '@/engine/mastery';
import { canUseCamera, canUseSrs } from '@/engine/entitlement';
import { useBilling } from '@/hooks/useBilling';
import type { FrameCaptureHandle, PracticeCaptureHandle } from '@/engine/compare-card';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shuffle } from 'lucide-react';

type PracticeMode = 'fingerspelling' | 'review' | 'free';

export function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('fingerspelling');
  const [currentSignId, setCurrentSignId] = useState('sign-a');
  const [handshapePercent, setHandshapePercent] = useState<number | undefined>();
  const playerRef = useRef<FrameCaptureHandle>(null);
  const cameraRef = useRef<PracticeCaptureHandle>(null);
  const { entitlement, openPaywall } = useBilling();

  const reviewQueue = useLiveQuery(() => getReviewQueue(10), []) ?? [];

  const fingerSigns = dictionary.signs.filter((s) => s.category === 'fingerspelling');
  const sign = getSignById(currentSignId);
  const animation = getAnimationBySignId(currentSignId);
  const handshape = sign?.handshapes.right ?? sign?.handshapes.left ?? 'A';

  const pickRandom = () => {
    const pool =
      mode === 'fingerspelling'
        ? fingerSigns
        : mode === 'review' && reviewQueue.length > 0
          ? reviewQueue.map((r) => getSignById(r.signId)).filter(Boolean)
          : dictionary.signs;
    const filtered = pool.filter(Boolean);
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)]!;
    setCurrentSignId(pick.id);
    setHandshapePercent(undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practice</h1>
        <p className="text-muted-foreground mt-1">
          Expressive practice with camera feedback — compare your signing to the 3D reference
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['fingerspelling', 'Fingerspelling'],
            ['review', `Review (${reviewQueue.length})`],
            ['free', 'Free Practice'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={mode === id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              if (id === 'review' && !canUseSrs(entitlement)) {
                openPaywall('srs');
                return;
              }
              setMode(id);
            }}
          >
            {label}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={pickRandom}>
          <Shuffle className="h-4 w-4 mr-1" /> Random
        </Button>
      </div>

      {mode === 'fingerspelling' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a letter or number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {fingerSigns.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCurrentSignId(s.id);
                    setHandshapePercent(undefined);
                  }}
                  className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                    currentSignId === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  } ${!canUseCamera(entitlement, s.id) ? 'opacity-70' : ''}`}
                  aria-label={`Practice ${s.gloss}`}
                  aria-pressed={currentSignId === s.id}
                >
                  {s.gloss}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sign && (
        <div className="grid lg:grid-cols-2 gap-6">
          <SignPlayer ref={playerRef} sign={sign} animation={animation ?? null} />
          <div className="space-y-4">
            <CameraGate signId={sign.id}>
              <PracticeCamera
                ref={cameraRef}
                targetHandshape={handshape}
                onScore={(s) => setHandshapePercent(s.handshape * 100)}
              />
            </CameraGate>
            {canUseCamera(entitlement, sign.id) && (
              <CompareShareButton
                gloss={sign.gloss}
                handshapePercent={handshapePercent}
                playerRef={playerRef}
                cameraRef={cameraRef}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
