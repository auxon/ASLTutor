import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Hand, Sparkles } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { SignPlayer } from '@/components/sign-player';
import { dictionary, lessons, getSignById, getAnimationBySignId } from '@/data/content';

export function HomePage() {
  const demoSign = getSignById('sign-hello');
  const demoAnim = getAnimationBySignId('sign-hello');

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Interactive 3D ASL Learning
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Learn ASL with hands you can{' '}
          <span className="text-primary">orbit, slow down, and study</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          SignFlow combines anatomically accurate 3D hand models, structured lessons, camera
          practice, and spaced repetition — designed for how ASL is actually learned.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/lessons"
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            Start Learning
          </Link>
          <Link
            to="/dictionary"
            className="inline-flex items-center justify-center h-12 px-6 rounded-lg font-medium border border-border hover:bg-secondary"
          >
            Browse Dictionary
          </Link>
        </div>
      </section>

      {demoSign && (
        <section aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="text-2xl font-bold mb-4 text-center">
            Try it — sign HELLO in 3D
          </h2>
          <SignPlayer sign={demoSign} animation={demoAnim ?? null} />
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-4" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          Features
        </h2>
        <Card>
          <CardHeader>
            <Hand className="h-8 w-8 text-primary mb-2" />
            <CardTitle>3D Hand Models</CardTitle>
            <CardDescription>
              Rotate, zoom, and scrub through signs. Inspect handshape and palm orientation from
              any angle — something flat video cannot offer.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <GraduationCap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Structured Lessons</CardTitle>
            <CardDescription>
              {lessons.modules.length} modules covering fingerspelling, greetings, and numbers with
              receptive quizzes and expressive practice.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>{dictionary.signs.length}+ Sign Dictionary</CardTitle>
            <CardDescription>
              Search by English, category, or handshape. Every sign shows the five ASL parameters
              with 3D demonstration.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold mb-2">The Five Parameters</h2>
        <p className="text-muted-foreground mb-4">
          ASL signs are defined by five simultaneous components. SignFlow teaches all of them:
        </p>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Handshape', 'The shape of your hand (A, B, 5, etc.)'],
            ['Orientation', 'Which way your palm faces'],
            ['Location', 'Where the sign is made on or near the body'],
            ['Movement', 'How the hands move through space'],
            ['Non-manual Markers', 'Facial expressions and head movements'],
          ].map(([term, def]) => (
            <div key={term}>
              <dt className="font-medium text-primary">{term}</dt>
              <dd className="text-sm text-muted-foreground mt-1">{def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
