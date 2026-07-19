import React, { useCallback, useRef, useState } from 'react';
import { Upload, Film, Subtitles, Volume2, Download, ChevronRight, Sparkles, Zap, FileText, AlertTriangle, ExternalLink, Key, Globe, Search, Check, ChevronDown } from 'lucide-react';

const ACCEPTED = '.mp4,.webm,.mov,.avi,.mkv,.ogg';
const MAX_GB   = 2;

// ── Language data with flags ──────────────────────────────────────────────
const LANGUAGES = [
  { group: 'Auto', items: [
    { value: 'Auto-Detect', label: 'Auto-Detect', flag: '🌐', desc: 'AI detects language' }
  ]},
  { group: 'Popular', items: [
    { value: 'English',    label: 'English',    flag: '🇺🇸', desc: 'en-US' },
    { value: 'Hindi',      label: 'Hindi',      flag: '🇮🇳', desc: 'हिन्दी' },
    { value: 'Spanish',    label: 'Spanish',    flag: '🇪🇸', desc: 'Español' },
    { value: 'French',     label: 'French',     flag: '🇫🇷', desc: 'Français' },
    { value: 'Japanese',   label: 'Japanese',   flag: '🇯🇵', desc: '日本語' },
    { value: 'Chinese',    label: 'Chinese',    flag: '🇨🇳', desc: '中文' },
    { value: 'Korean',     label: 'Korean',     flag: '🇰🇷', desc: '한국어' },
    { value: 'Arabic',     label: 'Arabic',     flag: '🇸🇦', desc: 'العربية' },
    { value: 'Portuguese', label: 'Portuguese', flag: '🇧🇷', desc: 'Português' },
    { value: 'German',     label: 'German',     flag: '🇩🇪', desc: 'Deutsch' },
  ]},
  { group: 'Indian', items: [
    { value: 'Telugu',     label: 'Telugu',     flag: '🇮🇳', desc: 'తెలుగు' },
    { value: 'Tamil',      label: 'Tamil',      flag: '🇮🇳', desc: 'தமிழ்' },
    { value: 'Kannada',    label: 'Kannada',    flag: '🇮🇳', desc: 'ಕನ್ನಡ' },
    { value: 'Malayalam',  label: 'Malayalam',  flag: '🇮🇳', desc: 'മലയാളം' },
    { value: 'Bengali',    label: 'Bengali',    flag: '🇮🇳', desc: 'বাংলা' },
    { value: 'Gujarati',   label: 'Gujarati',   flag: '🇮🇳', desc: 'ગુજરાતી' },
    { value: 'Marathi',    label: 'Marathi',    flag: '🇮🇳', desc: 'मराठी' },
    { value: 'Urdu',       label: 'Urdu',       flag: '🇵🇰', desc: 'اردو' },
    { value: 'Nepali',     label: 'Nepali',     flag: '🇳🇵', desc: 'नेपाली' },
    { value: 'Sinhala',    label: 'Sinhala',    flag: '🇱🇰', desc: 'සිංහල' },
    { value: 'Punjabi',    label: 'Punjabi',    flag: '🇮🇳', desc: 'ਪੰਜਾਬੀ' },
  ]},
  { group: 'European', items: [
    { value: 'Italian',    label: 'Italian',    flag: '🇮🇹', desc: 'Italiano' },
    { value: 'Russian',    label: 'Russian',    flag: '🇷🇺', desc: 'Русский' },
    { value: 'Dutch',      label: 'Dutch',      flag: '🇳🇱', desc: 'Nederlands' },
    { value: 'Polish',     label: 'Polish',     flag: '🇵🇱', desc: 'Polski' },
    { value: 'Swedish',    label: 'Swedish',    flag: '🇸🇪', desc: 'Svenska' },
    { value: 'Turkish',    label: 'Turkish',    flag: '🇹🇷', desc: 'Türkçe' },
    { value: 'Danish',     label: 'Danish',     flag: '🇩🇰', desc: 'Dansk' },
    { value: 'Finnish',    label: 'Finnish',    flag: '🇫🇮', desc: 'Suomi' },
    { value: 'Norwegian',  label: 'Norwegian',  flag: '🇳🇴', desc: 'Norsk' },
    { value: 'Greek',      label: 'Greek',      flag: '🇬🇷', desc: 'Ελληνικά' },
    { value: 'Czech',      label: 'Czech',      flag: '🇨🇿', desc: 'Čeština' },
    { value: 'Romanian',   label: 'Romanian',   flag: '🇷🇴', desc: 'Română' },
    { value: 'Hungarian',  label: 'Hungarian',  flag: '🇭🇺', desc: 'Magyar' },
    { value: 'Ukrainian',  label: 'Ukrainian',  flag: '🇺🇦', desc: 'Українська' },
    { value: 'Croatian',   label: 'Croatian',   flag: '🇭🇷', desc: 'Hrvatski' },
    { value: 'Slovak',     label: 'Slovak',     flag: '🇸🇰', desc: 'Slovenčina' },
    { value: 'Catalan',    label: 'Catalan',    flag: '🇪🇸', desc: 'Català' },
    { value: 'Serbian',    label: 'Serbian',    flag: '🇷🇸', desc: 'Српски' },
    { value: 'Latvian',    label: 'Latvian',    flag: '🇱🇻', desc: 'Latviešu' },
    { value: 'Lithuanian', label: 'Lithuanian', flag: '🇱🇹', desc: 'Lietuvių' },
    { value: 'Icelandic',  label: 'Icelandic',  flag: '🇮🇸', desc: 'Íslenska' },
    { value: 'Welsh',      label: 'Welsh',      flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', desc: 'Cymraeg' },
  ]},
  { group: 'Asian', items: [
    { value: 'Thai',       label: 'Thai',       flag: '🇹🇭', desc: 'ไทย' },
    { value: 'Vietnamese', label: 'Vietnamese', flag: '🇻🇳', desc: 'Tiếng Việt' },
    { value: 'Indonesian', label: 'Indonesian', flag: '🇮🇩', desc: 'Indonesia' },
    { value: 'Malay',      label: 'Malay',      flag: '🇲🇾', desc: 'Melayu' },
    { value: 'Filipino',   label: 'Filipino',   flag: '🇵🇭', desc: 'Filipino' },
    { value: 'Khmer',      label: 'Khmer',      flag: '🇰🇭', desc: 'ខ្មែរ' },
    { value: 'Burmese',    label: 'Burmese',    flag: '🇲🇲', desc: 'မြန်မာ' },
  ]},
  { group: 'African & Middle Eastern', items: [
    { value: 'Afrikaans',  label: 'Afrikaans',  flag: '🇿🇦', desc: 'Afrikaans' },
    { value: 'Swahili',    label: 'Swahili',    flag: '🇰🇪', desc: 'Kiswahili' },
    { value: 'Amharic',    label: 'Amharic',    flag: '🇪🇹', desc: 'አማርኛ' },
    { value: 'Hebrew',     label: 'Hebrew',     flag: '🇮🇱', desc: 'עברית' },
  ]},
];

// ── Flat list for searching
const ALL_LANGUAGES = LANGUAGES.flatMap(g => g.items);

// ── Smart error banner ─────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  const isQuota   = message?.includes('QUOTA_EXCEEDED') || message?.includes('429') || message?.includes('quota');
  const isInvalid = message?.includes('INVALID_KEY') || message?.includes('403') || message?.includes('invalid');
  const isNoKey   = message?.includes('NO_KEY') || message?.includes('GEMINI_API_KEY');
  const needsKey  = isQuota || isInvalid || isNoKey;

  let title  = 'Something went wrong';
  let detail = message;
  let fix    = null;

  if (isQuota) {
    title  = 'API Key has no quota';
    detail = 'The key you entered has exceeded its free tier limit, or you are making requests too quickly.';
    fix    = 'Please wait a minute or set up billing in Google AI Studio.';
  } else if (isInvalid) {
    title  = 'Invalid API Key';
    detail = 'Gemini rejected the key. Make sure you copied it exactly.';
    fix    = 'Generate a new key at Google AI Studio.';
  } else if (isNoKey) {
    title  = 'No API Key configured';
    detail = 'Add your Gemini API key to the .env file in the project root.';
    fix    = 'GEMINI_API_KEY=YOUR_KEY in your .env file';
  }

  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/8 overflow-hidden animate-fade-in">
      <div className="flex items-start gap-3 p-4">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-red-300 font-semibold font-grotesk text-sm mb-1">{title}</p>
          <p className="text-red-400/80 text-xs font-inter leading-relaxed">{detail}</p>
          {fix && <p className="text-slate-400 text-xs font-mono mt-1.5 bg-slate-900/50 px-2 py-1 rounded">{fix}</p>}
        </div>
      </div>
      {needsKey && (
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-400/10 border-t border-amber-400/20
            text-amber-400 hover:bg-amber-400/15 transition-colors text-xs font-semibold font-inter"
        >
          <Key className="w-3.5 h-3.5" />
          Get a free Gemini API key at aistudio.google.com
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      )}
    </div>
  );
}

