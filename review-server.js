#!/usr/bin/env node
/**
 * Full Interactive Review Server for Speaker Assignments & Voice Configuration
 *
 * Features:
 * - Navigate between all cantos
 * - Edit speaker assignments
 * - Configure voice IDs and settings for characters
 * - Add new characters with voice configuration
 * - Generate audio when ready
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3456;

// Load voice configuration - builds a flat map of all speakers
function loadVoiceConfig() {
  // Core speakers that always exist
  const config = {
    narrator: { voiceId: 'ceRvMsBhZbUSQgH59yxg', label: 'Narrator', description: 'Dante as narrator', color: '#6b7280', stability: 0.5, similarity: 0.75, style: 0, speed: 1.0 },
    dante: { voiceId: 'ceRvMsBhZbUSQgH59yxg', label: 'Dante', description: 'Dante the Pilgrim', color: '#3b82f6', stability: 0.2, similarity: 0.72, style: 0.8, speed: 1.05 },
    virgil: { voiceId: 'gboKmrCOkZe6tMznPb9w', label: 'Virgil', description: 'The Ancient Guide', color: '#f59e0b', stability: 0.5, similarity: 0.75, style: 0, speed: 1.0 },
    beatrice: { voiceId: 'ctchwNfHTCRKIQdDzY3J', label: 'Beatrice', description: 'Divine Love', color: '#ec4899', stability: 0.45, similarity: 0.75, style: 0.5, speed: 0.95 },
    lucia: { voiceId: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lucia', description: 'Saint Lucia', color: '#6366f1', stability: 0.5, similarity: 0.75, style: 0.4, speed: 0.95 },
    character: { voiceId: 'twUwFnpNJ2G0x7FlsmI5', label: 'Character', description: 'Generic character', color: '#a855f7', stability: 0.55, similarity: 0.7, style: 0, speed: 0.98 },
    gate_inscription: { voiceId: 'Zp3wsYfVfi3BCNHzkseK', label: 'Gate Inscription', description: 'Hell Gate inscription', color: '#7f1d1d', stability: 0.5, similarity: 0.75, style: 0, speed: 1.0 },
    classical_poets: { voiceId: 'twUwFnpNJ2G0x7FlsmI5', label: 'Classical Poets', description: 'Homer, Horace, Ovid, Lucan', color: '#0e7490', stability: 0.55, similarity: 0.7, style: 0, speed: 0.98 },
    homer: { voiceId: 'Rwyaq4BOCfdHv7tL6TIj', label: 'Homer', description: 'Supreme Poet', color: '#0891b2', stability: 0.55, similarity: 0.8, style: 0.25, speed: 0.92 },
  };

  // Load character profiles and merge them in
  const profilesPath = path.join(__dirname, 'data', 'character-voice-profiles.json');
  if (fs.existsSync(profilesPath)) {
    try {
      const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

      // Process each cantica's characters
      const canticaKeys = ['inferno_characters', 'purgatorio_characters', 'paradiso_characters'];
      const colors = ['#ef4444', '#22c55e', '#3b82f6']; // red, green, blue for each cantica

      canticaKeys.forEach((key, canticaIdx) => {
        const characters = profiles[key] || {};
        Object.entries(characters).forEach(([id, char]) => {
          const settings = char.voice_settings || {};
          config[id] = {
            voiceId: char.voiceId || '',
            label: char.name || id,
            description: char.description || '',
            color: colors[canticaIdx],
            stability: settings.stability || 0.5,
            similarity: settings.similarity_boost || 0.7,
            style: settings.style || 0,
            speed: settings.speed || 1.0,
          };
        });
      });
    } catch (e) {
      console.error('Error loading character profiles:', e.message);
    }
  }

  return config;
}

function saveVoiceConfig(config) {
  const configPath = path.join(__dirname, 'data', 'character-voice-profiles.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function loadMapping() {
  const mappingPath = path.join(__dirname, 'data', 'speaker-mapping.json');
  return JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
}

function saveMapping(mapping) {
  const mappingPath = path.join(__dirname, 'data', 'speaker-mapping.json');
  const backupPath = path.join(__dirname, 'data', `speaker-mapping-backup-${Date.now()}.json`);
  fs.copyFileSync(mappingPath, backupPath);
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  return backupPath;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detectIssues(segment) {
  const issues = [];
  if (segment.speaker === 'narrator' && segment.text.includes('"')) {
    const quoteMatch = segment.text.match(/"([^"]+)"/);
    if (quoteMatch && quoteMatch[1].length > 50) {
      issues.push('Contains quoted speech');
    }
  }
  if (segment.speaker !== 'narrator') {
    if (/^(I replied|I answered|I said|Then I |He said|She said|He replied)/i.test(segment.text)) {
      issues.push('May be narrator frame');
    }
  }
  if (segment.text.length < 50 && segment.speaker !== 'narrator') {
    issues.push('Very short');
  }
  return issues;
}

function generateMainPage() {
  const mapping = loadMapping();
  const voiceConfig = loadVoiceConfig();

  // Build canto list
  const canticas = ['inferno', 'purgatorio', 'paradiso'];
  let cantoListHtml = '';

  canticas.forEach(cantica => {
    const cantos = mapping.cantos[cantica] || {};
    const cantoNumbers = Object.keys(cantos).map(n => parseInt(n)).sort((a, b) => a - b);

    if (cantoNumbers.length === 0) return;

    cantoListHtml += `
      <div class="cantica-section">
        <h2 class="cantica-title">${cantica.charAt(0).toUpperCase() + cantica.slice(1)}</h2>
        <div class="canto-grid">
          ${cantoNumbers.map(num => {
            const canto = cantos[num];
            const issueCount = canto.segments.filter(s => detectIssues(s).length > 0).length;
            return `
              <a href="/edit/${cantica}/${num}" class="canto-card ${issueCount > 0 ? 'has-issues' : ''}">
                <div class="canto-number">Canto ${num}</div>
                <div class="canto-meta">${canto.segments.length} segments</div>
                ${issueCount > 0 ? `<div class="canto-issues">${issueCount} issues</div>` : ''}
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  // Build voice config list
  const voiceListHtml = Object.entries(voiceConfig).map(([id, config]) => `
    <div class="voice-card" data-id="${id}">
      <div class="voice-header" style="border-left-color: ${config.color}">
        <span class="voice-name">${config.label}</span>
        <span class="voice-id">${config.voiceId ? config.voiceId.slice(0, 12) + '...' : 'Not set'}</span>
      </div>
      <div class="voice-desc">${config.description}</div>
      <button class="btn btn-sm" onclick="editVoice('${id}')">Edit</button>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Divine Comedy - Speaker & Voice Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .header {
      background: #1e293b;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #334155;
    }
    .header h1 { font-size: 1.5rem; color: #f1f5f9; }
    .header-tabs {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    .tab {
      padding: 0.5rem 1rem;
      background: #334155;
      border: none;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .tab.active { background: #3b82f6; color: white; }
    .tab:hover { background: #475569; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Canto Grid */
    .cantica-section { margin-bottom: 2rem; }
    .cantica-title {
      font-size: 1.25rem;
      color: #94a3b8;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #334155;
    }
    .canto-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }
    .canto-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem;
      text-decoration: none;
      color: #e2e8f0;
      transition: all 0.2s;
    }
    .canto-card:hover { border-color: #3b82f6; transform: translateY(-2px); }
    .canto-card.has-issues { border-color: #f59e0b; }
    .canto-number { font-weight: 600; font-size: 1rem; }
    .canto-meta { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    .canto-issues { font-size: 0.7rem; color: #f59e0b; margin-top: 0.25rem; }

    /* Voice Grid */
    .voice-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .voice-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem;
    }
    .voice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      padding-left: 0.75rem;
      border-left: 3px solid;
    }
    .voice-name { font-weight: 600; }
    .voice-id { font-size: 0.75rem; color: #64748b; font-family: monospace; }
    .voice-desc { font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.75rem; }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.8rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-sm { padding: 0.375rem 0.75rem; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-success { background: #10b981; color: white; }
    .btn-success:hover { background: #059669; }

    .add-voice-btn {
      width: 100%;
      padding: 1.5rem;
      background: transparent;
      border: 2px dashed #334155;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .add-voice-btn:hover { border-color: #10b981; color: #10b981; }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: #1e293b;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
    }
    .modal h2 { margin-bottom: 1.5rem; color: #f1f5f9; }
    .form-group { margin-bottom: 1rem; }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 0.375rem;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 0.625rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 0.875rem;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .slider-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .slider-group input[type="range"] { flex: 1; }
    .slider-group .value { font-size: 0.8rem; color: #64748b; min-width: 2.5rem; text-align: right; }
    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1001;
    }
    .toast.show { opacity: 1; }
    .toast.error { background: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Divine Comedy - Speaker & Voice Manager</h1>
    <div class="header-tabs">
      <button class="tab active" onclick="switchTab('cantos')">Cantos</button>
      <button class="tab" onclick="switchTab('voices')">Voice Configuration</button>
    </div>
  </div>

  <div class="container">
    <div id="cantos-tab" class="tab-content active">
      ${cantoListHtml}
    </div>

    <div id="voices-tab" class="tab-content">
      <div class="voice-grid">
        ${voiceListHtml}
        <button class="add-voice-btn" onclick="addVoice()">+ Add New Character Voice</button>
      </div>
    </div>
  </div>

  <!-- Voice Edit Modal -->
  <div class="modal" id="voiceModal">
    <div class="modal-content">
      <h2 id="voiceModalTitle">Edit Voice</h2>
      <input type="hidden" id="voiceId">
      <div class="form-group">
        <label>Character Name</label>
        <input type="text" id="voiceLabel" placeholder="e.g., Ulysses">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="voiceDescription" placeholder="e.g., The wanderer">
      </div>
      <div class="form-group">
        <label>ElevenLabs Voice ID</label>
        <input type="text" id="voiceVoiceId" placeholder="e.g., YQMlHwsBtm3nMiSqx4cp">
      </div>
      <div class="form-group">
        <label>Color (for UI)</label>
        <input type="color" id="voiceColor" value="#6b7280">
      </div>
      <div class="form-group">
        <label>Stability</label>
        <div class="slider-group">
          <input type="range" id="voiceStability" min="0" max="1" step="0.05" value="0.5" oninput="updateSliderValue(this)">
          <span class="value">0.50</span>
        </div>
      </div>
      <div class="form-group">
        <label>Similarity Boost</label>
        <div class="slider-group">
          <input type="range" id="voiceSimilarity" min="0" max="1" step="0.05" value="0.75" oninput="updateSliderValue(this)">
          <span class="value">0.75</span>
        </div>
      </div>
      <div class="form-group">
        <label>Style</label>
        <div class="slider-group">
          <input type="range" id="voiceStyle" min="0" max="1" step="0.05" value="0" oninput="updateSliderValue(this)">
          <span class="value">0.00</span>
        </div>
      </div>
      <div class="form-group">
        <label>Speed</label>
        <div class="slider-group">
          <input type="range" id="voiceSpeed" min="0.5" max="1.5" step="0.05" value="1" oninput="updateSliderValue(this)">
          <span class="value">1.00</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeVoiceModal()">Cancel</button>
        <button class="btn btn-success" onclick="saveVoice()">Save</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let voiceConfig = ${JSON.stringify(voiceConfig)};
    let isNewVoice = false;

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelector(\`.tab:nth-child(\${tab === 'cantos' ? 1 : 2})\`).classList.add('active');
      document.getElementById(tab + '-tab').classList.add('active');
    }

    function updateSliderValue(input) {
      input.nextElementSibling.textContent = parseFloat(input.value).toFixed(2);
    }

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function editVoice(id) {
      isNewVoice = false;
      const config = voiceConfig[id];
      document.getElementById('voiceModalTitle').textContent = 'Edit Voice: ' + config.label;
      document.getElementById('voiceId').value = id;
      document.getElementById('voiceLabel').value = config.label || '';
      document.getElementById('voiceDescription').value = config.description || '';
      document.getElementById('voiceVoiceId').value = config.voiceId || '';
      document.getElementById('voiceColor').value = config.color || '#6b7280';

      const stability = document.getElementById('voiceStability');
      stability.value = config.stability ?? 0.5;
      stability.nextElementSibling.textContent = parseFloat(stability.value).toFixed(2);

      const similarity = document.getElementById('voiceSimilarity');
      similarity.value = config.similarity ?? 0.75;
      similarity.nextElementSibling.textContent = parseFloat(similarity.value).toFixed(2);

      const style = document.getElementById('voiceStyle');
      style.value = config.style ?? 0;
      style.nextElementSibling.textContent = parseFloat(style.value).toFixed(2);

      const speed = document.getElementById('voiceSpeed');
      speed.value = config.speed ?? 1;
      speed.nextElementSibling.textContent = parseFloat(speed.value).toFixed(2);

      document.getElementById('voiceModal').classList.add('show');
    }

    function addVoice() {
      isNewVoice = true;
      document.getElementById('voiceModalTitle').textContent = 'Add New Character Voice';
      document.getElementById('voiceId').value = '';
      document.getElementById('voiceLabel').value = '';
      document.getElementById('voiceDescription').value = '';
      document.getElementById('voiceVoiceId').value = '';
      document.getElementById('voiceColor').value = '#6b7280';

      ['voiceStability', 'voiceSimilarity', 'voiceStyle', 'voiceSpeed'].forEach(id => {
        const el = document.getElementById(id);
        el.value = id === 'voiceSpeed' ? 1 : (id === 'voiceSimilarity' ? 0.75 : (id === 'voiceStability' ? 0.5 : 0));
        el.nextElementSibling.textContent = parseFloat(el.value).toFixed(2);
      });

      document.getElementById('voiceModal').classList.add('show');
    }

    function closeVoiceModal() {
      document.getElementById('voiceModal').classList.remove('show');
    }

    async function saveVoice() {
      const label = document.getElementById('voiceLabel').value.trim();
      if (!label) {
        showToast('Please enter a character name', true);
        return;
      }

      let id = document.getElementById('voiceId').value;
      if (isNewVoice || !id) {
        id = label.toLowerCase().replace(/\\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      }

      const data = {
        id,
        label,
        description: document.getElementById('voiceDescription').value.trim(),
        voiceId: document.getElementById('voiceVoiceId').value.trim(),
        color: document.getElementById('voiceColor').value,
        stability: parseFloat(document.getElementById('voiceStability').value),
        similarity: parseFloat(document.getElementById('voiceSimilarity').value),
        style: parseFloat(document.getElementById('voiceStyle').value),
        speed: parseFloat(document.getElementById('voiceSpeed').value),
      };

      try {
        const response = await fetch('/api/voice/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
          showToast('Voice configuration saved!');
          setTimeout(() => location.reload(), 500);
        } else {
          showToast('Failed: ' + result.error, true);
        }
      } catch (err) {
        showToast('Error: ' + err.message, true);
      }

      closeVoiceModal();
    }
  </script>
</body>
</html>`;
}

function generateEditPage(cantica, cantoNumber) {
  const mapping = loadMapping();
  const voiceConfig = loadVoiceConfig();
  const canto = mapping.cantos[cantica]?.[cantoNumber];

  if (!canto) {
    return `<html><body><h1>Canto not found: ${cantica} ${cantoNumber}</h1></body></html>`;
  }

  const segments = canto.segments;

  // Build segments HTML
  const segmentsHtml = segments.map((seg, index) => {
    const config = voiceConfig[seg.speaker] || voiceConfig.character || { color: '#6b7280', label: seg.speaker };
    const issues = detectIssues(seg);
    const wordCount = seg.words || seg.text.split(/\s+/).length;
    const speakerLabel = config.label || seg.speaker;
    const speakerColor = config.color || '#6b7280';

    return `
      <div class="segment ${issues.length > 0 ? 'has-issues' : ''}" data-index="${index}" data-id="${seg.id}">
        <div class="segment-header">
          <span class="segment-number">#${index + 1}</span>
          <select class="speaker-select" data-index="${index}" style="border-color: ${speakerColor}; background-color: ${speakerColor}15;">
            ${Object.entries(voiceConfig).map(([id, c]) =>
              `<option value="${id}" ${id === seg.speaker ? 'selected' : ''}>${c.label || id}</option>`
            ).join('')}
            ${!voiceConfig[seg.speaker] ? `<option value="${seg.speaker}" selected>${seg.speaker}</option>` : ''}
            <option value="__custom__">+ Add New...</option>
          </select>
          <label class="dialogue-toggle">
            <input type="checkbox" class="dialogue-checkbox" data-index="${index}" ${seg.isDialogue ? 'checked' : ''}>
            <span class="toggle-label">${seg.isDialogue ? 'Dialogue' : 'Narration'}</span>
          </label>
          <span class="word-count">${wordCount} words</span>
          <div class="segment-actions">
            <button class="btn-icon" onclick="playSegment(${index})" title="Play audio">▶️</button>
            <button class="btn-icon btn-split" data-index="${index}" title="Split">✂️</button>
            <button class="btn-icon btn-merge" data-index="${index}" title="Merge">🔗</button>
            <button class="btn-icon btn-delete" data-index="${index}" title="Delete">🗑️</button>
          </div>
        </div>
        ${issues.length > 0 ? `<div class="issues">${issues.map(i => `<span class="issue-badge">⚠️ ${i}</span>`).join('')}</div>` : ''}
        <textarea class="segment-text" data-index="${index}" rows="${Math.min(8, Math.max(2, seg.text.split('\\n').length))}">${escapeHtml(seg.text)}</textarea>
      </div>
    `;
  }).join('');

  // Get prev/next canto
  const cantoNumbers = Object.keys(mapping.cantos[cantica] || {}).map(n => parseInt(n)).sort((a, b) => a - b);
  const currentIdx = cantoNumbers.indexOf(cantoNumber);
  const prevCanto = currentIdx > 0 ? cantoNumbers[currentIdx - 1] : null;
  const nextCanto = currentIdx < cantoNumbers.length - 1 ? cantoNumbers[currentIdx + 1] : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit: ${cantica} Canto ${cantoNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .header {
      background: #1e293b;
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 1px solid #334155;
    }
    .header-content {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .header-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .nav-btn {
      padding: 0.5rem 0.75rem;
      background: #334155;
      border: none;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.875rem;
      text-decoration: none;
    }
    .nav-btn:hover { background: #475569; color: #e2e8f0; }
    .nav-btn.disabled { opacity: 0.3; pointer-events: none; }
    .header h1 { font-size: 1.125rem; color: #f1f5f9; }
    .header-actions { display: flex; gap: 0.5rem; }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.8rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #10b981; color: white; }
    .btn-primary:hover { background: #059669; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-generate { background: #8b5cf6; color: white; }
    .btn-generate:hover { background: #7c3aed; }
    .unsaved { color: #f59e0b; font-size: 0.75rem; display: none; }
    .unsaved.show { display: inline; }

    .container { max-width: 1000px; margin: 0 auto; padding: 1.5rem; }
    .segment {
      background: #1e293b;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      border: 1px solid #334155;
    }
    .segment:hover { border-color: #475569; }
    .segment.has-issues { border-color: #f59e0b; }
    .segment.modified { border-color: #3b82f6; }
    .segment-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }
    .segment-number { font-weight: 600; color: #64748b; font-size: 0.8rem; min-width: 1.5rem; }
    .speaker-select {
      padding: 0.375rem 0.5rem;
      border-radius: 5px;
      border: 2px solid;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
    }
    .dialogue-toggle {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #334155;
      border-radius: 4px;
    }
    .word-count { font-size: 0.7rem; color: #64748b; margin-left: auto; }
    .segment-actions { display: flex; gap: 0.125rem; }
    .btn-icon {
      background: transparent;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      opacity: 0.4;
      transition: opacity 0.2s;
      border-radius: 3px;
    }
    .btn-icon:hover { opacity: 1; background: #334155; }
    .issues { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 0.5rem; }
    .issue-badge {
      background: #78350f;
      color: #fef3c7;
      font-size: 0.65rem;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
    }
    .segment-text {
      width: 100%;
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 0.9rem;
      line-height: 1.7;
      resize: vertical;
    }
    .segment-text:focus { outline: none; border-color: #3b82f6; }

    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1000;
    }
    .toast.show { opacity: 1; }
    .toast.error { background: #dc2626; }

    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: #1e293b;
      padding: 1.5rem;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
    }
    .modal h2 { margin-bottom: 1rem; color: #f1f5f9; font-size: 1.125rem; }
    .modal textarea {
      width: 100%;
      height: 150px;
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 0.9rem;
      line-height: 1.7;
      margin-bottom: 1rem;
    }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

    audio { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="header-nav">
        <a href="/" class="nav-btn">← All Cantos</a>
        <a href="/edit/${cantica}/${prevCanto || cantoNumber}" class="nav-btn ${!prevCanto ? 'disabled' : ''}">‹ Prev</a>
        <h1>${cantica.charAt(0).toUpperCase() + cantica.slice(1)} - ${canto.title} <span class="unsaved" id="unsaved">● Unsaved</span></h1>
        <a href="/edit/${cantica}/${nextCanto || cantoNumber}" class="nav-btn ${!nextCanto ? 'disabled' : ''}">Next ›</a>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="location.reload()">↻</button>
        <button class="btn btn-primary" onclick="saveChanges()">💾 Save</button>
        <button class="btn btn-generate" onclick="generateAudio()">🎙️ Generate</button>
      </div>
    </div>
  </div>

  <div class="container">
    <div id="segments">${segmentsHtml}</div>
    <button class="btn btn-secondary" style="width:100%; margin-top:1rem;" onclick="addSegment()">+ Add Segment</button>
  </div>

  <div class="toast" id="toast"></div>

  <div class="modal" id="splitModal">
    <div class="modal-content">
      <h2>✂️ Split Segment</h2>
      <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.75rem;">Add blank lines where you want to split.</p>
      <textarea id="splitText"></textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeSplitModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmSplit()">Split</button>
      </div>
    </div>
  </div>

  <audio id="audioPlayer"></audio>

  <script>
    const cantica = '${cantica}';
    const cantoNumber = ${cantoNumber};
    const voiceConfig = ${JSON.stringify(voiceConfig)};
    let hasUnsavedChanges = false;
    let currentSplitIndex = -1;

    function markUnsaved() {
      hasUnsavedChanges = true;
      document.getElementById('unsaved').classList.add('show');
    }

    function showToast(msg, err = false) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (err ? ' error' : '');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    function updateSelectColor(sel) {
      const cfg = voiceConfig[sel.value] || { color: '#6b7280' };
      sel.style.borderColor = cfg.color;
      sel.style.backgroundColor = cfg.color + '15';
    }

    // Event listeners
    document.querySelectorAll('.speaker-select').forEach(sel => {
      updateSelectColor(sel);
      sel.addEventListener('change', function() {
        if (this.value === '__custom__') {
          const name = prompt('Enter character name:');
          if (name) {
            window.location.href = '/?tab=voices&new=' + encodeURIComponent(name);
          } else {
            this.value = 'narrator';
          }
        }
        updateSelectColor(this);
        this.closest('.segment').classList.add('modified');
        markUnsaved();
      });
    });

    document.querySelectorAll('.dialogue-checkbox').forEach(cb => {
      cb.addEventListener('change', function() {
        this.nextElementSibling.textContent = this.checked ? 'Dialogue' : 'Narration';
        this.closest('.segment').classList.add('modified');
        markUnsaved();
      });
    });

    document.querySelectorAll('.segment-text').forEach(ta => {
      ta.addEventListener('input', function() {
        this.closest('.segment').classList.add('modified');
        markUnsaved();
        const wc = this.value.trim().split(/\\s+/).filter(w => w).length;
        this.closest('.segment').querySelector('.word-count').textContent = wc + ' words';
      });
    });

    // Split
    document.querySelectorAll('.btn-split').forEach(btn => {
      btn.addEventListener('click', function() {
        currentSplitIndex = parseInt(this.dataset.index);
        document.getElementById('splitText').value = document.querySelector(\`.segment-text[data-index="\${currentSplitIndex}"]\`).value;
        document.getElementById('splitModal').classList.add('show');
      });
    });

    function closeSplitModal() { document.getElementById('splitModal').classList.remove('show'); }

    async function confirmSplit() {
      const parts = document.getElementById('splitText').value.split(/\\n\\n+/).filter(p => p.trim());
      if (parts.length <= 1) { showToast('Add blank lines to split', true); return; }

      const seg = document.querySelector(\`.segment[data-index="\${currentSplitIndex}"]\`);
      const speaker = seg.querySelector('.speaker-select').value;
      const isDialogue = seg.querySelector('.dialogue-checkbox').checked;

      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantica, cantoNumber, segmentIndex: currentSplitIndex, parts: parts.map(p => p.trim()), speaker, isDialogue })
      });
      const r = await res.json();
      if (r.success) { showToast('Split!'); setTimeout(() => location.reload(), 500); }
      else showToast('Error: ' + r.error, true);
      closeSplitModal();
    }

    // Merge
    document.querySelectorAll('.btn-merge').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!confirm('Merge with next segment?')) return;
        const res = await fetch('/api/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantica, cantoNumber, segmentIndex: parseInt(this.dataset.index) })
        });
        const r = await res.json();
        if (r.success) { showToast('Merged!'); setTimeout(() => location.reload(), 500); }
        else showToast('Error: ' + r.error, true);
      });
    });

    // Delete
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete this segment?')) return;
        const res = await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantica, cantoNumber, segmentIndex: parseInt(this.dataset.index) })
        });
        const r = await res.json();
        if (r.success) { showToast('Deleted!'); setTimeout(() => location.reload(), 500); }
        else showToast('Error: ' + r.error, true);
      });
    });

    // Play audio
    function playSegment(index) {
      const segNum = (index + 1).toString().padStart(3, '0');
      const audio = document.getElementById('audioPlayer');
      audio.src = \`/audio/${cantica}/canto_${cantoNumber}/segment_\${segNum}.mp3\`;
      audio.play().catch(e => showToast('Audio not found', true));
    }

    // Save
    async function saveChanges() {
      const segments = [];
      document.querySelectorAll('.segment').forEach((seg, i) => {
        segments.push({
          index: i,
          speaker: seg.querySelector('.speaker-select').value,
          isDialogue: seg.querySelector('.dialogue-checkbox').checked,
          text: seg.querySelector('.segment-text').value
        });
      });

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantica, cantoNumber, segments })
      });
      const r = await res.json();
      if (r.success) {
        showToast('Saved!');
        hasUnsavedChanges = false;
        document.getElementById('unsaved').classList.remove('show');
        document.querySelectorAll('.segment.modified').forEach(s => s.classList.remove('modified'));
      } else showToast('Error: ' + r.error, true);
    }

    // Add segment
    async function addSegment() {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantica, cantoNumber })
      });
      const r = await res.json();
      if (r.success) { showToast('Added!'); setTimeout(() => location.reload(), 500); }
      else showToast('Error: ' + r.error, true);
    }

    // Generate
    async function generateAudio() {
      if (hasUnsavedChanges && !confirm('Save changes first?')) return;
      if (hasUnsavedChanges) await saveChanges();

      showToast('Generating audio...');
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantica, cantoNumber })
      });
      const r = await res.json();
      if (r.success) showToast('Generation started! Check terminal.');
      else showToast('Error: ' + r.error, true);
    }

    window.addEventListener('beforeunload', e => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    });
  </script>
</body>
</html>`;
}

function createServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Serve main page
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateMainPage());
      return;
    }

    // Serve edit page
    const editMatch = url.pathname.match(/^\/edit\/(\w+)\/(\d+)$/);
    if (req.method === 'GET' && editMatch) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateEditPage(editMatch[1], parseInt(editMatch[2])));
      return;
    }

    // Serve audio files
    if (req.method === 'GET' && url.pathname.startsWith('/audio/')) {
      const audioPath = path.join(__dirname, 'public', url.pathname);
      if (fs.existsSync(audioPath)) {
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        fs.createReadStream(audioPath).pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Audio not found');
      return;
    }

    // API: Save voice config
    if (req.method === 'POST' && url.pathname === '/api/voice/save') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const config = loadVoiceConfig();
          config[data.id] = {
            voiceId: data.voiceId,
            label: data.label,
            description: data.description,
            color: data.color,
            stability: data.stability,
            similarity: data.similarity,
            style: data.style,
            speed: data.speed,
          };
          saveVoiceConfig(config);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Save changes
    if (req.method === 'POST' && url.pathname === '/api/save') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber, segments } = JSON.parse(body);
          const mapping = loadMapping();
          const canto = mapping.cantos[cantica][cantoNumber];

          segments.forEach(({ index, speaker, isDialogue, text }) => {
            if (canto.segments[index]) {
              canto.segments[index].speaker = speaker;
              canto.segments[index].isDialogue = isDialogue;
              canto.segments[index].text = text;
              canto.segments[index].words = text.trim().split(/\s+/).filter(w => w).length;
            }
          });

          const backupPath = saveMapping(mapping);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, backup: path.basename(backupPath) }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Split segment
    if (req.method === 'POST' && url.pathname === '/api/split') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber, segmentIndex, parts, speaker, isDialogue } = JSON.parse(body);
          const mapping = loadMapping();
          const canto = mapping.cantos[cantica][cantoNumber];

          const newSegments = parts.map((text) => ({
            id: 0,
            speaker,
            text,
            isDialogue,
            words: text.trim().split(/\s+/).filter(w => w).length
          }));

          canto.segments.splice(segmentIndex, 1, ...newSegments);
          canto.segments.forEach((seg, i) => seg.id = i + 1);
          canto.totalSegments = canto.segments.length;

          saveMapping(mapping);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Merge segments
    if (req.method === 'POST' && url.pathname === '/api/merge') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber, segmentIndex } = JSON.parse(body);
          const mapping = loadMapping();
          const canto = mapping.cantos[cantica][cantoNumber];

          if (segmentIndex < canto.segments.length - 1) {
            const seg1 = canto.segments[segmentIndex];
            const seg2 = canto.segments[segmentIndex + 1];
            seg1.text = seg1.text + '\n\n' + seg2.text;
            seg1.words = seg1.text.trim().split(/\s+/).filter(w => w).length;
            canto.segments.splice(segmentIndex + 1, 1);
            canto.segments.forEach((seg, i) => seg.id = i + 1);
            canto.totalSegments = canto.segments.length;
            saveMapping(mapping);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Delete segment
    if (req.method === 'POST' && url.pathname === '/api/delete') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber, segmentIndex } = JSON.parse(body);
          const mapping = loadMapping();
          const canto = mapping.cantos[cantica][cantoNumber];

          canto.segments.splice(segmentIndex, 1);
          canto.segments.forEach((seg, i) => seg.id = i + 1);
          canto.totalSegments = canto.segments.length;

          saveMapping(mapping);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Add segment
    if (req.method === 'POST' && url.pathname === '/api/add') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber } = JSON.parse(body);
          const mapping = loadMapping();
          const canto = mapping.cantos[cantica][cantoNumber];

          canto.segments.push({
            id: canto.segments.length + 1,
            speaker: 'narrator',
            text: 'New segment...',
            isDialogue: false,
            words: 2
          });
          canto.totalSegments = canto.segments.length;

          saveMapping(mapping);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // API: Generate audio
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { cantica, cantoNumber } = JSON.parse(body);
          exec(`node generate-narration-with-timestamps.js ${cantica} ${cantoNumber}`, (err, stdout, stderr) => {
            console.log(stdout);
            if (stderr) console.error(stderr);
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}

const server = createServer();
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║      Divine Comedy - Speaker & Voice Manager                          ║
╚══════════════════════════════════════════════════════════════════════╝

🌐 Server running at: http://localhost:${PORT}

Features:
  • Browse and edit all cantos
  • Configure voice IDs and settings
  • Add new characters with full voice config
  • Play segment audio
  • Generate audio with timestamps

Press Ctrl+C to stop.
`);

  // Open in browser
  const openCmd = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} http://localhost:${PORT}`);
});
