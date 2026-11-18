import { useEffect, useState } from 'react'; import { api } from '../api'; import { Badge, Empty, Spinner, fmt } from '../components/ui';
export default function Dashboard() {
  const [days, setDays] = useState(7), [s, setS] = useState(null), [a, setA] = useState(null), [err, setErr] = useState('');
  useEffect(() => { setErr(''); Promise.all([api(`/dashboard/summary?days=${days}`), api(`/dashboard/activity?days=${days}`)]).then(([x, y]) => { setS(x.data); setA(y.data); }).catch((e) => setErr(e.message)); }, [days]);
  if (err) return <p className="error">{err}</p>; if (!s || !a) return <Spinner />;
  const max = Math.max(1, ...a.volume.map((d) => d.successful + d.failed));
  const cards = [['Total email attempts', s.total], ['SMTP-accepted', s.successful], ['Failed', s.failed], ['Success rate', `${s.successPercentage}%`]];
  return <>
    <div className="head"><h2>Dashboard</h2><div className="seg">{[7, 30].map((d) => <button key={d} className={d === days ? 'on' : ''} onClick={() => setDays(d)}>Last {d} days</button>)}</div></div>
    <div className="stats">{cards.map(([l, v]) => <div className="card stat" key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
    <p className="muted small">Test emails are excluded. “SMTP-accepted” means the mail server took the message; it does not confirm inbox delivery.</p>
    <div className="card"><h3>Email volume</h3><div className="chart">{a.volume.map((d) => <div key={d.day} className="col" title={`${d.day}: ${d.successful} accepted, ${d.failed} failed`}>
      <div className="bars"><i className="f" style={{ height: `${(d.failed / max) * 100}%` }} /><i className="s" style={{ height: `${(d.successful / max) * 100}%` }} /></div>
      <small>{d.day.slice(5)}</small></div>)}</div><p className="legend"><i className="s" /> Accepted <i className="f" /> Failed</p></div>
    <div className="card"><h3>Recent activity</h3>{a.recent.length ? <div className="tw"><table><thead><tr><th>Recipient</th><th>Subject</th><th>Template</th><th>Date</th><th>Status</th></tr></thead><tbody>
      {a.recent.map((r) => <tr key={r.id}><td>{r.recipient_to.join(', ')}</td><td>{r.subject}</td><td>{r.template_name}</td><td>{fmt(r.created_at)}</td><td><Badge status={r.status} /></td></tr>)}</tbody></table></div> : <Empty title="No emails yet" text="Sent emails will appear here." />}</div>
    <div className="card"><h3>Recent failures</h3>{a.failures.length ? <div className="tw"><table><thead><tr><th>Recipient</th><th>Subject</th><th>Template</th><th>Error</th><th>Date</th></tr></thead><tbody>
      {a.failures.map((r) => <tr key={r.id}><td>{r.recipient_to.join(', ')}</td><td>{r.subject}</td><td>{r.template_name}</td><td className="error">{r.error_message}</td><td>{fmt(r.created_at)}</td></tr>)}</tbody></table></div> : <Empty title="No failures" text="Failed sends will be listed here." />}</div></>;
}
