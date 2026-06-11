/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Wraps the entire board app; public-facing /public/* routes are outside it.
 */
import { Navigate, useLocation } from "react-router-dom"
import { Box, CircularProgress } from "@mui/material"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!token) {
    // Preserve the URL the user was trying to reach so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
