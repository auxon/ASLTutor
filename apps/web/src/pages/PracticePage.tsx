import { useState } from 'react';
import { SignPlayer } from '@/components/sign-player';
import { PracticeCamera } from '@/components/practice/PracticeCamera';
import { dictionary, getSignById, getAnimationBySignId } from '@/data/content';
import { getReviewQueue } from '@/engine/mastery';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shuffle } from 'lucide-react';

type PracticeMode = 'fingerspelling' | 'review' | 'free';

export function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('fingerspelling');
  const [currentSignId, setCurrentSignId] = useState('sign-a');

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
            onClick={() => setMode(id)}
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
                  onClick={() => setCurrentSignId(s.id)}
                  className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                    currentSignId === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
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
          <SignPlayer sign={sign} animation={animation ?? null} />
          <PracticeCamera targetHandshape={handshape} />
        </div>
      )}
    </div>
  );
}
