import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SignPlayer } from '@/components/sign-player';
import { PracticeCamera } from '@/components/practice/PracticeCamera';
import { CompareShareButton } from '@/components/practice/CompareShareButton';
import { CameraGate } from '@/components/billing/CameraGate';
import { getSignById, getAnimationBySignId } from '@/data/content';
import { recordPracticeSession } from '@/engine/mastery';
import { canUseCamera } from '@/engine/entitlement';
import { useBilling } from '@/hooks/useBilling';
import type { FrameCaptureHandle, PracticeCaptureHandle } from '@/engine/compare-card';

export function SignDetailPage() {
  const { signId } = useParams<{ signId: string }>();
  const sign = signId ? getSignById(signId) : undefined;
  const animation = signId ? getAnimationBySignId(signId) : undefined;
  const [handshapePercent, setHandshapePercent] = useState<number | undefined>();
  const playerRef = useRef<FrameCaptureHandle>(null);
  const cameraRef = useRef<PracticeCaptureHandle>(null);
  const { entitlement } = useBilling();

  if (!sign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Sign not found.</p>
        <Link
          to="/dictionary"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border hover:bg-secondary"
        >
          Back to Dictionary
        </Link>
      </div>
    );
  }

  const handshape = sign.handshapes.right ?? sign.handshapes.left ?? 'A';

  return (
    <div className="space-y-6">
      <Link
        to="/dictionary"
        className="inline-flex items-center h-8 px-2 rounded-lg text-sm hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Dictionary
      </Link>

      <SignPlayer ref={playerRef} sign={sign} animation={animation ?? null} />

      <section aria-labelledby="practice-heading" className="border-t border-border pt-6">
        <h2 id="practice-heading" className="text-xl font-bold mb-4">
          Practice This Sign
        </h2>
        <CameraGate signId={sign.id}>
          <PracticeCamera
            ref={cameraRef}
            targetHandshape={handshape}
            onScore={async (s) => {
              setHandshapePercent(s.handshape * 100);
              if (s.overall >= 0.4) {
                await recordPracticeSession(sign.id, s.overall, 'expressive');
              }
            }}
          />
        </CameraGate>
        {canUseCamera(entitlement, sign.id) && (
          <div className="mt-4">
            <CompareShareButton
              gloss={sign.gloss}
              handshapePercent={handshapePercent}
              playerRef={playerRef}
              cameraRef={cameraRef}
            />
          </div>
        )}
      </section>

      {sign.regionalNotes && (
        <p className="text-sm text-muted-foreground border-l-2 border-accent pl-4">
          Regional note: {sign.regionalNotes}
        </p>
      )}
    </div>
  );
}
