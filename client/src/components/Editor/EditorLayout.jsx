import React from 'react';
import { useCaptions } from '../../context/CaptionContext.jsx';
import { useVideoSync } from '../../hooks/useVideoSync.js';
import VideoPlayer from '../Player/VideoPlayer.jsx';
import EditorPanel from './EditorPanel.jsx';

export default function EditorLayout({ videoUrl, filename, fileId, targetLanguage, videoDuration }) {
  const { captions } = useCaptions();

  const {
    videoRef, currentTime, duration, isPlaying,
    activeCC, activeAC, volume, speed,
    seekTo, togglePlay, setVideoVolume, setVideoSpeed
  } = useVideoSync(captions);

  const activeCaption = activeCC || activeAC;
  const activeCaptionId = activeCaption?.id ?? null;

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-[#0a0a0f]">
      {/* Left: Video Player */}
      <div className="lg:w-1/2 flex flex-col p-4 lg:p-6 gap-4 border-r border-slate-800/50 justify-center relative">
        {/* Glow effect behind video */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-3xl mx-auto shadow-2xl shadow-black/50 rounded-2xl overflow-hidden ring-1 ring-white/10">
          <VideoPlayer
            videoUrl={videoUrl}
            videoRef={videoRef}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            activeCC={activeCC}
            activeAC={activeAC}
            volume={volume}
            speed={speed}
            seekTo={seekTo}
            togglePlay={togglePlay}
            setVideoVolume={setVideoVolume}
            setVideoSpeed={setVideoSpeed}
          />
        </div>

        {/* Minimal Stats */}
        <div className="flex items-center justify-center gap-6 text-xs font-inter text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400/80" />
            {captions.filter(c => c.type === 'cc').length} Dialogue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400/80" />
            {captions.filter(c => c.type === 'ac').length} Sounds
          </span>
        </div>
      </div>

      {/* Right: Clean Script Editor */}
      <div className="lg:w-1/2 flex flex-col min-h-0 bg-studio-900/50">
        <EditorPanel
          activeCaptionId={activeCaptionId}
          onSeek={seekTo}
          currentTime={currentTime}
          fileId={fileId}
          targetLanguage={targetLanguage}
        />
      </div>
    </div>
  );
}
