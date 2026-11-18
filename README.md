# Email Template Management & Sending Platform

React (Vite) + Express + PostgreSQL (`pg`, raw SQL) + Nodemailer. One administrator, reusable templates with `{{placeholders}}`, image attachments, SMTP sending, dashboard.

## Setup
1. Install Node 18+ and PostgreSQL 14+.
2. Create the database: `createdb email_platform` (or `CREATE DATABASE email_platform;` in psql).
3. Backend:
   ```
   cd server
   cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET and the SMTP_* values
   npm install
   npm run migrate
   npm run dev
   ```
4. Frontend (new terminal):
   ```
   cd client
   npm install
   npm run dev
   ```
5. Open http://localhost:5173. On first launch you get the administrator setup page; afterwards registration is permanently closed (enforced by the API and by a unique `singleton` column in the database).

## SMTP
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true` for port 465), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`. Gmail needs an App Password. Credentials never leave the server.

## Testing email
Publish a template, open Compose & Send, fill placeholders, use **Send test email** (excluded from dashboard stats), then **Send email**.
“SMTP-accepted” only means the mail server accepted the message, not that it reached an inbox.

## Dashboard rules
Test emails are excluded. Successful = SMTP accepted at least one recipient (sent or partially failed). Success % = successful / completed attempts (0% when none).

## Postman
Import `postman/Email-Platform-API.postman_collection.json`. Run **Setup** (once), then **Login**; Postman keeps the HTTP-only cookie automatically. **Create template** stores `templateId` for later requests. For send requests, attach image files in the form-data `attachments` row.

## Troubleshooting
- `PostgreSQL connection failed`: check `DATABASE_URL`, that the server is running and the database exists.
- `SMTP authentication failed`: wrong user/password, or the provider needs an app password.
- `Could not connect to the SMTP server`: check host, port and `SMTP_SECURE` (587 → false, 465 → true).
- Login loops: use `localhost:5173` and keep `CLIENT_URL` equal to that address.
