import type { ReactNode } from 'react';
import type { InfernoLevel } from '@/lib/inferno-map';
import { outlineBox, outlinePoints, type MapOutline } from '@/lib/realm-maps';

// A drawn cross-section of Hell: the dark wood at dawn on the surface, then the funnel cut into the
// earth, one cavern for each level with its scene, down to Lucifer in the ice. Every cavern links to
// that level's entry on the page. On a wide screen the page sets those entries beside the map, so
// the names in the drawing are hidden there.

const W = 960;
/** The funnel's center line; the names sit in the column to its right */
const CX = 345;
/** Where the ground is */
const SKY = 150;
const GAP = 6;
const LABEL_X = 712;

const PARCHMENT = 'hsl(35 25% 92%)';
const FIRE = 'hsl(32 95% 58%)';
const GOLD = 'hsl(45 96% 68%)';
const EARTH = 'hsl(24 20% 10%)';
const DARK = 'hsl(24 15% 6%)';
/** The rock at the edge of the painted map, for the column of names beside it */
const PAINTED_ROCK = 'hsl(24 14% 7%)';
const SOUL = 'hsl(35 22% 86%)';

const HEIGHTS: Record<string, number> = {
  gate: 78,
  'circle-1': 80,
  'circle-2': 78,
  'circle-3': 78,
  'circle-4': 78,
  'circle-5': 80,
  dis: 70,
  'circle-6': 78,
  'circle-7': 120,
  'circle-8': 104,
  giants: 74,
  'circle-9': 136,
};

/** The room a scene has: left, right, top and floor */
interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

const n1 = (n: number) => Math.round(n * 10) / 10;

/** The same "random" number for the same seed, so the drawing never changes between builds */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const times = (n: number) => Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);

function wave(x0: number, x1: number, y: number, amp: number, len: number) {
  let d = `M${n1(x0)} ${n1(y)} q${len / 4} ${-amp} ${len / 2} 0`;
  for (let x = x0 + len; x <= x1 + 0.1; x += len / 2) d += ` t${len / 2} 0`;
  return d;
}

function Glow({ x, y, r, kind = 'fire', opacity = 1 }: { x: number; y: number; r: number; kind?: 'fire' | 'gold' | 'ice'; opacity?: number }) {
  return <circle cx={n1(x)} cy={n1(y)} r={r} fill={`url(#inferno-glow-${kind})`} opacity={opacity} />;
}

/** A flame with a paler core */
function Flame({ x, y, s }: { x: number; y: number; s: number }) {
  const shape = (k: number) =>
    `M${n1(x)} ${n1(y)} c${n1(-0.62 * k)} ${n1(-0.5 * k)} ${n1(-0.1 * k)} ${n1(-0.9 * k)} 0 ${n1(-1.6 * k)} c${n1(0.1 * k)} ${n1(0.5 * k)} ${n1(0.72 * k)} ${n1(0.9 * k)} 0 ${n1(1.6 * k)}z`;
  return (
    <>
      <path d={shape(s)} fill={FIRE} />
      {s > 5 && <path d={shape(s * 0.55)} fill={GOLD} />}
    </>
  );
}

/** A robed figure standing at x with its feet at y; lean tips it over, in degrees */
function Soul({ x, y, h = 20, lean = 0, fill = SOUL }: { x: number; y: number; h?: number; lean?: number; fill?: string }) {
  return (
    <g transform={lean ? `rotate(${lean} ${n1(x)} ${n1(y)})` : undefined} fill={fill}>
      <path
        d={`M${n1(x - 0.19 * h)} ${n1(y - 0.7 * h)} Q${n1(x)} ${n1(y - 0.84 * h)} ${n1(x + 0.19 * h)} ${n1(y - 0.7 * h)} L${n1(x + 0.15 * h)} ${n1(y)} H${n1(x - 0.15 * h)}Z`}
      />
      <circle cx={n1(x)} cy={n1(y - 0.88 * h)} r={n1(0.15 * h)} />
    </g>
  );
}

function Crenels({ x, y, width, tooth = 6, fill }: { x: number; y: number; width: number; tooth?: number; fill: string }) {
  return (
    <>
      {times((width + tooth) / (tooth * 2)).map(k => (
        <rect key={k} x={n1(x + k * tooth * 2)} y={y - tooth} width={tooth} height={tooth + 1} fill={fill} />
      ))}
    </>
  );
}

/** A ferry with its boatman, floating on water at y */
function Boat({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x + 2} y1={y - 30} x2={x + 30} y2={y + 6} stroke="hsl(30 25% 62%)" strokeWidth="1.8" strokeLinecap="round" />
      <Soul x={x - 2} y={y - 5} h={26} />
      <Soul x={x - 15} y={y - 5} h={13} fill="hsl(35 15% 66%)" />
      <path d={`M${x - 30} ${y - 9} q4 15 30 15 q26 0 32 -17 q-30 7 -62 2z`} fill="hsl(28 30% 13%)" />
      <path d={`M${x - 30} ${y - 9} q32 5 62 -2`} fill="none" stroke="hsl(30 25% 50%)" strokeWidth="1.5" />
    </g>
  );
}

