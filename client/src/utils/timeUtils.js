/**
 * Parse "HH:MM:SS,mmm" or "HH:MM:SS.mmm" to seconds (float)
 */
export function parseTimestamp(str) {
  if (!str || typeof str !== 'string') return 0;
  const normalized = str.trim().replace(',', '.');
  const parts = normalized.split(':');
  
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) {
    h = parseFloat(parts[0]) || 0;
    m = parseFloat(parts[1]) || 0;
    s = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    m = parseFloat(parts[0]) || 0;
    s = parseFloat(parts[1]) || 0;
  } else if (parts.length === 1) {
    s = parseFloat(parts[0]) || 0;
  }
  
  return h * 3600 + m * 60 + s;
}

/**
 * Format seconds to SRT timestamp "HH:MM:SS,mmm"
 */
export function formatTimestamp(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${p2(h)}:${p2(m)}:${p2(s)},${p3(ms)}`;
}

/**
 * Format seconds to human-readable "M:SS" or "H:MM:SS"
 */
export function formatDisplay(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${p2(m)}:${p2(s)}`;
  return `${m}:${p2(s)}`;
}

/**
 * Generate a unique caption ID
 */
export function generateId(prefix = 'cap') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const p2 = n => String(Math.floor(n)).padStart(2, '0');
const p3 = n => String(Math.floor(n)).padStart(3, '0');
