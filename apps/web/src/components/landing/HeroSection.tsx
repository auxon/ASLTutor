import { Link } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { dictionary, lessons } from '@/data/content';

const STATS = [
  { value: `${dictionary.signs.length}+`, label: 'Signs in dictionary' },
  { value: `${lessons.modules.length}`, label: 'Lesson modules' },
  { value: '5', label: 'ASL parameters taught' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 landing-gradient pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 landing-grid pointer-events-none opacity-40" aria-hidden="true" />

      <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Interactive 3D ASL Learning
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
          Learn ASL with hands you can{' '}
          <span className="bg-gradient-to-r from-primary via-sky-300 to-accent bg-clip-text text-transparent">
            orbit, slow down, and study
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          SignFlow combines anatomically accurate 3D hand models, structured lessons, camera
          practice, and spaced repetition — designed for how ASL is actually learned.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/lessons">
            <Button size="lg" className="gap-2 min-w-[180px]">
              Start Learning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <a href="#demo">
            <Button variant="outline" size="lg" className="gap-2 min-w-[180px]">
              <Play className="h-4 w-4" aria-hidden="true" />
              Watch Demo
            </Button>
          </a>
        </div>

        <dl className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <dt className="sr-only">{label}</dt>
              <dd className="text-2xl md:text-3xl font-bold text-primary">{value}</dd>
              <dd className="text-xs md:text-sm text-muted-foreground mt-1">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
