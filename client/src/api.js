export async function api(path, { method = 'GET', body, form } = {}) {
  const opt = { method, credentials: 'include', headers: {} };
  if (form) opt.body = form; else if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch('/api' + path, opt);
  const json = await res.json().catch(() => ({ success: false, message: 'Unexpected server response' }));
  if (!res.ok || !json.success) { const e = new Error(json.message || 'Request failed'); e.status = res.status; throw e; }
  return json;
}
