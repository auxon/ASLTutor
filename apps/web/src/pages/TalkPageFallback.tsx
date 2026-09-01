import { Button } from '@/components/ui/Button';
import { fallbackTalkPins } from '@/api/talk/defaults';

export function TalkPageFallback({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const pins = fallbackTalkPins();

  return (
    <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
      <header className="relative flex items-center justify-center min-h-10">
        <h1 className="text-xl font-semibold">Talk</h1>
      </header>

      <section
        className="relative overflow-hidden rounded-xl border border-border bg-card min-h-[220px] sm:min-h-[280px] flex items-center justify-center px-6 text-center"
        aria-label="Signing stage"
      >
        <p className="absolute top-3 left-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Signing stage
        </p>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {message ?? 'Loading Talk…'}
          </p>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Phrase pins">
        {pins.map((pin) => (
          <span
            key={pin.id}
            className="shrink-0 h-9 px-4 rounded-full border border-border text-sm whitespace-nowrap text-muted-foreground"
          >
            {pin.custom_text}
          </span>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground pb-1">
        Communication aid — not a certified interpreter
      </p>
    </div>
  );
}
