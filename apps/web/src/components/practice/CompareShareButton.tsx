import { useEffect, useRef, useState, type RefObject } from 'react';
import { Share2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  compareCaption,
  composeCompareCard,
  downloadCompareCard,
  shareCompareCard,
  type FrameCaptureHandle,
  type PracticeCaptureHandle,
} from '@/engine/compare-card';

interface CompareShareButtonProps {
  gloss: string;
  handshapePercent?: number;
  playerRef: RefObject<FrameCaptureHandle | null>;
  cameraRef: RefObject<PracticeCaptureHandle | null>;
}

export function CompareShareButton({
  gloss,
  handshapePercent,
  playerRef,
  cameraRef,
}: CompareShareButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const closePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewBlob(null);
  };

  const capture = async () => {
    setError(null);
    if (!cameraRef.current?.isCameraActive()) {
      setError('Start the camera first, then share a compare card.');
      return;
    }
    const teacher = playerRef.current?.captureFrame();
    const you = cameraRef.current.captureFrame();
    if (!teacher) {
      setError('The 3D hands are still loading. Wait a moment and try again.');
      return;
    }
    if (!you) {
      setError('Could not capture the camera view. Make sure the camera is running.');
      return;
    }
    setBusy(true);
    try {
      const blob = await composeCompareCard({
        teacher,
        you,
        gloss,
        handshapePercent,
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewBlob(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the compare card.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!previewBlob) return;
    setError(null);
    try {
      const result = await shareCompareCard(
        previewBlob,
        compareCaption(gloss),
        `signflow-${gloss.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
      );
      if (result === 'downloaded') {
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Share was cancelled.');
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => void capture()} disabled={busy}>
          <Share2 className="h-4 w-4 mr-2" />
          {busy ? 'Capturing…' : 'Share compare'}
        </Button>
        {error && !previewUrl && (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        )}
      </div>

      {previewUrl && previewBlob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-share-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="compare-share-title" className="text-lg font-semibold">
                  Compare card
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  3D teacher vs your hand — a guide, not a grade.
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewUrl}
              alt={`Side-by-side of the 3D ${gloss} sign and your camera`}
              className="w-full rounded-lg border border-border"
            />
            {error && (
              <p className="text-sm text-destructive" role="status">
                {error}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button type="button" onClick={() => void share()}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  downloadCompareCard(
                    previewBlob,
                    `signflow-${gloss.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
                  );
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Save image
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
