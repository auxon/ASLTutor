import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SignPlayer } from '@/components/sign-player';
import { Button } from '@/components/ui/Button';
import { getSignById, getAnimationBySignId } from '@/data/content';

export function DemoSection() {
  const demoSign = getSignById('sign-hello');
  const demoAnim = getAnimationBySignId('sign-hello');

  if (!demoSign) return null;

  return (
    <section id="demo" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 landing-gradient opacity-50 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Live Demo
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Try it — sign HELLO in 3D
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Drag to orbit, scrub the timeline, and switch camera angles. This is how SignFlow
            teaches every sign in the dictionary.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur landing-glow overflow-hidden animate-landing-float">
          <SignPlayer sign={demoSign} animation={demoAnim ?? null} />
        </div>

        <div className="text-center mt-8">
          <Link to="/dictionary/sign-hello">
            <Button variant="outline" className="gap-2">
              Explore full sign details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
