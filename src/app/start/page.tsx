import Link from 'next/link';
import Navigation from '@/components/Navigation';
import BottomPortraitParagraph from '@/components/BottomPortraitParagraph';
import NarratedPage from '@/components/NarratedPage';
import { getPlateImage } from '@/lib/image-mappings';
import { getStartHere } from '@/lib/start-here';

export const metadata = {
  title: 'Start here | The Divine Comedy',
  description: 'What the Divine Comedy is, what this site adds to it, and how to read and listen.',
};

export default function StartPage() {
  const { sections, src, starts } = getStartHere();
  // Each paragraph's place in the narration, which reads them all in page order
  const firstParagraph = sections.map((_, i) => sections.slice(0, i).reduce((sum, section) => sum + section.paragraphs.length, 0));
  /** A paragraph as words that light up when spoken and can be clicked, or as plain text when there are no timings */
  const spoken = (paragraph: string, place: number) => {
    const times = starts?.[place];
    const words = paragraph.split(/\s+/);
    if (!times || times.length !== words.length) return paragraph;
    return words.flatMap((word, i) => [
      i > 0 ? ' ' : '',
      <span key={i} className="narration-word" data-t={times[i]}>
        {word}
      </span>,
    ]);
  };
  // Doré's first plate: Dante in the dark wood
  const plate = getPlateImage(1);
  const link = 'text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary';

  const body = (
    <div className="mt-14 space-y-12">
      {sections.map((section, index) => (
        <section key={section.heading}>
          <h2 className="font-serif text-2xl italic text-primary md:text-[1.75rem]">{section.heading}</h2>
          <div className="mt-4 flow-root space-y-4 font-serif text-[19px] leading-[1.85] text-foreground">
            {section.paragraphs.map((paragraph, i) =>
              index === 0 && i === 0 ? (
                <BottomPortraitParagraph
                  key={i}
                  picture={
                    <>
                      <img
                        src="/images/dante-portrait-480.webp"
                        srcSet="/images/dante-portrait-480.webp 480w, /images/dante-portrait.webp 911w"
                        sizes="13rem"
                        width={480}
                        height={706}
                        alt="Dante in profile, in a red robe and cap crowned with a laurel wreath"
                        className="block w-full"
                      />
                      <span className="mt-2 block text-center font-sans text-xs leading-snug text-muted-foreground sm:absolute sm:inset-x-0 sm:top-full sm:mt-1.5">
                        After Sandro Botticelli, c. 1495
                      </span>
                    </>
                  }
                >
                  {spoken(paragraph, firstParagraph[index] + i)}
                </BottomPortraitParagraph>
              ) : (
                <p key={i}>{spoken(paragraph, firstParagraph[index] + i)}</p>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
          <h1 className="sr-only">Start here</h1>
          {src ? (
            <NarratedPage src={src} paragraphs={sections.flatMap(section => section.paragraphs)} label="Listen to this page">
              {body}
            </NarratedPage>
          ) : (
            body
          )}

          <Link href="/inferno/1" className="group mt-12 block overflow-hidden rounded-sm border border-border/40 shadow-sm">
            <img src={plate.src} srcSet={plate.srcSet} sizes="(min-width: 768px) 42rem, 100vw" alt="" className="aspect-[3/2] w-full object-cover object-[center_75%]" />
            <span className="flex items-baseline justify-between gap-4 bg-card px-5 py-4">
              <span className="font-serif text-xl text-foreground">Inferno, Canto I</span>
              <span className="font-sans text-sm text-primary underline-offset-4 group-hover:underline">Begin reading</span>
            </span>
          </Link>

          <p className="mt-8 text-center font-sans text-sm text-muted-foreground">
            Or look around first: the <Link href="/map" className={link}>Map</Link> of the journey, and the{' '}
            <Link href="/gallery" className={link}>Illustrations</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
