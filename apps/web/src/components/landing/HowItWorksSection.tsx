import { BookOpen, Camera, Trophy } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: BookOpen,
    title: 'Explore signs in 3D',
    description:
      'Browse the dictionary or start a lesson module. Every sign comes with a rotatable 3D hand model and full parameter breakdown.',
  },
  {
    step: '02',
    icon: Camera,
    title: 'Practice with your camera',
    description:
      'Turn on webcam practice to get pose feedback. SignFlow compares your hand shape and movement against the reference sign.',
  },
  {
    step: '03',
    icon: Trophy,
    title: 'Build lasting mastery',
    description:
      'Spaced repetition tracks what you know and queues signs for review — so you retain vocabulary instead of cramming and forgetting.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14 px-4">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          How it works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Three steps to fluency
        </h2>
        <p className="text-muted-foreground text-lg">
          A learning loop designed around receptive understanding and expressive production.
        </p>
      </div>

      <ol className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
        {STEPS.map(({ step, icon: Icon, title, description }, index) => (
          <li key={step} className="relative text-center md:text-left">
            {index < STEPS.length - 1 && (
              <div
                className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-primary/40 to-transparent"
                aria-hidden="true"
              />
            )}
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-5">
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-primary tracking-widest mb-2">{step}</p>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
