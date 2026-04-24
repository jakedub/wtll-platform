import { createTheme } from '@mui/material/styles'

/**
 * WTLL Platform Theme
 *
 * Clean, utilitarian aesthetic — this is a tool for coaches and admins,
 * not a consumer app. Prioritizes data density and legibility.
 *
 * Primary: Deep navy (authority, trust)
 * Accent: Amber (warnings, status highlights)
 * Background: Near-white with subtle gray surface
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a2744',
      light: '#2e3f6e',
      dark: '#0f1829',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e8a020',
      light: '#f0b84a',
      dark: '#c07010',
      contrastText: '#1a2744',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#e8a020',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#f5f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1f2e',
      secondary: '#5a6275',
    },
    divider: '#e2e5ec',
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    overline: {
      fontFamily: '"IBM Plex Mono", monospace',
      fontWeight: 600,
      letterSpacing: '0.1em',
    },
    caption: {
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '0.72rem',
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #e2e5ec',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"IBM Plex Mono", monospace',
          fontWeight: 600,
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#5a6275',
            backgroundColor: '#f5f6f8',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
})

export default theme
