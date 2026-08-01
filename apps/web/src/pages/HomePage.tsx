import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DemoSection } from '@/components/landing/DemoSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ParametersSection } from '@/components/landing/ParametersSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function HomePage() {
  return (
    <div className="-mx-4 -my-6">
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
