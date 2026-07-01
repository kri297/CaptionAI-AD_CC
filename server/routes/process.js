const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { EdgeTTS } = require('node-edge-tts');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// ── Upload directory ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const getDuration = (filePath) => new Promise((resolve) => {
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err || !metadata?.format?.duration) resolve(0);
    else resolve(parseFloat(metadata.format.duration));
  });
});

// ── Multer config ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const ALLOWED_MIMES = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'video/avi', 'video/x-msvideo', 'video/x-matroska',
  'video/ogg', 'video/3gpp', 'video/3gpp2'
];

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format. Allowed: MP4, WebM, MOV, AVI`));
    }
  }
});

// ── Gemini helpers ────────────────────────────────────────────────────────
function getClients(userApiKey) {
  const keyToUse = userApiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env file or provide one in the app.');
  }
  return new GoogleGenAI({ apiKey: keyToUse });
}

async function uploadToGemini(ai, filePath, mimeType) {
  console.log(`  📤 Uploading to Gemini File API...`);
  let file = await ai.files.upload({
    file: filePath,
    mimeType,
    displayName: path.basename(filePath)
  });

  process.stdout.write(`  ⏳ Processing`);
  let attempts = 0;
  while (file.state === 'PROCESSING' && attempts < 120) {
    await new Promise(r => setTimeout(r, 3000));
    file = await ai.files.get({ name: file.name });
    process.stdout.write('.');
    attempts++;
  }
  console.log();

  if (file.state === 'FAILED' || file.state === 'PROCESSING') {
    throw new Error('Gemini could not process this video. Try a different format or smaller file.');
  }

  console.log(`  ✅ File ready`);
  return file;
}

function safeParseJSON(text) {
  const t = (text || '').trim();
  // Direct parse
  try { return JSON.parse(t); } catch {}
  // From code fence ```json ... ```
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  const arr = t.match(/\[[\s\S]*\]/s);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  
  // Ultimate Fallback: Extract individual JSON objects manually if the array got cut off by token limits
  const objectRegex = /{[^{}]*?start[^{}]*?end[^{}]*?}/g;
  const matches = t.match(objectRegex);
  if (matches && matches.length > 0) {
    const parsed = [];
    for (const m of matches) {
      try { parsed.push(JSON.parse(m)); } catch {}
    }
    if (parsed.length > 0) {
      console.log(`  ⚠️  Recovered ${parsed.length} items from truncated JSON`);
      return parsed;
    }
  }

  console.warn('  ⚠️  Could not parse JSON from Gemini response. Raw Response:');
  console.warn(text);
  return [];
}

const combinedSchema = {
  type: 'OBJECT',
  properties: {
    detected_source_language: {
      type: 'STRING',
      description: 'The main language spoken in the video before translation (e.g., "English", "French")'
    },
    cc: {
      type: 'ARRAY',
      description: 'List of transcribed dialogue captions with start, end, text and emotion.',
      items: {
        type: 'OBJECT',
        properties: {
          start: { type: 'STRING', description: 'Timestamp when dialogue starts in HH:MM:SS,mmm format' },
          end: { type: 'STRING', description: 'Timestamp when dialogue ends in HH:MM:SS,mmm format' },
          text: { type: 'STRING', description: 'The spoken dialogue text' },
          speaker: { type: 'STRING', description: 'Speaker label or name (e.g., "Speaker 1" or "John")' },
          emotion: { type: 'STRING', description: 'Detected vocal emotion: neutral, angry, whisper, excited, sad' }
        },
        required: ['start', 'end', 'text', 'speaker', 'emotion']
      }
    },
    ac: {
      type: 'ARRAY',
      description: 'List of audio descriptions for non-dialogue audio events and visual actions in the silent gaps.',
      items: {
        type: 'OBJECT',
        properties: {
          start: { type: 'STRING', description: 'Timestamp when description starts in HH:MM:SS,mmm format' },
          end: { type: 'STRING', description: 'Timestamp when description ends in HH:MM:SS,mmm format' },
          description: { type: 'STRING', description: 'Short description of visual action or sound wrapped in square brackets (e.g. "[Door opens slowly]")' }
        },
        required: ['start', 'end', 'description']
      }
    }
  },
  required: ['detected_source_language', 'cc', 'ac']
};

async function runPrompt(ai, fileRef, prompt, schema = null, retries = 3) {
  const config = {
    temperature: 0.4
  };
  
  if (schema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = schema;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            fileData: {
              mimeType: fileRef.mimeType,
              fileUri: fileRef.uri
            }
          },
          prompt
        ],
        config
      });
      return safeParseJSON(result.text);
    } catch (err) {
      console.warn(`  ⚠️  Gemini API error (attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      // Wait for 5 seconds before retrying
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

const getCombinedPrompt = (lang, maxDurationStr) => {
  const needsTranslation = lang && lang !== 'Auto-Detect';
  const translationInst = needsTranslation 
    ? `IMPORTANT: Translate all spoken dialogue and audio descriptions into perfectly fluent ${lang}. The final output text MUST be written in ${lang} script. Localize cultural idioms and nuances naturally instead of translating literally.` 
    : `IMPORTANT: Transcribe dialogue in the original language spoken in the video. Write audio descriptions in English (or the original language if appropriate).`;

  return `You are a professional subtitler and audio describer for accessibility, following standards from industry leading apps like CineDubs and Netflix. Carefully watch and listen to this entire video and perform THREE tasks:

Detect the main source language of the video dialogue and set the 'detected_source_language' field.

Transcribe all spoken dialogue (Closed Captions - CC). If translation is requested, translate/localize the dialogue.

Generate Audio Descriptions (AC) for the silent gaps and non-speech events (such as visual actions, critical scene changes, character movements, expressions, background music, or sound effects). Be extremely thorough and capture all key visual details and sounds during every pause; do not leave silent gaps undescribed if there is visual context happening.

CRITICAL INSTRUCTION: The video is EXACTLY ${maxDurationStr} long. You MUST NOT generate any timestamps that exceed ${maxDurationStr}. Keep timestamps realistic and tightly aligned with the video.

Rules for Closed Captions (cc):
- Each entry represents one sentence or a natural speech pause.
- Timestamps MUST be in HH:MM:SS,mmm format (e.g., 00:00:03,500).
- Use EXACT start and end times for when the words are actually spoken.
- Analyze the vocal tone and context to assign ONE of these emotions: "neutral", "angry", "whisper", "excited", or "sad".
- Specify the speaker in the 'speaker' field (e.g., "Speaker 1").
- Do NOT include sound descriptions in CC — speech only.

Rules for Audio Descriptions (ac):
- ONLY generate descriptions for silent gaps where no dialogue (CC) is present. There must be ABSOLUTELY ZERO overlap between CC and AC timestamps.
- MINIMUM GAP REQUIREMENT: DO NOT generate Audio Descriptions for any gap that is shorter than 1.5 seconds. If the silent gap is less than 1.5 seconds, leave it completely blank.
- CRITICAL LENGTH CONSTRAINT: You MUST calculate the exact duration of the gap (End Time - Start Time). You are only allowed to write TWO (2) WORDS per second of gap time. For example: A 2-second gap = MAX 4 words. A 3-second gap = MAX 6 words. If you write more than this limit, the AI voice will be brutally cut off mid-sentence. Keep descriptions EXTREMELY punchy and concise (e.g. "[Man smiles warmly]").
- BACKGROUND MUSIC & SOUNDS: If there is background music, ambient sound, or a specific audio effect playing during a gap, you MUST describe it (e.g. "[Soft acoustic guitar melody plays]", "[Uplifting cinematic music swells]", or "[Eerie wind blowing]").
- ON-SCREEN TEXT & ACTION DETAILS: Scan the video carefully for key visual elements occurring during silences or pauses. You MUST accurately read any important text written on the screen (especially at the end of the video). IMPORTANT: Do NOT use prefixes like 'Text on screen:' or 'Lekh:' or 'Written:'. Just output the text naturally. Also describe actions critical to the plot, character movements, and expressions (e.g., "[Subscribe for more]", "[Rahul smiles warmly]").
- ACCURACY & NO HALLUCINATIONS: Describe what is explicitly visible or audible. Do not guess or hallucinate context. Watch every frame up to the very last second of the video, ensuring any final text or visuals are captured accurately.
- Wrap descriptions in square brackets.

${translationInst}`;
};

function flattenCaptions(caps) {
  if (!caps.length) return [];
  
  let points = new Set();
  caps.forEach(c => { points.add(c.start); points.add(c.end); });
  points = Array.from(points).sort((a, b) => a - b);
  
  const flattened = [];
  for (let i = 0; i < points.length - 1; i++) {
    const tStart = points[i];
    const tEnd = points[i+1];
    const tMid = (tStart + tEnd) / 2;
    
    // Find shortest active CC
    const activeCC = caps.filter(c => c.type === 'cc' && tMid >= c.start && tMid <= c.end)
                         .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
                         
    // Find shortest active AC
    const activeAC = caps.filter(c => c.type === 'ac' && tMid >= c.start && tMid <= c.end)
                         .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];

    if (activeCC || activeAC) {
      const lines = [];
      let emotion = null;

      if (activeAC) lines.push(`<i>${activeAC.text}</i>`);
      if (activeCC) {
        lines.push(activeCC.text);
        emotion = activeCC.emotion;
      }
      
      const unifiedText = lines.join('\n');
      
      const prev = flattened[flattened.length - 1];
      if (prev && prev.text === unifiedText && prev.emotion === emotion) {
        prev.end = tEnd;
      } else {
        flattened.push({ text: unifiedText, emotion, start: tStart, end: tEnd });
      }
    }
  }
  return flattened;
}

