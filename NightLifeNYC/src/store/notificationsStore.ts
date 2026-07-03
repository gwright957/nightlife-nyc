import { create } from "zustand";
import { api } from "../services/api";

interface NotificationsState {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,

  refreshUnreadCount: async () => {
    try {
      const { count } = await api.getUnreadNotificationCount();
      set({ unreadCount: count });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
