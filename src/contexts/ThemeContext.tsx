import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, PaletteMode } from '@mui/material';

// Define the shape of the context
interface ThemeContextType {
  toggleTheme: () => void;
  mode: PaletteMode;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the color palettes
const lightPalette = {
  primary: {
    main: '#7d3bed', // Nova cor para botões
  },
  secondary: {
    main: '#00aeff', // Nova cor para links
  },
  background: {
    default: '#F8F9FA', // Branco gelo
    paper: '#FFFFFF',
  },
  text: {
    primary: '#2D2D2E', // Cinza chumbo
  },
};

const darkPalette = {
  primary: {
    main: '#7d3bed',  // Nova cor para botões
  },
  secondary: {
    main: '#00aeff', // Nova cor para links
  },
  background: {
    default: '#1A1A1B', // Cinza escuro do texto
    paper: '#333335', // Cinza médio
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#E0E0E0',
  },
};


// Create the provider component
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
            },
            containedPrimary: {
              backgroundColor: '#7d3bed',
              '&:hover': {
                backgroundColor: '#6a2bd0',
              },
            },
            outlinedPrimary: {
                color: '#7d3bed',
                borderColor: '#7d3bed',
                '&:hover': {
                    borderColor: '#6a2bd0',
                    backgroundColor: 'rgba(125, 59, 237, 0.04)',
                },
            },
            textPrimary: {
                color: '#7d3bed',
                '&:hover': {
                    backgroundColor: 'rgba(125, 59, 237, 0.04)',
                },
            },
          },
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    color: '#00aeff',
                    textDecoration: 'none',
                    '&:hover': {
                        textDecoration: 'underline',
                    },
                },
            },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              // This targets the label color
              '& .MuiInputLabel-root': {
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
              },
              // This targets the input text color
              '& .MuiInputBase-input': {
                color: mode === 'light' ? '#000000' : '#FFFFFF',
              },
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              // Default border color
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
              },
              // Hover border color
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
              },
              // Focused border color
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? '#000000' : '#FFFFFF',
              },
            },
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

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};
