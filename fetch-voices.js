const https = require('https');

const API_KEY = 'sk_ea4cb7bdd09c8d290fc6ba2759cc2a1af5620fde5fcace05';

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
