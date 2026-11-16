import Link from 'next/link';

const SHARED = 'w-44 transition-[filter] duration-300 group-hover:brightness-115 md:w-52';

/**
 * The home page's way in: a plain stone gateway drawn after Doré's own Gate of Hell.
 * The light theme shows it in ink on the page; the dark theme shows the same drawing in pale line on dark.
 * (RodinGateButton is the earlier version, with doors that open and a walk through them.)
 */
export default function GateButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-block rounded-sm text-center focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary"
    >
      <img
        src="/images/gate-of-hell-plain.webp"
        width={560}
        height={710}
        alt="A stone gateway cut into rock, with an inscription above it"
        className={`block dark:hidden ${SHARED}`}
      />
      <img src="/images/gate-of-hell-plain-dark.webp" width={560} height={713} alt="" aria-hidden className={`hidden dark:block ${SHARED}`} />
      <span className="mt-3 block font-serif text-2xl italic text-foreground underline decoration-transparent underline-offset-[6px] transition-colors duration-300 group-hover:text-primary group-hover:decoration-primary/50">
        {children}
      </span>
    </Link>
  );
}
