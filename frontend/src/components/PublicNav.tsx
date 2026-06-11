/**
 * Navigation bar shown on public-facing sign-up and scorekeeper pages.
 * Shows WTLL branding + links to each Involvement section that is currently enabled,
 * plus the pitch log and softball innings scorekeeper tools.
 */
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Box, CircularProgress, Typography, useMediaQuery, useTheme, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material"
import SportsIcon from "@mui/icons-material/Sports"
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism"
import AssignmentIcon from "@mui/icons-material/Assignment"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball"
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
import client from "../api/client"

const RED = "#C41230"
const PINK = "#d81b60"

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  enabled: boolean
  color?: string
}

async function fetchConfigs(): Promise<{ umpire: boolean; volunteer: boolean; evaluations: boolean }> {
  const [u, v, e] = await Promise.all([
    client.get("/umpire/public-config/").catch(() => ({ data: { is_enabled: false } })),
    client.get("/volunteers/public-config/").catch(() => ({ data: { is_enabled: false } })),
    client.get("/eval-events/public/").catch(() => ({ data: [] })),
  ])
  return {
    umpire: u.data.is_enabled,
    volunteer: v.data.is_enabled,
    evaluations: Array.isArray(e.data) ? e.data.length > 0 : false,
  }
}

export default function PublicNav() {
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const [configs, setConfigs] = useState<{ umpire: boolean; volunteer: boolean; evaluations: boolean } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetchConfigs().then(setConfigs).catch(() => setConfigs({ umpire: true, volunteer: true, evaluations: false }))
  }, [])

  const buildItems = (cfg: { umpire: boolean; volunteer: boolean; evaluations: boolean }): NavItem[] => [
    { label: "Umpire Sign-Ups",    path: "/public/umpire-signups",    icon: <SportsIcon sx={{ fontSize: 16 }} />,              enabled: cfg.umpire,      color: RED },
    { label: "Volunteer Sign-Ups", path: "/public/volunteer-signups", icon: <VolunteerActivismIcon sx={{ fontSize: 16 }} />,   enabled: cfg.volunteer,   color: RED },
    { label: "Evaluations",        path: "/public/evaluations",       icon: <CalendarMonthIcon sx={{ fontSize: 16 }} />,       enabled: cfg.evaluations, color: RED },
    // Scorekeeper / coach tools — always visible
    { label: "Log Pitches",        path: "/public/pitch-log",         icon: <SportsBaseballIcon sx={{ fontSize: 16 }} />,      enabled: true, color: "#1565c0" },
    { label: "Pitch Count",        path: "/public/pitch-count",       icon: <SportsBaseballIcon sx={{ fontSize: 16 }} />,      enabled: true, color: "#1565c0" },
    { label: "Softball Innings",   path: "/public/softball-innings",  icon: <SportsBaseballIcon sx={{ fontSize: 16 }} />,      enabled: true, color: PINK },
  ]

  const items = configs ? buildItems(configs).filter(i => i.enabled) : []

  const navBar = (
    <Box
      sx={{
        bgcolor: "#1c1c1e",
        borderBottom: "3px solid #C41230",
        px: { xs: 2, md: 3 },
        py: 0,
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <Box
        component={Link}
        to="/"
        sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, pr: 3, textDecoration: "none", borderRight: "1px solid rgba(255,255,255,0.1)", mr: 2 }}
      >
        <Logo />
      </Box>

      {isMobile ? (
        /* Mobile: hamburger menu */
        <>
          <Box sx={{ flex: 1 }} />
          {configs === null ? (
            <Box sx={{ display: "flex", alignItems: "center", pr: 1 }}>
              <CircularProgress size={16} sx={{ color: "#aaa" }} />
            </Box>
          ) : (
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "rgba(255,255,255,0.7)", my: 0.5 }}>
              <MenuIcon />
            </IconButton>
          )}
        </>
      ) : (
        /* Desktop: inline links */
        <>
          {configs === null ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CircularProgress size={16} sx={{ color: "#aaa" }} />
            </Box>
          ) : (
            items.map(item => {
              const active = location.pathname === item.path
              return (
                <Box
                  key={item.path}
                  component={Link}
                  to={item.path}
                  sx={{
                    display: "flex", alignItems: "center", gap: 0.75,
                    px: 2, py: 1.5,
                    textDecoration: "none",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    borderBottom: active ? `3px solid ${item.color ?? RED}` : "3px solid transparent",
                    mb: "-3px",
                    "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.05)" },
                    transition: "all 0.12s",
                    fontSize: "0.85rem",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  <Box sx={{ color: active ? (item.color ?? RED) : "inherit", display: "flex" }}>{item.icon}</Box>
                  {item.label}
                </Box>
              )
            })
          )}
        </>
      )}
    </Box>
  )

  const mobileDrawer = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{ sx: { bgcolor: "#1c1c1e", width: 260 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Logo />
        <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "rgba(255,255,255,0.6)" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List sx={{ px: 1, py: 1 }}>
        {items.map(item => {
          const active = location.pathname === item.path
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              onClick={() => setDrawerOpen(false)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                bgcolor: active ? "rgba(255,255,255,0.08)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                minHeight: 52,
              }}
            >
              <ListItemIcon sx={{ color: active ? (item.color ?? RED) : "rgba(255,255,255,0.5)", minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: active ? 700 : 400,
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                }}
              />
            </ListItemButton>
          )
        })}
      </List>
    </Drawer>
  )

  return (
    <>
      {navBar}
      {isMobile && mobileDrawer}
    </>
  )
}

function Logo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        component="img"
        src="/pwa-192.png"
        alt="WTLL"
        sx={{ width: 30, height: 30, borderRadius: 0.75 }}
      />
      <Box>
        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.1 }}>WTLL</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>League Platform</Typography>
      </Box>
    </Box>
  )
}
