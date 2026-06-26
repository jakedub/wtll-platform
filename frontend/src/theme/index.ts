import { createTheme, Theme } from '@mui/material/styles'

/**
 * WTLL Platform Theme
 *
 * Matches the WTLL brand: red primary, dark charcoal sidebar,
 * white/light-gray content areas. Bold, athletic, clear.
 *
 * Primary and secondary colors are now dynamic — pass them in to
 * createDynamicTheme() so league branding flows from the DB.
 */

const SHARED_OVERRIDES = {
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
  MuiCssBaseline: {
    styleOverrides: {
      ".rbc-agenda-view table": {
        width: "100%",
        borderCollapse: "collapse",
      },
      ".rbc-agenda-date-cell": {
        width: "120px",
        verticalAlign: "top",
      },
      ".rbc-agenda-time-cell": {
        width: "90px",
      },
    },
  },
} as const

/**
 * Build a full MUI theme from primary and secondary hex colors.
 * Call this whenever the league identity colors change.
 */
export function createDynamicTheme(primaryColor: string, _secondaryColor: string): Theme {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor,
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#3d3d3d',
        light: '#5a5a5a',
        dark: '#1c1c1c',
        contrastText: '#ffffff',
      },
      error: {
        main: primaryColor,
      },
      warning: {
        main: '#d97706',
      },
      success: {
        main: '#2e7d32',
      },
      background: {
        default: '#f4f4f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#111111',
        secondary: '#6b6b6b',
      },
      divider: '#e4e4e7',
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
    components: SHARED_OVERRIDES,
  })
}

/** Default static theme — used as the initial value before the API responds. */
const theme = createDynamicTheme('#C41230', '#1565c0')

export default theme
