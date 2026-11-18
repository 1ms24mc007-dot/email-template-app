import { createContext, useContext, useState, useCallback } from 'react';
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((message, type = 'ok') => { setT({ message, type }); setTimeout(() => setT(null), 4500); }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={`toast ${t.type}`} role="status">{t.message}</div>}</ToastCtx.Provider>;
}
export const Field = ({ label, children, hint }) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Spinner = () => <div className="spinner" aria-label="Loading" />;
export const Empty = ({ title, text, children }) => <div className="empty"><h3>{title}</h3><p>{text}</p>{children}</div>;
export const Badge = ({ status }) => <span className={`badge ${status}`}>{{ sent: 'SMTP accepted', partially_failed: 'Partially failed', failed: 'Failed', processing: 'Processing', draft: 'Draft', published: 'Published' }[status] || status}</span>;
export const Preview = ({ html }) => <iframe className="preview" title="Email preview" sandbox="" srcDoc={html} />;
export const fmt = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
    .format(d)
    .replaceAll("/", "-");
};