import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { canUseCamera } from '@/engine/entitlement';
import { useBilling } from '@/hooks/useBilling';
import type { ReactNode } from 'react';

export function CameraGate({
  signId,
  children,
}: {
  signId: string;
  children: ReactNode;
}) {
  const { entitlement, openPaywall } = useBilling();
  if (canUseCamera(entitlement, signId)) return children;

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center min-h-[200px]">
      <div className="max-w-sm text-center space-y-3">
        <Lock className="h-6 w-6 mx-auto text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Camera on this sign is Pro</p>
        <p className="text-xs text-muted-foreground">
          Watch the 3D teacher for free. Camera grading beyond HELLO, NAME, and A–E is part of
          the 7-day trial.
        </p>
        <Button type="button" size="sm" onClick={() => openPaywall('camera')}>
          Start 7-day trial
        </Button>
      </div>
    </div>
  );
}
