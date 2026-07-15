import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Container, Box, Grid, IconButton, Alert, AlertTitle, Chip, Modal, Paper, Stack, TextField, Divider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { DATASETS } from '../datasets';
import MicTester from '../components/MicTester';
import { api } from '../services/api';

interface MusicCreateFormState {
  nome: string;
  genero: string;
  texto: string;
  bpm: string;
  timeSignature: string;
  vocalAudioFile: File | null;
  instrumentalAudioFile: File | null;
}

const createInitialMusicForm = (): MusicCreateFormState => ({
  nome: '',
  genero: '',
  texto: '',
  bpm: '',
  timeSignature: '4/4',
  vocalAudioFile: null,
  instrumentalAudioFile: null,
});

const musicModalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: 'calc(100vw - 32px)', sm: 620 },
  maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: { xs: 2.5, sm: 3 },
};

const HomePage: React.FC = () => {
  const [hasMic, setHasMic] = useState(true); // Default to true until checked
  const [showCreateMusicModal, setShowCreateMusicModal] = useState(false);
  const [musicForm, setMusicForm] = useState<MusicCreateFormState>(() => createInitialMusicForm());
  const [isSavingMusic, setIsSavingMusic] = useState(false);
  const [musicStatus, setMusicStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const handleMusicFieldChange = (field: keyof MusicCreateFormState, value: string | File | null) => {
    setMusicForm(previous => ({
      ...previous,
      [field]: value,
    }));
    setMusicStatus(null);
  };

  const handleCloseCreateMusicModal = () => {
    if (isSavingMusic) return;
    setShowCreateMusicModal(false);
    setMusicStatus(null);
  };

  const handleCreateMusic = async (event: React.FormEvent) => {
    event.preventDefault();

    const nome = musicForm.nome.trim();
    const genero = musicForm.genero.trim();
    const bpmText = musicForm.bpm.trim();
    const parsedBpm = bpmText ? Number(bpmText) : null;

    if (!nome || !genero) {
      setMusicStatus({ type: 'error', message: 'Informe o nome e o gênero da música.' });
      return;
    }

    if (bpmText && (parsedBpm === null || !Number.isFinite(parsedBpm) || parsedBpm <= 0)) {
      setMusicStatus({ type: 'error', message: 'Informe um BPM válido ou deixe o campo vazio.' });
      return;
    }

    setIsSavingMusic(true);
    setMusicStatus(null);

    try {
      await api.createMusic({
        nome,
        genero,
        texto: musicForm.texto.trim(),
        bpm: parsedBpm,
        time_signature: musicForm.timeSignature.trim() || null,
        vocal_audio_file: musicForm.vocalAudioFile,
        instrumental_audio_file: musicForm.instrumentalAudioFile,
      });

      setMusicForm(createInitialMusicForm());
      setMusicStatus({ type: 'success', message: 'Música cadastrada com sucesso.' });
    } catch (error: any) {
      setMusicStatus({ type: 'error', message: error.message || 'Não foi possível cadastrar a música.' });
    } finally {
      setIsSavingMusic(false);
    }
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

      {isAuthenticated && isAdmin && (
        <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="Administrador"
            color="primary"
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
        </Box>
      )}

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
            Para gravar, faça estes passos:
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Conecte um microfone.</li>
              <li>No cadeado da barra do navegador, permita o microfone.</li>
              <li>Depois clique em recarregar.</li>
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
            <>
                <MicTester onMicStatusChange={setHasMic} />
                <Typography variant="h5" component="h2" sx={{ mb: 4 }}>
                Escolha o tipo de sessão
                </Typography>
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
                    <Grid item>
                        <Button
                          variant="outlined"
                          color="secondary"
                          component={Link}
                          to="/music-session"
                          size="large"
                        >
                          Música
                        </Button>
                    </Grid>
                    {isAdmin && (
                    <Grid item>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="large"
                          component={Link}
                          to="/admin/recordings"
                          startIcon={<LibraryMusicIcon />}
                        >
                          Ver gravações
                        </Button>
                    </Grid>
                    )}
                    {isAdmin && (
                    <Grid item>
                        <Button
                          variant="contained"
                          color="secondary"
                          size="large"
                          startIcon={<AddIcon />}
                          onClick={() => setShowCreateMusicModal(true)}
                        >
                          Criar música
                        </Button>
                    </Grid>
                    )}
                </Grid>
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

      <Modal open={showCreateMusicModal} onClose={handleCloseCreateMusicModal}>
        <Paper component="form" onSubmit={handleCreateMusic} sx={musicModalStyle}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Criar música
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preencha os campos principais. Os áudios são opcionais.
              </Typography>
            </Box>

            {musicStatus && (
              <Alert severity={musicStatus.type}>
                {musicStatus.message}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Nome da música"
                value={musicForm.nome}
                onChange={(event) => handleMusicFieldChange('nome', event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Gênero"
                value={musicForm.genero}
                onChange={(event) => handleMusicFieldChange('genero', event.target.value)}
                required
                fullWidth
              />
            </Box>

            <TextField
              label="Letra ou trechos para leitura"
              value={musicForm.texto}
              onChange={(event) => handleMusicFieldChange('texto', event.target.value)}
              multiline
              minRows={4}
              fullWidth
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="BPM"
                type="number"
                value={musicForm.bpm}
                onChange={(event) => handleMusicFieldChange('bpm', event.target.value)}
                inputProps={{ min: 1 }}
                fullWidth
              />
              <TextField
                label="Compasso"
                placeholder="Ex.: 4/4"
                value={musicForm.timeSignature}
                onChange={(event) => handleMusicFieldChange('timeSignature', event.target.value)}
                fullWidth
              />
            </Box>

            <Divider />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Áudio original com voz"
                type="file"
                InputLabelProps={{ shrink: true }}
                inputProps={{ accept: 'audio/*' }}
                onChange={(event) => {
                  const input = event.target as HTMLInputElement;
                  handleMusicFieldChange('vocalAudioFile', input.files?.[0] || null);
                }}
                helperText={musicForm.vocalAudioFile?.name || 'Opcional'}
                fullWidth
              />
              <TextField
                label="Áudio instrumental"
                type="file"
                InputLabelProps={{ shrink: true }}
                inputProps={{ accept: 'audio/*' }}
                onChange={(event) => {
                  const input = event.target as HTMLInputElement;
                  handleMusicFieldChange('instrumentalAudioFile', input.files?.[0] || null);
                }}
                helperText={musicForm.instrumentalAudioFile?.name || 'Opcional'}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
              <Button type="button" variant="outlined" onClick={handleCloseCreateMusicModal} disabled={isSavingMusic}>
                Fechar
              </Button>
              <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={isSavingMusic}>
                {isSavingMusic ? 'Salvando...' : 'Salvar música'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>
    </Container>
  );
};

export default HomePage;
