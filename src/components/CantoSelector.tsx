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
    <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="cantica-select" className="text-sm font-medium">
              Cantica:
            </label>
            <select
              id="cantica-select"
              value={currentCantica}
              onChange={handleCanticaChange}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {canticas.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="canto-select" className="text-sm font-medium">
              Canto:
            </label>
            <select
              id="canto-select"
              value={currentCanto}
              onChange={handleCantoChange}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cantos.map((canto) => (
                <option key={canto.number} value={canto.number}>
                  {canto.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
