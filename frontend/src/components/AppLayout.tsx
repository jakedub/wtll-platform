import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

import LogoutIcon from '@mui/icons-material/Logout'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import SettingsIcon from '@mui/icons-material/Settings'
import { NAV_SECTIONS, isFullSizeEligible } from '../config/navConfig'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/AppSettingsContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const RAIL_BG    = '#1c1c1e'
const DRAWER_BG  = '#111'
const RAIL_TEXT  = 'rgba(255,255,255,0.55)'
const ITEM_TEXT  = 'rgba(255,255,255,0.82)'
const HOVER_BG   = 'rgba(255,255,255,0.07)'
const RAIL_W     = 72
const DRAWER_W   = 236

interface Props { children: React.ReactNode }

export default function AppLayout({ children }: Props) {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, logout } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()

  // Which section's drawer is open (null = closed)
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    try { return sessionStorage.getItem('activeSection') } catch { return null }
  })
  // Full-size mode — collapses everything for focus-heavy pages
  const [fullSize, setFullSize] = useState(false)
  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filter nav sections by which modules are enabled for this deployment.
  // Board and Pre-Season are always shown (they're the base of the app).
  const MODULE_MAP: Record<string, keyof typeof settings.modules> = {
    preseason:   'preseason',
    finance:     'finance',
    baseball:    'baseball',
    softball:    'softball',
    schedule:    'schedule',
    involvement: 'involvement',
  }
  const visibleSections = NAV_SECTIONS.filter(s => {
    const moduleKey = MODULE_MAP[s.id]
    if (!moduleKey) return true  // board — always visible
    return settings.modules[moduleKey]
  })

  const section = visibleSections.find(s => s.id === activeSection) ?? null
  const eligible = isFullSizeEligible(location.pathname)

  // Auto-open the section whose item is currently active
  useEffect(() => {
    const match = visibleSections.find(s =>
      s.items.some(i => isItemActive(i.path, location.pathname, location.search))
    )
    if (match && match.id !== activeSection) {
      setActiveSection(match.id)
      try { sessionStorage.setItem('activeSection', match.id) } catch {}
    }
  }, [location.pathname, location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Exit full-size when navigating away from eligible pages
  useEffect(() => {
    if (!eligible) setFullSize(false)
  }, [eligible])

  const toggleSection = (id: string) => {
    const next = activeSection === id ? null : id
    setActiveSection(next)
    try { sessionStorage.setItem('activeSection', next ?? '') } catch {}
  }

  const drawerOpen = !!section && !fullSize && !isMobile

  // ── Path/query-param aware active check ──────────────────────────────────────
  function isItemActive(itemPath: string, pathname: string, search: string): boolean {
    const [p, q] = itemPath.split('?')
    if (q) return (pathname === p || pathname.startsWith(p + '/')) && search.includes(q)
    const pathMatch = pathname === p || pathname.startsWith(p + '/')
    if (!pathMatch) return false
    // Don't highlight bare /players if ?sport=softball is active
    if (search) {
      const hasQueryVariant = visibleSections.flatMap(s => s.items).some(item => {
        const [ip, iq] = item.path.split('?')
        return iq && ip === p && search.includes(iq)
      })
      if (hasQueryVariant) return false
    }
    return true
  }

  // ── Rail ──────────────────────────────────────────────────────────────────────
  const rail = (
    <Box sx={{
      width: RAIL_W,
      height: '100%',
      bgcolor: RAIL_BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      py: 1,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
      overflowX: 'hidden',
    }}>
      {/* Logo */}
      <Box
        component={Link}
        to="/"
        onClick={() => {
          setMobileOpen(false)
          setActiveSection(null)
          try { sessionStorage.setItem('activeSection', '') } catch {}
        }}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1, textDecoration: 'none', '&:hover': { opacity: 0.8 } }}
      >
        <Box component="img" src="/pwa-512.png" alt="WTLL" sx={{ width: 36, height: 36, borderRadius: 1, mb: 0.25 }} />
      </Box>

      {/* Home — closes section drawer */}
      <Tooltip title="Home" placement="right">
        <IconButton
          component={Link}
          to="/"
          onClick={() => {
            setMobileOpen(false)
            setActiveSection(null)
            try { sessionStorage.setItem('activeSection', '') } catch {}
          }}
          sx={{
            color: location.pathname === '/' ? '#fff' : RAIL_TEXT,
            bgcolor: location.pathname === '/' ? settings.secondaryColor : 'transparent',
            width: 44, height: 44, borderRadius: 2, mb: 0.5,
            '&:hover': { bgcolor: location.pathname === '/' ? `${settings.secondaryColor}dd` : HOVER_BG },
          }}
        >
          <HomeIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider sx={{ width: 32, bgcolor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

      {/* Section icons */}
      {visibleSections.map(s => {
        const isActive = activeSection === s.id
        const hasActivePath = s.items.some(i => isItemActive(i.path, location.pathname, location.search))
        return (
          <Tooltip key={s.id} title={s.label} placement="right">
            <IconButton
              onClick={() => { toggleSection(s.id); setMobileOpen(false) }}
              sx={{
                color: isActive || hasActivePath ? '#fff' : RAIL_TEXT,
                bgcolor: isActive ? s.color : hasActivePath ? `${s.color}30` : 'transparent',
                width: 44, height: 44, borderRadius: 2, mb: 0.5,
                transition: 'background 0.15s',
                '&:hover': { bgcolor: isActive ? s.color : `${s.color}25` },
              }}
            >
              {s.icon}
            </IconButton>
          </Tooltip>
        )
      })}

      {/* Spacer — pushes guide + logout to bottom of rail */}
      <Box sx={{ flex: 1 }} />

      {/* Guide */}
      <Tooltip title="Platform Guide" placement="right">
        <IconButton
          component={Link}
          to="/guide"
          onClick={() => { setMobileOpen(false) }}
          sx={{
            color: location.pathname === '/guide' ? '#fff' : RAIL_TEXT,
            bgcolor: location.pathname === '/guide' ? settings.secondaryColor : 'transparent',
            width: 44, height: 44, borderRadius: 2, mb: 0.5,
            '&:hover': { bgcolor: location.pathname === '/guide' ? `${settings.secondaryColor}dd` : HOVER_BG, color: '#fff' },
          }}
        >
          <MenuBookIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Settings — admin only */}
      {user?.is_staff && (
        <Tooltip title="Settings" placement="right">
          <IconButton
            component={Link}
            to="/settings"
            onClick={() => { setMobileOpen(false) }}
            sx={{
              color: location.pathname === '/settings' ? '#fff' : RAIL_TEXT,
              bgcolor: location.pathname === '/settings' ? settings.secondaryColor : 'transparent',
              width: 44, height: 44, borderRadius: 2, mb: 0.5,
              '&:hover': { bgcolor: location.pathname === '/settings' ? `${settings.secondaryColor}dd` : HOVER_BG, color: '#fff' },
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Logout */}
      <Tooltip title={user ? `Sign out (${user.email})` : 'Sign out'} placement="right">
        <IconButton
          onClick={logout}
          sx={{
            color: RAIL_TEXT,
            width: 44, height: 44, borderRadius: 2, mb: 1,
            '&:hover': { bgcolor: HOVER_BG, color: '#fff' },
          }}
        >
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )

  // ── Section drawer ────────────────────────────────────────────────────────────
  const sectionDrawer = section ? (
    <Box sx={{
      width: DRAWER_W,
      height: '100%',
      bgcolor: DRAWER_BG,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      borderRight: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Section header — click to go to section dashboard */}
      <Box
        onClick={() => navigate(section.dashboardPath)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 2,
          cursor: 'pointer',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <Box sx={{ color: section.color, display: 'flex', flexShrink: 0 }}>{section.icon}</Box>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>{section.label}</Typography>
        <Tooltip title="Close panel">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); toggleSection(section.id) }}
            sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: '#fff' } }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Section overview link */}
      <Box
        onClick={() => navigate(section.dashboardPath)}
        sx={{
          px: 2, py: 1.25, cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: `${section.color}cc`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {section.label} Overview →
        </Typography>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.07)', mx: 1.5 }} />

      {/* Sub-items */}
      <List disablePadding sx={{ px: 1, pt: 0.5, pb: 2 }}>
        {section.items.map(({ label, path, icon }) => {
          const active = isItemActive(path, location.pathname, location.search)
          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                component={Link}
                to={path}
                onClick={() => setMobileOpen(false)}
                selected={active}
                sx={{
                  borderRadius: 1.5,
                  py: 0.75,
                  color: active ? '#fff' : ITEM_TEXT,
                  '&.Mui-selected': {
                    bgcolor: section.color,
                    '& .MuiListItemIcon-root': { color: '#fff' },
                    '&:hover': { bgcolor: `${section.color}dd` },
                  },
                  '&:hover': { bgcolor: active ? `${section.color}dd` : HOVER_BG },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: active ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  ) : null

  // ── Full-size toggle (floating) ────────────────────────────────────────────────
  const fullSizeToggle = eligible && (
    <Tooltip title={fullSize ? 'Exit full size' : 'Full size mode'} placement="right">
      <IconButton
        onClick={() => setFullSize(v => !v)}
        size="small"
        sx={{
          position: 'fixed',
          bottom: 16, left: fullSize ? 12 : RAIL_W + (drawerOpen ? DRAWER_W : 0) + 12,
          zIndex: 1300,
          bgcolor: 'rgba(28,28,30,0.9)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          width: 32, height: 32,
          transition: 'left 0.2s ease',
          '&:hover': { bgcolor: '#333' },
        }}
      >
        {fullSize ? <CloseFullscreenIcon sx={{ fontSize: 16 }} /> : <OpenInFullIcon sx={{ fontSize: 16 }} />}
      </IconButton>
    </Tooltip>
  )

  // ── Mobile layout ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="fixed" sx={{ bgcolor: RAIL_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' }} elevation={0}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Box component="img" src="/pwa-512.png" alt="WTLL" sx={{ width: 28, height: 28, borderRadius: 0.5, mr: 1 }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>WTLL</Typography>
          </Toolbar>
        </AppBar>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: RAIL_W + DRAWER_W, bgcolor: RAIL_BG, border: 'none', display: 'flex', flexDirection: 'row' } }}>
          {rail}
          {sectionDrawer}
        </Drawer>
        <Box component="main" sx={{ flex: 1, mt: 7, p: 2 }}>
          {children}
        </Box>
      </Box>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────────
  const totalNavW = fullSize ? 0 : RAIL_W + (drawerOpen ? DRAWER_W : 0)

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Rail + drawer panel */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: totalNavW,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}>
        {/* Rail — always rendered, transitions to 0 in full-size */}
        <Box sx={{
          width: fullSize ? 0 : RAIL_W,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
          height: '100%',
        }}>
          {rail}
        </Box>

        {/* Section drawer — slides in next to rail */}
        <Box sx={{
          width: drawerOpen ? DRAWER_W : 0,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
          height: '100%',
        }}>
          {sectionDrawer}
        </Box>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          height: '100vh',
          p: 3,
        }}
      >
        {children}
      </Box>

      {/* Full-size toggle */}
      {fullSizeToggle}
    </Box>
  )
}
