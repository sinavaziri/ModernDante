#!/usr/bin/env node

/**
 * Generate narration audio with word-level timestamps using ElevenLabs API
 *
 * Usage:
 *   node scripts/generate-narration-with-timestamps.js --cantica inferno --canto 6
 *   node scripts/generate-narration-with-timestamps.js --cantica purgatorio --canto 1
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable is not set');
  console.error('Please create a .env.local file with your API key');
  process.exit(1);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { cantica: null, canto: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cantica' && args[i + 1]) {
      result.cantica = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--canto' && args[i + 1]) {
      result.canto = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

// Load speaker mapping
function loadSpeakerMapping() {
  const mappingPath = path.join(__dirname, '..', 'data', 'speaker-mapping.json');
  return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

// Load voice profiles
function loadVoiceProfiles() {
  const profilesPath = path.join(__dirname, '..', 'data', 'character-voice-profiles.json');
  return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
}

// Get voice settings for a speaker
function getVoiceSettings(speaker, voiceProfiles) {
  const profile = voiceProfiles[speaker] || voiceProfiles['character'];

  // Use narrator voice if specific voice not configured
  const voiceId = profile.voiceId || voiceProfiles['narrator'].voiceId;

  return {
    voiceId,
    stability: profile.stability || 0.5,
    similarity_boost: profile.similarity || 0.75,
    style: profile.style || 0,
    speed: profile.speed || 1.0
  };
}

// Generate audio with timestamps using ElevenLabs
async function generateAudioWithTimestamps(text, voiceSettings) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}/with-timestamps`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.similarity_boost,
        style: voiceSettings.style,
        speed: voiceSettings.speed
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Process word alignments from ElevenLabs response
function processWordAlignments(alignment, text) {
  const words = [];
  const characters = alignment.characters;
  const charStartTimes = alignment.character_start_times_seconds;
  const charEndTimes = alignment.character_end_times_seconds;

  let wordStart = 0;
  let wordEnd = 0;
  let currentWord = '';
  let wordCharStart = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char === ' ' || char === '\n' || i === characters.length - 1) {
      // Include last character if it's not whitespace
      if (i === characters.length - 1 && char !== ' ' && char !== '\n') {
        currentWord += char;
        wordEnd = charEndTimes[i];
      }

      if (currentWord.trim()) {
        words.push({
          word: currentWord.trim(),
          start: Math.round(wordStart * 1000) / 1000,
          end: Math.round(wordEnd * 1000) / 1000,
          charStart: wordCharStart,
          charEnd: wordCharStart + currentWord.trim().length
        });
      }

      currentWord = '';
      wordCharStart = i + 1;
      wordStart = charStartTimes[i + 1] || 0;
    } else {
      if (currentWord === '') {
        wordStart = charStartTimes[i];
        wordCharStart = i;
      }
      currentWord += char;
      wordEnd = charEndTimes[i];
    }
  }

  return words;
}

// Main function to generate audio for a canto
async function generateCantoAudio(cantica, cantoNumber) {
  console.log(`\nGenerating audio for ${cantica} Canto ${cantoNumber}...`);

  const speakerMapping = loadSpeakerMapping();
  const voiceProfiles = loadVoiceProfiles();

  // Get canto data from speaker mapping
  const cantoData = speakerMapping[cantica]?.[cantoNumber.toString()];

  if (!cantoData) {
    throw new Error(`No speaker mapping found for ${cantica} canto ${cantoNumber}`);
  }

  const segments = cantoData.segments;
  console.log(`Found ${segments.length} segments to generate`);

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'public', 'audio', cantica, `canto_${cantoNumber}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const segmentTimings = [];
  let totalDuration = 0;

  // Process each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentId = segment.id.toString().padStart(3, '0');
    const outputPath = path.join(outputDir, `segment_${segmentId}.mp3`);

    console.log(`\n[${i + 1}/${segments.length}] Generating segment ${segment.id} (${segment.speaker})`);
    console.log(`  Text preview: "${segment.text.substring(0, 50)}..."`);

    try {
      const voiceSettings = getVoiceSettings(segment.speaker, voiceProfiles);
      console.log(`  Using voice: ${voiceSettings.voiceId}`);

      // Generate audio with timestamps
      const result = await generateAudioWithTimestamps(segment.text, voiceSettings);

      // Decode and save audio
      const audioBuffer = Buffer.from(result.audio_base64, 'base64');
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`  Saved: ${outputPath}`);

      // Process word alignments
      const words = processWordAlignments(result.alignment, segment.text);
      const duration = words.length > 0 ? words[words.length - 1].end : 0;

      segmentTimings.push({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        startTime: totalDuration,
        endTime: totalDuration + duration,
        duration: duration,
        words: words
      });

      totalDuration += duration;
      console.log(`  Duration: ${duration.toFixed(2)}s`);

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  Error generating segment ${segment.id}:`, error.message);
      throw error;
    }
  }

  // Save word timings for this canto
  const wordTimingsData = {
    cantica: cantica,
    cantoNumber: cantoNumber,
    title: cantoData.title,
    totalDuration: totalDuration,
    segments: segmentTimings
  };

  const wordTimingsPath = path.join(outputDir, 'word-timings.json');
  fs.writeFileSync(wordTimingsPath, JSON.stringify(wordTimingsData, null, 2));
  console.log(`\nSaved word timings to: ${wordTimingsPath}`);

  // Update main audio-word-timings.json
  updateMainTimingsFile(cantica, cantoNumber, wordTimingsData);

  console.log(`\nCompleted! Total duration: ${totalDuration.toFixed(2)}s`);
  return wordTimingsData;
}

// Update the main audio-word-timings.json file
function updateMainTimingsFile(cantica, cantoNumber, cantoTimings) {
  const mainTimingsPath = path.join(__dirname, '..', 'public', 'audio-word-timings.json');

  let mainTimings = {};
  if (fs.existsSync(mainTimingsPath)) {
    mainTimings = JSON.parse(fs.readFileSync(mainTimingsPath, 'utf8'));
  }

  if (!mainTimings[cantica]) {
    mainTimings[cantica] = {};
  }

  mainTimings[cantica][cantoNumber.toString()] = cantoTimings;

  fs.writeFileSync(mainTimingsPath, JSON.stringify(mainTimings, null, 2));
  console.log(`Updated main timings file: ${mainTimingsPath}`);
}

// Entry point
async function main() {
  const { cantica, canto } = parseArgs();

  if (!cantica || !canto) {
    console.log('Usage: node generate-narration-with-timestamps.js --cantica <cantica> --canto <number>');
    console.log('Example: node generate-narration-with-timestamps.js --cantica inferno --canto 6');
    process.exit(1);
  }

  const validCanticas = ['inferno', 'purgatorio', 'paradiso'];
  if (!validCanticas.includes(cantica)) {
    console.error(`Invalid cantica: ${cantica}. Must be one of: ${validCanticas.join(', ')}`);
    process.exit(1);
  }

  const maxCantos = cantica === 'inferno' ? 34 : 33;
  if (canto < 1 || canto > maxCantos) {
    console.error(`Invalid canto number: ${canto}. Must be between 1 and ${maxCantos} for ${cantica}`);
    process.exit(1);
  }

  try {
    await generateCantoAudio(cantica, canto);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
