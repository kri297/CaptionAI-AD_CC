const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { EdgeTTS } = require('node-edge-tts');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

router.post('/generate', async (req, res) => {
  const { text, fileId, captionId, targetLanguage } = req.body;

  if (!text || !fileId || !captionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const voiceMap = {
      'Hindi': 'hi-IN-SwaraNeural',
      'Telugu': 'te-IN-ShrutiNeural',
      'Tamil': 'ta-IN-PallaviNeural',
      'Spanish': 'es-ES-ElviraNeural',
      'French': 'fr-FR-DeniseNeural',
      'Japanese': 'ja-JP-NanamiNeural',
      'English': 'en-US-AriaNeural',
      'Korean': 'ko-KR-SunHiNeural',
      'Chinese': 'zh-CN-XiaoxiaoNeural',
      'Portuguese': 'pt-BR-FranciscaNeural',
      'German': 'de-DE-KatjaNeural',
      'Arabic': 'ar-SA-ZariyahNeural',
      'Russian': 'ru-RU-SvetlanaNeural',
      'Italian': 'it-IT-ElsaNeural',
      'Kannada': 'kn-IN-SapnaNeural',
      'Gujarati': 'gu-IN-DhwaniNeural',
      'Marathi': 'mr-IN-AarohiNeural',
      'Bengali': 'bn-IN-TanishaaNeural',
      'Malayalam': 'ml-IN-SobhanaNeural',
      'Urdu': 'ur-PK-UzmaNeural',
      'Punjabi': 'pa-IN-GurpreetNeural',
      'Thai': 'th-TH-PremwadeeNeural',
      'Vietnamese': 'vi-VN-HoaiMyNeural',
      'Turkish': 'tr-TR-EmelNeural',
      'Indonesian': 'id-ID-GadisNeural',
      'Dutch': 'nl-NL-ColetteNeural',
      'Polish': 'pl-PL-ZofiaNeural',
      'Swedish': 'sv-SE-SofieNeural',
      'Auto-Detect': 'en-US-AriaNeural'
    };
    
    // Clean the text of brackets just like in process.js
    const cleanText = text.replace(/^\[|\]$/g, '').trim();

    // Auto-detect languages by Unicode blocks
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);
    const hasTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(cleanText);
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);
    const hasBengali = /[\u0980-\u09FF]/.test(cleanText);
    const hasKannada = /[\u0C80-\u0CFF]/.test(cleanText);
    const hasGujarati = /[\u0A80-\u0AFF]/.test(cleanText);
    const hasPunjabi = /[\u0A00-\u0A7F]/.test(cleanText);
    const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
    const hasKorean = /[\uAC00-\uD7AF\u3130-\u318F]/.test(cleanText);
    const hasChinese = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(cleanText);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(cleanText);
    const hasThai = /[\u0E00-\u0E7F]/.test(cleanText);

    let ttsVoice = voiceMap[targetLanguage] || 'en-US-AriaNeural';
    if (targetLanguage === 'Auto-Detect' || !targetLanguage) {
      if (hasTamil) ttsVoice = 'ta-IN-PallaviNeural';
      else if (hasTelugu) ttsVoice = 'te-IN-ShrutiNeural';
      else if (hasMalayalam) ttsVoice = 'ml-IN-SobhanaNeural';
      else if (hasBengali) ttsVoice = 'bn-IN-TanishaaNeural';
      else if (hasKannada) ttsVoice = 'kn-IN-SapnaNeural';
      else if (hasGujarati) ttsVoice = 'gu-IN-DhwaniNeural';
      else if (hasPunjabi) ttsVoice = 'pa-IN-GurpreetNeural';
      else if (hasKorean) ttsVoice = 'ko-KR-SunHiNeural';
      else if (hasChinese) ttsVoice = 'zh-CN-XiaoxiaoNeural';
      else if (hasJapanese) ttsVoice = 'ja-JP-NanamiNeural';
      else if (hasThai) ttsVoice = 'th-TH-PremwadeeNeural';
      else if (hasArabic) ttsVoice = 'ar-SA-ZariyahNeural';
      else if (hasHindi) ttsVoice = 'hi-IN-SwaraNeural';
      else ttsVoice = 'en-US-AriaNeural';
    }

    // Create a unique filename for this manually generated TTS
    const cleanFileId = path.basename(fileId).replace(/\.[^/.]+$/, ''); // Remove extension
    const ttsFilename = `${cleanFileId}_manual_ad_${captionId}_${Date.now()}.mp3`;
    const ttsPath = path.join(UPLOAD_DIR, ttsFilename);
    
    // Generate the TTS audio
    const tts = new EdgeTTS({ voice: ttsVoice });
    
    await tts.ttsPromise(cleanText, ttsPath);
    
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
