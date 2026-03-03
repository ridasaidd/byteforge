import { create } from 'zustand';

interface NavigationStoreState {
  /** Set of nav IDs that are currently open */
  openIds: Set<string>;
  /** Toggle a specific nav open/closed */
  toggle: (id: string) => void;
  /** Check if a specific nav is open */
  isOpen: (id: string) => boolean;
  /** Close a specific nav */
  close: (id: string) => void;
  /** Close all navs */
  closeAll: () => void;
}

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
  openIds: new Set<string>(),

  toggle: (id: string) =>
    set((state) => {
      const next = new Set(state.openIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { openIds: next };
    }),

  isOpen: (id: string) => get().openIds.has(id),

  close: (id: string) =>
    set((state) => {
      const next = new Set(state.openIds);
      next.delete(id);
      return { openIds: next };
    }),

  closeAll: () => set({ openIds: new Set() }),
}));
