/**
 * PublicRoleGate — wraps public pages that require a specific role to view.
 *
 * Usage:
 *   <PublicRoleGate requires={["is_coach", "is_staff", "is_board_member"]}>
 *     <MyPage />
 *   </PublicRoleGate>
 *
 * If not logged in → shows a "Sign in to access" prompt.
 * If logged in but wrong role → shows a "Not authorized" message.
 * If authorized → renders children.
 */
import { ReactNode } from "react"
import { Box, Button, Paper, Typography } from "@mui/material"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import { AuthUser } from "../context/AuthContext"

type RoleKey = "is_staff" | "is_board_member" | "is_coach" | "is_umpire"

interface Props {
  requires: RoleKey[]
  children: ReactNode
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("authUser")
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem("authToken")
}

export default function PublicRoleGate({ requires, children }: Props) {
  const token = getStoredToken()
  const user = getStoredUser()

  // Not logged in at all
  if (!token || !user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", px: 2 }}>
        <Paper elevation={0} sx={{
          border: "1px solid #e4e4e7", borderRadius: 3, p: 5,
          maxWidth: 420, width: "100%", textAlign: "center",
        }}>
          <LockOutlinedIcon sx={{ fontSize: 44, color: "#C41230", mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Sign in to access this page
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This page requires you to be signed in with an authorized account.
          </Typography>
          <Button
            variant="contained"
            href="/login"
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700, px: 4 }}
          >
            Sign In
          </Button>
        </Paper>
      </Box>
    )
  }

  // Logged in — check role
  const hasRole = requires.some(role => user[role] === true)

  if (!hasRole) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", px: 2 }}>
        <Paper elevation={0} sx={{
          border: "1px solid #e4e4e7", borderRadius: 3, p: 5,
          maxWidth: 420, width: "100%", textAlign: "center",
        }}>
          <LockOutlinedIcon sx={{ fontSize: 44, color: "#888", mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Access restricted
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your account ({user.email}) doesn't have permission to view this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact a WTLL admin if you believe this is a mistake.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return <>{children}</>
}
