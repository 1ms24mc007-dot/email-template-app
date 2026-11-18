import app from './app.js'; import { env } from './config/env.js'; import { pool } from './config/db.js';
try { await pool.query('SELECT 1'); } catch (e) { console.error('PostgreSQL connection failed:', e.message); process.exit(1); }
app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
