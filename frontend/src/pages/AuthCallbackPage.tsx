/**
 * AuthCallbackPage — handles the magic link click.
 * URL: /auth/callback?token=<uuid>
 * Verifies the token with the backend, stores the auth token, and redirects.
 */
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Box, CircularProgress, Typography, Alert, Button } from "@mui/material"
import client from "../api/client"
import { useAuth } from "../context/AuthContext"
import type { AuthUser } from "../context/AuthContext"

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("No token found in the URL. Please request a new sign-in link.")
      return
    }

    client
      .get<{ token: string; user: AuthUser }>(`/auth/verify/?token=${token}`)
      .then(({ data }) => {
        login(data.token, data.user)
        navigate("/", { replace: true })
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ??
          "This link is invalid or has expired. Please request a new one."
        setError(msg)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 440, width: "100%" }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/login")}>
          Back to sign in
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Signing you in…
      </Typography>
    </Box>
  )
}
