'use client';

import { useRouter } from 'next/navigation';
import { getAllCanticas, getAllCantos, type Cantica } from '@/lib/cantos';

interface CantoSelectorProps {
  currentCantica: Cantica;
  currentCanto: number;
}

export default function CantoSelector({ currentCantica, currentCanto }: CantoSelectorProps) {
  const router = useRouter();
  const canticas = getAllCanticas();
  const cantos = getAllCantos(currentCantica);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

          {/* Controls Group */}
          <div className="flex flex-1 gap-4 w-full sm:w-auto">
            {/* Cantica Selector */}
            <div className="flex-1 sm:flex-initial min-w-[140px]">
              <label htmlFor="cantica-select" className="sr-only">
                Select Cantica
              </label>
              <div className="relative">
                <select
                  id="cantica-select"
                  value={currentCantica}
                  onChange={handleCanticaChange}
                  className="w-full appearance-none px-3 py-2 pr-8 bg-background border border-border rounded-sm text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
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
            <div className="flex-1 sm:flex-initial min-w-[140px]">
              <label htmlFor="canto-select" className="sr-only">
                Select Canto
              </label>
              <div className="relative">
                <select
                  id="canto-select"
                  value={currentCanto}
                  onChange={handleCantoChange}
                  className="w-full appearance-none px-3 py-2 pr-8 bg-background border border-border rounded-sm text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
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

          {/* Current Selection Info */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-background border border-border rounded-sm">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Canto {currentCanto} / {cantos.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
