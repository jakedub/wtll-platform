import { Box, Chip, Typography } from "@mui/material"

export const RED = "#C41230"

export function PageHeader({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>{title}</Typography>
      </Box>
      <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>{subtitle}</Typography>
    </Box>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, mb: 0.5 }}>
      {children}
    </Typography>
  )
}

export function Card({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box sx={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, ...sx }}>
      {children}
    </Box>
  )
}

export function Notice({ children, color = "red" }: { children: React.ReactNode; color?: "red" | "blue" | "gold" }) {
  const colors: Record<string, { bg: string; border: string }> = {
    red:  { bg: "rgba(196,18,48,0.06)",  border: "rgba(196,18,48,0.25)" },
    blue: { bg: "rgba(21,101,192,0.06)", border: "rgba(21,101,192,0.25)" },
    gold: { bg: "rgba(230,162,0,0.08)",  border: "rgba(230,162,0,0.35)" },
  }
  const c = colors[color]
  return (
    <Box sx={{ bgcolor: c.bg, border: `1px solid ${c.border}`, borderRadius: 1.5, p: 1.5, mb: 2, fontSize: "0.83rem", lineHeight: 1.6 }}>
      {children}
    </Box>
  )
}

export const CHIP_SX: Record<string, object> = {
  red:    { bgcolor: "rgba(196,18,48,0.12)",  color: "#C41230", border: "1px solid rgba(196,18,48,0.3)" },
  orange: { bgcolor: "rgba(230,81,0,0.1)",    color: "#bf360c", border: "1px solid rgba(230,81,0,0.3)" },
  purple: { bgcolor: "rgba(106,27,154,0.1)",  color: "#6a1b9a", border: "1px solid rgba(106,27,154,0.3)" },
  green:  { bgcolor: "rgba(46,125,50,0.1)",   color: "#2e7d32", border: "1px solid rgba(46,125,50,0.3)" },
  blue:   { bgcolor: "rgba(21,101,192,0.1)",  color: "#1565c0", border: "1px solid rgba(21,101,192,0.3)" },
  gold:   { bgcolor: "rgba(230,162,0,0.12)",  color: "#b45309", border: "1px solid rgba(230,162,0,0.35)" },
}

export function Tag({ label, color }: { label: string; color: keyof typeof CHIP_SX }) {
  return <Chip label={label} size="small" sx={{ ...CHIP_SX[color], fontWeight: 700, fontSize: "0.68rem", height: 20 }} />
}