function generateSRT(captions, emotionMode) {
  const getEmotionColor = (emotion) => {
    switch(emotion) {
      case 'angry': return '#FF4444';
      case 'whisper': return '#AAAAAA';
      case 'excited': return '#FFD700';
      case 'sad': return '#88CCFF';
      default: return null;
    }
  };

  return flattenCaptions(captions)
    .map((c, i) => {
      let text = c.text;
      if (emotionMode && c.emotion && c.emotion !== 'neutral') {
        const color = getEmotionColor(c.emotion);
        if (color) text = `<font color="${color}">${text}</font>`;
      }
      return `${i + 1}\n${formatTimestamp(c.start)} --> ${formatTimestamp(c.end)}\n${text}`;
    })
    .join('\n\n');
}

const checkHasAudio = (filePath) => new Promise((resolve) => {
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err || !metadata?.streams) resolve(false);
    else resolve(metadata.streams.some(s => s.codec_type === 'audio'));
  });
});

const renderAccessibilityAssets = (fileId, inputVideoPath, cc, ac, videoDuration, targetLanguage, ttsVoice) => {
  return new Promise(async (resolve, reject) => {
    try {
      const srtFilename = `${fileId}_cc.srt`;
      const srtPath = path.join(UPLOAD_DIR, srtFilename);
      
      const formattedCaps = [
        ...cc.map(c => ({ type: 'cc', start: parseTimestamp(c.start), end: parseTimestamp(c.end), text: c.text, emotion: c.emotion })),
        ...ac.map(a => ({ type: 'ac', start: parseTimestamp(a.start), end: parseTimestamp(a.end), text: a.description || a.text }))
      ];
      
      const srtContent = generateSRT(formattedCaps, true);
      fs.writeFileSync(srtPath, srtContent, 'utf8');
      
      const mixedAudioFilename = `${fileId}_mixed.mp3`;
      const mixedAudioPath = path.join(UPLOAD_DIR, mixedAudioFilename);
      
      const accessibleVideoFilename = `${fileId}_accessible.mp4`;
      const accessibleVideoPath = path.join(UPLOAD_DIR, accessibleVideoFilename);
      
      const adCaptions = ac.filter(c => c.audioFile);
      const sortedCaptions = [...formattedCaps].sort((a, b) => a.start - b.start);
      
      let filterComplex = '';
      let adMixInputs = '';
      let validAdCount = 0;
      
      for (let i = 0; i < adCaptions.length; i++) {
        const ad = adCaptions[i];
        const adPath = path.join(UPLOAD_DIR, ad.audioFile);
        if (fs.existsSync(adPath) && fs.statSync(adPath).size > 0) {
          const delayMs = Math.round(parseTimestamp(ad.start) * 1000);
          const nextEvent = sortedCaptions.find(c => c.start > parseTimestamp(ad.start) + 0.05);
          const nextEventStart = nextEvent ? nextEvent.start : videoDuration;
          const availableTime = Math.max(0, nextEventStart - parseTimestamp(ad.start));
          
          if (availableTime < 1.5) {
            console.log(`  Skipping mixed AD segment starting at ${ad.start} due to insufficient gap`);
            continue;
          }
          
          const inputIndex = validAdCount + 1; // Since 0 is original video
          const targetDuration = Math.max(0.1, availableTime - 0.1);
          const ttsDuration = await getDuration(adPath);
          
          let filterInput = `${inputIndex}:a`;
          let filters = [];
          
          if (availableTime > 0 && ttsDuration > targetDuration) {
            const tempo = Math.min(1.15, ttsDuration / targetDuration);
            if (tempo > 1.01) {
              filters.push(`atempo=${tempo.toFixed(3)}`);
            }
            filters.push(`atrim=end=${targetDuration.toFixed(3)}`);
            filters.push('asetpts=PTS-STARTPTS');
            const fadeDur = Math.min(0.2, targetDuration / 2);
            const fadeStart = targetDuration - fadeDur;
            filters.push(`afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`);
          }
          
          if (filters.length > 0) {
            filterComplex += `[${filterInput}]${filters.join(',')}[pre_a${inputIndex}];`;
            filterInput = `pre_a${inputIndex}`;
          }
          
          filterComplex += `[${filterInput}]adelay=${delayMs}|${delayMs}[a${inputIndex}];`;
          adMixInputs += `[a${inputIndex}]`;
          validAdCount++;
        }
      }
      
      const hasAudioTrack = await checkHasAudio(inputVideoPath);
      
      if (validAdCount > 0) {
        if (validAdCount > 1) {
          filterComplex += `${adMixInputs}amix=inputs=${validAdCount}:dropout_transition=99999[ad_raw];[ad_raw]volume=${validAdCount}[ad_combined];`;
        } else {
          filterComplex += `[a1]volume=1.0[ad_combined];`;
        }
        filterComplex += `[ad_combined]asplit[ad_control][ad_heard];`;
        
        if (hasAudioTrack) {
          filterComplex += `[0:a][ad_control]sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500[ducked_orig];`;
          filterComplex += `[ducked_orig][ad_heard]amix=inputs=2:dropout_transition=99999:duration=longest[final_raw_aout];[final_raw_aout]volume=2.0[padded_final];`;
        } else {
          filterComplex += `[ad_heard]volume=1.0[padded_final];`;
        }
        
        if (videoDuration > 0) {
          const targetSampleRate = 44100;
          const totalSamples = Math.round(videoDuration * targetSampleRate);
          filterComplex += `[padded_final]aresample=${targetSampleRate},apad=whole_len=${totalSamples}[final_aout]`;
        } else {
          filterComplex += `[padded_final]acopy[final_aout]`;
        }
        
        // 1. Save mixed audio (MP3)
        await new Promise(async (resMix, rejMix) => {
          try {
            let mixCmd = ffmpeg();
            mixCmd = mixCmd.input(inputVideoPath);
            for (let i = 0; i < adCaptions.length; i++) {
              const ad = adCaptions[i];
              const adPath = path.join(UPLOAD_DIR, ad.audioFile);
              if (fs.existsSync(adPath) && fs.statSync(adPath).size > 0) {
                const delayMs = Math.round(parseTimestamp(ad.start) * 1000);
                const nextEvent = sortedCaptions.find(c => c.start > parseTimestamp(ad.start) + 0.05);
                const nextEventStart = nextEvent ? nextEvent.start : videoDuration;
                const availableTime = Math.max(0, nextEventStart - parseTimestamp(ad.start));
                
                if (availableTime < 1.5) {
                  continue;
                }
                mixCmd = mixCmd.input(adPath);
              }
            }
            
            mixCmd.complexFilter(filterComplex)
              .outputOptions(['-map [final_aout]', '-c:a libmp3lame', '-b:a 192k'])
              .save(mixedAudioPath)
              .on('end', resMix)
              .on('error', rejMix);
          } catch (e) {
            rejMix(e);
          }
        });
        
        // 2. Render final accessible video (MP4)
        const relativeSrtPath = path.relative(process.cwd(), srtPath).replace(/\\/g, '/');
        const forceStyle = `Fontname=Arial,Fontsize=18,PrimaryColour=&HFFFFFF&,BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,MarginV=25`;
        
        await new Promise((resVideo, rejVideo) => {
          ffmpeg(inputVideoPath)
            .input(mixedAudioPath)
            .outputOptions([
              '-c:v libx264',
              '-preset ultrafast',
              '-crf 23',
              '-map 0:v',
              '-map 1:a',
              `-vf subtitles=${relativeSrtPath}:force_style='${forceStyle}'`,
              '-c:a aac',
              '-b:a 192k',
              '-shortest'
            ])
            .save(accessibleVideoPath)
            .on('end', resVideo)
            .on('error', rejVideo);
        });
      } else {
        // No AD generated, copy audio and burn subtitles
        await new Promise((resMix, rejMix) => {
          ffmpeg(inputVideoPath)
            .outputOptions(['-vn', '-c:a libmp3lame', '-b:a 192k'])
            .save(mixedAudioPath)
            .on('end', resMix)
            .on('error', (err) => {
              ffmpeg()
                .input('anullsrc=r=44100:cl=stereo')
                .inputOptions(['-f lavfi'])
                .outputOptions(['-t', videoDuration.toString(), '-c:a libmp3lame', '-b:a 192k'])
                .save(mixedAudioPath)
                .on('end', resMix)
                .on('error', rejMix);
            });
        });
        
        const relativeSrtPath = path.relative(process.cwd(), srtPath).replace(/\\/g, '/');
        const forceStyle = `Fontname=Arial,Fontsize=18,PrimaryColour=&HFFFFFF&,BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,MarginV=25`;
        
        await new Promise((resVideo, rejVideo) => {
          ffmpeg(inputVideoPath)
            .outputOptions([
              '-c:v libx264',
              '-preset ultrafast',
              '-crf 23',
              `-vf subtitles=${relativeSrtPath}:force_style='${forceStyle}'`,
              '-c:a aac',
              '-b:a 192k'
            ])
            .save(accessibleVideoPath)
            .on('end', resVideo)
            .on('error', rejVideo);
        });
      }
      
      resolve({
        srt: srtFilename,
        mixedAudio: mixedAudioFilename,
        accessibleVideo: accessibleVideoFilename
      });
      
    } catch (err) {
      reject(err);
    }
  });
};

