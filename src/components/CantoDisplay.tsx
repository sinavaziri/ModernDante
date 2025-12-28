'use client';

import type { Canto } from '@/lib/cantos';

interface CantoDisplayProps {
  canto: Canto;
  canticaName: string;
}

export default function CantoDisplay({ canto, canticaName }: CantoDisplayProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">
          {canticaName} - {canto.title}
        </h1>
        {canto.subtitle && (
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-3xl mx-auto">
            {canto.subtitle.substring(0, 200)}...
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Original Translation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Original Translation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Henry Wadsworth Longfellow
          </p>
          <div className="poetry text-gray-800 dark:text-gray-200 leading-relaxed">
            {canto.original}
          </div>
        </div>

        {/* Modern Rewrite */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Modern English
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            AI-Generated Contemporary Rewrite
          </p>
          {canto.modern ? (
            <div className="poetry text-gray-800 dark:text-gray-200 leading-relaxed">
              {canto.modern}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">
              Modern version not yet generated. Run the generation script to create it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
