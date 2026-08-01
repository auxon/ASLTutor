const PARAMETERS = [
  ['Handshape', 'The shape of your hand (A, B, 5, etc.)'],
  ['Orientation', 'Which way your palm faces'],
  ['Location', 'Where the sign is made on or near the body'],
  ['Movement', 'How the hands move through space'],
  ['Non-manual Markers', 'Facial expressions and head movements'],
];

export function ParametersSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Linguistic foundation
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              The Five Parameters of ASL
            </h2>
            <p className="text-muted-foreground text-lg">
              ASL signs are defined by five simultaneous components. SignFlow teaches all of them —
              not just the hand motion you see in a flat video.
            </p>
          </div>

          <dl className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {PARAMETERS.map(([term, def]) => (
              <div
                key={term}
                className="rounded-xl bg-background/60 border border-border/60 p-4 hover:border-primary/30 transition-colors"
              >
                <dt className="font-semibold text-primary">{term}</dt>
                <dd className="text-sm text-muted-foreground mt-2 leading-relaxed">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
