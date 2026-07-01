import React, { createContext, useContext, useState, useCallback } from 'react';
import { generateId } from '../utils/timeUtils.js';

const CaptionContext = createContext(null);

export function CaptionProvider({ children, initialCaptions = [] }) {
  const [captions, setCaptions] = useState(initialCaptions);

  const updateCaption = useCallback((id, updates) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCaption = useCallback((id) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
  }, []);

  const addCaption = useCallback((type, startVal = null, endVal = null, textVal = null) => {
    const sorted = [...captions].sort((a, b) => a.start - b.start);
    let start = startVal !== null ? startVal : 0;
    let end = endVal !== null ? endVal : start + 3;
    let text = textVal !== null ? textVal : (type === 'ac' ? '[audio description]' : 'New caption text');

    if (startVal === null && sorted.length > 0) {
      start = sorted[sorted.length - 1].end + 0.5;
      end = start + 3;
    }

    const newCaption = {
      id: generateId(type),
      type,
      start,
      end,
      text
    };

    setCaptions(prev => [...prev, newCaption]);
    return newCaption.id;
  }, [captions]);

  return (
    <CaptionContext.Provider value={{ captions, setCaptions, updateCaption, deleteCaption, addCaption }}>
      {children}
    </CaptionContext.Provider>
  );
}

export function useCaptions() {
  const ctx = useContext(CaptionContext);
  if (!ctx) throw new Error('useCaptions must be used inside <CaptionProvider>');
  return ctx;
}
