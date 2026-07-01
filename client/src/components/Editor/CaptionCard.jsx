import React, { useCallback, useRef, useState } from 'react';
import { Play, Trash2, Clock, Volume2, Loader2, Check, RotateCw, Pause } from 'lucide-react';
import { parseTimestamp } from '../../utils/timeUtils.js';

// Format to short readable time (e.g., 1:24)
function formatShort(seconds) {
  if (!isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CaptionCard({ caption, index, isActive, onUpdate, onDelete, onSeek, fileId, targetLanguage }) {
  const isCC = caption.type === 'cc';
  const [isGenerating, setIsGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const generateAudio = async () => {
    if (!caption.text || isGenerating || !fileId) return;
    try {
      setIsGenerating(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: caption.text,
          fileId: fileId,
          captionId: caption.id,
          targetLanguage: targetLanguage || 'Auto-Detect'
        })
      });
      
      if (!res.ok) throw new Error('TTS generation failed');
      const data = await res.json();
      
      onUpdate(caption.id, { audioFile: data.audioFile });
      
      setJustGenerated(true);
      setTimeout(() => setJustGenerated(false), 2000);
    } catch (err) {
      alert("Failed to generate audio for this segment.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!caption.audioFile) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    
    const audio = new Audio(`/uploads/${caption.audioFile}`);
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
  };

  const handleTS = useCallback((field, val) => {
    // Basic parsing for user typing "1:24" or just "84"
    let secs = 0;
    if (val.includes(':')) {
      const parts = val.split(':');
      secs = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
    } else {
      secs = parseFloat(val);
    }
    if (isFinite(secs) && secs >= 0) onUpdate(caption.id, { [field]: secs });
  }, [caption.id, onUpdate]);

  const charCount = caption.text?.length || 0;
  const charWarning = charCount > 80;

  return (
    <div
      className={`
        group relative rounded-2xl p-4 mb-3 transition-all duration-300
        ${isActive
          ? 'bg-slate-800/80 shadow-lg shadow-black/20 scale-[1.02] z-10 border border-slate-700'
          : 'bg-studio-800/40 hover:bg-studio-800 border border-transparent'
        }
      `}
      id={`caption-${caption.id}`}
    >
      {/* Type indicator bar on the left */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-colors duration-300 ${isActive ? (isCC ? 'bg-sky-400' : 'bg-amber-400') : (isCC ? 'bg-sky-400/20' : 'bg-amber-400/20')}`} />

      {/* Header: Short Time and Hover Actions */}
      <div className="flex items-center justify-between mb-2 pl-2">
        <div className="flex items-center gap-2">
          {isActive && <span className={`w-1.5 h-1.5 rounded-full ${isCC ? 'bg-sky-400' : 'bg-amber-400'} animate-pulse`} />}
          
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-medium">
            <Clock className="w-3 h-3 opacity-60" />
            <input
              type="text"
              defaultValue={formatShort(caption.start)}
              onBlur={e => handleTS('start', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTS('start', e.target.value)}
              className="w-10 bg-transparent text-center hover:bg-white/5 focus:bg-white/10 rounded outline-none transition-colors"
            />
            <span className="opacity-40">-</span>
            <input
              type="text"
              defaultValue={formatShort(caption.end)}
              onBlur={e => handleTS('end', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTS('end', e.target.value)}
              className="w-10 bg-transparent text-center hover:bg-white/5 focus:bg-white/10 rounded outline-none transition-colors"
            />
          </div>

          {isCC && caption.emotion && caption.emotion !== 'neutral' && (
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
              caption.emotion === 'angry' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              caption.emotion === 'whisper' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
              caption.emotion === 'excited' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
              caption.emotion === 'sad' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''
            }`}>
              {caption.emotion}
            </span>
          )}

          {/* Character count */}
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
            charWarning ? 'text-orange-400 bg-orange-400/10 border border-orange-400/20' : 'text-slate-600'
          }`}>
            {charCount}ch
          </span>
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!isCC && (
            <div className="flex items-center gap-1">
              <button
                onClick={generateAudio}
                disabled={isGenerating}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border transition-all duration-200 ${
                  caption.audioFile 
                    ? justGenerated 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
                }`}
                title="Generate AI Voice"
              >
                {isGenerating 
                  ? <Loader2 className="w-3 h-3 animate-spin" /> 
                  : caption.audioFile && justGenerated 
                    ? <Check className="w-3 h-3" /> 
                    : caption.audioFile 
                      ? <RotateCw className="w-3 h-3" /> 
                      : <Volume2 className="w-3 h-3" />
                }
                {caption.audioFile ? (justGenerated ? 'Done!' : 'Regen') : 'Generate'}
              </button>
              
              {caption.audioFile && (
                <button
                  onClick={toggleAudioPlay}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border transition-all duration-200 ${
                    isPlaying 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' 
                      : 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30'
                  }`}
                  title={isPlaying ? "Stop Preview" : "Play AI Voice Preview"}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" fill="currentColor" />}
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => onSeek(caption.start)}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
            title="Play from here"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
          </button>
          <button
            onClick={() => onDelete(caption.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Delete caption"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Caption Text Input */}
      <div className="pl-2">
        <textarea
          value={caption.text}
          onChange={e => onUpdate(caption.id, { text: e.target.value, audioFile: null })}
          rows={caption.text.split('\n').length || 1}
          className={`
            w-full bg-transparent resize-none border-0 outline-none p-0
            text-[15px] leading-relaxed font-inter focus:ring-0
            ${isCC ? 'text-slate-200' : 'text-amber-200/90 italic'}
          `}
          placeholder={isCC ? 'Type dialogue here...' : '[describe audio event]'}
        />
      </div>

      {/* Audio file indicator for AC captions */}
      {!isCC && caption.audioFile && !justGenerated && (
        <div className="pl-2 mt-1 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
          <Volume2 className="w-3 h-3 text-emerald-500/50" />
          <span>AI voice attached</span>
        </div>
      )}
    </div>
  );
}
