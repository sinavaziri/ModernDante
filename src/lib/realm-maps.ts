// The plans of Purgatory and Paradise for their map pages, in the order Dante travels them: from the
// foot of the picture to its top. Hell's plan is in inferno-map.ts.

import type { InfernoLevel } from '@/lib/inferno-map';

/** A level of any of the three realms. `circle` holds the number of the circle, terrace or heaven. */
export type MapLevel = InfernoLevel;

/** The outline of a level on its painting, as corners in the painting's pixels (1024 wide, 2048 tall) */
export type MapOutline = [number, number][];

export type MapRealm = 'purgatorio' | 'paradiso';

export const PAINTING = { width: 1024, height: 2048, center: 512 };

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const PURGATORIO: MapLevel[] = [
  {
    id: 'shore',
    name: 'The Shore',
    what: 'The island at the bottom of the world',
    scene: 'Dante and Virgil come out under the stars at dawn. Cato keeps the shore, and an angel ferries in the newly dead.',
    cantos: [1, 2],
    color: 'hsl(205 30% 36%)',
  },
  {
    id: 'ante-purgatory',
    name: 'Ante-Purgatory',
    what: 'Those who repented late, waiting to begin',
    scene: 'The lower slopes, outside the gate. Souls who put off repentance wait here before they may climb.',
    cantos: range(3, 8),
    partsLabel: 'Four groups',
    parts: [
      { name: 'The excommunicated', who: 'Died at odds with the Church', cantos: [3] },
      { name: 'The lazy', who: 'Put repentance off to the end', cantos: [4] },
      { name: 'The unabsolved', who: 'Died by violence, repenting at the last moment', cantos: [5, 6] },
      { name: 'Valley of the Rulers', who: 'Kings and princes too busy to look to their souls', cantos: [7, 8] },
    ],
    color: 'hsl(95 18% 30%)',
  },
  {
    id: 'gate',
    name: 'The Gate of Purgatory',
    shortName: 'The Gate',
    what: 'Three steps and an angel with two keys',
    scene: 'Dante is carried up in his sleep. The angel cuts seven P’s on his forehead, one for each sin to be washed away.',
    cantos: [9],
    color: 'hsl(30 12% 38%)',
  },
  {
    id: 'terrace-1',
    circle: 1,
    name: 'Pride',
    what: 'The proud',
    scene: 'They creep along bent double under great stones, past carvings of humility cut into the cliff.',
    cantos: [10, 11, 12],
    color: 'hsl(28 16% 42%)',
  },
  {
    id: 'terrace-2',
    circle: 2,
    name: 'Envy',
    what: 'The envious',
    scene: 'They sit against the grey rock in haircloth, leaning on each other, their eyelids sewn shut with wire.',
    cantos: [13, 14, 15],
    color: 'hsl(215 10% 40%)',
  },
  {
    id: 'terrace-3',
    circle: 3,
    name: 'Wrath',
    what: 'The angry',
    scene: 'They walk praying through smoke as dark as night. Marco the Lombard speaks of free will.',
    cantos: [15, 16, 17],
    color: 'hsl(260 6% 30%)',
  },
  {
    id: 'terrace-4',
    circle: 4,
    name: 'Sloth',
    what: 'Those slow to love the good',
    scene: 'They run without rest, shouting examples of zeal. Here, halfway up, Virgil explains how love orders the mountain.',
    cantos: [17, 18, 19],
    color: 'hsl(225 28% 32%)',
  },
  {
    id: 'terrace-5',
    circle: 5,
    name: 'Greed',
    what: 'The greedy and the wasteful',
    scene: 'They lie face down in the dust, bound hand and foot. The mountain shakes when Statius is set free.',
    cantos: [19, 20, 21],
    color: 'hsl(38 34% 36%)',
  },
  {
    id: 'terrace-6',
    circle: 6,
    name: 'Gluttony',
    what: 'The gluttons',
    scene: 'Wasted to skin and bone, they pass fruit trees and falling water they cannot reach.',
    cantos: [22, 23, 24],
    color: 'hsl(120 22% 28%)',
  },
  {
    id: 'terrace-7',
    circle: 7,
    name: 'Lust',
    what: 'The lustful',
    scene: 'They walk inside a wall of fire. Dante must pass through it too, and Virgil then gives him his freedom.',
    cantos: [25, 26, 27],
    color: 'hsl(14 60% 40%)',
  },
  {
    id: 'earthly-paradise',
    name: 'The Earthly Paradise',
    shortName: 'Earthly Paradise',
    what: 'The Garden of Eden, on the summit',
    scene: 'A forest with two rivers, Lethe and Eunoe. Beatrice comes in a great procession, and Virgil is gone.',
    cantos: range(28, 33),
    color: 'hsl(140 30% 30%)',
  },
];

