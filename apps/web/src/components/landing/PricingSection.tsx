import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useBilling } from '@/hooks/useBilling';

const FREE = [
  'HELLO, NAME, and letters A–E in 3D',
  'Camera + share compare on that set',
  'Browse the rest of the dictionary in 3D',
];

const PRO = [
  'All three lesson modules',
  'Camera on the rest of the current set',
  'Spaced-repetition review queue',
  '7-day trial, then $12.99/mo or $99/yr',
];

export function PricingSection() {
  const { entitlement, openPaywall } = useBilling();

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14 px-4">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Practice is free. The habit is Pro.
        </h2>
        <p className="text-muted-foreground text-lg">
          The compare card stays free so you can share it. Camera beyond A–E, lessons, and review
          are Pro — a handshape guide, not a fluency grade.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h3 className="text-xl font-semibold mb-1">Free</h3>
          <p className="text-3xl font-bold mb-6">$0</p>
          <ul className="space-y-3 mb-8">
            {FREE.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" onClick={() => openPaywall('pricing')}>
            See Pro
          </Button>
        </div>

        <div className="rounded-2xl border border-primary/40 bg-card p-8">
          <h3 className="text-xl font-semibold mb-1">Pro</h3>
          <p className="text-3xl font-bold mb-1">
            $12.99<span className="text-lg font-medium text-muted-foreground">/mo</span>
          </p>
          <p className="text-sm text-muted-foreground mb-6">or $99/year · 7-day trial</p>
          <ul className="space-y-3 mb-8">
            {PRO.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            onClick={() => openPaywall('pricing')}
            disabled={entitlement.pro}
          >
            {entitlement.pro ? 'You are on Pro' : 'Start 7-day trial'}
          </Button>
        </div>
      </div>
    </section>
  );
}
