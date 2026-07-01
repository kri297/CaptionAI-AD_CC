import React, { useState, useEffect } from 'react';
import { X, Mic, Volume2, Clock } from 'lucide-react';
import { formatTimestamp, parseTimestamp } from '../../utils/timeUtils.js';

export default function AddSegmentModal({ isOpen, onClose, onSave, defaultTime, initialType }) {
  const [type, setType] = useState('cc');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType(initialType || 'cc');
      const start = defaultTime || 0;
      setStartStr(formatTimestamp(start));
      setEndStr(formatTimestamp(start + 3));
      setText(initialType === 'ac' ? '[audio description]' : '');
    }
  }, [isOpen, defaultTime, initialType]);

  if (!isOpen) return null;

  const handleSave = () => {
    const start = parseTimestamp(startStr);
    let end = parseTimestamp(endStr);
    if (end <= start) end = start + 3;
    
    const finalText = text.trim() || (type === 'ac' ? '[audio description]' : 'New caption');
    onSave(type, start, end, finalText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-slide-up" style={{ animationDuration: '300ms' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/20">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {type === 'cc' ? <Mic className="w-5 h-5 text-sky-400" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
            Add {type === 'cc' ? 'Dialogue' : 'Sound Segment'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          
          {/* Type Selector */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
            <button 
              onClick={() => setType('cc')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'cc' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Closed Caption (CC)
            </button>
            <button 
              onClick={() => setType('ac')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'ac' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Audio Description (AD)
            </button>
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Start Time
              </label>
              <input 
                type="text" 
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400/50 transition-colors"
                placeholder="00:00:00,000"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> End Time
              </label>
              <input 
                type="text" 
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400/50 transition-colors"
                placeholder="00:00:03,000"
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {type === 'cc' ? 'Spoken Dialogue' : 'Description of Sound/Action'}
            </label>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
              placeholder={type === 'cc' ? 'e.g., Hello there!' : 'e.g., [Footsteps approaching rapidly]'}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 bg-black/20">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${type === 'cc' ? 'bg-sky-500 text-sky-950 hover:bg-sky-400 shadow-sky-500/20' : 'bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-amber-400/20'}`}
          >
            Add Segment
          </button>
        </div>
      </div>
    </div>
  );
}
