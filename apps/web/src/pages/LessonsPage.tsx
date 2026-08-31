import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, ChevronRight, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { LessonRunner } from '@/components/lessons/LessonRunner';
import { lessons } from '@/data/content';
import { canUseLessons } from '@/engine/entitlement';
import { useBilling } from '@/hooks/useBilling';
import { Button } from '@/components/ui/Button';

export function LessonsPage() {
  const navigate = useNavigate();
  const { moduleId } = useParams<{ moduleId: string }>();
  const { entitlement, openPaywall } = useBilling();
  const unlocked = canUseLessons(entitlement);
  const activeModule = moduleId
    ? lessons.modules.find((m) => m.id === moduleId)
    : undefined;

  if (activeModule && !unlocked) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">{activeModule.title}</h1>
        <p className="text-muted-foreground">
          Structured lessons are included in Pro. You can still practice HELLO, NAME, and A–E
          for free.
        </p>
        <Button type="button" onClick={() => openPaywall('lesson')}>
          Start 7-day trial
        </Button>
        <Link to="/practice" className="block text-sm text-primary hover:underline">
          Practice the free set
        </Link>
      </div>
    );
  }

  if (activeModule) {
    return (
      <LessonRunner
        module={activeModule}
        onComplete={() => {
          navigate('/lessons');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lessons</h1>
        <p className="text-muted-foreground mt-1">
          Structured paths from fingerspelling to conversations
        </p>
      </div>

      <div className="grid gap-4">
        {lessons.modules
          .sort((a, b) => a.order - b.order)
          .map((mod) => (
            <Card key={mod.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{mod.title}</CardTitle>
                    <CardDescription className="mt-1">{mod.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                    <Clock className="h-4 w-4" />
                    {mod.estimatedMinutes} min
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                  {mod.objectives.map((obj) => (
                    <li key={obj}>• {obj}</li>
                  ))}
                </ul>
                {unlocked ? (
                  <Link
                    to={`/lessons/${mod.id}`}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Start Lesson <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <Button type="button" onClick={() => openPaywall('lesson')}>
                    <Lock className="h-4 w-4 mr-2" />
                    Start 7-day trial
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
