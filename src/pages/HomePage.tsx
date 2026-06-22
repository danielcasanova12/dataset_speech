import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box, CircularProgress, Grid, IconButton, Modal, Alert, AlertTitle, Tabs, Tab } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { DATASETS } from '../datasets';
import MicTester from '../components/MicTester';
import MusicManager from '../components/MusicManager';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMic, setHasMic] = useState(true); // Default to true until checked
  const [tabValue, setTabValue] = useState(0);
  const { isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Limpa a sessão legada ao carregar a página para evitar conflitos
  useEffect(() => {
    localStorage.removeItem('session_id');
    localStorage.removeItem('datasetId');
    localStorage.removeItem('recording_progress');
  }, []);

  return (
    <Container>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>

      {!hasMic && isAuthenticated && (
        <Box sx={{ width: '100%', maxWidth: 800, mt: 4, mb: -4 }}>
          <Alert 
            severity="error" 
            variant="filled"
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()} startIcon={<RefreshIcon />}>
                RECARREGAR SITE
              </Button>
            }
          >
            <AlertTitle sx={{ fontWeight: 'bold' }}>Microfone não detectado ou bloqueado!</AlertTitle>
            Para continuar, você precisa:
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Conectar um microfone ao seu computador/dispositivo.</li>
              <li>Liberar o acesso ao microfone clicando no ícone de <strong>Cadeado</strong> na barra de endereços do navegador e selecionando "Permitir".</li>
              <li>Após realizar esses passos, clique no botão ao lado para recarregar a página.</li>
            </ul>
          </Alert>
        </Box>
      )}

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
            <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} centered>
                        <Tab label="Voz Geral" />
                        <Tab label="Música" />
                    </Tabs>
                </Box>

                {tabValue === 0 && (
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <MicTester onMicStatusChange={setHasMic} />
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
                                component={hasMic ? Link : "button"}
                                to={hasMic ? `/recording/${dataset.frontendId}` : undefined}
                                size="large"
                                disabled={!hasMic}
                                >
                                {dataset.name}
                                </Button>
                            </Grid>
                            ))}
                        </Grid>
                        )}
                    </Box>
                )}

                {tabValue === 1 && (
                    <MusicManager />
                )}

                <Box mt={4} display="flex" justifyContent="center">
                    <Button variant="outlined" color="error" onClick={logout}>
                        Sair
                    </Button>
                </Box>
            </Box>
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