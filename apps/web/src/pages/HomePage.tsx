import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DemoSection } from '@/components/landing/DemoSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ParametersSection } from '@/components/landing/ParametersSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/stores/sign-player-store';

export function HomePage() {
  const onboardingComplete = useOnboardingStore((s) => s.completed);

  return (
    <div className="-mx-4 -my-6">
      {onboardingComplete && (
        <div className="border-b border-border bg-secondary/40">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Welcome back — jump into Talk whenever you need a signing aid.
            </p>
            <Link to="/talk">
              <Button size="sm" variant="secondary" className="gap-2">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Open Talk
              </Button>
            </Link>
          </div>
        </div>
      )}
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <HowItWorksSection />
      <ParametersSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
