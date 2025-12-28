'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAllCanticas, getNextCanto, getPreviousCanto, type Cantica } from '@/lib/cantos';

interface NavigationProps {
  cantica?: Cantica;
  cantoNumber?: number;
}

export default function Navigation({ cantica, cantoNumber }: NavigationProps) {
  const pathname = usePathname();
  const canticas = getAllCanticas();

  const prevCanto = cantica && cantoNumber ? getPreviousCanto(cantica, cantoNumber) : null;
  const nextCanto = cantica && cantoNumber ? getNextCanto(cantica, cantoNumber) : null;

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Home */}
          <Link
            href="/"
            className="text-xl font-bold hover:text-gray-300 transition-colors"
          >
            The Divine Comedy
          </Link>

          {/* Cantica Links */}
          <div className="hidden md:flex space-x-8">
            {canticas.map((c) => (
              <Link
                key={c.name}
                href={`/${c.name}/1`}
                className={`hover:text-gray-300 transition-colors ${
                  cantica === c.name ? 'text-yellow-400 font-semibold' : ''
                }`}
              >
                {c.displayName}
              </Link>
            ))}
          </div>

          {/* Prev/Next Navigation */}
          {cantica && cantoNumber && (
            <div className="flex items-center space-x-4">
              {prevCanto ? (
                <Link
                  href={`/${prevCanto.cantica}/${prevCanto.number}`}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  ← Previous
                </Link>
              ) : (
                <div className="px-4 py-2 text-gray-500">← Previous</div>
              )}

              {nextCanto ? (
                <Link
                  href={`/${nextCanto.cantica}/${nextCanto.number}`}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Next →
                </Link>
              ) : (
                <div className="px-4 py-2 text-gray-500">Next →</div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
