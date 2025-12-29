'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getAllCanticas, getNextCanto, getPreviousCanto, type Cantica } from '@/lib/cantos';
import { useState } from 'react';

interface NavigationProps {
  cantica?: Cantica;
  cantoNumber?: number;
}

export default function Navigation({ cantica, cantoNumber }: NavigationProps) {
  const pathname = usePathname();
  const canticas = getAllCanticas();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prevCanto = cantica && cantoNumber ? getPreviousCanto(cantica, cantoNumber) : null;
  const nextCanto = cantica && cantoNumber ? getNextCanto(cantica, cantoNumber) : null;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Home */}
          <Link
            href="/"
            className="flex items-center space-x-3 group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-sm overflow-hidden bg-primary group-hover:bg-primary/90 transition-all duration-300">
              <Image
                src="/images/Dante Portrait.png"
                alt="Dante Alighieri"
                width={40}
                height={40}
                className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-90 transition-all duration-300"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">
                The Divine Comedy
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Dante Alighieri</p>
            </div>
          </Link>

          {/* Desktop Cantica Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {canticas.map((c) => (
              <Link
                key={c.name}
                href={`/${c.name}/1`}
                className={`px-5 py-2.5 rounded-sm font-medium transition-all duration-200 ${
                  cantica === c.name
                    ? 'text-foreground font-bold border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {c.displayName}
              </Link>
            ))}
          </div>

          {/* Prev/Next Navigation - Desktop */}
          {cantica && cantoNumber && (
            <div className="hidden md:flex items-center space-x-3">
              {prevCanto ? (
                <Link
                  href={`/${prevCanto.cantica}/${prevCanto.number}`}
                  className="group flex items-center space-x-2 px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Prev</span>
                </Link>
              ) : (
                <div className="px-4 py-2 text-sm border border-transparent text-muted-foreground/30 cursor-not-allowed">
                   <span>Prev</span>
                </div>
              )}

              {nextCanto ? (
                <Link
                  href={`/${nextCanto.cantica}/${nextCanto.number}`}
                  className="group flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <div className="px-4 py-2 text-sm border border-transparent text-muted-foreground/30 cursor-not-allowed">
                  <span>Next</span>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-sm hover:bg-muted text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-fade-in border-t border-border mt-2 pt-4">
            {/* Cantica Links */}
            <div className="space-y-1">
              {canticas.map((c) => (
                <Link
                  key={c.name}
                  href={`/${c.name}/1`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-sm font-medium transition-all ${
                    cantica === c.name
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {c.displayName}
                </Link>
              ))}
            </div>

            {/* Mobile Prev/Next */}
            {cantica && cantoNumber && (
              <div className="pt-4 flex items-center space-x-2 border-t border-border mt-2">
                {prevCanto ? (
                  <Link
                    href={`/${prevCanto.cantica}/${prevCanto.number}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-3 bg-muted rounded-sm text-center font-medium text-foreground text-sm"
                  >
                    ← Previous
                  </Link>
                ) : null}

                {nextCanto ? (
                  <Link
                    href={`/${nextCanto.cantica}/${nextCanto.number}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-sm text-center font-medium text-sm"
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
