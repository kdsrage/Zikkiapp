import axios from 'axios';
import { storage } from './storage';
import { API_BASE_URL } from '../constants/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 — set this handler from _layout.tsx
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItem('auth_token');
      await storage.deleteItem('user_id');
      await storage.deleteItem('user_email');
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Food {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g?: number;
  serving_desc?: string;
  verified: boolean;
}

export interface LogEntry {
  id: string;
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

export interface UserProfile {
  user_id: string;
  display_name?: string;
  birth_year?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  goal?: string;
  weekly_change_kg?: number;
  tdee?: number;
  calorie_target?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fat_target_g?: number;
  onboarding_done: boolean;
}

export interface WeightLog {
  id: string;
  weight_kg: number;
  log_date: string;
  notes?: string;
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

// ─── API functions ───────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (username: string, password: string) =>
      apiClient.post<{ token: string; userId: string }>('/api/auth/register', { username, password }),
    login: (username: string, password: string) =>
      apiClient.post<{ token: string; userId: string }>('/api/auth/login', { username, password }),
  },

  profile: {
    get: () => apiClient.get<UserProfile>('/api/profile'),
    update: (data: Partial<UserProfile>) => apiClient.put<UserProfile>('/api/profile', data),
    calculate: (data: object) => apiClient.post('/api/profile/calculate', data),
  },

  foods: {
    search: (q: string, limit = 20) =>
      apiClient.get<Food[]>('/api/foods/search', { params: { q, limit } }),
    getByBarcode: (barcode: string) => apiClient.get<Food>(`/api/foods/barcode/${barcode}`),
    create: (data: Partial<Food>) => apiClient.post<Food>('/api/foods', data),
  },

  log: {
    getDailySummary: (date?: string) =>
      apiClient.get<DailySummary>('/api/log', { params: date ? { date } : {} }),
    addEntry: (entry: Partial<LogEntry>) => apiClient.post<LogEntry>('/api/log', entry),
    addBulk: (entries: Partial<LogEntry>[]) =>
      apiClient.post<LogEntry[]>('/api/log/bulk', { entries }),
    deleteEntry: (id: string) => apiClient.delete(`/api/log/${id}`),
    getWeekHistory: () => apiClient.get<{ date: string; calories: number }[]>('/api/log/week'),
  },

  weight: {
    log: (weight_kg: number, date?: string, notes?: string) =>
      apiClient.post<WeightLog>('/api/weight', { weight_kg, date, notes }),
    getHistory: (days?: number) =>
      apiClient.get<{ history: WeightLog[]; trend: { slope_per_week: number; direction: string; rolling_avg_7d: number | null } }>(
        '/api/weight',
        { params: days ? { days } : {} }
      ),
    delete: (id: string) => apiClient.delete(`/api/weight/${id}`),
  },

  ai: {
    parseMeal: (text: string) =>
      apiClient.post<{ items: ParsedMealItem[] }>('/api/ai/parse-meal', { text }),
    getDailyInsight: () => apiClient.get<DailyInsight>('/api/ai/daily-insight'),
  },
};
