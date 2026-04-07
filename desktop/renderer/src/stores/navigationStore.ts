import { create } from 'zustand'

export type Page = 'chat' | 'dashboard' | 'tasks' | 'skills'

interface NavigationState {
  currentPage: Page
  setPage: (page: Page) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'chat',
  setPage: (page) => set({ currentPage: page })
}))
