import { create } from 'zustand';
import { api, WeightLog } from '../services/api';

interface WeightTrend {
  slope_per_week: number;
  direction: string;
  rolling_avg_7d: number | null;
}

interface WeightState {
  history: WeightLog[];
  trend: WeightTrend | null;
  isLoading: boolean;
  error: string | null;

  fetchHistory: (days?: number) => Promise<void>;
  logWeight: (weight_kg: number, date?: string, notes?: string) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  reset: () => void;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  history: [],
  trend: null,
  isLoading: false,
  error: null,

  fetchHistory: async (days = 90) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.weight.getHistory(days);
      set({ history: data.history, trend: data.trend, isLoading: false });
    } catch {
      set({ error: 'Fehler beim Laden der Gewichtsdaten', isLoading: false });
    }
  },

  logWeight: async (weight_kg: number, date?: string, notes?: string) => {
    await api.weight.log(weight_kg, date, notes);
    await get().fetchHistory();
  },

  deleteLog: async (id: string) => {
    // Optimistic update — store original in case we need to revert
    const previous = get().history;
    set((state) => ({ history: state.history.filter((w) => w.id !== id) }));
    try {
      await api.weight.delete(id);
    } catch {
      // Revert on failure
      set({ history: previous });
      throw new Error('Löschen fehlgeschlagen');
    }
  },

  reset: () => set({ history: [], trend: null, isLoading: false, error: null }),
}));
