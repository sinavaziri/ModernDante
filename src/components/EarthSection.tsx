// The earth cut in half, as the poem has it: Hell is a funnel under Jerusalem, Lucifer is fixed at the
// center, and a hidden path climbs from him to Mount Purgatory on the opposite side (Inferno 34).
// Drawn with Jerusalem on top for the map of Hell, and turned over for the map of Purgatory.

const WIDTH = 480;
const HEIGHT = 340;
const R = 110;
const CX = 170;
const LABEL_X = 310;

interface EarthSectionProps {
  /** Which side of the earth is at the top of the drawing */
  top: 'jerusalem' | 'purgatory';
  className?: string;
}

export default function EarthSection({ top, className }: EarthSectionProps) {
  const s = top === 'jerusalem' ? 1 : -1;
  const cy = s > 0 ? 140 : 200;
  /** The height on the drawing of a point d units from the center toward Jerusalem */
  const y = (d: number) => cy - s * d;
  const over = s > 0 ? 1 : 0;

  // The funnel of Hell: its mouth on the surface around Jerusalem, its point at the center
  const mouth = { x: R * Math.sin((24 * Math.PI) / 180), d: R * Math.cos((24 * Math.PI) / 180) };
  const rings = Array.from({ length: 8 }, (_, i) => (mouth.d * (8 - i)) / 9);
  const land = { x: R * Math.sin((75 * Math.PI) / 180), d: R * Math.cos((75 * Math.PI) / 180) };
  const terraces = Array.from({ length: 7 }, (_, i) => (i + 1) / 8.5);

  const labels = [
    { text: 'Jerusalem', d: R, from: 8 },
    { text: 'Hell', d: 62, from: 30 },
    { text: 'Lucifer, at the center', d: 0, from: 9 },
    { text: 'The hidden path', d: -52, from: 22 },
    { text: 'The southern ocean', d: -94, from: 61 },
    { text: 'Mount Purgatory', d: -136, from: 17 },
  ];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="The earth cut in half. Hell is a funnel under Jerusalem that narrows to Lucifer at the center. From him a winding path climbs to the far side of the earth and comes out at the foot of Mount Purgatory, an island in the southern ocean."
      className={className}
    >
      <circle cx={CX} cy={cy} r={R} className="fill-muted stroke-border" />

      {/* Dry land in the north, ocean over the whole south */}
      <path
        d={`M ${CX - land.x} ${y(land.d)} A ${R} ${R} 0 0 ${over} ${CX + land.x} ${y(land.d)}`}
        fill="none"
        stroke="hsl(30 22% 42%)"
        strokeWidth="5"
      />
      <path
        d={`M ${CX - R} ${cy} A ${R} ${R} 0 0 ${1 - over} ${CX + R} ${cy}`}
        fill="none"
        stroke="hsl(205 38% 50%)"
        strokeWidth="5"
      />

      {/* Hell */}
      <path
        d={`M ${CX - mouth.x} ${y(mouth.d)} A ${R} ${R} 0 0 ${over} ${CX + mouth.x} ${y(mouth.d)} L ${CX} ${cy} Z`}
        fill="hsl(8 42% 26%)"
      />
      {rings.map(d => {
        const half = (mouth.x * d) / mouth.d;
        return <line key={d} x1={CX - half} x2={CX + half} y1={y(d)} y2={y(d)} stroke="hsl(22 55% 62% / 0.55)" strokeWidth="1" />;
      })}

      {/* The cavern on the far side of Lucifer, and the stream's channel up to the shore */}
      <path
        d={`M ${CX} ${y(-7)} C ${CX - 26} ${y(-30)} ${CX + 30} ${y(-55)} ${CX + 6} ${y(-75)} S ${CX + 30} ${y(-96)} ${CX + 38} ${y(-103)}`}
        fill="none"
        className="stroke-background"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M ${CX} ${y(-7)} C ${CX - 26} ${y(-30)} ${CX + 30} ${y(-55)} ${CX + 6} ${y(-75)} S ${CX + 30} ${y(-96)} ${CX + 38} ${y(-103)}`}
        fill="none"
        stroke="hsl(205 50% 58%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1 4"
      />
      <ellipse cx={CX} cy={y(-9)} rx="9" ry="5" className="fill-background" />

      {/* Mount Purgatory */}
      <path d={`M ${CX - 30} ${y(-105.5)} L ${CX} ${y(-162)} L ${CX + 30} ${y(-105.5)} Z`} fill="hsl(32 30% 48%)" />
      {terraces.map(t => {
        const d = -105.5 - 56.5 * t;
        const half = 30 * (1 - t);
        return <line key={t} x1={CX - half} x2={CX + half} y1={y(d)} y2={y(d)} stroke="hsl(35 40% 82% / 0.6)" strokeWidth="1" />;
      })}

      <circle cx={CX} cy={cy} r="4.5" className="fill-foreground" />
      <circle cx={CX} cy={y(R)} r="3.5" className="fill-foreground" />

      {labels.map(label => (
        <g key={label.text}>
          <line
            x1={CX + label.from}
            x2={LABEL_X - 8}
            y1={y(label.d)}
            y2={y(label.d)}
            className="stroke-muted-foreground/50"
            strokeWidth="1"
          />
          <text x={LABEL_X} y={y(label.d)} dominantBaseline="middle" className="fill-foreground font-sans" fontSize="14">
            {label.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
