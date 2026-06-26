/**
 * PublicLinkBar
 *
 * Displayed at the top of admin involvement pages to surface the public URL
 * for that form and show whether it is currently live or disabled.
 */
import { useState } from "react"
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import CheckIcon from "@mui/icons-material/Check"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"

interface Props {
  /** e.g. "/public/umpire-signups" */
  publicPath: string
  /** Whether the sign-up form is currently accepting submissions */
  live: boolean
  /** Org secondary color — used for Live chip and copy-success state */
  secondaryColor: string
}

export default function PublicLinkBar({ publicPath, live, secondaryColor }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${publicPath}`

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        bgcolor: "#f8f9fa",
        border: "1px solid #e8e8e8",
        borderRadius: 2,
        px: 2,
        py: 0.875,
        mb: 3,
      }}
    >
      {/* Live / Disabled status chip */}
      <Chip
        label={live ? "Live" : "Disabled"}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.65rem",
          fontWeight: 700,
          bgcolor: live ? `${secondaryColor}18` : "#f0f0f0",
          color: live ? secondaryColor : "#999",
          flexShrink: 0,
        }}
      />

      {/* Public URL */}
      <Typography
        sx={{
          fontSize: "0.8rem",
          color: "#555",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}
      >
        {url}
      </Typography>

      {/* Copy button */}
      <Tooltip title={copied ? "Copied!" : "Copy link"}>
        <IconButton
          size="small"
          onClick={copy}
          sx={{ color: copied ? secondaryColor : "#bbb", transition: "color 0.2s" }}
        >
          {copied
            ? <CheckIcon sx={{ fontSize: 16 }} />
            : <ContentCopyIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>

      {/* Open in new tab */}
      <Tooltip title="Open public page">
        <IconButton
          size="small"
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: "#bbb", "&:hover": { color: secondaryColor }, transition: "color 0.2s" }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
