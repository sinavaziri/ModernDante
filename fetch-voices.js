const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables');
  console.error('   Please set it in .env.local or export ELEVENLABS_API_KEY="your-api-key"');
  process.exit(1);
}

// Fetch available voices
function fetchVoices() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/voices',
      method: 'GET',
      headers: {
        'xi-api-key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main
async function main() {
  console.log('Fetching available voices from ElevenLabs...\n');

  try {
    const response = await fetchVoices();
    const voices = response.voices;

    console.log(`Found ${voices.length} voices:\n`);
    console.log('Voice ID'.padEnd(25) + 'Name'.padEnd(25) + 'Category');
    console.log('─'.repeat(75));

    voices.forEach(voice => {
      const id = voice.voice_id.padEnd(25);
      const name = voice.name.padEnd(25);
      const category = voice.category || 'N/A';
      console.log(`${id}${name}${category}`);
    });

    console.log('\n💡 Recommendations for Divine Comedy:');
    console.log('   - Narrator: Choose a mature, literary voice');
    console.log('   - Dante: Same as narrator or slightly younger');
    console.log('   - Virgil: Wise, authoritative voice');
    console.log('   - Beatrice: Gentle, feminine voice');
    console.log('   - Character: Varied or dramatic voice\n');

  } catch (error) {
    console.error('Error fetching voices:', error.message);
    process.exit(1);
  }
}

main();
