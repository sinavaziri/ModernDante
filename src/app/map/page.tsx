import type { Metadata } from 'next';
import Link from 'next/link';
import InfernoMap from '@/components/InfernoMap';
import Navigation from '@/components/Navigation';
import { toRoman } from '@/lib/canticas';
import { getInfernoLevels } from '@/lib/inferno-map';

export const metadata: Metadata = {
  title: 'Map of Hell | The Divine Comedy',
  description: "The nine circles of Dante's Inferno from the dark wood down to Lucifer, with the cantos that cross each one.",
};

const cantoLinkClass =
  'rounded-sm px-1.5 py-0.5 tabular-nums text-primary underline decoration-primary/30 underline-offset-2 hover:bg-muted hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function CantoLinks({ cantos }: { cantos: number[] }) {
  return (
    <>
      {cantos.map(canto => (
        <Link key={canto} href={`/inferno/${canto}`} aria-label={`Inferno, Canto ${canto}`} className={cantoLinkClass}>
          {toRoman(canto)}
        </Link>
      ))}
    </>
  );
}

export default function MapPage() {
  const levels = getInfernoLevels();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 md:px-8">
        <header className="mb-12 text-center">
          <span className="mb-3 inline-block text-lg italic text-primary">Inferno</span>
          <h1 className="mb-5 text-3xl font-light tracking-tight text-foreground md:text-4xl lg:text-5xl">Map of Hell</h1>
          <p className="mx-auto max-w-xl font-serif text-lg leading-relaxed text-muted-foreground">
            Dante&rsquo;s Hell is a funnel under Jerusalem, narrowing ledge by ledge to the center of the earth. The
            deeper the circle, the worse the sin.
          </p>
        </header>

        <InfernoMap levels={levels} painting="/images-map/inferno-engraving.webp" />

        <ol className="mt-16 space-y-10">
          {levels.map(level => (
            <li key={level.id} id={level.id} className="group grid scroll-mt-28 grid-cols-[2.75rem_1fr] gap-x-4 sm:gap-x-6">
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center font-serif text-2xl text-[hsl(35_25%_92%)] group-target:shadow-[0_0_0_3px_var(--color-background),0_0_0_5px_var(--color-primary)]"
                style={{ backgroundColor: level.color }}
              >
                {level.circle}
              </div>

              <div>
                {level.circle && <p className="font-sans text-sm text-muted-foreground">Circle {level.circle}</p>}
                <h2 className="font-serif text-xl leading-snug text-foreground sm:text-2xl">{level.name}</h2>
                <p className="mt-0.5 font-sans text-sm text-foreground/80">{level.what}</p>
                <p className="mt-2 font-serif text-base leading-relaxed text-muted-foreground">{level.scene}</p>

                {level.parts && (
                  <ol className="mt-3 space-y-1 font-sans text-sm text-foreground/80" aria-label={level.partsLabel}>
                    {level.parts.map(part => (
                      <li key={part.name} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-foreground">{part.name}:</span>
                        <span>{part.who}</span>
                        <span className="-ml-0.5">
                          <CantoLinks cantos={part.cantos} />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                {!level.parts && (
                  <p className="mt-2 font-sans text-sm text-muted-foreground">
                    {level.cantos.length > 1 ? 'Cantos' : 'Canto'} <CantoLinks cantos={level.cantos} />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
