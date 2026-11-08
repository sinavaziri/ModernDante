/** Where the text, pictures and voices come from. Shown at the foot of every page. */
export default function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-sm text-muted-foreground">
        <p className="font-serif text-base text-foreground">
          <i>The Divine Comedy</i> by Dante Alighieri
        </p>
        <dl className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <dt className="font-semibold text-foreground">Text</dt>
            <dd className="mt-1">
              Rewritten in modern English from Henry Wadsworth Longfellow&apos;s 1867 translation.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Illustrations</dt>
            <dd className="mt-1">Gustave Doré&apos;s engravings, 1857–1868, colorized.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Narration</dt>
            <dd className="mt-1">Dramatic narration, with a unique voice for every character.</dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
