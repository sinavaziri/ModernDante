// The plan of Dante's Hell, top to bottom, for the map page and the "where am I" line on a canto.

/** A ring, ditch or zone inside a circle */
export interface InfernoPart {
  name: string;
  /** Who is punished there */
  who: string;
  cantos: number[];
}

export interface InfernoLevel {
  /** Used in the map's address, as in /map#circle-7 */
  id: string;
  /** 1 to 9 for the circles; the places between them have none */
  circle?: number;
  name: string;
  /** A shorter name for the map's narrow bands */
  shortName?: string;
  /** The sin punished, or what the place is */
  what: string;
  /** One line on what Dante sees there */
  scene: string;
  cantos: number[];
  /** What the parts are called: rings, ditches or zones */
  partsLabel?: string;
  parts?: InfernoPart[];
  /** The band's color on the map: the ground of that level, from earth through fire to ice */
  color: string;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const LEVELS: InfernoLevel[] = [
  {
    id: 'dark-wood',
    name: 'The Dark Wood',
    what: 'Above ground, before Hell',
    scene: 'Dante is lost, three beasts block the hill, and Virgil comes to lead him the long way round.',
    cantos: [1, 2],
    color: 'hsl(110 16% 25%)',
  },
  {
    id: 'gate',
    name: 'The Gate and the River Acheron',
    shortName: 'The Gate',
    what: 'Those who never chose a side',
    scene: 'Past the gate the uncommitted chase a blank banner, stung by wasps. Charon ferries the damned across.',
    cantos: [3],
    color: 'hsl(30 7% 31%)',
  },
  {
    id: 'circle-1',
    circle: 1,
    name: 'Limbo',
    what: 'The unbaptized and the virtuous pagans',
    scene: 'No torment, only longing without hope. The great poets and philosophers live in a lit castle.',
    cantos: [4],
    color: 'hsl(42 24% 35%)',
  },
  {
    id: 'circle-2',
    circle: 2,
    name: 'Lust',
    what: 'Those ruled by desire',
    scene: 'Minos judges every soul at the entrance. The lustful are blown about in an endless storm.',
    cantos: [5],
    color: 'hsl(345 30% 34%)',
  },
  {
    id: 'circle-3',
    circle: 3,
    name: 'Gluttony',
    what: 'The gluttons',
    scene: 'They lie in mud under cold, filthy rain while Cerberus tears at them.',
    cantos: [6],
    color: 'hsl(28 20% 27%)',
  },
  {
    id: 'circle-4',
    circle: 4,
    name: 'Greed',
    what: 'Hoarders and spendthrifts',
    scene: 'Two crowds roll great weights against each other, forever shouting the same insults.',
    cantos: [7],
    color: 'hsl(38 38% 32%)',
  },
  {
    id: 'circle-5',
    circle: 5,
    name: 'Wrath',
    what: 'The angry and the sullen',
    scene: 'The angry fight in the marsh of the Styx; the sullen lie under it. Phlegyas rows the poets across.',
    cantos: [7, 8],
    color: 'hsl(165 14% 24%)',
  },
  {
    id: 'dis',
    name: 'The Walls of Dis',
    what: 'The city of lower Hell',
    scene: 'Fallen angels bar the gate and the Furies threaten, until a messenger from Heaven opens it.',
    cantos: [8, 9],
    color: 'hsl(8 30% 22%)',
  },
  {
    id: 'circle-6',
    circle: 6,
    name: 'Heresy',
    what: 'The heretics',
    scene: 'They lie in open tombs of fire. Here Virgil stops to explain how the rest of Hell is laid out.',
    cantos: [9, 10, 11],
    color: 'hsl(14 55% 35%)',
  },
  {
    id: 'circle-7',
    circle: 7,
    name: 'Violence',
    what: 'The violent',
    scene: 'Guarded by the Minotaur. The monster Geryon carries the poets down the cliff at its far edge.',
    cantos: range(12, 17),
    partsLabel: 'Three rings',
    parts: [
      { name: 'River of boiling blood', who: 'Violent against others', cantos: [12] },
      { name: 'Wood of the suicides', who: 'Violent against themselves', cantos: [13] },
      { name: 'Burning sand', who: 'Violent against God, nature and art', cantos: range(14, 17) },
    ],
    color: 'hsl(358 58% 31%)',
  },
  {
    id: 'circle-8',
    circle: 8,
    name: 'Fraud',
    what: 'The fraudulent, in the ten ditches of Malebolge',
    scene: 'Ten stone ditches ringed one inside the next, crossed by bridges of rock.',
    cantos: range(18, 30),
    partsLabel: 'Ten ditches',
    parts: [
      { name: 'First', who: 'Pimps and seducers', cantos: [18] },
      { name: 'Second', who: 'Flatterers', cantos: [18] },
      { name: 'Third', who: 'Sellers of church offices', cantos: [19] },
      { name: 'Fourth', who: 'Fortune tellers', cantos: [20] },
      { name: 'Fifth', who: 'Corrupt officials', cantos: [21, 22] },
      { name: 'Sixth', who: 'Hypocrites', cantos: [23] },
      { name: 'Seventh', who: 'Thieves', cantos: [24, 25] },
      { name: 'Eighth', who: 'False counselors', cantos: [26, 27] },
      { name: 'Ninth', who: 'Sowers of discord', cantos: [28, 29] },
      { name: 'Tenth', who: 'Falsifiers', cantos: [29, 30] },
    ],
    color: 'hsl(24 7% 27%)',
  },
  {
    id: 'giants',
    name: 'The Well of the Giants',
    shortName: 'The Giants',
    what: 'The giants who guard the lowest pit',
    scene: 'They stand chained around the pit like towers. Antaeus lowers the poets to the bottom.',
    cantos: [31],
    color: 'hsl(215 9% 23%)',
  },
  {
    id: 'circle-9',
    circle: 9,
    name: 'Treachery',
    what: 'The traitors, frozen in the lake of Cocytus',
    scene: 'The bottom of Hell is ice, not fire. At its center Lucifer chews Judas, Brutus and Cassius.',
    cantos: [32, 33, 34],
    partsLabel: 'Four zones',
    parts: [
      { name: 'Caina', who: 'Traitors to family', cantos: [32] },
      { name: 'Antenora', who: 'Traitors to country', cantos: [32, 33] },
      { name: 'Ptolomea', who: 'Traitors to guests', cantos: [33] },
      { name: 'Judecca', who: 'Traitors to their lords', cantos: [34] },
    ],
    color: 'hsl(205 34% 40%)',
  },
];

export function getInfernoLevels(): InfernoLevel[] {
  return LEVELS;
}

/** The levels an Inferno canto passes through, in order */
export function getInfernoLevelsForCanto(canto: number): InfernoLevel[] {
  return LEVELS.filter(level => level.cantos.includes(canto));
}
