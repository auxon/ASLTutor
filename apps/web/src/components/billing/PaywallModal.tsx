import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useBilling, type PaywallReason } from '@/hooks/useBilling';
import { startCheckout } from '@/lib/billing';

const COPY: Record<PaywallReason, { title: string; body: string }> = {
  lesson: {
    title: 'Lessons are included in Pro',
    body: 'Alphabet, greetings, and numbers unlock after a 7-day trial. Camera on HELLO, NAME, and A–E stays free.',
  },
  camera: {
    title: 'Camera on this sign is Pro',
    body: 'You can still watch the 3D teacher. Camera grading beyond HELLO, NAME, and A–E is a Pro feature — a guide, not a fluency grade.',
  },
  srs: {
    title: 'Spaced repetition is Pro',
    body: 'The review queue is the daily habit. Try it for 7 days, then $12.99/month if it sticks.',
  },
  pricing: {
    title: 'Start a 7-day Pro trial',
    body: 'Card on file. Cancel in the billing portal anytime. Scores stay a handshape guide, not a grade.',
  },
};

export function PaywallModal() {
  const { paywallReason, closePaywall, entitlement } = useBilling();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'monthly' | 'yearly'>(null);

  if (!paywallReason) return null;
  const copy = COPY[paywallReason];

  const checkout = async (plan: 'monthly' | 'yearly') => {
    setError(null);
    setBusy(plan);
    try {
      const url = await startCheckout(plan);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="paywall-title" className="text-lg font-semibold">
              {copy.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={closePaywall}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="text-sm text-muted-foreground space-y-1">
          <li>All three lesson modules</li>
          <li>Camera on the rest of the current set</li>
          <li>Spaced-repetition review queue</li>
        </ul>

        {entitlement.email && (
          <p className="text-xs text-muted-foreground">Signed in as {entitlement.email}</p>
        )}

        {error && (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={() => void checkout('monthly')} disabled={Boolean(busy)}>
            {busy === 'monthly' ? 'Redirecting…' : 'Start 7-day trial · $12.99/mo after'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkout('yearly')}
            disabled={Boolean(busy)}
          >
            {busy === 'yearly' ? 'Redirecting…' : 'Yearly · $99 after trial'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Already subscribed?{' '}
          <Link to="/account" className="text-primary hover:underline" onClick={closePaywall}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
