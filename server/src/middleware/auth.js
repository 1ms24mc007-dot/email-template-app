import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
export const requireAuth = (req, _res, next) => {
  try { req.adminId = jwt.verify(req.cookies.token, env.jwtSecret).id; next(); }
  catch { next(new AppError(401, 'Please sign in to continue')); }
};
