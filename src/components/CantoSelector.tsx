'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllCanticas, getCanticaInfo, getNextCanto, getPreviousCanto, toRoman, type Cantica } from '@/lib/canticas';
import type { CantoListItem } from '@/lib/cantos';

interface CantoSelectorProps {
  currentCantica: Cantica;
  currentCanto: number;
  cantos: CantoListItem[];
}

/** "Canto II", or "Purgatorio I" when the link crosses into another cantica */
function cantoLabel(from: Cantica, to: { cantica: Cantica; number: number }): string {
  const name = to.cantica === from ? 'Canto' : getCanticaInfo(to.cantica)?.displayName;
  return `${name} ${toRoman(to.number)}`;
}

const STEP_LINK =
  'inline-flex h-10 items-center gap-1 rounded-sm border border-border bg-background px-2 sm:px-3 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors';

export default function CantoSelector({ currentCantica, currentCanto, cantos }: CantoSelectorProps) {
  const router = useRouter();
  const canticas = getAllCanticas();
  const previous = getPreviousCanto(currentCantica, currentCanto);
  const next = getNextCanto(currentCantica, currentCanto);

  const handleCanticaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCantica = e.target.value as Cantica;
    router.push(`/${newCantica}/1`);
  };

  const handleCantoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCanto = parseInt(e.target.value);
    router.push(`/${currentCantica}/${newCanto}`);
  };

  return (
    <div className="bg-muted/30 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2 sm:gap-4">

          {/* Controls Group */}
          <div className="flex flex-1 min-w-0 gap-2 sm:gap-4">
            {/* Cantica Selector */}
            <div className="flex-1 min-w-0 sm:flex-initial sm:min-w-[140px]">
              <label htmlFor="cantica-select" className="sr-only">
                Select Cantica
              </label>
              <div className="relative">
                <select
                  id="cantica-select"
                  value={currentCantica}
                  onChange={handleCanticaChange}
                  className="w-full h-10 appearance-none px-3 py-2 pr-8 bg-background border border-border rounded-sm text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
                >
                  {canticas.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Canto Selector */}
            <div className="flex-1 min-w-0 sm:flex-initial sm:min-w-[140px]">
              <label htmlFor="canto-select" className="sr-only">
                Select Canto
              </label>
              <div className="relative">
                <select
                  id="canto-select"
                  value={currentCanto}
                  onChange={handleCantoChange}
                  className="w-full h-10 appearance-none px-3 py-2 pr-8 bg-background border border-border rounded-sm text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
                >
                  {cantos.map((canto) => (
                    <option key={canto.number} value={canto.number}>
                      {canto.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Previous and next canto. Phones show only the chevrons. */}
          <nav aria-label="Previous and next canto" className="flex shrink-0 items-center gap-2">
            {previous && (
              <Link
                href={`/${previous.cantica}/${previous.number}`}
                aria-label={`Previous: ${cantoLabel(currentCantica, previous)}`}
                className={STEP_LINK}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">{cantoLabel(currentCantica, previous)}</span>
              </Link>
            )}
            {next && (
              <Link
                href={`/${next.cantica}/${next.number}`}
                aria-label={`Next: ${cantoLabel(currentCantica, next)}`}
                className={STEP_LINK}
              >
                <span className="hidden sm:inline">{cantoLabel(currentCantica, next)}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
