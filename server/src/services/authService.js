
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError, isEmail } from '../utils/http.js';
import { sendMail } from './mail.js';

const sha = (s) =>
  crypto.createHash('sha256').update(s).digest('hex');

const pub = (r) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
});

// Check whether the first administrator still needs to be created
export const setupRequired = async () =>
  (await query('SELECT 1 FROM admin_users LIMIT 1')).rowCount === 0;

// Validate password complexity
const checkPassword = (password, errs) => {
  if (typeof password !== 'string') {
    errs.push('Password is required');
    return;
  }

  if (password.length < 8) {
    errs.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errs.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errs.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errs.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    errs.push('Password must contain at least one special character');
  }
};

// Create the first administrator
export async function createAdmin({
  fullName,
  email,
  password,
  confirmPassword,
}) {
  const errs = [];

  if (!fullName?.trim()) {
    errs.push('Name is required');
  }

  if (!isEmail(email)) {
    errs.push('A valid email is required');
  }

  checkPassword(password, errs);

  if (password !== confirmPassword) {
    errs.push('Passwords do not match');
  }

  if (errs.length) {
    throw new AppError(400, errs[0], errs);
  }

  if (!(await setupRequired())) {
    throw new AppError(403, 'Setup is already complete');
  }

  try {
    const r = await query(
      `INSERT INTO admin_users
       (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        fullName.trim(),
        email.trim().toLowerCase(),
        await bcrypt.hash(password, 12),
      ]
    );

    return pub(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      throw new AppError(403, 'Setup is already complete');
    }

    throw e;
  }
}

// Administrator login
export async function login(email, password) {
  const r = await query(
    'SELECT * FROM admin_users WHERE email=$1',
    [String(email || '').trim().toLowerCase()]
  );

  const ok =
    r.rowCount &&
    (await bcrypt.compare(
      String(password || ''),
      r.rows[0].password_hash
    ));

  if (!ok) {
    throw new AppError(401, 'Invalid email or password');
  }

  return {
    admin: pub(r.rows[0]),
    token: jwt.sign(
      { id: r.rows[0].id },
      env.jwtSecret,
      { expiresIn: '8h' }
    ),
  };
}

// Get administrator details
export const getAdmin = async (id) => {
  const r = await query(
    'SELECT * FROM admin_users WHERE id=$1',
    [id]
  );

  if (!r.rowCount) {
    throw new AppError(401, 'Please sign in to continue');
  }

  return pub(r.rows[0]);
};

// Send password reset email
export async function forgotPassword(email) {
  const r = await query(
    'SELECT id FROM admin_users WHERE email=$1',
    [String(email || '').trim().toLowerCase()]
  );

  // Same response whether the email exists or not
  if (!r.rowCount) return;

  const token = crypto.randomBytes(32).toString('hex');

  await query(
    `UPDATE admin_users
     SET reset_token_hash=$1,
         reset_token_expires_at=now()+interval '30 minutes'
     WHERE id=$2`,
    [sha(token), r.rows[0].id]
  );

  const link = `${env.clientUrl}/reset-password?token=${token}`;

  try {
    await sendMail({
      to: email.trim(),
      subject: 'Reset your password',
      text: `Reset your password (valid 30 minutes): ${link}`,
      html: `
        <p>Reset your password (valid 30 minutes):</p>
        <p><a href="${link}">${link}</a></p>
      `,
    });
  } catch (e) {
    console.error('Reset email failed:', e.code || e.message);
  }
}

// Reset administrator password
export async function resetPassword(token, password) {
  const errs = [];

  checkPassword(password, errs);

  if (errs.length) {
    throw new AppError(400, errs[0], errs);
  }

  const r = await query(
    `UPDATE admin_users
     SET password_hash=$1,
         reset_token_hash=NULL,
         reset_token_expires_at=NULL,
         updated_at=now()
     WHERE reset_token_hash=$2
       AND reset_token_expires_at>now()
     RETURNING id`,
    [
      await bcrypt.hash(password, 12),
      sha(String(token || '')),
    ]
  );

  if (!r.rowCount) {
    throw new AppError(
      400,
      'This reset link is invalid or has expired'
    );
  }
}