const PARADISO: MapLevel[] = [
  {
    id: 'ascent',
    name: 'The Ascent',
    what: 'From the Earthly Paradise into the sky',
    scene: 'Beatrice looks into the sun, Dante looks at her, and they rise from the earth faster than lightning.',
    cantos: [1],
    color: 'hsl(140 26% 30%)',
  },
  {
    id: 'heaven-1',
    circle: 1,
    name: 'The Moon',
    what: 'Those who broke their vows',
    scene: 'Faint faces like reflections in water. Piccarda explains that every soul here is content with its place.',
    cantos: [2, 3, 4, 5],
    color: 'hsl(210 16% 62%)',
  },
  {
    id: 'heaven-2',
    circle: 2,
    name: 'Mercury',
    what: 'Those who did good for the sake of fame',
    scene: 'Lights crowd toward Dante like fish to food. The emperor Justinian tells the history of Rome.',
    cantos: [5, 6, 7],
    color: 'hsl(190 30% 46%)',
  },
  {
    id: 'heaven-3',
    circle: 3,
    name: 'Venus',
    what: 'The lovers',
    scene: 'The last heaven touched by the earth’s shadow. Charles Martel, Cunizza and Folco speak.',
    cantos: [8, 9],
    color: 'hsl(335 34% 50%)',
  },
  {
    id: 'heaven-4',
    circle: 4,
    name: 'The Sun',
    what: 'The wise',
    scene: 'Teachers and theologians dance in rings of light around Dante and Beatrice. Aquinas and Bonaventure speak.',
    cantos: range(10, 14),
    color: 'hsl(42 80% 50%)',
  },
  {
    id: 'heaven-5',
    circle: 5,
    name: 'Mars',
    what: 'Those who fought for the faith',
    scene: 'Their lights form a great cross. Dante’s ancestor Cacciaguida foretells his exile.',
    cantos: range(14, 18),
    color: 'hsl(6 62% 44%)',
  },
  {
    id: 'heaven-6',
    circle: 6,
    name: 'Jupiter',
    what: 'The just rulers',
    scene: 'The souls spell out a call to justice, then take the shape of an eagle that speaks with one voice.',
    cantos: [18, 19, 20],
    color: 'hsl(48 30% 62%)',
  },
  {
    id: 'heaven-7',
    circle: 7,
    name: 'Saturn',
    what: 'The contemplatives',
    scene: 'A golden ladder rises out of sight. Peter Damian and Benedict come down it; here Beatrice does not smile.',
    cantos: [21, 22],
    color: 'hsl(40 40% 40%)',
  },
  {
    id: 'heaven-8',
    circle: 8,
    name: 'The Fixed Stars',
    what: 'The Church triumphant',
    scene: 'Christ and Mary appear. Peter, James and John examine Dante on faith, hope and love, and Adam speaks.',
    cantos: range(22, 27),
    color: 'hsl(225 45% 34%)',
  },
  {
    id: 'heaven-9',
    circle: 9,
    name: 'The Primum Mobile',
    shortName: 'Primum Mobile',
    what: 'The angels',
    scene: 'The outermost sphere, which turns all the others. Nine rings of angels circle a point of light.',
    cantos: [27, 28, 29],
    color: 'hsl(200 40% 70%)',
  },
  {
    id: 'heaven-10',
    circle: 10,
    name: 'The Empyrean',
    what: 'The home of God, the angels and the blessed',
    scene: 'Beyond space and time. The blessed sit in a white rose, Bernard takes Beatrice’s place, and Dante sees God.',
    cantos: range(30, 33),
    color: 'hsl(45 70% 72%)',
  },
];

export function getRealmLevels(realm: MapRealm): MapLevel[] {
  return realm === 'purgatorio' ? PURGATORIO : PARADISO;
}

/** The levels a canto of Purgatorio or Paradiso passes through, in order */
export function getRealmLevelsForCanto(realm: MapRealm, canto: number): MapLevel[] {
  return getRealmLevels(realm).filter(level => level.cantos.includes(canto));
}

/** What a numbered level is called in each realm */
export const LEVEL_WORD: Record<'inferno' | MapRealm, string> = {
  inferno: 'Circle',
  purgatorio: 'Terrace',
  paradiso: 'Heaven',
};

