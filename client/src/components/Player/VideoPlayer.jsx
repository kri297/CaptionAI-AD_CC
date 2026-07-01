import React, { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward } from 'lucide-react';
import { formatDisplay } from '../../utils/timeUtils.js';
import CaptionOverlay from './CaptionOverlay.jsx';

export default function VideoPlayer({ videoUrl, videoRef, currentTime, duration, isPlaying,
  activeCC, activeAC, volume, speed, seekTo, togglePlay, setVideoVolume, setVideoSpeed }) {

  const containerRef = useRef(null);

  // Spacebar shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); seekTo(currentTime - 5); }
      if (e.code === 'ArrowRight') { e.preventDefault(); seekTo(currentTime + 5); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekTo, currentTime]);

  const onSeek = useCallback((e) => {
    const pct = e.nativeEvent.offsetX / e.currentTarget.getBoundingClientRect().width;
    seekTo(pct * duration);
  }, [duration, seekTo]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden flex flex-col group">

      {/* Video element */}
      <div className="relative aspect-video w-full bg-black flex-shrink-0">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          preload="metadata"
        />

        {/* Caption overlay */}
        <CaptionOverlay activeCC={activeCC} activeAC={activeAC} />
      </div>

      {/* Custom Controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 z-10">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/30 rounded-full cursor-pointer relative" onClick={onSeek}>
          <div className="absolute top-0 left-0 h-full bg-sky-500 rounded-full pointer-events-none" style={{ width: `${pct}%` }} />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={() => seekTo(currentTime - 5)} className="hover:text-sky-400 transition">
              <SkipBack size={20} />
            </button>
            <button onClick={togglePlay} className="hover:text-sky-400 transition">
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button onClick={() => seekTo(currentTime + 5)} className="hover:text-sky-400 transition">
              <SkipForward size={20} />
            </button>
            
            <div className="flex items-center gap-2 group/vol">
              <button onClick={() => setVideoVolume(volume === 0 ? 1 : 0)} className="hover:text-sky-400 transition">
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" min="0" max="1" step="0.1" value={volume}
                onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                className="w-0 opacity-0 group-hover/vol:w-16 group-hover/vol:opacity-100 transition-all duration-300 origin-left accent-sky-500 cursor-pointer"
              />
            </div>

            <div className="text-xs font-medium tabular-nums tracking-wide opacity-100">
              {formatDisplay(currentTime)} / {formatDisplay(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={speed}
              onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer hover:text-sky-400 transition"
            >
              {SPEEDS.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}x</option>)}
            </select>
            <button onClick={fullscreen} className="hover:text-sky-400 transition">
              <Maximize2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
