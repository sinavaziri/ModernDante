'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getAllCanticas, type Cantica } from '@/lib/canticas';
import { useEffect, useRef, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

interface NavigationProps {
  cantica?: Cantica;
}

export default function Navigation({ cantica }: NavigationProps) {
  const pathname = usePathname();
  const canticas = getAllCanticas();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menu = useRef<HTMLElement>(null);

  // Close the menu on Escape or a click anywhere else
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileMenuOpen(false);
    const onClick = (event: MouseEvent) => !menu.current?.contains(event.target as Node) && setMobileMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [mobileMenuOpen]);

  return (
    // On a canto page the menu scrolls away with the page, to leave the whole window for reading
    <nav
      ref={menu}
      data-site-menu
      className={`${cantica ? 'relative' : 'sticky top-0'} z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm`}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Home */}
          <Link
            href="/"
            className="flex items-center space-x-3 group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-sm overflow-hidden bg-brand group-hover:bg-brand/90 transition-all duration-300">
              <Image
                src="/images/dante-logo.webp"
                alt="Dante Alighieri"
                width={40}
                height={40}
                className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-90 transition-all duration-300"
              />
            </div>
            {/* Plain text, not a heading: each page has its own main heading */}
            <div>
              <span className="block font-serif text-lg sm:text-xl font-bold leading-tight tracking-[-0.01em] text-foreground">
                The Divine Comedy
              </span>
              <span className="hidden sm:block text-sm text-muted-foreground">Dante Alighieri</span>
            </div>
          </Link>

          <div className="flex items-center gap-1 lg:gap-2">
          <ThemeToggle />

          {/* The menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="flex items-center gap-2 rounded-sm p-2 text-foreground transition-colors hover:bg-muted sm:px-3"
          >
            <span className="hidden font-medium sm:inline">Menu</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          </div>
        </div>

        {/* The menu: a list that drops down over the page */}
        {mobileMenuOpen && (
          <div className="absolute inset-x-0 top-full animate-fade-in border-b border-border bg-background p-3 shadow-lg sm:inset-x-auto sm:right-6 sm:w-64 sm:rounded-b-sm sm:border-x lg:right-8">
            {/* Cantica Links */}
            <div className="space-y-1">
{/* The home page's own gate leads to Start here, so the menu doesn't repeat it there */}
              {pathname !== '/' && (
                <Link
                  href="/start"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-sm font-medium transition-all ${
                    pathname === '/start'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  Start here
                </Link>
              )}
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
              {/* Illustrations Link */}
              <Link
                href="/gallery"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-sm font-medium transition-all ${
                  pathname === '/gallery'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                Illustrations
              </Link>
              <Link
                href="/map"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-sm font-medium transition-all ${
                  pathname.startsWith('/map')
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                Map
              </Link>
            </div>

          </div>
        )}
      </div>
    </nav>
  );
}
