
import { query } from '../config/db.js';

// Only allow 7-day or 30-day dashboard periods.
const days = (d) => (Number(d) === 30 ? 30 : 7);

export async function summary(d) {
  const r = (
    await query(
      `SELECT
        count(*)::int AS total,
        count(*) FILTER (
          WHERE status IN ('sent', 'partially_failed')
        )::int AS successful,
        count(*) FILTER (
          WHERE status = 'failed'
        )::int AS failed,
        count(*) FILTER (
          WHERE status <> 'processing'
        )::int AS completed
      FROM email_logs
      WHERE NOT is_test
        AND created_at >= now() - make_interval(0, 0, 0, $1::int)`,
      [days(d)]
    )
  ).rows[0];

  return {
    total: r.total,
    successful: r.successful,
    failed: r.failed,
    successPercentage: r.completed
      ? Math.round((r.successful / r.completed) * 1000) / 10
      : 0
  };
}

export async function activity(d) {
  const volume = (
    await query(
      `SELECT
        to_char(g::date, 'YYYY-MM-DD') AS "day",
        count(l.id) FILTER (
          WHERE l.status IN ('sent', 'partially_failed')
        )::int AS successful,
        count(l.id) FILTER (
          WHERE l.status = 'failed'
        )::int AS failed
      FROM generate_series(
        current_date::timestamp - make_interval(0, 0, 0, ($1::int - 1)),
        current_date::timestamp,
        make_interval(0, 0, 0, 1)
      ) AS g
      LEFT JOIN email_logs l
        ON l.created_at::date = g::date
        AND NOT l.is_test
      GROUP BY g
      ORDER BY g`,
      [days(d)]
    )
  ).rows;

  const sel = `
    SELECT
      id,
      recipient_to,
      subject,
      template_name,
      status,
      error_message,
      created_at
    FROM email_logs
    WHERE NOT is_test
  `;

  const recent = (
    await query(`${sel} ORDER BY created_at DESC LIMIT 10`)
  ).rows;

  const failures = (
    await query(
      `${sel} AND status = 'failed' ORDER BY created_at DESC LIMIT 10`
    )
  ).rows;

  return {
    volume,
    recent,
    failures
  };
}
