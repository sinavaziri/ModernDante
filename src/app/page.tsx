import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { getAllCanticas } from '@/lib/cantos';

export default function HomePage() {
  const canticas = getAllCanticas();

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden pt-20 pb-16 md:pt-24 md:pb-20 lg:pt-28 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-8 items-center min-h-[70vh]">
              {/* Left side - Text content */}
              <div className="space-y-6 animate-fade-in order-2 lg:order-1">
                <h1 className="text-left text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-[1.1] tracking-tight">
                  The Divine<br/>Comedy
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground font-serif italic">
                  by Dante Alighieri
                </p>

                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                  Experience Dante's masterpiece in modern and approachable English with an elegant reading interface,
                  featuring classic illustrations by Gustave Doré.
                </p>

                <div className="pt-2">
                  <Link
                    href="/inferno/1"
                    className="group px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-sm shadow-sm transition-all duration-300 inline-flex items-center space-x-2"
                  >
                    <span>Begin Your Journey</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Right side - Image */}
              <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
                <div className="relative w-full">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-sm blur-2xl" />
                  <img 
                    src="/images/inferno/38.png" 
                    alt="Gustave Doré illustration from Dante's Inferno"
                    className="relative w-full h-auto object-contain shadow-2xl rounded-sm border border-border/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="border-y border-border bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="space-y-2 py-4 md:py-0">
                <div className="text-4xl md:text-5xl font-bold text-foreground">
                  100
                </div>
                <div className="text-muted-foreground text-sm uppercase tracking-wider">Total Cantos</div>
              </div>
              <div className="space-y-2 py-4 md:py-0">
                <div className="text-4xl md:text-5xl font-bold text-foreground">
                  135
                </div>
                <div className="text-muted-foreground text-sm uppercase tracking-wider">Doré Illustrations</div>
              </div>
              <div className="space-y-2 py-4 md:py-0">
                <div className="text-4xl md:text-5xl font-bold text-foreground">
                  14k+
                </div>
                <div className="text-muted-foreground text-sm uppercase tracking-wider">Lines of Poetry</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cantica Cards */}
        <div id="canticas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {canticas.map((cantica, index) => (
              <Link
                key={cantica.name}
                href={`/${cantica.name}/1`}
                className="group relative overflow-hidden bg-card hover:bg-muted/30 transition-all duration-500 border border-border hover:border-primary/30"
              >
                {/* Background images for canticas */}
                {cantica.name === 'inferno' && (
                  <div 
                    className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                    style={{
                      backgroundImage: 'url(/images/inferno/30.png)',
                      backgroundSize: '130%',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                {cantica.name === 'purgatorio' && (
                  <div 
                    className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                    style={{
                      backgroundImage: 'url(/images/purgatorio/91.png)',
                      backgroundSize: '130%',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                {cantica.name === 'paradiso' && (
                  <div 
                    className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                    style={{
                      backgroundImage: 'url(/images/paradiso/128.png)',
                      backgroundSize: '130%',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                <div className="relative p-8 md:p-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-6xl font-serif text-muted-foreground/20 font-bold group-hover:text-primary/20 transition-colors">
                      {index + 1}
                    </span>
                    <div className="text-xs font-semibold text-primary uppercase tracking-widest border border-primary/20 px-3 py-1 rounded-full">
                      {cantica.totalCantos} Cantos
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                      {cantica.displayName}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {cantica.name === 'inferno' && 'Descend through the nine circles of Hell.'}
                      {cantica.name === 'purgatorio' && 'Ascend the mountain of purification.'}
                      {cantica.name === 'paradiso' && 'Rise through the celestial spheres.'}
                    </p>
                  </div>

                  <div className="pt-4 flex items-center text-primary font-medium group-hover:translate-x-2 transition-transform">
                    <span className="text-sm uppercase tracking-wide">Read Now</span>
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
