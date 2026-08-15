const roadmap = [
  { phase: "0", label: "Skeleton & deploy pipeline", done: true },
  { phase: "1", label: "Supabase schema & seed", done: false },
  { phase: "2", label: "The map", done: false },
  { phase: "3", label: "Login & rating", done: false },
  { phase: "4", label: "Rankings", done: false },
  { phase: "5", label: "Suggestion box", done: false },
  { phase: "6", label: "East Bay", done: false },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <header className="flex flex-col gap-4">
        <span className="text-5xl" aria-hidden>
          🥔
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Tater Tot Tour
        </h1>
        <p className="text-lg text-muted">
          A rated map of the best tater tots in the Bay Area. Starting in San
          Francisco, heading east.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Under construction
        </h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {roadmap.map(({ phase, label, done }) => (
            <li key={phase} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                  done
                    ? "bg-accent text-background"
                    : "border border-border text-muted"
                }`}
              >
                {done ? "✓" : phase}
              </span>
              <span className={done ? "" : "text-muted"}>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        If the page you are reading was served from GitHub Pages, the pipeline
        works.
      </p>
    </main>
  );
}
