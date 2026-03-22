import pool from '../config/db';
import { WeightLog } from '../types';
import { createError } from '../middleware/errorHandler';

export async function logWeight(
  userId: string,
  weight_kg: number,
  date?: string,
  notes?: string
): Promise<WeightLog> {
  const log_date = date ?? new Date().toISOString().split('T')[0];

  const result = await pool.query<WeightLog>(
    `INSERT INTO weight_logs (user_id, weight_kg, log_date, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, log_date) DO UPDATE SET weight_kg = $2, notes = $4
     RETURNING *`,
    [userId, weight_kg, log_date, notes ?? null]
  );

  return result.rows[0];
}

export async function getWeightHistory(userId: string, days = 90): Promise<WeightLog[]> {
  const result = await pool.query<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::interval
     ORDER BY log_date ASC`,
    [userId, days]
  );
  return result.rows;
}

export async function getLatestWeight(userId: string): Promise<WeightLog | null> {
  const result = await pool.query<WeightLog>(
    'SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY log_date DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteWeightLog(userId: string, logId: string): Promise<void> {
  const result = await pool.query(
    'DELETE FROM weight_logs WHERE id = $1 AND user_id = $2 RETURNING id',
    [logId, userId]
  );
  if (result.rowCount === 0) {
    throw createError('Eintrag nicht gefunden', 404);
  }
}

export function calculateTrend(entries: WeightLog[]): {
  slope_per_week: number;
  direction: 'losing' | 'gaining' | 'stable';
  rolling_avg_7d: number | null;
} {
  if (entries.length < 2) {
    return {
      slope_per_week: 0,
      direction: 'stable',
      rolling_avg_7d: entries[0] ? Number(entries[0].weight_kg) : null,
    };
  }

  // Linear regression
  const n = entries.length;
  const x = entries.map((_, i) => i);
  const y = entries.map((e) => Number(e.weight_kg));

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const slope_per_week = slope * 7; // slope is per entry (day), convert to per week

  const direction =
    slope_per_week < -0.1 ? 'losing' : slope_per_week > 0.1 ? 'gaining' : 'stable';

  // 7-day rolling avg (last 7 entries)
  const last7 = y.slice(-7);
  const rolling_avg_7d = last7.reduce((a, b) => a + b, 0) / last7.length;

  return { slope_per_week, direction, rolling_avg_7d };
}
