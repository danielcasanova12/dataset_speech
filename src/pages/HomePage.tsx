import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box, CircularProgress, Card, CardContent, CardActions, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { purple, grey } from '@mui/material/colors';
import MicIcon from '@mui/icons-material/Mic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MoodIcon from '@mui/icons-material/Mood';
import WaveformIcon from '@mui/icons-material/GraphicEq';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useAuth } from '../context/AuthContext';

// --- THEME ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: purple[300],
    },
    secondary: {
      main: grey[700],
    },
    background: {
      default: '#101010',
      paper: '#1e1e1e',
    },
    text: {
      primary: grey[200],
      secondary: grey[400],
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h2: {
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h5: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: `0 8px 20px 0 ${purple[300]}33`,
          },
        },
      },
    },
  },
});

const datasetInfo: { [key: number]: { name: string; icon: React.ReactElement; } } = {
  1: { name: "Dataset voz geral", icon: <MicIcon sx={{ fontSize: 50 }} /> },
  2: { name: "Dataset canto", icon: <MusicNoteIcon sx={{ fontSize: 50 }} /> },
  3: { name: "Dataset emoção", icon: <MoodIcon sx={{ fontSize: 50 }} /> },
};

const HomePage: React.FC = () => {
  const [datasets, setDatasets] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedProgress, setSavedProgress] = useState<{datasetId: string; currentPhraseIndex: number} | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const savedProgressJSON = localStorage.getItem('recordingProgress');
    if (savedProgressJSON) {
      setSavedProgress(JSON.parse(savedProgressJSON));
    }

    const fetchDatasets = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/phrases_leitura.csv`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        const datasetidIndex = header.indexOf('datasetId');

        if (datasetidIndex === -1) throw new Error("'datasetId' column not found in phrases_leitura.csv");

        const datasetIds = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          return values && values[datasetidIndex] ? parseInt(values[datasetidIndex], 10) : null;
        }).filter((id): id is number => id !== null);

        const uniqueDatasets = Array.from(new Set(datasetIds)).sort((a, b) => a - b);
        setDatasets(uniqueDatasets);
      } catch (error) {
        console.error("Failed to load datasets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ textAlign: 'center', py: 6 }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 2 }}>
          {isAuthenticated ? (
            <Button variant="outlined" color="primary" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <>
              <Button variant="outlined" color="primary" component={Link} to="/login">
                Login
              </Button>
              <Button variant="contained" color="primary" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>

        <Box mb={6}>
          <WaveformIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom>
            Voice Singing Dataset
          </Typography>
          <Typography variant="h5" component="h2" color="text.secondary">
            Contribua com sua voz para a pesquisa e desenvolvimento de novas tecnologias.
          </Typography>
        </Box>

        {savedProgress && (
          <Box mb={6} p={3} sx={{ border: `2px dashed ${grey[700]}`, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              Você tem uma sessão em andamento.
            </Typography>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<PlayCircleOutlineIcon />}
              onClick={() => navigate(`/recording/${savedProgress.datasetId}`)}
            >
              Continuar de onde parou (Dataset {datasetInfo[parseInt(savedProgress.datasetId, 10)]?.name || savedProgress.datasetId})
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
              Ou escolha um novo dataset abaixo para começar do zero.
            </Typography>
          </Box>
        )}

        <Typography variant="h4" component="h3" mb={4}>
          Selecione um Dataset para Começar
        </Typography>

        {isLoading ? (
          <CircularProgress />
        ) : (
          <Box
            display="flex"
            flexWrap="wrap"
            justifyContent="center"
            sx={{ gap: 4 }}
          >
            {datasets.map(datasetId => (
              <Box key={datasetId} sx={{ flex: '1 1 300px', maxWidth: 350, minWidth: 300 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                    {datasetInfo[datasetId]?.icon || <MicIcon sx={{ fontSize: 50 }} />}
                    <Typography gutterBottom variant="h5" component="h2" mt={2}>
                      {datasetInfo[datasetId]?.name || `Dataset ${datasetId}`}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      component={Link}
                      to={`/recording/${datasetId}`}
                      size="large"
                    >
                      Selecionar
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default HomePage;
