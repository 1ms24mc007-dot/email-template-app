import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import {
  Badge,
  Empty,
  Field,
  Preview,
  Spinner,
  useToast,
  fmt,
} from "../components/ui";
import RichEditor from "../components/RichEditor";
import { extractPlaceholders, render } from "../utils/placeholders";
export function TemplateList() {
  const [rows, setRows] = useState(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    toast = useToast();
  const load = () =>
    api(`/templates?search=${encodeURIComponent(search)}&status=${status}`)
      .then((r) => setRows(r.data))
      .catch((e) => toast(e.message, "err"));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, status]);
  const del = async (t) => {
    if (
      !window.confirm(
        `Delete “${t.template_name}”? Sent-email records are kept.`,
      )
    )
      return;
    try {
      await api(`/templates/${t.id}`, { method: "DELETE" });
      toast("Template deleted");
      load();
    } catch (e) {
      toast(e.message, "err");
    }
  };
  return (
    <>
      <div className="head">
        <h2>Email templates</h2>
        <Link className="btn" to="/templates/new">
          Create template
        </Link>
      </div>
      <div className="filters">
        <input
          placeholder="Search by name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      {!rows ? (
        <Spinner />
      ) : !rows.length ? (
        <Empty
          title="No templates found"
          text="Create a template to start sending."
        >
          <Link className="btn" to="/templates/new">
            Create template
          </Link>
        </Empty>
      ) : (
        <div className="card tw">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.template_name}</td>
                  <td>
                    <code>{t.template_code}</code>
                  </td>
                  <td>{t.description}</td>
                  <td>{t.subject}</td>
                  <td>
                    <Badge status={t.status} />
                  </td>
                  <td>{fmt(t.created_at)}</td>
                  <td>{fmt(t.updated_at)}</td>
                  <td className="actions">
                    <Link to={`/templates/${t.id}`}>View</Link>
                    <Link to={`/templates/${t.id}/edit`}>Edit</Link>
                    <button className="linkbtn danger" onClick={() => del(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function TemplateView() {
  const { id } = useParams(),
    [t, setT] = useState(null),
    toast = useToast();
  useEffect(() => {
    api(`/templates/${id}`)
      .then((r) => setT(r.data))
      .catch((e) => toast(e.message, "err"));
  }, [id]);
  if (!t) return <Spinner />;
  return (
    <>
      <div className="head">
        <h2>{t.template_name}</h2>
        <Link className="btn" to={`/templates/${t.id}/edit`}>
          Edit
        </Link>
      </div>
      <div className="card">
        <p>
          <code>{t.template_code}</code> <Badge status={t.status} />
        </p>
        <p className="muted">{t.description}</p>
        <p>
          <b>Subject:</b> {t.subject}
        </p>
        <p>
          <b>Placeholders:</b>{" "}
          {t.placeholders.length
            ? t.placeholders.map((p) => (
                <code key={p} className="chip">
                  {p}
                </code>
              ))
            : "None"}
        </p>
      </div>
      <div className="card">
        <h3>Preview (placeholders shown as written)</h3>
        <Preview html={t.html_body} />
      </div>
    </>
  );
}
const blank = {
  templateName: "",
  templateCode: "",
  description: "",
  subject: "",
  htmlBody: "",
  plainTextBody: "",
  status: "draft",
};
export function TemplateForm() {
  const { id } = useParams(),
    nav = useNavigate(),
    toast = useToast(),
    [f, setF] = useState(blank),
    [busy, setBusy] = useState(false),
    [errs, setErrs] = useState([]);
  useEffect(() => {
    if (id)
      api(`/templates/${id}`)
        .then(({ data: t }) =>
          setF({
            templateName: t.template_name,
            templateCode: t.template_code,
            description: t.description,
            subject: t.subject,
            htmlBody: t.html_body,
            plainTextBody: t.plain_text_body,
            status: t.status,
          }),
        )
        .catch((e) => toast(e.message, "err"));
  }, [id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const found = extractPlaceholders(f.subject, f.htmlBody, f.plainTextBody);
  const save = async () => {
    const e = [];
    if (!f.templateName.trim()) e.push("Template name is required");
    if (!f.templateCode.trim()) e.push("Template code is required");
    if (!f.subject.trim()) e.push("Subject is required");
    if (!f.htmlBody.trim()) e.push("HTML body is required");
    setErrs(e);
    if (e.length) return;
    setBusy(true);
    try {
      await api(id ? `/templates/${id}` : "/templates", {
        method: id ? "PUT" : "POST",
        body: f,
      });
      toast(id ? "Template updated" : "Template created");
      nav("/templates");
    } catch (x) {
      setErrs([x.message]);
    }
    setBusy(false);
  };
  return (
    <>
      <div className="head">
        <h2>{id ? "Edit template" : "New template"}</h2>
      </div>
      <div className="split">
        <div className="card">
          <Field label="Template name">
            <input value={f.templateName} onChange={set("templateName")} />
          </Field>
          <Field label="Template code" hint="Unique, e.g. WELCOME_EMAIL">
            <input
              value={f.templateCode}
              onChange={(e) =>
                setF({ ...f, templateCode: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <Field label="Description">
            <input value={f.description} onChange={set("description")} />
          </Field>
          <Field label="Subject">
            <input value={f.subject} onChange={set("subject")} />
          </Field>
          <Field
            label="Email content"
            hint="Format visually; use Insert placeholder to add dynamic values"
          >
            <RichEditor
              initial={f.htmlBody}
              onChange={(h, t) =>
                setF((x) => ({ ...x, htmlBody: h, plainTextBody: t }))
              }
            />
          </Field>
          <Field label="Status">
            <select value={f.status} onChange={set("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
          {errs.map((m) => (
            <p className="error" key={m}>
              {m}
            </p>
          ))}
          <button className="btn" disabled={busy} onClick={save}>
            Save template
          </button>{" "}
          <button className="btn ghost" onClick={() => nav("/templates")}>
            Cancel
          </button>
        </div>
        <div>
          <div className="card">
            <h3>Detected placeholders</h3>
            {found.length ? (
              found.map((p) => (
                <code key={p} className="chip">
                  {p}
                </code>
              ))
            ) : (
              <p className="muted">
                None yet. Type {"{{name}}"} in the subject or body.
              </p>
            )}
          </div>
          <div className="card">
            <h3>Preview</h3>
            <Preview
              html={
                render(
                  f.htmlBody,
                  Object.fromEntries(found.map((p) => [p, `{{${p}}}`])),
                  true,
                ) || '<p style="color:#888">Nothing to preview yet</p>'
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
