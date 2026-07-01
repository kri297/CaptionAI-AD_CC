import React, { useState, useRef, useEffect } from 'react';
import { Film, Sparkles, RefreshCw, Download, FileText, FileCode, Copy, CheckCheck, Loader2, Video, Globe, Music, Volume2 } from 'lucide-react';
import { useCaptions } from '../../context/CaptionContext.jsx';
import { serializeSRT } from '../../utils/srtParser.js';
import { exportVTT, downloadFile } from '../../utils/vttExporter.js';
import StyleModal from '../Export/StyleModal.jsx';

// ── Language flags for badge ──────────────────────────────────────────────
const LANG_FLAGS = {
  'Auto-Detect': '🌐', 'English': '🇺🇸', 'Hindi': '🇮🇳', 'Telugu': '🇮🇳',
  'Tamil': '🇮🇳', 'Spanish': '🇪🇸', 'French': '🇫🇷', 'Japanese': '🇯🇵',
  'Korean': '🇰🇷', 'Chinese': '🇨🇳', 'Arabic': '🇸🇦', 'Portuguese': '🇧🇷',
  'German': '🇩🇪', 'Italian': '🇮🇹', 'Russian': '🇷🇺', 'Kannada': '🇮🇳',
  'Gujarati': '🇮🇳', 'Marathi': '🇮🇳', 'Bengali': '🇮🇳', 'Malayalam': '🇮🇳',
  'Urdu': '🇵🇰', 'Punjabi': '🇮🇳', 'Thai': '🇹🇭', 'Vietnamese': '🇻🇳',
  'Turkish': '🇹🇷', 'Indonesian': '🇮🇩', 'Dutch': '🇳🇱', 'Polish': '🇵🇱',
  'Swedish': '🇸🇪',
};

const VOICES = [
  { id: 'Auto-Detect', label: 'Auto-Detect Voice' },
  { id: 'en-US-GuyNeural', label: 'Deep Male (US)' },
  { id: 'en-US-AriaNeural', label: 'Warm Female (US)' },
  { id: 'en-GB-RyanNeural', label: 'British Male' },
  { id: 'hi-IN-MadhurNeural', label: 'Indian Male (Hindi)' },
  { id: 'hi-IN-SwaraNeural', label: 'Indian Female (Hindi)' },
];

