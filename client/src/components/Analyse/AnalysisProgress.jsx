import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Loader2, Film, Mic, Volume2, Layers, Globe, Sparkles } from 'lucide-react';

const STAGES = [
  { id: 0, icon: <Film     className="w-4 h-4" />, label: 'Video received',              color: 'text-emerald-400' },
  { id: 1, icon: <Loader2  className="w-4 h-4" />, label: 'Uploading to Gemini AI…',    color: 'text-sky-400'     },
  { id: 2, icon: <Mic      className="w-4 h-4" />, label: 'Transcribing speech (CC)…',  color: 'text-sky-400'     },
  { id: 3, icon: <Volume2  className="w-4 h-4" />, label: 'Detecting audio events (AC)…', color: 'text-amber-400' },
  { id: 4, icon: <Layers   className="w-4 h-4" />, label: 'Building caption timeline…', color: 'text-amber-400'  },
];

const LANG_FLAGS = {
  'Auto-Detect': '🌐', 'English': '🇺🇸', 'Hindi': '🇮🇳', 'Telugu': '🇮🇳',
  'Tamil': '🇮🇳', 'Spanish': '🇪🇸', 'French': '🇫🇷', 'Japanese': '🇯🇵',
  'Korean': '🇰🇷', 'Chinese': '🇨🇳', 'Arabic': '🇸🇦', 'Portuguese': '🇧🇷',
  'German': '🇩🇪', 'Italian': '🇮🇹', 'Russian': '🇷🇺', 'Kannada': '🇮🇳',
  'Gujarati': '🇮🇳', 'Marathi': '🇮🇳', 'Bengali': '🇮🇳', 'Malayalam': '🇮🇳',
  'Urdu': '🇵🇰', 'Nepali': '🇳🇵', 'Sinhala': '🇱🇰', 'Punjabi': '🇮🇳',
  'Thai': '🇹🇭', 'Vietnamese': '🇻🇳', 'Indonesian': '🇮🇩',
  'Malay': '🇲🇾', 'Filipino': '🇵🇭', 'Khmer': '🇰🇭', 'Burmese': '🇲🇲',
  'Dutch': '🇳🇱', 'Polish': '🇵🇱', 'Swedish': '🇸🇪', 'Danish': '🇩🇰',
  'Finnish': '🇫🇮', 'Norwegian': '🇳🇴', 'Greek': '🇬🇷', 'Czech': '🇨🇿',
  'Romanian': '🇷🇴', 'Hungarian': '🇭🇺', 'Ukrainian': '🇺🇦', 'Croatian': '🇭🇷',
  'Slovak': '🇸🇰', 'Catalan': '🇪🇸', 'Serbian': '🇷🇸', 'Latvian': '🇱🇻',
  'Lithuanian': '🇱🇹', 'Icelandic': '🇮🇸', 'Afrikaans': '🇿🇦', 'Swahili': '🇰🇪',
  'Amharic': '🇪🇹', 'Hebrew': '🇮🇱', 'Welsh': '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
};

export default function AnalysisProgress({ filename, videoUrl, stage, targetLanguage }) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  // Elapsed time counter
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // Fake progress bar mapped to stage
  const pct = Math.min(100, Math.round((stage / (STAGES.length - 1)) * 95) + (stage > 0 ? 5 : 0));
  const langFlag = LANG_FLAGS[targetLanguage] || '🌐';

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6 hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
      <div className="w-full max-w-xl animate-fade-in relative z-10">

        {/* Video thumbnail */}
        {videoUrl && (
          <div className="mb-10 rounded-3xl overflow-hidden border border-slate-700/50 aspect-video bg-black relative shadow-[0_0_60px_rgba(0,0,0,0.8)] group">
            <video src={videoUrl} className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-1000" muted />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Glowing rings */}
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute inset-0 rounded-full border border-sky-400/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite] delay-150" />
                
                <div className="w-24 h-24 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center animate-pulse-glow shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-amber-400 animate-spin-slow" />
                    <Sparkles className="w-4 h-4 text-sky-400 absolute animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <p className="text-white text-base font-medium font-grotesk truncate drop-shadow-lg tracking-wide">{filename}</p>
                {targetLanguage && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white font-inter shrink-0 ml-3 shadow-lg">
                    <span className="text-sm">{langFlag}</span>
                    {targetLanguage !== 'Auto-Detect' ? targetLanguage : 'Auto-Detect'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl glass-panel p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-400 to-sky-400 opacity-80" />
          
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-grotesk font-black text-2xl flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">Analysing video</span>
              <span className="text-amber-400 font-mono text-xl">{dots}</span>
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-300 font-medium">
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>
          
          <p className="text-slate-400 text-sm font-inter mb-10 leading-relaxed">
            AI is extracting context, transcribing dialogue, and pinpointing audio events.
          </p>

          {/* Vertical Timeline Steps */}
          <div className="relative space-y-0 mb-10 pl-2">
            {STAGES.map((s, idx) => {
              const done    = stage > s.id;
              const current = stage === s.id;
              const isLast  = idx === STAGES.length - 1;
              return (
                <div key={s.id} className="relative pb-8 last:pb-0">
                  {/* Connecting Line */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-7 bottom-[-7px] w-[2px] bg-slate-800 rounded-full">
                      {done && <div className="absolute inset-0 bg-gradient-to-b from-emerald-400 to-emerald-400/20 rounded-full w-full h-full" />}
                    </div>
                  )}

                  <div className={`flex items-center gap-6 transition-all duration-500 relative z-10 ${stage < s.id ? 'opacity-40 grayscale' : 'opacity-100'} ${current ? 'translate-x-2' : ''}`}>
                    {done
                      ? <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /></div>
                      : current
                        ? <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)] relative">
                            <div className="absolute inset-0 rounded-full border border-amber-400 animate-ping opacity-20" />
                            <Loader2 className={`w-3.5 h-3.5 animate-spin ${s.color}`} />
                          </div>
                        : <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><Circle className="w-1.5 h-1.5 text-slate-600" fill="currentColor" /></div>
                    }
                    <span className={`text-base font-inter ${done ? 'text-slate-300' : current ? 'text-white font-semibold' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full bg-slate-900 overflow-hidden shadow-inner border border-white/5 relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-amber-400 to-amber-300 transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between mt-3 text-xs text-slate-500 font-mono uppercase tracking-widest font-semibold">
            <span>Processing</span>
            <span className="text-amber-400">{pct}%</span>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-8 font-inter flex items-center justify-center gap-2 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          End-to-End Encryption Active
        </p>
      </div>
    </div>
  );
}
