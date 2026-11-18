import { useEffect, useState } from 'react'; import { api } from '../api'; import { Empty, Field, Preview, Spinner, useToast } from '../components/ui';
const OK = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], MAX = 5, MAX_MB = 5;
const splitList = (s) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const valid = (e) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e);
export default function Compose() {
  const toast = useToast(), [tpls, setTpls] = useState(null), [users, setUsers] = useState([]), [tid, setTid] = useState(''), [uid, setUid] = useState(''), [uq, setUq] = useState('');
  const [r, setR] = useState({ to: '', cc: '', bcc: '', testTo: '' }), [vals, setVals] = useState({}), [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [prev, setPrev] = useState(null);
  useEffect(() => { api('/templates?status=published').then((x) => setTpls(x.data)).catch((e) => toast(e.message, 'err')); api('/global/users').then((x) => setUsers(x.data)).catch(() => {}); }, []);
  const t = tpls?.find((x) => String(x.id) === tid);
  // The server resolves placeholders; preview and sending use the same code path.
  useEffect(() => { if (!t) return setPrev(null); const h = setTimeout(() => api('/emails/preview', { method: 'POST', body: { templateId: t.id, userId: uid || null, values: vals } }).then((x) => setPrev(x.data)).catch((e) => toast(e.message, 'err')), 300); return () => clearTimeout(h); }, [tid, uid, vals]);
  const cat = (c) => Object.keys(prev?.categories || {}).filter((k) => prev.categories[k] === c);
  const shownUsers = users.filter((u) => `${u.display_name} ${u.email}`.toLowerCase().includes(uq.toLowerCase()));
  const addFiles = (list) => { const next = [...files]; for (const f of list) { if (!OK.includes(f.type)) { toast(`${f.name}: only JPG, PNG, GIF or WebP images`, 'err'); continue; } if (f.size > MAX_MB * 1048576) { toast(`${f.name} is over ${MAX_MB} MB`, 'err'); continue; } if (next.length >= MAX) { toast(`Maximum ${MAX} images`, 'err'); break; } next.push(f); } setFiles(next); };
  const check = (test) => {
    if (!t || !prev) return 'Select a published template';
    if (test ? !r.testTo.trim() : !splitList(r.to).length) return test ? 'Enter a test recipient' : 'Add at least one To recipient';
    const bad = (test ? [r.testTo.trim()] : [...splitList(r.to), ...splitList(r.cc), ...splitList(r.bcc)]).filter((a) => !valid(a)); if (bad.length) return `Invalid email address: ${bad.join(', ')}`;
    if (prev.missing.length) return `Missing values for: ${prev.missing.join(', ')}`;
  };
  const send = async (test) => {
    const problem = check(test); if (problem) return toast(problem, 'err');
    const fd = new FormData(); fd.append('templateId', t.id); fd.append('values', JSON.stringify(vals)); if (uid) fd.append('userId', uid);
    if (test) fd.append('testTo', r.testTo); else { fd.append('to', r.to); fd.append('cc', r.cc); fd.append('bcc', r.bcc); }
    files.forEach((f) => fd.append('attachments', f)); setBusy(true);
    try { const res = await api(test ? '/emails/test' : '/emails/send', { method: 'POST', form: fd }); toast(res.message + (res.data.rejected?.length ? ` (rejected: ${res.data.rejected.join(', ')})` : '')); } catch (e) { toast(e.message, 'err'); } setBusy(false);
  };
  if (!tpls) return <Spinner />; if (!tpls.length) return <Empty title="No published templates" text="Publish a template before composing an email." />;
  return <><div className="head"><h2>Compose & send</h2></div>
    <div className="split"><div className="card">
      <Field label="Template"><select value={tid} onChange={(e) => { setTid(e.target.value); setVals({}); }}><option value="">Select a published template</option>{tpls.map((x) => <option key={x.id} value={x.id}>{x.template_name} ({x.template_code})</option>)}</select></Field>
      {cat('api').length > 0 && <Field label="Data source user" hint="Supplies API placeholders only. It is not the recipient."><input placeholder="Search users" value={uq} onChange={(e) => setUq(e.target.value)} /><select value={uid} onChange={(e) => setUid(e.target.value)}><option value="">Select a user</option>{shownUsers.map((u) => <option key={u.external_user_id} value={u.external_user_id}>{u.display_name} ({u.raw_data.username})</option>)}</select></Field>}
      <Field label="To" hint="Separate several addresses with commas"><input value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></Field>
      <Field label="CC"><input value={r.cc} onChange={(e) => setR({ ...r, cc: e.target.value })} /></Field><Field label="BCC"><input value={r.bcc} onChange={(e) => setR({ ...r, bcc: e.target.value })} /></Field>
      {cat('recipient').map((p) => <Field key={p} label={p}><input value={vals[p] || ''} onChange={(e) => setVals({ ...vals, [p]: e.target.value })} /></Field>)}
      {prev && [...cat('api'), ...cat('manual')].length > 0 && <div className="resolved"><b>Resolved values</b>{[...cat('api'), ...cat('manual')].map((k) => <div key={k}><code>{k}</code> {prev.values[k] ?? <span className="error">missing{prev.categories[k] === 'api' ? ' (select a user / check mapping)' : ''}</span>}</div>)}</div>}
      <Field label={`Images (JPG, PNG, GIF, WebP; up to ${MAX}, ${MAX_MB} MB each)`}><input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} /></Field>
      {files.map((f, i) => <div className="file" key={f.name + i}>{f.name}<button className="linkbtn danger" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button></div>)}
      <button className="btn" disabled={busy} onClick={() => send(false)}>Send email</button><hr />
      <Field label="Test recipient" hint="Test sends are not counted on the dashboard"><input value={r.testTo} onChange={(e) => setR({ ...r, testTo: e.target.value })} /></Field><button className="btn ghost" disabled={busy} onClick={() => send(true)}>Send test email</button></div>
    <div className="card"><h3>Preview</h3>{prev ? <><p><b>Subject:</b> {prev.subject}</p><Preview html={prev.html} /></> : <p className="muted">Select a template to see the populated email.</p>}</div></div></>;
}
