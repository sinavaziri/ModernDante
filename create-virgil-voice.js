const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_ea4cb7bdd09c8d290fc6ba2759cc2a1af5620fde5fcace05';

const VIRGIL_DESCRIPTION = `Deep, resonant male voice embodying ancient wisdom and timeless authority. Rich bass-baritone with gravitas and commanding presence. Speaks with the weight of centuries - patient, measured, supremely confident. Voice of a revered teacher and philosopher. Slow, deliberate pacing with perfect diction. Each word carries significance. Calm, unshakeable authority that inspires trust and respect. Dignified, noble bearing. The voice of classical antiquity - profound knowledge delivered with quiet power. No emotion except occasional gentle reassurance or stern gravity. Mature, ageless wisdom.`;

// Sample text from Virgil's first speech in Inferno Canto 1
const SAMPLE_TEXT = `Not a man, though once I was, and my parents were both from Lombardy, both Mantuans by birth. I was born under Julius Caesar, though late in his reign, and lived in Rome under good Augustus in the time of the false and lying gods. I was a poet, and I sang of that righteous son of Anchises who sailed from Troy after proud Ilium burned. But you—why do you return to such torment? Why don't you climb the Mount of Joy, which is the source and cause of all happiness?`;

/**
 * Create voice previews with lower loudness
 */
function createVoicePreviews() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      voice_description: VIRGIL_DESCRIPTION,
      text: SAMPLE_TEXT,
      loudness: -0.5  // Lower loudness (range typically -1.0 to 1.0)
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-voice/create-previews',
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
            resolve(response);
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
 * Download preview audio
 */
function downloadPreview(previewUrl, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);

    https.get(previewUrl, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Generate New Virgil Voice (Lower Loudness)          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('📝 Voice Description:');
  console.log(`   ${VIRGIL_DESCRIPTION}\n`);
  console.log('🔊 Loudness: -0.5 (quieter than default)\n');

  try {
    console.log('🎙️  Generating voice previews...\n');
    const response = await createVoicePreviews();

    if (!response.previews || response.previews.length === 0) {
      console.error('❌ No previews generated');
      return;
    }

    console.log(`✅ Generated ${response.previews.length} preview(s)\n`);

    // Create output directory
    const outputDir = path.join(__dirname, 'virgil-previews');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Download all previews
    for (let i = 0; i < response.previews.length; i++) {
      const preview = response.previews[i];
      console.log(`📥 Preview ${i + 1}:`);
      console.log(`   Generated Voice ID: ${preview.generated_voice_id}`);
      console.log(`   Audio URL: ${preview.audio_base_64 ? 'Base64 data' : preview.media_uri || 'N/A'}`);

      // Save preview audio
      if (preview.audio_base_64) {
        const filename = path.join(outputDir, `virgil_preview_${i + 1}.mp3`);
        const buffer = Buffer.from(preview.audio_base_64, 'base64');
        fs.writeFileSync(filename, buffer);
        console.log(`   ✓ Saved: ${filename}`);
      } else if (preview.media_uri) {
        const filename = path.join(outputDir, `virgil_preview_${i + 1}.mp3`);
        await downloadPreview(preview.media_uri, filename);
        console.log(`   ✓ Downloaded: ${filename}`);
      }
      console.log('');
    }

    // Save voice IDs to file
    const voiceIdsFile = path.join(outputDir, 'voice_ids.json');
    const voiceIds = response.previews.map(p => ({
      generated_voice_id: p.generated_voice_id,
      description: VIRGIL_DESCRIPTION,
      loudness: -0.5
    }));
    fs.writeFileSync(voiceIdsFile, JSON.stringify(voiceIds, null, 2));
    console.log(`💾 Voice IDs saved: ${voiceIdsFile}\n`);

    console.log('═'.repeat(60));
    console.log('NEXT STEPS:');
    console.log('1. Listen to the preview files in virgil-previews/');
    console.log('2. Choose your favorite preview');
    console.log('3. Use the generated_voice_id in your voice configuration');
    console.log('   (or create a permanent voice from it)');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.error('   Check your API key is valid');
    } else if (error.message.includes('429')) {
      console.error('   Rate limit reached, try again later');
    }
    process.exit(1);
  }
}

main();
