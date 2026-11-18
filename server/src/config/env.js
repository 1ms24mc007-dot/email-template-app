import 'dotenv/config';
for (const k of ['DATABASE_URL', 'JWT_SECRET']) if (!process.env[k]) { console.error(`Missing env var ${k}`); process.exit(1); }
export const env = {
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  isProd: process.env.NODE_ENV === 'production',
  smtp: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, fromEmail: process.env.SMTP_FROM_EMAIL, fromName: process.env.SMTP_FROM_NAME || 'Email Platform' },
  maxAttachments: Number(process.env.MAX_ATTACHMENTS) || 5,
  maxAttachmentBytes: (Number(process.env.MAX_ATTACHMENT_MB) || 5) * 1024 * 1024,
};
