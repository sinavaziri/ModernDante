import Link from 'next/link';
import Navigation from '@/components/Navigation';
import HeroCarousel from '@/components/HeroCarousel';
import { getAllCanticas } from '@/lib/canticas';
import { getCanticaPlate, getCarouselSlides } from '@/lib/image-mappings';

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
                  Dante&apos;s poem in plain modern English, read aloud with a different voice for each character,
                  alongside Gustave Doré&apos;s engravings in color.
                </p>

                <div className="pt-2">
                  <Link
                    href="/inferno/1"
                    className="inline-block px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground text-base font-semibold rounded-sm shadow-sm transition-colors"
                  >
                    Start with Inferno I
                  </Link>
                </div>
              </div>

              {/* Right side - Illustrations */}
              <div className="relative order-1 lg:order-2 flex justify-center">
                <HeroCarousel slides={getCarouselSlides()} />
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

        {/* Canticas: each plate at full strength, with its text on the page below */}
        <div id="canticas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {canticas.map((cantica) => {
              const plate = getCanticaPlate(cantica.name);
              return (
                <Link key={cantica.name} href={`/${cantica.name}/1`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden rounded-sm border border-border/40 bg-muted shadow-sm">
                    <img
                      src={plate.src}
                      srcSet={plate.srcSet}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h2 className="mt-5 text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {cantica.displayName}
                  </h2>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {cantica.name === 'inferno' && 'Descend through the nine circles of Hell.'}
                    {cantica.name === 'purgatorio' && 'Ascend the mountain of purification.'}
                    {cantica.name === 'paradiso' && 'Rise through the celestial spheres.'}
                  </p>
                  <div className="mt-3 flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{cantica.totalCantos} cantos</span>
                    <span className="text-primary group-hover:underline underline-offset-4">Read {cantica.displayName}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
