import { parseTimestamp, formatTimestamp, generateId } from './timeUtils.js';

/**
 * Parse SRT text into caption objects
 */
export function parseSRT(srtText) {
  if (!srtText?.trim()) return [];
  const blocks = srtText.trim().split(/\n\s*\n+/);
  const captions = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Find the timestamp line
    let tsLine = '', textStart = 2;
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (lines[i].includes('-->')) {
        tsLine = lines[i]; textStart = i + 1; break;
      }
    }
    if (!tsLine) continue;

    const match = tsLine.match(
      /(\d{1,2}:\d{2}:\d{2}[,.:]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.:]\d{2,3})/
    );
    if (!match) continue;

    const start = parseTimestamp(match[1]);
    const end   = parseTimestamp(match[2]);
    const text  = lines.slice(textStart).join('\n').trim();
    if (!text || end <= start) continue;

    const isAC = /^\[.+\]$/.test(text);
    captions.push({ id: generateId(isAC ? 'ac' : 'cc'), type: isAC ? 'ac' : 'cc', start, end, text });
  }

  return captions.sort((a, b) => a.start - b.start);
}

/**
 * Serialize caption objects to SRT text
 */
export function serializeSRT(captions) {
  if (!captions?.length) return '';
  const content = [...captions]
    .sort((a, b) => a.start - b.start)
    .map((c, i) => `${i + 1}\r\n${formatTimestamp(c.start).replace('.', ',')} --> ${formatTimestamp(c.end).replace('.', ',')}\r\n${c.text}`)
    .join('\r\n\r\n');
  
  return '\uFEFF' + content; // Add UTF-8 BOM
}