const SCENES: Record<string, (box: Box) => ReactNode> = {
  gate: ({ l, r, b }) => {
    const x = l + (r - l) * 0.17;
    const arch = `M${x - 23} ${b} V${b - 32} a23 23 0 0 1 46 0 V${b}`;
    const shore = x + 150;
    return (
      <>
        <path d={arch} fill="none" stroke="hsl(30 9% 62%)" strokeWidth="13" />
        <path d={arch} fill="none" stroke="hsl(30 9% 30%)" strokeWidth="13" strokeDasharray="1.5 13" />
        <path d={arch} fill={DARK} />
        {/* The crowd waiting on the bank */}
        {times(7).map(i => (
          <Soul key={i} x={x + 48 + i * 13 + rnd(i + 5) * 4} y={b - 1} h={15 + rnd(i + 8) * 5} fill={i % 2 ? SOUL : 'hsl(35 14% 70%)'} />
        ))}
        <path d={`${wave(shore, r, b - 15, 3.5, 30)} V${b} H${shore}Z`} fill="url(#inferno-water)" />
        {[15, 7].map((up, i) => (
          <path
            key={up}
            d={wave(shore + i * 16, r - 12, b - up, 3.5, 30)}
            fill="none"
            stroke="hsl(200 25% 74%)"
            strokeOpacity="0.7"
            strokeWidth="1.6"
          />
        ))}
        <Boat x={shore + (r - shore) * 0.5} y={b - 10} />
      </>
    );
  },

  'circle-1': ({ l, r, b }) => {
    const x = (l + r) / 2;
    const stone = 'hsl(42 28% 66%)';
    const shade = 'hsl(42 22% 50%)';
    const towers = [-84, -13, 58];
    return (
      <>
        <Glow x={x} y={b - 34} r={150} kind="gold" opacity={0.75} />
        <path d={`${wave(l, r, b - 5, 2.5, 60)} V${b} H${l}Z`} fill="hsl(95 25% 30%)" />
        <rect x={x - 84} y={b - 32} width="168" height="28" fill={stone} />
        <rect x={x - 84} y={b - 10} width="168" height="6" fill={shade} />
        <Crenels x={x - 56} y={b - 32} width={112} fill={stone} />
        {towers.map((dx, i) => (
          <g key={dx}>
            <rect x={x + dx} y={b - (i === 1 ? 62 : 52)} width="26" height={i === 1 ? 58 : 48} fill={stone} />
            <rect x={x + dx + 19} y={b - (i === 1 ? 62 : 52)} width="7" height={i === 1 ? 58 : 48} fill={shade} />
            <Crenels x={x + dx} y={b - (i === 1 ? 62 : 52)} width={26} tooth={5.2} fill={stone} />
            <rect x={x + dx + 9} y={b - (i === 1 ? 52 : 43)} width="6" height="11" rx="3" fill={GOLD} />
          </g>
        ))}
        <path d={`M${x - 8} ${b - 4} v-13 a8 8 0 0 1 16 0 v13z`} fill={DARK} />
        {[-50, -36, 32, 44].map(dx => (
          <rect key={dx} x={x + dx} y={b - 24} width="5" height="8" rx="2.5" fill={GOLD} />
        ))}
        {[-128, -112, 112, 124, 140].map((dx, i) => (
          <Soul key={dx} x={x + dx} y={b - 3} h={17 + (i % 2) * 3} />
        ))}
      </>
    );
  },

  'circle-2': ({ l, r, t, b }) => (
    <>
      <g fill="none" stroke={PARCHMENT} strokeLinecap="round">
        {times(6).map(i => (
          <path
            key={i}
            d={wave(l + rnd(i) * 30, r - 30, t + 13 + i * 10.5, 7 + rnd(i + 9) * 6, 72 + i * 9)}
            strokeOpacity={0.2 + rnd(i + 3) * 0.3}
            strokeWidth={1.4 + rnd(i + 6) * 1.6}
          />
        ))}
        {times(4).map(i => {
          const x = l + 60 + ((r - l - 100) * i) / 3;
          const y = t + 26 + rnd(i + 20) * (b - t - 46);
          return <path key={i} d={`M${n1(x)} ${n1(y)} a12 12 0 1 1 -12 -12 a7 7 0 1 1 7 7`} strokeOpacity="0.7" strokeWidth="2" />;
        })}
      </g>
      {/* The lovers, carried on the wind */}
      {times(16).map(i => {
        const x = l + 14 + rnd(i + 40) * (r - l - 28);
        const y = t + 16 + rnd(i + 70) * (b - t - 26);
        return <Soul key={i} x={x} y={y} h={12 + rnd(i + 80) * 5} lean={55 + rnd(i + 90) * 70} />;
      })}
    </>
  ),

  'circle-3': ({ l, r, t, b }) => {
    const x = l + (r - l) * 0.7;
    const floor = b - 9;
    const hound = 'hsl(20 25% 8%)';
    return (
      <>
        <g stroke="hsl(200 30% 80%)" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round">
          {times((r - l) / 7).map(i => {
            const rx = l + 8 + rnd(i + 100) * (r - l - 10);
            const ry = t + 4 + rnd(i + 200) * (b - t - 34);
            return <line key={i} x1={n1(rx)} y1={n1(ry)} x2={n1(rx - 5)} y2={n1(ry + 13)} />;
          })}
        </g>
        <path d={`${wave(l, r, b - 12, 5, 64)} V${b} H${l}Z`} fill="hsl(28 30% 13%)" />
        {times((r - l) / 62).map(i => {
          const sx = l + 34 + i * 62 + rnd(i + 300) * 18;
          return Math.abs(sx - x) < 46 ? null : <Soul key={i} x={sx} y={b - 8} h={17} lean={i % 2 ? 84 : -84} />;
        })}
        {/* Cerberus */}
        <g fill={hound}>
          <ellipse cx={x} cy={floor - 15} rx="19" ry="9" />
          {[-14, -7, 8, 15].map(dx => (
            <rect key={dx} x={x + dx - 2.5} y={floor - 12} width="5" height="13" rx="2" />
          ))}
          <path d={`M${x - 17} ${floor - 18} q-12 -6 -9 -17`} fill="none" stroke={hound} strokeWidth="3" strokeLinecap="round" />
          {[
            [10, -27],
            [21, -24],
            [29, -15],
          ].map(([dx, dy]) => (
            <g key={dx}>
              <path d={`M${x + 10} ${floor - 16} L${x + dx} ${floor + dy}`} stroke={hound} strokeWidth="7" strokeLinecap="round" />
              <circle cx={x + dx} cy={floor + dy} r="6.2" />
              <path d={`M${x + dx + 3} ${floor + dy - 4} l11 3 l-10 5z`} />
              <path d={`M${x + dx - 4} ${floor + dy - 5} l1 -7 l5 5z`} />
            </g>
          ))}
        </g>
        {[
          [11, -28],
          [22, -25],
          [30, -16],
        ].map(([dx, dy]) => (
          <circle key={dx} cx={x + dx} cy={floor + dy} r="1.5" fill="hsl(0 85% 58%)" />
        ))}
      </>
    );
  },

  'circle-4': ({ l, r, b }) => {
    const floor = b - 5;
    const count = Math.max(4, Math.floor((r - l) / 92) * 2);
    return (
      <>
        <rect x={l} y={floor} width={r - l} height="3" fill="hsl(38 30% 20%)" />
        {times(count).map(i => {
          const fromLeft = i < count / 2;
          const x = l + ((r - l) * (i + 0.5)) / count;
          const rad = 13 + rnd(i + 400) * 8;
          const dir = fromLeft ? -1 : 1;
          return (
            <g key={i}>
              <Soul x={x + dir * (rad + 15)} y={floor} h={24} lean={-dir * 28} />
              <circle cx={n1(x)} cy={n1(floor - rad)} r={n1(rad)} fill="hsl(40 20% 56%)" />
              <circle cx={n1(x - rad * 0.22)} cy={n1(floor - rad * 1.22)} r={n1(rad * 0.68)} fill="hsl(40 26% 70%)" />
              <path
                d={`M${n1(x - rad * 0.5)} ${n1(floor - rad * 0.5)} l${n1(rad * 0.5)} ${n1(-rad * 0.3)} l${n1(rad * 0.3)} ${n1(rad * 0.4)}`}
                fill="none"
                stroke="hsl(40 18% 40%)"
                strokeWidth="1.3"
              />
            </g>
          );
        })}
      </>
    );
  },

  'circle-5': ({ l, r, t, b }) => {
    const top = t + (b - t) * 0.5;
    return (
      <>
        {/* The signal tower on the shore */}
        <Glow x={l + 16} y={t + 14} r={34} />
        <rect x={l + 6} y={t + 22} width="20" height={top - t - 14} fill="hsl(165 10% 44%)" />
        <Crenels x={l + 6} y={t + 22} width={20} tooth={4} fill="hsl(165 10% 44%)" />
        <Flame x={l + 16} y={t + 17} s={7} />
        <path d={`${wave(l, r, top, 5, 46)} V${b - 3} H${l}Z`} fill="hsl(165 32% 11%)" />
        {[0, 14].map(down => (
          <path
            key={down}
            d={wave(l + down, r - 14, top + down, 5, 46)}
            fill="none"
            stroke="hsl(165 24% 62%)"
            strokeOpacity={down ? 0.35 : 0.65}
            strokeWidth="1.8"
          />
        ))}
        {/* The angry, fighting in the mud */}
        <g stroke={SOUL} strokeWidth="2.2" strokeLinecap="round">
          {times((r - l) / 58).map(i => {
            const x = l + 48 + i * 58 + rnd(i + 500) * 20;
            const y = top + 5 + rnd(i + 600) * 7;
            const reach = i % 2 ? 9 : -9;
            return (
              <g key={i}>
                <path d={`M${n1(x - 5)} ${n1(y + 6)} q5 -9 10 0z`} fill={SOUL} stroke="none" />
                <circle cx={n1(x)} cy={n1(y - 3)} r="3.8" fill={SOUL} stroke="none" />
                <line x1={n1(x)} y1={n1(y + 2)} x2={n1(x + reach)} y2={n1(y - 9)} />
                <line x1={n1(x)} y1={n1(y + 2)} x2={n1(x + reach * 1.3)} y2={n1(y - 1)} />
              </g>
            );
          })}
        </g>
        <Boat x={l + (r - l) * 0.6} y={top + 3} />
      </>
    );
  },

  dis: ({ l, r, t, b }) => {
    const iron = 'hsl(6 26% 36%)';
    const lit = 'hsl(8 34% 47%)';
    const wallTop = t + 30;
    const x = (l + r) / 2;
    const towers = times(4).map(i => l + 18 + ((r - l - 64) * i) / 3);
    return (
      <>
        <rect x={l} y={t + 2} width={r - l} height={b - t - 2} fill="url(#inferno-ember)" />
        <rect x={l} y={wallTop} width={r - l} height={b - wallTop} fill={iron} />
        <g stroke="hsl(6 30% 24%)" strokeWidth="1">
          {times((b - wallTop) / 9).map(i => (
            <line key={i} x1={l} y1={wallTop + 8 + i * 9} x2={r} y2={wallTop + 8 + i * 9} strokeDasharray="18 2" strokeDashoffset={i % 2 ? 9 : 0} />
          ))}
        </g>
        <Crenels x={l} y={wallTop} width={r - l} fill={iron} />
        {towers.map(tx => (
          <g key={tx}>
            <Glow x={tx + 14} y={t + 12} r={30} />
            <rect x={n1(tx)} y={t + 16} width="28" height={b - t - 16} fill={lit} />
            <rect x={n1(tx + 20)} y={t + 16} width="8" height={b - t - 16} fill={iron} />
            <Crenels x={n1(tx)} y={t + 16} width={28} tooth={5.6} fill={lit} />
            <rect x={n1(tx + 9)} y={t + 27} width="6" height="12" rx="3" fill={FIRE} />
            <Flame x={tx + 14} y={t + 11} s={8} />
          </g>
        ))}
        <path d={`M${x - 14} ${b} v-19 a14 14 0 0 1 28 0 v19z`} fill={DARK} />
        <path d={`M${x - 14} ${b} v-19 a14 14 0 0 1 28 0 v19`} fill="none" stroke="hsl(8 30% 56%)" strokeWidth="2.5" />
      </>
    );
  },

  'circle-6': ({ l, r, b }) => {
    const count = Math.floor((r - l) / 64);
    const step = (r - l) / count;
    const lidLight = 'hsl(22 16% 78%)';
    return (
      <>
        {times(count).map(i => {
          const x = l + step * i + (step - 42) / 2;
          return (
            <g key={i}>
              <Glow x={x + 22} y={b - 34} r={38} opacity={0.9} />
              <Flame x={x + 11} y={b - 24} s={11 + rnd(i + 700) * 5} />
              <Flame x={x + 23} y={b - 24} s={17 + rnd(i + 710) * 7} />
              <Flame x={x + 33} y={b - 24} s={10 + rnd(i + 720) * 5} />
              <rect x={n1(x)} y={b - 26} width="42" height="21" fill="hsl(22 14% 66%)" />
              <rect x={n1(x)} y={b - 26} width="42" height="5" fill={lidLight} />
              <rect x={n1(x + 5)} y={b - 16} width="32" height="7" fill="hsl(22 14% 52%)" />
              <rect x={n1(x - 3)} y={b - 6} width="48" height="4" fill="hsl(22 14% 44%)" />
              <rect x={n1(x - 16)} y={b - 37} width="32" height="6" fill={lidLight} transform={`rotate(-26 ${n1(x)} ${b - 32})`} />
            </g>
          );
        })}
      </>
    );
  },

  'circle-7': ({ l, r, t, b }) => {
    const h = (b - t) / 3;
    const woodFloor = t + 2 * h;
    return (
      <>
        {/* The river of boiling blood */}
        <path d={`${wave(l, r, t + 17, 4, 40)} V${t + h} H${l}Z`} fill="url(#inferno-blood)" />
        <path d={wave(l, r, t + 17, 4, 40)} fill="none" stroke="hsl(0 90% 72%)" strokeWidth="1.8" />
        {times((r - l) / 60).map(i => {
          const x = l + 30 + i * 60 + rnd(i + 800) * 24;
          return (
            <g key={i} fill={SOUL}>
              <path d={`M${n1(x - 5)} ${t + 24} q5 -9 10 0z`} />
              <circle cx={n1(x)} cy={t + 15} r="3.8" />
            </g>
          );
        })}
        {times(5).map(i => (
          <circle key={i} cx={n1(l + 20 + rnd(i + 830) * (r - l - 40))} cy={n1(t + 27 + rnd(i + 840) * (h - 32))} r="2" fill="none" stroke="hsl(0 90% 72%)" />
        ))}

        {/* The wood of the suicides */}
        <rect x={l} y={woodFloor - 3} width={r - l} height="4" fill="hsl(358 40% 16%)" />
        <g stroke="hsl(20 35% 7%)" strokeLinecap="round" fill="none">
          {times((r - l) / 25).map(i => {
            const x = l + 12 + i * 25 + rnd(i + 900) * 8;
            const up = 22 + rnd(i + 910) * 9;
            const lean = (rnd(i + 920) - 0.5) * 10;
            return (
              <g key={i}>
                <path d={`M${n1(x)} ${n1(woodFloor - 2)} q${n1(-lean)} ${n1(-up / 2)} ${n1(lean)} ${n1(-up)}`} strokeWidth="4" />
                <path
                  d={`M${n1(x)} ${n1(woodFloor - up * 0.5)} l-10 -7 l-3 -6 M${n1(x)} ${n1(woodFloor - up * 0.62)} l10 -8 l1 -6 M${n1(x + lean)} ${n1(woodFloor - up)} l-7 -6 m7 6 l7 -5 m-7 5 l1 -8`}
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </g>

        {/* The burning sand */}
        <Glow x={(l + r) / 2} y={b} r={(r - l) * 0.5} opacity={0.6} />
        <path d={`${wave(l, r, b - 13, 2, 50)} V${b - 3} H${l}Z`} fill="hsl(38 55% 60%)" />
        {times((r - l) / 11).map(i => (
          <Flame key={i} x={l + 8 + rnd(i + 1000) * (r - l - 16)} y={woodFloor + 10 + rnd(i + 1100) * (h - 24)} s={3.4 + rnd(i + 1200) * 2.4} />
        ))}
        {times((r - l) / 54).map(i => (
          <Soul key={i} x={l + 26 + i * 54 + rnd(i + 1250) * 18} y={b - 11} h={15} lean={i % 3 === 0 ? 80 : (i % 2 ? 14 : -14)} />
        ))}
      </>
    );
  },

  'circle-8': ({ l, r, t, b }) => {
    const width = (r - l) / 10;
    const rim = t + (b - t) * 0.52;
    const depth = (b - rim - 10) * 0.78;
    const stone = 'hsl(24 10% 68%)';
    return (
      <>
        {times(10).map(i => {
          const x = l + i * width;
          const burning = i === 2 || i === 7;
          return (
            <g key={i}>
              <path
                d={`M${n1(x + 2.5)} ${n1(rim)} C${n1(x + 2.5)} ${n1(rim + depth * 1.3)} ${n1(x + width - 2.5)} ${n1(rim + depth * 1.3)} ${n1(x + width - 2.5)} ${n1(rim)}Z`}
                fill={DARK}
              />
              {/* Burning feet in the third ditch, the flames of the false counselors in the eighth, pitch in the fifth */}
              {burning && <Glow x={x + width / 2} y={rim + depth * 0.5} r={width * 0.8} />}
              {burning && <Flame x={x + width / 2} y={rim + depth * 0.85} s={width * 0.3} />}
              {i === 4 && <ellipse cx={n1(x + width / 2)} cy={n1(rim + depth * 0.75)} rx={n1(width * 0.3)} ry="3" fill="hsl(24 10% 22%)" />}
              <path
                d={`M${n1(x)} ${n1(rim)} q${n1(width / 2)} ${n1(-width * 0.9)} ${n1(width)} 0`}
                fill="none"
                stroke={stone}
                strokeWidth="3.4"
              />
              <path
                d={`M${n1(x)} ${n1(rim + 2.5)} q${n1(width / 2)} ${n1(-width * 0.9)} ${n1(width)} 0`}
                fill="none"
                stroke="hsl(24 10% 40%)"
                strokeWidth="1.6"
              />
            </g>
          );
        })}
        <line x1={l} y1={rim} x2={r} y2={rim} stroke={stone} strokeWidth="3.4" strokeDasharray={`5 ${n1(width - 5)}`} strokeDashoffset="2.5" />
        <Soul x={l + width * 3.5} y={rim - width * 0.45} h={11} />
        <Soul x={l + width * 3.5 + 7} y={rim - width * 0.45} h={11} fill="hsl(0 50% 60%)" />
      </>
    );
  },

  giants: ({ l, r, b }) => {
    const count = Math.max(3, Math.floor((r - l) / 46));
    const step = (r - l) / count;
    const skin = 'hsl(215 16% 70%)';
    const shade = 'hsl(215 16% 52%)';
    return (
      <>
        {times(count).map(i => {
          const x = l + step * (i + 0.5);
          const tall = 50 + rnd(i + 1500) * 8;
          return (
            <g key={i}>
              <path
                d={`M${n1(x - 13)} ${b} L${n1(x - 17)} ${n1(b - tall * 0.62)} Q${n1(x)} ${n1(b - tall * 0.8)} ${n1(x + 17)} ${n1(b - tall * 0.62)} L${n1(x + 13)} ${b}Z`}
                fill={skin}
              />
              <path d={`M${n1(x + 4)} ${b} L${n1(x + 6)} ${n1(b - tall * 0.68)} Q${n1(x + 12)} ${n1(b - tall * 0.68)} ${n1(x + 17)} ${n1(b - tall * 0.62)} L${n1(x + 13)} ${b}Z`} fill={shade} />
              <circle cx={n1(x)} cy={n1(b - tall * 0.86)} r="8.5" fill={skin} />
              <path d={`M${n1(x - 6)} ${n1(b - tall * 0.8)} q6 9 12 0z`} fill={shade} />
            </g>
          );
        })}
        {/* The chains */}
        {[14, 24].map(up => (
          <path key={up} d={wave(l - 4, r, b - up, 2.5, step)} fill="none" stroke="hsl(215 10% 22%)" strokeWidth="3" strokeDasharray="5 3" />
        ))}
      </>
    );
  },

  'circle-9': ({ t, b }) => {
    const x = CX;
    const half = 104;
    const ice = b - 44;
    const shadow = 'hsl(232 34% 10%)';
    const wing = (dir: number, k: number, up: number) =>
      `M${x + dir * 9} ${ice - up} L${n1(x + dir * 56 * k)} ${n1(ice - up - 34 * k)} Q${n1(x + dir * 47 * k)} ${n1(ice - up - 16 * k)} ${n1(x + dir * 52 * k)} ${n1(ice - up - 1 * k)} Q${n1(x + dir * 40 * k)} ${n1(ice - up - 7 * k)} ${n1(x + dir * 36 * k)} ${n1(ice - up + 9 * k)} Q${n1(x + dir * 24 * k)} ${n1(ice - up + 1 * k)} ${x + dir * 10} ${n1(ice - up + 14 * k)}Z`;
    return (
      <>
        <Glow x={x + 18} y={ice - 26} r={96} kind="ice" opacity={0.8} />
        <path d={`M${x - half} ${ice} H${x + half} V${b - 4} H${x - half}Z`} fill="url(#inferno-ice)" />
        <path d={`M${x - half} ${ice} H${x + half}`} stroke="hsl(195 70% 94%)" strokeWidth="2" />
        <g stroke="hsl(205 45% 42%)" strokeWidth="1.3" fill="none">
          <path d={`M${x - half + 6} ${ice + 12} l20 7 l11 -6 l17 10`} />
          <path d={`M${x + half - 6} ${ice + 14} l-22 6 l-10 -7 l-18 9`} />
          <path d={`M${x - 26} ${b - 12} l16 -7 l13 6 l18 -5`} />
          <path d={`M${x - 70} ${b - 10} l12 -5 l9 4`} />
          <path d={`M${x + 44} ${b - 16} l12 5 l12 -6`} />
        </g>
        {/* The traitors, frozen to the neck */}
        {times(9).map(i => {
          const hx = x - half + 14 + i * ((half * 2 - 28) / 8);
          return Math.abs(hx - x - 18) < 24 ? null : <circle key={i} cx={n1(hx)} cy={n1(ice + 1 + rnd(i + 1600) * 2)} r="3.6" fill={SOUL} />;
        })}

        {/* Lucifer: six wings, three faces */}
        <g transform="translate(18 0)">
        {[1, -1].map(dir => (
          <g key={dir}>
            <path d={wing(dir, 1.08, 40)} fill={shadow} />
            <path d={wing(dir, 0.92, 26)} fill="hsl(232 30% 17%)" />
            <path d={wing(dir, 0.62, 13)} fill={shadow} />
          </g>
        ))}
        <path d={`M${x - 19} ${ice + 3} L${x - 15} ${ice - 36} Q${x} ${ice - 46} ${x + 15} ${ice - 36} L${x + 19} ${ice + 3}Z`} fill={shadow} />
        <circle cx={x - 14} cy={ice - 47} r="8" fill="hsl(46 40% 62%)" />
        <circle cx={x + 14} cy={ice - 47} r="8" fill="hsl(232 20% 24%)" />
        <circle cx={x} cy={ice - 51} r="11.5" fill="hsl(0 62% 40%)" />
        <path d={`M${x - 8} ${ice - 59} l-6 -13 l11 8z M${x + 8} ${ice - 59} l6 -13 l-11 8z`} fill={shadow} />
        <g fill={GOLD}>
          <circle cx={x - 4.2} cy={ice - 53} r="1.7" />
          <circle cx={x + 4.2} cy={ice - 53} r="1.7" />
        </g>
        <path d={`M${x - 5} ${ice - 45.5} h10 l-5 4z`} fill={shadow} />
        <g fill={shadow}>
          <circle cx={x - 16.5} cy={ice - 48} r="1.4" />
          <circle cx={x + 16.5} cy={ice - 48} r="1.4" fill={GOLD} />
        </g>
        </g>
        {times(7).map(i => (
          <circle key={i} cx={n1(x - half + 10 + rnd(i + 1300) * (half * 2 - 20))} cy={n1(t + 8 + rnd(i + 1400) * 20)} r="1.5" fill={PARCHMENT} opacity="0.6" />
        ))}
      </>
    );
  },
};

const linkClass =
  'outline-none transition-[filter] hover:brightness-125 focus-visible:brightness-125 [&:focus-visible_.band]:stroke-[hsl(35_25%_92%)] [&:focus-visible_.band]:[stroke-width:3]';

/** An unseen shape over a painted level, so the level can be clicked; it lightens under the pointer */
const hitClass = 'band fill-white/0 transition-[fill] duration-150 [a:hover_&]:fill-white/15 [a:focus-visible_&]:fill-white/15';

function Label({ y, children }: { y: number; children: ReactNode }) {
  return (
    <text x={LABEL_X} y={y + 10} fontSize="29" fill={PARCHMENT} className="font-sans font-medium xl:hidden">
      {children}
    </text>
  );
}

/** The surface: the dark wood before dawn, and the hill with the sun coming up behind it */
function Surface() {
  return (
    <>
      <rect width={W} height={SKY} fill="url(#inferno-sky)" />
      {times(26).map(i => (
        <circle key={i} cx={n1(20 + rnd(i + 1) * 920)} cy={n1(6 + rnd(i + 30) * 62)} r={n1(0.7 + rnd(i + 60) * 1.1)} fill={PARCHMENT} opacity={n1(0.4 + rnd(i + 65) * 0.5)} />
      ))}
      <Glow x={628} y={SKY - 40} r={130} kind="gold" opacity={0.85} />
      <circle cx="628" cy={SKY - 40} r="26" fill="hsl(44 98% 74%)" />
      {/* Far hills, then the hill Dante tries to climb */}
      <path d={`M440 ${SKY} Q520 ${SKY - 40} 600 ${SKY - 22} T800 ${SKY - 30} T960 ${SKY - 14} V${SKY}Z`} fill="hsl(280 18% 22%)" />
      <path d={`M500 ${SKY} Q556 ${SKY - 26} 588 ${SKY - 58} Q612 ${SKY - 84} 642 ${SKY - 46} Q672 ${SKY - 14} 730 ${SKY}Z`} fill="hsl(110 20% 13%)" />
      <path d={`M588 ${SKY - 58} Q612 ${SKY - 84} 642 ${SKY - 46}`} fill="none" stroke="hsl(40 90% 70%)" strokeOpacity="0.7" strokeWidth="1.5" />
      {/* The wood: a paler row behind, a black row in front */}
      {[
        { n: 22, fill: 'hsl(200 22% 15%)', scale: 0.72, seed: 500, shift: 11 },
        { n: 25, fill: 'hsl(150 30% 5%)', scale: 1, seed: 90, shift: 0 },
      ].map(row => (
        <g key={row.seed} fill={row.fill}>
          {times(row.n).map(i => {
            const x = 12 + row.shift + i * 21.5 + rnd(i + row.seed) * 10;
            const up = (50 + rnd(i + row.seed + 30) * 52) * row.scale;
            return i % 3 === 1 ? (
              <g key={i}>
                <path d={`M${n1(x - 2.5)} ${SKY} L${n1(x - 1.5)} ${n1(SKY - up * 0.6)} h3 L${n1(x + 2.5)} ${SKY}Z`} />
                <ellipse cx={n1(x)} cy={n1(SKY - up * 0.7)} rx={n1(12 + rnd(i) * 5)} ry={n1(up * 0.3)} />
                <ellipse cx={n1(x - 7)} cy={n1(SKY - up * 0.55)} rx="8" ry={n1(up * 0.17)} />
              </g>
            ) : (
              <path
                key={i}
                d={`M${n1(x)} ${n1(SKY - up)} l${n1(5 + up * 0.05)} ${n1(up * 0.36)} h-3 l${n1(6 + up * 0.05)} ${n1(up * 0.32)} h-3 l${n1(6 + up * 0.04)} ${n1(up * 0.32)} h${n1(-22 - up * 0.28)} l${n1(6 + up * 0.04)} ${n1(-up * 0.32)} h-3 l${n1(6 + up * 0.05)} ${n1(-up * 0.32)} h-3z`}
              />
            );
          })}
        </g>
      ))}
      <Soul x={470} y={SKY - 1} h={17} fill="hsl(0 55% 48%)" />
    </>
  );
}

/** The rock around the funnel: layers, stones, and roots under the wood */
function Rock({ height }: { height: number }) {
  return (
    <g>
      <rect y={SKY} width={W} height={height - SKY} fill="url(#inferno-earth)" />
      <g fill="none" stroke="hsl(26 22% 20%)" strokeWidth="1.5">
        {times((height - SKY) / 46).map(i => (
          <path key={i} d={wave(-20, W + 20, SKY + 40 + i * 46 + rnd(i + 1700) * 14, 5 + rnd(i + 1710) * 6, 220 + rnd(i + 1720) * 160)} strokeOpacity={n1(0.35 + rnd(i + 1730) * 0.5)} />
        ))}
      </g>
      {times(90).map(i => (
        <ellipse
          key={i}
          cx={n1(rnd(i + 1800) * W)}
          cy={n1(SKY + 20 + rnd(i + 1900) * (height - SKY - 30))}
          rx={n1(3 + rnd(i + 2000) * 9)}
          ry={n1(2 + rnd(i + 2100) * 4)}
          fill={i % 3 ? 'hsl(26 20% 15%)' : 'hsl(24 22% 6%)'}
        />
      ))}
      <g fill="none" stroke="hsl(26 25% 19%)" strokeWidth="1.6" strokeLinecap="round">
        {times(14).map(i => {
          const x = 30 + i * 36 + rnd(i + 2200) * 14;
          return <path key={i} d={`M${n1(x)} ${SKY + 4} q${n1(-6 + rnd(i + 2210) * 12)} 8 ${n1(-4 + rnd(i + 2220) * 8)} ${n1(9 + rnd(i + 2230) * 5)}`} />;
        })}
      </g>
    </g>
  );
}

interface InfernoMapProps {
  levels: InfernoLevel[];
  /** A painting of the same layout to show in place of the drawing, twice as tall as it is wide */
  painting?: string;
  /** A sharper picture of the lowest circle, laid over the painting when the page closes in on it */
  closeup?: string;
  /** Each level's outline on the painting, in the painting's pixels (1024 by 2048) */
  outlines?: Record<string, MapOutline>;
}

/** Where every level under the surface sits in the drawing */
function layout(levels: InfernoLevel[]) {
  const [surface, ...below] = levels;

  let y = SKY + 16;
  const bands = below.map((level, i) => {
    const top = y;
    const bottom = top + (HEIGHTS[level.id] ?? 78);
    y = bottom + GAP;
    const halfTop = 325 - i * 18;
    const halfBottom = halfTop - 7;
    const points = `${CX - halfTop},${top} ${CX + halfTop},${top} ${CX + halfBottom},${bottom} ${CX - halfBottom},${bottom}`;
    return { level, top, bottom, halfTop, halfBottom, points };
  });
  const floor = y - GAP;
  const height = floor + 60;
  return { surface, bands, floor, height };
}

/** How much wider the whole map, with its column of names, is than its painting */
export function infernoMapWidthRatio(levels: InfernoLevel[]) {
  return W / (layout(levels).height / 2);
}

/** Where the sharper picture of the lowest circle lies on the painting, in the painting's pixels */
const CLOSEUP = { x: 212, y: 1748, width: 600, height: 300 };

export default function InfernoMap({ levels, painting, outlines, closeup }: InfernoMapProps) {
  const { surface, bands, floor, height } = layout(levels);
  /** From the painting's pixels to the drawing's units */
  const k = height / 2048;
  const paintedShape = (id: string) => {
    const outline = painting ? outlines?.[id] : undefined;
    if (!outline) return null;
    const box = outlineBox(outline);
    return {
      polygon: <polygon className={hitClass} points={outlinePoints(outline)} transform={`scale(${k})`} filter="url(#inferno-feather)" />,
      middle: ((box.top + box.bottom) / 2) * k,
      right: box.right * k,
    };
  };
  const surfaceShape = paintedShape(surface.id);

  return (
    <nav aria-label="The levels of Hell">
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full rounded-lg" style={{ backgroundColor: painting ? PAINTED_ROCK : EARTH }}>
        <defs>
          <linearGradient id="inferno-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(222 42% 11%)" />
            <stop offset="0.5" stopColor="hsl(252 26% 21%)" />
            <stop offset="0.82" stopColor="hsl(345 40% 38%)" />
            <stop offset="1" stopColor="hsl(28 78% 58%)" />
          </linearGradient>
          <linearGradient id="inferno-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={PAINTED_ROCK} stopOpacity="0" />
            <stop offset="1" stopColor={PAINTED_ROCK} />
          </linearGradient>
          <linearGradient id="inferno-earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(26 24% 14%)" />
            <stop offset="0.6" stopColor="hsl(18 22% 9%)" />
            <stop offset="1" stopColor="hsl(215 25% 8%)" />
          </linearGradient>
          {/* Every cavern is darker under its roof and lit toward its floor */}
          <linearGradient id="inferno-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0.62" />
            <stop offset="0.5" stopColor="black" stopOpacity="0.12" />
            <stop offset="0.85" stopColor="white" stopOpacity="0.07" />
            <stop offset="1" stopColor="black" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="inferno-sides" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="black" stopOpacity="0.5" />
            <stop offset="0.14" stopColor="black" stopOpacity="0" />
            <stop offset="0.86" stopColor="black" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="inferno-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(205 28% 34%)" />
            <stop offset="1" stopColor="hsl(215 35% 12%)" />
          </linearGradient>
          <linearGradient id="inferno-blood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(2 85% 50%)" />
            <stop offset="1" stopColor="hsl(355 75% 24%)" />
          </linearGradient>
          <linearGradient id="inferno-ice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(195 65% 88%)" />
            <stop offset="1" stopColor="hsl(205 50% 58%)" />
          </linearGradient>
          <linearGradient id="inferno-ember" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(14 90% 45%)" stopOpacity="0" />
            <stop offset="0.5" stopColor="hsl(14 90% 45%)" stopOpacity="0.55" />
            <stop offset="1" stopColor="hsl(14 90% 45%)" stopOpacity="0" />
          </linearGradient>
          {(
            [
              ['fire', 'hsl(30 100% 60%)'],
              ['gold', 'hsl(46 100% 72%)'],
              ['ice', 'hsl(195 90% 88%)'],
            ] as const
          ).map(([kind, color]) => (
            <radialGradient key={kind} id={`inferno-glow-${kind}`}>
              <stop offset="0" stopColor={color} stopOpacity="0.7" />
              <stop offset="0.45" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
          {/* Breaks the caverns' straight edges into rock */}
          <filter id="inferno-rough" x="-5%" y="-15%" width="110%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="inferno-feather" x="-2%" y="-10%" width="104%" height="120%">
            <feGaussianBlur stdDeviation="1" />
          </filter>
          <filter id="inferno-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.88  0 0 0 0 0.76  0 0 0 0.55 -0.2" />
          </filter>
          {bands.map(({ level, points }) => (
            <clipPath key={level.id} id={`inferno-clip-${level.id}`}>
              <polygon points={points} />
            </clipPath>
          ))}
        </defs>

        {painting ? (
          <g aria-hidden="true">
            <image href={painting} width={height / 2} height={height} preserveAspectRatio="none" />
            {closeup && (
              <>
                <defs>
                  <filter id="inferno-closeup-blur" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation={8 * k} />
                  </filter>
                  <mask id="inferno-closeup-edge">
                    <rect
                      x={(CLOSEUP.x + 14) * k}
                      y={(CLOSEUP.y + 14) * k}
                      width={(CLOSEUP.width - 28) * k}
                      height={(CLOSEUP.height - 28) * k}
                      fill="white"
                      filter="url(#inferno-closeup-blur)"
                    />
                  </mask>
                </defs>
                <image
                  data-closeup
                  href={closeup}
                  x={CLOSEUP.x * k}
                  y={CLOSEUP.y * k}
                  width={CLOSEUP.width * k}
                  height={CLOSEUP.height * k}
                  preserveAspectRatio="none"
                  mask="url(#inferno-closeup-edge)"
                  opacity="0"
                />
              </>
            )}
            <rect className="xl:hidden" x={height / 2 - 90} width="91" height={height} fill="url(#inferno-edge)" />
          </g>
        ) : (
          <g aria-hidden="true">
            <Rock height={height} />
          </g>
        )}

        <a href={`#${surface.id}`} aria-label={surface.name} className={linkClass}>
          {painting ? (
            (surfaceShape?.polygon ?? <rect className={hitClass} width={height / 2} height={SKY + 8} />)
          ) : (
            <>
              <g aria-hidden="true">
                <Surface />
              </g>
              <path className="band" d={wave(-10, W + 10, SKY + 1, 2.5, 90)} fill="none" stroke={surface.color} strokeWidth="7" />
            </>
          )}
          <Label y={48}>{surface.shortName ?? surface.name}</Label>
        </a>

        {bands.map(({ level, top, bottom, halfTop, halfBottom, points }) => {
          const shape = paintedShape(level.id);
          const middle = shape?.middle ?? (top + bottom) / 2;
          const left = CX - halfBottom + 12;
          const right = CX + halfBottom - 12;
          const scene = SCENES[level.id];
          return (
            <a
              key={level.id}
              href={`#${level.id}`}
              aria-label={level.circle ? `Circle ${level.circle}: ${level.name}` : level.name}
              className={linkClass}
            >
              {painting ? (
                (shape?.polygon ?? <polygon className={hitClass} points={points} />)
              ) : (
                <g filter="url(#inferno-rough)">
                  <polygon points={points} fill="black" opacity="0.55" transform="translate(0 5)" />
                  <polygon className="band" points={points} fill={level.color} />
                  <polygon points={points} fill="url(#inferno-shade)" />
                  <polygon points={points} fill="url(#inferno-sides)" />
                </g>
              )}
              <g aria-hidden="true">
                {!painting && (
                  <g clipPath={`url(#inferno-clip-${level.id})`}>
                    {scene?.({ l: left + (level.circle ? 50 : 0), r: right, t: top, b: bottom })}
                  </g>
                )}
                {!painting && level.circle && (
                  <text
                    x={left + 20}
                    y={middle + 15}
                    fontSize="44"
                    textAnchor="middle"
                    fill={PARCHMENT}
                    stroke="black"
                    strokeOpacity="0.35"
                    strokeWidth="4"
                    paintOrder="stroke"
                    className="font-serif"
                  >
                    {level.circle}
                  </text>
                )}
                <line
                  className="xl:hidden"
                  x1={shape ? shape.right + 8 : CX + (halfTop + halfBottom) / 2 + 8}
                  y1={middle}
                  x2={LABEL_X - 12}
                  y2={middle}
                  stroke={PARCHMENT}
                  strokeOpacity="0.4"
                  strokeDasharray="2 5"
                />
              </g>
              <Label y={middle}>
                {painting && level.circle && (
                  <tspan className="font-serif" fontSize="34" fillOpacity="0.75">
                    {level.circle}{' '}
                  </tspan>
                )}
                {level.shortName ?? level.name}
              </Label>
            </a>
          );
        })}

        {!painting && (
          <text x={CX} y={floor + 38} fontSize="23" textAnchor="middle" fill={PARCHMENT} fillOpacity="0.65" className="font-sans">
            The center of the earth
          </text>
        )}

        {/* Paper grain over the whole drawing */}
        {!painting && <rect width={W} height={height} filter="url(#inferno-grain)" opacity="0.5" pointerEvents="none" aria-hidden="true" />}
      </svg>
    </nav>
  );
}
