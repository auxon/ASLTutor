import { Button } from '@/components/ui/Button';
import type { UsageSnapshot } from '@/api/talk';

interface UpgradeSheetProps {
  open: boolean;
  usage: UsageSnapshot | null;
  onClose: () => void;
  onStartTrial: () => void;
  onUpgradePro: () => void;
}

export function UpgradeSheet({ open, usage, onClose, onStartTrial, onUpgradePro }: UpgradeSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div>
          <h2 id="upgrade-title" className="text-xl font-semibold">
            Daily free Talk limit reached
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            You used {usage?.talk_phrases_used ?? 10} of {usage?.talk_phrases_limit ?? 10} free
            phrases today. The phrase you were on finished — Talk does not cut off mid-sign.
          </p>
        </div>
        <p className="text-sm">
          SignFlow Pro is <strong>$12.99/mo</strong> or <strong>$99/yr</strong>, with a 7-day trial.
          Billing is not wired in this slice; trial and Pro are stored locally on this device.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={onStartTrial}>Start 7-day trial</Button>
          <Button variant="secondary" onClick={onUpgradePro}>
            Continue as Pro (local)
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
