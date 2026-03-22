import pool from '../config/db';
import { LogEntry, DailySummary } from '../types';
import { incrementUseCount } from './foodService';
import { createError } from '../middleware/errorHandler';

interface NewLogEntry {
  food_id?: string;
  food_name: string;
  log_date?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  raw_input?: string;
}

export async function addEntry(userId: string, entry: NewLogEntry): Promise<LogEntry> {
  const result = await pool.query<LogEntry>(
    `INSERT INTO log_entries
       (user_id, food_id, food_name, log_date, meal_type, amount_g,
        calories, protein_g, carbs_g, fat_g, raw_input)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      userId,
      entry.food_id ?? null,
      entry.food_name,
      entry.log_date ?? new Date().toISOString().split('T')[0],
      entry.meal_type,
      entry.amount_g,
      entry.calories,
      entry.protein_g,
      entry.carbs_g,
      entry.fat_g,
      entry.raw_input ?? null,
    ]
  );

  if (entry.food_id) {
    await incrementUseCount(entry.food_id).catch(() => {});
  }

  return result.rows[0];
}

export async function addMultipleEntries(userId: string, entries: NewLogEntry[]): Promise<LogEntry[]> {
  const results = await Promise.all(entries.map((e) => addEntry(userId, e)));
  return results;
}

export async function getDailySummary(userId: string, date: string): Promise<DailySummary> {
  const entriesResult = await pool.query<LogEntry>(
    `SELECT * FROM log_entries
     WHERE user_id = $1 AND log_date = $2
     ORDER BY created_at ASC`,
    [userId, date]
  );

  const entries = entriesResult.rows;

  const totals = entries.reduce(
    (acc, e) => ({
      total_calories: acc.total_calories + Number(e.calories),
      total_protein_g: acc.total_protein_g + Number(e.protein_g),
      total_carbs_g: acc.total_carbs_g + Number(e.carbs_g),
      total_fat_g: acc.total_fat_g + Number(e.fat_g),
    }),
    { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 }
  );

  // Get goals
  const profileResult = await pool.query(
    'SELECT calorie_target, protein_target_g, carbs_target_g, fat_target_g FROM user_profiles WHERE user_id = $1',
    [userId]
  );

  const profile = profileResult.rows[0];

  return {
    date,
    entries,
    ...totals,
    goals: profile
      ? {
          calorie_target: profile.calorie_target ?? 2000,
          protein_target_g: profile.protein_target_g ?? 150,
          carbs_target_g: profile.carbs_target_g ?? 200,
          fat_target_g: profile.fat_target_g ?? 65,
        }
      : undefined,
  };
}

export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  const result = await pool.query(
    'DELETE FROM log_entries WHERE id = $1 AND user_id = $2 RETURNING id',
    [entryId, userId]
  );

  if (result.rowCount === 0) {
    throw createError('Eintrag nicht gefunden', 404);
  }
}

export async function getRecentEntries(userId: string, limit = 50): Promise<LogEntry[]> {
  const result = await pool.query<LogEntry>(
    `SELECT * FROM log_entries
     WHERE user_id = $1
     ORDER BY log_date DESC, created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function getWeekHistory(userId: string): Promise<{ date: string; calories: number }[]> {
  const result = await pool.query(
    `SELECT log_date::text as date, COALESCE(SUM(calories), 0)::numeric as calories
     FROM log_entries
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY log_date
     ORDER BY log_date ASC`,
    [userId]
  );
  return result.rows;
}
