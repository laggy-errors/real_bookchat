import { create } from 'zustand';

export interface UnreadCountState {
  unreadCounts: Record<string, number>; // bookId -> unreadCount
  setUnreadCount: (bookId: string, count: number) => void;
  incrementUnreadCount: (bookId: string) => void;
  clearUnreadCount: (bookId: string) => void;
  setAllUnreadCounts: (counts: Record<string, number>) => void;
}

export const useUnreadStore = create<UnreadCountState>((set) => ({
  unreadCounts: {},
  setUnreadCount: (bookId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [bookId]: count },
    })),
  incrementUnreadCount: (bookId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [bookId]: (state.unreadCounts[bookId] || 0) + 1 },
    })),
  clearUnreadCount: (bookId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [bookId]: 0 },
    })),
  setAllUnreadCounts: (counts) => set({ unreadCounts: counts }),
}));
