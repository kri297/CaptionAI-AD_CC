const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { EdgeTTS } = require('node-edge-tts');
const googleTTS = require('google-tts-api');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Languages that only work via Google TTS (Edge TTS doesn't support them)
const GOOGLE_TTS_VOICES = {
  'Punjabi': 'pa',
};

// Generate TTS audio — uses Edge TTS for most languages, Google TTS as fallback
async function generateTtsFile(text, voice, outputPath) {
  const googleLang = Object.entries(GOOGLE_TTS_VOICES).find(([, v]) => voice.startsWith(v.split('-')[0] + '-'));
  
  if (GOOGLE_TTS_VOICES[voice]) {
    // Google TTS fallback for unsupported Edge TTS languages
    const base64 = await googleTTS.getAudioBase64(text, { lang: GOOGLE_TTS_VOICES[voice], slow: false });
    fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));
  } else {
    // Edge TTS (primary, high-quality)
    const tts = new EdgeTTS({ voice });
    await tts.ttsPromise(text, outputPath);
  }
}

router.post('/generate', async (req, res) => {
  const { text, fileId, captionId, targetLanguage, selectedVoice } = req.body;

  if (!text || !fileId || !captionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const voiceMap = {
      // Indian & South Asian
      'Hindi': 'hi-IN-MadhurNeural',
      'Telugu': 'te-IN-MohanNeural',
      'Tamil': 'ta-IN-ValluvarNeural',
      'Kannada': 'kn-IN-GaganNeural',
      'Malayalam': 'ml-IN-MidhunNeural',
      'Bengali': 'bn-IN-BashkarNeural',
      'Gujarati': 'gu-IN-NiranjanNeural',
      'Marathi': 'mr-IN-ManoharNeural',
      'Urdu': 'ur-PK-AsadNeural',
      'Nepali': 'ne-NP-SagarNeural',
      'Sinhala': 'si-LK-SameeraNeural',
      'Punjabi': 'Punjabi',  // Google TTS fallback marker
      // Popular
      'English': 'en-US-GuyNeural',
      'Spanish': 'es-ES-AlvaroNeural',
      'French': 'fr-FR-HenriNeural',
      'Japanese': 'ja-JP-KeitaNeural',
      'Korean': 'ko-KR-InJoonNeural',
      'Chinese': 'zh-CN-YunxiNeural',
      'Portuguese': 'pt-BR-AntonioNeural',
      'German': 'de-DE-ConradNeural',
      'Arabic': 'ar-SA-HamedNeural',
      'Russian': 'ru-RU-DmitryNeural',
      'Italian': 'it-IT-ValerioNeural',
      // Asian
      'Thai': 'th-TH-NiwatNeural',
      'Vietnamese': 'vi-VN-NamMinhNeural',
      'Indonesian': 'id-ID-ArdiNeural',
      'Malay': 'ms-MY-OsmanNeural',
      'Filipino': 'fil-PH-BlessicaNeural',
      'Khmer': 'km-KH-PisethNeural',
      'Burmese': 'my-MM-ThihaNeural',
      // European
      'Dutch': 'nl-NL-MaartenNeural',
      'Polish': 'pl-PL-MarekNeural',
      'Swedish': 'sv-SE-MattiasNeural',
      'Danish': 'da-DK-JeppeNeural',
      'Finnish': 'fi-FI-HarriNeural',
      'Norwegian': 'nb-NO-FinnNeural',
      'Greek': 'el-GR-NestorasNeural',
      'Czech': 'cs-CZ-AntoninNeural',
      'Romanian': 'ro-RO-EmilNeural',
      'Hungarian': 'hu-HU-TamasNeural',
      'Ukrainian': 'uk-UA-OstapNeural',
      'Croatian': 'hr-HR-SreckoNeural',
      'Slovak': 'sk-SK-LukasNeural',
      'Catalan': 'ca-ES-EnricNeural',
      'Serbian': 'sr-RS-NicholasNeural',
      'Latvian': 'lv-LV-NilsNeural',
      'Lithuanian': 'lt-LT-LeonasNeural',
      'Icelandic': 'is-IS-GunnarNeural',
      // African
      'Afrikaans': 'af-ZA-WillemNeural',
      'Swahili': 'sw-KE-RafikiNeural',
      'Amharic': 'am-ET-AmehaNeural',
      // Middle Eastern
      'Hebrew': 'he-IL-AvriNeural',
      // Celtic
      'Welsh': 'cy-GB-AledNeural',
      'Auto-Detect': 'en-US-GuyNeural'
    };
    
    // Clean the text of brackets just like in process.js
    const cleanText = text.replace(/^\[|\]$/g, '').trim();

    // Auto-detect languages by Unicode blocks
    const hasTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(cleanText);
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);
    const hasBengali = /[\u0980-\u09FF]/.test(cleanText);
    const hasKannada = /[\u0C80-\u0CFF]/.test(cleanText);
    const hasGujarati = /[\u0A80-\u0AFF]/.test(cleanText);
    const hasPunjabi = /[\u0A00-\u0A7F]/.test(cleanText);
    const hasSinhala = /[\u0D80-\u0DFF]/.test(cleanText);
    const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
    const hasHebrew = /[\u0590-\u05FF]/.test(cleanText);
    const hasKorean = /[\uAC00-\uD7AF\u3130-\u318F]/.test(cleanText);
    const hasChinese = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(cleanText);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(cleanText);
    const hasThai = /[\u0E00-\u0E7F]/.test(cleanText);
    const hasKhmer = /[\u1780-\u17FF]/.test(cleanText);
    const hasMyanmar = /[\u1000-\u109F]/.test(cleanText);
    const hasGeorgian = /[\u10A0-\u10FF]/.test(cleanText);
    const hasAmharic = /[\u1200-\u137F]/.test(cleanText);
    const hasGreek = /[\u0370-\u03FF]/.test(cleanText);
    const hasCyrillic = /[\u0400-\u04FF]/.test(cleanText);
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);

    let ttsVoice = voiceMap[targetLanguage] || 'en-US-GuyNeural';

    if (selectedVoice && selectedVoice !== 'Auto-Detect') {
      ttsVoice = selectedVoice;
    } else if (targetLanguage === 'Auto-Detect' || !targetLanguage) {
      if (hasTamil) ttsVoice = 'ta-IN-ValluvarNeural';
      else if (hasTelugu) ttsVoice = 'te-IN-MohanNeural';
      else if (hasMalayalam) ttsVoice = 'ml-IN-MidhunNeural';
      else if (hasBengali) ttsVoice = 'bn-IN-BashkarNeural';
      else if (hasKannada) ttsVoice = 'kn-IN-GaganNeural';
      else if (hasGujarati) ttsVoice = 'gu-IN-NiranjanNeural';
      else if (hasPunjabi) ttsVoice = 'Punjabi';
      else if (hasSinhala) ttsVoice = 'si-LK-SameeraNeural';
      else if (hasKorean) ttsVoice = 'ko-KR-InJoonNeural';
      else if (hasChinese) ttsVoice = 'zh-CN-YunxiNeural';
      else if (hasJapanese) ttsVoice = 'ja-JP-KeitaNeural';
      else if (hasThai) ttsVoice = 'th-TH-NiwatNeural';
      else if (hasKhmer) ttsVoice = 'km-KH-PisethNeural';
      else if (hasMyanmar) ttsVoice = 'my-MM-ThihaNeural';
      else if (hasArabic) ttsVoice = 'ar-SA-HamedNeural';
      else if (hasHebrew) ttsVoice = 'he-IL-AvriNeural';
      else if (hasAmharic) ttsVoice = 'am-ET-AmehaNeural';
      else if (hasGreek) ttsVoice = 'el-GR-NestorasNeural';
      else if (hasHindi) ttsVoice = 'hi-IN-MadhurNeural';
      else ttsVoice = 'en-US-GuyNeural';
    }

    // Create a unique filename for this manually generated TTS
    const cleanFileId = path.basename(fileId).replace(/\.[^/.]+$/, ''); // Remove extension
    const ttsFilename = `${cleanFileId}_manual_ad_${captionId}_${Date.now()}.mp3`;
    const ttsPath = path.join(UPLOAD_DIR, ttsFilename);
    
    // Generate the TTS audio (handles Edge TTS vs Google TTS automatically)
    await generateTtsFile(cleanText, ttsVoice, ttsPath);
    
    // Validate file size
    if (!fs.existsSync(ttsPath) || fs.statSync(ttsPath).size === 0) {
      throw new Error('TTS engine generated an empty audio file. Unsupported language/voice?');
    }
    
    // Return the new audio filename so the frontend can attach it to the caption
    res.json({ success: true, audioFile: ttsFilename });
    
  } catch (err) {
    console.error('Manual TTS Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate AI voice for this segment' });
  }
});

module.exports = router;