function parseTimestamp(ts) {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const trimmed = ts.trim();
    if (trimmed.includes(':')) {
      const normalized = trimmed.replace(',', '.');
      const parts = normalized.split(':');
      let h = 0, m = 0, s = 0;
      if (parts.length === 3) {
        h = parseFloat(parts[0]) || 0;
        m = parseFloat(parts[1]) || 0;
        s = parseFloat(parts[2]) || 0;
      } else if (parts.length === 2) {
        m = parseFloat(parts[0]) || 0;
        s = parseFloat(parts[1]) || 0;
      } else if (parts.length === 1) {
        s = parseFloat(parts[0]) || 0;
      }
      return h * 3600 + m * 60 + s;
    }
    const val = parseFloat(trimmed);
    return isFinite(val) ? val : 0;
  }
  return 0;
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function calculateGaps(ccList, videoDuration) {
  let segments = ccList.map(c => {
    const vals = Object.values(c).filter(v => typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v));
    const t1 = parseTimestamp(c.start || c.startTime || vals[0] || '00:00:00,000');
    const t2 = parseTimestamp(c.end || c.endTime || vals[1] || '00:00:00,000');
    return { start: Math.min(t1, t2), end: Math.max(t1, t2) };
  }).sort((a, b) => a.start - b.start);

  let gaps = [];
  let currentEnd = 0;
  for (let seg of segments) {
    if (seg.start - currentEnd >= 2.5) { // Filter out small gaps (< 2.5s) where AD cannot fit
      gaps.push({ start: formatTimestamp(currentEnd), end: formatTimestamp(seg.start), durationSec: seg.start - currentEnd });
    }
    currentEnd = Math.max(currentEnd, seg.end);
  }

  if (videoDuration && videoDuration - currentEnd >= 2.5) {
    gaps.push({ start: formatTimestamp(currentEnd), end: formatTimestamp(videoDuration), durationSec: videoDuration - currentEnd });
  }

  return gaps;
}

