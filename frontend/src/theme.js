import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1d4ed8'
    },
    secondary: {
      main: '#0f766e'
    },
    success: {
      main: '#15803d'
    },
    warning: {
      main: '#b45309'
    },
    error: {
      main: '#b91c1c'
    },
    background: {
      default: '#f3f6fb',
      paper: '#ffffff'
    },
    text: {
      primary: '#14213d',
      secondary: '#52607a'
    }
  },
  typography: {
    fontFamily: '"Segoe UI Variable", "Trebuchet MS", "Gill Sans", sans-serif',
    h1: {
      fontFamily: '"Bahnschrift", "Arial Narrow", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    h2: {
      fontFamily: '"Bahnschrift", "Arial Narrow", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h3: {
      fontFamily: '"Bahnschrift", "Arial Narrow", sans-serif',
      fontWeight: 700
    },
    button: {
      textTransform: 'none',
      fontWeight: 700
    }
  },
  shape: {
    borderRadius: 18
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at top left, rgba(29, 78, 216, 0.08), transparent 28%), radial-gradient(circle at bottom right, rgba(13, 148, 136, 0.08), transparent 22%), #f3f6fb'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 18px 45px rgba(20, 33, 61, 0.08)',
          border: `1px solid ${alpha('#1f3b73', 0.08)}`
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 18,
          paddingBlock: 10
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 12
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      }
    }
  }
});

export default theme;
