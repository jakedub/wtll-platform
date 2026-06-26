/**
 * AuthContext — global authentication state.
 *
 * Stores the DRF token and user profile in localStorage.
 * Exposes: user, token, login(), logout(), isLoading.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_board_member: boolean
  is_coach: boolean
  is_umpire: boolean
  is_active: boolean
  last_login: string | null
  date_joined: string | null
  coached_teams: { id: number; name: string; division_id: number | null }[]
  assistant_coached_teams: { id: number; name: string; division_id: number | null }[]
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("authToken")
  )
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem("authUser")
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(false)

  // Validate the stored token on mount by calling /api/auth/me/
  useEffect(() => {
    if (!token) return

    setIsLoading(true)
    import("../api/client")
      .then(({ default: client }) =>
        client.get<AuthUser>("/auth/me/")
      )
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem("authUser", JSON.stringify(data))
      })
      .catch(() => {
        // Token invalid / expired → clear everything
        setToken(null)
        setUser(null)
        localStorage.removeItem("authToken")
        localStorage.removeItem("authUser")
      })
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("authToken", newToken)
    localStorage.setItem("authUser", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    import("../api/client").then(({ default: client }) =>
      client.post("/auth/logout/").catch(() => {})
    )
    localStorage.removeItem("authToken")
    localStorage.removeItem("authUser")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
