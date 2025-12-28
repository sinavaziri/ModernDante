import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { getAllCanticas } from '@/lib/cantos';

export default function HomePage() {
  const canticas = getAllCanticas();

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              The Divine Comedy
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
              by Dante Alighieri
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
              Experience the masterpiece with side-by-side original translation by Henry Wadsworth Longfellow
              and modern English rewrites powered by AI
            </p>
          </div>

          {/* Cantica Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {canticas.map((cantica) => (
              <Link
                key={cantica.name}
                href={`/${cantica.name}/1`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-yellow-400"
              >
                <h2 className="text-3xl font-bold mb-4 text-center">
                  {cantica.displayName}
                </h2>
                <p className="text-center text-gray-600 dark:text-gray-400">
                  {cantica.totalCantos} Cantos
                </p>
                <div className="mt-6 text-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    Start Reading →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* About Section */}
          <div className="mt-16 bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">About This Project</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This project presents Dante's Divine Comedy with modern, accessible translations
              alongside Longfellow's classic translation. The modern versions are generated
              using Claude AI to preserve the original meaning while making the text more
              approachable for contemporary readers. Rhyme is incorporated where it flows
              naturally, prioritizing clarity and readability.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
