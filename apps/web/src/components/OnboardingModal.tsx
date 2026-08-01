import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/stores/sign-player-store';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    title: 'Welcome to SignFlow',
    content:
      'SignFlow teaches American Sign Language using interactive 3D hands you can rotate, slow down, and study from every angle.',
  },
  {
    title: 'The Five Parameters of ASL',
    content:
      'Every sign has five components: Handshape, Palm Orientation, Location, Movement, and Non-manual Markers (facial expressions). Our 3D player lets you inspect each one.',
  },
  {
    title: 'Orbit & Explore',
    content:
      'Drag to rotate the 3D hands. Use camera presets (Front, Side, Top) to inspect palm orientation. Scrub the timeline to pause on key moments.',
  },
  {
    title: 'Practice with Your Camera',
    content:
      'Enable your camera in Practice mode to compare your handshape with the target. Feedback is conservative — always use the 3D reference as your guide.',
  },
  {
    title: 'Learn & Review',
    content:
      'Follow structured lessons, browse the dictionary, and let spaced repetition bring back signs you need to practice. Ready to start?',
  },
];

export function OnboardingModal() {
  const { completed, currentStep, complete, setStep } = useOnboardingStore();
  const [visible, setVisible] = useState(!completed);

  if (!visible || completed) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  i <= currentStep ? 'bg-primary' : 'bg-secondary',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              complete();
              setVisible(false);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="onboarding-title" className="text-xl font-bold mb-2">
          {step.title}
        </h2>
        <p className="text-muted-foreground mb-6">{step.content}</p>

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button
            onClick={() => {
              if (isLast) {
                complete();
                setVisible(false);
              } else {
                setStep(currentStep + 1);
              }
            }}
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
