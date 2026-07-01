import React, { useState, useCallback, useEffect } from 'react';
import { parseTimestamp, generateId } from './utils/timeUtils.js';
import { CaptionProvider } from './context/CaptionContext.jsx';
import Header from './components/UI/Header.jsx';
import DropZone from './components/Upload/DropZone.jsx';
import AnalysisProgress from './components/Analyse/AnalysisProgress.jsx';
import EditorLayout from './components/Editor/EditorLayout.jsx';
import ExportPanel from './components/Export/ExportPanel.jsx';

// ── Phase state machine ───────────────────────────────────────────────────
// 'upload'    → show landing page + dropzone
// 'analysing' → show progress screen while Gemini works
// 'editor'    → show full editor workspace

export default function App() {
  const [phase,     setPhase]     = useState('upload');
  const [videoUrl,  setVideoUrl]  = useState(null);
  const [captions,  setCaptions]  = useState([]);
  const [filename,  setFilename]  = useState('');
  const [fileId,    setFileId]    = useState(null);
  const [error,     setError]     = useState(null);
  const [stage,     setStage]     = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('Auto-Detect');
  const [videoDuration, setVideoDuration] = useState(0);
  const [deliverables, setDeliverables] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('Auto-Detect');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [draftAvailable, setDraftAvailable] = useState(false);

  // Sync API Key
  useEffect(() => {
    if (apiKey) localStorage.setItem('geminiApiKey', apiKey);
    else localStorage.removeItem('geminiApiKey');
  }, [apiKey]);

  // Check for Draft on Mount or when returning to Upload phase
  useEffect(() => {
    if (phase === 'upload') {
      const draftStr = localStorage.getItem('captionDraft');
      if (draftStr) {
        try {
          const d = JSON.parse(draftStr);
          if (d && d.fileId && d.captions && d.captions.length > 0) {
            setDraftAvailable(d.filename || 'Previous Project');
          }
        } catch (e) {}
      }
    }
  }, [phase]);

  // Auto-Save Draft when in Editor Phase
  useEffect(() => {
    if (phase === 'editor' && captions.length > 0 && fileId) {
      const draft = {
        fileId,
        filename,
        targetLanguage,
        videoDuration,
        deliverables,
        captions
      };
      localStorage.setItem('captionDraft', JSON.stringify(draft));
    }
  }, [phase, fileId, filename, targetLanguage, videoDuration, deliverables, captions]);

  const handleResumeDraft = () => {
    const draftStr = localStorage.getItem('captionDraft');
    if (!draftStr) return;
    try {
      const d = JSON.parse(draftStr);
      setFileId(d.fileId);
      setFilename(d.filename);
      setTargetLanguage(d.targetLanguage);
      setVideoDuration(d.videoDuration);
      setDeliverables(d.deliverables);
      setCaptions(d.captions);
      // Link back to the original uploaded file on the server
      setVideoUrl(`http://localhost:3001/uploads/${d.fileId}`);
      setPhase('editor');
    } catch(e) {
      console.error('Failed to resume draft', e);
    }
  };

  // Clean up object URL on unmount / new upload
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  // ── Handle file selected ────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file, language) => {
    setError(null);
    setFilename(file.name);
    setTargetLanguage(language || 'Auto-Detect');
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPhase('analysing');
    setStage(0);

    // Simulate progress stages while waiting for server
    let s = 0;
    const iv = setInterval(() => {
      s = Math.min(s + 1, 3);
      setStage(s);
      if (s >= 3) clearInterval(iv);
    }, 9000);

    try {
      const body = new FormData();
      body.append('video', file);
      if (language && language !== 'Auto-Detect') {
        body.append('targetLanguage', language);
      }
      if (apiKey) {
        body.append('apiKey', apiKey);
      }

      const res = await fetch('/api/process', {
        method: 'POST',
        body,
      });

      clearInterval(iv);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setFileId(data.fileId);
      if (data.videoDuration) setVideoDuration(data.videoDuration);
      if (data.targetLanguage) setTargetLanguage(data.targetLanguage);
      if (data.deliverables) setDeliverables(data.deliverables);

      // Build Caption objects from server response
      const cc = (data.cc || [])
        .map(item => {
          const vals = Object.values(item).filter(v => typeof v === 'string');
          const times = vals.filter(v => /^\d{1,2}:\d{2}/.test(v));
          const texts = vals.filter(v => !/^\d{1,2}:\d{2}/.test(v));
          
          let t1 = parseTimestamp(item.start || item.startTime || times[0]);
          let t2 = parseTimestamp(item.end || item.endTime || times[1]);
          let start = Math.min(t1, t2);
          let end = Math.max(t1, t2);
          
          let emotionStr = item.emotion || texts.find(t => ['neutral','angry','whisper','excited','sad'].includes(t.toLowerCase())) || 'neutral';
          let textStr = item.text || texts.find(t => t !== emotionStr) || texts[0] || '';

          return {
            id:      generateId('cc'),
            type:    'cc',
            start,
            end,
            text:    textStr.trim(),
            emotion: emotionStr.toLowerCase()
          };
        })
        .filter(c => c.text && c.end > c.start);

      const ac = (data.ac || [])
        .map(item => {
          // If Gemini translated the keys, we can't rely on 'start', 'end', 'description'.
          // We look for values that match timestamp patterns and values that look like descriptions.
          const vals = Object.values(item).filter(v => typeof v === 'string');
          const times = vals.filter(v => /^\d{1,2}:\d{2}/.test(v));
          const texts = vals.filter(v => !/^\d{1,2}:\d{2}/.test(v));
          
          let t1 = parseTimestamp(item.start || item.startTime || times[0]);
          let t2 = parseTimestamp(item.end || item.endTime || times[1]);
          let start = Math.min(t1, t2);
          let end = Math.max(t1, t2);
          
          let textStr = item.description || item.text || texts.find(t => t.includes('[')) || texts[0] || '';

          return {
            id:    generateId('ac'),
            type:  'ac',
            start,
            end,
            text:  textStr.trim(),
            audioFile: item.audioFile || null,
          };
        })
        .filter(c => c.text && c.end > c.start);

      const all = [...cc, ...ac].sort((a, b) => a.start - b.start);
      setCaptions(all);
      setStage(4);

      // Brief pause so "Done" step is visible
      setTimeout(() => setPhase('editor'), 800);

    } catch (err) {
      clearInterval(iv);
      setError(err.message);
      setPhase('upload');
    }
  }, [apiKey]);

  // ── Reset to upload ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase('upload');
    setVideoUrl(null);
    setCaptions([]);
    setFilename('');
    setFileId(null);
    setError(null);
    setStage(0);
    setTargetLanguage('Auto-Detect');
    setVideoDuration(0);
    setDeliverables(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#030305' }}>
        <Header phase="upload" apiKey={apiKey} setApiKey={setApiKey} selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
        <DropZone 
          onFileSelect={handleFileSelect} 
          error={error} 
          draftAvailable={draftAvailable} 
          onResumeDraft={handleResumeDraft} 
        />
      </div>
    );
  }

  if (phase === 'analysing') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#030305' }}>
        <Header phase="analysing" />
        <AnalysisProgress filename={filename} videoUrl={videoUrl} stage={stage} targetLanguage={targetLanguage} />
      </div>
    );
  }

  // Editor phase — wrap in CaptionProvider
  return (
    <CaptionProvider initialCaptions={captions}>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#030305' }}>
        <Header phase="editor" filename={filename} fileId={fileId} onReset={handleReset} targetLanguage={targetLanguage} selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <EditorLayout videoUrl={videoUrl} filename={filename} fileId={fileId} targetLanguage={targetLanguage} videoDuration={videoDuration} />
        </div>
        <ExportPanel filename={filename} fileId={fileId} targetLanguage={targetLanguage} deliverables={deliverables} selectedVoice={selectedVoice} />
      </div>
    </CaptionProvider>
  );
}
