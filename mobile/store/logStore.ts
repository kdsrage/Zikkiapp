import { create } from 'zustand';
import { api, DailySummary, LogEntry } from '../services/api';

interface LogState {
  summary: DailySummary | null;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  setDate: (date: string) => void;
  fetchSummary: (date?: string) => Promise<void>;
  addEntry: (entry: Partial<LogEntry>) => Promise<void>;
  addBulkEntries: (entries: Partial<LogEntry>[]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reset: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export const useLogStore = create<LogState>((set, get) => ({
  summary: null,
  selectedDate: today(),
  isLoading: false,
  error: null,

  setDate: (date: string) => {
    set({ selectedDate: date });
    get().fetchSummary(date);
  },

  fetchSummary: async (date?: string) => {
    const targetDate = date ?? get().selectedDate;
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.log.getDailySummary(targetDate);
      set({ summary: data, isLoading: false, selectedDate: targetDate });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      set({ error: error.response?.data?.error ?? 'Fehler beim Laden', isLoading: false });
    }
  },

  addEntry: async (entry: Partial<LogEntry>) => {
    await api.log.addEntry(entry);
    await get().fetchSummary(get().selectedDate);
  },

  addBulkEntries: async (entries: Partial<LogEntry>[]) => {
    await api.log.addBulk(entries);
    await get().fetchSummary(get().selectedDate);
  },

  deleteEntry: async (id: string) => {
    // Store snapshot before optimistic update
    const previous = get().summary;
    const entry = previous?.entries.find((e) => e.id === id);

    // Optimistic update
    if (previous && entry) {
      set({
        summary: {
          ...previous,
          entries: previous.entries.filter((e) => e.id !== id),
          total_calories: previous.total_calories - Number(entry.calories),
          total_protein_g: previous.total_protein_g - Number(entry.protein_g),
          total_carbs_g: previous.total_carbs_g - Number(entry.carbs_g),
          total_fat_g: previous.total_fat_g - Number(entry.fat_g),
        },
      });
    }

    try {
      await api.log.deleteEntry(id);
    } catch {
      // Revert on failure
      set({ summary: previous });
      throw new Error('Löschen fehlgeschlagen');
    }
  },

  reset: () => set({ summary: null, selectedDate: today(), isLoading: false, error: null }),
}));
