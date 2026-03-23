import { create } from 'zustand';
import { api } from '../services/api';
import { storage } from '../services/storage';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  loadFromStorage: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  isLoading: true,
  isAuthenticated: false,

  loadFromStorage: async () => {
    try {
      const token = await storage.getItem('auth_token');
      const userId = await storage.getItem('user_id');
      const email = await storage.getItem('user_email');
      if (token && userId) {
        // Check token expiry — decode base64url safely
        try {
          const part = token.split('.')[1];
          // base64url → base64
          const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(
            part.length + (4 - (part.length % 4)) % 4, '='
          );
          const payload = JSON.parse(atob(base64));
          const expired = payload.exp && Date.now() / 1000 > payload.exp;
          if (expired) {
            await storage.deleteItem('auth_token');
            await storage.deleteItem('user_id');
            await storage.deleteItem('user_email');
            set({ isLoading: false });
            return;
          }
        } catch {
          // Can't decode — still allow, backend will reject if truly invalid
        }
        set({ token, userId, email, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (username: string, password: string) => {
    const { data } = await api.auth.login(username, password);
    await storage.setItem('auth_token', data.token);
    await storage.setItem('user_id', data.userId);
    await storage.setItem('user_email', username);
    set({ token: data.token, userId: data.userId, email: username, isAuthenticated: true });
  },

  register: async (username: string, password: string) => {
    const { data } = await api.auth.register(username, password);
    await storage.setItem('auth_token', data.token);
    await storage.setItem('user_id', data.userId);
    await storage.setItem('user_email', username);
    set({ token: data.token, userId: data.userId, email: username, isAuthenticated: true });
  },

  logout: async () => {
    await storage.deleteItem('auth_token');
    await storage.deleteItem('user_id');
    await storage.deleteItem('user_email');
    set({ token: null, userId: null, email: null, isAuthenticated: false });
  },
}));
