import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Video, Type, Palette, Sparkles, Loader2 } from 'lucide-react';

export default function StyleModal({ onClose, onExport, isExporting }) {
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontColor, setFontColor] = useState('&HFFFFFF&'); // ASS color format (BBGGRR)
  const [emotionMode, setEmotionMode] = useState(true);

  // FFmpeg subtitles filter uses libass/ASS formats for colors and fonts.
  // We'll define some friendly names mapped to ASS hex colors.
  const COLORS = [
    { name: 'White', value: '&HFFFFFF&', hex: '#FFFFFF' },
    { name: 'Yellow', value: '&H00FFFF&', hex: '#FFFF00' },
    { name: 'Green', value: '&H00FF00&', hex: '#00FF00' },
    { name: 'Cyan', value: '&HFFFF00&', hex: '#00FFFF' },
  ];

  const FONTS = ['Arial', 'Verdana', 'Tahoma', 'Impact', 'Trebuchet MS'];

  const handleExport = () => {
    onExport({
      fontname: fontFamily,
      primaryColour: fontColor,
      emotionMode
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-studio-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-studio-800/50">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-400" />
            <h3 className="font-grotesk font-bold text-white text-lg">Export Video Settings</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isExporting}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-6">
          
          {/* Font Family */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Type className="w-4 h-4 text-slate-400" /> Font Family
            </label>
            <select 
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="w-full bg-studio-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            >
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Palette className="w-4 h-4 text-slate-400" /> Primary Color
            </label>
            <div className="flex gap-3">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFontColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${fontColor === c.value ? 'border-amber-400 scale-110 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-slate-600 hover:scale-105'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Emotion Mode */}
          <div className="p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Sparkles className="w-4 h-4" /> Emotion Reactivity
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={emotionMode}
                  onChange={e => setEmotionMode(e.target.checked)}
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
              </label>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If enabled, captions tagged with emotions (Angry, Excited, Sad) will override your primary color to visually reflect the tone (Red, Yellow, Blue).
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-studio-800/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-400 text-amber-950 hover:bg-amber-300 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isExporting ? 'Rendering MP4...' : 'Start Render'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
