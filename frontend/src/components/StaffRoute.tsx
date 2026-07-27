/**
 * StaffRoute — only renders children when the authenticated user has is_staff=true.
 * Non-staff users are silently redirected to the dashboard.
 * Unauthenticated users fall through to ProtectedRoute → /login.
 */
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth()

  // No token → let ProtectedRoute handle the /login redirect
  if (!token) return null

  // Authenticated but not staff → bounce to dashboard
  if (!user?.is_staff) return <Navigate to="/" replace />

  return <>{children}</>
}
