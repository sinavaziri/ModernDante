# Divine Comedy Narration Generation Guide

## ✅ Setup Complete!

You now have a complete narration generation system for The Divine Comedy using ElevenLabs TTS.

## 📁 Files Created

1. **`data/speaker-mapping.json`** - Complete speaker identification for all 100 cantos
2. **`generate-narration.js`** - Main narration generation script
3. **`fetch-voices.js`** - View available ElevenLabs voices
4. **`narrations/`** - Output directory for generated audio files

## 🎙️ Current Voice Configuration

| Speaker | Voice | Description |
|---------|-------|-------------|
| Narrator | Bill | Wise, Mature, Balanced |
| Dante | George | Warm, Captivating Storyteller |
| Virgil | Brian | Deep, Resonant and Comforting |
| Beatrice | Sarah | Mature, Reassuring, Confident |
| Character | Adam | Dominant, Firm |

## 🚀 Usage

### Generate a Single Canto

```bash
node generate-narration.js inferno 1
```

### Generate Multiple Cantos

```bash
node generate-narration.js inferno 1 inferno 2 inferno 3
```

### Generate an Entire Cantica

```bash
# Inferno (Cantos 1-34)
node generate-narration.js inferno 1 inferno 2 ... inferno 34

# Purgatorio (Cantos 1-33)
node generate-narration.js purgatorio 1 purgatorio 2 ... purgatorio 33

# Paradiso (Cantos 1-33)
node generate-narration.js paradiso 1 paradiso 2 ... paradiso 33
```

## 🎨 Customizing Voices

### 1. View Available Voices

```bash
node fetch-voices.js
```

### 2. Edit Voice Configuration

Open `generate-narration.js` and modify the `VOICE_CONFIG` object:

```javascript
const VOICE_CONFIG = {
  narrator: 'YOUR_VOICE_ID_HERE',
  dante: 'YOUR_VOICE_ID_HERE',
  virgil: 'YOUR_VOICE_ID_HERE',
  beatrice: 'YOUR_VOICE_ID_HERE',
  character: 'YOUR_VOICE_ID_HERE'
};
```

## 📊 Output Structure

```
narrations/
├── inferno/
│   ├── inferno_canto_1.mp3          # Complete canto audio
│   ├── inferno_canto_2.mp3
│   ├── canto_1/                     # Individual segments
│   │   ├── segment_001.mp3
│   │   ├── segment_002.mp3
│   │   └── ...
│   └── ...
├── purgatorio/
│   └── ...
└── paradiso/
    └── ...
```

## 💡 Tips

1. **Start Small**: Test with 1-2 cantos first to verify voices sound good
2. **Rate Limits**: The script includes 200ms delays between segments to avoid rate limiting
3. **Cost**: Each canto costs ~5-10 API calls depending on segment count
4. **Duration**: Each canto takes 1-3 minutes to generate
5. **File Size**: Complete cantos are 4-6 MB each

## 📈 Statistics

- **Total Cantos**: 100 (34 Inferno + 33 Purgatorio + 33 Paradiso)
- **Total Segments**: 846
- **Total Words**: 99,109
- **Estimated Audio**: ~11 hours total

## ⚠️ Important Notes

### API Key Security

**Your API key is currently hardcoded in the scripts.** After generating your narrations:

1. Go to https://elevenlabs.io/app/settings/api-keys
2. Delete or rotate the exposed API key
3. For future use, use environment variables:

```javascript
const API_KEY = process.env.ELEVENLABS_API_KEY;
```

Then run:
```bash
export ELEVENLABS_API_KEY="your_new_key"
node generate-narration.js inferno 1
```

### Error Handling

If generation fails:
- Check your ElevenLabs account has sufficient credits
- Verify API key is valid
- Check network connection
- Individual segment files are saved, so you can resume from where it failed

## 🔄 Batch Generation Helper

Create a file `generate-all.sh`:

```bash
#!/bin/bash
# Generate all Inferno cantos
for i in {1..34}; do
  echo "Generating Inferno Canto $i..."
  node generate-narration.js inferno $i
  sleep 5  # Optional: add delay between cantos
done
```

Make it executable:
```bash
chmod +x generate-all.sh
./generate-all.sh
```

## 📞 Support

If you encounter issues:
1. Check the error messages in console
2. Verify API key permissions
3. Check ElevenLabs API status
4. Review individual segment files in the `canto_N/` directories

## ✨ Next Steps

1. ✅ Test the sample canto audio (`narrations/inferno/inferno_canto_1.mp3`)
2. Adjust voices if needed using `fetch-voices.js`
3. Generate more cantos as needed
4. Consider creating a playlist or combining all cantos per cantica
5. **IMPORTANT**: Rotate your API key for security!

Enjoy your Divine Comedy narrations! 🎭📖
