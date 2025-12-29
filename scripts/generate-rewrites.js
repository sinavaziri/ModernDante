require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

const CANTOS_PATH = path.join(__dirname, '..', 'data', 'cantos.json');

// Mode: 'test' for just Canto I, 'inferno' for all Inferno, 'all' for everything
const MODE = process.env.MODE || 'test';

async function generateRewrites() {
  console.log('📖 Reading cantos data...');

  if (!fs.existsSync(CANTOS_PATH)) {
    console.error('❌ Cantos file not found. Run "npm run split" first.');
    process.exit(1);
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment.');
    console.error('Please create a .env.local file with your API key:');
    console.error('ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(CANTOS_PATH, 'utf-8'));
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log(`Mode: ${MODE}`);
  console.log('🤖 Initializing Claude API...');

  // Determine which cantos to process
  let cantosToProcess = [];

  if (MODE === 'test') {
    console.log('📝 Test mode: Processing only Inferno Canto I');
    cantosToProcess = [{ cantica: 'inferno', canto: data.inferno[0], index: 0 }];
  } else if (MODE === 'inferno') {
    console.log(`📝 Inferno mode: Processing all ${data.inferno.length} Inferno cantos`);
    cantosToProcess = data.inferno.map((canto, i) => ({ cantica: 'inferno', canto, index: i }));
  } else {
    console.log('📝 Full mode: Processing all cantos');
    cantosToProcess = [
      ...data.inferno.map((canto, i) => ({ cantica: 'inferno', canto, index: i })),
      ...data.purgatorio.map((canto, i) => ({ cantica: 'purgatorio', canto, index: i })),
      ...data.paradiso.map((canto, i) => ({ cantica: 'paradiso', canto, index: i })),
    ];
  }

  // Filter out cantos that already have modern versions
  const pendingCantos = cantosToProcess.filter(({ canto }) => !canto.modern);
  console.log(`✓ ${pendingCantos.length} cantos need modern rewrites`);

  if (pendingCantos.length === 0) {
    console.log('✅ All selected cantos already have modern versions!');
    return;
  }

  // Process each canto
  for (let i = 0; i < pendingCantos.length; i++) {
    const { cantica, canto, index } = pendingCantos[i];

    console.log(`\n[${i + 1}/${pendingCantos.length}] Generating modern version for ${cantica} Canto ${canto.number}...`);

    try {
      const prompt = `You are tasked with creating a modern English rewrite of a canto from Dante's Divine Comedy.

Original text from ${canto.title}:
---
${canto.original}
---

Please create a modern English version that:
1. Is clear, compelling, and accessible to contemporary readers
2. Faithfully preserves the original meaning, imagery, and narrative
3. Uses natural, modern English (avoid archaic words like "thee", "thou", "doth")
4. Flows naturally without forcing rhymes - use prose-poetry style
5. Maintains vivid, evocative language that captures the power of the original
6. Preserves the poetic and dramatic tone
7. Uses line breaks and paragraph structure for readability
8. Feels like a contemporary literary translation, not a simplified paraphrase

Return ONLY the modern rewrite, without any preamble, explanation, or commentary.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const modernVersion = message.content[0].text;

      // Update the data
      data[cantica][index].modern = modernVersion;

      console.log(`✓ Generated ${modernVersion.length} characters`);

      // Save after each successful generation
      fs.writeFileSync(CANTOS_PATH, JSON.stringify(data, null, 2), 'utf-8');
      console.log('✓ Saved to cantos.json');

      // Rate limiting: wait a bit between requests
      if (i < pendingCantos.length - 1) {
        console.log('⏳ Waiting 2 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error generating rewrite for ${cantica} Canto ${canto.number}:`, error.message);
      console.error('Stopping generation. Fix the issue and run again to continue.');
      process.exit(1);
    }
  }

  console.log('\n✅ All rewrites generated successfully!');
  console.log(`📁 Saved to: ${CANTOS_PATH}`);

  // Show preview
  const firstModern = data.inferno[0].modern;
  if (firstModern) {
    const preview = firstModern.substring(0, 300);
    console.log('\n📝 Preview of Inferno Canto I (modern):');
    console.log('---');
    console.log(preview);
    console.log('...');
  }
}

generateRewrites().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
