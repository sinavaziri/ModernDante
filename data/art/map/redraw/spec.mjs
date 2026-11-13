const ART = '/Users/Sina/ModernDante/data/art/map/';
const pair = 'The two travellers are a pair of small figures, one in a long red robe and red cap, one in a blue robe with a laurel wreath; keep them small, as on a map.';
export const REALMS = {
  inferno: {
    base: ART + 'inferno-dore-c.png',
    place: 'Hell, cut open like a funnel: a stack of caverns in dark rock, one under another, each narrower than the one above',
    unit: 'cavern',
    pair: pair + ' The souls of the dead are pale, muscular figures, modestly posed, seen small.',
    levels: {
      'dark-wood': [[1], 'a dense wood of huge, old, gnarled, twisted trees with thick roots and undergrowth at night; the lone small figure in the red robe among the trunks; at the far right a hill with the sun rising behind it'],
      'gate': [[8, 9], 'on the left a dark natural cave mouth at the foot of a bare cliff under a heavy sky, with the red and blue pair before it; on the right a dark river with rough white-capped waves and the ferryman of Plate 9: old and powerful, with wild white hair and beard, driving his boat with an oar; a huddle of pale souls on the bank'],
      'circle-1': [[12], 'a green meadow in soft golden light with a grove of tall leafy trees; a group of robed ancient poets with laurel wreaths standing and sitting in talk, the red and blue pair among them; behind them a small castle with towers and warmly lit windows'],
      'circle-2': [[14], 'a dark violet-blue storm void; a vast spiralling stream of tiny pale figures swept through the air like a flock of birds, glowing faintly; the red and blue pair watching from a jagged crag at the left'],
      'circle-3': [[19], 'cold rain and sleet on dark mud between rocks, pale figures lying in the mire; at the right the huge crouching three-headed hound of Plate 19, snarling low over the ground, with the blue-robed figure throwing earth to it'],
      'circle-4': [[22], 'on bare tawny ground, two crowds of muscular men straining with chest and shoulders against huge round weights like bulging boulders, pushing toward each other from left and right'],
      'circle-5': [[24], 'a dark grey-green marsh under a stormy sky; a boat carrying the red and blue pair, the boatman standing at the stern, with figures struggling in the water and clutching at the boat; a small tower with a signal flame at the left'],
      'dis': [[26], 'a long fortified city wall with towers and a central gate, glowing dark red, under a sky of fire and smoke, flames on the tower tops; dark water at its foot'],
      'circle-6': [[29], 'a dark plain strewn with open stone tombs set at different angles, their lids pushed aside, fire and smoke rising from each; the red and blue pair walking between them'],
      'circle-7': [[33, 35, 38], 'three layers in one cavern. Top (Plate 33): a red river with figures sunk in it, and centaurs with bows on the bank. Middle (Plate 35): a wood of bare, thick, knotted trees whose trunks and branches look like twisted limbs, with harpies (birds with women\'s faces) perched in them. Bottom (Plate 38): a plain of hot sand crowded with figures lying, crouching and running under a slow rain of fire flakes'],
      'circle-8': [[45, 51], 'ten deep ditches side by side in grey stone, each crossed by a small arched stone bridge. In one ditch, flames burn on the soles of feet sticking out of round holes; in another, a slow file of figures in heavy hooded gilded cloaks; a glow of fire in two more. The red and blue pair on a bridge'],
      'giants': [[65], 'towering giants standing in a ring of stone like a well, seen from the waist up above its rim: massive, muscular, bearded, bound with heavy chains, one bowed with his arm chained across his chest'],
    },
  },
  purgatorio: {
    base: ART + 'purgatorio-dore.png',
    place: 'the Mountain of Purgatory: a steep mountain island with ledges cut into its face like shelves, one above another, each narrower than the one below, under an open sky',
    unit: 'ledge',
    pair,
    levels: {
      'shore': [[77, 79], 'a sandy beach with reeds at dawn; on the water at the left a boat full of souls in white, steered by a tall angel with great white wings; on the beach the red and blue pair with an old man with a long white beard'],
      'ante-purgatory': [[80, 82, 87], 'green lower slopes; at the left tired figures resting in the shade of a great boulder; at the right a flowering valley where robed kings sit together on the grass; two angels in the air above it'],
      'gate': [[91], 'a narrow gate in a cleft of the cliff, reached by three steps (one white, one dark, one red), with an angel in pale robes seated on the top step holding a sword; the red figure kneeling at the steps, the blue one beside him'],
      'terrace-1': [[93], 'figures creeping along the ledge bent double under huge slabs of stone on their backs; figures carved in relief on the cliff wall behind them'],
      'terrace-2': [[95], 'figures in coarse grey-blue cloaks sitting huddled in a row against the bare cliff, leaning on one another like blind beggars'],
      'terrace-3': [[98], 'the ledge filled with thick, rolling, dark grey smoke; figures walking through it, half seen'],
      'terrace-4': [[100], 'a crowd in pale robes running at full speed along the ledge, legs striding and robes flying, at dusk'],
      'terrace-5': [[102], 'many figures lying stretched face down on the ground all along the ledge'],
      'terrace-6': [[105, 106], 'thin figures gathered under a tall leafy fruit tree, reaching up toward it; a second tree further along; clear water falling down the cliff'],
      'terrace-7': [[109], 'a wall of flames burning all along the ledge, with figures walking inside the fire; a narrow path at the outer edge where the red and blue pair walk'],
      'earthly-paradise': [[111, 112, 114], 'a lush, sunlit forest of tall old trees with flowers and a clear stream; a procession of elders in white with a chariot drawn by a griffin; a veiled woman in white, green and red among angels and falling flowers, and the red figure standing before her'],
    },
  },
  paradiso: {
    base: ART + 'paradiso-dore.png',
    place: 'Paradise: layers of cloud and light stacked one above another, each with its planet as a sphere at the left',
    unit: 'layer',
    pair: 'The two travellers are a pair of small figures standing on a cloud, one in a long red robe and red cap, one a woman in white with a halo; keep them small, as on a map. The blessed souls are figures of light in white and gold.',
    levels: {
      'ascent': [[], 'the curve of the earth with a green forested mountain top, and the red and white pair rising from it into the sky'],
      'heaven-1': [[118], 'the Moon, a pale pearl-grey sphere: a few faint, translucent women in white veils standing in mist, like reflections'],
      'heaven-2': [[119], 'Mercury, a small bright sphere: a great host of radiant figures in white streaming toward the pair in shafts of light'],
      'heaven-3': [[120], 'Venus, a soft rose-white sphere: shining figures on banks of cloud, one haloed figure raising his arm in a beam of light'],
      'heaven-4': [[121], 'the Sun, a blazing golden sphere: two great rings of radiant figures, one inside the other, circling like garlands around the pair'],
      'heaven-5': [[122, 123], 'Mars, a red sphere: a vast glowing cross made of countless souls and angels, with the pair before it'],
      'heaven-6': [[125, 127], 'Jupiter, a silver-white sphere: countless lights gathered into the shape of a great eagle with spread wings'],
      'heaven-7': [[130], 'Saturn, a dull gold sphere: a golden ladder rising out of sight, with shining figures going up and down it'],
      'heaven-8': [[131, 132], 'the fixed stars, the sky thick with stars: three robed and bearded apostles speaking with the kneeling red figure; hosts of angels above'],
      'heaven-9': [[133], 'the outermost sphere, clear as crystal: nine wide rings of angels, one inside another, turning around one tiny, piercing point of light'],
      'heaven-10': [[134, 135], 'the celestial rose: an immense round amphitheatre of angels and blessed souls in ring upon ring around a blinding white light at its center, with a crowned queen in blue enthroned among angels; the pair, tiny, looking up at it'],
    },
  },
};
// Plain sharpening, no plate: the way out (whole painting) and the part of the rising that is shown
export const TILES = {
  passage: { base: ART + 'passage-dore.png', what: 'a cross-section through dark rock: a cavern of ice at the bottom with two giant shaggy legs rising from it, a narrow winding channel with a stream climbing through the rock, and a sea shore under the stars at the top', crops: [[0, 0], [0, 384], [0, 768], [0, 1152], [0, 1536]] },
  ascent: { base: ART + 'ascent-dore.png', what: 'the open sky above a mountain top: two small robed figures rising side by side through the air beside a blazing sun, among clouds and stars', crops: [[0, 480], [0, 900]] },
};
