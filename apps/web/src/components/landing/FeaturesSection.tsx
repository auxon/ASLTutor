import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Camera,
  GraduationCap,
  Hand,
  MessageCircle,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { dictionary, lessons } from '@/data/content';

const FEATURES: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  to?: string;
}> = [
  {
    icon: Hand,
    title: '3D Hand Models',
    description:
      'Rotate, zoom, and scrub through signs. Inspect handshape and palm orientation from any angle — something flat video cannot offer.',
  },
  {
    icon: GraduationCap,
    title: 'Structured Lessons',
    to: '/lessons',
    description: `${lessons.modules.length} modules covering fingerspelling, greetings, and numbers with receptive quizzes and expressive practice.`,
  },
  {
    icon: BookOpen,
    title: `${dictionary.signs.length}+ Sign Dictionary`,
    to: '/dictionary',
    description:
      'Search by English, category, or handshape. Every sign shows the five ASL parameters with 3D demonstration.',
  },
  {
    icon: Camera,
    title: 'Camera Practice',
    to: '/practice',
    description:
      'MediaPipe hand tracking gives real-time pose feedback so you can practice expressive signs with your webcam.',
  },
  {
    icon: RefreshCw,
    title: 'Spaced Repetition',
    to: '/progress',
    description:
      'Per-sign mastery tracking and a smart review queue help you retain what you learn over time.',
  },
  {
    icon: MessageCircle,
    title: 'Talk mode',
    to: '/talk',
    description:
      'A communication aid that plays 3D signs from pins, typed phrases, or speech — with captions. Not a certified interpreter.',
  },
  {
    icon: Smartphone,
    title: 'Works Offline',
    description:
      'Install as a PWA and keep learning on the go — lessons and dictionary available after your first visit.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14 px-4">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Everything you need to learn ASL
        </h2>
        <p className="text-muted-foreground text-lg">
          From your first fingerspelled letter to conversational greetings — built around how sign
          language is actually taught.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto px-4">
        {FEATURES.map(({ icon: Icon, title, description, to }) => {
          const card = (
            <Card
              className="group h-full hover:border-primary/40 hover:landing-glow transition-all duration-300"
            >
              <CardHeader>
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="leading-relaxed">{description}</CardDescription>
              </CardHeader>
            </Card>
          );

          return to ? (
            <Link key={title} to={to} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {card}
            </Link>
          ) : (
            <div key={title}>{card}</div>
          );
        })}
      </div>
    </section>
  );
}
