const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const { EdgeTTS } = require('node-edge-tts');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const UPLOAD_DIR = path.join(__dirname, '../uploads');

const checkHasAudio = (filePath) => new Promise((resolve) => {
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err || !metadata?.streams) resolve(false);
    else resolve(metadata.streams.some(s => s.codec_type === 'audio'));
  });
});

function parseTime(t) {
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const trimmed = t.trim();
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

async function ensureTtsAudio(fileId, captions, targetLanguage, selectedVoice) {
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

  if (selectedVoice && selectedVoice !== 'Auto-Detect') {
    ttsVoice = selectedVoice;
  } else if (targetLanguage === 'Auto-Detect' || !targetLanguage) {
    let sampleText = '';
    for (let c of captions) {
      if (c.type === 'ac') {
        sampleText = (c.text || c.description || '').replace(/^\[|\]$/g, '').trim();
        if (sampleText) break;
      }
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

  const cleanFileId = path.basename(fileId).replace(/\.[^/.]+$/, ''); // Remove extension

  const tts = new EdgeTTS({ voice: ttsVoice });

  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    if (c.type === 'ac') {
      let adPath = c.audioFile ? path.join(UPLOAD_DIR, c.audioFile) : null;
      
      // If audioFile is null or the file does not exist, generate it!
      if (!adPath || !fs.existsSync(adPath) || fs.statSync(adPath).size === 0) {
        const text = (c.text || c.description || '').replace(/^\[|\]$/g, '').trim();
        if (text) {
          try {
            const ttsFilename = `${cleanFileId}_manual_ad_${c.id || i}_${Date.now()}.mp3`;
            adPath = path.join(UPLOAD_DIR, ttsFilename);
            console.log(`  🔊 Auto-generating missing TTS for segment ${i}: "${text}" using voice ${ttsVoice}`);
            await tts.ttsPromise(text, adPath);
            c.audioFile = ttsFilename; // Update the reference
          } catch (ttsErr) {
            console.error(`  ⚠️ Auto-generation of TTS failed for segment ${i}:`, ttsErr.message);
          }
        }
      }
    }
  }
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Resolves overlaps by evaluating shortest active CC and shortest active AC independently,
// then merging them into a single multi-line subtitle so SRT rendering works perfectly.
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
      // Create a unified text block (AC on top, CC on bottom)
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

// Minimal SRT generation without BOM
function generateSRT(captions, emotionMode) {
  const getEmotionColor = (emotion) => {
    switch(emotion) {
      case 'angry': return '#FF4444'; // Red
      case 'whisper': return '#AAAAAA'; // Grey
      case 'excited': return '#FFD700'; // Gold/Yellow
      case 'sad': return '#88CCFF'; // Blue
      default: return null;
    }
  };

  return flattenCaptions(captions)
    .map((c, i) => {
      let text = c.text;
      // c.text already has <i></i> for AC, and is already merged.
      // We just need to wrap the WHOLE block or just the CC part in color if we wanted, 
      // but wrapping the whole block is fine for SRT constraints.
      if (emotionMode && c.emotion && c.emotion !== 'neutral') {
        const color = getEmotionColor(c.emotion);
        if (color) text = `<font color="${color}">${text}</font>`;
      }
      return `${i + 1}\n${formatTimestamp(c.start)} --> ${formatTimestamp(c.end)}\n${text}`;
    })
    .join('\n\n');
}

router.post('/video', async (req, res) => {
  const { fileId, captions: rawCaptions, style = {} } = req.body;
  const { fontname = 'Arial', primaryColour = '&HFFFFFF&', emotionMode = true } = style;
  
  // Extend timeout for long videos
  req.socket.setTimeout(600000);
  res.setTimeout(600000);

  if (!fileId || !rawCaptions) {
    return res.status(400).json({ error: 'Missing fileId or captions' });
  }

  const captions = rawCaptions.map(c => ({
    ...c,
    start: parseTime(c.start),
    end: parseTime(c.end)
  }));

  const inputVideoPath = path.join(UPLOAD_DIR, fileId);
  if (!fs.existsSync(inputVideoPath)) {
    return res.status(404).json({ error: 'Original video file not found on server. Please re-upload the video.' });
  }

  const srtPath = path.join(UPLOAD_DIR, `${fileId}.srt`);
  const outputVideoPath = path.join(UPLOAD_DIR, `exported_${fileId}.mp4`);

  try {
    fs.writeFileSync(srtPath, generateSRT(captions, emotionMode), 'utf8');

    // Create a safe relative path for FFmpeg subtitles filter to avoid Windows drive letter colon issues
    const relativeSrtPath = path.relative(process.cwd(), srtPath).replace(/\\/g, '/');
    const forceStyle = `Fontname=${fontname},Fontsize=18,PrimaryColour=${primaryColour},BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,MarginV=25`;

    let command = ffmpeg(inputVideoPath);

    command = command.outputOptions([
      '-c:v libx264',
      '-preset ultrafast',
      '-crf 23',
      '-c:a copy',
      `-vf subtitles=${relativeSrtPath}:force_style='${forceStyle}'`
    ]);

    command.save(outputVideoPath)
      .on('error', (err) => {
        console.error('FFmpeg Error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Video encoding failed' });
        cleanup();
      })
      .on('end', () => {
        if (!res.headersSent) {
          res.download(outputVideoPath, 'CaptionAI_Export.mp4', (err) => {
            cleanup();
            if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
          });
        } else {
           cleanup();
           if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
        }
      });

    function cleanup() {
      if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
    }

  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
  }
});

// Download AD Script (.txt)
router.post('/ad-script', (req, res) => {
  const { captions: rawCaptions } = req.body;
  if (!rawCaptions) return res.status(400).json({ error: 'Missing captions' });

  const captions = rawCaptions.map(c => ({
    ...c,
    start: parseTime(c.start),
    end: parseTime(c.end)
  }));

  const adCaptions = captions.filter(c => c.type === 'ac');
  const textContent = adCaptions.map(c => `${formatTimestamp(c.start)} - ${formatTimestamp(c.end)}\nAD: ${c.text || c.description}`).join('\n\n');
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename=Audio_Description_Script.txt');
  res.send(textContent);
});

const getDuration = (filePath) => new Promise((resolve) => {
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err || !metadata?.format?.duration) resolve(0);
    else resolve(metadata.format.duration);
  });
});

