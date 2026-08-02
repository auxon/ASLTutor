import { Link } from 'react-router-dom';
import { ArrowRight, Hand } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-10 md:p-16 text-center landing-glow">
          <div
            className="absolute inset-0 landing-grid opacity-20 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 text-primary mb-6">
              <Hand className="h-7 w-7" aria-hidden="true" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to start signing?
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-8">
              Jump into structured lessons or browse the full dictionary — no account required.
              Your progress is saved locally in your browser.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/lessons">
                <Button size="lg" className="gap-2 min-w-[180px]">
                  Start first lesson
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/dictionary">
                <Button variant="outline" size="lg" className="min-w-[180px]">
                  Browse dictionary
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