export default function Header({ phase, filename, fileId, onReset, children, targetLanguage, apiKey, setApiKey, selectedVoice, setSelectedVoice }) {
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [downloadingAdAudio, setDownloadingAdAudio] = useState(false);
  const [downloadingMixedAudio, setDownloadingMixedAudio] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey || '');
  const [keySaved, setKeySaved] = useState(false);
  const menuRef = useRef(null);

  // Sync temp API key if it loads late
  useEffect(() => {
    setTempApiKey(apiKey || '');
  }, [apiKey]);

  const handleSaveKey = () => {
    if (setApiKey) {
      setApiKey(tempApiKey);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    }
  };

  // We only conditionally use these if we are in the editor phase
  const captionCtx = phase === 'editor' ? useCaptions() : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowExport(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (!captionCtx) return;
    navigator.clipboard.writeText(serializeSRT(captionCtx.captions)).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowExport(false); }, 1500);
    });
  };

  const handleDownload = (type) => {
    if (!captionCtx) return;
    const base = filename?.replace(/\.[^/.]+$/, '') || 'captions';
    if (type === 'srt') downloadFile(serializeSRT(captionCtx.captions), `${base}.srt`, 'text/plain;charset=utf-8');
    if (type === 'vtt') downloadFile(exportVTT(captionCtx.captions), `${base}.vtt`, 'text/vtt;charset=utf-8');
    setShowExport(false);
  };

  const openStyleModal = () => {
    setShowExport(false);
    setShowStyleModal(true);
  };

  const handleExportVideo = async (styleSettings) => {
    if (!captionCtx || !fileId || exportingVideo) return;
    setExportingVideo(true);
    
    try {
      const response = await fetch('/api/export/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId, 
          captions: captionCtx.captions,
          style: styleSettings 
        })
      });

      if (!response.ok) throw new Error('Video export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CaptionAI_${filename || 'exported_video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowStyleModal(false);
    } catch (error) {
      alert('Error exporting video: ' + error.message);
    } finally {
      setExportingVideo(false);
    }
  };

  const handleAdScript = async () => {
    if (!captionCtx) return;
    try {
      const response = await fetch('/api/export/ad-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: captionCtx.captions })
      });
      if (!response.ok) throw new Error('Failed to generate script');
      const text = await response.text();
      const base = filename?.replace(/\\.[^/.]+$/, '') || 'captions';
      downloadFile(text, `Audio_Description_Script_${base}.txt`, 'text/plain;charset=utf-8');
      setShowExport(false);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleAdAudio = async () => {
    if (!captionCtx || !fileId || downloadingAdAudio) return;
    setDownloadingAdAudio(true);
    try {
      const response = await fetch('/api/export/ad-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, captions: captionCtx.captions, targetLanguage, selectedVoice })
      });
      if (!response.ok) {
        const errData = await response.json().catch(()=>({}));
        throw new Error(errData.error || 'Failed to generate AD Audio');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = filename?.replace(/\\.[^/.]+$/, '') || 'captions';
      a.download = `Audio_Description_${base}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setDownloadingAdAudio(false);
    }
  };

  const handleMixedAudio = async () => {
    if (!captionCtx || !fileId || downloadingMixedAudio) return;
    setDownloadingMixedAudio(true);
    try {
      const response = await fetch('/api/export/mixed-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, captions: captionCtx.captions, targetLanguage, selectedVoice })
      });
      if (!response.ok) {
        const errData = await response.json().catch(()=>({}));
        throw new Error(errData.error || 'Failed to generate Mixed Audio');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = filename?.replace(/\.[^/.]+$/, '') || 'captions';
      a.download = `Mixed_Audio_${base}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setDownloadingMixedAudio(false);
    }
  };

  const langFlag = LANG_FLAGS[targetLanguage] || '🌐';

  return (
    <header className="h-16 glass-panel flex items-center justify-between px-6 shrink-0 z-50 sticky top-0 rounded-none border-t-0 border-x-0 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:shadow-[0_0_25px_rgba(251,191,36,0.7)] transition-shadow duration-300">
          <Film className="w-4.5 h-4.5 text-black" />
        </div>
        <span className="font-grotesk font-black text-white text-xl tracking-tight drop-shadow-md">
          Caption<span className="text-amber-400">AI</span>
        </span>
        {filename && phase === 'editor' && (
          <div className="hidden md:flex items-center ml-4 pl-4 border-l border-white/10 gap-3">
            <span className="text-sm font-inter text-slate-300 font-medium truncate max-w-[200px]">
              {filename}
            </span>
            {/* Language Badge */}
            {targetLanguage && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-semibold text-amber-400 font-inter">
                <span>{langFlag}</span>
                {targetLanguage !== 'Auto-Detect' ? targetLanguage : 'Auto'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {children}

        {phase === 'editor' && onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/30 text-sm font-medium transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">New Video</span>
          </button>
        )}

        {phase === 'editor' && captionCtx?.captions?.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              disabled={exportingVideo}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300
                ${exportingVideo ? 'bg-amber-400/50 text-amber-950 cursor-wait' : 'glow-button bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]'}`}
            >
              {exportingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingVideo ? 'Rendering...' : 'Download'}
            </button>

            {/* Export Dropdown */}
            {showExport && !exportingVideo && (
              <div className="absolute right-0 top-full mt-3 w-72 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in origin-top-right z-50">
                
                {/* Video Section */}
                <div className="p-2 border-b border-white/5 bg-black/20">
                  <p className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest px-2 py-1">🎬 Video</p>
                </div>
                <div className="p-1.5 animate-slide-up" style={{ animationDelay: '50ms', opacity: 0, animationFillMode: 'forwards' }}>
                  <button onClick={openStyleModal} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-all duration-300 group hover:translate-x-1">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">
                      <Video className="w-4.5 h-4.5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-purple-300 transition-colors">Video (MP4)</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hardcoded Subtitles</div>
                    </div>
                  </button>
                </div>

                {/* Subtitle Section */}
                <div className="p-2 border-t border-b border-white/5 bg-black/20">
                  <p className="text-[10px] font-bold text-sky-400/80 uppercase tracking-widest px-2 py-1">📄 Subtitles</p>
                </div>
                <div className="p-1.5 flex flex-col gap-0.5">
                  <button onClick={() => handleDownload('srt')} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-amber-400/10 text-left transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                      <FileText className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">SRT File</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Universal Format</div>
                    </div>
                  </button>
                  <button onClick={() => handleDownload('vtt')} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-amber-400/10 text-left transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">WebVTT</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Web Player Format</div>
                    </div>
                  </button>
                  <button onClick={handleCopy} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-amber-400/10 text-left transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center group-hover:bg-slate-500/20 transition-colors">
                      {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{copied ? 'Copied!' : 'Copy to Clipboard'}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">SRT Format</div>
                    </div>
                  </button>
                </div>

                {/* Audio Section */}
                <div className="p-2 border-t border-b border-white/5 bg-black/20">
                  <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest px-2 py-1">🎵 Audio</p>
                </div>
                <div className="p-1.5 flex flex-col gap-0.5 animate-slide-up" style={{ animationDelay: '150ms', opacity: 0, animationFillMode: 'forwards' }}>
                  <button 
                    onClick={handleMixedAudio} 
                    disabled={downloadingMixedAudio}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-all duration-300 group hover:translate-x-1"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all">
                      {downloadingMixedAudio ? <Loader2 className="w-4.5 h-4.5 text-amber-400 animate-spin" /> : <Music className="w-4.5 h-4.5 text-amber-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-amber-300 transition-colors">{downloadingMixedAudio ? 'Mixing...' : 'Mixed Audio'}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Original + AI Voice</div>
                    </div>
                  </button>
                  <button 
                    onClick={handleAdAudio} 
                    disabled={downloadingAdAudio}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 text-left transition-all duration-300 group hover:translate-x-1"
                  >
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all">
                      {downloadingAdAudio ? <Loader2 className="w-4.5 h-4.5 text-sky-400 animate-spin" /> : <Volume2 className="w-4.5 h-4.5 text-sky-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-sky-300 transition-colors">{downloadingAdAudio ? 'Generating...' : 'AI Voice Only'}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Clean AD Voice Track</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {phase !== 'analysing' && setSelectedVoice && (
          <div className="hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 focus-within:border-amber-400/50 focus-within:bg-black/60 transition-all duration-300 mr-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-300 focus:outline-none cursor-pointer appearance-none"
            >
              {VOICES.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>)}
            </select>
          </div>
        )}

        {phase !== 'analysing' && phase !== 'editor' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1.5 focus-within:border-amber-400/50 focus-within:bg-black/60 focus-within:shadow-[0_0_15px_rgba(251,191,36,0.1)] transition-all duration-300">
              <input 
                type="password"
                placeholder="Your Gemini API Key (Optional)"
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  setKeySaved(false);
                }}
                className="hidden sm:block px-3 py-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-56 font-mono tracking-wider"
              />
              <button 
                onClick={handleSaveKey}
                className={`hidden sm:flex items-center justify-center px-3 py-1 rounded-full text-[11px] uppercase font-bold tracking-widest transition-all duration-300 ${
                  keySaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-300 border border-transparent hover:bg-amber-400/20 hover:text-amber-400 hover:border-amber-400/30'
                }`}
              >
                {keySaved ? 'Saved' : 'Set'}
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-400/10 border border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.15)] ml-1">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse-glow" />
              <span className="text-xs font-bold text-amber-400 font-inter tracking-widest uppercase">Gemini AI</span>
            </div>
          </div>
        )}
      </div>

      {showStyleModal && (
        <StyleModal 
          onClose={() => setShowStyleModal(false)}
          onExport={handleExportVideo}
          isExporting={exportingVideo}
        />
      )}
    </header>
  );
}
