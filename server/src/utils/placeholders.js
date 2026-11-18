// Single place that defines placeholder syntax: {{name}} (letters, digits, underscore). No expressions.
const RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
export const extractPlaceholders = (...texts) => [...new Set(texts.flatMap((t) => [...(t || '').matchAll(RE)].map((m) => m[1])))];
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const render = (text, values, { html = false } = {}) =>
  (text || '').replace(RE, (_, n) => { const v = String(values[n] ?? ''); return html ? escapeHtml(v) : v; });
export const findMissing = (names, values) => names.filter((n) => !String(values[n] ?? '').trim());
