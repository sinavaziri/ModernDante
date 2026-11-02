require('dotenv').config({ path: process.env.ENV_FILE || '.env.local' });

const fs = require('fs');
const path = require('path');

// Colorize Doré engravings with OpenAI's image edit endpoint.
// Usage:
//   node scripts/colorize-images.js inferno/1.png purgatorio/80.png ...
//   REFERENCE=inferno/1.png node scripts/colorize-images.js all
// Originals in public/images are never modified; output goes to public/images-color.

const MODEL = process.env.MODEL || 'gpt-image-2.5-sunburst';
const QUALITY = process.env.QUALITY || 'high';
// The default filter ('auto') refused most of the classical nudes; 'low' is OpenAI's documented alternative.
const MODERATION = process.env.MODERATION || 'low';
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images-color');
const MAPPINGS_PATH = path.join(__dirname, '..', 'src', 'data', 'image-mappings.json');
const MANIFEST_PATH = path.join(__dirname, '..', 'src', 'data', 'colorized-images.json');

const BASE_STYLE = `Context: this is a public-domain fine-art engraving by Gustave Doré (1857–1868), one of his famous illustrations for Dante's Divine Comedy, a classic of world literature. Any nudity depicts the souls of the dead in the classical, non-sexual tradition of 19th-century academic art.

Colorize this black-and-white Gustave Doré engraving.
Preserve the original exactly: same composition, figures, poses, faces, anatomy, and every line of the engraving's hatching and crosshatching. Do not add, remove, move, or redraw anything. Do not crop or change the framing.
Add color only, as if a 19th-century old-master painter glazed translucent oil color over the engraving: rich but restrained, naturalistic skin tones, painterly atmospheric depth, the engraved linework still visible beneath the color. Keep the original light and shadow structure.
No modern digital look, no oversaturation, no neon, no text, no borders.`;

const CANTICA_PALETTES = {
  inferno: 'Palette for Inferno: smoky, ember-lit darkness — deep umbers, burnt sienna, charcoal, oxblood red, with flickering orange and amber firelight; sickly greenish-grey in the murkiest depths.',
  purgatorio: 'Palette for Purgatorio: hopeful dawn light — cool sea-greens and slate blues, soft rose and pale gold at the horizon, weathered stone greys and earthy ochres on the mountain.',
  paradiso: 'Palette for Paradiso: luminous and radiant — warm whites, pale gold, soft ivory and celestial pale blue, light that seems to glow from within, gentle pearlescent highlights.',
};

const REFERENCE_NOTE = 'The second image is an approved colorized example from this series. Match its color treatment, painterly finish, saturation level, and overall mood so the set looks consistent, while using the palette above for this scene.';

function buildPrompt(cantica, title, hasReference) {
  return [
    BASE_STYLE,
    CANTICA_PALETTES[cantica],
    title ? `This scene is titled "${title}".` : '',
    hasReference ? REFERENCE_NOTE : '',
  ].filter(Boolean).join('\n\n');
}

async function colorize(relPath, reference, titles) {
  const [cantica, filename] = relPath.split('/');
  const outPath = path.join(OUTPUT_DIR, cantica, filename);
  if (fs.existsSync(outPath) && !process.env.FORCE) {
    console.log(`⏭️  ${relPath} already colorized (set FORCE=1 to redo)`);
    return;
  }

  const form = new FormData();
  form.append('model', MODEL);
  form.append('prompt', buildPrompt(cantica, titles[relPath], !!reference));
  form.append('size', 'auto');
  form.append('quality', QUALITY);
  form.append('moderation', MODERATION);
  form.append('image[]', new Blob([fs.readFileSync(path.join(IMAGES_DIR, relPath))], { type: 'image/png' }), filename);
  if (reference) {
    form.append('image[]', new Blob([fs.readFileSync(path.join(OUTPUT_DIR, reference))], { type: 'image/png' }), 'reference.png');
  }

  const started = Date.now();
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${result.error?.message || JSON.stringify(result)}`);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(result.data[0].b64_json, 'base64'));
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`✅ ${relPath} → ${path.relative(process.cwd(), outPath)} (${seconds}s)${result.usage ? ' usage: ' + JSON.stringify(result.usage) : ''}`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found. Set ENV_FILE to the .env.local that has it.');
    process.exit(1);
  }

  const { images } = JSON.parse(fs.readFileSync(MAPPINGS_PATH, 'utf-8'));
  const titles = Object.fromEntries(images.map(img => [`${img.cantica}/${img.filename}`, img.title]));

  const args = process.argv.slice(2);
  const targets = args[0] === 'all' ? Object.keys(titles) : args;
  if (targets.length === 0) {
    console.error('Usage: node scripts/colorize-images.js <cantica/file.png ...> | all');
    process.exit(1);
  }

  const reference = process.env.REFERENCE;
  console.log(`🎨 Colorizing ${targets.length} image(s) with ${MODEL}${reference ? `, reference ${reference}` : ''}`);

  let failed = 0;
  for (const target of targets) {
    try {
      await colorize(target, reference, titles);
    } catch (error) {
      failed++;
      console.error(`❌ ${target}: ${error.message}`);
    }
  }
  writeManifest();
  if (failed) process.exit(1);
}

// List colorized images so the app (getImageSrc) knows which ones to use
function writeManifest() {
  const files = ['inferno', 'purgatorio', 'paradiso'].flatMap(cantica => {
    const dir = path.join(OUTPUT_DIR, cantica);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => `${cantica}/${f}`) : [];
  });
  files.sort((a, b) => a.split('/')[0].localeCompare(b.split('/')[0]) || parseInt(a.split('/')[1]) - parseInt(b.split('/')[1]));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(files, null, 2) + '\n');
  console.log(`📝 ${files.length} colorized images listed in ${path.relative(process.cwd(), MANIFEST_PATH)}`);
}

main();
