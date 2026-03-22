import pool from '../config/db';
import { UserProfile } from '../types';

interface MacroTargets {
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(
  gender: string,
  weight_kg: number,
  height_cm: number,
  birth_year: number,
  activity_level: string
): number {
  const age = new Date().getFullYear() - birth_year;

  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level as keyof typeof ACTIVITY_MULTIPLIERS] ?? 1.375;
  return Math.round(bmr * multiplier);
}

export function calculateMacros(
  tdee: number,
  goal: string,
  weight_kg: number,
  weekly_change_kg = 0.5
): MacroTargets {
  let calorie_target: number;

  const daily_deficit = (weekly_change_kg * 7700) / 7;

  switch (goal) {
    case 'lose':
      calorie_target = Math.max(tdee - Math.min(daily_deficit, 1000), 1200);
      break;
    case 'gain':
      calorie_target = tdee + Math.min(daily_deficit, 500);
      break;
    default:
      calorie_target = tdee;
  }

  calorie_target = Math.round(calorie_target / 50) * 50;

  // Protein: body-weight based
  const proteinPerKg = goal === 'gain' ? 2.2 : goal === 'lose' ? 2.0 : 1.6;
  const protein_target_g = Math.round(weight_kg * proteinPerKg);

  // Fat: 25% of total calories
  const fat_target_g = Math.round((calorie_target * 0.25) / 9);

  // Carbs: remainder
  const protein_kcal = protein_target_g * 4;
  const fat_kcal = fat_target_g * 9;
  const carbs_target_g = Math.round(Math.max(calorie_target - protein_kcal - fat_kcal, 0) / 4);

  return { tdee, calorie_target, protein_target_g, carbs_target_g, fat_target_g };
}

export async function saveProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile & MacroTargets> {
  const existing = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);

  let macros: MacroTargets | null = null;

  const merged = { ...(existing.rows[0] || {}), ...data };

  if (
    merged.gender &&
    merged.weight_kg &&
    merged.height_cm &&
    merged.birth_year &&
    merged.activity_level &&
    merged.goal
  ) {
    const tdee = calculateTDEE(
      merged.gender,
      merged.weight_kg,
      merged.height_cm,
      merged.birth_year,
      merged.activity_level
    );
    macros = calculateMacros(tdee, merged.goal, merged.weight_kg, merged.weekly_change_kg ?? 0.5);
  }

  const result = await pool.query(
    `INSERT INTO user_profiles (
      user_id, display_name, birth_year, gender, height_cm, weight_kg,
      activity_level, goal, weekly_change_kg, tdee, calorie_target,
      protein_target_g, carbs_target_g, fat_target_g, onboarding_done, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      display_name     = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      birth_year       = COALESCE(EXCLUDED.birth_year, user_profiles.birth_year),
      gender           = COALESCE(EXCLUDED.gender, user_profiles.gender),
      height_cm        = COALESCE(EXCLUDED.height_cm, user_profiles.height_cm),
      weight_kg        = COALESCE(EXCLUDED.weight_kg, user_profiles.weight_kg),
      activity_level   = COALESCE(EXCLUDED.activity_level, user_profiles.activity_level),
      goal             = COALESCE(EXCLUDED.goal, user_profiles.goal),
      weekly_change_kg = COALESCE(EXCLUDED.weekly_change_kg, user_profiles.weekly_change_kg),
      tdee             = COALESCE(EXCLUDED.tdee, user_profiles.tdee),
      calorie_target   = COALESCE(EXCLUDED.calorie_target, user_profiles.calorie_target),
      protein_target_g = COALESCE(EXCLUDED.protein_target_g, user_profiles.protein_target_g),
      carbs_target_g   = COALESCE(EXCLUDED.carbs_target_g, user_profiles.carbs_target_g),
      fat_target_g     = COALESCE(EXCLUDED.fat_target_g, user_profiles.fat_target_g),
      onboarding_done  = COALESCE(EXCLUDED.onboarding_done, user_profiles.onboarding_done),
      updated_at       = NOW()
    RETURNING *`,
    [
      userId,
      data.display_name ?? existing.rows[0]?.display_name ?? null,
      data.birth_year ?? existing.rows[0]?.birth_year ?? null,
      data.gender ?? existing.rows[0]?.gender ?? null,
      data.height_cm ?? existing.rows[0]?.height_cm ?? null,
      data.weight_kg ?? existing.rows[0]?.weight_kg ?? null,
      data.activity_level ?? existing.rows[0]?.activity_level ?? null,
      data.goal ?? existing.rows[0]?.goal ?? null,
      data.weekly_change_kg ?? existing.rows[0]?.weekly_change_kg ?? 0.5,
      macros?.tdee ?? existing.rows[0]?.tdee ?? null,
      macros?.calorie_target ?? existing.rows[0]?.calorie_target ?? null,
      macros?.protein_target_g ?? existing.rows[0]?.protein_target_g ?? null,
      macros?.carbs_target_g ?? existing.rows[0]?.carbs_target_g ?? null,
      macros?.fat_target_g ?? existing.rows[0]?.fat_target_g ?? null,
      data.onboarding_done ?? existing.rows[0]?.onboarding_done ?? false,
    ]
  );

  return result.rows[0];
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  return result.rows[0] ?? null;
}