// Download AD Audio Track (.wav)
router.post('/ad-audio', async (req, res) => {
  const { fileId, captions: rawCaptions, targetLanguage, selectedVoice } = req.body;
  
  // Extend timeout for long videos
  req.socket.setTimeout(600000);
  res.setTimeout(600000);
  
  if (!fileId || !rawCaptions) return res.status(400).json({ error: 'Missing data' });

  const inputVideoPath = path.join(UPLOAD_DIR, fileId);
  if (!fs.existsSync(inputVideoPath)) {
    return res.status(404).json({ error: 'Original video file not found.' });
  }

  // Auto-generate missing TTS audio files
  await ensureTtsAudio(fileId, rawCaptions, targetLanguage, selectedVoice);

  const captions = rawCaptions.map(c => ({
    ...c,
    start: parseTime(c.start),
    end: parseTime(c.end)
  }));

  const adCaptions = captions.filter(c => c.type === 'ac' && c.audioFile);
  if (adCaptions.length === 0) {
    return res.status(404).json({ error: 'No audio description files found.' });
  }

  // Get actual video duration so we can pad the output to match
  const videoDuration = await getDuration(inputVideoPath);
  console.log(`  AD Audio: Video duration = ${videoDuration.toFixed(2)}s`);

  const outputWavPath = path.join(UPLOAD_DIR, `ad_track_${fileId}.wav`);
  let command = ffmpeg();
  let filterComplex = '';
  
  let mixInputs = '';
  let validAdCount = 0;

  const sortedCaptions = [...captions].sort((a, b) => a.start - b.start);

  for (let i = 0; i < adCaptions.length; i++) {
    const ad = adCaptions[i];
    const adPath = path.join(UPLOAD_DIR, ad.audioFile);
    if (fs.existsSync(adPath) && fs.statSync(adPath).size > 0) {
      const delayMs = Math.round(ad.start * 1000);
      
      // Calculate available time until next dialogue (CC) starts to prevent overlap
      const nextCc = sortedCaptions.find(c => c.type === 'cc' && c.start >= ad.start);
      const nextCcStart = nextCc ? nextCc.start : videoDuration;
      const availableTime = nextCcStart - ad.start;

      // If available time is too small (< 1.5s), we cannot fit any reasonable AD. Remove/skip it.
      if (availableTime < 1.5) {
        console.log(`  Skipping AD track segment starting at ${ad.start}s due to insufficient gap (${availableTime.toFixed(2)}s)`);
        continue;
      }

      command = command.input(adPath);
      const inputIndex = validAdCount; // Start from 0 since no original video
      const targetDuration = Math.max(0.1, availableTime - 0.1);
      const ttsDuration = await getDuration(adPath);
      
      let filterInput = `${inputIndex}:a`;
      let filters = [];
      
      if (availableTime > 0 && ttsDuration > targetDuration) {
        // Speed up slightly (up to 1.15x for a natural, professional sound)
        const tempo = Math.min(1.15, ttsDuration / targetDuration);
        if (tempo > 1.01) {
          filters.push(`atempo=${tempo.toFixed(3)}`);
        }
        
        // Trim to targetDuration to ensure we NEVER overflow into dialogue
        filters.push(`atrim=end=${targetDuration.toFixed(3)}`);
        filters.push('asetpts=PTS-STARTPTS');
        
        // Apply a smooth fade out at the end so it doesn't sound cut off abruptly
        const fadeDur = Math.min(0.2, targetDuration / 2);
        const fadeStart = targetDuration - fadeDur;
        filters.push(`afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`);
      }
      
      if (filters.length > 0) {
        filterComplex += `[${filterInput}]${filters.join(',')}[pre_a${inputIndex}];`;
        filterInput = `pre_a${inputIndex}`;
      }
      
      filterComplex += `[${filterInput}]adelay=${delayMs}|${delayMs}[a${inputIndex}];`;
      mixInputs += `[a${inputIndex}]`;
      validAdCount++;
    }
  }

  if (validAdCount > 0) {
    if (validAdCount > 1) {
      const totalInputs = validAdCount;
      filterComplex += `${mixInputs}amix=inputs=${totalInputs}:dropout_transition=99999:duration=longest[aout];[aout]volume=${totalInputs}[padded_aout];`;
    } else {
      filterComplex += `[a0]volume=1.0[padded_aout];`;
    }
    
    // Pad with silence to match the full video duration so the audio track isn't truncated
    if (videoDuration > 0) {
      const targetSampleRate = 44100;
      const totalSamples = Math.round(videoDuration * targetSampleRate);
      filterComplex += `[padded_aout]aresample=${targetSampleRate},apad=whole_len=${totalSamples}[final_aout]`;
    } else {
      filterComplex += `[padded_aout]acopy[final_aout]`;
    }
    
    command.complexFilter(filterComplex)
      .outputOptions(['-map [final_aout]'])
      .save(outputWavPath)
      .on('end', () => {
        if (!res.headersSent) {
          // Wait 1 second to ensure Windows has fully flushed the file to disk
          setTimeout(() => {
            res.download(outputWavPath, 'AI_Voice_Track.wav', (downloadErr) => {
              if (downloadErr && !res.headersSent) {
                console.error('AD audio download error:', downloadErr.message);
                res.status(500).json({ error: 'Failed to stream audio: ' + downloadErr.message });
              }
              if (fs.existsSync(outputWavPath)) fs.unlinkSync(outputWavPath);
            });
          }, 1000);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('AD Audio Export Error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        if (!res.headersSent) res.status(500).json({ error: 'AD Audio export failed: ' + err.message });
      });
  } else {
    res.status(404).json({ error: 'AD files not available.' });
  }
});

// Download Mixed Audio Track (.wav)
router.post('/mixed-audio', async (req, res) => {
  const { fileId, captions: rawCaptions, targetLanguage, selectedVoice } = req.body;
  
  // Extend timeout for heavy FFmpeg mixing operations
  req.socket.setTimeout(600000);
  res.setTimeout(600000);
  
  if (!fileId || !rawCaptions) return res.status(400).json({ error: 'Missing data' });

  const inputVideoPath = path.join(UPLOAD_DIR, fileId);
  if (!fs.existsSync(inputVideoPath)) {
    return res.status(404).json({ error: 'Original video file not found.' });
  }

  // Auto-generate missing TTS audio files
  await ensureTtsAudio(fileId, rawCaptions, targetLanguage, selectedVoice);

  const captions = rawCaptions.map(c => ({
    ...c,
    start: parseTime(c.start),
    end: parseTime(c.end)
  }));

  const adCaptions = captions.filter(c => c.type === 'ac' && c.audioFile);
  if (adCaptions.length === 0) {
    return res.status(404).json({ error: 'No audio description files found.' });
  }

  // Get actual video duration so we can ensure the output matches
  const videoDuration = await getDuration(inputVideoPath);
  console.log(`  Mixed Audio: Video duration = ${videoDuration.toFixed(2)}s`);

  const outputWavPath = path.join(UPLOAD_DIR, `mixed_track_${fileId}.wav`);
  let command = ffmpeg();
  let filterComplex = '';
  
  // Input 0: The original video
  command = command.input(inputVideoPath);
  
  let adMixInputs = '';
  let validAdCount = 0;

  const sortedCaptions = [...captions].sort((a, b) => a.start - b.start);

  for (let i = 0; i < adCaptions.length; i++) {
    const ad = adCaptions[i];
    const adPath = path.join(UPLOAD_DIR, ad.audioFile);
    if (fs.existsSync(adPath) && fs.statSync(adPath).size > 0) {
      const delayMs = Math.round(ad.start * 1000);
      
      // Calculate available time until next dialogue (CC) starts to prevent overlap
      const nextCc = sortedCaptions.find(c => c.type === 'cc' && c.start >= ad.start);
      const nextCcStart = nextCc ? nextCc.start : videoDuration;
      const availableTime = nextCcStart - ad.start;

      // If available time is too small (< 1.5s), we cannot fit any reasonable AD. Remove/skip it.
      if (availableTime < 1.5) {
        console.log(`  Skipping mixed AD segment starting at ${ad.start}s due to insufficient gap (${availableTime.toFixed(2)}s)`);
        continue;
      }

      command = command.input(adPath);
      const inputIndex = validAdCount + 1; // Since 0 is the original video
      const targetDuration = Math.max(0.1, availableTime - 0.1);
      const ttsDuration = await getDuration(adPath);
      
      let filterInput = `${inputIndex}:a`;
      let filters = [];
      
      if (availableTime > 0 && ttsDuration > targetDuration) {
        // Speed up slightly (up to 1.15x for a natural, professional sound)
        const tempo = Math.min(1.15, ttsDuration / targetDuration);
        if (tempo > 1.01) {
          filters.push(`atempo=${tempo.toFixed(3)}`);
        }
        
        // Trim to targetDuration to ensure we NEVER overflow into dialogue
        filters.push(`atrim=end=${targetDuration.toFixed(3)}`);
        filters.push('asetpts=PTS-STARTPTS');
        
        // Apply a smooth fade out at the end so it doesn't sound cut off abruptly
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
    // 1. Mix all AD tracks and restore volume scaling
    if (validAdCount > 1) {
      filterComplex += `${adMixInputs}amix=inputs=${validAdCount}:dropout_transition=99999[ad_raw];[ad_raw]volume=${validAdCount}[ad_combined];`;
    } else {
      filterComplex += `[a1]volume=1.0[ad_combined];`; // since inputIndex is 1
    }
    
    if (hasAudioTrack) {
      // 2. Split the combined AD track: one controls the ducking, one goes to final output.
      filterComplex += `[ad_combined]asplit[ad_control][ad_heard];`;
      
      // 3. Duck the original audio: lowers volume by a ratio of 10 when AD speaks.
      filterComplex += `[0:a][ad_control]sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500[ducked_orig];`;
      
      // 4. Final mix: Ducked Original + AD Voice. Restore volume scaling for amix (2 inputs)
      filterComplex += `[ducked_orig][ad_heard]amix=inputs=2:dropout_transition=99999:duration=longest[final_raw_aout];[final_raw_aout]volume=2.0[padded_final];`;
    } else {
      // If there is no audio track, just use the AD combined heard track
      filterComplex += `[ad_combined]volume=1.0[padded_final];`;
    }
    
    // 5. Pad with silence to match the full video duration so the output isn't truncated
    if (videoDuration > 0) {
      const targetSampleRate = 44100;
      const totalSamples = Math.round(videoDuration * targetSampleRate);
      filterComplex += `[padded_final]aresample=${targetSampleRate},apad=whole_len=${totalSamples}[final_aout]`;
    } else {
      filterComplex += `[padded_final]acopy[final_aout]`;
    }
    
    command.complexFilter(filterComplex)
      .outputOptions(['-map [final_aout]'])
      .save(outputWavPath)
      .on('end', () => {
        if (!res.headersSent) {
          // Wait 1 second to ensure Windows has fully flushed the file to disk
          setTimeout(() => {
            res.download(outputWavPath, 'Mixed_Audio.wav', (downloadErr) => {
              if (downloadErr && !res.headersSent) {
                console.error('Mixed audio download error:', downloadErr.message);
                res.status(500).json({ error: 'Failed to stream mixed audio: ' + downloadErr.message });
              }
              if (fs.existsSync(outputWavPath)) fs.unlinkSync(outputWavPath);
            });
          }, 1000);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Mixed Audio Export Error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        if (!res.headersSent) res.status(500).json({ error: 'Mixed Audio export failed: ' + err.message });
      });
  } else {
    res.status(404).json({ error: 'AD files not available.' });
  }
});

// On-Demand Accessible Video (Subtitles + Mixed Audio)
router.post('/accessible-video', async (req, res) => {
  const { fileId, captions: rawCaptions, targetLanguage, selectedVoice, style = {} } = req.body;
  const { fontname = 'Arial', primaryColour = '&HFFFFFF&', emotionMode = true } = style;
  
  req.socket.setTimeout(600000);
  res.setTimeout(600000);
  
  if (!fileId || !rawCaptions) return res.status(400).json({ error: 'Missing data' });

  const inputVideoPath = path.join(UPLOAD_DIR, fileId);
  if (!fs.existsSync(inputVideoPath)) {
    return res.status(404).json({ error: 'Original video file not found.' });
  }

  // Auto-generate missing TTS audio files
  await ensureTtsAudio(fileId, rawCaptions, targetLanguage, selectedVoice);

  const captions = rawCaptions.map(c => ({
    ...c,
    start: parseTime(c.start),
    end: parseTime(c.end)
  }));

  const adCaptions = captions.filter(c => c.type === 'ac' && c.audioFile);
  const videoDuration = await getDuration(inputVideoPath);

  const outputWavPath = path.join(UPLOAD_DIR, `temp_mix_${fileId}.wav`);
  const srtPath = path.join(UPLOAD_DIR, `temp_sub_${fileId}.srt`);
  const finalVideoPath = path.join(UPLOAD_DIR, `accessible_${fileId}.mp4`);

  try {
    fs.writeFileSync(srtPath, generateSRT(captions, emotionMode), 'utf8');
    const relativeSrtPath = path.relative(process.cwd(), srtPath).replace(/\\/g, '/');
    const forceStyle = `Fontname=${fontname},Fontsize=18,PrimaryColour=${primaryColour},BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,MarginV=25`;

    let mixCommand = ffmpeg(inputVideoPath);
    let filterComplex = '';
    let adMixInputs = '';
    let validAdCount = 0;
    const sortedCaptions = [...captions].sort((a, b) => a.start - b.start);

    for (let i = 0; i < adCaptions.length; i++) {
      const ad = adCaptions[i];
      const adPath = path.join(UPLOAD_DIR, ad.audioFile);
      if (fs.existsSync(adPath) && fs.statSync(adPath).size > 0) {
        const delayMs = Math.round(ad.start * 1000);
        const nextCc = sortedCaptions.find(c => c.type === 'cc' && c.start >= ad.start);
        const nextCcStart = nextCc ? nextCc.start : videoDuration;
        const availableTime = nextCcStart - ad.start;

        if (availableTime < 1.5) continue;

        mixCommand = mixCommand.input(adPath);
        const inputIndex = validAdCount + 1;
        const targetDuration = Math.max(0.1, availableTime - 0.1);
        const ttsDuration = await getDuration(adPath);
        
        let filterInput = `${inputIndex}:a`;
        let filters = [];
        
        if (availableTime > 0 && ttsDuration > targetDuration) {
          const tempo = Math.min(1.15, ttsDuration / targetDuration);
          if (tempo > 1.01) filters.push(`atempo=${tempo.toFixed(3)}`);
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
      if (hasAudioTrack) {
        filterComplex += `[ad_combined]asplit[ad_control][ad_heard];`;
        filterComplex += `[0:a][ad_control]sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500[ducked_orig];`;
        filterComplex += `[ducked_orig][ad_heard]amix=inputs=2:dropout_transition=99999:duration=longest[final_raw_aout];[final_raw_aout]volume=2.0[padded_final];`;
      } else {
        filterComplex += `[ad_combined]volume=1.0[padded_final];`;
      }
    } else if (hasAudioTrack) {
       filterComplex += `[0:a]acopy[padded_final];`;
    } else {
       filterComplex += `anullsrc=r=44100:cl=stereo[padded_final];`;
    }
    
    if (videoDuration > 0) {
      const targetSampleRate = 44100;
      const totalSamples = Math.round(videoDuration * targetSampleRate);
      filterComplex += `[padded_final]aresample=${targetSampleRate},apad=whole_len=${totalSamples}[final_aout]`;
    } else {
      filterComplex += `[padded_final]acopy[final_aout]`;
    }

    mixCommand.complexFilter(filterComplex)
      .outputOptions(['-map [final_aout]'])
      .save(outputWavPath)
      .on('end', () => {
         // Now run the final video command using copy codec to prevent Render timeouts
         ffmpeg(inputVideoPath)
          .input(outputWavPath)
          .input(srtPath)
          .outputOptions([
            '-map 0:v',
            '-map 1:a',
            '-map 2:0',
            '-c:v copy',
            '-c:a aac',
            '-b:a 192k',
            '-c:s mov_text',
            '-shortest'
          ])
          .save(finalVideoPath)
          .on('end', () => {
            if (!res.headersSent) {
              setTimeout(() => {
                res.download(finalVideoPath, 'Accessible_Video.mp4', (downloadErr) => {
                  if (fs.existsSync(outputWavPath)) fs.unlinkSync(outputWavPath);
                  if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
                  if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
                });
              }, 1000);
            }
          })
          .on('error', (err) => {
            console.error('Final video render error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Video render failed' });
            cleanup(outputWavPath, srtPath, finalVideoPath);
          });
      })
      .on('error', (err) => {
        console.error('Audio Mix Error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Audio Mix failed' });
        cleanup(outputWavPath, srtPath, null);
      });

  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
    cleanup(outputWavPath, srtPath, null);
  }
});

function cleanup(wav, srt, mp4) {
  if (wav && fs.existsSync(wav)) fs.unlinkSync(wav);
  if (srt && fs.existsSync(srt)) fs.unlinkSync(srt);
  if (mp4 && fs.existsSync(mp4)) fs.unlinkSync(mp4);
}

module.exports = router;
