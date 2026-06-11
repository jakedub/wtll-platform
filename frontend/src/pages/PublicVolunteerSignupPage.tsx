import { useEffect, useState } from "react"
import { Box, Typography } from "@mui/material"
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism"
import PublicNav from "../components/PublicNav"
import VolunteerSignupPage from "./VolunteerSignupPage"
import client from "../api/client"

export default function PublicVolunteerSignupPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    client.get("/volunteers/public-config/")
      .then(r => setEnabled(r.data.is_enabled))
      .catch(() => setEnabled(false))
  }, [])

  if (enabled === null) return null

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
      <PublicNav />
      <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 4 }}>
        {enabled ? (
          <VolunteerSignupPage isPublic />
        ) : (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <VolunteerActivismIcon sx={{ fontSize: 56, color: "#d4d4d8", mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#555", mb: 1 }}>
              Volunteer Sign-Ups Unavailable
            </Typography>
            <Typography sx={{ color: "#888" }}>
              Volunteer sign-ups are not currently open. Check back later or contact the league.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
