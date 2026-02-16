import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box, CircularProgress, Grid, IconButton } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { DATASETS } from '../datasets';
import { api } from '../services/api';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, logout, token } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Limpa a sessão legada ao carregar a página para evitar conflitos
  useEffect(() => {
    localStorage.removeItem('session_id');
    localStorage.removeItem('datasetId');
    localStorage.removeItem('recording_progress');
  }, []);


  const handleDatasetClick = async (dataset: any) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const newSession = await api.createSession(dataset.backendId, true, token);
      navigate(`/recording/${dataset.frontendId}`, { state: { sessionToResume: newSession } });
    } catch (error: any) {
      if (error.session) {
        navigate(`/recording/${dataset.frontendId}`, { state: { sessionToResume: error.session } });
      } else {
        console.error("Failed to create session:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        textAlign="center"
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Voice Singing Dataset
        </Typography>

        {isAuthenticated ? (
            <>
                <Typography variant="h5" component="h2" sx={{ mb: 4 }}>
                Selecione o Dataset
                </Typography>
                {isLoading ? (
                <CircularProgress />
                ) : (
                <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                    {DATASETS.map(dataset => (
                    <Grid item key={dataset.frontendId}>
                        <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleDatasetClick(dataset)}
                        size="large"
                        disabled={isLoading}
                        >
                        {dataset.name}
                        </Button>
                    </Grid>
                    ))}
                </Grid>
                )}
                <Button variant="outlined" color="error" onClick={logout}>
                    Sair
                </Button>
            </>
        ) : (
            <Box>
                 <Typography variant="h6" sx={{ mb: 3 }}>
                    Faça login para começar
                </Typography>
                <Grid container spacing={2} justifyContent="center">
                    <Grid item>
                         <Button variant="contained" color="primary" component={Link} to="/login" size="large">
                            Login
                        </Button>
                    </Grid>
                     <Grid item>
                         <Button variant="contained" color="primary" component={Link} to="/register" size="large">
                            Cadastrar
                        </Button>
                    </Grid>
                    <Grid item>
                         <Button variant="contained" color="secondary" component={Link} to="/guest-register" size="large">
                            Entrar como Visitante
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        )}
      </Box>
    </Container>
  );
};

export default HomePage;