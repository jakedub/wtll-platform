import { createTheme } from '@mui/material/styles'

/**
 * WTLL Platform Theme
 *
 * Matches the WTLL brand: red primary, dark charcoal sidebar,
 * white/light-gray content areas. Bold, athletic, clear.
 *
 * Primary: WTLL Red
 * Sidebar: Deep charcoal (#1c1c1e)
 * Background: Off-white with subtle gray surface
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#C41230',
      light: '#E03050',
      dark: '#960E24',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3d3d3d',
      light: '#5a5a5a',
      dark: '#1c1c1c',
      contrastText: '#ffffff',
    },
    error: {
      main: '#C41230',
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
  },
})

export default theme
