import { useEffect, useState } from 'react'; import { api } from '../api'; import { Badge, Empty, Field, Spinner, useToast, fmt } from '../components/ui';
const dig = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const flat = (o, p = '') => Object.entries(o || {}).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [p + k]));
export default function GlobalPlaceholders() {
  const toast = useToast(), [src, setSrc] = useState(null), [users, setUsers] = useState(null), [q, setQ] = useState(''), [sel, setSel] = useState(null), [maps, setMaps] = useState([]), [defs, setDefs] = useState([]), [busy, setBusy] = useState(false);
  const [mf, setMf] = useState({ id: null, path: '', key: '' }), [pf, setPf] = useState({ id: null, key: '', value: '', description: '' });
  const run = async (fn, okMsg) => { setBusy(true); try { const r = await fn(); toast(okMsg || r?.message || 'Done'); return true; } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); } };
  const loadUsers = () => api(`/global/users?search=${encodeURIComponent(q)}`).then((r) => { setUsers(r.data); setSel((s) => r.data.find((u) => u.external_user_id === s?.external_user_id) || r.data[0] || null); }).catch((e) => toast(e.message, 'err'));
  const loadAll = () => Promise.all([api('/global/source').then((r) => setSrc(r.data)), api('/global/mappings').then((r) => setMaps(r.data)), api('/global/placeholders').then((r) => setDefs(r.data))]).catch((e) => toast(e.message, 'err'));
  useEffect(() => { loadAll(); }, []); useEffect(() => { const t = setTimeout(loadUsers, 250); return () => clearTimeout(t); }, [q]);
  const sync = async () => { await run(() => api('/global/source/sync', { method: 'POST' })); loadAll(); loadUsers(); };
  const saveMap = async () => { if (await run(() => api(mf.id ? `/global/mappings/${mf.id}` : '/global/mappings', { method: mf.id ? 'PUT' : 'POST', body: { responsePath: mf.path, placeholderKey: mf.key } }), 'Mapping saved')) { setMf({ id: null, path: '', key: '' }); loadAll(); } };
  const savePh = async () => { if (await run(() => api(pf.id ? `/global/placeholders/${pf.id}` : '/global/placeholders', { method: pf.id ? 'PUT' : 'POST', body: { placeholderKey: pf.key, placeholderValue: pf.value, description: pf.description } }), 'Placeholder saved')) { setPf({ id: null, key: '', value: '', description: '' }); loadAll(); } };
  const del = async (url, what) => { if (window.confirm(`Delete this ${what}?`) && await run(() => api(url, { method: 'DELETE' }))) loadAll(); };
  if (!src) return <Spinner />;
  return <><div className="head"><h2>Global placeholders</h2></div>
    <div className="card"><h3>External API connection</h3>
      <p><b>{src.source_name}</b> · {src.http_method} <code>{src.api_url}</code></p>
      <p>Status: <Badge status={src.last_sync_status?.startsWith('Failed') ? 'failed' : src.last_synced_at ? 'published' : 'draft'} /> {src.last_sync_status || 'Never synchronized'}</p>
      <p className="muted small">Last successful sync: {src.last_synced_at ? fmt(src.last_synced_at) : 'never'}. Sample users have fake emails and are never used as recipients.</p>
      <button className="btn ghost" disabled={busy} onClick={() => run(() => api('/global/source/test', { method: 'POST' }))}>Test connection</button> <button className="btn" disabled={busy} onClick={sync}>Fetch data / sync</button> <button className="btn ghost" disabled={busy} onClick={sync}>Refresh data</button></div>
    <div className="split"><div className="card"><h3>Fetched users</h3><input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
      {!users ? <Spinner /> : !users.length ? <Empty title="No users" text="Click Fetch data / sync to load them." /> : <div className="tw"><table><thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Email</th><th>City</th><th>Company</th><th></th></tr></thead><tbody>
        {users.map((u) => <tr key={u.external_user_id} className={sel?.external_user_id === u.external_user_id ? 'sel' : ''}><td>{u.external_user_id}</td><td>{u.display_name}</td><td>{u.raw_data.username}</td><td>{u.email}</td><td>{u.raw_data.address?.city}</td><td>{u.raw_data.company?.name}</td><td><button className="linkbtn" onClick={() => setSel(u)}>View</button></td></tr>)}</tbody></table></div>}</div>
      <div className="card"><h3>API response{sel ? ` · ${sel.display_name}` : ''}</h3>{sel ? <pre className="json">{JSON.stringify(sel.raw_data, null, 2)}</pre> : <p className="muted">Select a user.</p>}</div></div>
    <div className="card"><h3>API field mapping</h3>
      <div className="row"><Field label="API response field"><input list="paths" placeholder="address.city" value={mf.path} onChange={(e) => setMf({ ...mf, path: e.target.value })} /></Field><datalist id="paths">{flat(sel?.raw_data).map((p) => <option key={p} value={p} />)}</datalist>
        <Field label="Placeholder name"><input placeholder="userCity" value={mf.key} onChange={(e) => setMf({ ...mf, key: e.target.value })} /></Field></div>
      <button className="btn" disabled={busy} onClick={saveMap}>{mf.id ? 'Save mapping' : 'Add mapping'}</button> {mf.id && <button className="btn ghost" onClick={() => setMf({ id: null, path: '', key: '' })}>Cancel</button>}
      {!maps.length ? <Empty title="No mappings yet" text="Map an API field to a placeholder name." /> : <div className="tw"><table><thead><tr><th>API field</th><th>Placeholder</th><th>Value for selected user</th><th></th></tr></thead><tbody>
        {maps.map((m) => { const v = sel ? dig(sel.raw_data, m.response_path) : undefined; return <tr key={m.id}><td><code>{m.response_path}</code></td><td><code>{`{{${m.placeholder_key}}}`}</code></td><td>{v == null || typeof v === 'object' ? <span className="muted">no value</span> : String(v)}</td>
          <td className="actions"><button className="linkbtn" onClick={() => setMf({ id: m.id, path: m.response_path, key: m.placeholder_key })}>Edit</button><button className="linkbtn danger" onClick={() => del(`/global/mappings/${m.id}`, 'mapping')}>Delete</button></td></tr>; })}</tbody></table></div>}</div>
    <div className="card"><h3>Global placeholders</h3>
      <div className="row"><Field label="Name"><input value={pf.key} onChange={(e) => setPf({ ...pf, key: e.target.value })} /></Field><Field label="Value"><input value={pf.value} onChange={(e) => setPf({ ...pf, value: e.target.value })} /></Field><Field label="Description"><input value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} /></Field></div>
      <button className="btn" disabled={busy} onClick={savePh}>{pf.id ? 'Save placeholder' : 'Add manual placeholder'}</button> {pf.id && <button className="btn ghost" onClick={() => setPf({ id: null, key: '', value: '', description: '' })}>Cancel</button>}
      {!defs.length ? <Empty title="No placeholders" text="Add a manual placeholder or an API mapping." /> : <div className="tw"><table><thead><tr><th>Placeholder</th><th>Value</th><th>Source</th><th></th></tr></thead><tbody>
        {defs.map((d) => <tr key={d.id}><td><code>{`{{${d.placeholder_key}}}`}</code></td><td>{d.source_type === 'manual' ? d.placeholder_value : <span className="muted">from {d.response_path} of selected user</span>}</td><td><span className={`badge ${d.source_type === 'manual' ? 'draft' : 'published'}`}>{d.source_type === 'manual' ? 'Manual' : 'API'}</span></td>
          <td className="actions">{d.source_type === 'manual' && <><button className="linkbtn" onClick={() => setPf({ id: d.id, key: d.placeholder_key, value: d.placeholder_value, description: d.description })}>Edit</button><button className="linkbtn danger" onClick={() => del(`/global/placeholders/${d.id}`, 'placeholder')}>Delete</button></>}</td></tr>)}</tbody></table></div>}</div></>;
}
