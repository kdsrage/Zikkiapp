import { create } from 'zustand';
import { api, UserProfile } from '../services/api';

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  saveProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.profile.get();
      set({ profile: data, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      set({ error: error.response?.data?.error ?? 'Fehler beim Laden', isLoading: false });
    }
  },

  saveProfile: async (data: Partial<UserProfile>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: updated } = await api.profile.update(data);
      set({ profile: updated, isLoading: false });
      return updated;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      const msg = error.response?.data?.error ?? 'Fehler beim Speichern';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  reset: () => set({ profile: null, isLoading: false, error: null }),
}));
