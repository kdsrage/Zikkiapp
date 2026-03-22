export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  last_active: Date;
}

export interface UserProfile {
  user_id: string;
  display_name?: string;
  birth_year?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose' | 'maintain' | 'gain';
  weekly_change_kg?: number;
  tdee?: number;
  calorie_target?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fat_target_g?: number;
  onboarding_done: boolean;
}

export interface Food {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  serving_size_g?: number;
  serving_desc?: string;
  source: string;
  verified: boolean;
  use_count: number;
  created_at: Date;
}

export interface LogEntry {
  id: string;
  user_id: string;
  food_id?: string;
  food_name: string;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  raw_input?: string;
  created_at: Date;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  log_date: string;
  notes?: string;
  created_at: Date;
}

export interface DailySummary {
  date: string;
  entries: LogEntry[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  goals?: {
    calorie_target: number;
    protein_target_g: number;
    carbs_target_g: number;
    fat_target_g: number;
  };
}

export interface ParsedMealItem {
  name: string;
  amount_g: number;
  unit?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence?: number;
  food_id?: string;
}

export interface DailyInsight {
  insights: Array<{
    emoji: string;
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  summary: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}
