const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables');
  console.error('   Please set it in .env.local or export it:');
  console.error('   export ELEVENLABS_API_KEY="your-api-key"');
  process.exit(1);
}

// Voice configuration - Updated from generated-voices.json
const VOICE_CONFIG = {
  narrator: {
    voiceId: 'ceRvMsBhZbUSQgH59yxg',   // Dante - The Narrator
    volume: 1.0,
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
    voiceId: 'ceRvMsBhZbUSQgH59yxg',   // Dante - The Pilgrim (dialogue - more expressive)
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.20,
      similarity_boost: 0.72,
      style: 0.80,
      use_speaker_boost: true,
      speed: 1.05
    }
  },
  virgil: {
    voiceId: 'gboKmrCOkZe6tMznPb9w',   // Virgil - The Ancient Guide
    volume: 1.0,
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
    voiceId: 'ctchwNfHTCRKIQdDzY3J',   // Beatrice - Divine Love (generated)
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.75,
      style: 0.50,
      use_speaker_boost: true,
      speed: 0.95
    }
  },
  lucia: {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku',   // Lily - Saint Lucia (divine messenger)
    volume: 1.0,
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
    voiceId: 'twUwFnpNJ2G0x7FlsmI5',   // Francesca da Rimini (for Canto 5)
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.70,
      style: 0.0,
      use_speaker_boost: true,
      speed: 0.98
    }
  },
  // Inferno-specific character voices
  ciacco: {
    voiceId: 'NKL1pZFuTPMRH2qbxXPa',   // Ciacco - Florentine glutton
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.65,
      style: 0.25,
      use_speaker_boost: true,
      speed: 0.94
    }
  },
  charon: {
    voiceId: 'YQMlHwsBtm3nMiSqx4cp',   // Charon - Ferryman of the dead
    volume: 1.0,
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
    voiceId: 'SO1p7GQGvKBDbOZGBg2P',   // Minos - Judge of the Damned
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.40,
      similarity_boost: 0.70,
      style: 0.3,
      use_speaker_boost: true,
      speed: 0.95
    }
  },
  homer: {
    voiceId: 'Rwyaq4BOCfdHv7tL6TIj',   // Homer - Supreme Poet
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.80,
      style: 0.25,
      use_speaker_boost: true,
      speed: 0.92
    }
  },
  brunetto_latini: {
    voiceId: 'MThwYKL9zvv4oDI3Yax3',   // Brunetto Latini - Dante's teacher
    volume: 1.0,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.25,
      use_speaker_boost: true,
      speed: 0.92
    }
  }
};

// Load speaker mapping
const mapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'speaker-mapping.json'), 'utf-8')
);

/**
 * Generate TTS audio with word-level timestamps
 * Uses ElevenLabs /with-timestamps endpoint for precise alignment
 */
