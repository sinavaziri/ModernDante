import { PAINTING, outlineBox, outlinePoints, type MapLevel, type MapOutline } from '@/lib/realm-maps';

// A painted map of Purgatory or Paradise with the names of its levels beside it. Every level on the
// painting links to that level's entry on the page. On a wide screen the page sets those entries
// beside the map, so the names are hidden there.

/** The painting, then a column for the names */
const W = 1460;
const LABEL_X = 1088;
const PARCHMENT = 'hsl(35 25% 92%)';

const linkClass =
  'outline-none [&:focus-visible_.band]:stroke-[hsl(35_25%_92%)] [&:focus-visible_.band]:[stroke-width:4]';

/** An unseen shape over a level, so it can be clicked; it lightens under the pointer */
const hitClass = 'band fill-white/0 transition-[fill] duration-150 [a:hover_&]:fill-white/15 [a:focus-visible_&]:fill-white/15';

interface PaintedMapProps {
  /** Names the map for screen readers, as in "The levels of Purgatory" */
  label: string;
  /** What a numbered level is called: Terrace or Heaven */
  word: string;
  levels: MapLevel[];
  /** Each level's outline on the painting */
  outlines: Record<string, MapOutline>;
  /** How far the highlight's edge is softened, for levels that part at clouds and not at rock */
  feather?: number;
  /** The painting, 1024 by 2048 */
  painting: string;
  /** A smaller copy of the painting for narrow screens, used only with `later` */
  small?: string;
  /** Leave the painting for the page to fetch once its first picture is in: see JourneyScroller */
  later?: boolean;
  /** The color behind the names, close to the painting's darkest tone */
  ground: string;
}

/** How much wider the whole map is than its painting */
export const PAINTED_MAP_WIDTH_RATIO = W / PAINTING.width;

export default function PaintedMap({ label, word, levels, outlines, feather = 1, painting, small, later, ground }: PaintedMapProps) {
  const { width, height } = PAINTING;
  const slug = label.replace(/\W+/g, '-').toLowerCase();
  const fade = `${slug}-edge`;

  return (
    <nav aria-label={label}>
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full rounded-lg" style={{ backgroundColor: ground }}>
        <defs>
          <linearGradient id={fade} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={ground} stopOpacity="0" />
            <stop offset="1" stopColor={ground} />
          </linearGradient>
          <filter id={`${slug}-feather`} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation={feather} />
          </filter>
          <clipPath id={`${slug}-frame`}>
            <rect width={width} height={height} />
          </clipPath>
        </defs>

        <g aria-hidden="true">
          <image
            href={later ? undefined : painting}
            data-later={later ? painting : undefined}
            data-later-small={later ? small : undefined}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
          <rect className="xl:hidden" x={width - 110} width="111" height={height} fill={`url(#${fade})`} />
        </g>

        {levels.map(level => {
          const outline = outlines[level.id];
          if (!outline) return null;
          const box = outlineBox(outline);
          const middle = (box.top + box.bottom) / 2;
          return (
            <a
              key={level.id}
              href={`#${level.id}`}
              aria-label={level.circle ? `${word} ${level.circle}: ${level.name}` : level.name}
              className={linkClass}
            >
              <g clipPath={`url(#${slug}-frame)`}>
                <polygon className={hitClass} points={outlinePoints(outline)} filter={`url(#${slug}-feather)`} />
              </g>
              <line
                className="xl:hidden"
                aria-hidden="true"
                x1={Math.min(box.right + 10, LABEL_X - 30)}
                y1={middle}
                x2={LABEL_X - 16}
                y2={middle}
                stroke={PARCHMENT}
                strokeOpacity="0.5"
                strokeDasharray="3 7"
                strokeWidth="1.5"
              />
              <text x={LABEL_X} y={middle + 15} fontSize="44" fill={PARCHMENT} className="font-sans font-medium xl:hidden">
                {level.circle && (
                  <tspan className="font-serif" fontSize="52" fillOpacity="0.75">
                    {level.circle}{' '}
                  </tspan>
                )}
                {level.shortName ?? level.name}
              </text>
            </a>
          );
        })}
      </svg>
    </nav>
  );
}
