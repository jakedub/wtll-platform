/**
 * Email and Text buttons using mailto: and sms: protocol links.
 * Opens the user's default email/messaging app with everything pre-filled.
 * Completely free — no third-party service required.
 */
import { Box, Tooltip } from "@mui/material"
import EmailIcon from "@mui/icons-material/Email"
import SmsIcon from "@mui/icons-material/Sms"

interface Props {
  name: string
  email?: string
  phone?: string
  subject?: string
  body?: string
  /** Size of the icon buttons */
  size?: number
}

function cleanPhone(raw: string): string {
  // Strip everything except digits and leading +
  return raw.replace(/[^\d+]/g, "")
}

export default function ContactActions({ name, email, phone, subject, body, size = 16 }: Props) {
  if (!email && !phone) return null

  const encodedSubject = encodeURIComponent(subject ?? "WTLL Sign-Up")
  const encodedBody    = encodeURIComponent(body ?? `Hi ${name},\n\nThank you for signing up with Washington Township Little League.\n\nWTLL`)
  const encodedSmsBody = encodeURIComponent(body ?? `Hi ${name}, thank you for signing up with WTLL!`)

  return (
    <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
      {email && (
        <Tooltip title={`Email ${name} (${email})`}>
          <Box
            component="a"
            href={`mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: size + 14, height: size + 14, borderRadius: 1,
              color: "#1565c0", textDecoration: "none",
              "&:hover": { bgcolor: "rgba(21,101,192,0.1)" },
              transition: "background 0.1s",
            }}
          >
            <EmailIcon sx={{ fontSize: size }} />
          </Box>
        </Tooltip>
      )}
      {phone && (
        <Tooltip title={`Text ${name} (${phone})`}>
          <Box
            component="a"
            href={`sms:${cleanPhone(phone)}?body=${encodedSmsBody}`}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: size + 14, height: size + 14, borderRadius: 1,
              color: "#2e7d32", textDecoration: "none",
              "&:hover": { bgcolor: "rgba(46,125,50,0.1)" },
              transition: "background 0.1s",
            }}
          >
            <SmsIcon sx={{ fontSize: size }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}
