import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { formatDisplay } from '../../utils/timeUtils.js';

const TRACK_H = 28;
const RULER_H = 22;

function buildTicks(duration) {
  if (!duration || duration <= 0) return [];
  const step = duration <= 60 ? 5 : duration <= 300 ? 30 : 60;
  const ticks = [];
  for (let t = 0; t <= duration; t += step) ticks.push(t);
  return ticks;
}

export default function Timeline({ captions, currentTime, duration, seekTo, activeCaptionId }) {
  const containerRef = useRef(null);
  const safeD = duration > 0 ? duration : 1;

  const pct = (t) => `${Math.max(0, Math.min(100, (t / safeD) * 100))}%`;
  const width = (s, e) => `${Math.max(0.3, Math.min(100, ((e - s) / safeD) * 100))}%`;

  // Scroll playhead into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !duration) return;
    const scrollWidth = el.scrollWidth;
    const containerWidth = el.clientWidth;
    if (scrollWidth <= containerWidth) return;
    const target = (currentTime / duration) * scrollWidth - containerWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [currentTime, duration]);

  const onTrackClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPct = (e.clientX - rect.left) / rect.width;
    seekTo(clickPct * duration);
  }, [duration, seekTo]);

  const ccCaps = captions.filter(c => c.type === 'cc');
  const adCaps = captions.filter(c => c.type === 'ac'); // Data type remains 'ac' for backward compatibility
  const ticks  = buildTicks(duration);

  const minWidth = Math.max(800, (duration / 60) * 400);

  // Calculate silent gaps for rendering
  const silentGaps = useMemo(() => {
    let segments = ccCaps.map(c => ({ start: c.start, end: c.end })).sort((a, b) => a.start - b.start);
    let result = [];
    let currentEnd = 0;
    for (let seg of segments) {
      if (seg.start - currentEnd >= 2) {
        result.push({ start: currentEnd, end: seg.start });
      }
      currentEnd = Math.max(currentEnd, seg.end);
    }
    if (safeD - currentEnd >= 2) {
      result.push({ start: currentEnd, end: safeD });
    }
    return result;
  }, [ccCaps, safeD]);

  return (
    <div className="bg-studio-800 border-t border-slate-800 select-none">
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-grotesk font-medium uppercase tracking-widest">Timeline</span>
        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-inter">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-sky-500" />CC · {ccCaps.length}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />AD · {adCaps.length}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-slate-700/50 border border-slate-600" />Silent Gap</span>
        </div>
      </div>

      {/* Scrollable track area */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden pb-2 px-4">
        <div style={{ minWidth, position: 'relative' }}>

          {/* Time Ruler */}
          <div
            className="relative cursor-pointer"
            style={{ height: RULER_H }}
            onClick={onTrackClick}
            role="slider"
            aria-label="Timeline seek"
            aria-valuenow={Math.round(currentTime)}
          >
            {ticks.map(t => (
              <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: pct(t), transform: 'translateX(-50%)' }}>
                <div className="w-px h-2 bg-slate-700" />
                <span className="text-[9px] text-slate-600 font-mono mt-0.5 whitespace-nowrap">
                  {formatDisplay(t)}
                </span>
              </div>
            ))}
          </div>

          {/* CC Track */}
          <div
            className="relative rounded-md overflow-hidden mb-1.5 cursor-pointer"
            style={{ height: TRACK_H, background: '#0f1420' }}
            onClick={onTrackClick}
          >
            <div className="absolute inset-y-0 left-0 flex items-center z-10">
              <span className="text-[9px] text-sky-400/60 font-mono bg-studio-800 px-1">CC</span>
            </div>
            {ccCaps.map(cap => (
              <div
                key={cap.id}
                className={`timeline-block-cc absolute inset-y-1 ${activeCaptionId === cap.id ? 'active' : ''}`}
                style={{ left: pct(cap.start), width: width(cap.start, cap.end) }}
                title={cap.text}
              />
            ))}
          </div>

          {/* AD Track with Silent Gaps */}
          <div
            className="relative rounded-md overflow-hidden cursor-pointer"
            style={{ height: TRACK_H, background: '#0f1420' }}
            onClick={onTrackClick}
          >
            <div className="absolute inset-y-0 left-0 flex items-center z-20">
              <span className="text-[9px] text-emerald-400/60 font-mono bg-studio-800 px-1">AD</span>
            </div>
            
            {/* Render Silent Gaps */}
            {silentGaps.map((gap, i) => (
              <div
                key={`gap-${i}`}
                className="absolute inset-y-0 bg-slate-700/30 border-l border-r border-slate-600/30"
                style={{ left: pct(gap.start), width: width(gap.start, gap.end) }}
                title="Silent Gap (Available for AD)"
              />
            ))}

            {/* Render AD Blocks */}
            {adCaps.map(cap => (
              <div
                key={cap.id}
                className={`timeline-block-ac absolute inset-y-1 z-10 ${activeCaptionId === cap.id ? 'active' : ''}`}
                style={{ left: pct(cap.start), width: width(cap.start, cap.end), background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', border: '1px solid #34d399' }}
                title={cap.text || cap.description}
              />
            ))}
          </div>

          {/* Playhead */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30"
              style={{ left: pct(currentTime) }}
            >
              <div className="absolute top-0 w-px h-full bg-amber-400 opacity-80" />
              <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