const getAudioEventsPrompt = (lang) => `You are a professional audio accessibility engineer. Watch this video and write Audio Descriptions for non-dialogue audio events.

Return ONLY a raw JSON array — no markdown, no code blocks, no explanation, just the array:
[{"start":"HH:MM:SS,mmm","end":"HH:MM:SS,mmm","description":"[audio description]"}]

Rules:
- Include: background music, sound effects, ambient sounds, audience reactions, silence
- Do NOT include spoken dialogue — audio events only
- Wrap descriptions in square brackets. Be specific:
  ✓ [soft acoustic guitar melody]  ✗ [music]
  ✓ [distant thunder rumbling]     ✗ [noise]
  ✓ [crowd applauding loudly]      ✗ [people]
- Timestamps in HH:MM:SS,mmm format
- DO NOT translate the JSON keys (start, end, description). Only translate the values.
- If no notable audio events exist, return: []
- Output ONLY the JSON array, nothing else whatsoever`;

// ── Route ─────────────────────────────────────────────────────────────────
router.post('/process', upload.single('video'), async (req, res) => {
  const tempPath = req.file?.path;
  const targetLanguage = req.body.targetLanguage;

  // Extend timeout for long videos (10 minutes)
  req.socket.setTimeout(600000);
  res.setTimeout(600000);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file was provided.' });
    }

    const { originalname, size, mimetype } = req.file;
    const userApiKey = req.body.apiKey;
    console.log(`\n📹 Processing: "${originalname}" (${(size / 1024 / 1024).toFixed(1)} MB) ${targetLanguage ? `[Translating to: ${targetLanguage}]` : ''} ${userApiKey ? '[Custom API Key]' : ''}`);

    const ai = getClients(userApiKey);

    // 1. Upload to Gemini
    const geminiFile = await uploadToGemini(ai, tempPath, mimetype);

    const videoDuration = await getDuration(tempPath);
    const maxDurationStr = formatTimestamp(videoDuration);
    console.log(`  ⏱️ Actual Video Length: ${videoDuration.toFixed(2)}s (${maxDurationStr})`);

    // 2. Generate both CC & AD in a single combined call (saves rate limits/spikes)
    console.log('  🤖 Generating CC and AD captions in a single API call...');
    const resultJson = await runPrompt(ai, geminiFile, getCombinedPrompt(targetLanguage, maxDurationStr), combinedSchema);
    
    let cc = resultJson.cc || [];
    let ac = resultJson.ac || [];
    const detectedSourceLang = resultJson.detected_source_language || 'Unknown';
    console.log(`  🌐 Detected Source Language: ${detectedSourceLang}`);
    
    // Sanitize CC to prevent AI hallucinating
    const validCC = [];
    for (let c of cc) {
      if (c.start && c.end) {
        let t1 = parseTimestamp(c.start);
        let t2 = parseTimestamp(c.end);
        
        // Discard hallucinations beyond the video
        if (videoDuration > 0 && t1 >= videoDuration) continue;
        
        // Cap end time strictly to video duration
        if (videoDuration > 0 && t2 > videoDuration) t2 = videoDuration;
        
        // Force max length to 5 seconds if AI hallucinates long spans
        if (t2 - t1 > 10) t2 = t1 + 5;
        
        c.start = formatTimestamp(t1);
        c.end = formatTimestamp(t2);
        validCC.push(c);
      }
    }
    cc = validCC;
    
    // Sort CC by start time for overlap check
    cc.sort((a, b) => parseTimestamp(a.start) - parseTimestamp(b.start));

    // Sanitize AC to prevent AI hallucinating or overlapping
    const validAC = [];
    for (let a of ac) {
      if (a.start && a.end) {
        let t1 = parseTimestamp(a.start);
        let t2 = parseTimestamp(a.end);
        
        // Discard hallucinations beyond the video
        if (videoDuration > 0 && t1 >= videoDuration) continue;
        
        // Cap end time strictly to video duration
        if (videoDuration > 0 && t2 > videoDuration) t2 = videoDuration;

        // 1. Resolve overlaps with CC segments (add 0.1s buffer for clean audio)
        for (let c of cc) {
          const c1 = parseTimestamp(c.start);
          const c2 = parseTimestamp(c.end);
          const buffer = 0.1;
          
          if (t1 < c2 + buffer && t2 > c1 - buffer) {
            // Overlap detected!
            if (t1 >= c1 - buffer && t1 < c2 + buffer) {
              // AD starts during CC: push AD start to the end of CC + buffer
              t1 = c2 + buffer;
            }
            if (t2 > c1 - buffer && t2 <= c2 + buffer) {
              // AD ends during CC: pull AD end to the start of CC - buffer
              t2 = c1 - buffer;
            }
            if (t1 < c1 - buffer && t2 > c2 + buffer) {
              // AD completely covers CC: shrink it to the larger gap
              if ((c1 - buffer) - t1 >= t2 - (c2 + buffer)) {
                t2 = c1 - buffer;
              } else {
                t1 = c2 + buffer;
              }
            }
          }
          if (t1 >= t2) break; // If inverted or crushed, break out
        }
        
        // 2. Resolve overlaps between consecutive AD segments (AD vs AD)
        if (validAC.length > 0) {
          const lastAd = validAC[validAC.length - 1];
          const lastAdEnd = parseTimestamp(lastAd.end);
          if (t1 < lastAdEnd) {
            t1 = lastAdEnd + 0.1; // push this AD start forward with 0.1s buffer
          }
        }
        
        // Skip AD if adjusted duration is too small (< 1.5 seconds) to avoid overlap / rushed speech
        if (t2 - t1 < 1.5) {
          console.log(`  Skipping AD "${a.description || a.text}" because its adjusted duration is too short (${(t2 - t1).toFixed(2)}s)`);
          continue;
        }

        a.start = formatTimestamp(t1);
        a.end = formatTimestamp(t2);
        validAC.push(a);
      }
    }
    ac = validAC;
    
    console.log(`  ✅ Done — CC: ${cc.length}, AD: ${ac.length}`);

    // Map target languages to natural-sounding EdgeTTS voice profiles (male)
    const voiceMap = {
      'Hindi': 'hi-IN-MadhurNeural',
      'Telugu': 'te-IN-MohanNeural',
      'Tamil': 'ta-IN-ValluvarNeural',
      'Spanish': 'es-ES-AlvaroNeural',
      'French': 'fr-FR-HenriNeural',
      'Japanese': 'ja-JP-KeitaNeural',
      'English': 'en-US-GuyNeural',
      'Korean': 'ko-KR-InJoonNeural',
      'Chinese': 'zh-CN-YunxiNeural',
      'Portuguese': 'pt-BR-AntonioNeural',
      'German': 'de-DE-ConradNeural',
      'Arabic': 'ar-SA-HamedNeural',
      'Russian': 'ru-RU-DmitryNeural',
      'Italian': 'it-IT-ValerioNeural',
      'Kannada': 'kn-IN-GaganNeural',
      'Gujarati': 'gu-IN-NiranjanNeural',
      'Marathi': 'mr-IN-ManoharNeural',
      'Bengali': 'bn-IN-BashkarNeural',
      'Malayalam': 'ml-IN-MidhunNeural',
      'Urdu': 'ur-PK-AsadNeural',
      'Punjabi': 'pa-IN-GurpreetNeural',
      'Thai': 'th-TH-NiwatNeural',
      'Vietnamese': 'vi-VN-NamMinhNeural',
      'Turkish': 'tr-TR-AhmetNeural',
      'Indonesian': 'id-ID-ArdiNeural',
      'Dutch': 'nl-NL-MaartenNeural',
      'Polish': 'pl-PL-MarekNeural',
      'Swedish': 'sv-SE-MattiasNeural',
      'Auto-Detect': 'en-US-GuyNeural'
    };

    let ttsVoice = voiceMap[targetLanguage] || 'en-US-GuyNeural';
    if (targetLanguage === 'Auto-Detect' || !targetLanguage) {
      let sampleText = '';
      for (let a of ac) {
        sampleText = (a.description || a.text || '').replace(/^\[|\]$/g, '').trim();
        if (sampleText) break;
      }
      const hasTamil = /[\u0B80-\u0BFF]/.test(sampleText);
      const hasTelugu = /[\u0C00-\u0C7F]/.test(sampleText);
      const hasMalayalam = /[\u0D00-\u0D7F]/.test(sampleText);
      const hasBengali = /[\u0980-\u09FF]/.test(sampleText);
      const hasKannada = /[\u0C80-\u0CFF]/.test(sampleText);
      const hasGujarati = /[\u0A80-\u0AFF]/.test(sampleText);
      const hasPunjabi = /[\u0A00-\u0A7F]/.test(sampleText);
      const hasKorean = /[\uAC00-\uD7AF\u3130-\u318F]/.test(sampleText);
      const hasChinese = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(sampleText);
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(sampleText);
      const hasThai = /[\u0E00-\u0E7F]/.test(sampleText);
      const hasArabic = /[\u0600-\u06FF]/.test(sampleText);
      const hasHindi = /[\u0900-\u097F]/.test(sampleText);

      if (hasTamil) ttsVoice = 'ta-IN-ValluvarNeural';
      else if (hasTelugu) ttsVoice = 'te-IN-MohanNeural';
      else if (hasMalayalam) ttsVoice = 'ml-IN-MidhunNeural';
      else if (hasBengali) ttsVoice = 'bn-IN-BashkarNeural';
      else if (hasKannada) ttsVoice = 'kn-IN-GaganNeural';
      else if (hasGujarati) ttsVoice = 'gu-IN-NiranjanNeural';
      else if (hasPunjabi) ttsVoice = 'pa-IN-GurpreetNeural';
      else if (hasKorean) ttsVoice = 'ko-KR-InJoonNeural';
      else if (hasChinese) ttsVoice = 'zh-CN-YunxiNeural';
      else if (hasJapanese) ttsVoice = 'ja-JP-KeitaNeural';
      else if (hasThai) ttsVoice = 'th-TH-NiwatNeural';
      else if (hasArabic) ttsVoice = 'ar-SA-HamedNeural';
      else if (hasHindi) ttsVoice = 'hi-IN-MadhurNeural';
      else ttsVoice = 'en-US-GuyNeural';
    }

    // 5. Generate TTS Audio for each AD segment
    console.log('  🎙️ Generating TTS audio for AD segments using:', ttsVoice);
    for (let i = 0; i < ac.length; i++) {
      let text = ac[i].description || ac[i].text || Object.values(ac[i]).find(v => typeof v === 'string' && !/^\d{1,2}:\d{2}/.test(v)) || '';
      text = text.replace(/^\[|\]$/g, '').trim(); // Remove brackets
      
      if (text) {
        try {
          const ttsFilename = `${path.basename(tempPath)}_ad_${i}.mp3`;
          const ttsPath = path.join(UPLOAD_DIR, ttsFilename);
          
          const tts = new EdgeTTS({ voice: ttsVoice });
          await tts.ttsPromise(text, ttsPath);
          
          ac[i].audioFile = ttsFilename; // Attach reference for export
        } catch (ttsErr) {
          console.error(`  ⚠️ TTS failed for segment ${i}:`, ttsErr.message);
        }
      }
    }

    // 6. Rendering final accessibility assets is now done ON-DEMAND via /api/export/accessible-video
    console.log('  ⏭️ Skipping pre-rendering of video assets to save time and prevent timeouts.');
    let renderingError = null;

    // 7. Construct URLs
    const host = req.get('host') || `localhost:${process.env.PORT || 3001}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Format CC for deliverables (with speaker and atmospheric effects)
    const deliverablesCC = cc.map(c => {
      let text = '';
      const t1 = parseTimestamp(c.start);
      const t2 = parseTimestamp(c.end);
      
      const adjacentAC = ac.find(a => {
        const a1 = parseTimestamp(a.start);
        const a2 = parseTimestamp(a.end);
        return (a1 <= t2 && a2 >= t1) || Math.abs(a1 - t2) <= 1.5 || Math.abs(t1 - a2) <= 1.5;
      });

      if (adjacentAC) {
        const acText = (adjacentAC.description || adjacentAC.text || '').trim();
        if (acText) {
          text += acText.startsWith('[') ? acText : `[${acText}]`;
          text += '\n';
        }
      }

      if (c.speaker) {
        text += `${c.speaker}: `;
      }
      text += c.text;

      return {
        start: c.start,
        end: c.end,
        text: text
      };
    });

    // Format AD for deliverables (strip brackets)
    const deliverablesAD = ac.map(a => {
      let text = a.description || a.text || '';
      text = text.replace(/^\[|\]$/g, '').trim();
      return {
        start: a.start,
        end: a.end,
        text: text
      };
    });

    const downloadLinks = {};

    // 8. Cleanup Gemini file (best-effort)
    ai.files.delete({ name: geminiFile.name }).catch(() => {});

    // Return hybrid response structure
    res.json({
      status: 'success',
      target_language: targetLanguage || 'Auto-Detect',
      voice_profile_used: ttsVoice,
      deliverables: {
        closed_captions: deliverablesCC,
        audio_description_script: deliverablesAD,
        download_links: downloadLinks
      },
      // Keep backward compatibility fields for the React editor
      success: true,
      filename: originalname,
      fileId: fileId,
      cc,
      ac,
      videoDuration,
      targetLanguage: targetLanguage || 'Auto-Detect',
      rendering_error: renderingError
    });

  } catch (err) {
    console.error('  ❌', err.message);

    // Delete temp upload on failure
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Friendly messages for common Gemini errors
    let userMessage = err.message || 'Caption generation failed';
    if (err.message?.includes('429') || err.message?.includes('Too Many Requests') || err.message?.includes('quota')) {
      userMessage = 'QUOTA_EXCEEDED: Your Gemini API key has hit its rate limit or has no quota. Please get a valid API key from https://aistudio.google.com/app/apikey';
    } else if (err.message?.includes('403') || err.message?.includes('API_KEY_INVALID') || err.message?.includes('invalid')) {
      userMessage = 'INVALID_KEY: Your Gemini API key is invalid. Please get a valid key from https://aistudio.google.com/app/apikey';
    } else if (err.message?.includes('GEMINI_API_KEY')) {
      userMessage = 'NO_KEY: No Gemini API key set. Add GEMINI_API_KEY=... to your .env file. Get one free at https://aistudio.google.com/app/apikey';
    }

    res.status(500).json({ error: userMessage });
  }
});

module.exports = router;
