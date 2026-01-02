#!/usr/bin/env node
/**
 * Divine Comedy Canto Audio Generator
 *
 * Comprehensive script that:
 * 1. Reviews speaker assignments for accuracy
 * 2. Generates audio with word-level timestamps via ElevenLabs
 * 3. Syncs audio and timing data to public directory for web app
 *
 * Usage: node generate-canto-audio.js <cantica> <canto> [--review-only] [--skip-review]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.ELEVENLABS_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════
// VOICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const VOICE_CONFIG = {
  narrator: {
    voiceId: 'ceRvMsBhZbUSQgH59yxg',
    description: 'Dante as narrator - steady, literary',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0
    }
  },
  dante: {
    voiceId: 'ceRvMsBhZbUSQgH59yxg',
    description: 'Dante the Pilgrim - emotional, questioning',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.52,
      similarity_boost: 0.72,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.02
    }
  },
  virgil: {
    voiceId: 'gboKmrCOkZe6tMznPb9w',
    description: 'Virgil - wise, authoritative guide',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0
    }
  },
  beatrice: {
    voiceId: 'ctchwNfHTCRKIQdDzY3J',
    description: 'Beatrice - divine, radiant',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0
    }
  },
  lucia: {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku',
    description: 'Saint Lucia - divine messenger',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.40,
      use_speaker_boost: true,
      speed: 0.95
    }
  },
  character: {
    voiceId: 'lPoFhC6uDtaciSWzm2sI',
    description: 'Generic souls/characters',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.70,
      style: 0.0,
      use_speaker_boost: true,
      speed: 0.98
    }
  },
  // Character-specific voices
  charon: {
    voiceId: 'YQMlHwsBtm3nMiSqx4cp',
    description: 'Charon - ferryman of the dead',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.35,
      similarity_boost: 0.65,
      style: 0.4,
      use_speaker_boost: true,
      speed: 0.92
    }
  },
  minos: {
    voiceId: 'SO1p7GQGvKBDbOZGBg2P',
    description: 'Minos - judge of the damned',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.40,
      similarity_boost: 0.70,
      style: 0.3,
      use_speaker_boost: true,
      speed: 0.90
    }
  },
  francesca: {
    voiceId: 'twUwFnpNJ2G0x7FlsmI5',
    description: 'Francesca da Rimini - tragic lover',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
      speed: 0.95
    }
  },
  ciacco: {
    voiceId: 'NKL1pZFuTPMRH2qbxXPa',
    description: 'Ciacco - Florentine glutton',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.65,
      style: 0.25,
      use_speaker_boost: true,
      speed: 0.94
    }
  },
  farinata: {
    voiceId: '1qlJVxGJmVxF8yPJ6I1z',
    description: 'Farinata degli Uberti - proud Ghibelline',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.70,
      style: 0.2,
      use_speaker_boost: true,
      speed: 0.92
    }
  },
  pier_della_vigna: {
    voiceId: 'ynXmEJ8HaSccgtd5f0yK',
    description: 'Pier della Vigna - suicide in tree form',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.70,
      style: 0.3,
      use_speaker_boost: true,
      speed: 0.90
    }
  },
  brunetto_latini: {
    voiceId: 'MThwYKL9zvv4oDI3Yax3',
    description: 'Brunetto Latini - Dante\'s teacher',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.25,
      use_speaker_boost: true,
      speed: 0.92
    }
  },
  ulysses: {
    voiceId: 's2jm16YR9pS20We1LlB1',
    description: 'Ulysses - the wanderer',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true,
      speed: 0.95
    }
  },
  ugolino: {
    voiceId: 'gI6zx6QabLOv9KycvLFI',
    description: 'Count Ugolino - tragic cannibal',
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.40,
      similarity_boost: 0.70,
      style: 0.4,
      use_speaker_boost: true,
      speed: 0.88
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPEAKER ASSIGNMENT RULES (for review)
// ═══════════════════════════════════════════════════════════════════════════

const SPEAKER_RULES = `
SPEAKER ASSIGNMENT GUIDELINES FOR THE DIVINE COMEDY:

1. NARRATOR (Dante recounting the story):
   - Third-person descriptions of scenes, settings, actions
   - "I saw...", "We walked...", "There appeared..."
   - Transitional passages between dialogues
   - Frame narrative ("I answered him...", "He replied...")
   - Opening/closing lines of cantos

2. DANTE (Dante speaking as character within the story):
   - Direct speech in quotes addressing others
   - Questions to Virgil, souls, or other characters
   - Emotional exclamations
   - Usually follows patterns like: '"Master..."', '"Tell me..."'

3. VIRGIL (Dante's guide through Inferno and Purgatorio):
   - Explanations of Hell's structure and punishments
   - Instructions to Dante
   - Addresses to souls blocking their path
   - Wise counsel and reassurance

4. BEATRICE (Dante's guide through Paradiso):
   - Divine explanations and theology
   - Appears in Inferno Canto 2 (flashback) and throughout Paradiso

5. CHARACTER/NAMED SOULS:
   - Souls telling their stories (Francesca, Ugolino, etc.)
   - Should use specific character name if known
   - Use 'character' for unnamed or generic souls

COMMON PATTERNS TO CHECK:
- Narrator frame before dialogue: "He said:" → narrator
- Quoted speech: "..." → the speaker, not narrator
- "I replied/answered" without quote → narrator describing action
- Multi-speaker segments should be split
`;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function loadSpeakerMapping() {
  const mappingPath = path.join(__dirname, 'data', 'speaker-mapping.json');
  return JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
}

function saveSpeakerMapping(mapping) {
  const mappingPath = path.join(__dirname, 'data', 'speaker-mapping.json');
  // Backup first
  const backupPath = path.join(__dirname, 'data', `speaker-mapping-backup-${Date.now()}.json`);
  fs.copyFileSync(mappingPath, backupPath);
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`   Backup saved to: ${backupPath}`);
}

function truncateText(text, maxLen = 80) {
  const oneLine = text.replace(/\n/g, ' ').trim();
  return oneLine.length > maxLen ? oneLine.substring(0, maxLen) + '...' : oneLine;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEAKER REVIEW
// ═══════════════════════════════════════════════════════════════════════════

async function reviewSpeakerAssignments(cantica, cantoNumber) {
  console.log('\n' + '═'.repeat(70));
  console.log('  SPEAKER ASSIGNMENT REVIEW');
  console.log('═'.repeat(70));

  const mapping = loadSpeakerMapping();
  const canto = mapping.cantos[cantica]?.[cantoNumber];

  if (!canto) {
    console.error(`\n❌ Canto not found: ${cantica} ${cantoNumber}`);
    return null;
  }

  console.log(`\n📖 ${cantica.toUpperCase()} - ${canto.title}`);
  if (canto.subtitle) {
    console.log(`   ${canto.subtitle}`);
  }
  console.log(`\n📊 Total segments: ${canto.totalSegments}`);

  // Analyze speaker distribution
  const speakerCounts = {};
  canto.segments.forEach(seg => {
    speakerCounts[seg.speaker] = (speakerCounts[seg.speaker] || 0) + 1;
  });

  console.log('\n📈 Speaker distribution:');
  Object.entries(speakerCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([speaker, count]) => {
      const hasVoice = VOICE_CONFIG[speaker] ? '✓' : '⚠️ (will use character voice)';
      console.log(`   ${speaker.padEnd(15)} ${count.toString().padStart(3)} segments ${hasVoice}`);
    });

  // Show all segments for review
  console.log('\n' + '─'.repeat(70));
  console.log('  SEGMENT-BY-SEGMENT REVIEW');
  console.log('─'.repeat(70));

  const issues = [];

  canto.segments.forEach((seg, index) => {
    const voiceInfo = VOICE_CONFIG[seg.speaker]
      ? `[${VOICE_CONFIG[seg.speaker].description}]`
      : '[⚠️ No dedicated voice - using character]';

    console.log(`\n[${(index + 1).toString().padStart(2)}] Speaker: ${seg.speaker.toUpperCase()} ${voiceInfo}`);
    console.log(`    ${seg.isDialogue ? '💬 Dialogue' : '📝 Narration'}`);
    console.log(`    ─────────────────────────────────────────────────────────`);

    // Show text preview (first 3 lines max)
    const lines = seg.text.split('\n').slice(0, 3);
    lines.forEach(line => {
      console.log(`    │ ${line.substring(0, 65)}${line.length > 65 ? '...' : ''}`);
    });
    if (seg.text.split('\n').length > 3) {
      console.log(`    │ ... (${seg.text.split('\n').length - 3} more lines)`);
    }

    // Flag potential issues
    const potentialIssues = [];

    // Check for dialogue markers in narrator segments
    if (seg.speaker === 'narrator' && seg.text.includes('"')) {
      const quoteContent = seg.text.match(/"([^"]+)"/);
      if (quoteContent && quoteContent[1].length > 50) {
        potentialIssues.push('Contains quoted speech - should this be split?');
      }
    }

    // Check for "I said/replied" patterns that might be narrator
    if (seg.speaker !== 'narrator' && /^(I replied|I answered|I said|Then I)/i.test(seg.text)) {
      potentialIssues.push('Starts with first-person action - could be narrator frame');
    }

    // Check for "He/She said" patterns
    if (seg.speaker !== 'narrator' && /^(He said|She said|He replied|She replied)/i.test(seg.text)) {
      potentialIssues.push('Starts with third-person attribution - should be narrator');
    }

    // Check very short segments
    if (seg.text.length < 50 && seg.speaker !== 'narrator') {
      potentialIssues.push('Very short segment - verify speaker');
    }

    if (potentialIssues.length > 0) {
      console.log(`    ⚠️  REVIEW: ${potentialIssues.join('; ')}`);
      issues.push({ index: index + 1, segment: seg, issues: potentialIssues });
    }
  });

  // Summary of potential issues
  if (issues.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log(`  ⚠️  ${issues.length} SEGMENTS FLAGGED FOR REVIEW`);
    console.log('═'.repeat(70));
    issues.forEach(({ index, segment, issues: issueList }) => {
      console.log(`\n  Segment ${index} (${segment.speaker}):`);
      issueList.forEach(issue => console.log(`    → ${issue}`));
    });
  } else {
    console.log('\n' + '═'.repeat(70));
    console.log('  ✅ NO OBVIOUS ISSUES DETECTED');
    console.log('═'.repeat(70));
  }

  return { canto, issues, mapping };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO GENERATION WITH TIMESTAMPS
// ═══════════════════════════════════════════════════════════════════════════

function generateTTSWithTimestamps(text, voiceId, voiceConfig) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('ELEVENLABS_API_KEY not set'));
      return;
    }

    const model_id = voiceConfig.model_id || 'eleven_multilingual_v2';
    const voice_settings = voiceConfig.voice_settings || {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0
    };

    const postData = JSON.stringify({
      text: text,
      model_id: model_id,
      voice_settings: voice_settings
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}/with-timestamps`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const audioBuffer = Buffer.from(response.audio_base64, 'base64');
            resolve({
              audio: audioBuffer,
              alignment: response.alignment,
              text: text
            });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function extractWordTimings(text, alignment) {
  if (!alignment?.characters || !alignment?.character_start_times_seconds) {
    return [];
  }

  const words = [];
  let currentWord = '';
  let wordStartTime = null;
  let wordStartCharIndex = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i];
    const startTime = alignment.character_start_times_seconds[i];
    const endTime = alignment.character_end_times_seconds[i];

    if (char === ' ' || char === '\n' || i === alignment.characters.length - 1) {
      if (i === alignment.characters.length - 1 && char !== ' ' && char !== '\n') {
        currentWord += char;
      }

      if (currentWord.trim().length > 0) {
        words.push({
          word: currentWord.trim(),
          start: wordStartTime,
          end: endTime,
          charStart: wordStartCharIndex,
          charEnd: i
        });
      }

      currentWord = '';
      wordStartTime = null;
      wordStartCharIndex = i + 1;
    } else {
      if (wordStartTime === null) {
        wordStartTime = startTime;
      }
      currentWord += char;
    }
  }

  return words;
}

async function generateCantoAudio(cantica, cantoNumber) {
  console.log('\n' + '═'.repeat(70));
  console.log('  AUDIO GENERATION');
  console.log('═'.repeat(70));

  const mapping = loadSpeakerMapping();
  const canto = mapping.cantos[cantica]?.[cantoNumber];

  if (!canto) {
    throw new Error(`Canto not found: ${cantica} ${cantoNumber}`);
  }

  console.log(`\n📖 Generating: ${cantica.toUpperCase()} ${canto.title}`);
  console.log(`📊 Segments: ${canto.totalSegments}\n`);

  const outputDir = path.join(__dirname, 'narrations');
  const cantoDir = path.join(outputDir, cantica, `canto_${cantoNumber}`);
  fs.mkdirSync(cantoDir, { recursive: true });

  const audioSegments = [];
  const segmentTimingData = [];
  let currentTime = 0;

  for (let i = 0; i < canto.segments.length; i++) {
    const segment = canto.segments[i];
    let voiceConfig = VOICE_CONFIG[segment.speaker];

    if (!voiceConfig) {
      console.log(`   ℹ️  Using 'character' voice for: ${segment.speaker}`);
      voiceConfig = VOICE_CONFIG.character;
    }

    // Check for segment-level voice override
    const effectiveVoiceId = segment.voiceId || voiceConfig.voiceId;
    if (segment.voiceId) {
      console.log(`   🎭 Using custom voice: ${segment.voiceId}`);
    }

    const progress = `[${(i + 1).toString().padStart(2)}/${canto.totalSegments}]`;
    process.stdout.write(`${progress} ${segment.speaker.padEnd(12)} Generating... `);

    try {
      const result = await generateTTSWithTimestamps(
        segment.text,
        effectiveVoiceId,
        voiceConfig
      );

      // Save individual segment
      const segmentFile = path.join(cantoDir, `segment_${segment.id.toString().padStart(3, '0')}.mp3`);
      fs.writeFileSync(segmentFile, result.audio);

      // Extract word timings
      const wordTimings = extractWordTimings(result.text, result.alignment);
      const adjustedWordTimings = wordTimings.map(word => ({
        ...word,
        start: word.start + currentTime,
        end: word.end + currentTime
      }));

      const segmentDuration = result.alignment?.character_end_times_seconds?.[
        result.alignment.character_end_times_seconds.length - 1
      ] || 0;

      segmentTimingData.push({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        startTime: currentTime,
        endTime: currentTime + segmentDuration,
        duration: segmentDuration,
        words: adjustedWordTimings
      });

      currentTime += segmentDuration;
      audioSegments.push(result.audio);

      console.log(`✓ (${(result.audio.length / 1024).toFixed(1)} KB, ${wordTimings.length} words)`);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      throw error;
    }
  }

  // Combine audio
  console.log('\n📦 Combining segments...');
  const combinedAudio = Buffer.concat(audioSegments);
  const outputFile = path.join(outputDir, cantica, `${cantica}_canto_${cantoNumber}.mp3`);
  fs.writeFileSync(outputFile, combinedAudio);

  // Save timing data
  const timingFile = path.join(cantoDir, 'word-timings.json');
  const timingData = {
    cantica,
    cantoNumber,
    title: canto.title,
    totalDuration: currentTime,
    segments: segmentTimingData
  };
  fs.writeFileSync(timingFile, JSON.stringify(timingData, null, 2));

  // Copy to public directory
  console.log('📂 Syncing to public directory...');
  const publicAudioDir = path.join(__dirname, 'public', 'audio', cantica);
  const publicCantoDir = path.join(publicAudioDir, `canto_${cantoNumber}`);
  fs.mkdirSync(publicCantoDir, { recursive: true });

  // Copy main audio file
  fs.copyFileSync(outputFile, path.join(publicAudioDir, `${cantica}_canto_${cantoNumber}.mp3`));

  // Copy all segment files
  const files = fs.readdirSync(cantoDir);
  files.forEach(file => {
    fs.copyFileSync(path.join(cantoDir, file), path.join(publicCantoDir, file));
  });

  // Update consolidated word timings
  const wordTimingsPath = path.join(__dirname, 'public', 'audio-word-timings.json');
  let allWordTimings = {};
  if (fs.existsSync(wordTimingsPath)) {
    allWordTimings = JSON.parse(fs.readFileSync(wordTimingsPath, 'utf-8'));
  }
  if (!allWordTimings[cantica]) allWordTimings[cantica] = {};
  allWordTimings[cantica][cantoNumber] = timingData;
  fs.writeFileSync(wordTimingsPath, JSON.stringify(allWordTimings, null, 2));

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  ✅ GENERATION COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n📁 Audio file: ${outputFile}`);
  console.log(`📁 Segments: ${cantoDir}/`);
  console.log(`📁 Public: ${publicCantoDir}/`);
  console.log(`📊 Total size: ${(combinedAudio.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏱️  Duration: ${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`);
  console.log(`🔤 Word timings: ${segmentTimingData.reduce((acc, s) => acc + s.words.length, 0)} words\n`);

  return { outputFile, timingData };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE PROMPT
// ═══════════════════════════════════════════════════════════════════════════

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help')) {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Divine Comedy Canto Audio Generator                        ║
╚══════════════════════════════════════════════════════════════════════╝

Usage: node generate-canto-audio.js <cantica> <canto> [options]

Arguments:
  cantica       One of: inferno, purgatorio, paradiso
  canto         Canto number (1-34 for Inferno, 1-33 for others)

Options:
  --review-only   Only review speaker assignments, don't generate audio
  --skip-review   Skip review and generate audio immediately
  --help          Show this help message

Examples:
  node generate-canto-audio.js inferno 2
  node generate-canto-audio.js inferno 5 --review-only
  node generate-canto-audio.js paradiso 33 --skip-review
`);
    process.exit(0);
  }

  const cantica = args[0].toLowerCase();
  const cantoNumber = parseInt(args[1]);
  const reviewOnly = args.includes('--review-only');
  const skipReview = args.includes('--skip-review');

  if (!['inferno', 'purgatorio', 'paradiso'].includes(cantica)) {
    console.error(`❌ Invalid cantica: ${cantica}`);
    process.exit(1);
  }

  if (isNaN(cantoNumber) || cantoNumber < 1) {
    console.error(`❌ Invalid canto number: ${args[1]}`);
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           Divine Comedy Canto Audio Generator                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Step 1: Review speaker assignments
  if (!skipReview) {
    const reviewResult = await reviewSpeakerAssignments(cantica, cantoNumber);

    if (!reviewResult) {
      process.exit(1);
    }

    if (reviewOnly) {
      console.log('\n📋 Review complete. Run without --review-only to generate audio.\n');
      process.exit(0);
    }

    if (reviewResult.issues.length > 0) {
      const answer = await prompt('\n⚠️  Issues detected. Continue with audio generation? (y/n): ');
      if (answer !== 'y' && answer !== 'yes') {
        console.log('\n❌ Aborted. Fix speaker assignments and try again.\n');
        process.exit(0);
      }
    } else {
      const answer = await prompt('\n✅ Review complete. Proceed with audio generation? (y/n): ');
      if (answer !== 'y' && answer !== 'yes') {
        console.log('\n❌ Aborted.\n');
        process.exit(0);
      }
    }
  }

  // Step 2: Check API key
  if (!API_KEY) {
    console.error('\n❌ ELEVENLABS_API_KEY not found in .env.local');
    console.error('   Please set it before generating audio.\n');
    process.exit(1);
  }

  // Step 3: Generate audio
  try {
    await generateCantoAudio(cantica, cantoNumber);
  } catch (error) {
    console.error(`\n❌ Generation failed: ${error.message}\n`);
    process.exit(1);
  }
}

main();
