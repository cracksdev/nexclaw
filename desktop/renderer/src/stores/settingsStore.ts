import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'

interface SettingsState {
  theme: Theme
  provider: string
  model: string
  apiKey: string
  baseUrl: string
  workingDirectory: string
  sidebarOpen: boolean

  setTheme: (theme: Theme) => void
  setProvider: (provider: string) => void
  setModel: (model: string) => void
  setApiKey: (apiKey: string) => void
  setBaseUrl: (baseUrl: string) => void
  setWorkingDirectory: (dir: string) => void
  toggleSidebar: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: '',
      baseUrl: '',
      workingDirectory: '',
      sidebarOpen: true,

      setTheme: (theme) => set({ theme }),
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setApiKey: (apiKey) => set({ apiKey }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setWorkingDirectory: (dir) => set({ workingDirectory: dir }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    }),
    {
      name: 'nexclaw-settings',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version === 0) {
          if (persisted.provider === 'openai' && persisted.model === 'gpt-4o') {
            persisted.provider = 'anthropic'
            persisted.model = 'claude-sonnet-4-20250514'
          }
        }
        return persisted as SettingsState
      },
      partialize: (state) => ({
        theme: state.theme,
        provider: state.provider,
        model: state.model,
        baseUrl: state.baseUrl,
        workingDirectory: state.workingDirectory,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
)
