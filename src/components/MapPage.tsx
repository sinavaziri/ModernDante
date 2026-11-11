import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import Navigation from '@/components/Navigation';
import { toRoman } from '@/lib/canticas';
import { LEVEL_WORD, type MapLevel } from '@/lib/realm-maps';

// One realm's map page: the heading, the links to the other two maps, the map itself, and its levels
// with the cantos that cross each one. On a wide screen each level's text sits beside that level on
// the map; on a narrower one the levels are a list under the map.

type Realm = keyof typeof LEVEL_WORD;

const REALMS: { realm: Realm; name: string; href: string }[] = [
  { realm: 'inferno', name: 'Inferno', href: '/map' },
  { realm: 'purgatorio', name: 'Purgatorio', href: '/map/purgatorio' },
  { realm: 'paradiso', name: 'Paradiso', href: '/map/paradiso' },
];

const cantoLinkClass =
  'rounded-sm px-1.5 py-0.5 tabular-nums text-primary underline decoration-primary/30 underline-offset-2 hover:bg-muted hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function CantoLinks({ realm, name, cantos }: { realm: Realm; name: string; cantos: number[] }) {
  return (
    <>
      {cantos.map(canto => (
        <Link key={canto} href={`/${realm}/${canto}`} aria-label={`${name}, Canto ${canto}`} className={cantoLinkClass}>
          {toRoman(canto)}
        </Link>
      ))}
    </>
  );
}

interface MapPageProps {
  realm: Realm;
  title: string;
  intro: ReactNode;
  levels: MapLevel[];
  /** How far down the painting each level starts and ends, from 0 to 1 */
  spans: Record<string, { top: number; bottom: number }>;
  /** How much wider the whole map, with its column of names, is than its painting */
  widthRatio: number;
  /** The map */
  children: ReactNode;
}

export default function MapPage({ realm, title, intro, levels, spans, widthRatio, children }: MapPageProps) {
  const name = REALMS.find(r => r.realm === realm)?.name ?? '';
  const word = LEVEL_WORD[realm];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 md:px-8 xl:max-w-7xl">
        <header className="mb-10 text-center">
          <h1 className="mb-5 text-3xl font-light tracking-tight text-foreground md:text-4xl lg:text-5xl">{title}</h1>
          <p className="mx-auto max-w-xl font-serif text-lg leading-relaxed text-muted-foreground">{intro}</p>

          <nav aria-label="Maps" className="mt-8 flex justify-center gap-1 font-sans text-sm">
            {REALMS.map(r => (
              <Link
                key={r.realm}
                href={r.href}
                aria-current={r.realm === realm ? 'page' : undefined}
                className={`rounded-sm px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  r.realm === realm
                    ? 'border-b-2 border-primary font-bold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {r.name}
              </Link>
            ))}
          </nav>
        </header>

        <div className="xl:relative">
          {/* On a wide screen only the painting shows: the map's own column of names is cut off */}
          <div
            className="xl:w-[58%] xl:overflow-hidden xl:rounded-lg xl:[&_svg]:w-(--map-width) xl:[&_svg]:max-w-none"
            style={{ '--map-width': `${widthRatio * 100}%` } as CSSProperties}
          >
            {children}
          </div>

          <ol className="mt-16 space-y-10 xl:mt-0 xl:space-y-0">
            {levels.map(level => {
              const span = spans[level.id];
              const cantos = (
                <>
                  {level.cantos.length > 1 ? 'Cantos' : 'Canto'} <CantoLinks realm={realm} name={name} cantos={level.cantos} />
                </>
              );
              const parts = level.parts && (
                <ol className="space-y-1 font-sans text-sm text-foreground/80" aria-label={level.partsLabel}>
                  {level.parts.map(part => (
                    <li key={part.name} className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-foreground">{part.name}:</span>
                      <span>{part.who}</span>
                      <span className="-ml-0.5">
                        <CantoLinks realm={realm} name={name} cantos={part.cantos} />
                      </span>
                    </li>
                  ))}
                </ol>
              );
              return (
                <li
                  key={level.id}
                  id={level.id}
                  className="group grid scroll-mt-28 grid-cols-[2.75rem_1fr] gap-x-4 sm:gap-x-6 xl:absolute xl:right-0 xl:left-[calc(58%+2rem)] xl:-translate-y-1/2 xl:grid-cols-[2.25rem_1fr] xl:gap-x-4 xl:has-[details[open]]:z-20"
                  style={span && { top: `${((span.top + span.bottom) / 2) * 100}%` }}
                >
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center font-serif text-2xl text-[hsl(35_25%_92%)] [text-shadow:0_1px_2px_rgb(0_0_0/0.5)] group-target:shadow-[0_0_0_3px_var(--color-background),0_0_0_5px_var(--color-primary)] xl:mt-0.5 xl:h-9 xl:w-9 xl:text-xl"
                    style={{ backgroundColor: level.color }}
                  >
                    {level.circle}
                  </div>

                  <div>
                    {level.circle && (
                      <p className="font-sans text-sm text-muted-foreground xl:hidden">
                        {word} {level.circle}
                      </p>
                    )}
                    <div className="xl:flex xl:items-baseline xl:justify-between xl:gap-4">
                      <h2 className="font-serif text-xl leading-snug text-foreground sm:text-2xl xl:text-xl xl:leading-tight">{level.name}</h2>
                      {!level.parts && <p className="hidden shrink-0 font-sans text-xs text-muted-foreground xl:block">{cantos}</p>}
                    </div>
                    <p className="mt-0.5 font-sans text-sm text-foreground/80 xl:mt-0 xl:text-[13px] xl:leading-snug">{level.what}</p>
                    <p className="mt-2 font-serif text-base leading-relaxed text-muted-foreground xl:mt-0.5 xl:text-sm xl:leading-snug">
                      {level.scene}
                    </p>

                    {parts && (
                      <>
                        <div className="mt-3 xl:hidden">{parts}</div>
                        {/* Beside the map there is no room for the list, so it opens over its neighbors */}
                        <details className="relative hidden font-sans text-[13px] xl:block">
                          <summary className="cursor-pointer text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {level.partsLabel}
                          </summary>
                          <div className="absolute top-full left-0 z-20 mt-1 w-max max-w-md rounded-md border border-border bg-background p-3 shadow-xl">
                            {parts}
                          </div>
                        </details>
                      </>
                    )}

                    {!level.parts && <p className="mt-2 font-sans text-sm text-muted-foreground xl:hidden">{cantos}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </main>
    </div>
  );
}
