/**
 * LoginPage — magic link (passwordless) login.
 * Board members and coaches enter their email; they receive a one-time link.
 */
import { useState } from "react"
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  Alert,
} from "@mui/material"
import EmailIcon from "@mui/icons-material/Email"
import client from "../api/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    try {
      await client.post("/auth/request-login/", { email: email.trim().toLowerCase() })
      setSent(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.error ?? "Something went wrong. Please try again."
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

        {sent ? (
          /* ── Sent confirmation ── */
          <Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <EmailIcon sx={{ color: "#16a34a", fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Check your email
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We sent a sign-in link to <strong>{email}</strong>. Click the link in the
              email to continue — it expires in 15 minutes.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Didn't receive it?{" "}
              <Box
                component="span"
                sx={{ color: "#C41230", cursor: "pointer", fontWeight: 600 }}
                onClick={() => { setSent(false); setEmail("") }}
              >
                Try again
              </Box>
            </Typography>
          </Box>
        ) : (
          /* ── Email form ── */
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your email and we'll send you a sign-in link — no password needed.
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

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading || !email.trim()}
              sx={{
                bgcolor: "#C41230",
                "&:hover": { bgcolor: "#a50f29" },
                py: 1.25,
                fontWeight: 700,
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Send sign-in link"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
