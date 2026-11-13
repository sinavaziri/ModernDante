import Image from 'next/image';
import Link from 'next/link';
import EarthSection from '@/components/EarthSection';
import InfernoMap, { infernoMapWidthRatio } from '@/components/InfernoMap';
import JourneyScroller from '@/components/JourneyScroller';
import { JOIN_ABOVE, JOIN_BELOW, MAP_COLUMN, MapBlock, MapHeader, TEXT_COLUMN } from '@/components/MapPage';
import Navigation from '@/components/Navigation';
import PaintedMap, { PAINTED_MAP_WIDTH_RATIO } from '@/components/PaintedMap';
import { getInfernoLevels } from '@/lib/inferno-map';
import { LEVEL_WORD, getMapOutlines, getMapSpans, getRealmLevels } from '@/lib/realm-maps';

// The three maps as one journey: down through Hell, across at the center of the earth to the cavern
// under Lucifer, then up the way out, the mountain of Purgatory and the heavens of Paradise. The page
// opens at Hell, at the cavern, or at the rising from the summit, by the address it was reached at.

// The legs end flush with their paintings on a wide screen, so the two meet edge to edge at the turn
const LEG = 'mx-auto max-w-3xl px-4 pb-10 md:px-8 xl:max-w-7xl xl:pb-0';

