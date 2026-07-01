import React, { useState, useEffect } from 'react';
import { Plus, Search, Layers, Mic, Volume2 } from 'lucide-react';
import { useCaptions } from '../../context/CaptionContext.jsx';
import CaptionCard from './CaptionCard.jsx';
import AddSegmentModal from './AddSegmentModal.jsx';

const FILTERS = [
  { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'cc',  label: 'Dialogue', icon: <Mic className="w-3.5 h-3.5" /> },
  { id: 'ac',  label: 'Sounds', icon: <Volume2 className="w-3.5 h-3.5" /> },
];

export default function EditorPanel({ activeCaptionId, onSeek, currentTime, fileId, targetLanguage }) {
  const { captions, updateCaption, deleteCaption, addCaption } = useCaptions();
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('cc');

  const sorted   = [...captions].sort((a, b) => a.start - b.start);
  const filtered = sorted.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    if (search && !c.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Auto-scroll active card into view smoothly
  useEffect(() => {
    if (activeCaptionId) {
      const el = document.getElementById(`caption-${activeCaptionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeCaptionId]);

  return (
    <div className="flex flex-col h-full bg-studio-900/40 relative">
      
      {/* Top sticky bar */}
      <div className="px-6 py-4 border-b border-slate-800/50 bg-studio-900/80 backdrop-blur-md z-20 shrink-0 flex flex-col gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search script..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-studio-800/50 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-studio-800 transition-all font-inter"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                ${filter === f.id
                  ? 'bg-slate-700/80 border-slate-600 text-white'
                  : 'bg-transparent border-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }
              `}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 font-inter">
            <p>{search ? 'No matches found.' : 'Your script is empty.'}</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {filtered.map((cap, i) => (
              <CaptionCard
                key={cap.id}
                caption={cap}
                index={i}
                isActive={cap.id === activeCaptionId}
                onUpdate={updateCaption}
                onDelete={deleteCaption}
                onSeek={onSeek}
                fileId={fileId}
                targetLanguage={targetLanguage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 border-t border-slate-800/50 bg-studio-900/80 backdrop-blur-md shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => { setModalType('cc'); setModalOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> Add Dialogue
          </button>
          <button
            onClick={() => { setModalType('ac'); setModalOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> Add Sound
          </button>
        </div>
      </div>

      <AddSegmentModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={modalType}
        defaultTime={currentTime}
        onSave={addCaption}
      />
    </div>
  );
}