// ── Language Selector Dropdown ──────────────────────────────────────────────
function LanguageSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const selected = ALL_LANGUAGES.find(l => l.value === value) || ALL_LANGUAGES[0];

  // Close on outside click
  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
      setSearch('');
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const filteredGroups = LANGUAGES.map(g => ({
    ...g,
    items: g.items.filter(l => 
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(g => g.items.length > 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur-lg border border-slate-700/50 
          hover:border-amber-400/30 transition-all duration-300 shadow-xl group min-w-[200px]"
      >
        <span className="text-lg">{selected.flag}</span>
        <div className="flex-1 text-left">
          <span className="text-white text-sm font-inter font-medium">{selected.label}</span>
          <span className="text-slate-500 text-xs ml-2 font-inter">{selected.desc}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[320px] bg-slate-900/95 backdrop-blur-xl border border-white/10 
          rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in z-50">
          
          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search languages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white 
                  placeholder-slate-500 focus:outline-none focus:border-amber-400/50 font-inter"
              />
            </div>
          </div>

          {/* Language Groups */}
          <div className="max-h-[320px] overflow-y-auto py-1">
            {filteredGroups.map(group => (
              <div key={group.group}>
                {group.group !== 'Auto' && (
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-inter">{group.group}</span>
                  </div>
                )}
                {group.items.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => { onChange(lang.value); setOpen(false); setSearch(''); }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-150
                      ${value === lang.value 
                        ? 'bg-amber-400/10 text-amber-400' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <span className="text-base w-6 text-center">{lang.flag}</span>
                    <span className="flex-1 text-sm font-inter font-medium">{lang.label}</span>
                    <span className="text-xs text-slate-500 font-inter">{lang.desc}</span>
                    {value === lang.value && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-6 text-center text-slate-500 text-sm font-inter">
                No languages match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Floating particles ──────────────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 animate-float"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${6 + i * 2}s`,
          }}
        />
      ))}
    </div>
  );
}


export default function DropZone({ onFileSelect, error, draftAvailable, onResumeDraft }) {
  const inputRef  = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Auto-Detect');

  const validate = (file) => {
    if (!file) return 'No file selected.';
    if (file.size > MAX_GB * 1024 ** 3) return `File too large. Max ${MAX_GB} GB.`;
    if (!file.type.startsWith('video/')) return 'Please select a valid video file.';
    return null;
  };

  const handle = useCallback((file) => {
    const err = validate(file);
    if (err) { setLocalErr(err); return; }
    setLocalErr('');
    onFileSelect(file, targetLanguage);
  }, [onFileSelect, targetLanguage]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handle(e.dataTransfer.files[0]);
  }, [handle]);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onPick      = (e) => handle(e.target.files[0]);

  const displayErr = localErr || error;

  return (
    <main className="hero-gradient min-h-[calc(100vh-56px)] flex flex-col items-center justify-start px-4 pb-16 relative">
      <FloatingParticles />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto text-center pt-16 pb-10 animate-slide-up relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 mb-6 animate-pulse-slow">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 font-inter tracking-wide uppercase">Powered by Gemini AI</span>
        </div>

        <h1 className="font-grotesk font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight mb-6">
          AI-Powered Captions
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-amber-400 animate-text-pan bg-[length:200%_auto]">
            for Every Video
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed mb-8 font-inter">
          Upload any video. Gemini AI analyses it and instantly generates{' '}
          <span className="text-sky-400 font-medium">closed captions (CC)</span> and{' '}
          <span className="text-amber-400 font-medium">audio captions (AC)</span>.
          Edit everything, then download your files.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: '🎙️', text: 'Speech Transcription' },
            { icon: '🔊', text: 'Audio Event Detection' },
            { icon: '✏️', text: 'Inline Editing' },
            { icon: '⬇️', text: 'SRT & VTT Export' },
            { icon: '🌍', text: '28+ Languages' },
            { icon: '🎵', text: 'AI Voice (TTS)' },
          ].map(({ icon, text }) => (
            <span key={text} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] text-slate-300 text-sm font-inter hover:bg-slate-700/80 hover:border-amber-400/30 hover:text-white transition-all duration-300 cursor-default hover:-translate-y-0.5">
              <span>{icon}</span>{text}
            </span>
          ))}
        </div>
      </section>

      {/* ── Language + Drop Zone ────────────────────────────────────────── */}
      <section className="w-full max-w-2xl mx-auto mb-8 animate-slide-up relative z-10" style={{ animationDelay: '100ms' }}>
        
        {/* Glow behind dropzone */}
        <div className="absolute inset-0 bg-amber-400/5 blur-[100px] rounded-full pointer-events-none" />

        {/* Draft Resume Banner */}
        {draftAvailable && (
          <div className="mb-6 animate-slide-up">
            <button
              onClick={onResumeDraft}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-4 flex items-center justify-between transition-all hover:border-sky-400/40 hover:bg-sky-500/10 shadow-[0_0_30px_rgba(14,165,233,0.1)] hover:shadow-[0_0_40px_rgba(14,165,233,0.2)]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                  <FileText className="w-6 h-6 text-sky-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-grotesk font-bold text-lg mb-0.5 group-hover:text-sky-300 transition-colors">
                    Resume Previous Project
                  </h3>
                  <p className="text-slate-400 text-sm font-inter">
                    Draft saved for: <span className="text-slate-300 font-medium">{draftAvailable}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sky-400 font-inter font-bold text-sm bg-sky-500/10 px-4 py-2 rounded-xl">
                Continue <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* Language Selector */}
        <div className="mb-6 flex items-center justify-center gap-3 relative z-10">
          <label className="flex items-center gap-2 text-slate-400 text-sm font-inter font-medium tracking-wide">
            <Globe className="w-4 h-4 text-amber-400" />
            Caption Language
          </label>
          <LanguageSelector value={targetLanguage} onChange={setTargetLanguage} />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-3xl p-12 text-center cursor-pointer
            transition-all duration-500 select-none glass-panel overflow-hidden
            ${dragging
              ? 'drop-zone-border-active bg-amber-400/10 scale-[1.02] shadow-[0_0_50px_rgba(251,191,36,0.15)]'
              : 'drop-zone-border bg-slate-900/40 hover:bg-slate-800/60 hover:shadow-[0_0_30px_rgba(251,191,36,0.05)]'
            }
          `}
          aria-label="Upload video file"
        >
          {/* Animated icon */}
          <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center
            border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-amber-400/5 transition-all duration-500 shadow-inner
            ${dragging ? 'scale-110 border-amber-400/50 from-amber-400/20 to-amber-400/10 animate-bounce-subtle shadow-[0_0_30px_rgba(251,191,36,0.3)]' : ''}`}
          >
            {dragging
              ? <Download className="w-10 h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              : <Upload className="w-10 h-10 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            }
          </div>

          <h2 className="font-grotesk font-bold text-2xl text-white mb-2 tracking-tight">
            {dragging ? 'Drop to upload' : 'Drop your video here'}
          </h2>
          <p className="text-slate-400 text-base mb-6 font-inter">
            or <span className="text-amber-400 font-medium underline underline-offset-4 hover:text-amber-300 transition-colors">click to browse</span> your files
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-mono tracking-wide uppercase">
            <span className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/5">MP4</span>
            <span className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/5">WebM</span>
            <span className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/5">MOV</span>
            <span className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/5">AVI</span>
            <span className="text-slate-600 px-2">• Up to {MAX_GB}GB</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            onChange={onPick}
            className="hidden"
            aria-hidden
          />
        </div>

        {displayErr && <ErrorBanner message={displayErr} />}
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="w-full max-w-4xl mx-auto mt-12 relative z-10" aria-label="How it works">
        <h2 className="font-grotesk font-semibold text-slate-500 text-sm uppercase tracking-[0.2em] text-center mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: <Upload className="w-6 h-6 text-amber-400" />,
              title: 'Upload Video',
              desc: 'Drop any MP4, WebM, or MOV file. No account needed.',
              glow: 'amber',
              delay: '0ms'
            },
            {
              step: '02',
              icon: <Sparkles className="w-6 h-6 text-purple-400" />,
              title: 'AI Analysis',
              desc: 'Gemini reads the audio and video to transcribe speech and detect sounds.',
              glow: 'purple',
              delay: '100ms'
            },
            {
              step: '03',
              icon: <Download className="w-6 h-6 text-sky-400" />,
              title: 'Edit & Export',
              desc: 'Fine-tune captions in the editor, then export SRT or WebVTT files.',
              glow: 'sky',
              delay: '200ms'
            }
          ].map(({ step, icon, title, desc, glow, delay }) => (
            <div key={step} className="relative rounded-3xl p-8 glass-panel hover:bg-slate-800/60 transition-all duration-500 group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] animate-slide-up" style={{ animationDelay: delay, opacity: 0 }}>
              <div className="absolute top-6 right-8 font-mono text-5xl text-white/[0.02] font-black transition-all duration-500 group-hover:text-white/10 group-hover:scale-110 origin-right">{step}</div>
              <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 shadow-inner
                group-hover:shadow-[0_0_30px_rgba(${glow === 'amber' ? '251,191,36' : glow === 'purple' ? '168,85,247' : '56,189,248'},0.2)]
                group-hover:border-${glow}-400/30 transition-all duration-500`}>
                {icon}
              </div>
              <h3 className="font-grotesk font-bold text-white text-xl mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-inter">{desc}</p>
            </div>
          ))}
        </div>

        {/* Caption types explanation */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '300ms', opacity: 0 }}>
          <div className="rounded-3xl p-8 glass-panel border-l-2 border-l-sky-400 hover:bg-slate-800/40 transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                <FileText className="w-5 h-5 text-sky-400" />
              </div>
              <span className="font-grotesk font-bold text-white text-lg">Closed Captions <span className="text-sky-400">(CC)</span></span>
            </div>
            <p className="text-slate-400 text-sm font-inter leading-relaxed">
              Word-for-word transcription of all spoken dialogue, with precise timestamps for every sentence.
            </p>
          </div>
          <div className="rounded-3xl p-8 glass-panel border-l-2 border-l-amber-400 hover:bg-slate-800/40 transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Volume2 className="w-5 h-5 text-amber-400" />
              </div>
              <span className="font-grotesk font-bold text-white text-lg">Audio Captions <span className="text-amber-400">(AC)</span></span>
            </div>
            <p className="text-slate-400 text-sm font-inter leading-relaxed">
              Descriptions of non-speech audio events like <em className="text-amber-300 font-medium">[soft piano melody]</em> or <em className="text-amber-300 font-medium">[crowd cheering]</em> — essential for accessibility.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-700 text-xs font-inter relative z-10">
        Built with Gemini AI · Captions processed server-side · Files never stored permanently
      </footer>
    </main>
  );
}
