const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'sk_ea4cb7bdd09c8d290fc6ba2759cc2a1af5620fde5fcace05';

// Voice configuration - Updated with differentiated Dante voices
const VOICE_CONFIG = {
  narrator: {
    voiceId: 'ceRvMsBhZbUSQgH59yxg',   // Dante - The Narrator (steady, literary)
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
    voiceId: 'ceRvMsBhZbUSQgH59yxg',   // Dante - The Pilgrim (human, volatile)
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
    voiceId: 'GWCqHHEfELBpqFWDsdhK',   // Beatrice - Divine Love
    model_id: 'eleven_multilingual_v2'
  },
  character: {
    voiceId: 'lPoFhC6uDtaciSWzm2sI',   // Souls of the Afterlife
    model_id: 'eleven_multilingual_v2'
  }
};

// Load speaker mapping
const mapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'speaker-mapping.json'), 'utf-8')
);

/**
 * Generate TTS audio for a text segment
 */
function generateTTS(text, voiceId, segmentId, voiceConfig) {
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
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        } else {
          const error = Buffer.concat(chunks).toString();
          reject(new Error(`HTTP ${res.statusCode}: ${error}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Add silence between segments (simplified - just returns empty buffer)
 */
function generateSilence(durationMs) {
  // In a real implementation, you'd generate actual silence audio
  // For now, just return empty buffer (audio concat tools will handle pauses)
  return Buffer.alloc(0);
}

/**
 * Generate audio for a single canto
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
  const segmentFiles = [];

  // Create directory for this canto's segments
  const cantoDir = path.join(outputDir, cantica, `canto_${cantoNumber}`);
  fs.mkdirSync(cantoDir, { recursive: true });

  // Process each segment
  for (let i = 0; i < canto.segments.length; i++) {
    const segment = canto.segments[i];
    const voiceConfig = VOICE_CONFIG[segment.speaker];

    if (!voiceConfig) {
      console.warn(`⚠️  No voice configured for speaker: ${segment.speaker}`);
      continue;
    }

    const voiceId = voiceConfig.voiceId;

    const progress = `[${(i + 1).toString().padStart(3)}/${canto.totalSegments}]`;
    const speaker = segment.speaker.padEnd(10);
    process.stdout.write(`${progress} ${speaker} Generating... `);

    try {
      const audio = await generateTTS(segment.text, voiceId, segment.id, voiceConfig);

      // Save individual segment
      const segmentFile = path.join(cantoDir, `segment_${segment.id.toString().padStart(3, '0')}.mp3`);
      fs.writeFileSync(segmentFile, audio);
      segmentFiles.push(segmentFile);

      audioSegments.push(audio);

      console.log(`✓ (${(audio.length / 1024).toFixed(1)} KB)`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

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

  console.log(`\n✅ Complete!`);
  console.log(`📁 Output: ${outputFile}`);
  console.log(`📊 Size: ${(combinedAudio.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 Individual segments: ${cantoDir}/`);

  return outputFile;
}

/**
 * Generate multiple cantos
 */
async function generateMultipleCantos(requests) {
  const outputDir = path.join(__dirname, 'narrations');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Divine Comedy Narration Generator                   ║');
  console.log('║     Using ElevenLabs Text-to-Speech                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  console.log('\n🎙️  Voice Configuration:');
  Object.entries(VOICE_CONFIG).forEach(([speaker, config]) => {
    const settings = config.voice_settings
      ? ` (stability: ${config.voice_settings.stability}, speed: ${config.voice_settings.speed})`
      : '';
    console.log(`   ${speaker.padEnd(12)} → ${config.voiceId}${settings}`);
  });

  const results = [];

  for (const { cantica, canto } of requests) {
    try {
      const outputFile = await generateCantoAudio(cantica, canto, outputDir);
      results.push({ cantica, canto, success: true, file: outputFile });
    } catch (error) {
      console.error(`\n❌ Failed to generate ${cantica} canto ${canto}: ${error.message}`);
      results.push({ cantica, canto, success: false, error: error.message });
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n📁 Generated files:');
    successful.forEach(r => {
      console.log(`   ${r.cantica} Canto ${r.canto}: ${r.file}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    failed.forEach(r => {
      console.log(`   ${r.cantica} Canto ${r.canto}: ${r.error}`);
    });
  }

  console.log('\n💡 To customize voices, edit VOICE_CONFIG in this script');
  console.log('   Run "node fetch-voices.js" to see available voices\n');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node generate-narration.js <cantica> <canto> [<cantica> <canto> ...]');
    console.log('\nExamples:');
    console.log('  node generate-narration.js inferno 1');
    console.log('  node generate-narration.js inferno 1 inferno 2 inferno 3');
    console.log('  node generate-narration.js paradiso 33');
    console.log('\n💡 Tip: Start with a single canto to test voices before generating all');
    process.exit(1);
  }

  const requests = [];
  for (let i = 0; i < args.length; i += 2) {
    const cantica = args[i];
    const canto = parseInt(args[i + 1]);

    if (!['inferno', 'purgatorio', 'paradiso'].includes(cantica)) {
      console.error(`Invalid cantica: ${cantica}`);
      process.exit(1);
    }

    if (isNaN(canto) || canto < 1) {
      console.error(`Invalid canto number: ${args[i + 1]}`);
      process.exit(1);
    }

    requests.push({ cantica, canto });
  }

  generateMultipleCantos(requests).catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateCantoAudio, generateMultipleCantos };
