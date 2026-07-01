import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { api, setAuthToken } from '../services/api';
import { NearbyVenue, User } from '../types';

const TOKEN_SERVICE = 'nightlife_auth_token';

interface AuthState {
  token: string | null;
  user: User | null;
  pendingEmail: string | null;
  isLoading: boolean;
  nearbyVenue: NearbyVenue | null;
  setNearbyVenue: (venue: NearbyVenue | null) => void;
  setPendingEmail: (email: string | null) => void;
  bootstrap: () => Promise<void>;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

async function getStoredToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
  return credentials ? credentials.password : null;
}

async function storeToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('auth', token, { service: TOKEN_SERVICE });
}

async function clearStoredToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  pendingEmail: null,
  isLoading: true,
  nearbyVenue: null,

  setNearbyVenue: venue => set({ nearbyVenue: venue }),
  setPendingEmail: email => set({ pendingEmail: email }),

  bootstrap: async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      setAuthToken(token);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timed out')), 30000),
      );
      const { user } = await Promise.race([api.getMe(), timeout]);
      set({ token, user, isLoading: false });
    } catch {
      await clearStoredToken();
      setAuthToken(null);
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (token, user) => {
    await storeToken(token);
    setAuthToken(token);
    set({ token, user, pendingEmail: null });
  },

  logout: async () => {
    await clearStoredToken();
    setAuthToken(null);
    set({ token: null, user: null, nearbyVenue: null });
  },

  refreshUser: async () => {
    const { token } = get();
    if (!token) return;
    const { user } = await api.getMe();
    set({ user });
  },
}));
