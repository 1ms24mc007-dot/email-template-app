import { Router } from 'express'; import multer from 'multer'; import rateLimit from 'express-rate-limit'; import path from 'path';
import { env } from '../config/env.js'; import { ok, wrap, AppError } from '../utils/http.js'; import { requireAuth } from '../middleware/auth.js';
import * as auth from '../services/authService.js'; import * as tpl from '../services/templateService.js'; import * as dash from '../services/dashboardService.js'; import globalRoutes from './globalRoutes.js'; import { sendEmail, previewEmail } from '../services/emailService.js';
const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again later.', errors: [] } });
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: 8 * 3600 * 1000 };
r.get('/auth/status', wrap(async (_q, s) => ok(s, { setupRequired: await auth.setupRequired() })));
r.post('/auth/setup', limiter, wrap(async (q, s) => ok(s, await auth.createAdmin(q.body), 'Administrator created', 201)));
r.post('/auth/login', limiter, wrap(async (q, s) => { const { admin, token } = await auth.login(q.body.email, q.body.password); s.cookie('token', token, cookieOpts); ok(s, admin, 'Signed in'); }));
r.post('/auth/logout', (_q, s) => { s.clearCookie('token', { ...cookieOpts, maxAge: undefined }); ok(s, null, 'Signed out'); });
r.get('/auth/me', requireAuth, wrap(async (q, s) => ok(s, await auth.getAdmin(q.adminId))));
r.post('/auth/forgot-password', limiter, wrap(async (q, s) => { await auth.forgotPassword(q.body.email); ok(s, null, 'If that email is registered, a reset link has been sent.'); }));
r.post('/auth/reset-password', limiter, wrap(async (q, s) => { await auth.resetPassword(q.body.token, q.body.password); ok(s, null, 'Password updated. You can sign in now.'); }));
r.use(requireAuth); // everything below requires a signed-in administrator
r.get('/dashboard/summary', wrap(async (q, s) => ok(s, await dash.summary(q.query.days))));
r.get('/dashboard/activity', wrap(async (q, s) => ok(s, await dash.activity(q.query.days))));
r.get('/templates', wrap(async (q, s) => ok(s, await tpl.list(q.query))));
r.get('/templates/:id', wrap(async (q, s) => ok(s, await tpl.get(q.params.id))));
r.post('/templates', wrap(async (q, s) => ok(s, await tpl.create(q.body), 'Template created successfully', 201)));
r.put('/templates/:id', wrap(async (q, s) => ok(s, await tpl.update(q.params.id, q.body), 'Template updated successfully')));
r.delete('/templates/:id', wrap(async (q, s) => { await tpl.remove(q.params.id); ok(s, null, 'Template deleted'); }));
// Images only: extension and MIME checked, SVG rejected, kept in memory, never written to disk
const okExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'], okMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const upload = multer({ storage: multer.memoryStorage(), limits: { files: env.maxAttachments, fileSize: env.maxAttachmentBytes },
  fileFilter: (_q, f, cb) => (okExt.includes(path.extname(f.originalname).toLowerCase()) && okMime.includes(f.mimetype) ? cb(null, true) : cb(new AppError(400, `Only JPG, PNG, GIF and WebP images are allowed (${f.originalname})`))) });
r.post('/emails/send', upload.array('attachments'), wrap(async (q, s) => ok(s, await sendEmail(q.body, q.files || [], false), 'Email accepted by SMTP server')));
r.post('/emails/test', upload.array('attachments'), wrap(async (q, s) => ok(s, await sendEmail(q.body, q.files || [], true), 'Test email accepted by SMTP server')));
r.use('/global', globalRoutes);
r.post('/emails/preview', wrap(async (q, s) => ok(s, await previewEmail(q.body))));
export default r;
