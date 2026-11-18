import { query } from '../config/db.js'; import { AppError } from '../utils/http.js'; import { cleanHtml } from '../utils/sanitize.js'; import { extractPlaceholders } from '../utils/placeholders.js';
export function validateTemplate(b) {
  const errs = [];
  if (!b.templateName?.trim()) errs.push('Template name is required');
  if (!/^[A-Z0-9_]{2,80}$/.test(String(b.templateCode || '').trim().toUpperCase())) errs.push('Template code is required (letters, numbers, underscores)');
  if (!b.subject?.trim()) errs.push('Subject is required');
  if (!b.htmlBody?.trim()) errs.push('HTML body is required');
  if (!['draft', 'published'].includes(b.status)) errs.push('Status must be draft or published');
  if (errs.length) throw new AppError(400, errs[0], errs);
}
// Placeholders are always derived from content, so content stays the single source of truth.
const cols = (b) => [b.templateName.trim(), b.templateCode.trim().toUpperCase(), (b.description || '').trim(), b.subject.trim(), cleanHtml(b.htmlBody), b.plainTextBody || '',
  JSON.stringify(extractPlaceholders(b.subject, cleanHtml(b.htmlBody), b.plainTextBody)), b.status];
export async function list({ search, status }) {
  const r = await query(`SELECT * FROM email_templates WHERE ($1::text IS NULL OR template_name ILIKE $1 OR template_code ILIKE $1)
    AND ($2::text IS NULL OR status=$2) ORDER BY updated_at DESC`, [search ? `%${search}%` : null, ['draft', 'published'].includes(status) ? status : null]);
  return r.rows;
}
export async function get(id) { const r = await query('SELECT * FROM email_templates WHERE id=$1', [Number(id) || 0]); if (!r.rowCount) throw new AppError(404, 'Template not found'); return r.rows[0]; }
export async function create(b) {
  validateTemplate(b);
  try { return (await query(`INSERT INTO email_templates (template_name,template_code,description,subject,html_body,plain_text_body,placeholders,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, cols(b))).rows[0]; }
  catch (e) { if (e.code === '23505') throw new AppError(409, 'Template code already exists'); throw e; }
}
export async function update(id, b) {
  validateTemplate(b);
  try {
    const r = await query(`UPDATE email_templates SET template_name=$1,template_code=$2,description=$3,subject=$4,html_body=$5,plain_text_body=$6,placeholders=$7,status=$8,updated_at=now() WHERE id=$9 RETURNING *`, [...cols(b), Number(id) || 0]);
    if (!r.rowCount) throw new AppError(404, 'Template not found'); return r.rows[0];
  } catch (e) { if (e.code === '23505') throw new AppError(409, 'Template code already exists'); throw e; }
}
export async function remove(id) { const r = await query('DELETE FROM email_templates WHERE id=$1', [Number(id) || 0]); if (!r.rowCount) throw new AppError(404, 'Template not found'); }
