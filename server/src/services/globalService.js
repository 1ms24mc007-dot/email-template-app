import { query, pool } from '../config/db.js'; import { AppError } from '../utils/http.js';
const APPROVED_URL = 'https://jsonplaceholder.typicode.com/users'; // only approved source; blocks internal/private targets by design
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,59}$/, PATH_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const id = (v) => Number(v) || 0;
export const getSource = async () => (await query('SELECT * FROM external_sources ORDER BY id LIMIT 1')).rows[0];
async function fetchUsers(src) {
  if (src.api_url !== APPROVED_URL || src.http_method !== 'GET') throw new AppError(400, 'This API source is not approved');
  let res; try { res = await fetch(src.api_url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }); } catch { throw new AppError(502, 'Could not reach the external API'); }
  if (!res.ok) throw new AppError(502, `External API returned status ${res.status}`);
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || !data.length || !data.every((u) => u && Number.isInteger(u.id) && typeof u.name === 'string')) throw new AppError(502, 'External API returned an unexpected format');
  return data;
}
export const testConnection = async () => ({ count: (await fetchUsers(await getSource())).length });
export async function sync() {
  const s = await getSource(); let data;
  try { data = await fetchUsers(s); } catch (e) { await query('UPDATE external_sources SET last_sync_status=$1,updated_at=now() WHERE id=$2', [`Failed: ${e.message}`, s.id]); throw e; } // old data untouched
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const u of data) await c.query(`INSERT INTO external_users (source_id,external_user_id,display_name,email,raw_data) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (source_id,external_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,email=EXCLUDED.email,raw_data=EXCLUDED.raw_data,synced_at=now(),updated_at=now()`, [s.id, u.id, u.name, u.email || null, JSON.stringify(u)]);
    await c.query('UPDATE external_sources SET last_synced_at=now(),last_sync_status=$1,updated_at=now() WHERE id=$2', [`Success: ${data.length} users`, s.id]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  return { count: data.length };
}
export const listUsers = async (search) => (await query(`SELECT external_user_id,display_name,email,raw_data FROM external_users WHERE $1::text IS NULL OR display_name ILIKE $1 OR email ILIKE $1 OR raw_data->>'username' ILIKE $1 ORDER BY external_user_id`, [search ? `%${search}%` : null])).rows;
export async function getUser(uid) { const r = await query('SELECT external_user_id,display_name,email,raw_data FROM external_users WHERE external_user_id=$1', [id(uid)]); if (!r.rowCount) throw new AppError(404, 'User not found'); return r.rows[0]; }
const dig = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const scalar = (x) => (x == null || typeof x === 'object' ? undefined : String(x));
// Mappings (each API mapping owns one 'api' placeholder definition)
export const listMappings = async () => (await query(`SELECT m.id,m.response_path,p.placeholder_key FROM placeholder_mappings m JOIN global_placeholders p ON p.id=m.placeholder_id ORDER BY m.id`)).rows;
function checkMap(b) {
  if (!KEY_RE.test(b.placeholderKey || '')) throw new AppError(400, 'Placeholder name may only contain letters, numbers and underscores');
  if (!PATH_RE.test(b.responsePath || '')) throw new AppError(400, 'Enter a valid response field, for example address.city');
}
const dup = (e) => { if (e.code === '23505') throw new AppError(409, 'That placeholder name already exists'); throw e; };
export async function createMapping(b) {
  checkMap(b); const s = await getSource(), c = await pool.connect();
  try {
    await c.query('BEGIN');
    const p = await c.query("INSERT INTO global_placeholders (placeholder_key,source_type) VALUES ($1,'api') RETURNING id", [b.placeholderKey]);
    await c.query('INSERT INTO placeholder_mappings (source_id,placeholder_id,response_path) VALUES ($1,$2,$3)', [s.id, p.rows[0].id, b.responsePath]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); dup(e); } finally { c.release(); }
}
export async function updateMapping(mid, b) {
  checkMap(b);
  try {
    const r = await query('UPDATE global_placeholders p SET placeholder_key=$1,updated_at=now() FROM placeholder_mappings m WHERE m.placeholder_id=p.id AND m.id=$2', [b.placeholderKey, id(mid)]);
    if (!r.rowCount) throw new AppError(404, 'Mapping not found');
    await query('UPDATE placeholder_mappings SET response_path=$1,updated_at=now() WHERE id=$2', [b.responsePath, id(mid)]);
  } catch (e) { dup(e); }
}
export async function deleteMapping(mid) { if (!(await query('DELETE FROM global_placeholders WHERE id=(SELECT placeholder_id FROM placeholder_mappings WHERE id=$1)', [id(mid)])).rowCount) throw new AppError(404, 'Mapping not found'); }
export async function previewMappings(uid) { const u = await getUser(uid); return (await listMappings()).map((m) => ({ placeholder: m.placeholder_key, path: m.response_path, value: scalar(dig(u.raw_data, m.response_path)) ?? null })); }
// Manual placeholders
export const listPlaceholders = async () => (await query(`SELECT p.id,p.placeholder_key,p.description,p.source_type,p.placeholder_value,m.response_path FROM global_placeholders p LEFT JOIN placeholder_mappings m ON m.placeholder_id=p.id ORDER BY p.placeholder_key`)).rows;
function checkManual(b) { if (!KEY_RE.test(b.placeholderKey || '')) throw new AppError(400, 'Placeholder name may only contain letters, numbers and underscores'); if (!String(b.placeholderValue ?? '').trim()) throw new AppError(400, 'Value is required'); }
export async function createManual(b) { checkManual(b); try { return (await query("INSERT INTO global_placeholders (placeholder_key,description,source_type,placeholder_value) VALUES ($1,$2,'manual',$3) RETURNING *", [b.placeholderKey, b.description || '', b.placeholderValue])).rows[0]; } catch (e) { dup(e); } }
export async function updateManual(pid, b) { checkManual(b); try { const r = await query("UPDATE global_placeholders SET placeholder_key=$1,description=$2,placeholder_value=$3,updated_at=now() WHERE id=$4 AND source_type='manual' RETURNING *", [b.placeholderKey, b.description || '', b.placeholderValue, id(pid)]); if (!r.rowCount) throw new AppError(404, 'Manual placeholder not found'); return r.rows[0]; } catch (e) { dup(e); } }
export async function deleteManual(pid) { if (!(await query("DELETE FROM global_placeholders WHERE id=$1 AND source_type='manual'", [id(pid)])).rowCount) throw new AppError(404, 'Manual placeholder not found'); }
// One resolver for preview and sending. Global values always win over recipient input.
export async function resolve(names, userId, recipient = {}) {
  const defs = (await query(`SELECT p.placeholder_key k,p.source_type t,p.placeholder_value v,m.response_path path FROM global_placeholders p LEFT JOIN placeholder_mappings m ON m.placeholder_id=p.id WHERE p.placeholder_key=ANY($1)`, [names])).rows;
  const raw = userId ? (await query('SELECT raw_data FROM external_users WHERE external_user_id=$1', [id(userId)])).rows[0]?.raw_data : null;
  const values = {}, categories = {}, missing = [];
  for (const n of names) {
    const d = defs.find((x) => x.k === n); let v;
    if (d?.t === 'manual') { categories[n] = 'manual'; v = d.v; }
    else if (d) { categories[n] = 'api'; v = raw ? scalar(dig(raw, d.path)) : undefined; }
    else { categories[n] = 'recipient'; v = recipient[n]; }
    if (v == null || !String(v).trim()) missing.push(n); else values[n] = String(v);
  }
  return { values, categories, missing };
}
