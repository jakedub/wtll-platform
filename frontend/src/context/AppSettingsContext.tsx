/**
 * AppSettingsContext
 *
 * Fetches the league's public settings on mount (no auth needed).
 * Provides:
 *  - primaryColor / secondaryColor  → used to build the dynamic MUI theme
 *  - leagueName / shortName         → display in nav/header
 *  - modules                        → which nav sections to show
 *  - reload()                       → call after admin saves settings
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import client from '../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModuleFlags {
  preseason:   boolean
  finance:     boolean
  baseball:    boolean
  softball:    boolean
  schedule:    boolean
  involvement: boolean
}

export interface SignupFlags {
  umpire:     boolean
  volunteer:  boolean
  evaluation: boolean
}

export interface AppSettings {
  primaryColor:   string
  secondaryColor: string
  leagueName:     string
  shortName:      string
  modules: ModuleFlags
  signups: SignupFlags
}

interface AppSettingsContextValue {
  settings: AppSettings
  reload: () => void
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  primaryColor:   '#C41230',
  secondaryColor: '#C41230',   // red default — matches WTLL identity; overridden from DB on load
  leagueName:     'Washington Township Little League',
  shortName:      'WTLL',
  modules: {
    preseason:   true,
    finance:     true,
    baseball:    true,
    softball:    true,
    schedule:    true,
    involvement: true,
  },
  signups: {
    umpire:     false,
    volunteer:  false,
    evaluation: false,
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  reload: () => {},
})

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const load = useCallback(() => {
    client.get('/settings/public/')
      .then(({ data }) => {
        setSettings({
          primaryColor:   data.primary_color   ?? DEFAULT_SETTINGS.primaryColor,
          secondaryColor: data.secondary_color ?? DEFAULT_SETTINGS.secondaryColor,
          leagueName:     data.league_name     ?? DEFAULT_SETTINGS.leagueName,
          shortName:      data.short_name      ?? DEFAULT_SETTINGS.shortName,
          modules: {
            preseason:   data.module_preseason_enabled   ?? true,
            finance:     data.module_finance_enabled     ?? true,
            baseball:    data.module_baseball_enabled    ?? true,
            softball:    data.module_softball_enabled    ?? true,
            schedule:    data.module_schedule_enabled    ?? true,
            involvement: data.module_involvement_enabled ?? true,
          },
          signups: {
            umpire:     data.umpire_signups_enabled     ?? false,
            volunteer:  data.volunteer_signups_enabled  ?? false,
            evaluation: data.evaluation_signups_enabled ?? false,
          },
        })
      })
      .catch(() => {
        // Fail silently — defaults keep the full app visible
      })
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <AppSettingsContext.Provider value={{ settings, reload: load }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAppSettings(): AppSettingsContextValue {
  return useContext(AppSettingsContext)
}