// Every level's outline, traced on the painting that the map page shows. A new painting needs new
// outlines: the pointer's highlight and the place of each level's text both come from these.
const OUTLINES: Record<'inferno' | MapRealm, Record<string, MapOutline>> = {
  // public/images-map/inferno-dore-b.webp
  inferno: {
    'dark-wood': [[0, 0], [1024, 0], [1024, 236], [760, 234], [500, 230], [250, 228], [0, 234]],
    'gate': [[22, 250], [1000, 248], [1002, 300], [992, 340], [985, 370], [48, 370], [30, 340], [18, 300]],
    'circle-1': [[45, 386], [975, 386], [972, 440], [962, 505], [66, 505], [58, 440]],
    'circle-2': [[72, 514], [955, 514], [940, 600], [930, 642], [95, 642], [86, 600]],
    'circle-3': [[98, 652], [925, 652], [922, 720], [915, 778], [108, 778], [100, 720]],
    'circle-4': [[112, 792], [905, 792], [900, 893], [122, 893]],
    'circle-5': [[136, 905], [882, 905], [872, 1034], [150, 1034]],
    'dis': [[158, 1042], [862, 1042], [860, 1164], [165, 1164]],
    'circle-6': [[178, 1175], [851, 1175], [838, 1284], [192, 1284]],
    'circle-7': [[196, 1292], [825, 1292], [815, 1400], [800, 1512], [212, 1512], [200, 1400]],
    'circle-8': [[214, 1520], [798, 1520], [790, 1600], [786, 1654], [222, 1654], [218, 1600]],
    'giants': [[232, 1662], [778, 1662], [762, 1740], [752, 1806], [258, 1806], [245, 1740]],
    'circle-9': [[280, 1812], [730, 1812], [724, 1900], [714, 2004], [288, 2004], [284, 1900]],
  },
  // public/images-map/purgatorio-dore.webp: each level runs from its ledge up to the ledge above
  purgatorio: {
    'shore': [[0, 1800], [1024, 1800], [1024, 2048], [0, 2048]],
    'ante-purgatory': [[10, 1595], [1008, 1595], [1024, 1650], [1024, 1800], [0, 1800], [0, 1660]],
    'gate': [[50, 1422], [975, 1422], [995, 1500], [1008, 1595], [10, 1595], [28, 1500]],
    'terrace-1': [[88, 1272], [935, 1272], [960, 1350], [975, 1422], [50, 1422], [68, 1350]],
    'terrace-2': [[140, 1122], [870, 1122], [900, 1190], [935, 1272], [88, 1272], [110, 1190]],
    'terrace-3': [[160, 995], [845, 995], [858, 1060], [870, 1122], [140, 1122], [150, 1060]],
    'terrace-4': [[190, 858], [812, 858], [830, 930], [845, 995], [160, 995], [172, 930]],
    'terrace-5': [[222, 738], [785, 738], [800, 800], [812, 858], [190, 858], [205, 800]],
    'terrace-6': [[255, 588], [762, 588], [775, 660], [785, 738], [222, 738], [232, 660]],
    'terrace-7': [[292, 462], [752, 462], [758, 520], [762, 588], [255, 588], [262, 520]],
    'earthly-paradise': [[285, 232], [340, 205], [400, 190], [500, 200], [540, 200], [600, 190], [700, 195], [765, 225], [762, 320], [758, 400], [752, 462], [292, 462], [270, 400], [280, 300]],
  },
  // public/images-map/paradiso-dore.webp: the heavens part at the cloud banks
  paradiso: {
    'ascent': [[0, 1860], [1024, 1860], [1024, 2048], [0, 2048]],
    'heaven-1': [[0, 1695], [1024, 1695], [1024, 1860], [0, 1860]],
    'heaven-2': [[0, 1530], [1024, 1530], [1024, 1695], [0, 1695]],
    'heaven-3': [[0, 1365], [1024, 1365], [1024, 1530], [0, 1530]],
    'heaven-4': [[0, 1200], [1024, 1200], [1024, 1365], [0, 1365]],
    'heaven-5': [[0, 1030], [1024, 1030], [1024, 1200], [0, 1200]],
    'heaven-6': [[0, 860], [1024, 860], [1024, 1030], [0, 1030]],
    'heaven-7': [[0, 695], [1024, 695], [1024, 860], [0, 860]],
    'heaven-8': [[0, 525], [1024, 525], [1024, 695], [0, 695]],
    'heaven-9': [[0, 335], [1024, 335], [1024, 525], [0, 525]],
    'heaven-10': [[0, 0], [1024, 0], [1024, 335], [0, 335]],
  },
};

export function getMapOutlines(realm: 'inferno' | MapRealm): Record<string, MapOutline> {
  return OUTLINES[realm];
}

/** An outline as the points of an SVG polygon */
export function outlinePoints(outline: MapOutline): string {
  return outline.map(([x, y]) => `${x},${y}`).join(' ');
}

/** The box around an outline */
export function outlineBox(outline: MapOutline) {
  const xs = outline.map(([x]) => x);
  const ys = outline.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

/** How far down its painting each level starts and ends, from 0 to 1 */
export function getMapSpans(realm: 'inferno' | MapRealm): Record<string, { top: number; bottom: number }> {
  return Object.fromEntries(
    Object.entries(OUTLINES[realm]).map(([id, outline]) => {
      const { top, bottom } = outlineBox(outline);
      return [id, { top: top / PAINTING.height, bottom: bottom / PAINTING.height }];
    })
  );
}