const linkClass =
  'text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function JourneyMapPage({ start }: { start: 'inferno' | 'purgatorio' | 'paradiso' }) {
  const inferno = getInfernoLevels();
  const purgatorio = getRealmLevels('purgatorio');
  const paradiso = getRealmLevels('paradiso');

  const descent = (
    <div className={`${LEG} pt-20`}>
      <MapHeader
        title="Map of the Journey"
        intro={
          <>
            Hell is a funnel under Jerusalem, narrowing to Lucifer at the center of the earth. From there the way
            turns and climbs: out through the rock, up the mountain of Purgatory, and on through the ten heavens.
            Keep scrolling to follow it the whole way.
          </>
        }
      />
      <MapBlock realm="inferno" levels={inferno} spans={getMapSpans('inferno')} widthRatio={infernoMapWidthRatio(inferno)}>
        <InfernoMap levels={inferno} painting="/images-map/inferno-dore-2x.webp"
          closeup="/images-map/inferno-treachery-closeup.webp"
          outlines={getMapOutlines('inferno')} />
      </MapBlock>
    </div>
  );

  const climb = (
    <div className={`${LEG} pt-20`}>
        <MapBlock
          realm="paradiso"
          levels={paradiso}
          spans={getMapSpans('paradiso')}
          widthRatio={PAINTED_MAP_WIDTH_RATIO}
          joinBelow="upper"
          ascending
        >
          <PaintedMap
            label="The levels of Paradise"
            word={LEVEL_WORD.paradiso}
            levels={paradiso}
            outlines={getMapOutlines('paradiso')}
            feather={14}
            painting="/images-map/paradiso-dore-2x.webp"
            small="/images-map/paradiso-dore-1x.webp"
            later
            ground="hsl(222 40% 14%)"
          />
        </MapBlock>

        {/* The rising from the summit: the middle of the painting, between the garden below and the Moon above */}
        <section id="rising" className={`scroll-mt-28 max-xl:mt-20 xl:relative ${JOIN_ABOVE}`}>
          <div
            className={`relative mx-auto aspect-[1024/820] max-w-md overflow-hidden rounded-lg xl:mx-0 xl:max-w-none ${MAP_COLUMN} ${JOIN_BELOW.middle}`}
          >
            <Image
              src="/images-map/ascent-dore-2x.webp"
              alt="Dante and Beatrice rise side by side through the open sky above the mountain, beside the blazing noon sun."
              fill
              sizes="(min-width: 1280px) 720px, 448px"
              className="object-cover object-[50%_48%]"
            />
          </div>

          <div className={`mt-10 xl:top-1/2 xl:mt-0 xl:-translate-y-1/3 ${TEXT_COLUMN}`}>
            <h2 className="mb-3 font-serif text-2xl text-foreground">The way up</h2>
            <div className="space-y-3 font-serif text-base leading-relaxed text-muted-foreground">
              <p>
                There is no road from the summit to Paradise. At noon Beatrice looks straight into the sun, Dante
                looks at her, and he rises without feeling himself move. He thinks he is still on the earth until
                she tells him he is climbing faster than lightning. A soul with nothing left to weigh it down, she
                says, goes up as naturally as a stream runs downhill.
              </p>
              <p>
                He is made ready at the end of{' '}
                <Link href="/purgatorio/33" className={linkClass}>
                  Purgatorio, Canto XXXIII
                </Link>
                , and rises in{' '}
                <Link href="/paradiso/1" className={linkClass}>
                  Paradiso, Canto I
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <div className="max-xl:mt-20">
          <MapBlock
            realm="purgatorio"
            levels={purgatorio}
            spans={getMapSpans('purgatorio')}
            widthRatio={PAINTED_MAP_WIDTH_RATIO}
            joinBelow="lower"
            ascending
            joinAbove
          >
            <PaintedMap
              label="The levels of Purgatory"
              word={LEVEL_WORD.purgatorio}
              levels={purgatorio}
              outlines={getMapOutlines('purgatorio')}
              painting="/images-map/purgatorio-dore-2x.webp"
              small="/images-map/purgatorio-dore-1x.webp"
              later
              ground="hsl(222 34% 13%)"
            />
          </MapBlock>
        </div>

        {/* The way out of Hell: the painting from the shore's sand down, so it carries on from the shore above */}
        <section id="way-out" className={`scroll-mt-28 max-xl:mt-20 xl:relative ${JOIN_ABOVE}`}>
          <div className={`relative mx-auto aspect-[1024/1690] max-w-md overflow-hidden rounded-lg xl:mx-0 xl:max-w-none ${MAP_COLUMN}`}>
            <Image
              src="/images-map/passage-dore-2x.webp"
              alt="The way out of Hell, cut through the rock. At the bottom Lucifer's legs rise from the ice of a dark cavern. A stream's channel winds up from it to an opening on the shore. Dante and Virgil appear in the cavern and on the path."
              fill
              sizes="(min-width: 1280px) 720px, 448px"
              className="object-cover object-bottom"
            />
          </div>

          <div data-turn-text className={`mt-10 xl:top-1/2 xl:mt-0 xl:-translate-y-1/3 ${TEXT_COLUMN}`}>
            <h2 className="mb-4 font-serif text-2xl text-foreground md:text-3xl">The way out of Hell</h2>
            <div className="space-y-4 font-serif text-base leading-relaxed text-muted-foreground">
              <p>
                Here the journey turns. Dante and Virgil have gone down Lucifer&rsquo;s body to the
                center of the earth and turned over, so his legs now point at the sky. They stand in a rough cavern
                under the other half of the world, where it is already morning.
              </p>
              <p>
                They follow the sound of a small stream up its winding channel in the rock, without resting, until
                they see the stars. They surface on the shore of Mount Purgatory, an island in the southern ocean
                directly opposite Jerusalem. Virgil says the mountain may be the earth that fled upward when Lucifer
                fell here.
              </p>
              <p>
                The climb out is told at the end of{' '}
                <Link href="/inferno/34" className={linkClass}>
                  Inferno, Canto XXXIV
                </Link>
                .
              </p>
            </div>
            <EarthSection top="purgatory" className="mt-8 w-full max-w-sm" />
            <p className="mt-6 font-sans text-sm text-muted-foreground">Keep scrolling to climb.</p>
          </div>
        </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <JourneyScroller start={start} descent={descent} climb={climb} underIce="/images-map/inferno-under-ice-2x.webp" />
      </main>
    </div>
  );
}