function generateTTSWithTimestamps(text, voiceId, segmentId, voiceConfig) {
  return new Promise((resolve, reject) => {
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

            // Response contains:
            // - audio_base64: base64 encoded audio
            // - alignment: character-level timing data
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

/**
 * Convert character-level alignment to word-level timing
 */
function extractWordTimings(text, alignment) {
  if (!alignment || !alignment.characters || !alignment.character_start_times_seconds || !alignment.character_end_times_seconds) {
    console.warn('   ⚠️  No alignment data available');
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
      // End of word
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

/**
 * Generate audio for a single canto with word-level timestamps
 */
async function generateCantoAudio(cantica, cantoNumber, outputDir) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Generating: ${cantica.toUpperCase()} Canto ${cantoNumber}`);
  console.log('═'.repeat(60));

  const canto = mapping.cantos[cantica][cantoNumber];
  if (!canto) {
    throw new Error(`Canto not found: ${cantica} ${cantoNumber}`);
  }

  console.log(`Title: ${canto.title}`);
  console.log(`Segments: ${canto.totalSegments}\n`);

  const audioSegments = [];
  const segmentTimingData = [];
  let currentTime = 0;

  // Create directory for this canto's segments
  const cantoDir = path.join(outputDir, cantica, `canto_${cantoNumber}`);
  fs.mkdirSync(cantoDir, { recursive: true });

  // Process each segment
  for (let i = 0; i < canto.segments.length; i++) {
    const segment = canto.segments[i];
    let voiceConfig = VOICE_CONFIG[segment.speaker];

    // Fall back to 'character' voice for unrecognized speakers (e.g., charon, francesca, etc.)
    if (!voiceConfig) {
      console.log(`ℹ️  Using 'character' voice for: ${segment.speaker}`);
      voiceConfig = VOICE_CONFIG.character;
    }

    // Check for per-segment voiceId override
    const voiceId = segment.voiceId || voiceConfig.voiceId;
    const usingCustomVoice = segment.voiceId ? ` [custom: ${segment.voiceId.slice(0, 8)}...]` : '';

    const progress = `[${(i + 1).toString().padStart(3)}/${canto.totalSegments}]`;
    const speaker = segment.speaker.padEnd(10);
    process.stdout.write(`${progress} ${speaker}${usingCustomVoice} Generating... `);

    try {
      const result = await generateTTSWithTimestamps(segment.text, voiceId, segment.id, voiceConfig);

      // Save individual segment audio
      const segmentFile = path.join(cantoDir, `segment_${segment.id.toString().padStart(3, '0')}.mp3`);
      fs.writeFileSync(segmentFile, result.audio);

      // Extract word timings
      const wordTimings = extractWordTimings(result.text, result.alignment);

      // Adjust word timings to account for position in full audio
      const adjustedWordTimings = wordTimings.map(word => ({
        ...word,
        start: word.start + currentTime,
        end: word.end + currentTime
      }));

      // Calculate segment duration from alignment data
      const segmentDuration = result.alignment?.character_end_times_seconds?.[result.alignment.character_end_times_seconds.length - 1] || segment.estimatedSeconds;

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

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      throw error;
    }
  }

  // Combine all segments into one file
  console.log('\nCombining segments...');
  const combinedAudio = Buffer.concat(audioSegments);
  const outputFile = path.join(outputDir, cantica, `${cantica}_canto_${cantoNumber}.mp3`);
  fs.writeFileSync(outputFile, combinedAudio);

  // Save timing data with word-level information
  const timingFile = path.join(cantoDir, 'word-timings.json');
  fs.writeFileSync(timingFile, JSON.stringify({
    cantica,
    cantoNumber,
    title: canto.title,
    totalDuration: currentTime,
    segments: segmentTimingData
  }, null, 2));

  // Copy to public/audio directory for web app
  const publicAudioDir = path.join(__dirname, 'public', 'audio', cantica);
  const publicCantoDir = path.join(publicAudioDir, `canto_${cantoNumber}`);
  const publicOutputFile = path.join(publicAudioDir, `${cantica}_canto_${cantoNumber}.mp3`);

  fs.mkdirSync(publicAudioDir, { recursive: true });
  fs.mkdirSync(publicCantoDir, { recursive: true });

  // Copy main audio file
  fs.copyFileSync(outputFile, publicOutputFile);

  // Copy segments and timing data
  const segmentFiles = fs.readdirSync(cantoDir);
  segmentFiles.forEach(file => {
    fs.copyFileSync(
      path.join(cantoDir, file),
      path.join(publicCantoDir, file)
    );
  });

  // Update consolidated audio-word-timings.json for the web app
  const wordTimingsPath = path.join(__dirname, 'public', 'audio-word-timings.json');
  let wordTimings = {};
  if (fs.existsSync(wordTimingsPath)) {
    wordTimings = JSON.parse(fs.readFileSync(wordTimingsPath, 'utf-8'));
  }
  if (!wordTimings[cantica]) wordTimings[cantica] = {};
  wordTimings[cantica][cantoNumber] = {
    cantica,
    cantoNumber,
    title: canto.title,
    totalDuration: currentTime,
    segments: segmentTimingData
  };
  fs.writeFileSync(wordTimingsPath, JSON.stringify(wordTimings, null, 2));

  console.log(`\n✅ Complete!`);
  console.log(`📁 Audio: ${outputFile}`);
  console.log(`📁 Public Audio: ${publicOutputFile}`);
  console.log(`📁 Timings: ${timingFile}`);
  console.log(`📊 Size: ${(combinedAudio.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏱️  Duration: ${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`);

  return {
    audioFile: outputFile,
    timingData: segmentTimingData
  };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     Divine Comedy Narration Generator                   ║');
    console.log('║     With Word-Level Timestamps                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('Usage: node generate-narration-with-timestamps.js <cantica> <canto>');
    console.log('Example: node generate-narration-with-timestamps.js inferno 1\n');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Divine Comedy Narration Generator                   ║');
  console.log('║     With Word-Level Timestamps                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('🎙️  Voice Configuration:');
  Object.entries(VOICE_CONFIG).forEach(([speaker, config]) => {
    const volumeStr = config.volume < 1.0 ? ` (${Math.round(config.volume * 100)}% volume)` : '';
    console.log(`   ${speaker.padEnd(12)} → ${config.voiceId}${volumeStr}`);
  });

  const cantica = args[0].toLowerCase();
  const cantoNumber = parseInt(args[1]);
  const outputDir = path.join(__dirname, 'narrations');

  fs.mkdirSync(path.join(outputDir, cantica), { recursive: true });

  const results = { successful: [], failed: [] };

  try {
    await generateCantoAudio(cantica, cantoNumber, outputDir);
    results.successful.push(`${cantica} Canto ${cantoNumber}`);
  } catch (error) {
    console.error(`\n❌ Failed to generate ${cantica} canto ${cantoNumber}:`, error.message);
    results.failed.push({ cantica, canto: cantoNumber, error: error.message });
  }

  // Summary
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.successful.length > 0) {
    console.log(`\n📁 Generated files:`);
    results.successful.forEach(name => {
      const [c, , num] = name.split(' ');
      console.log(`   ${name}: ${path.join(outputDir, c, `${c}_canto_${num}.mp3`)}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed:`);
    results.failed.forEach(f => {
      console.log(`   ${f.cantica} Canto ${f.canto}: ${f.error}`);
    });
  }

  console.log(`\n💡 To customize voices, edit VOICE_CONFIG in this script`);
}

// Run
main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
