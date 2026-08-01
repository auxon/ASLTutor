import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { SignPlayer } from '@/components/sign-player';
import { PracticeCamera } from '@/components/practice/PracticeCamera';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSignById, getAnimationBySignId } from '@/data/content';
import { recordPracticeSession, initializeSignMastery } from '@/engine/mastery';
import type { LessonModule, LessonStep, QuizQuestion } from '@asl/sign-schema';
import { cn } from '@/lib/utils';

interface LessonRunnerProps {
  module: LessonModule;
  onComplete?: () => void;
}

export function LessonRunner({ module, onComplete }: LessonRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const step = module.steps[stepIndex];
  const isLast = stepIndex === module.steps.length - 1;

  const goNext = async () => {
    if (step.type === 'review' && step.signIds) {
      await initializeSignMastery(step.signIds);
    }
    if (isLast) {
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
      setQuizSubmitted(false);
      setQuizAnswers({});
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      setQuizSubmitted(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{module.title}</h1>
          <p className="text-muted-foreground text-sm">
            Step {stepIndex + 1} of {module.steps.length}: {step.title}
          </p>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {module.steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-8 rounded-full',
                i <= stepIndex ? 'bg-primary' : 'bg-secondary',
              )}
            />
          ))}
        </div>
      </div>

      <StepContent
        step={step}
        quizAnswers={quizAnswers}
        quizSubmitted={quizSubmitted}
        onQuizAnswer={(qId, signId) =>
          setQuizAnswers((prev) => ({ ...prev, [qId]: signId }))
        }
        onQuizSubmit={() => setQuizSubmitted(true)}
      />

      <div className="flex justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={stepIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          onClick={goNext}
          disabled={
            step.type === 'quiz' &&
            !quizSubmitted &&
            !allQuizAnswered(step, quizAnswers)
          }
        >
          {isLast ? 'Complete Lesson' : 'Next'}
          {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

function allQuizAnswered(step: LessonStep, answers: Record<string, string>): boolean {
  if (!step.questions) return true;
  return step.questions.every((q) => answers[q.id]);
}

function StepContent({
  step,
  quizAnswers,
  quizSubmitted,
  onQuizAnswer,
  onQuizSubmit,
}: {
  step: LessonStep;
  quizAnswers: Record<string, string>;
  quizSubmitted: boolean;
  onQuizAnswer: (qId: string, signId: string) => void;
  onQuizSubmit: () => void;
}) {
  switch (step.type) {
    case 'intro':
      return (
        <Card>
          <CardHeader>
            <CardTitle>{step.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{step.content}</p>
            {step.cultureTip && (
              <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
                <p className="text-sm font-medium text-accent-foreground mb-1">Deaf Culture Tip</p>
                <p className="text-sm">{step.cultureTip}</p>
              </div>
            )}
          </CardContent>
        </Card>
      );

    case 'watch':
    case 'breakdown':
      return (
        <div className="space-y-4">
          {step.content && <p className="text-muted-foreground">{step.content}</p>}
          {step.cultureTip && (
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 text-sm">
              {step.cultureTip}
            </div>
          )}
          <SignGallery signIds={step.signIds ?? []} />
        </div>
      );

    case 'quiz':
      return (
        <div className="space-y-6">
          {step.questions?.map((q) => (
            <QuizQuestionView
              key={q.id}
              question={q}
              selected={quizAnswers[q.id]}
              submitted={quizSubmitted}
              onSelect={(signId) => onQuizAnswer(q.id, signId)}
            />
          ))}
          {!quizSubmitted && (
            <Button
              onClick={onQuizSubmit}
              disabled={!allQuizAnswered(step, quizAnswers)}
            >
              Check Answers
            </Button>
          )}
        </div>
      );

    case 'practice':
      return (
        <div className="space-y-6">
          <p className="text-muted-foreground">{step.content}</p>
          {(step.signIds ?? []).slice(0, 3).map((signId) => {
            const sign = getSignById(signId);
            if (!sign) return null;
            const handshape = sign.handshapes.right ?? sign.handshapes.left ?? 'A';
            return (
              <div key={signId} className="grid lg:grid-cols-2 gap-4">
                <SignPlayer sign={sign} animation={getAnimationBySignId(signId) ?? null} />
                <PracticeCamera
                  targetHandshape={handshape}
                  onScore={async (s) => {
                    if (s.overall >= 0.5) {
                      await recordPracticeSession(signId, s.overall, 'expressive');
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      );

    case 'review':
      return (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.content}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {step.signIds?.length ?? 0} signs added to your review queue.
              </p>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

function SignGallery({ signIds }: { signIds: string[] }) {
  const [activeId, setActiveId] = useState(signIds[0] ?? '');
  const sign = getSignById(activeId);
  const animation = getAnimationBySignId(activeId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {signIds.map((id) => {
          const s = getSignById(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeId === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {s?.gloss ?? id}
            </button>
          );
        })}
      </div>
      {sign && <SignPlayer sign={sign} animation={animation ?? null} />}
    </div>
  );
}

function QuizQuestionView({
  question,
  selected,
  submitted,
  onSelect,
}: {
  question: QuizQuestion;
  selected?: string;
  submitted: boolean;
  onSelect: (signId: string) => void;
}) {
  const correct = selected === question.correctSignId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{question.prompt}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.options?.map((opt) => {
          const isSelected = selected === opt.signId;
          const isCorrect = opt.signId === question.correctSignId;
          let variant = 'bg-secondary hover:bg-secondary/80';
          if (submitted) {
            if (isCorrect) variant = 'bg-success/20 border border-success';
            else if (isSelected && !isCorrect) variant = 'bg-destructive/20 border border-destructive';
          } else if (isSelected) {
            variant = 'bg-primary text-primary-foreground';
          }

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !submitted && opt.signId && onSelect(opt.signId)}
              disabled={submitted}
              className={cn('w-full text-left px-4 py-3 rounded-lg transition-colors', variant)}
            >
              {opt.label}
            </button>
          );
        })}
        {submitted && (
          <p className={cn('text-sm font-medium', correct ? 'text-success' : 'text-destructive')}>
            {correct ? 'Correct!' : `Incorrect. The answer is ${getSignById(question.correctSignId)?.gloss}.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
