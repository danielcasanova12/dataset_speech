import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';

interface ThemeContextType {
  toggleTheme: () => void;
  mode: PaletteMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 🎨 Paletas melhoradas
const lightPalette = {
  primary: {
    main: '#6C2BD9',
    light: '#9B6EF3',
    dark: '#4B1FA8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#0095E0',
    light: '#33B5FF',
    dark: '#006BB3',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F8F9FA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#2D2D2E',
    secondary: '#6B6B6B',
  },
};

const darkPalette = {
  primary: {
    main: '#8B5CF6',
    light: '#A78BFA',
    dark: '#6D28D9',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#38BDF8',
    light: '#7DD3FC',
    dark: '#0284C7',
    contrastText: '#000000',
  },
  background: {
    default: '#121212',
    paper: '#1E1E1F',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
  },
};

export const CustomThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>('dark');

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const selectedPalette = mode === 'light' ? lightPalette : darkPalette;

    return createTheme({
      palette: {
        mode,
        ...selectedPalette,
      },
      typography: {
        fontFamily: 'Roboto, sans-serif',
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
              fontWeight: 500,
            },
            containedPrimary: ({ theme }) => ({
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }),
            outlinedPrimary: ({ theme }) => ({
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.dark,
                backgroundColor: `${theme.palette.primary.main}10`,
              },
            }),
            textPrimary: ({ theme }) => ({
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: `${theme.palette.primary.main}10`,
              },
            }),
          },
        },

        MuiLink: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.secondary.main,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
                color: theme.palette.secondary.dark,
              },
            }),
          },
        },

        MuiTextField: {
          styleOverrides: {
            root: ({ theme }) => ({
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
              },
              '& .MuiInputBase-input': {
                color: theme.palette.text.primary,
              },
            }),
          },
        },

        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme }) => ({
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.mode === 'light'
                  ? 'rgba(0,0,0,0.23)'
                  : 'rgba(255,255,255,0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            }),
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};