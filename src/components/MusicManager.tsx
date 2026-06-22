import React, { useState } from 'react';
import { Box, Button, Typography, TextField, List, ListItem, ListItemText, IconButton, Paper, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

export interface Song {
  id: string;
  name: string;
  file: File;
  url: string;
}

export interface Phrase {
  id: string;
  text: string;
}

export interface MusicSessionConfig {
  songs: Song[];
  phrases: Phrase[];
  intervalCount: number;
  randomOrder: boolean;
}

const MusicManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [intervalCount, setIntervalCount] = useState(1);
  const [randomOrder, setRandomOrder] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newSongs = Array.from(event.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        file: file,
        url: URL.createObjectURL(file)
      }));
      setSongs(prev => [...prev, ...newSongs]);
    }
  };

  const removeSong = (id: string) => {
    setSongs(prev => {
        const songToRemove = prev.find(s => s.id === id);
        if (songToRemove) {
            URL.revokeObjectURL(songToRemove.url);
        }
        return prev.filter(s => s.id !== id);
    });
  };

  const addPhrase = () => {
    if (newPhraseText.trim()) {
      setPhrases(prev => [...prev, { id: Math.random().toString(36).substring(7), text: newPhraseText.trim() }]);
      setNewPhraseText('');
    }
  };

  const removePhrase = (id: string) => {
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  const startSession = () => {
    if (songs.length === 0) {
      alert("Por favor, adicione pelo menos uma música.");
      return;
    }

    const config: MusicSessionConfig = {
      songs,
      phrases,
      intervalCount,
      randomOrder
    };

    navigate('/music-session', { state: { config } });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Gerenciador de Música</Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Músicas</Typography>
            <Button variant="contained" component="label" sx={{ mb: 2 }}>
                Adicionar Músicas
                <input type="file" hidden multiple accept="audio/*" onChange={handleFileUpload} />
            </Button>
            <List>
                {songs.map(song => (
                <ListItem key={song.id} secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => removeSong(song.id)}>
                    <DeleteIcon />
                    </IconButton>
                }>
                    <ListItemText primary={song.name} />
                </ListItem>
                ))}
            </List>
            {songs.length === 0 && <Typography variant="body2" color="textSecondary">Nenhuma música adicionada.</Typography>}
            </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Frases de Intervalo</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                size="small"
                fullWidth
                label="Nova frase"
                value={newPhraseText}
                onChange={e => setNewPhraseText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addPhrase()}
                />
                <Button variant="contained" onClick={addPhrase}>Adicionar</Button>
            </Box>
            <List>
                {phrases.map(phrase => (
                <ListItem key={phrase.id} secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => removePhrase(phrase.id)}>
                    <DeleteIcon />
                    </IconButton>
                }>
                    <ListItemText primary={phrase.text} />
                </ListItem>
                ))}
            </List>
            {phrases.length === 0 && <Typography variant="body2" color="textSecondary">Nenhuma frase adicionada.</Typography>}
            </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Configurações da Sessão</Typography>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="interval-count-label">Frases por Intervalo</InputLabel>
                <Select
                    labelId="interval-count-label"
                    value={intervalCount}
                    label="Frases por Intervalo"
                    onChange={e => setIntervalCount(Number(e.target.value))}
                >
                    {[0, 1, 2, 3, 4, 5].map(num => (
                        <MenuItem key={num} value={num}>{num} frase{num !== 1 ? 's' : ''}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControlLabel
                control={<Switch checked={randomOrder} onChange={e => setRandomOrder(e.target.checked)} />}
                label="Ordem Aleatória (Frases)"
            />
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={startSession}
            disabled={songs.length === 0}
        >
            Iniciar Sessão de Música
        </Button>
      </Box>
    </Box>
  );
};

export default MusicManager;