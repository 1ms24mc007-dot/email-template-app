// Mirrors server/src/utils/placeholders.js so previews follow the same rules as sent emails.
const RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
export const extractPlaceholders = (...t) => [...new Set(t.flatMap((x) => [...(x || '').matchAll(RE)].map((m) => m[1])))];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const render = (text, values, html = false) => (text || '').replace(RE, (_, n) => (html ? esc(values[n] ?? '') : String(values[n] ?? '')));
