import React from 'react';

export default function CaptionOverlay({ activeCC, activeAC }) {
  if (!activeCC && !activeAC) return null;

  const getEmotionClasses = (emotion) => {
    switch(emotion) {
      case 'angry': return 'text-red-500 font-bold scale-110 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
      case 'whisper': return 'text-slate-300 italic opacity-80 scale-90';
      case 'excited': return 'text-yellow-400 font-bold scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]';
      case 'sad': return 'text-blue-300 opacity-90';
      default: return 'text-white drop-shadow-md';
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 pointer-events-none px-4">
      {/* Audio Caption above */}
      {activeAC && (
        <div className="caption-ac animate-fade-in">
          {activeAC.text}
        </div>
      )}
      {/* Closed Caption at bottom */}
      {activeCC && (
        <div className={`caption-cc animate-fade-in transition-all duration-300 ${getEmotionClasses(activeCC.emotion)}`}>
          {activeCC.text}
        </div>
      )}
    </div>
  );
}
