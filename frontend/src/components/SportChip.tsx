import Chip from "@mui/material/Chip"

/**
 * Consistent sport identifier chip used throughout the app.
 * Baseball = black styling, Softball = red styling.
 */
export default function SportChip({
  sport,
  size = "small",
}: {
  sport: string | null | undefined
  size?: "small" | "medium"
}) {
  if (!sport) return null

  const isSoftball = sport.toLowerCase() === "softball"

  return (
    <Chip
      label={isSoftball ? "Softball" : "Baseball"}
      size={size}
      sx={{
        bgcolor: isSoftball ? "#C41230" : "#111",
        color: "#fff",
        fontWeight: 700,
        fontSize: size === "small" ? "0.65rem" : "0.75rem",
        height: size === "small" ? 18 : 24,
        letterSpacing: "0.03em",
        "& .MuiChip-label": { px: size === "small" ? 1 : 1.5 },
      }}
    />
  )
}
