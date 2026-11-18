import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
const transporter = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined });
const from = () => ({ name: env.smtp.fromName, address: env.smtp.fromEmail || env.smtp.user });
export const sendMail = (opts) => transporter.sendMail({ from: from(), ...opts });
export const friendlySmtpError = (e) => {
  if (e.code === 'EAUTH') return 'SMTP authentication failed. Check SMTP_USER and SMTP_PASS.';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(e.code)) return 'Could not connect to the SMTP server. Check SMTP_HOST, SMTP_PORT and SMTP_SECURE.';
  return 'The SMTP server rejected the email.';
};
