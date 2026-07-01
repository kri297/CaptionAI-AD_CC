const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { EdgeTTS } = require('node-edge-tts');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

router.post('/generate', async (req, res) => {
  const { text, fileId, captionId, targetLanguage, selectedVoice } = req.body;

  if (!text || !fileId || !captionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
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
      else if (hasPunjabi) ttsVoice = 'pa-IN-GurpreetNeural';
      else if (hasKorean) ttsVoice = 'ko-KR-InJoonNeural';
      else if (hasChinese) ttsVoice = 'zh-CN-YunxiNeural';
      else if (hasJapanese) ttsVoice = 'ja-JP-KeitaNeural';
      else if (hasThai) ttsVoice = 'th-TH-NiwatNeural';
      else if (hasArabic) ttsVoice = 'ar-SA-HamedNeural';
      else if (hasHindi) ttsVoice = 'hi-IN-MadhurNeural';
      else ttsVoice = 'en-US-GuyNeural';
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
