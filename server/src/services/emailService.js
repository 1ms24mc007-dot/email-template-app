import path from 'path';
import { query } from '../config/db.js'; import { AppError, isEmail } from '../utils/http.js';
import { render } from '../utils/placeholders.js'; import { resolve } from './globalService.js'; import { cleanHtml } from '../utils/sanitize.js'; import { get as getTemplate } from './templateService.js'; import { sendMail, friendlySmtpError } from './mail.js';
const parseList = (v) => String(v || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
const parseValues = (v) => { try { const o = typeof v === 'string' ? JSON.parse(v || '{}') : v || {}; return o && typeof o === 'object' ? o : {}; } catch { throw new AppError(400, 'Placeholder values are not valid JSON'); } };
const safeName = (n) => path.basename(n).replace(/[^\w.\-]/g, '_').slice(0, 100);
export async function previewEmail(body) {
  const t = await getTemplate(body.templateId), r = await resolve(t.placeholders, body.userId, parseValues(body.values));
  return { ...r, subject: render(t.subject, r.values), html: render(cleanHtml(t.html_body), r.values, { html: true }), text: render(t.plain_text_body, r.values) };
}
export async function sendEmail(body, files, isTest) {
  const t = await getTemplate(body.templateId);
  const errs = [];
  if (!isTest && t.status !== 'published') errs.push('Only Published templates can be used to send emails');
  const to = parseList(isTest ? body.testTo : body.to), cc = isTest ? [] : parseList(body.cc), bcc = isTest ? [] : parseList(body.bcc);
  if (!to.length) errs.push(isTest ? 'A test recipient is required' : 'At least one To recipient is required');
  [...to, ...cc, ...bcc].filter((e) => !isEmail(e)).forEach((e) => errs.push(`Invalid email address: ${e}`));
  const { values, missing } = await resolve(t.placeholders, body.userId, parseValues(body.values));
  if (missing.length) errs.push(`Missing values for: ${missing.join(', ')}`);
  if (errs.length) throw new AppError(400, errs[0], errs);
  const subject = render(t.subject, values).replace(/[\r\n]+/g, ' ');
  const log = (await query(`INSERT INTO email_logs (template_id,template_name,template_code,recipient_to,recipient_cc,recipient_bcc,subject,is_test)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [t.id, t.template_name, t.template_code, JSON.stringify(to), JSON.stringify(cc), JSON.stringify(bcc), subject, isTest])).rows[0].id;
  const finish = (status, messageId, error) => query('UPDATE email_logs SET status=$1,message_id=$2,error_message=$3,completed_at=now() WHERE id=$4', [status, messageId, error, log]);
  try {
    const info = await sendMail({ to, cc, bcc, subject, html: render(cleanHtml(t.html_body), values, { html: true }), text: render(t.plain_text_body, values) || undefined,
      attachments: files.map((f) => ({ filename: safeName(f.originalname), content: f.buffer, contentType: f.mimetype })) });
    const rejected = info.rejected || [];
    const status = !info.accepted?.length ? 'failed' : rejected.length ? 'partially_failed' : 'sent';
    await finish(status, info.messageId, rejected.length ? `Rejected recipients: ${rejected.join(', ')}` : null);
    if (status === 'failed') throw new AppError(502, 'The SMTP server did not accept any recipient');
    return { logId: log, status, rejected };
  } catch (e) {
    if (e instanceof AppError) throw e;
    const msg = friendlySmtpError(e); await finish('failed', null, msg); throw new AppError(502, msg);
  }
}
