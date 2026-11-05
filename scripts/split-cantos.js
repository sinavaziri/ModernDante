const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'data', 'raw-text.txt');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'cantos.json');

// Roman numeral converter
const romanNumerals = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
  11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
  16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX',
  21: 'XXI', 22: 'XXII', 23: 'XXIII', 24: 'XXIV', 25: 'XXV',
  26: 'XXVI', 27: 'XXVII', 28: 'XXVIII', 29: 'XXIX', 30: 'XXX',
  31: 'XXXI', 32: 'XXXII', 33: 'XXXIII', 34: 'XXXIV', 35: 'XXXV',
  36: 'XXXVI', 37: 'XXXVII', 38: 'XXXVIII', 39: 'XXXIX', 40: 'XL'
};

function splitCantos() {
  console.log('📖 Reading raw text file...');

  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ Raw text file not found. Run "npm run parse" first.');
    process.exit(1);
  }

  const rawText = fs.readFileSync(INPUT_PATH, 'utf-8');
  console.log(`✓ Loaded ${rawText.length} characters`);

  console.log('🔍 Finding cantica divisions...');

  // Find the three parts
  const infernoMatch = rawText.match(/Part 1 Inferno/i);
  const purgatorioMatch = rawText.match(/Part 2 Purgatorio/i);
  const paradisoMatch = rawText.match(/Part 3 Paradiso/i);

  if (!infernoMatch || !purgatorioMatch || !paradisoMatch) {
    console.error('❌ Could not find all three parts in the text');
    process.exit(1);
  }

  const infernoStart = infernoMatch.index;
  const purgatorioStart = purgatorioMatch.index;
  const paradisoStart = paradisoMatch.index;

  console.log('✓ Found all three canticas');

  // Split by chapter markers
  const chapterRegex = /Chapter (\d+) ([^\n]+)\n/g;
  const matches = [...rawText.matchAll(chapterRegex)];

  console.log(`✓ Found ${matches.length} chapters total`);

  // Helper to extract canto content
  function extractCanto(match, i, allMatches, text) {
    const chapterNum = parseInt(match[1]);
    const fullTitle = match[2].trim();

    // The chapter line often contains both the descriptive title AND the start of the poem
    // Try to separate them by finding where verse content begins
    // Look for common patterns: capital letter starting a poetic line
    const versePatterns = [
      /\b(Midway|When|In|The time|As|If|From|Upon|Through|Not|One|O|And then|Then|There|Now)\b/i
    ];

    let title = fullTitle;
    let verseFromTitle = '';

    // Try to find where verse begins in the title line
    for (const pattern of versePatterns) {
      const verseMatch = fullTitle.match(pattern);
      if (verseMatch && verseMatch.index > 20) { // Must be reasonably far into the title
        title = fullTitle.substring(0, verseMatch.index).trim();
        verseFromTitle = fullTitle.substring(verseMatch.index).trim();
        break;
      }
    }

    // Extract content from subsequent lines
    const startPos = match.index + match[0].length;
    const endPos = i < allMatches.length - 1 ? allMatches[i + 1].index : text.length;
    const subsequentContent = text.substring(startPos, endPos).trim();

    // Combine verse from title line with subsequent content
    const fullContent = verseFromTitle
      ? verseFromTitle + ' ' + subsequentContent
      : subsequentContent;

    const lines = fullContent.split('\n').filter(line => line.trim().length > 0);

    return {
      chapterNum,
      title,
      content: lines.join('\n'),
      position: match.index
    };
  }

  // Re-running the split must not throw away translations that already exist
  const previous = fs.existsSync(OUTPUT_PATH) ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) : {};
  const existingModern = (cantica, number) =>
    previous[cantica]?.find(c => c.number === number)?.modern ?? null;

  console.log('📚 Organizing by cantica...');

  const data = {
    inferno: [],
    purgatorio: [],
    paradiso: [],
    metadata: {
      translator: 'Henry Wadsworth Longfellow',
      generatedAt: new Date().toISOString()
    }
  };

  // Process all chapters and assign to correct cantica
  matches.forEach((match, i) => {
    const canto = extractCanto(match, i, matches, rawText);
    const position = canto.position;

    let canticaName, cantoNumber;

    if (position >= infernoStart && position < purgatorioStart) {
      canticaName = 'inferno';
      cantoNumber = data.inferno.length + 1;
    } else if (position >= purgatorioStart && position < paradisoStart) {
      canticaName = 'purgatorio';
      cantoNumber = data.purgatorio.length + 1;
    } else if (position >= paradisoStart) {
      canticaName = 'paradiso';
      cantoNumber = data.paradiso.length + 1;
    } else {
      return; // Skip if before Inferno starts
    }

    data[canticaName].push({
      number: cantoNumber,
      title: `Canto ${romanNumerals[cantoNumber]}`,
      subtitle: canto.title,
      original: canto.content,
      modern: existingModern(canticaName, cantoNumber), // Filled by generate-rewrites.js when missing
    });
  });

  console.log(`✓ Inferno: ${data.inferno.length} cantos`);
  console.log(`✓ Purgatorio: ${data.purgatorio.length} cantos`);
  console.log(`✓ Paradiso: ${data.paradiso.length} cantos`);

  // Save to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✓ Saved structured data to: ${OUTPUT_PATH}`);
  console.log('✅ Canto splitting complete!');

  // Show preview of first canto
  if (data.inferno.length > 0) {
    const firstCanto = data.inferno[0];
    const preview = firstCanto.original.substring(0, 300);
    console.log('\n📝 Preview of Inferno Canto I:');
    console.log('---');
    console.log(preview);
    console.log('...');
  }
}

splitCantos();
