import React, { useState } from 'react';
import { FileText, FileCode, Download, Copy, CheckCheck, Music, Volume2, Loader2, Film } from 'lucide-react';
import { useCaptions } from '../../context/CaptionContext.jsx';
import { serializeSRT } from '../../utils/srtParser.js';
import { exportVTT, downloadFile } from '../../utils/vttExporter.js';

// ── Toast notification ────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <CheckCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-inter font-medium text-emerald-300">{message}</span>
      </div>
    </div>
  );
}

export default function ExportPanel({ filename, fileId, targetLanguage, deliverables, selectedVoice }) {
  const { captions } = useCaptions();
  const [copied, setCopied] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [mixProgress, setMixProgress] = useState(0);
  const [isDownloadingAI, setIsDownloadingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const base = filename.replace(/\.[^/.]+$/, '') || 'captions';
  const ccCaps = captions.filter(c => c.type === 'cc');
  const acCaps = captions.filter(c => c.type === 'ac');

  const showToast = (msg) => setToast(msg);

  const dlSRT = (caps, suffix = '') => {
    downloadFile(serializeSRT(caps), `${base}${suffix}.srt`, 'text/plain;charset=utf-8');
    showToast(`Downloaded ${base}${suffix}.srt`);
  };
  const dlVTT = (caps, suffix = '') => {
    downloadFile(exportVTT(caps), `${base}${suffix}.vtt`, 'text/vtt;charset=utf-8');
    showToast(`Downloaded ${base}${suffix}.vtt`);
  };
  const dlJSON = () => {
    downloadFile(
      JSON.stringify({ filename, generated: new Date().toISOString(), cc: ccCaps, ac: acCaps }, null, 2),
      `${base}-captions.json`, 'application/json'
    );
    showToast(`Downloaded ${base}-captions.json`);
  };
  const copyAll = () => {
    const text = serializeSRT(captions);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast('Copied SRT to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const simulateProgress = (setter) => {
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + Math.random() * 15 + 5, 90);
      setter(Math.round(p));
    }, 500);
    return () => { clearInterval(iv); setter(100); };
  };

  const mixAudio = async () => {
    if (!fileId) { alert("Missing video file ID. Try refreshing."); return; }
    try {
      setIsMixing(true);
      setMixProgress(0);
      const stopProgress = simulateProgress(setMixProgress);
      
      const res = await fetch('/api/export/mixed-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, captions, targetLanguage, selectedVoice })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Audio mixing failed on server');
      }
      const blob = await res.blob();
      stopProgress();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hollywood_Mix_${base}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded Hollywood_Mix_${base}.wav`);
    } catch (err) {
      alert("Failed to download mixed audio. " + err.message);
    } finally {
      setIsMixing(false);
      setMixProgress(0);
    }
  };

  const renderAccessibleVideo = async () => {
    if (!fileId) { alert("Missing video file ID. Try refreshing."); return; }
    try {
      setIsRenderingVideo(true);
      setVideoProgress(0);
      const stopProgress = simulateProgress(setVideoProgress);
      
      const res = await fetch('/api/export/accessible-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, captions, targetLanguage, selectedVoice })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Video rendering failed on server');
      }
      const blob = await res.blob();
      stopProgress();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Accessible_${base}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded Accessible_${base}.mp4`);
    } catch (err) {
      alert("Failed to render accessible video. " + err.message);
    } finally {
      setIsRenderingVideo(false);
      setVideoProgress(0);
    }
  };

  const downloadAIVoice = async () => {
    if (!fileId) { alert("Missing video file ID. Try refreshing."); return; }
    try {
      setIsDownloadingAI(true);
      setAiProgress(0);
      const stopProgress = simulateProgress(setAiProgress);
      
      const res = await fetch('/api/export/ad-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, captions, targetLanguage, selectedVoice })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Download failed on server');
      }
      const blob = await res.blob();
      stopProgress();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_Voice_Only_${base}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded AI_Voice_Only_${base}.wav`);
    } catch (err) {
      alert("Failed to download AI Voice. " + err.message);
    } finally {
      setIsDownloadingAI(false);
      setAiProgress(0);
    }
  };

  const Btn = ({ onClick, icon, label, sublabel, color = 'slate', disabled = false }) => {
    const colors = {
      sky:    'border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
      amber:  'border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      slate:  'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20',
      emerald:'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-center
          transition-all duration-300 font-inter backdrop-blur-sm ${colors[color]} hover:scale-[1.02] active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
      >
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-bold tracking-wide">{label}</span>
        </div>
        {sublabel && <span className="text-[10px] opacity-70 uppercase tracking-wider">{sublabel}</span>}
      </button>
    );
  };

  return (
    <div className="glass-panel border-t border-white/10 px-6 py-5 shrink-0 z-10 relative">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-center">
        
        {/* Left: Audio Mix & AI Voice Buttons */}
        <div className="w-full md:w-1/3 flex flex-col gap-3 justify-center border-r border-white/5 pr-4">
          <button
            onClick={renderAccessibleVideo}
            disabled={isRenderingVideo}
            className="w-full glow-button bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-black border border-sky-400/50 rounded-xl py-3 px-4 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all active:scale-95 text-center relative overflow-hidden disabled:opacity-70 disabled:hover:scale-100"
          >
            {isRenderingVideo ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              <Film className="w-5 h-5 text-black" fill="currentColor" />
            )}
            <div className="text-left flex-1">
              <div className="font-grotesk font-black text-sm leading-none mb-0.5">
                {isRenderingVideo ? 'Rendering...' : 'Accessible Video'}
              </div>
              <div className="font-inter text-[9px] font-bold uppercase tracking-wider opacity-80">
                {isRenderingVideo ? `${videoProgress}% complete` : 'Render New Video'}
              </div>
            </div>
            {isRenderingVideo && (
              <div className="absolute top-0 left-0 bottom-0 bg-white/20 z-0 transition-all duration-300" style={{ width: `${videoProgress}%` }} />
            )}
          </button>

          <button
            onClick={mixAudio}
            disabled={isMixing}
            className="w-full bg-black/40 hover:bg-black/60 text-slate-200 border border-white/10 hover:border-white/20 rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition-all active:scale-95 relative overflow-hidden disabled:opacity-70"
          >
            {isMixing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Music className="w-5 h-5" fill="currentColor" />
            )}
            <div className="text-left flex-1">
              <div className="font-grotesk font-bold text-sm leading-none mb-0.5">
                {isMixing ? 'Mixing Audio...' : 'On-Demand Mix'}
              </div>
              <div className="font-inter text-[9px] font-medium uppercase tracking-wider opacity-60">
                {isMixing ? `${mixProgress}% complete` : 'Mix Current Edits'}
              </div>
            </div>
            {/* Progress overlay */}
            {isMixing && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-black/30 transition-all duration-500 rounded-b-xl"
                style={{ width: `${mixProgress}%` }}
              />
            )}
          </button>
          
          <button
            onClick={downloadAIVoice}
            disabled={isDownloadingAI}
            className="w-full bg-black/40 hover:bg-black/60 text-slate-200 border border-white/10 hover:border-white/20 rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition-all active:scale-95 relative overflow-hidden disabled:opacity-70"
          >
            {isDownloadingAI ? (
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            ) : (
              <Volume2 className="w-5 h-5 text-sky-400" />
            )}
            <div className="text-left flex-1">
              <div className="font-grotesk font-bold text-sm leading-none mb-0.5">
                {isDownloadingAI ? 'Generating...' : 'Only AI Voice'}
              </div>
              <div className="font-inter text-[9px] font-medium uppercase tracking-wider opacity-60">
                {isDownloadingAI ? `${aiProgress}% complete` : 'Clean AI Voice Track'}
              </div>
            </div>
            {/* Progress overlay */}
            {isDownloadingAI && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-sky-400/30 transition-all duration-500 rounded-b-xl"
                style={{ width: `${aiProgress}%` }}
              />
            )}
          </button>
        </div>

        {/* Right: Subtitle Exports */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="font-grotesk font-semibold text-white text-sm tracking-wide uppercase">Export Subtitles</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">
              {ccCaps.length} CC · {acCaps.length} AC
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Btn onClick={() => dlSRT(captions)} icon={<FileText className="w-4 h-4" />} label="All SRT" sublabel="CC + AC" color="slate" />
            <Btn onClick={() => dlSRT(ccCaps, '-cc')} icon={<FileText className="w-4 h-4" />} label="CC SRT" sublabel="Speech" color="sky" />
            <Btn onClick={() => dlSRT(acCaps, '-ac')} icon={<FileText className="w-4 h-4" />} label="AC SRT" sublabel="Sounds" color="amber" />
            
            {/* Copy button */}
            <button
              onClick={copyAll}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-white/5 bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-all duration-300 font-inter hover:scale-[1.02] active:scale-95"
            >
              {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs font-semibold tracking-wide">{copied ? 'Copied!' : 'Copy SRT'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
