/**
 * LoginPage — email + password login.
 * Magic-link (passwordless) flow commented out pending email provider setup.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  Alert,
} from "@mui/material"
import client from "../api/client"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const res = await client.post("/auth/login/", {
        email: email.trim().toLowerCase(),
        password,
      })
      login(res.data.token, res.data.user)
      navigate("/", { replace: true })
    } catch (err: any) {
      setError(
        err?.response?.data?.error ?? "Invalid email or password."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f8f8f8",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          border: "1px solid #e4e4e7",
          borderRadius: 3,
        }}
      >
        {/* Logo / wordmark */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: "#C41230",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
              W
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              WTLL Platform
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Washington Township Little League
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your email and password to access the platform.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            sx={{ mb: 2 }}
            inputProps={{ autoComplete: "email" }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
            inputProps={{ autoComplete: "current-password" }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading || !email.trim() || !password}
            sx={{
              bgcolor: "#C41230",
              "&:hover": { bgcolor: "#a50f29" },
              py: 1.25,
              fontWeight: 700,
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Sign in"}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
