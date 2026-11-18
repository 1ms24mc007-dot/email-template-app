export class AppError extends Error {
  constructor(status, message, errors = []) { super(message); this.status = status; this.errors = errors; }
}
export const ok = (res, data = null, message = 'OK', status = 200) => res.status(status).json({ success: true, message, data });
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(v);
